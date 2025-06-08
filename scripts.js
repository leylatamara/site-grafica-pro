import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDocs, 
    query, 
    limit,
    onSnapshot, 
    Timestamp,
    writeBatch,
    deleteDoc, 
    setDoc,
    updateDoc, 
    where,
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

async function criarDadosIniciaisSeNaoExistirem() {
    if (!auth.currentUser) { return; }
    const clientesPath = `artifacts/${shopInstanceAppId}/clientes`;
    let clientesSnapshot = await getDocs(query(collection(db, clientesPath), limit(1)));
    if (clientesSnapshot.empty) {
        const clientesAmostra = [
            { nome: "Carlos Silva", tipoCliente: "final", telefone: "(11) 98765-4321", email: "carlos.silva@example.com", cpfCnpj: "123.456.789-00", endereco: "Rua das Palmeiras, 123", criadoEm: Timestamp.now() },
            { nome: "Padaria Pão Quente Ltda", tipoCliente: "revenda", telefone: "(21) 91234-5678", email: "contato@paoquente.com.br", cpfCnpj: "12.345.678/0001-99", endereco: "Av. Central, 456", criadoEm: Timestamp.now() }
        ];
        const batchClientes = writeBatch(db);
        clientesAmostra.forEach(cliente => { batchClientes.set(doc(collection(db, clientesPath)), cliente); });
        await batchClientes.commit();
    }
    const produtosPath = `artifacts/${shopInstanceAppId}/produtos`;
    let produtosSnapshot = await getDocs(query(collection(db, produtosPath), limit(1)));
    if (produtosSnapshot.empty) {
        const produtosAmostra = [
            { nome: "Banner Lona Fosca 440g", tipoPreco: "metro", precoMetro: 55.00, precoUnidade: 0, descricao: "Banner em lona fosca.", criadoEm: Timestamp.now() },
            { nome: "Cartão de Visita Couchê 300g (Milheiro)", tipoPreco: "unidade", precoUnidade: 120.00, precoMetro: 0, descricao: "Milheiro de cartões.", criadoEm: Timestamp.now() },
            { nome: "Adesivo Vinil Recorte", tipoPreco: "metro", precoMetro: 70.00, precoUnidade: 0, descricao: "Adesivo com recorte.", criadoEm: Timestamp.now() }
        ];
        const batchProdutos = writeBatch(db);
        produtosAmostra.forEach(produto => { batchProdutos.set(doc(collection(db, produtosPath)), produto); });
        await batchProdutos.commit();
    }
    const funcionariosPath = `artifacts/${shopInstanceAppId}/funcionarios`; 
    let funcionariosSnapshot = await getDocs(query(collection(db, funcionariosPath), limit(1)));
    if (funcionariosSnapshot.empty) {
        const batchFuncionarios = writeBatch(db);
        batchFuncionarios.set(doc(collection(db, funcionariosPath)), { nome: "Admin Master", contato: "admin@grafica.com", cargo: "admin", codigoAcesso: "010101", criadoEm: Timestamp.now() });
        batchFuncionarios.set(doc(collection(db, funcionariosPath)), { nome: "Vendedor Padrão", contato: "vendedor@grafica.com", cargo: "vendedor", codigoAcesso: "111111", criadoEm: Timestamp.now() });
        batchFuncionarios.set(doc(collection(db, funcionariosPath)), { nome: "Impressor Teste", contato: "impressor@grafica.com", cargo: "impressor", codigoAcesso: "222222", criadoEm: Timestamp.now() });
        batchFuncionarios.set(doc(collection(db, funcionariosPath)), { nome: "Produção Teste", contato: "producao@grafica.com", cargo: "producao", codigoAcesso: "333333", criadoEm: Timestamp.now() });
        await batchFuncionarios.commit();
    }
    const fornecedoresPath = `artifacts/${shopInstanceAppId}/fornecedores`;
    let fornecedoresSnapshot = await getDocs(query(collection(db, fornecedoresPath), limit(1)));
    if (fornecedoresSnapshot.empty) {
        const fornecedoresAmostra = [
            { nome: "Fornecedor de Lonas ABC", contato: "vendas@lonasabc.com", tipoMaterial: "Lonas e Vinis", criadoEm: Timestamp.now() },
            { nome: "Papelaria Central", contato: "(11) 3333-4444", tipoMaterial: "Papéis Especiais", criadoEm: Timestamp.now() }
        ];
        const batchFornecedores = writeBatch(db);
        fornecedoresAmostra.forEach(fornecedor => { batchFornecedores.set(doc(collection(db, fornecedoresPath)), fornecedor); });
        await batchFornecedores.commit();
    }
    const pedidosPath = `artifacts/${shopInstanceAppId}/pedidos`;
    const pedidosQuery = query(collection(db, pedidosPath), limit(1));
    const pedidosSnapshot = await getDocs(pedidosQuery);
    const clientesAtualizadosSnapshot = await getDocs(collection(db, `artifacts/${shopInstanceAppId}/clientes`));
    let tempClientesCache = [];
    clientesAtualizadosSnapshot.forEach(doc => tempClientesCache.push({ id: doc.id, ...doc.data() }));
    const produtosAtualizadosSnapshot = await getDocs(collection(db, `artifacts/${shopInstanceAppId}/produtos`));
    let tempProdutosCache = [];
    produtosAtualizadosSnapshot.forEach(doc => tempProdutosCache.push({ id: doc.id, ...doc.data() }));
    const funcionariosAtualizadosSnapshot = await getDocs(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`));
    let tempFuncionariosCache = [];
    funcionariosAtualizadosSnapshot.forEach(doc => tempFuncionariosCache.push({ id: doc.id, ...doc.data() }));

    if (pedidosSnapshot.empty && tempClientesCache.length > 0 && tempProdutosCache.length > 0 && tempFuncionariosCache.length > 0) {
        const batchPedidos = writeBatch(db);
        const statusPossiveis = ["Aguardando Aprovação", "Em Produção (Arte)", "Em Produção (Impressão)", "Pronto para Retirada", "Entregue", "Cancelado"];
        const formasPagamentoPossiveis = ["Dinheiro", "Cartão de Crédito", "PIX", "Pendente"];
        for (let i = 0; i < 20; i++) {
            const clienteAleatorio = tempClientesCache[Math.floor(Math.random() * tempClientesCache.length)];
            const funcionarioAleatorio = tempFuncionariosCache[Math.floor(Math.random() * tempFuncionariosCache.length)]; 
            const dataPedido = new Date(); dataPedido.setDate(dataPedido.getDate() - Math.floor(Math.random() * 30)); 
            const dataEntrega = new Date(dataPedido); dataEntrega.setDate(dataPedido.getDate() + Math.floor(Math.random() * 7) + 1); 
            const itensPedidoExemplo = []; let valorTotalPedidoExemplo = 0;
            const numItens = Math.floor(Math.random() * 3) + 1; 
            for (let j = 0; j < numItens; j++) {
                const produtoAleatorio = tempProdutosCache[Math.floor(Math.random() * tempProdutosCache.length)];
                const quantidade = Math.floor(Math.random() * 5) + 1; let valorItem = 0; let largura = null, altura = null;
                if (produtoAleatorio.tipoPreco === 'metro') {
                    largura = parseFloat((Math.random() * 2 + 0.5).toFixed(2)); altura = parseFloat((Math.random() * 2 + 0.5).toFixed(2));  
                    valorItem = largura * altura * (produtoAleatorio.precoMetro || 0) * quantidade;
                } else { valorItem = (produtoAleatorio.precoUnidade || 0) * quantidade; }
                itensPedidoExemplo.push({ produtoId: produtoAleatorio.id, produtoNome: produtoAleatorio.nome, tipoProduto: produtoAleatorio.tipoPreco, quantidade, largura, altura, valorItem, productionSteps: { impressao: { concluido: false }, acabamento: { concluido: false } } });
                valorTotalPedidoExemplo += valorItem;
            }
            const pagamentosExemplo = []; const numPagamentos = Math.random() > 0.6 ? 2 : 1; let valorPagoTotalExemplo = 0;
            if (numPagamentos === 1) {
                pagamentosExemplo.push({ forma: formasPagamentoPossiveis[Math.floor(Math.random() * formasPagamentoPossiveis.length)], valorPago: valorTotalPedidoExemplo, observacao: "Pagamento integral", dataPagamento: Timestamp.fromDate(dataPedido) });
                valorPagoTotalExemplo = valorTotalPedidoExemplo;
            } else {
                const valorMetade = parseFloat((valorTotalPedidoExemplo / 2).toFixed(2));
                pagamentosExemplo.push({ forma: formasPagamentoPossiveis[Math.floor(Math.random() * formasPagamentoPossiveis.length)], valorPago: valorMetade, observacao: "50% de entrada", dataPagamento: Timestamp.fromDate(dataPedido) });
                valorPagoTotalExemplo += valorMetade;
                const formaSegundoPagamento = formasPagamentoPossiveis[Math.floor(Math.random() * formasPagamentoPossiveis.length)];
                if (formaSegundoPagamento !== "Pendente") {
                     pagamentosExemplo.push({ forma: formaSegundoPagamento, valorPago: valorTotalPedidoExemplo - valorMetade, observacao: "Restante", dataPagamento: Timestamp.fromDate(dataEntrega) });
                    valorPagoTotalExemplo += (valorTotalPedidoExemplo - valorMetade);
                } else { pagamentosExemplo.push({ forma: "Pendente", valorPago: 0, observacao: "Restante pendente", dataPagamento: null }); }
            }
            const novoPedidoExemplo = { clienteId: clienteAleatorio.id, clienteNome: clienteAleatorio.nome, vendedorId: funcionarioAleatorio.id, vendedorNome: funcionarioAleatorio.nome, pagamentos: pagamentosExemplo, dataEntrega: Timestamp.fromDate(dataEntrega), status: statusPossiveis[Math.floor(Math.random() * statusPossiveis.length)], valorTotal: valorTotalPedidoExemplo, itens: itensPedidoExemplo, imagemPreviewPedidoBase64: null, descricaoGeral: `Pedido de teste ${i+1}`, dataPedido: Timestamp.fromDate(dataPedido), numeroPedido: `PED-EX${Date.now().toString().slice(-5) + i}` };
            batchPedidos.set(doc(collection(db, pedidosPath)), novoPedidoExemplo);
        }
        await batchPedidos.commit();
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid; 
        await criarDadosIniciaisSeNaoExistirem(); 
        await Promise.all([ carregarClientes(), carregarProdutos(), carregarFuncionarios(), carregarFornecedores() ]);
        carregarTodosPedidos(); 
        
        document.getElementById('loginForm')?.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(document.getElementById('codigoAcesso').value); });
        document.getElementById('logoutButton')?.addEventListener('click', logout);

        const dropdowns = document.querySelectorAll('.exo-menu-container .menu-bar-wrapper li.drop-down');
        dropdowns.forEach(dropdown => {
            const link = dropdown.querySelector('a');
            const submenu = dropdown.querySelector('.drop-down-ul');
            if(link && submenu){
                link.addEventListener('click', function(event) {
                    if (window.innerWidth <= 768) { 
                        event.preventDefault();
                        dropdown.classList.toggle('open');
                    }
                });
            }
        });
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768) {
                dropdowns.forEach(dropdown => {
                    if (!dropdown.contains(event.target) && dropdown.classList.contains('open')) {
                        dropdown.classList.remove('open');
                    }
                });
            }
        });

        const storedRole = localStorage.getItem('loggedInUserRole');
        const storedName = localStorage.getItem('loggedInUserName');
        const storedId = localStorage.getItem('loggedInUserId');

        if (storedRole && storedName && storedId) {
            loggedInUserRole = storedRole;
            loggedInUserName = storedName;
            loggedInUserIdGlobal = storedId;
            
            const loggedInUserNameDisplay = document.getElementById('loggedInUserNameDisplay');
            if (loggedInUserNameDisplay) { loggedInUserNameDisplay.textContent = `Olá, ${loggedInUserName}`; }
            
            atualizarEstatisticasUsuario();

            document.body.classList.add('app-visible'); 
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appContainer').classList.remove('hidden');
            configurarAcessoPorCargo(loggedInUserRole);
            setActiveMenuLink('telaInicial');
            mostrarSecao('telaInicial', false); 
            ajustarPaddingBody();
        } else {
            document.body.classList.remove('app-visible');
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('appContainer').classList.add('hidden');
            document.body.style.paddingTop = '0px'; 
        }
        
        document.getElementById('pedidoImageDropArea')?.addEventListener('paste', handlePasteImagePedido);
        document.getElementById('pesquisaClienteInput')?.addEventListener('input', () => renderizarListaClientes());
        
        const toggleMenuBtn = document.querySelector('.exo-menu-container .toggle-menu');
        const exoMenuEl = document.querySelector('.exo-menu-container .exo-menu');
        if (toggleMenuBtn && exoMenuEl) {
            toggleMenuBtn.addEventListener('click', (e) => { 
                e.preventDefault(); 
                exoMenuEl.classList.toggle('display'); 
                ajustarPaddingBody(); 
            });
        }

        document.getElementById('formCadastrarCliente')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('formNovoPedido')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('formCadastrarProduto')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('formCadastrarFuncionario')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('formCadastrarFornecedor')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('formNovoClienteRapido')?.addEventListener('submit', handleFormSubmit);

        document.getElementById('formEditarCliente')?.addEventListener('submit', handleSalvarEdicaoCliente);
        document.getElementById('formEditarProduto')?.addEventListener('submit', handleSalvarEdicaoProduto);
        document.getElementById('formEditarFuncionario')?.addEventListener('submit', handleSalvarEdicaoFuncionario);
        document.getElementById('formEditarFornecedor')?.addEventListener('submit', handleSalvarEdicaoFornecedor);
        document.getElementById('formMudarStatus')?.addEventListener('submit', handleSalvarNovoStatus);

        ['filtroNomeCliente', 'filtroNumeroPedido', 'filtroMaterialProduto'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', renderizarListaCompletaPedidos);
        });
        ['filtroDataPedido', 'filtroStatusPedido', 'filtroClassificacaoPedido', 'filtroVendedor'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', renderizarListaCompletaPedidos);
        });

        document.getElementById('limparFiltrosPedidos')?.addEventListener('click', () => {
            ['filtroNomeCliente', 'filtroNumeroPedido', 'filtroDataPedido', 'filtroMaterialProduto', 'filtroStatusPedido', 'filtroVendedor'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            const classificacaoEl = document.getElementById('filtroClassificacaoPedido');
            if(classificacaoEl) classificacaoEl.value = 'dataPedido_desc';
            renderizarListaCompletaPedidos(); 
        });

    } else { 
        document.body.classList.remove('app-visible');
        try { await signInAnonymously(auth); } catch (error) { console.error("Erro login anônimo:", error); exibirMensagem("Erro autenticação.", "error");}
    }
});

async function handleLogin(codigoAcesso) {
    try {
        // Limpar dados antigos do localStorage
        localStorage.removeItem('loggedInUserRole');
        localStorage.removeItem('loggedInUserName');
        localStorage.removeItem('loggedInUserId');
        
        const funcionariosRef = collection(db, `artifacts/${shopInstanceAppId}/funcionarios`);
        const q = query(funcionariosRef, where('codigoAcesso', '==', codigoAcesso));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            exibirMensagem('Código de acesso inválido.', 'error');
            return;
        }
        
        const funcionarioDoc = querySnapshot.docs[0];
        const funcionarioData = funcionarioDoc.data();
        
        loggedInUserRole = funcionarioData.cargo;
        loggedInUserName = funcionarioData.nome;
        loggedInUserIdGlobal = funcionarioDoc.id;
        
        localStorage.setItem('loggedInUserRole', loggedInUserRole);
        localStorage.setItem('loggedInUserName', loggedInUserName);
        localStorage.setItem('loggedInUserId', loggedInUserIdGlobal);
        
        console.log('Login bem-sucedido. Cargo:', loggedInUserRole);
        
        // Inicializar permissões se for admin
        if (loggedInUserRole === 'admin') {
            await inicializarPermissoes();
        }
        
        configurarAcessoPorCargo(loggedInUserRole);
        mostrarSecao('telaInicial', true);
        exibirMensagem('Login realizado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro no login:', error);
        exibirMensagem('Erro ao realizar login. Por favor, tente novamente.', 'error');
    }
}

function logout() {
    loggedInUserRole = null;
    loggedInUserName = null;
    loggedInUserIdGlobal = null;
    localStorage.removeItem('loggedInUserRole');
    localStorage.removeItem('loggedInUserName');
    localStorage.removeItem('loggedInUserId');
    mostrarSecao('loginScreen', true);
}

function atualizarEstatisticasUsuario() {
    if (!loggedInUserIdGlobal || !todosOsPedidosCache) {
        document.getElementById('userPedidosMes').textContent = '0';
        document.getElementById('userPedidosFinalizacao').textContent = '0';
        document.getElementById('userPedidosFinalizados').textContent = '0';
        return;
    }

    let pedidosFiltrados = todosOsPedidosCache;
    // Admin vê todos os pedidos, outros cargos veem apenas os seus.
    if (loggedInUserRole !== 'admin') {
        pedidosFiltrados = todosOsPedidosCache.filter(p => p.vendedorId === loggedInUserIdGlobal);
    }
    
    const agora = new Date();
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const pedidosEsteMes = pedidosFiltrados.filter(p => {
        if (!p.dataPedido || typeof p.dataPedido.toDate !== 'function') return false;
        const dataPedido = p.dataPedido.toDate();
        return dataPedido >= inicioDoMes;
    });

    const statusEmFinalizacao = [ "Aguardando Aprovação", "Em Produção (Arte)", "Em Produção (Impressão)", "Em Produção (Acabamento)", "Pronto para Retirada", "Em Rota de Entrega" ];
    const pedidosEmFinalizacao = pedidosFiltrados.filter(p => statusEmFinalizacao.includes(p.status));
    const pedidosFinalizados = pedidosFiltrados.filter(p => p.status === 'Entregue');

    document.getElementById('userPedidosMes').textContent = pedidosEsteMes.length;
    document.getElementById('userPedidosFinalizacao').textContent = pedidosEmFinalizacao.length;
    document.getElementById('userPedidosFinalizados').textContent = pedidosFinalizados.length;
}

function configurarAcessoPorCargo(role) {
    document.querySelectorAll('[data-role-access]').forEach(item => {
        const acessoPermitido = item.dataset.roleAccess;
        if (acessoPermitido) { item.classList.toggle('hidden', !(acessoPermitido === "all" || (role && acessoPermitido.includes(role)))); }
    });
    const cadastrosDropdown = document.getElementById('dropdownCadastrosMenu'); 
    if (cadastrosDropdown) {
        const subItensVisiveis = cadastrosDropdown.querySelectorAll('ul.drop-down-ul > li:not(.hidden)');
        cadastrosDropdown.classList.toggle('hidden', subItensVisiveis.length === 0);
    }
    const filtroStatusPedidoEl = document.getElementById('filtroStatusPedido');
    if (filtroStatusPedidoEl) {
        if (role === 'impressor') filtroStatusPedidoEl.value = 'Em Produção (Impressão)';
        else if (role === 'producao') filtroStatusPedidoEl.value = 'Em Produção (Acabamento)';
        else if (!filtroStatusPedidoEl.dataset.userChanged) { filtroStatusPedidoEl.value = ''; }
    }
    if (activeSectionId === 'visualizarPedidos') renderizarListaCompletaPedidos();
}

function ajustarPaddingBody() {
    const menuGlobalContainer = document.querySelector('.exo-menu-container'); 
    const bodyEl = document.body;
    let totalOffset = menuGlobalContainer?.offsetHeight || 0;
    const notificationBar = document.getElementById('notificationBar');
    if (notificationBar?.classList.contains('visible')) { totalOffset += notificationBar.offsetHeight; }
    bodyEl.style.paddingTop = totalOffset + 'px';
}
window.addEventListener('resize', ajustarPaddingBody); 

// MutationObserver para ajustar o padding quando o menu mobile é aberto/fechado
const menuObserver = new MutationObserver(ajustarPaddingBody);
const exoMenu = document.querySelector('.exo-menu-container .exo-menu');
if (exoMenu) {
    menuObserver.observe(exoMenu, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
}


function setActiveMenuLink(targetSectionId) { 
    document.querySelectorAll('.exo-menu a[data-section]').forEach(link => { 
        link.classList.remove('active');
        if (link.dataset.section === targetSectionId) {
            link.classList.add('active');
            const parentLi = link.closest('li.drop-down');
            if (parentLi) { parentLi.querySelector('a:first-child').classList.add('active'); }
        }
    });
}

async function mostrarSecao(idSecao, isMenuLink = false) { 
    if (!loggedInUserRole && idSecao !== 'loginScreen') { 
        console.log('Usuário não está logado, redirecionando para login');
        logout(); 
        return; 
    }
    
    console.log('Tentando mostrar seção:', idSecao, 'Cargo do usuário:', loggedInUserRole);
    
    // Verificar permissões para seções restritas
    if (idSecao === 'gerenciarPermissoes') {
        if (loggedInUserRole !== 'admin') {
            console.log('Acesso negado à seção de permissões');
            exibirMensagem('Acesso restrito a administradores.', 'error');
            return;
        }
        
        const modal = document.getElementById('modalGerenciarPermissoesOverlay');
        if (!modal) {
            console.error('Modal de permissões não encontrado');
            exibirMensagem('Erro ao abrir modal de permissões.', 'error');
            return;
        }

        abrirModalEspecifico('modalGerenciarPermissoesOverlay');
        await carregarPermissoesSetor();
        return;
    }
    
    // Verificar permissão para outras seções
    if (idSecao !== 'telaInicial' && idSecao !== 'loginScreen') {
        const temPermissao = await verificarPermissaoPagina(idSecao);
        if (!temPermissao) {
            console.log('Acesso negado à seção:', idSecao);
            exibirMensagem('Você não tem permissão para acessar esta seção.', 'error');
            return;
        }
    }
    
    document.querySelectorAll('.main-content-section').forEach(secao => {
        secao.classList.add('hidden');
    });

    const targetSection = document.getElementById(idSecao);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.toggle('interactive-theme-dashboard', idSecao === 'telaInicial');
        targetSection.classList.toggle('interactive-theme', idSecao !== 'telaInicial' && idSecao !== 'loginScreen');
        
        activeSectionId = idSecao; 
        document.getElementById('mainContentArea').scrollTop = 0;
        
        if (isMenuLink) {
            setActiveMenuLink(idSecao);
            const exoMenuEl = document.querySelector('.exo-menu-container .exo-menu');
            if (window.innerWidth <= 768 && exoMenuEl?.classList.contains('display')) {
                document.querySelector('.exo-menu-container .toggle-menu')?.click(); 
            }
            document.querySelectorAll('.exo-menu-container li.drop-down.open').forEach(openDropdown => {
               openDropdown.classList.remove('open');
            });
        }
    } else { 
        console.log('Seção não encontrada:', idSecao);
        if (loggedInUserRole) mostrarSecao('telaInicial', true); 
        return; 
    }
}

function showNotification(config) {
    const bar = document.getElementById('notificationBar');
    if (!bar) return;
    if (notificationTimeout) clearTimeout(notificationTimeout);
    
    const iconMap = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle', 'confirm-delete': 'fa-exclamation-triangle' };
    bar.className = `notification-bar ${config.type}`;
    document.getElementById('notificationIcon').innerHTML = `<i class="fas ${iconMap[config.type] || 'fa-info-circle'}"></i>`;
    document.getElementById('notificationMessage').textContent = config.message;
    const actions = document.getElementById('notificationActions');
    actions.innerHTML = '';

    if (config.type === 'confirm-delete') {
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = config.confirmText || 'Excluir';
        confirmBtn.className = 'btn btn-confirm-action';
        confirmBtn.onclick = () => { if (config.onConfirm) config.onConfirm(); hideNotification(); };
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = config.cancelText || 'Cancelar';
        cancelBtn.className = 'btn btn-cancel-action';
        cancelBtn.onclick = () => { if (config.onCancel) config.onCancel(); hideNotification(); };
        
        actions.append(confirmBtn, cancelBtn);
    } else {
        notificationTimeout = setTimeout(hideNotification, config.duration || 5000);
    }
    bar.classList.add('visible');
    ajustarPaddingBody(); 
}

function hideNotification() {
    document.getElementById('notificationBar')?.classList.remove('visible');
    if (notificationTimeout) clearTimeout(notificationTimeout);
    setTimeout(ajustarPaddingBody, 400); // Adiciona um delay para o ajuste do padding
}
window.exibirMensagem = (message, type = 'info', duration = 5000) => { showNotification({ message, type, duration }); }
        
function abrirModalEspecifico(overlayId) {
    const overlay = document.getElementById(overlayId); if (!overlay) return;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('active'));
}
function fecharModalEspecifico(overlayId) {
    const overlay = document.getElementById(overlayId); if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

window.abrirModalNovoClienteRapido = () => { document.getElementById('formNovoClienteRapido')?.reset(); abrirModalEspecifico('modalNovoClienteRapidoOverlay'); };
window.fecharModalNovoClienteRapido = () => fecharModalEspecifico('modalNovoClienteRapidoOverlay');
window.abrirModalMudarStatus = (pedidoId, numeroPedido, clienteNome, statusAtual) => {
    document.getElementById('pedidoIdParaMudarStatus').value = pedidoId;
    document.getElementById('infoPedidoParaMudarStatus').innerHTML = `<strong>Pedido:</strong> ${numeroPedido}<br><strong>Cliente:</strong> ${clienteNome}`;
    document.getElementById('novoStatusPedido').value = statusAtual;
    abrirModalEspecifico('modalMudarStatusOverlay');
}
window.fecharModalMudarStatus = () => fecharModalEspecifico('modalMudarStatusOverlay');

async function handleSalvarNovoStatus(event) {
    event.preventDefault();
    if (!auth.currentUser) { exibirMensagem("Sem permissão.", "error"); return; }
    const pedidoId = document.getElementById('pedidoIdParaMudarStatus').value;
    const novoStatus = document.getElementById('novoStatusPedido').value;
    if (!pedidoId || !novoStatus) { exibirMensagem("Erro nos dados.", "error"); return; }

    try {
        await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId), { status: novoStatus });
        exibirMensagem("Estado atualizado!", "success");
        fecharModalMudarStatus();
    } catch (error) { console.error("Erro ao mudar estado:", error); exibirMensagem("Erro ao atualizar.", "error"); }
}

// --- Funções de Controlo de Admin ---
// Clientes
window.abrirModalEditarCliente = (clienteId) => { const c = clientesCache.find(cli => cli.id === clienteId); if(!c) return; document.getElementById('clienteIdParaEditar').value = c.id; document.getElementById('clienteNomeEditar').value = c.nome; document.getElementById('clienteTipoEditar').value = c.tipoCliente; document.getElementById('clienteTelefoneEditar').value = c.telefone; document.getElementById('clienteEmailEditar').value = c.email; document.getElementById('clienteCpfCnpjEditar').value = c.cpfCnpj; document.getElementById('clienteEnderecoEditar').value = c.endereco; abrirModalEspecifico('modalEditarClienteOverlay'); };
window.fecharModalEditarCliente = () => fecharModalEspecifico('modalEditarClienteOverlay');
async function handleSalvarEdicaoCliente(e) { e.preventDefault(); const id = document.getElementById('clienteIdParaEditar').value; const dados = { nome: document.getElementById('clienteNomeEditar').value, tipoCliente: document.getElementById('clienteTipoEditar').value, telefone: document.getElementById('clienteTelefoneEditar').value, email: document.getElementById('clienteEmailEditar').value, cpfCnpj: document.getElementById('clienteCpfCnpjEditar').value, endereco: document.getElementById('clienteEnderecoEditar').value, }; try { await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/clientes`, id), dados); exibirMensagem('Cliente atualizado!', 'success'); fecharModalEditarCliente(); } catch(err){ exibirMensagem('Erro ao atualizar.', 'error'); console.error(err); }}
window.excluirCliente = (id, nome) => { showNotification({ message: `Excluir o cliente ${nome}?`, type: 'confirm-delete', onConfirm: async () => { try { await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/clientes`, id)); exibirMensagem('Cliente excluído.', 'success'); } catch(err) { exibirMensagem('Erro ao excluir.', 'error'); console.error(err); } } }); };

// Produtos
window.abrirModalEditarProduto = (produtoId) => { const p = produtosCache.find(prod => prod.id === produtoId); if(!p) return; document.getElementById('produtoIdParaEditar').value = p.id; document.getElementById('produtoNomeEditar').value = p.nome; document.getElementById('produtoDescricaoEditar').value = p.descricao; document.getElementById('produtoTipoPrecoEditar').value = p.tipoPreco; togglePrecoFieldsEditar(); document.getElementById('produtoPrecoUnidadeEditar').value = p.precoUnidade; document.getElementById('produtoPrecoMetroEditar').value = p.precoMetro; abrirModalEspecifico('modalEditarProdutoOverlay'); };
window.fecharModalEditarProduto = () => fecharModalEspecifico('modalEditarProdutoOverlay');
window.togglePrecoFieldsEditar = function() {
    const tipoPreco = document.getElementById('produtoTipoPrecoEditar')?.value;
    const precoUnidadeFields = document.getElementById('precoUnidadeFieldsEditar');
    const precoMetroFields = document.getElementById('precoMetroFieldsEditar');
    
    if (precoUnidadeFields && precoMetroFields) {
        precoUnidadeFields.classList.toggle('hidden', tipoPreco === 'metro');
        precoMetroFields.classList.toggle('hidden', tipoPreco === 'unidade');
    }
};
async function handleSalvarEdicaoProduto(e) { e.preventDefault(); const id = document.getElementById('produtoIdParaEditar').value; const dados = { nome: document.getElementById('produtoNomeEditar').value, tipoPreco: document.getElementById('produtoTipoPrecoEditar').value, precoUnidade: parseFloat(document.getElementById('produtoPrecoUnidadeEditar').value) || 0, precoMetro: parseFloat(document.getElementById('produtoPrecoMetroEditar').value) || 0, descricao: document.getElementById('produtoDescricaoEditar').value }; try { await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/produtos`, id), dados); exibirMensagem('Produto atualizado!', 'success'); fecharModalEditarProduto(); } catch (err) { exibirMensagem('Erro ao atualizar.', 'error'); console.error(err); } }
window.excluirProduto = (id, nome) => { showNotification({ message: `Excluir o produto ${nome}?`, type: 'confirm-delete', onConfirm: async () => { try { await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/produtos`, id)); exibirMensagem('Produto excluído.', 'success'); } catch(err) { exibirMensagem('Erro ao excluir.', 'error'); console.error(err); } } }); };

// Funcionários
window.abrirModalEditarFuncionario = (funcId) => { const f = funcionariosCache.find(func => func.id === funcId); if (!f) return; document.getElementById('funcionarioIdParaEditar').value = f.id; document.getElementById('funcionarioNomeEditar').value = f.nome; document.getElementById('funcionarioContatoEditar').value = f.contato; document.getElementById('funcionarioCargoEditar').value = f.cargo; document.getElementById('funcionarioCodigoAcessoEditar').value = f.codigoAcesso; abrirModalEspecifico('modalEditarFuncionarioOverlay'); };
window.fecharModalEditarFuncionario = () => fecharModalEspecifico('modalEditarFuncionarioOverlay');
async function handleSalvarEdicaoFuncionario(e) { e.preventDefault(); const id = document.getElementById('funcionarioIdParaEditar').value; const dados = { nome: document.getElementById('funcionarioNomeEditar').value, contato: document.getElementById('funcionarioContatoEditar').value, cargo: document.getElementById('funcionarioCargoEditar').value, codigoAcesso: document.getElementById('funcionarioCodigoAcessoEditar').value }; try { await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/funcionarios`, id), dados); exibirMensagem('Funcionário atualizado!', 'success'); fecharModalEditarFuncionario(); } catch (err) { exibirMensagem('Erro ao atualizar.', 'error'); console.error(err); } }
window.excluirFuncionario = (id, nome) => { showNotification({ message: `Excluir o funcionário ${nome}?`, type: 'confirm-delete', onConfirm: async () => { try { await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/funcionarios`, id)); exibirMensagem('Funcionário excluído.', 'success'); } catch (err) { exibirMensagem('Erro ao excluir.', 'error'); console.error(err); } } }); };

// Fornecedores
window.abrirModalEditarFornecedor = (fornId) => { const f = fornecedoresCache.find(forn => forn.id === fornId); if (!f) return; document.getElementById('fornecedorIdParaEditar').value = f.id; document.getElementById('fornecedorNomeEditar').value = f.nome; document.getElementById('fornecedorContatoEditar').value = f.contato; document.getElementById('fornecedorMaterialEditar').value = f.tipoMaterial; abrirModalEspecifico('modalEditarFornecedorOverlay'); };
window.fecharModalEditarFornecedor = () => fecharModalEspecifico('modalEditarFornecedorOverlay');
async function handleSalvarEdicaoFornecedor(e) { e.preventDefault(); const id = document.getElementById('fornecedorIdParaEditar').value; const dados = { nome: document.getElementById('fornecedorNomeEditar').value, contato: document.getElementById('fornecedorContatoEditar').value, tipoMaterial: document.getElementById('fornecedorMaterialEditar').value }; try { await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/fornecedores`, id), dados); exibirMensagem('Fornecedor atualizado!', 'success'); fecharModalEditarFornecedor(); } catch (err) { exibirMensagem('Erro ao atualizar.', 'error'); console.error(err); } }
window.excluirFornecedor = (id, nome) => { showNotification({ message: `Excluir o fornecedor ${nome}?`, type: 'confirm-delete', onConfirm: async () => { try { await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/fornecedores`, id)); exibirMensagem('Fornecedor excluído.', 'success'); } catch(err) { exibirMensagem('Erro ao excluir.', 'error'); console.error(err); } } }); };


window.toggleItemProductionStep = async (pedidoId, itemIndex, stepName, isChecked) => {
    if (!auth.currentUser) { exibirMensagem("Sem permissão.", "error"); return; }

    let podeMarcar = ['admin', 'designer'].includes(loggedInUserRole) || (loggedInUserRole === 'impressor' && stepName === 'impressao') || (loggedInUserRole === 'producao' && stepName === 'acabamento');
    if (!podeMarcar) {
        exibirMensagem(`Seu cargo não permite marcar a etapa '${stepName}'.`, "error");
        const printWindowCheckbox = window.opener?.document.getElementById(`step-${stepName}-${pedidoId}-${itemIndex}`);
        if (printWindowCheckbox) printWindowCheckbox.checked = !isChecked;
        return;
    }

    const pedidoDocRef = doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId);
    const pedidoParaAtualizar = todosOsPedidosCache.find(p => p.id === pedidoId);

    if (pedidoParaAtualizar?.itens[itemIndex] != null) {
        const novosItens = [...pedidoParaAtualizar.itens];
        const item = novosItens[itemIndex];
        
        if (!item.productionSteps) item.productionSteps = { impressao: {}, acabamento: {} };
        item.productionSteps[stepName] = { concluido: isChecked, concluidoPor: isChecked ? loggedInUserName : null, concluidoEm: isChecked ? Timestamp.now() : null };
        
        try {
            await updateDoc(pedidoDocRef, { itens: novosItens });
            exibirMensagem(`Etapa '${stepName}' atualizada.`, 'success', 2000);
        } catch (error) { console.error("Erro ao atualizar etapa:", error); exibirMensagem("Erro ao atualizar a etapa.", "error"); }
    } else { exibirMensagem("Pedido ou item não encontrado.", "error"); }
};


window.marcarComoEntregue = async (pedidoId) => {
    if (!auth.currentUser || !pedidoId) { exibirMensagem("Ação inválida.", "error"); return; }
    const dadosUpdate = { status: 'Entregue', entreguePorNome: loggedInUserName, entreguePorId: loggedInUserIdGlobal, entregueEm: Timestamp.now() };
    try {
        await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId), dadosUpdate);
        exibirMensagem("Pedido marcado como Entregue!", "success");
    } catch (error) { console.error("Erro ao marcar como entregue:", error); exibirMensagem("Erro ao atualizar o pedido.", "error"); }
};

window.abrirDetalhesPedidoNovaGuia = (pedido) => {
    const url = `detalhes-pedido.html?id=${pedido.id}`;
    window.open(url, '_blank');
};

window.handleImagemFilePedido=(ev)=>{processImageFilePedido(ev.target.files[0]);ev.target.value=null;}
function handlePasteImagePedido(ev){ev.preventDefault();const items=(ev.clipboardData||window.clipboardData).items;for(const item of items)if(item.kind==='file'&&item.type.startsWith('image/')){processImageFilePedido(item.getAsFile());break;}}
function popularSelectProduto(sel){sel.innerHTML='<option value="">Selecione produto</option>'+produtosCache.map(p=>`<option value="${p.id}" data-tipo="${p.tipoPreco}" data-preco-metro="${p.precoMetro||0}" data-preco-unidade="${p.precoUnidade||0}">${p.nome}</option>`).join('');}
window.adicionarItemPedidoForm = (itemParaEditar = null) => {
    itemPedidoCount++;
    const c = document.getElementById('itensPedidoContainer');
    const d = document.createElement('div');
    d.className = 'p-3.5 border rounded-lg space-y-2.5 item-pedido-form relative'; d.id = `itemPedido-${itemPedidoCount}`;
    d.innerHTML = `<button type="button" onclick="removerItemPedidoForm(${itemPedidoCount})" class="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600 p-1"><i class="fas fa-times"></i></button><h4 class="font-medium text-sm">Item ${itemPedidoCount}</h4><div><label class="label-text text-xs">Produto:</label><select class="input-field input-field-sm produto-select" id="itemProduto-${itemPedidoCount}" onchange="toggleCamposProduto(${itemPedidoCount})"></select></div><div class="mt-2"><label class="label-text text-xs">Descrição do Item (Opcional):</label><input type="text" class="input-field input-field-sm item-descricao" id="itemDescricao-${itemPedidoCount}" placeholder="Ex: com laminação fosca..."></div><div id="camposProdutoMetro-${itemPedidoCount}" class="hidden grid grid-cols-2 gap-3"><div><label class="label-text text-xs">Largura (m):</label><input type="number" step="0.01" class="input-field input-field-sm dimensoes-produto" id="itemLargura-${itemPedidoCount}" oninput="calcularValorItem(${itemPedidoCount})"></div><div><label class="label-text text-xs">Altura (m):</label><input type="number" step="0.01" class="input-field input-field-sm dimensoes-produto" id="itemAltura-${itemPedidoCount}" oninput="calcularValorItem(${itemPedidoCount})"></div></div><div><label class="label-text text-xs">Qtd:</label><input type="number" value="1" min="1" class="input-field input-field-sm quantidade-produto" id="itemQuantidade-${itemPedidoCount}" oninput="calcularValorItem(${itemPedidoCount})"></div><div><label class="label-text text-xs">Valor Item:</label><input type="text" class="input-field input-field-sm valor-item-produto font-medium" id="itemValor-${itemPedidoCount}" readonly value="R$ 0,00"></div>`;
    c.appendChild(d);
    const selectProduto = d.querySelector('.produto-select'); popularSelectProduto(selectProduto);
    if (itemParaEditar) { selectProduto.value = itemParaEditar.produtoId; selectProduto.dispatchEvent(new Event('change')); d.querySelector('.quantidade-produto').value = itemParaEditar.quantidade; d.querySelector('.item-descricao').value = itemParaEditar.descricao || ''; if (itemParaEditar.tipoProduto === 'metro') { d.querySelector('.dimensoes-produto[id^="itemLargura"]').value = itemParaEditar.largura; d.querySelector('.dimensoes-produto[id^="itemAltura"]').value = itemParaEditar.altura; } if(itemParaEditar.productionSteps) { d.dataset.productionSteps = JSON.stringify(itemParaEditar.productionSteps); } calcularValorItem(itemPedidoCount); }
    d.querySelectorAll('.input-field').forEach(el => el.classList.add('py-1.5', 'text-sm'));
};

window.removerItemPedidoForm=(id)=>{document.getElementById(`itemPedido-${id}`)?.remove();atualizarValorTotalPedido();}
window.removerPagamentoForm=(id)=>{document.getElementById(`pagamentoItem-${id}`)?.remove();calcularTotaisPagamento();}
window.toggleCamposProduto=(id)=>{const s=document.getElementById(`itemProduto-${id}`);document.getElementById(`camposProdutoMetro-${id}`).classList.toggle('hidden',s.options[s.selectedIndex]?.dataset.tipo!=='metro');calcularValorItem(id);}
window.calcularValorItem=(id)=>{const s=document.getElementById(`itemProduto-${id}`),o=s.options[s.selectedIndex],vI=document.getElementById(`itemValor-${id}`);if(!o||!o.value){vI.value="R$ 0,00";atualizarValorTotalPedido();return;}const t=o.dataset.tipo,pm=parseFloat(o.dataset.precoMetro),pu=parseFloat(o.dataset.precoUnidade),q=parseInt(document.getElementById(`itemQuantidade-${id}`).value)||1;let v=0;if(t==='metro'){const l=parseFloat(document.getElementById(`itemLargura-${id}`).value)||0,a=parseFloat(document.getElementById(`itemAltura-${id}`).value)||0;if(l>0&&a>0&&pm>0)v=(l*a*pm)*q;}else{if(pu>0)v=pu*q;}vI.value=`R$ ${v.toFixed(2).replace('.',',')}`;atualizarValorTotalPedido();}
function atualizarValorTotalPedido(){let tI=0;document.querySelectorAll('.valor-item-produto').forEach(i=>{tI+=parseFloat(i.value.replace('R$ ','').replace(',','.'))||0;});document.getElementById('pedidoValorTotal').value=`R$ ${tI.toFixed(2).replace('.',',')}`;calcularTotaisPagamento();}
window.adicionarPagamentoForm=()=>{pagamentoCount++;const c=document.getElementById('pagamentosContainer');const d=document.createElement('div');d.className='grid grid-cols-1 sm:grid-cols-[2fr,1fr,auto] gap-3 items-end p-3 border rounded-lg pagamento-form-item';d.id=`pagamentoItem-${pagamentoCount}`;d.innerHTML=`<div><label class="label-text text-xs">Forma:</label><select class="input-field input-field-sm py-1.5 forma-pagamento"><option value="Dinheiro">Dinheiro</option><option value="Cartão de Crédito">Crédito</option><option value="Cartão de Débito">Débito</option><option value="PIX">PIX</option><option value="Boleto">Boleto</option><option value="Pendente">Pendente</option></select></div><div><label class="label-text text-xs">Valor (R$):</label><input type="number" step="0.01" class="input-field input-field-sm py-1.5 valor-pago" placeholder="0,00" oninput="window.calcularTotaisPagamento()"></div><button type="button" onclick="removerPagamentoForm(${pagamentoCount})" class="btn btn-danger btn-small text-xs py-1.5 px-2 h-8"><i class="fas fa-trash"></i></button><div class="sm:col-span-3"><label class="label-text text-xs">Obs:</label><input type="text" class="input-field input-field-sm py-1.5 observacao-pagamento" placeholder="Ex: Entrada..."></div>`;c.appendChild(d);calcularTotaisPagamento();}

window.calcularTotaisPagamento=()=>{let tP=0;document.querySelectorAll('.pagamento-form-item .valor-pago').forEach(i=>{tP+=parseFloat(i.value)||0;});document.getElementById('pedidoTotalPago').value=`R$ ${tP.toFixed(2).replace('.',',')}`;const vT=parseFloat(document.getElementById('pedidoValorTotal').value.replace('R$ ','').replace(',','.'))||0;document.getElementById('pedidoValorRestante').value=`R$ ${(vT-tP).toFixed(2).replace('.',',')}`;};

function getStatusBadgeSimpleHTML(pedido) { const s=pedido.status;let c='neutral';if(s==='Entregue')c='success';else if(s==='Cancelado')c='danger';else if(s==='Pronto para Retirada')c='primary';else if(s?.startsWith('Em Produção')||s==='Em Rota de Entrega')c='info';else if(s==='Aguardando Aprovação')c='warning';return `<button type="button" class="status-badge-simple interactive-button ${c}" onclick="abrirModalMudarStatus('${pedido.id}','${(pedido.numeroPedido||'').replace(/'/g,"\\'")}', '${(pedido.clienteNome||'').replace(/'/g,"\\'")}', '${(s||'').replace(/'/g,"\\'")}')" title="Alterar estado">${s}</button>`; }
function renderizarListaCompletaPedidos() { const tbody = document.getElementById('listaTodosPedidos'); if (!tbody) return; let pF=[...todosOsPedidosCache]; const f={nC:document.getElementById('filtroNomeCliente')?.value.toLowerCase(),nP:document.getElementById('filtroNumeroPedido')?.value.toLowerCase(),dP:document.getElementById('filtroDataPedido')?.value,mP:document.getElementById('filtroMaterialProduto')?.value.toLowerCase(),sP:document.getElementById('filtroStatusPedido')?.value,c:document.getElementById('filtroClassificacaoPedido')?.value,vI:document.getElementById('filtroVendedor')?.value}; if(f.nC)pF=pF.filter(p=>p.clienteNome?.toLowerCase().includes(f.nC));if(f.nP)pF=pF.filter(p=>p.numeroPedido?.toLowerCase().includes(f.nP));if(f.dP){const dFil=new Date(f.dP+"T00:00:00");pF=pF.filter(p=>{const dP=p.dataPedido?.toDate();return dP&&dP.getFullYear()===dFil.getFullYear()&&dP.getMonth()===dFil.getMonth()&&dP.getDate()===dFil.getDate();});}if(f.mP)pF=pF.filter(p=>p.itens?.some(i=>i.produtoNome?.toLowerCase().includes(f.mP)));if(f.sP)pF=pF.filter(p=>p.status===f.sP);if(f.vI)pF=pF.filter(p=>p.vendedorId===f.vI);const sF={'dataPedido_desc':(a,b)=>(b.dataPedido?.toMillis()||0)-(a.dataPedido?.toMillis()||0),'dataPedido_asc':(a,b)=>(a.dataPedido?.toMillis()||0)-(b.dataPedido?.toMillis()||0),'dataEntrega_asc':(a,b)=>(a.dataEntrega?.toMillis()||0)-(b.dataEntrega?.toMillis()||0),'dataEntrega_desc':(a,b)=>(b.dataEntrega?.toMillis()||0)-(a.dataEntrega?.toMillis()||0),'clienteNome_asc':(a,b)=>(a.clienteNome||"").localeCompare(b.clienteNome||""),'clienteNome_desc':(a,b)=>(b.clienteNome||"").localeCompare(a.clienteNome||""),'numeroPedido_asc':(a,b)=>(a.numeroPedido||"").localeCompare(b.numeroPedido||"",undefined,{numeric:true}),'numeroPedido_desc':(a,b)=>(b.numeroPedido||"").localeCompare(a.numeroPedido||"",undefined,{numeric:true})};pF.sort(sF[f.c]||sF['dataPedido_desc']); if(pF.length===0){tbody.innerHTML='<tr><td colspan="7" class="text-center py-10">Nenhum pedido encontrado.</td></tr>'; return;} tbody.innerHTML = pF.map(p => { const pM=JSON.stringify(p); const dE=p.dataEntrega?.toDate(); let sAC='';if(dE&&p.status!=='Entregue'&&p.status!=='Cancelado'){const dH=(dE-(new Date()))/36e5;if(dH<0)sAC='late';else if(dH<=24)sAC='nearly-late';} let aB=`<button onclick="abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Detalhes"><i class="fas fa-eye"></i></button>`;if(['vendedor','admin'].includes(loggedInUserRole)){const bE=(p.status!=='Entregue'&&p.status!=='Cancelado')?`<button onclick="marcarComoEntregue('${p.id}')" class="btn-icon-action" title="Entregue">📦</button>`:'';aB+=` <button onclick="prepararEdicaoPedido(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button>${bE}<button onclick="excluirPedido('${p.id}','${p.numeroPedido}')" class="btn-icon-action text-red-500 hover:text-red-700" title="Excluir"><i class="fas fa-trash"></i></button>`;}return `<tr><td class="pedido-numero ${sAC}">${p.numeroPedido}</td><td class="cliente-nome">${p.clienteNome}</td><td>${p.dataPedido?.toDate().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})||'N/A'}</td><td>${dE?.toLocaleDateString('pt-BR')||'N/A'}</td><td class="font-medium">R$ ${p.valorTotal.toFixed(2).replace('.',',')}</td><td>${getStatusBadgeSimpleHTML(p)}</td><td class="text-xs space-x-1.5 whitespace-nowrap">${aB}</td></tr>`;}).join(''); }
function carregarUltimosPedidos() { const tb=document.getElementById('ultimosPedidosTableBody');if(!tb)return;const pRecentes=[...todosOsPedidosCache].sort((a,b)=>(b.dataPedido?.toMillis()||0)-(a.dataPedido?.toMillis()||0)).slice(0,5);if(pRecentes.length===0)tb.innerHTML=`<tr><td colspan="6" class="text-center py-10">Nenhum pedido recente.</td></tr>`;else tb.innerHTML=pRecentes.map(p=>{const pM=JSON.stringify(p);const dE=p.dataEntrega?.toDate();let sAC='';if(dE&&p.status!=='Entregue'&&p.status!=='Cancelado'){const dH=(dE-(new Date()))/36e5;if(dH<0)sAC='late';else if(dH<=24)sAC='nearly-late';}let aB=`<button onclick="abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Detalhes"><i class="fas fa-eye"></i></button>`;if(['vendedor','admin'].includes(loggedInUserRole)){const bE=(p.status!=='Entregue'&&p.status!=='Cancelado')?`<button onclick="marcarComoEntregue('${p.id}')" class="btn-icon-action" title="Entregue">📦</button>`:'';aB+=` <button onclick="prepararEdicaoPedido(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button>${bE}<button onclick="excluirPedido('${p.id}','${p.numeroPedido}')" class="btn-icon-action text-red-500 hover:text-red-700" title="Excluir"><i class="fas fa-trash"></i></button>`;}return `<tr><td class="pedido-numero font-medium ${sAC}">${p.numeroPedido}</td><td>${p.clienteNome}</td><td>${p.dataPedido?.toDate().toLocaleDateString('pt-BR')||'N/A'}</td><td class="font-medium">R$ ${p.valorTotal.toFixed(2).replace('.',',')}</td><td>${getStatusBadgeSimpleHTML(p)}</td><td class="text-xs space-x-1 whitespace-nowrap">${aB}</td></tr>`;}).join('');}
function carregarTodosPedidos() { if(!auth.currentUser)return;onSnapshot(query(collection(db,`artifacts/${shopInstanceAppId}/pedidos`)),(snap)=>{todosOsPedidosCache=snap.docs.map(doc=>({id:doc.id,...doc.data()}));atualizarEstatisticasUsuario();carregarUltimosPedidos();if(activeSectionId==='telaInicial')atualizarDashboard();if(activeSectionId==='visualizarPedidos')renderizarListaCompletaPedidos();if(activeSectionId==='cadastrarCliente'&&clienteSelecionadoId)exibirDetalhesClienteEProcurarPedidos(clienteSelecionadoId);},e=>{console.error("Erro pedidos:",e);exibirMensagem("Erro ao carregar pedidos.","error");});}
function atualizarDashboard() { const m={h:document.getElementById('metricPedidosHoje'),p:document.getElementById('metricPedidosPendentes'),f:document.getElementById('metricFaturamentoMes'),c:document.getElementById('metricTotalClientes')}; if(!m.h||!m.p||!m.f||!m.c)return; m.c.textContent=clientesCache.length; if(todosOsPedidosCache.length===0){m.h.textContent='0';m.p.textContent='0';m.f.textContent='R$ 0,00';return;} const h=new Date(),hoje=new Date(h.getFullYear(),h.getMonth(),h.getDate()),iM=new Date(h.getFullYear(),h.getMonth(),1); let pH=0,pP=0,fM=0; todosOsPedidosCache.forEach(p=>{const dP=p.dataPedido?.toDate();if(!dP)return;if(dP>=hoje)pH++;if(p.status!=='Entregue'&&p.status!=='Cancelado')pP++;if(dP>=iM&&p.status!=='Cancelado')fM+=p.valorTotal||0;}); m.h.textContent=pH;m.p.textContent=pP;m.f.textContent=`R$ ${fM.toFixed(2).replace('.',',')}`; }

window.prepararEdicaoPedido = (pObj) => {
    if (!pObj || !pObj.id) {
        exibirMensagem("Dados do pedido inválidos para edição.", "error");
        return;
    }
    editingOrderId = pObj.id;
    document.getElementById('editingOrderIdField').value = pObj.id;
    document.getElementById('formNovoPedido').reset();
    document.getElementById('itensPedidoContainer').innerHTML = '';
    document.getElementById('pagamentosContainer').innerHTML = '';
    itemPedidoCount = 0;
    pagamentoCount = 0;
    
    ['pedidoDescricaoGeral','pedidoClienteSearch','pedidoVendedor','pedidoStatus'].forEach(id => {
        const key = id.replace('pedido','').toLowerCase().replace('search','Nome');
        document.getElementById(id).value = pObj[key] || '';
    });
    
    document.getElementById('pedidoClienteId').value = pObj.clienteId || "";

    const dETS = pObj.dataEntrega && typeof pObj.dataEntrega.seconds === 'number' 
        ? new Timestamp(pObj.dataEntrega.seconds, pObj.dataEntrega.nanoseconds) 
        : null;
    const dE = dETS?.toDate();

    if (dE) {
        document.getElementById('pedidoDataEntrega').value = dE.toISOString().split('T')[0];
        document.getElementById('pedidoHoraEntrega').value = dE.toTimeString().split(' ')[0].substring(0, 5);
    } else {
        document.getElementById('pedidoDataEntrega').value = "";
        document.getElementById('pedidoHoraEntrega').value = "";
    }

    window.pedidoImagemState.setImagem(pObj.imagemPreviewPedidoBase64 || null);
    const pI = document.getElementById('pedidoImagemPreview'), pH = document.getElementById('pedidoImagemPreviewPlaceholder');
    if (window.pedidoImagemState.getImagem()) {
        pI.src = window.pedidoImagemState.getImagem();
        pI.classList.remove('hidden');
        pH.classList.add('hidden');
    } else {
        pI.src = "#";
        pI.classList.add('hidden');
        pH.classList.remove('hidden');
    }

    if (pObj.itens && Array.isArray(pObj.itens)) {
        pObj.itens.forEach(item => {
            adicionarItemPedidoForm(item);
        });
    }

    if (pObj.pagamentos && Array.isArray(pObj.pagamentos)) {
        pObj.pagamentos.forEach(pgto => {
            adicionarPagamentoForm();
            const cPFI = pagamentoCount;
            const pIE = document.getElementById(`pagamentoItem-${cPFI}`);
            if (pIE) {
                pIE.querySelector('.forma-pagamento').value = pgto.forma;
                pIE.querySelector('.valor-pago').value = pgto.valorPago;
                pIE.querySelector('.observacao-pagamento').value = pgto.observacao || "";
            }
        });
    }

    atualizarValorTotalPedido();
    document.querySelector('#formNovoPedido button[type="submit"]').innerHTML = '<i class="fas fa-save mr-1.5"></i>Atualizar Pedido';
    mostrarSecao('novoPedido');
    setActiveMenuLink('novoPedido');
};

window.excluirPedido = (pedidoId, numeroPedido) => { showNotification({ message: `Excluir o pedido ${numeroPedido}?`, type: 'confirm-delete', onConfirm: async () => { try { await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId)); exibirMensagem('Pedido excluído!', 'success'); } catch (error) { console.error("Erro ao excluir pedido:", error); exibirMensagem('Erro ao excluir.', 'error'); } } }); }

document.addEventListener('DOMContentLoaded', () => { 
    const produtoTipoPrecoEl = document.getElementById('produtoTipoPreco'); 
    if (produtoTipoPrecoEl) {
        togglePrecoFields();
    }
    const produtoTipoPrecoEditarEl = document.getElementById('produtoTipoPrecoEditar');
    if(produtoTipoPrecoEditarEl){
        togglePrecoFieldsEditar();
    }

    // Adicionar evento de submit do formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const codigoAcesso = document.getElementById('codigoAcesso').value;
            handleLogin(codigoAcesso);
        });
    }
});

// Função para inicializar as permissões
async function inicializarPermissoes() {
    try {
        // Verificar se já existem permissões para cada setor
        const setores = ['admin', 'vendedor', 'designer', 'impressor', 'producao'];
        for (const setor of setores) {
            const permissoesRef = doc(db, `artifacts/${shopInstanceAppId}/permissoes`, setor);
            const permissoesDoc = await getDoc(permissoesRef);
            
            if (!permissoesDoc.exists()) {
                // Definir permissões padrão para cada setor
                let permissoesPadrao = ['telaInicial'];
                
                switch (setor) {
                    case 'admin':
                        permissoesPadrao = ['telaInicial', 'novoPedido', 'cadastrarCliente', 'cadastrarProduto', 'cadastrarFuncionario', 'cadastrarFornecedor', 'visualizarPedidos', 'gerenciarPermissoes'];
                        break;
                    case 'vendedor':
                        permissoesPadrao = ['telaInicial', 'novoPedido', 'cadastrarCliente', 'visualizarPedidos'];
                        break;
                    case 'designer':
                        permissoesPadrao = ['telaInicial', 'cadastrarProduto', 'visualizarPedidos'];
                        break;
                    case 'impressor':
                        permissoesPadrao = ['telaInicial', 'visualizarPedidos'];
                        break;
                    case 'producao':
                        permissoesPadrao = ['telaInicial', 'visualizarPedidos'];
                        break;
                }
                
                await setDoc(permissoesRef, { paginas: permissoesPadrao });
                console.log('Permissões padrão criadas para o setor:', setor, permissoesPadrao);
            }
        }
    } catch (error) {
        console.error('Erro ao inicializar permissões:', error);
    }
}

// Função para carregar as permissões do setor selecionado
async function carregarPermissoesSetor() {
    try {
        const setor = document.getElementById('selectSetorPermissao').value;
        const permissoesRef = doc(db, `artifacts/${shopInstanceAppId}/permissoes`, setor);
        const permissoesDoc = await getDoc(permissoesRef);
        
        let permissoes = [];
        if (permissoesDoc.exists()) {
            permissoes = permissoesDoc.data().paginas || [];
        }
        
        document.querySelectorAll('#permissoesPaginasContainer input[type=checkbox]').forEach(cb => {
            cb.checked = permissoes.includes(cb.value);
        });
        
        console.log('Permissões carregadas para o setor:', setor, permissoes);
    } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        exibirMensagem('Erro ao carregar permissões. Por favor, tente novamente.', 'error');
    }
}

// Função para salvar as permissões do setor
async function salvarPermissoesSetor() {
    try {
        const setor = document.getElementById('selectSetorPermissao').value;
        const permissoes = Array.from(document.querySelectorAll('#permissoesPaginasContainer input[type=checkbox]:checked'))
            .map(cb => cb.value);
        
        const permissoesRef = doc(db, `artifacts/${shopInstanceAppId}/permissoes`, setor);
        await setDoc(permissoesRef, { paginas: permissoes }, { merge: true });
        
        console.log('Permissões salvas para o setor:', setor, permissoes);
        exibirMensagem('Permissões salvas com sucesso!', 'success');
        
        // Atualizar o menu para refletir as novas permissões
        configurarAcessoPorCargo(loggedInUserRole);
    } catch (error) {
        console.error('Erro ao salvar permissões:', error);
        exibirMensagem('Erro ao salvar permissões. Por favor, tente novamente.', 'error');
    }
}

// Função para verificar se o usuário tem permissão para acessar uma página
async function verificarPermissaoPagina(pagina) {
    try {
        if (!loggedInUserRole) return false;
        if (loggedInUserRole === 'admin') return true;
        
        const permissoesRef = doc(db, `artifacts/${shopInstanceAppId}/permissoes`, loggedInUserRole);
        const permissoesDoc = await getDoc(permissoesRef);
        
        if (!permissoesDoc.exists()) return false;
        
        const permissoes = permissoesDoc.data().paginas || [];
        return permissoes.includes(pagina);
    } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
    }
}

// Função para fechar o modal de permissões
function fecharModalGerenciarPermissoes() {
    fecharModalEspecifico('modalGerenciarPermissoesOverlay');
}

window.togglePrecoFields = function() {
    const tipoPreco = document.getElementById('produtoTipoPreco')?.value;
    const precoUnidadeFields = document.getElementById('precoUnidadeFields');
    const precoMetroFields = document.getElementById('precoMetroFields');
    
    if (precoUnidadeFields && precoMetroFields) {
        precoUnidadeFields.classList.toggle('hidden', tipoPreco === 'metro');
        precoMetroFields.classList.toggle('hidden', tipoPreco === 'unidade');
    }
};

window.carregarClientes = async function carregarClientes() {
    try {
        const clientesRef = collection(db, `artifacts/${shopInstanceAppId}/clientes`);
        const snapshot = await getDocs(clientesRef);
        window.clientesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Se quiser popular algum select ou lista, faça aqui
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        window.clientesCache = [];
    }
}

window.carregarProdutos = async function carregarProdutos() {
    try {
        const produtosRef = collection(db, `artifacts/${shopInstanceAppId}/produtos`);
        const snapshot = await getDocs(produtosRef);
        window.produtosCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Se quiser popular algum select ou lista, faça aqui
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        window.produtosCache = [];
    }
}

window.carregarFuncionarios = async function carregarFuncionarios() {
    try {
        const funcionariosRef = collection(db, `artifacts/${shopInstanceAppId}/funcionarios`);
        const snapshot = await getDocs(funcionariosRef);
        window.funcionariosCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Se quiser popular algum select ou lista, faça aqui
    } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
        window.funcionariosCache = [];
    }
}

window.carregarFornecedores = async function carregarFornecedores() {
    try {
        const fornecedoresRef = collection(db, `artifacts/${shopInstanceAppId}/fornecedores`);
        const snapshot = await getDocs(fornecedoresRef);
        window.fornecedoresCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Se quiser popular algum select ou lista, faça aqui
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        window.fornecedoresCache = [];
    }
}
