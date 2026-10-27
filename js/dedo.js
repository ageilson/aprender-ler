// Leitura em voz alta de tudo que tem data-fala. Dois jeitos (escolhidos no guia de configuração):
//  - "toque":   lê só quando a criança toca ou clica (padrão: ela decide o que quer ouvir);
//  - "passar":  lê o que o mouse ou o dedo encostar; deslizando por uma fila de sílabas, lê uma por uma.

import { falar } from './voz.js';

const ESPERA_MOUSE = 110;   // ms parado em cima antes de ler (passar rápido não dispara)
const FILA_MAXIMA = 3;
let ultimo = null;
let timer = null;
let dedo = null;
let fila = [];
let lendoFila = false;
let modo = 'toque';

export function definirLeitura(novo) {
  modo = novo === 'passar' ? 'passar' : 'toque';
  document.documentElement.dataset.leitura = modo;
}

const alvoDe = (no) => no?.closest?.('[data-fala]') || null;

function marcar(el, ligado) {
  if (ligado) {
    document.querySelectorAll('.lendo').forEach((x) => x.classList.remove('lendo'));
    el.classList.add('lendo');
  } else {
    el.classList.remove('lendo');
  }
}

// Lê agora, interrompendo qualquer fala (toque ou clique).
export function lerAgora(el) {
  fila = [];
  ultimo = el;
  marcar(el, true);
  el.dispatchEvent(new CustomEvent('lido', { bubbles: true }));
  return falar(el.dataset.fala).finally(() => marcar(el, false));
}

// Deslizando: entra na fila para cada item ser ouvido inteiro, na ordem.
function enfileirar(el) {
  ultimo = el;
  fila.push(el);
  if (fila.length > FILA_MAXIMA) fila.shift();
  if (!lendoFila) processarFila();
}

async function processarFila() {
  lendoFila = true;
  while (fila.length) {
    const el = fila.shift();
    if (!el.isConnected) continue;
    marcar(el, true);
    el.dispatchEvent(new CustomEvent('lido', { bubbles: true }));
    const terminou = await falar(el.dataset.fala);
    marcar(el, false);
    if (!terminou) { fila = []; break; }
  }
  lendoFila = false;
}

export function ligarDedo() {
  document.addEventListener('pointerover', (e) => {
    if (modo !== 'passar' || e.pointerType !== 'mouse') return;
    const el = alvoDe(e.target);
    if (!el || el === ultimo || el.closest('[data-sem-mouse]')) return;
    clearTimeout(timer);
    timer = setTimeout(() => { if (el.matches(':hover')) enfileirar(el); }, ESPERA_MOUSE);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = alvoDe(e.target);
    if (el && el === ultimo && !el.contains(e.relatedTarget)) ultimo = null;
  });
  document.addEventListener('pointerdown', (e) => {
    const el = alvoDe(e.target);
    if (!el || el.dataset.semToque !== undefined) return;
    if (modo === 'passar' && e.pointerType !== 'mouse') {
      // sem isto o navegador "prende" o dedo no primeiro elemento e não vemos os outros
      try { e.target.releasePointerCapture?.(e.pointerId); } catch { /* ok */ }
      dedo = e.pointerId;
    }
    lerAgora(el);
  });
  document.addEventListener('pointermove', (e) => {
    if (modo !== 'passar' || e.pointerType === 'mouse' || e.pointerId !== dedo) return;
    const el = alvoDe(document.elementFromPoint(e.clientX, e.clientY));
    if (!el) { ultimo = null; return; }
    if (el !== ultimo) enfileirar(el);
  }, { passive: true });
  const soltar = (e) => { if (e.pointerId === dedo) dedo = null; };
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', soltar);
}
