# Banco de Dados - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Estrutura](#estrutura)
3. [Regras](#regras)
4. [Índices](#índices)
5. [Backup](#backup)
6. [Segurança](#segurança)

## Visão Geral

O Sistema de Gestão para Gráficas utiliza o Firebase Firestore como banco de dados principal, oferecendo escalabilidade, performance e segurança.

## Estrutura

### 1. Coleções

```javascript
// Estrutura de coleções
const collections = {
  // Usuários
  users: {
    path: 'users',
    fields: {
      id: 'string',
      name: 'string',
      email: 'string',
      role: 'string',
      createdAt: 'timestamp'
    }
  },
  
  // Clientes
  clients: {
    path: 'clients',
    fields: {
      id: 'string',
      name: 'string',
      email: 'string',
      phone: 'string',
      address: 'string',
      category: 'string',
      createdAt: 'timestamp'
    }
  },
  
  // Produtos
  products: {
    path: 'products',
    fields: {
      id: 'string',
      name: 'string',
      description: 'string',
      price: 'number',
      stock: 'number',
      category: 'string',
      createdAt: 'timestamp'
    }
  },
  
  // Pedidos
  orders: {
    path: 'orders',
    fields: {
      id: 'string',
      client: 'reference',
      products: 'array',
      total: 'number',
      status: 'string',
      notes: 'string',
      createdAt: 'timestamp'
    }
  }
};
```

### 2. Relacionamentos

```javascript
// Exemplo de relacionamentos
const relationships = {
  // Pedido -> Cliente
  orderToClient: {
    type: 'reference',
    from: 'orders',
    to: 'clients',
    field: 'client'
  },
  
  // Pedido -> Produtos
  orderToProducts: {
    type: 'array',
    from: 'orders',
    to: 'products',
    field: 'products'
  }
};
```

### 3. Tipos de Dados

```javascript
// Tipos de dados suportados
const dataTypes = {
  // Primitivos
  string: 'Texto',
  number: 'Número',
  boolean: 'Booleano',
  timestamp: 'Data/Hora',
  
  // Complexos
  array: 'Lista',
  map: 'Objeto',
  reference: 'Referência',
  geopoint: 'Localização'
};
```

## Regras

### 1. Validação

```javascript
// Regras de validação
const validationRules = {
  // Usuários
  users: {
    name: {
      required: true,
      type: 'string',
      minLength: 3
    },
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    role: {
      required: true,
      type: 'string',
      enum: ['admin', 'user']
    }
  },
  
  // Clientes
  clients: {
    name: {
      required: true,
      type: 'string',
      minLength: 3
    },
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
      required: true,
      type: 'string',
      pattern: /^\d{10,11}$/
    }
  },
  
  // Produtos
  products: {
    name: {
      required: true,
      type: 'string',
      minLength: 3
    },
    price: {
      required: true,
      type: 'number',
      min: 0
    },
    stock: {
      required: true,
      type: 'number',
      min: 0
    }
  },
  
  // Pedidos
  orders: {
    client: {
      required: true,
      type: 'reference'
    },
    products: {
      required: true,
      type: 'array',
      minLength: 1
    },
    total: {
      required: true,
      type: 'number',
      min: 0
    }
  }
};
```

### 2. Segurança

```javascript
// Regras de segurança
const securityRules = {
  // Usuários
  users: {
    read: 'auth != null',
    write: 'auth != null && auth.token.role == "admin"'
  },
  
  // Clientes
  clients: {
    read: 'auth != null',
    write: 'auth != null'
  },
  
  // Produtos
  products: {
    read: 'auth != null',
    write: 'auth != null && auth.token.role == "admin"'
  },
  
  // Pedidos
  orders: {
    read: 'auth != null',
    write: 'auth != null',
    delete: 'auth != null && auth.token.role == "admin"'
  }
};
```

### 3. Triggers

```javascript
// Triggers do banco de dados
const triggers = {
  // Atualização de estoque
  updateStock: {
    on: 'orders',
    when: 'create',
    action: async (order) => {
      for (const product of order.products) {
        await updateProductStock(product.id, -product.quantity);
      }
    }
  },
  
  // Notificação de pedido
  notifyOrder: {
    on: 'orders',
    when: 'create',
    action: async (order) => {
      await sendOrderNotification(order);
    }
  },
  
  // Atualização de métricas
  updateMetrics: {
    on: 'orders',
    when: 'create',
    action: async (order) => {
      await updateSalesMetrics(order);
    }
  }
};
```

## Índices

### 1. Índices Simples

```javascript
// Índices simples
const simpleIndexes = {
  // Clientes
  clients: {
    name: 'ascending',
    email: 'ascending',
    category: 'ascending'
  },
  
  // Produtos
  products: {
    name: 'ascending',
    category: 'ascending',
    price: 'ascending'
  },
  
  // Pedidos
  orders: {
    status: 'ascending',
    createdAt: 'descending'
  }
};
```

### 2. Índices Compostos

```javascript
// Índices compostos
const compoundIndexes = {
  // Clientes
  clients: {
    category_name: ['category', 'name'],
    category_createdAt: ['category', 'createdAt']
  },
  
  // Produtos
  products: {
    category_price: ['category', 'price'],
    category_stock: ['category', 'stock']
  },
  
  // Pedidos
  orders: {
    status_createdAt: ['status', 'createdAt'],
    client_createdAt: ['client', 'createdAt']
  }
};
```

### 3. Índices de Texto

```javascript
// Índices de texto
const textIndexes = {
  // Clientes
  clients: {
    name: 'text',
    email: 'text'
  },
  
  // Produtos
  products: {
    name: 'text',
    description: 'text'
  }
};
```

## Backup

### 1. Backup Automático

```javascript
// Configuração de backup
const backupConfig = {
  // Frequência
  frequency: 'daily',
  time: '00:00',
  
  // Retenção
  retention: {
    daily: 7,
    weekly: 4,
    monthly: 12
  },
  
  // Localização
  location: 'gs://backups',
  
  // Compressão
  compression: true
};
```

### 2. Backup Manual

```javascript
// Função de backup manual
const manualBackup = async () => {
  // Coleta dados
  const data = await collectData();
  
  // Gera arquivo
  const file = await generateBackupFile(data);
  
  // Faz upload
  await uploadBackup(file);
  
  // Notifica
  await notifyBackupComplete();
};
```

### 3. Restauração

```javascript
// Função de restauração
const restoreBackup = async (backupId) => {
  // Download
  const file = await downloadBackup(backupId);
  
  // Valida
  await validateBackup(file);
  
  // Restaura
  await restoreData(file);
  
  // Notifica
  await notifyRestoreComplete();
};
```

## Segurança

### 1. Criptografia

```javascript
// Configuração de criptografia
const encryptionConfig = {
  // Algoritmo
  algorithm: 'AES-256-GCM',
  
  // Chaves
  keys: {
    primary: process.env.ENCRYPTION_KEY,
    backup: process.env.BACKUP_KEY
  },
  
  // Campos
  fields: [
    'clients.email',
    'clients.phone',
    'orders.notes'
  ]
};
```

### 2. Auditoria

```javascript
// Configuração de auditoria
const auditConfig = {
  // Eventos
  events: [
    'create',
    'update',
    'delete'
  ],
  
  // Campos
  fields: [
    'user',
    'timestamp',
    'action',
    'collection',
    'document',
    'changes'
  ],
  
  // Retenção
  retention: '1 year'
};
```

### 3. Monitoramento

```javascript
// Configuração de monitoramento
const monitoringConfig = {
  // Métricas
  metrics: {
    reads: true,
    writes: true,
    deletes: true,
    errors: true
  },
  
  // Alertas
  alerts: {
    highLatency: true,
    errorRate: true,
    quotaExceeded: true
  },
  
  // Logs
  logs: {
    queries: true,
    errors: true,
    security: true
  }
};
```

## Recomendações

### 1. Performance
- Use índices apropriados
- Evite consultas complexas
- Implemente paginação
- Monitore uso

### 2. Segurança
- Configure regras
- Criptografe dados sensíveis
- Mantenha backups
- Monitore acesso

### 3. Manutenção
- Limpe dados antigos
- Atualize índices
- Verifique integridade
- Teste restauração 