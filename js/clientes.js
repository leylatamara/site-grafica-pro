// js/clientes.js

/**
 * Módulo de Clientes
 * Este ficheiro gere todas as operações CRUD (Criar, Ler, Atualizar, Apagar)
 * e a lógica de interface relacionada com os clientes.
 */

import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

// Estado interno do módulo
let clientesCache = [];
let clienteSelecionadoId = null;

// Dependências externas (injetadas pela função init)
let getPedidosCache = () => [];
let getRole = () => null;

/**
 * Renderiza um item da lista de clientes na interface.
 * @param {object} cliente - O objeto do cliente a ser renderizado.
 * @returns {HTMLElement} O elemento div do item da lista.
 */
function createClienteListItem(cliente) {
    const itemDiv = document.createElement('div');
    itemDiv.className = `item-list-display !cursor-pointer relative flex justify-between items-center ${cliente.id === clienteSelecionadoId ? 'selected' : ''}`;
    itemDiv.onclick = () => exibirDetalhesClienteEProcurarPedidos(cliente.id);

    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `<strong>${cliente.nome}</strong> <span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle">${cliente.tipoCliente === 'revenda' ? 'Revenda' : 'Final'}</span><div class="meta">${cliente.telefone || 'S/ Telefone'}</div>`;
    itemDiv.appendChild(infoDiv);

    if (getRole() === 'admin') {
        const adminButtons = document.createElement('div');
        adminButtons.className = 'flex items-center space-x-1';
        adminButtons.innerHTML = `<button onclick="event.stopPropagation(); window.abrirModalEditarCliente('${cliente.id}')" class="btn-icon-action" title="Editar Cliente"><i class="fas fa-edit"></i></button><button onclick="event.stopPropagation(); window.excluirCliente('${cliente.id}', '${cliente.nome.replace(/'/g, "\\'")}')" class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir Cliente"><i class="fas fa-trash"></i></button>`;
        itemDiv.appendChild(adminButtons);
    }
    return itemDiv;
}

/**
 * Renderiza a lista completa de clientes, aplicando filtros.
 */
function renderizarListaClientes() {
    const listaEl = document.getElementById('listaClientes');
    const termo = document.getElementById('pesquisaClienteInput')?.value.toLowerCase() || '';
    if (!listaEl) return;
    
    const filtrados = clientesCache.filter(c => 
        (c.nome?.toLowerCase().includes(termo)) || 
        (c.telefone?.includes(termo)) || 
        (c.email?.toLowerCase().includes(termo))
    );
    
    listaEl.innerHTML = '';
    if (filtrados.length === 0) {
        listaEl.innerHTML = `<p class="text-sm text-center py-3">${termo ? 'Nenhum cliente encontrado.' : 'Nenhum cliente registado.'}</p>`;
        document.getElementById('detalhesClienteSelecionado').classList.add('hidden');
        clienteSelecionadoId = null;
        return;
    }
    
    filtrados.forEach(c => listaEl.appendChild(createClienteListItem(c)));
}

/**
 * Exibe os detalhes de um cliente selecionado e procura os seus pedidos.
 * @param {string} id - O ID do cliente.
 */
function exibirDetalhesClienteEProcurarPedidos(id) {
    clienteSelecionadoId = id;
    renderizarListaClientes();
    const cli = clientesCache.find(c => c.id === id);
    const detalhesEl = document.getElementById('detalhesClienteSelecionado');
    const infoEl = document.getElementById('infoCliente');
    const pedidosEl = document.getElementById('pedidosDoClienteLista');

    if (!cli || !detalhesEl) return;

    infoEl.innerHTML = `<p><strong>Nome:</strong> ${cli.nome || 'N/A'}</p><p><strong>Tel:</strong> ${cli.telefone || 'N/A'}</p><p><strong>Email:</strong> ${cli.email || 'N/A'}</p><p><strong>Tipo:</strong> ${cli.tipoCliente === 'revenda' ? 'Revenda' : 'Final'}</p>${cli.cpfCnpj ? `<p><strong>CPF/CNPJ:</strong> ${cli.cpfCnpj}</p>` : ''}${cli.endereco ? `<p><strong>Endereço:</strong> ${cli.endereco}</p>` : ''}`;
    detalhesEl.classList.remove('hidden');

    pedidosEl.innerHTML = '<p class="text-xs text-center py-2">A carregar...</p>';
    
    const pedidosCache = getPedidosCache();
    const pFiltrados = pedidosCache.filter(p => p.clienteId === id).sort((a, b) => (b.dataPedido?.toMillis() || 0) - (a.dataPedido?.toMillis() || 0));
    
    if (pFiltrados.length === 0) {
        pedidosEl.innerHTML = '<p class="text-xs text-center py-2">Nenhum pedido para este cliente.</p>';
        return;
    }
    
    pedidosEl.innerHTML = pFiltrados.map(p => `
        <div class='p-2.5 border-b text-xs last:border-b-0'>
            <div class="flex justify-between items-center">
                <span class="font-medium">${p.numeroPedido}</span>
                <span class="text-opacity-80">${p.dataPedido?.toDate().toLocaleDateString('pt-BR') || 'N/A'}</span>
            </div>
            <div class="flex justify-between items-center mt-1">
                <span>R$ ${p.valorTotal.toFixed(2).replace('.', ',')}</span>
                <span class="status-badge-simple ${p.status === 'Entregue' ? 'success' : 'warning'}">${p.status}</span>
            </div>
        </div>`).join('');
}

function carregarClientes(onUpdate) {
    const path = `artifacts/${shopInstanceAppId}/clientes`;
    onSnapshot(query(collection(db, path)), (snap) => {
        clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        if (onUpdate) onUpdate();
    }, e => {
        console.error("Erro ao carregar clientes:", e);
        showNotification({ message: "Erro ao carregar clientes.", type: 'error' });
    });
}

async function handleCadastroCliente(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        nome: form.clienteNome.value,
        tipoCliente: form.clienteTipo.value,
        telefone: form.clienteTelefone.value,
        email: form.clienteEmail.value,
        cpfCnpj: form.clienteCpfCnpj.value,
        endereco: form.clienteEndereco.value,
        criadoEm: Timestamp.now()
    };
    
    if (!data.nome.trim()) {
        showNotification({ message: "O nome do cliente é obrigatório.", type: 'warning' });
        return;
    }

    try {
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/clientes`), data);
        showNotification({ message: 'Cliente registado!', type: 'success' });
        form.reset();
    } catch (err) {
        console.error("Erro ao registar cliente:", err);
        showNotification({ message: 'Erro ao registar cliente.', type: 'error' });
    }
}

function abrirModalEditarCliente(clienteId) {
    const c = clientesCache.find(cli => cli.id === clienteId);
    if (!c) return;
    document.getElementById('clienteIdParaEditar').value = c.id;
    document.getElementById('clienteNomeEditar').value = c.nome;
    document.getElementById('clienteTipoEditar').value = c.tipoCliente;
    document.getElementById('clienteTelefoneEditar').value = c.telefone;
    document.getElementById('clienteEmailEditar').value = c.email;
    document.getElementById('clienteCpfCnpjEditar').value = c.cpfCnpj;
    document.getElementById('clienteEnderecoEditar').value = c.endereco;
    abrirModalEspecifico('modalEditarClienteOverlay');
}

async function handleSalvarEdicaoCliente(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.clienteIdParaEditar.value;
    const dados = {
        nome: form.clienteNomeEditar.value,
        tipoCliente: form.clienteTipoEditar.value,
        telefone: form.clienteTelefoneEditar.value,
        email: form.clienteEmailEditar.value,
        cpfCnpj: form.clienteCpfCnpjEditar.value,
        endereco: form.clienteEnderecoEditar.value,
    };
    try {
        await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/clientes`, id), dados);
        showNotification({ message: 'Cliente atualizado!', type: 'success' });
        fecharModalEspecifico('modalEditarClienteOverlay');
    } catch (err) {
        showNotification({ message: 'Erro ao atualizar cliente.', type: 'error' });
        console.error(err);
    }
}

function excluirCliente(id, nome) {
    showNotification({
        message: `Tem a certeza que deseja excluir o cliente ${nome}?`,
        type: 'confirm-delete',
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/clientes`, id));
                showNotification({ message: 'Cliente excluído com sucesso.', type: 'success' });
            } catch (err) {
                showNotification({ message: 'Erro ao excluir cliente.', type: 'error' });
                console.error(err);
            }
        }
    });
}

export function init(deps) {
    getPedidosCache = deps.getPedidosCache;
    getRole = deps.getRole;
    
    carregarClientes(() => {
        renderizarListaClientes();
    });

    document.getElementById('pesquisaClienteInput')?.addEventListener('input', renderizarListaClientes);
    document.getElementById('formCadastrarCliente')?.addEventListener('submit', handleCadastroCliente);
    document.getElementById('formEditarCliente')?.addEventListener('submit', handleSalvarEdicaoCliente);
    
    window.abrirModalEditarCliente = abrirModalEditarCliente;
    window.excluirCliente = excluirCliente;
    window.fecharModalEditarCliente = () => fecharModalEspecifico('modalEditarClienteOverlay');
}

// **INÍCIO DA CORREÇÃO**
// Esta linha exporta a função que retorna a cache de clientes,
// resolvendo o erro que aparecia na consola.
export const getClientes = () => clientesCache;
// **FIM DA CORREÇÃO**
