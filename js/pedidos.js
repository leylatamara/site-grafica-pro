// js/pedidos.js

/**
 * Módulo de Pedidos
 * Gere todas as operações e a lógica de UI para os pedidos.
 */

import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp, setDoc, where, orderBy } from './firebase-config.js';
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
    const pedidosRef = collection(db, `artifacts/${shopInstanceAppId}/pedidos`);
    const q = query(pedidosRef, orderBy('dataPedido', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        todosOsPedidosCache = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dataPedido: doc.data().dataPedido,
            dataEntrega: doc.data().dataEntrega
        }));
        
        if (onUpdate) onUpdate();
    });
}

/**
 * Calcula o valor total de um pedido
 */
function calcularValorTotalPedido(itens) {
    return itens.reduce((total, item) => {
        const valorItem = calcularValorItem(item);
        return total + valorItem;
    }, 0);
}

/**
 * Calcula o valor de um item do pedido
 */
function calcularValorItem(item) {
    if (!item.quantidade || !item.produtoPreco) return 0;
    
    let valorBase = item.quantidade * item.produtoPreco;
    
    // Aplicar desconto se houver
    if (item.desconto) {
        valorBase = valorBase * (1 - (item.desconto / 100));
    }
    
    // Aplicar acréscimo se houver
    if (item.acrescimo) {
        valorBase = valorBase * (1 + (item.acrescimo / 100));
    }
    
    return valorBase;
}

/**
 * Valida os dados do pedido antes de salvar
 */
function validarPedido(dados) {
    if (!dados.clienteId || !dados.clienteNome) {
        throw new Error('Cliente é obrigatório');
    }
    
    if (!dados.itens || dados.itens.length === 0) {
        throw new Error('Pedido deve ter pelo menos um item');
    }
    
    if (!dados.dataEntrega) {
        throw new Error('Data de entrega é obrigatória');
    }
    
    // Validar data de entrega
    const dataEntrega = new Date(dados.dataEntrega);
    const hoje = new Date();
    if (dataEntrega < hoje) {
        throw new Error('Data de entrega não pode ser anterior a hoje');
    }
    
    // Validar itens
    dados.itens.forEach((item, index) => {
        if (!item.produtoId || !item.produtoNome) {
            throw new Error(`Item ${index + 1}: Produto é obrigatório`);
        }
        if (!item.quantidade || item.quantidade <= 0) {
            throw new Error(`Item ${index + 1}: Quantidade inválida`);
        }
    });
    
    // Validar pagamentos
    if (dados.pagamentos && dados.pagamentos.length > 0) {
        const totalPago = dados.pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0);
        const valorTotal = calcularValorTotalPedido(dados.itens);
        
        if (totalPago > valorTotal) {
            throw new Error('Valor total pago não pode ser maior que o valor do pedido');
        }
    }
    
    return true;
}

/**
 * Salva um novo pedido ou atualiza um existente
 */
async function salvarPedido(dados) {
    try {
        validarPedido(dados);
        
        const pedidoData = {
            ...dados,
            dataPedido: Timestamp.now(),
            valorTotal: calcularValorTotalPedido(dados.itens),
            vendedorId: getUserId(),
            vendedorNome: getUserName(),
            status: dados.status || 'Aguardando Aprovação',
            ultimaAtualizacao: Timestamp.now()
        };
        
        if (editingOrderId) {
            await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, editingOrderId), pedidoData);
            showNotification({
                message: 'Pedido atualizado com sucesso!',
                type: 'success'
            });
        } else {
            await addDoc(collection(db, `artifacts/${shopInstanceAppId}/pedidos`), pedidoData);
            showNotification({
                message: 'Pedido criado com sucesso!',
                type: 'success'
            });
        }
        
        // Limpar estado
        editingOrderId = null;
        pedidoImagemBase64 = null;
        
        // Atualizar interface
        mostrarSecao('telaInicial', true);
        atualizarDashboard();
        
    } catch (error) {
        console.error('Erro ao salvar pedido:', error);
        showNotification({
            message: error.message || 'Erro ao salvar pedido',
            type: 'error'
        });
    }
}

/**
 * Atualiza o status de um pedido
 */
async function atualizarStatusPedido(pedidoId, novoStatus) {
    try {
        const pedidoRef = doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId);
        await updateDoc(pedidoRef, {
            status: novoStatus,
            ultimaAtualizacao: Timestamp.now()
        });
        
        showNotification({
            message: 'Status atualizado com sucesso!',
            type: 'success'
        });
        
        atualizarDashboard();
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showNotification({
            message: 'Erro ao atualizar status do pedido',
            type: 'error'
        });
    }
}

/**
 * Exclui um pedido
 */
async function excluirPedido(pedidoId) {
    try {
        await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId));
        
        showNotification({
            message: 'Pedido excluído com sucesso!',
            type: 'success'
        });
        
        atualizarDashboard();
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        showNotification({
            message: 'Erro ao excluir pedido',
            type: 'error'
        });
    }
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

    // Configurar listeners de eventos
    document.getElementById('formNovoPedido')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const dados = {
            clienteId: formData.get('pedidoClienteId'),
            clienteNome: formData.get('pedidoClienteNome'),
            itens: coletarItensPedido(),
            pagamentos: coletarPagamentos(),
            dataEntrega: formData.get('pedidoDataEntrega'),
            horaEntrega: formData.get('pedidoHoraEntrega'),
            status: formData.get('pedidoStatus'),
            descricaoGeral: formData.get('pedidoDescricaoGeral'),
            imagemPreview: pedidoImagemBase64
        };
        
        await salvarPedido(dados);
    });

    // Anexar funções ao objeto window
    window.prepararEdicaoPedido = prepararEdicaoPedido;
    window.abrirDetalhesPedidoNovaGuia = abrirDetalhesPedidoNovaGuia;
    window.marcarComoEntregue = marcarComoEntregue;
    window.excluirPedido = excluirPedido;
    window.abrirModalMudarStatus = abrirModalMudarStatus;
    window.fecharModalMudarStatus = () => fecharModalEspecifico('modalMudarStatusOverlay');
    window.adicionarItemPedidoForm = adicionarItemPedidoForm;
    window.removerItemPedido = removerItemPedido;
    window.calcularValorItem = calcularValorItem;
    window.adicionarPagamentoForm = adicionarPagamentoForm;
    window.removerPagamento = removerPagamento;
    window.atualizarTotaisPedido = atualizarTotaisPedido;
}

export const getPedidos = () => todosOsPedidosCache;
