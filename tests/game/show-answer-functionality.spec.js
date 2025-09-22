import { test, expect } from "@playwright/test";
import {
  navigateToGamePage,
  startGame,
  getCurrentItem,
  assertButtonStates,
  isSolutionVisible,
} from "./test-utils.js";

test.describe("Show Answer (VISA) Functionality Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("TC-3.1: Answer Reveal in Training Mode", async ({ page }) => {
    // Start training mode game
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Verify answer is hidden initially (shows "•••" or is not visible)
    const solutionVisible = await isSolutionVisible(page);
    expect(solutionVisible).toBeFalsy();

    // Verify VISA button is enabled
    await expect(page.locator("#show-btn")).toBeEnabled();

    // Click "VISA" button
    await page.click("#show-btn");

    // Verify correct answer is displayed
    await expect(page.locator("#solution-display")).toBeVisible();

    // Verify the solution display contains actual content (not placeholder)
    const solutionText = await page.locator("#solution-display").textContent();
    expect(solutionText).toBeTruthy();
    expect(solutionText.trim()).not.toBe("");
    expect(solutionText.trim()).not.toBe("•••");

    // Verify button becomes disabled after showing answer
    await expect(page.locator("#show-btn")).toBeDisabled();
  });

  test("TC-3.2: Answer Visibility State Tracking", async ({ page }) => {
    // Start training mode
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Click "VISA" on first item
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).toBeVisible();

    // Verify button is disabled after showing answer
    await expect(page.locator("#show-btn")).toBeDisabled();

    // Advance to next item
    const initialItem = await getCurrentItem(page);
    await page.click("#next-btn");

    // Wait for item to change
    await page.waitForFunction(
      (selector, previousText) => {
        const el = document.querySelector(selector);
        return el && el.textContent !== previousText;
      },
      "#current-item",
      initialItem,
    );

    // Verify answer is hidden again on new item
    const solutionVisible = await isSolutionVisible(page);
    expect(solutionVisible).toBeFalsy();

    // Verify VISA button is re-enabled for new item
    await expect(page.locator("#show-btn")).toBeEnabled();
  });

  test("TC-3.3: VISA Button State Management", async ({ page }) => {
    // Start training mode
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Verify "VISA" button is enabled initially
    await expect(page.locator("#show-btn")).toBeEnabled();

    // Click "VISA" button
    await page.click("#show-btn");

    // Verify "VISA" button becomes disabled
    await expect(page.locator("#show-btn")).toBeDisabled();
    await expect(page.locator("#solution-display")).toBeVisible();

    // Advance to next item
    const initialItem = await getCurrentItem(page);
    await page.click("#next-btn");

    // Wait for item to change
    await page.waitForFunction(
      (selector, previousText) => {
        const el = document.querySelector(selector);
        return el && el.textContent !== previousText;
      },
      "#current-item",
      initialItem,
    );

    // Verify "VISA" button is re-enabled for new item
    await expect(page.locator("#show-btn")).toBeEnabled();

    // Verify answer is hidden for new item
    const solutionVisible = await isSolutionVisible(page);
    expect(solutionVisible).toBeFalsy();
  });

  test("TC-3.4: Answer Persistence on Mode Change", async ({ page }) => {
    // Start training mode
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Click "VISA" to show answer
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).toBeVisible();

    // Switch to learning mode
    await page.check("#learning-mode");

    // Verify answer remains visible
    await expect(page.locator("#solution-display")).toBeVisible();

    // In learning mode, show button should be disabled (answer always shown)
    await expect(page.locator("#show-btn")).toBeDisabled();

    // Switch back to training mode
    await page.uncheck("#learning-mode");

    // Verify answer visibility state - in training mode after showing answer,
    // it should remain visible until next item
    await expect(page.locator("#solution-display")).toBeVisible();
    await expect(page.locator("#show-btn")).toBeDisabled();

    // Advance to next item to test fresh state
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

    // On new item in training mode, answer should be hidden and show button enabled
    const solutionVisible = await isSolutionVisible(page);
    expect(solutionVisible).toBeFalsy();
    await expect(page.locator("#show-btn")).toBeEnabled();
  });

  test("TC-3.5: VISA During Timer Countdown", async ({ page }) => {
    // Start training mode with 10-second timer
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Wait a moment to ensure timer is running
    await page.waitForTimeout(500);

    // Click "VISA" button during countdown
    await page.click("#show-btn");

    // Verify answer is shown
    await expect(page.locator("#solution-display")).toBeVisible();

    // Verify VISA button is disabled
    await expect(page.locator("#show-btn")).toBeDisabled();

    // In training mode, showing answer manually shouldn't necessarily pause the game
    // The game should continue running with the answer visible
    // Verify other buttons remain in running state
    await assertButtonStates(page, {
      "play-btn": false,
      "pause-btn": true,
      "stop-btn": true,
      "show-btn": false, // Disabled since answer is shown
      "next-btn": true,
    });
  });

  test("TC-3.6: Next Item After VISA", async ({ page }) => {
    // Start training mode
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Click "VISA" on item 1
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).toBeVisible();
    await expect(page.locator("#show-btn")).toBeDisabled();

    // Click "NÄSTA" to advance
    const initialItem = await getCurrentItem(page);
    await page.click("#next-btn");

    // Wait for item to change
    await page.waitForFunction(
      (selector, previousText) => {
        const el = document.querySelector(selector);
        return el && el.textContent !== previousText;
      },
      "#current-item",
      initialItem,
    );

    // Verify item 2 answer is hidden
    const solutionVisible = await isSolutionVisible(page);
    expect(solutionVisible).toBeFalsy();

    // Verify "VISA" button is re-enabled
    await expect(page.locator("#show-btn")).toBeEnabled();

    // Verify clean state for new item
    const currentItem = await getCurrentItem(page);
    expect(currentItem).not.toBe(initialItem);
    expect(currentItem).toBeTruthy();
  });

  test("TC-3.7: VISA in Learning Mode Behavior", async ({ page }) => {
    // Start learning mode game
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // In learning mode, answer should be visible immediately
    await expect(page.locator("#solution-display")).toBeVisible();

    // VISA button should be disabled since answer is always shown in learning mode
    await expect(page.locator("#show-btn")).toBeDisabled();

    // Advance to next item
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

    // Answer should still be visible on new item
    await expect(page.locator("#solution-display")).toBeVisible();

    // VISA button should remain disabled
    await expect(page.locator("#show-btn")).toBeDisabled();
  });
});
