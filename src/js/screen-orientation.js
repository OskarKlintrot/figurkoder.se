"use strict";
(function () {
  if ("screen" in window && "orientation" in window.screen) {
    let isOrientationLocked = false;

    // Global functions to control screen orientation
    window.lockScreenOrientation = async () => {
      if (isOrientationLocked) {
        return; // Already locked
      }

      try {
        await screen.orientation.lock("portrait");
        isOrientationLocked = true;
        console.log("Screen orientation locked to portrait");
      } catch (err) {
        console.log("Screen orientation lock failed:", err);
        // Lock request fails - usually when not in fullscreen or user gesture required
      }
    };

    window.unlockScreenOrientation = async () => {
      if (!isOrientationLocked) {
        return; // Already unlocked
      }

      try {
        screen.orientation.unlock();
        isOrientationLocked = false;
        console.log("Screen orientation unlocked");
      } catch (err) {
        console.log("Screen orientation unlock failed:", err);
      }
    };

    // Try to lock orientation when the app becomes active
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible" && !isOrientationLocked) {
        // Small delay to ensure the page is fully active
        setTimeout(async () => {
          try {
            await window.lockScreenOrientation();
          } catch (err) {
            console.log(
              "Failed to lock orientation on visibility change:",
              err,
            );
          }
        }, 100);
      }
    });

    // Try to lock orientation on user interactions
    const tryLockOnInteraction = async () => {
      if (!isOrientationLocked) {
        try {
          await window.lockScreenOrientation();
        } catch (err) {
          // Silent fail - orientation lock often requires specific conditions
        }
      }
    };

    // Add event listeners for user interactions
    ["click", "touchstart"].forEach(eventType => {
      document.addEventListener(eventType, tryLockOnInteraction, {
        once: false,
        passive: true,
      });
    });

    // Clean up orientation lock when page is unloaded
    window.addEventListener("beforeunload", () => {
      if (isOrientationLocked) {
        try {
          screen.orientation.unlock();
        } catch (err) {
          // Silent fail on cleanup
        }
      }
    });
  } else {
    // Fallback for browsers that don't support Screen Orientation API
    console.log("Screen Orientation API is not supported in this browser");
    window.lockScreenOrientation = () => {};
    window.unlockScreenOrientation = () => {};
  }
})();
