/* POST /api/wa-notify  (Cloudflare Pages Function: generated from api/wa-notify.js by scripts/make-cf-wa-notify.py, do not edit)
   Sent by the storefront when a customer taps a WhatsApp order button. It forwards the same order text to the
   owner's Telegram bot. It does NOT use Supabase at all, so it keeps working when Supabase is down or restricted.
   Nothing is saved. The Telegram message is clearly marked as a WhatsApp order that was not saved in the dashboard.

   Environment variables (same ones as api/order.js):
     TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

   Abuse limits (this endpoint is public, so it is deliberately strict):
     - Only browsers on the shop's own site (Origin/Referer allow-list). Scripts can fake this header, so it is a first filter only.
     - Same strict validation as /api/order (name, 01xxxxxxxxx phone, address, known size, quantity, sane price).
     - Hidden honeypot field, body size cap, at most 10 items.
     - One Telegram message per order (clientRef), per phone (2 min), per IP (5 per 10 min), and a global cap per hour.
       Counters are in memory (no database), so they are per server instance and reset on a cold start: best effort.
     - The message goes only to the owner's own chat. Text is HTML-escaped and length-capped. Nothing is echoed back to the caller.
*/
"use strict";

let ENV = {};   // filled from the Pages Function context on every request

const SIZES = [55, 35, 10];
const BUNDLE = { name: "Winter Duo", price: 850 };   // same as BUNDLE in index.html
const MAX_BODY = 8000;
const LIMITS = { ipMax: 5, ipWindowMs: 10 * 60 * 1000, phoneMs: 2 * 60 * 1000, globalMax: 40, globalWindowMs: 60 * 60 * 1000, refMs: 24 * 60 * 60 * 1000 };
const ORIGIN_OK = /^https:\/\/((www\.)?mawjaa\.store|([a-z0-9-]+\.)?mawja-preview\.pages\.dev)$/i;

const state = globalThis.__waNotify || (globalThis.__waNotify = { ip: new Map(), phone: new Map(), ref: new Map(), global: [] });

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
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

function parseBody(req) {
  let b = req.body;
  if (typeof b === "string") { if (b.length > MAX_BODY) return null; try { b = JSON.parse(b); } catch (e) { return null; } }
  else if (b && typeof b === "object" && JSON.stringify(b).length > MAX_BODY) return null;
  return b && typeof b === "object" ? b : null;
}

function buildItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 10) return null;
  const items = [];
  for (const it of rawItems) {
    if (!it || typeof it !== "object") return null;
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return null;
    if (it.bundle) { items.push({ name: BUNDLE.name, ml: null, qty, line_total: BUNDLE.price * qty }); continue; }
    const ml = Number(it.ml), slug = clean(it.slug, 80), price = Number(it.price);
    if (!SIZES.includes(ml) || !/^[\w-]{1,80}$/.test(slug)) return null;
    if (!Number.isFinite(price) || price <= 0 || price > 100000) return null;
    items.push({ name: clean(it.name, 80) || slug, ml, qty, line_total: Math.round(price) * qty });
  }
  return items;
}

function telegramText(o) {
  const lines = o.items.map((i) => `• ${esc(i.name)}${i.ml ? ` – ${i.ml} مل` : ""} × ${i.qty} = ${money(i.line_total)}`).join("\n");
  const digits = o.phone.replace(/\D/g, "");
  const wa = /^(0)?1[0125]\d{8}$/.test(digits) ? `20${digits.replace(/^0/, "")}` : "";
  return [
    `📲 <b>طلب واتساب (غير محفوظ في الداشبورد)</b>`,
    "",
    `👤 <b>الاسم:</b> ${esc(o.name)}`,
    `📞 <b>الهاتف:</b> ${esc(o.phone)}${wa ? ` (https://wa.me/${wa})` : ""}`,
    o.governorate ? `🗺 <b>المحافظة:</b> ${esc(o.governorate)}` : "",
    `📍 <b>العنوان:</b> ${esc(o.address)}`,
    "",
    lines,
    "",
    `المجموع الفرعي: ${money(o.subtotal)}`,
    `الشحن: ${money(o.shipping)}`,
    `<b>الإجمالي: ${money(o.total)}</b>`,
    "",
    "⚠️ العميل ضغط زر واتساب. الطلب ده وصل من الموقع بدون حفظ وبأسعار الصفحة (غير متحقق منها). لو العميل بعت الرسالة على واتساب، أكّد معاه هناك. ممكن يكون نفس الطلب اتسجل في الداشبورد قبل كده، راجع برقم الموبايل.",
  ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n").trim();
}

async function sendTelegram(text) {
  const token = ENV.TELEGRAM_BOT_TOKEN, chat = ENV.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { ok: false, error: "not_configured" };
  const t = withTimeout(8000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: t.signal,
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const j = await r.json().catch(() => null);
    return r.ok && j && j.ok ? { ok: true } : { ok: false, error: `telegram http ${r.status}` };
  } catch (e) {
    return { ok: false, error: "telegram request failed" };   // never include the URL (it contains the token)
  } finally { t.done(); }
}

function sweep(now) {
  for (const [k, v] of state.ref) if (now - v > LIMITS.refMs) state.ref.delete(k);
  for (const [k, v] of state.phone) if (now - v > LIMITS.phoneMs) state.phone.delete(k);
  for (const [k, v] of state.ip) { const a = v.filter((t) => now - t < LIMITS.ipWindowMs); if (a.length) state.ip.set(k, a); else state.ip.delete(k); }
  state.global = state.global.filter((t) => now - t < LIMITS.globalWindowMs);
}

async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { ok: false, error: "method" }); }
  const h = req.headers || {};
  const origin = String(h.origin || "");
  const referer = String(h.referer || "");
  const refOrigin = (referer.match(/^(https?:\/\/[^/]+)/i) || [])[1] || "";
  if (!(origin ? ORIGIN_OK.test(origin) : ORIGIN_OK.test(refOrigin))) return json(res, 403, { ok: false, error: "origin" });

  const body = parseBody(req);
  if (!body) return json(res, 400, { ok: false, error: "invalid" });
  if (body.website) return json(res, 200, { ok: true });   // honeypot: pretend success

  const c = body.customer || {};
  const name = clean(c.name, 100).replace(/\s+/g, " ");
  let phone = normDigits(clean(c.phone, 30)).replace(/[\s\-().]/g, "");
  if (phone.startsWith("+") || phone.startsWith("00")) {
    phone = phone.replace(/^(\+|00)/, "");
    if (phone.startsWith("20")) phone = phone.slice(2);
    if (!phone.startsWith("0")) phone = "0" + phone;
  }
  const address = clean(c.address, 300);
  const clientRef = clean(body.clientRef, 80);
  if (name.length < 5 || name.split(" ").filter(Boolean).length < 2) return json(res, 400, { ok: false, error: "invalid" });
  if (!/^01\d{9}$/.test(phone)) return json(res, 400, { ok: false, error: "invalid" });
  if (address.length < 10) return json(res, 400, { ok: false, error: "invalid" });
  if (!/^[\w-]{8,80}$/.test(clientRef)) return json(res, 400, { ok: false, error: "invalid" });
  const items = buildItems(body.items);
  if (!items) return json(res, 400, { ok: false, error: "invalid" });

  const fee = Number(body.shippingFee);
  const shipping = Number.isFinite(fee) && fee >= 0 && fee <= 1000 ? Math.round(fee) : 0;
  const subtotal = items.reduce((n, i) => n + i.line_total, 0);
  const governorate = clean(body.governorate, 60) || null;

  const now = Date.now();
  sweep(now);
  if (state.ref.has(clientRef)) return json(res, 200, { ok: true, duplicate: true });   // already forwarded: stay quiet
  const ip = String(h["cf-connecting-ip"] || h["x-real-ip"] || String(h["x-forwarded-for"] || "").split(",")[0] || "unknown").trim();
  const ipHits = state.ip.get(ip) || [];
  if (ipHits.length >= LIMITS.ipMax) return json(res, 429, { ok: false, error: "too_many" });
  if (state.phone.has(phone)) return json(res, 429, { ok: false, error: "too_many" });
  if (state.global.length >= LIMITS.globalMax) return json(res, 429, { ok: false, error: "too_many" });

  const tg = await sendTelegram(telegramText({ name, phone, address, governorate, items, subtotal, shipping, total: subtotal + shipping }));
  if (!tg.ok) { console.error("wa-notify telegram failed:", tg.error); return json(res, 502, { ok: false, error: "server" }); }
  state.ref.set(clientRef, now); state.phone.set(phone, now); state.ip.set(ip, [...ipHits, now]); state.global.push(now);
  return json(res, 200, { ok: true });
}

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
  const rh = {};
  request.headers.forEach((v, k) => { rh[k.toLowerCase()] = v; });
  await handler({ method: request.method, body: bodyText, headers: rh }, res);
  return new Response(out, { status, headers });
}
