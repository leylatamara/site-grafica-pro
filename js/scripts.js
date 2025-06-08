if (idSecao === 'novoPedido' && !editingOrderId) {
    document.getElementById('pedidoDataHora').value = new Date().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
    document.getElementById('formNovoPedido').reset(); 
    document.getElementById('itensPedidoContainer').innerHTML = ''; 
    document.getElementById('pagamentosContainer').innerHTML = ''; 
    document.getElementById('pedidoClienteSearch').value = '';
    document.getElementById('pedidoClienteId').value = '';
    document.getElementById('pedidoClienteResultados').classList.add('hidden');
    itemPedidoCount = 0; 
    pagamentoCount = 0; 
    pedidoImagemBase64 = null; 
    const prevImg = document.getElementById('pedidoImagemPreview'), ph = document.getElementById('pedidoImagemPreviewPlaceholder');
    if (prevImg && ph) { prevImg.src = "#"; prevImg.classList.add('hidden'); ph.classList.remove('hidden'); }
    atualizarValorTotalPedido(); 
    document.querySelector('#formNovoPedido button[type=\'submit\']').innerHTML = '<i class="fas fa-check mr-1.5"></i>Guardar Pedido';
    document.getElementById('editingOrderIdField').value = ''; 
} 

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!auth.currentUser) return;
    const formId = e.target.id;

    try {
        if (formId === 'formNovoPedido' || formId === 'formEditarPedido') {
            const dados = {
                clienteId: document.getElementById('pedidoClienteId').value,
                vendedorId: document.getElementById('pedidoVendedor').value,
                dataEntregaStr: document.getElementById('pedidoDataEntrega').value,
                horaEntregaStr: document.getElementById('pedidoHoraEntrega').value
            };
            
            if (!dados.clienteId || !dados.vendedorId || !dados.dataEntregaStr) {
                exibirMensagem("Cliente, Vendedor e Data de Entrega são obrigatórios.", "warning");
                return;
            }
            
            let dEFinal = Timestamp.fromDate(new Date(`${dados.dataEntregaStr}T${dados.horaEntregaStr || '00:00:00'}`));
            const itensForms = document.querySelectorAll('.item-pedido-form');
            
            if (itensForms.length === 0) {
                exibirMensagem("Adicione pelo menos um item.", "warning");
                return;
            }
            
            let itensPedido = [], pagamentosPedido = [], formValido = true;
            
            // Processa os itens do pedido
            itensForms.forEach(form => {
                const produtoId = form.querySelector('.produto-select').value;
                const produto = produtosCache.find(p => p.id === produtoId);
                if (!produto) {
                    formValido = false;
                    return;
                }
                
                const quantidade = parseFloat(form.querySelector('.quantidade-produto').value) || 0;
                const descricao = form.querySelector('.item-descricao').value;
                let valorItem = 0;
                
                if (produto.tipoPreco === 'metro') {
                    const largura = parseFloat(form.querySelector('.dimensoes-produto[id^="itemLargura"]').value) || 0;
                    const altura = parseFloat(form.querySelector('.dimensoes-produto[id^="itemAltura"]').value) || 0;
                    valorItem = largura * altura * produto.precoMetro * quantidade;
                } else {
                    valorItem = produto.precoUnidade * quantidade;
                }
                
                itensPedido.push({
                    produtoId,
                    produtoNome: produto.nome,
                    tipoProduto: produto.tipoPreco,
                    quantidade,
                    descricao,
                    valorItem,
                    largura: produto.tipoPreco === 'metro' ? parseFloat(form.querySelector('.dimensoes-produto[id^="itemLargura"]').value) || 0 : null,
                    altura: produto.tipoPreco === 'metro' ? parseFloat(form.querySelector('.dimensoes-produto[id^="itemAltura"]').value) || 0 : null
                });
            });
            
            if (!formValido) {
                exibirMensagem("Erro ao processar os itens do pedido.", "error");
                return;
            }
            
            // Processa os pagamentos
            document.querySelectorAll('.pagamento-form-item').forEach(form => {
                const forma = form.querySelector('.forma-pagamento').value;
                const valorPago = parseFloat(form.querySelector('.valor-pago').value) || 0;
                const observacao = form.querySelector('.observacao-pagamento').value;
                
                if (forma && valorPago > 0) {
                    pagamentosPedido.push({ forma, valorPago, observacao });
                }
            });
            
            const pData = {
                clienteId: dados.clienteId,
                clienteNome: document.getElementById('pedidoClienteSearch').value,
                vendedorId: dados.vendedorId,
                vendedorNome: document.getElementById('pedidoVendedor').options[document.getElementById('pedidoVendedor').selectedIndex].text,
                pagamentos: pagamentosPedido,
                dataEntrega: dEFinal,
                status: document.getElementById('pedidoStatus').value,
                valorTotal: parseFloat(document.getElementById('pedidoValorTotal').value.replace('R$ ', '').replace(',', '.')),
                itens: itensPedido,
                imagemPreviewPedidoBase64: pedidoImagemBase64,
                descricaoGeral: document.getElementById('pedidoDescricaoGeral').value
            };
            
            if (editingOrderId) {
                const oPD = todosOsPedidosCache.find(p => p.id === editingOrderId);
                pData.dataPedido = oPD?.dataPedido || Timestamp.now();
                pData.numeroPedido = oPD?.numeroPedido || `PED-${Date.now().toString().slice(-6)}`;
                await setDoc(doc(db, `artifacts/${shopInstanceAppId}/pedidos`, editingOrderId), pData);
                exibirMensagem('Pedido atualizado!', 'success');
                mostrarSecao('visualizarPedidos', true);
            } else {
                pData.dataPedido = Timestamp.now();
                pData.numeroPedido = `PED-${Date.now().toString().slice(-6)}`;
                await addDoc(collection(db, `artifacts/${shopInstanceAppId}/pedidos`), pData);
                exibirMensagem('Pedido guardado!', 'success');
                mostrarSecao('telaInicial', true);
            }
            
            // Limpa o formulário
            document.getElementById(formId).reset();
            document.getElementById('editingOrderIdField').value = '';
            editingOrderId = null;
            document.getElementById('itensPedidoContainer').innerHTML = '';
            document.getElementById('pagamentosContainer').innerHTML = '';
            document.getElementById('pedidoClienteSearch').value = '';
            document.getElementById('pedidoClienteId').value = '';
            document.getElementById('pedidoClienteResultados').classList.add('hidden');
            pagamentoCount = 0;
            pedidoImagemBase64 = null;
            const pIP = document.getElementById('pedidoImagemPreview'), pIPH = document.getElementById('pedidoImagemPreviewPlaceholder');
            if (pIP && pIPH) {
                pIP.src = "#";
                pIP.classList.add('hidden');
                pIPH.classList.remove('hidden');
            }
            itemPedidoCount = 0;
            atualizarValorTotalPedido();
        }
    } catch (error) {
        exibirMensagem("Erro ao processar o formulário: " + error.message, "error");
    }
} 

function mostrarSecao(idSecao, isMenuLink = false) {
    const mainContentArea = document.getElementById('mainContentArea');
    const activeSectionId = mainContentArea.dataset.activeSection;
    if (activeSectionId === idSecao) return;

    if (idSecao === 'novoPedido' && !editingOrderId) {
        document.getElementById('pedidoDataHora').value = new Date().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
        document.getElementById('formNovoPedido').reset(); 
        document.getElementById('itensPedidoContainer').innerHTML = ''; 
        document.getElementById('pagamentosContainer').innerHTML = ''; 
        document.getElementById('pedidoClienteSearch').value = '';
        document.getElementById('pedidoClienteId').value = '';
        document.getElementById('pedidoClienteResultados').classList.add('hidden');
        itemPedidoCount = 0; 
        pagamentoCount = 0; 
        pedidoImagemBase64 = null; 
        const prevImg = document.getElementById('pedidoImagemPreview'), ph = document.getElementById('pedidoImagemPreviewPlaceholder');
        if (prevImg && ph) { prevImg.src = "#"; prevImg.classList.add('hidden'); ph.classList.remove('hidden'); }
        atualizarValorTotalPedido(); 
        document.querySelector('#formNovoPedido button[type="submit"]').innerHTML = '<i class="fas fa-check mr-1.5"></i>Guardar Pedido';
        document.getElementById('editingOrderIdField').value = ''; 
    } else if (editingOrderId && activeSectionId !== 'editarPedido') {
        editingOrderId = null; 
        document.getElementById('editingOrderIdField').value = '';
    }

    if (idSecao === 'telaInicial') atualizarDashboard(); 
    if (idSecao === 'cadastrarCliente') { 
        document.getElementById('pesquisaClienteInput').value = ''; 
        renderizarListaClientes(); 
        document.getElementById('detalhesClienteSelecionado').classList.add('hidden'); 
        clienteSelecionadoId = null; 
    }
    if (idSecao === 'cadastrarFornecedor') document.getElementById('formCadastrarFornecedor').reset();
    if (idSecao === 'visualizarPedidos') renderizarListaCompletaPedidos();
    ajustarPaddingBody();
} 

function setActiveMenuLink(sectionId) {
    document.querySelectorAll('.exo-menu li').forEach(li => {
        const a = li.querySelector('a');
        if (a) {
            if (li.dataset.sectionId === sectionId) {
                li.classList.add('active');
                a.setAttribute('aria-current', 'page');
            } else {
                li.classList.remove('active');
                a.removeAttribute('aria-current');
            }
        }
    });

    // Mostra/esconde o item de menu de edição
    const editarPedidoItem = document.querySelector('li[data-section-id="editarPedido"]');
    if (editarPedidoItem) {
        if (sectionId === 'editarPedido') {
            editarPedidoItem.classList.remove('hidden');
        } else {
            editarPedidoItem.classList.add('hidden');
        }
    }
} 