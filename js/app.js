// Aprender a Ler — telas e navegação (#/inicio, #/guia, #/perfis, #/mapa, #/licao/<id>/<atividade>, #/alfabeto, #/pais).

import { carregarDados, dados, falaLetra, falaPalavra, preencher, semAcento } from './dados.js';
import { carregarManifesto, destravar, falar, parar, totalAudios, listaAudios, nomeVozNavegador, precarregar } from './voz.js';
import { ligarDedo, definirLeitura } from './dedo.js';
import { definirModo, modoAtual, escrito } from './escrita.js';
import {
  carregarProgresso, perfis, perfilAtual, criarPerfil, escolherPerfil, apagarPerfil, zerarProgresso,
  config, mudarConfig, estrelasDa, totalEstrelas,
} from './progresso.js';
import { telaLicao, atividadesDa, emojiDa } from './licao.js';
import { h, emoji, botao, sairDaTela, instrucao, contato, CONTATO } from './ui.js';
import { ehFonico, falaDaLetra } from './metodo.js';
import { carregarCatalogo, temSonsDisponiveis } from './sons.js';
import { telaSons, telaGravar } from './telasSons.js';
import { telaJogos } from './telaJogos.js';
import { contarAparelho, criancasAjudadas } from './contador.js';

const tela = document.getElementById('tela');
const topo = document.getElementById('topo');
const BICHOS = ['🐱', '🐶', '🐰', '🦊', '🐼', '🦁', '🐸', '🐵', '🦄', '🐙', '🐢', '🦋', '🐧', '🐨'];
let comecou = false;

// ------------------------------------------------------------------ navegação
function rota() {
  sairDaTela();
  parar();
  window.scrollTo(0, 0);
  tela.replaceChildren();
  const [, nome = 'inicio', ...resto] = location.hash.replace(/^#\/?/, '#/').split('/');
  if (!comecou && nome !== 'inicio') return telaInicio(location.hash);
  topo.hidden = nome === 'inicio';
  atualizarTopo();
  const telas = { inicio: () => telaInicio(), guia: telaGuia, perfis: telaPerfis, 'novo-perfil': telaNovoPerfil, mapa: telaMapa, alfabeto: telaAlfabeto, pais: telaPais,
    sons: () => telaSons(tela, ir), gravar: () => telaGravar(tela, ir, resto[0]),
    jogos: () => telaJogos(tela, ir, resto[0], resto[1]) };
  if (nome === 'licao') return telaLicao(tela, resto[0], resto[1]);
  (telas[nome] || telaMapa)();
}

function ir(hash) {
  if (location.hash === hash) rota();
  else location.hash = hash;
}

function atualizarTopo() {
  const p = perfilAtual();
  document.getElementById('perfil-bicho').textContent = p ? p.bicho : '🙂';
  document.getElementById('perfil-estrelas').textContent = `${totalEstrelas()}⭐`;
  document.querySelectorAll('#escritas button').forEach((b) => b.classList.toggle('ativo', b.dataset.modo === modoAtual()));
}

// ------------------------------------------------------------------ início
function telaInicio(depois) {
  topo.hidden = true;
  // cada palavra fica inteira numa linha; cada letra pula sozinha
  const letras = 'Aprender a Ler'.split(' ').flatMap((p, i) => [i ? ' ' : '',
    h('span', { class: 'palavra-logo' }, [...p].map((c) => h('span', {}, c)))]);
  tela.append(h('div', { class: 'splash' },
    h('div', { class: 'bichos emoji' }, '🐝📖🐱'),
    h('div', { class: 'logo' }, letras),
    h('p', { class: 'dica', style: 'font-size:22px' }, 'Toque nas palavras e escute!'),
    botao('Começar', () => {
      destravar();
      comecou = true;
      falar(dados().frases.comecar);
      if (!config().configurado) return ir('#/guia');
      const destino = depois && depois !== '#/inicio' && depois !== '#/' ? depois : (perfis().length ? '#/perfis' : '#/novo-perfil');
      ir(destino);
    }, 'verde', '▶️')));
}

// ------------------------------------------------------------------ guia de configuração (primeira vez)
function telaGuia() {
  const d = dados();
  let passo = 0;
  let bicho = BICHOS[0];
  const nome = h('input', { type: 'text', maxlength: 20, placeholder: 'Nome da criança', autocomplete: 'off' });
  const caixa = h('div', { class: 'guia' });
  tela.append(caixa);

  const opcao = (ativa, icone, titulo, texto, aoEscolher, extra) => h('button', {
    class: `guia-opcao ${ativa ? 'ativa' : ''}`, type: 'button', onclick: aoEscolher,
  }, h('span', { class: 'emoji guia-icone' }, icone), h('span', { class: 'guia-texto' }, h('strong', {}, titulo), h('small', {}, texto)), extra || null);

  const PASSOS = [
    () => [
      h('h2', {}, '👋 Bem-vindo!'),
      h('p', {}, 'Vamos deixar o app do jeito certo para a criança. São 6 passos rapidinhos, e dá para mudar tudo depois na Área dos pais (⚙️).'),
      h('h3', {}, '1. Teste o som'),
      h('div', { class: 'acoes', style: 'justify-content:flex-start' }, botao('Testar o som', () => falar(d.frases.testeSom), 'azul', '🔊')),
      h('p', { class: 'nota' }, 'Não ouviu? Aumente o volume do aparelho. No iPhone ou iPad, tire do modo silencioso.'),
    ],
    () => {
      const fonico = ehFonico();
      const escolher = (m) => () => { mudarConfig('metodo', m); desenhar(); falar(d.frases[m === 'fonico' ? 'metodoFonico' : 'metodoFreire']); };
      const semSons = h('p', { class: 'nota', hidden: true },
        'Os sons das letras são gravados por pais e mães. Ainda não há nenhum: até lá as letras dizem o nome. ',
        'Você pode gravar os seus depois, na Área dos pais → Sons das letras.');
      if (fonico) temSonsDisponiveis().then((tem) => { semSons.hidden = tem; });
      return [
        h('h3', {}, '2. Qual método de alfabetização?'),
        opcao(!fonico, '📖', 'Paulo Freire (palavra → sílabas)', 'Parte de uma palavra com figura (BOLA), separa em sílabas, conhece a família BA BE BI BO BU e descobre palavras novas. A letra diz o nome: "bê".', escolher('freire')),
        opcao(fonico, '👂', 'Fônico + silábico (som → sílabas)', 'Primeiro o SOM de cada letra (mmm, sss), depois junta os sons em sílabas (m + a = ma) e em palavras.', escolher('fonico')),
        semSons,
        h('p', { class: 'nota' }, 'Dá para trocar a qualquer hora na Área dos pais.'),
      ];
    },
    () => {
      const atual = config().leitura;
      const escolher = (m) => () => { mudarConfig('leitura', m); definirLeitura(m); desenhar(); falar(d.frases[m === 'toque' ? 'tocarParaOuvir' : 'passarParaOuvir']); };
      return [
        h('h3', {}, '3. Como a criança vai ouvir as palavras?'),
        opcao(atual === 'toque', '👆', 'Tocar para ouvir (recomendado)', 'A voz lê só quando a criança toca ou clica. Ela escolhe o que quer ouvir, sem barulho sem querer.', escolher('toque')),
        opcao(atual === 'passar', '✋', 'Passar o dedo para ouvir', 'A voz lê tudo o que o dedo ou o mouse encostar. Deslizando nas sílabas, ouve BO… LA… como se lesse.', escolher('passar')),
        h('p', { class: 'nota' }, 'Experimente aqui:'),
        h('div', { class: 'guia-demo' },
          h('div', { class: 'silabas ler-arrasto' }, [['bo', 'bó'], ['la', 'lá']].map(([x, f]) => escrito('span', x, { modo: 'maiuscula', classe: 'silaba', fala: f }))),
          escrito('div', 'bola', { modo: 'maiuscula', classe: 'palavra-inteira', fala: 'bola' })),
      ];
    },
    () => {
      const atual = modoAtual();
      const escolher = (m) => () => { definirModo(m); mudarConfig('escrita', m); desenhar(); falar(d.frases.escritas[m]); };
      const amostra = (m) => h('span', { class: `guia-amostra ${m === 'cursiva' ? 'esc-cursiva' : 'esc-forma'}` }, m === 'maiuscula' ? 'BOLA' : 'bola');
      return [
        h('h3', {}, '4. Tipo de letra para começar'),
        opcao(atual === 'maiuscula', 'AA', 'Letra de forma MAIÚSCULA', 'A mais fácil para começar.', escolher('maiuscula'), amostra('maiuscula')),
        opcao(atual === 'minuscula', 'aa', 'Letra de forma minúscula', 'A dos livros.', escolher('minuscula'), amostra('minuscula')),
        opcao(atual === 'cursiva', '✏️', 'Letra cursiva (de mão)', 'A que a escola ensina a escrever.', escolher('cursiva'), amostra('cursiva')),
        opcao(atual === 'misturada', '🔀', 'Misturar todas', 'Cada palavra aparece de um jeito, para reconhecer todas.', escolher('misturada')),
        h('p', { class: 'nota' }, 'Dica: comece com MAIÚSCULA. Quando ela reconhecer as letras, passe para minúscula e cursiva, e depois misture. Os botões lá em cima trocam a qualquer hora.'),
      ];
    },
    () => {
      const ligada = config().instrucoes;
      const escolher = (v) => () => { mudarConfig('instrucoes', v); desenhar(); };
      return [
        h('h3', {}, '5. A voz explica as atividades?'),
        opcao(ligada, '🗣️', 'Sim, explicar (recomendado)', 'Ao abrir cada atividade a voz diz o que fazer, por exemplo: "Vamos juntar as letras!"', escolher(true)),
        opcao(!ligada, '🤫', 'Não, só ler o que ela tocar', 'Bom quando um adulto está junto explicando.', escolher(false)),
      ];
    },
    () => {
      const grade = h('div', { class: 'escolha-bicho' }, BICHOS.map((b) => h('button', {
        class: b === bicho ? 'ativo' : '', type: 'button',
        onclick: (e) => { bicho = b; grade.querySelectorAll('button').forEach((x) => x.classList.toggle('ativo', x === e.currentTarget)); },
      }, b)));
      return [
        h('h3', {}, '6. Quem vai brincar?'),
        perfis().length ? h('p', {}, 'Já cadastradas neste aparelho: ', perfis().map((x) => `${x.bicho} ${x.nome}`).join(', '), '. Pode cadastrar mais uma ou deixar em branco.') : null,
        h('label', {}, 'Nome da criança'), nome,
        h('label', {}, 'Bichinho dela'), grade,
        h('p', { class: 'nota' }, 'O nome fica só neste aparelho. Nada é enviado para a internet.'),
      ];
    },
  ];

  function concluirGuia() {
    if (nome.value.trim()) criarPerfil(nome.value, bicho);
    else if (!perfis().length) { nome.focus(); nome.classList.add('falta'); return; }
    mudarConfig('configurado', true);
    contarAparelho();
    ir(perfilAtual() ? '#/mapa' : '#/perfis');
  }

  function desenhar() {
    const ultimo = passo === PASSOS.length - 1;
    caixa.replaceChildren(
      h('div', { class: 'pontos guia-pontos' }, PASSOS.map((_, i) => h('i', { class: i === passo ? 'ativo' : '' }))),
      h('div', { class: 'guia-corpo' }, PASSOS[passo]()),
      h('div', { class: 'acoes' },
        passo ? botao('Voltar', () => { passo--; desenhar(); }, 'branco', '◀️') : null,
        ultimo ? botao('Começar a brincar!', concluirGuia, 'verde', '▶️') : botao('Próximo', () => { passo++; desenhar(); }, 'azul', '➡️')));
    if (ultimo && !perfis().length) setTimeout(() => nome.focus(), 50);
  }
  desenhar();
}

// ------------------------------------------------------------------ perfis
function telaPerfis() {
  const d = dados();
  tela.append(
    h('h2', { class: 'titulo-tela', dataset: { fala: d.frases.quem } }, 'Quem vai brincar hoje?'),
    h('div', { class: 'perfis' },
      perfis().map((p) => h('button', { class: 'perfil-card', onclick: () => { escolherPerfil(p.id); ir('#/mapa'); } },
        emoji(p.bicho), p.nome)),
      h('button', { class: 'perfil-card novo', onclick: () => ir('#/novo-perfil') }, emoji('➕'), 'Nova criança')));
  setTimeout(() => instrucao(d.frases.quem), 900);
}

function telaNovoPerfil() {
  let bicho = BICHOS[0];
  const nome = h('input', { type: 'text', maxlength: 20, placeholder: 'Nome da criança', autocomplete: 'off' });
  const grade = h('div', { class: 'escolha-bicho' }, BICHOS.map((b, i) => h('button', {
    class: i === 0 ? 'ativo' : '', type: 'button',
    onclick: (e) => { bicho = b; grade.querySelectorAll('button').forEach((x) => x.classList.toggle('ativo', x === e.currentTarget)); },
  }, b)));
  const form = h('form', { class: 'form-perfil', onsubmit: (e) => {
    e.preventDefault();
    if (!nome.value.trim()) { nome.focus(); return; }
    criarPerfil(nome.value, bicho);
    ir('#/mapa');
  } },
  h('label', {}, 'Qual é o nome?'), nome,
  h('label', {}, 'Escolha um bichinho:'), grade,
  h('div', { class: 'acoes' }, h('button', { class: 'btn verde', type: 'submit' }, emoji('✅'), 'Pronto!')));
  tela.append(h('h2', { class: 'titulo-tela' }, 'Nova criança'), form);
  setTimeout(() => nome.focus(), 50);
}

// ------------------------------------------------------------------ mapa das lições
function telaMapa() {
  const d = dados();
  if (!perfilAtual() && perfis().length) { ir('#/perfis'); return; }
  // "Próxima!" segue sempre a ordem da cartilha (do mais fácil ao mais difícil), seja qual for a ordem na tela
  const proxima = d.licoes.find((l) => estrelasDa(l.id) < atividadesDa(l).length);
  const p = perfilAtual();
  const abc = (config().ordemMapa || 'abc') === 'abc';
  const chave = (l) => (l.tipo === 'vogais' ? 'a' : semAcento(l.palavra));
  // de A a Z: uma lição para cada letra (a marca é a letra) e, separadas, as sílabas especiais (CH, NH, ÃO...)
  const marca = (l, i) => (abc ? l.rotulo || chave(l)[0].toUpperCase() : i);
  const todas = d.licoes.map((l, i) => ({ l, i }));
  const deLetras = todas.filter(({ l }) => l.secao !== 'especial')
    .sort((a, b) => chave(a.l).localeCompare(chave(b.l), 'pt-BR'));
  const especiais = todas.filter(({ l }) => l.secao === 'especial');
  const ordenar = (ordem) => () => { mudarConfig('ordemMapa', ordem); rota(); };
  const cartao = ({ l, i }) => {
    const total = atividadesDa(l).length;
    const tem = estrelasDa(l.id);
    const nome = l.tipo === 'vogais'
      ? h('span', { class: 'nome', dataset: { fala: l.titulo } }, 'A E I O U')
      : escrito('span', l.palavra, { classe: 'nome', fala: falaPalavra(l.palavra) });
    return h('button', {
      class: `licao-card ${l === proxima ? 'proxima' : ''}`,
      onclick: () => ir(`#/licao/${l.id}`),
    }, h('span', { class: `num ${abc ? 'letra-inicial' : ''} ${String(marca(l, i)).length > 2 ? 'longa' : ''}` }, marca(l, i)),
    emoji(emojiDa(l)), nome, h('span', { class: 'estrelas' }, '⭐'.repeat(tem) + '☆'.repeat(total - tem)));
  };
  const jogos = h('button', { class: 'licao-card especial jogos', onclick: () => ir('#/jogos') },
    h('span', { class: 'num' }, '🎮'), emoji('🎮'), h('span', { class: 'nome' }, 'Jogos'), h('span', { class: 'estrelas' }, '7 jogos com voz'));
  const alfabeto = h('button', { class: 'licao-card especial', onclick: () => ir('#/alfabeto') },
    h('span', { class: 'num' }, 'ABC'), emoji('🔤'), h('span', { class: 'nome' }, 'Alfabeto'), h('span', { class: 'estrelas' }, 'todas as letras'));
  tela.append(
    h('h2', { class: 'titulo-tela', dataset: { fala: d.frases.escolha } }, p ? `${p.bicho} ${p.nome}, escolha uma lição` : 'Escolha uma lição'),
    // para os pais saberem qual método está valendo (no fônico a lição começa pela aba Sons)
    h('p', { class: 'metodo-atual' }, ehFonico() ? '👂 Método: Fônico (começa pelos sons)' : '📖 Método: Paulo Freire', ' · ',
      h('a', { href: '#/pais' }, 'trocar em ⚙️')),
    h('div', { class: 'modos' },
      h('button', { class: abc ? 'ativo' : '', onclick: ordenar('abc') }, '🔤 De A a Z'),
      h('button', { class: abc ? '' : 'ativo', onclick: ordenar('facil') }, '📈 Do fácil ao difícil')),
    ...(abc
      ? [h('h3', { class: 'secao-mapa' }, 'Uma lição para cada letra'),
        h('div', { class: 'mapa' }, alfabeto, deLetras.map(cartao)),
        h('h3', { class: 'secao-mapa' }, 'Sílabas especiais', h('small', {}, 'CE, CI, Ç, CH, NH, LH, RR, SS, ÃO, BR, BL... depois das letras')),
        h('div', { class: 'mapa' }, especiais.map(cartao)),
        h('h3', { class: 'secao-mapa' }, 'Jogos'),
        h('div', { class: 'mapa' }, jogos)]
      : [h('div', { class: 'mapa' }, todas.map(cartao), alfabeto, jogos)]));
  precarregar(d.licoes.map((l) => (l.tipo === 'vogais' ? l.titulo : falaPalavra(l.palavra))));
  instrucao(d.frases.escolha);
}

// ------------------------------------------------------------------ alfabeto
function telaAlfabeto() {
  const d = dados();
  tela.append(
    h('h2', { class: 'titulo-tela' }, '🔤 Alfabeto'),
    h('p', { class: 'dica' }, 'Passe o dedo nas letras e nas figuras.'),
    h('div', { class: 'alfabeto' }, Object.entries(d.letras).map(([letra, info]) => {
      const fl = falaLetra(letra);
      const som = falaDaLetra(letra); // no fônico, tocar na letra dá o som; a figura diz "bê, de bola"
      const fp = info.fala || info.palavra;
      return h('div', { class: 'abc-card' },
        escrito('div', letra, { classe: 'grande', fala: som }),
        h('div', { class: 'formas ler-arrasto' }, ['maiuscula', 'minuscula', 'cursiva'].map((m) => escrito('span', letra, { modo: m, fala: som }))),
        h('span', { class: 'emoji', dataset: { fala: preencher(d.frases.alfabeto, { x: fl, y: fp }) } }, info.emoji),
        escrito('span', info.palavra, { classe: 'nome', fala: fp }));
    })));
}

// ------------------------------------------------------------------ área dos pais
function telaPais() {
  const audios = totalAudios();
  const lista = h('div');
  const desenharPerfis = () => lista.replaceChildren(...(perfis().length ? perfis().map((p) => h('div', { class: 'linha-perfil' },
    emoji(p.bicho, '', { style: 'font-size:30px' }), h('span', {}, `${p.nome} — ${totalEstrelas(p.id)} ⭐`),
    botao('Zerar estrelas', () => { if (confirm(`Zerar as estrelas de ${p.nome}?`)) { zerarProgresso(p.id); desenharPerfis(); atualizarTopo(); } }, 'branco'),
    botao('Apagar', () => { if (confirm(`Apagar ${p.nome} deste aparelho?`)) { apagarPerfil(p.id); desenharPerfis(); atualizarTopo(); } }, 'branco'),
  )) : [h('p', {}, 'Nenhuma criança cadastrada neste aparelho.')]));
  desenharPerfis();

  const leitura = h('select', { onchange: (e) => { mudarConfig('leitura', e.target.value); definirLeitura(e.target.value); } },
    h('option', { value: 'toque', selected: config().leitura === 'toque' }, '👆 Tocar ou clicar para ouvir'),
    h('option', { value: 'passar', selected: config().leitura === 'passar' }, '✋ Passar o dedo ou o mouse para ouvir'));
  const instrucoes = h('input', { type: 'checkbox', checked: config().instrucoes, onchange: (e) => mudarConfig('instrucoes', e.target.checked) });
  // trocar o método redesenha a tela: a opção dos sons gravados só aparece no fônico
  const metodo = h('select', { onchange: (e) => {
    mudarConfig('metodo', e.target.value);
    const y = scrollY;
    rota();
    window.scrollTo(0, y);
    falar(dados().frases[e.target.value === 'fonico' ? 'metodoFonico' : 'metodoFreire']);
  } },
    h('option', { value: 'freire', selected: !ehFonico() }, '📖 Paulo Freire (palavra → sílabas)'),
    h('option', { value: 'fonico', selected: ehFonico() }, '👂 Fônico + silábico (som das letras → sílabas)'));
  const barra = h('div', { class: 'barra' }, h('i'));
  const estadoBaixar = h('p', {}, '');
  const podeGuardar = 'caches' in window && 'serviceWorker' in navigator;
  // "Já ajudamos N crianças a ler": aparece quando o contador responde
  const ajudadas = h('p', { class: 'ajudadas', hidden: true });
  criancasAjudadas().then((n) => {
    if (!n || !ajudadas.isConnected) return;
    ajudadas.replaceChildren(emoji('💛'), ` Já ajudamos ${n} ${n === '1' ? 'criança' : 'crianças'} a ler!`);
    ajudadas.hidden = false;
  });

  tela.append(h('div', { class: 'pais' },
    h('h2', { class: 'titulo-tela' }, '⚙️ Área dos pais'),
    h('section', {},
      h('h3', {}, 'Como funciona'),
      h('p', {}, 'Inspirado no Método Paulo Freire: cada lição parte de uma palavra geradora com figura (BOLA, PATO...). ',
        'A criança separa a palavra em sílabas, conhece a família silábica (BA BE BI BO BU), junta sílabas para descobrir novas palavras, ',
        'ouve uma historinha e brinca nos jogos.'),
      h('p', {}, 'Tudo que a criança tocar (ou passar o dedo, se você escolher) é lido em voz alta: a letra, a sílaba ou a palavra inteira. ',
        'Os botões AA / aa / ', h('span', { class: 'esc-cursiva' }, 'aa'), ' / 🔀 lá em cima trocam o tipo de letra, para ela não aprender só a letra de forma maiúscula.'),
      h('p', {}, 'Cada atividade completa vale uma estrela ⭐. Sugestão: 10 a 15 minutos por dia, junto com ela no começo.')),
    h('section', {},
      h('h3', {}, 'Voz'),
      h('p', {}, audios
        ? `Voz da Francisca: ${audios} falas gravadas.`
        : `Os áudios da Francisca ainda não estão neste site. Usando a voz do aparelho: ${nomeVozNavegador()}.`),
      h('div', { class: 'acoes', style: 'justify-content:flex-start' }, botao('Testar a voz', () => falar(dados().frases.testeSom), 'azul', '🔊'))),
    h('section', {},
      h('h3', {}, 'Configurações'),
      h('label', { class: 'interruptor' }, 'Método: ', metodo),
      ehFonico()
        ? [h('p', { class: 'nota' }, 'No fônico, tocar numa letra dá o SOM dela (gravado por pais e mães) e a lição começa pelos sons.'),
          h('div', { class: 'acoes', style: 'justify-content:flex-start;margin-top:0' }, botao('Sons das letras: ouvir, escolher e gravar', () => ir('#/sons'), 'azul', '👂'))]
        : h('p', { class: 'nota' }, 'No Paulo Freire, a voz da Francisca lê o nome das letras, as sílabas e as palavras.'),
      h('label', { class: 'interruptor' }, 'Como ouvir: ', leitura),
      h('label', { class: 'interruptor' }, instrucoes, 'A voz explica cada atividade ao abrir'),
      h('p', {}, 'O tipo de letra (AA / aa / ', h('span', { class: 'esc-cursiva' }, 'aa'), ' / 🔀) fica nos botões lá em cima.'),
      h('div', { class: 'acoes', style: 'justify-content:flex-start' }, botao('Abrir o guia de configuração', () => ir('#/guia'), 'roxo', '🧭'))),
    h('section', {},
      h('h3', {}, 'Crianças neste aparelho'),
      h('p', {}, 'Os nomes e as estrelas ficam só neste aparelho. Nada é enviado para a internet.'),
      lista,
      h('div', { class: 'acoes', style: 'justify-content:flex-start' }, botao('Nova criança', () => ir('#/novo-perfil'), 'verde', '➕'))),
    h('section', {},
      h('h3', {}, 'Usar sem internet'),
      podeGuardar
        ? [h('p', {}, 'Guarda o app e todas as falas no aparelho (uns 10 MB). Depois funciona até sem Wi-Fi.'),
          h('div', { class: 'acoes', style: 'justify-content:flex-start' }, botao('Guardar tudo no aparelho', () => guardarTudo(barra, estadoBaixar), 'roxo', '📥')),
          barra, estadoBaixar]
        : h('p', {}, 'Disponível quando o app é aberto pelo site (https).'),
      h('p', {}, 'Para virar um ícone no tablet ou celular: abra o site no Chrome, toque nos três pontinhos ⋮ e escolha "Adicionar à tela inicial" (no iPhone/iPad: botão Compartilhar → "Adicionar à Tela de Início").')),
    h('section', {},
      h('h3', {}, 'Sobre'),
      ajudadas,
      h('p', {}, 'Feito em casa, gratuito e sem propaganda. Voz neural "Francisca" (Microsoft). Letras: Andika (SIL) e Playwrite Brasil (TypeTogether), licença OFL.'),
      h('p', { class: 'nota-contador' }, 'Para saber quantas crianças o app ajuda, cada aparelho envia uma única vez um aviso anônimo de "+1" ',
        'ao contador GoatCounter: sem nome, sem localização e sem nenhum outro dado.'),
      h('details', { class: 'sugestoes' },
        h('summary', {}, 'Sugestões e melhorias'),
        h('p', {}, `Achou um erro, uma palavra com som estranho ou tem uma ideia? Fale com ${CONTATO.nome}:`),
        contato()))));
}

async function guardarTudo(barra, estado) {
  const arquivos = ['./', 'index.html', 'css/app.css', 'dados/licoes.json', 'audio/manifest.json', 'dados/sons.json', 'manifest.webmanifest',
    'fontes/andika-400.woff2', 'fontes/andika-700.woff2', 'fontes/playwrite-br-400.woff2',
    ...['app', 'dados', 'voz', 'dedo', 'escrita', 'progresso', 'efeitos', 'ui', 'licao', 'historia', 'jogos', 'contador', 'metodo', 'sons', 'telasSons', 'telaJogos'].map((m) => `js/${m}.js`),
    ...listaAudios()];
  const cache = await caches.open('aprender-ler');
  let feitos = 0, falhas = 0;
  const fila = [...arquivos];
  const trabalhador = async () => {
    while (fila.length) {
      const url = fila.shift();
      try {
        const r = await fetch(url, { cache: 'no-cache' });
        if (r.ok) await cache.put(url, r); else falhas++;
      } catch { falhas++; }
      feitos++;
      barra.firstChild.style.width = `${Math.round((feitos / arquivos.length) * 100)}%`;
      estado.textContent = `${feitos} de ${arquivos.length} arquivos guardados${falhas ? ` (${falhas} falharam)` : ''}.`;
    }
  };
  await Promise.all(Array.from({ length: 6 }, trabalhador));
  estado.textContent = falhas ? `Pronto, mas ${falhas} arquivos falharam. Tente de novo com internet.` : 'Pronto! O app funciona sem internet neste aparelho. ✅';
}

// ------------------------------------------------------------------ topo e partida
function ligarTopo() {
  document.getElementById('btn-inicio').onclick = () => ir('#/mapa');
  document.getElementById('btn-perfil').onclick = () => ir('#/perfis');
  document.getElementById('btn-pais').onclick = () => ir('#/pais');
  document.querySelectorAll('#escritas button').forEach((b) => {
    b.onclick = () => {
      definirModo(b.dataset.modo);
      mudarConfig('escrita', b.dataset.modo);
      rota();
      falar(dados().frases.escritas[b.dataset.modo]);
    };
  });
  document.addEventListener('estrelas', atualizarTopo);
}

async function iniciar() {
  carregarProgresso();
  definirModo(config().escrita);
  definirLeitura(config().leitura);
  await Promise.all([carregarDados(), carregarManifesto(), carregarCatalogo()]);
  ligarDedo();
  contarAparelho(); // aparelhos que já usavam o app antes do contador também entram na conta
  ligarTopo();
  // qualquer primeiro toque também destrava o som (caso a página abra direto numa lição)
  document.addEventListener('pointerdown', destravar, { once: true, capture: true });
  window.addEventListener('hashchange', rota);
  rota();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

iniciar();
