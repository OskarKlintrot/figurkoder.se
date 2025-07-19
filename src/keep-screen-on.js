"use strict";

(async function () {
  if ("wakeLock" in navigator) {
    const timeoutTime = 10 * 60 * 1000; // 10 minutes
    let wakeLock = null;

    const resetTimer = () => {
      clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(releaseWakeLock, timeoutTime);
    };

    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        resetTimer();
      } catch (err) {
        // if wake lock request fails - usually system related, such as battery
      }
    };

    const releaseWakeLock = async () => {
      try {
        await wakeLock.release("screen");
      } catch (err) {}
    };

    let timeoutTimer = setTimeout(releaseWakeLock, timeoutTime);

    document.addEventListener("touchstart", () => {
      requestWakeLock();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    });

    requestWakeLock();
  }
})();
