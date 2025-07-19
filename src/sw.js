//
// Settings & Variables
//

// Version number
let version = "1.0.1";

// Cache IDs
let coreID = `${version}_core`;
let pageID = `${version}_pages`;
let assetID = `${version}_assets`;
let imgID = `${version}_img`;
let cacheIDs = [coreID, pageID, assetID, imgID];

// Core assets
let coreAssets = [
  "/",
  "/gameData.js",
];

//
// Helper Methods
//

/**
 * Check if cached API data is still valid
 * @param  {Object}  response The response object
 * @param  {Number}  goodFor  How long the response is good for, in milliseconds
 * @return {Boolean}          If true, cached data is valid
 */
function isValid(response, goodFor) {
  if (!response) {
    return false;
  }

  let fetched = response.headers.get("sw-fetched-on");

  if (fetched && parseFloat(fetched) + goodFor > new Date().getTime()) {
    return true;
  }

  return false;
}

//
// Event Listeners
//

// On install, activate immediately
self.addEventListener("install", function (event) {
  // Activate immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(coreID).then(async function (cache) {
      // Cache core assets
      for (let asset of coreAssets) {
        cache.add(new Request(asset)).catch((error) => {
          console.log("Error caching asset:", asset);
          console.error(error);
        });
      }

      return cache;
    })
  );
});

// On version update, remove old cached files
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        // Get the keys of the caches to remove
        let keysToRemove = keys.filter(function (key) {
          return !cacheIDs.includes(key);
        });

        // Delete each cache
        let removed = keysToRemove.map(function (key) {
          return caches.delete(key);
        });

        return Promise.all(removed);
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// Listen for request events
self.addEventListener("fetch", function (event) {
  // Get the request
  let request = event.request;

  // Bug fix
  // https://stackoverflow.com/a/49719964
  if (
    event.request.cache === "only-if-cached" &&
    event.request.mode !== "same-origin"
  ) {
    return;
  }

  // HTML files
  // Network-first
  if (request.headers.get("Accept").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          // Create a copy of the response and save it to the cache
          let copy = response.clone();
          event.waitUntil(
            caches.open(pageID).then(function (cache) {
              return cache.put(request, copy);
            })
          );

          // Return the response
          return response;
        })
        .catch(async function (error) {
          const response = await caches.match(request);
          // If there's no item in cache, respond with the cached root page as fallback
          return response || caches.match("/");
        })
    );
  }

  // CSS & JavaScript
  // Offline-first
  else if (
    request.url.startsWith("http") &&
    (request.headers.get("Accept").includes("text/css") ||
      request.headers.get("Accept").includes("text/javascript") ||
      request.destination === "script")
  ) {
    event.respondWith(
      caches.match(request).then(function (response) {
        return (
          response ||
          fetch(request).then(function (response) {
            let copy = response.clone();
            event.waitUntil(
              caches.open(assetID).then(function (cache) {
                return cache.put(request, copy);
              })
            );

            // Return the response
            return response;
          })
        );
      })
    );
    return;
  }

  // Images
  // Offline-first
  else if (request.headers.get("Accept").includes("image")) {
    event.respondWith(
      caches.match(request).then(function (response) {
        return (
          response ||
          fetch(request).then(function (response) {
            let copy = response.clone();
            event.waitUntil(
              caches.open(imgID).then(function (cache) {
                return cache.put(request, copy);
              })
            );

            // Return the response
            return response;
          })
        );
      })
    );
    return;
  }
});
