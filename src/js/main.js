import { domCache, gameState } from "./game/utils.js";
import { setupGameNavigation } from "./game/navigation.js";
import { replay, updateResults } from "./game/result.js";
import {
  startGame,
  pauseGame,
  stopGame,
  showAnswer,
  nextItem,
  toggleVibrationSetting,
  updateLearningMode,
  loadGameSettings,
  updateButtonStates,
  initializeGame,
} from "./game/play.js";
import { generateTiles } from "./game/menu.js";
import {
  initializeFromURL,
  shouldUseHashRouting,
  openMenu,
  closeMenu,
  goBack,
  navigateToPage,
} from "./navigation.js";
import {
  clearDebugConsole,
  toggleDebugViewSetting,
  handleHeaderClick,
  loadDebugSettings,
} from "./debug.js";

// Register service worker and store the promise for later use
const serviceWorkerRegistration = navigator.serviceWorker.register("/sw.js");

/**
 * Fetches the service worker version and displays it in the navigation menu
 */
async function fetchAndDisplayVersion() {
  try {
    // First wait for registration to complete
    await serviceWorkerRegistration;
    // Then wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // Add a small delay to ensure the service worker is fully ready to handle requests
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await fetch("/sw/version");
    if (response.ok) {
      const data = await response.json();
      const versionElement = document.getElementById("version-display");
      if (versionElement) {
        versionElement.textContent = data.version;
      }
    } else {
      const versionElement = document.getElementById("version-display");
      if (versionElement) {
        versionElement.textContent = "Okänd";
      }
    }
  } catch (error) {
    console.log("Could not fetch version:", error);
    const versionElement = document.getElementById("version-display");
    if (versionElement) {
      versionElement.textContent = "Okänd";
    }
  }
}

// Make functions globally accessible for onclick handlers
window.openMenu = openMenu;
window.closeMenu = closeMenu;
window.goBack = goBack;
window.navigateToPage = navigateToPage;
window.showAnswer = showAnswer;
window.nextItem = nextItem;
window.startGame = startGame;
window.pauseGame = pauseGame;
window.stopGame = stopGame;
window.replay = replay;
window.toggleVibrationSetting = toggleVibrationSetting;
window.toggleDebugViewSetting = toggleDebugViewSetting;
window.clearDebugConsole = clearDebugConsole;
window.handleHeaderClick = handleHeaderClick;
window.updateLearningMode = updateLearningMode;

// Handle keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (document.querySelector("#game-page.active")) {
    if (e.key === " " || e.key === "Enter") {
      // Space or Enter to show answer
      e.preventDefault();
      if (gameState.isGameRunning && !gameState.showingSolution) {
        showAnswer();
      }
    } else if (e.key === "ArrowRight" || e.key === "n" || e.key === "N") {
      // Right arrow or N to next
      e.preventDefault();
      if (gameState.isGameRunning) {
        nextItem();
      }
    }
  }
});

// Handle navigation changes (back/forward navigation)
if (shouldUseHashRouting()) {
  window.addEventListener("hashchange", function () {
    initializeFromURL();
  });
} else {
  window.addEventListener("popstate", function () {
    initializeFromURL();
  });
}

// Initialize page based on URL when loaded
window.addEventListener("DOMContentLoaded", function () {
  // Initialize DOM cache for better performance
  domCache.init();

  // Setup game navigation callbacks
  setupGameNavigation(gameState, domCache, { initializeGame, updateResults });

  // Load settings from localStorage
  loadGameSettings();
  loadDebugSettings();

  // Fetch and display service worker version
  fetchAndDisplayVersion();

  generateTiles();
  initializeFromURL();
  updateButtonStates();
});
