import {
  navigateToPage,
  setContextData,
  getCurrentContext,
  getContextData,
} from "../navigation.js";
import gameData from "./data.js";
import {
  resetProgressBar,
  resetGameState,
  gameState,
  domCache,
} from "./utils.js";
import { setCurrentGame, getCurrentGame } from "./navigation.js";

// ============================================================================
//  GAME PLAY
//  Core game functionality including:
//  - Game initialization and setup
//  - Game controls (start, pause, stop)
//  - Timer and countdown management
//  - Item display and progression
//  - Settings and configuration
//  - Screen wake lock integration
// ============================================================================

/**
 * Toggles the vibration setting and saves it to localStorage
 */
export function toggleVibrationSetting() {
  gameState.vibrationEnabled =
    document.getElementById("vibration-setting").checked;
  // Save setting to localStorage
  localStorage.setItem("vibrationEnabled", gameState.vibrationEnabled);
}

/**
 * Updates the learning mode state when checkbox changes
 */
export function updateLearningMode() {
  gameState.isLearningMode = document.getElementById("learning-mode").checked;
  // Update button states when learning mode changes
  updateButtonStates();
  // If game is not running, update the initial display
  if (!gameState.isGameRunning) {
    updateInitialDisplay();
  }
}

/**
 * Loads game-related settings from localStorage
 */
export function loadGameSettings() {
  // Load vibration setting from localStorage
  const savedVibrationSetting = localStorage.getItem("vibrationEnabled");
  if (savedVibrationSetting !== null) {
    gameState.vibrationEnabled = savedVibrationSetting === "true";
    const vibrationCheckbox = document.getElementById("vibration-setting");
    if (vibrationCheckbox) {
      vibrationCheckbox.checked = gameState.vibrationEnabled;
    }
  }

  // Initialize learning mode state from checkbox
  const learningModeCheckbox = document.getElementById("learning-mode");
  if (learningModeCheckbox) {
    gameState.isLearningMode = learningModeCheckbox.checked;
  }
}

/**
 * Updates the initial display when game is not running
 */
export function updateInitialDisplay() {
  if (!gameState.currentGameData.length) {
    document.getElementById("current-item").textContent = "---";
    document.getElementById("solution-display").textContent = "---";
    document.getElementById("solution-display").classList.add("visible");
    return;
  }

  const currentItem = gameState.currentGameData[0];
  if (!currentItem || !currentItem[0]) {
    document.getElementById("current-item").textContent = "---";
    document.getElementById("solution-display").textContent = "---";
    return;
  }

  document.getElementById("current-item").textContent = currentItem[0];
  const solutionDisplay = document.getElementById("solution-display");
  solutionDisplay.classList.add("visible");
  if (gameState.isLearningMode) {
    solutionDisplay.textContent = currentItem[1];
  } else {
    solutionDisplay.textContent = "•••";
  }
}

/**
 * Updates the state of all game control buttons based on current game state
 */
export function updateButtonStates() {
  // Use cached DOM elements where possible
  const playBtn = domCache.playBtn || document.getElementById("play-btn");
  const pauseBtn = domCache.pauseBtn || document.getElementById("pause-btn");
  const stopBtn = domCache.stopBtn || document.getElementById("stop-btn");
  const showBtn = domCache.showBtn || document.getElementById("show-btn");
  const nextBtn = domCache.nextBtn || document.getElementById("next-btn");
  const fromInput = document.getElementById("from-input");
  const toInput = document.getElementById("to-input");
  const fromDropdown = document.getElementById("from-dropdown");
  const toDropdown = document.getElementById("to-dropdown");
  const timeInput = document.getElementById("time-input");
  const learningModeCheckbox = document.getElementById("learning-mode");
  const learningModeLabel = learningModeCheckbox?.closest(".checkbox-label");

  // Batch DOM updates to reduce reflows
  const updateBatch = () => {
    // Always show all control buttons
    if (playBtn) playBtn.classList.add("visible");
    if (pauseBtn) pauseBtn.classList.add("visible");
    if (stopBtn) stopBtn.classList.add("visible");

    if (gameState.isGameRunning) {
      // During game: disable play, enable pause/stop, disable inputs
      if (playBtn) playBtn.disabled = true;
      if (pauseBtn) pauseBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = false;

      // Disable game configuration inputs during play
      if (fromInput) fromInput.disabled = true;
      if (toInput) toInput.disabled = true;
      if (fromDropdown) fromDropdown.disabled = true;
      if (toDropdown) toDropdown.disabled = true;
      if (timeInput) timeInput.disabled = true;
      if (learningModeCheckbox) learningModeCheckbox.disabled = true;
      if (learningModeLabel) learningModeLabel.classList.add("disabled");

      // In learning mode, disable "Visa" button since answer is always shown
      // Also disable if answer is already shown for current item
      if (showBtn)
        showBtn.disabled =
          gameState.isLearningMode || gameState.showingSolution;
      if (nextBtn) nextBtn.disabled = false;
    } else if (gameState.paused) {
      // During pause: enable play/stop, disable pause, disable inputs
      if (playBtn) playBtn.disabled = false;
      if (pauseBtn) pauseBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;

      // Keep inputs disabled during pause
      if (fromInput) fromInput.disabled = true;
      if (toInput) toInput.disabled = true;
      if (fromDropdown) fromDropdown.disabled = true;
      if (toDropdown) toDropdown.disabled = true;
      if (timeInput) timeInput.disabled = true;
      if (learningModeCheckbox) learningModeCheckbox.disabled = true;
      if (learningModeLabel) learningModeLabel.classList.add("disabled");

      // Action buttons during pause - enable NÄSTA to resume, disable VISA
      if (showBtn) showBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = false;
    } else {
      // Game stopped: enable play, disable pause/stop, enable inputs
      if (playBtn) playBtn.disabled = false;
      if (pauseBtn) pauseBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;

      // Enable game configuration inputs when stopped
      if (fromInput) fromInput.disabled = false;
      if (toInput) toInput.disabled = false;
      if (fromDropdown) fromDropdown.disabled = false;
      if (toDropdown) toDropdown.disabled = false;
      if (timeInput) timeInput.disabled = false;
      if (learningModeCheckbox) learningModeCheckbox.disabled = false;
      if (learningModeLabel) learningModeLabel.classList.remove("disabled");

      // Action buttons disabled when stopped
      if (showBtn) showBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    }
  };

  // Execute the batched updates
  updateBatch();
}

/**
 * Hides range control inputs for special game modes
 */
export function hideRangeControls() {
  // Hide both input and dropdown controls for range selection

  // Hide the control groups that contain the range inputs
  const controlGroups = document.querySelectorAll(".control-group");
  controlGroups.forEach((group) => {
    const label = group.querySelector("label");
    if (
      label &&
      (label.textContent.includes("Från:") ||
        label.textContent.includes("Till:"))
    ) {
      group.classList.add("hidden");
    }
  });
}

/**
 * Shows range control inputs for normal game modes
 */
export function showRangeControls() {
  // Show both input and dropdown controls for range selection
  const controlGroups = document.querySelectorAll(".control-group");
  controlGroups.forEach((group) => {
    const label = group.querySelector("label");
    if (
      label &&
      (label.textContent.includes("Från:") ||
        label.textContent.includes("Till:"))
    ) {
      group.classList.remove("hidden");
    }
  });
}

/**
 * Initializes a game with the selected settings and data
 */
export function initializeGame() {
  const currentGameId = getCurrentGame();
  const contextData = getContextData();

  // Check if we're in replay mode with specific data
  if (contextData && contextData.replayType) {
    // Handle replay mode - use data from context
    gameState.currentGameData = [...contextData.gameData];
    gameState.originalGameData = [...contextData.originalGameData];
    gameState.masterGameData = [...contextData.masterGameData];
    gameState.currentItemIndex = 0;
    gameState.showingSolution = false;
    gameState.gameResults = [];
    gameState.currentItemStartTime = null;

    // Reset game state to stopped
    gameState.isGameRunning = false;
    gameState.hasStarted = false;
    gameState.paused = false;

    // Reset timer state completely
    if (gameState.countdownTimer) {
      cancelAnimationFrame(gameState.countdownTimer);
      gameState.countdownTimer = null;
    }
    gameState.pausedCountdownValue = null;
    gameState.countdownValue = 0;

    // Set learning mode based on replay type
    const learningModeCheckbox = document.getElementById("learning-mode");
    if (contextData.replayType === "slow") {
      // Hide range controls for slow replay
      hideRangeControls();

      // Enable learning mode for slow replay
      if (learningModeCheckbox) {
        learningModeCheckbox.checked = true;
        gameState.isLearningMode = true;
      }
    } else {
      // Show range controls for regular replay
      showRangeControls();

      // Keep current learning mode setting for full replay
      if (learningModeCheckbox) {
        gameState.isLearningMode = learningModeCheckbox.checked;
      }
    }

    // Update initial display and exit early
    updateInitialDisplay();
    updateButtonStates();
    return;
  }

  if (!currentGameId || !gameData[currentGameId]) {
    return;
  }

  // Skip initialization if we're in replay mode (contextData indicates replay)
  if (contextData && contextData.replayType) {
    return;
  }

  const game = gameData[currentGameId];
  gameState.currentGameData = [...game.data];
  gameState.currentItemIndex = 0;
  gameState.showingSolution = false;
  gameState.gameResults = [];
  gameState.currentItemStartTime = null;

  // Ensure range controls are visible for normal game initialization
  showRangeControls();

  // Handle dropdown vs input controls
  const useDropdown = game.dropdown || false;
  const fromInput = document.getElementById("from-input");
  const toInput = document.getElementById("to-input");
  const fromDropdown = document.getElementById("from-dropdown");
  const toDropdown = document.getElementById("to-dropdown");

  if (!fromInput || !toInput || !fromDropdown || !toDropdown) {
    return; // Elements not found
  }

  // Remove any existing event listeners by cloning and replacing elements
  const newFromInput = fromInput.cloneNode(true);
  const newToInput = toInput.cloneNode(true);
  fromInput.parentNode.replaceChild(newFromInput, fromInput);
  toInput.parentNode.replaceChild(newToInput, toInput);

  if (useDropdown) {
    // Show dropdowns, hide inputs
    newFromInput.classList.add("hidden");
    newToInput.classList.add("hidden");
    fromDropdown.classList.remove("hidden");
    toDropdown.classList.remove("hidden");

    // Populate dropdown options
    populateDropdowns(game.data);

    // Set default values to first and last items
    fromDropdown.value = "0";
    toDropdown.value = (gameState.currentGameData.length - 1).toString();
  } else {
    // Show inputs, hide dropdowns
    newFromInput.classList.remove("hidden");
    newToInput.classList.remove("hidden");
    fromDropdown.classList.add("hidden");
    toDropdown.classList.add("hidden");

    // Set default range for numeric data
    newFromInput.value = 0;
    // Set "Till" to "Från + 9", but not exceeding the data length
    const defaultToValue = Math.min(
      0 + 9,
      gameState.currentGameData.length - 1
    );
    newToInput.value = defaultToValue;

    // Add event listeners to ensure "Från" comes before "Till" for numeric inputs
    newFromInput.addEventListener("change", function () {
      const fromValue = parseInt(this.value) || 0;
      // Automatically set "Till" to "Från + 9", but not exceeding the data length
      const newToValue = Math.min(
        fromValue + 9,
        gameState.currentGameData.length - 1
      );
      newToInput.value = newToValue;

      // Update current-item display to show the new "from" item when game is not running
      if (
        !gameState.isGameRunning &&
        gameState.currentGameData.length > fromValue
      ) {
        const newCurrentItem = gameState.currentGameData[fromValue];
        document.getElementById("current-item").textContent = newCurrentItem[0];

        // Also update solution display based on learning mode
        const solutionDisplay = document.getElementById("solution-display");
        if (gameState.isLearningMode) {
          solutionDisplay.textContent = newCurrentItem[1];
        } else {
          solutionDisplay.textContent = "•••";
        }
      }
    });

    newToInput.addEventListener("change", function () {
      const fromValue = parseInt(newFromInput.value) || 0;
      const toValue =
        parseInt(this.value) || gameState.currentGameData.length - 1;

      // If "Till" is less than "Från", update "Från" to be equal to "Till"
      if (toValue < fromValue) {
        newFromInput.value = toValue;
      }
    });

    // Add event listener for time input to update countdown display
    const timeInput = document.getElementById("time-input");
    if (timeInput) {
      const newTimeInput = timeInput.cloneNode(true);
      timeInput.parentNode.replaceChild(newTimeInput, timeInput);

      newTimeInput.addEventListener("change", function () {
        // No special handling needed when time changes
      });
    }
  }

  // Only show initial display if not running
  if (!gameState.isGameRunning) updateInitialDisplay();
  updateButtonStates();
}

/**
 * Populates dropdown menus with data from the current game
 * @param {Array} data - The game data array to populate dropdowns with
 */
export function populateDropdowns(data) {
  const fromDropdown = document.getElementById("from-dropdown");
  const toDropdown = document.getElementById("to-dropdown");

  if (!fromDropdown || !toDropdown) return;

  // Clear existing options
  fromDropdown.innerHTML = "";
  toDropdown.innerHTML = "";

  // Remove existing event listeners by cloning and replacing elements
  const newFromDropdown = fromDropdown.cloneNode(false);
  const newToDropdown = toDropdown.cloneNode(false);
  newFromDropdown.id = fromDropdown.id;
  newFromDropdown.className = fromDropdown.className;
  newToDropdown.id = toDropdown.id;
  newToDropdown.className = toDropdown.className;

  fromDropdown.parentNode.replaceChild(newFromDropdown, fromDropdown);
  toDropdown.parentNode.replaceChild(newToDropdown, toDropdown);

  // Add options for each data item
  data.forEach((item, index) => {
    const optionFrom = document.createElement("option");
    optionFrom.value = index.toString();
    optionFrom.textContent = item[0]; // Use the key (first element) as display text
    newFromDropdown.appendChild(optionFrom);

    const optionTo = document.createElement("option");
    optionTo.value = index.toString();
    optionTo.textContent = item[0];
    newToDropdown.appendChild(optionTo);
  });

  // Add event listeners to ensure "Från" comes before "Till"
  newFromDropdown.addEventListener("change", function () {
    const fromIndex = parseInt(this.value);
    const toIndex = parseInt(newToDropdown.value);

    // If "Från" is greater than or equal to "Till", update "Till" to be after "Från"
    if (fromIndex >= toIndex) {
      newToDropdown.value = Math.min(fromIndex + 1, data.length - 1).toString();
    }

    // Update current-item display to show the new "from" item when game is not running
    if (!gameState.isGameRunning && data.length > fromIndex) {
      const newCurrentItem = data[fromIndex];
      document.getElementById("current-item").textContent = newCurrentItem[0];

      // Also update solution display based on learning mode
      const solutionDisplay = document.getElementById("solution-display");
      if (gameState.isLearningMode) {
        solutionDisplay.textContent = newCurrentItem[1];
      } else {
        solutionDisplay.textContent = "•••";
      }
    }
  });

  newToDropdown.addEventListener("change", function () {
    const fromIndex = parseInt(newFromDropdown.value);
    const toIndex = parseInt(this.value);

    // If "Till" is less than or equal to "Från", update "Från" to be before "Till"
    if (toIndex <= fromIndex) {
      newFromDropdown.value = Math.max(toIndex - 1, 0).toString();
    }
  });

  // Set default values: first item for "Från", last item for "Till"
  newFromDropdown.value = "0";
  newToDropdown.value = (data.length - 1).toString();
}

/**
 * Starts a new game or resumes a paused game
 */
export function startGame() {
  if (gameState.paused) {
    // Resume paused game
    gameState.isGameRunning = true;
    gameState.paused = false;

    // Adjust currentItemStartTime to account for paused time
    if (gameState.currentItemStartTime) {
      gameState.currentItemStartTime = Date.now() - gameState.pausedTime;
    }

    // Activate wake lock when resuming
    if (window.activateScreenWakeLock) {
      window.activateScreenWakeLock();
    }

    showCurrentItem(true); // Resume with existing countdown
    updateButtonStates();
    return;
  }

  // If we have no data or empty data, initialize the game first
  if (!gameState.currentGameData.length) {
    initializeGame();
    if (!gameState.currentGameData.length) {
      return;
    }
  }

  continueStartGame();
}

function continueStartGame() {
  gameState.isGameRunning = true;
  gameState.hasStarted = true;
  gameState.paused = false;
  gameState.gameStartTime = Date.now();

  // Reset progress bar on NÄSTA button for fresh start
  resetProgressBar(domCache);

  // Filter data based on range (only applies to normal games, not replays)
  const currentGameId = getCurrentGame();
  const game = gameData[currentGameId];
  const useDropdown = game.dropdown || false;

  let fromIndex, toIndex;
  if (useDropdown) {
    fromIndex = parseInt(document.getElementById("from-dropdown")?.value) || 0;
    toIndex =
      parseInt(document.getElementById("to-dropdown")?.value) ||
      gameState.currentGameData.length - 1;
  } else {
    fromIndex = parseInt(document.getElementById("from-input")?.value) || 0;
    toIndex =
      parseInt(document.getElementById("to-input")?.value) ||
      gameState.currentGameData.length - 1;
  }

  // Ensure indices are within bounds
  fromIndex = Math.max(0, fromIndex);
  toIndex = Math.min(gameState.currentGameData.length - 1, toIndex);

  const filteredData = gameState.currentGameData.slice(fromIndex, toIndex + 1);
  gameState.currentGameData = filteredData;

  // Set originalGameData and masterGameData for potential replays
  if (!gameState.originalGameData.length) {
    gameState.originalGameData = [...filteredData]; // Save the original filtered data
  }
  if (!gameState.masterGameData.length) {
    gameState.masterGameData = [...filteredData]; // Save the master copy that never changes
  }

  // Initialize results tracking
  gameState.gameResults = [];
  gameState.currentItemStartTime = null;
  gameState.pausedTime = 0; // Reset paused time for new game

  // Shuffle data only if NOT in learning mode
  if (!gameState.isLearningMode) {
    for (let i = gameState.currentGameData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameState.currentGameData[i], gameState.currentGameData[j]] = [
        gameState.currentGameData[j],
        gameState.currentGameData[i],
      ];
    }
  }
  gameState.currentItemIndex = 0;
  // Only call showCurrentItem to handle display logic
  showCurrentItem();
  updateButtonStates();

  // Activate wake lock when starting new game
  if (window.activateScreenWakeLock) {
    window.activateScreenWakeLock();
  }

  // Countdown will start automatically in showCurrentItem() if not in learning mode
}

/**
 * Pauses the current game and saves its state
 */
export function pauseGame() {
  gameState.isGameRunning = false;
  gameState.paused = true;
  // Cancel animation frame instead of clearing interval
  if (gameState.countdownTimer) {
    cancelAnimationFrame(gameState.countdownTimer);
    gameState.countdownTimer = null; // Ensure timer is completely stopped
  }
  gameState.pausedCountdownValue = gameState.countdownValue; // Save remaining time

  // Save the time spent on current item before pausing
  if (gameState.currentItemStartTime) {
    gameState.pausedTime += Date.now() - gameState.currentItemStartTime;
  }

  // Pause progress bar by maintaining current state
  // No need to remove progress-bar class, just stop updating

  // Deactivate wake lock when pausing
  if (window.deactivateScreenWakeLock) {
    window.deactivateScreenWakeLock();
  }

  updateButtonStates();
}

/**
 * Prepares result data for passing to the results page
 */
function prepareResultData(gameState, getCurrentGame, gameData) {
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

/**
 * Stops the current game and optionally shows results
 */
export function stopGame() {
  // Record current item result if game is running/paused and we have a start time
  if (
    (gameState.isGameRunning || gameState.paused) &&
    gameState.currentItemStartTime &&
    gameState.currentItemIndex < gameState.currentGameData.length
  ) {
    const currentItem = gameState.currentGameData[gameState.currentItemIndex];
    const totalTimeSpent =
      (Date.now() - gameState.currentItemStartTime + gameState.pausedTime) /
      1000;
    const timeSpent = Math.max(0.1, totalTimeSpent); // Minimum 0.1 seconds

    gameState.gameResults.push({
      figurkod: currentItem[0],
      answer: currentItem[1],
      timeSpent: timeSpent,
      showedAnswer: gameState.showingSolution, // True if answer was already shown
    });
  }

  // If game has started and we have results, show them (but not in learning mode)
  const shouldShowResults =
    gameState.hasStarted &&
    gameState.gameResults.length > 0 &&
    !gameState.isLearningMode;

  gameState.isGameRunning = false;
  gameState.hasStarted = false;
  gameState.paused = false;
  gameState.pausedCountdownValue = null;
  clearTimeout(gameState.gameTimer);
  // Cancel animation frame instead of clearing interval
  if (gameState.countdownTimer) {
    cancelAnimationFrame(gameState.countdownTimer);
    gameState.countdownTimer = null;
  }
  gameState.countdownValue = 0;
  gameState.currentItemIndex = 0;
  gameState.showingSolution = false;
  gameState.currentItemStartTime = null;

  // Reset progress bar on NÄSTA button
  resetProgressBar(domCache);

  // Only show initial display if not running
  if (!gameState.isGameRunning) updateInitialDisplay();

  updateButtonStates();

  // Deactivate wake lock when stopping game
  if (window.deactivateScreenWakeLock) {
    window.deactivateScreenWakeLock();
  }

  // Navigate to results if we should show them
  if (shouldShowResults) {
    const resultData = prepareResultData(gameState, getCurrentGame, gameData);
    setContextData(resultData);
    navigateToPage("results-page");
  }
}

/**
 * Displays the current item in the game and manages timing
 * @param {boolean} resume - Whether this is resuming from a pause
 */
export function showCurrentItem(resume = false) {
  if (gameState.currentItemIndex >= gameState.currentGameData.length) {
    stopGame();
    return;
  }
  const currentItem = gameState.currentGameData[gameState.currentItemIndex];
  (
    domCache.currentItem || document.getElementById("current-item")
  ).textContent = currentItem[0];

  // Always start timing for this item when game is running, unless resuming
  if (gameState.isGameRunning && !resume) {
    gameState.currentItemStartTime = Date.now();
    gameState.pausedTime = 0; // Reset paused time for new item
  }

  const solutionDisplay =
    domCache.solutionDisplay || document.getElementById("solution-display");
  if (solutionDisplay) {
    solutionDisplay.classList.add("visible");
  }

  // Reset showingSolution for new item unless in learning mode
  if (!gameState.isLearningMode && !resume) {
    gameState.showingSolution = false;
  }

  if (gameState.isLearningMode || gameState.showingSolution) {
    if (solutionDisplay) {
      solutionDisplay.textContent = currentItem[1];
    }
  } else {
    if (solutionDisplay) {
      solutionDisplay.textContent = "•••";
    }
  }

  if (gameState.isLearningMode) {
    gameState.showingSolution = true;
    if (gameState.isGameRunning) {
      startCountdown(resume);
    }
  } else {
    if (gameState.isGameRunning) {
      startCountdown(resume);
    }
  }

  // Update button states based on current game state
  updateButtonStates();
}

/**
 * Starts the countdown timer for the current item
 * @param {boolean} resume - Whether this is resuming from a pause
 */
export function startCountdown(resume = false) {
  const timeInput = document.getElementById("time-input");
  const timeLimit =
    parseInt(timeInput?.value) || parseInt(timeInput?.defaultValue) || 5;

  gameState.totalCountdownTime = timeLimit;
  // Only reset countdownValue if not resuming
  if (!resume) {
    gameState.countdownValue = timeLimit;
  } else if (gameState.pausedCountdownValue !== null) {
    gameState.countdownValue = gameState.pausedCountdownValue;
    gameState.pausedCountdownValue = null;
  }

  // Use cached DOM elements
  if (!domCache.nextBtn) return;

  // Add progress bar class to NÄSTA button
  domCache.nextBtn.classList.add("progress-bar");

  // Set initial progress bar on NÄSTA button
  const progressPercentage =
    ((gameState.totalCountdownTime - gameState.countdownValue) /
      gameState.totalCountdownTime) *
    100;
  if (domCache.progressBar) {
    domCache.progressBar.style.setProperty(
      "--progress",
      `${progressPercentage}%`
    );
  }

  let lastUpdateTime = Date.now();
  const countdownStep = () => {
    if (!gameState.isGameRunning || gameState.paused) return; // Prevent advancing if paused

    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000; // Convert to seconds
    lastUpdateTime = now;

    gameState.countdownValue -= deltaTime;

    if (gameState.countdownValue <= 0) {
      // Cancel animation frame instead of clearing interval
      if (gameState.countdownTimer) {
        cancelAnimationFrame(gameState.countdownTimer);
        gameState.countdownTimer = null;
      }
      // Remove progress bar class when countdown ends
      domCache.nextBtn.classList.remove("progress-bar");

      if (gameState.isGameRunning && !gameState.paused) {
        // Record timeout result before advancing with exact time limit
        if (
          gameState.currentItemStartTime &&
          gameState.currentItemIndex < gameState.currentGameData.length
        ) {
          const currentItem =
            gameState.currentGameData[gameState.currentItemIndex];
          const timeSpent = gameState.totalCountdownTime; // Use exact time limit instead of actual elapsed time

          gameState.gameResults.push({
            figurkod: currentItem[0],
            answer: currentItem[1],
            timeSpent: timeSpent,
            showedAnswer: false, // User didn't get to see the answer
          });
          gameState.currentItemStartTime = null;
        }

        // Advance directly to next item without showing answer
        nextItem(gameState.isLearningMode); // Vibrate on auto-advance in learning mode
      }
      return;
    }

    // Update progress bar on NÄSTA button
    const progressPercentage = Math.round(
      ((gameState.totalCountdownTime - gameState.countdownValue) /
        gameState.totalCountdownTime) *
        100
    );

    if (domCache.progressBar) {
      domCache.progressBar.style.setProperty(
        "--progress",
        `${progressPercentage}%`
      );
    }

    // Continue animation
    gameState.countdownTimer = requestAnimationFrame(countdownStep);
  };

  // Start the countdown animation
  gameState.countdownTimer = requestAnimationFrame(countdownStep);
}

/**
 * Shows the answer for the current item and records the action
 */
export function showAnswer() {
  if (gameState.currentItemIndex >= gameState.currentGameData.length) return;

  // Cancel animation frame instead of clearing interval
  if (gameState.countdownTimer) {
    cancelAnimationFrame(gameState.countdownTimer);
    gameState.countdownTimer = null;
  }

  const currentItem = gameState.currentGameData[gameState.currentItemIndex];
  const solutionDisplay = document.getElementById("solution-display");
  if (solutionDisplay) {
    solutionDisplay.textContent = currentItem[1];
    solutionDisplay.classList.add("visible");
  }
  gameState.showingSolution = true;

  // Record that user needed to see the answer
  if (gameState.currentItemStartTime) {
    const timeSpent = Math.max(
      0.1,
      (Date.now() - gameState.currentItemStartTime) / 1000
    ); // Minimum 0.1 seconds
    gameState.gameResults.push({
      figurkod: currentItem[0],
      answer: currentItem[1],
      timeSpent: timeSpent,
      showedAnswer: true,
    });
    // Clear the start time to prevent duplicate recording
    gameState.currentItemStartTime = null;
  }

  // Deactivate wake lock when user shows answer (timing challenge ends)
  if (window.deactivateScreenWakeLock) {
    window.deactivateScreenWakeLock();
  }

  // Update button states after showing answer
  updateButtonStates();
}

/**
 * Advances to the next item in the game
 * @param {boolean} vibrate - Whether to vibrate the device (for auto-advance)
 */
export function nextItem(vibrate = false) {
  // If game is paused, resume and advance to next item
  if (gameState.paused) {
    // Resume the game first
    gameState.isGameRunning = true;
    gameState.paused = false;

    // Adjust currentItemStartTime to account for paused time
    if (gameState.currentItemStartTime) {
      gameState.currentItemStartTime = Date.now() - gameState.pausedTime;
    }

    // Activate wake lock when resuming
    if (window.activateScreenWakeLock) {
      window.activateScreenWakeLock();
    }

    // Update button states to reflect resumed game
    updateButtonStates();

    // Continue with normal nextItem logic
  } else if (!gameState.isGameRunning) {
    return; // Prevent advancing if game is not running and not paused
  }

  // Remove progress bar class when manually advancing
  resetProgressBar(domCache);

  // Vibrate device for 100ms on auto-advance in learning mode (if enabled)
  if (
    gameState.vibrationEnabled &&
    navigator.vibrate &&
    gameState.isLearningMode &&
    vibrate
  ) {
    navigator.vibrate(100);
    console.log("Vibration triggered");
  }

  // Record result for current item if not already recorded (i.e., user pressed NEXT)
  if (
    gameState.currentItemStartTime &&
    gameState.currentItemIndex < gameState.currentGameData.length
  ) {
    const currentItem = gameState.currentGameData[gameState.currentItemIndex];
    const totalTimeSpent =
      (Date.now() - gameState.currentItemStartTime + gameState.pausedTime) /
      1000;
    const timeSpent = Math.max(0.1, totalTimeSpent); // Minimum 0.1 seconds

    gameState.gameResults.push({
      figurkod: currentItem[0],
      answer: currentItem[1],
      timeSpent: timeSpent,
      showedAnswer: gameState.showingSolution, // True if answer was shown before NEXT was pressed
    });
    gameState.currentItemStartTime = null;
  }

  // Stop the current countdown timer before advancing
  if (gameState.countdownTimer) {
    cancelAnimationFrame(gameState.countdownTimer);
    gameState.countdownTimer = null;
  }

  gameState.currentItemIndex++;

  if (gameState.currentItemIndex >= gameState.currentGameData.length) {
    if (gameState.isLearningMode) {
      // In learning mode, loop back to the beginning
      gameState.currentItemIndex = 0;
      showCurrentItem();
      return;
    } else {
      // In practice mode, navigate to results
      const resultData = prepareResultData(gameState, getCurrentGame, gameData);
      setContextData(resultData);
      navigateToPage("results-page");
      stopGame();
      return;
    }
  }

  showCurrentItem();

  // Auto-advance will continue automatically in showCurrentItem()
}
