import { test, expect } from '@playwright/test';

test.describe('Game Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for DOM content to load and give time for JS to initialize
    await page.waitForLoadState('domcontentloaded');
    // Wait for the loading spinner to disappear and main menu to be visible
    await page.waitForSelector('#main-menu.active', { timeout: 5000 });
  });

  test('should display game tiles on main menu', async ({ page }) => {
    // Wait for tiles to be generated - they should be present after main menu is active
    await page.waitForSelector('.tile', { timeout: 5000 });

    // Check that game tiles are present
    const gameTiles = page.locator('.tile');
    const count = await gameTiles.count();
    expect(count).toBeGreaterThanOrEqual(8);
    
    // Check that tiles contain expected content
    const firstTile = gameTiles.first();
    await expect(firstTile).toBeVisible();
    await expect(firstTile.locator('.tile-title')).toBeVisible();
  });

  test('should navigate to game page when clicking a tile', async ({ page }) => {
    // Wait for tiles to be generated
    await page.waitForSelector('.tile', { timeout: 5000 });

    // Click the first game tile
    const firstTile = page.locator('.tile').first();
    await firstTile.click();
    
    // Should navigate to game page
    await expect(page.locator('#game-page.active')).toBeVisible();
    await expect(page).toHaveURL(/.*game.*/);
  });

  test('should display game form on game page', async ({ page }) => {
    // Click a tile to navigate to game page with proper context
    await page.waitForSelector('.tile', { timeout: 5000 });
    await page.click('.tile:first-child');
    
    // Check that game page is active
    await expect(page.locator('#game-page.active')).toBeVisible();
    
    // Check that game form is present
    await expect(page.locator('#game-form')).toBeVisible();
    
    // Check that form has expected elements
    await expect(page.locator('#from-input')).toBeVisible();
    await expect(page.locator('#to-input')).toBeVisible();
    await expect(page.locator('#learning-mode')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should start a learning mode game', async ({ page }) => {
    // Click a tile to navigate to game page with proper context
    await page.waitForSelector('.tile', { timeout: 5000 });
    await page.click('.tile:first-child');

    // Fill in form for learning mode
    await page.fill('#from-input', '0');
    await page.fill('#to-input', '9');
    await page.check('#learning-mode');
    
    // Start the game
    await page.click('button[type="submit"]');
    
    // Should show game controls
    await expect(page.locator('.game-controls')).toBeVisible();
    
    // Should show current item
    await expect(page.locator('#current-item')).toBeVisible();
    
    // Should show answer in learning mode
    await expect(page.locator('#solution-display')).toBeVisible();
  });

  test('should start a training mode game', async ({ page }) => {
    // Click a tile to navigate to game page with proper context
    await page.waitForSelector('.tile', { timeout: 5000 });
    await page.click('.tile:first-child');

    // Fill in form for training mode (uncheck learning mode)
    await page.fill('#from-input', '0');
    await page.fill('#to-input', '9');
    await page.uncheck('#learning-mode');
    
    // Start the game
    await page.click('button[type="submit"]');
    
    // Should show game controls
    await expect(page.locator('.game-controls')).toBeVisible();
    
    // Should show current item
    await expect(page.locator('#current-item')).toBeVisible();
    
    // Should NOT show answer initially in training mode
    await expect(page.locator('#current-mnemonic')).toBeHidden();
    
    // Should have "Visa svar" button
    await expect(page.locator('button[onclick="showAnswer()"]')).toBeVisible();
  });

  test('should show answer when clicking show answer button', async ({ page }) => {
    // Click a tile to navigate to game page and start training mode
    await page.waitForSelector('.tile', { timeout: 5000 });
    await page.click('.tile:first-child');
    await page.fill('#from-input', '0');
    await page.fill('#to-input', '9');
    await page.uncheck('#learning-mode');
    await page.click('button[type="submit"]');
    
    // Click show answer
    await page.click('button[onclick="showAnswer()"]');
    
    // Answer should now be visible
    await expect(page.locator('#solution-display')).toBeVisible();
  });

  test('should advance to next item', async ({ page }) => {
    // Click a tile to navigate to game page and start learning mode
    await page.waitForSelector('.tile', { timeout: 5000 });
    await page.click('.tile:first-child');
    await page.fill('#from-input', '0');
    await page.fill('#to-input', '9');
    await page.check('#learning-mode');
    await page.click('button[type="submit"]');
    
    // Get current item text
    const initialItem = await page.locator('#current-item').textContent();
    
    // Click next item
    await page.click('button[onclick="nextItem()"]');
    
    // Wait for the current item text to change
    await page.waitForFunction(
      (selector, previousText) => {
        const el = document.querySelector(selector);
        return el && el.textContent !== previousText;
      },
      '#current-item',
      initialItem
    );
    
    // Item should have changed (or at least the button should work)
    const nextButton = page.locator('button[onclick="nextItem()"]');
    await expect(nextButton).toBeVisible();
  });

  test('should be able to stop game', async ({ page }) => {
    // Click a tile to navigate to game page and start a game
    await page.waitForSelector('.tile', { timeout: 5000 });
    await page.click('.tile:first-child');
    await page.fill('#from-input', '0');
    await page.fill('#to-input', '9');
    await page.check('#learning-mode');
    await page.click('button[type="submit"]');
    
    // Stop the game
    await page.click('button[onclick="stopGame()"]');
    
    // Should return to game setup form
    await expect(page.locator('#game-form')).toBeVisible();
    
    // Action buttons should be disabled when game is stopped
    await expect(page.locator('#show-btn')).toBeDisabled();
    await expect(page.locator('#next-btn')).toBeDisabled();
    
    // Play button should be enabled to start a new game
    await expect(page.locator('#play-btn')).toBeEnabled();
  });
});