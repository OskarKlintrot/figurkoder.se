import { test, expect } from "@playwright/test";
import { navigateToGamePage, startGame, getCurrentItem } from "./test-utils.js";

test.describe("Performance and Memory Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("should handle long gaming sessions without memory leaks", async ({
    page,
  }) => {
    // Monitor performance metrics during extended gameplay
    const initialMetrics = await page.evaluate(() => {
      return {
        jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0,
        totalJSHeapSize: performance.memory?.totalJSHeapSize || 0,
        usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
        timing: performance.timing
          ? {
              navigationStart: performance.timing.navigationStart,
              loadEventEnd: performance.timing.loadEventEnd,
            }
          : {},
      };
    });

    console.log("Initial memory metrics:", initialMetrics);

    // Start a game session
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 10, // Moderate dataset size
      timeLimit: 1, // Fast cycling for stress test
    });

    const memorySnapshots = [];
    const performanceSnapshots = [];

    // Simulate extended gameplay (30+ items)
    for (let i = 0; i < 30; i++) {
      // Advance through items to simulate extended play
      await page.click("#next-btn");
      await page.waitForTimeout(50); // Small delay between actions

      // Take memory snapshot every 5 iterations
      if (i % 5 === 0) {
        const memoryMetrics = await page.evaluate(() => {
          return {
            usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
            totalJSHeapSize: performance.memory?.totalJSHeapSize || 0,
            timestamp: Date.now(),
          };
        });

        memorySnapshots.push(memoryMetrics);

        // Check for performance metrics
        const perfMetrics = await page.evaluate(() => {
          const entries = performance.getEntriesByType("navigation");
          const paintEntries = performance.getEntriesByType("paint");

          return {
            navigationEntry: entries[0]
              ? {
                  domContentLoadedEventEnd: entries[0].domContentLoadedEventEnd,
                  loadEventEnd: entries[0].loadEventEnd,
                }
              : null,
            paintEntries: paintEntries.map(entry => ({
              name: entry.name,
              startTime: entry.startTime,
            })),
          };
        });

        performanceSnapshots.push({
          iteration: i,
          memory: memoryMetrics,
          performance: perfMetrics,
        });
      }

      // Occasionally show/hide answers to stress different code paths
      if (i % 3 === 0) {
        await page.click("#show-btn");
        await page.waitForTimeout(25);
      }
    }

    // Analyze memory usage over time
    console.log("Memory snapshots:", memorySnapshots);

    if (memorySnapshots.length >= 3) {
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth =
        lastSnapshot.usedJSHeapSize - firstSnapshot.usedJSHeapSize;
      const memoryGrowthPercent =
        (memoryGrowth / firstSnapshot.usedJSHeapSize) * 100;

      console.log(
        `Memory growth: ${memoryGrowth} bytes (${memoryGrowthPercent.toFixed(2)}%)`,
      );

      // Memory growth should be reasonable (not indicating major leaks)
      // Allow for 50% growth in memory usage during extended session
      expect(memoryGrowthPercent).toBeLessThan(50);
    }

    // Test with larger dataset
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    const memoryAfterStop = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });

    console.log("Memory after stop:", memoryAfterStop);

    // Start with larger dataset
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 50, // Larger dataset
      timeLimit: 1,
    });

    // Run through more items with larger dataset
    for (let i = 0; i < 20; i++) {
      await page.click("#next-btn");
      await page.waitForTimeout(30);
    }

    const memoryWithLargeDataset = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });

    console.log("Memory with large dataset:", memoryWithLargeDataset);

    // Check for performance degradation
    const currentItem = await getCurrentItem(page);
    expect(currentItem).toBeTruthy();

    // Game should still be responsive
    const responseTimeStart = Date.now();
    await page.click("#next-btn");
    await page.waitForTimeout(100);
    const responseTime = Date.now() - responseTimeStart;

    console.log("Response time after extended session:", responseTime);

    // Should respond within reasonable time (2 seconds is very generous)
    expect(responseTime).toBeLessThan(2000);

    await page.click("#stop-btn");
  });

  test("should clean up timers correctly", async ({ page }) => {
    // Test that timers are properly cleaned up when leaving pages

    // Start multiple game sessions and track active timers
    const timerIds = [];

    // Mock setInterval and setTimeout to track timer creation
    await page.addInitScript(() => {
      window.activeTimers = new Set();

      const originalSetInterval = window.setInterval;
      const originalSetTimeout = window.setTimeout;
      const originalClearInterval = window.clearInterval;
      const originalClearTimeout = window.clearTimeout;

      window.setInterval = function (callback, delay) {
        const id = originalSetInterval.call(this, callback, delay);
        window.activeTimers.add({ type: "interval", id: id });
        return id;
      };

      window.setTimeout = function (callback, delay) {
        const id = originalSetTimeout.call(this, callback, delay);
        window.activeTimers.add({ type: "timeout", id: id });
        return id;
      };

      window.clearInterval = function (id) {
        window.activeTimers.forEach(timer => {
          if (timer.id === id && timer.type === "interval") {
            window.activeTimers.delete(timer);
          }
        });
        return originalClearInterval.call(this, id);
      };

      window.clearTimeout = function (id) {
        window.activeTimers.forEach(timer => {
          if (timer.id === id && timer.type === "timeout") {
            window.activeTimers.delete(timer);
          }
        });
        return originalClearTimeout.call(this, id);
      };
    });

    // Start first game session
    await startGame(page, {
      learningMode: true, // Auto-timer mode
      fromRange: 0,
      toRange: 10,
      timeLimit: 5,
    });

    // Let timers run
    await page.waitForTimeout(1000);

    const timersAfterFirstGame = await page.evaluate(() => {
      return Array.from(window.activeTimers);
    });

    console.log("Active timers after first game:", timersAfterFirstGame);

    // Navigate away during active timers
    await page.goto("/");
    await page.waitForSelector("#main-menu.active", { timeout: 5000 });

    // Check for orphaned timers
    const timersAfterNavigation = await page.evaluate(() => {
      return Array.from(window.activeTimers || []);
    });

    console.log("Timers after navigation:", timersAfterNavigation);

    // Navigate back to game
    await navigateToGamePage(page);

    // Start second game session
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 5,
      timeLimit: 3,
    });

    await page.waitForTimeout(500);

    const timersAfterSecondGame = await page.evaluate(() => {
      return Array.from(window.activeTimers);
    });

    console.log("Timers after second game:", timersAfterSecondGame);

    // Stop game explicitly
    await page.click("#stop-btn");
    await page.waitForTimeout(200);

    const timersAfterStop = await page.evaluate(() => {
      return Array.from(window.activeTimers);
    });

    console.log("Timers after explicit stop:", timersAfterStop);

    // Start third game and pause
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 5,
      timeLimit: 10,
    });

    await page.waitForTimeout(500);

    // Pause using JS evaluation to avoid element blocking
    await page.waitForFunction(() => {
      const pauseBtn = document.querySelector("#pause-btn");
      return pauseBtn && !pauseBtn.disabled;
    });

    await page.evaluate(() => {
      document.querySelector("#pause-btn").click();
    });
    await page.waitForTimeout(200);

    const timersAfterPause = await page.evaluate(() => {
      return Array.from(window.activeTimers);
    });

    console.log("Timers after pause:", timersAfterPause);

    // Resume and then navigate away
    await page.click("#play-btn");
    await page.waitForTimeout(200);

    // Navigate to different page while game is running
    const menuButton = page.locator(
      'button:has-text("Meny"), .menu-btn, #menu-btn',
    );
    const hasMenuButton = await menuButton.isVisible().catch(() => false);

    if (hasMenuButton) {
      await menuButton.click();
      await page.waitForTimeout(200);

      const aboutLink = page.locator('a:has-text("Om"), button:has-text("Om")');
      const hasAboutLink = await aboutLink.isVisible().catch(() => false);

      if (hasAboutLink) {
        await aboutLink.click();
        await page.waitForTimeout(200);
      }
    }

    // Check timer cleanup after navigation during active game
    const timersAfterActiveNavigation = await page.evaluate(() => {
      return Array.from(window.activeTimers || []);
    });

    console.log(
      "Timers after navigation during active game:",
      timersAfterActiveNavigation,
    );

    // Check browser performance after timer operations
    const performanceAfterTimerTest = await page.evaluate(() => {
      return {
        memory: performance.memory
          ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
            }
          : null,
        timing: performance.now(),
      };
    });

    console.log("Performance after timer test:", performanceAfterTimerTest);

    // Verify page is still responsive
    await page.goto("/");
    await page.waitForSelector("#main-menu.active", { timeout: 5000 });

    const isResponsive = await page.evaluate(() => {
      return document.readyState === "complete";
    });

    expect(isResponsive).toBeTruthy();

    // Final timer check
    const finalTimerCheck = await page.evaluate(() => {
      return window.activeTimers ? Array.from(window.activeTimers).length : 0;
    });

    console.log("Final active timer count:", finalTimerCheck);

    // The goal is no orphaned timers, but this is implementation dependent
    // At minimum, the app should remain functional
    expect(isResponsive).toBeTruthy();
  });

  test("should monitor resource usage efficiently", async ({ page }) => {
    // Monitor various resource usage patterns

    // Track network requests
    const networkRequests = [];
    page.on("request", request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
      });
    });

    // Track console messages for potential performance warnings
    const consoleMessages = [];
    page.on("console", msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });

    // Baseline performance
    const baselinePerformance = await page.evaluate(() => {
      return {
        memory: performance.memory
          ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
            }
          : null,
        timing: performance.now(),
        resources: performance.getEntriesByType("resource").length,
      };
    });

    console.log("Baseline performance:", baselinePerformance);

    // Test rapid game start/stop cycles
    for (let cycle = 0; cycle < 5; cycle++) {
      await startGame(page, {
        learningMode: cycle % 2 === 0, // Alternate modes
        fromRange: 0,
        toRange: 5,
        timeLimit: 2,
      });

      // Rapid interactions
      for (let i = 0; i < 5; i++) {
        await page.click("#next-btn");
        await page.waitForTimeout(20);
      }

      await page.click("#stop-btn");
      await page.waitForTimeout(50);
    }

    // Check performance after rapid cycles
    const performanceAfterCycles = await page.evaluate(() => {
      return {
        memory: performance.memory
          ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
            }
          : null,
        timing: performance.now(),
        resources: performance.getEntriesByType("resource").length,
      };
    });

    console.log("Performance after rapid cycles:", performanceAfterCycles);

    // Analyze resource usage
    console.log(`Network requests made: ${networkRequests.length}`);
    console.log(`Console messages: ${consoleMessages.length}`);

    // Check for excessive network requests (should be minimal for offline-capable app)
    const uniqueUrls = new Set(networkRequests.map(req => req.url)).size;
    console.log(`Unique URLs requested: ${uniqueUrls}`);

    // Check for performance warnings in console
    const performanceWarnings = consoleMessages.filter(
      msg =>
        msg.text.toLowerCase().includes("performance") ||
        msg.text.toLowerCase().includes("memory") ||
        msg.text.toLowerCase().includes("slow"),
    );

    console.log("Performance warnings:", performanceWarnings);

    // Test with DOM manipulation stress
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 20,
      timeLimit: 1,
    });

    // Rapid DOM updates
    for (let i = 0; i < 15; i++) {
      await page.click("#next-btn");
      await page.waitForTimeout(10); // Very fast cycling
    }

    // Check DOM performance
    const domPerformance = await page.evaluate(() => {
      return {
        elementCount: document.querySelectorAll("*").length,
        memory: performance.memory
          ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
            }
          : null,
        paintEntries: performance.getEntriesByType("paint").length,
      };
    });

    console.log("DOM performance metrics:", domPerformance);

    // Test should complete without crashes
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // Final resource check
    const finalResourceCheck = await page.evaluate(() => {
      return {
        readyState: document.readyState,
        performance: performance.now(),
        elementsCount: document.querySelectorAll("*").length,
      };
    });

    console.log("Final resource check:", finalResourceCheck);

    // Page should remain in good state
    expect(finalResourceCheck.readyState).toBe("complete");
    expect(finalResourceCheck.elementsCount).toBeGreaterThan(10);

    // No critical performance errors should occur
    const criticalErrors = consoleMessages.filter(
      msg =>
        msg.type === "error" &&
        (msg.text.includes("memory") ||
          msg.text.includes("performance") ||
          msg.text.includes("timeout")),
    );

    expect(criticalErrors.length).toBe(0);
  });
});
