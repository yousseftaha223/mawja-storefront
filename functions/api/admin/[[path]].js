/* /api/admin/*  Admin API on Cloudflare D1. Needs the D1 binding "DB" and the secret SESSION_SECRET. */
import { hashPassword, safeEqual, makeSession, readSession, cookie } from "../../_lib/auth.js";

const J = (status, body, headers) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...(headers || {}) } });
const STATUSES = ["new", "confirming", "confirmed", "completed", "cancelled"];
const MAX_IMG = 1300 * 1024; // raw bytes; stored as base64 text in D1 (row limit about 2 MB)

async function ensure(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, mime TEXT NOT NULL, b64 TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))"),
    db.prepare("CREATE TABLE IF NOT EXISTS login_fail (ip TEXT NOT NULL, t INTEGER NOT NULL)"),
  ]);
}
const kvGet = async (db, k) => { const r = await db.prepare("SELECT v FROM kv WHERE k=?").bind(k).first(); return r ? r.v : null; };
const kvSet = (db, k, v) => db.prepare("INSERT INTO kv(k,v,updated_at) VALUES(?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at").bind(k, v).run();

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db || !env.SESSION_SECRET) return J(503, { ok: false, error: "not_configured" });
  await ensure(db);
  const route = (params.path || []).join("/");
  const method = request.method;
  const ip = request.headers.get("CF-Connecting-IP") || "x";

  if (route === "setup" && method === "POST") {
    // One-time: works only while no admin password exists and the setup token matches.
    const b = await request.json().catch(() => ({}));
    if (!env.ADMIN_SETUP_TOKEN || !safeEqual(b.token || "", env.ADMIN_SETUP_TOKEN)) return J(403, { ok: false, error: "forbidden" });
    if (await kvGet(db, "admin")) return J(409, { ok: false, error: "already_set" });
    const email = String(b.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+$/.test(email) || String(b.password || "").length < 8) return J(400, { ok: false, error: "invalid" });
    const h = await hashPassword(b.password);
    await kvSet(db, "admin", JSON.stringify({ email, ...h }));
    return J(200, { ok: true });
  }
  if (route === "login" && method === "POST") {
    const since = Date.now() - 15 * 60000;
    await db.prepare("DELETE FROM login_fail WHERE t<?").bind(since).run();
    const n = (await db.prepare("SELECT COUNT(*) c FROM login_fail WHERE ip=?").bind(ip).first()).c;
    if (n >= 5) return J(429, { ok: false, error: "too_many" });
    const b = await request.json().catch(() => ({}));
    const adm = JSON.parse((await kvGet(db, "admin")) || "null");
    let ok = false;
    if (adm) {
      const h = await hashPassword(String(b.password || ""), adm.salt);
      ok = safeEqual(h.hash, adm.hash) && safeEqual(String(b.email || "").trim().toLowerCase(), adm.email);
    }
    if (!ok) { await db.prepare("INSERT INTO login_fail(ip,t) VALUES(?,?)").bind(ip, Date.now()).run(); return J(401, { ok: false, error: "bad_login" }); }
    return J(200, { ok: true, email: adm.email }, { "Set-Cookie": cookie(await makeSession(env, adm.email), 7 * 86400) });
  }
  if (route === "logout" && method === "POST") return J(200, { ok: true }, { "Set-Cookie": cookie("", 0) });

  const sess = await readSession(env, request);
  if (!sess) return J(401, { ok: false, error: "auth" });
  if (method !== "GET" && !/^https:\/\/[^/]+$/.test(request.headers.get("Origin") || "") ) return J(403, { ok: false, error: "origin" });
  if (method !== "GET" && new URL(request.headers.get("Origin")).host !== new URL(request.url).host) return J(403, { ok: false, error: "origin" });

  if (route === "me") return J(200, { ok: true, email: sess.e });

  if (route === "orders" && method === "GET") {
    const { results } = await db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 300").all();
    const rows = results.map((r) => ({ ...r, items: JSON.parse(r.items || "[]"), telegram_sent: !!r.telegram_sent }));
    return J(200, { ok: true, orders: rows });
  }
  if (route === "order-status" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    if (!STATUSES.includes(b.status) || !b.id) return J(400, { ok: false, error: "invalid" });
    const r = await db.prepare("UPDATE orders SET status=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(b.status, String(b.id)).run();
    return J(r.meta && r.meta.changes ? 200 : 404, { ok: !!(r.meta && r.meta.changes) });
  }
  if (route === "catalog" && method === "GET") {
    let v = await kvGet(db, "storefront");
    if (!v && env.ASSETS) { const r = await env.ASSETS.fetch(new Request(new URL("/site-data/storefront.json", request.url))); if (r.ok) v = await r.text(); }
    return v ? new Response(v, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }) : J(404, { ok: false });
  }
  if (route === "catalog" && method === "PUT") {
    const text = await request.text();
    let d; try { d = JSON.parse(text); } catch (e) { return J(400, { ok: false, error: "invalid" }); }
    if (!d || !Array.isArray(d.products) || text.length > 1500000) return J(400, { ok: false, error: "invalid" });
    await db.batch([
      db.prepare("INSERT INTO catalog_history(body) VALUES(?)").bind(text),
      db.prepare("DELETE FROM catalog_history WHERE id NOT IN (SELECT id FROM catalog_history ORDER BY id DESC LIMIT 30)"),
    ]);
    await kvSet(db, "storefront", text);
    return J(200, { ok: true });
  }
  if (route === "upload" && method === "POST") {
    const mime = request.headers.get("Content-Type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) return J(415, { ok: false, error: "type" });
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_IMG) return J(413, { ok: false, error: "size" });
    let s = ""; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await db.prepare("INSERT INTO media(id,mime,b64) VALUES(?,?,?)").bind(id, mime, btoa(s)).run();
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    return J(200, { ok: true, url: `media/db/${id}.${ext}` });
  }
  return J(404, { ok: false, error: "not_found" });
}
