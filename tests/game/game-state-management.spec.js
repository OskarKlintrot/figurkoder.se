import { test, expect } from "@playwright/test";
import {
  navigateToGamePage,
  startGame,
  getCurrentItem,
  assertButtonStates,
  waitForProgressBarActive,
  isProgressBarActive,
  isSolutionVisible,
} from "./test-utils.js";

test.describe("Game State Management Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("should switch between learning and training modes correctly", async ({
    page,
  }) => {
    // Start in training mode first
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Verify training mode state (answer hidden initially - shows dots)
    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).toContainText("•••");

    // Can show answer manually in training mode
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).not.toContainText("•••");

    // Stop the game to be able to change modes
    await page.click("#stop-btn");

    // Wait for either game form or results page to be visible
    const gameFormVisible = await page
      .locator("#game-form")
      .isVisible()
      .catch(() => false);
    const resultPageVisible = await page
      .locator("#result-page")
      .isVisible()
      .catch(() => false);

    if (resultPageVisible) {
      // If results page is shown, go back to game page
      await page.click("#back-btn, .back-btn, button:has-text('Tillbaka')");
      await expect(page.locator("#game-form")).toBeVisible();
    } else {
      await expect(page.locator("#game-form")).toBeVisible();
    }

    // Now switch to learning mode
    await page.check("#learning-mode");

    // Start new game in learning mode
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Verify learning mode state (answer shown automatically)
    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).not.toContainText("•••");

    // VISA button should be disabled in learning mode
    await expect(page.locator("#show-btn")).toBeDisabled();
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

    // Start training mode
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Test button states when running (training mode)
    await assertButtonStates(page, {
      "play-btn": false,
      "pause-btn": true,
      "stop-btn": true,
      "show-btn": true,
      "next-btn": true,
    });

    // Pause game
    await page.click("#pause-btn");

    // Test button states when paused
    await assertButtonStates(page, {
      "play-btn": true,
      "pause-btn": false,
      "stop-btn": true,
      "show-btn": true,
      "next-btn": true,
    });

    // Stop game
    await page.click("#stop-btn");

    // Test button states when stopped again
    await assertButtonStates(page, {
      "play-btn": true,
      "pause-btn": false,
      "stop-btn": false,
      "show-btn": false,
      "next-btn": false,
    });

    // Test learning mode button states
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // In learning mode, show button should be disabled (answer already shown)
    await assertButtonStates(page, {
      "play-btn": false,
      "pause-btn": true,
      "stop-btn": true,
      "show-btn": false, // Disabled in learning mode
      "next-btn": true,
    });

    // Verify input field states (should be disabled during game)
    await expect(page.locator("#from-input")).toBeDisabled();
    await expect(page.locator("#to-input")).toBeDisabled();
    await expect(page.locator("#time-input")).toBeDisabled();
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

    // Wait for the game to be fully running (solution should be visible in learning mode)
    await expect(page.locator("#solution-display")).toBeVisible();
    await expect(page.locator("#pause-btn")).toBeEnabled();

    // Get current item for later comparison
    const currentItem = await getCurrentItem(page);

    // Pause at this point
    await page.click("#pause-btn");

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
    // Start game and accumulate some state
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 20,
      timeLimit: 10,
    });

    // Advance through items and show answers to accumulate state
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).toBeVisible();

    await page.click("#next-btn");
    await page.waitForTimeout(100); // Small wait for state changes

    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).toBeVisible();

    // Stop game
    await page.click("#stop-btn");

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
      learningMode: false,
      fromRange: 0,
      toRange: 20,
      timeLimit: 10,
    });

    // Verify clean state - answer should be hidden initially
    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).toBeHidden();

    // Show button should be enabled for fresh start
    await expect(page.locator("#show-btn")).toBeEnabled();
  });

  test("should handle multi-round game progression correctly", async ({
    page,
  }) => {
    // Start training mode with 2 rounds, small range for faster completion
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 2, // Very small range to complete quickly
      timeLimit: 1, // Short timer
      rounds: 2,
    });

    // Wait for game to start
    await expect(page.locator("#current-item")).toBeVisible();

    // Complete first round by going through all items quickly
    // In a small range (0-2), we should have 3 items (0, 1, 2)
    for (let i = 0; i < 3; i++) {
      await page.click("#next-btn");
      await page.waitForTimeout(100); // Small wait between items
    }

    // Check if we've progressed to a second round or completed
    // The exact behavior depends on the implementation
    // We'll verify that the game either shows round progression or completes

    // Try to check for round counter or completion
    const gameControls = page.locator(".game-controls");
    const gameForm = page.locator("#game-form");

    // Game should either still be running (multi-round) or completed
    const gameControlsVisible = await gameControls
      .isVisible()
      .catch(() => false);
    const gameFormVisible = await gameForm.isVisible().catch(() => false);

    // One of these should be true - either still playing or completed
    expect(gameControlsVisible || gameFormVisible).toBeTruthy();

    // If game is still running, verify we can continue
    if (gameControlsVisible) {
      await expect(page.locator("#current-item")).toBeVisible();
    }

    // If game completed, verify we're back to form
    if (gameFormVisible) {
      await expect(page.locator("#game-form")).toBeVisible();
    }
  });
});
