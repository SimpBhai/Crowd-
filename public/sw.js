// Progressive Web App Service Worker for Crowd GPS Tracker
const CACHE_NAME = "crowd-radar-v2.6";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Install Event: Cache app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("PWA pre-cache warning:", err);
      });
    })
  );
});

// Activate Event: Clean up old caches & take control immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first with cache fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Do NOT cache API calls or WebSockets
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/ws")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET requests for app shell
        if (event.request.method === "GET" && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});

// Push Notifications (Incoming Calls, Dispatch Broadcasts, SOS Alerts)
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "Tactical Dispatch Alert", body: event.data.text() };
    }
  }

  const title = data.title || "📞 Incoming Dispatch Call";
  const options = {
    body: data.body || "Direct voice call or priority dispatch alert received.",
    icon: "/manifest-icon.png",
    badge: "/manifest-icon.png",
    vibrate: data.isCall ? [300, 100, 300, 100, 500, 200, 500] : [200, 100, 200],
    tag: data.tag || "dispatch-alert",
    renotify: true,
    requireInteraction: !!data.isCall,
    data: data,
    actions: data.isCall
      ? [
          { action: "answer", title: "📞 Answer Call" },
          { action: "dismiss", title: "✕ Dismiss" },
        ]
      : [{ action: "view", title: "Open Radar" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler: Focus or open window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if ("focus" in client) {
          if (action === "answer") {
            client.postMessage({ type: "NOTIFICATION_CALL_ANSWER", data: event.notification.data });
          }
          return client.focus();
        }
      }
      // If not open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});

// Background Sync Event: Sync queued location pings if device went offline
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-gps-coordinates") {
    event.waitUntil(syncCachedLocation());
  }
});

// Periodic Background Sync (if supported by browser)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "periodic-gps-keepalive") {
    event.waitUntil(syncCachedLocation());
  }
});

async function syncCachedLocation() {
  console.log("[ServiceWorker] Syncing background GPS telemetry...");
}
