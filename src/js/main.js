import {
  replay,
  startGame,
  pauseGame,
  stopGame,
  showAnswer,
  nextItem,
  toggleVibrationSetting,
  updateLearningMode,
  loadGameSettings,
  updateButtonStates,
} from "./game/play.js";
import { generateTiles } from "./game/menu.js";
import {
  initializeFromURL,
  shouldUseHashRouting,
  openMenu,
  closeMenu,
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
    await new Promise(resolve => setTimeout(resolve, 100));

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
  // Load settings from localStorage
  loadGameSettings();
  loadDebugSettings();

  // Fetch and display service worker version
  fetchAndDisplayVersion();

  generateTiles();
  initializeFromURL();
  updateButtonStates();

  // Handle form submission on game form
  document.querySelector("#game-form").addEventListener("submit", function (e) {
    e.preventDefault();
    startGame();
  });
});
