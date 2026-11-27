// สบายใจ (KumRemote) service worker v1.1 — โหลดจากเน็ตก่อนเสมอ และถามเซิร์ฟเวอร์ทุกครั้ง (no-cache) จะได้เวอร์ชันใหม่ทันทีหลังอัปเดต ถ้าไม่มีเน็ตค่อยใช้ที่เก็บไว้
const CACHE = 'kumremote-v2.24';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
