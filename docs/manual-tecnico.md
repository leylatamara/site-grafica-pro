# Manual Técnico - Sistema de Gestão para Gráficas

## Índice
1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Estrutura de Dados](#estrutura-de-dados)
3. [API e Integrações](#api-e-integrações)
4. [Segurança](#segurança)
5. [Performance](#performance)
6. [Backup e Recuperação](#backup-e-recuperação)
7. [Monitoramento](#monitoramento)
8. [Desenvolvimento](#desenvolvimento)
9. [Deploy](#deploy)
10. [Manutenção](#manutenção)

## Arquitetura do Sistema

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Framework: Vanilla JS
- UI Components: Custom
- Estilização: Tailwind CSS
- Ícones: Font Awesome

### Backend
- Firebase Realtime Database
- Firebase Authentication
- Firebase Storage
- Firebase Hosting

### Estrutura de Arquivos
```
/
├── index.html
├── styles.css
├── scripts.js
├── js/
│   ├── auth.js
│   ├── clientes.js
│   ├── produtos.js
│   ├── pedidos.js
│   ├── funcionarios.js
│   ├── fornecedores.js
│   ├── ui.js
│   ├── backup.js
│   └── monitor.js
├── docs/
│   ├── README.md
│   ├── manual-usuario.md
│   └── manual-tecnico.md
└── assets/
    └── images/
```

## Estrutura de Dados

### Coleções Firebase

#### Clientes
```javascript
{
  id: string,
  nome: string,
  tipo: 'final' | 'revenda',
  contato: {
    telefone: string,
    email: string
  },
  endereco: string,
  cpfCnpj: string,
  dataCadastro: timestamp,
  ultimaAtualizacao: timestamp
}
```

#### Produtos
```javascript
{
  id: string,
  nome: string,
  tipoPreco: 'unidade' | 'metro',
  preco: number,
  descricao: string,
  dataCadastro: timestamp,
  ultimaAtualizacao: timestamp
}
```

#### Pedidos
```javascript
{
  id: string,
  clienteId: string,
  vendedorId: string,
  itens: [{
    produtoId: string,
    quantidade: number,
    precoUnitario: number,
    total: number
  }],
  status: string,
  dataPedido: timestamp,
  dataEntrega: timestamp,
  valorTotal: number,
  pagamentos: [{
    valor: number,
    forma: string,
    data: timestamp
  }],
  observacoes: string,
  imagem: string
}
```

#### Funcionários
```javascript
{
  id: string,
  nome: string,
  cargo: string,
  contato: string,
  codigoAcesso: string,
  permissoes: string[],
  dataCadastro: timestamp,
  ultimaAtualizacao: timestamp
}
```

#### Fornecedores
```javascript
{
  id: string,
  nome: string,
  contato: string,
  materiais: string[],
  dataCadastro: timestamp,
  ultimaAtualizacao: timestamp
}
```

## API e Integrações

### Firebase Config
```javascript
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
```

### Autenticação
```javascript
// Login
async function handleLogin(codigoAcesso) {
  // Validação
  // Geração de token
  // Armazenamento de sessão
}

// Logout
async function handleLogout() {
  // Limpeza de sessão
  // Redirecionamento
}
```

### Operações CRUD
```javascript
// Create
async function criarDocumento(colecao, dados) {
  // Validação
  // Inserção
  // Log
}

// Read
async function lerDocumento(colecao, id) {
  // Busca
  // Cache
  // Retorno
}

// Update
async function atualizarDocumento(colecao, id, dados) {
  // Validação
  // Atualização
  // Log
}

// Delete
async function deletarDocumento(colecao, id) {
  // Validação
  // Deleção
  // Log
}
```

## Segurança

### Autenticação
- Tokens JWT
- Validação de sessão
- Proteção CSRF
- Rate limiting

### Dados
- Sanitização de inputs
- Validação de tipos
- Criptografia de dados sensíveis
- Backup automático

### Permissões
```javascript
const PERMISSOES = {
  ADMIN: ['*'],
  VENDEDOR: ['pedidos', 'clientes'],
  DESIGNER: ['pedidos'],
  IMPRESSOR: ['pedidos'],
  PRODUCAO: ['pedidos'],
  FREELANCER: ['pedidos']
};
```

## Performance

### Cache
```javascript
const CACHE_CONFIG = {
  maxAge: 5 * 60 * 1000, // 5 minutos
  maxSize: 1000 // items
};
```

### Otimizações
- Lazy loading de imagens
- Compressão de recursos
- Minificação de código
- Cache de dados

## Backup e Recuperação

### Configuração
```javascript
const BACKUP_CONFIG = {
  autoBackupInterval: 24 * 60 * 60 * 1000, // 24 horas
  maxBackups: 30, // Manter últimos 30 backups
  collections: ['clientes', 'produtos', 'pedidos', 'funcionarios', 'fornecedores']
};
```

### Processo
1. Coleta de dados
2. Compressão
3. Upload
4. Limpeza de backups antigos

## Monitoramento

### Métricas
- Performance
- Erros
- Uso de memória
- Requisições

### Logs
- Sistema
- Auditoria
- Erros
- Performance

## Desenvolvimento

### Ambiente
```bash
# Instalação
npm install

# Desenvolvimento
npm run dev

# Build
npm run build

# Testes
npm run test
```

### Convenções
- ESLint
- Prettier
- Git Flow
- Conventional Commits

### Testes
- Unitários: Jest
- E2E: Cypress
- Performance: Lighthouse

## Deploy

### Firebase
```bash
# Build
npm run build

# Deploy
firebase deploy
```

### Configuração
```javascript
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Manutenção

### Logs
- Firebase Console
- Cloud Functions
- Error Reporting

### Monitoramento
- Performance
- Erros
- Uso
- Segurança

### Backup
- Automático
- Manual
- Restauração

### Atualizações
- Versões
- Changelog
- Rollback
- Hotfix 