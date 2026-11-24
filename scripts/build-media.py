#!/usr/bin/env python3
"""Make resized copies of every Supabase-hosted storefront image and write the URL map used by index.html.

What it does
  1. Reads the PUBLISHED storefront.json from Supabase (what visitors see right now).
  2. Downloads each image it references (products img/img2, reviews, banner).
  3. Saves a resized WebP copy in media/ (content-hashed file name, so it can be cached forever).
  4. Also embeds the catalog itself as STORE_BACKUP (shown if Supabase is down).
  5. Writes the map  original-Supabase-URL -> media/<file>  into index.html (between the MEDIA_MAP markers)
     and into site-data/media-map.json.
Originals in Supabase are never changed or deleted. Images that are not in the map (for example a photo
uploaded from the dashboard after the last run) simply keep loading from Supabase until this script is run again.
Run:  python3 scripts/build-media.py      (needs Pillow)
"""
import hashlib, io, json, pathlib, re, urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = "https://ppqgtzujpoyhglxsykdw.supabase.co/storage/v1/object/public/media/"
STORE = BASE + "site/storefront.json"
MEDIA = ROOT / "media"
MEDIA.mkdir(exist_ok=True)
MAX_W = {"product": 900, "review": 1000}      # px; cards show ~200-450 CSS px, so 900 is crisp on 2x phones

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()

def collect(d):
    out = {}
    def add(u, kind):
        if isinstance(u, str) and u.startswith(BASE): out.setdefault(u, kind)
    for p in d.get("products", []):
        add(p.get("img"), "product"); add(p.get("img2"), "product")
    for r in d.get("reviews", []):
        add(r.get("src"), "review"); add(r.get("poster"), "review")
    b = d.get("banner") or {}
    add(b.get("image"), "product")
    return out

def convert(raw, kind):
    im = Image.open(io.BytesIO(raw))
    im.load()
    if im.mode not in ("RGB", "RGBA"): im = im.convert("RGBA" if "A" in im.getbands() or im.mode == "P" else "RGB")
    w = MAX_W[kind]
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=78 if kind == "product" else 82, method=6)
    return buf.getvalue()

def validate(store, html):
    """Refuse to publish a broken or suspiciously small catalog. Raises SystemExit so nothing is written."""
    def bad(msg): raise SystemExit("REFUSING TO UPDATE: " + msg)
    if not isinstance(store, dict): bad("catalog is not an object")
    prods, ship, revs = store.get("products"), store.get("shipping"), store.get("reviews")
    if not isinstance(prods, list) or not prods: bad("no products")
    if not isinstance(ship, list) or not ship: bad("no shipping zones")
    seen = set()
    for p in prods:
        if not (isinstance(p, dict) and p.get("slug") and p.get("name")): bad("product missing slug or name")
        if p["slug"] in seen: bad("duplicate product " + p["slug"])
        seen.add(p["slug"])
        pr = p.get("prices")
        if not isinstance(pr, dict) or not pr: bad("product without prices: " + p["slug"])
        for ml, v in pr.items():
            if not isinstance(v, dict) or not isinstance(v.get("now"), (int, float)) or v["now"] <= 0: bad("bad price on " + p["slug"])
    for z in ship:
        if not (isinstance(z, dict) and z.get("name") and isinstance(z.get("fee"), (int, float)) and z["fee"] >= 0): bad("bad shipping zone")
    m = re.search(r"/\*STORE_BACKUP_START\*/\s*const STORE_BACKUP = (.*?);\s*/\*STORE_BACKUP_END\*/", html, re.S)
    if m:
        try: old = json.loads(m.group(1))
        except Exception: old = None
        if old:
            # a big drop against the current backup looks like a wiped or half-saved catalog
            if len(prods) < 0.7 * len(old.get("products", [])): bad("products dropped from %d to %d" % (len(old["products"]), len(prods)))
            if len(ship) < 0.7 * len(old.get("shipping", [])): bad("shipping zones dropped")
            if len(revs or []) < 0.5 * len(old.get("reviews", [])): bad("reviews dropped")

def main():
    store = json.loads(get(STORE + "?v=1"))
    validate(store, (ROOT / "index.html").read_text())
    urls = collect(store)
    mp, before, after = {}, 0, 0
    for u, kind in urls.items():
        if not re.search(r"\.(webp|jpe?g|png)$", u, re.I):
            print("skip (not an image):", u); continue
        raw = get(u)
        out = convert(raw, kind)
        if len(out) >= len(raw) and u.lower().endswith(".webp"): out = raw     # never make a file bigger
        name = hashlib.sha256(out).hexdigest()[:20] + ".webp"
        (MEDIA / name).write_bytes(out)
        mp["" + u] = "media/" + name
        before += len(raw); after += len(out)
    (ROOT / "site-data" / "media-map.json").write_text(json.dumps(mp, indent=1))
    html_path = ROOT / "index.html"
    html = html_path.read_text()
    short = {k[len(BASE):]: v for k, v in mp.items()}
    block = "/*MEDIA_MAP_START*/\nconst MEDIA_MAP = " + json.dumps(short, separators=(",", ":")) + ";\n/*MEDIA_MAP_END*/"
    html, n = re.subn(r"/\*MEDIA_MAP_START\*/.*?/\*MEDIA_MAP_END\*/", lambda m: block, html, flags=re.S)
    assert n == 1, "MEDIA_MAP markers missing in index.html"
    backup = json.dumps(store, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    block2 = "/*STORE_BACKUP_START*/\nconst STORE_BACKUP = " + backup + ";\n/*STORE_BACKUP_END*/"
    html, n2 = re.subn(r"/\*STORE_BACKUP_START\*/.*?/\*STORE_BACKUP_END\*/", lambda m: block2, html, flags=re.S)
    assert n2 == 1, "STORE_BACKUP markers missing in index.html"
    html_path.write_text(html)
    (ROOT / "site-data" / "storefront.json").write_text(json.dumps(store, ensure_ascii=False, separators=(",", ":")))   # same-site copy: the order API reads it too
    print(f"{len(mp)} images, {before/1024:.0f} KB -> {after/1024:.0f} KB")

main()
