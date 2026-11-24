#!/usr/bin/env python3
"""Generate functions/api/wa-notify.js (Cloudflare Pages Function) from api/wa-notify.js (Vercel). Same logic, wrapped for Workers."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
src = (ROOT / "api" / "wa-notify.js").read_text()
src = src.replace("/* POST /api/wa-notify  (Vercel serverless function)", "/* POST /api/wa-notify  (Cloudflare Pages Function: generated from api/wa-notify.js by scripts/make-cf-wa-notify.py, do not edit)")
src = src.replace('"use strict";\n', '"use strict";\n\nlet ENV = {};   // filled from the Pages Function context on every request\n', 1)
src = src.replace("process.env.", "ENV.")
cut = src.index("module.exports = handler;")
src = src[:cut] + '''export async function onRequest(context) {
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
'''
(ROOT / "functions" / "api" / "wa-notify.js").write_text(src)
print("wrote functions/api/wa-notify.js")
