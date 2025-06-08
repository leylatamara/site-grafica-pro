// js/main.js

/**
 * Ponto de Entrada Principal da Aplicação
 * Orquestra a aplicação, importa e inicializa todos os módulos.
 */

// MÓDULOS ESSENCIAIS
import { initAuth, handleLogin, logout } from './auth.js';
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

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

initAuth({
    onUserLoggedIn: (userData) => {
        loggedInUserRole = userData.role;
        loggedInUserName = userData.name;
        loggedInUserIdGlobal = userData.id;

        const loggedInUserNameDisplay = document.getElementById('loggedInUserNameDisplay');
        if (loggedInUserNameDisplay) {
            loggedInUserNameDisplay.textContent = `Olá, ${loggedInUserName}`;
        }

        document.body.classList.add('app-visible');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');

        configurarAcessoPorCargo(loggedInUserRole);
        mostrarSecao('telaInicial', true);
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
            atualizarDashboard // Passa a referência da função para que os módulos possam chamá-la
        };
        
        // Inicializa todos os módulos de funcionalidade
        // Os módulos sem dependências de dados podem ser inicializados primeiro
        await Promise.all([
            initFuncionarios(commonDeps),
            initFornecedores(commonDeps),
            initProdutos(commonDeps),
        ]);
        
        // Módulos que dependem de outros são inicializados depois
        initClientes({ ...commonDeps, getPedidosCache: getPedidos });

        // O módulo de pedidos é o último, pois pode depender de todos os outros
        initPedidos({
            ...commonDeps,
            getClientes,
            getProdutos
        });
    }
});


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
