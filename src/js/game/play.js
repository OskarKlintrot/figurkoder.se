import {
  setContextData,
  getCurrentContext,
  getContextData,
  updateHeader,
  registerPageEnterCallback,
  registerContextChangeCallback,
} from "../navigation.js";
import gameData from "./data.js";

// Cache frequently accessed DOM elements to reduce queries
const domCache = {
  nextBtn: null,
  progressBar: null,
  currentItem: null,
  solutionDisplay: null,
  playBtn: null,
  pauseBtn: null,
  stopBtn: null,
  replayBtn: null,
  showBtn: null,
  learningModeCheckbox: null,
  vibrationCheckbox: null,
  fromInput: null,
  toInput: null,
  fromDropdown: null,
  toDropdown: null,
  timeInput: null,
  roundsInput: null,
  init() {
    this.nextBtn = document.getElementById("next-btn");
    this.progressBar = this.nextBtn?.querySelector(".btn-progress-bar");
    this.currentItem = document.getElementById("current-item");
    this.solutionDisplay = document.getElementById("solution-display");
    this.playBtn = document.getElementById("play-btn");
    this.pauseBtn = document.getElementById("pause-btn");
    this.stopBtn = document.getElementById("stop-btn");
    this.replayBtn = document.getElementById("replay-btn");
    this.showBtn = document.getElementById("show-btn");
    this.learningModeCheckbox = document.getElementById("learning-mode");
    this.vibrationCheckbox = document.getElementById("vibration-setting");
    this.fromInput = document.getElementById("from-input");
    this.toInput = document.getElementById("to-input");
    this.fromDropdown = document.getElementById("from-dropdown");
    this.toDropdown = document.getElementById("to-dropdown");
    this.timeInput = document.getElementById("time-input");
    this.roundsInput = document.getElementById("rounds-input");
  },
};

// Game state object
const gameState = {
  currentGameDataSet: [],
  fullGameDataSet: [], // Unfiltered full set
  rangeStart: 0,
  rangeEnd: 0,
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
  vibrationEnabled: true,
  isLearningMode: false,
  rounds: 1,
  currentRound: 1,
};

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
 * Resets the progress bar to 0% and removes progress bar styling
 */
function resetProgressBar() {
  // Temporarily remove transition to avoid layout issues during reset
  domCache.progressBar.style.transition = "none";
  domCache.progressBar.style.setProperty("--progress", "0%");
  // Restore transition on the next animation frame to avoid forced reflow
  requestAnimationFrame(() => {
    domCache.progressBar.style.transition = "";
  });
  domCache.nextBtn.classList.remove("progress-bar");
}

/**
 * Resets all game state variables and UI elements to their default values
 */
function resetGameState() {
  // Always stop any running game and clean up timers/wake locks
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

  // Check if we're in replay mode - if so, only do essential cleanup above
  const contextData = getContextData();
  if (contextData && contextData.replayType) {
    // Still reset running state even in replay mode
    gameState.isGameRunning = false;
    gameState.paused = false;
    gameState.gameTimer = null;
    gameState.countdownTimer = null;

    // Clear context data when navigating away to prevent replay mode persistence
    setContextData(null);
    return;
  }

  // Reset all game state variables to initial values
  gameState.currentGameDataSet = [];
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
  gameState.rounds = 1;
  gameState.currentRound = 1;
  // Note: vibrationEnabled is kept as it's a user setting

  // Reset UI elements to default state
  resetProgressBar();

  // Reset display elements
  domCache.currentItem.textContent = "---";
  domCache.solutionDisplay.textContent = "---";

  // Reset learning mode to default (unchecked)
  domCache.learningModeCheckbox.checked = false;
  gameState.isLearningMode = false;
}

/**
 * MutationObserver to watch for changes to the game page's active class
 * Resets game state when the page becomes inactive
 */
let gamePageObserver = null;

/**
 * Sets up the MutationObserver to watch for game page active state changes
 */
function setupGamePageObserver() {
  // Only set up once per session
  if (gamePageObserver) {
    return;
  }

  gamePageObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        const target = mutation.target;
        const hasActive = target.classList.contains("active");
        if (!hasActive) {
          resetGameState();
        }
      }
    });
  });

  const gamePage = document.getElementById("game-page");

  gamePageObserver.observe(gamePage, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

/**
 * Toggles the vibration setting and saves it to localStorage
 */
export function toggleVibrationSetting() {
  gameState.vibrationEnabled = domCache.vibrationCheckbox.checked;
  // Save setting to localStorage
  localStorage.setItem("vibrationEnabled", gameState.vibrationEnabled);
}

/**
 * Updates the learning mode state when checkbox changes
 */
export function updateLearningMode() {
  gameState.isLearningMode = domCache.learningModeCheckbox.checked;
  updateButtonStates();
  // Use currentItemIndex if game is running/paused, otherwise use 'Från' value
  let index;
  if (gameState.isGameRunning || gameState.paused) {
    index = gameState.currentItemIndex;
  } else {
    // Use 'Från' value from dropdown or input
    if (
      domCache.fromDropdown &&
      !domCache.fromDropdown.classList.contains("hidden")
    ) {
      index = parseInt(domCache.fromDropdown.value) || 0;
    } else if (
      domCache.fromInput &&
      !domCache.fromInput.classList.contains("hidden")
    ) {
      index = parseInt(domCache.fromInput.value) || 0;
    } else {
      index = 0;
    }
  }
  if (index < 0 || index >= gameState.currentGameDataSet.length) {
    index = 0;
  }
  if (gameState.currentGameDataSet.length > 0) {
    const currentItem = gameState.currentGameDataSet[index];
    domCache.currentItem.textContent = currentItem[0];
    domCache.solutionDisplay.classList.add("visible");
    if (gameState.isLearningMode) {
      domCache.solutionDisplay.textContent = currentItem[1];
    } else {
      domCache.solutionDisplay.textContent = "•••";
    }
  } else {
    domCache.currentItem.textContent = "---";
    domCache.solutionDisplay.textContent = "---";
    domCache.solutionDisplay.classList.add("visible");
  }
}

/**
 * Loads game-related settings from localStorage
 */
export function loadGameSettings() {
  // Ensure DOM cache is initialized before accessing cached elements
  domCache.init();
  // Load vibration setting from localStorage
  const savedVibrationSetting = localStorage.getItem("vibrationEnabled");
  if (savedVibrationSetting !== null) {
    gameState.vibrationEnabled = savedVibrationSetting === "true";
    domCache.vibrationCheckbox.checked = gameState.vibrationEnabled;
  }
  // Initialize learning mode state from checkbox
  gameState.isLearningMode = domCache.learningModeCheckbox.checked;
}

/**
 * Updates the initial display when game is not running
 */
export function updateInitialDisplay() {
  if (!gameState.currentGameDataSet.length) {
    domCache.currentItem.textContent = "---";
    domCache.solutionDisplay.textContent = "---";
    domCache.solutionDisplay.classList.add("visible");
    return;
  }
  // Use rangeStart for initial display if set, otherwise default to 0
  let initialIndex = 0;
  if (
    typeof gameState.rangeStart === "number" &&
    gameState.rangeStart >= 0 &&
    gameState.rangeStart < gameState.currentGameDataSet.length
  ) {
    initialIndex = gameState.rangeStart;
  }
  const currentItem = gameState.currentGameDataSet[initialIndex];
  if (!currentItem || !currentItem[0]) {
    domCache.currentItem.textContent = "---";
    domCache.solutionDisplay.textContent = "---";
    return;
  }
  domCache.currentItem.textContent = currentItem[0];
  domCache.solutionDisplay.classList.add("visible");
  if (gameState.isLearningMode) {
    domCache.solutionDisplay.textContent = currentItem[1];
  } else {
    domCache.solutionDisplay.textContent = "•••";
  }
}

/**
 * Updates the state of all game control buttons based on current game state
 */
export function updateButtonStates() {
  // Use domCache properties directly
  const learningModeLabel =
    domCache.learningModeCheckbox.closest(".checkbox-label");
  const contextData = getContextData();

  // Batch DOM updates to reduce reflows
  const updateBatch = () => {
    // Always show play and pause buttons (remove 'hidden' if present)
    domCache.playBtn.classList.remove("hidden");
    domCache.pauseBtn.classList.remove("hidden");

    // Special handling for replay slow mode
    const isReplaySlow = contextData && contextData.replayType === "slow";

    if (isReplaySlow) {
      domCache.replayBtn.classList.remove("hidden");
    } else {
      domCache.replayBtn.classList.add("hidden");
    }

    if (gameState.isGameRunning) {
      // During game: disable play, enable pause/stop, disable inputs
      domCache.playBtn.disabled = true;
      domCache.pauseBtn.disabled = false;
      domCache.stopBtn.disabled = false;

      // Disable game configuration inputs during play
      domCache.fromInput.disabled = true;
      domCache.toInput.disabled = true;
      domCache.fromDropdown.disabled = true;
      domCache.toDropdown.disabled = true;
      domCache.timeInput.disabled = true;
      domCache.roundsInput.disabled = true;
      domCache.learningModeCheckbox.disabled = true;
      if (learningModeLabel) {
        learningModeLabel.classList.add("disabled");
      }

      // In learning mode, disable "Visa" button since answer is always shown
      // Also disable if answer is already shown for current item
      domCache.showBtn.disabled =
        gameState.isLearningMode || gameState.showingSolution;
      domCache.nextBtn.disabled = false;
    } else if (gameState.paused) {
      // During pause: enable play/stop, disable pause, disable inputs
      domCache.playBtn.disabled = false;
      domCache.pauseBtn.disabled = true;
      domCache.stopBtn.disabled = false;

      // Keep inputs disabled during pause
      domCache.fromInput.disabled = true;
      domCache.toInput.disabled = true;
      domCache.fromDropdown.disabled = true;
      domCache.toDropdown.disabled = true;
      domCache.timeInput.disabled = true;
      domCache.roundsInput.disabled = true;
      domCache.learningModeCheckbox.disabled = true;
      if (learningModeLabel) {
        learningModeLabel.classList.add("disabled");
      }

      // Action buttons during pause - enable NÄSTA to resume, disable VISA
      domCache.showBtn.disabled = true;
      domCache.nextBtn.disabled = false;
    } else {
      // Game stopped: enable play, disable pause/stop, enable inputs
      domCache.playBtn.disabled = false;
      domCache.pauseBtn.disabled = true;
      domCache.stopBtn.disabled = true;

      // Enable game configuration inputs when stopped
      domCache.fromInput.disabled = false;
      domCache.toInput.disabled = false;
      domCache.fromDropdown.disabled = false;
      domCache.toDropdown.disabled = false;
      domCache.timeInput.disabled = false;
      domCache.roundsInput.disabled = gameState.isLearningMode;
      domCache.learningModeCheckbox.disabled = false;
      if (learningModeLabel) learningModeLabel.classList.remove("disabled");

      // Action buttons disabled when stopped
      domCache.showBtn.disabled = true;
      domCache.nextBtn.disabled = true;
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
function initializeGame() {
  // Initialize DOM cache for better performance
  domCache.init();

  const currentGameId = getCurrentContext();
  const contextData = getContextData();
  const game = gameData[currentGameId];

  gameState.fullGameDataSet = [...game.data];

  // Check if we're in replay mode with specific data
  if (contextData && contextData.replayType) {
    // Restore range indices for replay/range controls
    gameState.rangeStart =
      typeof contextData.rangeStart === "number" ? contextData.rangeStart : 0;
    gameState.rangeEnd =
      typeof contextData.rangeEnd === "number"
        ? contextData.rangeEnd
        : contextData.fullGameDataSet
        ? contextData.fullGameDataSet.length - 1
        : 0;

    // Filter for slow replay if needed
    if (
      contextData.replayType === "slow" &&
      Array.isArray(contextData.gameResults)
    ) {
      // Only include items that were slow or showed answer
      const slowSet = new Set();
      contextData.gameResults.forEach((result) => {
        if (result.timeSpent > 2 || result.showedAnswer) {
          slowSet.add(result.figurkod);
        }
      });
      gameState.currentGameDataSet = contextData.fullGameDataSet.filter(
        (item) => slowSet.has(item[0])
      );
    } else {
      gameState.currentGameDataSet = [...contextData.fullGameDataSet];
    }
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

    // Set range controls to restored values, supporting dropdowns
    if (contextData.dropdown) {
      domCache.fromDropdown.value = contextData.rangeStart || "0";
      domCache.toDropdown.value =
        contextData.rangeEnd ||
        (gameState.fullGameDataSet
          ? String(gameState.fullGameDataSet.length - 1)
          : "0");
    } else {
      domCache.fromInput.value =
        typeof contextData.rangeStart === "number"
          ? contextData.rangeStart
          : parseInt(contextData.rangeStart) || 0;
      domCache.toInput.value =
        typeof contextData.rangeEnd === "number"
          ? contextData.rangeEnd
          : parseInt(contextData.rangeEnd) ||
            (gameState.fullGameDataSet
              ? gameState.fullGameDataSet.length - 1
              : 0);
    }

    // Set learning mode based on replay type
    const learningModeCheckbox = domCache.learningModeCheckbox;
    if (contextData.replayType === "slow") {
      hideRangeControls();
      domCache.roundsInput.parentNode.classList.add("hidden");
      // Enable learning mode for slow replay
      if (learningModeCheckbox) {
        learningModeCheckbox.checked = true;
        gameState.isLearningMode = true;
      }
    } else {
      // Show range controls for regular replay
      showRangeControls();
      domCache.roundsInput.parentNode.classList.remove("hidden");
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

  // Reset game state when starting a new game (not in replay mode)
  // This ensures clean state for fresh game initialization
  resetGameState();

  gameState.currentGameDataSet = [...game.data];
  gameState.currentItemIndex = 0;
  gameState.showingSolution = false;
  gameState.gameResults = [];
  gameState.currentItemStartTime = null;

  // Ensure range controls are visible for normal game initialization
  showRangeControls();

  // Handle dropdown vs input controls
  const useDropdown = game.dropdown || false;
  // Use domCache directly for input elements
  if (
    !domCache.fromInput ||
    !domCache.toInput ||
    !domCache.fromDropdown ||
    !domCache.toDropdown
  ) {
    return; // Elements not found
  }

  // Remove any existing event listeners by cloning and replacing elements
  const newFromInput = domCache.fromInput.cloneNode(true);
  const newToInput = domCache.toInput.cloneNode(true);
  domCache.fromInput.parentNode.replaceChild(newFromInput, domCache.fromInput);
  domCache.toInput.parentNode.replaceChild(newToInput, domCache.toInput);
  // Update cache with new elements
  domCache.fromInput = newFromInput;
  domCache.toInput = newToInput;

  if (useDropdown) {
    // Show dropdowns, hide inputs
    newFromInput.classList.add("hidden");
    newToInput.classList.add("hidden");
    domCache.fromDropdown.classList.remove("hidden");
    domCache.toDropdown.classList.remove("hidden");

    // Populate dropdown options
    populateDropdowns(game.data);

    // Set default values to first and last items
    domCache.fromDropdown.value = "0";
    domCache.toDropdown.value = (
      gameState.currentGameDataSet.length - 1
    ).toString();
  } else {
    // Show inputs, hide dropdowns
    newFromInput.classList.remove("hidden");
    newToInput.classList.remove("hidden");
    domCache.fromDropdown.classList.add("hidden");
    domCache.toDropdown.classList.add("hidden");

    // Set default range for numeric data
    newFromInput.value = 0;
    // Set "Till" to "Från + 9", but not exceeding the data length
    newToInput.value = Math.min(9, gameState.currentGameDataSet.length - 1);

    // Add event listeners to ensure "Från" comes before "Till" for numeric inputs
    newFromInput.addEventListener("change", function () {
      const fromValue = parseInt(this.value) || 0;
      // Automatically set "Till" to "Från + 9", but not exceeding the data length
      const newToValue = Math.min(
        fromValue + 9,
        gameState.fullGameDataSet.length - 1
      );
      console.log("'Från' value:", fromValue);
      console.log("New 'Till' value:", newToValue);
      console.log(gameState.fullGameDataSet.length);
      newToInput.value = newToValue;

      // Update current-item display to show the new "from" item when game is not running
      if (
        !gameState.isGameRunning &&
        gameState.fullGameDataSet.length > fromValue
      ) {
        const newCurrentItem = gameState.fullGameDataSet[fromValue];
        domCache.currentItem.textContent = newCurrentItem[0];

        // Also update solution display based on learning mode
        if (gameState.isLearningMode) {
          domCache.solutionDisplay.textContent = newCurrentItem[1];
        } else {
          domCache.solutionDisplay.textContent = "•••";
        }
      }
    });

    newToInput.addEventListener("change", function () {
      const fromValue = parseInt(newFromInput.value) || 0;
      const toValue =
        parseInt(this.value) || gameState.currentGameDataSet.length - 1;

      // If "Till" is less than "Från", update "Från" to be equal to "Till"
      if (toValue < fromValue) {
        newFromInput.value = toValue;
      }
    });

    // Add event listener for time input to update countdown display
    const newTimeInput = domCache.timeInput.cloneNode(true);
    domCache.timeInput.parentNode.replaceChild(
      newTimeInput,
      domCache.timeInput
    );
    // Update cache with new element
    domCache.timeInput = newTimeInput;
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
  // Use domCache directly for dropdowns
  if (!domCache.fromDropdown || !domCache.toDropdown) return;

  // Clear existing options
  domCache.fromDropdown.innerHTML = "";
  domCache.toDropdown.innerHTML = "";

  // Remove existing event listeners by cloning and replacing elements
  const newFromDropdown = domCache.fromDropdown.cloneNode(false);
  const newToDropdown = domCache.toDropdown.cloneNode(false);
  newFromDropdown.id = domCache.fromDropdown.id;
  newFromDropdown.className = domCache.fromDropdown.className;
  newToDropdown.id = domCache.toDropdown.id;
  newToDropdown.className = domCache.toDropdown.className;

  domCache.fromDropdown.parentNode.replaceChild(
    newFromDropdown,
    domCache.fromDropdown
  );
  domCache.toDropdown.parentNode.replaceChild(
    newToDropdown,
    domCache.toDropdown
  );

  // Update cache with new elements
  domCache.fromDropdown = newFromDropdown;
  domCache.toDropdown = newToDropdown;

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
      domCache.currentItem.textContent = newCurrentItem[0];

      // Also update solution display based on learning mode
      if (gameState.isLearningMode) {
        domCache.solutionDisplay.textContent = newCurrentItem[1];
      } else {
        domCache.solutionDisplay.textContent = "•••";
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

  gameState.isGameRunning = true;
  gameState.hasStarted = true;
  gameState.paused = false;
  gameState.gameStartTime = Date.now();

  // Filter data based on range (always from original data)
  const currentGameId = getCurrentContext();
  const game = gameData[currentGameId];
  const useDropdown = game.dropdown || false;
  const contextData = getContextData();

  let fromIndex, toIndex;
  if (useDropdown) {
    fromIndex = parseInt(domCache.fromDropdown?.value) || 0;
    toIndex = parseInt(domCache.toDropdown?.value) || game.data.length - 1;
  } else {
    fromIndex = parseInt(domCache.fromInput?.value) || 0;
    toIndex = parseInt(domCache.toInput?.value) || game.data.length - 1;
  }
  fromIndex = Math.max(0, fromIndex);
  toIndex = Math.min(game.data.length - 1, toIndex);

  // Always set fullGameDataSet to the original game data for result/replay
  // gameState.fullGameDataSet = [...game.data];
  gameState.rangeStart = fromIndex;
  gameState.rangeEnd = toIndex;

  const filteredData =
    contextData && contextData.replayType === "slow"
      ? [...gameState.currentGameDataSet]
      : game.data.slice(fromIndex, toIndex + 1);

  const firstPair = filteredData[0];
  shuffleArray(filteredData);
  // In learning mode, ensure first item is always the same after shuffle
  if (gameState.isLearningMode && filteredData.length > 0) {
    // Move the original first pair to the front
    const idx = filteredData.findIndex((pair) => pair === firstPair);
    if (idx > 0) {
      filteredData.splice(idx, 1);
      filteredData.unshift(firstPair);
    }
  }
  gameState.currentGameDataSet = filteredData;
  gameState.currentItemIndex = 0;

  // Initialize results tracking
  gameState.gameResults = [];
  gameState.currentItemStartTime = null;
  gameState.pausedTime = 0;

  // Set rounds for practice mode (not learning mode)
  if (!gameState.isLearningMode && domCache.roundsInput) {
    const roundsValue = parseInt(domCache.roundsInput.value) || 1;
    gameState.rounds = Math.max(1, roundsValue);
    gameState.currentRound = 1;
  } else {
    gameState.rounds = 1;
    gameState.currentRound = 1;
  }

  showCurrentItem();
  updateButtonStates();

  if (window.activateScreenWakeLock) {
    window.activateScreenWakeLock();
  }
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
function prepareResultData(gameData) {
  const currentGameId = getCurrentContext();
  const currentGameData = getContextData();
  const gameTitle =
    currentGameId && gameData[currentGameId]
      ? gameData[currentGameId].title
      : "Okänt spel";

  // Combine results: keep only the slowest attempt for each figurkod
  const slowestResultsMap = new Map();
  for (const result of gameState.gameResults) {
    const key = result.figurkod;
    if (!slowestResultsMap.has(key)) {
      slowestResultsMap.set(key, result);
    } else {
      const prev = slowestResultsMap.get(key);
      // If either showedAnswer is true, keep that one
      if (result.showedAnswer && !prev.showedAnswer) {
        slowestResultsMap.set(key, result);
      } else if (!result.showedAnswer && prev.showedAnswer) {
        // keep prev
      } else {
        // Both are either not showedAnswer or both are, keep the one with higher timeSpent
        if (result.timeSpent > prev.timeSpent) {
          slowestResultsMap.set(key, result);
        }
      }
    }
  }
  return {
    gameTitle: gameTitle,
    gameResults: Array.from(slowestResultsMap.values()),
    rangeStart:
      currentGameData && currentGameData.replayType === "slow"
        ? currentGameData.rangeStart
        : typeof gameState.rangeStart === "number"
        ? gameState.rangeStart
        : 0,
    rangeEnd:
      currentGameData && currentGameData.replayType === "slow"
        ? currentGameData.rangeEnd
        : typeof gameState.rangeEnd === "number"
        ? gameState.rangeEnd
        : 0,
    fullGameDataSet: [...gameState.fullGameDataSet], // Unfiltered full set
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
    gameState.currentItemIndex < gameState.currentGameDataSet.length
  ) {
    const currentItem =
      gameState.currentGameDataSet[gameState.currentItemIndex];
    let timeSpent;
    if (gameState.paused) {
      // If game is paused, only count time until pause started
      timeSpent = Math.max(0.1, gameState.pausedTime / 1000);
    } else {
      // If game is running, count total time including paused time
      timeSpent = Math.max(
        0.1,
        (Date.now() - gameState.currentItemStartTime + gameState.pausedTime) /
          1000
      );
    }
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
  resetProgressBar();

  // Only show initial display if not running
  if (!gameState.isGameRunning) {
    // If in learning mode and have data, show first card/solution
    if (gameState.isLearningMode && gameState.currentGameDataSet.length > 0) {
      const currentItem = gameState.currentGameDataSet[0];
      domCache.currentItem.textContent = currentItem[0];
      domCache.solutionDisplay.classList.add("visible");
      domCache.solutionDisplay.textContent = currentItem[1];
    } else {
      updateInitialDisplay();
    }
  }

  updateButtonStates();

  // Deactivate wake lock when stopping game
  if (window.deactivateScreenWakeLock) {
    window.deactivateScreenWakeLock();
  }

  // Navigate to results if we should show them
  if (shouldShowResults) {
    const resultData = prepareResultData(gameData);
    setContextData(resultData);
    activatePage("results-page", updateResults);
  }
}

/**
 * Displays the current item in the game and manages timing
 * @param {boolean} resume - Whether this is resuming from a pause
 */
export function showCurrentItem(resume = false) {
  if (gameState.currentItemIndex >= gameState.currentGameDataSet.length) {
    stopGame();
    return;
  }
  const currentItem = gameState.currentGameDataSet[gameState.currentItemIndex];
  domCache.currentItem.textContent = currentItem[0];
  domCache.solutionDisplay.classList.add("visible");

  // Reset showingSolution for new item unless in learning mode, BEFORE displaying solution
  if (!gameState.isLearningMode && !resume) {
    gameState.showingSolution = false;
  }

  if (gameState.isLearningMode || gameState.showingSolution) {
    domCache.solutionDisplay.textContent = currentItem[1];
  } else {
    domCache.solutionDisplay.textContent = "•••";
  }

  // Always start timing for this item when game is running, unless resuming
  if (gameState.isGameRunning && !resume) {
    gameState.currentItemStartTime = Date.now();
    gameState.pausedTime = 0; // Reset paused time for new item
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
  const timeInput = domCache.timeInput;
  const timeLimit =
    parseInt(timeInput.value) || parseInt(timeInput.defaultValue) || 5;

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
  domCache.progressBar.style.setProperty(
    "--progress",
    `${progressPercentage}%`
  );

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
          gameState.currentItemIndex < gameState.currentGameDataSet.length
        ) {
          const currentItem =
            gameState.currentGameDataSet[gameState.currentItemIndex];
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

    domCache.progressBar.style.setProperty(
      "--progress",
      `${progressPercentage}%`
    );

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
  if (gameState.currentItemIndex >= gameState.currentGameDataSet.length) return;

  // Cancel animation frame instead of clearing interval
  if (gameState.countdownTimer) {
    cancelAnimationFrame(gameState.countdownTimer);
    gameState.countdownTimer = null;
  }

  const currentItem = gameState.currentGameDataSet[gameState.currentItemIndex];
  domCache.solutionDisplay.textContent = currentItem[1];
  domCache.solutionDisplay.classList.add("visible");
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
  resetProgressBar();

  // Vibrate device for 100ms on auto-advance in learning mode (if enabled)
  if (
    gameState.vibrationEnabled &&
    navigator.vibrate &&
    gameState.isLearningMode &&
    vibrate
  ) {
    navigator.vibrate(100);
    console.log("Vibration triggered: 100ms");
  }

  // Record result for current item if not already recorded (i.e., user pressed NEXT)
  if (
    gameState.currentItemStartTime &&
    gameState.currentItemIndex < gameState.currentGameDataSet.length
  ) {
    const currentItem =
      gameState.currentGameDataSet[gameState.currentItemIndex];
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

  if (gameState.currentItemIndex >= gameState.currentGameDataSet.length) {
    if (gameState.isLearningMode) {
      // In learning mode, reshuffle the set and loop back to the beginning
      const prevLast =
        gameState.currentGameDataSet[gameState.currentGameDataSet.length - 1];
      do {
        shuffleArray(gameState.currentGameDataSet);
      } while (
        gameState.currentGameDataSet.length > 1 &&
        gameState.currentGameDataSet[0][0] === prevLast[0]
      );
      gameState.currentItemIndex = 0;
      showCurrentItem();
      return;
    } else {
      // Practice mode: check for more rounds
      if (gameState.currentRound < gameState.rounds) {
        gameState.currentRound++;
        shuffleArray(gameState.currentGameDataSet);
        gameState.currentItemIndex = 0;
        showCurrentItem();
        return;
      } else {
        // All rounds complete, show results
        const resultData = prepareResultData(gameData);
        setContextData(resultData);
        activatePage("results-page", updateResults);
        stopGame();
        return;
      }
    }
  }

  showCurrentItem();

  // Auto-advance will continue automatically in showCurrentItem()
}

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
function updateResults() {
  const resultsList = document.getElementById("results-list");
  const averageTimeElement = document.getElementById("average-time");
  const resultsTitle = document.getElementById("results-title");

  if (!resultsList || !averageTimeElement || !resultsTitle) return;

  // Get result data from context
  const resultData = getContextData();
  if (!resultData) {
    console.warn("No result data found in context");
    resultsTitle.textContent = "Resultat";
    resultsList.innerHTML =
      '<div class="result-item"><span>Inga resultat att visa</span><span>--</span></div>';
    averageTimeElement.textContent = "--";
    return;
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

  const replayData = {
    ...resultData,
    replayType: slowOnly ? "slow" : "full",
  };

  if (slowOnly) {
    if (!resultData.gameResults.length) {
      console.warn("Missing game results data for slow replay");
      return;
    }
  } else {
    if (!resultData.fullGameDataSet.length) {
      console.warn("Missing original game data for full replay");
      return;
    }
  }

  domCache.learningModeCheckbox.checked = slowOnly;
  gameState.isLearningMode = slowOnly;
  resetProgressBar();
  updateButtonStates();

  // Set the replay data in context for initializeGame to use
  setContextData(replayData);
  activatePage("game-page", setupGamePage);
}

// ============================================================================
//  UTILITY FUNCTIONS
// ============================================================================

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 * @param {Array} array - The array to shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Utility to activate a page by id and optionally run a callback
 * @param {string} pageId - The id of the page to activate
 * @param {function} [callback] - Optional callback to run after activation
 */
function activatePage(pageId, callback) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  const pageEl = document.getElementById(pageId);
  if (pageEl) {
    pageEl.classList.add("active");
    if (typeof callback === "function") callback();
  }
}

/**
 * Registers all game-related navigation callbacks
 * Should be called once during app initialization
 */
function setupGamePage() {
  const gameType = getCurrentContext();
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
}

// ============================================================================
//  EVENT LISTENERS
// ============================================================================

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

// Set up the game page observer when the module loads
// This ensures it's only set up once and works reliably
document.addEventListener("DOMContentLoaded", () => {
  setupGamePageObserver();
});

// If DOM is already loaded, set up immediately
if (document.readyState === "loading") {
  // DOM is still loading, event listener will handle it
} else {
  // DOM is already loaded
  setupGamePageObserver();
}

// Register game-specific navigation callbacks
registerPageEnterCallback("game-page", () => {
  setupGamePage();
});

registerContextChangeCallback((context) => {
  // Handle context change - validate game exists
  if (context && gameData && !gameData[context]) {
    // Invalid game context, navigate to 404
    navigateToPage("404-page");
  }
});
