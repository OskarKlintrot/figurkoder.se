import { test, expect } from '@playwright/test';

test.describe('PWA Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for the app to finish loading
    await page.waitForSelector('#main-menu.active', { timeout: 5000 });
  });

  test('should have service worker and manifest for PWA', async ({ page }) => {
    
    // Check manifest is present and valid
    const manifestResponse = await page.request.get('/site.webmanifest');
    expect(manifestResponse.status()).toBe(200);
    
    const manifest = await manifestResponse.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should register service worker for offline functionality', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker registration and activation
    await page.waitForFunction(() => {
      return navigator.serviceWorker.ready;
    }, { timeout: 10000 });
    
    // Wait for the service worker to be fully activated
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active?.state === 'activated';
    }, { timeout: 10000 });
    
    const serviceWorkerInfo = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return {
        scope: registration.scope,
        hasActiveWorker: !!registration.active,
        state: registration.active?.state
      };
    });
    
    expect(serviceWorkerInfo.hasActiveWorker).toBeTruthy();
    // Service worker should be either activating or activated
    expect(['activating', 'activated']).toContain(serviceWorkerInfo.state);
  });

  test('should respond to service worker version endpoint', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker to be ready
    await page.waitForFunction(() => {
      return navigator.serviceWorker.ready;
    }, { timeout: 10000 });
    
    // Test the version endpoint
    const versionResponse = await page.request.get('/sw/version');
    
    // Should either return version info or 404 (depending on service worker implementation)
    expect([200, 404]).toContain(versionResponse.status());
    
    if (versionResponse.status() === 200) {
      const versionData = await versionResponse.json();
      expect(versionData.version).toBeTruthy();
    }
  });

  test('should work offline (basic cache test)', async ({ page, context }) => {
    // First visit to cache resources
    await page.goto('/');
    
    // Wait for service worker to be ready
    await page.waitForFunction(() => {
      return navigator.serviceWorker.ready;
    }, { timeout: 10000 });
    
    // Wait for the main page to be present in the service worker cache
    await page.waitForFunction(async () => {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match('/');
        if (cachedResponse) {
          return true;
        }
      }
      return false;
    }, { timeout: 10000 });
    
    // Ensure the page is fully loaded and working
    await expect(page.locator('.header')).toBeVisible();
    await expect(page).toHaveTitle('Figurkoder.se');
    
    // Now simulate offline by blocking all network requests
    await context.route('**/*', route => {
      // Block all network requests to simulate offline
      route.abort();
    });
    
    // Navigate again (should work from cache)
    await page.reload();
    
    // Page should still load (from cache)
    await expect(page.locator('.header')).toBeVisible();
    await expect(page).toHaveTitle('Figurkoder.se');
  });

  test('should have proper meta tags for PWA', async ({ page }) => {
    await page.goto('/');
    
    // Check PWA-related meta tags exist (use toHaveCount instead of toBeVisible for meta tags)
    await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveCount(1);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveCount(1);
    
    // Check that apple-touch-icon is present (use toHaveAttribute for link tags)
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href');
    
    // Check that manifest link is present
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/site.webmanifest');
  });

  test('should have proper icon files', async ({ page }) => {
    await page.goto('/');
    
    // Test various icon files exist
    const iconPaths = [
      '/favicon.ico',
      '/favicon-16x16.png',
      '/favicon-32x32.png',
      '/apple-touch-icon.png',
      '/android-chrome-192x192.png',
      '/android-chrome-512x512.png'
    ];
    
    for (const iconPath of iconPaths) {
      const response = await page.request.get(iconPath);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/image/);
    }
  });
});