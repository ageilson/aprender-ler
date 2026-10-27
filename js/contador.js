// Contador anônimo no GoatCounter (https://www.goatcounter.com), feito para não rastrear ninguém: não usa
// cookies e não grava o endereço IP nem os dados do navegador. Daqui só sai um aviso com um caminho fixo
// ("/aparelho-novo" ou "/nota-sons/<voz>/<nota>"): sem nome, sem localização, sem identificador e sem
// endereço de origem. Só conta no site publicado: usar no PC de testes (localhost) não soma.
//  - Crianças ajudadas: na primeira vez que um aparelho usa o app (guia concluído), um único "/aparelho-novo".
//  - Notas das vozes dos sons das letras: uma por voz por aparelho (ver sons.js).
// Os números são lidos "desde o lançamento" (start=...): sem o período, o GoatCounter devolve um número
// guardado de até 4 horas atrás.

import { config, mudarConfig } from './progresso.js';

const CONTADOR = 'https://aprenderler.goatcounter.com';
const NO_SITE = location.hostname === 'ageilson.github.io';
const DESDE = 'start=2026-10-01';

async function contagem(caminho) {
  const r = await fetch(`${CONTADOR}/counter/${encodeURIComponent(caminho)}.json?${DESDE}`,
    { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
  if (r.status === 404) return 0; // ninguém contou esse caminho ainda
  if (!r.ok) throw new Error(r.status);
  const { count } = await r.json();
  return Number(String(count).replace(/\D/g, '')) || 0;
}

// Envia um aviso anônimo, só se o contador existir e responder (se não, não envia nada).
export async function enviarAvisoAnonimo(caminho) {
  if (!NO_SITE) return false;
  try {
    await contagem('TOTAL');
    await fetch(`${CONTADOR}/count?p=${encodeURIComponent(caminho)}`, {
      mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function contarAparelho() {
  if (!NO_SITE || !config().configurado || config().contado) return;
  // sem internet ou contador fora do ar: tenta de novo na próxima vez que o app abrir
  if (await enviarAvisoAnonimo('/aparelho-novo')) mudarConfig('contado', true);
}

// O número para mostrar ("1.234"), ou null se o contador não responder ou ainda estiver zerado.
export async function criancasAjudadas() {
  try {
    const n = await contagem('/aparelho-novo');
    return n > 0 ? n.toLocaleString('pt-BR') : null;
  } catch {
    return null;
  }
}
