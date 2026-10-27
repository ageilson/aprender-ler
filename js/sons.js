// Sons das letras do método fônico, gravados por pais.
//  - "Minha gravação": fica só neste aparelho (IndexedDB). Só sai daqui se o pai tocar em "Enviar".
//  - Vozes publicadas: enviadas por pais, conferidas e colocadas no site (dados/sons.json + pasta sons/<id>/).
//    No máximo 10; a de nota mais baixa sai quando chega uma nova (ferramentas/sons.py).
// config.vozSons: '' = automático (minha gravação, senão a voz padrão, senão a de melhor nota),
//                 'local' = minha gravação, ou o id de uma voz publicada.

import { config, mudarConfig } from './progresso.js';
import { enviarAvisoAnonimo } from './contador.js';

let catalogo = { padrao: null, conjuntos: [] };
const urlsLocais = new Map();

export async function carregarCatalogo() {
  try {
    const r = await fetch('dados/sons.json', { cache: 'no-cache' });
    if (r.ok) catalogo = await r.json();
  } catch { /* sem catálogo: só a gravação local */ }
}

export const vozesPublicadas = () => catalogo.conjuntos;
export const vozPadrao = () => catalogo.padrao;

// ------------------------------------------------------------------ gravações deste aparelho (IndexedDB)
function banco() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open('aprender-ler', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('sons');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function operacao(modo, f) {
  const b = await banco();
  return new Promise((ok, erro) => {
    const tx = b.transaction('sons', modo);
    const pedido = f(tx.objectStore('sons'));
    tx.oncomplete = () => ok(pedido.result);
    tx.onerror = () => erro(tx.error);
  });
}

export async function salvarGravacao(chave, blob) {
  await operacao('readwrite', (s) => s.put(blob, chave));
  urlsLocais.delete(chave);
}
export const lerGravacao = (chave) => operacao('readonly', (s) => s.get(chave)).catch(() => null);
export const chavesGravadas = () => operacao('readonly', (s) => s.getAllKeys()).catch(() => []);
export async function apagarGravacoes() {
  await operacao('readwrite', (s) => s.clear());
  urlsLocais.clear();
}

// ------------------------------------------------------------------ qual voz usar
async function vozEscolhida() {
  const escolha = config().vozSons || '';
  if (escolha === 'local') return 'local';
  if (escolha && catalogo.conjuntos.some((c) => c.id === escolha)) return escolha;
  if ((await chavesGravadas()).length) return 'local';
  if (catalogo.padrao && catalogo.conjuntos.some((c) => c.id === catalogo.padrao)) return catalogo.padrao;
  const melhor = [...catalogo.conjuntos].sort((a, b) => (b.nota || 0) - (a.nota || 0))[0];
  return melhor ? melhor.id : null;
}

// Endereço do som desta letra na voz escolhida (ou na voz pedida), ou null se ninguém gravou.
export async function fonteDoSom(chave, voz) {
  voz = voz || await vozEscolhida();
  if (!voz) return null;
  if (voz === 'local') {
    if (!urlsLocais.has(chave)) {
      const blob = await lerGravacao(chave);
      urlsLocais.set(chave, blob ? URL.createObjectURL(blob) : null);
    }
    return urlsLocais.get(chave);
  }
  const conjunto = catalogo.conjuntos.find((c) => c.id === voz);
  return conjunto && conjunto.sons.includes(chave) ? `sons/${voz}/${chave}.mp3` : null;
}

export async function temSonsDisponiveis() {
  return (await vozEscolhida()) !== null;
}

export function usarVoz(voz) { mudarConfig('vozSons', voz); }
export const vozAtual = () => config().vozSons || '';

// ------------------------------------------------------------------ nota anônima (1 a 5), uma vez por voz
export const notaDada = (id) => (config().notasSons || {})[id] || 0;
export function darNota(id, nota) {
  if (notaDada(id)) return false;
  mudarConfig('notasSons', { ...(config().notasSons || {}), [id]: nota });
  enviarAvisoAnonimo(`/nota-sons/${id}/${nota}`);
  return true;
}

// ------------------------------------------------------------------ gravar com o microfone
export const podeGravar = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

// Começa a gravar; devolve parar() -> Promise<Blob>. Para sozinho depois de maxMs.
export async function gravar(maxMs = 2500) {
  const fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const gravador = new MediaRecorder(fluxo);
  const pedacos = [];
  gravador.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data); };
  const pronto = new Promise((ok) => {
    gravador.onstop = () => {
      fluxo.getTracks().forEach((t) => t.stop());
      ok(new Blob(pedacos, { type: gravador.mimeType || pedacos[0]?.type || 'audio/webm' }));
    };
  });
  gravador.start();
  const timer = setTimeout(() => gravador.state !== 'inactive' && gravador.stop(), maxMs);
  return {
    parar() {
      clearTimeout(timer);
      if (gravador.state !== 'inactive') gravador.stop();
      return pronto;
    },
    pronto,
  };
}

// ------------------------------------------------------------------ enviar para outros pais usarem
// Junta as gravações num arquivo .json (áudio em base64) para mandar por WhatsApp ou e-mail.
export async function arquivoParaEnviar(apelido) {
  const chaves = await chavesGravadas();
  const sons = {};
  let tipo = '';
  for (const chave of chaves) {
    const blob = await lerGravacao(chave);
    tipo = tipo || blob.type;
    sons[chave] = await new Promise((ok) => {
      const leitor = new FileReader();
      leitor.onload = () => ok(String(leitor.result).split(',')[1]);
      leitor.readAsDataURL(blob);
    });
  }
  const pacote = {
    app: 'aprender-ler', tipo: 'sons-das-letras', versao: 1,
    apelido: (apelido || '').trim().slice(0, 40), mes: new Date().toISOString().slice(0, 7), tipoAudio: tipo, sons,
  };
  return new File([JSON.stringify(pacote)], 'sons-das-letras-aprender-ler.json', { type: 'application/json' });
}
