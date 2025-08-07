import {
  resetGameState,
  gameState,
  getCurrentGame,
  setCurrentGame,
} from "./game.js";
import gameData from "./game-data.js";

/**
 * Handles navigation back to previous page based on current page context
 */
export function goBack() {
  const currentPageId = document.querySelector(".page.active").id;

  if (currentPageId === "game-page") {
    resetGameState(); // Reset game state before leaving game page
    navigateToPage("main-menu");
  } else if (currentPageId === "results-page") {
    navigateToPage("game-page");
  } else if (
    currentPageId === "about-page" ||
    currentPageId === "faq-page" ||
    currentPageId === "contact-page" ||
    currentPageId === "404-page"
  ) {
    navigateToPage("main-menu");
  }
}

/**
 * Updates the page header with title and back button visibility
 * @param {string} title - The title to display in the header
 * @param {boolean} showBackButton - Whether to show the back button
 */
export function updateHeader(title, showBackButton = false) {
  document.getElementById("page-title").textContent = title;
  const backBtn = document.getElementById("back-btn");

  if (showBackButton) {
    backBtn.classList.remove("hidden");
    backBtn.classList.add("visible");
  } else {
    backBtn.classList.remove("visible");
    backBtn.classList.add("hidden");
  }
}

/**
 * Navigates to a specific page, managing page visibility and URL updates
 * @param {string} pageId - The ID of the page to navigate to
 * @param {boolean} updateURL - Whether to update the browser URL
 */
export function navigateToPage(pageId, updateURL = true) {
  // Check if we're leaving the game page to reset state
  const currentPageId = document.querySelector(".page.active")?.id;
  if (
    currentPageId === "game-page" &&
    pageId !== "game-page" &&
    pageId !== "results-page"
  ) {
    resetGameState();
  }

  // Hide all pages
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  // Show target page
  document.getElementById(pageId).classList.add("active");

  // Update URL if requested
  if (updateURL) {
    const url = getURLForPage(pageId);
    if (shouldUseHashRouting()) {
      window.location.hash = url.substring(1); // Remove the # prefix for setting hash
    } else {
      history.pushState(null, "", url);
    }
  }

  // Update header based on page
  const currentGame = getCurrentGame();
  switch (pageId) {
    case "main-menu":
      updateHeader("Figurkoder.se", false);
      break;
    case "game-page":
      updateHeader(
        currentGame && gameData && gameData[currentGame]
          ? gameData[currentGame].title
          : "Spel",
        true
      );
      break;
    case "results-page":
      updateHeader("Resultat", true);
      break;
    case "about-page":
      updateHeader("Om sidan", true);
      break;
    case "faq-page":
      updateHeader("Vanliga frågor", true);
      break;
    case "contact-page":
      updateHeader("Kontakta mig", true);
      break;
    case "404-page":
      updateHeader("404 - Sidan hittades inte", true);
      break;
  }
}

/**
 * Determines whether to use hash-based routing based on the current environment
 * @returns {boolean} True if hash routing should be used
 */
export function shouldUseHashRouting() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".local") ||
    window.location.protocol === "file:"
  );
}

/**
 * Generates the appropriate URL for a given page ID
 * @param {string} pageId - The ID of the page to generate URL for
 * @returns {string} The generated URL
 */
export function getURLForPage(pageId) {
  const prefix = shouldUseHashRouting() ? "#" : "";
  const currentGame = getCurrentGame();

  switch (pageId) {
    case "main-menu":
      return prefix + "/";
    case "game-page":
      return prefix + (currentGame ? `/game/${currentGame}` : "/game");
    case "results-page":
      return (
        prefix + (currentGame ? `/game/${currentGame}/results` : "/results")
      );
    case "about-page":
      return prefix + "/about";
    case "faq-page":
      return prefix + "/faq";
    case "contact-page":
      return prefix + "/contact";
    case "404-page":
      return prefix + "/404";
    default:
      return prefix + "/";
  }
}

/**
 * Parses the current URL to determine which page and game should be displayed
 * @returns {Object} An object containing page and game information
 */
export function parseURL() {
  let path;

  if (shouldUseHashRouting()) {
    const hash = window.location.hash;
    path = hash.startsWith("#") ? hash.substring(1) : hash;
  } else {
    path = window.location.pathname;
  }

  // Clean up the path and remove empty segments
  const segments = path.split("/").filter((s) => s && s.length > 0);

  // If no segments or root path, default to main menu
  if (segments.length === 0 || path === "/" || path === "") {
    return { page: "main-menu", game: null };
  }

  if (segments[0] === "game") {
    if (segments.length === 1) {
      return { page: "game-page", game: null };
    }
    const gameType = segments[1];
    // Don't check gameData here since it might not be loaded yet
    // Let initializeFromURL handle the validation
    if (segments.length === 3 && segments[2] === "results") {
      return { page: "results-page", game: gameType };
    }
    return { page: "game-page", game: gameType };
  }

  switch (segments[0]) {
    case "about":
      return { page: "about-page", game: null };
    case "faq":
      return { page: "faq-page", game: null };
    case "contact":
      return { page: "contact-page", game: null };
    default:
      return { page: "404-page", game: null };
  }
}

/**
 * Initializes the application based on the current URL
 */
export function initializeFromURL() {
  const { page, game } = parseURL();

  // Hide loading spinner
  document.getElementById("loading-spinner").classList.remove("active");

  if (game) {
    // Check if gameData is available and if the game exists
    if (gameData && gameData[game]) {
      setCurrentGame(game);
      const gameDataObj = gameData[game];

      // Safely set description if element exists
      const descElement = document.getElementById("game-description-text");
      if (descElement) {
        descElement.textContent = gameDataObj.description;
      }

      // Initialize the game if we're on the game page
      if (page === "game-page") {
        // Import initializeGame dynamically to avoid circular dependencies
        Promise.resolve().then(async () => {
          const { initializeGame } = await import("./game.js");
          initializeGame();
        });
      }

      navigateToPage(page, false);

      // Update header again now that currentGame and gameData are available
      if (page === "game-page") {
        updateHeader(gameDataObj.title, true);
      }
    } else if (gameData) {
      // gameData is loaded but game doesn't exist - show 404
      navigateToPage("404-page", false);
    } else {
      // gameData not loaded yet - wait a bit and try again
      setTimeout(() => {
        initializeFromURL();
      }, 100);
      return;
    }
  } else {
    navigateToPage(page, false);
  }
}

/**
 * Navigates to a specific game type and initializes it
 * @param {string} gameType - The type of game to navigate to
 */
export function navigateToGame(gameType) {
  // Reset any previous game state before starting a new game
  resetGameState();

  setCurrentGame(gameType);
  const game = gameData[gameType];

  // Clear any replay flags when starting a new game
  gameState.skipRangeFiltering = false;
  gameState.isReplayMode = false;

  if (game) {
    // Safely set description if element exists
    const descElement = document.getElementById("game-description-text");
    if (descElement) {
      descElement.textContent = game.description;
    }
  }

  navigateToPage("game-page");
  setTimeout(async () => {
    const { initializeGame } = await import("./game.js");
    initializeGame(); // This will handle dropdown vs input logic
  }, 100);
}

/**
 * Opens the navigation menu by adding CSS classes
 */
export function openMenu() {
  document.getElementById("nav-menu").classList.add("open");
  document.querySelector(".nav-overlay").classList.add("open");
}

/**
 * Closes the navigation menu by removing CSS classes
 */
export function closeMenu() {
  document.getElementById("nav-menu").classList.remove("open");
  document.querySelector(".nav-overlay").classList.remove("open");
}
