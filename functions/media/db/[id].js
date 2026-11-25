/* GET /media/db/<id>.<ext>  image stored in D1 (only active where the DB binding exists). */
export async function onRequestGet({ env, params }) {
  if (!env.DB) return new Response("Not found", { status: 404 });
  const id = String(params.id || "").replace(/\.\w+$/, "");
  const r = /^[a-z0-9]+$/.test(id) ? await env.DB.prepare("SELECT mime,b64 FROM media WHERE id=?").bind(id).first() : null;
  if (!r) return new Response("Not found", { status: 404 });
  const bin = atob(r.b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Response(u, { headers: { "Content-Type": r.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
