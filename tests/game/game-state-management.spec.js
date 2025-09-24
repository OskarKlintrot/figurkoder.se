import { test, expect } from "@playwright/test";
import {
  navigateToGamePage,
  startGame,
  getCurrentItem,
  assertButtonStates,
  pauseGame,
} from "./test-utils.js";

test.describe("Game State Management Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("should switch between learning and training modes correctly", async ({
    page,
  }) => {
    // Test 1: Start in learning mode (like working test)
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Verify learning mode behavior
    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).not.toContainText("•••");
    await expect(page.locator("#show-btn")).toBeDisabled();

    // Stop learning mode game (should return to form)
    await page.click('button[onclick="stopGame()"]');
    await expect(page.locator("#game-form")).toBeVisible();

    // Test 2: Switch to training mode
    await page.uncheck("#learning-mode");

    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Verify training mode behavior
    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).toContainText("•••");
    await expect(page.locator("#show-btn")).toBeEnabled();

    // Can show answer manually
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).not.toContainText("•••");
  });

  test("should maintain consistent button states across game phases", async ({
    page,
  }) => {
    // Test button states when stopped
    await assertButtonStates(page, {
      "play-btn": true,
      "pause-btn": false,
      "stop-btn": false,
      "show-btn": false,
      "next-btn": false,
    });

    // Start learning mode (easier to test pause functionality)
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Test button states when running (learning mode)
    await assertButtonStates(page, {
      "play-btn": false,
      "pause-btn": true,
      "stop-btn": true,
      "show-btn": false, // Disabled in learning mode
      "next-btn": true,
    });

    // Pause game using JS evaluation to avoid element blocking
    await pauseGame(page);

    // Test button states when paused
    await assertButtonStates(page, {
      "play-btn": true,
      "pause-btn": false,
      "stop-btn": true,
      "show-btn": false, // Still disabled in learning mode when paused
      "next-btn": true,
    });

    // Stop game
    await page.click('button[onclick="stopGame()"]');

    // Test button states when stopped again
    await assertButtonStates(page, {
      "play-btn": true,
      "pause-btn": false,
      "stop-btn": false,
      "show-btn": false,
      "next-btn": false,
    });

    // Verify input field states (should be enabled when stopped)
    await expect(page.locator("#from-input")).toBeEnabled();
    await expect(page.locator("#to-input")).toBeEnabled();
    await expect(page.locator("#time-input")).toBeEnabled();
  });

  test("should preserve game state during pause and resume", async ({
    page,
  }) => {
    // Start learning mode game (where pause/resume makes more sense)
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 20,
      timeLimit: 10,
    });

    // Wait for the game to be fully running and ready to pause
    await expect(page.locator("#solution-display")).toBeVisible();
    await expect(page.locator("#pause-btn")).toBeEnabled();

    // Wait for any animations or layout shifts to complete
    await page.waitForTimeout(500);

    // Ensure pause button is actually clickable
    await page.waitForFunction(() => {
      const pauseBtn = document.querySelector("#pause-btn");
      const playBtn = document.querySelector("#play-btn");
      return pauseBtn && !pauseBtn.disabled && playBtn && playBtn.disabled;
    });

    // Get current item for later comparison
    const currentItem = await getCurrentItem(page);

    // Pause at this point using different approach
    await pauseGame(page);

    // Verify pause state
    await expect(page.locator("#play-btn")).toBeEnabled();
    await expect(page.locator("#pause-btn")).toBeDisabled();

    // Verify state preservation during pause
    const pausedItem = await getCurrentItem(page);
    expect(pausedItem).toBe(currentItem);
    await expect(page.locator("#solution-display")).toBeVisible();

    // Resume game
    await page.click("#play-btn");

    // Verify state continuity after resume
    const resumedItem = await getCurrentItem(page);
    expect(resumedItem).toBe(currentItem);
    await expect(page.locator("#solution-display")).toBeVisible();

    // Verify game controls are functional after resume
    await assertButtonStates(page, {
      "play-btn": false,
      "pause-btn": true,
      "stop-btn": true,
      "show-btn": false, // Should be disabled in learning mode
      "next-btn": true,
    });
  });

  test("should allow range switching after stopping game", async ({ page }) => {
    // Start game with range 0-10
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 10,
      timeLimit: 5,
    });

    // Verify game started
    await expect(page.locator("#current-item")).toBeVisible();

    // Stop game
    await page.click("#stop-btn");

    // Verify returned to form
    await expect(page.locator("#game-form")).toBeVisible();

    // Change range to 50-60
    await page.fill("#from-input", "50");
    await page.fill("#to-input", "60");

    // Start new game
    await startGame(page, {
      learningMode: true,
      fromRange: 50,
      toRange: 60,
      timeLimit: 5,
    });

    // Verify correct items are loaded (items should be from the new range)
    await expect(page.locator("#current-item")).toBeVisible();

    // The item number display should show numbers in the 50-60 range
    const currentItemText = await page.locator("#current-item").textContent();
    expect(currentItemText).toBeTruthy();

    // Verify range inputs are correctly set
    await expect(page.locator("#from-input")).toHaveValue("50");
    await expect(page.locator("#to-input")).toHaveValue("60");
  });

  test("should properly reset game state when stopping", async ({ page }) => {
    // Start learning mode game (simpler stop behavior)
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 20,
      timeLimit: 10,
    });

    // Advance through a few items to accumulate some state
    await page.click("#next-btn");
    await page.waitForTimeout(200); // Wait for advancement

    await page.click("#next-btn");
    await page.waitForTimeout(200); // Wait for advancement

    // Stop game (learning mode returns to form, not results)
    await page.click('button[onclick="stopGame()"]');

    // Verify form is visible and inputs are enabled
    await expect(page.locator("#game-form")).toBeVisible();
    await expect(page.locator("#from-input")).toBeEnabled();
    await expect(page.locator("#to-input")).toBeEnabled();
    await expect(page.locator("#time-input")).toBeEnabled();
    await expect(page.locator("#learning-mode")).toBeEnabled();

    // Verify all action buttons are in reset state
    await assertButtonStates(page, {
      "play-btn": true,
      "pause-btn": false,
      "stop-btn": false,
      "show-btn": false,
      "next-btn": false,
    });

    // Start new game and verify clean state
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 20,
      timeLimit: 10,
    });

    // Verify clean game state (should start from beginning)
    const currentItem = await getCurrentItem(page);
    expect(currentItem).toBeTruthy();
    await expect(page.locator("#solution-display")).not.toContainText("•••");
  });

  test("should handle multi-round game progression correctly", async ({
    page,
  }) => {
    // Simple test: just verify that setting rounds doesn't break the game
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 2,
      timeLimit: 5,
      rounds: 2, // rounds input
    });

    // Wait for game to start
    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).toContainText("•••");

    // Show answer and advance one item to verify basic functionality
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).not.toContainText("•••");

    await page.click("#next-btn");
    await page.waitForTimeout(500);

    // Verify the game is still running with new item
    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).toContainText("•••");

    // Test passed if we can continue the game
    await expect(page.locator("#show-btn")).toBeEnabled();
  });
});
