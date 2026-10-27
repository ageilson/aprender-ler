// Os dois métodos de alfabetização:
//  - "freire": parte da palavra geradora; tocar numa letra diz o NOME dela ("bê").
//  - "fonico": parte do SOM de cada letra ("bbb" curtinho) e junta som + som em sílaba.
// No fônico os sons são gravações de pais (ver sons.js). O texto "som:m" pede ao voz.js o som do M;
// "som:b+r" toca o B e depois o R.

import { dados, falaLetra, falaConsoante, falaVogais } from './dados.js';
import { config } from './progresso.js';

export const ehFonico = () => config().metodo === 'fonico';

const VOGAL_E_I = /^[eiéêí]/;

// As gravações que fazem o som deste grupo de letras: 'ch' -> ['x'], 'br' -> ['b', 'r'], 'ce' -> ['s'].
export function chavesDoSom(grupo, vogalSeguinte = '') {
  const d = dados();
  const g = grupo.toLowerCase();
  if (g === 'c' && VOGAL_E_I.test(vogalSeguinte)) return ['s'];
  if (g === 'g' && VOGAL_E_I.test(vogalSeguinte)) return ['j'];
  const existe = (k) => d.sons.some(([chave]) => chave === k);
  if (existe(g)) return [g];
  if (d.sonsIguais[g]) return [d.sonsIguais[g]];
  return [...g].map((c) => (existe(c) ? c : d.sonsIguais[c] || c));
}

// O que falar ao tocar numa letra (ou grupo de letras antes da vogal).
export function falaDaLetra(grupo, vogalSeguinte = '') {
  if (!ehFonico()) return grupo.length > 1 ? falaConsoante(grupo) : falaLetra(grupo);
  if (grupo.toLowerCase() === 'h') return 'som:h';
  return 'som:' + chavesDoSom(grupo, vogalSeguinte).join('+');
}

export function falaDasVogais(v) {
  if (!ehFonico()) return falaVogais(v);
  return v.length === 1 ? 'som:' + chavesDoSom(v).join('+') : falaVogais(v);
}
