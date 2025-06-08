// js/main.js

/**
 * Ponto de Entrada Principal da Aplicação
 * Orquestra a aplicação, importa e inicializa todos os módulos.
 */

// MÓDULOS ESSENCIAIS
import { initAuth, handleLogin, logout } from './auth.js';
import { ajustarPaddingBody, setActiveMenuLink } from './ui.js';
import { injectAllTemplates } from './templates.js';

// MÓDULOS DE FUNCIONALIDADE
import { init as initClientes, getClientes } from './clientes.js';
import { init as initProdutos, getProdutos } from './produtos.js';
import { init as initFuncionarios } from './funcionarios.js';
import { init as initFornecedores } from './fornecedores.js';
import { init as initPedidos, getPedidos } from './pedidos.js';
import { init as initPermissoes, getPermissoesParaCargo } from './permissoes.js';

// ESTADO GLOBAL DA APLICAÇÃO
let loggedInUserRole = null;
let loggedInUserName = null;
let loggedInUserIdGlobal = null;
let activeSectionId = 'telaInicial';
let permissoesDoCargo = [];

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

// Injeta o HTML de todas as secções no DOM assim que o script é carregado.
injectAllTemplates();

initAuth({
    onUserLoggedIn: async (userData) => {
        loggedInUserRole = userData.role;
        loggedInUserName = userData.name;
        loggedInUserIdGlobal = userData.id;

        // Carrega as permissões ANTES de configurar a UI
        await initPermissoes();
        permissoesDoCargo = getPermissoesParaCargo(loggedInUserRole);

        const loggedInUserNameDisplay = document.getElementById('loggedInUserNameDisplay');
        if (loggedInUserNameDisplay) {
            loggedInUserNameDisplay.textContent = `Olá, ${loggedInUserName}`;
        }

        document.body.classList.add('app-visible');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');

        configurarAcessoPorCargo();
        
        // Verifica se o utilizador pode ver a página inicial, caso contrário, redireciona
        const paginaInicial = permissoesDoCargo.includes('telaInicial') ? 'telaInicial' : permissoesDoCargo[0] || null;
        if (paginaInicial) {
            mostrarSecao(paginaInicial, true);
        } else {
            // Caso de um cargo sem nenhuma permissão
            document.getElementById('mainContentArea').innerHTML = '<h2 class="text-center text-xl mt-10">Não tem permissão para aceder a nenhuma página.</h2>';
        }
    },
    onUserLoggedOut: () => {
        document.body.classList.remove('app-visible');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
        document.body.style.paddingTop = '0px';
    },
    onAuthReady: async () => {
        // As dependências que cada módulo precisa
        const commonDeps = {
            getRole: () => loggedInUserRole,
            getUserName: () => loggedInUserName,
            getUserId: () => loggedInUserIdGlobal,
            mostrarSecao,
            setActiveMenuLink,
            atualizarDashboard // Passa a referência da função
        };
        
        // Inicializa todos os módulos de funcionalidade
        await Promise.all([
            initFuncionarios(commonDeps),
            initFornecedores(commonDeps),
            initProdutos(commonDeps),
        ]);
        
        initClientes({ ...commonDeps, getPedidosCache: getPedidos });
        initPedidos({ ...commonDeps, getClientes, getProdutos });
    }
});


// --- LÓGICA DE NAVEGAÇÃO E UI ---

function mostrarSecao(idSecao, isMenuLink = false) { 
    if (!loggedInUserRole) { logout(); return; }

    if (!permissoesDoCargo.includes(idSecao)) {
        console.warn(`Acesso negado à página '${idSecao}' para o cargo '${loggedInUserRole}'.`);
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
        const paginaInicial = permissoesDoCargo[0] || 'telaInicial';
        mostrarSecao(paginaInicial, true);
        return;
    }

    if (idSecao === 'telaInicial') atualizarDashboard();
    
    ajustarPaddingBody();
}

function configurarAcessoPorCargo() {
    // Esconde/Mostra os itens do menu com base nas permissões
    document.querySelectorAll('.exo-menu [data-section-id]').forEach(item => {
        const sectionId = item.dataset.sectionId;
        item.classList.toggle('hidden', !permissoesDoCargo.includes(sectionId));
    });

    // Esconde o dropdown de cadastros se nenhum item filho estiver visível
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

