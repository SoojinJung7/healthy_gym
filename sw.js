/* 간단한 서비스워커 — 정적 파일 캐시로 오프라인/빠른 로딩 지원
   ※ CACHE 버전은 커밋 시 .githooks/pre-commit 훅이 자동으로 올려줍니다. */
var CACHE = "healthy-gym-v13";
var ASSETS = [
  "index.html",
  "quick_inquiry.html",
  "trial_lesson.html",
  "facility_suggestion.html",
  "coaches.html",
  "coach_detail.html",
  "inquiry_sent.html",
  "css/style.css",
  "js/config.js",
  "js/app.js",
  "js/facility.js",
  "js/coaches-data.js",
  "js/coaches.js",
  "manifest.json",
  "images/icon.svg",
  "images/logo.png",
  "images/coach-placeholder.svg",
  "images/coach-choi.jpg",
  "images/coach-choi-face.jpg"
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
  // 폼 전송(POST) 등은 캐시하지 않고 항상 네트워크로
  if (e.request.method !== "GET") return;
  // 네트워크 우선: 온라인이면 항상 최신을 받고, 받은 응답으로 캐시를 갱신.
  // 네트워크가 안 되면(오프라인) 그때만 캐시로 폴백.
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      })
      .catch(function () {
        // 오프라인 폴백: ?v= 같은 버전 쿼리는 무시하고 매칭
        return caches.match(e.request, { ignoreSearch: true });
      })
  );
});
