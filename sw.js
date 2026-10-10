/* Family Office service worker.
   Stores only the public sign-in page, the manifest and the icons, so the app opens quickly and can show
   a clear "you're offline" message. It never stores the encrypted dashboard or user list (data/), the
   GitHub API, the Google Sheet connector or anything else that carries portfolio information. */
const CACHE = "sbfo-shell-v2";
const SHELL = ["./", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;   // GitHub, Google, fonts: straight to the network
  if (url.pathname.includes("/data/")) return;                               // encrypted data: never cached

  if (req.mode === "navigate") {
    // Network first so updates arrive immediately; the cached sign-in page is only used offline.
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./", copy)); }
      return res;
    }).catch(() => caches.match("./")));
    return;
  }
  if (/\/icons\/|manifest\.webmanifest$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
