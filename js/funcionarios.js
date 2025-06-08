// js/funcionarios.js
import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

let funcionariosCache = [];
let getRole = () => null;

function createFuncionarioListItem(funcionario) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center';
    
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `<strong>${funcionario.nome}</strong><span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle ml-1">${funcionario.cargo || 'N/A'}</span><div class="meta">Contacto: ${funcionario.contato || 'N/A'}</div>`;
    itemDiv.appendChild(infoDiv);

    if (getRole() === 'admin') {
        const adminBtns = document.createElement('div');
        adminBtns.className = 'flex items-center space-x-1';
        adminBtns.innerHTML = `<button onclick="window.abrirModalEditarFuncionario('${funcionario.id}')" class="btn-icon-action" title="Editar"><i class="fas fa-user-edit"></i></button><button onclick="window.excluirFuncionario('${funcionario.id}', '${funcionario.nome.replace(/'/g, "\\'")}')" class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir"><i class="fas fa-user-times"></i></button>`;
        itemDiv.appendChild(adminBtns);
    }
    
    return itemDiv;
}

function carregarFuncionarios() {
    // ... (código existente)
}

async function handleCadastroFuncionario(e) {
    // ... (código existente)
}

function abrirModalEditarFuncionario(funcId) {
    const f = funcionariosCache.find(func => func.id === funcId);
    if (!f) return;
    document.getElementById('funcionarioIdParaEditar').value = f.id;
    document.getElementById('funcionarioNomeEditar').value = f.nome;
    document.getElementById('funcionarioContatoEditar').value = f.contato;
    document.getElementById('funcionarioCargoEditar').value = f.cargo;
    document.getElementById('funcionarioCodigoAcessoEditar').value = f.codigoAcesso;
    abrirModalEspecifico('modalEditarFuncionarioOverlay');
}

async function handleSalvarEdicaoFuncionario(e) {
    // ... (código existente)
}

function excluirFuncionario(id, nome) {
    // ... (código existente)
}

export async function init(deps) {
    getRole = deps.getRole;
    
    // ... (código existente)

    // **CORREÇÃO: Expor funções para o escopo global**
    window.abrirModalEditarFuncionario = abrirModalEditarFuncionario;
    window.excluirFuncionario = excluirFuncionario;
    window.fecharModalEditarFuncionario = () => fecharModalEspecifico('modalEditarFuncionarioOverlay');
}
