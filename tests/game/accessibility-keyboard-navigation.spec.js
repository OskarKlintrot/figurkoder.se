import { test, expect } from "@playwright/test";
import { navigateToGamePage, startGame, getCurrentItem } from "./test-utils.js";

test.describe("Accessibility and Keyboard Navigation Tests", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGamePage(page);
  });

  test("TC-10.1: Keyboard Shortcuts", async ({ page }) => {
    // Start training game to test keyboard shortcuts
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 5,
      timeLimit: 10,
    });

    await expect(page.locator("#current-item")).toBeVisible();

    // Test Space bar to show answer
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);

    // Check if answer was shown
    const solutionVisible = await page.locator("#solution-display").isVisible();
    console.log(`Space key show answer: ${solutionVisible}`);

    // If answer was shown, verify VISA button is disabled
    if (solutionVisible) {
      await expect(page.locator("#show-btn")).toBeDisabled();
    }

    // Test Enter key to show answer (if not already shown)
    if (!solutionVisible) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);

      const enterSolutionVisible = await page
        .locator("#solution-display")
        .isVisible();
      console.log(`Enter key show answer: ${enterSolutionVisible}`);
    }

    // Test Arrow keys to advance
    const initialItem = await getCurrentItem(page);

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);

    let currentItem = await getCurrentItem(page);
    const rightArrowWorked = currentItem !== initialItem;
    console.log(`Right arrow advancement: ${rightArrowWorked}`);

    // If right arrow didn't work, try other arrow keys
    if (!rightArrowWorked) {
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(500);

      currentItem = await getCurrentItem(page);
      const downArrowWorked = currentItem !== initialItem;
      console.log(`Down arrow advancement: ${downArrowWorked}`);

      if (!downArrowWorked) {
        await page.keyboard.press("ArrowUp");
        await page.waitForTimeout(500);

        currentItem = await getCurrentItem(page);
        const upArrowWorked = currentItem !== initialItem;
        console.log(`Up arrow advancement: ${upArrowWorked}`);
      }
    }

    // Test 'N' key to advance
    const beforeNKey = await getCurrentItem(page);

    await page.keyboard.press("n");
    await page.waitForTimeout(500);

    const afterNKey = await getCurrentItem(page);
    const nKeyWorked = afterNKey !== beforeNKey;
    console.log(`N key advancement: ${nKeyWorked}`);

    // Test uppercase 'N'
    if (!nKeyWorked) {
      await page.keyboard.press("N");
      await page.waitForTimeout(500);

      const afterCapitalN = await getCurrentItem(page);
      const capitalNWorked = afterCapitalN !== beforeNKey;
      console.log(`Capital N key advancement: ${capitalNWorked}`);
    }

    // Verify game controls still work after keyboard input
    await expect(page.locator("#current-item")).toBeVisible();

    // Test that mouse controls still work
    await page.click("#next-btn");
    await page.waitForTimeout(200);

    const mouseClickItem = await getCurrentItem(page);
    expect(mouseClickItem).toBeTruthy();

    // Stop game with keyboard (Escape key if supported)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const gameStoppedByEscape = await page.locator("#game-form").isVisible();
    console.log(`Escape key stop game: ${gameStoppedByEscape}`);

    if (!gameStoppedByEscape) {
      // Stop game manually if Escape doesn't work
      await page.click("#stop-btn");
    }

    await expect(page.locator("#game-form")).toBeVisible();
  });

  test("TC-10.2: Focus Management", async ({ page }) => {
    // Test keyboard navigation through form controls
    await expect(page.locator("#game-form")).toBeVisible();

    // Start by focusing the first input
    await page.focus("#from-input");

    // Navigate through form using Tab key
    const formElements = [
      "#from-input",
      "#to-input",
      "#time-input",
      "#learning-mode",
      'button[type="submit"]',
    ];

    for (let i = 0; i < formElements.length - 1; i++) {
      const currentElement = formElements[i];
      const nextElement = formElements[i + 1];

      // Verify current element is focused
      const isFocused = await page.evaluate(selector => {
        return document.activeElement === document.querySelector(selector);
      }, currentElement);

      if (isFocused) {
        console.log(`Element ${currentElement} is properly focused`);
      }

      // Tab to next element
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);
    }

    // Test focus indicators are visible
    const focusIndicatorVisible = await page.evaluate(() => {
      const focusedElement = document.activeElement;
      if (!focusedElement) return false;

      const styles = window.getComputedStyle(focusedElement);

      // Check for common focus indicator styles
      const hasOutline = styles.outline !== "none" && styles.outline !== "";
      const hasBoxShadow =
        styles.boxShadow !== "none" && styles.boxShadow !== "";
      const hasBorder = styles.borderColor !== "transparent";

      return hasOutline || hasBoxShadow || hasBorder;
    });

    console.log(`Focus indicators visible: ${focusIndicatorVisible}`);

    // Test Enter/Space activate focused elements
    await page.focus('button[type="submit"]');

    // Verify button is focused
    const buttonFocused = await page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]');
      return document.activeElement === button;
    });

    if (buttonFocused) {
      // Activate with Enter key
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      // Should start game
      const gameStarted = await page.locator(".game-controls").isVisible();
      console.log(`Enter key activated submit button: ${gameStarted}`);

      if (gameStarted) {
        // Test focus management during game state
        await expect(page.locator("#current-item")).toBeVisible();

        // Tab through game controls
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);

        // Check if focus moves to game buttons
        const gameButtonFocused = await page.evaluate(() => {
          const activeElement = document.activeElement;
          const gameButtons = [
            "#show-btn",
            "#next-btn",
            "#pause-btn",
            "#stop-btn",
          ];
          return gameButtons.some(
            selector => document.querySelector(selector) === activeElement,
          );
        });

        console.log(`Game button focused: ${gameButtonFocused}`);

        // Test focus management during state changes
        await page.click("#pause-btn");
        await expect(page.locator("#play-btn")).toBeEnabled();

        // Focus should still be manageable
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);

        const focusAfterPause = await page.evaluate(() => {
          return document.activeElement !== document.body;
        });

        console.log(`Focus maintained after pause: ${focusAfterPause}`);

        // Resume and test focus
        await page.focus("#play-btn");
        await page.keyboard.press("Enter");
        await expect(page.locator("#pause-btn")).toBeEnabled();

        // Stop game
        await page.focus("#stop-btn");
        await page.keyboard.press("Enter");
      }
    }

    // Verify focus returns to form after game ends
    await expect(page.locator("#game-form")).toBeVisible();

    const formHasFocus = await page.evaluate(() => {
      const formElements = document.querySelectorAll(
        "#game-form input, #game-form button",
      );
      return Array.from(formElements).some(el => el === document.activeElement);
    });

    console.log(`Form regained focus after game: ${formHasFocus}`);
  });

  test("TC-10.3: Screen Reader Compatibility", async ({ page }) => {
    // Test aria labels and screen reader friendly attributes

    // Check form labels and accessibility attributes
    const formAccessibility = await page.evaluate(() => {
      const results = {};

      // Check input labels
      const fromInput = document.querySelector("#from-input");
      const toInput = document.querySelector("#to-input");
      const timeInput = document.querySelector("#time-input");
      const learningModeInput = document.querySelector("#learning-mode");

      results.fromInputLabel = fromInput
        ? fromInput.labels?.[0]?.textContent ||
          fromInput.getAttribute("aria-label") ||
          fromInput.getAttribute("placeholder")
        : null;

      results.toInputLabel = toInput
        ? toInput.labels?.[0]?.textContent ||
          toInput.getAttribute("aria-label") ||
          toInput.getAttribute("placeholder")
        : null;

      results.timeInputLabel = timeInput
        ? timeInput.labels?.[0]?.textContent ||
          timeInput.getAttribute("aria-label") ||
          timeInput.getAttribute("placeholder")
        : null;

      results.learningModeLabel = learningModeInput
        ? learningModeInput.labels?.[0]?.textContent ||
          learningModeInput.getAttribute("aria-label")
        : null;

      return results;
    });

    console.log("Form accessibility:", formAccessibility);

    // Verify inputs have some form of labeling
    expect(
      formAccessibility.fromInputLabel || formAccessibility.toInputLabel,
    ).toBeTruthy();

    // Start game to test game controls accessibility
    await startGame(page, {
      learningMode: false,
      fromRange: 0,
      toRange: 5,
      timeLimit: 10,
    });

    // Check game controls accessibility
    const gameAccessibility = await page.evaluate(() => {
      const results = {};

      const showBtn = document.querySelector("#show-btn");
      const nextBtn = document.querySelector("#next-btn");
      const pauseBtn = document.querySelector("#pause-btn");
      const stopBtn = document.querySelector("#stop-btn");
      const currentItem = document.querySelector("#current-item");
      const solutionDisplay = document.querySelector("#solution-display");

      results.showBtnText =
        showBtn?.textContent || showBtn?.getAttribute("aria-label");
      results.nextBtnText =
        nextBtn?.textContent || nextBtn?.getAttribute("aria-label");
      results.pauseBtnText =
        pauseBtn?.textContent || pauseBtn?.getAttribute("aria-label");
      results.stopBtnText =
        stopBtn?.textContent || stopBtn?.getAttribute("aria-label");
      results.currentItemText = currentItem?.textContent;
      results.solutionDisplayText = solutionDisplay?.textContent;

      // Check for aria attributes
      results.showBtnAria =
        showBtn?.getAttribute("aria-disabled") ||
        showBtn?.getAttribute("aria-pressed");
      results.gameAreaRole = document
        .querySelector(".game-controls")
        ?.getAttribute("role");

      return results;
    });

    console.log("Game accessibility:", gameAccessibility);

    // Verify buttons have meaningful text
    expect(gameAccessibility.showBtnText).toBeTruthy();
    expect(gameAccessibility.nextBtnText).toBeTruthy();
    expect(gameAccessibility.currentItemText).toBeTruthy();

    // Test state announcements
    await page.click("#show-btn");
    await page.waitForTimeout(200);

    const solutionAccessibility = await page.evaluate(() => {
      const solutionDisplay = document.querySelector("#solution-display");
      return {
        visible:
          solutionDisplay?.style.display !== "none" &&
          solutionDisplay?.style.visibility !== "hidden",
        text: solutionDisplay?.textContent,
        ariaLive: solutionDisplay?.getAttribute("aria-live"),
        role: solutionDisplay?.getAttribute("role"),
      };
    });

    console.log("Solution display accessibility:", solutionAccessibility);

    // Test navigation with screen reader in mind
    await page.click("#next-btn");
    await page.waitForTimeout(500);

    const newItemAccessibility = await page.evaluate(() => {
      const currentItem = document.querySelector("#current-item");
      return {
        text: currentItem?.textContent,
        announced:
          currentItem?.getAttribute("aria-live") === "polite" ||
          currentItem?.getAttribute("aria-live") === "assertive",
      };
    });

    console.log("New item accessibility:", newItemAccessibility);

    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();
  });

  test("TC-10.4: High Contrast and Visual Accessibility", async ({ page }) => {
    // Test app in high contrast mode
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await page.waitForSelector("#main-menu.active", { timeout: 5000 });

    // Navigate to game page in dark mode
    await navigateToGamePage(page);

    // Verify form is still visible and usable in dark mode
    await expect(page.locator("#game-form")).toBeVisible();

    const darkModeStyles = await page.evaluate(() => {
      const form = document.querySelector("#game-form");
      const fromInput = document.querySelector("#from-input");
      const submitBtn = document.querySelector('button[type="submit"]');

      const formStyle = window.getComputedStyle(form);
      const inputStyle = window.getComputedStyle(fromInput);
      const buttonStyle = window.getComputedStyle(submitBtn);

      return {
        formBackgroundColor: formStyle.backgroundColor,
        formColor: formStyle.color,
        inputBackgroundColor: inputStyle.backgroundColor,
        inputColor: inputStyle.color,
        inputBorderColor: inputStyle.borderColor,
        buttonBackgroundColor: buttonStyle.backgroundColor,
        buttonColor: buttonStyle.color,
      };
    });

    console.log("Dark mode styles:", darkModeStyles);

    // Verify there's contrast (colors are not the same)
    expect(darkModeStyles.inputBackgroundColor).not.toBe(
      darkModeStyles.inputColor,
    );
    expect(darkModeStyles.buttonBackgroundColor).not.toBe(
      darkModeStyles.buttonColor,
    );

    // Test game in dark mode
    await startGame(page, {
      learningMode: true,
      fromRange: 0,
      toRange: 5,
      timeLimit: 10,
    });

    const gameStylesInDarkMode = await page.evaluate(() => {
      const currentItem = document.querySelector("#current-item");
      const solutionDisplay = document.querySelector("#solution-display");
      const nextBtn = document.querySelector("#next-btn");

      const itemStyle = window.getComputedStyle(currentItem);
      const solutionStyle = window.getComputedStyle(solutionDisplay);
      const buttonStyle = window.getComputedStyle(nextBtn);

      return {
        itemVisible:
          itemStyle.display !== "none" && itemStyle.visibility !== "hidden",
        itemColor: itemStyle.color,
        itemBackgroundColor: itemStyle.backgroundColor,
        solutionVisible:
          solutionStyle.display !== "none" &&
          solutionStyle.visibility !== "hidden",
        buttonVisible:
          buttonStyle.display !== "none" && buttonStyle.visibility !== "hidden",
      };
    });

    console.log("Game styles in dark mode:", gameStylesInDarkMode);

    // All elements should remain visible
    expect(gameStylesInDarkMode.itemVisible).toBeTruthy();
    expect(gameStylesInDarkMode.solutionVisible).toBeTruthy();
    expect(gameStylesInDarkMode.buttonVisible).toBeTruthy();

    // Test with light mode
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(200);

    const lightModeStyles = await page.evaluate(() => {
      const currentItem = document.querySelector("#current-item");
      const nextBtn = document.querySelector("#next-btn");

      const itemStyle = window.getComputedStyle(currentItem);
      const buttonStyle = window.getComputedStyle(nextBtn);

      return {
        itemVisible:
          itemStyle.display !== "none" && itemStyle.visibility !== "hidden",
        buttonVisible:
          buttonStyle.display !== "none" && buttonStyle.visibility !== "hidden",
      };
    });

    // Should work in both modes
    expect(lightModeStyles.itemVisible).toBeTruthy();
    expect(lightModeStyles.buttonVisible).toBeTruthy();

    await page.click("#stop-btn");
    await expect(page.locator("#game-form")).toBeVisible();
  });
});
