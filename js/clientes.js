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

// Validar CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validar primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digitoVerificador1 = resto > 9 ? 0 : resto;
    if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;
    
    // Validar segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digitoVerificador2 = resto > 9 ? 0 : resto;
    if (digitoVerificador2 !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

// Validar CNPJ
function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    
    // Validar primeiro dígito verificador
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    
    // Validar segundo dígito verificador
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    
    return true;
}

// Validar email
function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validar telefone
function validarTelefone(telefone) {
    const re = /^\(\d{2}\) \d{5}-\d{4}$/;
    return re.test(telefone);
}

// Sanitizar input
function sanitizarInput(input) {
    return input.replace(/[<>]/g, '');
}

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
        adminButtons.innerHTML = `<button class="btn-icon-action" title="Editar Cliente"><i class="fas fa-edit"></i></button><button class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir Cliente"><i class="fas fa-trash"></i></button>`;
        adminButtons.querySelector('button:first-child').onclick = (e) => { e.stopPropagation(); abrirModalEditarCliente(cliente.id); };
        adminButtons.querySelector('button:last-child').onclick = (e) => { e.stopPropagation(); excluirCliente(cliente.id, cliente.nome); };
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
    renderizarListaClientes(); // Re-renderiza para marcar o item selecionado
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

/**
 * Ouve as alterações na coleção de clientes no Firestore em tempo real.
 * @param {function} onUpdate - Callback a ser executado quando os dados são atualizados.
 */
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

/**
 * Manipula a submissão do formulário de registo de clientes.
 * @param {Event} e - O evento de submissão do formulário.
 */
async function handleCadastroCliente(e) {
    e.preventDefault();
    const form = e.target;
    
    // Sanitizar e validar inputs
    const nome = sanitizarInput(form.clienteNome.value.trim());
    const tipoCliente = form.clienteTipo.value;
    const telefone = form.clienteTelefone.value.trim();
    const email = form.clienteEmail.value.trim();
    const cpfCnpj = form.clienteCpfCnpj.value.trim();
    const endereco = sanitizarInput(form.clienteEndereco.value.trim());
    
    // Validações
    if (!nome) {
        showNotification({ message: "O nome do cliente é obrigatório.", type: 'warning' });
        return;
    }
    
    if (telefone && !validarTelefone(telefone)) {
        showNotification({ message: "Formato de telefone inválido. Use (99) 99999-9999", type: 'warning' });
        return;
    }
    
    if (email && !validarEmail(email)) {
        showNotification({ message: "Email inválido.", type: 'warning' });
        return;
    }
    
    if (cpfCnpj) {
        if (cpfCnpj.length === 11 && !validarCPF(cpfCnpj)) {
            showNotification({ message: "CPF inválido.", type: 'warning' });
            return;
        } else if (cpfCnpj.length === 14 && !validarCNPJ(cpfCnpj)) {
            showNotification({ message: "CNPJ inválido.", type: 'warning' });
            return;
        }
    }
    
    const data = {
        nome,
        tipoCliente,
        telefone,
        email,
        cpfCnpj,
        endereco,
        criadoEm: Timestamp.now()
    };

    try {
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/clientes`), data);
        showNotification({ message: 'Cliente registado com sucesso!', type: 'success' });
        form.reset();
    } catch (err) {
        console.error("Erro ao registar cliente:", err);
        showNotification({ message: 'Erro ao registar cliente. Por favor, tente novamente.', type: 'error' });
    }
}

// --- Funções dos Modais ---

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

/**
 * Inicializa o módulo de clientes, configura listeners e carrega dados.
 * @param {object} deps - Dependências necessárias de outros módulos.
 */
export function init(deps) {
    getPedidosCache = deps.getPedidosCache;
    getRole = deps.getRole;
    
    carregarClientes(() => {
        // Re-renderiza a lista sempre que os dados do Firestore mudarem
        renderizarListaClientes();
    });

    // Listeners de eventos
    document.getElementById('pesquisaClienteInput')?.addEventListener('input', renderizarListaClientes);
    document.getElementById('formCadastrarCliente')?.addEventListener('submit', handleCadastroCliente);
    document.getElementById('formEditarCliente')?.addEventListener('submit', handleSalvarEdicaoCliente);
    
    // Anexa funções ao objeto window para serem acessíveis por `onclick`
    window.abrirModalEditarCliente = abrirModalEditarCliente;
    window.fecharModalEditarCliente = () => fecharModalEspecifico('modalEditarClienteOverlay');
}

// Retorna a cache de clientes para outros módulos que precisem dela.
export const getClientes = () => clientesCache;

