import {
  navigateToPage,
  updateHeader,
  registerPageEnterCallback,
  registerPageLeaveCallback,
  registerContextChangeCallback,
  setCurrentContext,
  getCurrentContext,
  setContextData,
  getContextData,
  navigateToPageWithContext,
} from "./navigation.js";
import gameData from "./game/data.js";
import { resetProgressBar, resetGameState, prepareResultData } from "./game/utils.js";
import { getGameRange, generateTiles } from "./game/menu.js";
import {
  toggleVibrationSetting,
  updateLearningMode,
  loadGameSettings,
  updateInitialDisplay,
  updateButtonStates,
  hideRangeControls,
  showRangeControls,
  initializeGame,
  populateDropdowns,
  startGame,
  pauseGame,
  stopGame,
  showCurrentItem,
  startCountdown,
  showAnswer,
  nextItem,
} from "./game/play.js";
import { updateResults, replay } from "./game/result.js";

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

// Game-specific functions that use navigation's generic context system
export function setCurrentGame(game) {
  setCurrentContext(game);
}

export function getCurrentGame() {
  return getCurrentContext();
}

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

// Register game-specific navigation callbacks
registerPageEnterCallback("game-page", () => {
  const gameType = getCurrentGame();
  const contextData = getContextData();
  
  // Check if we have replay data in context
  if (contextData && contextData.replayType) {
    // Update header with game title from replay data
    updateHeader(contextData.gameTitle, true);

    // Set game description for replay
    const descElement = document.getElementById("game-description-text");
    if (descElement) {
      if (contextData.replayType === "slow") {
        descElement.textContent = `Repetition av långsamma svar från ${contextData.gameTitle}`;
      } else {
        descElement.textContent = `Repetition av ${contextData.gameTitle}`;
      }
    }

    // Initialize the game with replay data
    initializeGame();
    return;
  }
  
  if (gameType && gameData[gameType]) {
    // Set up the game page with current game data
    const game = gameData[gameType];

    // Update header with game title
    updateHeader(game.title, true);

    // Set game description
    const descElement = document.getElementById("game-description-text");
    if (descElement) {
      descElement.textContent = game.description;
    }

    // Initialize the game
    initializeGame();
  } else {
    // No valid game context, show generic header
    updateHeader("Spel", true);
  }
});

registerPageEnterCallback("results-page", () => {
  updateHeader("Resultat", true);
  updateResults(domCache, gameState); // Update the results display when entering the page
});

registerPageLeaveCallback("game-page", () => {
  // Reset game state when leaving game page (unless in replay mode)
  if (!gameState.isReplayMode) {
    resetGameState(gameState, domCache);
  }
});

registerContextChangeCallback((context) => {
  // Handle context change - validate game exists
  if (context && gameData && !gameData[context]) {
    // Invalid game context, navigate to 404
    navigateToPage("404-page");
  }
});