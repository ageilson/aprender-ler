// Telas do método fônico: escolher a voz dos sons das letras (#/sons) e gravar os sons com a própria voz (#/gravar).

import { dados, falaPalavra } from './dados.js';
import { falar, falarSomDaVoz, parar } from './voz.js';
import { config, mudarConfig } from './progresso.js';
import { ehFonico } from './metodo.js';
import {
  vozesPublicadas, vozPadrao, chavesGravadas, salvarGravacao, apagarGravacoes, usarVoz, vozAtual,
  notaDada, darNota, podeGravar, gravar, arquivoParaEnviar,
} from './sons.js';
import { h, emoji, botao, CONTATO, aoSair } from './ui.js';

const AMOSTRA = ['a', 'm', 's', 'p', 'l'];
// Referência para quem grava (só o link: o áudio do vídeo não tem licença para ser usado no app)
const VIDEO_REFERENCIA = {
  url: 'https://www.youtube.com/watch?v=bFOPTOd8IFI',
  titulo: 'Alfabeto das onomatopeias',
  canal: 'Pb. Samuel Lima',
};

// ------------------------------------------------------------------ escolher a voz dos sons
export async function telaSons(tela, ir) {
  const total = dados().sons.length;
  const gravadas = await chavesGravadas();
  const lista = h('div', { class: 'vozes' });
  const atual = vozAtual();

  const cartao = ({ id, titulo, detalhe, selo, podeNotar }) => {
    const escolhida = atual === id;
    const estrelas = podeNotar ? h('div', { class: 'dar-nota' },
      h('span', {}, notaDada(id) ? 'Sua nota: ' : 'Dê sua nota: '),
      [1, 2, 3, 4, 5].map((n) => h('button', {
        class: n <= notaDada(id) ? 'cheia' : '', 'aria-label': `${n} estrelas`, disabled: !!notaDada(id),
        onclick: () => { if (darNota(id, n)) ir('#/sons'); },
      }, n <= notaDada(id) ? '★' : '☆'))) : null;
    return h('div', { class: `voz-card ${escolhida ? 'escolhida' : ''}` },
      h('div', { class: 'voz-titulo' }, h('strong', {}, titulo), selo ? h('span', { class: 'selo' }, selo) : null),
      h('div', { class: 'voz-detalhe' }, detalhe),
      h('div', { class: 'acoes', style: 'justify-content:flex-start;margin:8px 0 0' },
        botao('Ouvir', () => falarSomDaVoz(AMOSTRA, id || undefined), 'azul', '▶️'),
        escolhida ? h('span', { class: 'em-uso' }, '✅ Em uso') : botao('Usar esta voz', () => { usarVoz(id); ir('#/sons'); }, 'verde', '✔️')),
      estrelas);
  };

  const cartoes = [cartao({ id: '', titulo: 'Automático', detalhe: 'Usa a minha gravação, se houver; senão, a voz padrão ou a de melhor nota.' })];
  if (gravadas.length) {
    cartoes.push(cartao({ id: 'local', titulo: '🎙️ Minha gravação', detalhe: `Só neste aparelho. ${gravadas.length} de ${total} sons gravados.` }));
    cartoes.at(-1).append(h('div', { class: 'acoes', style: 'justify-content:flex-start;margin:8px 0 0' },
      botao('Enviar para o site', () => ir('#/gravar/enviar'), 'roxo', '📤')));
  }
  for (const v of vozesPublicadas()) {
    const nota = v.votos ? `★ ${v.nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} (${v.votos} ${v.votos === 1 ? 'nota' : 'notas'})` : 'sem notas ainda';
    cartoes.push(cartao({
      id: v.id, titulo: v.apelido || 'Voz de um pai ou mãe', detalhe: `Enviada em ${v.mes || '—'} · ${nota}`,
      selo: v.id === vozPadrao() ? 'Padrão' : '', podeNotar: true,
    }));
  }
  lista.append(...cartoes);

  tela.append(h('div', { class: 'pais' },
    h('h2', { class: 'titulo-tela' }, '👂 Sons das letras'),
    h('section', {},
      h('p', {}, 'No método fônico, quando a criança toca numa letra ela ouve o SOM da letra (M = mmmm), não o nome (ême). ',
        'Os sons são gravados por pais e mães: ouça as vozes, escolha a de que mais gostar e dê sua nota. As melhores ficam no app.'),
      ehFonico() ? null : h('p', { class: 'aviso' }, 'O método escolhido agora é o Paulo Freire, que usa o nome das letras. ',
        botao('Usar o método fônico', () => { mudarConfig('metodo', 'fonico'); falar(dados().frases.metodoFonico); ir('#/sons'); }, 'roxo', '👂')),
      vozesPublicadas().length || gravadas.length ? null
        : h('p', { class: 'aviso' }, 'Ainda ninguém gravou os sons. Até lá, as letras dizem o nome. Que tal ser o primeiro?')),
    lista,
    h('section', {},
      h('h3', {}, 'Gravar com a sua voz e enviar para o site'),
      h('p', {}, 'Leva uns 10 minutos. A gravação fica só neste aparelho e já vale nele.'),
      h('p', {}, 'Para outras crianças usarem a sua voz: no fim da tela de gravação, toque em ', h('strong', {}, '📤 Enviar meus sons'),
        ` e mande o arquivo pelo WhatsApp ou e-mail para ${CONTATO.nome}. Ele ouve e coloca no site, e a sua voz aparece aqui para todos escolherem.`),
      h('div', { class: 'acoes', style: 'justify-content:flex-start' }, botao('Gravar os sons das letras', () => ir('#/gravar'), 'roxo', '🎙️')))));
}

// ------------------------------------------------------------------ gravar os sons com a própria voz
export async function telaGravar(tela, ir, irPara) {
  const d = dados();
  const caixa = h('div', { class: 'pais' });
  tela.append(caixa);
  if (!podeGravar()) {
    caixa.append(h('h2', { class: 'titulo-tela' }, '🎙️ Gravar os sons'),
      h('section', {}, h('p', {}, 'Este navegador não deixa gravar. Abra o app pelo site (https://ageilson.github.io/aprender-ler/) no Chrome ou no Safari do celular.')));
    return;
  }
  let gravadas = new Set(await chavesGravadas());
  let gravacaoAtual = null;
  aoSair(() => gravacaoAtual?.parar());
  const progresso = h('p', { class: 'progresso-gravacao' });
  const situacaoEnvio = h('p', { class: 'aviso' });
  const atualizarProgresso = () => {
    const faltam = d.sons.length - gravadas.size;
    progresso.textContent = `${gravadas.size} de ${d.sons.length} sons gravados`;
    // o botão só libera com os 23 sons, e enquanto isso diz quantos faltam (botão desativado não dá aviso no clique)
    btnEnviar.disabled = faltam > 0;
    btnEnviar.firstChild.textContent = faltam ? '🎙️' : '📤';
    btnEnviar.lastChild.textContent = faltam ? `Faltam ${faltam} ${faltam === 1 ? 'som' : 'sons'} para gravar` : 'Enviar meus sons';
    situacaoEnvio.textContent = faltam
      ? `Para enviar, grave todos os sons lá em cima. Faltam ${faltam} de ${d.sons.length}.`
      : 'Todos os sons gravados! Pode enviar. 🎉';
  };

  const linhas = d.sons.map(([chave, letra, exemplo, dica, figura, onomatopeia]) => {
    const pal = d.palavras[exemplo];
    const status = h('span', { class: 'status' }, gravadas.has(chave) ? '✅' : '');
    const ouvir = botao('', () => falarSomDaVoz([chave], 'local'), 'branco', '▶️');
    ouvir.disabled = !gravadas.has(chave);
    const btnGravar = botao('Gravar', null, 'vermelho', '🎙️');
    btnGravar.addEventListener('click', async () => {
      if (gravacaoAtual) { // segundo toque: para
        const g = gravacaoAtual; gravacaoAtual = null;
        await g.parar();
        return;
      }
      parar();
      try {
        gravacaoAtual = await gravar(2500);
      } catch {
        aviso.textContent = 'Não consegui usar o microfone. Permita o microfone para este site e tente de novo.';
        return;
      }
      const esta = gravacaoAtual;
      btnGravar.lastChild.textContent = 'Parar';
      btnGravar.classList.add('gravando');
      const blob = await esta.pronto;
      if (gravacaoAtual === esta) gravacaoAtual = null;
      btnGravar.lastChild.textContent = 'Gravar de novo';
      btnGravar.classList.remove('gravando');
      await salvarGravacao(chave, blob);
      gravadas.add(chave);
      status.textContent = '✅';
      ouvir.disabled = false;
      atualizarProgresso();
      falarSomDaVoz([chave], 'local'); // ouve como ficou
    });
    if (gravadas.has(chave)) btnGravar.lastChild.textContent = 'Gravar de novo';
    return h('div', { class: 'gravar-linha' },
      h('span', { class: 'gravar-letra esc-forma' }, letra.toUpperCase() + ' ' + letra),
      h('span', { class: 'gravar-exemplo', dataset: { fala: falaPalavra(exemplo) } }, emoji(pal?.e || ''), ' ', exemplo.toUpperCase()),
      h('span', { class: 'gravar-onomatopeia' }, emoji(figura || ''), h('span', {}, h('strong', {}, `Como ${onomatopeia}`), h('small', {}, dica))),
      h('span', { class: 'gravar-botoes' }, btnGravar, ouvir, status));
  });

  const aviso = h('p', { class: 'aviso-erro' });
  const apelido = h('input', { type: 'text', maxlength: 40, placeholder: 'Ex.: Mamãe educadora (ou deixe em branco)' });
  const autorizo = h('input', { type: 'checkbox' });
  const resultado = h('div');
  // Não há servidor para receber o arquivo direto: ele vai pelo WhatsApp ou e-mail para quem cuida do app,
  // que ouve (são áudios para crianças) e coloca no site (ferramentas/sons.py importar).
  const btnEnviar = botao('Enviar meus sons', async () => {
    if (!autorizo.checked) {
      resultado.replaceChildren(h('p', { class: 'aviso-erro' }, '☝️ Marque a caixinha de autorização acima para poder enviar.'));
      autorizo.closest('label').classList.add('falta');
      resultado.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    autorizo.closest('label').classList.remove('falta');
    const arquivo = await arquivoParaEnviar(apelido.value);
    const texto = `Sons das letras para o Aprender a Ler${apelido.value ? ` (${apelido.value})` : ''}.`;
    let compartilhou = false;
    try {
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Sons das letras', text: texto });
        compartilhou = true;
      }
    } catch { /* cancelou ou não deu: salva o arquivo */ }
    if (!compartilhou) baixar(arquivo);
    const zap = encodeURIComponent('Olá! Gravei os sons das letras para o Aprender a Ler. Vou te mandar o arquivo.');
    const assunto = encodeURIComponent('Sons das letras para o Aprender a Ler');
    const corpo = encodeURIComponent(`Olá! Segue em anexo o arquivo ${arquivo.name} com os sons das letras.`);
    resultado.replaceChildren(
      h('p', {}, compartilhou
        ? `✅ Pronto! Se você escolheu o WhatsApp ou o e-mail de ${CONTATO.nome}, já foi. Se não, mande o arquivo pelos botões abaixo.`
        : `✅ O arquivo "${arquivo.name}" foi salvo neste aparelho (pasta Downloads). Agora abra a conversa abaixo e anexe o arquivo (📎).`),
      h('div', { class: 'contato' },
        h('a', { class: 'btn verde', href: `https://wa.me/${CONTATO.whatsapp}?text=${zap}`, target: '_blank', rel: 'noopener' }, emoji('💬'), `WhatsApp ${CONTATO.whatsappTexto}`),
        h('a', { class: 'btn branco', href: `mailto:${CONTATO.email}?subject=${assunto}&body=${corpo}`, target: '_blank', rel: 'noopener' }, emoji('✉️'), CONTATO.email)));
  }, 'verde', '📤');
  const enviar = h('section', { class: 'enviar-sons', id: 'enviar' },
    h('h3', {}, '📤 Enviar para outras crianças usarem'),
    h('p', {}, `Quando terminar de gravar, envie seus sons para ${CONTATO.nome}. Ele ouve, coloca no site e eles ficam `,
      'disponíveis para todos os pais escolherem, sem o seu nome (só o apelido abaixo, se você escrever). Ficam até 10 vozes, as de melhor nota.'),
    situacaoEnvio,
    h('label', {}, 'Como quer aparecer (opcional)'), apelido,
    h('label', { class: 'interruptor' }, autorizo, 'Autorizo publicar estes sons no Aprender a Ler para outras crianças usarem.'),
    h('ol', { class: 'passos-envio' },
      h('li', {}, 'Toque em "Enviar meus sons".'),
      h('li', {}, 'No celular, escolha o WhatsApp (ou o e-mail) e mande para ', h('strong', {}, `${CONTATO.nome} ${CONTATO.whatsappTexto}`), '.'),
      h('li', {}, 'No computador, o arquivo é salvo: abra a conversa pelo botão que aparece e anexe o arquivo.')),
    h('div', { class: 'acoes', style: 'justify-content:flex-start' }, btnEnviar),
    resultado);

  caixa.append(
    h('h2', { class: 'titulo-tela' }, '🎙️ Gravar os sons das letras'),
    h('section', { class: 'como-funciona' },
      h('h3', {}, 'Como funciona'),
      h('ol', {},
        h('li', {}, h('strong', {}, 'Grave'), ' os 23 sons aqui embaixo (uns 10 minutos).'),
        h('li', {}, 'Eles já passam a valer ', h('strong', {}, 'neste aparelho'), '.'),
        h('li', {}, 'Se quiser ajudar outras crianças, ', h('strong', {}, 'envie'), ' no fim da página: o arquivo vai pelo WhatsApp ou e-mail e é colocado no site.')),
      h('div', { class: 'acoes', style: 'justify-content:flex-start;margin:6px 0 0' },
        botao('Ir para Enviar', () => enviar.scrollIntoView({ behavior: 'smooth', block: 'start' }), 'branco', '⬇️'))),
    h('section', {},
      h('p', {}, 'Grave o SOM de cada letra, curtinho, do jeito do método fônico: M é "mmmm", não "ême". ',
        'Toque em Gravar, faça o som e toque em Parar (ou espere 2 segundos). Depois ouça e grave de novo se quiser.'),
      h('p', { class: 'nota' }, 'Dica: lugar silencioso, celular a um palmo da boca. Toque na palavra de exemplo para ouvir a palavra.'),
      h('p', { class: 'video-referencia' }, emoji('📺'), ' Não sabe como fazer algum som? Veja o vídeo ',
        h('a', { href: VIDEO_REFERENCIA.url, target: '_blank', rel: 'noopener' }, `"${VIDEO_REFERENCIA.titulo}"`),
        ` (canal ${VIDEO_REFERENCIA.canal}, no YouTube): uma professora mostra o som de cada letra com uma onomatopeia.`),
      h('p', { class: 'nota' }, 'As gravações ficam só neste aparelho. Só saem daqui se você tocar em "Enviar".'),
      progresso, aviso),
    h('div', { class: 'gravar-lista' }, linhas),
    h('div', { class: 'acoes' },
      botao('Usar a minha gravação', () => { usarVoz('local'); if (!ehFonico()) mudarConfig('metodo', 'fonico'); ir('#/sons'); }, 'azul', '✔️'),
      botao('Apagar minhas gravações', async () => {
        if (!confirm('Apagar todas as suas gravações deste aparelho?')) return;
        await apagarGravacoes();
        if (config().vozSons === 'local') usarVoz('');
        ir('#/sons');
      }, 'branco', '🗑️')),
    enviar);
  atualizarProgresso();
  // atalho "Enviar para o site": pula para o envio depois que letras e figuras terminam de carregar
  if (irPara === 'enviar') {
    const pular = () => enviar.isConnected && enviar.scrollIntoView({ block: 'start' });
    document.fonts.ready.then(() => { setTimeout(pular, 150); setTimeout(pular, 700); });
  }
}

function baixar(arquivo) {
  const a = h('a', { href: URL.createObjectURL(arquivo), download: arquivo.name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
