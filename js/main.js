// js/main.js

/**
 * Ponto de Entrada Principal da Aplicação
 * Orquestra a aplicação, importa e inicializa todos os módulos.
 */

// MÓDULOS ESSENCIAIS
import { initAuth, handleLogin, logout, checkSession } from './auth.js';
import { ajustarPaddingBody, setActiveMenuLink, showNotification } from './ui.js';

// MÓDULOS DE FUNCIONALIDADE
import { init as initClientes, getClientes } from './clientes.js';
import { init as initProdutos, getProdutos } from './produtos.js';
import { init as initFuncionarios } from './funcionarios.js';
import { init as initFornecedores } from './fornecedores.js';
import { init as initPedidos, getPedidos } from './pedidos.js';

// ESTADO GLOBAL DA APLICAÇÃO
let loggedInUserRole = null;
let loggedInUserName = null;
let loggedInUserIdGlobal = null;
let activeSectionId = 'telaInicial';

// Sistema de Cache
const cache = {
    data: new Map(),
    timestamps: new Map(),
    maxAge: 5 * 60 * 1000, // 5 minutos

    set(key, value) {
        this.data.set(key, value);
        this.timestamps.set(key, Date.now());
    },

    get(key) {
        if (!this.data.has(key)) return null;
        
        const timestamp = this.timestamps.get(key);
        if (Date.now() - timestamp > this.maxAge) {
            this.data.delete(key);
            this.timestamps.delete(key);
            return null;
        }
        
        return this.data.get(key);
    },

    clear() {
        this.data.clear();
        this.timestamps.clear();
    },

    invalidate(key) {
        this.data.delete(key);
        this.timestamps.delete(key);
    }
};

// Função para carregar dados com cache
async function loadDataWithCache(key, loader) {
    const cachedData = cache.get(key);
    if (cachedData) {
        return cachedData;
    }

    const data = await loader();
    cache.set(key, data);
    return data;
}

// Função para atualizar estatísticas do usuário
async function atualizarEstatisticasUsuario() {
    try {
        const pedidos = await loadDataWithCache('pedidos', getPedidos);
        const pedidosMes = pedidos.filter(p => {
            const dataPedido = new Date(p.dataPedido);
            const hoje = new Date();
            return dataPedido.getMonth() === hoje.getMonth() && 
                   dataPedido.getFullYear() === hoje.getFullYear();
        });

        const pedidosFinalizacao = pedidos.filter(p => 
            p.status === 'Em Produção (Acabamento)' || 
            p.status === 'Pronto para Retirada'
        );

        const pedidosFinalizados = pedidos.filter(p => 
            p.status === 'Entregue'
        );

        document.getElementById('userPedidosMes').textContent = pedidosMes.length;
        document.getElementById('userPedidosFinalizacao').textContent = pedidosFinalizacao.length;
        document.getElementById('userPedidosFinalizados').textContent = pedidosFinalizados.length;
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
        showNotification({
            message: 'Erro ao carregar estatísticas.',
            type: 'error'
        });
    }
}

// Função para limpar cache ao fazer logout
function limparCache() {
    cache.clear();
}

// Inicialização da aplicação
async function initApp() {
    try {
        // Inicializar autenticação
        initAuth({
            onUserLoggedIn: (user) => {
                loggedInUserRole = user.role;
                loggedInUserName = user.name;
                loggedInUserIdGlobal = user.id;
                
                // Atualizar interface
                document.getElementById('loggedInUserNameDisplay').textContent = `Olá, ${user.name}`;
                document.body.classList.add('app-visible');
                document.getElementById('loginScreen').classList.add('hidden');
                document.getElementById('appContainer').classList.remove('hidden');
                
                // Configurar acesso e carregar dados
                configurarAcessoPorCargo(user.role);
                setActiveMenuLink('telaInicial');
                mostrarSecao('telaInicial', false);
                ajustarPaddingBody();
                
                // Carregar dados iniciais
                atualizarEstatisticasUsuario();
            },
            onUserLoggedOut: () => {
                limparCache();
                document.body.classList.remove('app-visible');
                document.getElementById('loginScreen').classList.remove('hidden');
                document.getElementById('appContainer').classList.add('hidden');
            },
            onAuthReady: () => {
                // Inicializar módulos
                initClientes();
                initProdutos();
                initFuncionarios();
                initFornecedores();
                initPedidos();
            }
        });

        // Configurar verificação periódica de sessão
        setInterval(() => {
            if (!checkSession()) {
                logout();
            }
        }, 60000); // Verificar a cada minuto

    } catch (error) {
        console.error('Erro na inicialização:', error);
        showNotification({
            message: 'Erro ao inicializar a aplicação. Por favor, recarregue a página.',
            type: 'error'
        });
    }
}

// Iniciar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);

// Exportar funções necessárias
export {
    loadDataWithCache,
    cache,
    atualizarEstatisticasUsuario,
    limparCache
};

// --- LÓGICA DE NAVEGAÇÃO E UI ---

function mostrarSecao(idSecao, isMenuLink = false) { 
    if (!loggedInUserRole && idSecao !== 'loginScreen') {
        logout();
        return;
    }
    
    document.querySelectorAll('.main-content-section').forEach(secao => {
        secao.classList.add('hidden');
    });

    const targetSection = document.getElementById(idSecao);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        activeSectionId = idSecao;
        
        if (isMenuLink) {
            setActiveMenuLink(idSecao);
            const exoMenuEl = document.querySelector('.exo-menu-container .exo-menu');
            if (window.innerWidth <= 768 && exoMenuEl?.classList.contains('display')) {
                document.querySelector('.exo-menu-container .toggle-menu')?.click();
            }
        }
    } else { 
        if (loggedInUserRole) mostrarSecao('telaInicial', true);
        return;
    }

    if (idSecao === 'telaInicial') atualizarDashboard();
    
    ajustarPaddingBody();
}

function configurarAcessoPorCargo(role) {
    document.querySelectorAll('[data-role-access]').forEach(item => {
        const acessoPermitido = item.dataset.roleAccess;
        item.classList.toggle('hidden', !(acessoPermitido === "all" || (role && acessoPermitido.includes(role))));
    });
    const cadastrosDropdown = document.getElementById('dropdownCadastrosMenu');
    if (cadastrosDropdown) {
        const subItensVisiveis = cadastrosDropdown.querySelectorAll('ul.drop-down-ul > li:not(.hidden)');
        cadastrosDropdown.classList.toggle('hidden', subItensVisiveis.length === 0);
    }
}

function atualizarDashboard() {
    const clientesCache = getClientes();
    const pedidosCache = getPedidos();
    
    const m = {
        h: document.getElementById('metricPedidosHoje'),
        p: document.getElementById('metricPedidosPendentes'),
        f: document.getElementById('metricFaturamentoMes'),
        c: document.getElementById('metricTotalClientes')
    };

    if (!m.c || !m.h || !m.p || !m.f) return;

    m.c.textContent = clientesCache.length;

    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    let pedidosHoje = 0, pedidosPendentes = 0, faturamentoMes = 0;
    pedidosCache.forEach(p => {
        const dataPedido = p.dataPedido?.toDate();
        if (!dataPedido) return;

        if (dataPedido >= hoje) pedidosHoje++;
        if (p.status !== 'Entregue' && p.status !== 'Cancelado') pedidosPendentes++;
        if (dataPedido >= inicioMes && p.status !== 'Cancelado') faturamentoMes += p.valorTotal || 0;
    });

    m.h.textContent = pedidosHoje;
    m.p.textContent = pedidosPendentes;
    m.f.textContent = `R$ ${faturamentoMes.toFixed(2).replace('.', ',')}`;
}

// --- EVENT LISTENERS GERAIS ---
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin(document.getElementById('codigoAcesso').value, () => {
        window.location.reload();
    });
});
document.getElementById('logoutButton')?.addEventListener('click', logout);

document.querySelectorAll('.exo-menu a[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.closest('a[data-section]').dataset.section;
        mostrarSecao(section, true);
    });
});

// --- EXPOSIÇÃO DE FUNÇÕES GLOBAIS ---
// Apenas as funções que são chamadas diretamente pelo HTML (onclick)
// precisam de estar no escopo global. Os módulos já tratam disto internamente.
window.mostrarSecao = mostrarSecao;
