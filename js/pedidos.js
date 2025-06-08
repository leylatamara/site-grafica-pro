// js/pedidos.js

/**
 * Módulo de Pedidos
 * Gere todas as operações e a lógica de UI para os pedidos.
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

// **INÍCIO DA CORREÇÃO DAS FUNÇÕES**

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
    const formatDateTime = (ts) => ts ? new Date(ts.seconds * 1000).toLocaleString('pt-BR') : 'N/A';
    let itensHtml = pedido.itens?.map(item => `<li>...</li>`).join('') || '<li>Nenhum item.</li>';
    const conteudoHtml = `...`; // A lógica completa da string HTML vai aqui
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

    window.prepararEdicaoPedido = prepararEdicaoPedido;
    window.abrirDetalhesPedidoNovaGuia = abrirDetalhesPedidoNovaGuia;
    window.marcarComoEntregue = marcarComoEntregue;
    window.excluirPedido = excluirPedido;
    window.abrirModalMudarStatus = (id, num, cli, stat) => {
        document.getElementById('pedidoIdParaMudarStatus').value = id;
        document.getElementById('infoPedidoParaMudarStatus').innerHTML = `<strong>Pedido:</strong> ${num}<br><strong>Cliente:</strong> ${cli}`;
        document.getElementById('novoStatusPedido').value = stat;
        abrirModalEspecifico('modalMudarStatusOverlay');
    };
    window.fecharModalMudarStatus = () => fecharModalEspecifico('modalMudarStatusOverlay');
}

export const getPedidos = () => todosOsPedidosCache;
