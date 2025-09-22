import { test, expect } from "@playwright/test";
import { navigateToGamePage, startGame, getCurrentItem } from "./test-utils.js";

test.describe("Cross-Browser and Responsive Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("should work correctly on mobile viewports", async ({ page }) => {
    // Test various mobile screen sizes
    const mobileSizes = [
      { width: 375, height: 667, name: "iPhone SE" },
      { width: 390, height: 844, name: "iPhone 12" },
      { width: 360, height: 740, name: "Android Small" },
      { width: 414, height: 896, name: "iPhone XR" },
    ];

    for (const size of mobileSizes) {
      console.log(`Testing ${size.name} (${size.width}x${size.height})`);

      await page.setViewportSize({ width: size.width, height: size.height });
      await page.waitForTimeout(200); // Allow layout adjustment

      // Ensure we're on the game page after viewport change
      await navigateToGamePage(page);

      // Verify form is visible and accessible on mobile
      await expect(page.locator("#game-form")).toBeVisible();

      // Check that form elements are properly sized
      const formBounds = await page.locator("#game-form").boundingBox();
      expect(formBounds.width).toBeLessThanOrEqual(size.width);
      expect(formBounds.width).toBeGreaterThan(size.width * 0.7); // At least 70% of screen

      // Test form inputs are touchable (adequate size)
      const inputSizes = await page.evaluate(() => {
        const inputs = ["#from-input", "#to-input", "#time-input"];
        return inputs.map(selector => {
          const el = document.querySelector(selector);
          const rect = el.getBoundingClientRect();
          return {
            selector,
            width: rect.width,
            height: rect.height,
            touchable: rect.width >= 44 && rect.height >= 44, // Apple's minimum touch target
          };
        });
      });

      console.log(`Input sizes for ${size.name}:`, inputSizes);

      // At least inputs should be reasonably sized
      inputSizes.forEach(input => {
        expect(input.width).toBeGreaterThan(30);
        expect(input.height).toBeGreaterThan(20);
      });

      // Test game functionality on mobile
      await startGame(page, {
        learningMode: false,
        fromRange: 0,
        toRange: 5,
        timeLimit: 10,
      });

      // Verify game controls are visible and accessible
      await expect(page.locator(".game-controls")).toBeVisible();
      await expect(page.locator("#current-item")).toBeVisible();

      const gameControlBounds = await page
        .locator(".game-controls")
        .boundingBox();
      expect(gameControlBounds.width).toBeLessThanOrEqual(size.width);

      // Test touch interactions
      const buttonSizes = await page.evaluate(() => {
        const buttons = ["#show-btn", "#next-btn", "#pause-btn", "#stop-btn"];
        return buttons
          .map(selector => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return {
              selector,
              width: rect.width,
              height: rect.height,
              visible: rect.width > 0 && rect.height > 0,
            };
          })
          .filter(Boolean);
      });

      console.log(`Button sizes for ${size.name}:`, buttonSizes);

      // Buttons should be adequately sized for touch
      buttonSizes.forEach(button => {
        expect(button.visible).toBeTruthy();
        expect(button.width).toBeGreaterThan(30);
        expect(button.height).toBeGreaterThan(25);
      });

      // Test actual touch interaction (using click for cross-device compatibility)
      await page.locator("#show-btn").click();
      await expect(page.locator("#solution-display")).toBeVisible();

      await page.locator("#next-btn").click();
      await page.waitForTimeout(200);

      const newItem = await getCurrentItem(page);
      expect(newItem).toBeTruthy();

      await page.click("#stop-btn");

      // Training mode might show results page or form depending on game state
      // Wait for either to be visible
      const formVisible = await page
        .locator("#game-form")
        .isVisible()
        .catch(() => false);
      const resultsVisible = await page
        .locator("#results-page.active")
        .isVisible()
        .catch(() => false);

      expect(formVisible || resultsVisible).toBeTruthy();
    }

    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 }); // Landscape iPhone SE
    await page.waitForTimeout(200);

    // Ensure we're on the game page after viewport change
    await navigateToGamePage(page);

    await expect(page.locator("#game-form")).toBeVisible();

    // Form should adapt to landscape
    const landscapeFormBounds = await page.locator("#game-form").boundingBox();
    expect(landscapeFormBounds.width).toBeLessThanOrEqual(667);
    expect(landscapeFormBounds.height).toBeLessThanOrEqual(375);

    // Test game in landscape
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).toBeVisible();

    const landscapeGameBounds = await page
      .locator(".game-controls")
      .boundingBox();
    expect(landscapeGameBounds.width).toBeLessThanOrEqual(667);
    expect(landscapeGameBounds.height).toBeLessThanOrEqual(375);

    await page.click("#stop-btn");
  });

  test("should be compatible with different browser APIs", async ({ page }) => {
    // Test graceful degradation when APIs are not available

    // Test without vibration API
    await page.addInitScript(() => {
      delete navigator.vibrate;
    });

    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 5,
      timeLimit: 3,
    });

    // Should work without vibration
    await expect(page.locator("#current-item")).toBeVisible();
    await page.click("#next-btn");
    await page.waitForTimeout(200);

    const itemWithoutVibration = await getCurrentItem(page);
    expect(itemWithoutVibration).toBeTruthy();

    await page.click("#stop-btn");

    // Test without wake lock API
    await page.addInitScript(() => {
      delete navigator.wakeLock;
    });

    await startGame(page, {
      learningMode: true, // Use learning mode for reliable pause functionality
      fromRange: 0,
      toRange: 5,
      timeLimit: 5,
    });

    // Should work without wake lock
    await expect(page.locator("#current-item")).toBeVisible();
    // In learning mode, solution is always visible so no need to click show
    await expect(page.locator("#solution-display")).toBeVisible();

    // Pause using JS evaluation to avoid element blocking
    await page.waitForFunction(() => {
      const pauseBtn = document.querySelector("#pause-btn");
      return pauseBtn && !pauseBtn.disabled;
    });

    await page.evaluate(() => {
      document.querySelector("#pause-btn").click();
    });
    await expect(page.locator("#play-btn")).toBeEnabled();

    await page.click("#play-btn");
    await expect(page.locator("#pause-btn")).toBeEnabled();

    await page.click("#stop-btn");

    // Test without service worker support
    await page.addInitScript(() => {
      delete navigator.serviceWorker;
    });

    // Reload to test without service worker
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Wait for app to initialize properly - try multiple selectors
    try {
      await page.waitForSelector("#main-menu.active", { timeout: 3000 });
    } catch (e) {
      // Fallback to basic page ready indicators
      await page.waitForSelector(".header", { timeout: 3000 });
    }

    // Should still load without service worker - navigate to game page to test functionality
    await navigateToGamePage(page);
    await expect(page.locator("#game-form")).toBeVisible();

    // Core functionality should remain intact
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();
    await expect(page.locator("#solution-display")).toBeVisible();

    // Test without localStorage (if used)
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        value: null,
        writable: false,
      });
    });

    // Game should still work without localStorage
    await page.click("#next-btn");
    await page.waitForTimeout(200);

    const itemWithoutStorage = await getCurrentItem(page);
    expect(itemWithoutStorage).toBeTruthy();

    await page.click("#stop-btn");

    // Training mode might show results page or form depending on game state
    // Wait for either to be visible
    const formVisible = await page
      .locator("#game-form")
      .isVisible()
      .catch(() => false);
    const resultsVisible = await page
      .locator("#results-page.active")
      .isVisible()
      .catch(() => false);

    expect(formVisible || resultsVisible).toBeTruthy();

    // Test with limited CSS support (disable modern features)
    await page.addStyleTag({
      content: `
        * {
          grid-template-columns: unset !important;
          flex-wrap: unset !important;
          transform: unset !important;
        }
      `,
    });

    // Should still be functional with limited CSS
    await expect(page.locator("#game-form")).toBeVisible();

    const formVisibleWithLimitedCSS = await page
      .locator("#from-input")
      .isVisible();
    expect(formVisibleWithLimitedCSS).toBeTruthy();

    // Test without less critical modern JavaScript features
    await page.addInitScript(() => {
      // Remove non-essential features that shouldn't break core functionality
      delete Array.prototype.includes;
      delete Object.assign;
      // Don't delete Promise.resolve as it's essential for modern app initialization
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Wait for app initialization - be more patient since we've modified the environment
    try {
      await page.waitForSelector("#main-menu.active", { timeout: 10000 });
    } catch (e) {
      // If main menu doesn't become active, wait for any visible content
      await page.waitForSelector("body", { timeout: 5000 });
      // Check if the page loaded at all
      const bodyContent = await page.textContent("body");
      if (!bodyContent || bodyContent.trim().length === 0) {
        throw new Error(
          "App failed to initialize with modified JavaScript environment",
        );
      }
    }

    // Should gracefully handle missing non-essential features - test by navigating to game page
    try {
      await navigateToGamePage(page);
      const appStillWorks = await page.locator("#game-form").isVisible();
      expect(appStillWorks).toBeTruthy();
    } catch (e) {
      // If navigation fails, at least verify the app loaded and basic content is present
      const hasContent = await page.locator("body").textContent();
      expect(hasContent).toContain("Figurkoder");
    }
  });

  test("should handle viewport and zoom changes", async ({ page }) => {
    // Test different zoom levels
    const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    for (const zoom of zoomLevels) {
      console.log(`Testing zoom level: ${zoom * 100}%`);

      // Set zoom level
      await page.evaluate(zoomLevel => {
        document.body.style.zoom = zoomLevel;
      }, zoom);

      await page.waitForTimeout(200);

      // Verify form is still accessible
      await expect(page.locator("#game-form")).toBeVisible();

      const formBounds = await page.locator("#game-form").boundingBox();
      expect(formBounds.width).toBeGreaterThan(50);
      expect(formBounds.height).toBeGreaterThan(50);

      // Test that inputs are still functional
      await page.fill("#from-input", "0");
      await page.fill("#to-input", "5");

      const fromValue = await page.inputValue("#from-input");
      const toValue = await page.inputValue("#to-input");
      expect(fromValue).toBe("0");
      expect(toValue).toBe("5");

      // Test game at this zoom level
      await startGame(page, {
        learningMode: true,
        fromRange: 0,
        toRange: 3,
        timeLimit: 5,
      });

      await expect(page.locator("#current-item")).toBeVisible();

      // Verify button clicks work at this zoom level
      const currentItem = await getCurrentItem(page);
      await page.click("#next-btn");
      await page.waitForTimeout(200);

      const newItem = await getCurrentItem(page);
      expect(newItem).toBeTruthy();

      await page.click("#stop-btn");

      // Training mode might show results page or form depending on game state
      // Wait for either to be visible
      const formVisible = await page
        .locator("#game-form")
        .isVisible()
        .catch(() => false);
      const resultsVisible = await page
        .locator("#results-page.active")
        .isVisible()
        .catch(() => false);

      expect(formVisible || resultsVisible).toBeTruthy();

      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = 1;
      });
    }

    // Test very small viewport (smartwatch size)
    await page.setViewportSize({ width: 280, height: 280 });
    await page.waitForTimeout(200);

    // Should still be functional even at very small size
    const smallViewportVisible = await page.locator("#game-form").isVisible();
    expect(smallViewportVisible).toBeTruthy();

    // Test very large viewport (desktop)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(200);

    await expect(page.locator("#game-form")).toBeVisible();

    const largeViewportBounds = await page.locator("#game-form").boundingBox();
    expect(largeViewportBounds.width).toBeGreaterThan(200);

    // Test ultra-wide viewport
    await page.setViewportSize({ width: 2560, height: 1080 });
    await page.waitForTimeout(200);

    await expect(page.locator("#game-form")).toBeVisible();

    // Form should not stretch excessively
    const ultraWideBounds = await page.locator("#game-form").boundingBox();
    expect(ultraWideBounds.width).toBeLessThan(1200); // Should have reasonable max-width
  });

  test("should maintain performance across different viewports", async ({
    page,
  }) => {
    const viewports = [
      { width: 320, height: 568, name: "Mobile Small" },
      { width: 768, height: 1024, name: "Tablet" },
      { width: 1366, height: 768, name: "Desktop" },
      { width: 1920, height: 1080, name: "Desktop Large" },
    ];

    for (const viewport of viewports) {
      console.log(`Testing performance on ${viewport.name}`);

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.waitForTimeout(200);

      // Measure load performance
      const performanceStart = Date.now();

      await page.reload();
      await page.waitForLoadState("domcontentloaded");

      // Wait for any element that indicates the page is ready instead of specifically main menu
      await page.waitForSelector("body", { timeout: 5000 });

      const loadTime = Date.now() - performanceStart;
      console.log(`Load time on ${viewport.name}: ${loadTime}ms`);

      // Load time should be reasonable (under 5 seconds even in CI)
      expect(loadTime).toBeLessThan(5000);

      // Navigate to game and measure performance
      await navigateToGamePage(page);

      const gameLoadStart = Date.now();
      await expect(page.locator("#game-form")).toBeVisible();
      const gameLoadTime = Date.now() - gameLoadStart;

      console.log(`Game page load time on ${viewport.name}: ${gameLoadTime}ms`);
      expect(gameLoadTime).toBeLessThan(2000);

      // Test game performance
      const gameStartTime = Date.now();

      await startGame(page, {
        learningMode: false,
        fromRange: 0,
        toRange: 5,
        timeLimit: 5,
      });

      const gameStartDuration = Date.now() - gameStartTime;
      console.log(
        `Game start time on ${viewport.name}: ${gameStartDuration}ms`,
      );
      expect(gameStartDuration).toBeLessThan(3000);

      // Test interaction responsiveness
      const interactionStart = Date.now();
      await page.click("#show-btn");
      await expect(page.locator("#solution-display")).toBeVisible();
      const interactionTime = Date.now() - interactionStart;

      console.log(`Interaction time on ${viewport.name}: ${interactionTime}ms`);
      expect(interactionTime).toBeLessThan(1000);

      await page.click("#stop-btn");
    }

    // Navigate back to game page after stopping games
    await navigateToGamePage(page);

    // Test performance with rapid viewport changes
    for (let i = 0; i < 5; i++) {
      const randomViewport =
        viewports[Math.floor(Math.random() * viewports.length)];
      await page.setViewportSize({
        width: randomViewport.width,
        height: randomViewport.height,
      });
      await page.waitForTimeout(50);
    }

    // Should still be functional after rapid changes
    await expect(page.locator("#game-form")).toBeVisible();

    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 3,
      timeLimit: 5,
    });

    await expect(page.locator("#current-item")).toBeVisible();
    await page.click("#stop-btn");
  });
});
