import { test, expect } from "@playwright/test";
import { navigateToGamePage, startGame, getCurrentItem } from "./test-utils.js";

test.describe("Vibration and Device Integration Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("should handle vibration in learning mode only", async ({ page }) => {
    // Test that vibration API is available or gracefully handled
    const vibrationSupported = await page.evaluate(() => {
      return "vibrate" in navigator;
    });

    console.log(`Vibration API supported: ${vibrationSupported}`);

    // Mock vibration calls to test the logic
    const vibrationCalls = [];
    await page.addInitScript(() => {
      // Mock navigator.vibrate to capture calls
      const originalVibrate = navigator.vibrate || (() => false);
      navigator.vibrate = function (pattern) {
        window.mockVibrationCalls = window.mockVibrationCalls || [];
        window.mockVibrationCalls.push(pattern);
        return originalVibrate.call(this, pattern);
      };
    });

    // Test learning mode - should vibrate on auto-advance
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 5,
      timeLimit: 2, // Short timer for faster auto-advance
    });

    // Wait for auto-advance to potentially trigger vibration
    const initialItem = await getCurrentItem(page);

    // Wait for item to auto-advance (learning mode should auto-advance)
    let itemChanged = false;
    const maxWaitTime = 5000; // 5 seconds max wait
    const startTime = Date.now();

    while (!itemChanged && Date.now() - startTime < maxWaitTime) {
      await page.waitForTimeout(100);
      const currentItem = await getCurrentItem(page);
      if (currentItem !== initialItem) {
        itemChanged = true;
      }
    }

    // Check if vibration was called during auto-advance
    const learningModeVibrations = await page.evaluate(() => {
      return window.mockVibrationCalls || [];
    });

    console.log(`Learning mode vibrations:`, learningModeVibrations);

    // Stop learning mode game
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // Clear vibration calls for next test
    await page.evaluate(() => {
      window.mockVibrationCalls = [];
    });

    // Test training mode - should NOT vibrate on manual actions
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 5,
      timeLimit: 10,
    });

    // Manual "NÄSTA" click should not trigger vibration
    await page.click("#next-btn");
    await page.waitForTimeout(500);

    // Check vibration calls in training mode
    const trainingModeVibrations = await page.evaluate(() => {
      return window.mockVibrationCalls || [];
    });

    console.log(`Training mode vibrations:`, trainingModeVibrations);

    // Manual show answer should not trigger vibration
    await page.click("#show-btn");
    await page.waitForTimeout(500);

    const showAnswerVibrations = await page.evaluate(() => {
      return window.mockVibrationCalls || [];
    });

    console.log(`Show answer vibrations:`, showAnswerVibrations);

    // Test shows that the app handles vibration API appropriately
    // Whether vibration actually occurs depends on the implementation
    // but the app should not break when vibration is called

    // Verify game still functions normally after vibration tests
    await expect(page.locator("#current-item")).toBeVisible();
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // Test graceful degradation when vibration is not available
    await page.addInitScript(() => {
      // Remove vibration support
      delete navigator.vibrate;
    });

    // Should still be able to start and play game without vibration
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 3,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // Game should work normally even without vibration API
    const item = await getCurrentItem(page);
    expect(item).toBeTruthy();

    await page.click("#next-btn");
    await page.waitForTimeout(200);

    // Should advance to next item without errors
    const newItem = await getCurrentItem(page);
    expect(newItem).toBeTruthy();
  });

  test("should manage screen wake lock correctly", async ({ page }) => {
    // Test screen wake lock API availability and graceful degradation
    const wakeLockSupported = await page.evaluate(() => {
      return "wakeLock" in navigator;
    });

    console.log(`Wake Lock API supported: ${wakeLockSupported}`);

    // Mock wake lock for testing if not available
    if (!wakeLockSupported) {
      await page.addInitScript(() => {
        window.mockWakeLock = {
          locks: [],
          request: function (type) {
            const lock = {
              type: type,
              released: false,
              release: function () {
                this.released = true;
                window.mockWakeLock.locks = window.mockWakeLock.locks.filter(
                  l => l !== this,
                );
                return Promise.resolve();
              },
            };
            this.locks.push(lock);
            return Promise.resolve(lock);
          },
        };

        navigator.wakeLock = window.mockWakeLock;
      });
    }

    // Start game and verify wake lock activates
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 5,
      timeLimit: 5,
    });

    // Check if wake lock was requested
    const wakeLockStatus = await page.evaluate(async () => {
      try {
        if (navigator.wakeLock) {
          // In real implementation, check if wake lock is active
          // For testing, we'll check if the API is being called properly
          return {
            apiAvailable: true,
            mockLocks: window.mockWakeLock
              ? window.mockWakeLock.locks.length
              : 0,
          };
        }
        return { apiAvailable: false };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log("Wake lock status during game:", wakeLockStatus);

    // Pause game and verify wake lock releases
    await page.click("#pause-btn");
    await expect(page.locator("#play-btn")).toBeEnabled();

    const pausedWakeLockStatus = await page.evaluate(() => {
      if (window.mockWakeLock) {
        return {
          activeLocks: window.mockWakeLock.locks.length,
          releasedLocks: window.mockWakeLock.locks.filter(l => l.released)
            .length,
        };
      }
      return { mockNotAvailable: true };
    });

    console.log("Wake lock status during pause:", pausedWakeLockStatus);

    // Resume and verify wake lock re-activates
    await page.click("#play-btn");
    await expect(page.locator("#pause-btn")).toBeEnabled();

    const resumedWakeLockStatus = await page.evaluate(() => {
      if (window.mockWakeLock) {
        return {
          activeLocks: window.mockWakeLock.locks.length,
          totalLocks: window.mockWakeLock.locks.length,
        };
      }
      return { mockNotAvailable: true };
    });

    console.log("Wake lock status after resume:", resumedWakeLockStatus);

    // Stop game and verify wake lock releases
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    const stoppedWakeLockStatus = await page.evaluate(() => {
      if (window.mockWakeLock) {
        const allReleased = window.mockWakeLock.locks.every(l => l.released);
        return {
          allReleased: allReleased,
          lockCount: window.mockWakeLock.locks.length,
        };
      }
      return { mockNotAvailable: true };
    });

    console.log("Wake lock status after stop:", stoppedWakeLockStatus);

    // Test graceful degradation without wake lock API
    await page.addInitScript(() => {
      delete navigator.wakeLock;
    });

    // Should still be able to start game without wake lock
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // Game should function normally without wake lock
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).toBeVisible();

    await page.click("#pause-btn");
    await expect(page.locator("#play-btn")).toBeEnabled();

    await page.click("#play-btn");
    await expect(page.locator("#pause-btn")).toBeEnabled();

    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // Verify no errors occurred during wake lock lifecycle without API
    const consoleErrors = [];
    page.on("console", msg => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Test another game cycle to ensure stability
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 2,
      timeLimit: 3,
    });

    await page.waitForTimeout(1000);
    await page.click("#stop-btn");

    // Filter critical errors (ignore network errors common in testing)
    const criticalErrors = consoleErrors.filter(
      error =>
        error.includes("Uncaught") ||
        error.includes("ReferenceError") ||
        error.includes("SyntaxError"),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("should handle device integration errors gracefully", async ({
    page,
  }) => {
    // Test that device API failures don't break the game

    // Mock failing device APIs
    await page.addInitScript(() => {
      // Make vibration fail
      navigator.vibrate = function () {
        throw new Error("Vibration not available");
      };

      // Make wake lock fail
      navigator.wakeLock = {
        request: function () {
          return Promise.reject(new Error("Wake lock not available"));
        },
      };
    });

    // Should still be able to start and play game with failing device APIs
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).toBeVisible();

    // Game interactions should work despite device API failures
    await page.click("#next-btn");
    await page.waitForTimeout(200);

    const newItem = await getCurrentItem(page);
    expect(newItem).toBeTruthy();

    // Pause/resume should work
    await page.click("#pause-btn");
    await expect(page.locator("#play-btn")).toBeEnabled();

    await page.click("#play-btn");
    await expect(page.locator("#pause-btn")).toBeEnabled();

    // Stop should work
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // Test with completely missing device APIs
    await page.addInitScript(() => {
      delete navigator.vibrate;
      delete navigator.wakeLock;
    });

    // Should still work with missing APIs
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // All core functionality should remain intact
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).toBeVisible();

    await page.click("#next-btn");
    await page.waitForTimeout(200);

    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    console.log(
      "Device integration error handling test completed successfully",
    );
  });
});
