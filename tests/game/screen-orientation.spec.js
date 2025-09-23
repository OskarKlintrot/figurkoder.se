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
    const scriptTags = page.locator('script[src*="screen-orientation"]');
    await expect(scriptTags).toHaveCount(1);
  });

  test("should handle missing Screen Orientation API gracefully", async ({
    page,
  }) => {
    // Mock missing Screen Orientation API
    await page.addInitScript(() => {
      window.screen.orientation = undefined;
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
      // Set up the mock before any scripts run
      window.screen = window.screen || {};

      const originalOrientation = window.screen.orientation;

      // Only mock the lock method, preserve all existing properties
      Object.defineProperty(originalOrientation, "lock", {
        value: function (orientation) {
          window.orientationLockCalled = true;
          window.orientationLockValue = orientation;
          return Promise.resolve();
        },
        writable: true,
        configurable: true,
      });
    });

    await page.goto("/");
    await page.waitForLoadState("load");

    // Wait for deferred scripts to execute
    await page.waitForTimeout(1000);

    // Verify that orientation lock was attempted
    const result = await page.evaluate(() => {
      return {
        lockCalled: !!window.orientationLockCalled,
        lockValue: window.orientationLockValue,
      };
    });

    expect(result.lockCalled).toBe(true);
    expect(result.lockValue).toBe("portrait");

    // App should also load and function normally
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toContain("Figurkoder");
  });

  test("should handle orientation lock errors gracefully", async ({ page }) => {
    // Mock Screen Orientation API that throws errors
    await page.addInitScript(() => {
      // Set up the mock before any scripts run
      window.screen = window.screen || {};

      const originalOrientation = window.screen.orientation;

      // If orientation exists, only replace the lock method
      Object.defineProperty(originalOrientation, "lock", {
        value: function () {
          return Promise.reject(new Error("Orientation lock not allowed"));
        },
        writable: true,
        configurable: true,
      });
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Wait for deferred scripts to execute
    await page.waitForTimeout(1000);

    // Should still load without errors despite orientation lock failure
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toContain("Figurkoder");

    // App should still be functional
    const titleVisible = await page.locator("h1").isVisible();
    expect(titleVisible).toBeTruthy();
  });
});
