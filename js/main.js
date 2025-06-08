// js/main.js

/**
 * Ponto de Entrada Principal da Aplicação
 * Orquestra a aplicação, importa e inicializa todos os módulos.
 */

// MÓDULOS ESSENCIAIS
import { initAuth, handleLogin, logout } from 'auth';
import { ajustarPaddingBody, setActiveMenuLink } from 'ui';
import { injectAllTemplates } from 'templates';

// MÓDULOS DE FUNCIONALIDADE
import { init as initClientes, getClientes } from 'clientes';
import { init as initProdutos, getProdutos } from 'produtos';
import { init as initFuncionarios } from 'funcionarios';
import { init as initFornecedores } from 'fornecedores';
import { init as initPedidos, getPedidos } from 'pedidos';
import { init as initPermissoes, getPermissoesParaCargo } from 'permissoes';

// ESTADO GLOBAL DA APLICAÇÃO
let loggedInUserRole = null;
let loggedInUserName = null;
let loggedInUserIdGlobal = null;
let activeSectionId = 'telaInicial';
let permissoesDoCargo = [];

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

injectAllTemplates();

/**
 * Inicia a sessão de um utilizador, configurando a UI e carregando os dados.
 * @param {object} userData - Os dados do utilizador logado.
 */
async function startUserSession(userData) {
    loggedInUserRole = userData.role;
    loggedInUserName = userData.name;
    loggedInUserIdGlobal = userData.id;

    // Carrega as permissões para o cargo do utilizador
    await initPermissoes();
    permissoesDoCargo = getPermissoesParaCargo(loggedInUserRole);

    const loggedInUserNameDisplay = document.getElementById('loggedInUserNameDisplay');
    if (loggedInUserNameDisplay) {
        loggedInUserNameDisplay.textContent = `Olá, ${loggedInUserName}`;
    }

    // Configura a visibilidade da aplicação
    document.body.classList.add('app-visible');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');

    configurarAcessoPorCargo();
    
    // Define a página inicial com base nas permissões
    const paginaInicial = permissoesDoCargo.includes('telaInicial') ? 'telaInicial' : permissoesDoCargo[0] || null;
    if (paginaInicial) {
        mostrarSecao(paginaInicial, true);
    } else {
        document.getElementById('mainContentArea').innerHTML = '<h2 class="text-center text-xl mt-10">Não tem permissão para aceder a nenhuma página.</h2>';
    }

    // Inicializa todos os outros módulos que dependem de um utilizador logado
    const commonDeps = {
        getRole: () => loggedInUserRole,
        getUserName: () => loggedInUserName,
        getUserId: () => loggedInUserIdGlobal,
        mostrarSecao,
        setActiveMenuLink,
        atualizarDashboard
    };
    
    await Promise.all([
        initFuncionarios(commonDeps),
        initFornecedores(commonDeps),
        initProdutos(commonDeps),
    ]);
    
    initClientes({ ...commonDeps, getPedidosCache: getPedidos });
    initPedidos({ ...commonDeps, getClientes, getProdutos });
}

initAuth({
    onUserLoggedIn: startUserSession, // Reutiliza a função de início de sessão
    onUserLoggedOut: () => {
        document.body.classList.remove('app-visible');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
        document.body.style.paddingTop = '0px';
    },
    onAuthReady: () => {
        // A lógica principal agora acontece em onUserLoggedIn
        console.log("Autenticação pronta.");
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
        targetSection.classList.toggle('interactive-theme-dashboard', idSecao === 'telaInicial');
        targetSection.classList.toggle('interactive-theme', idSecao !== 'telaInicial');
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
    document.querySelectorAll('.exo-menu [data-section-id]').forEach(item => {
        const sectionId = item.dataset.sectionId;
        item.classList.toggle('hidden', !permissoesDoCargo.includes(sectionId));
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
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = document.getElementById('codigoAcesso').value;
    const userData = await handleLogin(codigo);
    
    if (userData) {
        // Se o login for bem-sucedido, inicia a sessão diretamente
        await startUserSession(userData);
    }
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
window.mostrarSecao = mostrarSecao;
