import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to about page', async ({ page }) => {
    // Click the menu button to open navigation
    await page.click('button[onclick="openMenu()"]');
    
    // Wait for menu to be visible
    await expect(page.locator('#nav-menu.open')).toBeVisible();
    
    // Click on "Om appen" link
    await page.click('a[onclick="navigateToPage(\'about-page\')"]');
    
    // Check that about page is active
    await expect(page.locator('#about-page.active')).toBeVisible();
    
    // Check URL has changed (could be hash-based or path-based)
    await expect(page).toHaveURL(/.*about.*/);
  });

  test('should navigate to FAQ page', async ({ page }) => {
    // Click the menu button to open navigation  
    await page.click('button[onclick="openMenu()"]');
    
    // Wait for menu to be visible
    await expect(page.locator('#nav-menu.open')).toBeVisible();
    
    // Click on "Frågor och svar" link
    await page.click('a[onclick="navigateToPage(\'faq-page\')"]');
    
    // Check that FAQ page is active
    await expect(page.locator('#faq-page.active')).toBeVisible();
    
    // Check URL has changed
    await expect(page).toHaveURL(/.*faq.*/);
  });

  test('should navigate to contact page', async ({ page }) => {
    // Click the menu button to open navigation
    await page.click('button[onclick="openMenu()"]');
    
    // Wait for menu to be visible
    await expect(page.locator('#nav-menu.open')).toBeVisible();
    
    // Click on "Kontakt" link
    await page.click('a[onclick="navigateToPage(\'contact-page\')"]');
    
    // Check that contact page is active
    await expect(page.locator('#contact-page.active')).toBeVisible();
    
    // Check URL has changed
    await expect(page).toHaveURL(/.*contact.*/);
  });

  test('should close menu when clicking overlay', async ({ page }) => {
    // Open menu
    await page.click('button[onclick="openMenu()"]');
    await expect(page.locator('#nav-menu.open')).toBeVisible();
    
    // Click on overlay to close
    await page.click('.nav-overlay.open');
    
    // Menu should be closed
    await expect(page.locator('#nav-menu.open')).not.toBeVisible();
  });

  test('should navigate back to main menu from other pages', async ({ page }) => {
    // Navigate to about page first
    await page.click('button[onclick="openMenu()"]');
    await page.click('a[onclick="navigateToPage(\'about-page\')"]');
    await expect(page.locator('#about-page.active')).toBeVisible();
    
    // Click main menu button
    await page.click('button[onclick="openMenu()"]');
    await page.click('a[onclick="navigateToPage(\'main-menu\')"]');
    
    // Should be back at main menu
    await expect(page.locator('#main-menu.active')).toBeVisible();
    await expect(page).toHaveURL(/.*\/$|.*\#$/);
  });
});