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

// Inicialização de serviços
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

// Função para popular conteúdo HTML dinamicamente (para evitar repetição)
function populateHTMLContent() {
    // Conteúdo da Tela Inicial (Dashboard)
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

    // Formulário de Novo Pedido
    getElement('novoPedido').innerHTML = `
        <h2 class="text-xl font-semibold mb-6 pb-4 border-b">Novo Pedido</h2>
        <form id="formNovoPedido" class="space-y-6">
            <input type="hidden" id="editingOrderIdField"> 
            <div><label for="pedidoDataHora" class="label-text">Data e Hora do Pedido:</label><input type="text" id="pedidoDataHora" class="input-field" readonly></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="relative"><label for="pedidoClienteSearch" class="label-text">Cliente:</label><input type="text" id="pedidoClienteSearch" class="input-field" placeholder="Pesquisar cliente..."><input type="hidden" id="pedidoClienteId"><div id="pedidoClienteResultados" class="absolute z-20 w-full border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto hidden"></div><button type="button" onclick="window.abrirModalNovoClienteRapido()" class="mt-2 btn btn-link text-xs">Registar novo cliente</button></div>
                <div><label for="pedidoVendedor" class="label-text">Funcionário (Vendedor):</label><select id="pedidoVendedor" class="input-field"><option value="">Selecione um funcionário</option></select></div>
            </div>
            <div class="pt-5 border-t"><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">Itens do Pedido</h3></div><div id="itensPedidoContainer" class="space-y-4"></div><button type="button" onclick="window.adicionarItemPedidoForm()" class="mt-4 btn btn-outline btn-small text-sm"><i class="fas fa-plus mr-1.5"></i>Adicionar Produto</button></div>
            <div class="pt-5 border-t space-y-4"><div><label for="pedidoDescricaoGeral" class="label-text">Descrição Geral do Pedido:</label><textarea id="pedidoDescricaoGeral" rows="2" class="input-field text-lg font-semibold" placeholder="Ex: Kit Adesivos para Vitrine..."></textarea></div><div><label class="label-text">Preview do Pedido (Opcional):</label><div id="pedidoImageDropArea" class="image-drop-area" onclick="document.getElementById('pedidoImagemFile').click();"><input type="file" accept="image/*" class="hidden" id="pedidoImagemFile" onchange="window.handleImagemFilePedido(event)"><img src="#" alt="Preview do Pedido" id="pedidoImagemPreview" class="hidden preview-image"><span id="pedidoImagemPreviewPlaceholder" class="text-sm"><i class="fas fa-image fa-2x mb-1.5"></i><br>Cole ou clique para carregar imagem</span></div></div></div>
            <div class="pt-5 border-t"><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">Detalhes do Pagamento</h3></div><div id="pagamentosContainer" class="space-y-4"></div><button type="button" onclick="window.adicionarPagamentoForm()" class="mt-4 btn btn-outline btn-small text-sm"><i class="fas fa-dollar-sign mr-1.5"></i>Adicionar Pagamento</button><div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"><div><label class="label-text">Valor Total do Pedido:</label><input type="text" id="pedidoValorTotal" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div><div><label class="label-text">Total Pago:</label><input type="text" id="pedidoTotalPago" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div><div><label class="label-text">Valor Restante:</label><input type="text" id="pedidoValorRestante" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div></div></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t"><div class="grid grid-cols-2 gap-4"><div><label for="pedidoDataEntrega" class="label-text">Data Entrega:</label><input type="date" id="pedidoDataEntrega" class="input-field"></div><div><label for="pedidoHoraEntrega" class="label-text">Hora Entrega:</label><input type="time" id="pedidoHoraEntrega" class="input-field"></div></div><div><label for="pedidoStatus" class="label-text">Estado do Pedido:</label><select id="pedidoStatus" class="input-field"><option value="Aguardando Aprovação">Aguardando Aprovação</option><option value="Em Produção (Arte)">Em Produção (Arte)</option><option value="Em Produção (Impressão)">Em Produção (Impressão)</option><option value="Em Produção (Acabamento)">Em Produção (Acabamento)</option><option value="Pronto para Retirada">Pronto para Retirada</option><option value="Em Rota de Entrega">Em Rota de Entrega</option><option value="Entregue">Entregue</option><option value="Cancelado">Cancelado</option></select></div></div>
            <div class="flex justify-end space-x-3 pt-6 border-t"><button type="button" onclick="window.cancelarNovoPedido()" class="btn btn-secondary">Cancelar</button><button type="submit" class="btn btn-primary"><i class="fas fa-check mr-1.5"></i>Guardar Pedido</button></div>
        </form>`;
    
    // As outras seções podem ser populadas de forma similar...
    // Por simplicidade, o resto das seções será deixado no HTML por enquanto,
    // mas a lógica é a mesma: gerar o HTML via JS para manter o `index.html` limpo.
}

// Construtor de Modais (para não repetir o HTML)
function buildModal(id, title, formContent, formId) {
    const modal = document.createElement('div');
    modal.id = `${id}Overlay`;
    modal.className = 'modal-overlay interactive-theme-modal hidden';
    modal.innerHTML = `
        <div class="modal-content-wrapper max-w-lg">
            <div class="h-2"></div>
            <div class="p-6 relative">
                <button type="button" class="universal-modal-close-x no-print absolute top-4 right-4" onclick="window.fecharModalEspecifico('${id}Overlay')">&times;</button>
                <h3 class="text-lg font-semibold mb-5">${title}</h3>
                <form id="${formId}" class="space-y-4">
                    ${formContent}
                </form>
            </div>
        </div>`;
    getElement('modalContainer').appendChild(modal);
}

// Injeção dos Modais no DOM
function injectModals() {
    buildModal('modalNovoClienteRapido', 'Registo Rápido de Cliente', `
        <div><label for="clienteRapidoNome" class="label-text">Nome:</label><input type="text" id="clienteRapidoNome" class="input-field" required></div>
        <div><label for="clienteRapidoTelefone" class="label-text">Telefone:</label><input type="tel" id="clienteRapidoTelefone" class="input-field"></div>
        <div><label for="clienteRapidoTipo" class="label-text">Tipo de Cliente:</label><select id="clienteRapidoTipo" class="input-field"><option value="final" selected>Cliente Final</option><option value="revenda">Revenda</option></select></div>
        <div class="flex justify-end space-x-2.5 pt-4"><button type="button" onclick="window.fecharModalEspecifico('modalNovoClienteRapidoOverlay')" class="btn btn-secondary">Cancelar</button><button type="submit" class="btn btn-primary">Guardar Cliente</button></div>
    `, 'formNovoClienteRapido');
    
    buildModal('modalEditarCliente', 'Editar Cliente', `
        <input type="hidden" id="clienteIdParaEditar">
        <div><label for="clienteNomeEditar" class="label-text">Nome / Razão Social:</label><input type="text" id="clienteNomeEditar" class="input-field" required></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label for="clienteTipoEditar" class="label-text">Tipo:</label><select id="clienteTipoEditar" class="input-field"><option value="final">Final</option><option value="revenda">Revenda</option></select></div><div><label for="clienteTelefoneEditar" class="label-text">Telefone:</label><input type="tel" id="clienteTelefoneEditar" class="input-field"></div></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label for="clienteEmailEditar" class="label-text">Email:</label><input type="email" id="clienteEmailEditar" class="input-field"></div><div><label for="clienteCpfCnpjEditar" class="label-text">CPF/CNPJ:</label><input type="text" id="clienteCpfCnpjEditar" class="input-field"></div></div>
        <div><label for="clienteEnderecoEditar" class="label-text">Endereço:</label><input type="text" id="clienteEnderecoEditar" class="input-field"></div>
        <div class="flex justify-end space-x-3 pt-4"><button type="button" onclick="window.fecharModalEspecifico('modalEditarClienteOverlay')" class="btn btn-secondary">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
    `, 'formEditarCliente');

    // ... e assim por diante para todos os outros modais ...
}

// --- Funções de Inicialização e Autenticação ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid; 
        
        // Injetar HTML dinâmico
        populateHTMLContent();
        injectModals();

        await criarDadosIniciaisSeNaoExistirem(); 
        await Promise.all([ carregarClientes(), carregarProdutos(), carregarFuncionarios(), carregarFornecedores() ]);
        carregarTodosPedidos(); 
        
        const storedRole = localStorage.getItem('loggedInUserRole');
        const storedName = localStorage.getItem('loggedInUserName');
        const storedId = localStorage.getItem('loggedInUserId');

        if (storedRole && storedName && storedId) {
            loggedInUserRole = storedRole;
            loggedInUserName = storedName;
            loggedInUserIdGlobal = storedId;
            getElement('loggedInUserNameDisplay').textContent = `Olá, ${loggedInUserName}`;
            
            atualizarEstatisticasUsuario();
            document.body.classList.add('app-visible'); 
            getElement('loginScreen').classList.add('hidden');
            getElement('appContainer').classList.remove('hidden');
            configurarAcessoPorCargo(loggedInUserRole);
            setActiveMenuLink('telaInicial');
            mostrarSecao('telaInicial', false); 
            ajustarPaddingBody();
        } else {
            document.body.classList.remove('app-visible');
            getElement('loginScreen').classList.remove('hidden');
            getElement('appContainer').classList.add('hidden');
            document.body.style.paddingTop = '0px'; 
        }

        // Adicionar Listeners de Eventos
        setupEventListeners();

    } else { 
        document.body.classList.remove('app-visible');
        try { await signInAnonymously(auth); } catch (error) { console.error("Erro login anônimo:", error); }
    }
});

function setupEventListeners() {
    getElement('loginForm')?.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(getElement('codigoAcesso').value); });
    getElement('logoutButton')?.addEventListener('click', logout);
    querySel('.exo-menu-container .toggle-menu')?.addEventListener('click', (e) => { e.preventDefault(); querySel('.exo-menu-container .exo-menu').classList.toggle('display'); ajustarPaddingBody(); });
    getElement('pedidoImageDropArea')?.addEventListener('paste', handlePasteImagePedido);
    getElement('pesquisaClienteInput')?.addEventListener('input', renderizarListaClientes);

    // Adicionar listeners para os formulários de edição
    getElement('formEditarCliente')?.addEventListener('submit', handleSalvarEdicaoCliente);
    // ... adicione os outros aqui
}
//... (O restante do código JavaScript seria inserido aqui)
//... (As funções como handleLogin, logout, renderizarListas, modais, etc., permanecem as mesmas)
//... (É crucial garantir que todas as funções chamadas por `onclick` agora sejam exportadas para o escopo global ou adicionadas com `addEventListener`)
// Exemplo:
window.mostrarSecao = mostrarSecao;
window.cancelarNovoPedido = () => {
    mostrarSecao('telaInicial', true);
    getElement('editingOrderIdField').value = '';
    querySel('#formNovoPedido button[type=\'submit\']').innerHTML = '<i class=\'fas fa-check mr-1.5\'></i>Guardar Pedido';
};

//... (todo o resto do seu código JS aqui)