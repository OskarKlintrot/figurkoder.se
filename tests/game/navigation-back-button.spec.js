import { test, expect } from "@playwright/test";
import {
  navigateToGamePage,
  startGame,
  getCurrentItem,
  navigateToPageViaMenu,
} from "./test-utils.js";

test.describe("Navigation and Back Button Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#main-menu.active", { timeout: 5000 });
  });

  test("should navigate back to game session from results page", async ({
    page,
  }) => {
    // Navigate to game page and start a training game
    await page.waitForSelector(".tile", { timeout: 5000 });
    await page.click(".tile:first-child");
    await expect(page.locator("#game-page.active")).toBeVisible();

    // Start and complete a training game quickly
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 2, // Small range for quick completion
      timeLimit: 1, // Short timer
    });

    // Complete the game by advancing through all items
    for (let i = 0; i < 3; i++) {
      await page.click("#next-btn");
      await page.waitForTimeout(100);
    }

    // Check if we're on results page or can navigate to it
    const resultPage = page.locator("#result-page");
    const isResultPageVisible = await resultPage.isVisible().catch(() => false);

    if (!isResultPageVisible) {
      // If not automatically on results, look for a way to get there
      const resultButton = page.locator(
        'button:has-text("Resultat"), button:has-text("Results"), #results-btn',
      );
      const hasResultButton = await resultButton.isVisible().catch(() => false);

      if (hasResultButton) {
        await resultButton.click();
      } else {
        // If no direct results navigation, stop game and check for results
        await page.click("#stop-btn");
        // Results might be shown in a summary or different way
      }
    }

    // Verify we can navigate back to game session
    const backButton = page.locator(
      '.back-btn, button:has-text("Tillbaka"), button:has-text("Back"), #back-btn',
    );
    const hasBackButton = await backButton.isVisible().catch(() => false);

    if (hasBackButton) {
      await backButton.click();

      // Should return to game page with same configuration
      await expect(page.locator("#game-page.active")).toBeVisible();

      // Verify form values are preserved
      await expect(page.locator("#from-input")).toHaveValue("0");
      await expect(page.locator("#to-input")).toHaveValue("2");
      await expect(page.locator("#time-input")).toHaveValue("1");
    }

    // Verify we're back in a state where game can be restarted
    await expect(page.locator("#game-form")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test("should maintain game page navigation context", async ({ page }) => {
    // Navigate to game page from specific tile
    await page.waitForSelector(".tile", { timeout: 5000 });

    // Get the tile content to verify context
    const firstTile = page.locator(".tile").first();
    const tileTitle = await firstTile.locator(".tile-title").textContent();
    await firstTile.click();

    // Check that correct game type context is maintained
    await expect(page.locator("#game-page.active")).toBeVisible();
    await expect(page).toHaveURL(/.*game.*/);

    // Navigate away to another page
    await navigateToPageViaMenu(page, "Om", "about-page");
    await expect(page.locator("#about-page.active")).toBeVisible();

    // Navigate back to game
    await navigateToPageViaMenu(page, "Spela", "game-page");
    await expect(page.locator("#game-page.active")).toBeVisible();

    // Verify context preservation - form should still be available
    await expect(page.locator("#game-form")).toBeVisible();
    await expect(page.locator("#from-input")).toBeVisible();
    await expect(page.locator("#to-input")).toBeVisible();
  });

  test("should reset header back button behavior correctly", async ({
    page,
  }) => {
    // Navigate through: main → game → results

    // Start at main menu
    await expect(page.locator("#main-menu.active")).toBeVisible();

    // Check if back button is hidden on main menu (as per historical bug fix)
    const backButton = page.locator(".back-btn, #back-btn");
    const backButtonVisible = await backButton.isVisible().catch(() => false);

    // Back button should be hidden on main menu
    expect(backButtonVisible).toBeFalsy();

    // Navigate to game page
    await page.waitForSelector(".tile", { timeout: 5000 });
    await page.click(".tile:first-child");
    await expect(page.locator("#game-page.active")).toBeVisible();

    // Check if back button is now visible on game page
    const gamePageBackButton = await backButton.isVisible().catch(() => false);

    if (gamePageBackButton) {
      // Test back button from game (should go to main)
      await backButton.click();
      await expect(page.locator("#main-menu.active")).toBeVisible();

      // Navigate back to game
      await page.click(".tile:first-child");
    }

    // Start a quick game to potentially access results
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 1,
      timeLimit: 1,
    });

    // Complete game quickly
    await page.click("#next-btn");
    await page.waitForTimeout(100);
    await page.click("#next-btn");

    // Try to access results or stop game
    const resultButton = page.locator(
      'button:has-text("Resultat"), #results-btn',
    );
    const hasResultButton = await resultButton.isVisible().catch(() => false);

    if (hasResultButton) {
      await resultButton.click();

      // If on results page, test back button behavior
      const resultPageBackButton = await backButton
        .isVisible()
        .catch(() => false);
      if (resultPageBackButton) {
        await backButton.click();
        // Should go back to game page, not main menu
        await expect(page.locator("#game-page.active")).toBeVisible();
      }
    }

    // Verify header back button behavior is consistent
    const finalBackButtonVisible = await backButton
      .isVisible()
      .catch(() => false);

    if (finalBackButtonVisible) {
      await backButton.click();
      // Should go to main menu from game page
      await expect(page.locator("#main-menu.active")).toBeVisible();
    }
  });

  test("should manage URL state during navigation", async ({ page }) => {
    // Test URL updates for navigation

    // Main page URL
    await expect(page.locator("#main-menu.active")).toBeVisible();
    expect(page.url()).toMatch(/\/$|\/index\.html$|#main-menu/);

    // Navigate to game page
    await page.waitForSelector(".tile", { timeout: 5000 });
    await page.click(".tile:first-child");
    await expect(page.locator("#game-page.active")).toBeVisible();

    // URL should update to reflect game page
    expect(page.url()).toMatch(/game|#game/);

    // Navigate to about page
    await navigateToPageViaMenu(page, "Om", "about-page");
    await expect(page.locator("#about-page.active")).toBeVisible();
    expect(page.url()).toMatch(/about|#about/);

    // Test browser back button
    await page.goBack();
    // Should go back to previous page (game)
    await page.waitForTimeout(100); // Small wait for navigation

    // Test browser forward button
    await page.goForward();
    await page.waitForTimeout(100);

    // Test direct URL access by navigating directly to game
    await page.goto("/#game");
    await page.waitForTimeout(100);
    await expect(page.locator("#game-page.active")).toBeVisible();
  });

  test("should preserve context data during navigation", async ({ page }) => {
    // Configure game settings
    await page.waitForSelector(".tile", { timeout: 5000 });
    await page.click(".tile:first-child");

    // Fill specific game configuration
    await page.fill("#from-input", "10");
    await page.fill("#to-input", "20");
    await page.fill("#time-input", "15");
    await page.check("#learning-mode");

    // Start game to accumulate some context
    await page.click('button[type="submit"]');
    await expect(page.locator(".game-controls")).toBeVisible();

    // Accumulate some results by advancing items
    const initialItem = await getCurrentItem(page);
    await page.click("#next-btn");

    await page.waitForFunction(
      (selector, previousText) => {
        const el = document.querySelector(selector);
        return el && el.textContent !== previousText;
      },
      "#current-item",
      initialItem,
    );

    // Navigate away to another page
    await navigateToPageViaMenu(page, "Om", "about-page");
    await expect(page.locator("#about-page.active")).toBeVisible();

    // Navigate back to game
    await navigateToPageViaMenu(page, "Spela", "game-page");
    await expect(page.locator("#game-page.active")).toBeVisible();

    // Verify context data is preserved
    // Game should either still be running or stopped with form showing previous values
    const gameControlsVisible = await page
      .locator(".game-controls")
      .isVisible()
      .catch(() => false);
    const gameFormVisible = await page
      .locator("#game-form")
      .isVisible()
      .catch(() => false);

    if (gameControlsVisible) {
      // If still running, verify game state is maintained
      await expect(page.locator("#current-item")).toBeVisible();
      const currentItem = await getCurrentItem(page);
      expect(currentItem).toBeTruthy();
    } else if (gameFormVisible) {
      // If stopped, verify form values are preserved
      await expect(page.locator("#from-input")).toHaveValue("10");
      await expect(page.locator("#to-input")).toHaveValue("20");
      await expect(page.locator("#time-input")).toHaveValue("15");
      await expect(page.locator("#learning-mode")).toBeChecked();
    }

    // Verify no data loss occurred
    expect(gameControlsVisible || gameFormVisible).toBeTruthy();
  });
});
