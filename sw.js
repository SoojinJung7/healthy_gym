/* 간단한 서비스워커 — 정적 파일 캐시로 오프라인/빠른 로딩 지원
   파일을 수정하면 아래 CACHE 버전을 올려 갱신하세요. */
var CACHE = "healthy-gym-v1";
var ASSETS = [
  "index.html",
  "quick_inquiry.html",
  "trial_lesson.html",
  "facility_suggestion.html",
  "coaches.html",
  "inquiry_sent.html",
  "css/style.css",
  "js/config.js",
  "js/app.js",
  "manifest.json",
  "images/icon.svg",
  "images/coach-placeholder.svg"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  // 폼 전송(POST)은 캐시하지 않고 항상 네트워크로
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request);
    })
  );
});
