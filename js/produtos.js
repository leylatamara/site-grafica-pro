// js/produtos.js

/**
 * Módulo de Produtos
 * Gere todas as operações CRUD e a lógica de UI para os produtos.
 */

import { db, shopInstanceAppId, collection, addDoc, doc, onSnapshot, query, updateDoc, deleteDoc, Timestamp, where, orderBy } from './firebase-config.js';
import { showNotification, abrirModalEspecifico, fecharModalEspecifico } from './ui.js';

// Estado interno do módulo
let produtosCache = [];
let produtoSelecionadoId = null;

// Dependências externas (injetadas)
let getRole = () => null;

/**
 * Carrega os produtos do Firestore
 */
function carregarProdutos(onUpdate) {
    const produtosRef = collection(db, `artifacts/${shopInstanceAppId}/produtos`);
    const q = query(produtosRef, orderBy('nome', 'asc'));
    
    onSnapshot(q, (snapshot) => {
        produtosCache = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        if (onUpdate) onUpdate();
    });
}

/**
 * Valida os dados do produto
 */
function validarProduto(dados) {
    if (!dados.nome || dados.nome.trim().length < 3) {
        throw new Error('Nome deve ter pelo menos 3 caracteres');
    }
    
    if (dados.tipoPreco === 'unidade' && (!dados.precoUnidade || dados.precoUnidade <= 0)) {
        throw new Error('Preço unitário inválido');
    }
    
    if (dados.tipoPreco === 'metro' && (!dados.precoMetro || dados.precoMetro <= 0)) {
        throw new Error('Preço por metro quadrado inválido');
    }
    
    return true;
}

/**
 * Salva um novo produto ou atualiza um existente
 */
async function salvarProduto(dados) {
    try {
        validarProduto(dados);
        
        const produtoData = {
            ...dados,
            nome: dados.nome.trim(),
            ultimaAtualizacao: Timestamp.now()
        };
        
        if (produtoSelecionadoId) {
            await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/produtos`, produtoSelecionadoId), produtoData);
            showNotification({
                message: 'Produto atualizado com sucesso!',
                type: 'success'
            });
        } else {
            produtoData.criadoEm = Timestamp.now();
            await addDoc(collection(db, `artifacts/${shopInstanceAppId}/produtos`), produtoData);
            showNotification({
                message: 'Produto registrado com sucesso!',
                type: 'success'
            });
        }
        
        // Limpar estado
        produtoSelecionadoId = null;
        
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showNotification({
            message: error.message || 'Erro ao salvar produto',
            type: 'error'
        });
    }
}

/**
 * Exclui um produto
 */
async function excluirProduto(produtoId) {
    try {
        // Verificar se o produto está em uso em algum pedido
        const pedidosRef = collection(db, `artifacts/${shopInstanceAppId}/pedidos`);
        const q = query(pedidosRef, where('itens', 'array-contains', { produtoId }));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            throw new Error('Não é possível excluir um produto que está em uso em pedidos');
        }
        
        await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/produtos`, produtoId));
        
        showNotification({
            message: 'Produto excluído com sucesso!',
            type: 'success'
        });
        
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showNotification({
            message: error.message || 'Erro ao excluir produto',
            type: 'error'
        });
    }
}

/**
 * Renderiza a lista de produtos
 */
function renderizarListaProdutos() {
    const container = document.getElementById('listaProdutos');
    if (!container) return;
    
    if (produtosCache.length === 0) {
        container.innerHTML = '<p class="text-sm text-center py-3">Nenhum produto registrado.</p>';
        return;
    }
    
    container.innerHTML = produtosCache.map(produto => `
        <div class="produto-item p-3 border rounded-md hover:bg-gray-50">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-medium">${produto.nome}</h4>
                    <p class="text-sm text-gray-600">
                        ${produto.tipoPreco === 'metro' ? 
                            `R$ ${produto.precoMetro.toFixed(2)}/m²` : 
                            `R$ ${produto.precoUnidade.toFixed(2)}/unidade`}
                    </p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="abrirModalEditarProduto('${produto.id}')" 
                            class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="excluirProduto('${produto.id}')" 
                            class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${produto.descricao ? `<p class="text-sm mt-2">${produto.descricao}</p>` : ''}
        </div>
    `).join('');
}

/**
 * Alterna os campos de preço baseado no tipo de precificação
 */
function togglePrecoFields() {
    const tipoPreco = document.getElementById('produtoTipoPreco').value;
    const precoUnidadeFields = document.getElementById('precoUnidadeFields');
    const precoMetroFields = document.getElementById('precoMetroFields');
    
    if (tipoPreco === 'unidade') {
        precoUnidadeFields.classList.remove('hidden');
        precoMetroFields.classList.add('hidden');
    } else {
        precoUnidadeFields.classList.add('hidden');
        precoMetroFields.classList.remove('hidden');
    }
}

/**
 * Alterna os campos de preço no formulário de edição
 */
function togglePrecoFieldsEditar() {
    const tipoPreco = document.getElementById('produtoTipoPrecoEditar').value;
    const precoUnidadeFields = document.getElementById('precoUnidadeFieldsEditar');
    const precoMetroFields = document.getElementById('precoMetroFieldsEditar');
    
    if (tipoPreco === 'unidade') {
        precoUnidadeFields.classList.remove('hidden');
        precoMetroFields.classList.add('hidden');
    } else {
        precoUnidadeFields.classList.add('hidden');
        precoMetroFields.classList.remove('hidden');
    }
}

/**
 * Abre o modal de edição de produto
 */
function abrirModalEditarProduto(produtoId) {
    const produto = produtosCache.find(p => p.id === produtoId);
    if (!produto) return;
    
    produtoSelecionadoId = produtoId;
    
    document.getElementById('produtoIdParaEditar').value = produto.id;
    document.getElementById('produtoNomeEditar').value = produto.nome;
    document.getElementById('produtoTipoPrecoEditar').value = produto.tipoPreco;
    document.getElementById('produtoPrecoUnidadeEditar').value = produto.precoUnidade || '';
    document.getElementById('produtoPrecoMetroEditar').value = produto.precoMetro || '';
    document.getElementById('produtoDescricaoEditar').value = produto.descricao || '';
    
    togglePrecoFieldsEditar();
    abrirModalEspecifico('modalEditarProdutoOverlay');
}

/**
 * Inicializa o módulo de produtos
 */
export function init(deps) {
    getRole = deps.getRole;
    
    carregarProdutos(() => {
        renderizarListaProdutos();
    });

    // Listeners de eventos
    document.getElementById('formCadastrarProduto')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const dados = {
            nome: formData.get('produtoNome'),
            tipoPreco: formData.get('produtoTipoPreco'),
            precoUnidade: formData.get('produtoPrecoUnidade') ? parseFloat(formData.get('produtoPrecoUnidade')) : null,
            precoMetro: formData.get('produtoPrecoMetro') ? parseFloat(formData.get('produtoPrecoMetro')) : null,
            descricao: formData.get('produtoDescricao')
        };
        await salvarProduto(dados);
        e.target.reset();
    });
    
    document.getElementById('formEditarProduto')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const dados = {
            nome: formData.get('produtoNomeEditar'),
            tipoPreco: formData.get('produtoTipoPrecoEditar'),
            precoUnidade: formData.get('produtoPrecoUnidadeEditar') ? parseFloat(formData.get('produtoPrecoUnidadeEditar')) : null,
            precoMetro: formData.get('produtoPrecoMetroEditar') ? parseFloat(formData.get('produtoPrecoMetroEditar')) : null,
            descricao: formData.get('produtoDescricaoEditar')
        };
        await salvarProduto(dados);
        fecharModalEspecifico('modalEditarProdutoOverlay');
    });
    
    document.getElementById('produtoTipoPreco')?.addEventListener('change', togglePrecoFields);
    document.getElementById('produtoTipoPrecoEditar')?.addEventListener('change', togglePrecoFieldsEditar);

    // Anexa funções ao objeto window
    window.togglePrecoFields = togglePrecoFields;
    window.togglePrecoFieldsEditar = togglePrecoFieldsEditar;
    window.fecharModalEditarProduto = () => fecharModalEspecifico('modalEditarProdutoOverlay');
    window.abrirModalEditarProduto = abrirModalEditarProduto;
    window.excluirProduto = excluirProduto;
}

// Exporta a cache de produtos para ser usada por outros módulos (ex: pedidos)
export const getProdutos = () => produtosCache;
