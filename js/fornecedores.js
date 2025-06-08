// js/fornecedores.js

/**
 * Módulo de Fornecedores
 * Gere todas as operações CRUD e a lógica de UI para os fornecedores.
 */

import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp, writeBatch, getDocs, limit } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

let fornecedoresCache = [];
let getRole = () => null;

/**
 * Cria o elemento HTML para um item da lista de fornecedores.
 * @param {object} fornecedor - O objeto do fornecedor.
 * @returns {HTMLElement} O elemento div do item da lista.
 */
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
        adminBtns.innerHTML = `<button class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir"><i class="fas fa-trash"></i></button>`;
        adminBtns.querySelector('button:first-child').onclick = () => abrirModalEditarFornecedor(fornecedor.id);
        adminBtns.querySelector('button:last-child').onclick = () => excluirFornecedor(fornecedor.id, fornecedor.nome);
        itemDiv.appendChild(adminBtns);
    }
    
    return itemDiv;
}

/**
 * Ouve as alterações na coleção de fornecedores e atualiza a UI.
 */
function carregarFornecedores() {
    const path = `artifacts/${shopInstanceAppId}/fornecedores`;
    onSnapshot(query(collection(db, path)), (snap) => {
        const listaEl = document.getElementById('listaFornecedores');
        fornecedoresCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        
        if (listaEl) {
            listaEl.innerHTML = '';
            if (fornecedoresCache.length > 0) {
                fornecedoresCache.forEach(f => listaEl.appendChild(createFornecedorListItem(f)));
            } else {
                listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum fornecedor registado.</p>';
            }
        }
    }, e => {
        console.error("Erro ao carregar fornecedores:", e);
        showNotification({ message: "Erro ao carregar fornecedores.", type: 'error' });
    });
}

/**
 * Manipula a submissão do formulário de registo de fornecedores.
 */
async function handleCadastroFornecedor(e) {
    e.preventDefault();
    const form = e.target;
    const dados = {
        nome: form.fornecedorNome.value,
        contato: form.fornecedorContato.value,
        tipoMaterial: form.fornecedorMaterial.value,
        criadoEm: Timestamp.now()
    };
    
    if (!dados.nome.trim()) {
        showNotification({ message: "Nome do fornecedor é obrigatório.", type: "warning" });
        return;
    }

    try {
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/fornecedores`), dados);
        showNotification({ message: 'Fornecedor registado!', type: 'success' });
        form.reset();
    } catch (err) {
        console.error("Erro ao registar fornecedor:", err);
        showNotification({ message: 'Erro ao registar fornecedor.', type: 'error' });
    }
}

// --- Funções dos Modais ---

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
    e.preventDefault();
    const form = e.target;
    const id = form.fornecedorIdParaEditar.value;
    const dados = {
        nome: form.fornecedorNomeEditar.value,
        contato: form.fornecedorContatoEditar.value,
        tipoMaterial: form.fornecedorMaterialEditar.value,
    };
    
    try {
        await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/fornecedores`, id), dados);
        showNotification({ message: 'Fornecedor atualizado!', type: 'success' });
        fecharModalEspecifico('modalEditarFornecedorOverlay');
    } catch (err) {
        showNotification({ message: 'Erro ao atualizar fornecedor.', type: 'error' });
        console.error(err);
    }
}

function excluirFornecedor(id, nome) {
    showNotification({
        message: `Tem a certeza que deseja excluir o fornecedor ${nome}?`,
        type: 'confirm-delete',
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/fornecedores`, id));
                showNotification({ message: 'Fornecedor excluído.', type: 'success' });
            } catch (err) {
                showNotification({ message: 'Erro ao excluir fornecedor.', type: 'error' });
                console.error(err);
            }
        }
    });
}

/**
 * Cria os dados iniciais se a coleção estiver vazia.
 */
async function criarDadosIniciais() {
    const path = `artifacts/${shopInstanceAppId}/fornecedores`;
    const snapshot = await getDocs(query(collection(db, path), limit(1)));
    if (snapshot.empty) {
        const data = [
            { nome: "Fornecedor de Lonas ABC", contato: "vendas@lonasabc.com", tipoMaterial: "Lonas e Vinis" },
            { nome: "Papelaria Central", contato: "(11) 3333-4444", tipoMaterial: "Papéis Especiais" }
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
 * Inicializa o módulo de fornecedores.
 */
export async function init(deps) {
    getRole = deps.getRole;
    
    await criarDadosIniciais();
    carregarFornecedores();

    // Listeners de eventos
    document.getElementById('formCadastrarFornecedor')?.addEventListener('submit', handleCadastroFornecedor);
    document.getElementById('formEditarFornecedor')?.addEventListener('submit', handleSalvarEdicaoFornecedor);

    // Anexa funções ao objeto window para serem acessíveis por `onclick`
    window.fecharModalEditarFornecedor = () => fecharModalEspecifico('modalEditarFornecedorOverlay');
}
