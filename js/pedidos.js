// js/pedidos.js
import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp, setDoc } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

// ... (todo o código existente do pedidos.js)

export function init(deps) {
    // ... (código de inicialização existente)

    // **CORREÇÃO: Expor funções para o escopo global**
    window.prepararEdicaoPedido = (p) => { /* ... */ };
    window.abrirDetalhesPedidoNovaGuia = (p) => { /* ... */ };
    window.marcarComoEntregue = (id) => { /* ... */ };
    window.excluirPedido = (id, nome) => { /* ... */ };
    window.abrirModalMudarStatus = (id, num, cli, stat) => { /* ... */ };
    window.fecharModalMudarStatus = () => fecharModalEspecifico('modalMudarStatusOverlay');
    window.adicionarItemPedidoForm = () => { /* ... */ };
    window.removerItemPedidoForm = (id) => { /* ... */ };
    window.toggleCamposProduto = (id) => { /* ... */ };
    window.calcularValorItem = (id) => { /* ... */ };
    window.adicionarPagamentoForm = () => { /* ... */ };
    window.removerPagamentoForm = (id) => { /* ... */ };
    window.calcularTotaisPagamento = () => { /* ... */ };
    window.handleImagemFilePedido = (ev) => { /* ... */ };
}

// ... (resto do código do pedidos.js)
