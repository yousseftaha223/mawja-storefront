#!/usr/bin/env python3
"""Build the Cloudflare Pages PREVIEW folder (pages-preview/).
It is the same site as production: index.html and admin.html unchanged, live catalog from Supabase,
plus the resized local images in media/. There is no /api/order on Pages, so an order attempt there
lands in the WhatsApp fallback. Nothing is deployed or changed in Supabase by this script."""
import pathlib, shutil
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'pages-preview'
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir()
for name in ['brand', 'demo', 'media']:
    shutil.copytree(ROOT / name, OUT / name)
(OUT / 'site-data').mkdir()
shutil.copy(ROOT / 'site-data' / 'storefront.json', OUT / 'site-data' / 'storefront.json')
for f in ['index.html', 'admin.html', 'policy.html']:
    shutil.copy(ROOT / f, OUT / f)
(OUT / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Strict-Transport-Security: max-age=31536000\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/admin\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n  X-Frame-Options: DENY\n/media/*\n  Cache-Control: public, max-age=31536000, immutable\n')
(OUT / '404.html').write_text('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>404 | MAWJA</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#062F43;color:#E7D5BB;font-family:system-ui,sans-serif;text-align:center}a{color:#E7D5BB}</style></head><body><div><h1>الصفحة غير موجودة</h1><p>Page not found</p><p><a href="/">موجة | MAWJA</a></p></div></body></html>')
(OUT / 'robots.txt').write_text('User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: https://mawjaa.store/sitemap.xml\n')
(OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://mawjaa.store/</loc></url></urlset>\n')
print('built', OUT)
