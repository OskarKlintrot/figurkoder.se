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

  test("should automatically reveal answer when timer expires in training mode", async ({
    page,
  }) => {
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 1,
      timeLimit: 1,
    });

    await page.waitForFunction(() => {
      const el = document.querySelector("#solution-display");
      return el && el.textContent && el.textContent !== "•••";
    });
    await expect(page.locator("#solution-display")).toBeVisible();
    const solutionText = await page.locator("#solution-display").textContent();
    expect(solutionText).not.toBe("•••");
    // VISA button should be disabled
    await expect(page.locator("#show-btn")).toBeDisabled();
  });

  test("should reveal answer when clicking VISA button in training mode", async ({
    page,
  }) => {
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
    expect(solutionText).not.toBe("");
    expect(solutionText).not.toBe("•••");

    // Verify button becomes disabled after showing answer
    await expect(page.locator("#show-btn")).toBeDisabled();
  });

  test("should track answer visibility state correctly", async ({ page }) => {
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

  test("should manage VISA button state changes correctly", async ({
    page,
  }) => {
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

  test("should persist answer visibility when switching modes", async ({
    page,
  }) => {
    // This test verifies the behavior difference between modes
    // rather than switching during game (which isn't possible)

    // First test training mode behavior
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // Verify solution is hidden initially in training mode
    await expect(page.locator("#solution-display")).toContainText("•••");

    // Click "VISA" to show answer
    await page.click("#show-btn");
    await expect(page.locator("#solution-display")).toBeVisible();
    await expect(page.locator("#solution-display")).not.toContainText("•••");

    // Stop the game to end current session
    await page.click('button[onclick="stopGame()"]');
    await page.waitForTimeout(500);

    // Use the navigation utility to get back to game page
    await navigateToGamePage(page);

    // Now start learning mode game
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 9,
      timeLimit: 10,
    });

    // In learning mode, answer should be visible immediately
    await expect(page.locator("#solution-display")).toBeVisible();
    await expect(page.locator("#solution-display")).not.toContainText("•••");

    // Show button should be disabled in learning mode (answer always shown)
    await expect(page.locator("#show-btn")).toBeDisabled();

    // Advance to next item to verify learning mode behavior
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

    // In learning mode, even on new item, answer should remain visible
    const solutionVisible = await isSolutionVisible(page);
    expect(solutionVisible).toBeTruthy(); // Should be visible in learning mode
    await expect(page.locator("#show-btn")).toBeDisabled(); // Should remain disabled
  });

  test("should handle VISA button during timer countdown", async ({ page }) => {
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
    await expect(page.locator("#solution-display")).not.toContainText("•••");

    // Verify VISA button is disabled after clicking
    await expect(page.locator("#show-btn")).toBeDisabled();

    // In training mode, showing answer manually doesn't pause the timer
    // The game continues running with the answer visible
    // Button states should reflect that the game is still active
    await assertButtonStates(page, {
      "stop-btn": true, // Stop should be enabled
      "show-btn": false, // Show disabled since answer is shown
      "next-btn": true, // Next should be enabled to advance manually
    });
  });

  test("should reset answer state when advancing to next item", async ({
    page,
  }) => {
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

  test("should handle VISA button correctly in learning mode", async ({
    page,
  }) => {
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
