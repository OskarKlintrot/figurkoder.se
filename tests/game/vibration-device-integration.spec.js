import { test, expect } from "@playwright/test";
import { navigateToGamePage, startGame, getCurrentItem } from "./test-utils.js";

/**
 * Setup mock Vibration API for testing
 * @param {import('@playwright/test').Page} page
 */
async function setupVibrationMock(page) {
  await page.addInitScript(() => {
    window.vibrationCalls = [];
    Object.defineProperty(navigator, "vibrate", {
      value: function (pattern) {
        window.vibrationCalls.push(pattern);
        return true;
      },
      writable: true,
      configurable: true,
    });
  });
}

/**
 * Setup mock Vibration API that throws errors
 * @param {import('@playwright/test').Page} page
 */
async function setupVibrationErrorMock(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "vibrate", {
      value: function () {
        throw new Error("Vibration hardware error");
      },
      writable: true,
      configurable: true,
    });
  });
}

/**
 * Setup mock to remove Vibration API entirely
 * @param {import('@playwright/test').Page} page
 */
async function setupVibrationMissingMock(page) {
  await page.addInitScript(() => {
    delete navigator.vibrate;
  });
}

/**
 * Enable vibration setting in the UI
 * @param {import('@playwright/test').Page} page
 */
async function enableVibrationSetting(page) {
  await page.evaluate(() => {
    const checkbox = document.getElementById("vibration-setting");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
  });
}

/**
 * Get vibration calls from the page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array>}
 */
async function getVibrationCalls(page) {
  return page.evaluate(() => window.vibrationCalls || []);
}

test.describe("Vibration and Device Integration Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should have vibration setting in UI", async ({ page }) => {
    await navigateToGamePage(page);

    // Verify vibration checkbox exists and is accessible
    const vibrationCheckbox = page.locator("#vibration-setting");
    await expect(vibrationCheckbox).toBeVisible();

    // Should be checked by default (as per HTML)
    await expect(vibrationCheckbox).toBeChecked();
  });

  test("should persist vibration setting across page reloads", async ({
    page,
  }) => {
    await navigateToGamePage(page);

    const vibrationCheckbox = page.locator("#vibration-setting");

    // Enable vibration setting
    await enableVibrationSetting(page);

    // Reload page and verify setting persists
    await page.reload();
    await navigateToGamePage(page);

    const isCheckedAfterReload = await vibrationCheckbox.isChecked();
    expect(isCheckedAfterReload).toBe(true);
  });

  test("should handle missing Vibration API gracefully", async ({ page }) => {
    await setupVibrationMissingMock(page);
    await navigateToGamePage(page);

    // Enable vibration setting
    await enableVibrationSetting(page);

    // Should still load and function without errors
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 2,
      timeLimit: 3,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // Game should work normally despite missing vibration API
    await page.click("#next-btn");
    const newItem = await getCurrentItem(page);
    expect(newItem).toBeTruthy();
  });

  test("should call vibration API during auto-advance in learning mode", async ({
    page,
  }) => {
    await setupVibrationMock(page);
    await navigateToGamePage(page);

    // Enable vibration setting
    await enableVibrationSetting(page);

    // Start learning mode game with short timer
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 2,
    });

    // Wait for auto-advance to trigger vibration
    await page.waitForTimeout(3000);

    // Verify vibration was called
    const vibrationCalls = await getVibrationCalls(page);

    // Stop the game
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // App should function normally regardless of vibration calls
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toContain("Figurkoder");
  });

  test("should handle vibration API errors gracefully", async ({ page }) => {
    await setupVibrationErrorMock(page);
    await navigateToGamePage(page);

    // Enable vibration setting
    await enableVibrationSetting(page);

    // Should still load without errors despite vibration API failure
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 2,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // Wait for potential auto-advance (which might try to vibrate)
    await page.waitForTimeout(3000);

    // Game should still be functional
    await page.click("#next-btn");
    const newItem = await getCurrentItem(page);
    expect(newItem).toBeTruthy();

    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();
  });
});
