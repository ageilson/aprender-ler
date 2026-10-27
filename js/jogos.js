// Jogos com voz: memória (3 níveis), caça, montar a palavra, sílaba que falta, começa com, conte as sílabas e bingo.

import {
  dados, falaSilaba, falaSilabaDe, falaLetra, falaPalavra, preencher, semAcento, sortear, umDe, familiasAte,
} from './dados.js';
import { falar, falarSequencia, precarregar } from './voz.js';
import { escrito, resolverModo, transformar, classeDe, MODOS } from './escrita.js';
import { acertou, errou, somVirar, somErro, somAcerto } from './efeitos.js';
import { h, emoji, botao, concluir, destacar, esperar, instrucao } from './ui.js';
import { ehFonico, falaDaLetra } from './metodo.js';
import { config, mudarConfig } from './progresso.js';

const outroModo = (m) => (m === 'maiuscula' ? umDe(['minuscula', 'cursiva']) : 'maiuscula');
const doisModos = () => sortear(MODOS, 2);

// Palavras para os jogos: as da lição e, se faltar, outras do dicionário com sílabas das famílias da lição;
// sem repetir figura (🎈 bexiga e 🎈 balão no mesmo jogo confundem).
export function palavrasParaJogo(l, quantas) {
  const d = dados();
  const daLicao = sortear(l.palavras || []);
  const silabas = new Set((l.familias || []).flatMap((f) => d.familias[f]).map(semAcento));
  const extras = sortear(Object.keys(d.palavras).filter((w) => !daLicao.includes(w)
    && d.palavras[w].s.some((x) => silabas.has(semAcento(x)))));
  const escolhidas = [];
  const figuras = new Set();
  for (const w of [...daLicao, ...extras]) {
    if (escolhidas.length >= quantas) break;
    if (figuras.has(d.palavras[w].e)) continue;
    figuras.add(d.palavras[w].e);
    escolhidas.push(w);
  }
  return escolhidas;
}

const NIVEIS = {
  facil: { nome: '😊 Fácil', pares: 6 },
  medio: { nome: '🙂 Médio', pares: 8 },
  dificil: { nome: '😎 Difícil', pares: 10 },
};

// ------------------------------------------------------------------ memória
export function atvMemoria(area, l) {
  const d = dados();
  const vogais = l.tipo === 'vogais';
  const modos = vogais
    ? [['letras', 'A ↔ a'], ['figuras', 'Letra e figura']]
    : [['imagem', '🖼️ Figura e palavra'], ['escritas', 'AA ↔ aa'], ['silabas', 'Sílabas']];
  let modo = modos[0][0];
  let nivel = NIVEIS[config().nivelMemoria] ? config().nivelMemoria : 'facil';
  const barraNivel = h('div', { class: 'modos niveis' });
  const barra = h('div', { class: 'modos' });
  const mesa = h('div', { class: 'memoria' });
  const fim = h('div', { class: 'acoes' });
  area.append(h('p', { class: 'dica' }, 'Vire duas cartas. Ache os pares!'), barraNivel, barra, mesa, fim);

  // fácil e médio: 6 e 8 pares; difícil: 10 pares e as duas cartas de cada par em jeitos de letra diferentes
  function cartasDoModo() {
    const pares = NIVEIS[nivel].pares;
    const dificil = nivel === 'dificil';
    if (modo === 'letras') {
      return l.vogais.map((v) => [
        { chave: v, texto: v, modo: 'maiuscula', fala: falaDaLetra(v) },
        { chave: v, texto: v, modo: umDe(['minuscula', 'cursiva']), fala: falaDaLetra(v) }]);
    }
    if (modo === 'figuras') {
      return l.vogais.map((v) => [
        { chave: v, texto: v, modo: resolverModo(), fala: falaDaLetra(v) },
        { chave: v, emoji: d.letras[v].emoji, fala: preencher(d.frases.alfabeto, { x: falaLetra(v), y: d.letras[v].palavra }) }]);
    }
    if (modo === 'silabas') {
      // as famílias da lição e, se faltar, as outras sílabas das palavras da lição
      const familia = l.familias.flatMap((f) => d.familias[f]);
      const outras = [...new Set((l.palavras || []).flatMap((w) => d.palavras[w].s).map(semAcento))]
        .filter((x) => !familia.includes(x) && /^[^aeiou]+[aeiou]$/.test(x));
      const sil = [...sortear(familia), ...sortear(outras)].slice(0, pares);
      return sil.map((s) => {
        const [m1, m2] = dificil ? doisModos() : ['maiuscula', outroModo('maiuscula')];
        return [{ chave: s, texto: s, modo: m1, fala: falaSilaba(s) }, { chave: s, texto: s, modo: m2, fala: falaSilaba(s) }];
      });
    }
    const palavras = palavrasParaJogo(l, pares);
    if (modo === 'escritas') {
      return palavras.map((w) => {
        const [m1, m2] = dificil ? doisModos() : ['maiuscula', outroModo('maiuscula')];
        return [{ chave: w, texto: w, modo: m1, fala: falaPalavra(w) }, { chave: w, texto: w, modo: m2, fala: falaPalavra(w) }];
      });
    }
    return palavras.map((w) => [
      { chave: w, emoji: d.palavras[w].e, fala: falaPalavra(w) },
      { chave: w, texto: w, modo: dificil ? umDe(MODOS) : resolverModo(), fala: falaPalavra(w) }]);
  }

  function novoJogo() {
    barraNivel.replaceChildren(h('span', { class: 'rotulo-nivel' }, 'Nível:'), ...Object.entries(NIVEIS).map(([id, n]) => h('button', {
      class: id === nivel ? 'ativo' : '', onclick: () => { nivel = id; mudarConfig('nivelMemoria', id); novoJogo(); },
    }, n.nome)));
    barra.replaceChildren(...modos.map(([id, nome]) => h('button', {
      class: id === modo ? 'ativo' : '', onclick: () => { modo = id; novoJogo(); },
    }, nome)));
    fim.replaceChildren();
    const cartas = sortear(cartasDoModo().flat());
    // mais cartas, mais colunas (no celular no máximo 4)
    const colunas = cartas.length <= 12 ? (innerWidth < 600 ? 3 : 4) : cartas.length <= 16 ? 4 : (innerWidth < 600 ? 4 : 5);
    mesa.style.gridTemplateColumns = `repeat(${colunas}, 1fr)`;
    mesa.style.maxWidth = colunas === 5 ? '820px' : '';
    precarregar(cartas.map((c) => c.fala));
    let abertas = [];
    let travado = false;
    let achados = 0;
    mesa.replaceChildren(...cartas.map((c) => {
      const frente = c.emoji
        ? h('div', { class: 'face frente so-emoji' }, c.emoji)
        : h('div', { class: `face frente ${classeDe(c.modo)}` }, transformar(c.texto, c.modo));
      const el = h('button', { class: 'carta', 'aria-label': 'carta' },
        h('div', { class: 'carta-dentro' }, h('div', { class: 'face costas' }, '⭐'), frente));
      el.addEventListener('click', async () => {
        if (travado || el.classList.contains('virada')) return;
        el.classList.add('virada');
        somVirar();
        abertas.push({ c, el });
        if (abertas.length < 2) { falar(c.fala); return; }
        travado = true;
        const [a, b] = abertas;
        abertas = [];
        await falar(c.fala);
        if (a.c.chave === b.c.chave) {
          a.el.classList.add('par'); b.el.classList.add('par');
          achados++;
          await acertou();
          if (achados === cartas.length / 2) {
            await concluir(l.id, 'memoria', '🃏');
            fim.replaceChildren(botao('Jogar de novo', novoJogo, 'verde', '🔁'));
          }
        } else {
          await esperar(600);
          a.el.classList.remove('virada'); b.el.classList.remove('virada');
        }
        travado = false;
      });
      return el;
    }));
  }
  novoJogo();
  instrucao(d.frases.memoria);
}

// ------------------------------------------------------------------ caça: onde está?
export function atvCaca(area, l) {
  const d = dados();
  const RODADAS = 8;
  const vistas = familiasAte(l.id);
  const silabas = (l.familias || []).flatMap((f) => d.familias[f]);
  const silabasExtra = vistas.flatMap((f) => d.familias[f]);
  const palavrasExtra = Object.keys(d.palavras).filter((w) => vistas.length && d.palavras[w].s.every((s) => silabasExtra.includes(semAcento(s)) || d.familias.vogais.includes(s)));
  // letras soltas das famílias (CH -> C e H; ÃO -> O), sem repetir
  const letrasLicao = l.tipo === 'vogais' ? l.vogais
    : [...new Set([...(l.familias || []).flatMap((f) => [...f]), ...d.familias.vogais])].filter((c) => d.letras[c]);
  const tipos = l.tipo === 'vogais'
    ? Array(RODADAS).fill('letra')
    : ['silaba', 'palavra', 'letra', 'silaba', 'palavra', 'silaba', 'palavra', 'letra'];

  const placar = h('div', { class: 'placar' });
  const pergunta = h('div', { class: 'pergunta' });
  const opcoes = h('div', { class: 'opcoes' });
  const fim = h('div', { class: 'acoes' });
  area.append(h('p', { class: 'dica' }, 'Escute e toque no certo. As letras aparecem de jeitos diferentes!'), placar, pergunta, opcoes, fim);
  let rodada = 0;

  // sorteia o alvo evitando repetir os que já saíram nesta partida
  const usados = new Set();
  const novoAlvo = (lista) => {
    const livres = lista.filter((x) => !usados.has(x));
    const alvo = umDe(livres.length ? livres : lista);
    usados.add(alvo);
    return alvo;
  };

  function sortearRodada(tipo) {
    if (tipo === 'silaba') {
      const alvo = novoAlvo(silabas);
      const resto = sortear([...new Set([...silabas, ...silabasExtra])].filter((s) => s !== alvo), 5);
      return { alvo, itens: [alvo, ...resto], fala: falaSilaba, frase: d.frases.caca.silaba };
    }
    if (tipo === 'palavra') {
      const alvo = novoAlvo(l.palavras);
      const resto = sortear([...new Set([...l.palavras, ...palavrasExtra])].filter((w) => w !== alvo), 5);
      return { alvo, itens: [alvo, ...resto], fala: falaPalavra, frase: d.frases.caca.palavra };
    }
    const alvo = novoAlvo(letrasLicao);
    const todas = Object.keys(d.letras).filter((x) => x !== alvo);
    const resto = sortear([...sortear(letrasLicao.filter((x) => x !== alvo), 3), ...sortear(todas, 4)].filter((x, i, a) => a.indexOf(x) === i), 5);
    // no fônico a pergunta é "Qual letra faz este som?" seguida do som
    return { alvo, itens: [alvo, ...resto], fala: (x) => falaDaLetra(x), frase: ehFonico() ? null : d.frases.caca.letra };
  }

  function proxima() {
    placar.replaceChildren(...Array.from({ length: RODADAS }, (_, i) => h('i', { class: i < rodada ? 'ok' : '' })));
    if (rodada >= RODADAS) {
      pergunta.replaceChildren();
      opcoes.replaceChildren();
      concluir(l.id, 'caca', '🎯').then(() => fim.replaceChildren(botao('Jogar de novo', () => { rodada = 0; usados.clear(); fim.replaceChildren(); proxima(); }, 'verde', '🔁')));
      return;
    }
    const r = sortearRodada(tipos[rodada]);
    const textoPergunta = r.frase ? preencher(r.frase, { x: r.fala(r.alvo) }) : d.frases.qualLetraSom;
    const perguntar = () => (r.frase ? falar(textoPergunta) : falarSequencia([textoPergunta, r.fala(r.alvo)], { pausa: 300 }));
    precarregar([textoPergunta, ...r.itens.map(r.fala)]);
    pergunta.replaceChildren(botao('Ouvir de novo', perguntar, 'azul', '🔊'));
    let resolvido = false;
    opcoes.replaceChildren(...sortear(r.itens).map((item) => {
      const m = umDe(MODOS);
      const b = h('button', { class: `opcao ${classeDe(m)}` }, transformar(item, m));
      b.addEventListener('click', async () => {
        if (resolvido) return;
        if (item === r.alvo) {
          resolvido = true;
          b.classList.add('certa');
          await falar(r.fala(item));
          await acertou();
          rodada++;
          proxima();
        } else {
          b.classList.remove('errada'); void b.offsetWidth; b.classList.add('errada');
          somErro();
          await falarSequencia([r.fala(item), umDe(d.frases.erros)], { pausa: 200 });
        }
      });
      return b;
    }));
    perguntar();
  }
  proxima();
}

// ------------------------------------------------------------------ montar a palavra
export function atvMontar(area, l) {
  const d = dados();
  const RODADAS = Math.min(5, l.palavras.length);
  const lista = [l.palavra, ...sortear(l.palavras.filter((w) => w !== l.palavra), RODADAS - 1)];
  const silabasLicao = l.familias.flatMap((f) => d.familias[f]);
  const placar = h('div', { class: 'placar' });
  const caixa = h('div', { class: 'montar' });
  area.append(h('p', { class: 'dica' }, 'Toque nas sílabas na ordem certa para montar a palavra.'), placar, caixa);
  let rodada = 0;

  function proxima() {
    placar.replaceChildren(...lista.map((_, i) => h('i', { class: i < rodada ? 'ok' : '' })));
    if (rodada >= lista.length) {
      caixa.replaceChildren();
      concluir(l.id, 'montar', '🧩').then(() => caixa.replaceChildren(h('div', { class: 'acoes' },
        botao('Jogar de novo', () => { area.replaceChildren(); atvMontar(area, l); }, 'verde', '🔁'))));
      return;
    }
    const w = lista[rodada];
    const p = d.palavras[w];
    const m = resolverModo();
    const pedido = preencher(d.frases.montar, { x: falaPalavra(w) });
    const distracoes = sortear(silabasLicao.filter((s) => !p.s.map(semAcento).includes(s)), 2);
    const pecas = sortear([...p.s.map((s, i) => ({ s, f: falaSilabaDe(w, i) })), ...distracoes.map((s) => ({ s, f: falaSilaba(s) }))]);
    const vagas = p.s.map(() => h('div', { class: 'vaga' }));
    let pos = 0;
    precarregar([pedido, ...pecas.map((x) => x.f), falaPalavra(w)]);

    const botoes = pecas.map((x) => {
      const b = escrito('button', x.s, { modo: m, classe: 'tecla', fala: x.f });
      b.style.setProperty('--cor', umDe(['var(--azul)', 'var(--rosa)', 'var(--verde)', 'var(--roxo)']));
      b.addEventListener('click', async () => {
        if (pos >= p.s.length || b.classList.contains('usada')) return;
        if (semAcento(x.s) !== semAcento(p.s[pos])) {
          b.classList.remove('errada'); void b.offsetWidth; b.classList.add('errada');
          somErro();
          return;
        }
        b.classList.add('usada');
        vagas[pos].replaceChildren(escrito('span', p.s[pos], { modo: m, classe: 'silaba', fala: falaSilabaDe(w, pos) }));
        pos++;
        somAcerto();
        if (pos === p.s.length) {
          await esperar(500);
          const sil = vagas.map((v) => v.firstChild);
          await falarSequencia([...p.s.map((_, i) => falaSilabaDe(w, i)), falaPalavra(w)], {
            pausa: 250, aoItem: (i) => destacar(sil, i < p.s.length ? i : -1),
          });
          await acertou();
          rodada++;
          proxima();
        }
      });
      return b;
    });

    caixa.replaceChildren(
      h('div', { class: 'figura mexe', dataset: { fala: falaPalavra(w) } }, p.e),
      h('div', { class: 'acoes', style: 'margin:0' }, botao('Ouvir', () => falar(pedido), 'azul', '🔊')),
      h('div', { class: 'vagas' }, vagas),
      h('div', { class: 'pecas-montar' }, botoes));
    falar(pedido);
  }
  proxima();
}

// ------------------------------------------------------------------ jogos de consciência silábica
// (sílaba que falta, começa com, conte as sílabas e bingo: os mais usados por professores para juntar sílabas)

const silabasDaLicao = (l) => (l.familias || []).flatMap((f) => dados().familias[f]);
const simplesDe = (s) => semAcento(s.toLowerCase());
const SILABA_SIMPLES = /^[^aeiou][aeiou]$/; // uma consoante + uma vogal: BA, LE, MI...

// Sequência de rodadas com placar; ao terminar, estrela e "Jogar de novo".
function rodadas(area, l, { total, chave, icone, dica, rodada, recomecar }) {
  const placar = h('div', { class: 'placar' });
  const caixa = h('div', { class: 'jogo-caixa' });
  area.append(h('p', { class: 'dica' }, dica), placar, caixa);
  let feitas = 0;
  const proxima = async () => {
    placar.replaceChildren(...Array.from({ length: total }, (_, i) => h('i', { class: i < feitas ? 'ok' : '' })));
    if (feitas >= total) {
      caixa.replaceChildren();
      await concluir(l.id, chave, icone);
      caixa.replaceChildren(h('div', { class: 'acoes' }, botao('Jogar de novo', () => { area.replaceChildren(); recomecar(area, l); }, 'verde', '🔁')));
      return;
    }
    rodada(caixa, feitas, () => { feitas++; proxima(); });
  };
  proxima();
}

function errada(b) {
  b.classList.remove('errada');
  void b.offsetWidth;
  b.classList.add('errada');
}

export function atvSilabaFalta(area, l) {
  const d = dados();
  const lista = palavrasParaJogo(l, 30).filter((w) => d.palavras[w].s.length >= 2);
  const daFamilia = new Set(silabasDaLicao(l).map(simplesDe));
  const todas = [...new Set(lista.flatMap((w) => d.palavras[w].s).map(simplesDe))];
  rodadas(area, l, {
    total: 6, chave: 'silaba-falta', icone: '❓', recomecar: atvSilabaFalta,
    dica: 'Olhe a figura e toque na sílaba que está faltando.',
    rodada(caixa, n, pronto) {
      const w = lista[n % lista.length];
      const p = d.palavras[w];
      const candidatos = p.s.map((_, i) => i).filter((i) => daFamilia.has(simplesDe(p.s[i])));
      const i = candidatos.length ? umDe(candidatos) : Math.floor(Math.random() * p.s.length);
      const alvo = simplesDe(p.s[i]);
      const opcoes = sortear([alvo, ...sortear(todas.filter((x) => x !== alvo && x.length <= alvo.length + 1), 2)]);
      const m = resolverModo();
      const vagas = p.s.map((s, k) => (k === i
        ? h('span', { class: 'silaba vaga-falta' }, '?')
        : escrito('span', s, { modo: m, classe: 'silaba', fala: falaSilabaDe(w, k) })));
      let resolvido = false;
      const botoes = opcoes.map((x) => {
        const b = escrito('button', x, { modo: m, classe: 'tecla' });
        b.addEventListener('click', async () => {
          if (resolvido) return;
          if (x !== alvo) {
            errada(b);
            somErro();
            await falarSequencia([falaSilaba(x), umDe(d.frases.erros)], { pausa: 200 });
            return;
          }
          resolvido = true;
          const certa = escrito('span', p.s[i], { modo: m, classe: 'silaba', fala: falaSilabaDe(w, i) });
          vagas[i].replaceWith(certa);
          vagas[i] = certa;
          somAcerto();
          await falarSequencia([...p.s.map((_, k) => falaSilabaDe(w, k)), falaPalavra(w)], { pausa: 250, aoItem: (k) => destacar(vagas, k) });
          await acertou();
          pronto();
        });
        return b;
      });
      const perguntar = () => falarSequencia([d.frases.qualSilabaFalta, falaPalavra(w)], { pausa: 300 });
      caixa.replaceChildren(
        h('div', { class: 'figura mexe', dataset: { fala: falaPalavra(w) } }, p.e),
        h('div', { class: 'silabas' }, vagas),
        h('div', { class: 'pecas-montar' }, botoes),
        h('div', { class: 'acoes' }, botao('Ouvir de novo', perguntar, 'azul', '🔊')));
      precarregar([falaPalavra(w), ...opcoes.map(falaSilaba), d.frases.qualSilabaFalta]);
      perguntar();
    },
  });
}

export function atvComecaCom(area, l) {
  const d = dados();
  const lista = palavrasParaJogo(l, 30);
  const outras = sortear(Object.keys(d.palavras));
  rodadas(area, l, {
    total: 6, chave: 'comeca-com', icone: '🔤', recomecar: atvComecaCom,
    dica: 'Escute a sílaba e toque na figura que começa com ela.',
    rodada(caixa, n, pronto) {
      const w = lista[n % lista.length];
      const inicio = simplesDe(d.palavras[w].s[0]);
      const figuras = new Set([d.palavras[w].e]);
      // figura errada: nada que comece parecido (PI × PINGUIM confunde); uma da mesma letra (PA × PI) e duas de outras
      const parecido = (x) => { const s0 = simplesDe(d.palavras[x].s[0]); return s0.startsWith(inicio) || inicio.startsWith(s0); };
      const mesmaLetra = (x) => simplesDe(x)[0] === simplesDe(w)[0];
      const erradas = [];
      const pegar = (fonte, quantas) => {
        for (const x of fonte) {
          if (quantas <= 0) break;
          if (parecido(x) || figuras.has(d.palavras[x].e)) continue;
          figuras.add(d.palavras[x].e);
          erradas.push(x);
          quantas--;
        }
      };
      pegar(lista.filter(mesmaLetra), 1);
      pegar(outras.filter((x) => !mesmaLetra(x)), 3 - erradas.length);
      const somInicio = falaSilabaDe(w, 0);
      const m = resolverModo();
      let resolvido = false;
      const cartoes = sortear([w, ...erradas]).map((x) => {
        const b = h('button', { class: 'opcao figura-opcao' }, h('span', { class: 'emoji' }, d.palavras[x].e));
        b.addEventListener('click', async () => {
          if (resolvido) return;
          if (simplesDe(d.palavras[x].s[0]) !== inicio) {
            errada(b);
            somErro();
            await falarSequencia([falaPalavra(x), umDe(d.frases.erros)], { pausa: 200 });
            return;
          }
          resolvido = true;
          b.classList.add('certa');
          b.append(escrito('span', x, { modo: m, classe: 'nome-figura' }));
          await falarSequencia([somInicio, falaPalavra(x)], { pausa: 300 });
          await acertou();
          pronto();
        });
        return b;
      });
      const perguntar = () => falarSequencia([d.frases.comecaCom, somInicio], { pausa: 300 });
      caixa.replaceChildren(
        h('div', { class: 'pergunta' },
          escrito('span', d.palavras[w].s[0], { modo: m, classe: 'silaba', fala: somInicio }),
          botao('Ouvir de novo', perguntar, 'azul', '🔊')),
        h('div', { class: 'opcoes figuras-4' }, cartoes));
      precarregar([somInicio, d.frases.comecaCom, ...[w, ...erradas].map(falaPalavra)]);
      perguntar();
    },
  });
}

export function atvContarSilabas(area, l) {
  const d = dados();
  const lista = palavrasParaJogo(l, 30);
  rodadas(area, l, {
    total: 6, chave: 'contar', icone: '👏', recomecar: atvContarSilabas,
    dica: 'Escute a palavra e bata palmas: quantas sílabas ela tem?',
    rodada(caixa, n, pronto) {
      const w = lista[n % lista.length];
      const p = d.palavras[w];
      const m = resolverModo();
      const certo = p.s.length;
      let resolvido = false;
      const separada = h('div', { class: 'silabas' });
      const botoes = [1, 2, 3, 4, 5].map((k) => {
        const b = h('button', { class: 'opcao contar-opcao' }, h('strong', {}, String(k)), h('span', { class: 'emoji' }, '👏'.repeat(k)));
        b.addEventListener('click', async () => {
          if (resolvido) return;
          if (k !== certo) {
            errada(b);
            await errou();
            return;
          }
          resolvido = true;
          b.classList.add('certa');
          const sil = p.s.map((s, i) => escrito('span', s, { modo: m, classe: 'silaba', fala: falaSilabaDe(w, i) }));
          separada.replaceChildren(...sil);
          await falarSequencia(p.s.map((_, i) => falaSilabaDe(w, i)), {
            pausa: 350, aoItem: (i) => { destacar(sil, i); if (i >= 0) somVirar(); },
          });
          await acertou();
          pronto();
        });
        return b;
      });
      const perguntar = () => falarSequencia([d.frases.contarSilabas, falaPalavra(w)], { pausa: 300 });
      caixa.replaceChildren(
        h('div', { class: 'figura', dataset: { fala: falaPalavra(w) } }, p.e),
        escrito('div', w, { modo: m, classe: 'palavra-inteira', fala: falaPalavra(w) }),
        separada,
        h('div', { class: 'opcoes contar' }, botoes),
        h('div', { class: 'acoes' }, botao('Ouvir de novo', perguntar, 'azul', '🔊')));
      precarregar([falaPalavra(w), d.frases.contarSilabas, ...p.s.map((_, i) => falaSilabaDe(w, i))]);
      perguntar();
    },
  });
}

export function atvBingo(area, l) {
  const d = dados();
  const familia = silabasDaLicao(l);
  const outras = [...new Set(palavrasParaJogo(l, 30).flatMap((w) => d.palavras[w].s).map(simplesDe))]
    .filter((x) => SILABA_SIMPLES.test(x) && !familia.includes(x));
  // a cartela é primeiro a família da letra (MA ME MI MO MU) e completa com sílabas simples das palavras
  const pool = [...new Set([...sortear(familia), ...sortear(outras)])];
  const cartela = sortear(pool.slice(0, pool.length >= 9 ? 9 : 6));
  const fora = sortear(pool.filter((x) => !cartela.includes(x))).slice(0, 3);
  const chamadas = sortear([...cartela, ...fora]);
  const m = resolverModo();
  let atual = 0;
  let travado = false;
  const marcadas = new Set();
  const chamar = () => falar(falaSilaba(chamadas[atual]));

  async function avancar() {
    travado = true;
    if (marcadas.size === cartela.length) {
      await falar(d.frases.bingo);
      await concluir(l.id, 'bingo', '🎱');
      area.append(h('div', { class: 'acoes' }, botao('Jogar de novo', () => { area.replaceChildren(); atvBingo(area, l); }, 'verde', '🔁')));
      return;
    }
    do { atual++; } while (atual < chamadas.length && marcadas.has(chamadas[atual]));
    if (atual >= chamadas.length) atual = chamadas.findIndex((x) => cartela.includes(x) && !marcadas.has(x));
    await esperar(500);
    travado = false;
    chamar();
  }

  const celulas = cartela.map((x) => {
    const c = escrito('button', x, { modo: m, classe: 'bingo-celula' });
    c.addEventListener('click', async () => {
      if (travado || marcadas.has(x)) return;
      if (x !== chamadas[atual]) {
        errada(c);
        somErro();
        await falarSequencia([falaSilaba(x), umDe(d.frases.erros)], { pausa: 200 });
        return;
      }
      marcadas.add(x);
      c.classList.add('marcada');
      somAcerto();
      await avancar();
    });
    return c;
  });
  const naoTenho = botao('Não tenho', async () => {
    if (travado) return;
    if (cartela.includes(chamadas[atual])) { await errou(); return; }
    somAcerto();
    await avancar();
  }, 'branco', '🙅');
  area.append(
    h('p', { class: 'dica' }, 'Escute a sílaba. Se tiver na sua cartela, toque nela. Se não tiver, toque em "Não tenho".'),
    h('div', { class: 'acoes' }, botao('Ouvir de novo', chamar, 'azul', '🔊'), naoTenho),
    h('div', { class: `bingo-cartela ${cartela.length === 6 ? 'seis' : ''}` }, celulas));
  precarregar([...pool.map(falaSilaba), d.frases.bingo, d.frases.bingoOuca]);
  falarSequencia([d.frases.bingoOuca, falaSilaba(chamadas[0])], { pausa: 400 });
}
