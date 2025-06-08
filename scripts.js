import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDocs, query, limit, onSnapshot, Timestamp, writeBatch, deleteDoc, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDOg6A8HFA_JCP_4iS7JcRCTRgdnzcP4Xk",
    authDomain: "sistema-grafica-pro.firebaseapp.com",
    projectId: "sistema-grafica-pro",
    storageBucket: "sistema-grafica-pro.firebasestorage.app",
    messagingSenderId: "1043193530848",
    appId: "1:1043193530848:web:b0effc9640a2e8ed6f8385"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const shopInstanceAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Variáveis de estado globais
let userId = null, produtosCache = [], pedidoImagemBase64 = null, todosOsPedidosCache = [], clientesCache = [], fornecedoresCache = [], funcionariosCache = [];
let itemPedidoCount = 0, pagamentoCount = 0, clienteSelecionadoId = null, editingOrderId = null, loggedInUserRole = null, loggedInUserName = null, loggedInUserIdGlobal = null; 
let notificationTimeout;
let activeSectionId = 'telaInicial';

// --- Funções Auxiliares ---
const getElement = (id) => document.getElementById(id);
const querySel = (selector) => document.querySelector(selector);
const querySelAll = (selector) => document.querySelectorAll(selector);

// --- Funções de Templates HTML ---
function populateInitialHTML() {
    getElement('loginScreen').innerHTML = `
        <div class="login-card">
            <img src="https://placehold.co/150x60/0ea5e9/FFFFFF?text=SuaGraficaPRO&font=poppins" alt="Logo Gráfica PRO">
            <h2 class="login-title">Acesso ao Sistema</h2>
            <p class="login-subtitle">Insira o seu código de funcionário para continuar.</p>
            <form id="loginForm">
                <input type="password" id="codigoAcesso" placeholder="Código de Acesso" required>
                <button type="submit" class="login-button">Entrar</button>
            </form>
            <p id="loginErrorMessage" class="hidden"></p>
        </div>`;
    
    getElement('appContainer').innerHTML = `
        <header class="exo-menu-container">
            <div class="header-top-row">
                <div class="logo-area"><img src="https://placehold.co/120x32/ffffff/1e293b?text=SuaLogo&font=poppins" alt="Logo Gráfica" class="h-6 sm:h-8"></div>
                <h1 class="site-title text-lg sm:text-xl">Sistema de Gestão PRO</h1>
                <div class="actions-area"><button id="logoutButton" class="text-xs py-1.5 px-3 rounded"><i class="fas fa-sign-out-alt mr-1.5"></i>Sair</button></div>
            </div>
            <div class="user-info-bar">
                <span id="loggedInUserNameDisplay" class="font-semibold"></span>
                <div class="user-stats">
                    <span>Pedidos Mês: <strong id="userPedidosMes">0</strong></span>
                    <span>Em Finalização: <strong id="userPedidosFinalizacao">0</strong></span>
                    <span>Finalizados: <strong id="userPedidosFinalizados">0</strong></span>
                </div>
            </div>
            <nav class="menu-bar-wrapper"> 
                <ul class="exo-menu clearfix">
                    <li data-role-access="all"><a href="#" data-section="telaInicial"><span class="icon"><i class="fa fa-home"></i></span>Home</a></li>
                    <li data-role-access="admin,vendedor"><a href="#" data-section="novoPedido"><span class="icon"><i class="fa fa-plus"></i></span>Novo Pedido</a></li>
                    <li class="drop-down" data-role-access="admin,vendedor,designer,impressor,producao" id="dropdownCadastrosMenu">
                        <a href="#"><span class="icon"><i class="fa fa-archive"></i></span>Cadastros<span class="arrow">&#9662;</span></a>
                        <ul class="drop-down-ul">
                            <li data-role-access="admin,vendedor"><a href="#" data-section="cadastrarCliente"><span class="icon"><i class="fa fa-users"></i></span>Clientes</a></li>
                            <li data-role-access="admin,designer"><a href="#" data-section="cadastrarProduto"><span class="icon"><i class="fa fa-box"></i></span>Produtos</a></li>
                            <li data-role-access="admin"><a href="#" data-section="cadastrarFuncionario"><span class="icon"><i class="fa fa-user-tie"></i></span>Funcionários</a></li>
                            <li data-role-access="admin"><a href="#" data-section="cadastrarFornecedor"><span class="icon"><i class="fa fa-truck"></i></span>Fornecedores</a></li>
                        </ul>
                    </li>
                    <li data-role-access="all"><a href="#" data-section="visualizarPedidos"><span class="icon"><i class="fa fa-list-alt"></i></span>Pedidos</a></li>
                </ul>
                <a href="#" class="toggle-menu"><i class="fas fa-bars"></i></a>
            </nav>
        </header>
        <div class="main-layout">
            <main id="mainContentArea" class="content-area w-full">
                <section id="telaInicial" class="main-content-section max-w-7xl mx-auto"></section>
                <section id="novoPedido" class="main-content-section interactive-theme hidden max-w-3xl mx-auto"></section>
                <section id="cadastrarCliente" class="main-content-section interactive-theme hidden"></section>
                <section id="cadastrarProduto" class="main-content-section interactive-theme hidden"></section>
                <section id="cadastrarFuncionario" class="main-content-section interactive-theme hidden"></section>
                <section id="cadastrarFornecedor" class="main-content-section interactive-theme hidden"></section>
                <section id="visualizarPedidos" class="main-content-section interactive-theme hidden"></section>
            </main>
        </div>
        <footer class="site-footer"><p>Sistema de Gestão PRO para Gráficas.</p><p><strong>Criado por: Jeffweb3</strong></p></footer>`;
}

function populateSectionHTML() {
    getElement('telaInicial').innerHTML = `
        <div class="dashboard-header"><h1>Painel de Controlo</h1></div>
        <div class="summary-cards">
            <div class="metric-card-dashboard card"><div class="card-header"><span class="icon-wrapper-dashboard icon"><i class="fas fa-calendar-day"></i></span><h3 class="metric-label-dashboard card-title">Pedidos Hoje</h3></div><p id="metricPedidosHoje" class="metric-value-dashboard card-value">0</p></div>
            <div class="metric-card-dashboard card"><div class="card-header"><span class="icon-wrapper-dashboard icon"><i class="fas fa-hourglass-half"></i></span><h3 class="metric-label-dashboard card-title">Pendentes</h3></div><p id="metricPedidosPendentes" class="metric-value-dashboard card-value">0</p></div>
            <div class="metric-card-dashboard card"><div class="card-header"><span class="icon-wrapper-dashboard icon"><i class="fas fa-dollar-sign"></i></span><h3 class="metric-label-dashboard card-title">Faturamento Mês</h3></div><p id="metricFaturamentoMes" class="metric-value-dashboard card-value currency">R$0,00</p></div>
            <div class="metric-card-dashboard card"><div class="card-header"><span class="icon-wrapper-dashboard icon"><i class="fas fa-users"></i></span><h3 class="metric-label-dashboard card-title">Total Clientes</h3></div><p id="metricTotalClientes" class="metric-value-dashboard card-value">0</p></div>
        </div>
        <div class="material-table-card recent-orders">
            <div class="material-table-header recent-orders-header"><h2>Últimos Pedidos</h2><button onclick="window.mostrarSecao('visualizarPedidos', true)" class="btn btn-primary btn-view-all text-xs py-2 px-3"><i class="fas fa-list-ul mr-2"></i>Ver Todos</button></div>
            <div class="material-table-container orders-table-wrapper"><table class="material-data-table orders-table"><thead><tr><th>Nº Pedido</th><th>Cliente</th><th>Data</th><th>Valor</th><th>Estado</th><th>Ações</th></tr></thead><tbody id="ultimosPedidosTableBody"></tbody></table></div>
        </div>`;
    
    getElement('novoPedido').innerHTML = `
        <h2 class="text-xl font-semibold mb-6 pb-4 border-b">Novo Pedido</h2>
        <form id="formNovoPedido" class="space-y-6">
            <input type="hidden" id="editingOrderIdField"> 
            <div><label for="pedidoDataHora" class="label-text">Data e Hora:</label><input type="text" id="pedidoDataHora" class="input-field" readonly></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="relative"><label for="pedidoClienteSearch" class="label-text">Cliente:</label><input type="text" id="pedidoClienteSearch" class="input-field" placeholder="Pesquisar cliente..."><input type="hidden" id="pedidoClienteId"><div id="pedidoClienteResultados" class="absolute z-20 w-full border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto hidden"></div><button type="button" class="mt-2 btn btn-link text-xs">Registar novo cliente</button></div>
                <div><label for="pedidoVendedor" class="label-text">Funcionário (Vendedor):</label><select id="pedidoVendedor" class="input-field"><option value="">Selecione...</option></select></div>
            </div>
            <div class="pt-5 border-t"><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">Itens do Pedido</h3></div><div id="itensPedidoContainer" class="space-y-4"></div><button type="button" id="addItemBtn" class="mt-4 btn btn-outline btn-small text-sm"><i class="fas fa-plus mr-1.5"></i>Adicionar Produto</button></div>
            <div class="pt-5 border-t space-y-4"><div><label for="pedidoDescricaoGeral" class="label-text">Descrição Geral:</label><textarea id="pedidoDescricaoGeral" rows="2" class="input-field text-lg font-semibold" placeholder="Ex: Kit Adesivos..."></textarea></div><div><label class="label-text">Preview (Opcional):</label><div id="pedidoImageDropArea" class="image-drop-area"><input type="file" accept="image/*" class="hidden" id="pedidoImagemFile"><img src="#" alt="Preview" id="pedidoImagemPreview" class="hidden preview-image"><span id="pedidoImagemPreviewPlaceholder" class="text-sm"><i class="fas fa-image fa-2x mb-1.5"></i><br>Cole ou carregue uma imagem</span></div></div></div>
            <div class="pt-5 border-t"><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">Pagamento</h3></div><div id="pagamentosContainer" class="space-y-4"></div><button type="button" id="addPagamentoBtn" class="mt-4 btn btn-outline btn-small text-sm"><i class="fas fa-dollar-sign mr-1.5"></i>Adicionar Pagamento</button><div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"><div><label class="label-text">Total Pedido:</label><input type="text" id="pedidoValorTotal" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div><div><label class="label-text">Total Pago:</label><input type="text" id="pedidoTotalPago" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div><div><label class="label-text">Restante:</label><input type="text" id="pedidoValorRestante" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div></div></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t"><div class="grid grid-cols-2 gap-4"><div><label for="pedidoDataEntrega" class="label-text">Data Entrega:</label><input type="date" id="pedidoDataEntrega" class="input-field"></div><div><label for="pedidoHoraEntrega" class="label-text">Hora Entrega:</label><input type="time" id="pedidoHoraEntrega" class="input-field"></div></div><div><label for="pedidoStatus" class="label-text">Estado:</label><select id="pedidoStatus" class="input-field"><option>Aguardando Aprovação</option><option>Em Produção (Arte)</option><option>Em Produção (Impressão)</option><option>Em Produção (Acabamento)</option><option>Pronto para Retirada</option><option>Em Rota de Entrega</option><option>Entregue</option><option>Cancelado</option></select></div></div>
            <div class="flex justify-end space-x-3 pt-6 border-t"><button type="button" id="cancelarPedidoBtn" class="btn btn-secondary">Cancelar</button><button type="submit" class="btn btn-primary"><i class="fas fa-check mr-1.5"></i>Guardar Pedido</button></div>
        </form>`;

    getElement('cadastrarCliente').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1"><h2 class="text-xl font-semibold mb-5">Registar Cliente</h2><form id="formCadastrarCliente" class="space-y-4">...</form></div>
            <div class="lg:col-span-2 mt-6 lg:mt-0"><h3 class="text-lg font-semibold mb-1">Clientes Registados</h3><div class="relative"><i class="fas fa-search absolute top-1/2 left-3.5 transform -translate-y-1/2 text-gray-400"></i><input type="text" id="pesquisaClienteInput" class="input-field w-full pl-10" placeholder="Pesquisar cliente..."></div><div id="listaClientes" class="space-y-2.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-1 mt-3"></div><div id="detalhesClienteSelecionado" class="mt-6 hidden"><h4 class="text-md font-semibold mb-2 border-t pt-4">Detalhes do Cliente</h4><div id="infoCliente" class="p-3 border rounded-md mb-4 text-sm space-y-1"></div><h4 class="text-md font-semibold mb-2">Pedidos do Cliente</h4><div id="pedidosDoClienteLista" class="space-y-2.5 max-h-48 overflow-y-auto pr-1 border rounded-md p-2"></div></div></div>
        </div>`;
    // ... e assim para as outras seções...
}

function injectModals() {
    // ... (função buildModal como na resposta anterior)
}

// --- Funções de Inicialização e Autenticação ---
// ... (código onAuthStateChanged como na resposta anterior, chamando populateInitialHTML e injectModals)

function setupEventListeners() {
    document.body.addEventListener('click', (e) => {
        // Menu de navegação
        if (e.target.closest('a[data-section]')) {
            e.preventDefault();
            mostrarSecao(e.target.closest('a[data-section]').dataset.section, true);
        }
        // Botão de toggle do menu mobile
        if (e.target.closest('.toggle-menu')) {
            e.preventDefault();
            querySel('.exo-menu-container .exo-menu').classList.toggle('display');
            ajustarPaddingBody();
        }
    });

    // Forms
    getElement('loginForm')?.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(getElement('codigoAcesso').value); });
    getElement('logoutButton')?.addEventListener('click', logout);
    
    // Listeners de forms que são populados dinamicamente
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'formNovoPedido') handleFormSubmit(e, 'pedido');
        if (e.target.id === 'formCadastrarCliente') handleFormSubmit(e, 'cliente');
        // ... etc para outros forms
    });
}

async function handleLogin(codigo) { /* ... */ }
function logout() { /* ... */ }

// ... (Resto do código JS, completo, como estava na versão original)
