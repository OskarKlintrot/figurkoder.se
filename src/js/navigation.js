// Navigation state
const navigationState = {
  currentContext: null, // Generic context instead of "game"
  contextData: null, // Generic data store
  onLeavePageCallbacks: new Map(), // Callbacks for leaving specific pages
  onEnterPageCallbacks: new Map(), // Callbacks for entering specific pages
  onContextChangeCallback: null, // Callback when context changes
};

/**
 * Sets the current context
 */
export function setCurrentContext(context) {
  navigationState.currentContext = context;
  if (navigationState.onContextChangeCallback) {
    navigationState.onContextChangeCallback(context);
  }
}

/**
 * Gets the current context
 */
export function getCurrentContext() {
  return navigationState.currentContext;
}

/**
 * Sets data associated with the current context
 */
export function setContextData(data) {
  navigationState.contextData = data;
}

/**
 * Gets data associated with the current context
 */
export function getContextData() {
  return navigationState.contextData;
}

/**
 * Registers a callback for when leaving a specific page
 */
export function registerPageLeaveCallback(pageId, callback) {
  navigationState.onLeavePageCallbacks.set(pageId, callback);
}

/**
 * Registers a callback for when entering a specific page
 */
export function registerPageEnterCallback(pageId, callback) {
  navigationState.onEnterPageCallbacks.set(pageId, callback);
}

/**
 * Registers a callback for when context changes
 */
export function registerContextChangeCallback(callback) {
  navigationState.onContextChangeCallback = callback;
}

/**
 * Handles navigation back to previous page based on current page context
 */
export function goBack() {
  const currentPageId = document.querySelector(".page.active")?.id;

  // Define simple back navigation rules
  const backRoutes = {
    "game-page": "main-menu",
    "results-page": "game-page",
    "about-page": "main-menu",
    "faq-page": "main-menu",
    "contact-page": "main-menu",
    "404-page": "main-menu",
  };

  const targetPage = backRoutes[currentPageId] || "main-menu";
  navigateToPage(targetPage);
}

/**
 * Updates the page header with title and back button visibility
 * @param {string} title - The title to display in the header
 * @param {boolean} showBackButton - Whether to show the back button
 */
export function updateHeader(title, showBackButton = false) {
  const titleElement = document.getElementById("page-title");
  const backBtn = document.getElementById("back-btn");

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (backBtn) {
    if (showBackButton) {
      backBtn.classList.remove("hidden");
      backBtn.classList.add("visible");
    } else {
      backBtn.classList.remove("visible");
      backBtn.classList.add("hidden");
    }
  }
}

/**
 * Navigates to a specific page, managing page visibility and URL updates
 * @param {string} pageId - The ID of the page to navigate to
 * @param {boolean} updateURL - Whether to update the browser URL
 */
export function navigateToPage(pageId, updateURL = true) {
  const currentPageId = document.querySelector(".page.active")?.id;

  // Call leave callback for current page
  if (
    currentPageId &&
    navigationState.onLeavePageCallbacks.has(currentPageId)
  ) {
    navigationState.onLeavePageCallbacks.get(currentPageId)();
  }

  // Hide all pages
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  // Show target page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // Update URL if requested
  if (updateURL) {
    const url = getURLForPage(pageId);
    if (shouldUseHashRouting()) {
      window.location.hash = url.substring(1);
    } else {
      history.pushState(null, "", url);
    }
  }

  // Call enter callback for new page
  if (navigationState.onEnterPageCallbacks.has(pageId)) {
    navigationState.onEnterPageCallbacks.get(pageId)();
  }
}

/**
 * Determines whether to use hash-based routing based on the current environment
 * @returns {boolean} True if hash routing should be used
 */
export function shouldUseHashRouting() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".local") ||
    window.location.protocol === "file:"
  );
}

/**
 * Generates the appropriate URL for a given page ID
 * @param {string} pageId - The ID of the page to generate URL for
 * @returns {string} The generated URL
 */
export function getURLForPage(pageId) {
  const prefix = shouldUseHashRouting() ? "#" : "";
  const context = getCurrentContext();

  // Define URL patterns for each page
  const urlPatterns = {
    "main-menu": "/",
    "game-page": context ? `/game/${context}` : "/game",
    "results-page": context ? `/game/${context}/results` : "/results",
    "about-page": "/about",
    "faq-page": "/faq",
    "contact-page": "/contact",
    "404-page": "/404",
  };

  return prefix + (urlPatterns[pageId] || "/");
}

/**
 * Parses the current URL to determine which page and context should be displayed
 * @returns {Object} An object containing page and context information
 */
export function parseURL() {
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
    return { page: "main-menu", context: null };
  }

  // Handle different URL patterns
  if (segments[0] === "game") {
    if (segments.length === 1) {
      return { page: "game-page", context: null };
    }
    const contextType = segments[1];
    if (segments.length === 3 && segments[2] === "results") {
      return { page: "results-page", context: contextType };
    }
    return { page: "game-page", context: contextType };
  }

  // Handle other static pages
  const staticPages = {
    about: "about-page",
    faq: "faq-page",
    contact: "contact-page",
  };

  const pageId = staticPages[segments[0]];
  if (pageId) {
    return { page: pageId, context: null };
  }

  return { page: "404-page", context: null };
}

/**
 * Initializes the application based on the current URL
 */
export function initializeFromURL() {
  const { page, context } = parseURL();

  // Hide loading spinner
  const loadingSpinner = document.getElementById("loading-spinner");
  if (loadingSpinner) {
    loadingSpinner.classList.remove("active");
  }

  // Set the context if provided
  if (context) {
    setCurrentContext(context);
  }

  // Navigate to the appropriate page
  navigateToPage(page, false);
}

/**
 * Navigates to a page with a specific context
 * @param {string} pageId - The page to navigate to
 * @param {string} context - The context to set (optional)
 */
export function navigateToPageWithContext(pageId, context = null) {
  if (context) {
    setCurrentContext(context);
  }
  navigateToPage(pageId);
}

/**
 * Opens the navigation menu by adding CSS classes
 */
export function openMenu() {
  document.getElementById("nav-menu").classList.add("open");
  document.querySelector(".nav-overlay").classList.add("open");
}

/**
 * Closes the navigation menu by removing CSS classes
 */
export function closeMenu() {
  document.getElementById("nav-menu").classList.remove("open");
  document.querySelector(".nav-overlay").classList.remove("open");
}

// Register navigation callbacks
// Register navigation callbacks to update header from data-header attribute for all .page divs
document.querySelectorAll(".page").forEach((pageDiv) => {
  const pageId = pageDiv.id;
  if (pageId) {
    registerPageEnterCallback(pageId, () => {
      const header = pageDiv.getAttribute("data-header") ?? "Figurkoder.se";
      // If data-hide-back-button is set to true, hide back button
      const hideBackBtn =
        pageDiv.getAttribute("data-hide-back-button") === "true";
      updateHeader(header, !hideBackBtn);
    });
  }
});
