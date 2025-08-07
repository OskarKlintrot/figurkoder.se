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
  vibrationEnabled: true, // Flag to control vibration
  isLearningMode: false, // Flag to control learning mode
};

/**
 * Cleanup function for when leaving game page - stops timers and deactivates wake lock
 * without resetting the entire game state
 */
export function cleanupGameResources() {
  // Stop any running timers
  if (gameState.isGameRunning || gameState.paused) {
    // Clear all timers
    clearTimeout(gameState.gameTimer);
    // Cancel animation frame instead of clearing interval
    if (gameState.countdownTimer) {
      cancelAnimationFrame(gameState.countdownTimer);
      gameState.countdownTimer = null;
    }

    // Deactivate wake lock when leaving game
    if (window.deactivateScreenWakeLock) {
      window.deactivateScreenWakeLock();
    }
    
    // Set game as not running to prevent timers from continuing
    gameState.isGameRunning = false;
    gameState.paused = false;
  }
}
