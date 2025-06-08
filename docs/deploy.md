# Deploy - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Ambientes](#ambientes)
3. [Configuração](#configuração)
4. [Processo](#processo)
5. [Monitoramento](#monitoramento)
6. [Rollback](#rollback)

## Visão Geral

O Sistema de Gestão para Gráficas utiliza o Firebase para deploy e hospedagem.

### Stack de Deploy

- **Frontend**: Firebase Hosting
- **Backend**: Cloud Functions
- **Banco de Dados**: Firestore
- **Storage**: Cloud Storage
- **CI/CD**: GitHub Actions

## Ambientes

### 1. Desenvolvimento

```bash
# Variáveis de Ambiente
REACT_APP_API_URL=https://dev-api.sistema-graficas.com
REACT_APP_FIREBASE_CONFIG={
  "apiKey": "dev-key",
  "authDomain": "dev-sistema-graficas.firebaseapp.com",
  "projectId": "dev-sistema-graficas",
  "storageBucket": "dev-sistema-graficas.appspot.com",
  "messagingSenderId": "dev-sender-id",
  "appId": "dev-app-id"
}

# Comandos
npm run dev
npm run build:dev
npm run deploy:dev
```

### 2. Staging

```bash
# Variáveis de Ambiente
REACT_APP_API_URL=https://staging-api.sistema-graficas.com
REACT_APP_FIREBASE_CONFIG={
  "apiKey": "staging-key",
  "authDomain": "staging-sistema-graficas.firebaseapp.com",
  "projectId": "staging-sistema-graficas",
  "storageBucket": "staging-sistema-graficas.appspot.com",
  "messagingSenderId": "staging-sender-id",
  "appId": "staging-app-id"
}

# Comandos
npm run build:staging
npm run deploy:staging
```

### 3. Produção

```bash
# Variáveis de Ambiente
REACT_APP_API_URL=https://api.sistema-graficas.com
REACT_APP_FIREBASE_CONFIG={
  "apiKey": "prod-key",
  "authDomain": "sistema-graficas.firebaseapp.com",
  "projectId": "sistema-graficas",
  "storageBucket": "sistema-graficas.appspot.com",
  "messagingSenderId": "prod-sender-id",
  "appId": "prod-app-id"
}

# Comandos
npm run build:prod
npm run deploy:prod
```

## Configuração

### 1. Firebase

```json
// firebase.json
{
  "hosting": {
    "public": "build",
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
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### 2. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches:
      - main
      - staging
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Run Tests
        run: npm test
        
      - name: Build
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
          REACT_APP_FIREBASE_CONFIG: ${{ secrets.REACT_APP_FIREBASE_CONFIG }}
          
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: ${{ github.ref }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
```

### 3. Scripts

```json
// package.json
{
  "scripts": {
    "dev": "react-scripts start",
    "build:dev": "env-cmd -f .env.development react-scripts build",
    "build:staging": "env-cmd -f .env.staging react-scripts build",
    "build:prod": "env-cmd -f .env.production react-scripts build",
    "deploy:dev": "firebase deploy --only hosting:dev",
    "deploy:staging": "firebase deploy --only hosting:staging",
    "deploy:prod": "firebase deploy --only hosting:prod",
    "deploy:functions": "firebase deploy --only functions",
    "deploy:rules": "firebase deploy --only firestore:rules,storage:rules"
  }
}
```

## Processo

### 1. Preparação

```bash
# 1. Atualizar dependências
npm update

# 2. Rodar testes
npm test

# 3. Linting
npm run lint

# 4. Build
npm run build
```

### 2. Deploy

```bash
# 1. Login no Firebase
firebase login

# 2. Inicializar projeto
firebase init

# 3. Deploy
firebase deploy
```

### 3. Verificação

```bash
# 1. Verificar status
firebase hosting:sites:list

# 2. Testar preview
firebase hosting:channel:deploy preview

# 3. Monitorar logs
firebase functions:log
```

## Monitoramento

### 1. Métricas

```javascript
// functions/monitoring/metrics.js
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const db = getFirestore();

export async function collectMetrics() {
  try {
    // Métricas de usuários
    const users = await getAuth().listUsers();
    const activeUsers = users.users.filter(user => user.disabled === false);
    
    // Métricas de pedidos
    const orders = await db.collection('orders').get();
    const completedOrders = orders.docs.filter(doc => 
      doc.data().status === 'completed'
    );
    
    // Métricas de produtos
    const products = await db.collection('products').get();
    const lowStock = products.docs.filter(doc => 
      doc.data().stock < 10
    );
    
    // Salvar métricas
    await db.collection('metrics').add({
      timestamp: new Date(),
      users: {
        total: users.users.length,
        active: activeUsers.length
      },
      orders: {
        total: orders.docs.length,
        completed: completedOrders.length
      },
      products: {
        total: products.docs.length,
        lowStock: lowStock.length
      }
    });
  } catch (error) {
    console.error('Erro ao coletar métricas:', error);
  }
}
```

### 2. Logs

```javascript
// functions/monitoring/logs.js
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function logError(error, context) {
  try {
    await db.collection('logs').add({
      type: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Erro ao salvar log:', err);
  }
}

export async function logPerformance(metric) {
  try {
    await db.collection('logs').add({
      type: 'performance',
      metric,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Erro ao salvar métrica:', error);
  }
}
```

### 3. Relatórios

```javascript
// functions/monitoring/reports.js
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function generateReport(startDate, endDate) {
  try {
    // Coletar dados
    const metrics = await db.collection('metrics')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();
      
    // Processar dados
    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      users: {
        total: 0,
        active: 0
      },
      orders: {
        total: 0,
        completed: 0
      },
      products: {
        total: 0,
        lowStock: 0
      }
    };
    
    metrics.docs.forEach(doc => {
      const data = doc.data();
      report.users.total += data.users.total;
      report.users.active += data.users.active;
      report.orders.total += data.orders.total;
      report.orders.completed += data.orders.completed;
      report.products.total += data.products.total;
      report.products.lowStock += data.products.lowStock;
    });
    
    // Salvar relatório
    await db.collection('reports').add({
      ...report,
      generatedAt: new Date()
    });
    
    return report;
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw error;
  }
}
```

## Rollback

### 1. Backup

```javascript
// functions/backup/backup.js
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const db = getFirestore();
const bucket = getStorage().bucket();

export async function createBackup() {
  try {
    // Backup do Firestore
    const collections = ['users', 'orders', 'products'];
    const backup = {};
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      backup[collection] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    // Salvar backup
    const filename = `backup-${Date.now()}.json`;
    const file = bucket.file(`backups/${filename}`);
    
    await file.save(JSON.stringify(backup, null, 2), {
      metadata: {
        contentType: 'application/json'
      }
    });
    
    return filename;
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    throw error;
  }
}
```

### 2. Restauração

```javascript
// functions/backup/restore.js
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const db = getFirestore();
const bucket = getStorage().bucket();

export async function restoreBackup(filename) {
  try {
    // Carregar backup
    const file = bucket.file(`backups/${filename}`);
    const [content] = await file.download();
    const backup = JSON.parse(content.toString());
    
    // Restaurar dados
    for (const [collection, documents] of Object.entries(backup)) {
      const batch = db.batch();
      
      for (const doc of documents) {
        const { id, ...data } = doc;
        const ref = db.collection(collection).doc(id);
        batch.set(ref, data);
      }
      
      await batch.commit();
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    throw error;
  }
}
```

## Recomendações

### 1. Segurança
- Use variáveis de ambiente
- Configure CORS
- Implemente rate limiting
- Monitore acessos

### 2. Performance
- Otimize builds
- Configure cache
- Use CDN
- Monitore métricas

### 3. Manutenção
- Mantenha logs
- Faça backups
- Atualize dependências
- Monitore erros 