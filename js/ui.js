// Ajudantes para montar as telas.

import { ganharEstrela, config } from './progresso.js';
import { festejar } from './efeitos.js';
import { falar } from './voz.js';

export function h(tag, props, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

export const emoji = (e, classe = '', props = {}) => h('span', { ...props, class: `emoji ${classe}`.trim() }, e);

export function botao(rotulo, aoClicar, classe = '', icone = '') {
  return h('button', { class: `btn ${classe}`.trim(), onclick: aoClicar }, icone ? emoji(icone) : null, rotulo);
}

// Tarefas para desfazer quando a tela muda (timers, animações).
const limpezas = [];
export function aoSair(f) { limpezas.push(f); }
export function sairDaTela() {
  while (limpezas.length) {
    try { limpezas.pop()(); } catch { /* ignora */ }
  }
}

export function esperar(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

// Marca a atividade como feita: estrela (se nova), festa e atualiza o topo.
export async function concluir(licaoId, atividade, icone) {
  const nova = ganharEstrela(licaoId, atividade);
  document.dispatchEvent(new CustomEvent('estrelas'));
  document.querySelector(`.aba[data-atividade="${atividade}"]`)?.classList.add('feita');
  await festejar(icone, nova);
  return nova;
}

// Destaca o i-ésimo elemento de uma lista (para sequências faladas); -1 apaga todos.
export function destacar(lista, i) {
  lista.forEach((el, k) => el.classList.toggle('lendo', k === i));
}

// Explicação falada ao abrir uma atividade (os pais podem desligar no guia de configuração).
export function instrucao(texto) {
  if (config().instrucoes) falar(texto);
}

// Contato para sugestões e melhorias (Área dos pais → Sobre) e para quem envia os sons das letras
export const CONTATO = {
  nome: 'Ageilson Rodrigues da Silva',
  email: 'ageilson2@gmail.com',
  whatsapp: '5569992669112',
  whatsappTexto: '(69) 99266-9112',
};

export function contato() {
  const assunto = encodeURIComponent('Aprender a Ler: sugestão');
  const zap = encodeURIComponent('Olá! Tenho uma sugestão para o Aprender a Ler: ');
  return h('div', { class: 'contato' },
    h('a', { class: 'btn branco', href: `mailto:${CONTATO.email}?subject=${assunto}`, target: '_blank', rel: 'noopener' }, emoji('✉️'), CONTATO.email),
    h('a', { class: 'btn verde', href: `https://wa.me/${CONTATO.whatsapp}?text=${zap}`, target: '_blank', rel: 'noopener' }, emoji('💬'), `WhatsApp ${CONTATO.whatsappTexto}`));
}
