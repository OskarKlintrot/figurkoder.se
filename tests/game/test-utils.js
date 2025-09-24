import { expect } from "@playwright/test";

/**
 * Test utilities for Figurkoder.se Playwright tests
 * Common functions for game testing scenarios
 */

/**
 * Navigate to game page and wait for it to be ready
 * @param {import('@playwright/test').Page} page
 */
export async function navigateToGamePage(page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // Wait for main menu with flexible approach
  try {
    await page.waitForSelector("#main-menu.active", { timeout: 3000 });
  } catch (e) {
    // Fallback: just wait for main menu to be visible
    await page.waitForSelector("#main-menu", { timeout: 3000 });
  }

  // Click the first game tile to navigate to game page
  await page.waitForSelector(".tile", { timeout: 5000 });
  await page.click(".tile:first-child");

  // Wait for game page to be active
  await page.waitForSelector("#game-page.active", { timeout: 5000 });
}

/**
 * Get the current progress bar percentage
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>} Progress percentage (0-100)
 */
export async function getProgressBarPercentage(page) {
  const progressBar = page.locator("#next-btn .btn-progress-bar");
  const progressValue = await progressBar.evaluate(el => {
    const style = window.getComputedStyle(el);
    const progressVar = style.getPropertyValue("--progress");
    return parseFloat(progressVar.replace("%", "")) || 0;
  });
  return progressValue;
}

/**
 * Get current item text
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} Current item text
 */
export async function getCurrentItem(page) {
  return await page.locator("#current-item").textContent();
}

/**
 * Get current solution display text
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} Current solution text
 */
export async function getCurrentSolution(page) {
  return await page.locator("#solution-display").textContent();
}

/**
 * Assert button states match expected values
 * @param {import('@playwright/test').Page} page
 * @param {Object} expectedStates - Object mapping button IDs to expected enabled state
 */
export async function assertButtonStates(page, expectedStates) {
  for (const [buttonId, shouldBeEnabled] of Object.entries(expectedStates)) {
    const selector = `#${buttonId}`;
    const button = page.locator(selector);

    if (shouldBeEnabled) {
      await expect(button).toBeEnabled({
        timeout: 2000,
      });
    } else {
      await expect(button).toBeDisabled({
        timeout: 2000,
      });
    }
  }
}

/**
 * Check if progress bar is visible and has progress class
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} Whether progress bar is active
 */
export async function isProgressBarActive(page) {
  const nextBtn = page.locator("#next-btn");
  return await nextBtn.evaluate(el => {
    return el.classList.contains("progress-bar");
  });
}

/**
 * Wait for progress bar to become active
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForProgressBarActive(page, timeout = 2000) {
  await page.waitForFunction(
    () => {
      const nextBtn = document.querySelector("#next-btn");
      return nextBtn && nextBtn.classList.contains("progress-bar");
    },
    undefined,
    { timeout },
  );
}

/**
 * Check if solution is visible (not showing dots and element is visible)
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} Whether solution is visible
 */
export async function isSolutionVisible(page) {
  const isDisplayVisible = await isSolutionDisplayVisible(page);
  if (!isDisplayVisible) return false;

  const solution = await getCurrentSolution(page);
  return solution !== "•••" && solution !== "---" && solution.trim().length > 0;
}

/**
 * Check if solution display is actually visible (not hidden)
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} Whether solution display element is visible
 */
export async function isSolutionDisplayVisible(page) {
  const solutionDisplay = page.locator("#solution-display");
  return await solutionDisplay.isVisible().catch(() => false);
}

/**
 * Start a game with specific settings
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {boolean} options.learningMode - Whether to enable learning mode
 * @param {number} options.fromRange - Starting range value
 * @param {number} options.toRange - Ending range value
 * @param {number} options.timeLimit - Time limit in seconds
 */
export async function startGame(page, options = {}) {
  const {
    learningMode = false,
    fromRange = 0,
    toRange = 9,
    timeLimit = 5,
  } = options;

  // Fill in form settings
  await page.fill("#from-input", fromRange.toString());
  await page.fill("#to-input", toRange.toString());
  await page.fill("#time-input", timeLimit.toString());

  // Set learning mode
  if (learningMode) {
    await page.check("#learning-mode");
  } else {
    await page.uncheck("#learning-mode");
  }

  // Start the game
  await page.click('button[type="submit"]');

  // Wait for game controls to be visible and game to actually start
  await page.waitForSelector(".game-controls", { timeout: 5000 });
  await page.waitForSelector("#current-item", { timeout: 5000 });
}

/**
 * Pause the currently running game
 * @param {import('@playwright/test').Page} page
 */
export async function pauseGame(page) {
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
export async function resumeGame(page) {
  await page.click("#play-btn");
  await expect(page.locator("#pause-btn")).toBeEnabled();
}

/**
 * Stop the currently running game
 * @param {import('@playwright/test').Page} page
 * @param {Object} options - Stop game options
 * @param {boolean} options.isLearningMode - Whether the game is in learning mode
 */
export async function stopGame(page, options = {}) {
  const { isLearningMode = false } = options;

  await page.click("#stop-btn");

  if (isLearningMode) {
    // In learning mode, should stay on game page
    await page.waitForFunction(() => {
      const gamePage = document.querySelector("#game-page");
      return gamePage && gamePage.classList.contains("active");
    });
  } else {
    // In training mode, can either go to results page (if has results) or back to form (if no results)
    await page.waitForFunction(() => {
      const resultsPage = document.querySelector("#results-page");
      const gamePage = document.querySelector("#game-page");

      // Check if results page became active (has results to show)
      const resultsPageActive =
        resultsPage && resultsPage.classList.contains("active");

      // Check if still on game page (no results, back to form)
      const gamePageActive = gamePage && gamePage.classList.contains("active");

      return resultsPageActive || gamePageActive;
    });
  }
}
