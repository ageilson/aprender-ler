// Uma lição: palavra geradora (Paulo Freire), juntar letras, família silábica e descoberta de palavras.

import {
  dados, licao, falaSilaba, falaSilabaDe, falaLetra, falaPalavra, preencher, semAcento,
  sortear, palavrasPossiveis, decompor, simples, separarSilaba, juntavel, falaConsoante, falaVogais, falaFamilia,
} from './dados.js';
import { falar, falarSequencia, precarregar } from './voz.js';
import { escrito, resolverModo, transformar, classeDe } from './escrita.js';
import { lerAgora } from './dedo.js';
import { temEstrela, descobertas, descobrir } from './progresso.js';
import { somAcerto, mostrarGrande, confete } from './efeitos.js';
import { h, emoji, botao, concluir, destacar, esperar, instrucao } from './ui.js';
import { atvHistoria } from './historia.js';
import { atvMemoria, atvCaca, atvMontar } from './jogos.js';
import { ehFonico, falaDaLetra, falaDasVogais } from './metodo.js';

export const ATIVIDADES = {
  palavra:    { icone: '🖼️', nome: 'Palavra',   render: atvPalavra },
  juntar:     { icone: '🧲', nome: 'Juntar',    render: atvJuntar },
  familia:    { icone: '🔤', nome: 'Família',   render: atvFamilia },
  descoberta: { icone: '🔍', nome: 'Descobrir', render: atvDescoberta },
  historia:   { icone: '🎬', nome: 'História',  render: atvHistoria },
  memoria:    { icone: '🃏', nome: 'Memória',   render: atvMemoria },
  caca:       { icone: '🎯', nome: 'Caça',      render: atvCaca },
  montar:     { icone: '🧩', nome: 'Montar',    render: atvMontar },
  vogais:     { icone: '🅰️', nome: 'Vogais',    render: atvVogais },
  encontros:  { icone: '🧲', nome: 'Juntar',    render: atvEncontros },
};

// Paulo Freire parte da palavra; o fônico parte do som das letras (Juntar vira "Sons" e vem primeiro).
export function atividadesDa(l) {
  if (l.tipo === 'vogais') return ['vogais', 'encontros', 'historia', 'memoria', 'caca'];
  return ehFonico()
    ? ['juntar', 'familia', 'palavra', 'montar', 'descoberta', 'caca', 'memoria', 'historia']
    : ['palavra', 'juntar', 'familia', 'descoberta', 'historia', 'memoria', 'caca', 'montar'];
}

const nomeDaAtividade = (a) => (a === 'juntar' && ehFonico() ? ['👂', 'Sons'] : [ATIVIDADES[a].icone, ATIVIDADES[a].nome]);

export const emojiDa = (l) => l.emoji || dados().palavras[l.palavra].e;

export function telaLicao(tela, id, atividade) {
  const l = licao(id);
  if (!l) { location.hash = '#/mapa'; return; }
  const lista = atividadesDa(l);
  if (!lista.includes(atividade)) atividade = lista[0];

  const titulo = l.tipo === 'vogais'
    ? h('h2', { dataset: { fala: l.titulo } }, l.titulo)
    : escrito('h2', l.palavra, { fala: falaPalavra(l.palavra) });
  const abas = h('nav', { class: 'abas' }, lista.map((a) => h('button', {
    class: `aba ${a === atividade ? 'ativa' : ''} ${temEstrela(l.id, a) ? 'feita' : ''}`,
    dataset: { atividade: a },
    onclick: () => { location.hash = `#/licao/${l.id}/${a}`; },
  }, emoji(nomeDaAtividade(a)[0]), nomeDaAtividade(a)[1])));
  const area = h('section', { class: 'atividade' });
  const maisJogos = h('a', { class: 'btn branco mais-jogos', href: `#/jogos/todos/${l.id}` }, emoji('🎮'), 'Mais jogos');
  tela.append(h('div', { class: 'licao-topo' }, emoji(emojiDa(l)), titulo, maisJogos), abas, area);
  abas.querySelector('.ativa')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  ATIVIDADES[atividade].render(area, l);
}

// ------------------------------------------------------------------ palavra geradora
function atvPalavra(area, l) {
  const d = dados();
  let atual = l.palavra;
  const lidos = new Set();
  let ganhou = temEstrela(l.id, 'palavra');
  const cartao = h('div', { class: 'palavra-card' });
  const mais = h('div', { class: 'mais-palavras' });

  function desenhar() {
    const p = d.palavras[atual];
    const m = resolverModo();
    const fPal = falaPalavra(atual);
    const sil = p.s.map((s, i) => escrito('span', s, { modo: m, classe: 'silaba', fala: falaSilabaDe(atual, i) }));
    sil.forEach((el, i) => { el.dataset.k = 's' + i; });
    const inteira = escrito('div', atual, { modo: m, classe: 'palavra-inteira', fala: fPal });
    inteira.dataset.k = 'p';
    const letras = [...atual].map((c, i) => escrito('span', c, { modo: m, classe: 'letra', fala: falaDaLetra(c, atual[i + 1] || '') }));
    const devagar = botao('Ouvir devagar', async () => {
      const ok = await falarSequencia([...p.s.map((_, i) => falaSilabaDe(atual, i)), fPal], {
        aoItem: (i) => destacar([...sil, inteira], i), pausa: 350,
      });
      destacar([...sil, inteira], -1);
      if (ok) marcar('s', p.s.length);
    }, 'azul', '🐢');
    const jeitos = h('div', { class: 'jeitos' },
      ['maiuscula', 'minuscula', 'cursiva'].map((mm) => escrito('span', atual, { modo: mm, classe: 'jeito', fala: fPal })),
      h('span', { class: `jeito ${classeDe('minuscula')}`, dataset: { fala: fPal } }, atual[0].toLocaleUpperCase('pt-BR') + atual.slice(1)));
    cartao.replaceChildren(
      h('div', { class: 'figura mexe', dataset: { fala: fPal } }, p.e),
      h('div', { class: 'rotulo' }, 'sílabas'),
      h('div', { class: 'silabas ler-arrasto', style: `--n:${p.s.length}` }, sil),
      h('div', { class: 'rotulo' }, 'palavra'),
      h('div', { class: 'ler-arrasto' }, inteira),
      h('div', { class: 'rotulo' }, 'letras'),
      h('div', { class: 'letras ler-arrasto' }, letras),
      h('div', { class: 'acoes' }, devagar),
      h('div', { class: 'rotulo' }, 'outros jeitos de escrever'),
      jeitos,
    );
    mais.querySelectorAll('button').forEach((b) => b.classList.toggle('ativo', b.dataset.p === atual));
    lidos.clear();
    precarregar([fPal, ...p.s.map((_, i) => falaSilabaDe(atual, i)), ...[...atual].map((c) => falaLetra(c))]);
  }

  function marcar(k, n) {
    if (k === 's') for (let i = 0; i < n; i++) lidos.add('s' + i);
    else lidos.add(k);
    const p = d.palavras[atual];
    const todas = p.s.every((_, i) => lidos.has('s' + i)) && (lidos.has('p') || k === 's');
    if (todas && !ganhou) { ganhou = true; esperar(700).then(() => concluir(l.id, 'palavra', p.e)); }
  }
  cartao.addEventListener('lido', (e) => { const k = e.target.dataset.k; if (k) marcar(k); });

  l.palavras.forEach((w) => mais.append(h('button', {
    dataset: { p: w, fala: falaPalavra(w) },
    onclick: () => { atual = w; desenhar(); },
  }, d.palavras[w].e)));
  area.append(h('p', { class: 'dica' }, 'Passe o dedo nas sílabas, na palavra e nas letras.'), cartao,
    h('div', { class: 'rotulo', style: 'text-align:center;margin-top:16px' }, 'mais palavras desta lição'), mais);
  desenhar();
  instrucao(d.frases.palavra);
}

// ------------------------------------------------------------------ juntar letras (e vogais)
// Cada rodada tem duas peças que se juntam: {a, b, fa, fb, junto, fj, emoji}
function mesaDeJuntar(area, rodadas, aoTerminar, dicaFalada) {
  let r = 0;
  const trilha = h('div', { class: 'trilha' });
  const mesa = h('div', { class: 'mesa-juntar' });
  const resultado = h('div', { class: 'resultado-juntar' });
  const acoes = h('div', { class: 'acoes' });
  area.append(h('p', { class: 'dica' }, 'Arraste uma peça até a outra ou aperte JUNTAR!'), trilha, mesa, resultado, acoes);
  precarregar(rodadas.flatMap((x) => [x.fa, x.fb, x.fj]));

  function desenhar() {
    trilha.replaceChildren(...rodadas.map((x, i) => h('span', { class: i < r ? 'feita' : '' }, transformar(x.junto, 'maiuscula'))));
    const x = rodadas[r];
    const m = resolverModo();
    const pa = escrito('div', x.a, { modo: m, classe: 'peca', fala: x.fa });
    const pb = escrito('div', x.b, { modo: m, classe: 'peca vogal', fala: x.fb });
    [pa, pb].forEach((p) => { p.dataset.semToque = ''; arrastavel(p, p === pa ? pb : pa); });
    mesa.replaceChildren(pa, h('span', { class: 'mais' }, '+'), pb);
    resultado.replaceChildren();
    acoes.replaceChildren(botao('Juntar!', juntar, 'roxo', '🧲'));
    let feito = false;

    function arrastavel(peca, outra) {
      let x0 = 0, y0 = 0, id = null, moveu = false;
      peca.addEventListener('pointerdown', (e) => {
        id = e.pointerId; x0 = e.clientX; y0 = e.clientY; moveu = false;
        peca.setPointerCapture(id);
        peca.classList.add('arrastando');
        lerAgora(peca);
      });
      peca.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (Math.hypot(dx, dy) > 8) moveu = true;
        peca.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      const soltar = (e) => {
        if (e.pointerId !== id) return;
        id = null;
        peca.classList.remove('arrastando');
        const a = peca.getBoundingClientRect(), b = outra.getBoundingClientRect();
        const perto = Math.hypot((a.left + a.right - b.left - b.right) / 2, (a.top + a.bottom - b.top - b.bottom) / 2) < (a.width + b.width) * 0.75;
        if (moveu && perto) juntar();
        else peca.style.transform = '';
      };
      peca.addEventListener('pointerup', soltar);
      peca.addEventListener('pointercancel', soltar);
    }

    async function juntar() {
      if (feito) return;
      feito = true;
      acoes.replaceChildren();
      pa.style.transform = pb.style.transform = '';
      // posição de layout (sem o arrasto): as peças vão se encontrar no meio
      const fimA = pa.offsetLeft + pa.offsetWidth, iniB = pb.offsetLeft;
      const meio = (fimA + iniB) / 2;
      const ok = await falarSequencia([x.fa, x.fb, x.fj], {
        pausa: 300,
        aoItem: (i) => {
          destacar([pa, pb], i);
          if (i === 2) {
            mesa.querySelector('.mais').style.opacity = '0';
            pa.style.transform = `translateX(${meio - fimA + 2}px)`;
            pb.style.transform = `translateX(${meio - iniB - 2}px)`;
            setTimeout(() => {
              const junto = escrito('div', x.junto, { modo: m, classe: 'silaba', fala: x.fj });
              resultado.replaceChildren(junto, x.emoji ? emoji(x.emoji, '', { style: 'font-size:70px;margin-left:12px' }) : null);
              junto.classList.add('lendo');
              setTimeout(() => junto.classList.remove('lendo'), 900);
            }, 400);
          }
        },
      });
      somAcerto();
      if (!ok) await esperar(400);
      await esperar(700);
      r++;
      if (r < rodadas.length) desenhar();
      else { trilha.replaceChildren(...rodadas.map((y) => h('span', { class: 'feita' }, transformar(y.junto, 'maiuscula')))); aoTerminar(mesa, resultado, acoes); }
    }
  }
  desenhar();
  instrucao(dicaFalada);
}

function atvJuntar(area, l) {
  const d = dados();
  const p = d.palavras[l.palavra];
  // até 4 sílabas da palavra geradora e o resto (até 6 rodadas) sorteado das famílias da lição
  const rodadas = p.s.map((s, i) => ({ s, f: falaSilabaDe(l.palavra, i) })).filter((x) => juntavel(x.s)).slice(0, 4);
  const daFamilia = sortear(l.familias.flatMap((f) => d.familias[f]).filter((s) => juntavel(s) && !p.s.includes(s)), Math.max(2, 6 - rodadas.length))
    .map((s) => ({ s, f: falaSilaba(s) }));
  const todas = [...rodadas, ...daFamilia].map(({ s, f }) => {
    const { consoante, vogal } = separarSilaba(s);
    return { a: consoante, b: vogal, fa: falaDaLetra(consoante, vogal), fb: falaDasVogais(vogal), junto: s, fj: f };
  });
  mesaDeJuntar(area, todas, (mesa, resultado, acoes) => {
    // fim: as sílabas da palavra geradora viram a palavra
    const m = resolverModo();
    const sil = p.s.map((s, i) => escrito('span', s, { modo: m, classe: 'silaba', fala: falaSilabaDe(l.palavra, i) }));
    const inteira = escrito('div', l.palavra, { modo: m, classe: 'palavra-inteira', fala: falaPalavra(l.palavra) });
    mesa.replaceChildren(h('div', { class: 'silabas ler-arrasto' }, sil));
    resultado.replaceChildren(inteira, emoji(p.e, '', { style: 'font-size:80px;margin-left:12px' }));
    acoes.replaceChildren(botao('Juntar de novo', () => { area.replaceChildren(); atvJuntar(area, l); }, 'branco', '🔁'));
    falarSequencia([...p.s.map((_, i) => falaSilabaDe(l.palavra, i)), falaPalavra(l.palavra)], {
      pausa: 300, aoItem: (i) => destacar([...sil, inteira], i),
    }).then(() => concluir(l.id, 'juntar', '🧲'));
  }, ehFonico() ? d.frases.juntarSons : d.frases.juntar);
}

function atvEncontros(area, l) {
  const d = dados();
  const rodadas = l.encontros.map((e) => ({
    a: e.t[0], b: e.t.slice(1), fa: falaDaLetra(e.t[0]), fb: falaDasVogais(e.t.slice(1)), junto: e.t, fj: e.f, emoji: e.e,
  }));
  mesaDeJuntar(area, rodadas, (mesa, resultado, acoes) => {
    mesa.replaceChildren(h('div', { class: 'silabas ler-arrasto' },
      l.encontros.map((e) => escrito('span', e.t, { classe: 'silaba', fala: e.f }))));
    resultado.replaceChildren();
    acoes.replaceChildren(botao('Juntar de novo', () => { area.replaceChildren(); atvEncontros(area, l); }, 'branco', '🔁'));
    concluir(l.id, 'encontros', '🧲');
  }, d.frases.juntarVogais);
}

// ------------------------------------------------------------------ família silábica
function atvFamilia(area, l) {
  const d = dados();
  const lidas = new Set();
  const meta = Math.min(5, l.familias.reduce((n, f) => n + d.familias[f].length, 0));
  let ganhou = temEstrela(l.id, 'familia');
  const caixa = h('div', { class: 'familias' });
  l.familias.forEach((f, k) => {
    const m = resolverModo();
    const sil = d.familias[f].map((s) => escrito('span', s, { modo: m, classe: 'silaba', fala: falaSilaba(s) }));
    const tituloFala = preencher(d.frases.familia, { x: falaFamilia(f) });
    caixa.append(h('div', { class: `familia-linha cor-${k % 6}` },
      h('div', { style: 'display:flex;align-items:center;gap:10px;justify-content:space-between' },
        h('span', { class: 'familia-titulo', dataset: { fala: tituloFala } }, 'Família do ', h('span', { class: classeDe(m) }, transformar(f, m))),
        h('button', {
          class: 'btn branco', style: 'min-height:44px;font-size:17px;padding:6px 14px',
          onclick: () => falarSequencia(sil.map((x) => x.dataset.fala), { aoItem: (i) => destacar(sil, i), pausa: 200 }),
        }, emoji('🔊'), 'Ler a fila')),
      h('div', { class: 'familia-silabas ler-arrasto' }, sil),
      d.notasFamilias[f] ? h('div', { class: 'familia-nota' }, d.notasFamilias[f]) : null));
    precarregar(sil.map((x) => x.dataset.fala));
  });
  caixa.addEventListener('lido', (e) => {
    if (!e.target.classList.contains('silaba')) return;
    lidas.add(e.target.dataset.fala);
    if (!ganhou && lidas.size >= meta) { ganhou = true; esperar(800).then(() => concluir(l.id, 'familia', '🔤')); }
  });
  const exemplo = d.familias[l.familias[0]].map((s) => s.toUpperCase()).join(', ');
  area.append(h('p', { class: 'dica' }, `Passe o dedo na fila inteira: ${exemplo}!`), caixa);
  instrucao(preencher(d.frases.familia, { x: falaFamilia(l.familias[0]) }));
}

// ------------------------------------------------------------------ descoberta (ficha da descoberta)
function atvDescoberta(area, l) {
  const d = dados();
  // peças (filas): vogais, as famílias desta lição inteiras e uma fila com as peças de outras famílias
  // que montam as palavras desta lição (CACHORRO = CA + CHO + RRO). Só conta como "dá para descobrir"
  // a palavra que se monta com as peças que estão na tela.
  const linhas = [['vogais', d.familias.vogais], ...l.familias.map((f) => [f, d.familias[f]])];
  const naTela = new Set(linhas.flatMap(([, sil]) => sil).map(simples));
  // as lições podem ser feitas em qualquer ordem (de A a Z ou do fácil ao difícil): usa todas as famílias
  const conhecidasAte = Object.values(d.familias).flat();
  const original = new Map(conhecidasAte.map((s) => [simples(s), s]));
  const outras = [...new Set(l.palavras.flatMap((w) => decompor(w, conhecidasAte) || []))]
    .filter((p) => !naTela.has(p)).map((p) => original.get(p));
  if (outras.length) linhas.push(['outras', outras]);
  const pecas = linhas.flatMap(([, sil]) => sil);
  const conhecidas = new Set(palavrasPossiveis(pecas));
  const comp = [];
  let ocupado = false;
  let ganhou = temEstrela(l.id, 'descoberta');
  const meta = Math.max(1, Math.min(3, l.palavras.filter((w) => conhecidas.has(w)).length));

  const dicas = h('div', { class: 'dicas' });
  const caixa = h('div', { class: 'composicao ler-arrasto' });
  const teclado = h('div', { class: 'teclado' });

  function desenharDicas() {
    const achadas = descobertas(l.id);
    dicas.replaceChildren(...l.palavras.filter((w) => conhecidas.has(w)).map((w) => h('button', {
      class: `dica-palavra ${achadas.includes(w) ? 'achada' : ''}`, dataset: { fala: falaPalavra(w) },
    }, emoji(d.palavras[w].e), h('span', { class: 'feito' }, achadas.includes(w) ? transformar(w, resolverModo('maiuscula')) : '?'))));
  }
  const m = resolverModo();
  function desenharComp() {
    caixa.replaceChildren(...(comp.length
      ? comp.map((s) => escrito('span', s, { modo: m, classe: 'silaba', fala: falaSilaba(s) }))
      : [h('span', { class: 'vazio' }, 'toque nas sílabas aqui embaixo 👇')]));
  }

  async function apertar(s) {
    if (ocupado) return;
    comp.push(s);
    desenharComp();
    const texto = simples(comp.join(''));
    const achadas = [...conhecidas].filter((w) => simples(w) === texto);
    if (achadas.length) {
      ocupado = true;
      const w = achadas.find((x) => l.palavras.includes(x)) || achadas[0];
      await esperar(550);
      somAcerto();
      confete(30);
      mostrarGrande(d.palavras[w].e);
      caixa.replaceChildren(escrito('span', w, { modo: m, classe: 'silaba', fala: falaPalavra(w) }), emoji(d.palavras[w].e, '', { style: 'font-size:64px' }));
      await falarSequencia([falaPalavra(w), umElogio()], { pausa: 200 });
      descobrir(l.id, w);
      desenharDicas();
      comp.length = 0;
      desenharComp();
      ocupado = false;
      const daLicao = descobertas(l.id).filter((x) => l.palavras.includes(x)).length;
      if (!ganhou && daLicao >= meta) { ganhou = true; concluir(l.id, 'descoberta', '🔍'); }
    } else if (comp.length >= 5) {
      ocupado = true;
      await esperar(500);
      await falar(d.frases.naoConheco);
      comp.length = 0;
      desenharComp();
      ocupado = false;
    }
  }
  const umElogio = () => d.frases.elogios[Math.floor(Math.random() * d.frases.elogios.length)];

  linhas.forEach(([f, sil], k) => teclado.append(h('div', { class: `linha cor-${k % 6}` },
    sil.map((s) => {
      const b = escrito('button', s, { modo: m, classe: 'tecla', fala: falaSilaba(s) });
      b.addEventListener('click', () => apertar(s));
      return b;
    }))));
  precarregar([...pecas].map(falaSilaba));

  area.append(
    h('p', { class: 'dica' }, 'Toque numa figura para ouvir. Junte as sílabas para escrever!'), dicas, caixa,
    h('div', { class: 'acoes' },
      botao('Ler', () => {
        const chips = [...caixa.querySelectorAll('.silaba')];
        falarSequencia(comp.map(falaSilaba), { aoItem: (i) => destacar(chips, i), pausa: 150 });
      }, 'azul', '🔊'),
      botao('Apagar', () => { if (!ocupado) { comp.pop(); desenharComp(); } }, 'branco', '⌫')),
    teclado);
  desenharDicas();
  desenharComp();
  instrucao(d.frases.descobrir);
}

// ------------------------------------------------------------------ vogais
function atvVogais(area, l) {
  const d = dados();
  const lidas = new Set();
  let ganhou = temEstrela(l.id, 'vogais');
  const cards = l.vogais.map((v) => {
    const info = d.letras[v];
    const fv = falaDaLetra(v);
    const grande = escrito('div', v, { classe: 'grande', fala: fv });
    return h('div', { class: 'vogal-card', dataset: { v } },
      grande,
      h('div', { class: 'formas ler-arrasto' }, ['maiuscula', 'minuscula', 'cursiva'].map((mm) => escrito('span', v, { modo: mm, fala: fv }))),
      h('span', { class: 'emoji', dataset: { fala: preencher(d.frases.alfabeto, { x: fv, y: info.palavra }) } }, info.emoji),
      escrito('span', info.palavra, { classe: 'nome', fala: falaPalavra(info.palavra) }));
  });
  const grade = h('div', { class: 'vogais-grade' }, cards);
  grade.addEventListener('lido', (e) => {
    const v = e.target.closest('.vogal-card')?.dataset.v;
    if (v) lidas.add(v);
    if (!ganhou && lidas.size === l.vogais.length) { ganhou = true; esperar(800).then(() => concluir(l.id, 'vogais', '🅰️')); }
  });
  area.append(
    h('p', { class: 'dica' }, 'Passe o dedo nas letras, nas figuras e nas palavras.'),
    h('div', { class: 'acoes' }, botao('As vogais', () => {
      falarSequencia(l.vogais.map((v) => falaDaLetra(v)), { aoItem: (i) => destacar(cards.map((c) => c.firstChild), i), pausa: 300 });
    }, 'azul', '🔊')),
    grade);
  instrucao(d.frases.vogais);
}

