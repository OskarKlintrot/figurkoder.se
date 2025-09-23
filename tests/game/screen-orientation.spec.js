import { test, expect } from "@playwright/test";

test.describe("Screen Orientation Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should have orientation preference in web manifest", async ({
    page,
  }) => {
    // Check that the manifest is accessible
    const response = await page.request.get("/site.webmanifest");
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.orientation).toBe("portrait");
  });

  test("should load screen orientation module", async ({ page }) => {
    // Check that the screen orientation script is loaded
    const scriptTags = await page.locator('script[src*="screen-orientation"]');
    await expect(scriptTags).toHaveCount(1);
  });

  test("should handle missing Screen Orientation API gracefully", async ({
    page,
  }) => {
    // Mock missing Screen Orientation API
    await page.addInitScript(() => {
      delete window.screen.orientation;
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Should still load without errors
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toContain("Figurkoder");
  });

  test("should attempt orientation lock on page load", async ({ page }) => {
    // Mock Screen Orientation API for testing
    await page.addInitScript(() => {
      window.mockScreenOrientation = {
        calls: [],
        lock: function (orientation) {
          this.calls.push({ action: "lock", orientation: orientation });
          return Promise.resolve();
        },
      };

      if (!window.screen.orientation) {
        window.screen.orientation = window.mockScreenOrientation;
      } else {
        // Override existing methods
        window.screen.orientation.lock = window.mockScreenOrientation.lock;
      }
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Wait a bit for the orientation lock to be attempted
    await page.waitForTimeout(100);

    // Check if orientation lock was attempted
    const orientationCalls = await page.evaluate(() => {
      return window.mockScreenOrientation
        ? window.mockScreenOrientation.calls
        : [];
    });

    // Should have attempted to lock orientation
    const lockCalls = orientationCalls.filter(call => call.action === "lock");
    expect(lockCalls.length).toBeGreaterThan(0);

    // Should have requested portrait mode
    const portraitLockCalls = lockCalls.filter(
      call => call.orientation === "portrait",
    );
    expect(portraitLockCalls.length).toBeGreaterThan(0);
  });

  test("should handle orientation lock errors gracefully", async ({ page }) => {
    // Mock Screen Orientation API that throws errors
    await page.addInitScript(() => {
      window.screen.orientation = {
        lock: function () {
          return Promise.reject(new Error("Orientation lock not allowed"));
        },
      };
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Should still load without errors despite orientation lock failure
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toContain("Figurkoder");

    // App should still be functional
    const titleVisible = await page.locator("h1").isVisible();
    expect(titleVisible).toBeTruthy();
  });
});
