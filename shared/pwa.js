(function () {
  if (!('serviceWorker' in navigator)) return;

  try {
    if (new URLSearchParams(location.search).get('nosw') === '1') {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) { r.unregister(); });
      });
      if (window.caches && caches.keys) {
        caches.keys().then(function (keys) {
          keys.forEach(function (k) { caches.delete(k); });
        });
      }
      return;
    }
  } catch (e) {}

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  });
})();
