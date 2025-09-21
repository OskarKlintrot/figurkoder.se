import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads and has basic structure', async ({ page }) => {
    // Register console error listener before navigation
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for the app to finish loading
    await page.waitForSelector('#main-menu.active', { timeout: 5000 });
    // Check basic page structure
    await expect(page).toHaveTitle('Figurkoder.se');
    await expect(page.locator('body')).toBeVisible();
    // Allow some console logs but no critical errors
    const criticalErrors = logs.filter(log => 
      log.includes('Uncaught') || 
      log.includes('ReferenceError') || 
      log.includes('SyntaxError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('service worker endpoint returns response', async ({ page }) => {
    await page.goto('/');
    
    // Try to access the service worker
    const swResponse = await page.request.get('/sw.js');
    expect(swResponse.status()).toBe(200);
    
    // Check content type
    expect(swResponse.headers()['content-type']).toContain('javascript');
  });

  test('manifest is accessible', async ({ page }) => {
    await page.goto('/');
    
    const manifestResponse = await page.request.get('/site.webmanifest');
    expect(manifestResponse.status()).toBe(200);
    
    const manifest = await manifestResponse.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('icons');
  });
});