"use strict";

(function () {
  if ("wakeLock" in navigator) {
    let wakeLock = null;
    let isGameActive = false;

    // Global functions to control wake lock based on game state
    window.activateScreenWakeLock = async () => {
      if (isGameActive && wakeLock) {
        return; // Already active
      }

      isGameActive = true;

      try {
        wakeLock = await navigator.wakeLock.request("screen");
        console.log("Wake lock activated - screen will stay on during game");

        // Listen for wake lock release (e.g., user switches tabs)
        wakeLock.addEventListener("release", () => {
          console.log("Wake lock was released");
        });
      } catch (err) {
        console.log("Wake lock request failed:", err);
        // Wake lock request fails - usually system related, such as battery saver mode
      }
    };

    window.deactivateScreenWakeLock = async () => {
      if (!isGameActive) {
        return; // Already inactive
      }

      isGameActive = false;

      try {
        if (wakeLock) {
          await wakeLock.release();
          wakeLock = null;
          console.log("Wake lock deactivated - screen can turn off normally");
        }
      } catch (err) {
        console.log("Wake lock release failed:", err);
      }
    };

    // Re-acquire wake lock if page becomes visible again while game is active
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible" && isGameActive && !wakeLock) {
        try {
          wakeLock = await navigator.wakeLock.request("screen");
          console.log("Wake lock re-acquired after page became visible");
        } catch (err) {
          console.log("Failed to re-acquire wake lock:", err);
        }
      }
    });

    // Clean up wake lock when page is unloaded
    window.addEventListener("beforeunload", () => {
      if (wakeLock) {
        wakeLock.release();
      }
    });
  } else {
    // Fallback for browsers that don't support Wake Lock API
    console.log("Wake Lock API is not supported in this browser");
    window.activateScreenWakeLock = () => {};
    window.deactivateScreenWakeLock = () => {};
  }
})();
