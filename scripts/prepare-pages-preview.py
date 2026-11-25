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
for f in ['index.html', 'admin.html', 'setup.html']:
    shutil.copy(ROOT / f, OUT / f)
(OUT / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/admin\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n  X-Frame-Options: DENY\n/media/*\n  Cache-Control: public, max-age=31536000, immutable\n')
print('built', OUT)
