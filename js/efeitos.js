// Comemorações: confete, emoji grande e sons curtinhos feitos na hora (sem arquivos).

import { contexto, falar } from './voz.js';
import { dados, umDe } from './dados.js';

const CORES = ['#ff8a3d', '#3d9bff', '#2fbf71', '#9b5de5', '#f15bb5', '#ffd23f'];

function nota(freq, inicio, duracao, tipo = 'sine', volume = 0.18) {
  const ctx = contexto();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = tipo;
  osc.frequency.value = freq;
  const t = ctx.currentTime + inicio;
  ganho.gain.setValueAtTime(0, t);
  ganho.gain.linearRampToValueAtTime(volume, t + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.001, t + duracao);
  osc.connect(ganho).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duracao + 0.05);
}

export function somAcerto() { nota(880, 0, 0.18); nota(1320, 0.1, 0.3); }
export function somErro() { nota(220, 0, 0.25, 'triangle', 0.15); nota(180, 0.12, 0.3, 'triangle', 0.12); }
export function somVitoria() { [523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.12, 0.35)); }
export function somVirar() { nota(660, 0, 0.08, 'triangle', 0.08); }

export function confete(quantidade = 60) {
  const festa = document.getElementById('festa');
  for (let i = 0; i < quantidade; i++) {
    const c = document.createElement('i');
    c.className = 'confete';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = umDe(CORES);
    c.style.animationDuration = 1.6 + Math.random() * 1.8 + 's';
    c.style.animationDelay = Math.random() * 0.4 + 's';
    festa.appendChild(c);
    setTimeout(() => c.remove(), 4200);
  }
}

export function mostrarGrande(emoji, texto) {
  const festa = document.getElementById('festa');
  const e = document.createElement('div');
  e.className = 'festa-emoji';
  e.textContent = emoji;
  festa.appendChild(e);
  setTimeout(() => e.remove(), 1700);
  if (texto) {
    const t = document.createElement('div');
    t.className = 'festa-texto';
    t.textContent = texto;
    festa.appendChild(t);
    setTimeout(() => t.remove(), 1700);
  }
}

export function elogio() { return umDe(dados().frases.elogios); }

// Acertou: som + elogio falado. Devolve a promessa da fala.
export function acertou() {
  somAcerto();
  return falar(elogio());
}

export function errou() {
  somErro();
  return falar(umDe(dados().frases.erros));
}

export async function festejar(emoji = '⭐', estrelaNova = false) {
  somVitoria();
  confete();
  mostrarGrande(emoji, estrelaNova ? '+1 ⭐' : '');
  await falar(estrelaNova ? dados().frases.estrela : elogio());
}
