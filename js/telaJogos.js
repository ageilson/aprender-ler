// Área só de jogos (#/jogos): escolhe o jogo, depois a letra (ou todas as letras), e joga.
//   #/jogos                     -> lista dos jogos
//   #/jogos/<jogo>              -> escolher a letra
//   #/jogos/<jogo>/<lição>      -> jogar ("todas" = palavras de todas as lições)
//   #/jogos/todos/<lição>       -> os jogos de uma lição (botão "Mais jogos" dentro da lição)

import { dados, licao, semAcento } from './dados.js';
import { escrito } from './escrita.js';
import { h, emoji } from './ui.js';
import { emojiDa } from './licao.js';
import {
  atvMemoria, atvCaca, atvMontar, atvSilabaFalta, atvComecaCom, atvContarSilabas, atvBingo,
  atvSomInicial, atvRimas, temExemploDeEscuta,
} from './jogos.js';

export const JOGOS = [
  { id: 'som-inicial', icone: '🕵️', nome: 'Detetive dos sons', desc: 'Ouça a pista e encontre a figura', jogar: atvSomInicial, aceita: (l) => temExemploDeEscuta(l, false) },
  { id: 'rimas', icone: '🎵', nome: 'Brincar de rima', desc: 'Descubra quais palavras rimam', jogar: atvRimas, aceita: (l) => temExemploDeEscuta(l, true) },
  { id: 'memoria', icone: '🃏', nome: 'Memória', desc: 'Ache os pares (fácil, médio ou difícil)', jogar: atvMemoria, vogais: true },
  { id: 'caca', icone: '🎯', nome: 'Caça', desc: 'Onde está a sílaba, a palavra ou a letra?', jogar: atvCaca, vogais: true },
  { id: 'montar', icone: '🧩', nome: 'Montar a palavra', desc: 'Junte as sílabas na ordem certa', jogar: atvMontar },
  { id: 'silaba-falta', icone: '❓', nome: 'Sílaba que falta', desc: 'Complete a palavra da figura', jogar: atvSilabaFalta },
  { id: 'comeca-com', icone: '🔤', nome: 'Começa com…', desc: 'Qual figura começa com a sílaba?', jogar: atvComecaCom },
  { id: 'contar', icone: '👏', nome: 'Conte as sílabas', desc: 'Bata palmas: quantas sílabas?', jogar: atvContarSilabas },
  { id: 'bingo', icone: '🎱', nome: 'Bingo de sílabas', desc: 'Escute e marque na cartela', jogar: atvBingo },
];

// "Todas as letras": as palavras e famílias de todas as lições (menos as vogais).
function todasAsLetras() {
  const d = dados();
  const comPalavras = d.licoes.filter((l) => l.tipo !== 'vogais');
  return {
    id: 'todas', titulo: 'Todas as letras', palavra: 'bola',
    familias: [...new Set(comPalavras.flatMap((l) => l.familias))],
    palavras: [...new Set(comPalavras.flatMap((l) => l.palavras))],
  };
}

const marca = (l) => l.rotulo || (l.tipo === 'vogais' ? 'A E I O U' : semAcento(l.palavra)[0].toUpperCase());
const podeJogar = (j, l) => (!j.aceita || j.aceita(l)) && (l.tipo !== 'vogais' || j.vogais);

export function telaJogos(tela, ir, jogoId, licaoId) {
  const d = dados();
  const jogo = JOGOS.find((j) => j.id === jogoId);

  // os jogos (de todas as letras, ou de uma lição)
  if (!jogo) {
    const l = jogoId === 'todos' && licaoId ? licao(licaoId) : null;
    const lista = JOGOS.filter((j) => !l || podeJogar(j, l));
    tela.append(
      h('h2', { class: 'titulo-tela' }, '🎮 Jogos', l ? ` da lição ${l.tipo === 'vogais' ? 'das vogais' : l.palavra.toUpperCase()}` : ''),
      h('div', { class: 'mapa jogos-grade' }, lista.map((j) => h('button', {
        class: `licao-card jogo-card jogo-${j.id}`, onclick: () => ir(l ? `#/jogos/${j.id}/${l.id}` : `#/jogos/${j.id}`),
      }, emoji(j.icone), h('span', { class: 'nome' }, j.nome), h('span', { class: 'estrelas' }, j.desc)))));
    return;
  }

  // escolher a letra
  if (!licaoId) {
    const deLetras = d.licoes.filter((l) => l.secao !== 'especial' && podeJogar(jogo, l))
      .sort((a, b) => (a.tipo === 'vogais' ? -1 : b.tipo === 'vogais' ? 1 : semAcento(a.palavra).localeCompare(semAcento(b.palavra), 'pt-BR')));
    const especiais = d.licoes.filter((l) => l.secao === 'especial' && podeJogar(jogo, l));
    const cartao = (l) => h('button', { class: 'licao-card', onclick: () => ir(`#/jogos/${jogo.id}/${l.id}`) },
      h('span', { class: `num letra-inicial ${marca(l).length > 2 ? 'longa' : ''}` }, marca(l)), emoji(emojiDa(l)),
      l.tipo === 'vogais' ? h('span', { class: 'nome' }, 'A E I O U') : escrito('span', l.palavra, { classe: 'nome' }));
    tela.append(
      h('h2', { class: 'titulo-tela' }, emoji(jogo.icone), ' ', jogo.nome),
      h('p', { class: 'dica' }, 'Escolha a letra para jogar.'),
      h('div', { class: 'mapa' },
        h('button', { class: 'licao-card especial', onclick: () => ir(`#/jogos/${jogo.id}/todas`) },
          emoji('🌈'), h('span', { class: 'nome' }, 'Todas as letras'), h('span', { class: 'estrelas' }, 'palavras de todas as lições')),
        deLetras.map(cartao)),
      h('h3', { class: 'secao-mapa' }, 'Sílabas especiais'),
      h('div', { class: 'mapa' }, especiais.map(cartao)),
      h('div', { class: 'acoes' }, h('button', { class: 'btn branco', onclick: () => ir('#/jogos') }, emoji('🎮'), 'Outros jogos')));
    return;
  }

  // jogar
  const l = licaoId === 'todas' ? todasAsLetras() : licao(licaoId);
  if (!l || !podeJogar(jogo, l)) { ir('#/jogos'); return; }
  const titulo = l.id === 'todas' ? 'Todas as letras' : l.tipo === 'vogais' ? 'A E I O U' : l.palavra.toUpperCase();
  const area = h('section', { class: 'atividade' });
  tela.append(
    h('div', { class: 'licao-topo' }, emoji(jogo.icone), h('h2', {}, jogo.nome, ' · ', titulo)),
    h('div', { class: 'acoes acoes-jogo' },
      h('button', { class: 'btn branco', onclick: () => ir(`#/jogos/${jogo.id}`) }, emoji('🔤'), 'Trocar a letra'),
      h('button', { class: 'btn branco', onclick: () => ir('#/jogos') }, emoji('🎮'), 'Outros jogos')),
    area);
  jogo.jogar(area, l);
}
