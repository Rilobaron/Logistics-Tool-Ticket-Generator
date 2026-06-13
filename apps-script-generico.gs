/**
 * Google Apps Script — Registro de Tickets com Status/Ação
 *
 * Salva na aba Tickets:
 * - Data do envio
 * - Pedido/Ticket
 * - Nome do cliente
 * - Telefone
 * - Tipo da reclamação
 * - Status/Ação
 *
 * O script cria e formata automaticamente as abas Tickets e Resumo.
 */

const SHEET_TICKETS = 'Tickets';
const SHEET_RESUMO  = 'Resumo';

const HEADERS = [
  'Data do envio',
  'Pedido/Ticket',
  'Nome do cliente',
  'Telefone',
  'Tipo da reclamação',
  'Status/Ação'
];

const TIPOS_RECLAMACAO = [
  'Assinado mas não recebido',
  'Avaria pós entrega',
  'Faltando itens',
  'Verificação de POD/Fotos da baixa'
];

const STATUS_ACAO = [
  'Enviada',
  'Aguardando resposta do cliente',
  'Ticket Fechado'
];

const CORES_TIPO = {
  'Assinado mas não recebido':         '#fecaca',
  'Avaria pós entrega':                '#fed7aa',
  'Faltando itens':                    '#fde68a',
  'Verificação de POD/Fotos da baixa': '#bfdbfe'
};

const CORES_STATUS = {
  'Enviada':                         '#dbeafe',
  'Aguardando resposta do cliente':  '#fef3c7',
  'Ticket Fechado':                  '#dcfce7'
};

const COR_CABECALHO_BG   = '#2563eb';
const COR_CABECALHO_FONT = '#ffffff';
const COR_LINHA_PAR      = '#f9fafb';
const COR_LINHA_IMPAR    = '#ffffff';
const COR_PADRAO_BG      = '#e5e7eb';

function doGet() {
  return json_({
    ok: true,
    success: true,
    mensagem: 'Web App do Gerador de Tickets Logísticos ativo.',
    planilha: SHEET_TICKETS,
    colunas: HEADERS
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(12000);

  try {
    const payload = lerPayload_(e);
    const sheet = getAbaTickets_();
    garantirCabecalho_(sheet);

    const pedido = limpar_(payload.pedido);
    if (!pedido) throw new Error('Pedido/Ticket não informado.');

    const linhaExistente = buscarLinhaPorPedido_(sheet, pedido);
    const tipoReclamacao = normalizarTipo_(payload.tipoReclamacao || payload.reclamacao);
    let statusAcao = normalizarStatus_(payload.statusAcao);

    // Se o ticket já existir e o status foi alterado manualmente na planilha,
    // preserva o status atual para não resetar um Ticket Fechado por acidente.
    if (linhaExistente) {
      const statusAtual = normalizarStatus_(sheet.getRange(linhaExistente, 6).getValue());
      if (statusAtual && (!payload.statusAcao || statusAcao === 'Enviada')) statusAcao = statusAtual;
    }

    const linha = [
      new Date(),
      pedido,
      limpar_(payload.nome),
      somenteDigitos_(payload.telefone),
      tipoReclamacao,
      statusAcao || 'Enviada'
    ];

    if (linhaExistente) {
      escreverLinha_(sheet, linhaExistente, linha);
      atualizarResumo_();
      return json_({ success: true, ok: true, message: 'Ticket atualizado com sucesso.', acao: 'atualizado', linha: linhaExistente });
    }

    const proximaLinha = sheet.getLastRow() + 1;
    escreverLinha_(sheet, proximaLinha, linha);
    atualizarResumo_();
    return json_({ success: true, ok: true, message: 'Ticket salvo com sucesso.', acao: 'criado', linha: proximaLinha });

  } catch (erro) {
    return json_({ success: false, ok: false, message: String(erro && erro.message ? erro.message : erro), erro: String(erro && erro.message ? erro.message : erro) });
  } finally {
    lock.releaseLock();
  }
}

function lerPayload_(e) {
  if (!e) throw new Error('Requisição vazia.');

  if (e.parameter && e.parameter.payload) return JSON.parse(e.parameter.payload);

  if (e.postData && e.postData.contents) {
    const body = String(e.postData.contents);
    if (body.startsWith('payload=')) {
      return JSON.parse(decodeURIComponent(body.replace(/^payload=/, '').replace(/\+/g, ' ')));
    }
    return JSON.parse(body);
  }

  throw new Error('Nenhum payload recebido.');
}

function getAbaTickets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Nenhuma planilha ativa. Crie o Apps Script a partir da própria planilha.');
  return ss.getSheetByName(SHEET_TICKETS) || ss.insertSheet(SHEET_TICKETS);
}

function garantirCabecalho_(sheet) {
  // Atualiza o cabeçalho mesmo quando a planilha veio de uma versão antiga com menos colunas.
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground(COR_CABECALHO_BG)
    .setFontColor(COR_CABECALHO_FONT)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm');
  sheet.getRange('B:B').setNumberFormat('@');
  sheet.getRange('D:D').setNumberFormat('@');

  sheet.setColumnWidth(1, 155);
  sheet.setColumnWidth(2, 185);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 250);
  sheet.setColumnWidth(6, 230);

  preencherStatusPadrao_(sheet);
  aplicarValidacaoStatus_(sheet);

  const filtro = sheet.getFilter();
  if (filtro) filtro.remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), HEADERS.length).createFilter();
}

function preencherStatusPadrao_(sheet) {
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return;

  const range = sheet.getRange(2, 6, ultimaLinha - 1, 1);
  const valores = range.getValues().map(row => [normalizarStatus_(row[0]) || 'Enviada']);
  range.setValues(valores);
}

function aplicarValidacaoStatus_(sheet) {
  const maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_ACAO, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, maxRows, 1).setDataValidation(rule);
}

function escreverLinha_(sheet, numLinha, linha) {
  const range = sheet.getRange(numLinha, 1, 1, HEADERS.length);
  range.setValues([linha]);

  sheet.getRange(numLinha, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  sheet.getRange(numLinha, 2).setNumberFormat('@');
  sheet.getRange(numLinha, 4).setNumberFormat('@');

  const bgBase = (numLinha % 2 === 0) ? COR_LINHA_PAR : COR_LINHA_IMPAR;
  range.setBackground(bgBase)
    .setVerticalAlignment('middle')
    .setBorder(false, false, true, false, false, false, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);

  const tipo = limpar_(linha[4]);
  const status = limpar_(linha[5]);

  sheet.getRange(numLinha, 5).setBackground(CORES_TIPO[tipo] || COR_PADRAO_BG).setFontWeight('bold');
  sheet.getRange(numLinha, 6).setBackground(CORES_STATUS[status] || COR_PADRAO_BG).setFontWeight('bold');
}

function buscarLinhaPorPedido_(sheet, pedido) {
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return null;

  const pedidos = sheet.getRange(2, 2, ultimaLinha - 1, 1).getValues();
  for (let i = 0; i < pedidos.length; i++) {
    if (limpar_(pedidos[i][0]) === pedido) return i + 2;
  }
  return null;
}

function atualizarResumo_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let resumo = ss.getSheetByName(SHEET_RESUMO);
  if (!resumo) resumo = ss.insertSheet(SHEET_RESUMO);

  resumo.clearContents();
  resumo.clearFormats();

  const tituloRange = resumo.getRange(1, 1, 1, 7);
  tituloRange.merge()
    .setValue('Resumo de Tickets Logísticos — visão geral')
    .setBackground(COR_CABECALHO_BG)
    .setFontColor(COR_CABECALHO_FONT)
    .setFontWeight('bold')
    .setFontSize(13)
    .setHorizontalAlignment('center');

  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  resumo.getRange(2, 1, 1, 7).merge()
    .setValue('Atualizado em: ' + agora)
    .setFontColor('#6b7280')
    .setFontSize(11)
    .setHorizontalAlignment('center');

  resumo.getRange(4, 1, 1, 3).setValues([['Tipo de Reclamação', 'Total', '% do total']])
    .setFontWeight('bold').setBackground('#374151').setFontColor('#ffffff').setHorizontalAlignment('center');
  resumo.getRange(4, 5, 1, 3).setValues([['Status/Ação', 'Total', '% do total']])
    .setFontWeight('bold').setBackground('#374151').setFontColor('#ffffff').setHorizontalAlignment('center');
  resumo.setFrozenRows(4);

  const sheetTickets = getAbaTickets_();
  garantirCabecalho_(sheetTickets);
  const ultimaLinha = sheetTickets.getLastRow();

  const contTipos = {};
  TIPOS_RECLAMACAO.forEach(t => contTipos[t] = 0);
  contTipos['Outros'] = 0;

  const contStatus = {};
  STATUS_ACAO.forEach(s => contStatus[s] = 0);
  contStatus['Outros'] = 0;

  if (ultimaLinha >= 2) {
    const dados = sheetTickets.getRange(2, 5, ultimaLinha - 1, 2).getValues();
    dados.forEach(row => {
      const tipo = limpar_(row[0]);
      const status = limpar_(row[1]);
      if (contTipos.hasOwnProperty(tipo)) contTipos[tipo]++;
      else if (tipo) contTipos['Outros']++;
      if (contStatus.hasOwnProperty(status)) contStatus[status]++;
      else if (status) contStatus['Outros']++;
    });
  }

  preencherResumo_(resumo, [...TIPOS_RECLAMACAO, 'Outros'], contTipos, CORES_TIPO, 1);
  preencherResumo_(resumo, [...STATUS_ACAO, 'Outros'], contStatus, CORES_STATUS, 5);

  resumo.setColumnWidth(1, 260);
  resumo.setColumnWidth(2, 80);
  resumo.setColumnWidth(3, 100);
  resumo.setColumnWidth(4, 24);
  resumo.setColumnWidth(5, 260);
  resumo.setColumnWidth(6, 80);
  resumo.setColumnWidth(7, 100);
}

function preencherResumo_(sheet, labels, contagens, cores, startCol) {
  const total = labels.reduce((s, label) => s + (contagens[label] || 0), 0);

  labels.forEach((label, idx) => {
    const linhaNum = 5 + idx;
    const qtd = contagens[label] || 0;
    const pct = total > 0 ? ((qtd / total) * 100).toFixed(1) + '%' : '0%';
    const corFundo = cores[label] || '#f3f4f6';
    const linhaAlt = (idx % 2 === 0) ? '#ffffff' : '#f9fafb';

    sheet.getRange(linhaNum, startCol).setValue(label).setBackground(corFundo).setFontWeight('bold');
    sheet.getRange(linhaNum, startCol + 1).setValue(qtd).setBackground(linhaAlt).setHorizontalAlignment('center').setFontWeight('bold');
    sheet.getRange(linhaNum, startCol + 2).setValue(pct).setBackground(linhaAlt).setHorizontalAlignment('center');
    sheet.getRange(linhaNum, startCol, 1, 3)
      .setBorder(false, false, true, false, false, false, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);
  });

  const linhaTotalIdx = 5 + labels.length;
  sheet.getRange(linhaTotalIdx, startCol).setValue('TOTAL').setFontWeight('bold').setBackground('#1f2937').setFontColor('#fff');
  sheet.getRange(linhaTotalIdx, startCol + 1).setValue(total).setFontWeight('bold').setBackground('#1f2937').setFontColor('#fff').setHorizontalAlignment('center');
  sheet.getRange(linhaTotalIdx, startCol + 2).setValue(total > 0 ? '100%' : '0%').setBackground('#1f2937').setFontColor('#fff').setHorizontalAlignment('center');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Tickets Logísticos')
    .addItem('🔄 Formatar planilha Tickets', 'formatarPlanilhaManual')
    .addItem('📊 Atualizar resumo', 'atualizarResumoManual')
    .addSeparator()
    .addItem('ℹ️ Sobre esta planilha', 'mostrarSobre')
    .addToUi();
}

function formatarPlanilhaManual() {
  const sheet = getAbaTickets_();
  garantirCabecalho_(sheet);

  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha >= 2) {
    for (let i = 2; i <= ultimaLinha; i++) {
      const tipo = limpar_(sheet.getRange(i, 5).getValue());
      const status = normalizarStatus_(sheet.getRange(i, 6).getValue()) || 'Enviada';
      sheet.getRange(i, 6).setValue(status);

      const bgBase = (i % 2 === 0) ? COR_LINHA_PAR : COR_LINHA_IMPAR;
      sheet.getRange(i, 1, 1, HEADERS.length).setBackground(bgBase);
      sheet.getRange(i, 5).setBackground(CORES_TIPO[tipo] || COR_PADRAO_BG).setFontWeight('bold');
      sheet.getRange(i, 6).setBackground(CORES_STATUS[status] || COR_PADRAO_BG).setFontWeight('bold');
    }
  }

  SpreadsheetApp.getUi().alert('✅ Planilha Tickets formatada com sucesso.');
}

function atualizarResumoManual() {
  atualizarResumo_();
  SpreadsheetApp.getUi().alert('✅ Aba Resumo atualizada com sucesso.');
}

function mostrarSobre() {
  SpreadsheetApp.getUi().alert([
    'Gerador de Tickets Logísticos — Apps Script',
    '',
    'Este Apps Script recebe dados do gerador HTML e registra na aba Tickets.',
    '',
    'Colunas salvas:',
    '• Data do envio',
    '• Pedido/Ticket',
    '• Nome do cliente',
    '• Telefone',
    '• Tipo da reclamação',
    '• Status/Ação',
    '',
    'O campo Status/Ação possui lista suspensa com: Enviada, Aguardando resposta do cliente e Ticket Fechado.'
  ].join('\n'));
}

function limpar_(valor) {
  return String(valor ?? '').trim();
}

function somenteDigitos_(valor) {
  let d = limpar_(valor).replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  return d;
}

function normalizarTipo_(valor) {
  const v = limpar_(valor);
  return TIPOS_RECLAMACAO.indexOf(v) >= 0 ? v : 'Assinado mas não recebido';
}

function normalizarStatus_(valor) {
  const v = limpar_(valor);
  return STATUS_ACAO.indexOf(v) >= 0 ? v : 'Enviada';
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
