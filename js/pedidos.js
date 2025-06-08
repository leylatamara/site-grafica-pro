// js/pedidos.js

/**
 * Módulo de Pedidos
 * Gere todas as operações e a lógica de UI para os pedidos.
 */

import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp, setDoc } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

// Estado interno do módulo
let todosOsPedidosCache = [];
let itemPedidoCount = 0;
let pagamentoCount = 0;
let pedidoImagemBase64 = null;
let editingOrderId = null;

// Dependências externas (injetadas)
let getRole = () => null;
let getUserName = () => null;
let getUserId = () => null;
let getClientes = () => [];
let getProdutos = () => [];
let mostrarSecao = () => {};
let setActiveMenuLink = () => {};
let atualizarDashboard = () => {};


// --- RENDERIZAÇÃO E ATUALIZAÇÃO DA UI ---

/**
 * Retorna o HTML para um badge de estado de pedido.
 * @param {object} pedido - O objeto do pedido.
 * @returns {string} HTML do badge.
 */
function getStatusBadgeSimpleHTML(pedido) {
    const s = pedido.status;
    let c = 'neutral';
    if (s === 'Entregue') c = 'success';
    else if (s === 'Cancelado') c = 'danger';
    else if (s === 'Pronto para Retirada') c = 'primary';
    else if (s?.startsWith('Em Produção') || s === 'Em Rota de Entrega') c = 'info';
    else if (s === 'Aguardando Aprovação') c = 'warning';
    
    return `<button type="button" class="status-badge-simple interactive-button ${c}" onclick="abrirModalMudarStatus('${pedido.id}','${(pedido.numeroPedido || '').replace(/'/g, "\\'")}', '${(pedido.clienteNome || '').replace(/'/g, "\\'")}', '${(s || '').replace(/'/g, "\\'")}')" title="Alterar estado">${s}</button>`;
}

/**
 * Renderiza a lista de pedidos na tabela principal.
 */
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
        let aB = `<button onclick="abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Detalhes"><i class="fas fa-eye"></i></button>`;
        if (['vendedor', 'admin'].includes(getRole())) {
            const bE = (p.status !== 'Entregue' && p.status !== 'Cancelado') ? `<button onclick="marcarComoEntregue('${p.id}')" class="btn-icon-action" title="Entregue">📦</button>` : '';
            aB += ` <button onclick="prepararEdicaoPedido(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button>${bE}<button onclick="excluirPedido('${p.id}','${p.numeroPedido}')" class="btn-icon-action text-red-500 hover:text-red-700" title="Excluir"><i class="fas fa-trash"></i></button>`;
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
            let aB = `<button onclick="abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Detalhes"><i class="fas fa-eye"></i></button>`;
            if (['vendedor', 'admin'].includes(getRole())) {
                aB += ` <button onclick="prepararEdicaoPedido(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button>`;
            }
            return `<tr><td class="pedido-numero font-medium">${p.numeroPedido}</td><td>${p.clienteNome}</td><td>${p.dataPedido?.toDate().toLocaleDateString('pt-BR') || 'N/A'}</td><td class="font-medium">R$ ${p.valorTotal.toFixed(2).replace('.', ',')}</td><td>${getStatusBadgeSimpleHTML(p)}</td><td class="text-xs space-x-1 whitespace-nowrap">${aB}</td></tr>`;
        }).join('');
    }
}


// --- CARREGAMENTO DE DADOS ---
function carregarTodosPedidos(onUpdate) {
    const path = `artifacts/${shopInstanceAppId}/pedidos`;
    onSnapshot(query(collection(db, path)), (snap) => {
        todosOsPedidosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (onUpdate) onUpdate();
    }, e => { 
        console.error("Erro ao carregar pedidos:", e); 
        showNotification({ message: "Erro ao carregar pedidos.", type: 'error' }); 
    });
}

// --- LÓGICA DO FORMULÁRIO DE PEDIDO ---

function popularSelectProduto(selectElement) {
    const produtos = getProdutos();
    selectElement.innerHTML = '<option value="">Selecione produto</option>' + produtos.map(p => 
        `<option value="${p.id}" data-tipo="${p.tipoPreco}" data-preco-metro="${p.precoMetro || 0}" data-preco-unidade="${p.precoUnidade || 0}">${p.nome}</option>`
    ).join('');
}

function adicionarItemPedidoForm(itemParaEditar = null) {
    itemPedidoCount++;
    const container = document.getElementById('itensPedidoContainer');
    const div = document.createElement('div');
    div.className = 'p-3.5 border rounded-lg space-y-2.5 item-pedido-form relative';
    div.id = `itemPedido-${itemPedidoCount}`;
    div.innerHTML = `
        <button type="button" onclick="removerItemPedidoForm(${itemPedidoCount})" class="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600 p-1"><i class="fas fa-times"></i></button>
        <h4 class="font-medium text-sm">Item ${itemPedidoCount}</h4>
        <div><label class="label-text text-xs">Produto:</label><select class="input-field input-field-sm produto-select" id="itemProduto-${itemPedidoCount}"></select></div>
        <div class="mt-2"><label class="label-text text-xs">Descrição do Item (Opcional):</label><input type="text" class="input-field input-field-sm item-descricao" id="itemDescricao-${itemPedidoCount}" placeholder="Ex: com laminação fosca..."></div>
        <div id="camposProdutoMetro-${itemPedidoCount}" class="hidden grid grid-cols-2 gap-3">
            <div><label class="label-text text-xs">Largura (m):</label><input type="number" step="0.01" class="input-field input-field-sm dimensoes-produto" id="itemLargura-${itemPedidoCount}"></div>
            <div><label class="label-text text-xs">Altura (m):</label><input type="number" step="0.01" class="input-field input-field-sm dimensoes-produto" id="itemAltura-${itemPedidoCount}"></div>
        </div>
        <div><label class="label-text text-xs">Qtd:</label><input type="number" value="1" min="1" class="input-field input-field-sm quantidade-produto" id="itemQuantidade-${itemPedidoCount}"></div>
        <div><label class="label-text text-xs">Valor Item:</label><input type="text" class="input-field input-field-sm valor-item-produto font-medium" id="itemValor-${itemPedidoCount}" readonly value="R$ 0,00"></div>
    `;
    container.appendChild(div);
    
    const selectProduto = div.querySelector('.produto-select');
    popularSelectProduto(selectProduto);

    // Adiciona listeners para os novos campos
    selectProduto.onchange = () => toggleCamposProduto(itemPedidoCount);
    div.querySelector(`#itemLargura-${itemPedidoCount}`).oninput = () => calcularValorItem(itemPedidoCount);
    div.querySelector(`#itemAltura-${itemPedidoCount}`).oninput = () => calcularValorItem(itemPedidoCount);
    div.querySelector(`#itemQuantidade-${itemPedidoCount}`).oninput = () => calcularValorItem(itemPedidoCount);

    if (itemParaEditar) {
        // Preenche os campos se estiver a editar um item
    }
}

// ... (Restantes funções de manipulação de formulário: removerItem, calcularValorItem, etc.)

// --- INICIALIZAÇÃO DO MÓDULO ---
export function init(deps) {
    getRole = deps.getRole;
    getUserName = deps.getUserName;
    getUserId = deps.getUserId;
    getClientes = deps.getClientes;
    getProdutos = deps.getProdutos;
    mostrarSecao = deps.mostrarSecao;
    setActiveMenuLink = deps.setActiveMenuLink;
    atualizarDashboard = deps.atualizarDashboard;
    
    carregarTodosPedidos(() => {
        atualizarDashboard();
        carregarUltimosPedidos();
        renderizarListaCompletaPedidos();
    });

    // Anexa funções ao window para serem chamadas pelo HTML
    window.prepararEdicaoPedido = (p) => { /* ... */ };
    window.abrirDetalhesPedidoNovaGuia = (p) => { /* ... */ };
    window.marcarComoEntregue = (id) => { /* ... */ };
    window.excluirPedido = (id, nome) => { /* ... */ };
    window.abrirModalMudarStatus = (id, num, cli, stat) => { /* ... */ };
    window.fecharModalMudarStatus = () => fecharModalEspecifico('modalMudarStatusOverlay');
    window.adicionarItemPedidoForm = adicionarItemPedidoForm;
}

export const getPedidos = () => todosOsPedidosCache;
