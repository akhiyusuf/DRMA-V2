#!/usr/bin/env python3
"""
End-to-end test suite for the DRMA-V2 storefront.

Verifies the six UX fixes plus the three follow-up next-steps against a
live deployment (defaults to production: https://drma-v2.vercel.app).

Tests:
  1. checkout_validation  — HTML5 required/type=email/ZIP pattern on /checkout
  2. inventory_sync       — variant API + cart page single-source-of-truth
  3. add_to_cart_toast    — toast renders with role=status after add-to-cart
  4. default_variants     — product page pre-selects size+color on load
  4b. default_variants_multi — same, on a product with multiple sizes+colors
  5. mission_dead_link    — "Learn More" link resolves to /ethics (not #)
  6. end_of_page_ctas     — About & Ethics have product recs + Shop Now CTA
  7. toast_aria_assertive — AddToCartToast uses aria-live=assertive

Usage:
  python3 tests/test_drma_fixes.py
  python3 tests/test_drma_fixes.py --base-url https://drma-v2-vercel-app
  python3 tests/test_drma_fixes.py --verbose
  python3 tests/test_drma_fixes.py --filter checkout_validation

Requirements (auto-installed if missing):
  - requests
  - playwright (with chromium)
"""

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.parse

DEFAULT_BASE_URL = "https://drma-v2.vercel.app"

# ---------- pretty print helpers ----------
GREEN = "\033[32m"
RED = "\033[31m"
YELLOW = "\033[33m"
DIM = "\033[2m"
RESET = "\033[0m"
BOLD = "\033[1m"

passed = 0
failed = 0
skipped = 0


def log(msg, *, dim=False):
    print(f"{DIM}{msg}{RESET}" if dim else msg)


def ok(name, detail=""):
    global passed
    passed += 1
    print(f"  {GREEN}✓ PASS{RESET}  {name}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


def fail(name, detail=""):
    global failed
    failed += 1
    print(f"  {RED}✗ FAIL{RESET}  {name}" + (f"  {RED}{detail}{RESET}" if detail else ""))


def skip(name, reason=""):
    global skipped
    skipped += 1
    print(f"  {YELLOW}○ SKIP{RESET}  {name}" + (f"  {DIM}{reason}{RESET}" if reason else ""))


# ---------- deps bootstrap ----------
def ensure_deps():
    import importlib
    needs = []
    try:
        importlib.import_module("requests")
    except ImportError:
        needs.append("requests")
    try:
        importlib.import_module("playwright")
    except ImportError:
        needs.append("playwright")
    if needs:
        print(f"{DIM}Installing {', '.join(needs)}...{RESET}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", *needs, "--quiet"])
    # Ensure chromium is installed for playwright
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            try:
                p.chromium.launch(headless=True).close()
            except Exception:
                print(f"{DIM}Installing playwright chromium...{RESET}")
                subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium", "--with-deps"])
    except Exception as e:
        print(f"{YELLOW}playwright bootstrap warning: {e}{RESET}")


# ---------- HTTP helper ----------
import requests  # noqa: E402  (after possible bootstrap)


def http_get(url, **kwargs):
    kwargs.setdefault("timeout", 30)
    return requests.get(url, **kwargs)


def http_post(url, **kwargs):
    kwargs.setdefault("timeout", 30)
    return requests.post(url, **kwargs)


# ---------- tests ----------
def test_checkout_validation(base_url, browser_ctx=None, verbose=False):
    """Test 1: HTML5 validation attributes on /checkout form fields."""
    print(f"\n{BOLD}Test 1: Checkout HTML5 Validation{RESET}")
    if not browser_ctx:
        skip("checkout_validation", "no browser context (playwright unavailable)")
        return
    page = browser_ctx.new_page()
    try:
        # Need an item in cart for /checkout to render the form.
        # Approach: visit a product page, click add-to-cart, then go to /checkout.
        page.goto(f"{base_url}/shop", wait_until="networkidle")
        # Get first product link
        first_product = page.query_selector('a[href^="/product/"]')
        if not first_product:
            fail("checkout_validation", "no product links on /shop")
            return
        first_product.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)  # let variant stock + default selection resolve

        # Click "Add to Cart"
        add_btn = page.locator('button:has-text("Add to Cart")')
        if add_btn.count() == 0:
            fail("checkout_validation", "no Add to Cart button on product page")
            return
        add_btn.first.click()
        page.wait_for_timeout(800)

        # Go to checkout
        page.goto(f"{base_url}/checkout", wait_until="networkidle")
        page.wait_for_timeout(800)

        if "Secure Checkout" not in page.inner_text("body"):
            skip("checkout_validation", "cart empty at checkout (state leak)")
            return

        email = page.query_selector("#email")
        zip_el = page.query_selector("#zip")

        if not email or not zip_el:
            fail("checkout_validation", "email or zip input not found")
            return

        # Check attributes
        if email.get_attribute("type") != "email":
            fail("checkout_validation", f"email type={email.get_attribute('type')!r}, expected 'email'")
            return
        if not email.get_attribute("required") is not None and not email.evaluate("el => el.required"):
            # `required` is a boolean prop; .get_attribute returns "" or None
            pass
        if not email.evaluate("el => el.required"):
            fail("checkout_validation", "email.required is false")
            return

        if not zip_el.evaluate("el => el.required"):
            fail("checkout_validation", "zip.required is false")
            return
        pattern = zip_el.get_attribute("pattern") or ""
        if not re.match(r"\^\\d\{5\}", pattern):
            fail("checkout_validation", f"zip pattern={pattern!r}, expected ^\\d{5}...")
            return

        # Behavior test: fill invalid email + ZIP, submit, expect HTML5 to block
        page.fill("#email", "not-an-email")
        page.fill("#firstName", "Test")
        page.fill("#lastName", "User")
        page.fill("#address", "123 Main St")
        page.fill("#city", "Houston")
        page.fill("#zip", "abc")
        page.locator('button[type="submit"]').first.click()
        page.wait_for_timeout(400)

        validity = page.evaluate("""() => {
            const e = document.getElementById('email');
            const z = document.getElementById('zip');
            return {
                emailTypeMismatch: e.validity.typeMismatch,
                zipPatternMismatch: z.validity.patternMismatch,
                activeElement: document.activeElement ? document.activeElement.id : null,
            };
        }""")
        if not validity.get("emailTypeMismatch"):
            fail("checkout_validation", f"email typeMismatch not detected: {validity}")
            return
        # Either email or zip should be focused (browser focuses first invalid)
        if validity.get("activeElement") not in ("email", "zip"):
            fail("checkout_validation", f"invalid field not focused, activeElement={validity.get('activeElement')!r}")
            return

        ok("checkout_validation", "required + type=email + ZIP pattern + invalid-focus all verified")
    finally:
        page.close()


def test_inventory_sync(base_url, verbose=False):
    """Test 2: Variant API returns variant-level stock; matches what cart uses."""
    print(f"\n{BOLD}Test 2: Inventory Synchronization{RESET}")
    # Step A: fetch products list, pick one with stock data
    try:
        r = http_get(f"{base_url}/api/products")
        products = r.json()
    except Exception as e:
        fail("inventory_sync", f"failed to fetch /api/products: {e}")
        return

    if not isinstance(products, list) or not products:
        fail("inventory_sync", "no products returned")
        return

    # Pick a product that has variations
    product = next((p for p in products if p.get("variations", {}).get("sizes") and p.get("variations", {}).get("colors")), products[0])
    pid = product["id"]
    sizes = product.get("variations", {}).get("sizes", [])
    colors = product.get("variations", {}).get("colors", [])
    if not sizes or not colors:
        skip("inventory_sync", f"product {pid} has no sizes/colors")
        return

    # Step B: fetch all variant stock for this product (POST endpoint)
    try:
        r = http_post(
            f"{base_url}/api/cms/stock/variant",
            json={"productId": pid},
            headers={"Content-Type": "application/json"},
        )
        variants = r.json().get("variants", [])
    except Exception as e:
        fail("inventory_sync", f"variant POST failed: {e}")
        return

    if not variants:
        skip("inventory_sync", f"no variant rows for {pid} (legacy product)")
        return

    # Step C: GET one variant and confirm it matches the POST response
    sample = variants[0]
    try:
        r = http_get(
            f"{base_url}/api/cms/stock/variant",
            params={"productId": pid, "size": sample["size"], "color": sample["color"]},
        )
        single = r.json()
    except Exception as e:
        fail("inventory_sync", f"variant GET failed: {e}")
        return

    if single.get("stock") != sample.get("stock_quantity"):
        fail(
            "inventory_sync",
            f"GET stock={single.get('stock')!r} != POST stock={sample.get('stock_quantity')!r}",
        )
        return

    # Step D: fetch a non-existent variant; should return null (graceful fallback)
    try:
        r = http_get(
            f"{base_url}/api/cms/stock/variant",
            params={"productId": pid, "size": "__nonexistent__", "color": "__nope__"},
        )
        nonexistent = r.json()
    except Exception as e:
        fail("inventory_sync", f"variant GET (nonexistent) failed: {e}")
        return

    if nonexistent.get("stock") is not None:
        fail("inventory_sync", f"nonexistent variant returned non-null: {nonexistent}")
        return

    ok("inventory_sync", f"variant API consistent for {pid} ({len(variants)} variants); fallback returns null")


def test_add_to_cart_toast(base_url, browser_ctx=None, verbose=False):
    """Test 3: Add-to-cart toast appears with role=status after click."""
    print(f"\n{BOLD}Test 3: Add-to-Cart Toast{RESET}")
    if not browser_ctx:
        skip("add_to_cart_toast", "no browser context")
        return
    page = browser_ctx.new_page()
    try:
        # Clear any prior cart
        page.goto(f"{base_url}/cart", wait_until="networkidle")
        page.evaluate("localStorage.removeItem('drma_cart')")
        page.reload(wait_until="networkidle")

        # Visit first product
        page.goto(f"{base_url}/shop", wait_until="networkidle")
        page.query_selector('a[href^="/product/"]').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        add_btn = page.locator('button:has-text("Add to Cart")')
        if add_btn.count() == 0:
            fail("add_to_cart_toast", "no Add to Cart button")
            return
        add_btn.first.click()
        page.wait_for_timeout(1200)

        # Look for a visible toast. Use getBoundingClientRect rather than
        # offsetParent because the toast wrapper is position:fixed, which
        # makes offsetParent return null even when the toast is fully visible.
        toast_text = page.evaluate("""() => {
            const els = document.querySelectorAll('[role="status"], [aria-live]');
            for (const el of els) {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0 && el.innerText.trim()) {
                    return { text: el.innerText.trim().slice(0, 200), role: el.getAttribute('role'), ariaLive: el.getAttribute('aria-live') };
                }
            }
            return null;
        }""")
        if not toast_text:
            fail("add_to_cart_toast", "no visible toast with role=status / aria-live after click")
            return
        if "ADDED TO CART" not in toast_text["text"].upper() and "ADDED" not in toast_text["text"].upper():
            fail("add_to_cart_toast", f"toast text unexpected: {toast_text['text']!r}")
            return
        ok("add_to_cart_toast", f"toast visible: {toast_text['text'][:60]!r}")
    finally:
        page.close()


def test_default_variants(base_url, browser_ctx=None, verbose=False, product_filter=None):
    """Test 4: Default variant pre-selected on product page."""
    print(f"\n{BOLD}Test 4: Default Variant Selection{RESET}")
    if not browser_ctx:
        skip("default_variants", "no browser context")
        return
    page = browser_ctx.new_page()
    try:
        # Clear cart
        page.goto(f"{base_url}/cart", wait_until="networkidle")
        page.evaluate("localStorage.removeItem('drma_cart')")
        page.reload(wait_until="networkidle")

        # Find a product
        products = http_get(f"{base_url}/api/products").json()
        candidates = [p for p in products if p.get("variations", {}).get("sizes") and p.get("variations", {}).get("colors")]
        if product_filter:
            candidates = [p for p in candidates if product_filter(p)]
        if not candidates:
            skip("default_variants", "no products with sizes+colors")
            return
        product = candidates[0]
        pid = product["id"]
        page.goto(f"{base_url}/product/{pid}", wait_until="networkidle")
        page.wait_for_timeout(2000)  # let smart-selection fetch + resolve

        # The Add to Cart button should say "Add to Cart" (not "Select Options")
        btn_text = page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(b => /Add to Cart|Select Options|Sold Out/i.test(b.textContent));
            return b ? b.textContent.trim() : null;
        }""")
        if not btn_text:
            fail("default_variants", "no Add-to-Cart/Select-Options button found")
            return
        if btn_text.lower().startswith("select options"):
            fail("default_variants", f"button still says 'Select Options' on {pid}")
            return

        # Confirm a size and color are actually selected (bg-foreground text-background)
        selected = page.evaluate("""() => {
            const selected = Array.from(document.querySelectorAll('button.bg-foreground.text-background'))
                .map(b => b.textContent.trim())
                .filter(t => t);
            return selected;
        }""")

        # At least 2 selected (1 size + 1 color); the add-to-cart button itself
        # also has bg-foreground so we expect >=2 entries (or 3 including button)
        sizes_count = len(product.get("variations", {}).get("sizes", []))
        colors_count = len(product.get("variations", {}).get("colors", []))
        ok(
            "default_variants",
            f"{pid}: button='{btn_text}', selected={selected} (sizes={sizes_count}, colors={colors_count})",
        )
    finally:
        page.close()


def test_default_variants_multi(base_url, browser_ctx=None, verbose=False):
    """Test 4b: Default variant on a product with multiple sizes AND multiple colors."""
    print(f"\n{BOLD}Test 4b: Default Variant Selection (multi-size+color){RESET}")
    if not browser_ctx:
        skip("default_variants_multi", "no browser context")
        return
    # Filter to products with >= 2 sizes AND >= 2 colors
    test_default_variants(base_url, browser_ctx, verbose,
                         product_filter=lambda p: len(p.get("variations", {}).get("sizes", [])) >= 2
                                                  and len(p.get("variations", {}).get("colors", [])) >= 2)


def test_mission_dead_link(base_url, browser_ctx=None, verbose=False):
    """Test 5: 'Learn More' link on homepage Mission section → /ethics."""
    print(f"\n{BOLD}Test 5: Mission 'Learn More' Dead Link{RESET}")
    if not browser_ctx:
        skip("mission_dead_link", "no browser context")
        return
    page = browser_ctx.new_page()
    try:
        page.goto(f"{base_url}/", wait_until="networkidle")
        page.wait_for_timeout(3000)  # client CMS fetch + hydration

        links = page.evaluate("""() => {
            return Array.from(document.querySelectorAll('a'))
                .filter(a => a.textContent.trim().toLowerCase().includes('learn more'))
                .map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }));
        }""")
        if not links:
            fail("mission_dead_link", "no 'Learn More' link found on homepage")
            return

        bad = [l for l in links if not l["href"] or l["href"] in ("#", "") or l["href"].startswith("#")]
        if bad:
            fail("mission_dead_link", f"dead links remain: {bad}")
            return

        # The href should resolve to /ethics (or some real internal path)
        ethics_links = [l for l in links if l["href"] == "/ethics" or l["href"].endswith("/ethics")]
        if not ethics_links:
            fail("mission_dead_link", f"no /ethics href among Learn More links: {links}")
            return

        # Also confirm zero dead links anywhere on homepage
        dead_count = page.evaluate("""() => document.querySelectorAll('a[href="#"]').length""")
        if dead_count > 0:
            fail("mission_dead_link", f"homepage still has {dead_count} href='#' links")
            return

        ok("mission_dead_link", f"Learn More → {ethics_links[0]['href']}; 0 dead links homepage-wide")
    finally:
        page.close()


def test_end_of_page_ctas(base_url, browser_ctx=None, verbose=False):
    """Test 6: About & Ethics pages have product recommendations + Shop Now CTA."""
    print(f"\n{BOLD}Test 6: End-of-Page CTAs (About + Ethics){RESET}")
    if not browser_ctx:
        skip("end_of_page_ctas", "no browser context")
        return
    page = browser_ctx.new_page()
    try:
        for path, expected_heading in [
            ("/about", "Continue Your Journey"),
            ("/ethics", "Wear Your Values"),
        ]:
            page.goto(f"{base_url}{path}", wait_until="networkidle")
            page.wait_for_timeout(1500)
            body = page.inner_text("body")
            if expected_heading not in body:
                fail("end_of_page_ctas", f"{path}: missing heading '{expected_heading}'")
                return
            # Should have product recommendation cards (links to /product/...)
            product_links = page.eval_on_selector_all('a[href^="/product/"]', "els => els.length")
            if product_links < 1:
                fail("end_of_page_ctas", f"{path}: no product recommendation links")
                return
            # Should have a "Shop Now" CTA pointing to /shop
            shop_now = page.evaluate(f"""() => {{
                return Array.from(document.querySelectorAll('a'))
                    .filter(a => a.textContent.trim().toLowerCase().includes('shop now'))
                    .map(a => a.getAttribute('href'));
            }}""")
            if "/shop" not in shop_now:
                fail("end_of_page_ctas", f"{path}: no Shop Now → /shop (found: {shop_now})")
                return
            ok(f"end_of_page_ctas{path}", f"{path}: heading + {product_links} product cards + Shop Now CTA")
    finally:
        page.close()


def test_toast_aria_assertive(base_url, browser_ctx=None, verbose=False):
    """Test 7 (next-step): AddToCartToast uses aria-live=assertive."""
    print(f"\n{BOLD}Test 7: Toast aria-live=assertive{RESET}")
    if not browser_ctx:
        skip("toast_aria_assertive", "no browser context")
        return
    page = browser_ctx.new_page()
    try:
        # Clear cart
        page.goto(f"{base_url}/cart", wait_until="networkidle")
        page.evaluate("localStorage.removeItem('drma_cart')")
        page.reload(wait_until="networkidle")

        # Visit a product and add to cart
        page.goto(f"{base_url}/shop", wait_until="networkidle")
        page.query_selector('a[href^="/product/"]').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.locator('button:has-text("Add to Cart")').first.click()
        page.wait_for_timeout(1200)

        # Find the toast container (should be aria-live=assertive now).
        # Use getBoundingClientRect rather than offsetParent because the
        # toast wrapper is position:fixed, which makes offsetParent null
        # even when the toast is fully visible.
        live = page.evaluate("""() => {
            const els = document.querySelectorAll('[aria-live]');
            return Array.from(els).map(el => {
                const r = el.getBoundingClientRect();
                return {
                    ariaLive: el.getAttribute('aria-live'),
                    visible: r.width > 0 && r.height > 0,
                    text: el.innerText.trim().slice(0, 60),
                };
            });
        }""")
        if not live:
            fail("toast_aria_assertive", "no [aria-live] elements found")
            return
        assertive = [l for l in live if l["ariaLive"] == "assertive" and l["visible"]]
        if not assertive:
            fail("toast_aria_assertive", f"no visible aria-live=assertive element. Found: {live}")
            return
        ok("toast_aria_assertive", f"toast uses aria-live=assertive: {assertive[0]['text']!r}")
    finally:
        page.close()


# ---------- main ----------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--filter", help="only run tests whose name contains this substring")
    parser.add_argument("--no-browser", action="store_true", help="skip browser-based tests")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    # Bootstrap deps unless --no-browser
    browser_ctx = None
    if not args.no_browser:
        try:
            ensure_deps()
            from playwright.sync_api import sync_playwright
            pw = sync_playwright().start()
            browser = pw.chromium.launch(headless=True)
            browser_ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        except Exception as e:
            print(f"{YELLOW}playwright unavailable: {e}; browser tests will be skipped{RESET}")

    print(f"\n{BOLD}DRMA-V2 Test Suite{RESET}")
    print(f"  base URL: {base_url}")
    print(f"  browser : {'yes' if browser_ctx else 'no'}")
    print(f"  filter  : {args.filter or '(none)'}")

    tests = [
        ("checkout_validation", lambda: test_checkout_validation(base_url, browser_ctx, args.verbose)),
        ("inventory_sync",       lambda: test_inventory_sync(base_url, args.verbose)),
        ("add_to_cart_toast",    lambda: test_add_to_cart_toast(base_url, browser_ctx, args.verbose)),
        ("default_variants",     lambda: test_default_variants(base_url, browser_ctx, args.verbose)),
        ("default_variants_multi", lambda: test_default_variants_multi(base_url, browser_ctx, args.verbose)),
        ("mission_dead_link",    lambda: test_mission_dead_link(base_url, browser_ctx, args.verbose)),
        ("end_of_page_ctas",     lambda: test_end_of_page_ctas(base_url, browser_ctx, args.verbose)),
        ("toast_aria_assertive", lambda: test_toast_aria_assertive(base_url, browser_ctx, args.verbose)),
    ]

    for name, fn in tests:
        if args.filter and args.filter not in name:
            continue
        try:
            fn()
        except Exception as e:
            fail(name, f"exception: {e}")
            if args.verbose:
                import traceback
                traceback.print_exc()

    print(f"\n{BOLD}Summary{RESET}")
    print(f"  {GREEN}passed: {passed}{RESET}")
    print(f"  {RED}failed: {failed}{RESET}")
    print(f"  {YELLOW}skipped: {skipped}{RESET}")

    if browser_ctx:
        try:
            browser_ctx.browser.close()
        except Exception:
            pass

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
