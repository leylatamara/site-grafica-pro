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