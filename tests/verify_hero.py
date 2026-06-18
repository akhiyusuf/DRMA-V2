from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    # Assuming the server is running on localhost:3000
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')

    # Mobile viewport (e.g., iPhone 12 Pro dimensions)
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path='hero_mobile.png', full_page=True)
    
    # Desktop viewport
    page.set_viewport_size({"width": 1440, "height": 900})
    page.screenshot(path='hero_desktop.png', full_page=True)
    
    # Check bounding box of Navbar and Hero section
    navbar = page.locator('header').bounding_box()
    hero = page.locator('section').first.bounding_box()
    
    print(f"Navbar: {navbar}")
    print(f"Hero Section: {hero}")
    
    browser.close()
