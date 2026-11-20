/* POST /api/order  (Vercel serverless function)
   Receives an order from the storefront, re-prices it on the server, saves it in Supabase (table "orders"),
   then sends a Telegram notification.

   Environment variables (set in Vercel -> Project -> Settings -> Environment Variables, never in the browser code):
     SUPABASE_SERVICE_ROLE_KEY   required. Supabase "service_role" / secret key. Server only.
     TELEGRAM_BOT_TOKEN          required for Telegram notifications.
     TELEGRAM_CHAT_ID            required for Telegram notifications.
     SUPABASE_URL                optional. Defaults to the project URL already used by the site.
*/
"use strict";

const DEFAULT_SUPABASE_URL = "https://ppqgtzujpoyhglxsykdw.supabase.co";
const SHIPPING_FEE = 90;                       // flat shipping (EGP). Keep equal to SHIPPING_FEE in index.html
const SIZES = [55, 35, 10];
const BUNDLE = { name: "Winter Duo", price: 850 };   // same as BUNDLE in index.html
const COOLDOWN_SECONDS = 30;                   // same phone cannot submit a different order within this time

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const supaHeaders = (key, extra) => {
  const h = { apikey: key, "Content-Type": "application/json", ...(extra || {}) };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;   // legacy JWT keys only; new sb_secret_ keys use apikey alone
  return h;
};

const withTimeout = (ms) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  return { signal: ctl.signal, done: () => clearTimeout(timer) };
};

const normDigits = (v) => String(v || "")
  .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
  .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n) => `${Number(n).toLocaleString("en-US")} ج.م`;

async function loadCatalog(url) {
  const t = withTimeout(5000);
  try {
    const r = await fetch(`${url}/storage/v1/object/public/media/site/storefront.json?v=${Date.now()}`, { cache: "no-store", signal: t.signal });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || !Array.isArray(d.products)) return null;
    const by = {};
    d.products.forEach((p) => { if (p && typeof p.slug === "string") by[p.slug] = p; });
    return by;
  } catch (e) {
    return null;
  } finally { t.done(); }
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { return null; } }
  return b && typeof b === "object" ? b : null;
}

function buildItems(rawItems, catalog) {
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 30) return { error: "invalid" };
  const items = [];
  let verified = !!catalog;
  for (const it of rawItems) {
    if (!it || typeof it !== "object") return { error: "invalid" };
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return { error: "invalid" };
    if (it.bundle) {
      items.push({ key: "bundle-winter-duo", name: BUNDLE.name, ml: null, qty, unit_price: BUNDLE.price, line_total: BUNDLE.price * qty });
      continue;
    }
    const ml = Number(it.ml);
    const slug = clean(it.slug, 80);
    if (!SIZES.includes(ml) || !slug) return { error: "invalid" };
    if (catalog) {
      const p = catalog[slug];
      const P = p && p.prices && p.prices[ml];
      if (!p || !P || typeof P.now !== "number" || P.now < 0 || (p.available && p.available[ml] === false)) {
        return { error: "unavailable", slug };
      }
      items.push({ key: `${slug}-${ml}`, slug, name: clean(p.name, 80), ml, qty, unit_price: P.now, line_total: P.now * qty });
    } else {
      // Catalog unreachable: fall back to the prices the page sent (sanity-checked) and flag the order as unverified.
      const price = Number(it.price);
      if (!Number.isFinite(price) || price <= 0 || price > 100000) return { error: "invalid" };
      verified = false;
      items.push({ key: `${slug}-${ml}`, slug, name: clean(it.name, 80) || slug, ml, qty, unit_price: Math.round(price), line_total: Math.round(price) * qty });
    }
  }
  return { items, verified };
}

function telegramText(o) {
  const lines = o.items.map((i) => `• ${esc(i.name)}${i.ml ? ` – ${i.ml} مل` : ""} × ${i.qty} = ${money(i.line_total)}`).join("\n");
  const digits = o.phone.replace(/\D/g, "");
  const wa = /^(0)?1[0125]\d{8}$/.test(digits) ? `20${digits.replace(/^0/, "")}` : /^20\d{10}$/.test(digits) ? digits : "";
  return [
    `🛍 <b>طلب جديد #${o.order_no}</b>`,
    "",
    `👤 <b>الاسم:</b> ${esc(o.customer_name)}`,
    `📞 <b>الهاتف:</b> ${esc(o.phone)}${wa ? ` (https://wa.me/${wa})` : ""}`,
    `📍 <b>العنوان:</b> ${esc(o.address)}`,
    "",
    lines,
    "",
    `المجموع الفرعي: ${money(o.subtotal)}`,
    `الشحن: ${money(o.shipping)}`,
    `<b>الإجمالي: ${money(o.total)}</b>`,
    o.price_source === "client" ? "\n⚠️ الأسعار لم يتم التحقق منها من السيرفر، راجعها قبل التأكيد." : "",
  ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n").trim();
}

async function sendTelegram(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { ok: false, error: "telegram env vars not set" };
  const t = withTimeout(8000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: t.signal,
      body: JSON.stringify({ chat_id: chat, text: telegramText(order), parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const j = await r.json().catch(() => null);
    if (r.ok && j && j.ok) return { ok: true };
    return { ok: false, error: clean(j && j.description, 200) || `telegram http ${r.status}` };
  } catch (e) {
    return { ok: false, error: "telegram request failed" };   // never include the URL (it contains the token)
  } finally { t.done(); }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { ok: false, error: "method" }); }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sbUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  if (!key) return json(res, 503, { ok: false, error: "server_not_configured" });

  const body = parseBody(req);
  if (!body) return json(res, 400, { ok: false, error: "invalid" });

  // Honeypot: real customers never fill this hidden field. Pretend success, save nothing.
  if (body.website) return json(res, 200, { ok: true, orderNo: "" });

  const c = body.customer || {};
  const name = clean(c.name, 100).replace(/\s+/g, " ");
  const phone = normDigits(clean(c.phone, 30)).replace(/[\s\-().]/g, "");
  const address = clean(c.address, 500);
  const clientRef = clean(body.clientRef, 80);
  if (name.length < 5 || name.split(" ").filter(Boolean).length < 2) return json(res, 400, { ok: false, error: "invalid" });
  if (!/^\+?\d{9,15}$/.test(phone)) return json(res, 400, { ok: false, error: "invalid" });
  if (address.length < 10) return json(res, 400, { ok: false, error: "invalid" });
  if (!/^[\w-]{8,80}$/.test(clientRef)) return json(res, 400, { ok: false, error: "invalid" });

  const catalog = await loadCatalog(sbUrl);
  const built = buildItems(body.items, catalog);
  if (built.error) return json(res, built.error === "unavailable" ? 409 : 400, { ok: false, error: built.error });

  const subtotal = built.items.reduce((n, i) => n + i.line_total, 0);
  const row = {
    client_ref: clientRef,
    customer_name: name,
    phone,
    address,
    items: built.items,
    subtotal,
    shipping: SHIPPING_FEE,
    total: subtotal + SHIPPING_FEE,
    price_source: built.verified ? "server" : "client",
    lang: body.lang === "ar" ? "ar" : "en",
    status: "new",
  };

  try {
    // Same phone, different order, within the cooldown window: reject (basic spam / double-tap protection).
    const since = new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString();
    const t0 = withTimeout(8000);
    const recent = await fetch(`${sbUrl}/rest/v1/orders?select=id,client_ref&phone=eq.${encodeURIComponent(phone)}&created_at=gte.${encodeURIComponent(since)}&limit=1`,
      { headers: supaHeaders(key), signal: t0.signal }).finally(t0.done);
    if (recent.ok) {
      const rows = await recent.json();
      if (Array.isArray(rows) && rows.length && rows[0].client_ref !== clientRef) return json(res, 429, { ok: false, error: "too_many" });
    }

    const t1 = withTimeout(10000);
    const ins = await fetch(`${sbUrl}/rest/v1/orders`, {
      method: "POST", headers: supaHeaders(key, { Prefer: "return=representation" }), body: JSON.stringify(row), signal: t1.signal,
    }).finally(t1.done);

    if (ins.status === 409) {
      // Same clientRef already saved (customer retried after a timeout): return the existing order, do not notify again.
      const t2 = withTimeout(8000);
      const ex = await fetch(`${sbUrl}/rest/v1/orders?select=order_no&client_ref=eq.${encodeURIComponent(clientRef)}&limit=1`, { headers: supaHeaders(key), signal: t2.signal }).finally(t2.done);
      const rows = ex.ok ? await ex.json() : [];
      if (rows[0]) return json(res, 200, { ok: true, orderNo: rows[0].order_no });
    }
    if (!ins.ok) {
      console.error("orders insert failed", ins.status, clean(await ins.text().catch(() => ""), 300));
      return json(res, 502, { ok: false, error: "server" });
    }
    const saved = (await ins.json())[0];

    const tg = await sendTelegram({ ...row, order_no: saved.order_no });
    const t3 = withTimeout(8000);
    await fetch(`${sbUrl}/rest/v1/orders?id=eq.${saved.id}`, {
      method: "PATCH", headers: supaHeaders(key), signal: t3.signal,
      body: JSON.stringify({ telegram_sent: tg.ok, telegram_error: tg.ok ? null : tg.error }),
    }).catch(() => null).finally(t3.done);
    if (!tg.ok) console.error("telegram notification failed:", tg.error);

    return json(res, 200, { ok: true, orderNo: saved.order_no });
  } catch (e) {
    console.error("order failed", e && e.message);
    return json(res, 502, { ok: false, error: "server" });
  }
};
