import { test, expect } from "@playwright/test";
import { navigateToGamePage, startGame } from "./test-utils.js";

test.describe("Screen Orientation Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
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

    // Check that orientation functions are available globally
    const orientationFunctionsAvailable = await page.evaluate(() => {
      return (
        typeof window.lockScreenOrientation === "function" &&
        typeof window.unlockScreenOrientation === "function"
      );
    });
    expect(orientationFunctionsAvailable).toBeTruthy();
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

    // Orientation functions should still exist as no-ops
    const orientationFunctionsExist = await page.evaluate(() => {
      return (
        typeof window.lockScreenOrientation === "function" &&
        typeof window.unlockScreenOrientation === "function"
      );
    });
    expect(orientationFunctionsExist).toBeTruthy();
  });

  test("should attempt orientation lock during game", async ({ page }) => {
    // Mock Screen Orientation API for testing
    await page.addInitScript(() => {
      let isLocked = false;
      window.mockScreenOrientation = {
        calls: [],
        lock: function (orientation) {
          this.calls.push({ action: "lock", orientation: orientation });
          isLocked = true;
          return Promise.resolve();
        },
        unlock: function () {
          this.calls.push({ action: "unlock" });
          isLocked = false;
          return Promise.resolve();
        },
        get locked() {
          return isLocked;
        },
      };

      if (!window.screen.orientation) {
        window.screen.orientation = window.mockScreenOrientation;
      } else {
        // Override existing methods
        const originalLock = window.screen.orientation.lock;
        const originalUnlock = window.screen.orientation.unlock;
        window.screen.orientation.lock = window.mockScreenOrientation.lock;
        window.screen.orientation.unlock = window.mockScreenOrientation.unlock;
      }
    });

    // Start a game to trigger orientation lock
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 5,
      timeLimit: 5,
    });

    // Wait for game to be active
    await expect(page.locator("#current-item")).toBeVisible();

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

    // Stop the game
    await page.click("#stop-btn");

    // Wait for game to stop
    await page.waitForTimeout(500);

    // Check if orientation was unlocked
    const updatedCalls = await page.evaluate(() => {
      return window.mockScreenOrientation
        ? window.mockScreenOrientation.calls
        : [];
    });

    const unlockCalls = updatedCalls.filter(call => call.action === "unlock");
    expect(unlockCalls.length).toBeGreaterThan(0);
  });

  test("should handle orientation lock errors gracefully", async ({ page }) => {
    // Mock Screen Orientation API that throws errors
    await page.addInitScript(() => {
      window.screen.orientation = {
        lock: function () {
          throw new Error("Orientation lock not allowed");
        },
        unlock: function () {
          throw new Error("Orientation unlock failed");
        },
      };
    });

    // Should still be able to start and play game
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 3,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // Game should function normally despite orientation errors
    await page.click("#next-btn");
    await page.waitForTimeout(200);

    const currentItem = await page.locator("#current-item").textContent();
    expect(currentItem).toBeTruthy();

    await page.click("#stop-btn");
  });
});
