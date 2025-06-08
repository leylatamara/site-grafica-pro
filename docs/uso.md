# Uso - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Dashboard](#dashboard)
4. [Pedidos](#pedidos)
5. [Clientes](#clientes)
6. [Produtos](#produtos)
7. [Relatórios](#relatórios)

## Visão Geral

O Sistema de Gestão para Gráficas é uma plataforma completa para gerenciamento de gráficas, incluindo pedidos, clientes, produtos e relatórios.

## Autenticação

### 1. Login

```javascript
// Exemplo de login
const login = async (email, password) => {
  try {
    const user = await auth.signInWithEmailAndPassword(email, password);
    return user;
  } catch (error) {
    throw error;
  }
};
```

### 2. Recuperação de Senha

```javascript
// Exemplo de recuperação
const resetPassword = async (email) => {
  try {
    await auth.sendPasswordResetEmail(email);
    return true;
  } catch (error) {
    throw error;
  }
};
```

### 3. Perfil

```javascript
// Exemplo de atualização
const updateProfile = async (data) => {
  try {
    const user = auth.currentUser;
    await user.updateProfile(data);
    return user;
  } catch (error) {
    throw error;
  }
};
```

## Dashboard

### 1. Visão Geral

```javascript
// Exemplo de métricas
const getMetrics = async () => {
  const metrics = {
    orders: await getOrderCount(),
    revenue: await getTotalRevenue(),
    clients: await getClientCount(),
    products: await getProductCount()
  };
  return metrics;
};
```

### 2. Gráficos

```javascript
// Exemplo de dados para gráficos
const getChartData = async () => {
  const data = {
    revenue: await getRevenueByMonth(),
    orders: await getOrdersByStatus(),
    products: await getTopProducts()
  };
  return data;
};
```

### 3. Alertas

```javascript
// Exemplo de alertas
const getAlerts = async () => {
  const alerts = {
    pending: await getPendingOrders(),
    overdue: await getOverduePayments(),
    lowStock: await getLowStockProducts()
  };
  return alerts;
};
```

## Pedidos

### 1. Criação

```javascript
// Exemplo de criação
const createOrder = async (data) => {
  try {
    const order = {
      client: data.client,
      products: data.products,
      total: calculateTotal(data.products),
      status: 'pending',
      createdAt: new Date()
    };
    
    const doc = await db.collection('orders').add(order);
    return doc.id;
  } catch (error) {
    throw error;
  }
};
```

### 2. Edição

```javascript
// Exemplo de edição
const updateOrder = async (id, data) => {
  try {
    const order = {
      ...data,
      updatedAt: new Date()
    };
    
    await db.collection('orders').doc(id).update(order);
    return true;
  } catch (error) {
    throw error;
  }
};
```

### 3. Acompanhamento

```javascript
// Exemplo de acompanhamento
const trackOrder = async (id) => {
  try {
    const order = await db.collection('orders').doc(id).get();
    const history = await getOrderHistory(id);
    
    return {
      order: order.data(),
      history
    };
  } catch (error) {
    throw error;
  }
};
```

## Clientes

### 1. Cadastro

```javascript
// Exemplo de cadastro
const createClient = async (data) => {
  try {
    const client = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      createdAt: new Date()
    };
    
    const doc = await db.collection('clients').add(client);
    return doc.id;
  } catch (error) {
    throw error;
  }
};
```

### 2. Consulta

```javascript
// Exemplo de consulta
const searchClients = async (query) => {
  try {
    const snapshot = await db.collection('clients')
      .where('name', '>=', query)
      .where('name', '<=', query + '\uf8ff')
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};
```

### 3. Histórico

```javascript
// Exemplo de histórico
const getClientHistory = async (id) => {
  try {
    const orders = await db.collection('orders')
      .where('client', '==', id)
      .orderBy('createdAt', 'desc')
      .get();
      
    return orders.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};
```

## Produtos

### 1. Cadastro

```javascript
// Exemplo de cadastro
const createProduct = async (data) => {
  try {
    const product = {
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      category: data.category,
      createdAt: new Date()
    };
    
    const doc = await db.collection('products').add(product);
    return doc.id;
  } catch (error) {
    throw error;
  }
};
```

### 2. Estoque

```javascript
// Exemplo de controle de estoque
const updateStock = async (id, quantity) => {
  try {
    const product = await db.collection('products').doc(id).get();
    const currentStock = product.data().stock;
    
    await db.collection('products').doc(id).update({
      stock: currentStock + quantity,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};
```

### 3. Categorias

```javascript
// Exemplo de categorias
const getCategories = async () => {
  try {
    const snapshot = await db.collection('categories').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};
```

## Relatórios

### 1. Vendas

```javascript
// Exemplo de relatório de vendas
const getSalesReport = async (startDate, endDate) => {
  try {
    const snapshot = await db.collection('orders')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();
      
    const orders = snapshot.docs.map(doc => doc.data());
    
    return {
      total: orders.reduce((sum, order) => sum + order.total, 0),
      count: orders.length,
      average: orders.reduce((sum, order) => sum + order.total, 0) / orders.length
    };
  } catch (error) {
    throw error;
  }
};
```

### 2. Clientes

```javascript
// Exemplo de relatório de clientes
const getClientsReport = async () => {
  try {
    const snapshot = await db.collection('clients').get();
    const clients = snapshot.docs.map(doc => doc.data());
    
    return {
      total: clients.length,
      byCategory: groupByCategory(clients),
      topSpenders: getTopSpenders(clients)
    };
  } catch (error) {
    throw error;
  }
};
```

### 3. Produtos

```javascript
// Exemplo de relatório de produtos
const getProductsReport = async () => {
  try {
    const snapshot = await db.collection('products').get();
    const products = snapshot.docs.map(doc => doc.data());
    
    return {
      total: products.length,
      byCategory: groupByCategory(products),
      topSellers: getTopSellers(products)
    };
  } catch (error) {
    throw error;
  }
};
```

## Recomendações

### 1. Boas Práticas
- Mantenha dados atualizados
- Faça backup regular
- Monitore métricas
- Use relatórios

### 2. Segurança
- Troque senha regularmente
- Não compartilhe acesso
- Faça logout ao sair
- Monitore atividades

### 3. Suporte
- Consulte a documentação
- Entre em contato com suporte
- Reporte problemas
- Sugira melhorias 