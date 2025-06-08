# Referência da API - Sistema de Gestão para Gráficas

## Índice
1. [Autenticação](#autenticação)
2. [Clientes](#clientes)
3. [Produtos](#produtos)
4. [Pedidos](#pedidos)
5. [Funcionários](#funcionários)
6. [Fornecedores](#fornecedores)
7. [Backup](#backup)
8. [Monitoramento](#monitoramento)

## Autenticação

### Login
```javascript
async function handleLogin(codigoAcesso: string): Promise<boolean>
```
Realiza o login do usuário.

**Parâmetros:**
- `codigoAcesso`: Código de acesso do funcionário

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await handleLogin('123456');
if (sucesso) {
    console.log('Login realizado com sucesso');
}
```

### Logout
```javascript
async function handleLogout(): Promise<void>
```
Realiza o logout do usuário.

**Exemplo:**
```javascript
await handleLogout();
```

### Verificar Sessão
```javascript
async function checkSession(): Promise<boolean>
```
Verifica se a sessão atual é válida.

**Retorno:**
- `Promise<boolean>`: Sessão válida

**Exemplo:**
```javascript
const sessaoValida = await checkSession();
if (!sessaoValida) {
    window.location.href = '/login';
}
```

## Clientes

### Criar Cliente
```javascript
async function criarCliente(dados: ClienteData): Promise<string>
```
Cria um novo cliente.

**Parâmetros:**
- `dados`: Dados do cliente
  ```typescript
  interface ClienteData {
    nome: string;
    tipo: 'final' | 'revenda';
    contato: {
      telefone: string;
      email: string;
    };
    endereco: string;
    cpfCnpj?: string;
  }
  ```

**Retorno:**
- `Promise<string>`: ID do cliente criado

**Exemplo:**
```javascript
const clienteId = await criarCliente({
    nome: 'João Silva',
    tipo: 'final',
    contato: {
        telefone: '(11) 99999-9999',
        email: 'joao@email.com'
    },
    endereco: 'Rua Exemplo, 123'
});
```

### Buscar Cliente
```javascript
async function buscarCliente(id: string): Promise<ClienteData>
```
Busca um cliente pelo ID.

**Parâmetros:**
- `id`: ID do cliente

**Retorno:**
- `Promise<ClienteData>`: Dados do cliente

**Exemplo:**
```javascript
const cliente = await buscarCliente('cliente123');
console.log(cliente.nome);
```

### Atualizar Cliente
```javascript
async function atualizarCliente(id: string, dados: Partial<ClienteData>): Promise<boolean>
```
Atualiza os dados de um cliente.

**Parâmetros:**
- `id`: ID do cliente
- `dados`: Dados a serem atualizados

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await atualizarCliente('cliente123', {
    telefone: '(11) 98888-8888'
});
```

### Deletar Cliente
```javascript
async function deletarCliente(id: string): Promise<boolean>
```
Remove um cliente.

**Parâmetros:**
- `id`: ID do cliente

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await deletarCliente('cliente123');
```

## Produtos

### Criar Produto
```javascript
async function criarProduto(dados: ProdutoData): Promise<string>
```
Cria um novo produto.

**Parâmetros:**
- `dados`: Dados do produto
  ```typescript
  interface ProdutoData {
    nome: string;
    tipoPreco: 'unidade' | 'metro';
    preco: number;
    descricao?: string;
  }
  ```

**Retorno:**
- `Promise<string>`: ID do produto criado

**Exemplo:**
```javascript
const produtoId = await criarProduto({
    nome: 'Banner 1x1',
    tipoPreco: 'metro',
    preco: 50.00,
    descricao: 'Banner em lona'
});
```

### Buscar Produto
```javascript
async function buscarProduto(id: string): Promise<ProdutoData>
```
Busca um produto pelo ID.

**Parâmetros:**
- `id`: ID do produto

**Retorno:**
- `Promise<ProdutoData>`: Dados do produto

**Exemplo:**
```javascript
const produto = await buscarProduto('produto123');
console.log(produto.nome);
```

### Atualizar Produto
```javascript
async function atualizarProduto(id: string, dados: Partial<ProdutoData>): Promise<boolean>
```
Atualiza os dados de um produto.

**Parâmetros:**
- `id`: ID do produto
- `dados`: Dados a serem atualizados

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await atualizarProduto('produto123', {
    preco: 55.00
});
```

### Deletar Produto
```javascript
async function deletarProduto(id: string): Promise<boolean>
```
Remove um produto.

**Parâmetros:**
- `id`: ID do produto

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await deletarProduto('produto123');
```

## Pedidos

### Criar Pedido
```javascript
async function criarPedido(dados: PedidoData): Promise<string>
```
Cria um novo pedido.

**Parâmetros:**
- `dados`: Dados do pedido
  ```typescript
  interface PedidoData {
    clienteId: string;
    vendedorId: string;
    itens: Array<{
      produtoId: string;
      quantidade: number;
      precoUnitario: number;
    }>;
    dataEntrega: Date;
    observacoes?: string;
    imagem?: string;
  }
  ```

**Retorno:**
- `Promise<string>`: ID do pedido criado

**Exemplo:**
```javascript
const pedidoId = await criarPedido({
    clienteId: 'cliente123',
    vendedorId: 'vendedor123',
    itens: [{
        produtoId: 'produto123',
        quantidade: 2,
        precoUnitario: 50.00
    }],
    dataEntrega: new Date('2024-03-01')
});
```

### Buscar Pedido
```javascript
async function buscarPedido(id: string): Promise<PedidoData>
```
Busca um pedido pelo ID.

**Parâmetros:**
- `id`: ID do pedido

**Retorno:**
- `Promise<PedidoData>`: Dados do pedido

**Exemplo:**
```javascript
const pedido = await buscarPedido('pedido123');
console.log(pedido.clienteId);
```

### Atualizar Status
```javascript
async function atualizarStatusPedido(id: string, status: string): Promise<boolean>
```
Atualiza o status de um pedido.

**Parâmetros:**
- `id`: ID do pedido
- `status`: Novo status

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await atualizarStatusPedido('pedido123', 'Em Produção');
```

### Adicionar Pagamento
```javascript
async function adicionarPagamento(pedidoId: string, pagamento: PagamentoData): Promise<boolean>
```
Adiciona um pagamento a um pedido.

**Parâmetros:**
- `pedidoId`: ID do pedido
- `pagamento`: Dados do pagamento
  ```typescript
  interface PagamentoData {
    valor: number;
    forma: string;
    data: Date;
  }
  ```

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await adicionarPagamento('pedido123', {
    valor: 100.00,
    forma: 'Dinheiro',
    data: new Date()
});
```

## Funcionários

### Criar Funcionário
```javascript
async function criarFuncionario(dados: FuncionarioData): Promise<string>
```
Cria um novo funcionário.

**Parâmetros:**
- `dados`: Dados do funcionário
  ```typescript
  interface FuncionarioData {
    nome: string;
    cargo: string;
    contato: string;
    codigoAcesso: string;
    permissoes: string[];
  }
  ```

**Retorno:**
- `Promise<string>`: ID do funcionário criado

**Exemplo:**
```javascript
const funcionarioId = await criarFuncionario({
    nome: 'Maria Silva',
    cargo: 'vendedor',
    contato: 'maria@email.com',
    codigoAcesso: '123456',
    permissoes: ['pedidos', 'clientes']
});
```

### Buscar Funcionário
```javascript
async function buscarFuncionario(id: string): Promise<FuncionarioData>
```
Busca um funcionário pelo ID.

**Parâmetros:**
- `id`: ID do funcionário

**Retorno:**
- `Promise<FuncionarioData>`: Dados do funcionário

**Exemplo:**
```javascript
const funcionario = await buscarFuncionario('funcionario123');
console.log(funcionario.nome);
```

### Atualizar Funcionário
```javascript
async function atualizarFuncionario(id: string, dados: Partial<FuncionarioData>): Promise<boolean>
```
Atualiza os dados de um funcionário.

**Parâmetros:**
- `id`: ID do funcionário
- `dados`: Dados a serem atualizados

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await atualizarFuncionario('funcionario123', {
    contato: 'novo@email.com'
});
```

### Deletar Funcionário
```javascript
async function deletarFuncionario(id: string): Promise<boolean>
```
Remove um funcionário.

**Parâmetros:**
- `id`: ID do funcionário

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await deletarFuncionario('funcionario123');
```

## Fornecedores

### Criar Fornecedor
```javascript
async function criarFornecedor(dados: FornecedorData): Promise<string>
```
Cria um novo fornecedor.

**Parâmetros:**
- `dados`: Dados do fornecedor
  ```typescript
  interface FornecedorData {
    nome: string;
    contato: string;
    materiais: string[];
  }
  ```

**Retorno:**
- `Promise<string>`: ID do fornecedor criado

**Exemplo:**
```javascript
const fornecedorId = await criarFornecedor({
    nome: 'Fornecedor XYZ',
    contato: 'contato@xyz.com',
    materiais: ['Papel', 'Tinta']
});
```

### Buscar Fornecedor
```javascript
async function buscarFornecedor(id: string): Promise<FornecedorData>
```
Busca um fornecedor pelo ID.

**Parâmetros:**
- `id`: ID do fornecedor

**Retorno:**
- `Promise<FornecedorData>`: Dados do fornecedor

**Exemplo:**
```javascript
const fornecedor = await buscarFornecedor('fornecedor123');
console.log(fornecedor.nome);
```

### Atualizar Fornecedor
```javascript
async function atualizarFornecedor(id: string, dados: Partial<FornecedorData>): Promise<boolean>
```
Atualiza os dados de um fornecedor.

**Parâmetros:**
- `id`: ID do fornecedor
- `dados`: Dados a serem atualizados

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await atualizarFornecedor('fornecedor123', {
    contato: 'novo@xyz.com'
});
```

### Deletar Fornecedor
```javascript
async function deletarFornecedor(id: string): Promise<boolean>
```
Remove um fornecedor.

**Parâmetros:**
- `id`: ID do fornecedor

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await deletarFornecedor('fornecedor123');
```

## Backup

### Realizar Backup
```javascript
async function realizarBackupCompleto(): Promise<boolean>
```
Realiza backup completo do sistema.

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await realizarBackupCompleto();
if (sucesso) {
    console.log('Backup realizado com sucesso');
}
```

### Recuperar Backup
```javascript
async function recuperarBackup(backupId: string): Promise<boolean>
```
Recupera dados de um backup específico.

**Parâmetros:**
- `backupId`: ID do backup

**Retorno:**
- `Promise<boolean>`: Sucesso da operação

**Exemplo:**
```javascript
const sucesso = await recuperarBackup('backup123');
if (sucesso) {
    console.log('Backup recuperado com sucesso');
}
```

## Monitoramento

### Iniciar Monitoramento
```javascript
function iniciarMonitoramento(): void
```
Inicia o sistema de monitoramento.

**Exemplo:**
```javascript
iniciarMonitoramento();
```

### Obter Métricas
```javascript
function getPerformanceMetrics(): {
    performance: any[];
    errors: any[];
}
```
Obtém métricas de performance e erros.

**Retorno:**
- Objeto com métricas de performance e erros

**Exemplo:**
```javascript
const metrics = getPerformanceMetrics();
console.log(metrics.performance);
console.log(metrics.errors);
```

### Limpar Logs
```javascript
function limparLogs(): void
```
Limpa logs em memória.

**Exemplo:**
```javascript
limparLogs();
``` 