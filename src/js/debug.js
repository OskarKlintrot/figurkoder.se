// Constants
const MAX_DEBUG_CONSOLE_ENTRIES = 100;
const DEBUG_TOGGLE_CLICK_COUNT = 3;

// Console logging functionality for debug view
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

function addToDebugConsole(message, type = "log") {
  const debugConsole = document.getElementById("debug-console");
  if (!debugConsole) return;

  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `debug-console-entry ${type}`;

  const timestampSpan = document.createElement("span");
  timestampSpan.className = "timestamp";
  timestampSpan.textContent = `[${timestamp}]`;

  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;

  entry.appendChild(timestampSpan);
  entry.appendChild(messageSpan);

  debugConsole.appendChild(entry);
  debugConsole.scrollTop = debugConsole.scrollHeight;

  // Limit console entries to prevent memory issues
  const entries = debugConsole.querySelectorAll(".debug-console-entry");
  if (entries.length > MAX_DEBUG_CONSOLE_ENTRIES) {
    entries[0].remove();
  }
}

function formatConsoleArgs(args) {
  return Array.from(args)
    .map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(" ");
}

// Override console methods to capture logs
console.log = function (...args) {
  originalConsole.log.apply(console, args);
  addToDebugConsole(formatConsoleArgs(args), "log");
};

console.error = function (...args) {
  originalConsole.error.apply(console, args);
  addToDebugConsole(formatConsoleArgs(args), "error");
};

console.warn = function (...args) {
  originalConsole.warn.apply(console, args);
  addToDebugConsole(formatConsoleArgs(args), "warn");
};

console.info = function (...args) {
  originalConsole.info.apply(console, args);
  addToDebugConsole(formatConsoleArgs(args), "info");
};

export function clearDebugConsole() {
  const debugConsole = document.getElementById("debug-console");
  if (debugConsole) {
    debugConsole.innerHTML = "";
  }
}

/**
 * Loads debug-related settings from localStorage
 */
export function loadDebugSettings() {
  // Load debug view setting from localStorage
  const savedDebugViewSetting = localStorage.getItem("debugViewEnabled");
  if (savedDebugViewSetting !== null) {
    const debugViewEnabled = savedDebugViewSetting === "true";
    const debugView = document.getElementById("debug-view");
    const body = document.body;

    if (debugViewEnabled && debugView && body) {
      debugView.classList.remove("hidden");
      debugView.classList.add("visible");
      body.classList.add("debug-view-visible");
    }
  }

  // Initialize debug console with welcome message
  addToDebugConsole(
    "Debug console initialized. Console logs will appear here.",
    "info"
  );
}

/**
 * Handles header clicks to detect the debug view toggle
 * @param {Event} event - The click event object
 */
export async function handleHeaderClick(event) {
  // Check if we reached the required number of clicks using the event's detail property
  if (event.detail === DEBUG_TOGGLE_CLICK_COUNT) {
    toggleDebugViewSetting();

    // Add a subtle visual feedback
    const header = document.querySelector(".header");
    if (header) {
      header.style.transform = "translateX(-40%)";
      setTimeout(() => {
        header.style.transform = "";
      }, 150);
    }
  }
}

/**
 * Toggles the debug view setting and saves it to localStorage
 */
export function toggleDebugViewSetting() {
  const debugViewEnabled = localStorage.getItem("debugViewEnabled") === "true";
  const newDebugViewState = !debugViewEnabled;
  const debugView = document.getElementById("debug-view");
  const body = document.body;

  if (newDebugViewState) {
    debugView.classList.remove("hidden");
    debugView.classList.add("visible");
    body.classList.add("debug-view-visible");
  } else {
    debugView.classList.remove("visible");
    debugView.classList.add("hidden");
    body.classList.remove("debug-view-visible");
  }

  // Save setting to localStorage
  localStorage.setItem("debugViewEnabled", newDebugViewState);
}

// Capture uncaught errors and promise rejections
window.addEventListener("error", function (event) {
  addToDebugConsole(
    `Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
    "error"
  );
});

window.addEventListener("unhandledrejection", function (event) {
  addToDebugConsole(`Unhandled Promise Rejection: ${event.reason}`, "error");
});
