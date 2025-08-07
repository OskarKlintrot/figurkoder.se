import {
  navigateToPage,
  getContextData,
  setContextData,
} from "../navigation.js";

// ============================================================================
//  GAME RESULT
//  Results page functionality:
//  - Display game statistics and performance metrics
//  - Individual item results with timing information
//  - Replay functionality (full game or slow items only)
//  - Result data preparation and context management
// ============================================================================

/**
 * Updates the results page with game statistics and individual item results
 */
export function updateResults(gameState) {
  const resultsList = document.getElementById("results-list");
  const averageTimeElement = document.getElementById("average-time");
  const resultsTitle = document.getElementById("results-title");

  if (!resultsList || !averageTimeElement || !resultsTitle) return;

  // Get result data from context
  let resultData = getContextData();
  if (!resultData) {
    // Fallback to gameState if no context data (shouldn't happen with new implementation)
    console.warn("No result data found in context, falling back to gameState");
    resultData = {
      gameTitle: "Okänt spel",
      gameResults: gameState.gameResults || [],
      originalGameData: gameState.originalGameData || [],
      masterGameData: gameState.masterGameData || [],
    };
  }

  // Update title to show game type
  resultsTitle.textContent = resultData.gameTitle;

  // Clear previous results
  resultsList.innerHTML = "";

  if (resultData.gameResults.length === 0) {
    resultsList.innerHTML =
      '<div class="result-item"><span>Inga resultat att visa</span><span>--</span></div>';
    averageTimeElement.textContent = "--";
    return;
  }

  // Calculate average time for items where answer wasn't shown
  const completedItems = resultData.gameResults.filter(
    (result) => !result.showedAnswer
  );
  const totalTime = completedItems.reduce(
    (sum, result) => sum + result.timeSpent,
    0
  );
  const averageTime =
    completedItems.length > 0 ? totalTime / completedItems.length : 0;

  // Display each result
  resultData.gameResults.forEach((result) => {
    const resultItem = document.createElement("div");
    resultItem.className = "result-item";

    const figurkodSpan = document.createElement("span");
    figurkodSpan.textContent = result.figurkod;

    const timeSpan = document.createElement("span");
    timeSpan.className = "time-display";

    if (result.showedAnswer) {
      timeSpan.textContent = result.answer;
      timeSpan.classList.add("error"); // Red color for shown answers
    } else {
      timeSpan.textContent = result.timeSpent.toFixed(1) + " sek";
      // Yellow background for times over 2 seconds
      if (result.timeSpent > 2) {
        timeSpan.classList.add("slow");
      }
    }

    resultItem.appendChild(figurkodSpan);
    resultItem.appendChild(timeSpan);
    resultsList.appendChild(resultItem);
  });

  // Update average time
  if (averageTime > 0) {
    averageTimeElement.textContent = averageTime.toFixed(1) + " sek";
  } else {
    averageTimeElement.textContent = "--";
  }

  // Update replay slow button
  const replaySlowBtn = document.getElementById("replay-slow-btn");
  const replaySlowText = document.getElementById("replay-slow-text");
  if (replaySlowBtn && replaySlowText) {
    const slowOrErrorCount = resultData.gameResults.filter(
      (result) => result.timeSpent > 2 || result.showedAnswer
    ).length;

    replaySlowBtn.disabled = slowOrErrorCount === 0;
    replaySlowText.textContent = `Repetera långsamma (${slowOrErrorCount})`;
  }
}

/**
 * Replays the game with specified settings
 * @param {boolean} slowOnly - If true, only replay slow/incorrect items
 */
export function replay(slowOnly = false) {
  // Get result data from context
  const resultData = getContextData();
  if (!resultData) {
    console.warn("No result data found for replay");
    return;
  }

  let replayData;

  // For slow replay, prepare data with only slow items
  if (slowOnly) {
    if (!resultData.gameResults.length || !resultData.masterGameData.length) {
      console.warn("Missing game results or master game data for slow replay");
      return;
    }

    // Filter master game data to only include items that were slow or showed answer
    const slowItems = [];
    resultData.gameResults.forEach((result) => {
      if (result.timeSpent > 2 || result.showedAnswer) {
        // Find the corresponding item in masterGameData (the original filtered data)
        const foundItem = resultData.masterGameData.find(
          (item) => item[0] === result.figurkod
        );
        if (foundItem && !slowItems.some((item) => item[0] === foundItem[0])) {
          slowItems.push(foundItem);
        }
      }
    });

    if (slowItems.length === 0) {
      console.warn("No slow items found for replay");
      return;
    }

    // Prepare replay data for slow items
    replayData = {
      gameTitle: resultData.gameTitle,
      replayType: "slow",
      gameData: slowItems,
      originalGameData: resultData.originalGameData,
      masterGameData: resultData.masterGameData,
    };
  } else {
    // For full replay, prepare data with original game data
    if (!resultData.originalGameData.length) {
      return;
    }

    replayData = {
      gameTitle: resultData.gameTitle,
      replayType: "full",
      gameData: resultData.originalGameData,
      originalGameData: resultData.originalGameData,
      masterGameData: resultData.masterGameData,
    };
  }

  // Set the replay data in context for initializeGame to use
  setContextData(replayData);

  navigateToPage("game-page");
}
