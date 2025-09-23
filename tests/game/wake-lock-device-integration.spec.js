import { test, expect } from "@playwright/test";
import { navigateToGamePage, startGame, getCurrentItem } from "./test-utils.js";

/**
 * Setup mock Wake Lock API for testing
 * @param {import('@playwright/test').Page} page
 */
async function setupWakeLockMock(page) {
  await page.addInitScript(() => {
    window.wakeLockCalls = [];
    window.wakeLockReleaseCalls = [];

    const mockWakeLock = {
      release: function () {
        window.wakeLockReleaseCalls.push(Date.now());
        return Promise.resolve();
      },
      addEventListener: function () {},
    };

    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: function (type) {
          window.wakeLockCalls.push({ type, timestamp: Date.now() });
          return Promise.resolve(mockWakeLock);
        },
      },
      writable: true,
      configurable: true,
    });
  });
}

/**
 * Setup mock Wake Lock API that throws errors
 * @param {import('@playwright/test').Page} page
 */
async function setupWakeLockErrorMock(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: function () {
          return Promise.reject(new Error("Wake lock not allowed"));
        },
      },
      writable: true,
      configurable: true,
    });
  });
}

/**
 * Setup mock to remove Wake Lock API entirely
 * @param {import('@playwright/test').Page} page
 */
async function setupWakeLockMissingMock(page) {
  await page.addInitScript(() => {
    delete navigator.wakeLock;
  });
}

/**
 * Get wake lock calls from the page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array>}
 */
async function getWakeLockCalls(page) {
  return page.evaluate(() => window.wakeLockCalls || []);
}

/**
 * Get wake lock release calls from the page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array>}
 */
async function getWakeLockReleaseCalls(page) {
  return page.evaluate(() => window.wakeLockReleaseCalls || []);
}

/**
 * Pause the currently running game
 * @param {import('@playwright/test').Page} page
 */
async function pauseGame(page) {
  await page.waitForFunction(() => {
    const pauseBtn = document.querySelector("#pause-btn");
    return pauseBtn && !pauseBtn.disabled;
  });

  await page.evaluate(() => document.querySelector("#pause-btn").click());
  await expect(page.locator("#play-btn")).toBeEnabled();
}

/**
 * Resume a paused game
 * @param {import('@playwright/test').Page} page
 */
async function resumeGame(page) {
  await page.click("#play-btn");
  await expect(page.locator("#pause-btn")).toBeEnabled();
}

test.describe("Wake Lock and Device Integration Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should activate wake lock when starting game", async ({ page }) => {
    await setupWakeLockMock(page);
    await navigateToGamePage(page);

    // Start game - should activate wake lock
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    // Verify wake lock was requested
    const wakeLockCalls = await getWakeLockCalls(page);
    expect(wakeLockCalls).toHaveLength(1);
    expect(wakeLockCalls[0].type).toBe("screen");

    // Verify game starts successfully
    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#pause-btn")).toBeEnabled();
  });

  test("should deactivate wake lock when pausing game", async ({ page }) => {
    await setupWakeLockMock(page);
    await navigateToGamePage(page);

    // Start game
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    // Wait for game to start
    await expect(page.locator("#current-item")).toBeVisible();

    // Pause game - should deactivate wake lock
    await pauseGame(page);

    // Verify wake lock was released
    const wakeLockReleaseCalls = await getWakeLockReleaseCalls(page);
    expect(wakeLockReleaseCalls).toHaveLength(1);
  });

  test("should reactivate wake lock when resuming game", async ({ page }) => {
    await setupWakeLockMock(page);
    await navigateToGamePage(page);

    // Start game
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // Pause game
    await pauseGame(page);

    // Resume game - should reactivate wake lock
    await resumeGame(page);

    // Verify wake lock was requested twice (start + resume)
    const wakeLockCalls = await getWakeLockCalls(page);
    expect(wakeLockCalls).toHaveLength(2);
    expect(wakeLockCalls[0].type).toBe("screen");
    expect(wakeLockCalls[1].type).toBe("screen");
  });

  test("should deactivate wake lock when stopping game", async ({ page }) => {
    await setupWakeLockMock(page);
    await navigateToGamePage(page);

    // Start game
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // Stop game - should deactivate wake lock
    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // Verify wake lock was released
    const wakeLockReleaseCalls = await getWakeLockReleaseCalls(page);
    expect(wakeLockReleaseCalls).toHaveLength(1);
  });

  test("should handle missing Wake Lock API gracefully", async ({ page }) => {
    await setupWakeLockMissingMock(page);
    await navigateToGamePage(page);

    // Should still work without wake lock API
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 2,
      timeLimit: 3,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // All game functions should work normally
    await pauseGame(page);
    await resumeGame(page);

    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // App should still be functional
    const titleVisible = await page.locator("h1").isVisible();
    expect(titleVisible).toBeTruthy();
  });

  test("should handle wake lock API errors gracefully", async ({ page }) => {
    await setupWakeLockErrorMock(page);
    await navigateToGamePage(page);

    // Should still work despite wake lock API failure
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // All game functions should work normally
    await pauseGame(page);
    await resumeGame(page);

    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();

    // App should still be functional
    const titleVisible = await page.locator("h1").isVisible();
    expect(titleVisible).toBeTruthy();
  });
});
