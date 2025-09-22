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
  await page.waitForSelector("#main-menu.active", { timeout: 5000 });

  // Click the first game tile to navigate to game page
  await page.waitForSelector(".tile", { timeout: 5000 });
  await page.click(".tile:first-child");

  // Wait for game page to be active
  await page.waitForSelector("#game-page.active", { timeout: 5000 });
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
 * Monitor progress bar changes over time
 * @param {import('@playwright/test').Page} page
 * @param {number} duration - Duration to monitor in milliseconds
 * @param {number} interval - Sampling interval in milliseconds
 * @returns {Promise<Array<{time: number, progress: number}>>} Array of progress samples
 */
export async function monitorProgressBar(page, duration, interval = 100) {
  const samples = [];
  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    const currentTime = Date.now() - startTime;
    const progress = await getProgressBarPercentage(page);
    samples.push({ time: currentTime, progress });
    await page.waitForTimeout(interval);
  }

  return samples;
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
 * Check if button is disabled
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - Button selector
 * @returns {Promise<boolean>} Whether button is disabled
 */
export async function isButtonDisabled(page, selector) {
  const button = page.locator(selector);
  return await button.isDisabled();
}

/**
 * Check if button is enabled
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - Button selector
 * @returns {Promise<boolean>} Whether button is enabled
 */
export async function isButtonEnabled(page, selector) {
  const button = page.locator(selector);
  return await button.isEnabled();
}

/**
 * Wait for current item to change
 * @param {import('@playwright/test').Page} page
 * @param {string} previousItem - Previous item text to wait to change from
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForItemChange(page, previousItem, timeout = 5000) {
  await page.waitForFunction(
    (selector, previousText) => {
      const el = document.querySelector(selector);
      return el && el.textContent !== previousText;
    },
    "#current-item",
    previousItem,
    { timeout },
  );
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
    { timeout },
  );
}

/**
 * Wait for progress bar to become inactive
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForProgressBarInactive(page, timeout = 2000) {
  await page.waitForFunction(
    () => {
      const nextBtn = document.querySelector("#next-btn");
      return nextBtn && !nextBtn.classList.contains("progress-bar");
    },
    { timeout },
  );
}

/**
 * Check if game is in learning mode
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} Whether learning mode is active
 */
export async function isLearningMode(page) {
  const checkbox = page.locator("#learning-mode");
  return await checkbox.isChecked();
}

/**
 * Check if solution is visible (not showing dots)
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} Whether solution is visible
 */
export async function isSolutionVisible(page) {
  const solution = await getCurrentSolution(page);
  return solution !== "•••" && solution !== "---" && solution.trim().length > 0;
}

/**
 * Navigate to a specific page using the navigation menu
 * @param {import('@playwright/test').Page} page
 * @param {string} pageId - The page ID to navigate to
 */
export async function navigateToPageViaMenu(page, pageId) {
  // Click the menu button to open navigation
  await page.click('button[onclick="openMenu()"]');

  // Wait for menu to be visible
  await page.waitForSelector("#nav-menu.open", { timeout: 5000 });

  // Click on the appropriate menu item
  await page.click(`button[onclick*="${pageId}"]`);

  // Wait for the target page to be active
  await page.waitForSelector(`#${pageId}.active`, { timeout: 5000 });
}
