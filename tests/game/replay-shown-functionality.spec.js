import { test, expect } from "@playwright/test";
import {
  navigateToGamePage,
  startGame,
  getCurrentItem,
  getCurrentSolution,
  stopGame,
  isSolutionVisible,
} from "./test-utils.js";

test.describe("Replay Shown Functionality Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("should replay only items that had their answer shown", async ({
    page,
  }) => {
    // Start a training game with a small range for controlled testing
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 5, // Small range to make testing predictable
      timeLimit: 10, // Long enough to control showing answers
    });

    // Track which items we show answers for
    const shownItems = [];
    const allItems = [];

    // Go through several items, showing answers for some but not others
    for (let i = 0; i < 4; i++) {
      const currentItem = await getCurrentItem(page);
      allItems.push(currentItem);

      if (i === 0 || i === 2) {
        // Show answer for items 0 and 2
        await page.click("#show-btn");

        // Wait for solution to be visible and verify it's properly shown
        await page.waitForFunction(
          () => {
            const solutionEl = document.querySelector("#solution-display");
            return (
              solutionEl &&
              solutionEl.textContent !== "•••" &&
              solutionEl.textContent !== "--"
            );
          },
          { timeout: 3000 },
        );

        const isVisible = await isSolutionVisible(page);
        expect(isVisible).toBeTruthy();

        shownItems.push(currentItem);
      }

      // Move to next item
      await page.click("#next-btn");

      // Wait for the item to change or game to end (unless this is the last iteration)
      if (i < 3) {
        await page.waitForFunction(
          previousItem => {
            const currentEl = document.querySelector("#current-item");
            const resultsPage = document.querySelector("#results-page.active");
            return (
              (currentEl && currentEl.textContent !== previousItem) ||
              resultsPage
            );
          },
          currentItem,
          { timeout: 3000 },
        );
      }
    }

    // Check if game ended automatically or if we need to stop it
    const resultsPageVisible = await page
      .locator("#results-page.active")
      .isVisible()
      .catch(() => false);

    if (!resultsPageVisible) {
      // Stop the game to get to results
      await stopGame(page);
    }

    expect(shownItems.length).toBe(2); // We showed answers for 2 items
    expect(allItems.length).toBe(4); // We went through 4 items total

    // Wait for results page to be active
    await page.waitForSelector("#results-page.active", { timeout: 5000 });

    // Find and verify the "Repetera visade" button
    const replayShownBtn = page.locator("#replay-shown-btn");
    await expect(replayShownBtn).toBeVisible();

    // Verify the button text shows the correct count
    const replayShownText = await page
      .locator("#replay-shown-text")
      .textContent();
    expect(replayShownText).toContain("Repetera visade (2)");

    // Verify button is enabled (since we have shown items)
    await expect(replayShownBtn).toBeEnabled();

    // Click the "Repetera visade" button
    await replayShownBtn.click();

    // Should navigate back to game page
    await page.waitForSelector("#game-page.active", { timeout: 5000 });

    // Verify we're in learning mode (should be auto-enabled for shown replay)
    const learningModeCheckbox = page.locator("#learning-mode");
    await expect(learningModeCheckbox).toBeChecked();

    // Start the replay game
    await page.click("#play-btn");

    // Verify that only the shown items are replayed
    const replayedItems = [];

    // Go through the replay and collect all items
    for (let i = 0; i < 3; i++) {
      // Try to get more items than we should have
      try {
        const currentItem = await getCurrentItem(page);

        if (
          currentItem &&
          currentItem !== "--" &&
          !replayedItems.includes(currentItem)
        ) {
          replayedItems.push(currentItem);
        }

        // Try to advance to next item
        const nextBtn = page.locator("#next-btn");
        const isEnabled = await nextBtn.isEnabled().catch(() => false);

        if (isEnabled) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        } else {
          // No more items or game ended
          break;
        }
      } catch (error) {
        // Game might have ended or no more items
        break;
      }
    }

    // Verify that only the items we showed answers for are replayed
    expect(replayedItems.length).toBe(shownItems.length);

    // Verify that all replayed items are from the shown items
    for (const replayedItem of replayedItems) {
      expect(shownItems).toContain(replayedItem);
    }
  });

  test("should disable 'Repetera visade' button when no answers were shown", async ({
    page,
  }) => {
    // Start a training game
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 3,
      timeLimit: 10,
    });

    // Go through items WITHOUT showing any answers
    for (let i = 0; i < 3; i++) {
      // Don't click show answer, just advance
      await page.click("#next-btn");

      if (i < 2) {
        await page.waitForFunction(
          () => {
            const resultsPage = document.querySelector("#results-page.active");
            const currentEl = document.querySelector("#current-item");
            return resultsPage || currentEl;
          },
          { timeout: 3000 },
        );
      }
    }

    // Check if game ended automatically or if we need to stop it
    const resultsPageVisible = await page
      .locator("#results-page.active")
      .isVisible()
      .catch(() => false);

    if (!resultsPageVisible) {
      // Stop the game
      await stopGame(page);
    }

    // Wait for results page
    await page.waitForSelector("#results-page.active", { timeout: 5000 });

    // Find the "Repetera visade" button
    const replayShownBtn = page.locator("#replay-shown-btn");
    await expect(replayShownBtn).toBeVisible();

    // Verify the button text shows count of 0
    const replayShownText = await page
      .locator("#replay-shown-text")
      .textContent();
    expect(replayShownText).toContain("Repetera visade (0)");

    // Verify button is disabled (since no answers were shown)
    await expect(replayShownBtn).toBeDisabled();
  });

  test("should work correctly when all answers are shown", async ({ page }) => {
    // Start a training game with very small range
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 2, // Only 3 items
      timeLimit: 10,
    });

    const allItems = [];

    // Show answers for ALL items
    for (let i = 0; i < 3; i++) {
      const currentItem = await getCurrentItem(page);
      allItems.push(currentItem);

      // Show answer for every item
      await page.click("#show-btn");

      // Wait and verify solution is visible
      await page.waitForFunction(
        () => {
          const solutionEl = document.querySelector("#solution-display");
          return (
            solutionEl &&
            solutionEl.textContent !== "•••" &&
            solutionEl.textContent !== "--"
          );
        },
        { timeout: 3000 },
      );

      // Verify solution is properly visible
      const isVisible = await isSolutionVisible(page);
      expect(isVisible).toBeTruthy();

      // Move to next item
      await page.click("#next-btn");

      // Wait for either the next item or results page
      if (i < 2) {
        await page.waitForFunction(
          previousItem => {
            const currentEl = document.querySelector("#current-item");
            const resultsPage = document.querySelector("#results-page.active");
            return (
              (currentEl && currentEl.textContent !== previousItem) ||
              resultsPage
            );
          },
          currentItem,
          { timeout: 3000 },
        );
      }
    }

    // Wait for results page to be active (game should auto-complete)
    await page.waitForSelector("#results-page.active", { timeout: 5000 });

    // Verify "Repetera visade" button shows correct count
    const replayShownText = await page
      .locator("#replay-shown-text")
      .textContent();
    expect(replayShownText).toContain("Repetera visade (3)");

    // Verify button is enabled
    await expect(page.locator("#replay-shown-btn")).toBeEnabled();

    // Click replay shown button
    await page.click("#replay-shown-btn");

    // Should navigate to game page
    await page.waitForSelector("#game-page.active", { timeout: 5000 });

    // Verify learning mode is enabled
    await expect(page.locator("#learning-mode")).toBeChecked();

    // Start replay
    await page.click("#play-btn");

    // Verify all original items are available for replay
    const replayedItems = [];
    for (let i = 0; i < 4; i++) {
      // Try to get one more than expected
      try {
        const currentItem = await getCurrentItem(page);
        if (
          currentItem &&
          currentItem !== "--" &&
          !replayedItems.includes(currentItem)
        ) {
          replayedItems.push(currentItem);
        }

        const nextBtn = page.locator("#next-btn");
        const isEnabled = await nextBtn.isEnabled().catch(() => false);

        if (isEnabled) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        } else {
          break;
        }
      } catch (error) {
        break;
      }
    }

    // Should have all 3 items since we showed answers for all
    expect(replayedItems.length).toBe(3);

    // All replayed items should be from the original set
    for (const replayedItem of replayedItems) {
      expect(allItems).toContain(replayedItem);
    }
  });
});
