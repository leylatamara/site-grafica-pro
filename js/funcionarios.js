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
    }, e => showNotification({ message: "Erro ao carregar funcionários.", type: 'error' }));
}

async function handleCadastroFuncionario(e) {
    e.preventDefault();
    const form = e.target;
    const dados = { nome: form.funcionarioNome.value, contato: form.funcionarioContato.value, cargo: form.funcionarioCargo.value, codigoAcesso: form.funcionarioCodigoAcesso.value, criadoEm: Timestamp.now() };
    if (!dados.nome || !dados.cargo || !dados.codigoAcesso) { showNotification({ message: "Preencha todos os campos obrigatórios.", type: "warning" }); return; }
    try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`), dados); showNotification({ message: 'Funcionário registado!', type: 'success' }); form.reset(); } catch (err) { showNotification({ message: 'Erro ao registar funcionário.', type: 'error' }); }
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
    e.preventDefault();
    const form = e.target;
    const id = form.funcionarioIdParaEditar.value;
    const dados = { nome: form.funcionarioNomeEditar.value, contato: form.funcionarioContatoEditar.value, cargo: form.funcionarioCargoEditar.value, codigoAcesso: form.funcionarioCodigoAcessoEditar.value };
    try { await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/funcionarios`, id), dados); showNotification({ message: 'Funcionário atualizado!', type: 'success' }); fecharModalEspecifico('modalEditarFuncionarioOverlay'); } catch (err) { showNotification({ message: 'Erro ao atualizar funcionário.', type: 'error' }); }
}

function excluirFuncionario(id, nome) {
    showNotification({ message: `Excluir o funcionário ${nome}?`, type: 'confirm-delete', onConfirm: async () => {
        try { await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/funcionarios`, id)); showNotification({ message: 'Funcionário excluído.', type: 'success' }); } catch (err) { showNotification({ message: 'Erro ao excluir.', type: 'error' }); }
    }});
}

export async function init(deps) {
    getRole = deps.getRole;
    carregarFuncionarios();
    document.getElementById('formCadastrarFuncionario')?.addEventListener('submit', handleCadastroFuncionario);
    document.getElementById('formEditarFuncionario')?.addEventListener('submit', handleSalvarEdicaoFuncionario);

    window.abrirModalEditarFuncionario = abrirModalEditarFuncionario;
    window.excluirFuncionario = excluirFuncionario;
    window.fecharModalEditarFuncionario = () => fecharModalEspecifico('modalEditarFuncionarioOverlay');
}
