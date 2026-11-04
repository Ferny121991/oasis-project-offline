import type { Plugin } from 'vite';

export function offlinePlugin(): Plugin {
  return {
    name: 'flujo-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['./', './index.html', './logo.svg', ...Object.keys(bundle).filter(name => name !== 'index.html').map(name => './' + name)];
      const version = `flujo-shell-${Date.now()}`;
      this.emitFile({type: 'asset', fileName: 'sw.js', source: `
const CACHE = ${JSON.stringify(version)};
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('flujo-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Cloud data and media are never put in this application-shell cache.
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match('./index.html')) || fetch(event.request)));
    return;
  }
  // Static assets may be served with Vary: Origin; preload requests and module
  // requests send different Origin headers even though the bytes are identical.
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request, { ignoreVary: true })) || fetch(event.request)));
});
`});
    },
  };
}
