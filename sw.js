// Guarda o app no aparelho para funcionar sem internet.
// Áudios, fontes e ícones: do cache primeiro (o nome do áudio muda quando a fala muda).
// Página, código e dados: da rede primeiro, com o cache de reserva (assim as atualizações chegam).
const CACHE = 'aprender-ler';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const fixo = /\.(mp3|woff2|png)$/.test(url.pathname);
  e.respondWith(fixo ? cacheAntes(e.request) : redeAntes(e.request));
});

async function cacheAntes(pedido) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(pedido);
  if (guardado) return guardado;
  const resposta = await fetch(pedido);
  if (resposta.ok) cache.put(pedido, resposta.clone());
  return resposta;
}

async function redeAntes(pedido) {
  const cache = await caches.open(CACHE);
  try {
    const resposta = await fetch(pedido);
    if (resposta.ok) cache.put(pedido, resposta.clone());
    return resposta;
  } catch (erro) {
    const guardado = await cache.match(pedido, { ignoreSearch: true });
    if (guardado) return guardado;
    throw erro;
  }
}
