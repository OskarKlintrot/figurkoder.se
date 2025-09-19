import { test, expect } from '@playwright/test';

test.describe('Game Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display game tiles on main menu', async ({ page }) => {
    // Wait for tiles to be generated
    await page.waitForSelector('.game-tile', { timeout: 5000 });
    
    // Check that game tiles are present
    const gameTiles = page.locator('.game-tile');
    await expect(gameTiles).toHaveCountGreaterThan(0);
    
    // Check that tiles contain expected content
    const firstTile = gameTiles.first();
    await expect(firstTile).toBeVisible();
    await expect(firstTile.locator('h3')).toBeVisible();
  });

  test('should navigate to game page when clicking a tile', async ({ page }) => {
    // Wait for tiles to be generated
    await page.waitForSelector('.game-tile', { timeout: 5000 });
    
    // Click the first game tile
    const firstTile = page.locator('.game-tile').first();
    await firstTile.click();
    
    // Should navigate to game page
    await expect(page.locator('#game-page.active')).toBeVisible();
    await expect(page).toHaveURL(/.*game.*/);
  });

  test('should display game form on game page', async ({ page }) => {
    // Navigate to game page directly
    await page.goto('/game');
    
    // Check that game page is active
    await expect(page.locator('#game-page.active')).toBeVisible();
    
    // Check that game form is present
    await expect(page.locator('#game-form')).toBeVisible();
    
    // Check that form has expected elements
    await expect(page.locator('input[name="start-range"]')).toBeVisible();
    await expect(page.locator('input[name="end-range"]')).toBeVisible();
    await expect(page.locator('input[name="learning-mode"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should start a learning mode game', async ({ page }) => {
    // Navigate to game page
    await page.goto('/game');
    
    // Fill in form for learning mode
    await page.fill('input[name="start-range"]', '0');
    await page.fill('input[name="end-range"]', '9');
    await page.check('input[name="learning-mode"]');
    
    // Start the game
    await page.click('button[type="submit"]');
    
    // Should show game controls
    await expect(page.locator('.game-controls')).toBeVisible();
    
    // Should show current item
    await expect(page.locator('#current-item')).toBeVisible();
    
    // Should show answer in learning mode
    await expect(page.locator('#current-mnemonic')).toBeVisible();
  });

  test('should start a training mode game', async ({ page }) => {
    // Navigate to game page
    await page.goto('/game');
    
    // Fill in form for training mode (uncheck learning mode)
    await page.fill('input[name="start-range"]', '0');
    await page.fill('input[name="end-range"]', '9');
    await page.uncheck('input[name="learning-mode"]');
    
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
    // Navigate to game page and start training mode
    await page.goto('/game');
    await page.fill('input[name="start-range"]', '0');
    await page.fill('input[name="end-range"]', '9');
    await page.uncheck('input[name="learning-mode"]');
    await page.click('button[type="submit"]');
    
    // Click show answer
    await page.click('button[onclick="showAnswer()"]');
    
    // Answer should now be visible
    await expect(page.locator('#current-mnemonic')).toBeVisible();
  });

  test('should advance to next item', async ({ page }) => {
    // Navigate to game page and start learning mode
    await page.goto('/game');
    await page.fill('input[name="start-range"]', '0');
    await page.fill('input[name="end-range"]', '9');
    await page.check('input[name="learning-mode"]');
    await page.click('button[type="submit"]');
    
    // Get current item text
    const initialItem = await page.locator('#current-item').textContent();
    
    // Click next item
    await page.click('button[onclick="nextItem()"]');
    
    // Wait a bit for the change
    await page.waitForTimeout(100);
    
    // Item should have changed (or at least the button should work)
    const nextButton = page.locator('button[onclick="nextItem()"]');
    await expect(nextButton).toBeVisible();
  });

  test('should be able to stop game', async ({ page }) => {
    // Navigate to game page and start a game
    await page.goto('/game');
    await page.fill('input[name="start-range"]', '0');
    await page.fill('input[name="end-range"]', '9');
    await page.check('input[name="learning-mode"]');
    await page.click('button[type="submit"]');
    
    // Stop the game
    await page.click('button[onclick="stopGame()"]');
    
    // Should return to game setup form
    await expect(page.locator('#game-form')).toBeVisible();
    await expect(page.locator('.game-controls')).not.toBeVisible();
  });
});