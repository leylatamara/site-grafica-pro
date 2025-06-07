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
    where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

let userId = null, produtosCache = [], pedidoImagemBase64 = null, todosOsPedidosCache = [], clientesCache = [], fornecedoresCache = [], funcionariosCache = [];
let itemPedidoCount = 0, pagamentoCount = 0, clienteSelecionadoId = null, editingOrderId = null, loggedInUserRole = null, loggedInUserName = null, loggedInUserIdGlobal = null; 
let currentUniversalModalConfirmCallback = null;
let currentUniversalModalCancelCallback = null;
let originalBodyOverflow = "", originalDocOverflow = ""; 
let originalBodyOverflowEspecifico = "", originalDocOverflowEspecifico = ""; 
let notificationTimeout;


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
            const novoPedidoExemplo = { clienteId: clienteAleatorio.id, clienteNome: clienteAleatorio.nome, vendedorId: funcionarioAleatorio.id, vendedorNome: funcionarioAleatorio.nome, pagamentos: pagamentosExemplo, dataEntrega: Timestamp.fromDate(dataEntrega), status: statusPossiveis[Math.floor(Math.random() * statusPossiveis.length)], valorTotal: valorTotalPedidoExemplo, itens: itensPedidoExemplo, imagemPreviewPedidoBase64: null, dataPedido: Timestamp.fromDate(dataPedido), numeroPedido: `PED-EX${Date.now().toString().slice(-5) + i}` };
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
        
        const loginForm = document.getElementById('loginForm');
        if(loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(document.getElementById('codigoAcesso').value); });
        
        const logoutButton = document.getElementById('logoutButton');
        if(logoutButton) logoutButton.addEventListener('click', logout);

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
            if (loggedInUserNameDisplay) {
                loggedInUserNameDisplay.textContent = `Olá, ${loggedInUserName}`;
            }
            
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
        
        const pedidoDropArea = document.getElementById('pedidoImageDropArea');
        if (pedidoDropArea) pedidoDropArea.addEventListener('paste', handlePasteImagePedido);
        
        const pesquisaClienteInputEl = document.getElementById('pesquisaClienteInput');
        if(pesquisaClienteInputEl) pesquisaClienteInputEl.addEventListener('input', () => renderizarListaClientes());
        
        const toggleMenuBtn = document.querySelector('.exo-menu-container .toggle-menu');
        const exoMenuEl = document.querySelector('.exo-menu-container .exo-menu');
        if (toggleMenuBtn && exoMenuEl) {
            toggleMenuBtn.addEventListener('click', (e) => { 
                e.preventDefault(); 
                exoMenuEl.classList.toggle('display'); 
                ajustarPaddingBody(); 
            });
        }

        const formEditarCodigoFuncionarioEl = document.getElementById('formEditarCodigoFuncionario');
        if(formEditarCodigoFuncionarioEl) formEditarCodigoFuncionarioEl.addEventListener('submit', handleSalvarNovoCodigoFuncionario);
        
        const formMudarStatusEl = document.getElementById('formMudarStatus');
        if(formMudarStatusEl) formMudarStatusEl.addEventListener('submit', handleSalvarNovoStatus);

        const filtroNomeClienteEl = document.getElementById('filtroNomeCliente');
        const filtroNumeroPedidoEl = document.getElementById('filtroNumeroPedido');
        const filtroDataPedidoEl = document.getElementById('filtroDataPedido');
        const filtroMaterialProdutoEl = document.getElementById('filtroMaterialProduto');
        const filtroStatusPedidoEl = document.getElementById('filtroStatusPedido');
        const filtroClassificacaoPedidoEl = document.getElementById('filtroClassificacaoPedido');
        const filtroVendedorEl = document.getElementById('filtroVendedor'); 
        const limparFiltrosPedidosBtn = document.getElementById('limparFiltrosPedidos');

        if (filtroNomeClienteEl) filtroNomeClienteEl.addEventListener('input', renderizarListaCompletaPedidos);
        if (filtroNumeroPedidoEl) filtroNumeroPedidoEl.addEventListener('input', renderizarListaCompletaPedidos);
        if (filtroDataPedidoEl) filtroDataPedidoEl.addEventListener('change', renderizarListaCompletaPedidos);
        if (filtroMaterialProdutoEl) filtroMaterialProdutoEl.addEventListener('input', renderizarListaCompletaPedidos);
        if (filtroStatusPedidoEl) filtroStatusPedidoEl.addEventListener('change', renderizarListaCompletaPedidos);
        if (filtroClassificacaoPedidoEl) filtroClassificacaoPedidoEl.addEventListener('change', renderizarListaCompletaPedidos);
        if (filtroVendedorEl) filtroVendedorEl.addEventListener('change', renderizarListaCompletaPedidos); 

        if (limparFiltrosPedidosBtn) {
            limparFiltrosPedidosBtn.addEventListener('click', () => {
                if (filtroNomeClienteEl) filtroNomeClienteEl.value = '';
                if (filtroNumeroPedidoEl) filtroNumeroPedidoEl.value = '';
                if (filtroDataPedidoEl) filtroDataPedidoEl.value = '';
                if (filtroMaterialProdutoEl) filtroMaterialProdutoEl.value = '';
                if (filtroStatusPedidoEl) filtroStatusPedidoEl.value = '';
                if (filtroClassificacaoPedidoEl) filtroClassificacaoPedidoEl.value = 'dataPedido_desc'; 
                if (filtroVendedorEl) filtroVendedorEl.value = ''; 
                renderizarListaCompletaPedidos(); 
            });
        }

    } else { 
        document.body.classList.remove('app-visible');
        try { await signInAnonymously(auth); } catch (error) { console.error("Erro login anônimo:", error); exibirMensagem("Erro autenticação.", "error");}
    }
});

async function handleLogin(codigo) {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    const codigoAcessoInput = document.getElementById('codigoAcesso');
    const loggedInUserNameDisplay = document.getElementById('loggedInUserNameDisplay');
    
    loginErrorMessage.classList.add('hidden'); 
    if (!auth.currentUser) { loginErrorMessage.textContent = "Aguardando autenticação. Tente novamente."; loginErrorMessage.classList.remove('hidden'); return; }

    try {
        const funcionariosRef = collection(db, `artifacts/${shopInstanceAppId}/funcionarios`);
        const q = query(funcionariosRef, where("codigoAcesso", "==", codigo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const funcionarioData = querySnapshot.docs[0].data();
            const funcionarioId = querySnapshot.docs[0].id;
            loggedInUserRole = funcionarioData.cargo.toLowerCase(); 
            loggedInUserName = funcionarioData.nome; 
            loggedInUserIdGlobal = funcionarioId;

            localStorage.setItem('loggedInUserRole', loggedInUserRole);
            localStorage.setItem('loggedInUserName', loggedInUserName);
            localStorage.setItem('loggedInUserId', loggedInUserIdGlobal);

            if (loggedInUserNameDisplay) { loggedInUserNameDisplay.textContent = `Olá, ${loggedInUserName}`; }
            
            atualizarEstatisticasUsuario();

            document.body.classList.add('app-visible'); 
            loginScreen.classList.add('hidden'); appContainer.classList.remove('hidden'); codigoAcessoInput.value = ''; 
            configurarAcessoPorCargo(loggedInUserRole); setActiveMenuLink('telaInicial'); mostrarSecao('telaInicial', false); ajustarPaddingBody();
        } else {
            loginErrorMessage.textContent = "Código inválido."; loginErrorMessage.classList.remove('hidden'); loggedInUserRole = null; loggedInUserName = null; loggedInUserIdGlobal = null;
        }
    } catch (error) { console.error("Erro login:", error); loginErrorMessage.textContent = "Erro. Tente novamente."; loginErrorMessage.classList.remove('hidden'); loggedInUserRole = null; loggedInUserName = null; loggedInUserIdGlobal = null;}
}

function logout() {
    loggedInUserRole = null; loggedInUserName = null; loggedInUserIdGlobal = null;
    localStorage.removeItem('loggedInUserRole');
    localStorage.removeItem('loggedInUserName');
    localStorage.removeItem('loggedInUserId');

    const loggedInUserNameDisplay = document.getElementById('loggedInUserNameDisplay');
     if (loggedInUserNameDisplay) { loggedInUserNameDisplay.textContent = '';}
    document.body.classList.remove('app-visible');
    document.getElementById('loginScreen').classList.remove('hidden'); document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('codigoAcesso').value = ''; 
    const filtroStatusPedidoEl = document.getElementById('filtroStatusPedido');
    if (filtroStatusPedidoEl) filtroStatusPedidoEl.value = '';
    document.body.style.paddingTop = '0px'; 
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

    const statusEmFinalizacao = [
        "Aguardando Aprovação", 
        "Em Produção (Arte)", 
        "Em Produção (Impressão)",
        "Em Produção (Acabamento)",
        "Pronto para Retirada", 
        "Em Rota de Entrega"
    ];
    const pedidosEmFinalizacao = pedidosFiltrados.filter(p => 
        statusEmFinalizacao.includes(p.status)
    );

    const pedidosFinalizados = pedidosFiltrados.filter(p => p.status === 'Entregue');

    document.getElementById('userPedidosMes').textContent = pedidosEsteMes.length;
    document.getElementById('userPedidosFinalizacao').textContent = pedidosEmFinalizacao.length;
    document.getElementById('userPedidosFinalizados').textContent = pedidosFinalizados.length;
}

function configurarAcessoPorCargo(role) {
    document.querySelectorAll('.exo-menu > li, .exo-menu .drop-down-ul > li').forEach(item => {
        const acessoPermitido = item.dataset.roleAccess;
        if (acessoPermitido) { item.classList.toggle('hidden', !(acessoPermitido === "all" || (role && acessoPermitido.includes(role)))); }
    });
    const cadastrosDropdown = document.querySelector('.exo-menu-container .menu-bar-wrapper li.drop-down'); 
    if (cadastrosDropdown) {
        const subItensVisiveis = cadastrosDropdown.querySelectorAll('ul.drop-down-ul > li:not(.hidden)');
        cadastrosDropdown.classList.toggle('hidden', subItensVisiveis.length === 0);
    }
    const filtroStatusPedidoEl = document.getElementById('filtroStatusPedido');
    if (filtroStatusPedidoEl) {
        if (role === 'impressor') filtroStatusPedidoEl.value = 'Em Produção (Impressão)';
        else if (role === 'producao') filtroStatusPedidoEl.value = 'Em Produção (Acabamento)';
        else filtroStatusPedidoEl.value = ''; 
    }
    if (activeSectionId === 'visualizarPedidos') renderizarListaCompletaPedidos();
}

function ajustarPaddingBody() {
    const appContainer = document.getElementById('appContainer');
    const menuGlobalContainer = document.querySelector('.exo-menu-container'); 
    const notificationBar = document.getElementById('notificationBar');
    const bodyEl = document.body;
    
    let totalOffset = 0;
    if (menuGlobalContainer && appContainer && !appContainer.classList.contains('hidden')) {
        totalOffset += menuGlobalContainer.offsetHeight;
         if (notificationBar && notificationBar.classList.contains('visible')) {
            totalOffset += notificationBar.offsetHeight;
        }
        bodyEl.style.paddingTop = totalOffset + 'px';
        if (bodyEl.classList.contains('app-visible') && !document.getElementById('loginScreen').classList.contains('hidden')) {
            bodyEl.style.paddingLeft = '20px'; 
            bodyEl.style.paddingRight = '20px';
            bodyEl.style.paddingBottom = '20px'; 
        } else {
             bodyEl.style.paddingLeft = '0px'; 
            bodyEl.style.paddingRight = '0px';
            bodyEl.style.paddingBottom = '0px';
        }

    } else { // Para tela de login
        bodyEl.style.paddingTop = '0px'; 
        bodyEl.style.paddingLeft = '0px'; 
        bodyEl.style.paddingRight = '0px';
        bodyEl.style.paddingBottom = '0px';
    }
}
window.addEventListener('resize', ajustarPaddingBody); 

const toggleMenuBtnObserver = document.querySelector('.exo-menu-container .toggle-menu');
if (toggleMenuBtnObserver) {
    const observer = new MutationObserver(() => {
        ajustarPaddingBody();
    });
    const exoMenuToObserve = document.querySelector('.exo-menu-container .exo-menu');
    if (exoMenuToObserve) {
         observer.observe(exoMenuToObserve, { attributes: true, attributeFilter: ['class', 'style'] });
    }
}


let activeSectionId = 'telaInicial';
function setActiveMenuLink(targetSectionId) { 
    document.querySelectorAll('.exo-menu > li > a, .drop-down-ul > li > a').forEach(link => { 
        link.classList.remove('active'); 
        if (link.dataset.section === targetSectionId) {
            link.classList.add('active');
            const parentLi = link.closest('li.drop-down');
            if (parentLi) {
                parentLi.querySelector('a:first-child').classList.add('active');
            }
        }
    });
}

function mostrarSecao(idSecao, isMenuLink = false) { 
    if (!loggedInUserRole && idSecao !== 'loginScreen') { logout(); return; }
    
    document.querySelectorAll('.main-content-section').forEach(secao => {
        secao.classList.add('hidden');
        secao.classList.remove('active-section'); 
        secao.classList.remove('interactive-theme', 'interactive-theme-dashboard');
    });

    const targetSection = document.getElementById(idSecao);
    if (targetSection) {
        if (idSecao === 'telaInicial') {
            targetSection.classList.add('interactive-theme-dashboard');
        } else if (idSecao !== 'loginScreen') { 
            targetSection.classList.add('interactive-theme');
        }

        targetSection.classList.remove('hidden');
        void targetSection.offsetWidth; 
        targetSection.classList.add('active-section');

        activeSectionId = idSecao; 
        if(document.getElementById('mainContentArea')) document.getElementById('mainContentArea').scrollTop = 0;
        if (isMenuLink) {
            setActiveMenuLink(idSecao);
            const exoMenuEl = document.querySelector('.exo-menu-container .exo-menu');
            const toggleMenu = document.querySelector('.exo-menu-container .toggle-menu');
            if (window.innerWidth <= 768 && exoMenuEl && exoMenuEl.classList.contains('display')) {
                if (toggleMenu) toggleMenu.click(); 
            }
            document.querySelectorAll('.exo-menu-container li.drop-down.open').forEach(openDropdown => {
                const linkClickedIsChild = openDropdown.contains(document.querySelector(`.exo-menu a[data-section="${idSecao}"]`));
                if(!linkClickedIsChild || !openDropdown.querySelector('a:first-child').isEqualNode(document.querySelector(`.exo-menu a[data-section="${idSecao}"]`))) {
                   openDropdown.classList.remove('open');
                }
            });
        }
    } else { if (loggedInUserRole) mostrarSecao('telaInicial', true); return; }

    if (idSecao === 'novoPedido') {
         if (!editingOrderId) { 
            document.getElementById('pedidoDataHora').value = new Date().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
            document.getElementById('formNovoPedido').reset(); 
            document.getElementById('itensPedidoContainer').innerHTML = ''; document.getElementById('pagamentosContainer').innerHTML = ''; 
            itemPedidoCount = 0; pagamentoCount = 0; pedidoImagemBase64 = null; 
            const prevImg = document.getElementById('pedidoImagemPreview'), ph = document.getElementById('pedidoImagemPreviewPlaceholder');
            if (prevImg && ph) { prevImg.src = "#"; prevImg.classList.add('hidden'); ph.classList.remove('hidden'); }
            atualizarValorTotalPedido(); 
            document.querySelector('#formNovoPedido button[type="submit"]').innerHTML = '<i class="fas fa-check mr-1.5"></i>Guardar Pedido';
            document.getElementById('editingOrderIdField').value = ''; document.getElementById('pedidoClienteSearch').value = ''; 
            document.getElementById('pedidoClienteId').value = ''; document.getElementById('pedidoClienteResultados').classList.add('hidden'); 
        }
    } else {
        if (editingOrderId && activeSectionId !== 'novoPedido') {
            editingOrderId = null; document.getElementById('editingOrderIdField').value = '';
            document.querySelector('#formNovoPedido button[type="submit"]').innerHTML = '<i class="fas fa-check mr-1.5"></i>Guardar Pedido';
        }
    }
    if (idSecao === 'telaInicial') atualizarDashboard(); 
    if (idSecao === 'cadastrarCliente') { document.getElementById('pesquisaClienteInput').value = ''; renderizarListaClientes(); document.getElementById('detalhesClienteSelecionado').classList.add('hidden'); clienteSelecionadoId = null; }
    if (idSecao === 'cadastrarFornecedor') document.getElementById('formCadastrarFornecedor').reset();
    if (idSecao === 'visualizarPedidos') renderizarListaCompletaPedidos();
    ajustarPaddingBody();
}
window.mostrarSecao = mostrarSecao; 

function showNotification(config) {
    const notificationBar = document.getElementById('notificationBar');
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationActions = document.getElementById('notificationActions');

    if (!notificationBar || !notificationIcon || !notificationMessage || !notificationActions) {
        console.error("Elementos da barra de notificação não encontrados.");
        return;
    }

    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    notificationBar.className = 'notification-bar'; 
    notificationActions.innerHTML = '';
    notificationIcon.innerHTML = '';

    let iconClass = '';
    let barTypeClass = '';

    switch (config.type) {
        case 'success': iconClass = 'fas fa-check-circle'; barTypeClass = 'success'; break;
        case 'error': iconClass = 'fas fa-times-circle'; barTypeClass = 'error'; break;
        case 'warning': iconClass = 'fas fa-exclamation-triangle'; barTypeClass = 'warning'; break;
        case 'info': iconClass = 'fas fa-info-circle'; barTypeClass = 'info'; break;
        case 'confirm-delete': iconClass = 'fas fa-exclamation-triangle'; barTypeClass = 'confirm-delete'; break;
        default: iconClass = 'fas fa-info-circle'; barTypeClass = 'info';
    }

    notificationIcon.innerHTML = `<i class="${iconClass}"></i>`;
    notificationMessage.textContent = config.message;
    notificationBar.classList.add(barTypeClass);

    if (config.type === 'confirm-delete') {
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = config.confirmText || 'Excluir';
        confirmBtn.className = 'btn btn-confirm-action';
        confirmBtn.onclick = () => {
            if (config.onConfirm) config.onConfirm();
            hideNotification();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = config.cancelText || 'Cancelar';
        cancelBtn.className = 'btn btn-cancel-action';
        cancelBtn.onclick = () => {
            if (config.onCancel) config.onCancel();
            hideNotification();
        };
        notificationActions.appendChild(confirmBtn);
        notificationActions.appendChild(cancelBtn);
    } else {
        const duration = config.duration || 5000;
        notificationTimeout = setTimeout(() => {
            hideNotification();
        }, duration);
    }
    
    notificationBar.classList.add('visible');
    ajustarPaddingBody(); 
}

function hideNotification() {
    const notificationBar = document.getElementById('notificationBar');
    if (notificationBar) {
        notificationBar.classList.remove('visible');
    }
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    setTimeout(ajustarPaddingBody, 400);
}
window.exibirMensagem = (mensagem, tipo = 'info', duracao = 5000) => { 
    showNotification({ 
        message: mensagem, 
        type: tipo, 
        duration: duracao 
    });
}

function abrirModalEspecifico(overlayId, contentId) {
    const overlay = document.getElementById(overlayId); if (!overlay) return;
    overlay.classList.add('interactive-theme-modal'); 
    if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => { 
        overlay.classList.add('active'); 
        const content = document.getElementById(contentId); 
        if(content) { 
            content.classList.remove('opacity-0', 'scale-95'); 
            content.classList.add('opacity-100', 'scale-100'); 
        } 
    });
}
function fecharModalEspecifico(overlayId, contentId, callback) {
    const overlay = document.getElementById(overlayId); if (!overlay) return;
    overlay.classList.remove('active'); 
    const content = document.getElementById(contentId); 
    if(content) { 
        content.classList.remove('opacity-100', 'scale-100'); 
        content.classList.add('opacity-0', 'scale-95'); 
    }
    setTimeout(() => { 
        overlay.classList.add('hidden');          
        if (callback) callback(); 
        overlay.classList.remove('interactive-theme-modal'); 
    }, 300); // tempo para transição
}

window.abrirModalNovoClienteRapido = () => { const form = document.getElementById('formNovoClienteRapido'); if(form) form.reset(); abrirModalEspecifico('modalNovoClienteRapidoOverlay', 'modalNovoClienteRapidoContent'); };
window.fecharModalNovoClienteRapido = () => fecharModalEspecifico('modalNovoClienteRapidoOverlay', 'modalNovoClienteRapidoContent');
window.abrirModalEditarCodigoFuncionario=(fId,nome,cA)=>{ document.getElementById('funcionarioIdParaEditarCodigo').value=fId; document.getElementById('nomeFuncionarioParaEditarCodigo').textContent=`Funcionário: ${nome}`; document.getElementById('novoCodigoAcesso').value=cA||''; abrirModalEspecifico('modalEditarCodigoFuncionarioOverlay','modalEditarCodigoFuncionarioContent'); }
window.fecharModalEditarCodigoFuncionario=()=>fecharModalEspecifico('modalEditarCodigoFuncionarioOverlay','modalEditarCodigoFuncionarioContent');

window.abrirModalMudarStatus = (pedidoId, numeroPedido, clienteNome, statusAtual) => {
    document.getElementById('pedidoIdParaMudarStatus').value = pedidoId;
    document.getElementById('infoPedidoParaMudarStatus').innerHTML = `<strong>Pedido:</strong> ${numeroPedido}<br><strong>Cliente:</strong> ${clienteNome}`;
    document.getElementById('novoStatusPedido').value = statusAtual;
    abrirModalEspecifico('modalMudarStatusOverlay', 'modalMudarStatusContent');
}
window.fecharModalMudarStatus = () => fecharModalEspecifico('modalMudarStatusOverlay', 'modalMudarStatusContent');

async function handleSalvarNovoStatus(event) {
    event.preventDefault();
    if (!auth.currentUser) {
        exibirMensagem("Sem permissão. Faça o login novamente.", "error");
        return;
    }
    const pedidoId = document.getElementById('pedidoIdParaMudarStatus').value;
    const novoStatus = document.getElementById('novoStatusPedido').value;

    if (!pedidoId || !novoStatus) {
        exibirMensagem("Erro ao obter dados para atualização.", "error");
        return;
    }

    const pedidoDocRef = doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId);
    try {
        await updateDoc(pedidoDocRef, { status: novoStatus });
        exibirMensagem("Estado do pedido atualizado com sucesso!", "success");
        fecharModalMudarStatus();
    } catch (error) {
        console.error("Erro ao atualizar estado do pedido:", error);
        exibirMensagem("Erro ao atualizar o estado.", "error");
    }
}

window.toggleItemProductionStep = async (pedidoId, itemIndex, stepName, isChecked) => {
    if (!auth.currentUser) {
        exibirMensagem("Sem permissão. Faça o login novamente.", "error");
        return;
    }

    let podeMarcar = false;
    if (loggedInUserRole === 'admin' || loggedInUserRole === 'designer') {
        podeMarcar = true;
    } else if (loggedInUserRole === 'impressor' && stepName === 'impressao') {
        podeMarcar = true;
    } else if (loggedInUserRole === 'producao' && stepName === 'acabamento') {
        podeMarcar = true;
    }

    if (!podeMarcar) {
        exibirMensagem(`O seu cargo (${loggedInUserRole}) não tem permissão para marcar a etapa '${stepName}'.`, "error");
        try {
             const printWindow = window.open('', `Pedido: ${pedidoId}`);
             if (printWindow && !printWindow.closed) {
                const checkbox = printWindow.document.getElementById(`step-${stepName}-${pedidoId}-${itemIndex}`);
                if (checkbox) checkbox.checked = !isChecked;
            }
        } catch(e) {
            console.warn("Não foi possível reverter o checkbox na janela de impressão. Ela pode estar fechada ou bloqueada.");
        }
        return;
    }

    const pedidoDocRef = doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId);
    const pedidoParaAtualizar = todosOsPedidosCache.find(p => p.id === pedidoId);

    if (pedidoParaAtualizar && pedidoParaAtualizar.itens[itemIndex] != null) {
        const novosItens = [...pedidoParaAtualizar.itens];
        const item = novosItens[itemIndex];
        
        if (!item.productionSteps) { item.productionSteps = {}; }
        if (!item.productionSteps[stepName]) { item.productionSteps[stepName] = {}; }
        
        item.productionSteps[stepName].concluido = isChecked;
        if (isChecked) {
            item.productionSteps[stepName].concluidoPor = loggedInUserName;
            item.productionSteps[stepName].concluidoEm = Timestamp.now();
        } else {
            item.productionSteps[stepName].concluidoPor = null;
            item.productionSteps[stepName].concluidoEm = null;
        }
        
        try {
            await updateDoc(pedidoDocRef, { itens: novosItens });
            exibirMensagem(`Etapa '${stepName}' do item ${itemIndex + 1} atualizada.`, 'success', 2000);
        } catch (error) {
            console.error("Erro ao atualizar etapa de produção:", error);
            exibirMensagem("Erro ao atualizar a etapa de produção.", "error");
        }
    } else {
         exibirMensagem("Não foi possível encontrar o pedido ou o item para atualizar.", "error");
    }
};


window.marcarComoEntregue = async (pedidoId) => {
    if (!auth.currentUser || !pedidoId) {
        exibirMensagem("Ação inválida. Faça login novamente.", "error");
        return;
    }
    const pedidoDocRef = doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId);
    const dadosUpdate = {
        status: 'Entregue',
        entreguePorNome: loggedInUserName,
        entreguePorId: loggedInUserIdGlobal,
        entregueEm: Timestamp.now()
    };
    try {
        await updateDoc(pedidoDocRef, dadosUpdate);
        exibirMensagem("Pedido marcado como Entregue!", "success");
    } catch (error) {
        console.error("Erro ao marcar pedido como entregue:", error);
        exibirMensagem("Erro ao atualizar o estado do pedido.", "error");
    }
};

window.abrirDetalhesPedidoNovaGuia = (pedido) => {
    const reconstructTimestamp = (tsObj) => (tsObj && typeof tsObj.seconds === 'number' && typeof tsObj.nanoseconds === 'number') ? new Timestamp(tsObj.seconds, tsObj.nanoseconds) : null;
    const formatDate = (ts) => { const t = reconstructTimestamp(ts); return t ? t.toDate().toLocaleDateString('pt-BR') : 'N/A'; };
    const formatDateTime = (ts) => { const t = reconstructTimestamp(ts); return t ? t.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'; };
    
    const podeMarcarImpressao = ['admin', 'designer', 'impressor'].includes(loggedInUserRole);
    const podeMarcarAcabamento = ['admin', 'designer', 'producao'].includes(loggedInUserRole);

    let dataPedidoTexto = formatDateTime(pedido.dataPedido);
    let dataEntregaFormatada = formatDate(pedido.dataEntrega);
    const dataEntregaTS = reconstructTimestamp(pedido.dataEntrega);
    if (dataEntregaTS && (dataEntregaTS.toDate().getHours() !== 0 || dataEntregaTS.toDate().getMinutes() !== 0)) {
        dataEntregaFormatada = formatDateTime(pedido.dataEntrega);
    }
    
    let entregaHtml = '';
    if (pedido.entreguePorNome && pedido.entregueEm) {
         entregaHtml = `<p><strong>Entrega confirmada por:</strong> ${pedido.entreguePorNome} em ${formatDateTime(pedido.entregueEm)}</p>`;
    }

    let descricaoGeralHtml = pedido.descricaoGeral ? `<div class="section-title">Descrição Geral</div><p><strong>${pedido.descricaoGeral.replace(/\n/g, '<br>')}</strong></p>` : '';

    let itensHtml = pedido.itens?.length > 0 ? pedido.itens.map((item, index) => {
        const itemDesc = item.descricao ? `<br><small style="color: #555; padding-left: 15px;">&hookrightarrow; ${item.descricao}</small>` : '';
        const dimensoes = item.tipoProduto === 'metro' && item.largura && item.altura ? ` (${item.largura.toFixed(2)}m x ${item.altura.toFixed(2)}m)` : '';
        
        const steps = item.productionSteps || { impressao: { concluido: false }, acabamento: { concluido: false } };
        
        let stepsHtml = `<div class="production-steps">`;

        const impressaoConcluida = steps.impressao?.concluido;
        const impressaoInfo = impressaoConcluida ? `<span class="info-icon" title="Por: ${steps.impressao.concluidoPor || 'N/A'} em ${formatDateTime(steps.impressao.concluidoEm) || 'N/A'}">ⓘ</span>` : '';
        stepsHtml += `
            <span class="step">
                <input type="checkbox" id="step-impressao-${pedido.id}-${index}" 
                       onchange="window.opener.toggleItemProductionStep('${pedido.id}', ${index}, 'impressao', this.checked)"
                       ${impressaoConcluida ? 'checked' : ''}
                       ${!podeMarcarImpressao ? 'disabled' : ''}>
                <label for="step-impressao-${pedido.id}-${index}" class="${!podeMarcarImpressao ? 'disabled-label' : ''}">Impressão</label>
                ${impressaoInfo}
            </span>`;
        
        const acabamentoConcluida = steps.acabamento?.concluido;
        const acabamentoInfo = acabamentoConcluida ? `<span class="info-icon" title="Por: ${steps.acabamento.concluidoPor || 'N/A'} em ${formatDateTime(steps.acabamento.concluidoEm) || 'N/A'}">ⓘ</span>` : '';
        stepsHtml += `
            <span class="step">
                <input type="checkbox" id="step-acabamento-${pedido.id}-${index}" 
                       onchange="window.opener.toggleItemProductionStep('${pedido.id}', ${index}, 'acabamento', this.checked)"
                       ${acabamentoConcluida ? 'checked' : ''}
                       ${!podeMarcarAcabamento ? 'disabled' : ''}>
                <label for="step-acabamento-${pedido.id}-${index}" class="${!podeMarcarAcabamento ? 'disabled-label' : ''}">Acabamento</label>
                ${acabamentoInfo}
            </span>`;

        stepsHtml += `</div>`;

        return `
            <li>
                <div class="item-details">
                    ${item.quantidade}x ${item.produtoNome}${dimensoes} - R$ ${item.valorItem.toFixed(2).replace('.', ',')}${itemDesc}
                </div>
                ${stepsHtml}
            </li>`;
    }).join('') : '<li>Nenhum item.</li>';


    let pagamentosHtml = 'Nenhum pagamento.';
    let totalPagoCalculado = 0;
    if (pedido.pagamentos?.length > 0) {
        pagamentosHtml = '<ul>';
        pedido.pagamentos.forEach(pgto => {
            const dP = pgto.dataPagamento ? formatDateTime(pgto.dataPagamento) : 'N/A';
            pagamentosHtml += `<li>${pgto.forma}: R$ ${pgto.valorPago.toFixed(2).replace('.',',')} ${pgto.observacao?'('+pgto.observacao+')':''} - Data: ${dP}</li>`;
            totalPagoCalculado += pgto.valorPago;
        });
        pagamentosHtml += '</ul>';
    }
    
    const valorRestanteCalculado = (pedido.valorTotal || 0) - totalPagoCalculado;
    
    const conteudoHtml = `<html><head><title>Pedido: ${pedido.numeroPedido||'N/A'}</title><style>body{font-family:'Poppins',Arial,sans-serif;margin:20px;background-color:#f1f5f9;color:#334155;font-size:14px}:root{--color-primary:#0ea5e9;--color-text-main:#334155;--color-text-heading:#1e293b;--color-text-muted:#64748b;--color-border-soft:#e2e8f0;--color-border-medium:#cbd5e1;--shadow-lg:0 10px 15px -3px rgb(0 0 0 / 0.07),0 4px 6px -4px rgb(0 0 0 / 0.07)}.container{max-width:700px;margin:auto;background-color:#fff;padding:25px;border-radius:12px;box-shadow:var(--shadow-lg);border:1px solid var(--color-border-soft)}.company-header{display:flex;align-items:center;margin-bottom:25px;padding-bottom:15px;border-bottom:1px solid var(--color-border-soft)}.company-header img{max-height:50px;margin-right:20px}.company-header .company-info p{margin:2px 0;font-size:.9em;color:var(--color-text-muted)}.company-header .company-info strong{color:var(--color-text-heading);font-weight:600}h1{text-align:center;color:var(--color-primary);border-bottom:2px solid var(--color-primary);padding-bottom:10px;margin-bottom:25px;font-size:1.6em;font-weight:600}.section-title{font-size:1.15em;font-weight:600;color:var(--color-text-heading);margin-top:25px;margin-bottom:10px;border-bottom:1px solid var(--color-border-medium);padding-bottom:6px}p{margin-bottom:8px;line-height:1.65}strong{font-weight:500;color:var(--color-text-main)}ul{list-style:none;margin-left:0;padding-left:5px}li{margin-bottom:12px;display:flex;flex-wrap:wrap;align-items:flex-start;padding-bottom:8px;border-bottom:1px dashed #e2e8f0}.item-details{flex-grow:1;margin-bottom:5px;width:100%}.production-steps{display:flex;gap:20px;padding-left:15px;width:100%}.production-steps .step{display:flex;align-items:center;gap:5px}.production-steps .step label{cursor:pointer;font-size:.9em}.production-steps .step input[type=checkbox]:disabled + label{cursor:not-allowed;color:#9ca3af;}.info-icon{margin-left:5px;font-weight:bold;color:#64748b;cursor:help;font-size:1.1em}.total-section{margin-top:30px;padding-top:20px;border-top:2px solid var(--color-primary);text-align:right}.total-section p{font-size:1.25em;font-weight:600;color:var(--color-primary)}.payment-summary p{font-size:1.05em;margin-bottom:4px;text-align:right}.payment-summary strong{font-weight:600}.print-button-container{text-align:center;margin-top:30px}.print-button{background-color:var(--color-primary);color:white;padding:12px 24px;border:none;border-radius:8px;font-size:1em;cursor:pointer;transition:background-color .2s}.print-button:hover{background-color:#0284c7}.footer-note{font-size:.85em;color:var(--color-text-muted);text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid var(--color-border-soft)}img.pedido-preview-print{max-width:100%;max-height:280px;display:block;margin:20px auto;border:1px solid var(--color-border-medium);border-radius:8px;page-break-inside:avoid;object-fit:contain}@media print{body{margin:0;padding:0;background-color:#fff;color:#000;font-size:10pt;--color-primary:#0ea5e9;--color-text-main:#000}.container{margin:0;padding:10mm;box-shadow:none;border-radius:0;border:none;width:100%;max-width:100%}.print-button-container{display:none}h1{color:var(--color-primary)!important;border-color:var(--color-primary)!important}}</style></head><body><div class="container"><div class="company-header"><img src="https://placehold.co/150x50/0ea5e9/FFFFFF?text=SuaGrafica&font=poppins" alt="Logo da Gráfica"><div class="company-info"><p><strong>Empresa:</strong> Gráfica Exemplo</p><p><strong>CNPJ:</strong> 00.000.000/0001-00</p><p><strong>Endereço:</strong> Rua Exemplo, 123, Cidade</p><p><strong>Telefone:</strong> (00) 0000-0000</p><p><strong>Email:</strong> contato@suagrafica.com</p></div></div><h1>Pedido: ${pedido.numeroPedido||'N/A'}</h1><div class="section-title">Cliente</div><p><strong>Nome:</strong> ${pedido.clienteNome||'N/A'}</p><div class="section-title">Pedido</div><p><strong>Número:</strong> ${pedido.numeroPedido||'N/A'}</p><p><strong>Data:</strong> ${dataPedidoTexto}</p><p><strong>Entrega:</strong> ${dataEntregaFormatada}</p><p><strong>Vendedor:</strong> ${pedido.vendedorNome||'N/A'}</p><p><strong>Estado:</strong> ${pedido.status||'N/A'}</p>${entregaHtml}<div class="section-title">Pagamentos</div>${pagamentosHtml}<div class="section-title">Itens</div><ul>${itensHtml}</ul>${descricaoGeralHtml}${pedido.imagemPreviewPedidoBase64?`<div class="section-title">Preview</div><img class="pedido-preview-print" src="${pedido.imagemPreviewPedidoBase64}" alt="Preview" />`:''}<div class="payment-summary total-section"><p><strong>Total Pedido:</strong> R$ ${pedido.valorTotal?.toFixed(2).replace('.',',')||'0,00'}</p><p><strong>Total Pago:</strong> R$ ${totalPagoCalculado.toFixed(2).replace('.',',')}</p>${valorRestanteCalculado>0?`<p style="color:red"><strong>Restante:</strong> R$ ${valorRestanteCalculado.toFixed(2).replace('.',',')}</p>`:'<p style="color:green"><strong>Quitado</strong></p>'}</div><div class="print-button-container"><button class="print-button" onclick="window.print()">Imprimir</button></div><p class="footer-note">Gerado em: ${new Date().toLocaleString('pt-BR')}</p></div></body></html>`; 
    
    const nG = window.open('', `Pedido: ${pedido.numeroPedido || 'detalhes'}`); 
    if (nG) { 
        nG.document.open(); 
        nG.document.write(conteudoHtml); 
        nG.document.close(); 
    } else { 
        exibirMensagem("Bloqueador de pop-up impediu nova guia.", "warning"); 
    } 
}

const formCadastrarCliente = document.getElementById('formCadastrarCliente'); formCadastrarCliente.addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const d = { nome:document.getElementById('clienteNome').value, tipoCliente:document.getElementById('clienteTipo').value, telefone:document.getElementById('clienteTelefone').value, email:document.getElementById('clienteEmail').value, cpfCnpj:document.getElementById('clienteCpfCnpj').value, endereco:document.getElementById('clienteEndereco').value, criadoEm:Timestamp.now() }; try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/clientes`), d); exibirMensagem('Cliente registado com sucesso!', 'success'); formCadastrarCliente.reset(); } catch (err) { console.error(err); exibirMensagem('Erro ao registar cliente.', 'error'); } });
function renderizarListaClientes() { const lE = document.getElementById('listaClientes'); const pI = document.getElementById('pesquisaClienteInput'); const tP = pI ? pI.value.toLowerCase() : ''; if (!lE) return; lE.innerHTML = ''; const cF = clientesCache.filter(c => (c.nome&&c.nome.toLowerCase().includes(tP))||(c.telefone&&c.telefone.toLowerCase().includes(tP))||(c.email&&c.email.toLowerCase().includes(tP))); if (cF.length === 0) { lE.innerHTML = `<p class="text-sm text-center py-3">${tP?'Nenhum cliente encontrado.':'Nenhum cliente registado.'}</p>`; document.getElementById('detalhesClienteSelecionado').classList.add('hidden'); clienteSelecionadoId = null; return; } cF.forEach(c => { const d=document.createElement('div'); d.className=`item-list-display ${c.id===clienteSelecionadoId?'selected':''}`; d.onclick=()=>exibirDetalhesClienteEProcurarPedidos(c.id); let tipo=c.tipoCliente==='revenda'?'Revenda':'Final'; d.innerHTML=`<strong>${c.nome}</strong> <span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle">${tipo}</span><div class="meta">${c.telefone||'S/ Telefone'}</div>`; lE.appendChild(d); }); }
function exibirDetalhesClienteEProcurarPedidos(id) { clienteSelecionadoId = id; renderizarListaClientes(); const cli = clientesCache.find(c => c.id === id); const dD = document.getElementById('detalhesClienteSelecionado'), iCD = document.getElementById('infoCliente'), pLD = document.getElementById('pedidosDoClienteLista'); if (!cli||!dD||!iCD||!pLD) return; iCD.innerHTML = `<p><strong>Nome:</strong> ${cli.nome||'N/A'}</p><p><strong>Tel:</strong> ${cli.telefone||'N/A'}</p><p><strong>Email:</strong> ${cli.email||'N/A'}</p><p><strong>Tipo:</strong> ${cli.tipoCliente==='revenda'?'Revenda':'Final'}</p>${cli.cpfCnpj?`<p><strong>CPF/CNPJ:</strong> ${cli.cpfCnpj}</p>`:''}${cli.endereco?`<p><strong>Endereço:</strong> ${cli.endereco}</p>`:''}`; dD.classList.remove('hidden'); pLD.innerHTML = '<p class="text-xs text-center py-2">A carregar...</p>'; const pDC = todosOsPedidosCache.filter(p => p.clienteId === id); pDC.sort((a,b)=>(b.dataPedido?.toMillis()||0)-(a.dataPedido?.toMillis()||0)); if (pDC.length === 0) { pLD.innerHTML = '<p class="text-xs text-center py-2">Nenhum pedido para este cliente.</p>'; return; } pLD.innerHTML = ''; pDC.forEach(p => { const iPD=document.createElement('div'); iPD.className='p-2.5 border-b text-xs last:border-b-0'; const dP=p.dataPedido?.toDate().toLocaleDateString('pt-BR')||'N/A'; iPD.innerHTML = `<div class="flex justify-between items-center"><span class="font-medium">${p.numeroPedido}</span><span class="text-opacity-80">${dP}</span></div><div class="flex justify-between items-center mt-1"><span>R$ ${p.valorTotal.toFixed(2).replace('.',',')}</span>${getStatusBadgeSimpleHTML(p)}</div><button onclick="abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(p))}')))" class="btn btn-link text-xs p-0 mt-1">Ver detalhes</button>`; pLD.appendChild(iPD); }); }
function carregarClientes() { if (!auth.currentUser) return; const q = query(collection(db, `artifacts/${shopInstanceAppId}/clientes`)); onSnapshot(q, (snap) => { clientesCache = []; if (snap.empty && activeSectionId === 'cadastrarCliente') document.getElementById('listaClientes').innerHTML = '<p class="text-sm text-center py-3">Nenhum cliente registado.</p>'; snap.forEach(doc => clientesCache.push({ id: doc.id, ...doc.data() })); clientesCache.sort((a, b) => (a.nome||"").localeCompare(b.nome||"")); if (activeSectionId === 'cadastrarCliente') renderizarListaClientes(); if (activeSectionId === 'telaInicial') atualizarDashboard(); }, e => { console.error("Erro clientes:", e); exibirMensagem("Erro ao carregar clientes.", "error"); }); }
document.getElementById('formNovoClienteRapido').addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const nome=document.getElementById('clienteRapidoNome').value, tel=document.getElementById('clienteRapidoTelefone').value, tipo=document.getElementById('clienteRapidoTipo').value; if (!nome.trim()) { exibirMensagem("Nome do cliente é obrigatório.", "warning"); return; } try { const ref = await addDoc(collection(db, `artifacts/${shopInstanceAppId}/clientes`), { nome, telefone:tel, tipoCliente:tipo, email:'', cpfCnpj:'', endereco:'', criadoEm:Timestamp.now() }); exibirMensagem('Cliente registado com sucesso!', 'success'); fecharModalNovoClienteRapido(); document.getElementById('pedidoClienteSearch').value = nome; document.getElementById('pedidoClienteId').value = ref.id; document.getElementById('pedidoClienteResultados').innerHTML = ''; document.getElementById('pedidoClienteResultados').classList.add('hidden'); } catch (err) { console.error(err); exibirMensagem('Erro ao registar cliente.', 'error'); } });
const pedidoClienteSearchEl = document.getElementById('pedidoClienteSearch'); const pedidoClienteResultadosEl = document.getElementById('pedidoClienteResultados'); const pedidoClienteIdEl = document.getElementById('pedidoClienteId'); if (pedidoClienteSearchEl) { pedidoClienteSearchEl.addEventListener('input', () => { const t=pedidoClienteSearchEl.value.toLowerCase(); pedidoClienteResultadosEl.innerHTML=''; if(t.length<2){pedidoClienteResultadosEl.classList.add('hidden');pedidoClienteIdEl.value='';return;} const res=clientesCache.filter(c=>(c.nome&&c.nome.toLowerCase().includes(t))||(c.telefone&&String(c.telefone).toLowerCase().includes(t))||(c.email&&c.email.toLowerCase().includes(t))); if(res.length>0){res.forEach(cli=>{const d=document.createElement('div');d.textContent=`${cli.nome} ${cli.telefone?'- '+cli.telefone:''}`;d.onclick=()=>{pedidoClienteSearchEl.value=cli.nome;pedidoClienteIdEl.value=cli.id;pedidoClienteResultadosEl.classList.add('hidden');pedidoClienteResultadosEl.innerHTML='';};pedidoClienteResultadosEl.appendChild(d);});pedidoClienteResultadosEl.classList.remove('hidden');}else{const d=document.createElement('div');d.textContent='Nenhum cliente encontrado.';d.classList.add('italic');pedidoClienteResultadosEl.appendChild(d);pedidoClienteResultadosEl.classList.remove('hidden');pedidoClienteIdEl.value='';} }); document.addEventListener('click', (ev) => { if (pedidoClienteSearchEl&&!pedidoClienteSearchEl.contains(ev.target)&&pedidoClienteResultadosEl&&!pedidoClienteResultadosEl.contains(ev.target)) pedidoClienteResultadosEl.classList.add('hidden'); }); }
window.togglePrecoFields=()=>{const t=document.getElementById('produtoTipoPreco')?.value; if(!t)return; document.getElementById('precoUnidadeFields').classList.toggle('hidden',t==='metro');document.getElementById('precoMetroFields').classList.toggle('hidden',t==='unidade');};
document.getElementById('formCadastrarProduto').addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const d={nome:document.getElementById('produtoNome').value,tipoPreco:document.getElementById('produtoTipoPreco').value,precoUnidade:parseFloat(document.getElementById('produtoPrecoUnidade').value)||0,precoMetro:parseFloat(document.getElementById('produtoPrecoMetro').value)||0,descricao:document.getElementById('produtoDescricao').value,criadoEm:Timestamp.now()}; if(!d.nome.trim()){exibirMensagem("Nome do produto é obrigatório.","warning");return;} try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/produtos`), d); exibirMensagem('Produto registado com sucesso!', 'success'); e.target.reset(); togglePrecoFields(); } catch (err) { console.error(err); exibirMensagem('Erro ao registar produto.', 'error'); } });
function carregarProdutos() { if (!auth.currentUser) return; const q = query(collection(db, `artifacts/${shopInstanceAppId}/produtos`)); onSnapshot(q, (snap) => { const l=document.getElementById('listaProdutos'); if(l)l.innerHTML=''; produtosCache=[]; if(snap.empty){if(l)l.innerHTML='<p class="text-sm text-center py-3">Nenhum produto registado.</p>';} const pS=[]; snap.forEach(doc=>pS.push({id:doc.id,...doc.data()})); pS.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); pS.forEach(p=>{produtosCache.push(p);if(l){const d=document.createElement('div');d.className='item-list-display !cursor-default';let i=p.tipoPreco==='metro'?`R$ ${(p.precoMetro||0).toFixed(2).replace('.',',')}/m²`:`R$ ${(p.precoUnidade||0).toFixed(2).replace('.',',')}/un`;d.innerHTML=`<strong>${p.nome}</strong><div class="meta">${i}</div>`;l.appendChild(d);}}); document.querySelectorAll('.produto-select').forEach(s=>popularSelectProduto(s)); }, e => { console.error("Erro produtos:", e); exibirMensagem("Erro ao carregar produtos.", "error"); }); }
const formCadastrarFuncionario = document.getElementById('formCadastrarFuncionario'); formCadastrarFuncionario.addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const d={nome:document.getElementById('funcionarioNome').value,contato:document.getElementById('funcionarioContato').value,cargo:document.getElementById('funcionarioCargo').value.toLowerCase(),codigoAcesso:document.getElementById('funcionarioCodigoAcesso').value,criadoEm:Timestamp.now()}; if(!d.nome.trim()||!d.cargo.trim()||!d.codigoAcesso.trim()){exibirMensagem("Preencha todos os campos obrigatórios do funcionário.","warning");return;} try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`), d); exibirMensagem('Funcionário registado com sucesso!', 'success'); formCadastrarFuncionario.reset(); } catch (err) { console.error(err); exibirMensagem('Erro ao registar funcionário.', 'error'); } });
function carregarFuncionarios() { if (!auth.currentUser) return; const q=query(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`)); onSnapshot(q, (snap)=>{ const selPV=document.getElementById('pedidoVendedor'), lF=document.getElementById('listaFuncionarios'), fVS=document.getElementById('filtroVendedor'); if(selPV)selPV.innerHTML='<option value="">Selecione funcionário</option>'; if(lF)lF.innerHTML=''; if(fVS)fVS.innerHTML='<option value="">Todos Funcionários</option>'; funcionariosCache=[]; if(snap.empty){if(lF)lF.innerHTML='<p class="text-sm text-center py-3">Nenhum funcionário registado.</p>';} const fS=[]; snap.forEach(doc=>fS.push({id:doc.id,...doc.data()})); fS.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); fS.forEach(f=>{funcionariosCache.push(f);if(selPV){const o=document.createElement('option');o.value=f.id;o.textContent=f.nome;selPV.appendChild(o);} if(lF){const d=document.createElement('div');d.className='item-list-display !cursor-default flex justify-between items-center'; let cD=loggedInUserRole==='admin'?`<span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle ml-2">Código: ${f.codigoAcesso||'N/D'}</span>`:''; let eB=loggedInUserRole==='admin'?`<button onclick="abrirModalEditarCodigoFuncionario('${f.id}','${f.nome}','${f.codigoAcesso||''}')" class="btn-icon-action text-blue-500 ml-2" title="Editar Código"><i class="fas fa-key"></i></button>`:''; d.innerHTML=`<div><strong>${f.nome}</strong><span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle ml-1">${f.cargo||'N/A'}</span>${cD}<div class="meta">Contacto: ${f.contato||'N/A'}</div></div>${eB}`;lF.appendChild(d);} if(fVS){const o=document.createElement('option');o.value=f.id;o.textContent=f.nome;fVS.appendChild(o);}}); }, e => { console.error("Erro funcionários:", e); exibirMensagem("Erro ao carregar funcionários.", "error"); }); }
async function handleSalvarNovoCodigoFuncionario(ev){ev.preventDefault();if(!auth.currentUser||loggedInUserRole!=='admin'){exibirMensagem("Apenas administradores podem alterar códigos.","error");return;}const fId=document.getElementById('funcionarioIdParaEditarCodigo').value,nC=document.getElementById('novoCodigoAcesso').value;if(!nC.trim()){exibirMensagem("O novo código de acesso não pode estar vazio.","warning");return;}try{const fR=doc(db,`artifacts/${shopInstanceAppId}/funcionarios`,fId);await updateDoc(fR,{codigoAcesso:nC});exibirMensagem("Código de acesso atualizado com sucesso!","success");fecharModalEditarCodigoFuncionario();}catch(err){console.error(err);exibirMensagem("Erro ao atualizar código de acesso.","error");}}
const formCadastrarFornecedor = document.getElementById('formCadastrarFornecedor'); formCadastrarFornecedor.addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const d={nome:document.getElementById('fornecedorNome').value,contato:document.getElementById('fornecedorContato').value,tipoMaterial:document.getElementById('fornecedorMaterial').value,criadoEm:Timestamp.now()}; if(!d.nome.trim()){exibirMensagem("Nome do fornecedor é obrigatório.","warning");return;} try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/fornecedores`), d); exibirMensagem('Fornecedor registado com sucesso!', 'success'); formCadastrarFornecedor.reset(); } catch (err) { console.error(err); exibirMensagem('Erro ao registar fornecedor.', 'error'); } });
function carregarFornecedores() { if (!auth.currentUser) return; const q=query(collection(db, `artifacts/${shopInstanceAppId}/fornecedores`)); onSnapshot(q, (snap)=>{ const l=document.getElementById('listaFornecedores');if(l)l.innerHTML='';fornecedoresCache=[];if(snap.empty){if(l)l.innerHTML='<p class="text-sm text-center py-3">Nenhum fornecedor registado.</p>';} const fS=[];snap.forEach(doc=>fS.push({id:doc.id,...doc.data()}));fS.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); fS.forEach(f=>{fornecedoresCache.push(f);if(l){const d=document.createElement('div');d.className='item-list-display !cursor-default';let cD=f.contato||'N/A';const cCC=f.contato?String(f.contato).replace(/\D/g,''):'';if(cCC.length>=8&&cCC.length<=15&&/^\d+$/.test(cCC)){ let wN=cCC; if(!wN.startsWith('55')&&(wN.length===10||wN.length===11))wN='55'+wN;else if(wN.startsWith('55')&&wN.length>13){const p=wN.split('55');if(p.length>1)wN='55'+p.pop();}cD=`<a href="https://wa.me/${wN}" target="_blank" class="text-green-500 hover:text-green-600 hover:underline inline-flex items-center"><i class="fab fa-whatsapp mr-1.5"></i> ${f.contato}</a>`;}else if(f.contato&&f.contato.includes('@'))cD=`<a href="mailto:${f.contato}" class="text-[var(--color-primary)] hover:underline">${f.contato}</a>`;d.innerHTML=`<strong>${f.nome}</strong><div class="meta">Contacto: ${cD}</div><div class="meta">Material: ${f.tipoMaterial||'N/A'}</div>`;l.appendChild(d);}}); }, e => { console.error("Erro fornecedores:", e); exibirMensagem("Erro ao carregar fornecedores.", "error"); }); }

function resizeImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function processImageFilePedido(file) {
    const pI = document.getElementById('pedidoImagemPreview');
    const pH = document.getElementById('pedidoImagemPreviewPlaceholder');

    if (file && file.type.startsWith('image/')) {
        try {
            const resizedBase64 = await resizeImage(file, 800, 800, 0.7);
            pedidoImagemBase64 = resizedBase64;
            
            if (pI && pH) {
                pI.src = resizedBase64;
                pI.classList.remove('hidden');
                pH.classList.add('hidden');
            }
        } catch (error) {
            console.error("Erro ao redimensionar imagem:", error);
            exibirMensagem("Não foi possível processar a imagem.", "error");
            pedidoImagemBase64 = null;
            if (pI && pH) {
                pI.src = "#";
                pI.classList.add('hidden');
                pH.classList.remove('hidden');
            }
        }
    } else {
        pedidoImagemBase64 = null;
        if (pI && pH) {
            pI.src = "#";
            pI.classList.add('hidden');
            pH.classList.remove('hidden');
        }
        if (file) {
            exibirMensagem("Arquivo de imagem inválido.", "warning");
        }
    }
}

window.handleImagemFilePedido=(ev)=>{processImageFilePedido(ev.target.files[0]);ev.target.value=null;}
function handlePasteImagePedido(ev){ev.preventDefault();const iT=(ev.clipboardData||ev.originalEvent.clipboardData).items;for(let i in iT){const it=iT[i];if(it.kind==='file'&&it.type.startsWith('image/')){processImageFilePedido(it.getAsFile());break;}}}
function popularSelectProduto(sel){sel.innerHTML='<option value="">Selecione produto</option>';produtosCache.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.nome;o.dataset.tipo=p.tipoPreco;o.dataset.precoMetro=p.precoMetro||0;o.dataset.precoUnidade=p.precoUnidade||0;sel.appendChild(o);});}
window.adicionarItemPedidoForm = (itemParaEditar = null) => {
    itemPedidoCount++;
    const c = document.getElementById('itensPedidoContainer');
    const d = document.createElement('div');
    d.className = 'p-3.5 border rounded-lg space-y-2.5 item-pedido-form relative';
    d.id = `itemPedido-${itemPedidoCount}`;
    d.innerHTML = `
        <button type="button" onclick="removerItemPedidoForm(${itemPedidoCount})" class="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors text-xs"><i class="fas fa-times"></i></button>
        <h4 class="font-medium text-sm">Item ${itemPedidoCount}</h4>
        <div>
            <label class="label-text text-xs">Produto:</label>
            <select class="input-field input-field-sm produto-select" id="itemProduto-${itemPedidoCount}" onchange="toggleCamposProduto(${itemPedidoCount})"></select>
        </div>
        <div class="mt-2">
            <label class="label-text text-xs">Descrição do Item (Opcional):</label>
            <input type="text" class="input-field input-field-sm item-descricao" id="itemDescricao-${itemPedidoCount}" placeholder="Ex: com laminação fosca...">
        </div>
        <div id="camposProdutoMetro-${itemPedidoCount}" class="hidden grid grid-cols-2 gap-3">
            <div>
                <label class="label-text text-xs">Largura (m):</label>
                <input type="number" step="0.01" class="input-field input-field-sm dimensoes-produto" id="itemLargura-${itemPedidoCount}" oninput="calcularValorItem(${itemPedidoCount})">
            </div>
            <div>
                <label class="label-text text-xs">Altura (m):</label>
                <input type="number" step="0.01" class="input-field input-field-sm dimensoes-produto" id="itemAltura-${itemPedidoCount}" oninput="calcularValorItem(${itemPedidoCount})">
            </div>
        </div>
        <div>
            <label class="label-text text-xs">Qtd:</label>
            <input type="number" value="1" min="1" class="input-field input-field-sm quantidade-produto" id="itemQuantidade-${itemPedidoCount}" oninput="calcularValorItem(${itemPedidoCount})">
        </div>
        <div>
            <label class="label-text text-xs">Valor Item:</label>
            <input type="text" class="input-field input-field-sm valor-item-produto font-medium cursor-not-allowed" id="itemValor-${itemPedidoCount}" readonly value="R$ 0,00">
        </div>`;
    c.appendChild(d);
    const selectProduto = d.querySelector('.produto-select');
    popularSelectProduto(selectProduto);

    if (itemParaEditar) {
        selectProduto.value = itemParaEditar.produtoId;
        selectProduto.dispatchEvent(new Event('change'));
        d.querySelector('.quantidade-produto').value = itemParaEditar.quantidade;
        d.querySelector('.item-descricao').value = itemParaEditar.descricao || '';
        if (itemParaEditar.tipoProduto === 'metro') {
            d.querySelector('.dimensoes-produto[id^="itemLargura"]').value = itemParaEditar.largura;
            d.querySelector('.dimensoes-produto[id^="itemAltura"]').value = itemParaEditar.altura;
        }
        
        if(itemParaEditar.productionSteps) {
            d.dataset.productionSteps = JSON.stringify(itemParaEditar.productionSteps);
        }

        calcularValorItem(itemPedidoCount);
    }

    d.querySelectorAll('.input-field').forEach(el => el.classList.add('py-1.5', 'text-sm'));
};

window.removerItemPedidoForm=(id)=>{const el=document.getElementById(`itemPedido-${id}`);if(el)el.remove();atualizarValorTotalPedido();}
window.removerPagamentoForm=(id)=>{const el=document.getElementById(`pagamentoItem-${id}`);if(el)el.remove();calcularTotaisPagamento();}
window.toggleCamposProduto=(id)=>{const s=document.getElementById(`itemProduto-${id}`),o=s.options[s.selectedIndex],t=o.dataset.tipo;document.getElementById(`camposProdutoMetro-${id}`).classList.toggle('hidden',t!=='metro');calcularValorItem(id);}
window.calcularValorItem=(id)=>{const s=document.getElementById(`itemProduto-${id}`),o=s.options[s.selectedIndex];if(!o||!o.value){document.getElementById(`itemValor-${id}`).value="R$ 0,00";atualizarValorTotalPedido();return;}const t=o.dataset.tipo,pm=parseFloat(o.dataset.precoMetro),pu=parseFloat(o.dataset.precoUnidade),q=parseInt(document.getElementById(`itemQuantidade-${id}`).value)||1;let v=0;if(t==='metro'){const l=parseFloat(document.getElementById(`itemLargura-${id}`).value)||0,a=parseFloat(document.getElementById(`itemAltura-${id}`).value)||0;if(l>0&&a>0&&pm>0)v=(l*a*pm)*q;}else{if(pu>0)v=pu*q;}document.getElementById(`itemValor-${id}`).value=`R$ ${v.toFixed(2).replace('.',',')}`;atualizarValorTotalPedido();}
function atualizarValorTotalPedido(){let tI=0;document.querySelectorAll('.valor-item-produto').forEach(i=>{const v=i.value.replace('R$ ','').replace(',','.');tI+=parseFloat(v)||0;});document.getElementById('pedidoValorTotal').value=`R$ ${tI.toFixed(2).replace('.',',')}`;calcularTotaisPagamento();}
window.adicionarPagamentoForm=()=>{pagamentoCount++;const c=document.getElementById('pagamentosContainer');const d=document.createElement('div');d.className='grid grid-cols-1 sm:grid-cols-[2fr,1fr,auto] gap-3 items-end p-3 border rounded-lg pagamento-form-item';d.id=`pagamentoItem-${pagamentoCount}`;d.innerHTML=`<div><label class="label-text text-xs">Forma:</label><select class="input-field input-field-sm py-1.5 forma-pagamento"><option value="Dinheiro">Dinheiro</option><option value="Cartão de Crédito">Crédito</option><option value="Cartão de Débito">Débito</option><option value="PIX">PIX</option><option value="Boleto">Boleto</option><option value="Pendente">Pendente</option></select></div><div><label class="label-text text-xs">Valor (R$):</label><input type="number" step="0.01" class="input-field input-field-sm py-1.5 valor-pago" placeholder="0,00" oninput="window.calcularTotaisPagamento()"></div><button type="button" onclick="removerPagamentoForm(${pagamentoCount})" class="btn btn-danger btn-small text-xs py-1.5 px-2 self-center sm:self-end h-8"><i class="fas fa-trash"></i></button><div class="sm:col-span-3"><label class="label-text text-xs">Obs:</label><input type="text" class="input-field input-field-sm py-1.5 observacao-pagamento" placeholder="Ex: Entrada..."></div>`;c.appendChild(d);calcularTotaisPagamento();}

function calcularTotaisPagamento(){let tP=0;document.querySelectorAll('.pagamento-form-item .valor-pago').forEach(i=>{tP+=parseFloat(i.value)||0;});document.getElementById('pedidoTotalPago').value=`R$ ${tP.toFixed(2).replace('.',',')}`;const vTS=document.getElementById('pedidoValorTotal').value.replace('R$ ','').replace(',','.'),vT=parseFloat(vTS)||0,vR=vT-tP;document.getElementById('pedidoValorRestante').value=`R$ ${vR.toFixed(2).replace('.',',')}`; }
window.calcularTotaisPagamento = calcularTotaisPagamento; 
document.getElementById('formNovoPedido').addEventListener('submit', async (e) => { 
    e.preventDefault(); if (!auth.currentUser) return; 
    editingOrderId = document.getElementById('editingOrderIdField').value; 
    const d={
        clienteId:document.getElementById('pedidoClienteId').value,
        clienteNome:document.getElementById('pedidoClienteSearch').value,
        vendedorId:document.getElementById('pedidoVendedor').value,
        vendedorNome:document.getElementById('pedidoVendedor').options[document.getElementById('pedidoVendedor').selectedIndex]?.text,
        dataEntregaStr:document.getElementById('pedidoDataEntrega').value,
        horaEntregaStr:document.getElementById('pedidoHoraEntrega').value,
        status:document.getElementById('pedidoStatus').value,
        valorTotal:parseFloat(document.getElementById('pedidoValorTotal').value.replace('R$ ','').replace(',','.')),
        itens:[],
        pagamentos:[],
        imagemPreviewPedidoBase64:pedidoImagemBase64,
        descricaoGeral: document.getElementById('pedidoDescricaoGeral').value
    }; 
    if(!d.clienteId||!d.vendedorId||!d.dataEntregaStr){exibirMensagem("Preencha campos obrigatórios.","warning");return;} 
    let dEFinal;
    if(d.dataEntregaStr&&d.horaEntregaStr){const[a,m,dia]=d.dataEntregaStr.split('-');const[h,min]=d.horaEntregaStr.split(':');dEFinal=Timestamp.fromDate(new Date(a,parseInt(m)-1,dia,h,min));}
    else if(d.dataEntregaStr){dEFinal=Timestamp.fromDate(new Date(d.dataEntregaStr+"T00:00:00"));}
    else{exibirMensagem("Data entrega inválida.","error");return;} 
    
    const iForms=document.querySelectorAll('.item-pedido-form');
    if(iForms.length===0){exibirMensagem("Adicione pelo menos um item ao pedido.","warning");return;} 
    
    let formValido=true;
    iForms.forEach((iF,idx)=>{
        const cId=iF.id.split('-')[1];
        const pS=document.getElementById(`itemProduto-${cId}`);
        const pId=pS.value,pN=pS.options[pS.selectedIndex]?.text,tP=pS.options[pS.selectedIndex]?.dataset.tipo;
        const q=parseInt(document.getElementById(`itemQuantidade-${cId}`).value),vI=parseFloat(document.getElementById(`itemValor-${cId}`).value.replace('R$ ','').replace(',','.'));
        const desc = document.getElementById(`itemDescricao-${cId}`).value;
        let l=null,a=null;
        if(tP==='metro'){l=parseFloat(document.getElementById(`itemLargura-${cId}`).value)||0;a=parseFloat(document.getElementById(`itemAltura-${cId}`).value)||0;}
        if(pId&&q>0&&vI>=0) {
             let productionSteps = {};
             try { productionSteps = iF.dataset.productionSteps ? JSON.parse(iF.dataset.productionSteps) : {}; } catch(e) { productionSteps = {}; }

             if (!productionSteps.impressao) productionSteps.impressao = { concluido: false, concluidoPor: null, concluidoEm: null };
             if (!productionSteps.acabamento) productionSteps.acabamento = { concluido: false, concluidoPor: null, concluidoEm: null };

             d.itens.push({produtoId:pId,produtoNome:pN,tipoProduto:tP,quantidade:q,largura:l,altura:a,valorItem:vI, descricao: desc, productionSteps: productionSteps });
        }
        else{exibirMensagem(`Item ${idx+1} inválido.`,"warning");formValido=false;}
    });
    if(!formValido)return;
    
    document.querySelectorAll('.pagamento-form-item').forEach(i=>{const f=i.querySelector('.forma-pagamento').value,vP=parseFloat(i.querySelector('.valor-pago').value)||0,o=i.querySelector('.observacao-pagamento').value;if(f&&vP>0||f==="Pendente")d.pagamentos.push({forma:f,valorPago:vP,observacao:o,dataPagamento:Timestamp.now()});else if(f&&vP<=0&&f!=="Pendente"){exibirMensagem(`Valor para ${f} > 0.`,"warning");formValido=false;}});if(!formValido)return;if(d.pagamentos.length===0){exibirMensagem("Adicione pelo menos um método de pagamento.","warning");return;} 
    
    const pData={clienteId:d.clienteId,clienteNome:d.clienteNome,vendedorId:d.vendedorId,vendedorNome:d.vendedorNome,pagamentos:d.pagamentos,dataEntrega:dEFinal,status:d.status,valorTotal:d.valorTotal,itens:d.itens,imagemPreviewPedidoBase64:d.imagemPreviewPedidoBase64, descricaoGeral: d.descricaoGeral}; 
    
    try{const pCP=`artifacts/${shopInstanceAppId}/pedidos`;if(editingOrderId){const pR=doc(db,pCP,editingOrderId);const oPD=todosOsPedidosCache.find(p=>p.id===editingOrderId);pData.dataPedido=oPD?.dataPedido||Timestamp.now();pData.numeroPedido=oPD?.numeroPedido||`PED-${Date.now().toString().slice(-6)}`;pData.entreguePorNome=oPD.entreguePorNome||null;pData.entreguePorId=oPD.entreguePorId||null;pData.entregueEm=oPD.entregueEm||null;await setDoc(pR,pData);exibirMensagem('Pedido atualizado com sucesso!', 'success');}else{pData.dataPedido=Timestamp.now();pData.numeroPedido=`PED-${Date.now().toString().slice(-6)}`;await addDoc(collection(db,pCP),pData);exibirMensagem('Pedido guardado com sucesso!', 'success');} document.getElementById('formNovoPedido').reset();document.getElementById('editingOrderIdField').value='';editingOrderId=null;document.querySelector('#formNovoPedido button[type="submit"]').innerHTML='<i class="fas fa-check mr-1.5"></i>Guardar Pedido';document.getElementById('itensPedidoContainer').innerHTML='';document.getElementById('pagamentosContainer').innerHTML='';pagamentoCount=0;pedidoImagemBase64=null;const pIP=document.getElementById('pedidoImagemPreview'),pIPH=document.getElementById('pedidoImagemPreviewPlaceholder');if(pIP&&pIPH){pIP.src="#";pIP.classList.add('hidden');pIPH.classList.remove('hidden');}itemPedidoCount=0;atualizarValorTotalPedido();mostrarSecao('telaInicial',true);}catch(err){console.error(err);exibirMensagem('Erro ao processar pedido.','error');} 
});

function getStatusBadgeSimpleHTML(pedido) {
    const status = pedido.status;
    let bC = 'neutral';
    if (status === 'Entregue') bC = 'success';
    else if (status === 'Cancelado') bC = 'danger';
    else if (status === 'Pronto para Retirada') bC = 'primary';
    else if (status.startsWith('Em Produção') || status === 'Em Rota de Entrega') bC = 'info';
    else if (status === 'Aguardando Aprovação') bC = 'warning';

    const safeClienteNome = (pedido.clienteNome || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeNumeroPedido = (pedido.numeroPedido || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeStatus = (status || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

    return `<button 
                type="button" 
                class="status-badge-simple interactive-button ${bC}" 
                onclick="abrirModalMudarStatus('${pedido.id}', '${safeNumeroPedido}', '${safeClienteNome}', '${safeStatus}')"
                title="Clique para alterar o estado">
                ${status}
            </button>`;
}

function renderizarListaCompletaPedidos() { const tbody = document.getElementById('listaTodosPedidos'); if (!tbody) return; tbody.innerHTML = ''; const fNC=document.getElementById('filtroNomeCliente')?.value.toLowerCase()||'',fNP=document.getElementById('filtroNumeroPedido')?.value.toLowerCase()||'',fDPS=document.getElementById('filtroDataPedido')?.value||'',fMP=document.getElementById('filtroMaterialProduto')?.value.toLowerCase()||''; let fSP=document.getElementById('filtroStatusPedido')?.value||''; const fC=document.getElementById('filtroClassificacaoPedido')?.value||'dataPedido_desc',fVI=document.getElementById('filtroVendedor')?.value||''; if(!fSP){if(loggedInUserRole==='impressor')fSP='Em Produção (Impressão)'; else if (loggedInUserRole === 'producao') fSP = 'Em Produção (Acabamento)';} let pF=[...todosOsPedidosCache]; if(fNC)pF=pF.filter(p=>p.clienteNome&&p.clienteNome.toLowerCase().includes(fNC)); if(fNP)pF=pF.filter(p=>p.numeroPedido&&p.numeroPedido.toLowerCase().includes(fNP)); if(fDPS){const dF=new Date(fDPS+"T00:00:00");pF=pF.filter(p=>{if(p.dataPedido&&p.dataPedido.toDate){const dPO=p.dataPedido.toDate();return dPO.getFullYear()===dF.getFullYear()&&dPO.getMonth()===dF.getMonth()&&dPO.getDate()===dF.getDate();}return false;});} if(fMP)pF=pF.filter(p=>{if(p.itens&&Array.isArray(p.itens))return p.itens.some(i=>i.produtoNome&&i.produtoNome.toLowerCase().includes(fMP));return false;}); if((loggedInUserRole==='producao' || loggedInUserRole==='impressor')&&!document.getElementById('filtroStatusPedido')?.value){const sP=["Em Produção (Arte)","Em Produção (Impressão)","Em Produção (Acabamento)"];pF=pF.filter(p=>sP.includes(p.status));}else if(fSP){pF=pF.filter(p=>p.status===fSP);} if(fVI)pF=pF.filter(p=>p.vendedorId===fVI); switch(fC){case'dataPedido_asc':pF.sort((a,b)=>(a.dataPedido?.toMillis()||0)-(b.dataPedido?.toMillis()||0));break;case'dataPedido_desc':pF.sort((a,b)=>(b.dataPedido?.toMillis()||0)-(a.dataPedido?.toMillis()||0));break;case'dataEntrega_asc':pF.sort((a,b)=>(a.dataEntrega?.toMillis()||0)-(b.dataEntrega?.toMillis()||0));break;case'dataEntrega_desc':pF.sort((a,b)=>(b.dataEntrega?.toMillis()||0)-(a.dataEntrega?.toMillis()||0));break;case'clienteNome_asc':pF.sort((a,b)=>(a.clienteNome||"").localeCompare(b.clienteNome||""));break;case'clienteNome_desc':pF.sort((a,b)=>(b.clienteNome||"").localeCompare(a.clienteNome||""));break;case'numeroPedido_asc':pF.sort((a,b)=>(a.numeroPedido||"").localeCompare(b.numeroPedido||"",undefined,{numeric:true}));break;case'numeroPedido_desc':pF.sort((a,b)=>(b.numeroPedido||"").localeCompare(a.numeroPedido||"",undefined,{numeric:true}));break;default:pF.sort((a,b)=>(b.dataPedido?.toMillis()||0)-(a.dataPedido?.toMillis()||0));} if(pF.length===0){ tbody.innerHTML='<tr><td colspan="7" class="text-center py-10">Nenhum pedido encontrado com os filtros aplicados.</td></tr>'; return; } pF.forEach(p=>{ const tr = document.createElement('tr'); const pM=JSON.stringify(p); const dPF=p.dataPedido?.toDate?p.dataPedido.toDate().toLocaleString('pt-BR',{day:'2-digit', month:'2-digit', year:'numeric'}):'N/A'; const dEF=p.dataEntrega?.toDate?p.dataEntrega.toDate().toLocaleDateString('pt-BR'):'N/A';
const agora = new Date(); const dataEntrega = p.dataEntrega?.toDate ? p.dataEntrega.toDate() : null; let statusAtrasoClass = ''; if (dataEntrega && p.status !== 'Entregue' && p.status !== 'Cancelado') { const diffHoras = (dataEntrega - agora) / (1000 * 60 * 60); if (diffHoras < 0) { statusAtrasoClass = 'late'; } else if (diffHoras <= 24) { statusAtrasoClass = 'nearly-late'; } }
let actionButtons = `<button onclick="abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Ver Detalhes"><i class="fas fa-eye"></i></button>`;
if (loggedInUserRole === 'vendedor' || loggedInUserRole === 'admin') {
    const btnEntregue = (p.status !== 'Entregue' && p.status !== 'Cancelado') ? `<button onclick="marcarComoEntregue('${p.id}')" class="btn-icon-action" title="Marcar como Entregue">📦</button>` : '';
    actionButtons += ` <button onclick="prepararEdicaoPedido(JSON.parse(decodeURIComponent('${encodeURIComponent(pM)}')))" class="btn-icon-action" title="Editar Pedido"><i class="fas fa-edit"></i></button> ${btnEntregue} <button onclick="excluirPedido('${p.id}', '${p.numeroPedido}')" class="btn-icon-action text-red-500 hover:text-red-700" title="Excluir Pedido"><i class="fas fa-trash"></i></button>`;
}
tr.innerHTML=` <td class="pedido-numero ${statusAtrasoClass}">${p.numeroPedido}</td> <td class="cliente-nome">${p.clienteNome}</td> <td>${dPF}</td> <td>${dEF}</td> <td class="font-medium">R$ ${p.valorTotal.toFixed(2).replace('.',',')}</td> <td>${getStatusBadgeSimpleHTML(p)}</td> <td class="text-xs space-x-1.5 whitespace-nowrap">${actionButtons}</td>`;
tbody.appendChild(tr); }); }
function carregarUltimosPedidos() { if(!auth.currentUser)return;const tb=document.getElementById('ultimosPedidosTableBody');if(!tb)return;tb.innerHTML=''; const pODB=[...todosOsPedidosCache].sort((a,b)=>(b.dataPedido?.toMillis()||0)-(a.dataPedido?.toMillis()||0));const pPD=pODB.slice(0,5); if(pPD.length===0)tb.innerHTML=`<tr><td colspan="6" class="text-center text-slate-500 py-10">Nenhum pedido recente.</td></tr>`; else pPD.forEach(p=>{const tr=document.createElement('tr');const pPM=JSON.stringify(p);const dPF=p.dataPedido?.toDate?p.dataPedido.toDate().toLocaleDateString('pt-BR'):'N/A';
const agora = new Date(); const dataEntrega = p.dataEntrega?.toDate ? p.dataEntrega.toDate() : null; let statusAtrasoClass = ''; if (dataEntrega && p.status !== 'Entregue' && p.status !== 'Cancelado') { const diffHoras = (dataEntrega - agora) / (1000 * 60 * 60); if (diffHoras < 0) { statusAtrasoClass = 'late'; } else if (diffHoras <= 24) { statusAtrasoClass = 'nearly-late'; } }
let actionButtons = `<button onclick="abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(pPM)}')))" class="btn-icon-action text-sky-600 hover:text-sky-700" title="Detalhes"><i class="fas fa-eye"></i></button>`;
if (loggedInUserRole === 'vendedor' || loggedInUserRole === 'admin') {
    const btnEntregue = (p.status !== 'Entregue' && p.status !== 'Cancelado') ? `<button onclick="marcarComoEntregue('${p.id}')" class="btn-icon-action" title="Marcar como Entregue">📦</button>` : '';
    actionButtons += ` <button onclick="prepararEdicaoPedido(JSON.parse(decodeURIComponent('${encodeURIComponent(pPM)}')))" class="btn-icon-action text-indigo-600 hover:text-indigo-700" title="Editar"><i class="fas fa-edit"></i></button>${btnEntregue}<button onclick="excluirPedido('${p.id}', '${p.numeroPedido}')" class="btn-icon-action text-red-600 hover:text-red-700" title="Excluir"><i class="fas fa-trash"></i></button>`;
}
tr.innerHTML=`<td class="pedido-numero font-medium ${statusAtrasoClass}">${p.numeroPedido}</td><td>${p.clienteNome}</td><td>${dPF}</td><td class="font-medium">R$ ${p.valorTotal.toFixed(2).replace('.',',')}</td><td>${getStatusBadgeSimpleHTML(p)}</td><td class="text-xs space-x-1 whitespace-nowrap">${actionButtons}</td>`;
tb.appendChild(tr);}); }
function carregarTodosPedidos() { 
    if(!auth.currentUser) return; 
    const q=query(collection(db,`artifacts/${shopInstanceAppId}/pedidos`)); 
    onSnapshot(q,(snap)=>{
        todosOsPedidosCache=[];
        snap.forEach(doc=>todosOsPedidosCache.push({id:doc.id,...doc.data()}));
        
        atualizarEstatisticasUsuario();
        carregarUltimosPedidos();
        if(activeSectionId==='telaInicial') atualizarDashboard();
        if(activeSectionId==='visualizarPedidos') renderizarListaCompletaPedidos();
        if(activeSectionId==='cadastrarCliente'&&clienteSelecionadoId) exibirDetalhesClienteEProcurarPedidos(clienteSelecionadoId);
    },e=>{console.error("Erro todos pedidos:",e);exibirMensagem("Erro todos pedidos.","error");}); 
}
function atualizarDashboard() { const mPH=document.getElementById('metricPedidosHoje'),mPP=document.getElementById('metricPedidosPendentes'),mFM=document.getElementById('metricFaturamentoMes'),mTC=document.getElementById('metricTotalClientes'); if(!mPH||!mPP||!mFM||!mTC)return; if(!todosOsPedidosCache)todosOsPedidosCache=[];if(!clientesCache)clientesCache=[];mTC.textContent=clientesCache.length; if(todosOsPedidosCache.length===0){mPH.textContent='0';mPP.textContent='0';mFM.textContent='R$ 0,00';return;} const h=new Date(),dH=h.getDate(),mH=h.getMonth(),aH=h.getFullYear(),iM=new Date(aH,mH,1); let pH=0,pP=0,fM=0; todosOsPedidosCache.forEach(p=>{if(!p.dataPedido||typeof p.dataPedido.toDate!=='function')return;const dP=p.dataPedido.toDate();if(dP.getDate()===dH&&dP.getMonth()===mH&&dP.getFullYear()===aH)pH++;if(p.status!=='Entregue'&&p.status!=='Cancelado')pP++;if(dP>=iM&&p.status!=='Cancelado')fM+=p.valorTotal||0;}); mPH.textContent=pH;mPP.textContent=pP;mFM.textContent=`R$ ${fM.toFixed(2).replace('.',',')}`; }

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
    
    document.getElementById('pedidoDescricaoGeral').value = pObj.descricaoGeral || '';
    document.getElementById('pedidoClienteSearch').value = pObj.clienteNome || "";
    document.getElementById('pedidoClienteId').value = pObj.clienteId || "";
    document.getElementById('pedidoClienteResultados').classList.add('hidden');
    document.getElementById('pedidoVendedor').value = pObj.vendedorId || "";
    document.getElementById('pedidoStatus').value = pObj.status || "Aguardando Aprovação";
    const dETS = pObj.dataEntrega && typeof pObj.dataEntrega.seconds === 'number' ? new Timestamp(pObj.dataEntrega.seconds, pObj.dataEntrega.nanoseconds) : null;
    if (dETS) {
        const dED = dETS.toDate();
        document.getElementById('pedidoDataEntrega').value = dED.toISOString().split('T')[0];
        document.getElementById('pedidoHoraEntrega').value = dED.toTimeString().split(' ')[0].substring(0, 5);
    } else {
        document.getElementById('pedidoDataEntrega').value = "";
        document.getElementById('pedidoHoraEntrega').value = "";
    }
    pedidoImagemBase64 = pObj.imagemPreviewPedidoBase64 || null;
    const pI = document.getElementById('pedidoImagemPreview'), pH = document.getElementById('pedidoImagemPreviewPlaceholder');
    if (pedidoImagemBase64) {
        pI.src = pedidoImagemBase64;
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
    mostrarSecao('novoPedido', false);
    setActiveMenuLink('novoPedido');
};

window.excluirPedido = async (pedidoId, numeroPedido) => { 
    if (!auth.currentUser || !pedidoId) { 
        showNotification({ message: "Erro: ID do pedido ou utilizador inválido.", type: "error" });
        return; 
    } 
    const numPed = numeroPedido || `ID ${pedidoId.substring(0,6)}...`; 
    showNotification({ 
        message: `Tem certeza que deseja excluir o pedido ${numPed}? Esta ação não pode ser desfeita.`, 
        type: 'confirm-delete',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        onConfirm: async () => { 
            try { 
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, pedidoId)); 
                console.log(`Pedido ${numPed} excluído.`); 
                showNotification({ message: `Pedido ${numPed} excluído com sucesso!`, type: 'success' });
                if (activeSectionId === 'cadastrarCliente' && clienteSelecionadoId) { 
                    exibirDetalhesClienteEProcurarPedidos(clienteSelecionadoId); 
                } 
            } catch (error) { 
                console.error("Erro ao excluir pedido: ", error); 
                showNotification({ message: `Erro ao excluir pedido ${numPed}.`, type: 'error' });
            } 
        } 
    }); 
}
const produtoTipoPrecoEl = document.getElementById('produtoTipoPreco'); if (produtoTipoPrecoEl) togglePrecoFields(); 
