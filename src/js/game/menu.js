import { navigateToPageWithContext } from "../navigation.js";
import gameData from "./data.js";
import { resetGameState, gameState, domCache } from "./utils.js";

// ============================================================================
//  GAME MENU
//  Functions specifically for the main menu interface:
//  - Game range calculations
//  - Tile generation for game selection
//  - Navigation to game page
// ============================================================================

/**
 * Gets the range of data for a specific game
 * @param {string} gameId - The ID of the game
 * @returns {Object} Object with start and stop values
 */
export function getGameRange(gameId) {
  const game = gameData[gameId];
  const start = game.data[0][0];
  const stop = game.data[game.data.length - 1][0];
  return { start, stop };
}

/**
 * Generates the game tiles for the main menu
 */
export function generateTiles() {
  const tilesGrid = document.getElementById("tiles-grid");
  if (!tilesGrid) return;

  Object.keys(gameData).forEach((gameId) => {
    const game = gameData[gameId];
    const range = getGameRange(gameId);
    const tile = document.createElement("div");
    tile.className = "tile";

    // Use a closure to capture the gameId
    tile.addEventListener("click", () => {
      navigateToGame(gameId);
    });

    tile.innerHTML = `
      <div class="tile-title">${range.start} – ${range.stop}</div>
      <div class="tile-category">${game.title}</div>
    `;

    tilesGrid.appendChild(tile);
  });
}

/**
 * Game-specific navigation function (internal use only)
 */
function navigateToGame(gameType) {
  // Force reset game state when navigating to a new game
  gameState.isReplayMode = false; // Clear replay mode first
  resetGameState(gameState, domCache);

  navigateToPageWithContext("game-page", gameType);
}
