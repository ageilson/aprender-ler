// Os jeitos de escrever: letra de forma MAIÚSCULA, letra de forma minúscula e cursiva (letra de mão).
// "Misturada" sorteia um jeito para cada palavra, para a criança reconhecer todos.

export const MODOS = ['maiuscula', 'minuscula', 'cursiva'];
let modo = 'maiuscula';
const ouvintes = new Set();

export const modoAtual = () => modo;

export function definirModo(novo) {
  modo = novo;
  document.documentElement.dataset.escrita = novo;
  ouvintes.forEach((f) => f(novo));
}

export function aoMudarModo(f) { ouvintes.add(f); }

export function resolverModo(fixo) {
  if (fixo) return fixo;
  if (modo === 'misturada') return MODOS[Math.floor(Math.random() * MODOS.length)];
  return modo;
}

// frase=true mantém a primeira letra maiúscula, como nos livros, quando o modo é minúsculo ou cursivo.
export function transformar(texto, m, { frase = false } = {}) {
  if (m === 'maiuscula') return texto.toLocaleUpperCase('pt-BR');
  if (frase) return texto;
  return texto.toLocaleLowerCase('pt-BR');
}

export const classeDe = (m) => (m === 'cursiva' ? 'esc-cursiva' : 'esc-forma');

// Cria um elemento com o texto no jeito de escrever pedido (ou no modo atual).
export function escrito(tag, texto, { modo: fixo, frase = false, classe = '', fala } = {}) {
  const m = resolverModo(fixo);
  const el = document.createElement(tag);
  el.className = `${classe} ${classeDe(m)}`.trim();
  el.textContent = transformar(texto, m, { frase });
  el.dataset.modo = m;
  if (fala !== undefined) el.dataset.fala = fala;
  return el;
}
