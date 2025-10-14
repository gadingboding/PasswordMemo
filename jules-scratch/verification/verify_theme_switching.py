from playwright.sync_api import sync_playwright, expect
import os
import time

def test_theme_switching():
    with sync_playwright() as p:
        extension_path = os.path.abspath("password-memo-browser/dist")
        user_data_dir = "/tmp/test-user-data-dir"

        context = p.chromium.launch_persistent_context(user_data_dir,
            headless=True,
            args=[
                f"--disable-extensions-except={extension_path}",
                f"--load-extension={extension_path}",
            ],
        )

        # Wait for the extension to load
        time.sleep(2)

        # Get the extension ID
        extension_id = None
        for page in context.pages:
            if page.url.startswith("chrome-extension://"):
                try:
                    if page.title() == "Password Memo":
                        extension_id = page.url.split("/")[2]
                        break
                except Exception:
                    pass

        if not extension_id:
             for target in context.service_workers:
                if "background" in target.url:
                    extension_id = target.url.split("/")[2]
                    break

        if not extension_id:
            raise Exception("Could not find extension ID")

        print(f"Extension ID: {extension_id}")

        # Navigate to the options page
        options_page_url = f"chrome-extension://{extension_id}/options.html"
        print(f"Navigating to: {options_page_url}")
        page = context.new_page()
        page.goto(options_page_url)

        # Wait for the page to load
        expect(page.get_by_text("Theme")).to_be_visible(timeout=10000)

        # Create the verification directory if it doesn't exist
        os.makedirs("jules-scratch/verification", exist_ok=True)

        # Take a screenshot of the default theme
        page.screenshot(path="jules-scratch/verification/01_default_theme.png")

        # Click the "Light" theme button
        page.get_by_role("button", name="Light").click()
        page.screenshot(path="jules-scratch/verification/02_light_theme.png")

        # Click the "Dark" theme button
        page.get_by_role("button", name="Dark").click()
        page.screenshot(path="jules-scratch/verification/03_dark_theme.png")

        context.close()

if __name__ == "__main__":
    test_theme_switching()