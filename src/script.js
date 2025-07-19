navigator.serviceWorker.register("/sw.js");

import gameData from "/gameData.js";

window.gameData = gameData;

let currentGame = "";

function openMenu() {
  document.getElementById("nav-menu").classList.add("open");
  document.querySelector(".nav-overlay").classList.add("open");
}

function closeMenu() {
  document.getElementById("nav-menu").classList.remove("open");
  document.querySelector(".nav-overlay").classList.remove("open");
}

function resetGameState() {
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
  gameState.usePresetData = false;
  // Note: vibrationEnabled is kept as it's a user setting

  // Reset UI elements to default state
  // Reset progress bar on NÄSTA button
  const nextBtn = domCache.nextBtn || document.getElementById("next-btn");
  nextBtn.classList.remove("progress-bar");
  nextBtn.style.setProperty("--progress", "0%");

  // Reset display elements
  (
    domCache.currentItem || document.getElementById("current-item")
  ).textContent = "---";
  (
    domCache.solutionDisplay ||
    document.getElementById("solution-display")
  ).textContent = "---";

  // Reset learning mode to default (unchecked)
  const learningModeCheckbox = document.getElementById("learning-mode");
  if (learningModeCheckbox) {
    learningModeCheckbox.checked = false;
  }
  gameState.isLearningMode = false;
}

function goBack() {
  const currentPageId = document.querySelector(".page.active").id;

  if (currentPageId === "game-page") {
    resetGameState(); // Reset game state before leaving game page
    navigateToPage("main-menu");
  } else if (currentPageId === "results-page") {
    navigateToPage("game-page");
  } else if (
    currentPageId === "about-page" ||
    currentPageId === "faq-page" ||
    currentPageId === "contact-page" ||
    currentPageId === "404-page"
  ) {
    navigateToPage("main-menu");
  }
}

function updateHeader(title, showBackButton = false) {
  document.getElementById("page-title").textContent = title;
  const backBtn = document.getElementById("back-btn");

  if (showBackButton) {
    backBtn.classList.remove("hidden");
    backBtn.classList.add("visible");
  } else {
    backBtn.classList.remove("visible");
    backBtn.classList.add("hidden");
  }
}

function navigateToPage(pageId, updateURL = true) {
  // Check if we're leaving the game page to reset state
  const currentPageId = document.querySelector(".page.active")?.id;
  if (
    currentPageId === "game-page" &&
    pageId !== "game-page" &&
    pageId !== "results-page"
  ) {
    resetGameState();
  }

  // Batch DOM updates for page navigation to reduce reflows
  const batch = () => {
    // Hide all pages
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    // Show target page
    document.getElementById(pageId).classList.add("active");
  };

  // Use requestAnimationFrame to batch the DOM updates
  requestAnimationFrame(batch);

  // Update URL if requested
  if (updateURL) {
    const url = getURLForPage(pageId);
    if (shouldUseHashRouting()) {
      window.location.hash = url.substring(1); // Remove the # prefix for setting hash
    } else {
      history.pushState(null, "", url);
    }
  }

  // Update header based on page
  switch (pageId) {
    case "main-menu":
      updateHeader("Figurkoder.se", false);
      break;
    case "game-page":
      updateHeader(
        currentGame && gameData && gameData[currentGame]
          ? gameData[currentGame].title
          : "Spel",
        true
      );
      break;
    case "results-page":
      updateHeader("Resultat", true);
      break;
    case "about-page":
      updateHeader("Om sidan", true);
      break;
    case "faq-page":
      updateHeader("Vanliga frågor", true);
      break;
    case "contact-page":
      updateHeader("Kontakta mig", true);
      break;
    case "404-page":
      updateHeader("404 - Sidan hittades inte", true);
      break;
  }
}

function shouldUseHashRouting() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".local") ||
    window.location.protocol === "file:"
  );
}

function getURLForPage(pageId) {
  const prefix = shouldUseHashRouting() ? "#" : "";

  switch (pageId) {
    case "main-menu":
      return prefix + "/";
    case "game-page":
      return prefix + (currentGame ? `/game/${currentGame}` : "/game");
    case "results-page":
      return (
        prefix +
        (currentGame ? `/game/${currentGame}/results` : "/results")
      );
    case "about-page":
      return prefix + "/about";
    case "faq-page":
      return prefix + "/faq";
    case "contact-page":
      return prefix + "/contact";
    case "404-page":
      return prefix + "/404";
    default:
      return prefix + "/";
  }
}

function parseURL() {
  let path;

  if (shouldUseHashRouting()) {
    const hash = window.location.hash;
    path = hash.startsWith("#") ? hash.substring(1) : hash;
  } else {
    path = window.location.pathname;
  }

  // Clean up the path and remove empty segments
  const segments = path.split("/").filter((s) => s && s.length > 0);

  // If no segments or root path, default to main menu
  if (segments.length === 0 || path === "/" || path === "") {
    return { page: "main-menu", game: null };
  }

  if (segments[0] === "game") {
    if (segments.length === 1) {
      return { page: "game-page", game: null };
    }
    const gameType = segments[1];
    // Don't check gameData here since it might not be loaded yet
    // Let initializeFromURL handle the validation
    if (segments.length === 3 && segments[2] === "results") {
      return { page: "results-page", game: gameType };
    }
    return { page: "game-page", game: gameType };
  }

  switch (segments[0]) {
    case "about":
      return { page: "about-page", game: null };
    case "faq":
      return { page: "faq-page", game: null };
    case "contact":
      return { page: "contact-page", game: null };
    default:
      return { page: "404-page", game: null };
  }
}

function initializeFromURL() {
  const { page, game } = parseURL();

  // Hide loading spinner
  document.getElementById("loading-spinner").classList.remove("active");

  if (game) {
    // Check if gameData is available and if the game exists
    if (gameData && gameData[game]) {
      currentGame = game;
      const gameDataObj = gameData[game];

      // Safely set description if element exists
      const descElement = document.getElementById(
        "game-description-text"
      );
      if (descElement) {
        descElement.textContent = gameDataObj.description;
      }

      // Initialize the game if we're on the game page
      if (page === "game-page") {
        setTimeout(() => {
          initializeGame();
        }, 50);
      }

      navigateToPage(page, false);

      // Update header again now that currentGame and gameData are available
      if (page === "game-page") {
        updateHeader(gameDataObj.title, true);
      }
    } else if (gameData) {
      // gameData is loaded but game doesn't exist - show 404
      navigateToPage("404-page", false);
    } else {
      // gameData not loaded yet - wait a bit and try again
      setTimeout(() => {
        initializeFromURL();
      }, 100);
      return;
    }
  } else {
    navigateToPage(page, false);
  }
}

function navigateToGame(gameType) {
  // Reset any previous game state before starting a new game
  resetGameState();

  currentGame = gameType;
  const game = gameData[gameType];

  // Clear any replay flags when starting a new game
  gameState.usePresetData = false;
  gameState.isReplayMode = false;

  if (game) {
    // Safely set description if element exists
    const descElement = document.getElementById("game-description-text");
    if (descElement) {
      descElement.textContent = game.description;
    }
  }

  navigateToPage("game-page");
  setTimeout(() => {
    initializeGame(); // This will handle dropdown vs input logic
  }, 100);
}

// Game state object
const gameState = {
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
  usePresetData: false, // Flag to indicate we're using preset replay data, skip range filtering
  vibrationEnabled: true, // Flag to control vibration
  isLearningMode: false, // Flag to control learning mode
};

function toggleVibrationSetting() {
  gameState.vibrationEnabled =
    document.getElementById("vibration-setting").checked;
  // Save setting to localStorage
  localStorage.setItem("vibrationEnabled", gameState.vibrationEnabled);
}

function updateLearningMode() {
  gameState.isLearningMode =
    document.getElementById("learning-mode").checked;
  // Update button states when learning mode changes
  updateButtonStates();
  // If game is not running, update the initial display
  if (!gameState.isGameRunning) {
    updateInitialDisplay();
  }
}

function initializeGame() {
  if (!currentGame || !gameData[currentGame]) {
    return;
  }

  // Skip initialization if we're in replay mode
  if (gameState.isReplayMode) {
    return;
  }

  // Clear preset data flag when initializing a new normal game
  gameState.usePresetData = false;

  const game = gameData[currentGame];
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
        document.getElementById("current-item").textContent =
          newCurrentItem[0];

        // Also update solution display based on learning mode
        const solutionDisplay =
          document.getElementById("solution-display");
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
    const newTimeInput = timeInput.cloneNode(true);
    timeInput.parentNode.replaceChild(newTimeInput, timeInput);

    newTimeInput.addEventListener("change", function () {
      // No special handling needed when time changes
    });
  }

  // Only show initial display if not running
  if (!gameState.isGameRunning) updateInitialDisplay();
  updateButtonStates();
}

function updateInitialDisplay() {
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

/*
 * PERFORMANCE OPTIMIZATIONS TO REDUCE FORCED REFLOW:
 * 1. Replaced setInterval with requestAnimationFrame for smooth countdown animation
 * 2. Batched DOM updates using requestAnimationFrame to minimize layout recalculations
 * 3. Added DOM element caching to reduce repeated queries
 * 4. Debounced button state updates to prevent excessive DOM manipulations
 * 5. Batched page navigation DOM updates to reduce reflows
 * These changes should significantly reduce the 60ms forced reflow time.
 */

// Cache frequently accessed DOM elements to reduce queries
const domCache = {
  nextBtn: null,
  currentItem: null,
  solutionDisplay: null,
  playBtn: null,
  pauseBtn: null,
  stopBtn: null,
  showBtn: null,
  init() {
    this.nextBtn = document.getElementById("next-btn");
    this.currentItem = document.getElementById("current-item");
    this.solutionDisplay = document.getElementById("solution-display");
    this.playBtn = document.getElementById("play-btn");
    this.pauseBtn = document.getElementById("pause-btn");
    this.stopBtn = document.getElementById("stop-btn");
    this.showBtn = document.getElementById("show-btn");
  },
};

// Debounced update button states to reduce reflows
let updateButtonStatesTimer = null;
function updateButtonStatesDebounced() {
  if (updateButtonStatesTimer) {
    cancelAnimationFrame(updateButtonStatesTimer);
  }
  updateButtonStatesTimer = requestAnimationFrame(updateButtonStates);
}

function updateButtonStates() {
  // Use cached DOM elements where possible
  const playBtn = domCache.playBtn || document.getElementById("play-btn");
  const pauseBtn =
    domCache.pauseBtn || document.getElementById("pause-btn");
  const stopBtn = domCache.stopBtn || document.getElementById("stop-btn");
  const showBtn = domCache.showBtn || document.getElementById("show-btn");
  const nextBtn = domCache.nextBtn || document.getElementById("next-btn");
  const fromInput = document.getElementById("from-input");
  const toInput = document.getElementById("to-input");
  const fromDropdown = document.getElementById("from-dropdown");
  const toDropdown = document.getElementById("to-dropdown");
  const timeInput = document.getElementById("time-input");
  const learningModeCheckbox = document.getElementById("learning-mode");
  const learningModeLabel =
    learningModeCheckbox.closest(".checkbox-label");

  // Determine if current game uses dropdowns
  const game = gameData[currentGame];
  const useDropdown = game && (game.dropdown || false);

  // Batch DOM updates to reduce reflows
  const updateBatch = () => {
    // Always show all control buttons
    playBtn.classList.add("visible");
    pauseBtn.classList.add("visible");
    stopBtn.classList.add("visible");

    if (gameState.isGameRunning) {
      // During game: disable play, enable pause/stop, disable inputs
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;

      // Disable game configuration inputs during play
      fromInput.disabled = true;
      toInput.disabled = true;
      fromDropdown.disabled = true;
      toDropdown.disabled = true;
      timeInput.disabled = true;
      learningModeCheckbox.disabled = true;
      learningModeLabel.classList.add("disabled");

      // In learning mode, disable "Visa" button since answer is always shown
      // Also disable if answer is already shown for current item
      showBtn.disabled =
        gameState.isLearningMode || gameState.showingSolution;
      nextBtn.disabled = false;
    } else if (gameState.paused) {
      // During pause: enable play/stop, disable pause, disable inputs
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = false;

      // Keep inputs disabled during pause
      fromInput.disabled = true;
      toInput.disabled = true;
      fromDropdown.disabled = true;
      toDropdown.disabled = true;
      timeInput.disabled = true;
      learningModeCheckbox.disabled = true;
      learningModeLabel.classList.add("disabled");

      // Action buttons during pause - enable NÄSTA to resume, disable VISA
      showBtn.disabled = true;
      nextBtn.disabled = false;
    } else {
      // Game stopped: enable play, disable pause/stop, enable inputs
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;

      // Enable game configuration inputs when stopped
      fromInput.disabled = false;
      toInput.disabled = false;
      fromDropdown.disabled = false;
      toDropdown.disabled = false;
      timeInput.disabled = false;
      learningModeCheckbox.disabled = false;
      learningModeLabel.classList.remove("disabled");

      // Action buttons disabled when stopped
      showBtn.disabled = true;
      nextBtn.disabled = true;
    }
  };

  // Execute the batched updates
  updateBatch();
}

function hideRangeControls() {
  // Hide both input and dropdown controls for range selection
  const fromInput = document.getElementById("from-input");
  const toInput = document.getElementById("to-input");
  const fromDropdown = document.getElementById("from-dropdown");
  const toDropdown = document.getElementById("to-dropdown");

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

function showRangeControls() {
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

function startGame() {
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

  // Clear replay mode flag to ensure normal initialization can proceed
  gameState.isReplayMode = false;

  // If we have no data or empty data, initialize the game first
  if (!gameState.currentGameData.length) {
    initializeGame();
    if (!gameState.currentGameData.length) {
      return;
    }
  }

  gameState.isGameRunning = true;
  gameState.hasStarted = true;
  gameState.paused = false;
  gameState.gameStartTime = Date.now();

  // Reset progress bar on NÄSTA button for fresh start
  const nextBtn = document.getElementById("next-btn");
  nextBtn.classList.remove("progress-bar");
  nextBtn.style.setProperty("--progress", "0%");

  // Only filter data based on range if we're not using preset replay data
  if (!gameState.usePresetData) {
    // Filter data based on range
    const game = gameData[currentGame];
    const useDropdown = game.dropdown || false;

    let fromIndex, toIndex;
    if (useDropdown) {
      fromIndex =
        parseInt(document.getElementById("from-dropdown").value) || 0;
      toIndex =
        parseInt(document.getElementById("to-dropdown").value) ||
        gameState.currentGameData.length - 1;
    } else {
      fromIndex =
        parseInt(document.getElementById("from-input").value) || 0;
      toIndex =
        parseInt(document.getElementById("to-input").value) ||
        gameState.currentGameData.length - 1;
    }

    // Ensure indices are within bounds
    fromIndex = Math.max(0, fromIndex);
    toIndex = Math.min(gameState.currentGameData.length - 1, toIndex);

    const filteredData = gameState.currentGameData.slice(
      fromIndex,
      toIndex + 1
    );
    gameState.currentGameData = filteredData;

    // Only set originalGameData and masterGameData if they're not already set from a replay
    if (!gameState.originalGameData.length) {
      gameState.originalGameData = [...filteredData]; // Save the original filtered data
    }
    if (!gameState.masterGameData.length) {
      gameState.masterGameData = [...filteredData]; // Save the master copy that never changes
    }
  } else {
    // When using preset data, ensure originalGameData is set for future replays
    if (!gameState.originalGameData.length) {
      gameState.originalGameData = [...gameState.currentGameData];
    }
    // Don't clear the flag here - let it persist for multiple starts of the same replay session
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

function pauseGame() {
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

function stopGame() {
  // Record current item result if game is running and we have a start time
  if (
    gameState.isGameRunning &&
    gameState.currentItemStartTime &&
    gameState.currentItemIndex < gameState.currentGameData.length
  ) {
    const currentItem =
      gameState.currentGameData[gameState.currentItemIndex];
    const totalTimeSpent =
      (Date.now() -
        gameState.currentItemStartTime +
        gameState.pausedTime) /
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
  const nextBtn = domCache.nextBtn || document.getElementById("next-btn");
  nextBtn.classList.remove("progress-bar");
  nextBtn.style.setProperty("--progress", "0%");

  // Only show initial display if not running
  if (!gameState.isGameRunning) updateInitialDisplay();

  updateButtonStates();

  // Deactivate wake lock when stopping game
  if (window.deactivateScreenWakeLock) {
    window.deactivateScreenWakeLock();
  }

  // Navigate to results if we should show them
  if (shouldShowResults) {
    updateResults();
    navigateToPage("results-page");
  }
}

function showCurrentItem(resume = false) {
  if (gameState.currentItemIndex >= gameState.currentGameData.length) {
    stopGame();
    return;
  }
  const currentItem =
    gameState.currentGameData[gameState.currentItemIndex];
  (
    domCache.currentItem || document.getElementById("current-item")
  ).textContent = currentItem[0];

  // Always start timing for this item when game is running, unless resuming
  if (gameState.isGameRunning && !resume) {
    gameState.currentItemStartTime = Date.now();
    gameState.pausedTime = 0; // Reset paused time for new item
  }

  const solutionDisplay =
    domCache.solutionDisplay ||
    document.getElementById("solution-display");
  solutionDisplay.classList.add("visible");

  // Reset showingSolution for new item unless in learning mode
  if (!gameState.isLearningMode && !resume) {
    gameState.showingSolution = false;
  }

  if (gameState.isLearningMode || gameState.showingSolution) {
    solutionDisplay.textContent = currentItem[1];
  } else {
    solutionDisplay.textContent = "•••";
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
  updateButtonStatesDebounced();
}

function showAnswer() {
  if (gameState.currentItemIndex >= gameState.currentGameData.length)
    return;
  // Cancel animation frame instead of clearing interval
  if (gameState.countdownTimer) {
    cancelAnimationFrame(gameState.countdownTimer);
    gameState.countdownTimer = null;
  }
  const currentItem =
    gameState.currentGameData[gameState.currentItemIndex];
  const solutionDisplay = document.getElementById("solution-display");
  solutionDisplay.textContent = currentItem[1];
  solutionDisplay.classList.add("visible");
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
  updateButtonStatesDebounced();
}

function startCountdown(resume = false) {
  const timeLimit =
    parseInt(document.getElementById("time-input").value) ||
    parseInt(document.getElementById("time-input").defaultValue);
  gameState.totalCountdownTime = timeLimit;
  // Only reset countdownValue if not resuming
  if (!resume) {
    gameState.countdownValue = timeLimit;
  } else if (gameState.pausedCountdownValue !== null) {
    gameState.countdownValue = gameState.pausedCountdownValue;
    gameState.pausedCountdownValue = null;
  }

  // Add progress bar class to NÄSTA button
  const nextBtn = domCache.nextBtn || document.getElementById("next-btn");
  nextBtn.classList.add("progress-bar");

  // Set initial progress bar on NÄSTA button
  const progressPercentage =
    ((gameState.totalCountdownTime - gameState.countdownValue) /
      gameState.totalCountdownTime) *
    100;
  nextBtn.style.setProperty("--progress", `${progressPercentage}%`);

  // Use requestAnimationFrame for smoother animation and better performance
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
      nextBtn.classList.remove("progress-bar");

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

    // Update progress bar on NÄSTA button - batch DOM update
    requestAnimationFrame(() => {
      const progressPercentage =
        ((gameState.totalCountdownTime - gameState.countdownValue) /
          gameState.totalCountdownTime) *
        100;
      nextBtn.style.setProperty("--progress", `${progressPercentage}%`);
    });

    // Continue animation
    gameState.countdownTimer = requestAnimationFrame(countdownStep);
  };

  // Start the countdown animation
  gameState.countdownTimer = requestAnimationFrame(countdownStep);
}

function nextItem(vibrate = false) {
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
  const nextBtn = domCache.nextBtn || document.getElementById("next-btn");
  nextBtn.classList.remove("progress-bar");

  // Vibrate device for 100ms on auto-advance in learning mode (if enabled)
  if (
    gameState.vibrationEnabled &&
    navigator.vibrate &&
    gameState.isLearningMode &&
    vibrate
  ) {
    navigator.vibrate(100);
  }

  // Record result for current item if not already recorded (i.e., user pressed NEXT)
  if (
    gameState.currentItemStartTime &&
    gameState.currentItemIndex < gameState.currentGameData.length
  ) {
    const currentItem =
      gameState.currentGameData[gameState.currentItemIndex];
    const totalTimeSpent =
      (Date.now() -
        gameState.currentItemStartTime +
        gameState.pausedTime) /
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
      updateResults();
      navigateToPage("results-page");
      stopGame();
      return;
    }
  }

  showCurrentItem();

  // Auto-advance will continue automatically in showCurrentItem()
}

function updateResults() {
  const resultsList = document.getElementById("results-list");
  const averageTimeElement = document.getElementById("average-time");
  const resultsTitle = document.getElementById("results-title");

  // Update title to show game type
  if (currentGame && gameData[currentGame]) {
    resultsTitle.textContent = gameData[currentGame].title;
  }

  // Clear previous results
  resultsList.innerHTML = "";

  if (gameState.gameResults.length === 0) {
    resultsList.innerHTML =
      '<div class="result-item"><span>Inga resultat att visa</span><span>--</span></div>';
    averageTimeElement.textContent = "--";
    return;
  }

  // Calculate average time for items where answer wasn't shown
  const completedItems = gameState.gameResults.filter(
    (result) => !result.showedAnswer
  );
  const totalTime = completedItems.reduce(
    (sum, result) => sum + result.timeSpent,
    0
  );
  const averageTime =
    completedItems.length > 0 ? totalTime / completedItems.length : 0;

  // Display each result
  gameState.gameResults.forEach((result) => {
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
  const slowOrErrorCount = gameState.gameResults.filter(
    (result) => result.timeSpent > 2 || result.showedAnswer
  ).length;

  replaySlowBtn.disabled = slowOrErrorCount === 0;
  replaySlowText.textContent = `Repetera långsamma (${slowOrErrorCount})`;
}

function replayAll() {
  // Set replay mode flag
  gameState.isReplayMode = true;

  // Restore original game data (the last used range) and restart with same settings
  if (gameState.originalGameData.length > 0) {
    gameState.currentGameData = [...gameState.originalGameData];
    gameState.usePresetData = true; // Flag that we're using preset data, skip range filtering
  } else {
    // If originalGameData is empty, we need to reset everything
    gameState.currentGameData = [];
    gameState.masterGameData = [];
  }

  navigateToPage("game-page");
  setTimeout(() => {
    // Show range controls for regular replay
    showRangeControls();

    // Clear replay mode flag and reset to stopped state
    gameState.isReplayMode = false;
    gameState.isGameRunning = false;
    gameState.hasStarted = false;
    gameState.paused = false;

    // Reset timer state completely
    clearInterval(gameState.countdownTimer);
    gameState.countdownTimer = null;
    gameState.pausedCountdownValue = null;
    gameState.countdownValue = 0;

    // Update initial display and button states
    updateInitialDisplay();
    updateButtonStates();
  }, 100);
}

function replaySlow() {
  if (!gameState.gameResults.length || !gameState.masterGameData.length)
    return;

  // Set replay mode flag
  gameState.isReplayMode = true;

  // Filter master game data to only include items that were slow or showed answer
  const slowItems = [];
  gameState.gameResults.forEach((result) => {
    if (result.timeSpent > 2 || result.showedAnswer) {
      // Find the corresponding item in masterGameData (the original filtered data)
      const foundItem = gameState.masterGameData.find(
        (item) => item[0] === result.figurkod
      );
      if (
        foundItem &&
        !slowItems.some((item) => item[0] === foundItem[0])
      ) {
        slowItems.push(foundItem);
      }
    }
  });

  if (slowItems.length === 0) return;

  // Override current game data with only slow items - but don't touch originalGameData or masterGameData
  gameState.currentGameData = [...slowItems];
  gameState.currentItemIndex = 0;
  gameState.gameResults = [];
  gameState.currentItemStartTime = null;

  // Go back to game page
  navigateToPage("game-page");
  setTimeout(() => {
    // Hide "Till" and "Från" fields for slow replay
    hideRangeControls();

    // Enable learning mode for slow replay
    document.getElementById("learning-mode").checked = true;
    gameState.isLearningMode = true;

    // Set the preset data flag AFTER navigation but BEFORE clearing replay mode
    gameState.usePresetData = true;

    // Clear replay mode flag and reset to stopped state
    gameState.isReplayMode = false;
    gameState.isGameRunning = false;
    gameState.hasStarted = false;
    gameState.paused = false;

    // Reset timer state completely
    clearInterval(gameState.countdownTimer);
    gameState.countdownTimer = null;
    gameState.pausedCountdownValue = null;
    gameState.countdownValue = 0;

    // Update initial display and button states - ensure we have data first
    if (gameState.currentGameData.length > 0) {
      updateInitialDisplay();
    } else {
      // Fallback if no data is available
      document.getElementById("current-item").textContent = "---";
      document.getElementById("solution-display").textContent = "---";
    }
    updateButtonStates();
  }, 100);
}

function startReplayGame() {
  // Start game without filtering data (use existing currentGameData)
  if (!gameState.currentGameData.length) return;

  gameState.isGameRunning = true;
  gameState.hasStarted = true;
  gameState.paused = false;
  gameState.gameStartTime = Date.now();

  // Initialize results tracking
  gameState.gameResults = [];
  gameState.currentItemStartTime = null;

  // DON'T overwrite masterGameData here - keep the original
  // masterGameData should remain unchanged from the first game

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

  // Clear replay mode flag after starting
  gameState.isReplayMode = false;

  // Only call showCurrentItem to handle display logic
  showCurrentItem();
  updateButtonStates();
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

function updateTimer() {
  if (gameState.gameStartTime) {
    const elapsed = (Date.now() - gameState.gameStartTime) / 1000;
    // Could update a timer display here if needed
  }
}

function toggleMenu() {
  const menu = document.getElementById("nav-menu");
  const overlay = document.getElementById("nav-overlay");

  menu.classList.toggle("open");
  overlay.classList.toggle("open");
}

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

function getGameRange(gameId) {
  const game = gameData[gameId];
  const start = game.data[0][0];
  const stop = game.data[game.data.length - 1][0];
  return { start, stop };
}

function generateTiles() {
  const tilesGrid = document.getElementById("tiles-grid");

  Object.keys(gameData).forEach((gameId) => {
    const game = gameData[gameId];
    const range = getGameRange(gameId);
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.onclick = () => navigateToGame(gameId);

    tile.innerHTML = `
      <div class="tile-title">${range.start} – ${range.stop}</div>
      <div class="tile-category">${game.title}</div>
    `;

    tilesGrid.appendChild(tile);
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
window.replayAll = replayAll;
window.replaySlow = replaySlow;
window.toggleVibrationSetting = toggleVibrationSetting;
window.updateLearningMode = updateLearningMode;

// Initialize page based on URL when loaded
window.addEventListener("DOMContentLoaded", function () {
  // Initialize DOM cache for better performance
  domCache.init();

  // Load vibration setting from localStorage
  const savedVibrationSetting = localStorage.getItem("vibrationEnabled");
  if (savedVibrationSetting !== null) {
    gameState.vibrationEnabled = savedVibrationSetting === "true";
    document.getElementById("vibration-setting").checked =
      gameState.vibrationEnabled;
  }

  // Initialize learning mode state from checkbox
  gameState.isLearningMode =
    document.getElementById("learning-mode").checked;

  generateTiles();
  // Add a small delay to ensure gameData is loaded
  setTimeout(() => {
    initializeFromURL();
    // Initialize button states on page load
    updateButtonStates();
  }, 100);
});

function populateDropdowns(data) {
  const fromDropdown = document.getElementById("from-dropdown");
  const toDropdown = document.getElementById("to-dropdown");

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
      newToDropdown.value = Math.min(
        fromIndex + 1,
        data.length - 1
      ).toString();
    }

    // Update current-item display to show the new "from" item when game is not running
    if (!gameState.isGameRunning && data.length > fromIndex) {
      const newCurrentItem = data[fromIndex];
      document.getElementById("current-item").textContent =
        newCurrentItem[0];

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
