// js/produtos.js
import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

let produtosCache = [];
let getRole = () => null;

function createProductListItem(produto) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center';
    
    const infoDiv = document.createElement('div');
    const preco = produto.tipoPreco === 'metro' 
        ? `R$ ${(produto.precoMetro || 0).toFixed(2).replace('.', ',')}/m²` 
        : `R$ ${(produto.precoUnidade || 0).toFixed(2).replace('.', ',')}/un`;
    infoDiv.innerHTML = `<strong>${produto.nome}</strong><div class="meta">${preco}</div>`;
    itemDiv.appendChild(infoDiv);

    if (getRole() === 'admin') {
        const adminBtns = document.createElement('div');
        adminBtns.className = 'flex items-center space-x-1';
        adminBtns.innerHTML = `<button onclick="window.abrirModalEditarProduto('${produto.id}')" class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button><button onclick="window.excluirProduto('${produto.id}', '${produto.nome.replace(/'/g, "\\'")}')" class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir"><i class="fas fa-trash"></i></button>`;
        itemDiv.appendChild(adminBtns);
    }
    
    return itemDiv;
}

function carregarProdutos() {
    const path = `artifacts/${shopInstanceAppId}/produtos`;
    onSnapshot(query(collection(db, path)), (snap) => {
        const listaEl = document.getElementById('listaProdutos');
        produtosCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        
        if (listaEl) {
            listaEl.innerHTML = '';
            if (produtosCache.length > 0) {
                produtosCache.forEach(p => listaEl.appendChild(createProductListItem(p)));
            } else {
                listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum produto registado.</p>';
            }
        }
    }, e => {
        console.error("Erro ao carregar produtos:", e);
        showNotification({ message: "Erro ao carregar produtos.", type: 'error' });
    });
}

async function handleCadastroProduto(e) {
    e.preventDefault();
    // ... (código existente)
}

function abrirModalEditarProduto(produtoId) {
    const p = produtosCache.find(prod => prod.id === produtoId);
    if (!p) return;
    document.getElementById('produtoIdParaEditar').value = p.id;
    document.getElementById('produtoNomeEditar').value = p.nome;
    document.getElementById('produtoDescricaoEditar').value = p.descricao;
    document.getElementById('produtoTipoPrecoEditar').value = p.tipoPreco;
    togglePrecoFieldsEditar();
    document.getElementById('produtoPrecoUnidadeEditar').value = p.precoUnidade;
    document.getElementById('produtoPrecoMetroEditar').value = p.precoMetro;
    abrirModalEspecifico('modalEditarProdutoOverlay');
}

async function handleSalvarEdicaoProduto(e) {
    // ... (código existente)
}

function excluirProduto(id, nome) {
    // ... (código existente)
}

function togglePrecoFields() {
    const t = document.getElementById('produtoTipoPreco')?.value;
    document.getElementById('precoUnidadeFields').classList.toggle('hidden', t === 'metro');
    document.getElementById('precoMetroFields').classList.toggle('hidden', t === 'unidade');
}

function togglePrecoFieldsEditar() {
    const t = document.getElementById('produtoTipoPrecoEditar')?.value;
    document.getElementById('precoUnidadeFieldsEditar').classList.toggle('hidden', t === 'metro');
    document.getElementById('precoMetroFieldsEditar').classList.toggle('hidden', t === 'unidade');
}

export function init(deps) {
    getRole = deps.getRole;
    
    carregarProdutos();

    document.getElementById('formCadastrarProduto')?.addEventListener('submit', handleCadastroProduto);
    document.getElementById('formEditarProduto')?.addEventListener('submit', handleSalvarEdicaoProduto);
    document.getElementById('produtoTipoPreco')?.addEventListener('change', togglePrecoFields);
    document.getElementById('produtoTipoPrecoEditar')?.addEventListener('change', togglePrecoFieldsEditar);

    // **CORREÇÃO: Expor funções para o escopo global**
    window.abrirModalEditarProduto = abrirModalEditarProduto;
    window.excluirProduto = excluirProduto;
    window.togglePrecoFields = togglePrecoFields;
    window.togglePrecoFieldsEditar = togglePrecoFieldsEditar;
    window.fecharModalEditarProduto = () => fecharModalEspecifico('modalEditarProdutoOverlay');
}

export const getProdutos = () => produtosCache;
