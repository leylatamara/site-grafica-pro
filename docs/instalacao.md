# Instalação - Sistema de Gestão para Gráficas

## Índice
1. [Requisitos](#requisitos)
2. [Instalação](#instalação)
3. [Configuração](#configuração)
4. [Ambientes](#ambientes)
5. [Troubleshooting](#troubleshooting)

## Requisitos

### 1. Sistema

```markdown
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git >= 2.0.0
- Firebase CLI >= 12.0.0
```

### 2. Dependências

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "firebase": "^10.0.0",
    "material-ui": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "cypress": "^13.0.0"
  }
}
```

### 3. Configurações

```markdown
- Conta Firebase
- Projeto Firebase
- Chaves de API
- Variáveis de ambiente
```

## Instalação

### 1. Clone do Repositório

```bash
# Clone o repositório
git clone https://github.com/empresa/sistema-graficas.git

# Entre no diretório
cd sistema-graficas
```

### 2. Instalação de Dependências

```bash
# Instale as dependências
npm install

# Instale as dependências de desenvolvimento
npm install --save-dev
```

### 3. Configuração do Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure as variáveis
nano .env
```

### 4. Inicialização do Firebase

```bash
# Login no Firebase
firebase login

# Inicialize o projeto
firebase init

# Selecione os serviços
- Hosting
- Functions
- Firestore
- Storage
```

## Configuração

### 1. Variáveis de Ambiente

```env
# Firebase
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id

# API
API_URL=http://localhost:3000
API_VERSION=v1

# Configurações
NODE_ENV=development
PORT=3000
```

### 2. Firebase

```javascript
// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Inicialização
firebase.initializeApp(firebaseConfig);
```

### 3. Banco de Dados

```javascript
// Configuração do Firestore
const db = firebase.firestore();

// Configuração do Storage
const storage = firebase.storage();

// Configuração do Auth
const auth = firebase.auth();
```

## Ambientes

### 1. Desenvolvimento

```bash
# Inicie o servidor de desenvolvimento
npm run dev

# Acesse o sistema
http://localhost:3000
```

### 2. Staging

```bash
# Build para staging
npm run build:staging

# Deploy para staging
npm run deploy:staging

# Acesse o sistema
https://staging.sistema-graficas.com
```

### 3. Produção

```bash
# Build para produção
npm run build:prod

# Deploy para produção
npm run deploy:prod

# Acesse o sistema
https://sistema-graficas.com
```

## Troubleshooting

### 1. Problemas Comuns

```markdown
## Erro de Dependências
- Delete node_modules
- Delete package-lock.json
- npm install

## Erro de Firebase
- Verifique as credenciais
- Verifique as permissões
- Verifique a configuração

## Erro de Build
- Verifique as variáveis
- Verifique os imports
- Verifique os tipos
```

### 2. Logs

```bash
# Logs do servidor
npm run logs

# Logs do Firebase
firebase functions:log

# Logs do deploy
firebase deploy --debug
```

### 3. Suporte

```markdown
## Canais de Suporte
- Email: suporte@empresa.com
- Discord: [link]
- Documentação: [link]

## Horário de Atendimento
- Segunda a Sexta: 9h às 18h
- Sábado: 9h às 13h
```

## Recomendações

### 1. Segurança
- Mantenha as chaves seguras
- Use variáveis de ambiente
- Configure CORS
- Habilite autenticação

### 2. Performance
- Use cache
- Otimize imagens
- Minifique assets
- Configure CDN

### 3. Manutenção
- Mantenha dependências atualizadas
- Faça backup regular
- Monitore logs
- Teste regularmente 