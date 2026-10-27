// Historinha animada: cenas com emojis que se mexem, narração da Francisca e karaokê palavra a palavra.

import { dados, tokens } from './dados.js';
import { falar, parar, precarregar } from './voz.js';
import { resolverModo, transformar, classeDe } from './escrita.js';
import { h, emoji, botao, concluir, esperar, aoSair } from './ui.js';

// enfeites de cada cenário (não falam, só enfeitam)
const CENARIOS = {
  campo:   [['☀️', 88, 14, 16, 'pulsa'], ['☁️', 22, 16, 13, 'flutua'], ['☁️', 62, 9, 9, 'flutua'], ['🌳', 8, 50, 30], ['🌼', 12, 88, 8], ['🌷', 92, 90, 8]],
  fazenda: [['☀️', 86, 14, 16, 'pulsa'], ['☁️', 34, 12, 12, 'flutua'], ['🏡', 88, 50, 26], ['🌻', 8, 80, 14, 'balanca']],
  casa:    [['🖼️', 16, 24, 14], ['🪴', 91, 58, 18], ['💡', 50, 7, 10, 'balanca']],
  noite:   [['🌙', 84, 16, 16, 'flutua'], ['⭐', 14, 12, 6, 'pulsa'], ['⭐', 40, 20, 5, 'pulsa'], ['⭐', 66, 8, 5, 'pulsa'], ['🌲', 8, 54, 28]],
  mar:     [['☀️', 86, 14, 16, 'pulsa'], ['☁️', 40, 12, 10, 'flutua'], ['🌊', 12, 64, 12, 'balanca'], ['🌊', 84, 72, 12, 'balanca']],
  neve:    [['🌲', 89, 54, 26], ['🏠', 10, 54, 22], ...[10, 30, 50, 70, 90].map((x, i) => ['❄️', x, -5, 6, 'neva', i * 1.1])],
};

function ator([e, x, y, t, a, d], classe = '') {
  return h('div', { class: `ator ${classe}`.trim(), style: `--x:${x};--y:${y};--t:${t};${d ? `--d:${d}s` : ''}` },
    h('span', { class: a ? `a-${a}` : '' }, e));
}

export function atvHistoria(area, l) {
  const d = dados();
  const hist = l.historia;
  let cena = 0;
  let assistindo = false;
  let ganhou = false;
  const palco = h('div', { class: 'palco' });
  const legenda = h('div', { class: 'legenda ler-arrasto' });
  const pontos = h('div', { class: 'pontos' }, hist.cenas.map(() => h('i')));
  const btnAssistir = botao('Assistir', () => alternar(), 'verde', '▶️');
  const nav = h('div', { class: 'historia-nav' },
    botao('', () => ir(cena - 1), 'branco', '◀️'), btnAssistir, botao('', () => ir(cena + 1), 'branco', '▶️'));
  area.append(
    h('h3', { class: 'titulo-tela', style: 'margin:4px 0 12px', dataset: { fala: hist.titulo } }, '🎬 ', hist.titulo),
    h('div', { class: 'historia' }, palco, legenda, nav, h('div', { class: 'historia-nav' }, pontos)));
  precarregar(hist.cenas.map((c) => c.texto));
  aoSair(() => { assistindo = false; });

  function desenhar() {
    const c = hist.cenas[cena];
    palco.className = `palco fundo-${c.fundo}`;
    palco.replaceChildren(
      ...(CENARIOS[c.fundo] || []).map((x) => ator(x, 'decor')),
      ...c.atores.map((a) => ator([a.e, a.x, a.y, a.t, a.a, a.d])));
    // legenda: cada pedaço do texto (com a pontuação) é uma palavra que dá para tocar
    const m = resolverModo();
    let n = 0;
    legenda.replaceChildren(...c.texto.split(/\s+/).flatMap((pedaco, i) => {
      const tok = tokens(pedaco)[0];
      const el = h('span', { class: `pal ${classeDe(m)}` }, transformar(pedaco, m, { frase: true }));
      if (tok) { el.dataset.fala = tok.toLowerCase(); el.dataset.i = n++; }
      return i ? [' ', el] : [el];
    }));
    [...pontos.children].forEach((p, i) => p.classList.toggle('ativo', i === cena));
    precarregar(tokens(c.texto).map((t) => t.toLowerCase()));
  }

  async function narrar() {
    const minhaCena = cena;
    const pals = [...legenda.querySelectorAll('.pal[data-i]')];
    legenda.dataset.semMouse = ''; // o mouse parado na legenda não interrompe a narração
    const terminou = await falar(hist.cenas[cena].texto, {
      aoPalavra: (i) => pals.forEach((p) => {
        const k = +p.dataset.i;
        p.classList.toggle('agora', k === i);
        p.classList.toggle('lida', k < i);
      }),
    });
    delete legenda.dataset.semMouse;
    pals.forEach((p) => { p.classList.remove('agora'); p.classList.add('lida'); });
    if (!terminou || minhaCena !== cena) return;
    if (cena === hist.cenas.length - 1) {
      assistindo = false;
      rotular('🔁', 'Assistir de novo');
      if (!ganhou) { ganhou = true; await esperar(400); await falar(d.frases.fimHistoria); concluir(l.id, 'historia', '🎬'); }
    } else if (assistindo) {
      await esperar(1100);
      if (assistindo && minhaCena === cena) ir(cena + 1);
    }
  }

  function rotular(icone, texto) {
    btnAssistir.firstChild.textContent = icone;
    btnAssistir.lastChild.textContent = texto;
  }

  function ir(nova) {
    if (nova < 0 || nova >= hist.cenas.length) return;
    cena = nova;
    desenhar();
    narrar();
  }

  function alternar() {
    if (assistindo) {
      assistindo = false;
      parar();
      rotular('▶️', 'Assistir');
      return;
    }
    assistindo = true;
    rotular('⏸️', 'Pausar');
    ir(cena === hist.cenas.length - 1 ? 0 : cena);
  }

  desenhar();
  falar(hist.titulo);
}
