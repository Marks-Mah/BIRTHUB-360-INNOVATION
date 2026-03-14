from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        print("Navigating to http://localhost:3001/migrations")
        page.goto("http://localhost:3001/migrations")

        # Wait a bit for everything to load and render
        time.sleep(3)

        print("Capturing screenshot...")
        page.screenshot(path="/home/jules/verification/migrations_page.png", full_page=True)
        print("Screenshot saved to /home/jules/verification/migrations_page.png")

        browser.close()

if __name__ == "__main__":
    run()
