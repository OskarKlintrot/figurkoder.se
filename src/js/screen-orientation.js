"use strict";
(function () {
  if ("screen" in window && "orientation" in window.screen) {
    // Try to lock orientation on page load
    const lockOrientation = async () => {
      try {
        await screen.orientation.lock("portrait");
        console.log("Screen orientation locked to portrait");
      } catch (err) {
        console.log("Screen orientation lock failed:", err);
        // Lock request fails - usually when not in fullscreen or user gesture required
      }
    };

    // Try to lock immediately
    lockOrientation();

    // Try to lock orientation on user interactions (required by some browsers)
    const tryLockOnInteraction = () => {
      lockOrientation();
    };

    // Add event listeners for user interactions
    ["click", "touchstart"].forEach(eventType => {
      document.addEventListener(eventType, tryLockOnInteraction, {
        once: true,
        passive: true,
      });
    });

    // Try to lock orientation when the app becomes active
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        lockOrientation();
      }
    });
  } else {
    // Fallback for browsers that don't support Screen Orientation API
    console.log("Screen Orientation API is not supported in this browser");
  }
})();
