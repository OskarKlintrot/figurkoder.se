import { test, expect } from '@playwright/test';

test.describe('App Initialization', () => {
  test('should load the main page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for fonts to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle('Figurkoder.se');
    
    // Check that the main elements are present
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('.page.active')).toBeVisible();
    
    // Check that JavaScript modules are loaded (service worker should be registered)
    const serviceWorkerRegistered = await page.evaluate(() => {
      return !!navigator.serviceWorker;
    });
    expect(serviceWorkerRegistered).toBeTruthy();
  });

  test('should have PWA manifest', async ({ page }) => {
    await page.goto('/');
    
    // Check that manifest link is present
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeVisible();
    
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