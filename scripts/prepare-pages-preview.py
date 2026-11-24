#!/usr/bin/env python3
"""Prepare a local Pages preview. Does not deploy or change Supabase."""
import hashlib, json, pathlib, shutil, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'pages-preview'
SOURCE = ROOT / 'site-data' / 'supabase-published.json'
config = json.loads(SOURCE.read_text())
media = ROOT / 'media'
media.mkdir(exist_ok=True)
manifest = {}
def localize(value):
    if isinstance(value, dict): return {k: localize(v) for k,v in value.items()}
    if isinstance(value, list): return [localize(v) for v in value]
    if not isinstance(value, str) or not value.startswith('https://ppqgtzujpoyhglxsykdw.supabase.co/storage/v1/object/public/media/'): return value
    if value not in manifest:
        suffix = pathlib.PurePosixPath(value).suffix.lower()
        if suffix not in {'.webp','.jpg','.jpeg','.png','.svg'}: raise ValueError('Unreviewed media type')
        name = hashlib.sha256(value.encode()).hexdigest()[:24] + suffix
        path = media / name
        if not path.exists():
            with urllib.request.urlopen(value, timeout=30) as response: path.write_bytes(response.read())
        if path.stat().st_size > 25 * 1024**2: raise ValueError('Pages file limit exceeded')
        manifest[value] = 'media/' + name
    return manifest[value]
config = localize(config)
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir()
for name in ['brand','demo','media']:
    shutil.copytree(ROOT / name, OUT / name)
# The snapshot is embedded before first paint. Never fall back to old built-in prices.
html = (ROOT / 'index.html').read_text()
# WhatsApp order mode (prefilled wa.me link + copy fallback) lives in index.html
# itself under WA_ORDER_MODE; nothing to inject here. Guard that it is on.
assert 'const WA_ORDER_MODE =' in html, 'WA_ORDER_MODE missing from index.html'
html = html.replace('(demo|brand)\\/', '(demo|brand|media)\\/')
start = html.index('function loadStore(ms) {')
end = html.index('\n/* ---------- Strings', start)
html = html[:start] + 'function loadStore() { return Promise.resolve(STATIC_STORE); }\n' + html[end:]
marker = '/* First paint: wait briefly for the dashboard data'
position = html.index(marker)
snapshot = json.dumps(config, ensure_ascii=False).replace('<','\\u003c')
html = html[:position] + 'const STATIC_STORE = ' + snapshot + ';\napplyStore(STATIC_STORE);\n' + html[position:]
(OUT / 'index.html').write_text(html)
(OUT / 'admin.html').write_text((ROOT / 'admin.html').read_text())
(OUT / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/admin\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n  X-Frame-Options: DENY\n/media/*\n  Cache-Control: public, max-age=31536000, immutable\n')
(ROOT / 'site-data' / 'media-manifest.json').write_text(json.dumps(manifest, indent=2))
(ROOT / 'site-data' / 'static-storefront.json').write_text(json.dumps(config, ensure_ascii=False, indent=2))
print(json.dumps({'products':len(config['products']),'reviews':len(config['reviews']),'mediaFiles':len(manifest),'mediaBytes':sum(p.stat().st_size for p in media.iterdir()),'output':str(OUT),'backendReady':False},indent=2))
