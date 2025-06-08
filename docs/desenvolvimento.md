# Desenvolvimento - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Ambiente](#ambiente)
3. [Padrões](#padrões)
4. [Testes](#testes)
5. [Versionamento](#versionamento)
6. [Deploy](#deploy)

## Visão Geral

Este documento descreve os padrões e práticas de desenvolvimento implementados no Sistema de Gestão para Gráficas.

## Ambiente

### 1. Requisitos

```bash
# Versões necessárias
node >= 16.x
npm >= 8.x
firebase-tools >= 11.x
```

### 2. Configuração

```bash
# Instalação de dependências
npm install

# Configuração do ambiente
cp .env.example .env

# Inicialização do Firebase
firebase init
```

### 3. Scripts

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src/**/*.{js,jsx}",
    "format": "prettier --write src/**/*.{js,jsx,css,scss}",
    "deploy": "firebase deploy"
  }
}
```

## Padrões

### 1. Estrutura de Arquivos

```
src/
  ├── components/     # Componentes reutilizáveis
  ├── pages/         # Páginas da aplicação
  ├── services/      # Serviços e APIs
  ├── hooks/         # Custom hooks
  ├── utils/         # Funções utilitárias
  ├── contexts/      # Contextos React
  ├── styles/        # Estilos globais
  └── assets/        # Recursos estáticos
```

### 2. Nomenclatura

```javascript
// Arquivos
ComponentName.jsx
componentName.test.js
componentName.styles.js

// Componentes
function ComponentName() {
  return <div>Component</div>;
}

// Funções
function functionName() {
  // ...
}

// Variáveis
const variableName = 'value';

// Constantes
const CONSTANT_NAME = 'value';
```

### 3. Imports

```javascript
// React e hooks
import React, { useState, useEffect } from 'react';

// Componentes
import { Button, Input } from '../components';

// Estilos
import { Container, Title } from './styles';

// Utilitários
import { formatDate, calculateTotal } from '../../utils';

// Serviços
import { api } from '../../services';
```

## Testes

### 1. Unitários

```javascript
// Componente
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    userEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### 2. Integração

```javascript
// Página
import { render, screen, waitFor } from '@testing-library/react';
import { OrderList } from './OrderList';

describe('OrderList', () => {
  it('should load and display orders', async () => {
    render(<OrderList />);
    
    // Aguarda carregamento
    await waitFor(() => {
      expect(screen.getByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Verifica lista
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
```

### 3. E2E

```javascript
// Teste E2E
describe('Order Flow', () => {
  it('should create a new order', () => {
    // Login
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password');
    cy.get('[data-testid="submit"]').click();
    
    // Cria pedido
    cy.visit('/orders/new');
    cy.get('[data-testid="client"]').select('Client 1');
    cy.get('[data-testid="product"]').select('Product 1');
    cy.get('[data-testid="quantity"]').type('10');
    cy.get('[data-testid="submit"]').click();
    
    // Verifica sucesso
    cy.url().should('include', '/orders');
    cy.get('[data-testid="success"]').should('be.visible');
  });
});
```

## Versionamento

### 1. Git Flow

```bash
# Branch principal
main

# Branch de desenvolvimento
develop

# Branches de feature
feature/order-management
feature/client-registration

# Branches de hotfix
hotfix/critical-bug

# Branches de release
release/v1.0.0
```

### 2. Commits

```bash
# Formato
type(scope): description

# Exemplos
feat(auth): add login with Google
fix(orders): correct total calculation
docs(readme): update installation steps
style(components): format button styles
refactor(api): improve error handling
test(orders): add integration tests
chore(deps): update dependencies
```

### 3. Pull Requests

```markdown
# Título
feat: add order management

# Descrição
## Mudanças
- Adiciona formulário de pedidos
- Implementa validação de dados
- Adiciona testes unitários

## Testes
- [x] Unitários
- [x] Integração
- [x] E2E

## Screenshots
[Adicionar screenshots se aplicável]

## Checklist
- [x] Código formatado
- [x] Testes passando
- [x] Documentação atualizada
- [x] Sem conflitos
```

## Deploy

### 1. Ambiente de Desenvolvimento

```bash
# Inicia servidor de desenvolvimento
npm start

# Acessa em
http://localhost:3000
```

### 2. Ambiente de Staging

```bash
# Build para staging
npm run build:staging

# Deploy para staging
firebase deploy --only hosting:staging
```

### 3. Ambiente de Produção

```bash
# Build para produção
npm run build

# Deploy para produção
firebase deploy
```

## Recomendações

### 1. Código
- Siga os padrões definidos
- Mantenha código limpo
- Documente funções complexas
- Use TypeScript quando possível

### 2. Testes
- Escreva testes unitários
- Cubra casos de erro
- Mantenha testes atualizados
- Use mocks apropriadamente

### 3. Performance
- Otimize imports
- Use lazy loading
- Implemente caching
- Monitore bundle size 