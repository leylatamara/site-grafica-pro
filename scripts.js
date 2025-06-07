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
let notificationTimeout;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid; 
        
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
            setDefaultViewForRole(loggedInUserRole);
            ajustarPaddingBody();
        } else {
            document.body.classList.remove('app-visible');
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('appContainer').classList.add('hidden');
            document.body.style.paddingTop = '0px'; 
        }
        
        // Event Listeners for Forms and Inputs
        document.getElementById('formNovoClienteRapido')?.addEventListener('submit', handleSalvarClienteRapido);
        document.getElementById('formCadastrarCliente')?.addEventListener('submit', handleSalvarCliente);
        document.getElementById('formEditarCliente')?.addEventListener('submit', handleSalvarEdicaoCliente);
        document.getElementById('formCadastrarProduto')?.addEventListener('submit', handleSalvarProduto);
        document.getElementById('formEditarProduto')?.addEventListener('submit', handleSalvarEdicaoProduto);
        document.getElementById('formCadastrarFuncionario')?.addEventListener('submit', handleSalvarFuncionario);
        document.getElementById('formEditarCodigoFuncionario')?.addEventListener('submit', handleSalvarNovoCodigoFuncionario);
        document.getElementById('formCadastrarFornecedor')?.addEventListener('submit', handleSalvarFornecedor);
        document.getElementById('formEditarFornecedor')?.addEventListener('submit', handleSalvarEdicaoFornecedor);
        document.getElementById('formMudarStatus')?.addEventListener('submit', handleSalvarNovoStatus);
        document.getElementById('formNovoPedido')?.addEventListener('submit', handleSalvarPedido);
        
        document.getElementById('pesquisaClienteInput')?.addEventListener('input', () => renderizarListaClientes());
        document.getElementById('pedidoImageDropArea')?.addEventListener('paste', handlePasteImagePedido);
        
        const toggleMenuBtn = document.querySelector('.exo-menu-container .toggle-menu');
        const exoMenuEl = document.querySelector('.exo-menu-container .exo-menu');
        if (toggleMenuBtn && exoMenuEl) {
            toggleMenuBtn.addEventListener('click', (e) => { 
                e.preventDefault(); 
                exoMenuEl.classList.toggle('display'); 
                ajustarPaddingBody(); 
            });
        }
        
        const filtros = [
            'filtroNomeCliente', 'filtroNumeroPedido', 'filtroMaterialProduto',
            'filtroDataPedido', 'filtroStatusPedido', 'filtroClassificacaoPedido', 'filtroVendedor'
        ];
        filtros.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
                el.addEventListener(eventType, renderizarListaCompletaPedidos);
            }
        });
        document.getElementById('limparFiltrosPedidos')?.addEventListener('click', () => {
             filtros.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = (id === 'filtroClassificacaoPedido') ? 'dataPedido_desc' : '';
             });
            renderizarListaCompletaPedidos(); 
        });

    } else { 
        document.body.classList.remove('app-visible');
        try { await signInAnonymously(auth); } catch (error) { console.error("Erro login anônimo:", error); exibirMensagem("Erro autenticação.", "error");}
    }
});

function setDefaultViewForRole(role) {
    if (role === 'impressor' || role === 'producao') {
        mostrarSecao('visualizarPedidos', false);
        setActiveMenuLink('visualizarPedidos');
    } else {
        mostrarSecao('telaInicial', false);
        setActiveMenuLink('telaInicial');
    }
}

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
            loginScreen.classList.add('hidden'); 
            appContainer.classList.remove('hidden'); 
            codigoAcessoInput.value = ''; 
            
            configurarAcessoPorCargo(loggedInUserRole); 
            setDefaultViewForRole(loggedInUserRole);
            ajustarPaddingBody();

        } else {
            loginErrorMessage.textContent = "Código inválido."; 
            loginErrorMessage.classList.remove('hidden'); 
            loggedInUserRole = null; 
            loggedInUserName = null; 
            loggedInUserIdGlobal = null;
        }
    } catch (error) { 
        console.error("Erro login:", error); 
        loginErrorMessage.textContent = "Erro. Tente novamente."; 
        loginErrorMessage.classList.remove('hidden'); 
        loggedInUserRole = null; 
        loggedInUserName = null; 
        loggedInUserIdGlobal = null;
    }
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
        if (acessoPermitido) { 
            const roles = acessoPermitido.split(',');
            item.classList.toggle('hidden', !(acessoPermitido === "all" || (role && roles.includes(role)))); 
        }
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
    } else {
        bodyEl.style.paddingTop = '0px'; 
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

function abrirModalEspecifico(overlayId) {
    const overlay = document.getElementById(overlayId); 
    if (!overlay) return;
    overlay.classList.add('interactive-theme-modal'); 
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => { 
        overlay.classList.add('active'); 
    });
}
function fecharModalEspecifico(overlayId) {
    const overlay = document.getElementById(overlayId); 
    if (!overlay) return;
    overlay.classList.remove('active'); 
    setTimeout(() => { 
        overlay.classList.add('hidden');          
        overlay.classList.remove('interactive-theme-modal'); 
    }, 300);
}

// Modals
window.abrirModalNovoClienteRapido = () => { document.getElementById('formNovoClienteRapido')?.reset(); abrirModalEspecifico('modalNovoClienteRapidoOverlay'); };
window.fecharModalNovoClienteRapido = () => fecharModalEspecifico('modalNovoClienteRapidoOverlay');
window.abrirModalEditarCodigoFuncionario=(fId,nome,cA)=>{ document.getElementById('funcionarioIdParaEditarCodigo').value=fId; document.getElementById('nomeFuncionarioParaEditarCodigo').textContent=`Funcionário: ${nome}`; document.getElementById('novoCodigoAcesso').value=cA||''; abrirModalEspecifico('modalEditarCodigoFuncionarioOverlay'); }
window.fecharModalEditarCodigoFuncionario=()=>fecharModalEspecifico('modalEditarCodigoFuncionarioOverlay');
window.abrirModalMudarStatus = (pedidoId, numeroPedido, clienteNome, statusAtual) => {
    document.getElementById('pedidoIdParaMudarStatus').value = pedidoId;
    document.getElementById('infoPedidoParaMudarStatus').innerHTML = `<strong>Pedido:</strong> ${numeroPedido}<br><strong>Cliente:</strong> ${clienteNome}`;
    document.getElementById('novoStatusPedido').value = statusAtual;
    abrirModalEspecifico('modalMudarStatusOverlay');
}
window.fecharModalMudarStatus = () => fecharModalEspecifico('modalMudarStatusOverlay');

window.abrirModalEditarCliente = (clienteId) => {
    const cliente = clientesCache.find(c => c.id === clienteId);
    if (!cliente) return;
    document.getElementById('clienteIdParaEditar').value = cliente.id;
    document.getElementById('clienteNomeEditar').value = cliente.nome;
    document.getElementById('clienteTipoEditar').value = cliente.tipoCliente;
    document.getElementById('clienteTelefoneEditar').value = cliente.telefone;
    document.getElementById('clienteEmailEditar').value = cliente.email;
    document.getElementById('clienteCpfCnpjEditar').value = cliente.cpfCnpj;
    document.getElementById('clienteEnderecoEditar').value = cliente.endereco;
    abrirModalEspecifico('modalEditarClienteOverlay');
};
window.fecharModalEditarCliente = () => fecharModalEspecifico('modalEditarClienteOverlay');

window.abrirModalEditarProduto = (produtoId) => {
    const produto = produtosCache.find(p => p.id === produtoId);
    if (!produto) return;
    document.getElementById('produtoIdParaEditar').value = produto.id;
    document.getElementById('produtoNomeEditar').value = produto.nome;
    document.getElementById('produtoTipoPrecoEditar').value = produto.tipoPreco;
    document.getElementById('produtoPrecoUnidadeEditar').value = produto.precoUnidade;
    document.getElementById('produtoPrecoMetroEditar').value = produto.precoMetro;
    document.getElementById('produtoDescricaoEditar').value = produto.descricao;
    togglePrecoFields('Editar');
    abrirModalEspecifico('modalEditarProdutoOverlay');
};
window.fecharModalEditarProduto = () => fecharModalEspecifico('modalEditarProdutoOverlay');

window.abrirModalEditarFornecedor = (fornecedorId) => {
    const fornecedor = fornecedoresCache.find(f => f.id === fornecedorId);
    if (!fornecedor) return;
    document.getElementById('fornecedorIdParaEditar').value = fornecedor.id;
    document.getElementById('fornecedorNomeEditar').value = fornecedor.nome;
    document.getElementById('fornecedorContatoEditar').value = fornecedor.contato;
    document.getElementById('fornecedorMaterialEditar').value = fornecedor.tipoMaterial;
    abrirModalEspecifico('modalEditarFornecedorOverlay');
};
window.fecharModalEditarFornecedor = () => fecharModalEspecifico('modalEditarFornecedorOverlay');


// Handlers
async function handleSalvarCliente(e) {
    e.preventDefault(); 
    if (!auth.currentUser) return;
    const data = { 
        nome:document.getElementById('clienteNome').value, 
        tipoCliente:document.getElementById('clienteTipo').value, 
        telefone:document.getElementById('clienteTelefone').value, 
        email:document.getElementById('clienteEmail').value, 
        cpfCnpj:document.getElementById('clienteCpfCnpj').value, 
        endereco:document.getElementById('clienteEndereco').value, 
        criadoEm:Timestamp.now() 
    }; 
    try { 
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/clientes`), data); 
        exibirMensagem('Cliente registado com sucesso!', 'success'); 
        e.target.reset();
    } catch (err) { 
        console.error(err); exibirMensagem('Erro ao registar cliente.', 'error'); 
    }
}

async function handleSalvarEdicaoCliente(e) {
    e.preventDefault();
    const clienteId = document.getElementById('clienteIdParaEditar').value;
    if (!clienteId) return;
    const data = {
        nome: document.getElementById('clienteNomeEditar').value,
        tipoCliente: document.getElementById('clienteTipoEditar').value,
        telefone: document.getElementById('clienteTelefoneEditar').value,
        email: document.getElementById('clienteEmailEditar').value,
        cpfCnpj: document.getElementById('clienteCpfCnpjEditar').value,
        endereco: document.getElementById('clienteEnderecoEditar').value
    };
    try {
        await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/clientes`, clienteId), data);
        exibirMensagem('Cliente atualizado com sucesso!', 'success');
        fecharModalEditarCliente();
    } catch (err) {
        console.error("Erro ao atualizar cliente:", err);
        exibirMensagem('Erro ao atualizar cliente.', 'error');
    }
}

window.excluirCliente = async (clienteId, clienteNome) => {
    showNotification({
        message: `Tem a certeza que quer excluir o cliente "${clienteNome}"?`,
        type: 'confirm-delete',
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/clientes`, clienteId));
                exibirMensagem('Cliente excluído com sucesso!', 'success');
            } catch (err) {
                console.error("Erro ao excluir cliente:", err);
                exibirMensagem('Erro ao excluir cliente.', 'error');
            }
        }
    });
};


async function handleSalvarClienteRapido(e) {
    e.preventDefault(); 
    if (!auth.currentUser) return;
    const nome = document.getElementById('clienteRapidoNome').value;
    const tel = document.getElementById('clienteRapidoTelefone').value;
    const tipo = document.getElementById('clienteRapidoTipo').value;
    if (!nome.trim()) { exibirMensagem("Nome do cliente é obrigatório.", "warning"); return; } 
    try { 
        const ref = await addDoc(collection(db, `artifacts/${shopInstanceAppId}/clientes`), { 
            nome, telefone:tel, tipoCliente:tipo, email:'', cpfCnpj:'', endereco:'', criadoEm:Timestamp.now() 
        }); 
        exibirMensagem('Cliente registado com sucesso!', 'success'); 
        fecharModalNovoClienteRapido(); 
        document.getElementById('pedidoClienteSearch').value = nome; 
        document.getElementById('pedidoClienteId').value = ref.id; 
        document.getElementById('pedidoClienteResultados').innerHTML = ''; 
        document.getElementById('pedidoClienteResultados').classList.add('hidden'); 
    } catch (err) { 
        console.error(err); exibirMensagem('Erro ao registar cliente.', 'error'); 
    }
}

async function handleSalvarProduto(e) {
    e.preventDefault(); 
    if (!auth.currentUser) return;
    const data = {
        nome:document.getElementById('produtoNome').value,
        tipoPreco:document.getElementById('produtoTipoPreco').value,
        precoUnidade:parseFloat(document.getElementById('produtoPrecoUnidade').value)||0,
        precoMetro:parseFloat(document.getElementById('produtoPrecoMetro').value)||0,
        descricao:document.getElementById('produtoDescricao').value,
        criadoEm:Timestamp.now()
    }; 
    if(!data.nome.trim()){exibirMensagem("Nome do produto é obrigatório.","warning");return;} 
    try { 
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/produtos`), data); 
        exibirMensagem('Produto registado com sucesso!', 'success'); 
        e.target.reset(); 
        togglePrecoFields(); 
    } catch (err) { 
        console.error(err); exibirMensagem('Erro ao registar produto.', 'error'); 
    }
}

async function handleSalvarEdicaoProduto(e) {
    e.preventDefault();
    const produtoId = document.getElementById('produtoIdParaEditar').value;
    if (!produtoId) return;
    const data = {
        nome: document.getElementById('produtoNomeEditar').value,
        tipoPreco: document.getElementById('produtoTipoPrecoEditar').value,
        precoUnidade: parseFloat(document.getElementById('produtoPrecoUnidadeEditar').value) || 0,
        precoMetro: parseFloat(document.getElementById('produtoPrecoMetroEditar').value) || 0,
        descricao: document.getElementById('produtoDescricaoEditar').value
    };
    try {
        await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/produtos`, produtoId), data);
        exibirMensagem('Produto atualizado com sucesso!', 'success');
        fecharModalEditarProduto();
    } catch (err) {
        console.error("Erro ao atualizar produto:", err);
        exibirMensagem('Erro ao atualizar produto.', 'error');
    }
}

window.excluirProduto = async (produtoId, produtoNome) => {
    showNotification({
        message: `Tem a certeza que quer excluir o produto "${produtoNome}"?`,
        type: 'confirm-delete',
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/produtos`, produtoId));
                exibirMensagem('Produto excluído com sucesso!', 'success');
            } catch (err) {
                console.error("Erro ao excluir produto:", err);
                exibirMensagem('Erro ao excluir produto.', 'error');
            }
        }
    });
};

async function handleSalvarFuncionario(e) {
    e.preventDefault(); 
    if (!auth.currentUser) return; 
    const data={
        nome:document.getElementById('funcionarioNome').value,
        contato:document.getElementById('funcionarioContato').value,
        cargo:document.getElementById('funcionarioCargo').value.toLowerCase(),
        codigoAcesso:document.getElementById('funcionarioCodigoAcesso').value,
        criadoEm:Timestamp.now()
    }; 
    if(!data.nome.trim()||!data.cargo.trim()||!data.codigoAcesso.trim()){exibirMensagem("Preencha todos os campos obrigatórios do funcionário.","warning");return;} 
    try { 
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`), data); 
        exibirMensagem('Funcionário registado com sucesso!', 'success'); 
        e.target.reset(); 
    } catch (err) { 
        console.error(err); exibirMensagem('Erro ao registar funcionário.', 'error'); 
    }
}

window.excluirFuncionario = async (funcionarioId, funcionarioNome) => {
    if (funcionarioId === loggedInUserIdGlobal) {
        exibirMensagem("Não pode excluir o seu próprio usuário.", "error");
        return;
    }
    showNotification({
        message: `Tem a certeza que quer excluir o funcionário "${funcionarioNome}"?`,
        type: 'confirm-delete',
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/funcionarios`, funcionarioId));
                exibirMensagem('Funcionário excluído com sucesso!', 'success');
            } catch (err) {
                console.error("Erro ao excluir funcionário:", err);
                exibirMensagem('Erro ao excluir funcionário.', 'error');
            }
        }
    });
};

async function handleSalvarNovoCodigoFuncionario(ev){
    ev.preventDefault();
    if(!auth.currentUser||loggedInUserRole!=='admin'){exibirMensagem("Apenas administradores podem alterar códigos.","error");return;}
    const fId=document.getElementById('funcionarioIdParaEditarCodigo').value;
    const nC=document.getElementById('novoCodigoAcesso').value;
    if(!nC.trim()){exibirMensagem("O novo código de acesso não pode estar vazio.","warning");return;}
    try {
        const fR=doc(db,`artifacts/${shopInstanceAppId}/funcionarios`,fId);
        await updateDoc(fR,{codigoAcesso:nC});exibirMensagem("Código de acesso atualizado com sucesso!","success");
        fecharModalEditarCodigoFuncionario();
    } catch(err) {
        console.error(err);exibirMensagem("Erro ao atualizar código de acesso.","error");
    }
}

async function handleSalvarFornecedor(e) {
    e.preventDefault(); 
    if (!auth.currentUser) return; 
    const data={
        nome:document.getElementById('fornecedorNome').value,
        contato:document.getElementById('fornecedorContato').value,
        tipoMaterial:document.getElementById('fornecedorMaterial').value,
        criadoEm:Timestamp.now()
    }; 
    if(!data.nome.trim()){exibirMensagem("Nome do fornecedor é obrigatório.","warning");return;} 
    try { 
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/fornecedores`), data); 
        exibirMensagem('Fornecedor registado com sucesso!', 'success'); 
        e.target.reset();
    } catch (err) { 
        console.error(err); exibirMensagem('Erro ao registar fornecedor.', 'error'); 
    }
}

async function handleSalvarEdicaoFornecedor(e) {
    e.preventDefault();
    const fornecedorId = document.getElementById('fornecedorIdParaEditar').value;
    if (!fornecedorId) return;
    const data = {
        nome: document.getElementById('fornecedorNomeEditar').value,
        contato: document.getElementById('fornecedorContatoEditar').value,
        tipoMaterial: document.getElementById('fornecedorMaterialEditar').value
    };
    try {
        await updateDoc(doc(db, `artifacts/${shopInstanceAppId}/fornecedores`, fornecedorId), data);
        exibirMensagem('Fornecedor atualizado com sucesso!', 'success');
        fecharModalEditarFornecedor();
    } catch (err) {
        console.error("Erro ao atualizar fornecedor:", err);
        exibirMensagem('Erro ao atualizar fornecedor.', 'error');
    }
}

window.excluirFornecedor = async (fornecedorId, fornecedorNome) => {
    showNotification({
        message: `Tem a certeza que quer excluir o fornecedor "${fornecedorNome}"?`,
        type: 'confirm-delete',
        onConfirm: async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/fornecedores`, fornecedorId));
                exibirMensagem('Fornecedor excluído com sucesso!', 'success');
            } catch (err) {
                console.error("Erro ao excluir fornecedor:", err);
                exibirMensagem('Erro ao excluir fornecedor.', 'error');
            }
        }
    });
};

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

// Render and Load Functions
function renderizarListaClientes() { 
    const lE = document.getElementById('listaClientes'); 
    const pI = document.getElementById('pesquisaClienteInput'); 
    const tP = pI ? pI.value.toLowerCase() : ''; 
    if (!lE) return; 
    lE.innerHTML = ''; 
    const cF = clientesCache.filter(c => (c.nome&&c.nome.toLowerCase().includes(tP))||(c.telefone&&c.telefone.toLowerCase().includes(tP))||(c.email&&c.email.toLowerCase().includes(tP))); 
    if (cF.length === 0) { 
        lE.innerHTML = `<p class="text-sm text-center py-3">${tP?'Nenhum cliente encontrado.':'Nenhum cliente registado.'}</p>`; 
        document.getElementById('detalhesClienteSelecionado').classList.add('hidden'); 
        clienteSelecionadoId = null; 
        return; 
    } 
    cF.forEach(c => { 
        const d = document.createElement('div');
        d.className = `item-list-display flex justify-between items-center ${c.id===clienteSelecionadoId?'selected':''}`;
        
        let adminButtons = '';
        if (loggedInUserRole === 'admin') {
            adminButtons = `
                <div class="flex-shrink-0">
                    <button onclick="abrirModalEditarCliente('${c.id}')" class="btn-icon-action text-blue-400 hover:text-blue-300 mr-2" title="Editar Cliente"><i class="fas fa-edit"></i></button>
                    <button onclick="excluirCliente('${c.id}', '${c.nome.replace(/'/g, "\\'")}')" class="btn-icon-action text-red-400 hover:text-red-300" title="Excluir Cliente"><i class="fas fa-trash"></i></button>
                </div>`;
        }
        
        const content = `
            <div class="flex-grow cursor-pointer" onclick="exibirDetalhesClienteEProcurarPedidos('${c.id}')">
                <strong>${c.nome}</strong> 
                <span class="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full align-middle">${c.tipoCliente==='revenda'?'Revenda':'Final'}</span>
                <div class="meta">${c.telefone||'S/ Telefone'}</div>
            </div>`;
            
        d.innerHTML = content + adminButtons;
        lE.appendChild(d); 
    }); 
}

function renderizarListaProdutos() {
    const listaEl = document.getElementById('listaProdutos');
    if (!listaEl) return;
    listaEl.innerHTML = '';
    
    if (produtosCache.length === 0) {
        listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum produto registado.</p>';
        return;
    }
    
    produtosCache.forEach(p => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center';
        
        let adminButtons = '';
        if (loggedInUserRole === 'admin') {
            adminButtons = `
                <div class="flex-shrink-0">
                    <button onclick="abrirModalEditarProduto('${p.id}')" class="btn-icon-action text-blue-400 hover:text-blue-300 mr-2" title="Editar Produto"><i class="fas fa-edit"></i></button>
                    <button onclick="excluirProduto('${p.id}', '${p.nome.replace(/'/g, "\\'")}')" class="btn-icon-action text-red-400 hover:text-red-300" title="Excluir Produto"><i class="fas fa-trash"></i></button>
                </div>`;
        }
        
        const precoInfo = p.tipoPreco === 'metro' 
            ? `R$ ${(p.precoMetro || 0).toFixed(2).replace('.', ',')}/m²`
            : `R$ ${(p.precoUnidade || 0).toFixed(2).replace('.', ',')}/un`;

        const content = `
            <div class="flex-grow">
                <strong>${p.nome}</strong>
                <div class="meta">${precoInfo}</div>
            </div>`;
        
        itemDiv.innerHTML = content + adminButtons;
        listaEl.appendChild(itemDiv);
    });
}

function renderizarListaFuncionarios() {
    const listaEl = document.getElementById('listaFuncionarios');
    if (!listaEl) return;
    listaEl.innerHTML = '';

    if (funcionariosCache.length === 0) {
        listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum funcionário registado.</p>';
        return;
    }

    funcionariosCache.forEach(f => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center';
        
        let adminButtons = '';
        if (loggedInUserRole === 'admin') {
             adminButtons = `
                <div class="flex-shrink-0">
                    <button onclick="abrirModalEditarCodigoFuncionario('${f.id}','${f.nome.replace(/'/g, "\\'") }','${f.codigoAcesso||''}')" class="btn-icon-action text-blue-400 hover:text-blue-300 mr-2" title="Editar Código"><i class="fas fa-key"></i></button>
                    <button onclick="excluirFuncionario('${f.id}', '${f.nome.replace(/'/g, "\\'")}')" class="btn-icon-action text-red-400 hover:text-red-300" title="Excluir Funcionário"><i class="fas fa-trash"></i></button>
                </div>`;
        }

        const codigoDisplay = loggedInUserRole === 'admin' ? `<span class="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full align-middle ml-2">Código: ${f.codigoAcesso||'N/D'}</span>` : '';

        const content = `
            <div class="flex-grow">
                <strong>${f.nome}</strong>
                <span class="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full align-middle ml-1">${f.cargo||'N/A'}</span>
                ${codigoDisplay}
                <div class="meta">Contacto: ${f.contato||'N/A'}</div>
            </div>`;
            
        itemDiv.innerHTML = content + adminButtons;
        listaEl.appendChild(itemDiv);
    });
}

function renderizarListaFornecedores() {
    const listaEl = document.getElementById('listaFornecedores');
    if (!listaEl) return;
    listaEl.innerHTML = '';

    if (fornecedoresCache.length === 0) {
        listaEl.innerHTML = '<p class="text-sm text-center py-3">Nenhum fornecedor registado.</p>';
        return;
    }

    fornecedoresCache.forEach(f => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-list-display !cursor-default flex justify-between items-center';
        
        let adminButtons = '';
        if (loggedInUserRole === 'admin') {
            adminButtons = `
                <div class="flex-shrink-0">
                    <button onclick="abrirModalEditarFornecedor('${f.id}')" class="btn-icon-action text-blue-400 hover:text-blue-300 mr-2" title="Editar Fornecedor"><i class="fas fa-edit"></i></button>
                    <button onclick="excluirFornecedor('${f.id}', '${f.nome.replace(/'/g, "\\'")}')" class="btn-icon-action text-red-400 hover:text-red-300" title="Excluir Fornecedor"><i class="fas fa-trash"></i></button>
                </div>`;
        }

        let contatoDisplay = f.contato || 'N/A';
        const contatoLimpo = f.contato ? String(f.contato).replace(/\D/g, '') : '';
        if (contatoLimpo.length >= 8 && /^\d+$/.test(contatoLimpo)) {
            let whatsNum = contatoLimpo;
            contatoDisplay = `<a href="https://wa.me/${whatsNum}" target="_blank" class="text-green-400 hover:text-green-300 hover:underline inline-flex items-center"><i class="fab fa-whatsapp mr-1.5"></i> ${f.contato}</a>`;
        } else if (f.contato && f.contato.includes('@')) {
            contatoDisplay = `<a href="mailto:${f.contato}" class="text-sky-400 hover:text-sky-300 hover:underline">${f.contato}</a>`;
        }
        
        const content = `
            <div class="flex-grow">
                <strong>${f.nome}</strong>
                <div class="meta">Contacto: ${contatoDisplay}</div>
                <div class="meta">Material: ${f.tipoMaterial||'N/A'}</div>
            </div>`;

        itemDiv.innerHTML = content + adminButtons;
        listaEl.appendChild(itemDiv);
    });
}


function carregarClientes() { if (!auth.currentUser) return; const q = query(collection(db, `artifacts/${shopInstanceAppId}/clientes`)); onSnapshot(q, (snap) => { clientesCache = []; snap.forEach(doc => clientesCache.push({ id: doc.id, ...doc.data() })); clientesCache.sort((a, b) => (a.nome||"").localeCompare(b.nome||"")); if (activeSectionId === 'cadastrarCliente') renderizarListaClientes(); if (activeSectionId === 'telaInicial') atualizarDashboard(); }, e => { console.error("Erro clientes:", e); exibirMensagem("Erro ao carregar clientes.", "error"); }); }
function carregarProdutos() { if (!auth.currentUser) return; const q = query(collection(db, `artifacts/${shopInstanceAppId}/produtos`)); onSnapshot(q, (snap) => { produtosCache=[]; snap.forEach(doc=>produtosCache.push({id:doc.id,...doc.data()})); produtosCache.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); if (activeSectionId === 'cadastrarProduto') renderizarListaProdutos(); document.querySelectorAll('.produto-select').forEach(s=>popularSelectProduto(s)); }, e => { console.error("Erro produtos:", e); exibirMensagem("Erro ao carregar produtos.", "error"); }); }
function carregarFuncionarios() { if (!auth.currentUser) return; const q=query(collection(db, `artifacts/${shopInstanceAppId}/funcionarios`)); onSnapshot(q, (snap)=>{ const selPV=document.getElementById('pedidoVendedor'), fVS=document.getElementById('filtroVendedor'); if(selPV)selPV.innerHTML='<option value="">Selecione funcionário</option>'; if(fVS)fVS.innerHTML='<option value="">Todos Funcionários</option>'; funcionariosCache=[]; snap.forEach(doc=>funcionariosCache.push({id:doc.id,...doc.data()})); funcionariosCache.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); funcionariosCache.forEach(f=>{if(selPV){const o=document.createElement('option');o.value=f.id;o.textContent=f.nome;selPV.appendChild(o);} if(fVS){const o=document.createElement('option');o.value=f.id;o.textContent=f.nome;fVS.appendChild(o);}}); if (activeSectionId === 'cadastrarFuncionario') renderizarListaFuncionarios(); }, e => { console.error("Erro funcionários:", e); exibirMensagem("Erro ao carregar funcionários.", "error"); }); }
function carregarFornecedores() { if (!auth.currentUser) return; const q=query(collection(db, `artifacts/${shopInstanceAppId}/fornecedores`)); onSnapshot(q, (snap)=>{ fornecedoresCache=[]; snap.forEach(doc=>fornecedoresCache.push({id:doc.id,...doc.data()})); fornecedoresCache.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")); if (activeSectionId === 'cadastrarFornecedor') renderizarListaFornecedores(); }, e => { console.error("Erro fornecedores:", e); exibirMensagem("Erro ao carregar fornecedores.", "error"); }); }


window.togglePrecoFields=(context = '')=>{
    const tipoPrecoEl = document.getElementById(`produtoTipoPreco${context}`);
    const tipo = tipoPrecoEl?.value; 
    if(!tipo)return; 
    document.getElementById(`precoUnidadeFields${context}`).classList.toggle('hidden',tipo==='metro');
    document.getElementById(`precoMetroFields${context}`).classList.toggle('hidden',tipo==='unidade');
};

const pedidoClienteSearchEl = document.getElementById('pedidoClienteSearch'); 
const pedidoClienteResultadosEl = document.getElementById('pedidoClienteResultados'); 
const pedidoClienteIdEl = document.getElementById('pedidoClienteId'); 
if (pedidoClienteSearchEl) { 
    pedidoClienteSearchEl.addEventListener('input', () => { 
        const t=pedidoClienteSearchEl.value.toLowerCase(); 
        pedidoClienteResultadosEl.innerHTML=''; 
        if(t.length<2){
            pedidoClienteResultadosEl.classList.add('hidden');
            pedidoClienteIdEl.value='';
            return;
        } 
        const res=clientesCache.filter(c=>(c.nome&&c.nome.toLowerCase().includes(t))||(c.telefone&&String(c.telefone).toLowerCase().includes(t))||(c.email&&c.email.toLowerCase().includes(t))); 
        if(res.length>0){
            res.forEach(cli=>{
                const d=document.createElement('div');
                d.className = 'p-2 hover:bg-indigo-500 cursor-pointer';
                d.textContent=`${cli.nome} ${cli.telefone?'- '+cli.telefone:''}`;
                d.onclick=()=>{
                    pedidoClienteSearchEl.value=cli.nome;
                    pedidoClienteIdEl.value=cli.id;
                    pedidoClienteResultadosEl.classList.add('hidden');
                    pedidoClienteResultadosEl.innerHTML='';
                };
                pedidoClienteResultadosEl.appendChild(d);
            });
            pedidoClienteResultadosEl.classList.remove('hidden');
        } else {
            const d=document.createElement('div');
            d.textContent='Nenhum cliente encontrado.';
            d.className = 'p-2 text-slate-400 italic';
            pedidoClienteResultadosEl.appendChild(d);
            pedidoClienteResultadosEl.classList.remove('hidden');
            pedidoClienteIdEl.value='';
        } 
    }); 
    document.addEventListener('click', (ev) => { 
        if (pedidoClienteSearchEl && !pedidoClienteSearchEl.contains(ev.target) && pedidoClienteResultadosEl && !pedidoClienteResultadosEl.contains(ev.target)) 
            pedidoClienteResultadosEl.classList.add('hidden'); 
    }); 
}

// ... the rest of your Javascript functions like handleSalvarPedido, getStatusBadgeSimpleHTML etc. remain the same

// Helper for image resizing
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
function handlePasteImagePedido(ev){ev.preventDefault();const iT=(ev.clipboardData||window.clipboardData).items;for(let i in iT){const it=iT[i];if(it.kind==='file'&&it.type.startsWith('image/')){processImageFilePedido(it.getAsFile());break;}}}
function popularSelectProduto(sel){sel.innerHTML='<option value="">Selecione produto</option>';produtosCache.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.nome;o.dataset.tipo=p.tipoPreco;o.dataset.precoMetro=p.precoMetro||0;o.dataset.precoUnidade=p.precoUnidade||0;sel.appendChild(o);});}
window.adicionarItemPedidoForm = (itemParaEditar = null) => {
    itemPedidoCount++;
    const c = document.getElementById('itensPedidoContainer');
    const d = document.createElement('div');
    d.className = 'p-3.5 border border-slate-700 rounded-lg space-y-2.5 item-pedido-form relative';
    d.id = `itemPedido-${itemPedidoCount}`;
    d.innerHTML = `
        <button type="button" onclick="removerItemPedidoForm(${itemPedidoCount})" class="absolute top-1.5 right-1.5 text-red-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-700 transition-colors text-xs"><i class="fas fa-times"></i></button>
        <h4 class="font-medium text-sm text-slate-300">Item ${itemPedidoCount}</h4>
        <div>
            <label class="label-text text-xs">Produto:</label>
            <select class="input-field input-field-sm produto-select" id="itemProduto-${itemPedidoCount}" onchange="toggleCamposProduto(${itemPedidoCount}, '')"></select>
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
window.toggleCamposProduto=(id, context = '')=>{ const s=document.getElementById(`itemProduto${context?`-${context}`:''}-${id}`); const c=document.getElementById(`camposProdutoMetro${context?`-${context}`:''}-${id}`); const o=s.options[s.selectedIndex]; const t=o?.dataset.tipo; if(c) c.classList.toggle('hidden',t!=='metro'); if(context!=='Editar') calcularValorItem(id); };
window.calcularValorItem=(id)=>{const s=document.getElementById(`itemProduto-${id}`),o=s.options[s.selectedIndex];if(!o||!o.value){document.getElementById(`itemValor-${id}`).value="R$ 0,00";atualizarValorTotalPedido();return;}const t=o.dataset.tipo,pm=parseFloat(o.dataset.precoMetro),pu=parseFloat(o.dataset.precoUnidade),q=parseInt(document.getElementById(`itemQuantidade-${id}`).value)||1;let v=0;if(t==='metro'){const l=parseFloat(document.getElementById(`itemLargura-${id}`).value)||0,a=parseFloat(document.getElementById(`itemAltura-${id}`).value)||0;if(l>0&&a>0&&pm>0)v=(l*a*pm)*q;}else{if(pu>0)v=pu*q;}document.getElementById(`itemValor-${id}`).value=`R$ ${v.toFixed(2).replace('.',',')}`;atualizarValorTotalPedido();}
function atualizarValorTotalPedido(){let tI=0;document.querySelectorAll('.valor-item-produto').forEach(i=>{const v=i.value.replace('R$ ','').replace(',','.');tI+=parseFloat(v)||0;});document.getElementById('pedidoValorTotal').value=`R$ ${tI.toFixed(2).replace('.',',')}`;calcularTotaisPagamento();}
window.adicionarPagamentoForm=()=>{pagamentoCount++;const c=document.getElementById('pagamentosContainer');const d=document.createElement('div');d.className='grid grid-cols-1 sm:grid-cols-[2fr,1fr,auto] gap-3 items-end p-3 border border-slate-700 rounded-lg pagamento-form-item';d.id=`pagamentoItem-${pagamentoCount}`;d.innerHTML=`<div><label class="label-text text-xs">Forma:</label><select class="input-field input-field-sm py-1.5 forma-pagamento"><option value="Dinheiro">Dinheiro</option><option value="Cartão de Crédito">Crédito</option><option value="Cartão de Débito">Débito</option><option value="PIX">PIX</option><option value="Boleto">Boleto</option><option value="Pendente">Pendente</option></select></div><div><label class="label-text text-xs">Valor (R$):</label><input type="number" step="0.01" class="input-field input-field-sm py-1.5 valor-pago" placeholder="0,00" oninput="window.calcularTotaisPagamento()"></div><button type="button" onclick="removerPagamentoForm(${pagamentoCount})" class="btn btn-danger btn-small text-xs py-1.5 px-2 self-center sm:self-end h-8"><i class="fas fa-trash"></i></button><div class="sm:col-span-3"><label class="label-text text-xs">Obs:</label><input type="text" class="input-field input-field-sm py-1.5 observacao-pagamento" placeholder="Ex: Entrada..."></div>`;c.appendChild(d);calcularTotaisPagamento();}

function calcularTotaisPagamento(){let tP=0;document.querySelectorAll('.pagamento-form-item .valor-pago').forEach(i=>{tP+=parseFloat(i.value)||0;});document.getElementById('pedidoTotalPago').value=`R$ ${tP.toFixed(2).replace('.',',')}`;const vTS=document.getElementById('pedidoValorTotal').value.replace('R$ ','').replace(',','.'),vT=parseFloat(vTS)||0,vR=vT-tP;document.getElementById('pedidoValorRestante').value=`R$ ${vR.toFixed(2).replace('.',',')}`; }
window.calcularTotaisPagamento = calcularTotaisPagamento; 
async function handleSalvarPedido(e) { 
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
}
        
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
const produtoTipoPrecoEditarEl = document.getElementById('produtoTipoPrecoEditar'); if (produtoTipoPrecoEditarEl) togglePrecoFields('Editar'); 

