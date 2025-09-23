import { test, expect } from "@playwright/test";
import {
  navigateToGamePage,
  startGame,
  getProgressBarPercentage,
  monitorProgressBar,
  getCurrentItem,
  assertButtonStates,
  isProgressBarActive,
  waitForProgressBarActive,
  isSolutionVisible,
  navigateToPageViaMenu,
} from "./test-utils.js";

// Test constants for timing tolerances and thresholds
const TIMING_TOLERANCE_MS = 200; // ±200ms tolerance for CI robustness
const PROGRESS_BAR_JUMP_THRESHOLD = 25; // Maximum allowed progress bar jump percentage (lenient for CI)
const TIMER_3S_MIN_MS = 3000 - TIMING_TOLERANCE_MS; // Minimum expected time for 3-second timer
const TIMER_3S_MAX_MS = 3000 + TIMING_TOLERANCE_MS; // Maximum expected time for 3-second timer
const PROGRESS_THRESHOLD_PERCENT = 20; // Minimum progress percentage for testing
const MAX_RETRY_ATTEMPTS = 20; // Maximum retry attempts for polling operations
const DEFAULT_WAIT_TIMEOUT_MS = 5000; // Default timeout for waitForFunction operations
const SHORT_WAIT_TIMEOUT_MS = 2000; // Short timeout for quick operations
const MAX_POLLING_TIME_MS = 5000; // Maximum time to poll for item changes

test.describe("Timer and Countdown System Tests", () => {
  // Run timer tests serially to avoid timing conflicts
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("should auto-advance after timer expires with accurate timing", async ({
    page,
  }) => {
    // Start learning mode game with 3-second timer
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 50, // Larger range for reliable testing
      timeLimit: 3,
    });

    // Wait for progress bar to activate
    await waitForProgressBarActive(page);

    // Get initial item after game is fully running
    const initialItem = await getCurrentItem(page);

    // Record start time
    const startTime = Date.now();

    // Use polling approach for reliable timing measurement
    let currentItem = initialItem;
    let elapsedTime = 0;

    while (currentItem === initialItem && elapsedTime < MAX_POLLING_TIME_MS) {
      await page.waitForTimeout(50);
      currentItem = await getCurrentItem(page);
      elapsedTime = Date.now() - startTime;
    }

    // Verify timing accuracy with reasonable tolerance (±200ms for CI robustness)
    expect(elapsedTime).toBeGreaterThan(TIMER_3S_MIN_MS); // At least 2.8 seconds
    expect(elapsedTime).toBeLessThan(TIMER_3S_MAX_MS); // At most 3.2 seconds

    // Verify we moved to next item
    expect(currentItem).not.toBe(initialItem);
  });

  test("should auto-advance accurately with different timer durations", async ({
    page,
  }) => {
    const timeValues = [1, 2, 5];

    for (const timeLimit of timeValues) {
      // Start fresh game with current time limit
      await startGame(page, {
        learningMode: true,
        fromRange: 0,
        toRange: 50, // Larger range
        timeLimit: timeLimit,
      });

      await waitForProgressBarActive(page);

      const initialItem = await getCurrentItem(page);
      const startTime = Date.now();

      // Use polling approach for reliable timing
      let currentItem = initialItem;
      let elapsedTime = 0;

      while (
        currentItem === initialItem &&
        elapsedTime < (timeLimit + 2) * 1000
      ) {
        await page.waitForTimeout(50);
        currentItem = await getCurrentItem(page);
        elapsedTime = Date.now() - startTime;
      }

      // Verify timing accuracy with reasonable tolerance (±200ms for CI robustness)
      expect(elapsedTime).toBeGreaterThan(
        timeLimit * 1000 - TIMING_TOLERANCE_MS,
      );
      expect(elapsedTime).toBeLessThan(timeLimit * 1000 + TIMING_TOLERANCE_MS);

      // Stop game before next iteration
      await page.click("#stop-btn");

      // Wait for game to stop properly
      await expect(page.locator("#game-form")).toBeVisible();
    }
  });
  test("should synchronize progress bar with timer countdown", async ({
    page,
  }) => {
    // Start game with 3-second timer and larger range
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 20, // Larger range
      timeLimit: 3,
    });

    await waitForProgressBarActive(page);

    // Monitor progress bar for 2.5 seconds (before auto-advance)
    const samples = await monitorProgressBar(page, 2500, 100);

    // Verify we got reasonable samples
    expect(samples.length).toBeGreaterThan(10);

    // Verify progress is generally increasing and within reasonable bounds
    const firstProgress = samples[0].progress;
    const lastProgress = samples[samples.length - 1].progress;

    // Progress should increase over time
    expect(lastProgress).toBeGreaterThan(firstProgress);

    // Final progress should be substantial but not complete
    expect(lastProgress).toBeGreaterThan(60);
    expect(lastProgress).toBeLessThan(100); // Allow for near completion with proper timeouts

    // Check that progress generally trends upward (allowing for small variations)
    let increasingTrend = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].progress >= samples[i - 1].progress - 2) {
        // Allow small decreases due to timing
        increasingTrend++;
      }
    }

    // At least 80% of samples should show increasing or stable progress
    const trendRatio = increasingTrend / (samples.length - 1);
    expect(trendRatio).toBeGreaterThan(0.8);

    // Verify smooth progression without large jumps
    for (let i = 1; i < samples.length; i++) {
      const progressDiff = Math.abs(
        samples[i].progress - samples[i - 1].progress,
      );
      expect(progressDiff).toBeLessThan(PROGRESS_BAR_JUMP_THRESHOLD); // No jumps larger than 20% (lenient for CI animations)
    }
  });

  test("should pause and resume timer correctly maintaining state", async ({
    page,
  }) => {
    // Start game with 10-second timer in learning mode (has auto-timer)
    await startGame(page, {
      learningMode: true, // Learning mode to ensure timer starts automatically
      fromRange: 0,
      toRange: 50, // Larger range
      timeLimit: 10,
    });

    await waitForProgressBarActive(page);

    // Wait for progress to reach ~25% (about 2.5 seconds)
    await page.waitForFunction(
      () => {
        const nextBtn = document.querySelector("#next-btn .btn-progress-bar");
        if (!nextBtn) return false;
        const style = window.getComputedStyle(nextBtn);
        const progress =
          parseFloat(style.getPropertyValue("--progress").replace("%", "")) ||
          0;
        return progress >= 20; // At least 20% progress (2+ seconds)
      },
      undefined,
      { timeout: DEFAULT_WAIT_TIMEOUT_MS },
    );

    // Pause the game (use JS evaluation to avoid element blocking)
    await page.waitForFunction(() => {
      const pauseBtn = document.querySelector("#pause-btn");
      return pauseBtn && !pauseBtn.disabled;
    });

    await page.evaluate(() => {
      document.querySelector("#pause-btn").click();
    });

    // Verify game is paused
    await expect(page.locator("#pause-btn")).toBeDisabled();
    await expect(page.locator("#play-btn")).toBeEnabled();

    // Record progress at pause
    const progressAtPause = await getProgressBarPercentage(page);

    // Wait for 1 second and verify progress hasn't changed during pause
    await page.waitForTimeout(1000);
    const progressAfterWait = await getProgressBarPercentage(page);
    expect(Math.abs(progressAfterWait - progressAtPause)).toBeLessThan(1); // Should be essentially the same

    // Resume game
    await page.click("#play-btn");

    // Verify progress bar is active again
    await waitForProgressBarActive(page);

    // Wait for progress to advance significantly from pause point
    await page.waitForFunction(
      pauseProgress => {
        const nextBtn = document.querySelector("#next-btn .btn-progress-bar");
        if (!nextBtn) return false;
        const style = window.getComputedStyle(nextBtn);
        const progress =
          parseFloat(style.getPropertyValue("--progress").replace("%", "")) ||
          0;
        return progress > pauseProgress + 10; // At least 10% more progress
      },
      progressAtPause,
      { timeout: DEFAULT_WAIT_TIMEOUT_MS },
    );

    const finalProgress = await getProgressBarPercentage(page);
    expect(finalProgress).toBeGreaterThan(progressAtPause + 8);
  });

  test("should cancel timer when manually advancing to next item", async ({
    page,
  }) => {
    // Start game with longer timer in learning mode
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 50, // Larger range
      timeLimit: 10,
    });

    await waitForProgressBarActive(page);

    const initialItem = await getCurrentItem(page);

    // Wait for some progress to accumulate (about 2 seconds worth)
    await page.waitForFunction(
      () => {
        const nextBtn = document.querySelector("#next-btn .btn-progress-bar");
        if (!nextBtn) return false;
        const style = window.getComputedStyle(nextBtn);
        const progress =
          parseFloat(style.getPropertyValue("--progress").replace("%", "")) ||
          0;
        return progress >= 15; // At least 15% progress (~1.5 seconds)
      },
      undefined,
      { timeout: DEFAULT_WAIT_TIMEOUT_MS },
    );

    // Manually advance
    await page.click("#next-btn");

    // Verify we moved to next item immediately using polling
    let newItem = initialItem;
    let attempts = 0;
    while (newItem === initialItem && attempts < MAX_RETRY_ATTEMPTS) {
      await page.waitForTimeout(50);
      newItem = await getCurrentItem(page);
      attempts++;
    }
    expect(newItem).not.toBe(initialItem);

    // New item should also start with a timer in learning mode
    await waitForProgressBarActive(page);

    // Verify the new timer works correctly - wait for some progress
    await page.waitForFunction(
      () => {
        const nextBtn = document.querySelector("#next-btn .btn-progress-bar");
        if (!nextBtn) return false;
        const style = window.getComputedStyle(nextBtn);
        const progress =
          parseFloat(style.getPropertyValue("--progress").replace("%", "")) ||
          0;
        return progress > 5; // Should show some progress
      },
      undefined,
      { timeout: 3000 },
    );
  });

  test("should validate timing accuracy across multiple timer settings", async ({
    page,
  }) => {
    const timeSettings = [1, 3, 5]; // Reduced set for faster testing

    for (const timeLimit of timeSettings) {
      // Start learning mode game with current time setting
      await startGame(page, {
        learningMode: true,
        fromRange: 0,
        toRange: 50, // Larger range
        timeLimit: timeLimit,
      });

      await waitForProgressBarActive(page);

      const initialItem = await getCurrentItem(page);
      const startTime = Date.now();

      // Use polling approach for reliable timing
      let currentItem = initialItem;
      let elapsedTime = 0;

      while (
        currentItem === initialItem &&
        elapsedTime < (timeLimit + 2) * 1000
      ) {
        await page.waitForTimeout(50);
        currentItem = await getCurrentItem(page);
        elapsedTime = Date.now() - startTime;
      }

      // Verify timing accuracy with reasonable tolerance (±200ms for CI robustness)
      expect(elapsedTime).toBeGreaterThan(
        timeLimit * 1000 - TIMING_TOLERANCE_MS,
      );
      expect(elapsedTime).toBeLessThan(timeLimit * 1000 + TIMING_TOLERANCE_MS);

      // Stop game before next iteration
      await page.click("#stop-btn");
      await expect(page.locator("#game-form")).toBeVisible();
    }
  });

  test("should handle edge case timer settings correctly", async ({ page }) => {
    // Test very short timer (1 second)
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 50, // Larger range
      timeLimit: 1,
    });

    await waitForProgressBarActive(page);

    const initialItem = await getCurrentItem(page);
    const startTime = Date.now();

    // Use polling approach for reliable timing
    let currentItem = initialItem;
    let elapsedTime = 0;

    while (currentItem === initialItem && elapsedTime < SHORT_WAIT_TIMEOUT_MS) {
      await page.waitForTimeout(50);
      currentItem = await getCurrentItem(page);
      elapsedTime = Date.now() - startTime;
    }

    expect(elapsedTime).toBeGreaterThan(1000 - TIMING_TOLERANCE_MS);
    expect(elapsedTime).toBeLessThan(1000 + TIMING_TOLERANCE_MS);

    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // Test longer timer (30 seconds) - just verify it starts correctly
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 50, // Larger range
      timeLimit: 30,
    });

    await waitForProgressBarActive(page);

    // Wait for initial progress to show up
    await page.waitForFunction(
      () => {
        const nextBtn = document.querySelector("#next-btn .btn-progress-bar");
        if (!nextBtn) return false;
        const style = window.getComputedStyle(nextBtn);
        const progress =
          parseFloat(style.getPropertyValue("--progress").replace("%", "")) ||
          0;
        return progress > 0 && progress < 10; // Should be very low percentage
      },
      undefined,
      { timeout: SHORT_WAIT_TIMEOUT_MS },
    );

    // Manually advance to avoid 30-second wait
    await page.click("#next-btn");
  });

  test("should clean up timers properly when navigating away from game", async ({
    page,
  }) => {
    // Start game with timer
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 50,
      timeLimit: 10,
    });

    await waitForProgressBarActive(page);

    // Navigate away from game page - open menu first, then click navigation
    const menuButton = page.locator(".menu-btn, #menu-btn, .hamburger-menu");
    const menuVisible = await menuButton.isVisible().catch(() => false);

    if (menuVisible) {
      await menuButton.click();
      await page.waitForTimeout(300);
    }

    // Use JavaScript to click the navigation item - fix selector syntax
    await page.evaluate(() => {
      // Find "Hem" button by text content
      const buttons = Array.from(document.querySelectorAll("button"));
      const heimButton = buttons.find(
        btn => btn.textContent && btn.textContent.includes("Hem"),
      );

      if (heimButton) {
        heimButton.click();
      } else {
        // Fallback: find main menu navigation
        const mainMenuButton =
          document.querySelector('button[onclick*="main-menu"]') ||
          document.querySelector('a[href="#main-menu"]');
        if (mainMenuButton) {
          mainMenuButton.click();
        } else {
          // Final fallback: direct navigation
          window.location.hash = "main-menu";
        }
      }
    });

    // Wait for navigation
    await page.waitForSelector("#main-menu.active", { timeout: 3000 });

    // Wait a moment to let any cleanup occur
    await page.waitForTimeout(1000);

    // Already on main menu, just proceed to check timer cleanup

    // Go back to game
    await page.click(".tile:first-child");
    await expect(page.locator("#game-page.active")).toBeVisible();

    // Verify clean state - no active progress bar
    const progressBarActive = await isProgressBarActive(page);
    expect(progressBarActive).toBe(false);

    // Verify buttons are in correct initial state
    await assertButtonStates(page, {
      "play-btn": true,
      "pause-btn": false,
      "stop-btn": false,
      "show-btn": false,
      "next-btn": false,
    });

    // Start new game to verify everything works correctly
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 20,
      timeLimit: 3,
    });

    await waitForProgressBarActive(page);

    // Verify new timer works correctly by waiting for item change using polling
    const initialItem = await getCurrentItem(page);
    let currentItem = initialItem;
    let elapsedTime = 0;
    const startTime = Date.now();

    while (currentItem === initialItem && elapsedTime < MAX_POLLING_TIME_MS) {
      await page.waitForTimeout(50);
      currentItem = await getCurrentItem(page);
      elapsedTime = Date.now() - startTime;
    }

    expect(currentItem).not.toBe(initialItem);
  });

  test("should behave differently in learning vs training modes", async ({
    page,
  }) => {
    // Test learning mode - should auto-advance
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 50, // Larger range
      timeLimit: 2,
    });

    await waitForProgressBarActive(page);

    const learningModeItem = await getCurrentItem(page);

    // Wait for auto-advance in learning mode using polling
    let currentItem = learningModeItem;
    let elapsedTime = 0;
    const startTime = Date.now();

    while (currentItem === learningModeItem && elapsedTime < 3000) {
      await page.waitForTimeout(50);
      currentItem = await getCurrentItem(page);
      elapsedTime = Date.now() - startTime;
    }

    expect(currentItem).not.toBe(learningModeItem);

    // Stop and switch to training mode
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 50, // Larger range
      timeLimit: 2,
    });

    await waitForProgressBarActive(page);
    const trainingModeItem = await getCurrentItem(page);

    // Wait for timer to expire by waiting for progress bar to complete
    await page.waitForFunction(
      () => {
        const nextBtn = document.querySelector("#next-btn .btn-progress-bar");
        if (!nextBtn) return false;
        const style = window.getComputedStyle(nextBtn);
        const progress =
          parseFloat(style.getPropertyValue("--progress").replace("%", "")) ||
          0;
        return progress >= 95; // Nearly complete
      },
      undefined,
      { timeout: 4000 },
    );

    // Wait a moment for the game to process timer expiration
    await page.waitForTimeout(500);

    // In training mode, should show answer but not auto-advance
    const stillSameItem = await getCurrentItem(page);
    expect(stillSameItem).toBe(trainingModeItem);

    // Solution should be visible after timer expires
    const solutionVisible = await isSolutionVisible(page);
    expect(solutionVisible).toBe(true);

    // Game should be paused
    await expect(page.locator("#play-btn")).toBeEnabled();
    await expect(page.locator("#pause-btn")).toBeDisabled();
  });

  test("should pause timer when showing answer manually", async ({ page }) => {
    // Start training mode game
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 10,
      timeLimit: 5,
    });

    await waitForProgressBarActive(page);

    // Wait for some progress, then show answer manually
    await page.waitForFunction(
      () => {
        const nextBtn = document.querySelector("#next-btn .btn-progress-bar");
        if (!nextBtn) return false;
        const style = window.getComputedStyle(nextBtn);
        const progress =
          parseFloat(style.getPropertyValue("--progress").replace("%", "")) ||
          0;
        return progress >= 30; // At least 30% progress (about 1.5 seconds)
      },
      undefined,
      { timeout: 3000 },
    );

    await page.click("#show-btn");

    // Game should be paused after showing answer
    await expect(page.locator("#play-btn")).toBeEnabled();
    await expect(page.locator("#pause-btn")).toBeDisabled();

    // Answer should be visible
    const solutionVisible = await isSolutionVisible(page);
    expect(solutionVisible).toBe(true);

    // VISA button should be disabled
    await expect(page.locator("#show-btn")).toBeDisabled();

    // Verify no auto-advance happens by checking item stays the same
    const currentItem = await getCurrentItem(page);
    await page.waitForTimeout(1000); // Brief wait to ensure no auto-advance
    const itemAfterWait = await getCurrentItem(page);
    expect(itemAfterWait).toBe(currentItem);
  });
});
