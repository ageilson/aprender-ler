// Perfis das crianças, estrelas e preferências. Fica só neste aparelho (localStorage), nada vai para a internet.

const CHAVE = 'aprender-ler.v1';
// config.leitura: 'toque' (lê ao tocar/clicar) ou 'passar' (lê ao passar o dedo/mouse)
// config.instrucoes: a voz explica cada atividade ao abrir; config.configurado: o guia já foi feito
// config.metodo: 'freire' (palavra -> sílabas) ou 'fonico' (som das letras -> sílabas); config.vozSons: ver sons.js
let estado = {
  perfis: [], atual: null, progresso: {},
  config: { escrita: 'maiuscula', leitura: 'toque', instrucoes: true, configurado: false, metodo: 'freire', vozSons: '' },
};

export function carregarProgresso() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (salvo) estado = { ...estado, ...salvo, config: { ...estado.config, ...salvo.config } };
  } catch { /* navegador sem armazenamento: o app funciona, só não lembra */ }
  return estado;
}

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* idem */ }
}

export const perfis = () => estado.perfis;
export const perfilAtual = () => estado.perfis.find((p) => p.id === estado.atual) || null;
export const config = () => estado.config;

export function mudarConfig(chave, valor) {
  estado.config[chave] = valor;
  salvar();
}

export function criarPerfil(nome, bicho) {
  const perfil = { id: Date.now().toString(36), nome: nome.trim(), bicho };
  estado.perfis.push(perfil);
  estado.atual = perfil.id;
  salvar();
  return perfil;
}

export function escolherPerfil(id) {
  estado.atual = id;
  salvar();
}

export function apagarPerfil(id) {
  estado.perfis = estado.perfis.filter((p) => p.id !== id);
  delete estado.progresso[id];
  if (estado.atual === id) estado.atual = null;
  salvar();
}

export function zerarProgresso(id) {
  delete estado.progresso[id];
  salvar();
}

function dele(licaoId) {
  const id = estado.atual || 'visitante';
  estado.progresso[id] ??= {};
  estado.progresso[id][licaoId] ??= { estrelas: {}, descobertas: [] };
  return estado.progresso[id][licaoId];
}

export const estrelasDa = (licaoId) => Object.keys(dele(licaoId).estrelas).length;
export const temEstrela = (licaoId, atividade) => !!dele(licaoId).estrelas[atividade];

// Devolve true se a estrela é nova.
export function ganharEstrela(licaoId, atividade) {
  const p = dele(licaoId);
  if (p.estrelas[atividade]) return false;
  p.estrelas[atividade] = Date.now();
  salvar();
  return true;
}

export const descobertas = (licaoId) => dele(licaoId).descobertas;
export function descobrir(licaoId, palavra) {
  const p = dele(licaoId);
  if (!p.descobertas.includes(palavra)) { p.descobertas.push(palavra); salvar(); }
}

export function totalEstrelas(id = estado.atual || 'visitante') {
  return Object.values(estado.progresso[id] || {}).reduce((n, l) => n + Object.keys(l.estrelas).length, 0);
}
