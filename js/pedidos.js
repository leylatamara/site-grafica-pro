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

// **INÍCIO DA CORREÇÃO: Implementação das funções de formulário e ações**

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
    div.innerHTML = `<button type="button" onclick="window.removerItemPedidoForm(${itemPedidoCount})" class="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600 p-1"><i class="fas fa-times"></i></button><h4 class="font-medium text-sm">Item ${itemPedidoCount}</h4><div><label class="label-text text-xs">Produto:</label><select class="input-field input-field-sm produto-select" id="itemProduto-${itemPedidoCount}"></select></div><div class="mt-2"><label class="label-text text-xs">Descrição do Item (Opcional):</label><input type="text" class="input-field input-field-sm item-descricao" id="itemDescricao-${itemPedidoCount}" placeholder="Ex: com laminação fosca..."></div><div id="camposProdutoMetro-${itemPedidoCount}" class="hidden grid grid-cols-2 gap-3"><div><label class="label-text text-xs">Largura (m):</label><input type="number" step="0.01" class="input-field input-field-sm dimensoes-produto" id="itemLargura-${itemPedidoCount}"></div><div><label class="label-text text-xs">Altura (m):</label><input type="number" step="0.01" class="input-field input-field-sm dimensoes-produto" id="itemAltura-${itemPedidoCount}"></div></div><div><label class="label-text text-xs">Qtd:</label><input type="number" value="1" min="1" class="input-field input-field-sm quantidade-produto" id="itemQuantidade-${itemPedidoCount}"></div><div><label class="label-text text-xs">Valor Item:</label><input type="text" class="input-field input-field-sm valor-item-produto font-medium" id="itemValor-${itemPedidoCount}" readonly value="R$ 0,00"></div>`;
    container.appendChild(div);
    const selectProduto = div.querySelector('.produto-select');
    popularSelectProduto(selectProduto);
    selectProduto.onchange = () => toggleCamposProduto(itemPedidoCount);
    div.querySelector(`#itemLargura-${itemPedidoCount}`).oninput = () => calcularValorItem(itemPedidoCount);
    div.querySelector(`#itemAltura-${itemPedidoCount}`).oninput = () => calcularValorItem(itemPedidoCount);
    div.querySelector(`#itemQuantidade-${itemPedidoCount}`).oninput = () => calcularValorItem(itemPedidoCount);

    if (itemParaEditar) {
        selectProduto.value = itemParaEditar.produtoId;
        selectProduto.dispatchEvent(new Event('change'));
        div.querySelector('.quantidade-produto').value = itemParaEditar.quantidade;
        div.querySelector('.item-descricao').value = itemParaEditar.descricao || '';
        if (itemParaEditar.tipoProduto === 'metro') {
            div.querySelector('.dimensoes-produto[id^="itemLargura"]').value = itemParaEditar.largura;
            div.querySelector('.dimensoes-produto[id^="itemAltura"]').value = itemParaEditar.altura;
        }
        calcularValorItem(itemPedidoCount);
    }
}

function removerItemPedidoForm(id) { document.getElementById(`itemPedido-${id}`)?.remove(); atualizarValorTotalPedido(); }
function toggleCamposProduto(id) { const s = document.getElementById(`itemProduto-${id}`); document.getElementById(`camposProdutoMetro-${id}`).classList.toggle('hidden', s.options[s.selectedIndex]?.dataset.tipo !== 'metro'); calcularValorItem(id); }
function calcularValorItem(id) {
    const s = document.getElementById(`itemProduto-${id}`), o = s.options[s.selectedIndex], vI = document.getElementById(`itemValor-${id}`);
    if (!o || !o.value) { vI.value = "R$ 0,00"; atualizarValorTotalPedido(); return; }
    const t = o.dataset.tipo, pm = parseFloat(o.dataset.precoMetro), pu = parseFloat(o.dataset.precoUnidade), q = parseInt(document.getElementById(`itemQuantidade-${id}`).value) || 1;
    let v = 0;
    if (t === 'metro') {
        const l = parseFloat(document.getElementById(`itemLargura-${id}`).value) || 0, a = parseFloat(document.getElementById(`itemAltura-${id}`).value) || 0;
        if (l > 0 && a > 0 && pm > 0) v = (l * a * pm) * q;
    } else { if (pu > 0) v = pu * q; }
    vI.value = `R$ ${v.toFixed(2).replace('.', ',')}`;
    atualizarValorTotalPedido();
}

function atualizarValorTotalPedido() {
    let tI = 0;
    document.querySelectorAll('.valor-item-produto').forEach(i => { tI += parseFloat(i.value.replace('R$ ', '').replace(',', '.')) || 0; });
    document.getElementById('pedidoValorTotal').value = `R$ ${tI.toFixed(2).replace('.', ',')}`;
    calcularTotaisPagamento();
}

function adicionarPagamentoForm(pagamentoParaEditar = null) {
    pagamentoCount++;
    const c = document.getElementById('pagamentosContainer');
    const d = document.createElement('div');
    d.className = 'grid grid-cols-1 sm:grid-cols-[2fr,1fr,auto] gap-3 items-end p-3 border rounded-lg pagamento-form-item';
    d.id = `pagamentoItem-${pagamentoCount}`;
    d.innerHTML = `<div><label class="label-text text-xs">Forma:</label><select class="input-field input-field-sm py-1.5 forma-pagamento"><option value="Dinheiro">Dinheiro</option><option value="Cartão de Crédito">Crédito</option><option value="Cartão de Débito">Débito</option><option value="PIX">PIX</option><option value="Boleto">Boleto</option><option value="Pendente">Pendente</option></select></div><div><label class="label-text text-xs">Valor (R$):</label><input type="number" step="0.01" class="input-field input-field-sm py-1.5 valor-pago" placeholder="0,00"></div><button type="button" onclick="window.removerPagamentoForm(${pagamentoCount})" class="btn btn-danger btn-small text-xs py-1.5 px-2 h-8"><i class="fas fa-trash"></i></button><div class="sm:col-span-3"><label class="label-text text-xs">Obs:</label><input type="text" class="input-field input-field-sm py-1.5 observacao-pagamento" placeholder="Ex: Entrada..."></div>`;
    d.querySelector('.valor-pago').oninput = () => calcularTotaisPagamento();
    c.appendChild(d);
    if (pagamentoParaEditar) {
        d.querySelector('.forma-pagamento').value = pagamentoParaEditar.forma;
        d.querySelector('.valor-pago').value = pagamentoParaEditar.valorPago;
        d.querySelector('.observacao-pagamento').value = pagamentoParaEditar.observacao || "";
    }
    calcularTotaisPagamento();
}

function removerPagamentoForm(id) { document.getElementById(`pagamentoItem-${id}`)?.remove(); calcularTotaisPagamento(); }
function calcularTotaisPagamento() {
    let tP = 0;
    document.querySelectorAll('.pagamento-form-item .valor-pago').forEach(i => { tP += parseFloat(i.value) || 0; });
    document.getElementById('pedidoTotalPago').value = `R$ ${tP.toFixed(2).replace('.', ',')}`;
    const vT = parseFloat(document.getElementById('pedidoValorTotal').value.replace('R$ ', '').replace(',', '.')) || 0;
    document.getElementById('pedidoValorRestante').value = `R$ ${(vT - tP).toFixed(2).replace('.', ',')}`;
}

async function processImageFilePedido(file) {
    const pI = document.getElementById('pedidoImagemPreview'), pH = document.getElementById('pedidoImagemPreviewPlaceholder');
    if (file?.type.startsWith('image/')) {
        try {
            const resizedBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = e => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height; if (w > h) { if (w > 800) { h *= 800 / w; w = 800; } } else { if (h > 800) { w *= 800 / h; h = 800; } } const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; canvas.getContext('2d').drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; img.onerror = reject; img.src = e.target.result; }; reader.onerror = reject; reader.readAsDataURL(file); });
            pedidoImagemBase64 = resizedBase64;
            if (pI && pH) { pI.src = resizedBase64; pI.classList.remove('hidden'); pH.classList.add('hidden'); }
        } catch (error) { console.error("Erro imagem:", error); showNotification({ message: "Não foi possível processar a imagem.", type: "error" }); pedidoImagemBase64 = null; if (pI && pH) { pI.src = "#"; pI.classList.add('hidden'); pH.classList.remove('hidden'); } }
    } else { pedidoImagemBase64 = null; if (pI && pH) { pI.src = "#"; pI.classList.add('hidden'); pH.classList.remove('hidden'); } if (file) showNotification({ message: "Arquivo de imagem inválido.", type: "warning" }); }
}
function handleImagemFilePedido(ev) { processImageFilePedido(ev.target.files[0]); ev.target.value = null; }
function handlePasteImagePedido(ev) { ev.preventDefault(); const items = (ev.clipboardData || window.clipboardData).items; for (const item of items) if (item.kind === 'file' && item.type.startsWith('image/')) { processImageFilePedido(item.getAsFile()); break; } }


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
    const conteudoHtml = `...`;
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
