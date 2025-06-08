// js/templates.js

/**
 * Módulo de Templates HTML
 * Centraliza todo o HTML das secções da aplicação.
 * A função injectAllTemplates cria e injeta todas as secções no DOM.
 */
export function injectAllTemplates() {
    const mainContentArea = document.getElementById('mainContentArea');
    if (!mainContentArea) {
        console.error("Erro Crítico: O elemento 'mainContentArea' não foi encontrado. Não é possível injetar os templates.");
        return;
    }

    // Limpa a área de conteúdo para garantir que não haja duplicação
    mainContentArea.innerHTML = '';

    const templates = {
        telaInicial: `
            <div class="dashboard-header"><h1>Painel de Controlo</h1></div>
            <div class="summary-cards">
                <div class="metric-card-dashboard card"><div class="card-header"><span class="icon-wrapper-dashboard icon"><i class="fas fa-calendar-day"></i></span><h3 class="metric-label-dashboard card-title">Pedidos Hoje</h3></div><p id="metricPedidosHoje" class="metric-value-dashboard card-value">0</p></div>
                <div class="metric-card-dashboard card"><div class="card-header"><span class="icon-wrapper-dashboard icon"><i class="fas fa-hourglass-half"></i></span><h3 class="metric-label-dashboard card-title">Pendentes</h3></div><p id="metricPedidosPendentes" class="metric-value-dashboard card-value">0</p></div>
                <div class="metric-card-dashboard card"><div class="card-header"><span class="icon-wrapper-dashboard icon"><i class="fas fa-dollar-sign"></i></span><h3 class="metric-label-dashboard card-title">Faturamento Mês</h3></div><p id="metricFaturamentoMes" class="metric-value-dashboard card-value currency">R$0,00</p></div>
                <div class="metric-card-dashboard card"><div class="card-header"><span class="icon-wrapper-dashboard icon"><i class="fas fa-users"></i></span><h3 class="metric-label-dashboard card-title">Total Clientes</h3></div><p id="metricTotalClientes" class="metric-value-dashboard card-value">0</p></div>
            </div>
            <div class="material-table-card recent-orders">
                <div class="material-table-header recent-orders-header"><h2>Últimos Pedidos</h2><button onclick="mostrarSecao('visualizarPedidos', true)" class="btn btn-primary btn-view-all text-xs py-2 px-3"><i class="fas fa-list-ul mr-2"></i>Ver Todos</button></div>
                <div class="material-table-container orders-table-wrapper"><table class="material-data-table orders-table"><thead><tr><th>Nº Pedido</th><th>Cliente</th><th>Data</th><th>Valor</th><th>Estado</th><th>Ações</th></tr></thead><tbody id="ultimosPedidosTableBody"></tbody></table></div>
            </div>`,
        novoPedido: `
            <h2 class="text-xl font-semibold mb-6 pb-4 border-b">Novo Pedido</h2>
            <form id="formNovoPedido" class="space-y-6">
                <input type="hidden" id="editingOrderIdField">
                <div><label for="pedidoDataHora" class="label-text">Data e Hora do Pedido:</label><input type="text" id="pedidoDataHora" class="input-field" readonly></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="relative">
                        <label for="pedidoClienteSearch" class="label-text">Cliente:</label>
                        <div class="relative">
                            <input type="text" id="pedidoClienteSearch" class="input-field pr-10" placeholder="Pesquisar cliente por nome ou telefone...">
                            <i class="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        </div>
                        <input type="hidden" id="pedidoClienteId">
                        <div id="pedidoClienteResultados" class="absolute z-20 w-full border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto hidden bg-white">
                            <div class="p-2 text-sm text-gray-500 text-center">Digite para pesquisar...</div>
                        </div>
                        <button type="button" onclick="window.abrirModalNovoClienteRapido()" class="mt-2 btn btn-link text-xs">
                            <i class="fas fa-user-plus mr-1"></i>Registar novo cliente
                        </button>
                    </div>
                    <div>
                        <label for="pedidoVendedor" class="label-text">Funcionário (Vendedor):</label>
                        <select id="pedidoVendedor" class="input-field">
                            <option value="">Selecione um funcionário</option>
                        </select>
                    </div>
                </div>
                <div class="pt-5 border-t">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Itens do Pedido</h3>
                    </div>
                    <div id="itensPedidoContainer" class="space-y-4"></div>
                    <button type="button" onclick="window.adicionarItemPedidoForm()" class="mt-4 btn btn-outline btn-small text-sm">
                        <i class="fas fa-plus mr-1.5"></i>Adicionar Produto
                    </button>
                </div>
                <div class="pt-5 border-t space-y-4">
                    <div>
                        <label for="pedidoDescricaoGeral" class="label-text">Descrição Geral do Pedido:</label>
                        <textarea id="pedidoDescricaoGeral" rows="2" class="input-field text-lg font-semibold" placeholder="Ex: Kit Adesivos para Vitrine..."></textarea>
                    </div>
                    <div>
                        <label class="label-text">Preview do Pedido (Opcional):</label>
                        <div id="pedidoImageDropArea" class="image-drop-area" onclick="document.getElementById('pedidoImagemFile').click();">
                            <input type="file" accept="image/*" class="hidden" id="pedidoImagemFile" onchange="window.handleImagemFilePedido(event)">
                            <img src="#" alt="Preview do Pedido" id="pedidoImagemPreview" class="hidden preview-image">
                            <span id="pedidoImagemPreviewPlaceholder" class="text-sm">
                                <i class="fas fa-image fa-2x mb-1.5"></i><br>
                                Cole ou clique para carregar imagem
                            </span>
                        </div>
                    </div>
                </div>
                <div class="pt-5 border-t">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Detalhes do Pagamento</h3>
                    </div>
                    <div id="pagamentosContainer" class="space-y-4"></div>
                    <button type="button" onclick="window.adicionarPagamentoForm()" class="mt-4 btn btn-outline btn-small text-sm">
                        <i class="fas fa-dollar-sign mr-1.5"></i>Adicionar Pagamento
                    </button>
                    <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div>
                            <label class="label-text">Valor Total do Pedido:</label>
                            <input type="text" id="pedidoValorTotal" class="input-field text-lg font-semibold" readonly value="R$ 0,00">
                        </div>
                        <div>
                            <label class="label-text">Total Pago:</label>
                            <input type="text" id="pedidoTotalPago" class="input-field text-lg font-semibold" readonly value="R$ 0,00">
                        </div>
                        <div>
                            <label class="label-text">Valor Restante:</label>
                            <input type="text" id="pedidoValorRestante" class="input-field text-lg font-semibold" readonly value="R$ 0,00">
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="pedidoDataEntrega" class="label-text">Data Entrega:</label>
                            <input type="date" id="pedidoDataEntrega" class="input-field">
                        </div>
                        <div>
                            <label for="pedidoHoraEntrega" class="label-text">Hora Entrega:</label>
                            <input type="time" id="pedidoHoraEntrega" class="input-field">
                        </div>
                    </div>
                    <div>
                        <label for="pedidoStatus" class="label-text">Estado do Pedido:</label>
                        <select id="pedidoStatus" class="input-field">
                            <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                            <option value="Em Produção (Arte)">Em Produção (Arte)</option>
                            <option value="Em Produção (Impressão)">Em Produção (Impressão)</option>
                            <option value="Em Produção (Acabamento)">Em Produção (Acabamento)</option>
                            <option value="Pronto para Retirada">Pronto para Retirada</option>
                            <option value="Em Rota de Entrega">Em Rota de Entrega</option>
                            <option value="Entregue">Entregue</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end space-x-3 pt-6 border-t">
                    <button type="button" onclick="mostrarSecao('telaInicial', true);" class="btn btn-secondary">
                        <i class="fas fa-times mr-1.5"></i>Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-check mr-1.5"></i>Guardar Pedido
                    </button>
                </div>
            </form>`,
        editarPedido: `
            <h2 class="text-xl font-semibold mb-6 pb-4 border-b">Editar Pedido</h2>
            <form id="formEditarPedido" class="space-y-6">
                <input type="hidden" id="editingOrderIdField">
                <div><label for="pedidoDataHora" class="label-text">Data e Hora do Pedido:</label><input type="text" id="pedidoDataHora" class="input-field" readonly></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="relative"><label for="pedidoClienteSearch" class="label-text">Cliente:</label><input type="text" id="pedidoClienteSearch" class="input-field" placeholder="Pesquisar cliente..."><input type="hidden" id="pedidoClienteId"><div id="pedidoClienteResultados" class="absolute z-20 w-full border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto hidden"></div><button type="button" onclick="window.abrirModalNovoClienteRapido()" class="mt-2 btn btn-link text-xs">Registar novo cliente</button></div>
                    <div><label for="pedidoVendedor" class="label-text">Funcionário (Vendedor):</label><select id="pedidoVendedor" class="input-field"><option value="">Selecione um funcionário</option></select></div>
                </div>
                <div class="pt-5 border-t"><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">Itens do Pedido</h3></div><div id="itensPedidoContainer" class="space-y-4"></div><button type="button" onclick="window.adicionarItemPedidoForm()" class="mt-4 btn btn-outline btn-small text-sm"><i class="fas fa-plus mr-1.5"></i>Adicionar Produto</button></div>
                <div class="pt-5 border-t space-y-4">
                    <div><label for="pedidoDescricaoGeral" class="label-text">Descrição Geral do Pedido:</label><textarea id="pedidoDescricaoGeral" rows="2" class="input-field text-lg font-semibold" placeholder="Ex: Kit Adesivos para Vitrine..."></textarea></div>
                    <div><label class="label-text">Preview do Pedido (Opcional):</label><div id="pedidoImageDropArea" class="image-drop-area" onclick="document.getElementById('pedidoImagemFile').click();"><input type="file" accept="image/*" class="hidden" id="pedidoImagemFile" onchange="window.handleImagemFilePedido(event)"><img src="#" alt="Preview do Pedido" id="pedidoImagemPreview" class="hidden preview-image"><span id="pedidoImagemPreviewPlaceholder" class="text-sm"><i class="fas fa-image fa-2x mb-1.5"></i><br>Cole ou clique para carregar imagem</span></div></div>
                </div>
                <div class="pt-5 border-t">
                    <div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">Detalhes do Pagamento</h3></div><div id="pagamentosContainer" class="space-y-4"></div><button type="button" onclick="window.adicionarPagamentoForm()" class="mt-4 btn btn-outline btn-small text-sm"><i class="fas fa-dollar-sign mr-1.5"></i>Adicionar Pagamento</button>
                    <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div><label class="label-text">Valor Total do Pedido:</label><input type="text" id="pedidoValorTotal" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div>
                        <div><label class="label-text">Total Pago:</label><input type="text" id="pedidoTotalPago" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div>
                        <div><label class="label-text">Valor Restante:</label><input type="text" id="pedidoValorRestante" class="input-field text-lg font-semibold" readonly value="R$ 0,00"></div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t">
                    <div class="grid grid-cols-2 gap-4"><div><label for="pedidoDataEntrega" class="label-text">Data Entrega:</label><input type="date" id="pedidoDataEntrega" class="input-field"></div><div><label for="pedidoHoraEntrega" class="label-text">Hora Entrega:</label><input type="time" id="pedidoHoraEntrega" class="input-field"></div></div>
                    <div><label for="pedidoStatus" class="label-text">Estado do Pedido:</label><select id="pedidoStatus" class="input-field"><option value="Aguardando Aprovação">Aguardando Aprovação</option><option value="Em Produção (Arte)">Em Produção (Arte)</option><option value="Em Produção (Impressão)">Em Produção (Impressão)</option><option value="Em Produção (Acabamento)">Em Produção (Acabamento)</option><option value="Pronto para Retirada">Pronto para Retirada</option><option value="Em Rota de Entrega">Em Rota de Entrega</option><option value="Entregue">Entregue</option><option value="Cancelado">Cancelado</option></select></div>
                </div>
                <div class="flex justify-end space-x-3 pt-6 border-t"><button type="button" onclick="mostrarSecao('visualizarPedidos', true);" class="btn btn-secondary">Cancelar</button><button type="submit" class="btn btn-primary"><i class="fas fa-save mr-1.5"></i>Atualizar Pedido</button></div>
            </form>`,
        cadastrarCliente: `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-1"><h2 class="text-xl font-semibold mb-5">Registar Cliente</h2><form id="formCadastrarCliente" class="space-y-4"><div><label for="clienteNome" class="label-text">Nome Completo / Razão Social:</label><input type="text" id="clienteNome" class="input-field" required></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label for="clienteTipo" class="label-text">Tipo de Cliente:</label><select id="clienteTipo" class="input-field"><option value="final">Cliente Final</option><option value="revenda">Revenda</option></select></div><div><label for="clienteTelefone" class="label-text">Telefone:</label><input type="tel" id="clienteTelefone" class="input-field"></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label for="clienteEmail" class="label-text">Email:</label><input type="email" id="clienteEmail" class="input-field"></div><div><label for="clienteCpfCnpj" class="label-text">CPF/CNPJ (Opcional):</label><input type="text" id="clienteCpfCnpj" class="input-field"></div></div><div><label for="clienteEndereco" class="label-text">Endereço (Opcional):</label><input type="text" id="clienteEndereco" class="input-field"></div><div class="flex justify-end pt-3"><button type="submit" class="btn btn-primary"><i class="fas fa-user-plus mr-1.5"></i>Guardar Cliente</button></div></form></div>
                <div class="lg:col-span-2 mt-6 lg:mt-0"><h3 class="text-lg font-semibold mb-1">Clientes Registados</h3><div class="search-input-wrapper relative"><i class="fas fa-search absolute top-1/2 left-3.5 transform -translate-y-1/2 text-gray-400"></i><input type="text" id="pesquisaClienteInput" class="input-field w-full pl-10" placeholder="Pesquisar cliente por nome, telefone..."></div><div id="listaClientes" class="space-y-2.5 max-h-60 sm:max-h-72 lg:max-h-[calc(100vh-340px)] overflow-y-auto pr-1 mt-3"></div><div id="detalhesClienteSelecionado" class="mt-6 hidden"><h4 class="text-md font-semibold mb-2 border-t pt-4">Detalhes do Cliente</h4><div id="infoCliente" class="p-3 border rounded-md mb-4 text-sm space-y-1"></div><h4 class="text-md font-semibold mb-2">Pedidos do Cliente</h4><div id="pedidosDoClienteLista" class="space-y-2.5 max-h-40 sm:max-h-48 overflow-y-auto pr-1 border rounded-md p-2"></div></div></div>
            </div>`,
        cadastrarProduto: `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-1"><h2 class="text-xl font-semibold mb-5">Registar Produto</h2><form id="formCadastrarProduto" class="space-y-4"><div><label for="produtoNome" class="label-text">Nome do Produto:</label><input type="text" id="produtoNome" class="input-field" required></div><div><label for="produtoTipoPreco" class="label-text">Tipo de Precificação:</label><select id="produtoTipoPreco" class="input-field"><option value="unidade">Por Unidade/Pacote</option><option value="metro">Por Metro Quadrado (m²)</option></select></div><div id="precoUnidadeFields"><label for="produtoPrecoUnidade" class="label-text">Preço Unitário (R$):</label><input type="number" step="0.01" id="produtoPrecoUnidade" class="input-field"></div><div id="precoMetroFields" class="hidden"><label for="produtoPrecoMetro" class="label-text">Preço por Metro Quadrado (R$/m²):</label><input type="number" step="0.01" id="produtoPrecoMetro" class="input-field"></div><div><label for="produtoDescricao" class="label-text">Descrição (Opcional):</label><textarea id="produtoDescricao" rows="3" class="input-field"></textarea></div><div class="flex justify-end pt-3"><button type="submit" class="btn btn-primary"><i class="fas fa-box mr-1.5"></i>Guardar Produto</button></div></form></div>
                <div class="lg:col-span-2 mt-6 lg:mt-0"><h3 class="text-md font-semibold mb-3">Produtos Registados</h3><div id="listaProdutos" class="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1"></div></div>
            </div>`,
        cadastrarFuncionario: `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-1"><h2 class="text-xl font-semibold mb-5">Registar Funcionário</h2><form id="formCadastrarFuncionario" class="space-y-4"><div><label for="funcionarioNome" class="label-text">Nome do Funcionário:</label><input type="text" id="funcionarioNome" class="input-field" required></div><div><label for="funcionarioContato" class="label-text">Contacto (Telefone/Email - Opcional):</label><input type="text" id="funcionarioContato" class="input-field"></div><div><label for="funcionarioCargo" class="label-text">Cargo:</label><select id="funcionarioCargo" class="input-field"><option value="admin">Administrador</option><option value="vendedor" selected>Vendedor</option><option value="producao">Produção</option><option value="impressor">Impressor</option><option value="designer">Designer</option><option value="freelancer">Freelancer</option></select></div><div><label for="funcionarioCodigoAcesso" class="label-text">Código de Acesso:</label><input type="text" id="funcionarioCodigoAcesso" class="input-field" placeholder="Ex: 123456" required></div><div class="flex justify-end pt-3"><button type="submit" class="btn btn-primary"><i class="fas fa-user-plus mr-1.5"></i>Guardar Funcionário</button></div></form></div>
                <div class="lg:col-span-2 mt-6 lg:mt-0"><h3 class="text-md font-semibold mb-3">Funcionários Registados</h3><div id="listaFuncionarios" class="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1"></div></div>
            </div>`,
        cadastrarFornecedor: `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-1"><h2 class="text-xl font-semibold mb-5">Registar Fornecedor</h2><form id="formCadastrarFornecedor" class="space-y-4"><div><label for="fornecedorNome" class="label-text">Nome do Fornecedor:</label><input type="text" id="fornecedorNome" class="input-field" required></div><div><label for="fornecedorContato" class="label-text">Contacto (Telefone/Email):</label><input type="text" id="fornecedorContato" class="input-field"></div><div><label for="fornecedorMaterial" class="label-text">Tipo de Material Fornecido:</label><input type="text" id="fornecedorMaterial" class="input-field"></div><div class="flex justify-end pt-3"><button type="submit" class="btn btn-primary"><i class="fas fa-truck-loading mr-1.5"></i>Guardar Fornecedor</button></div></form></div>
                <div class="lg:col-span-2 mt-6 lg:mt-0"><h3 class="text-md font-semibold mb-3">Fornecedores Registados</h3><div id="listaFornecedores" class="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1"></div></div>
            </div>`,
        visualizarPedidos: `
            <h2 class="text-xl font-semibold mb-5 pb-3 border-b">Todos os Pedidos</h2>
            <div class="mb-6 p-4 border rounded-lg bg-[rgba(255,255,255,0.05)]">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end">
                    <div><label for="filtroNomeCliente" class="label-text text-xs">Nome do Cliente:</label><input type="text" id="filtroNomeCliente" class="input-field input-field-sm py-1.5" placeholder="Pesquisar nome..."></div>
                    <div><label for="filtroNumeroPedido" class="label-text text-xs">Nº do Pedido:</label><input type="text" id="filtroNumeroPedido" class="input-field input-field-sm py-1.5" placeholder="Pesquisar número..."></div>
                    <div><label for="filtroDataPedido" class="label-text text-xs">Data do Pedido:</label><input type="date" id="filtroDataPedido" class="input-field input-field-sm py-1.5"></div>
                    <div><label for="filtroMaterialProduto" class="label-text text-xs">Produto/Material (nos Itens):</label><input type="text" id="filtroMaterialProduto" class="input-field input-field-sm py-1.5" placeholder="Pesquisar item..."></div>
                    <div><label for="filtroStatusPedido" class="label-text text-xs">Estado do Pedido:</label><select id="filtroStatusPedido" class="input-field input-field-sm py-1.5"><option value="">Todos os Estados</option><option value="Aguardando Aprovação">Aguardando Aprovação</option><option value="Em Produção (Arte)">Em Produção (Arte)</option><option value="Em Produção (Impressão)">Em Produção (Impressão)</option><option value="Em Produção (Acabamento)">Em Produção (Acabamento)</option><option value="Pronto para Retirada">Pronto para Retirada</option><option value="Em Rota de Entrega">Em Rota de Entrega</option><option value="Entregue">Entregue</option><option value="Cancelado">Cancelado</option></select></div>
                    <div><label for="filtroVendedor" class="label-text text-xs">Funcionário (Vendedor):</label><select id="filtroVendedor" class="input-field input-field-sm py-1.5"><option value="">Todos os Funcionários</option></select></div>
                    <div><label for="filtroClassificacaoPedido" class="label-text text-xs">Classificar por:</label><select id="filtroClassificacaoPedido" class="input-field input-field-sm py-1.5"><option value="dataPedido_desc">Data Pedido (Mais Recentes)</option><option value="dataPedido_asc">Data Pedido (Mais Antigos)</option><option value="dataEntrega_asc">Data Entrega (Mais Próximos)</option><option value="dataEntrega_desc">Data Entrega (Mais Distantes)</option><option value="clienteNome_asc">Nome Cliente (A-Z)</option><option value="clienteNome_desc">Nome Cliente (Z-A)</option><option value="numeroPedido_asc">Nº Pedido (Crescente)</option><option value="numeroPedido_desc">Nº Pedido (Decrescente)</option></select></div>
                    <div class="sm:col-span-2 lg:col-span-1 lg:col-start-3"><button id="limparFiltrosPedidos" class="btn btn-secondary w-full text-sm py-2"><i class="fas fa-times mr-2"></i>Limpar Filtros</button></div>
                </div>
            </div>
            <div id="listaTodosPedidosContainer" class="pedidos-table-container"><table class="pedidos-table"><thead><tr><th>Nº Pedido</th><th>Cliente</th><th>Data Pedido</th><th>Data Entrega</th><th>Valor Total</th><th>Estado</th><th>Ações</th></tr></thead><tbody id="listaTodosPedidos"></tbody></table></div>`,
        gerirPermissoes: `
            <h2 class="text-xl font-semibold mb-5 pb-3 border-b">Gerir Permissões de Acesso</h2>
            <div id="permissoesContainer" class="mb-6">
                <p class="text-center">A carregar permissões...</p>
            </div>
            <div class="flex justify-end">
                <button id="btnGuardarPermissoes" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>Guardar Permissões
                </button>
            </div>`
    };

    for (const [id, html] of Object.entries(templates)) {
        const section = document.createElement('section');
        section.id = id;
        section.classList.add('main-content-section', 'hidden');
        section.innerHTML = html;
        mainContentArea.appendChild(section);
    }
}
