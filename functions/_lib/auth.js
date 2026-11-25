/* Admin session helpers (Workers runtime). Password: PBKDF2-SHA256. Session: HMAC-signed cookie. */
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const ITER = 100000;

export async function hashPassword(pw, saltB64) {
  const salt = saltB64 ? unb64u(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
  return { salt: b64u(salt), hash: b64u(bits) };
}
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
async function hmac(secret, data) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
export async function makeSession(env, email) {
  const payload = b64u(enc.encode(JSON.stringify({ e: email, x: Date.now() + 7 * 864e5 })));
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}
export async function readSession(env, request) {
  if (!env.SESSION_SECRET) return null;
  const m = /(?:^|;\s*)mw_admin=([^;]+)/.exec(request.headers.get("Cookie") || "");
  if (!m) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig || !safeEqual(sig, await hmac(env.SESSION_SECRET, payload))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    return p.x > Date.now() ? p : null;
  } catch (e) { return null; }
}
export const cookie = (val, maxAge) => `mw_admin=${val}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
