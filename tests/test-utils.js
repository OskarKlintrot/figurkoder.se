/**
 * Test utilities for common operations across test files
 */

/**
 * Wait for the app to be fully initialized
 * This includes waiting for DOM content and essential JS modules to load
 */
export async function waitForAppInitialization(page, timeout = 8000) {
  // Wait for DOM content to load
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for essential elements to be present
  await page.locator('body').waitFor({ timeout });
  
  // Give a short time for JS modules to initialize
  await page.waitForTimeout(500);
}

/**
 * Wait for game tiles to be generated on the main menu
 */
export async function waitForGameTiles(page, timeout = 10000) {
  await page.waitForSelector('.game-tile', { timeout });
}

/**
 * Navigate to a specific page and wait for it to be active
 */
export async function navigateToPage(page, pageId, timeout = 5000) {
  await page.click(`a[onclick="navigateToPage('${pageId}')"]`);
  await page.locator(`#${pageId}.active`).waitFor({ timeout });
}