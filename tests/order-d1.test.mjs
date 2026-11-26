// Run: node --experimental-sqlite tests/order-d1.test.mjs   (in-memory D1 stand-in, no network)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert";
import { onRequest } from "../functions/api/order.js";

const CATALOG = { products: [{ slug: "honey", name: "Honey", prices: { 10: { now: 300 }, 35: { now: 600 }, 55: { now: 900 } } }], shipping: [{ name: "Gharbia", fee: 60 }] };
function makeDb(catalog) {
  const raw = new DatabaseSync(":memory:");
  raw.exec("CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT)");
  raw.exec("CREATE TABLE orders (order_no INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT, client_ref TEXT UNIQUE, customer_name TEXT, phone TEXT, address TEXT, governorate TEXT, items TEXT, subtotal INT, shipping INT, total INT, price_source TEXT, lang TEXT, status TEXT, telegram_sent INT, telegram_error TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))");
  if (catalog) raw.prepare("INSERT INTO kv VALUES ('storefront', ?)").run(JSON.stringify(catalog));
  const mk = (sql, args = []) => ({ bind: (...a) => mk(sql, a),
    first: async () => raw.prepare(sql).get(...args) || null,
    run: async () => { const r = raw.prepare(sql).run(...args); return { meta: r }; },
    all: async () => ({ results: raw.prepare(sql).all(...args) }) });
  return { prepare: (s) => mk(s), raw };
}
let tg = 0;
globalThis.fetch = async (u) => { if (String(u).includes("api.telegram.org")) { tg++; return { ok: true, json: async () => ({ ok: true }) }; } throw new Error("unexpected " + u); };
const call = async (env, body, ip) => {
  const req = new Request("https://mawjaa.store/api/order", { method: "POST", headers: { Origin: "https://mawjaa.store", "CF-Connecting-IP": ip }, body: JSON.stringify(body) });
  const r = await onRequest({ env, request: req }); return { status: r.status, body: await r.json() };
};
let n = 0;
const order = (o = {}) => ({ clientRef: "ref-" + (++n) + "-abcdefgh", lang: "en", governorate: "Gharbia", customer: { name: "Test Person", phone: "01012345678", address: "Tanta, street 1, building 2" }, items: [{ slug: "honey", ml: 10, qty: 1, price: 1 }], ...o });
const res = [];
const t = async (name, fn) => { try { await fn(); res.push("PASS " + name); } catch (e) { res.push("FAIL " + name + ": " + e.message); process.exitCode = 1; } };
const env = (db) => ({ DB: db, TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "c" });

await t("price comes from catalog, browser price ignored", async () => {
  const db = makeDb(CATALOG); const r = await call(env(db), order(), "1.1.1.1");
  assert.strictEqual(r.status, 200);
  const row = db.raw.prepare("SELECT subtotal,shipping,total,price_source FROM orders").get();
  assert.deepStrictEqual({ ...row }, { subtotal: 300, shipping: 60, total: 360, price_source: "server" });
});
await t("catalog unreadable: 503, nothing saved, browser price not used", async () => {
  const db = makeDb(null); const r = await call(env(db), order(), "1.1.1.2");
  assert.strictEqual(r.status, 503); assert.strictEqual(r.body.error, "catalog");
  assert.strictEqual(db.raw.prepare("SELECT COUNT(*) c FROM orders").get().c, 0);
});
await t("per phone cap: 4th order within the hour refused", async () => {
  const db = makeDb(CATALOG); const e = env(db); const out = [];
  for (let i = 0; i < 4; i++) { db.raw.exec("DELETE FROM orders"); out.push((await call(e, order(), "2.2.2." + i)).status); }
  assert.deepStrictEqual(out, [200, 200, 200, 429]);
});
await t("retry of same clientRef is not counted or re-alerted", async () => {
  const db = makeDb(CATALOG); const e = env(db); const o = order(); const before = tg;
  await call(e, o, "3.3.3.3"); const r2 = await call(e, o, "3.3.3.3");
  assert.strictEqual(r2.status, 200); assert.strictEqual(tg - before, 1);
});
await t("per IP cap: 7th order from one IP refused", async () => {
  const db = makeDb(CATALOG); const e = env(db); let last;
  for (let i = 0; i < 7; i++) { db.raw.exec("DELETE FROM orders"); last = await call(e, order({ customer: { name: "Test Person", phone: "010123456" + (10 + i), address: "Tanta, street 1, building 2" } }), "4.4.4.4"); }
  assert.strictEqual(last.status, 429); assert.strictEqual(last.body.error, "busy");
});
await t("global fuse: 31st order in 10 minutes refused", async () => {
  const db = makeDb(CATALOG); const e = env(db); let last;
  for (let i = 0; i < 31; i++) { db.raw.exec("DELETE FROM orders"); last = await call(e, order({ customer: { name: "Test Person", phone: "0111234" + String(1000 + i), address: "Tanta, street 1, building 2" } }), "5.5." + i + ".1"); }
  assert.strictEqual(last.status, 429);
});
console.log(res.join("\n"));
