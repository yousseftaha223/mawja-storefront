/* GET /site-data/storefront.json  Serves the catalog saved in D1 when the DB binding exists; otherwise the static file. */
export async function onRequestGet({ env, next }) {
  if (env.DB) {
    try {
      const r = await env.DB.prepare("SELECT v FROM kv WHERE k='storefront'").first();
      if (r) return new Response(r.v, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" } });
    } catch (e) { /* fall through to the static file */ }
  }
  return next();
}
