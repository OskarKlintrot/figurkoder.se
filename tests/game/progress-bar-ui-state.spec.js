import { test, expect } from "@playwright/test";
import {
  navigateToGamePage,
  startGame,
  getCurrentItem,
  assertButtonStates,
  isProgressBarActive,
  waitForProgressBarActive,
  getProgressBarPercentage,
} from "./test-utils.js";

test.describe("Progress Bar and UI State Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("TC-5.1: Progress Bar Reset on Replay", async ({ page }) => {
    // Start and complete a game session
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 2, // Small range for quick completion
      timeLimit: 1,
    });

    // Start progress by showing answer and waiting
    await page.click("#show-btn");
    await page.waitForTimeout(500); // Allow some progress

    // Let progress bar advance a bit
    await waitForProgressBarActive(page);
    const initialProgress = await getProgressBarPercentage(page);
    expect(initialProgress).toBeGreaterThan(0);

    // Complete the game quickly
    for (let i = 0; i < 3; i++) {
      await page.click("#next-btn");
      await page.waitForTimeout(50);
    }

    // Try to access results or note completion
    const gameControlsVisible = await page
      .locator(".game-controls")
      .isVisible()
      .catch(() => false);
    const gameFormVisible = await page
      .locator("#game-form")
      .isVisible()
      .catch(() => false);

    // If game completed and shows results, test replay
    if (gameFormVisible) {
      // Game returned to form - this is like a "replay" scenario
      // Verify progress bar starts at 0% when starting new game
      await startGame(page, {
        learningMode: false,
        fromRange: 0,
        toRange: 2,
        timeLimit: 2,
      });

      // Progress bar should start clean
      const isActive = await isProgressBarActive(page);
      if (isActive) {
        const newProgress = await getProgressBarPercentage(page);
        expect(newProgress).toBeLessThanOrEqual(10); // Should be near 0% at start
      }
    } else if (gameControlsVisible) {
      // Game still running - stop and restart to test reset
      await page.click("#stop-btn");
      await expect(page.locator("#game-form")).toBeVisible();

      // Start new game (replay scenario)
      await startGame(page, {
        learningMode: false,
        fromRange: 0,
        toRange: 2,
        timeLimit: 2,
      });

      // Progress bar should start clean
      const isActive = await isProgressBarActive(page);
      if (isActive) {
        const newProgress = await getProgressBarPercentage(page);
        expect(newProgress).toBeLessThanOrEqual(10);
      }
    }

    // Verify visual appearance is correct (no lingering progress)
    const nextBtn = page.locator("#next-btn");
    const hasProgressClass = await nextBtn.evaluate(el =>
      el.classList.contains("progress-bar"),
    );

    if (hasProgressClass) {
      // If progress bar is active, it should be at the start
      const currentProgress = await getProgressBarPercentage(page);
      expect(currentProgress).toBeLessThanOrEqual(20); // Allow some tolerance for timing
    }
  });

  test("TC-5.2: Progress Bar Layout Stability", async ({ page }) => {
    // Start game and let progress bar fill
    await startGame(page, {
      learningMode: true, // Learning mode has auto-timer
      fromRange: 0,
      toRange: 9,
      timeLimit: 3,
    });

    // Wait for progress bar to activate
    await waitForProgressBarActive(page);

    // Check initial layout - ensure game controls are visible and properly positioned
    await expect(page.locator(".game-controls")).toBeVisible();
    await expect(page.locator("#next-btn")).toBeVisible();
    await expect(page.locator("#current-item")).toBeVisible();

    // Get initial button position/size for comparison
    const nextBtnBox = await page.locator("#next-btn").boundingBox();
    expect(nextBtnBox).toBeTruthy();

    // Wait for progress to advance
    await page.waitForTimeout(1000);
    let currentProgress = await getProgressBarPercentage(page);
    expect(currentProgress).toBeGreaterThan(0);

    // Check layout integrity during progress
    await expect(page.locator(".game-controls")).toBeVisible();
    await expect(page.locator("#next-btn")).toBeVisible();

    // Button should maintain roughly the same position/size
    const progressBtnBox = await page.locator("#next-btn").boundingBox();
    expect(progressBtnBox).toBeTruthy();
    expect(Math.abs(progressBtnBox.x - nextBtnBox.x)).toBeLessThan(5); // Allow small variations
    expect(Math.abs(progressBtnBox.y - nextBtnBox.y)).toBeLessThan(5);

    // Pause game
    await page.click("#pause-btn");
    await expect(page.locator("#play-btn")).toBeEnabled();

    // Check layout integrity during pause
    await expect(page.locator(".game-controls")).toBeVisible();
    await expect(page.locator("#next-btn")).toBeVisible();

    const pausedBtnBox = await page.locator("#next-btn").boundingBox();
    expect(pausedBtnBox).toBeTruthy();
    expect(Math.abs(pausedBtnBox.x - nextBtnBox.x)).toBeLessThan(5);

    // Stop game
    await page.click("#stop-btn");

    // Check layout integrity after stop
    await expect(page.locator("#game-form")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify no layout breakage occurred
    const formBox = await page.locator("#game-form").boundingBox();
    expect(formBox).toBeTruthy();
    expect(formBox.width).toBeGreaterThan(100); // Should have reasonable dimensions
    expect(formBox.height).toBeGreaterThan(50);

    // Test on a different viewport size
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile size
    await page.waitForTimeout(100); // Allow layout adjustment

    // Verify mobile layout integrity
    await expect(page.locator("#game-form")).toBeVisible();
    const mobileFormBox = await page.locator("#game-form").boundingBox();
    expect(mobileFormBox).toBeTruthy();
    expect(mobileFormBox.width).toBeGreaterThan(100);
  });

  test("TC-5.3: Button Content Alignment", async ({ page }) => {
    // Start game with progress bar
    await startGame(page, {
      learningMode: true, // Auto-timer for progress bar
      fromRange: 0,
      toRange: 9,
      timeLimit: 5,
    });

    // Wait for progress bar to activate
    await waitForProgressBarActive(page);

    // Check button text visibility and alignment at start
    const nextBtn = page.locator("#next-btn");
    await expect(nextBtn).toBeVisible();

    // Get button text content
    const buttonText = await nextBtn.textContent();
    expect(buttonText).toBeTruthy();
    expect(buttonText.trim().length).toBeGreaterThan(0);

    // Check that button content is not hidden by progress bar
    const isButtonContentVisible = await nextBtn.evaluate(el => {
      const style = window.getComputedStyle(el);
      const textColor = style.color;
      const backgroundColor = style.backgroundColor;

      // Button should have visible text (not transparent or same as background)
      return textColor !== "rgba(0, 0, 0, 0)" && textColor !== backgroundColor;
    });
    expect(isButtonContentVisible).toBeTruthy();

    // Wait for progress to advance and test at different percentages
    await page.waitForTimeout(1500);
    let currentProgress = await getProgressBarPercentage(page);
    expect(currentProgress).toBeGreaterThan(10);

    // Check button content visibility during progress
    await expect(nextBtn).toBeVisible();
    const midProgressText = await nextBtn.textContent();
    expect(midProgressText).toBe(buttonText); // Text should remain the same

    // Check text alignment during progress
    const buttonAlignment = await nextBtn.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        textAlign: style.textAlign,
        display: style.display,
        justifyContent: style.justifyContent,
        alignItems: style.alignItems,
      };
    });

    // Button should maintain proper text alignment
    expect(buttonAlignment.textAlign).toBeTruthy();

    // Test with higher progress
    await page.waitForTimeout(1500);
    currentProgress = await getProgressBarPercentage(page);
    if (currentProgress > 50) {
      // Check visibility at higher progress levels
      const highProgressText = await nextBtn.textContent();
      expect(highProgressText).toBe(buttonText);

      // Verify button is still clickable and properly aligned
      await expect(nextBtn).toBeEnabled();
      const buttonBox = await nextBtn.boundingBox();
      expect(buttonBox).toBeTruthy();
      expect(buttonBox.width).toBeGreaterThan(50); // Reasonable button size
      expect(buttonBox.height).toBeGreaterThan(20);
    }

    // Test icon visibility if present
    const hasIcon = await nextBtn.locator("i, .icon, svg").count();
    if (hasIcon > 0) {
      const icon = nextBtn.locator("i, .icon, svg").first();
      await expect(icon).toBeVisible();
    }

    // Verify button remains functional throughout progress
    await nextBtn.click();

    // After click, progress should reset for new item
    await page.waitForTimeout(100);
    const newItemProgress = await getProgressBarPercentage(page);

    // Progress should restart (be lower than previous high progress)
    if (currentProgress > 50) {
      expect(newItemProgress).toBeLessThan(currentProgress);
    }

    // Button text should still be visible on new item
    const newItemText = await nextBtn.textContent();
    expect(newItemText).toBeTruthy();
    expect(newItemText.trim().length).toBeGreaterThan(0);
  });
});
