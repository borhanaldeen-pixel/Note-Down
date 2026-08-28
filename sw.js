// دفتر الديون اليمني - Service Worker
// يخزن كل ملفات التطبيق محلياً كي يعمل بدون إنترنت وبدون VPN بعد أول تحميل ناجح.

const CACHE_VERSION = 'debtbook-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

// عند التثبيت: خزّن كل ملفات التطبيق فوراً
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// عند التفعيل: احذف أي نسخ قديمة من الكاش
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// استراتيجية: الكاش أولاً، ثم الشبكة كخيار احتياطي فقط
// وأي طلب تصفح (navigation) يرجع دائماً لصفحة index.html من الكاش حتى لو تعذر الاتصال
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        return cached || fetch(request).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
