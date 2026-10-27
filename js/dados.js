// Conteúdo das lições (dados/licoes.json) e as regras de fala.
// As regras são as MESMAS de ferramentas/pronuncia.py: o áudio é procurado pelo texto falado.

let D = null;

export async function carregarDados() {
  const resposta = await fetch('dados/licoes.json', { cache: 'no-cache' });
  D = await resposta.json();
  return D;
}

export const dados = () => D;

const ACENTO = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
const TEM_ACENTO = /[áéíóúâêôãõà]/;

export function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function falaSilaba(s) {
  s = s.toLowerCase();
  if (D.silabasEspeciais[s]) return D.silabasEspeciais[s];
  if (TEM_ACENTO.test(s)) return s;
  const vogais = [...s].filter((c) => 'aeiou'.includes(c));
  const ultima = s[s.length - 1];
  if (vogais.length === 1 && ACENTO[ultima]) return s.slice(0, -1) + ACENTO[ultima];
  return s;
}

export function falaSilabaDe(palavra, i) {
  const p = D.palavras[palavra];
  return p.fs ? p.fs[i] : falaSilaba(p.s[i]);
}

export function falaLetra(letra) {
  letra = letra.toLowerCase();
  return D.letras[letra]?.nome || D.acentuadas[letra] || letra;
}

export function falaPalavra(palavra) {
  return D.palavras[palavra.toLowerCase()]?.fala || palavra.toLowerCase();
}

// Uma sílaba em consoante(s) + vogal(is): "bo" = b + o, "cha" = ch + a, "que" = qu + e, "pão" = p + ão.
const VOGAL = /[aeiouáéíóúâêôãõà]/;
export function separarSilaba(s) {
  let k = [...s].findIndex((c) => VOGAL.test(c));
  if (k < 0) return { consoante: s, vogal: '' };
  if (k > 0 && /[qg]/.test(s[k - 1]) && s[k] === 'u' && VOGAL.test(s[k + 1] || '')) k++;
  return { consoante: s.slice(0, k), vogal: s.slice(k) };
}

// Dá para "juntar" (peça de consoante + peça de vogal)? Não vale sílaba que termina em consoante (car, mas).
export function juntavel(s) {
  const { consoante, vogal } = separarSilaba(s);
  return consoante.length > 0 && vogal.length > 0 && [...vogal].every((c) => VOGAL.test(c));
}

export const falaConsoante = (c) => [...c].map(falaLetra).join(' ');
export const falaVogais = (v) => (v.length === 1 ? falaLetra(v) : v);
export const falaFamilia = (f) => D.nomesFamilias?.[f] || falaConsoante(f);

export function tokens(frase) {
  return frase.split(/\s+/).map((t) => t.replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu, '')).filter(Boolean);
}

export function preencher(modelo, valores) {
  return modelo.replace(/\{(\w+)\}/g, (_, k) => valores[k] ?? '');
}

export function licao(id) {
  return D.licoes.find((l) => l.id === id);
}

export function indiceLicao(id) {
  return D.licoes.findIndex((l) => l.id === id);
}

// Todas as famílias silábicas vistas até esta lição (inclusive), mais as vogais: as peças da descoberta.
export function familiasAte(id) {
  const ate = indiceLicao(id);
  const letras = [];
  D.licoes.slice(0, ate + 1).forEach((l) => (l.familias || []).forEach((f) => letras.includes(f) || letras.push(f)));
  return letras;
}

// Sem acentos, mas mantendo o Ç: ÇA e CA são peças diferentes.
export function simples(texto) {
  return texto.normalize('NFD').replace(/[̀-̨̦-ͯ]/g, '').normalize('NFC').toLowerCase();
}

// Como montar a palavra com as peças dadas (peças de 1 a 3 letras, da esquerda para a direita), ou null.
// decompor('cachorro', [...]) -> ['ca', 'cho', 'rro']
export function decompor(palavra, silabas) {
  const tem = new Set(silabas.map(simples));
  const alvo = simples(palavra);
  const de = (i) => {
    if (i === alvo.length) return [];
    for (const n of [3, 2, 1]) {
      const peca = alvo.slice(i, i + n);
      if (peca.length === n && tem.has(peca)) {
        const resto = de(i + n);
        if (resto) return [peca, ...resto];
      }
    }
    return null;
  };
  return de(0);
}

// Palavras do dicionário que dá para montar só com as peças dadas.
export function palavrasPossiveis(silabasDisponiveis) {
  return Object.keys(D.palavras).filter((p) => decompor(p, silabasDisponiveis));
}

export function sortear(lista, n) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return n === undefined ? copia : copia.slice(0, n);
}

export const umDe = (lista) => lista[Math.floor(Math.random() * lista.length)];
