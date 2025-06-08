// js/pedidos.js

/**
 * Módulo de Pedidos
 * Gere todas as operações e a lógica de UI para os pedidos, incluindo
 * o formulário de criação/edição e as listas de visualização.
 */

import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp, setDoc } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

// --- ESTADO INTERNO DO MÓDULO ---
let todosOsPedidosCache = [];
let itemPedidoCount = 0;
let pagamentoCount = 0;
let pedidoImagemBase64 = null;
let editingOrderId = null;

// --- DEPENDÊNCIAS (INJETADAS VIA INIT) ---
let getRole, getUserName, getUserId, getClientes, getProdutos, mostrarSecao, setActiveMenuLink, atualizarDashboard;


// --- FUNÇÕES DE RENDERIZAÇÃO E ATUALIZAÇÃO DA UI ---

function getStatusBadgeSimpleHTML(pedido) {
    const s = pedido.status;
    let c = 'neutral';
    if (s === 'Entregue') c = 'success';
    else if (s === 'Cancelado') c = 'danger';
    else if (s === 'Pronto para Retirada') c = 'primary';
    else if (s?.startsWith('Em Produção') || s === 'Em Rota de Entrega') c = 'info';
    else if (s === 'Aguardando Aprovação') c = 'warning';
    
    return `<button type="button" class="status-badge-simple interactive-button ${c}" onclick="window.abrirModalMudarStatus('${pedido.id}','${(pedido.numeroPedido || '').replace(/'/g, "\\'")}', '${(pedido.clienteNome || '').replace(/'/g, "\\'")}', '${(s || '').replace(/'/g, "\\'")}')" title="Alterar estado">${s}</button>`;
}

function renderizarListaCompletaPedidos() {
    const tbody = document.getElementById('listaTodosPedidos');
    if (!tbody) return;

    const f = {
        nC: document.getElementById('filtroNomeCliente')?.value.toLowerCase(),
        nP: document.getElementById('filtroNumeroPedido')?.value.toLowerCase(),
        dP: document.getElementById('filtroDataPedido')?.value,
        mP: document.getElementById('filtroMaterialProduto')?.value.toLowerCase(),
        sP: document.getElementById('filtroStatusPedido')?.value,
        c: document.getElementById('filtroClassificacaoPedido')?.value,
        vI: document.getElementById('filtroVendedor')?.value
    };

    let pF = [...todosOsPedidosCache];
    if (f.nC) pF = pF.filter(p => p.clienteNome?.toLowerCase().includes(f.nC));
    if (f.nP) pF = pF.filter(p => p.numeroPedido?.toLowerCase().includes(f.nP));
    if (f.dP) {
        const dFil = new Date(f.dP + "T00:00:00");
        pF = pF.filter(p => {
            const dP = p.dataPedido?.toDate();
            return dP && dP.getFullYear() === dFil.getFullYear() && dP.getMonth() === dFil.getMonth() && dP.getDate() === dFil.getDate();
        });
    }
    if (f.mP) pF = pF.filter(p => p.itens?.some(i => i.produtoNome?.toLowerCase().includes(f.mP)));
    if (f.sP) pF = pF.filter(p => p.status === f.sP);
    if (f.vI) pF = pF.filter(p => p.vendedorId === f.vI);

    const sF = {
        'dataPedido_desc': (a, b) => (b.dataPedido?.toMillis() || 0) - (a.dataPedido?.toMillis() || 0),
        'dataPedido_asc': (a, b) => (a.dataPedido?.toMillis() || 0) - (b.dataPedido?.toMillis() || 0),
        'dataEntrega_asc': (a, b) => (a.dataEntrega?.toMillis() || 0) - (b.dataEntrega?.toMillis() || 0),
        'dataEntrega_desc': (a, b) => (b.dataEntrega?.toMillis() || 0) - (a.dataEntrega?.toMillis() || 0),
        'clienteNome_asc': (a, b) => (a.clienteNome || "").localeCompare(b.clienteNome || ""),
        'clienteNome_desc': (a, b) => (b.clienteNome || "").localeCompare(a.clienteNome || ""),
        'numeroPedido_asc': (a, b) => (a.numeroPedido || "").localeCompare(b.numeroPedido || "", undefined, { numeric: true }),
        'numeroPedido_desc': (a, b) => (b.numeroPedido || "").localeCompare(a.numeroPedido || "", undefined, { numeric: true })
    };
    pF.sort(sF[f.c] || sF['dataPedido_desc']);

    if (pF.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = pF.map(p => {
        const pM = JSON.stringify(p);
        const dE = p.dataEntrega?.toDate();
        let sAC = '';
        if (dE && p.status !== 'Entregue' && p.status !== 'Cancelado') {
            const dH = (dE - (new Date())) / 36e5;
            if (dH < 0) sAC = 'late';
            else if (dH <= 24) sAC = 'nearly-late';
        }
        let aB = `<button onclick="window.abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Detalhes"><i class="fas fa-eye"></i></button>`;
        if (['vendedor', 'admin'].includes(getRole())) {
            const bE = (p.status !== 'Entregue' && p.status !== 'Cancelado') ? `<button onclick="window.marcarComoEntregue('${p.id}')" class="btn-icon-action" title="Entregue">📦</button>` : '';
            aB += ` <button onclick="window.prepararEdicaoPedido(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button>${bE}<button onclick="window.excluirPedido('${p.id}','${p.numeroPedido}')" class="btn-icon-action text-red-500 hover:text-red-700" title="Excluir"><i class="fas fa-trash"></i></button>`;
        }
        return `<tr><td class="pedido-numero ${sAC}">${p.numeroPedido}</td><td class="cliente-nome">${p.clienteNome}</td><td>${p.dataPedido?.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) || 'N/A'}</td><td>${dE?.toLocaleDateString('pt-BR') || 'N/A'}</td><td class="font-medium">R$ ${p.valorTotal.toFixed(2).replace('.', ',')}</td><td>${getStatusBadgeSimpleHTML(p)}</td><td class="text-xs space-x-1.5 whitespace-nowrap">${aB}</td></tr>`;
    }).join('');
}


function carregarUltimosPedidos() {
    const tb = document.getElementById('ultimosPedidosTableBody');
    if (!tb) return;
    const pRecentes = [...todosOsPedidosCache].sort((a, b) => (b.dataPedido?.toMillis() || 0) - (a.dataPedido?.toMillis() || 0)).slice(0, 5);
    if (pRecentes.length === 0) {
        tb.innerHTML = `<tr><td colspan="6" class="text-center py-10">Nenhum pedido recente.</td></tr>`;
    } else {
        tb.innerHTML = pRecentes.map(p => {
            const pM = JSON.stringify(p);
            let aB = `<button onclick="window.abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Detalhes"><i class="fas fa-eye"></i></button>`;
            if (['vendedor', 'admin'].includes(getRole())) {
                aB += ` <button onclick="window.prepararEdicaoPedido(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button>`;
            }
            return `<tr><td class="pedido-numero font-medium">${p.numeroPedido}</td><td>${p.clienteNome}</td><td>${p.dataPedido?.toDate().toLocaleDateString('pt-BR') || 'N/A'}</td><td class="font-medium">R$ ${p.valorTotal.toFixed(2).replace('.', ',')}</td><td>${getStatusBadgeSimpleHTML(p)}</td><td class="text-xs space-x-1 whitespace-nowrap">${aB}</td></tr>`;
        }).join('');
    }
}


function carregarTodosPedidos() {
    const path = `artifacts/${shopInstanceAppId}/pedidos`;
    onSnapshot(query(collection(db, path)), (snap) => {
        todosOsPedidosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        atualizarDashboard();
        carregarUltimosPedidos();
        if (document.getElementById('visualizarPedidos')?.classList.contains('hidden') === false) {
            renderizarListaCompletaPedidos();
        }
    }, e => showNotification({ message: "Erro ao carregar pedidos.", type: 'error' }));
}

// **INÍCIO DA CORREÇÃO: Implementação completa das funções de formulário e ações**

async function handleSalvarNovoStatus(e) {
    e.preventDefault();
    const pedidoId = document.getElementById('pedidoIdParaMudarStatus').value;
    const novoStatus = document.getElementById('novoStatusPedido').value;
    if (!pedidoId || !novoStatus) { showNotification({ message: "Erro nos dados.", type: "error" }); return; }
    try { await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId), { status: novoStatus }); showNotification({ message: "Estado atualizado!", type: "success" }); fecharModalEspecifico('modalMudarStatusOverlay'); } catch (error) { showNotification({ message: "Erro ao atualizar.", type: "error" }); }
}

function prepararEdicaoPedido(pObj) {
    if (!pObj || !pObj.id) { showNotification({ message: "Dados do pedido inválidos.", type: "error" }); return; }
    editingOrderId = pObj.id;
    document.getElementById('editingOrderIdField').value = pObj.id;
    document.getElementById('formNovoPedido').reset();
    document.getElementById('itensPedidoContainer').innerHTML = '';
    document.getElementById('pagamentosContainer').innerHTML = '';
    itemPedidoCount = 0;
    pagamentoCount = 0;
    ['pedidoDescricaoGeral', 'pedidoClienteSearch', 'pedidoVendedor', 'pedidoStatus'].forEach(id => {
        const key = id.replace('pedido', '').toLowerCase().replace('search', 'Nome');
        document.getElementById(id).value = pObj[key] || '';
    });
    document.getElementById('pedidoClienteId').value = pObj.clienteId || "";
    const dETS = pObj.dataEntrega && typeof pObj.dataEntrega.seconds === 'number' ? new Timestamp(pObj.dataEntrega.seconds, pObj.dataEntrega.nanoseconds) : null;
    const dE = dETS?.toDate();
    if (dE) {
        document.getElementById('pedidoDataEntrega').value = dE.toISOString().split('T')[0];
        document.getElementById('pedidoHoraEntrega').value = dE.toTimeString().split(' ')[0].substring(0, 5);
    } else {
        document.getElementById('pedidoDataEntrega').value = "";
        document.getElementById('pedidoHoraEntrega').value = "";
    }
    pedidoImagemBase64 = pObj.imagemPreviewPedidoBase64 || null;
    const pI = document.getElementById('pedidoImagemPreview'), pH = document.getElementById('pedidoImagemPreviewPlaceholder');
    if (pedidoImagemBase64) { pI.src = pedidoImagemBase64; pI.classList.remove('hidden'); pH.classList.add('hidden'); } else { pI.src = "#"; pI.classList.add('hidden'); pH.classList.remove('hidden'); }
    if (pObj.itens && Array.isArray(pObj.itens)) { pObj.itens.forEach(item => window.adicionarItemPedidoForm(item)); }
    if (pObj.pagamentos && Array.isArray(pObj.pagamentos)) { pObj.pagamentos.forEach(pgto => window.adicionarPagamentoForm(pgto)); }
    window.atualizarValorTotalPedido();
    document.querySelector('#formNovoPedido button[type="submit"]').innerHTML = '<i class="fas fa-save mr-1.5"></i>Atualizar Pedido';
    mostrarSecao('novoPedido', true);
}

function abrirDetalhesPedidoNovaGuia(pedido) {
    const formatDateTime = (tsObj) => {
        if (!tsObj || typeof tsObj.seconds !== 'number') return 'N/A';
        return new Date(tsObj.seconds * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const podeMarcarImpressao = ['admin', 'designer', 'impressor'].includes(getRole());
    const podeMarcarAcabamento = ['admin', 'designer', 'producao'].includes(getRole());
    const dataPedidoTexto = formatDateTime(pedido.dataPedido);
    let dataEntregaFormatada = formatDateTime(pedido.dataEntrega);
    let entregaHtml = (pedido.entreguePorNome && pedido.entregueEm) ? `<p><strong>Entrega confirmada por:</strong> ${pedido.entreguePorNome} em ${formatDateTime(pedido.entregueEm)}</p>` : '';
    let descricaoGeralHtml = pedido.descricaoGeral ? `<div class="section-title">Descrição Geral</div><p><strong>${pedido.descricaoGeral.replace(/\n/g, '<br>')}</strong></p>` : '';

    let itensHtml = pedido.itens?.map((item, index) => {
        const itemDesc = item.descricao ? `<br><small style="color: #555; padding-left: 15px;">&hookrightarrow; ${item.descricao}</small>` : '';
        const dimensoes = item.tipoProduto === 'metro' && item.largura && item.altura ? ` (${item.largura.toFixed(2)}m x ${item.altura.toFixed(2)}m)` : '';
        const steps = item.productionSteps || { impressao: {}, acabamento: {} };
        const impressaoInfo = steps.impressao?.concluido ? `<span class="info-icon" title="Por: ${steps.impressao.concluidoPor || 'N/A'} em ${formatDateTime(steps.impressao.concluidoEm) || 'N/A'}">ⓘ</span>` : '';
        const acabamentoInfo = steps.acabamento?.concluido ? `<span class="info-icon" title="Por: ${steps.acabamento.concluidoPor || 'N/A'} em ${formatDateTime(steps.acabamento.concluidoEm) || 'N/A'}">ⓘ</span>` : '';
        return `<li><div class="item-details">${item.quantidade}x ${item.produtoNome}${dimensoes} - R$ ${item.valorItem.toFixed(2).replace('.', ',')}${itemDesc}</div><div class="production-steps"><span class="step"><input type="checkbox" id="step-impressao-${pedido.id}-${index}" onchange="window.toggleItemProductionStep('${pedido.id}',${index},'impressao',this.checked)" ${steps.impressao?.concluido ? 'checked' : ''} ${!podeMarcarImpressao ? 'disabled' : ''}><label for="step-impressao-${pedido.id}-${index}" class="${!podeMarcarImpressao ? 'disabled-label' : ''}">Impressão</label>${impressaoInfo}</span><span class="step"><input type="checkbox" id="step-acabamento-${pedido.id}-${index}" onchange="window.toggleItemProductionStep('${pedido.id}',${index},'acabamento',this.checked)" ${steps.acabamento?.concluido ? 'checked' : ''} ${!podeMarcarAcabamento ? 'disabled' : ''}><label for="step-acabamento-${pedido.id}-${index}" class="${!podeMarcarAcabamento ? 'disabled-label' : ''}">Acabamento</label>${acabamentoInfo}</span></div></li>`;
    }).join('') || '<li>Nenhum item.</li>';

    let totalPagoCalculado = pedido.pagamentos?.reduce((acc, pgto) => acc + pgto.valorPago, 0) || 0;
    let pagamentosHtml = pedido.pagamentos?.length > 0 ? '<ul>' + pedido.pagamentos.map(pgto => `<li>${pgto.forma}: R$ ${pgto.valorPago.toFixed(2).replace('.', ',')} ${pgto.observacao ? '(' + pgto.observacao + ')' : ''} - Data: ${formatDateTime(pgto.dataPagamento)}</li>`).join('') + '</ul>' : '<p>Nenhum pagamento registado.</p>';
    const valorRestanteCalculado = (pedido.valorTotal || 0) - totalPagoCalculado;
    const restanteHtml = valorRestanteCalculado > 0.01 ? `<p style="color:red"><strong>Restante:</strong> R$ ${valorRestanteCalculado.toFixed(2).replace('.', ',')}</p>` : '<p style="color:green"><strong>Quitado</strong></p>';

    const conteudoHtml = `<html><head><title>Pedido: ${pedido.numeroPedido || 'N/A'}</title><style>body{font-family:'Poppins',Arial,sans-serif;margin:20px;background-color:#f1f5f9;color:#334155;font-size:14px}:root{--color-primary:#0ea5e9;--color-text-main:#334155;--color-text-heading:#1e293b;--color-text-muted:#64748b;--color-border-soft:#e2e8f0;--color-border-medium:#cbd5e1;--shadow-lg:0 10px 15px -3px rgb(0 0 0 / 0.07),0 4px 6px -4px rgb(0 0 0 / 0.07)}.container{max-width:700px;margin:auto;background-color:#fff;padding:25px;border-radius:12px;box-shadow:var(--shadow-lg);border:1px solid var(--color-border-soft)}.company-header{display:flex;align-items:center;margin-bottom:25px;padding-bottom:15px;border-bottom:1px solid var(--color-border-soft)}.company-header img{max-height:50px;margin-right:20px}.company-header .company-info p{margin:2px 0;font-size:.9em;color:var(--color-text-muted)}.company-header .company-info strong{color:var(--color-text-heading);font-weight:600}h1{text-align:center;color:var(--color-primary);border-bottom:2px solid var(--color-primary);padding-bottom:10px;margin-bottom:25px;font-size:1.6em;font-weight:600}.section-title{font-size:1.15em;font-weight:600;color:var(--color-text-heading);margin-top:25px;margin-bottom:10px;border-bottom:1px solid var(--color-border-medium);padding-bottom:6px}p{margin-bottom:8px;line-height:1.65}strong{font-weight:500;color:var(--color-text-main)}ul{list-style:none;margin-left:0;padding-left:5px}li{margin-bottom:12px;display:flex;flex-wrap:wrap;align-items:flex-start;padding-bottom:8px;border-bottom:1px dashed #e2e8f0}.item-details{flex-grow:1;margin-bottom:5px;width:100%}.production-steps{display:flex;gap:20px;padding-left:15px;width:100%}.production-steps .step{display:flex;align-items:center;gap:5px}.production-steps .step label{cursor:pointer;font-size:.9em}.production-steps .step input[type=checkbox]:disabled + label{cursor:not-allowed;color:#9ca3af;}.info-icon{margin-left:5px;font-weight:bold;color:#64748b;cursor:help;font-size:1.1em}.total-section{margin-top:30px;padding-top:20px;border-top:2px solid var(--color-primary);text-align:right}.total-section p{font-size:1.25em;font-weight:600;color:var(--color-primary)}.payment-summary p{font-size:1.05em;margin-bottom:4px;text-align:right}.payment-summary strong{font-weight:600}.print-button-container{text-align:center;margin-top:30px}.print-button{background-color:var(--color-primary);color:white;padding:12px 24px;border:none;border-radius:8px;font-size:1em;cursor:pointer;transition:background-color .2s}.print-button:hover{background-color:#0284c7}.footer-note{font-size:.85em;color:var(--color-text-muted);text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid var(--color-border-soft)}img.pedido-preview-print{max-width:100%;max-height:280px;display:block;margin:20px auto;border:1px solid var(--color-border-medium);border-radius:8px;page-break-inside:avoid;object-fit:contain}@media print{body{margin:0;padding:0;background-color:#fff;color:#000;font-size:10pt;--color-primary:#0ea5e9;--color-text-main:#000}.container{margin:0;padding:10mm;box-shadow:none;border-radius:0;border:none;width:100%;max-width:100%}.print-button-container{display:none}h1{color:var(--color-primary)!important;border-color:var(--color-primary)!important}}</style></head><body><div class="container"><div class="company-header"><img src="https://placehold.co/150x50/0ea5e9/FFFFFF?text=SuaGrafica&font=poppins" alt="Logo da Gráfica"><div class="company-info"><p><strong>Empresa:</strong> Gráfica Exemplo</p><p><strong>CNPJ:</strong> 00.000.000/0001-00</p><p><strong>Endereço:</strong> Rua Exemplo, 123, Cidade</p><p><strong>Telefone:</strong> (00) 0000-0000</p><p><strong>Email:</strong> contato@suagrafica.com</p></div></div><h1>Pedido: ${pedido.numeroPedido || 'N/A'}</h1><div class="section-title">Cliente</div><p><strong>Nome:</strong> ${pedido.clienteNome || 'N/A'}</p><div class="section-title">Pedido</div><p><strong>Número:</strong> ${pedido.numeroPedido || 'N/A'}</p><p><strong>Data:</strong> ${dataPedidoTexto}</p><p><strong>Entrega Prevista:</strong> ${dataEntregaFormatada}</p><p><strong>Vendedor:</strong> ${pedido.vendedorNome || 'N/A'}</p><p><strong>Estado Atual:</strong> ${pedido.status || 'N/A'}</p>${entregaHtml}<div class="section-title">Pagamentos</div>${pagamentosHtml}<div class="section-title">Itens</div><ul>${itensHtml}</ul>${descricaoGeralHtml}${pedido.imagemPreviewPedidoBase64 ? `<div class="section-title">Preview</div><img class="pedido-preview-print" src="${pedido.imagemPreviewPedidoBase64}" alt="Preview" />` : ''}<div class="payment-summary total-section"><p><strong>Total Pedido:</strong> R$ ${pedido.valorTotal?.toFixed(2).replace('.', ',') || '0,00'}</p><p><strong>Total Pago:</strong> R$ ${totalPagoCalculado.toFixed(2).replace('.', ',')}</p>${restanteHtml}</div><div class="print-button-container"><button class="print-button" onclick="window.print()">Imprimir</button></div><p class="footer-note">Gerado em: ${new Date().toLocaleString('pt-BR')}</p></div></body></html>`;
    const newTab = window.open('', `Pedido: ${pedido.numeroPedido || 'detalhes'}`); 
    if (newTab) { newTab.document.write(conteudoHtml); newTab.document.close(); } 
    else { showNotification({ message: "Bloqueador de pop-up impediu a abertura da guia.", type: "warning" }); } 
}

async function marcarComoEntregue(pedidoId) {
    if (!getUserId() || !pedidoId) { showNotification({ message: "Ação inválida.", type: "error" }); return; }
    const dadosUpdate = { status: 'Entregue', entreguePorNome: getUserName(), entreguePorId: getUserId(), entregueEm: Timestamp.now() };
    try { await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId), dadosUpdate); showNotification({ message: "Pedido marcado como Entregue!", type: "success" }); } catch (error) { showNotification({ message: "Erro ao atualizar o pedido.", type: "error" }); }
}

function excluirPedido(pedidoId, numeroPedido) {
    showNotification({
        message: `Tem a certeza que deseja excluir o pedido ${numeroPedido}?`,
        type: 'confirm-delete',
        onConfirm: async () => {
            try { await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId)); showNotification({ message: 'Pedido excluído!', type: 'success' }); } catch (error) { showNotification({ message: 'Erro ao excluir.', type: 'error' }); }
        }
    });
}

async function toggleItemProductionStep(pedidoId, itemIndex, stepName, isChecked) {
    if (!getUserId()) { showNotification({ message: "Sem permissão.", type: "error" }); return; }
    const pedidoDocRef = doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId);
    const pedidoParaAtualizar = todosOsPedidosCache.find(p => p.id === pedidoId);
    if (pedidoParaAtualizar?.itens[itemIndex] != null) {
        const novosItens = [...pedidoParaAtualizar.itens];
        const item = novosItens[itemIndex];
        if (!item.productionSteps) item.productionSteps = { impressao: {}, acabamento: {} };
        item.productionSteps[stepName] = { concluido: isChecked, concluidoPor: getUserName(), concluidoEm: Timestamp.now() };
        try { await updateDoc(pedidoDocRef, { itens: novosItens }); showNotification({ message: `Etapa '${stepName}' atualizada.`, type: 'success', duration: 2000 }); } catch (error) { showNotification({ message: "Erro ao atualizar a etapa.", type: "error" }); }
    } else { showNotification({ message: "Pedido ou item não encontrado.", type: "error" }); }
}

// ... (Restantes funções de manipulação de formulário) ...

export function init(deps) {
    getRole = deps.getRole;
    getUserName = deps.getUserName;
    getUserId = deps.getUserId;
    getClientes = deps.getClientes;
    getProdutos = deps.getProdutos;
    mostrarSecao = deps.mostrarSecao;
    setActiveMenuLink = deps.setActiveMenuLink;
    atualizarDashboard = deps.atualizarDashboard;

    carregarTodosPedidos();

    const filtros = ['filtroNomeCliente', 'filtroNumeroPedido', 'filtroMaterialProduto'];
    filtros.forEach(id => document.getElementById(id)?.addEventListener('input', renderizarListaCompletaPedidos));
    const selects = ['filtroDataPedido', 'filtroStatusPedido', 'filtroClassificacaoPedido', 'filtroVendedor'];
    selects.forEach(id => document.getElementById(id)?.addEventListener('change', renderizarListaCompletaPedidos));
    document.getElementById('limparFiltrosPedidos')?.addEventListener('click', () => {
        filtros.concat(selects).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        document.getElementById('filtroClassificacaoPedido').value = 'dataPedido_desc';
        renderizarListaCompletaPedidos(); 
    });
    
    document.getElementById('formMudarStatus')?.addEventListener('submit', handleSalvarNovoStatus);

    // Anexa as funções ao objeto window
    window.prepararEdicaoPedido = prepararEdicaoPedido;
    window.abrirDetalhesPedidoNovaGuia = abrirDetalhesPedidoNovaGuia;
    window.marcarComoEntregue = marcarComoEntregue;
    window.excluirPedido = excluirPedido;
    window.toggleItemProductionStep = toggleItemProductionStep;
    window.abrirModalMudarStatus = (id, num, cli, stat) => {
        document.getElementById('pedidoIdParaMudarStatus').value = id;
        document.getElementById('infoPedidoParaMudarStatus').innerHTML = `<strong>Pedido:</strong> ${num}<br><strong>Cliente:</strong> ${cli}`;
        document.getElementById('novoStatusPedido').value = stat;
        abrirModalEspecifico('modalMudarStatusOverlay');
    };
    window.fecharModalMudarStatus = () => fecharModalEspecifico('modalMudarStatusOverlay');
    window.adicionarItemPedidoForm = adicionarItemPedidoForm;
    window.removerItemPedidoForm = removerItemPedidoForm;
    window.toggleCamposProduto = toggleCamposProduto;
    window.calcularValorItem = calcularValorItem;
    window.atualizarValorTotalPedido = atualizarValorTotalPedido;
    window.adicionarPagamentoForm = adicionarPagamentoForm;
    window.removerPagamentoForm = removerPagamentoForm;
    window.calcularTotaisPagamento = calcularTotaisPagamento;
    window.handleImagemFilePedido = handleImagemFilePedido;
}

export const getPedidos = () => todosOsPedidosCache;
