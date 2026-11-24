#!/usr/bin/env bash
# Unattended catalog sync. Exit 0 and prints UNCHANGED / PUSHED <sha> / REFUSED <reason>.
# Needs: git with push access to main, python3 + Pillow. Does not touch Supabase data (read-only public file).
set -euo pipefail
cd "$(dirname "$0")/.."
git fetch -q origin main && git checkout -q main && git merge -q --ff-only origin/main
LIVE=https://ppqgtzujpoyhglxsykdw.supabase.co/storage/v1/object/public/media/site/storefront.json
python3 - "$LIVE" <<'PY' || exit_code=$?
import json, sys, urllib.request
live = json.load(urllib.request.urlopen(sys.argv[1] + "?v=" + str(__import__("time").time()), timeout=30))
site = json.load(open("site-data/storefront.json"))
if live == site: print("UNCHANGED"); sys.exit(10)
prods = live.get("products") or []
if not prods or not live.get("shipping"): print("REFUSED empty catalog or shipping"); sys.exit(11)
if len(prods) < max(1, len(site.get("products", [])) // 2): print("REFUSED product count dropped by more than half"); sys.exit(11)
for p in prods:
    for sz, v in (p.get("prices") or {}).items():
        if not isinstance(v, dict) or not isinstance(v.get("now"), (int, float)) or v["now"] <= 0: print("REFUSED bad price", p.get("slug"), sz); sys.exit(11)
print("CHANGED")
PY
case "${exit_code:-0}" in 10) exit 0;; 11) exit 0;; 0) ;; *) echo "ERROR check failed"; exit 1;; esac
python3 scripts/build-media.py
git add -A media site-data index.html
git diff --cached --quiet && { echo UNCHANGED; exit 0; }
git commit -qm "Catalog refresh $(date -u +%F\ %H:%M) UTC"
git push -q origin main
echo "PUSHED $(git rev-parse --short HEAD)"
