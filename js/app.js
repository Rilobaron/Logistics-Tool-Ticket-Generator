(() => {
  const CONFIG = window.APP_CONFIG || {
    appName: 'Gerador de Tickets Logísticos',
    brandName: 'Logística',
    brandMark: 'LT',
    transportadoraPadrao: 'Transportadora',
    storagePrefix: 'ticketGenerator',
    clientIntroTemplate: 'Sou da equipe de atendimento logístico responsável pela entrega.',
    footerText: 'Ferramenta interna de apoio operacional.',
    driverTitle: 'Ticket logístico',
    orderLabel: 'Pedido/Ticket'
  };

  const COMPLAINT_TYPES = [
    'Assinado mas não recebido',
    'Avaria pós entrega',
    'Faltando itens',
    'Verificação de POD/Fotos da baixa'
  ];

  const STORAGE = {
    webAppUrl: `${CONFIG.storagePrefix}:webAppUrl`,
    autoSave: `${CONFIG.storagePrefix}:autoSave`,
    greeting: `${CONFIG.storagePrefix}:greeting`,
    showUrl: `${CONFIG.storagePrefix}:showUrl`
  };

  const SESSION = {
    history: `${CONFIG.storagePrefix}:temporaryHistory`
  };

  let editingConnection = false;
  let lastTicketId = null;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    applyBranding();
    buildComplaintOptions();
    loadPreferences();
    bindEvents();
    updateSheetBadges();
    renderConnectionSettings();
    renderHistory();
    renderSheetView();
  }

  function applyBranding() {
    document.title = `${CONFIG.brandName} • ${CONFIG.appName}`;
    $$('.js-brand-name').forEach((el) => { el.textContent = CONFIG.brandName; });
    $$('.js-brand-mark').forEach((el) => { el.textContent = CONFIG.brandMark; });
    $$('.js-app-name').forEach((el) => { el.textContent = CONFIG.appName; });
    $$('.js-footer-text').forEach((el) => { el.textContent = CONFIG.footerText || 'Ferramenta interna de apoio operacional.'; });
    const transportadora = $('#transportadora');
    if (transportadora && !transportadora.value.trim()) transportadora.value = CONFIG.transportadoraPadrao || '';
  }

  function buildComplaintOptions() {
    const container = $('#tipoReclamacaoGrid');
    if (!container) return;
    container.innerHTML = COMPLAINT_TYPES.map((type, index) => `
      <button class="complaint-option${index === 0 ? ' selected' : ''}" type="button" data-tipo="${escapeAttr(type)}">
        <span class="option-mark" aria-hidden="true"></span>
        <span>${escapeHtml(type)}</span>
      </button>
    `).join('');
  }

  function loadPreferences() {
    const savedUrl = localStorage.getItem(STORAGE.webAppUrl) || '';
    const savedGreeting = localStorage.getItem(STORAGE.greeting) || 'Bom dia';
    const autoValue = localStorage.getItem(STORAGE.autoSave);

    $('#webAppUrl').value = savedUrl;
    $('#periodoSaudacao').value = savedGreeting;
    setAutoSave(autoValue === null ? true : autoValue === 'true', false);
  }

  function bindEvents() {
    $('#dados')?.addEventListener('blur', () => extractData(false));
    $('#webAppUrl')?.addEventListener('input', updateSheetBadges);
    $('#periodoSaudacao')?.addEventListener('change', () => {
      localStorage.setItem(STORAGE.greeting, $('#periodoSaudacao').value);
    });
    $('#autoSalvar')?.addEventListener('change', () => setAutoSave($('#autoSalvar').checked));
    $('#autoSalvarConfig')?.addEventListener('change', () => setAutoSave($('#autoSalvarConfig').checked));
    $('#tipoReclamacaoGrid')?.addEventListener('click', (event) => {
      const button = event.target.closest('.complaint-option');
      if (button) selectComplaintType(button);
    });
  }

  window.showView = showView;
  window.toggleSidebar = toggleSidebar;
  window.extractData = extractData;
  window.generateMainFlow = generateMainFlow;
  window.saveToSheetManual = saveToSheetManual;
  window.copyField = copyField;
  window.copyAll = copyAll;
  window.clearForm = clearForm;
  window.clearTemporaryHistory = clearTemporaryHistory;
  window.copyHistoryText = copyHistoryText;
  window.resendHistoryItem = resendHistoryItem;
  window.removeHistoryItem = removeHistoryItem;
  window.saveConnection = saveConnection;
  window.removeConnection = removeConnection;
  window.editConnection = editConnection;
  window.cancelConnectionEdit = cancelConnectionEdit;
  window.toggleShowUrl = toggleShowUrl;

  function showView(name) {
    $$('.view').forEach((view) => view.classList.remove('active'));
    $(`#view-${name}`)?.classList.add('active');
    $$('.nav-btn').forEach((button) => button.classList.toggle('active', button.dataset.view === name));

    if (name === 'historico') renderHistory();
    if (name === 'configuracoes') renderConnectionSettings();
    if (name === 'planilha') renderSheetView();
    toggleSidebar(false);
  }

  function toggleSidebar(open) {
    $('#sidebar')?.classList.toggle('open', open);
    $('#backdrop')?.classList.toggle('show', open);
  }

  function setAutoSave(value, persist = true) {
    if ($('#autoSalvar')) $('#autoSalvar').checked = value;
    if ($('#autoSalvarConfig')) $('#autoSalvarConfig').checked = value;
    if (persist) localStorage.setItem(STORAGE.autoSave, String(value));
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function cleanPhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
    return digits;
  }

  function cleanOrder(value) {
    return String(value || '').replace(/[^\w]/g, '').trim();
  }

  function validLines(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function firstName(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean)[0] || '';
  }

  function fallback(value) {
    return String(value || '').trim() || 'PENDENTE';
  }

  function extractField(text, labels) {
    const lines = validLines(text);
    const normalizedLabels = labels.map(normalizeText);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const key = normalizeText(line.replace(/:$/, '').trim());

      for (const label of normalizedLabels) {
        if (key === label) {
          let next = index + 1;
          while (next < lines.length && lines[next].trim() === ':') next += 1;
          return lines[next] || '';
        }

        if (key.startsWith(`${label}:`) || key.startsWith(`${label} :`)) {
          const value = line.split(':').slice(1).join(':').trim();
          if (value) return value;
        }
      }
    }
    return '';
  }

  function parsePastedData() {
    const text = $('#dados').value;
    return {
      nome: extractField(text, ['Nome', 'Nome do destinatário', 'Nome do destinatario', 'Destinatário', 'Destinatario']),
      telefone: cleanPhone(extractField(text, ['Telefone', 'TEL', 'Telefone do destinatário', 'Telefone do destinatario', 'TEL de destinatário', 'TEL de destinatario'])),
      endereco: extractField(text, ['Endereço', 'Endereco', 'Endereço do destinatário', 'Endereco do destinatario']),
      pedido: cleanOrder(extractField(text, ['Pedido', 'Ticket', 'Número do ticket', 'Numero do ticket', 'Remessa']))
    };
  }

  function setValueWhenAllowed(id, value, force) {
    const element = $(`#${id}`);
    const clean = String(value || '').trim();
    if (!element || !clean) return;
    if (force || !element.value.trim()) element.value = clean;
  }

  function extractData(force = true) {
    const extracted = parsePastedData();
    setValueWhenAllowed('nome', extracted.nome, force);
    setValueWhenAllowed('telefone', extracted.telefone, force);
    setValueWhenAllowed('endereco', extracted.endereco, force);
    setValueWhenAllowed('pedido', extracted.pedido, false);

    const name = $('#nome').value.trim();
    if (!$('#saudacao').value.trim() && name) $('#saudacao').value = firstName(name);

    if (force) {
      const total = [extracted.nome, extracted.telefone, extracted.endereco].filter(Boolean).length;
      showToast(total ? `${total} campo(s) extraído(s). Confira antes de gerar.` : 'Não encontrei nome, telefone ou endereço no texto colado.');
    }
  }

  function selectComplaintType(selectedButton) {
    $$('#tipoReclamacaoGrid .complaint-option').forEach((button) => button.classList.remove('selected'));
    selectedButton.classList.add('selected');
  }

  function getComplaintType() {
    return $('#tipoReclamacaoGrid .complaint-option.selected')?.dataset.tipo || COMPLAINT_TYPES[0];
  }

  function getTicketData() {
    extractData(false);

    const nome = $('#nome').value.trim();
    const telefone = cleanPhone($('#telefone').value);
    const endereco = $('#endereco').value.trim();
    const pedido = cleanOrder($('#pedido').value);
    const valor = $('#valor').value.trim();
    const dataEntrega = $('#dataEntrega').value.trim();
    const tipoReclamacao = getComplaintType();
    const statusAcao = $('#statusAcao')?.value || 'Enviada';
    const transportadora = $('#transportadora').value.trim() || CONFIG.transportadoraPadrao || 'Transportadora';
    const periodoSaudacao = $('#periodoSaudacao').value || 'Bom dia';
    const saudacao = $('#saudacao').value.trim() || firstName(nome);

    if (!$('#saudacao').value.trim() && saudacao) $('#saudacao').value = saudacao;

    const msgMotorista = buildDriverMessage({ pedido, nome, endereco, valor, telefone, dataEntrega, tipoReclamacao });
    const msgCliente = buildClientMessage({ periodoSaudacao, saudacao, pedido, transportadora, tipoReclamacao });

    return {
      id: createTicketId(pedido),
      pedido,
      nome,
      telefone,
      endereco,
      valor,
      dataEntrega,
      tipoReclamacao,
      statusAcao,
      transportadora,
      periodoSaudacao,
      saudacao,
      msgMotorista,
      msgCliente
    };
  }

  function createTicketId(order) {
    return order ? `pedido-${order}` : `tmp-${Date.now()}`;
  }

  function buildDriverMessage({ pedido, nome, endereco, valor, telefone, dataEntrega, tipoReclamacao }) {
    return [
      `${CONFIG.driverTitle || 'Ticket logístico'} - ${fallback(pedido)}`,
      '',
      `Nome do destinatário: ${fallback(nome)}`,
      '',
      `Endereço do destinatário: ${fallback(endereco)}`,
      '',
      `Valor Mercadoria: ${fallback(valor)}`,
      '',
      `TEL de destinatário: ${fallback(telefone)}`,
      '',
      `Data da Entrega: ${fallback(dataEntrega)}`,
      '',
      `Reclamação: ${fallback(tipoReclamacao)}`
    ].join('\n');
  }

  function buildClientMessage({ periodoSaudacao, saudacao, pedido, transportadora, tipoReclamacao }) {
    const intro = (CONFIG.clientIntroTemplate || 'Sou da equipe de atendimento logístico responsável pela entrega.')
      .replace('{transportadora}', transportadora);
    const options = getOptionsByType(tipoReclamacao);

    return [
      `${periodoSaudacao}, ${fallback(saudacao)}.`,
      '',
      intro,
      '',
      `Verificamos que você abriu uma reclamação referente ao pedido ${fallback(pedido)}.`,
      'Para que possamos auxiliar, escolha uma opção:',
      '',
      ...options.map((option, index) => `${index + 1}- ${option}`)
    ].join('\n');
  }

  function getOptionsByType() {
    return [
      'Recebi o produto',
      'Não recebi o produto',
      'Recebi o pacote com produtos faltantes',
      'Recebi o produto com defeito',
      'Recebi um produto diferente do comprado',
      'Recebi o produto danificado'
    ];
  }

  async function generateMainFlow() {
    const data = generateMessages();
    if (!data) return;

    const historyId = upsertHistory(data, initialHistoryStatus());
    lastTicketId = historyId;

    if (!$('#autoSalvar').checked) {
      updateHistoryStatus(historyId, 'Não enviado');
      setSheetStatus('warn', 'Envio automático desativado', 'O ticket ficou disponível no histórico temporário.');
      return;
    }

    if (!getWebAppUrl()) {
      updateHistoryStatus(historyId, 'Planilha não conectada');
      setSheetStatus('warn', 'Planilha não conectada', 'As mensagens foram geradas e mantidas no histórico temporário.');
      return;
    }

    await saveToSheet(data, false, historyId);
  }

  function generateMessages() {
    const data = getTicketData();
    $('#msgMotorista').value = data.msgMotorista;
    $('#msgCliente').value = data.msgCliente;

    const missing = [];
    if (!data.pedido) missing.push('pedido/acareação');
    if (!data.nome) missing.push('nome');
    if (!data.telefone) missing.push('telefone');

    if (missing.length) {
      setMessageStatus('warn', 'Mensagens geradas com pendências', `Confira: ${missing.join(', ')}.`);
    } else {
      setMessageStatus('ok', 'Mensagens geradas com sucesso', 'Copie, envie ou consulte depois no histórico temporário.');
    }
    return data;
  }

  async function saveToSheetManual() {
    const data = generateMessages();
    if (!data) return;
    const historyId = upsertHistory(data, initialHistoryStatus());
    lastTicketId = historyId;
    await saveToSheet(data, true, historyId);
  }

  function initialHistoryStatus() {
    return getWebAppUrl() ? 'Não enviado' : 'Planilha não conectada';
  }

  async function saveToSheet(data, warnWithoutUrl, historyId) {
    const url = getWebAppUrl();

    if (!url) {
      if (historyId) updateHistoryStatus(historyId, 'Planilha não conectada');
      setSheetStatus('warn', 'Planilha não conectada', warnWithoutUrl ? 'Adicione a URL em Configurações para enviar.' : 'Sem URL configurada.');
      return false;
    }

    if (!data.pedido) {
      if (historyId) updateHistoryStatus(historyId, 'Não enviado');
      setSheetStatus('warn', 'Não enviado', `Preencha o campo ${CONFIG.orderLabel || 'Pedido/Ticket'} antes de salvar.`);
      return false;
    }

    saveConnection(false);
    setLoading(true);
    setSheetStatus('warn', 'Enviando para a planilha', 'Aguarde alguns instantes.');
    if (historyId) updateHistoryStatus(historyId, 'Enviando');

    try {
      const body = new URLSearchParams();
      body.append('payload', JSON.stringify({
        pedido: data.pedido,
        nome: data.nome,
        telefone: data.telefone,
        tipoReclamacao: data.tipoReclamacao,
        statusAcao: data.statusAcao || 'Enviada'
      }));

      await fetch(url, { method: 'POST', mode: 'no-cors', body });

      if (historyId) updateHistoryStatus(historyId, 'Enviado');
      setSheetStatus('ok', 'Enviado para a planilha', 'Registro enviado. Confira a aba Tickets no Google Sheets.');
      renderSheetView();
      return true;
    } catch (error) {
      if (historyId) updateHistoryStatus(historyId, 'Falhou');
      setSheetStatus('error', 'Falha no envio', 'As mensagens continuam disponíveis. Verifique a URL e a implantação do Apps Script.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  function getHistory() {
    try { return JSON.parse(sessionStorage.getItem(SESSION.history) || '[]'); }
    catch { return []; }
  }

  function setHistory(list) {
    sessionStorage.setItem(SESSION.history, JSON.stringify(list));
    updateHistoryCounters();
  }

  function upsertHistory(data, status) {
    const list = getHistory();
    const id = data.id || createTicketId(data.pedido);
    const index = list.findIndex((item) => item.id === id || (data.pedido && item.pedido === data.pedido));
    const item = {
      id,
      pedido: data.pedido,
      nome: data.nome,
      telefone: data.telefone,
      tipoReclamacao: data.tipoReclamacao,
      statusAcao: data.statusAcao || 'Enviada',
      geradoEm: new Date().toISOString(),
      msgMotorista: data.msgMotorista,
      msgCliente: data.msgCliente,
      statusPlanilha: status || 'Não enviado'
    };

    if (index >= 0) list[index] = { ...list[index], ...item };
    else list.unshift(item);

    setHistory(list.slice(0, 50));
    renderHistory();
    return id;
  }

  function updateHistoryStatus(id, status) {
    const list = getHistory();
    const index = list.findIndex((item) => item.id === id);
    if (index >= 0) {
      list[index].statusPlanilha = status;
      list[index].atualizadoEm = new Date().toISOString();
      setHistory(list);
      renderHistory();
    }
  }

  function removeHistoryItem(id) {
    setHistory(getHistory().filter((item) => item.id !== id));
    renderHistory();
    showToast('Item removido do histórico temporário.');
  }

  function clearTemporaryHistory() {
    if (!getHistory().length) {
      showToast('O histórico já está vazio.');
      return;
    }
    if (!confirm('Limpar todas as mensagens geradas nesta sessão?')) return;
    sessionStorage.removeItem(SESSION.history);
    updateHistoryCounters();
    renderHistory();
    showToast('Histórico temporário limpo.');
  }

  function updateHistoryCounters() {
    const count = getHistory().length;
    $$('.js-history-count').forEach((element) => { element.textContent = count; });
  }

  function renderHistory() {
    const list = getHistory();
    updateHistoryCounters();

    const container = $('#historyList');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="empty-state"><strong>Nenhuma mensagem gerada ainda</strong>Gere um ticket na tela Gerador para ele aparecer aqui temporariamente.</div>';
      return;
    }

    container.innerHTML = list.map((item) => {
      const badge = statusBadgeClass(item.statusPlanilha);
      return `
        <article class="history-card">
          <div class="history-head">
            <div class="history-title">
              <strong>${escapeHtml(item.pedido || 'Pedido pendente')} · ${escapeHtml(item.nome || 'Nome pendente')}</strong>
              <span>${escapeHtml(item.telefone || 'Telefone pendente')} · Gerado em ${escapeHtml(formatDateTime(item.geradoEm))}</span>
            </div>
            <span class="badge-pro ${badge}"><span class="badge-dot"></span>${escapeHtml(item.statusPlanilha || 'Não enviado')}</span>
          </div>
          <div class="history-body">
            <div class="history-meta">
              <span class="badge-pro badge-neutral">${escapeHtml(item.tipoReclamacao || 'Sem tipo')}</span>
              <span class="badge-pro ${actionStatusBadgeClass(item.statusAcao)}"><span class="badge-dot"></span>${escapeHtml(item.statusAcao || 'Enviada')}</span>
            </div>
            <div class="history-actions">
              <button class="btn-pro btn-light-pro btn-sm-pro" type="button" onclick="copyHistoryText('${escapeAttr(item.id)}', 'motorista')">Copiar entregador</button>
              <button class="btn-pro btn-light-pro btn-sm-pro" type="button" onclick="copyHistoryText('${escapeAttr(item.id)}', 'cliente')">Copiar cliente</button>
              <button class="btn-pro btn-success-pro btn-sm-pro" type="button" onclick="resendHistoryItem('${escapeAttr(item.id)}')">Reenviar planilha</button>
              <button class="btn-pro btn-danger-pro btn-sm-pro" type="button" onclick="removeHistoryItem('${escapeAttr(item.id)}')">Remover</button>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function actionStatusBadgeClass(status) {
    if (status === 'Ticket Fechado') return 'badge-ok';
    if (status === 'Aguardando resposta do cliente') return 'badge-warn';
    return 'badge-info';
  }

  function statusBadgeClass(status) {
    if (status === 'Enviado') return 'badge-ok';
    if (status === 'Falhou') return 'badge-error';
    if (status === 'Planilha não conectada') return 'badge-warn';
    if (status === 'Enviando') return 'badge-info';
    return 'badge-neutral';
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  async function copyHistoryText(id, type) {
    const item = getHistory().find((entry) => entry.id === id);
    if (!item) return;
    const text = type === 'motorista' ? item.msgMotorista : item.msgCliente;
    await copyText(text, type === 'motorista' ? 'Mensagem do entregador copiada.' : 'Mensagem do cliente copiada.');
  }

  async function resendHistoryItem(id) {
    const item = getHistory().find((entry) => entry.id === id);
    if (!item) return;
    await saveToSheet({
      pedido: item.pedido,
      nome: item.nome,
      telefone: item.telefone,
      tipoReclamacao: item.tipoReclamacao,
      statusAcao: item.statusAcao || 'Enviada'
    }, true, id);
  }

  function getWebAppUrl() {
    return $('#webAppUrl').value.trim() || localStorage.getItem(STORAGE.webAppUrl) || '';
  }

  function saveConnection(showNotice = true) {
    const url = $('#webAppUrl').value.trim();
    if (url) localStorage.setItem(STORAGE.webAppUrl, url);
    else localStorage.removeItem(STORAGE.webAppUrl);

    editingConnection = false;
    updateSheetBadges();
    renderConnectionSettings();
    renderSheetView();
    if (showNotice) showToast(url ? 'Conexão salva e mascarada.' : 'Nenhuma URL foi salva.');
  }

  function removeConnection() {
    localStorage.removeItem(STORAGE.webAppUrl);
    $('#webAppUrl').value = '';
    editingConnection = true;
    updateSheetBadges();
    renderConnectionSettings();
    renderSheetView();
    setSheetStatus('warn', 'Planilha desconectada', 'O gerador continua funcionando normalmente.');
    showToast('Conexão removida.');
  }

  function editConnection() {
    editingConnection = true;
    $('#webAppUrl').value = localStorage.getItem(STORAGE.webAppUrl) || '';
    renderConnectionSettings();
    setTimeout(() => $('#webAppUrl')?.focus(), 40);
  }

  function cancelConnectionEdit() {
    $('#webAppUrl').value = localStorage.getItem(STORAGE.webAppUrl) || '';
    editingConnection = false;
    updateSheetBadges();
    renderConnectionSettings();
  }

  function toggleShowUrl() {
    const current = localStorage.getItem(STORAGE.showUrl) === 'true';
    localStorage.setItem(STORAGE.showUrl, String(!current));
    renderConnectionSettings();
  }

  function maskUrl(url) {
    if (!url) return '';
    const prefix = 'https://script.google.com/macros/s/';
    if (url.startsWith(prefix) && url.endsWith('/exec')) {
      return `${prefix}••••••••••••••••••••••••••••••••/exec`;
    }
    return `••••••••••••••••••••••••••••••••${url.endsWith('/exec') ? '/exec' : ''}`;
  }

  function renderConnectionSettings() {
    const saved = localStorage.getItem(STORAGE.webAppUrl) || '';
    const show = localStorage.getItem(STORAGE.showUrl) === 'true';
    const savedBox = $('#urlSavedBox');
    const editBox = $('#urlEditBox');
    const maskedUrl = $('#maskedUrl');
    const toggleButton = $('#btnToggleUrl');

    if (!saved || editingConnection) {
      if (savedBox) savedBox.style.display = 'none';
      if (editBox) editBox.style.display = 'block';
    } else {
      if (savedBox) savedBox.style.display = 'block';
      if (editBox) editBox.style.display = 'none';
      if (maskedUrl) maskedUrl.textContent = show ? saved : maskUrl(saved);
      if (toggleButton) toggleButton.textContent = show ? 'Ocultar' : 'Mostrar';
    }
  }

  function updateSheetBadges() {
    const url = getWebAppUrl();
    const ok = Boolean(url && url.includes('/exec'));
    const text = ok ? 'Planilha conectada' : (url ? 'URL informada sem /exec' : 'Planilha não conectada');
    const className = ok ? 'badge-pro badge-ok' : 'badge-pro badge-warn';

    $$('.js-sheet-badge').forEach((element) => {
      element.className = className;
      element.innerHTML = `<span class="badge-dot"></span>${text}`;
    });
  }

  function renderSheetView() {
    updateHistoryCounters();
    const url = getWebAppUrl();
    const ok = Boolean(url && url.includes('/exec'));
    const element = $('#sheetStatusBig');
    if (!element) return;
    element.className = `status-card ${ok ? 'ok' : 'warn'}`;
    element.innerHTML = `
      <div class="status-mark">${ok ? '✓' : '!'}</div>
      <div>
        <strong>${ok ? 'Planilha conectada' : 'Planilha não conectada'}</strong>
        <span>${ok ? 'A URL foi salva e está mascarada nas configurações.' : 'Adicione a URL /exec em Configurações.'}</span>
      </div>`;
  }

  async function copyField(id, message) {
    const value = $(`#${id}`)?.value.trim();
    if (!value) {
      showToast('Gere a mensagem antes de copiar.');
      return;
    }
    await copyText(value, message || 'Copiado.');
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    showToast(message || 'Copiado.');
  }

  async function copyAll() {
    const driver = $('#msgMotorista').value.trim();
    const client = $('#msgCliente').value.trim();
    if (!driver && !client) {
      showToast('Gere as mensagens antes de copiar.');
      return;
    }
    await copyText(`ENTREGADOR:\n${driver}\n\n---\n\nCLIENTE:\n${client}`, 'As duas mensagens foram copiadas.');
  }

  function clearForm() {
    ['dados', 'pedido', 'nome', 'telefone', 'endereco', 'valor', 'dataEntrega', 'saudacao', 'msgMotorista', 'msgCliente'].forEach((id) => {
      const element = $(`#${id}`);
      if (element) element.value = '';
    });
    $('#transportadora').value = CONFIG.transportadoraPadrao || '';
    if ($('#statusAcao')) $('#statusAcao').value = 'Enviada';
    $$('#tipoReclamacaoGrid .complaint-option').forEach((button, index) => button.classList.toggle('selected', index === 0));
    setMessageStatus('warn', 'Mensagens', 'Aguardando geração.');
    setSheetStatus('warn', 'Planilha', 'Aguardando conexão ou envio.');
    showToast('Campos limpos.');
  }

  function setLoading(active) {
    if ($('#btnGerar')) $('#btnGerar').disabled = active;
    if ($('#btnSalvar')) $('#btnSalvar').disabled = active;
  }

  function setMessageStatus(type, title, text) {
    setStatusCard('statusMensagem', type, 'M', title, text);
  }

  function setSheetStatus(type, title, text) {
    setStatusCard('statusPlanilha', type, 'P', title, text);
  }

  function setStatusCard(id, type, mark, title, text) {
    const element = $(`#${id}`);
    if (!element) return;
    element.className = `status-card ${type}`;
    element.innerHTML = `<div class="status-mark">${mark}</div><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div>`;
  }

  let toastTimer;
  function showToast(message) {
    const element = $('#toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 3200);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }
})();
