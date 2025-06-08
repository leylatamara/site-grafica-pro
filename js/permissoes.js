// js/permissoes.js

/**
 * Módulo de Gestão de Permissões
 * Lida com a leitura, escrita e interface para definir quais cargos podem ver quais páginas.
 */

import { db, shopInstanceAppId, collection, doc, getDocs, writeBatch } from './firebase-config.js';
import { showNotification } from './ui.js';

let permissoesCache = new Map(); // Armazena as permissões: 'admin' => ['page1', 'page2']

const paginasDisponiveis = [
    { id: 'telaInicial', nome: 'Home' },
    { id: 'novoPedido', nome: 'Novo Pedido' },
    { id: 'cadastrarCliente', nome: 'Clientes' },
    { id: 'cadastrarProduto', nome: 'Produtos' },
    { id: 'cadastrarFuncionario', nome: 'Funcionários' },
    { id: 'cadastrarFornecedor', nome: 'Fornecedores' },
    { id: 'visualizarPedidos', nome: 'Pedidos' },
    { id: 'gerirPermissoes', nome: 'Gerir Permissões' }
];

/**
 * Carrega todas as regras de permissão do Firestore para a cache.
 */
async function carregarPermissoes() {
    const path = `artifacts/${shopInstanceAppId}/permissoes`;
    const snapshot = await getDocs(collection(db, path));
    permissoesCache.clear();
    snapshot.forEach(doc => {
        permissoesCache.set(doc.id, doc.data().paginasPermitidas || []);
    });
}

/**
 * Renderiza a interface de gestão de permissões.
 */
function renderizarPermissoesUI() {
    const container = document.getElementById('permissoesContainer');
    if (!container) return;

    const cargos = ['admin', 'vendedor', 'designer', 'impressor', 'producao', 'freelancer'];

    let tableHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-700">
                <thead class="bg-gray-800">
                    <tr>
                        <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Página / Secção</th>
                        ${cargos.map(cargo => `<th scope="col" class="px-3 py-3.5 text-center text-sm font-semibold text-white">${cargo.charAt(0).toUpperCase() + cargo.slice(1)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-800 bg-gray-900/50">
    `;

    paginasDisponiveis.forEach(pagina => {
        tableHTML += `<tr><td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">${pagina.nome}</td>`;
        cargos.forEach(cargo => {
            const isChecked = permissoesCache.get(cargo)?.includes(pagina.id) ?? false;
            // O cargo 'admin' tem sempre todas as permissões e não pode ser alterado
            const isDisabled = cargo === 'admin';
            tableHTML += `
                <td class="whitespace-nowrap px-3 py-4 text-sm text-center">
                    <input type="checkbox" data-role="${cargo}" data-page="${pagina.id}" 
                           class="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-600 disabled:opacity-50" 
                           ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                </td>
            `;
        });
        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table></div>`;
    container.innerHTML = tableHTML;
}

/**
 * Guarda as alterações de permissões no Firestore.
 */
async function handleGuardarPermissoes() {
    const batch = writeBatch(db);
    const novasPermissoes = new Map();

    document.querySelectorAll('#permissoesContainer input[type="checkbox"]:not(:disabled)').forEach(checkbox => {
        const cargo = checkbox.dataset.role;
        const pagina = checkbox.dataset.page;

        if (!novasPermissoes.has(cargo)) {
            novasPermissoes.set(cargo, []);
        }

        if (checkbox.checked) {
            novasPermissoes.get(cargo).push(pagina);
        }
    });

    // Adiciona as permissões do admin que são fixas
    novasPermissoes.set('admin', paginasDisponiveis.map(p => p.id));
    
    novasPermissoes.forEach((paginas, cargo) => {
        const docRef = doc(db, `artifacts/${shopInstanceAppId}/permissoes`, cargo);
        batch.set(docRef, { paginasPermitidas: paginas });
    });

    try {
        await batch.commit();
        await carregarPermissoes(); // Recarrega a cache com os novos dados
        showNotification({ message: 'Permissões guardadas com sucesso!', type: 'success' });
    } catch (error) {
        console.error("Erro ao guardar permissões: ", error);
        showNotification({ message: 'Erro ao guardar permissões.', type: 'error' });
    }
}

/**
 * Inicializa o módulo de permissões.
 */
export async function init() {
    await carregarPermissoes();
    
    // Se não houver permissões definidas, cria um conjunto padrão
    if (permissoesCache.size === 0) {
        const batch = writeBatch(db);
        const permissoesDefault = {
            admin: paginasDisponiveis.map(p => p.id),
            vendedor: ['telaInicial', 'novoPedido', 'cadastrarCliente', 'visualizarPedidos'],
            designer: ['telaInicial', 'cadastrarProduto', 'visualizarPedidos'],
            impressor: ['telaInicial', 'visualizarPedidos'],
            producao: ['telaInicial', 'visualizarPedidos'],
            freelancer: ['telaInicial', 'visualizarPedidos']
        };

        for (const [cargo, paginas] of Object.entries(permissoesDefault)) {
            const docRef = doc(db, `artifacts/${shopInstanceAppId}/permissoes`, cargo);
            batch.set(docRef, { paginasPermitidas: paginas });
        }
        await batch.commit();
        await carregarPermissoes(); // Recarrega a cache
    }

    renderizarPermissoesUI();
    document.getElementById('btnGuardarPermissoes')?.addEventListener('click', handleGuardarPermissoes);
}

/**
 * Obtém as páginas permitidas para um determinado cargo.
 * @param {string} cargo - O cargo a ser verificado.
 * @returns {string[]} Uma lista de IDs de páginas permitidas.
 */
export function getPermissoesParaCargo(cargo) {
    return permissoesCache.get(cargo) || [];
}
