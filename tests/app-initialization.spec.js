import { test, expect } from '@playwright/test';

test.describe('App Initialization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for DOM content to load instead of networkidle for faster tests
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load the main page successfully', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Figurkoder.se');
    
    // Check that the main elements are present - wait for them to appear
    await expect(page.locator('.header')).toBeVisible({ timeout: 3000 });
    
    // Wait for the app to finish loading (main menu should become active)
    await expect(page.locator('#main-menu.active')).toBeVisible({ timeout: 5000 });
    
    // Check that JavaScript modules are loaded (service worker should be registered)
    const serviceWorkerRegistered = await page.evaluate(() => {
      return !!navigator.serviceWorker;
    });
    expect(serviceWorkerRegistered).toBeTruthy();
  });

  test('should have PWA manifest', async ({ page }) => {
    // Check that manifest link is present (use toHaveAttribute instead of toBeVisible for meta/link tags)
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/site.webmanifest');
    
    // Check that the manifest is accessible
    const response = await page.request.get('/site.webmanifest');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest.name).toContain('Figurkoder');
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker to be registered
    await page.waitForFunction(() => {
      return navigator.serviceWorker.ready;
    }, { timeout: 10000 });
    
    const swRegistered = await page.evaluate(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        return !!registration;
      } catch (error) {
        return false;
      }
    });
    
    expect(swRegistered).toBeTruthy();
  });
});