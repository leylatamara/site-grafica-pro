# API - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Pedidos](#pedidos)
4. [Clientes](#clientes)
5. [Produtos](#produtos)
6. [Relatórios](#relatórios)

## Visão Geral

A API do Sistema de Gestão para Gráficas fornece endpoints para gerenciamento de pedidos, clientes, produtos e relatórios.

### Base URL

```
https://api.sistema-graficas.com/v1
```

### Headers

```http
Content-Type: application/json
Authorization: Bearer <token>
```

## Autenticação

### Login

```http
POST /auth/login

{
  "email": "usuario@empresa.com",
  "password": "senha123"
}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "name": "Usuário",
    "email": "usuario@empresa.com",
    "role": "admin"
  }
}
```

### Recuperação de Senha

```http
POST /auth/reset-password

{
  "email": "usuario@empresa.com"
}

Response 200:
{
  "message": "Email enviado com sucesso"
}
```

### Atualização de Perfil

```http
PUT /auth/profile

{
  "name": "Novo Nome",
  "phone": "11999999999"
}

Response 200:
{
  "id": "123",
  "name": "Novo Nome",
  "email": "usuario@empresa.com",
  "phone": "11999999999",
  "role": "admin"
}
```

## Pedidos

### Listar Pedidos

```http
GET /orders

Query Parameters:
- page: 1
- limit: 10
- status: pending
- startDate: 2024-01-01
- endDate: 2024-12-31

Response 200:
{
  "data": [
    {
      "id": "123",
      "client": {
        "id": "456",
        "name": "Cliente"
      },
      "products": [
        {
          "id": "789",
          "name": "Produto",
          "quantity": 2,
          "price": 100
        }
      ],
      "total": 200,
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### Criar Pedido

```http
POST /orders

{
  "client": "456",
  "products": [
    {
      "id": "789",
      "quantity": 2
    }
  ],
  "notes": "Observações"
}

Response 201:
{
  "id": "123",
  "client": {
    "id": "456",
    "name": "Cliente"
  },
  "products": [
    {
      "id": "789",
      "name": "Produto",
      "quantity": 2,
      "price": 100
    }
  ],
  "total": 200,
  "status": "pending",
  "notes": "Observações",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Atualizar Pedido

```http
PUT /orders/123

{
  "status": "completed",
  "notes": "Novas observações"
}

Response 200:
{
  "id": "123",
  "status": "completed",
  "notes": "Novas observações",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Excluir Pedido

```http
DELETE /orders/123

Response 204:
```

## Clientes

### Listar Clientes

```http
GET /clients

Query Parameters:
- page: 1
- limit: 10
- search: nome
- category: categoria

Response 200:
{
  "data": [
    {
      "id": "456",
      "name": "Cliente",
      "email": "cliente@email.com",
      "phone": "11999999999",
      "address": "Endereço",
      "category": "categoria",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### Criar Cliente

```http
POST /clients

{
  "name": "Cliente",
  "email": "cliente@email.com",
  "phone": "11999999999",
  "address": "Endereço",
  "category": "categoria"
}

Response 201:
{
  "id": "456",
  "name": "Cliente",
  "email": "cliente@email.com",
  "phone": "11999999999",
  "address": "Endereço",
  "category": "categoria",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Atualizar Cliente

```http
PUT /clients/456

{
  "phone": "11988888888",
  "address": "Novo Endereço"
}

Response 200:
{
  "id": "456",
  "phone": "11988888888",
  "address": "Novo Endereço",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Excluir Cliente

```http
DELETE /clients/456

Response 204:
```

## Produtos

### Listar Produtos

```http
GET /products

Query Parameters:
- page: 1
- limit: 10
- search: nome
- category: categoria
- minPrice: 100
- maxPrice: 1000

Response 200:
{
  "data": [
    {
      "id": "789",
      "name": "Produto",
      "description": "Descrição",
      "price": 100,
      "stock": 10,
      "category": "categoria",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### Criar Produto

```http
POST /products

{
  "name": "Produto",
  "description": "Descrição",
  "price": 100,
  "stock": 10,
  "category": "categoria"
}

Response 201:
{
  "id": "789",
  "name": "Produto",
  "description": "Descrição",
  "price": 100,
  "stock": 10,
  "category": "categoria",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Atualizar Produto

```http
PUT /products/789

{
  "price": 150,
  "stock": 20
}

Response 200:
{
  "id": "789",
  "price": 150,
  "stock": 20,
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Excluir Produto

```http
DELETE /products/789

Response 204:
```

## Relatórios

### Relatório de Vendas

```http
GET /reports/sales

Query Parameters:
- startDate: 2024-01-01
- endDate: 2024-12-31
- groupBy: day|week|month|year

Response 200:
{
  "total": 10000,
  "count": 100,
  "average": 100,
  "data": [
    {
      "date": "2024-01-01",
      "total": 1000,
      "count": 10
    }
  ]
}
```

### Relatório de Clientes

```http
GET /reports/clients

Query Parameters:
- startDate: 2024-01-01
- endDate: 2024-12-31
- category: categoria

Response 200:
{
  "total": 100,
  "byCategory": {
    "categoria1": 50,
    "categoria2": 50
  },
  "topSpenders": [
    {
      "id": "456",
      "name": "Cliente",
      "total": 5000
    }
  ]
}
```

### Relatório de Produtos

```http
GET /reports/products

Query Parameters:
- startDate: 2024-01-01
- endDate: 2024-12-31
- category: categoria

Response 200:
{
  "total": 100,
  "byCategory": {
    "categoria1": 50,
    "categoria2": 50
  },
  "topSellers": [
    {
      "id": "789",
      "name": "Produto",
      "quantity": 100,
      "total": 10000
    }
  ]
}
```

## Erros

### Códigos de Erro

```http
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

### Formato de Erro

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem de erro",
    "details": {
      "field": "Detalhes do erro"
    }
  }
}
```

## Limites

### Rate Limiting

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1514764800
```

### Paginação

```http
Link: <https://api.sistema-graficas.com/v1/resource?page=2>; rel="next",
      <https://api.sistema-graficas.com/v1/resource?page=5>; rel="last"
```

## Versões

### Versionamento

```http
GET /v1/resource
GET /v2/resource
```

### Depreciação

```http
Warning: 299 - "Deprecated API version. Please upgrade to v2"
```

## Segurança

### Autenticação

```http
Authorization: Bearer <token>
```

### CORS

```http
Access-Control-Allow-Origin: https://sistema-graficas.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

### SSL/TLS

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Recomendações

### 1. Boas Práticas
- Use HTTPS
- Implemente rate limiting
- Valide dados
- Trate erros

### 2. Performance
- Use cache
- Compressão
- Paginação
- Filtros

### 3. Segurança
- Autenticação
- Autorização
- Validação
- Sanitização 