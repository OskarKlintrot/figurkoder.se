"use strict";
(function () {
  if ("screen" in window && "orientation" in window.screen) {
    // Try to lock orientation to portrait
    screen.orientation.lock("portrait").catch(err => {
      console.log("Screen orientation lock failed:", err);
    });
  } else {
    // Fallback for browsers that don't support Screen Orientation API
    console.log("Screen Orientation API is not supported in this browser");
  }
})();
