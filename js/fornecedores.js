// js/fornecedores.js
import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

let fornecedoresCache = [];
let getRole = () => null;

function createFornecedorListItem(fornecedor) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center';
    
    const infoDiv = document.createElement('div');
    const contatoDisplay = fornecedor.contato?.includes('@') 
        ? `<a href="mailto:${fornecedor.contato}" class="text-sky-400 hover:underline">${fornecedor.contato}</a>` 
        : (fornecedor.contato || 'N/A');
    infoDiv.innerHTML = `<strong>${fornecedor.nome}</strong><div class="meta">Material: ${fornecedor.tipoMaterial || 'N/A'}</div><div class="meta">Contacto: ${contatoDisplay}</div>`;
    itemDiv.appendChild(infoDiv);

    if (getRole() === 'admin') {
        const adminBtns = document.createElement('div');
        adminBtns.className = 'flex items-center space-x-1';
        adminBtns.innerHTML = `<button onclick="window.abrirModalEditarFornecedor('${fornecedor.id}')" class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button><button onclick="window.excluirFornecedor('${fornecedor.id}', '${fornecedor.nome.replace(/'/g, "\\'")}')" class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir"><i class="fas fa-trash"></i></button>`;
        itemDiv.appendChild(adminBtns);
    }
    
    return itemDiv;
}

function carregarFornecedores() {
    // ... (código existente)
}

async function handleCadastroFornecedor(e) {
    // ... (código existente)
}

function abrirModalEditarFornecedor(fornId) {
    const f = fornecedoresCache.find(forn => forn.id === fornId);
    if (!f) return;
    document.getElementById('fornecedorIdParaEditar').value = f.id;
    document.getElementById('fornecedorNomeEditar').value = f.nome;
    document.getElementById('fornecedorContatoEditar').value = f.contato;
    document.getElementById('fornecedorMaterialEditar').value = f.tipoMaterial;
    abrirModalEspecifico('modalEditarFornecedorOverlay');
}

async function handleSalvarEdicaoFornecedor(e) {
    // ... (código existente)
}

function excluirFornecedor(id, nome) {
    // ... (código existente)
}

export async function init(deps) {
    getRole = deps.getRole;
    
    // ... (código existente)

    // **CORREÇÃO: Expor funções para o escopo global**
    window.abrirModalEditarFornecedor = abrirModalEditarFornecedor;
    window.excluirFornecedor = excluirFornecedor;
    window.fecharModalEditarFornecedor = () => fecharModalEspecifico('modalEditarFornecedorOverlay');
}
