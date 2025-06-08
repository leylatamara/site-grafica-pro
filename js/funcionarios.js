// js/funcionarios.js

/**
 * Módulo de Funcionários
 * Gere todas as operações CRUD e a lógica de UI para os funcionários.
 */

import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp, writeBatch, getDocs, limit } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

let funcionariosCache = [];
let getRole = () => null;

/**
 * Cria o elemento HTML para um item da lista de funcionários.
 * @param {object} funcionario - O objeto do funcionário.
 * @returns {HTMLElement} O elemento div do item da lista.
 */
function createFuncionarioListItem(funcionario) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center';
    
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `<strong>${funcionario.nome}</strong><span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle ml-1">${funcionario.cargo || 'N/A'}</span><div class="meta">Contacto: ${funcionario.contato || 'N/A'}</div>`;
    itemDiv.appendChild(infoDiv);

    if (getRole() === 'admin') {
        const adminBtns = document.createElement('div');
        adminBtns.className = 'flex items-center space-x-1';
        adminBtns.innerHTML = `<button class="btn-icon-action" title="Editar"><i class="fas fa-user-edit"></i></button><button class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir"><i class="fas fa-user-times"></i></button>`;
        adminBtns.querySelector('button:first-child').onclick = () => abrirModalEditarFuncionario(funcionario.id);
        adminBtns.querySelector('button:last-child').onclick = () => excluirFuncionario(funcionario.id, funcionario.nome);
        itemDiv.appendChild(adminBtns);
    }
    
    return itemDiv;
}

/**
 * Ouve as alterações na coleção de funcionários e atualiza a UI.
 */
function carregarFuncionarios() {
    const path = `artifacts/${shopInstanceAppId}/funcionarios`;
    onSnapshot(query(collection(db, path)), (snap) => {
        const selPV = document.getElementById('pedidoVendedor'), listaEl = document.getElementById('listaFuncionarios'), selFiltro = document.getElementById('filtroVendedor');
        if (selPV) selPV.innerHTML = '<option value="">Selecione funcionário</option>';
        if (selFiltro) selFiltro.innerHTML = '<option value="">Todos Funcionários</option>';
        
        funcionariosCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        
        if (listaEl) {
            listaEl.innerHTML = '';
            if (funcionariosCache.length > 0) {
                funcionariosCache.forEach(f => listaEl.appendChild(createFuncionarioListItem(f)));
            } else {
                listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum funcionário registado.</p>';
            }
        }
        
        funcionariosCache.forEach(f => {
            if (selPV) selPV.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
            if (selFiltro) selFiltro.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
        });
    }, e => {
        console.error("Erro ao carregar funcionários:", e);
        showNotification({ message: "Erro ao carregar funcionários.", type: 'error' });
    });
}

/**
 * Manipula a submissão do formulário de registo de funcionários.
 */
async function handleCadastroFuncionario(e) {
    e.preventDefault();
    const form = e.target;
    const dados = {
        nome: form.funcionarioNome.value,
        contato: form.funcionarioContato.value,
        cargo: form.funcionarioCargo.value,
        codigoAcesso: form.funcionarioCodigoAcesso.value,
        criadoEm: Timestamp.now()
    };
    
    if (!dados.nome || !dados.cargo || !dados.codigoAcesso) {
        showNotification({ message: "Preencha todos os campos obrigatórios.", type: "warning" });
        return;
    }

    try {
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`), dados);
        showNotification({ message: 'Funcionário registado!', type: 'success' });
        form.reset();
    } catch (err) {
        console.error("Erro ao registar funcionário:", err);
        showNotification({ message: 'Erro ao registar funcionário.', type: 'error' });
    }
}

// --- Funções dos Modais ---

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
    e.preventDefault();
    const form = e.target;
    const id = form.funcionarioIdParaEditar.value;
    const dados = {
        nome: form.funcionarioNomeEditar.value,
        contato: form.funcionarioContatoEditar.value,
        cargo: form.funcionarioCargoEditar.value,
        codigoAcesso: form.funcionarioCodigoAcessoEditar.value
    };
    
    try {
        await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/funcionarios`, id), dados);
        showNotification({ message: 'Funcionário atualizado!', type: 'success' });
        fecharModalEspecifico('modalEditarFuncionarioOverlay');
    } catch (err) {
        showNotification({ message: 'Erro ao atualizar funcionário.', type: 'error' });
        console.error(err);
    }
}

function excluirFuncionario(id, nome) {
    showNotification({
        message: `Tem a certeza que deseja excluir o funcionário ${nome}?`,
        type: 'confirm-delete',
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/funcionarios`, id));
                showNotification({ message: 'Funcionário excluído.', type: 'success' });
            } catch (err) {
                showNotification({ message: 'Erro ao excluir funcionário.', type: 'error' });
                console.error(err);
            }
        }
    });
}

/**
 * Cria os dados iniciais se a coleção estiver vazia.
 */
async function criarDadosIniciais() {
    const path = `artifacts/${shopInstanceAppId}/funcionarios`;
    const snapshot = await getDocs(query(collection(db, path), limit(1)));
    if (snapshot.empty) {
        const data = [
            { nome: "Admin Master", contato: "admin@grafica.com", cargo: "admin", codigoAcesso: "010101" },
            { nome: "Vendedor Padrão", contato: "vendedor@grafica.com", cargo: "vendedor", codigoAcesso: "111111" },
            { nome: "Impressor Teste", contato: "impressor@grafica.com", cargo: "impressor", codigoAcesso: "222222" },
            { nome: "Produção Teste", contato: "producao@grafica.com", cargo: "producao", codigoAcesso: "333333" }
        ];
        const batch = writeBatch(db);
        data.forEach(item => {
            const docRef = doc(collection(db, path));
            batch.set(docRef, { ...item, criadoEm: Timestamp.now() });
        });
        await batch.commit();
    }
}

/**
 * Inicializa o módulo de funcionários.
 */
export async function init(deps) {
    getRole = deps.getRole;
    
    await criarDadosIniciais();
    carregarFuncionarios();

    // Listeners de eventos
    document.getElementById('formCadastrarFuncionario')?.addEventListener('submit', handleCadastroFuncionario);
    document.getElementById('formEditarFuncionario')?.addEventListener('submit', handleSalvarEdicaoFuncionario);

    // Anexa funções ao objeto window para serem acessíveis por `onclick`
    window.fecharModalEditarFuncionario = () => fecharModalEspecifico('modalEditarFuncionarioOverlay');
}
