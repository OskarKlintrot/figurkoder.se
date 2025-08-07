import {
  domCache,
  gameState,
  generateTiles,
  startGame,
  pauseGame,
  stopGame,
  showAnswer,
  nextItem,
  replay,
  toggleVibrationSetting,
  updateLearningMode,
  loadGameSettings,
} from "./game.js";
import {
  initializeFromURL,
  shouldUseHashRouting,
  openMenu,
  closeMenu,
  goBack,
  navigateToPage,
  navigateToGame,
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
export async function fetchAndDisplayVersion() {
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

// Make functions globally accessible for onclick handlers
window.openMenu = openMenu;
window.closeMenu = closeMenu;
window.goBack = goBack;
window.navigateToPage = navigateToPage;
window.navigateToGame = navigateToGame;
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

// Initialize page based on URL when loaded
window.addEventListener("DOMContentLoaded", function () {
  // Initialize DOM cache for better performance
  domCache.init();

  // Load settings from localStorage
  loadGameSettings();
  loadDebugSettings();

  generateTiles();
  // Fetch and display service worker version
  fetchAndDisplayVersion();
  // Add a small delay to ensure gameData is loaded
  setTimeout(() => {
    initializeFromURL();
    // Initialize button states on page load
    import("./game.js").then(({ updateButtonStates }) => {
      updateButtonStates();
    });
  }, 100);
});
