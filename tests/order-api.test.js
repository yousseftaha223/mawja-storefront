// Run: node tests/order-api.test.js   (no network, fetch is mocked)
"use strict";
const assert = require("assert");
process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
process.env.TELEGRAM_BOT_TOKEN = "t"; process.env.TELEGRAM_CHAT_ID = "c";
const handler = require("../api/order.js");

const CATALOG = { products: [{ slug: "honey", name: "Honey", prices: { 10: { now: 300 }, 35: { now: 600 }, 55: { now: 900 } } }], shipping: [{ name: "Gharbia", fee: 60 }] };
let state;
const reset = (o) => { state = Object.assign({ catalogUp: true, orders: [], inserted: [], tg: 0, slow: 0 }, o || {}); };
global.fetch = async (url, opts) => {
  url = String(url); opts = opts || {};
  if (url.includes("storefront.json")) return state.catalogUp ? { ok: true, json: async () => CATALOG } : (() => { throw new Error("down"); })();
  if (url.includes("api.telegram.org")) { state.tg++; return { ok: true, json: async () => ({ ok: true }) }; }
  if (url.includes("/rest/v1/orders")) {
    if (opts.method === "POST") { const r = JSON.parse(opts.body); state.inserted.push(r); state.orders.push({ client_ref: r.client_ref, created_at: new Date().toISOString(), phone: r.phone }); return { ok: true, status: 201, json: async () => [{ id: 1, order_no: 100 + state.inserted.length }], text: async () => "" }; }
    if (opts.method === "PATCH") return { ok: true, json: async () => ({}) };
    const q = new URL(url).searchParams; const ph = q.get("phone");
    let rows = state.orders; if (ph) rows = rows.filter((o) => "eq." + o.phone === ph);
    return { ok: true, json: async () => rows };
  }
  throw new Error("unexpected " + url);
};
let ipn = 0;
const call = async (body, ip) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } };
  await handler({ method: "POST", body, headers: { "x-real-ip": ip || `9.9.9.${++ipn}` } }, res);
  return res;
};
const order = (o) => Object.assign({ clientRef: "ref-" + Math.random().toString(36).slice(2, 12), lang: "en", governorate: "Gharbia",
  customer: { name: "Test Person", phone: "01012345678", address: "Tanta, street 1, building 2" },
  items: [{ slug: "honey", ml: 10, qty: 1, price: 1 }] }, o);

(async () => {
  const results = [];
  const t = async (name, fn) => { reset(); try { await fn(); results.push("PASS " + name); } catch (e) { results.push("FAIL " + name + ": " + e.message); process.exitCode = 1; } };

  await t("verified price comes from catalog, client price ignored", async () => {
    const r = await call(order()); assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(state.inserted[0].subtotal, 300); assert.strictEqual(state.inserted[0].shipping, 60); assert.strictEqual(state.inserted[0].price_source, "server");
  });
  await t("catalog down and no cached copy: order refused (503), nothing saved", async () => {
    require.cache; // fresh module state
    delete require.cache[require.resolve("../api/order.js")];
    const h = require("../api/order.js"); state.catalogUp = false;
    const res = { headers: {}, setHeader() {}, end(b) { this.body = JSON.parse(b); } };
    await h({ method: "POST", body: order({ items: [{ slug: "honey", ml: 10, qty: 1, price: 1 }], shippingFee: 0 }), headers: { "x-real-ip": "1.1.1.1" } }, res);
    assert.strictEqual(res.statusCode, 503); assert.strictEqual(res.body.error, "catalog"); assert.strictEqual(state.inserted.length, 0);
  });
  await t("catalog goes down after a good read: recent verified copy still prices server-side", async () => {
    delete require.cache[require.resolve("../api/order.js")];
    const h = require("../api/order.js");
    const mk = () => ({ headers: {}, setHeader() {}, end(b) { this.body = JSON.parse(b); } });
    let r = mk(); await h({ method: "POST", body: order(), headers: { "x-real-ip": "2.2.2.2" } }, r); assert.strictEqual(r.statusCode, 200);
    state.catalogUp = false; state.orders = [];
    r = mk(); await h({ method: "POST", body: order({ customer: { name: "Other Person", phone: "01099999999", address: "Cairo, street 5, flat 3" } }), headers: { "x-real-ip": "2.2.2.3" } }, r);
    assert.strictEqual(r.statusCode, 200); assert.strictEqual(state.inserted[1].subtotal, 300);
  });
  await t("unknown product / wrong shipping zone rejected", async () => {
    assert.strictEqual((await call(order({ items: [{ slug: "nope", ml: 10, qty: 1 }] }))).statusCode, 409);
    assert.strictEqual((await call(order({ governorate: "Mars" }))).statusCode, 409);
  });
  await t("same phone, different order within 30s: 429 too_many + Retry-After", async () => {
    assert.strictEqual((await call(order())).statusCode, 200);
    const r = await call(order()); assert.strictEqual(r.statusCode, 429); assert.strictEqual(r.body.error, "too_many"); assert.ok(r.headers["Retry-After"]);
  });
  await t("same clientRef retry is not blocked by cooldown", async () => {
    const o = order(); assert.strictEqual((await call(o)).statusCode, 200); state.orders[0].created_at = new Date().toISOString();
    assert.notStrictEqual((await call(o)).statusCode, 429);
  });
  await t("phone hourly cap (3) enforced", async () => {
    const old = (m) => new Date(Date.now() - m * 60000).toISOString();
    state.orders = [1, 2, 3].map((i) => ({ client_ref: "x" + i + "aaaaaaa", created_at: old(5 + i * 5), phone: "01012345678" }));
    const r = await call(order()); assert.strictEqual(r.statusCode, 429);
  });
  await t("per-IP limit: 7th request in window gets 429 busy", async () => {
    let last;
    for (let i = 0; i < 7; i++) last = await call(order({ customer: { name: "Test Person", phone: "0101234" + String(1000 + i), address: "Tanta, street 1, building 2" } }), "7.7.7.7");
    assert.strictEqual(last.statusCode, 429); assert.strictEqual(last.body.error, "busy");
  });
  await t("global fuse: >100 orders in 10 minutes returns busy", async () => {
    state.orders = Array.from({ length: 101 }, (_, i) => ({ client_ref: "g" + i + "xxxxxxx", created_at: new Date().toISOString(), phone: "0100000" + String(1000 + i) }));
    const r = await call(order()); assert.strictEqual(r.statusCode, 429); assert.strictEqual(r.body.error, "busy");
  });
  await t("honeypot still silently succeeds without saving", async () => {
    const r = await call(order({ website: "spam" })); assert.strictEqual(r.statusCode, 200); assert.strictEqual(state.inserted.length, 0);
  });
  console.log(results.join("\n"));
})();
