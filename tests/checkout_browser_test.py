# Run: python3 tests/checkout_browser_test.py   (needs playwright + chromium; serves the repo locally; network mocked, no real orders)
import json, threading, http.server, socketserver, functools, sys, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k): pass
H = functools.partial(Q, directory=ROOT)
srv = socketserver.TCPServer(("127.0.0.1", 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{port}/index.html"
res = []
def check(name, ok, extra=""):
    res.append(("PASS " if ok else "FAIL ") + name + (" " + extra if extra else ""))
    if not ok: sys.exit_code = 1

def fill_and_review(page, lang):
    page.evaluate("""() => { addToCart(PRODUCTS[0].slug, 10, 1); openCart(); }""")
    page.evaluate("""() => { cartStep = 'checkout'; renderCart(); }""")
    page.fill("#cName", "Test Person"); page.fill("#cPhone", "01012345678"); page.fill("#cAddress", "Tanta, street 1, building 2")
    if page.query_selector("#cGov"): page.select_option("#cGov", index=1)
    page.click('[data-act="toReview"]')

with sync_playwright() as p:
    b = p.chromium.launch()
    for vw, label in ((390, "mobile"), (1280, "desktop")):
        # A: catalog unreachable -> built-in (possibly stale) products shown, checkout must NOT send anything
        ctx = b.new_context(viewport={"width": vw, "height": 800}); page = ctx.new_page()
        orders = []
        page.route("**/storage/v1/object/public/media/site/storefront.json*", lambda r: r.abort())
        page.route("**/api/order", lambda r: (orders.append(1), r.fulfill(status=200, content_type="application/json", body='{"ok":true,"orderNo":1}')))
        page.goto(BASE); page.wait_for_timeout(2000)
        fill_and_review(page, "en"); page.click('[data-act="confirmOrder"]'); page.wait_for_timeout(1500)
        txt = page.inner_text("#cartOv")
        check(f"{label}: catalog down -> no order request sent", len(orders) == 0)
        check(f"{label}: catalog down -> clear message shown", "latest prices" in txt, repr(txt[-160:]))
        page.screenshot(path=f"/tmp/catalog-down-{label}.png")
        ctx.close()
        # B: catalog up, server answers busy / catalog / success
        for code, status, key in (("busy", 429, "Too many requests"), ("catalog", 503, "latest prices"), (None, 200, "Order received")):
            ctx = b.new_context(viewport={"width": vw, "height": 800}); page = ctx.new_page()
            seen = []
            page.route("**/storage/v1/object/public/media/site/storefront.json*", lambda r: r.abort())
            page.goto(BASE); page.wait_for_timeout(1800)
            prods = page.evaluate("JSON.stringify(PRODUCTS)"); ctx.close()
            ctx = b.new_context(viewport={"width": vw, "height": 800}); page = ctx.new_page()
            cat = json.dumps({"products": json.loads(prods), "shipping": [{"name": "Gharbia", "fee": 60}]})
            page.route("**/storage/v1/object/public/media/site/storefront.json*", lambda r: r.fulfill(status=200, content_type="application/json", body=cat, headers={"access-control-allow-origin": "*"}))
            body = json.dumps({"ok": True, "orderNo": 7}) if code is None else json.dumps({"ok": False, "error": code})
            def mk(s, bd):
                return lambda r, q=None: (seen.append(r.request.post_data), r.fulfill(status=s, content_type="application/json", body=bd))
            page.route("**/api/order", mk(status, body))
            page.goto(BASE); page.wait_for_timeout(2000)
            check(f"{label}: live catalog marks prices trusted", page.evaluate("priceTrusted") is True)
            fill_and_review(page, "en"); page.click('[data-act="confirmOrder"]'); page.wait_for_timeout(1200)
            t = page.inner_text("#cartOv")
            check(f"{label}: server '{code or 'ok'}' -> message '{key}'", key in t, repr(t[-140:]))
            if code == "busy": page.screenshot(path=f"/tmp/busy-{label}.png")
            ctx.close()
    b.close()
print("\n".join(res))
sys.exit(1 if any(r.startswith("FAIL") for r in res) else 0)
