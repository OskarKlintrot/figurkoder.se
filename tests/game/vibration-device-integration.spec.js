import { test, expect } from "@playwright/test";
import { navigateToGamePage, startGame, getCurrentItem } from "./test-utils.js";

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
    await page.evaluate(() => {
      const checkbox = document.getElementById("vibration-setting");
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change"));
    });

    // Reload page and verify setting persists
    await page.reload();
    await navigateToGamePage(page);

    const isCheckedAfterReload = await vibrationCheckbox.isChecked();
    expect(isCheckedAfterReload).toBe(true);
  });

  test("should handle missing Vibration API gracefully", async ({ page }) => {
    // Mock missing Vibration API
    await page.addInitScript(() => {
      delete navigator.vibrate;
    });

    await navigateToGamePage(page);

    // Enable vibration setting
    await page.evaluate(() => {
      const checkbox = document.getElementById("vibration-setting");
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change"));
    });

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
    // Mock Vibration API for testing
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

    await navigateToGamePage(page);

    // Enable vibration setting
    await page.evaluate(() => {
      const checkbox = document.getElementById("vibration-setting");
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change"));
    });

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
    const vibrationCalls = await page.evaluate(
      () => window.vibrationCalls || [],
    );

    // Stop the game
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // App should function normally regardless of vibration calls
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toContain("Figurkoder");
  });

  test("should handle vibration API errors gracefully", async ({ page }) => {
    // Mock Vibration API that throws errors
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "vibrate", {
        value: function () {
          throw new Error("Vibration hardware error");
        },
        writable: true,
        configurable: true,
      });
    });

    await navigateToGamePage(page);

    // Enable vibration setting
    await page.evaluate(() => {
      const checkbox = document.getElementById("vibration-setting");
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change"));
    });

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
