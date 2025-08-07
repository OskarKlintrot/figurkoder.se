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
} from "../navigation.js";
import gameData from "./data.js";
import { resetGameState } from "./utils.js";

// ============================================================================
//  GAME CONTEXT AND NAVIGATION
//  Functions for managing game context and page navigation callbacks
// ============================================================================

/**
 * Game-specific functions that use navigation's generic context system
 */
export function setCurrentGame(game) {
  setCurrentContext(game);
}

export function getCurrentGame() {
  return getCurrentContext();
}

/**
 * Registers all game-related navigation callbacks
 * Should be called once during app initialization
 */
export function setupGameNavigation(
  gameState,
  domCache,
  { initializeGame, updateResults }
) {
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
}
