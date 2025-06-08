import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
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

// **CORREÇÃO APLICADA AQUI**
// Verifica se alguma instância do Firebase já foi inicializada.
// Se não houver, inicializa uma nova. Caso contrário, usa a existente.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const shopInstanceAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

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

new MutationObserver(ajustarPaddingBody).observe(document.querySelector('.exo-menu-container .exo-menu'), { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });

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

window.mostrarSecao = function(idSecao, isMenuLink = false) { 
    if (!loggedInUserRole && idSecao !== 'loginScreen') { logout(); return; }
    
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
    } else { if (loggedInUserRole) mostrarSecao('telaInicial', true); return; }

    if (idSecao === 'novoPedido' && !editingOrderId) {
        document.getElementById('pedidoDataHora').value = new Date().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
        document.getElementById('formNovoPedido').reset(); 
        document.getElementById('itensPedidoContainer').innerHTML = ''; document.getElementById('pagamentosContainer').innerHTML = ''; 
        itemPedidoCount = 0; pagamentoCount = 0; pedidoImagemBase64 = null; 
        const prevImg = document.getElementById('pedidoImagemPreview'), ph = document.getElementById('pedidoImagemPreviewPlaceholder');
        if (prevImg && ph) { prevImg.src = "#"; prevImg.classList.add('hidden'); ph.classList.remove('hidden'); }
        atualizarValorTotalPedido(); 
        document.querySelector('#formNovoPedido button[type=\'submit\']').innerHTML = '<i class="fas fa-check mr-1.5"></i>Guardar Pedido';
        document.getElementById('editingOrderIdField').value = ''; 
    } else if (editingOrderId && activeSectionId !== 'novoPedido') {
        editingOrderId = null; 
        document.getElementById('editingOrderIdField').value = '';
        document.querySelector('#formNovoPedido button[type="submit"]').innerHTML = '<i class="fas fa-check mr-1.5"></i>Guardar Pedido';
    }
    if (idSecao === 'telaInicial') atualizarDashboard(); 
    if (idSecao === 'cadastrarCliente') { document.getElementById('pesquisaClienteInput').value = ''; renderizarListaClientes(); document.getElementById('detalhesClienteSelecionado').classList.add('hidden'); clienteSelecionadoId = null; }
    if (idSecao === 'cadastrarFornecedor') document.getElementById('formCadastrarFornecedor').reset();
    if (idSecao === 'visualizarPedidos') renderizarListaCompletaPedidos();
    ajustarPaddingBody();
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
    setTimeout(ajustarPaddingBody, 400);
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
window.abrirModalEditarProduto = (produtoId) => { const p = produtosCache.find(prod => prod.id === produtoId); if(!p) return; document.getElementById('produtoIdParaEditar').value = p.id; document.getElementById('produtoDescricaoEditar').value = p.descricao; document.getElementById('produtoTipoPrecoEditar').value = p.tipoPreco; togglePrecoFieldsEditar(); document.getElementById('produtoPrecoUnidadeEditar').value = p.precoUnidade; document.getElementById('produtoPrecoMetroEditar').value = p.precoMetro; document.getElementById('produtoNomeEditar').value = p.nome; abrirModalEspecifico('modalEditarProdutoOverlay'); };
window.fecharModalEditarProduto = () => fecharModalEspecifico('modalEditarProdutoOverlay');
window.togglePrecoFieldsEditar = () => { const t = document.getElementById('produtoTipoPrecoEditar').value; document.getElementById('precoUnidadeFieldsEditar').classList.toggle('hidden', t === 'metro'); document.getElementById('precoMetroFieldsEditar').classList.toggle('hidden', t === 'unidade'); };
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
    const reconstructTimestamp = (tsObj) => (tsObj?.seconds != null) ? new Timestamp(tsObj.seconds, tsObj.nanoseconds) : null;
    const formatDateTime = (ts) => { const t = reconstructTimestamp(ts); return t ? t.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'; };
    const podeMarcarImpressao = ['admin', 'designer', 'impressor'].includes(loggedInUserRole);
    const podeMarcarAcabamento = ['admin', 'designer', 'producao'].includes(loggedInUserRole);
    const dataPedidoTexto = formatDateTime(pedido.dataPedido);
    let dataEntregaFormatada = formatDateTime(pedido.dataEntrega);
    
    let entregaHtml = (pedido.entreguePorNome && pedido.entregueEm) ? `<p><strong>Entrega confirmada por:</strong> ${pedido.entreguePorNome} em ${formatDateTime(pedido.entregueEm)}</p>` : '';
    let descricaoGeralHtml = pedido.descricaoGeral ? `<div class="section-title">Descrição Geral</div><p><strong>${pedido.descricaoGeral.replace(/\n/g, '<br>')}</strong></p>` : '';

    let itensHtml = pedido.itens?.map((item, index) => {
        const itemDesc = item.descricao ? `<br><small style="color: #555; padding-left: 15px;">&hookrightarrow; ${item.descricao}</small>` : '';
        const dimensoes = item.tipoProduto === 'metro' && item.largura && item.altura ? ` (${item.largura.toFixed(2)}m x ${item.altura.toFixed(2)}m)` : '';
        const steps = item.productionSteps || { impressao: {}, acabamento: {} };
        const impressaoInfo = steps.impressao?.concluido ? `<span class="info-icon" title="Por: ${steps.impressao.concluidoPor || 'N/A'} em ${formatDateTime(steps.impressao.concluidoEm) || 'N/A'}">ⓘ</span>` : '';
        const acabamentoInfo = steps.acabamento?.concluido ? `<span class="info-icon" title="Por: ${steps.acabamento.concluidoPor || 'N/A'} em ${formatDateTime(steps.acabamento.concluidoEm) || 'N/A'}">ⓘ</span>` : '';

        return `<li><div class="item-details">${item.quantidade}x ${item.produtoNome}${dimensoes} - R$ ${item.valorItem.toFixed(2).replace('.', ',')}${itemDesc}</div>
            <div class="production-steps">
                <span class="step"><input type="checkbox" id="step-impressao-${pedido.id}-${index}" onchange="window.opener.toggleItemProductionStep('${pedido.id}',${index},'impressao',this.checked)" ${steps.impressao?.concluido ? 'checked' : ''} ${!podeMarcarImpressao ? 'disabled' : ''}><label for="step-impressao-${pedido.id}-${index}" class="${!podeMarcarImpressao ? 'disabled-label' : ''}">Impressão</label>${impressaoInfo}</span>
                <span class="step"><input type="checkbox" id="step-acabamento-${pedido.id}-${index}" onchange="window.opener.toggleItemProductionStep('${pedido.id}',${index},'acabamento',this.checked)" ${steps.acabamento?.concluido ? 'checked' : ''} ${!podeMarcarAcabamento ? 'disabled' : ''}><label for="step-acabamento-${pedido.id}-${index}" class="${!podeMarcarAcabamento ? 'disabled-label' : ''}">Acabamento</label>${acabamentoInfo}</span>
            </div></li>`;
    }).join('') || '<li>Nenhum item.</li>';

    let totalPagoCalculado = pedido.pagamentos?.reduce((acc, pgto) => acc + pgto.valorPago, 0) || 0;
    let pagamentosHtml = pedido.pagamentos?.length > 0 ? '<ul>' + pedido.pagamentos.map(pgto => `<li>${pgto.forma}: R$ ${pgto.valorPago.toFixed(2).replace('.',',')} ${pgto.observacao?'('+pgto.observacao+')':''} - Data: ${formatDateTime(pgto.dataPagamento)}</li>`).join('') + '</ul>' : 'Nenhum pagamento.';
    
    const valorRestanteCalculado = (pedido.valorTotal || 0) - totalPagoCalculado;
    const restanteHtml = valorRestanteCalculado > 0 ? `<p style="color:red"><strong>Restante:</strong> R$ ${valorRestanteCalculado.toFixed(2).replace('.',',')}</p>` : '<p style="color:green"><strong>Quitado</strong></p>';
    
    const conteudoHtml = `<html><head><title>Pedido: ${pedido.numeroPedido||'N/A'}</title><style>body{font-family:'Poppins',Arial,sans-serif;margin:20px;background-color:#f1f5f9;color:#334155;font-size:14px}:root{--color-primary:#0ea5e9;--color-text-main:#334155;--color-text-heading:#1e293b;--color-text-muted:#64748b;--color-border-soft:#e2e8f0;--color-border-medium:#cbd5e1;--shadow-lg:0 10px 15px -3px rgb(0 0 0 / 0.07),0 4px 6px -4px rgb(0 0 0 / 0.07)}.container{max-width:700px;margin:auto;background-color:#fff;padding:25px;border-radius:12px;box-shadow:var(--shadow-lg);border:1px solid var(--color-border-soft)}.company-header{display:flex;align-items:center;margin-bottom:25px;padding-bottom:15px;border-bottom:1px solid var(--color-border-soft)}.company-header img{max-height:50px;margin-right:20px}.company-header .company-info p{margin:2px 0;font-size:.9em;color:var(--color-text-muted)}.company-header .company-info strong{color:var(--color-text-heading);font-weight:600}h1{text-align:center;color:var(--color-primary);border-bottom:2px solid var(--color-primary);padding-bottom:10px;margin-bottom:25px;font-size:1.6em;font-weight:600}.section-title{font-size:1.15em;font-weight:600;color:var(--color-text-heading);margin-top:25px;margin-bottom:10px;border-bottom:1px solid var(--color-border-medium);padding-bottom:6px}p{margin-bottom:8px;line-height:1.65}strong{font-weight:500;color:var(--color-text-main)}ul{list-style:none;margin-left:0;padding-left:5px}li{margin-bottom:12px;display:flex;flex-wrap:wrap;align-items:flex-start;padding-bottom:8px;border-bottom:1px dashed #e2e8f0}.item-details{flex-grow:1;margin-bottom:5px;width:100%}.production-steps{display:flex;gap:20px;padding-left:15px;width:100%}.production-steps .step{display:flex;align-items:center;gap:5px}.production-steps .step label{cursor:pointer;font-size:.9em}.production-steps .step input[type=checkbox]:disabled + label{cursor:not-allowed;color:#9ca3af;}.info-icon{margin-left:5px;font-weight:bold;color:#64748b;cursor:help;font-size:1.1em}.total-section{margin-top:30px;padding-top:20px;border-top:2px solid var(--color-primary);text-align:right}.total-section p{font-size:1.25em;font-weight:600;color:var(--color-primary)}.payment-summary p{font-size:1.05em;margin-bottom:4px;text-align:right}.payment-summary strong{font-weight:600}.print-button-container{text-align:center;margin-top:30px}.print-button{background-color:var(--color-primary);color:white;padding:12px 24px;border:none;border-radius:8px;font-size:1em;cursor:pointer;transition:background-color .2s}.print-button:hover{background-color:#0284c7}.footer-note{font-size:.85em;color:var(--color-text-muted);text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid var(--color-border-soft)}img.pedido-preview-print{max-width:100%;max-height:280px;display:block;margin:20px auto;border:1px solid var(--color-border-medium);border-radius:8px;page-break-inside:avoid;object-fit:contain}@media print{body{margin:0;padding:0;background-color:#fff;color:#000;font-size:10pt;--color-primary:#0ea5e9;--color-text-main:#000}.container{margin:0;padding:10mm;box-shadow:none;border-radius:0;border:none;width:100%;max-width:100%}.print-button-container{display:none}h1{color:var(--color-primary)!important;border-color:var(--color-primary)!important}}</style></head><body><div class="container"><div class="company-header"><img src="https://placehold.co/150x50/0ea5e9/FFFFFF?text=SuaGrafica&font=poppins" alt="Logo da Gráfica"><div class="company-info"><p><strong>Empresa:</strong> Gráfica Exemplo</p><p><strong>CNPJ:</strong> 00.000.000/0001-00</p><p><strong>Endereço:</strong> Rua Exemplo, 123, Cidade</p><p><strong>Telefone:</strong> (00) 0000-0000</p><p><strong>Email:</strong> contato@suagrafica.com</p></div></div><h1>Pedido: ${pedido.numeroPedido||'N/A'}</h1><div class="section-title">Cliente</div><p><strong>Nome:</strong> ${pedido.clienteNome||'N/A'}</p><div class="section-title">Pedido</div><p><strong>Número:</strong> ${pedido.numeroPedido||'N/A'}</p><p><strong>Data:</strong> ${dataPedidoTexto}</p><p><strong>Entrega:</strong> ${dataEntregaFormatada}</p><p><strong>Vendedor:</strong> ${pedido.vendedorNome||'N/A'}</p><p><strong>Estado:</strong> ${pedido.status||'N/A'}</p>${entregaHtml}<div class="section-title">Pagamentos</div>${pagamentosHtml}<div class="section-title">Itens</div><ul>${itensHtml}</ul>${descricaoGeralHtml}${pedido.imagemPreviewPedidoBase64?`<div class="section-title">Preview</div><img class="pedido-preview-print" src="${pedido.imagemPreviewPedidoBase64}" alt="Preview" />`:''}<div class="payment-summary total-section"><p><strong>Total Pedido:</strong> R$ ${pedido.valorTotal?.toFixed(2).replace('.',',')||'0,00'}</p><p><strong>Total Pago:</strong> R$ ${totalPagoCalculado.toFixed(2).replace('.',',')}</p>${restanteHtml}</div><div class="print-button-container"><button class="print-button" onclick="window.print()">Imprimir</button></div><p class="footer-note">Gerado em: ${new Date().toLocaleString('pt-BR')}</p></div></body></html>`; 
    
    const newTab = window.open('', `Pedido: ${pedido.numeroPedido || 'detalhes'}`); 
    if (newTab) { newTab.document.write(conteudoHtml); newTab.document.close(); } 
    else { exibirMensagem("Bloqueador de pop-up impediu a abertura da guia.", "warning"); } 
}

document.getElementById('formCadastrarCliente')?.addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/clientes`), { nome:document.getElementById('clienteNome').value, tipoCliente:document.getElementById('clienteTipo').value, telefone:document.getElementById('clienteTelefone').value, email:document.getElementById('clienteEmail').value, cpfCnpj:document.getElementById('clienteCpfCnpj').value, endereco:document.getElementById('clienteEndereco').value, criadoEm:Timestamp.now() }); exibirMensagem('Cliente registado!', 'success'); e.target.reset(); } catch (err) { console.error(err); exibirMensagem('Erro ao registar.', 'error'); } });
function renderizarListaClientes() { const listaEl = document.getElementById('listaClientes'); const termo = document.getElementById('pesquisaClienteInput')?.value.toLowerCase() || ''; if (!listaEl) return; const filtrados = clientesCache.filter(c => (c.nome?.toLowerCase().includes(termo)) || (c.telefone?.includes(termo)) || (c.email?.toLowerCase().includes(termo))); listaEl.innerHTML = ''; if (filtrados.length === 0) { listaEl.innerHTML = `<p class="text-sm text-center py-3">${termo?'Nenhum cliente encontrado.':'Nenhum cliente registado.'}</p>`; document.getElementById('detalhesClienteSelecionado').classList.add('hidden'); clienteSelecionadoId = null; return; } filtrados.forEach(c => { const itemDiv = document.createElement('div'); itemDiv.className=`item-list-display !cursor-pointer relative flex justify-between items-center ${c.id === clienteSelecionadoId ? 'selected' : ''}`; itemDiv.addEventListener('click', () => exibirDetalhesClienteEProcurarPedidos(c.id)); const infoDiv = document.createElement('div'); infoDiv.innerHTML = `<strong>${c.nome}</strong> <span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle">${c.tipoCliente==='revenda'?'Revenda':'Final'}</span><div class="meta">${c.telefone||'S/ Telefone'}</div>`; itemDiv.appendChild(infoDiv); if (loggedInUserRole === 'admin') { const adminButtons = document.createElement('div'); adminButtons.className = 'flex items-center space-x-1'; adminButtons.innerHTML = `<button class="btn-icon-action" title="Editar Cliente"><i class="fas fa-edit"></i></button><button class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir Cliente"><i class="fas fa-trash"></i></button>`; adminButtons.querySelector('button:first-child').addEventListener('click', (e) => { e.stopPropagation(); abrirModalEditarCliente(c.id); }); adminButtons.querySelector('button:last-child').addEventListener('click', (e) => { e.stopPropagation(); excluirCliente(c.id, c.nome); }); itemDiv.appendChild(adminButtons); } listaEl.appendChild(itemDiv); }); }
function exibirDetalhesClienteEProcurarPedidos(id) { clienteSelecionadoId = id; renderizarListaClientes(); const cli = clientesCache.find(c => c.id === id); const detalhesEl = document.getElementById('detalhesClienteSelecionado'), infoEl = document.getElementById('infoCliente'), pedidosEl = document.getElementById('pedidosDoClienteLista'); if (!cli||!detalhesEl) return; infoEl.innerHTML = `<p><strong>Nome:</strong> ${cli.nome||'N/A'}</p><p><strong>Tel:</strong> ${cli.telefone||'N/A'}</p><p><strong>Email:</strong> ${cli.email||'N/A'}</p><p><strong>Tipo:</strong> ${cli.tipoCliente==='revenda'?'Revenda':'Final'}</p>${cli.cpfCnpj?`<p><strong>CPF/CNPJ:</strong> ${cli.cpfCnpj}</p>`:''}${cli.endereco?`<p><strong>Endereço:</strong> ${cli.endereco}</p>`:''}`; detalhesEl.classList.remove('hidden'); pedidosEl.innerHTML = '<p class="text-xs text-center py-2">A carregar...</p>'; const pFiltrados = todosOsPedidosCache.filter(p => p.clienteId === id).sort((a,b)=>(b.dataPedido?.toMillis()||0)-(a.dataPedido?.toMillis()||0)); if (pFiltrados.length === 0) { pedidosEl.innerHTML = '<p class="text-xs text-center py-2">Nenhum pedido para este cliente.</p>'; return; } pedidosEl.innerHTML = pFiltrados.map(p => `<div class='p-2.5 border-b text-xs last:border-b-0'><div class="flex justify-between items-center"><span class="font-medium">${p.numeroPedido}</span><span class="text-opacity-80">${p.dataPedido?.toDate().toLocaleDateString('pt-BR')||'N/A'}</span></div><div class="flex justify-between items-center mt-1"><span>R$ ${p.valorTotal.toFixed(2).replace('.',',')}</span>${getStatusBadgeSimpleHTML(p)}</div><button onclick="abrirDetalhesPedidoNovaGuia(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(p))}')))" class="btn btn-link text-xs p-0 mt-1">Ver detalhes</button></div>`).join(''); }
function carregarClientes() { if (!auth.currentUser) return; onSnapshot(query(collection(db, `artifacts/${shopInstanceAppId}/clientes`)), (snap) => { clientesCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.nome||"").localeCompare(b.nome||"")); if (activeSectionId === 'cadastrarCliente') renderizarListaClientes(); if (activeSectionId === 'telaInicial') atualizarDashboard(); }, e => { console.error("Erro clientes:", e); exibirMensagem("Erro ao carregar clientes.", "error"); }); }
document.getElementById('formNovoClienteRapido')?.addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const nome=document.getElementById('clienteRapidoNome').value, tel=document.getElementById('clienteRapidoTelefone').value, tipo=document.getElementById('clienteRapidoTipo').value; if (!nome.trim()) { exibirMensagem("Nome é obrigatório.", "warning"); return; } try { const ref = await addDoc(collection(db, `artifacts/${shopInstanceAppId}/clientes`), { nome, telefone:tel, tipoCliente:tipo, criadoEm:Timestamp.now() }); exibirMensagem('Cliente registado!', 'success'); fecharModalNovoClienteRapido(); document.getElementById('pedidoClienteSearch').value = nome; document.getElementById('pedidoClienteId').value = ref.id; document.getElementById('pedidoClienteResultados').classList.add('hidden'); } catch (err) { console.error(err); exibirMensagem('Erro ao registar.', 'error'); } });
const pedidoClienteSearchEl = document.getElementById('pedidoClienteSearch'), pedidoClienteResultadosEl = document.getElementById('pedidoClienteResultados'), pedidoClienteIdEl = document.getElementById('pedidoClienteId'); if (pedidoClienteSearchEl) { pedidoClienteSearchEl.addEventListener('input', () => { const t=pedidoClienteSearchEl.value.toLowerCase(); pedidoClienteResultadosEl.innerHTML=''; if(t.length<2){pedidoClienteResultadosEl.classList.add('hidden');pedidoClienteIdEl.value='';return;} const res=clientesCache.filter(c=>(c.nome?.toLowerCase().includes(t))||(c.telefone?.includes(t))); pedidoClienteResultadosEl.classList.remove('hidden'); if(res.length>0){pedidoClienteResultadosEl.innerHTML = res.map(cli => `<div data-id="${cli.id}" data-nome="${cli.nome}">${cli.nome} ${cli.telefone?'- '+cli.telefone:''}</div>`).join('');}else{pedidoClienteResultadosEl.innerHTML='<div>Nenhum cliente encontrado.</div>'; pedidoClienteIdEl.value='';} }); pedidoClienteResultadosEl.addEventListener('click', (e) => { if(e.target.dataset.id){ pedidoClienteSearchEl.value = e.target.dataset.nome; pedidoClienteIdEl.value = e.target.dataset.id; pedidoClienteResultadosEl.classList.add('hidden'); } }); document.addEventListener('click', (ev) => { if (!pedidoClienteSearchEl.contains(ev.target)&&!pedidoClienteResultadosEl.contains(ev.target)) pedidoClienteResultadosEl.classList.add('hidden'); }); }

window.togglePrecoFields=()=>{const t=document.getElementById('produtoTipoPreco')?.value; document.getElementById('precoUnidadeFields').classList.toggle('hidden',t==='metro');document.getElementById('precoMetroFields').classList.toggle('hidden',t==='unidade');};
document.getElementById('formCadastrarProduto')?.addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const dados={nome:document.getElementById('produtoNome').value,tipoPreco:document.getElementById('produtoTipoPreco').value,precoUnidade:parseFloat(document.getElementById('produtoPrecoUnidade').value)||0,precoMetro:parseFloat(document.getElementById('produtoPrecoMetro').value)||0,descricao:document.getElementById('produtoDescricao').value,criadoEm:Timestamp.now()}; if(!dados.nome.trim()){exibirMensagem("Nome do produto é obrigatório.","warning");return;} try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/produtos`), dados); exibirMensagem('Produto registado!', 'success'); e.target.reset(); togglePrecoFields(); } catch (err) { console.error(err); exibirMensagem('Erro ao registar.', 'error'); } });
function carregarProdutos() { if (!auth.currentUser) return; onSnapshot(query(collection(db, `artifacts/${shopInstanceAppId}/produtos`)), (snap) => { const listaEl=document.getElementById('listaProdutos'); produtosCache = snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); if(listaEl) { listaEl.innerHTML = ''; if (produtosCache.length > 0) { produtosCache.forEach(p => { const itemDiv = document.createElement('div'); itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center'; const infoDiv = document.createElement('div'); infoDiv.innerHTML = `<strong>${p.nome}</strong><div class="meta">${p.tipoPreco==='metro'?`R$ ${(p.precoMetro||0).toFixed(2).replace('.',',')}/m²`:`R$ ${(p.precoUnidade||0).toFixed(2).replace('.',',')}/un`}</div>`; itemDiv.appendChild(infoDiv); if (loggedInUserRole === 'admin') { const adminBtns = document.createElement('div'); adminBtns.className = 'flex items-center space-x-1'; adminBtns.innerHTML = `<button class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir"><i class="fas fa-trash"></i></button>`; adminBtns.querySelector('button:first-child').addEventListener('click', () => abrirModalEditarProduto(p.id)); adminBtns.querySelector('button:last-child').addEventListener('click', () => excluirProduto(p.id, p.nome)); itemDiv.appendChild(adminBtns); } listaEl.appendChild(itemDiv); }); } else { listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum produto registado.</p>'; } } document.querySelectorAll('.produto-select').forEach(s=>popularSelectProduto(s)); }, e => { console.error("Erro produtos:", e); exibirMensagem("Erro ao carregar produtos.", "error"); }); }

document.getElementById('formCadastrarFuncionario')?.addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const dados={nome:document.getElementById('funcionarioNome').value,contato:document.getElementById('funcionarioContato').value,cargo:document.getElementById('funcionarioCargo').value,codigoAcesso:document.getElementById('funcionarioCodigoAcesso').value,criadoEm:Timestamp.now()}; if(!dados.nome||!dados.cargo||!dados.codigoAcesso){exibirMensagem("Preencha todos os campos.","warning");return;} try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`), dados); exibirMensagem('Funcionário registado!', 'success'); e.target.reset(); } catch (err) { console.error(err); exibirMensagem('Erro ao registar.', 'error'); } });
function carregarFuncionarios() { if (!auth.currentUser) return; onSnapshot(query(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`)), (snap)=>{ const selPV=document.getElementById('pedidoVendedor'), listaEl=document.getElementById('listaFuncionarios'), selFiltro=document.getElementById('filtroVendedor'); if(selPV)selPV.innerHTML='<option value="">Selecione funcionário</option>'; if(selFiltro)selFiltro.innerHTML='<option value="">Todos Funcionários</option>'; funcionariosCache = snap.docs.map(doc => ({id:doc.id,...doc.data()})).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); if(listaEl) { listaEl.innerHTML = ''; if (funcionariosCache.length > 0) { funcionariosCache.forEach(f => { const itemDiv = document.createElement('div'); itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center'; const infoDiv = document.createElement('div'); infoDiv.innerHTML = `<strong>${f.nome}</strong><span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle ml-1">${f.cargo||'N/A'}</span><div class="meta">Contacto: ${f.contato||'N/A'}</div>`; itemDiv.appendChild(infoDiv); if (loggedInUserRole === 'admin') { const adminBtns = document.createElement('div'); adminBtns.className = 'flex items-center space-x-1'; adminBtns.innerHTML = `<button class="btn-icon-action" title="Editar"><i class="fas fa-user-edit"></i></button><button class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir"><i class="fas fa-user-times"></i></button>`; adminBtns.querySelector('button:first-child').addEventListener('click', () => abrirModalEditarFuncionario(f.id)); adminBtns.querySelector('button:last-child').addEventListener('click', () => excluirFuncionario(f.id, f.nome)); itemDiv.appendChild(adminBtns); } listaEl.appendChild(itemDiv); }); } else { listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum funcionário registado.</p>'; } } funcionariosCache.forEach(f => { if(selPV) selPV.innerHTML += `<option value="${f.id}">${f.nome}</option>`; if(selFiltro) selFiltro.innerHTML += `<option value="${f.id}">${f.nome}</option>`; }); }, e => { console.error("Erro funcionários:", e); exibirMensagem("Erro ao carregar funcionários.", "error"); }); }

document.getElementById('formCadastrarFornecedor')?.addEventListener('submit', async (e) => { e.preventDefault(); if (!auth.currentUser) return; const dados={nome:document.getElementById('fornecedorNome').value,contato:document.getElementById('fornecedorContato').value,tipoMaterial:document.getElementById('fornecedorMaterial').value,criadoEm:Timestamp.now()}; if(!dados.nome.trim()){exibirMensagem("Nome do fornecedor é obrigatório.","warning");return;} try { await addDoc(collection(db, `artifacts/${shopInstanceAppId}/fornecedores`), dados); exibirMensagem('Fornecedor registado!', 'success'); e.target.reset(); } catch (err) { console.error(err); exibirMensagem('Erro ao registar.', 'error'); } });
function carregarFornecedores() { if (!auth.currentUser) return; onSnapshot(query(collection(db, `artifacts/${shopInstanceAppId}/fornecedores`)), (snap)=>{ const listaEl = document.getElementById('listaFornecedores'); fornecedoresCache=snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); if(listaEl) { listaEl.innerHTML = ''; if (fornecedoresCache.length > 0) { fornecedoresCache.forEach(f => { const itemDiv = document.createElement('div'); itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center'; const infoDiv = document.createElement('div'); const cDisplay = f.contato?.includes('@') ? `<a href="mailto:${f.contato}" class="text-sky-400 hover:underline">${f.contato}</a>` : (f.contato || 'N/A'); infoDiv.innerHTML = `<strong>${f.nome}</strong><div class="meta">Contacto: ${cDisplay}</div><div class="meta">Material: ${f.tipoMaterial||'N/A'}</div>`; itemDiv.appendChild(infoDiv); if (loggedInUserRole === 'admin') { const adminBtns = document.createElement('div'); adminBtns.className = 'flex items-center space-x-1'; adminBtns.innerHTML = `<button class="btn-icon-action" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-icon-action text-red-400 hover:text-red-600" title="Excluir"><i class="fas fa-trash"></i></button>`; adminBtns.querySelector('button:first-child').addEventListener('click', () => abrirModalEditarFornecedor(f.id)); adminBtns.querySelector('button:last-child').addEventListener('click', () => excluirFornecedor(f.id, f.nome)); itemDiv.appendChild(adminBtns); } listaEl.appendChild(itemDiv); }); } else { listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum fornecedor registado.</p>'; } } }, e => { console.error("Erro fornecedores:", e); exibirMensagem("Erro ao carregar fornecedores.", "error"); }); }

async function processImageFilePedido(file) {
    const pI = document.getElementById('pedidoImagemPreview'), pH = document.getElementById('pedidoImagemPreviewPlaceholder');
    if (file?.type.startsWith('image/')) {
        try {
            const resizedBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = e => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height; if(w > h){if(w > 800){h *= 800/w; w=800;}}else{if(h > 800){w *= 800/h; h=800;}} const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; canvas.getContext('2d').drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; img.onerror = reject; img.src = e.target.result; }; reader.onerror = reject; reader.readAsDataURL(file); });
            pedidoImagemBase64 = resizedBase64;
            if (pI && pH) { pI.src = resizedBase64; pI.classList.remove('hidden'); pH.classList.add('hidden'); }
        } catch (error) { console.error("Erro imagem:", error); exibirMensagem("Não foi possível processar a imagem.", "error"); pedidoImagemBase64 = null; if (pI && pH) { pI.src = "#"; pI.classList.add('hidden'); pH.classList.remove('hidden'); } }
    } else { pedidoImagemBase64 = null; if (pI && pH) { pI.src = "#"; pI.classList.add('hidden'); pH.classList.remove('hidden'); } if (file) exibirMensagem("Arquivo de imagem inválido.", "warning"); }
}
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
document.getElementById('formNovoPedido')?.addEventListener('submit', async (e) => { 
    e.preventDefault(); if (!auth.currentUser) return; 
    editingOrderId = document.getElementById('editingOrderIdField').value; 
    const dados={clienteId:document.getElementById('pedidoClienteId').value,vendedorId:document.getElementById('pedidoVendedor').value,dataEntregaStr:document.getElementById('pedidoDataEntrega').value,horaEntregaStr:document.getElementById('pedidoHoraEntrega').value,}; 
    if(!dados.clienteId||!dados.vendedorId||!dados.dataEntregaStr){exibirMensagem("Cliente, Vendedor e Data de Entrega são obrigatórios.","warning");return;} 
    let dEFinal=Timestamp.fromDate(new Date(`${dados.dataEntregaStr}T${dados.horaEntregaStr||'00:00:00'}`));
    const itensForms=document.querySelectorAll('.item-pedido-form'); if(itensForms.length===0){exibirMensagem("Adicione pelo menos um item.","warning");return;} 
    let itensPedido=[], pagamentosPedido=[], formValido=true;
    itensForms.forEach((iF,idx)=>{const cId=iF.id.split('-')[1];const pS=document.getElementById(`itemProduto-${cId}`);if(!pS.value){formValido=false;exibirMensagem(`Selecione um produto para o item ${idx+1}.`,"warning");return;}const q=parseInt(document.getElementById(`itemQuantidade-${cId}`).value);if(q<=0){formValido=false;exibirMensagem(`Quantidade do item ${idx+1} inválida.`,"warning");return;}const o=pS.options[pS.selectedIndex];let pSteps={};try{pSteps=iF.dataset.productionSteps?JSON.parse(iF.dataset.productionSteps):{impressao:{},acabamento:{}};}catch(e){pSteps={impressao:{},acabamento:{}};}itensPedido.push({produtoId:pS.value,produtoNome:o.text,tipoProduto:o.dataset.tipo,quantidade:q,largura:parseFloat(document.getElementById(`itemLargura-${cId}`)?.value)||null,altura:parseFloat(document.getElementById(`itemAltura-${cId}`)?.value)||null,valorItem:parseFloat(document.getElementById(`itemValor-${cId}`).value.replace('R$ ','').replace(',','.')),descricao:document.getElementById(`itemDescricao-${cId}`).value,productionSteps:pSteps});});if(!formValido)return;
    document.querySelectorAll('.pagamento-form-item').forEach(i=>{const f=i.querySelector('.forma-pagamento').value,v=parseFloat(i.querySelector('.valor-pago').value);if(f&&v>=0||f==="Pendente")pagamentosPedido.push({forma:f,valorPago:v||0,observacao:i.querySelector('.observacao-pagamento').value,dataPagamento:f!=="Pendente"?Timestamp.now():null});});if(pagamentosPedido.length===0){exibirMensagem("Adicione um pagamento.","warning");return;}
    const pData={clienteId:dados.clienteId,clienteNome:document.getElementById('pedidoClienteSearch').value,vendedorId:dados.vendedorId,vendedorNome:document.getElementById('pedidoVendedor').options[document.getElementById('pedidoVendedor').selectedIndex].text,pagamentos:pagamentosPedido,dataEntrega:dEFinal,status:document.getElementById('pedidoStatus').value,valorTotal:parseFloat(document.getElementById('pedidoValorTotal').value.replace('R$ ','').replace(',','.')),itens:itensPedido,imagemPreviewPedidoBase64,descricaoGeral:document.getElementById('pedidoDescricaoGeral').value};
    try{if(editingOrderId){const oPD=todosOsPedidosCache.find(p=>p.id===editingOrderId);pData.dataPedido=oPD?.dataPedido||Timestamp.now();pData.numeroPedido=oPD?.numeroPedido||`PED-${Date.now().toString().slice(-6)}`;await setDoc(doc(db,`artifacts/${shopInstanceAppId}/pedidos`,editingOrderId),pData);exibirMensagem('Pedido atualizado!', 'success');}else{pData.dataPedido=Timestamp.now();pData.numeroPedido=`PED-${Date.now().toString().slice(-6)}`;await addDoc(collection(db,`artifacts/${shopInstanceAppId}/pedidos`),pData);exibirMensagem('Pedido guardado!', 'success');}document.getElementById('formNovoPedido').reset();document.getElementById('editingOrderIdField').value='';editingOrderId=null;document.querySelector('#formNovoPedido button[type="submit"]').innerHTML='<i class="fas fa-check mr-1.5"></i>Guardar Pedido';document.getElementById('itensPedidoContainer').innerHTML='';document.getElementById('pagamentosContainer').innerHTML='';pagamentoCount=0;pedidoImagemBase64=null;const pIP=document.getElementById('pedidoImagemPreview'),pIPH=document.getElementById('pedidoImagemPreviewPlaceholder');if(pIP&&pIPH){pIP.src="#";pIP.classList.add('hidden');pIPH.classList.remove('hidden');}itemPedidoCount=0;atualizarValorTotalPedido();mostrarSecao('telaInicial',true);}catch(err){console.error(err);exibirMensagem('Erro ao processar pedido.','error');} 
});

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
    if (produtoTipoPrecoEditarEl) {
        togglePrecoFieldsEditar();
    }
});

