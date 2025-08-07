/**
 * Utility functions for game functionality
 */

// Game state object
export const gameState = {
  currentGameData: [],
  originalGameData: [], // Store the original filtered data used in the game
  masterGameData: [], // Store the very first filtered data from the initial game
  currentItemIndex: 0,
  gameTimer: null,
  countdownTimer: null,
  gameStartTime: null,
  isGameRunning: false,
  showingSolution: false,
  countdownValue: 0,
  totalCountdownTime: 0,
  hasStarted: false,
  pausedCountdownValue: null,
  paused: false,
  gameResults: [],
  currentItemStartTime: null,
  pausedTime: 0, // Track time spent in pause for current item
  isReplayMode: false, // Flag to prevent initializeGame during replay
  vibrationEnabled: true, // Flag to control vibration
  isLearningMode: false, // Flag to control learning mode
};

// Cache frequently accessed DOM elements to reduce queries
export const domCache = {
  nextBtn: null,
  progressBar: null,
  currentItem: null,
  solutionDisplay: null,
  playBtn: null,
  pauseBtn: null,
  stopBtn: null,
  showBtn: null,
  init() {
    this.nextBtn = document.getElementById("next-btn");
    this.progressBar = this.nextBtn?.querySelector(".btn-progress-bar");
    this.currentItem = document.getElementById("current-item");
    this.solutionDisplay = document.getElementById("solution-display");
    this.playBtn = document.getElementById("play-btn");
    this.pauseBtn = document.getElementById("pause-btn");
    this.stopBtn = document.getElementById("stop-btn");
    this.showBtn = document.getElementById("show-btn");
  },
};

/**
 * Resets the progress bar to 0% and removes progress bar styling
 */
export function resetProgressBar(domCache) {
  if (domCache.progressBar) {
    // Temporarily remove transition to avoid layout issues during reset
    domCache.progressBar.style.transition = "none";
    domCache.progressBar.style.setProperty("--progress", "0%");
    // Restore transition on the next animation frame to avoid forced reflow
    requestAnimationFrame(() => {
      domCache.progressBar.style.transition = "";
    });
  }
  if (domCache.nextBtn) {
    domCache.nextBtn.classList.remove("progress-bar");
  }
}

/**
 * Resets all game state variables and UI elements to their default values
 */
export function resetGameState(gameState, domCache) {
  // Don't reset if we're in replay mode
  if (gameState.isReplayMode) {
    return;
  }

  // Stop any running game
  if (gameState.isGameRunning || gameState.paused) {
    // Clear all timers
    clearTimeout(gameState.gameTimer);
    // Cancel animation frame instead of clearing interval
    if (gameState.countdownTimer) {
      cancelAnimationFrame(gameState.countdownTimer);
      gameState.countdownTimer = null;
    }

    // Deactivate wake lock when resetting game state
    if (window.deactivateScreenWakeLock) {
      window.deactivateScreenWakeLock();
    }
  }

  // Reset all game state variables to initial values
  gameState.currentGameData = [];
  gameState.originalGameData = [];
  gameState.masterGameData = [];
  gameState.currentItemIndex = 0;
  gameState.gameTimer = null;
  gameState.countdownTimer = null;
  gameState.gameStartTime = null;
  gameState.isGameRunning = false;
  gameState.showingSolution = false;
  gameState.countdownValue = 0;
  gameState.totalCountdownTime = 0;
  gameState.hasStarted = false;
  gameState.pausedCountdownValue = null;
  gameState.paused = false;
  gameState.gameResults = [];
  gameState.currentItemStartTime = null;
  gameState.pausedTime = 0;
  gameState.isReplayMode = false;
  // Note: vibrationEnabled is kept as it's a user setting

  // Reset UI elements to default state
  resetProgressBar(domCache);

  // Reset display elements
  (
    domCache.currentItem || document.getElementById("current-item")
  ).textContent = "---";
  (
    domCache.solutionDisplay || document.getElementById("solution-display")
  ).textContent = "---";

  // Reset learning mode to default (unchecked)
  const learningModeCheckbox = document.getElementById("learning-mode");
  if (learningModeCheckbox) {
    learningModeCheckbox.checked = false;
  }
  gameState.isLearningMode = false;
}

/**
 * Prepares result data for passing to the results page
 */
export function prepareResultData(gameState, getCurrentGame, gameData) {
  const currentGameId = getCurrentGame();
  const gameTitle =
    currentGameId && gameData[currentGameId]
      ? gameData[currentGameId].title
      : "Okänt spel";

  return {
    gameTitle: gameTitle,
    gameResults: [...gameState.gameResults], // Create a copy of the results
    originalGameData: [...gameState.originalGameData], // For replay functionality
    masterGameData: [...gameState.masterGameData], // For slow replay functionality
  };
}
