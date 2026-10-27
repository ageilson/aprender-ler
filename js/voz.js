// A voz do app. Toca os MP3 da Francisca (audio/manifest.json: texto -> arquivo) pela Web Audio API,
// que responde na hora ao passar o dedo. Navegador sem Web Audio: toca o mesmo MP3 num <audio>.
// Sem o MP3, fala com a voz do próprio navegador.
// "som:m" (método fônico) toca a gravação do som da letra feita por pais (sons.js); "som:b+r" toca as duas.

import { dados, falaConsoante } from './dados.js';
import { fonteDoSom } from './sons.js';

let ctx = null;
let manifesto = { itens: {} };
let fonteAtual = null;
let elementoAtual = null;
const gravacoes = new Map();
const elementos = new Map();
let geracao = 0;
const buffers = new Map();
const historico = [];
window.__falas = historico; // para testes: o que foi pedido para falar, em ordem

export async function carregarManifesto() {
  try {
    const r = await fetch('audio/manifest.json', { cache: 'no-cache' });
    if (r.ok) manifesto = await r.json();
  } catch { /* sem áudios gravados: usa a voz do navegador */ }
}

export const totalAudios = () => Object.keys(manifesto.itens || {}).length;
export const listaAudios = () => Object.values(manifesto.itens || {}).map((i) => 'audio/' + i.a);
export const contexto = () => ctx;

// Navegadores só deixam tocar som depois de um toque: chamado pelo botão "Começar".
export function destravar() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  // iPhone/iPad: sem isto a chave do silencioso deixa a Web Audio muda
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
}

// O serviço de voz devolve ~0,16 s de silêncio antes da fala e ~1,3 s depois. Tocando só o trecho com
// fala, o dedo que desliza pelas sílabas ouve "bó-lá" em vez de "bó... (silêncio) ...lá".
function trechoComFala(buf, item) {
  if (item.t) return { buf, inicio: item.t[0], duracao: item.t[1] - item.t[0] };
  const amostras = buf.getChannelData(0);
  const limiar = 0.008;
  let i = 0, f = amostras.length - 1;
  while (i < f && Math.abs(amostras[i]) < limiar) i++;
  while (f > i && Math.abs(amostras[f]) < limiar) f--;
  const inicio = Math.max(0, i / buf.sampleRate - 0.03);
  const fim = Math.min(buf.duration, f / buf.sampleRate + 0.12);
  return fim > inicio ? { buf, inicio, duracao: fim - inicio } : { buf, inicio: 0, duracao: buf.duration };
}

function buffer(texto) {
  const item = manifesto.itens?.[texto];
  if (!item || !ctx) return Promise.resolve(null);
  if (!buffers.has(texto)) {
    buffers.set(texto, fetch('audio/' + item.a)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((b) => new Promise((ok, erro) => ctx.decodeAudioData(b, ok, erro)))
      .then((b) => trechoComFala(b, item))
      .catch(() => null));
  }
  return buffers.get(texto);
}

export function precarregar(textos) {
  const semWebAudio = !(window.AudioContext || window.webkitAudioContext);
  textos.forEach((t) => {
    const item = manifesto.itens?.[t];
    if (!semWebAudio) buffer(t);
    else if (item && !elementos.has(item.a)) {
      const el = new Audio('audio/' + item.a);
      el.preload = 'auto';
      elementos.set(item.a, el);
    }
  });
}

export function parar() {
  geracao++;
  if (fonteAtual) {
    try { fonteAtual.stop(); } catch { /* já parou */ }
    fonteAtual = null;
  }
  if (elementoAtual) {
    elementoAtual.pause();
    elementoAtual = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Fala um texto, interrompendo o que estiver falando. Resolve true se terminou, false se foi interrompido.
// aoPalavra(i) é chamado quando a i-ésima palavra da frase começa (karaokê).
export function falar(texto, opcoes = {}) {
  parar();
  return tocar(texto, geracao, opcoes);
}

// Fala vários textos em sequência; aoItem(i) avisa qual começou. Para tudo se outra fala começar.
export async function falarSequencia(textos, { aoItem, pausa = 250 } = {}) {
  parar();
  const minha = geracao;
  for (let i = 0; i < textos.length; i++) {
    aoItem?.(i);
    const terminou = await tocar(textos[i], minha);
    if (!terminou || minha !== geracao) return false;
    if (i < textos.length - 1) await new Promise((ok) => setTimeout(ok, pausa));
    if (minha !== geracao) return false;
  }
  aoItem?.(-1);
  return true;
}

async function tocar(texto, minha, { aoPalavra } = {}) {
  historico.push(texto);
  if (historico.length > 200) historico.shift();
  if (texto.startsWith('som:')) return tocarSons(texto.slice(4).split('+'), minha);
  const buf = await buffer(texto);
  if (minha !== geracao) return false;
  if (buf) return tocarBuffer(buf, minha, manifesto.itens[texto], aoPalavra);
  if (manifesto.itens?.[texto] && !ctx) return tocarElemento(manifesto.itens[texto], minha, aoPalavra);
  return falarNavegador(texto, minha, aoPalavra);
}

function tocarBuffer(trecho, minha, item, aoPalavra) {
  return new Promise((resolver) => {
    if (ctx.state === 'suspended') ctx.resume();
    const fonte = ctx.createBufferSource();
    fonte.buffer = trecho.buf;
    fonte.connect(ctx.destination);
    fonteAtual = fonte;
    const inicio = ctx.currentTime + 0.02;
    fonte.onended = () => {
      if (fonteAtual === fonte) fonteAtual = null;
      resolver(minha === geracao);
    };
    fonte.start(inicio, trecho.inicio, trecho.duracao);
    if (aoPalavra && item.p?.length) {
      let ultima = -1;
      const passo = () => {
        if (minha !== geracao || fonteAtual !== fonte) return;
        // os tempos do karaokê contam do começo do arquivo, antes do corte do silêncio
        const ms = (ctx.currentTime - inicio + trecho.inicio) * 1000;
        let atual = -1;
        for (const [t, i] of item.p) if (t <= ms + 20) atual = i;
        if (atual !== ultima && atual >= 0) { ultima = atual; aoPalavra(atual); }
        setTimeout(passo, 30);
      };
      setTimeout(passo, 30);
    }
  });
}

// ------------------------------------------------------------------ sons das letras (gravações dos pais)
async function tocarSons(chaves, minha, voz) {
  for (const chave of chaves) {
    const ok = await tocarSom(chave, minha, voz);
    if (!ok || minha !== geracao) return false;
  }
  return true;
}

async function tocarSom(chave, minha, voz) {
  if (chave === 'h') return tocar(dados().frases.hSemSom, minha);
  const url = await fonteDoSom(chave, voz);
  if (minha !== geracao) return false;
  // ninguém gravou este som ainda: diz o nome da letra, para não ficar mudo
  if (!url) return tocar(falaConsoante(chave), minha);
  if (ctx) {
    if (!gravacoes.has(url)) {
      gravacoes.set(url, fetch(url).then((r) => r.arrayBuffer())
        .then((b) => new Promise((ok, erro) => ctx.decodeAudioData(b, ok, erro)))
        .then(trechoDaGravacao).catch(() => null));
    }
    const trecho = await gravacoes.get(url);
    if (minha !== geracao) return false;
    if (trecho) return tocarBuffer(trecho, minha, {});
  }
  return tocarElemento({ url }, minha);
}

// Gravação de microfone: o silêncio em volta tem ruído, então o corte é relativo ao pico do som.
function trechoDaGravacao(buf) {
  const amostras = buf.getChannelData(0);
  let pico = 0;
  for (let i = 0; i < amostras.length; i++) pico = Math.max(pico, Math.abs(amostras[i]));
  const limiar = Math.max(0.02, pico * 0.12);
  let i = 0, f = amostras.length - 1;
  while (i < f && Math.abs(amostras[i]) < limiar) i++;
  while (f > i && Math.abs(amostras[f]) < limiar) f--;
  const inicio = Math.max(0, i / buf.sampleRate - 0.04);
  const fim = Math.min(buf.duration, f / buf.sampleRate + 0.08);
  return fim > inicio ? { buf, inicio, duracao: fim - inicio } : { buf, inicio: 0, duracao: buf.duration };
}

// Toca um som de uma voz específica (para ouvir amostras antes de escolher).
export function falarSomDaVoz(chaves, voz) {
  parar();
  return tocarSons(chaves, geracao, voz);
}

// Sem Web Audio: o mesmo MP3 num <audio>, do começo ao fim da fala (item.t), com o mesmo karaokê.
function tocarElemento(item, minha, aoPalavra) {
  return new Promise((resolver) => {
    const endereco = item.url || 'audio/' + item.a;
    let el = elementos.get(endereco);
    if (!el) {
      el = new Audio(endereco);
      el.preload = 'auto';
      elementos.set(endereco, el);
    }
    const [ini, fim] = item.t || [0, Infinity];
    let acabou = false, ultima = -1, relogio = null;
    const terminar = () => {
      if (acabou) return;
      acabou = true;
      clearInterval(relogio);
      el.pause();
      if (elementoAtual === el) elementoAtual = null;
      resolver(minha === geracao);
    };
    elementoAtual = el;
    el.onended = terminar;
    el.onerror = terminar;
    try { el.currentTime = ini; } catch { /* ainda carregando: começa do zero */ }
    relogio = setInterval(() => {
      if (minha !== geracao || el.currentTime >= fim) return terminar();
      if (aoPalavra && item.p?.length) {
        let atual = -1;
        for (const [t, i] of item.p) if (t <= el.currentTime * 1000 + 20) atual = i;
        if (atual !== ultima && atual >= 0) { ultima = atual; aoPalavra(atual); }
      }
    }, 30);
    el.play().catch(terminar);
  });
}

let vozNavegador = null;
function escolherVoz() {
  if (vozNavegador || !('speechSynthesis' in window)) return vozNavegador;
  const vozes = speechSynthesis.getVoices();
  vozNavegador = vozes.find((v) => /francisca/i.test(v.name))
    || vozes.find((v) => v.lang === 'pt-BR' && /natural|online|google/i.test(v.name))
    || vozes.find((v) => v.lang?.replace('_', '-') === 'pt-BR')
    || vozes.find((v) => v.lang?.startsWith('pt')) || null;
  return vozNavegador;
}
if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => { vozNavegador = null; escolherVoz(); });

export const nomeVozNavegador = () => escolherVoz()?.name || 'nenhuma voz em português';

function falarNavegador(texto, minha, aoPalavra) {
  const estimado = 500 + texto.length * 85;
  if (!('speechSynthesis' in window)) return new Promise((ok) => setTimeout(() => ok(minha === geracao), estimado));
  return new Promise((resolver) => {
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    fala.rate = 0.9;
    const voz = escolherVoz();
    if (voz) fala.voice = voz;
    let acabou = false;
    const fim = () => { if (!acabou) { acabou = true; resolver(minha === geracao); } };
    fala.onend = fim;
    fala.onerror = fim;
    if (aoPalavra) {
      const inicios = [];
      texto.replace(/\S+/g, (m, pos) => inicios.push(pos));
      fala.onboundary = (e) => {
        if (e.name && e.name !== 'word') return;
        let i = 0;
        while (i + 1 < inicios.length && inicios[i + 1] <= e.charIndex) i++;
        aoPalavra(i);
      };
    }
    // alguns navegadores esquecem o onend: garante o fim pelo tempo estimado
    setTimeout(fim, estimado * 2.5 + 1500);
    setTimeout(() => { if (minha === geracao) speechSynthesis.speak(fala); else fim(); }, 30);
  });
}
