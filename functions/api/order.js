/* POST /api/order  (Cloudflare Pages Function: same logic as api/order.js, wrapped for the Workers runtime)
   Receives an order from the storefront, re-prices it on the server, saves it in Supabase (table "orders"),
   then sends a Telegram notification.

   Environment variables (set in Vercel -> Project -> Settings -> Environment Variables, never in the browser code):
     SUPABASE_SERVICE_ROLE_KEY   required. Supabase "service_role" / secret key. Server only.
     TELEGRAM_BOT_TOKEN          required for Telegram notifications.
     TELEGRAM_CHAT_ID            required for Telegram notifications.
     SUPABASE_URL                optional. Defaults to the project URL already used by the site.
*/
"use strict";

let ENV = {};   // filled from the Pages Function context on every request

const DEFAULT_SUPABASE_URL = "https://ppqgtzujpoyhglxsykdw.supabase.co";
const FREE_SHIPPING_OVER = 900;               // EGP: shipping is free when the items subtotal (before shipping) is this amount or MORE. Keep equal to FREE_SHIPPING_OVER in index.html
const SHIPPING_FEE = 90;                       // flat fallback (EGP), used only when no governorates are set in the dashboard. Keep equal to SHIPPING_FEE in index.html
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

async function loadCatalog(url, host) {
  if (ENV.DB) {
    try {
      const r = await ENV.DB.prepare("SELECT v FROM kv WHERE k='storefront'").first();
      const c = r && parseCatalog(JSON.parse(r.v));
      if (c) return c;
    } catch (e) { /* use the static copy */ }
  }
  // Same-site copy first (exactly what the page shows, no Supabase traffic); Supabase only if it is missing.
  const own = host ? await loadCatalogFrom(null, host) : null;
  if (own || ENV.DB) return own;   // on Cloudflare (D1 bound) never fall back to Supabase: the catalog lives in D1 and the same-site copy
  return loadCatalogFrom(`${url}/storage/v1/object/public/media/site/storefront.json?v=${Date.now()}`, null);
}
async function loadCatalogFrom(src, host) {
  const t = withTimeout(5000);
  try {
    const r = host && ENV.ASSETS && ENV.ASSETS.fetch
      ? await ENV.ASSETS.fetch(new Request(`https://${host}/site-data/storefront.json`))
      : await fetch(src || `https://${host}/site-data/storefront.json`, { cache: "no-store", signal: t.signal });
    if (!r.ok) return null;
    const d = await r.json();
    return parseCatalog(d);
  } catch (e) {
    return null;
  } finally { t.done(); }
}
function parseCatalog(d) {
  {
    if (!d || !Array.isArray(d.products)) return null;
    const by = {};
    d.products.forEach((p) => { if (p && typeof p.slug === "string") by[p.slug] = p; });
    const zones = Array.isArray(d.shipping)
      ? d.shipping.filter((z) => z && typeof z.name === "string" && z.name.trim() && typeof z.fee === "number" && z.fee >= 0 && z.fee <= 100000)
      : [];
    return { by, zones };
  }
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { return null; } }
  return b && typeof b === "object" ? b : null;
}

function buildItems(rawItems, catalog) {
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 30) return { error: "invalid" };
  const items = [];
  if (!catalog) return { error: "catalog" };   // never trust prices sent by the browser
  const verified = true;
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
    const p = catalog[slug];
    const P = p && p.prices && p.prices[ml];
    if (!p || !P || typeof P.now !== "number" || P.now < 0 || (p.available && p.available[ml] === false)) {
      return { error: "unavailable", slug };
    }
    items.push({ key: `${slug}-${ml}`, slug, name: clean(p.name, 80), ml, qty, unit_price: P.now, line_total: P.now * qty });
  }
  return { items, verified };
}

// Telegram text is Arabic (right to left) with Latin names, numbers and links inside. Unicode isolates keep each value stable:
// LRI..PDI = always left to right (numbers, order no, items), FSI..PDI = direction follows the first letter (names, addresses).
const LRI = "\u2066", FSI = "\u2068", PDI = "\u2069";
const ltr = (s) => `${LRI}${s}${PDI}`;
const auto = (s) => `${FSI}${s}${PDI}`;
function telegramText(o) {
  const lines = o.items.map((i) => {
    const unit = i.unit_price != null ? i.unit_price : Math.round(i.line_total / i.qty);
    return `${ltr(`• ${esc(i.name)}${i.ml ? ` - ${i.ml}ml` : ""}`)}\n${ltr(`   ${i.qty} × ${Number(unit).toLocaleString("en-US")} = ${money(i.line_total)}`)}`;
  }).join("\n");
  const digits = o.phone.replace(/\D/g, "");
  const wa = /^(0)?1[0125]\d{8}$/.test(digits) ? `20${digits.replace(/^0/, "")}` : /^20\d{10}$/.test(digits) ? digits : "";
  return [
    `🛍 <b>طلب جديد</b> ${ltr("#" + o.order_no)}`,
    "",
    `👤 <b>الاسم:</b> ${auto(esc(o.customer_name))}`,
    `📞 <b>الهاتف:</b> ${ltr(esc(o.phone))}`,
    wa ? `💬 <b>واتساب:</b>\nhttps://wa.me/${wa}` : "",
    o.governorate ? `🗺 <b>المحافظة:</b> ${auto(esc(o.governorate))}` : "",
    `📍 <b>العنوان:</b>\n${auto(esc(o.address))}`,
    "",
    `🧴 <b>المنتجات:</b>`,
    lines,
    "",
    `المجموع الفرعي: ${ltr(money(o.subtotal))}`,
    `الشحن: ${ltr(money(o.shipping))}`,
    `<b>الإجمالي: ${ltr(money(o.total))}</b>`,
    o.price_source === "client" ? "\n⚠️ الأسعار لم يتم التحقق منها من السيرفر، راجعها قبل التأكيد." : "",
  ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n").trim();
}

async function sendTelegram(order) {
  const token = ENV.TELEGRAM_BOT_TOKEN, chat = ENV.TELEGRAM_CHAT_ID;
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

async function saveD1(res, row, clientRef, phone, address, ip) {
  const db = ENV.DB;
  try {
    const since = new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString();
    const recent = await db.prepare("SELECT client_ref FROM orders WHERE phone=? AND created_at>=? LIMIT 1").bind(phone, since).first();
    if (recent && recent.client_ref !== clientRef) return json(res, 429, { ok: false, error: "too_many" });
    const ex0 = await db.prepare("SELECT order_no FROM orders WHERE client_ref=?").bind(clientRef).first();
    if (ex0) return json(res, 200, { ok: true, orderNo: ex0.order_no });   // retry of an order already saved: no second alert
    // Flood protection (free, in D1): at most 6 new orders per hour from one IP address and 30 per 10 minutes overall.
    await db.prepare("CREATE TABLE IF NOT EXISTS order_rate (ip TEXT NOT NULL, t INTEGER NOT NULL)").run();
    const now = Date.now();
    await db.prepare("DELETE FROM order_rate WHERE t<?").bind(now - 86400000).run();
    const perIp = (await db.prepare("SELECT COUNT(*) c FROM order_rate WHERE ip=? AND t>=?").bind(ip || "x", now - 3600000).first()).c;
    const all10 = (await db.prepare("SELECT COUNT(*) c FROM order_rate WHERE t>=? AND ip NOT LIKE 'ph:%'").bind(now - 600000).first()).c;
    // Per phone: at most 3 new orders per hour and 6 per day (rows keyed "ph:<phone>"; a retry of the same order returned above).
    const pk = "ph:" + phone;
    const phHr = (await db.prepare("SELECT COUNT(*) c FROM order_rate WHERE ip=? AND t>=?").bind(pk, now - 3600000).first()).c;
    const phDay = (await db.prepare("SELECT COUNT(*) c FROM order_rate WHERE ip=? AND t>=?").bind(pk, now - 86400000).first()).c;
    if (perIp >= 6 || all10 >= 30) return json(res, 429, { ok: false, error: "busy" });
    if (phHr >= 3 || phDay >= 6) return json(res, 429, { ok: false, error: "too_many" });
    await db.prepare("INSERT INTO order_rate(ip,t) VALUES(?,?)").bind(ip || "x", now).run();
    await db.prepare("INSERT INTO order_rate(ip,t) VALUES(?,?)").bind(pk, now).run();
    const id = crypto.randomUUID();
    const ins = await db.prepare("INSERT INTO orders (id, client_ref, customer_name, phone, address, governorate, items, subtotal, shipping, total, price_source, lang, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'new')")
      .bind(id, clientRef, row.customer_name, phone, address, row.governorate, JSON.stringify(row.items), row.subtotal, row.shipping, row.total, row.price_source, row.lang).run().catch(async (e) => {
        const ex = await db.prepare("SELECT order_no FROM orders WHERE client_ref=?").bind(clientRef).first();
        if (ex) return { dup: ex.order_no };
        throw e;
      });
    if (ins.dup) return json(res, 200, { ok: true, orderNo: ins.dup });
    const saved = await db.prepare("SELECT order_no FROM orders WHERE id=?").bind(id).first();
    const tg = await sendTelegram({ ...row, address, order_no: saved.order_no });
    await db.prepare("UPDATE orders SET telegram_sent=?, telegram_error=? WHERE id=?").bind(tg.ok ? 1 : 0, tg.ok ? null : tg.error, id).run().catch(() => null);
    if (!tg.ok) console.error("telegram notification failed:", tg.error);
    return json(res, 200, { ok: true, orderNo: saved.order_no });
  } catch (e) {
    console.error("order failed (d1)", e && e.message);
    return json(res, 502, { ok: false, error: "server" });
  }
}

const handler = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { ok: false, error: "method" }); }

  // Only the shop's own pages may place orders (a script can fake this header, so it is a first filter next to the rate limit).
  const org = String(req.headers && req.headers.origin || "");
  if (!/^https:\/\/(mawjaa\.store|([a-z0-9-]+\.)?mawja-preview\.pages\.dev)$/.test(org)) return json(res, 403, { ok: false, error: "origin" });

  const key = ENV.SUPABASE_SERVICE_ROLE_KEY;
  const sbUrl = (ENV.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  if (!key && !ENV.DB) return json(res, 503, { ok: false, error: "server_not_configured" });

  const body = parseBody(req);
  if (!body) return json(res, 400, { ok: false, error: "invalid" });

  // Honeypot: real customers never fill this hidden field. Pretend success, save nothing.
  if (body.website) return json(res, 200, { ok: true, orderNo: "" });

  const c = body.customer || {};
  const name = clean(c.name, 100).replace(/\s+/g, " ");
  let phone = normDigits(clean(c.phone, 30)).replace(/[\s\-().]/g, "");
  if (phone.startsWith("+") || phone.startsWith("00")) {
    phone = phone.replace(/^(\+|00)/, "");
    if (phone.startsWith("20")) phone = phone.slice(2);
    if (!phone.startsWith("0")) phone = "0" + phone;
  }
  const address = clean(c.address, 500);
  const clientRef = clean(body.clientRef, 80);
  if (name.length < 5 || name.split(" ").filter(Boolean).length < 2) return json(res, 400, { ok: false, error: "invalid" });
  if (!/^01\d{9}$/.test(phone)) return json(res, 400, { ok: false, error: "invalid" });
  if (address.length < 10) return json(res, 400, { ok: false, error: "invalid" });
  if (!/^[\w-]{8,80}$/.test(clientRef)) return json(res, 400, { ok: false, error: "invalid" });

  const store = await loadCatalog(sbUrl, /(^|\.)(mawjaa\.store|mawja-preview\.pages\.dev)$/.test(String(req.headers && req.headers.host || "")) ? req.headers.host : "");
  const catalog = store && store.by;
  // Catalog (prices, shipping) unreadable: refuse the order. Nothing is saved and no browser-sent price is ever used.
  if (!store) return json(res, 503, { ok: false, error: "catalog" });
  const built = buildItems(body.items, catalog);
  if (built.error) return json(res, built.error === "unavailable" ? 409 : built.error === "catalog" ? 503 : 400, { ok: false, error: built.error });

  // Shipping: by governorate when the dashboard has a list; flat fallback when it has none.
  let shipping = SHIPPING_FEE, governorate = null;
  const govIn = clean(body.governorate, 60);
  if (store && store.zones.length) {
    const z = store.zones.find((x) => x.name.trim() === govIn);
    if (!z) return json(res, 409, { ok: false, error: "shipping" });
    shipping = z.fee; governorate = z.name.trim();
  }

  const subtotal = built.items.reduce((n, i) => n + i.line_total, 0);
  if (subtotal >= FREE_SHIPPING_OVER) shipping = 0;   // free shipping over the threshold, applied automatically
  const row = {
    client_ref: clientRef,
    customer_name: name,
    phone,
    address,
    governorate,
    items: built.items,
    subtotal,
    shipping,
    total: subtotal + shipping,
    price_source: built.verified ? "server" : "client",
    lang: body.lang === "ar" ? "ar" : "en",
    status: "new",
  };

  if (ENV.DB) return saveD1(res, row, clientRef, phone, address, req.headers && req.headers.ip);

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

    const insert = async (r) => {
      const t1 = withTimeout(10000);
      return fetch(`${sbUrl}/rest/v1/orders`, {
        method: "POST", headers: supaHeaders(key, { Prefer: "return=representation" }), body: JSON.stringify(r), signal: t1.signal,
      }).finally(t1.done);
    };
    let ins = await insert(row);
    if (!ins.ok && ins.status !== 409 && row.governorate) {
      // The "governorate" column is missing (supabase/002 not run yet): save without it and keep the governorate inside the address.
      const msg = await (typeof ins.clone === "function" ? ins.clone() : ins).text().catch(() => "");
      if (/governorate/i.test(msg)) {
        delete row.governorate;
        row.address = `${governorate} - ${address}`.slice(0, 600);
        ins = await insert(row);
        row.governorate = governorate;
      }
    }

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

    const tg = await sendTelegram({ ...row, address, order_no: saved.order_no });
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

export async function onRequest(context) {
  ENV = context.env || {};
  const request = context.request;
  const headers = new Headers();
  let status = 200, out = "";
  const res = {
    set statusCode(v) { status = v; },
    setHeader(k, v) { headers.set(k, v); },
    end(b) { out = b; },
  };
  let bodyText = "";
  if (request.method === "POST") { try { bodyText = await request.text(); } catch (e) { bodyText = ""; } }
  await handler({ method: request.method, body: bodyText, headers: { host: new URL(request.url).host, origin: request.headers.get("Origin") || "", ip: request.headers.get("CF-Connecting-IP") || "" } }, res);
  return new Response(out, { status, headers });
}
