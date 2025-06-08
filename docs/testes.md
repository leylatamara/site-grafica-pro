# Testes - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Unitários](#unitários)
3. [Integração](#integração)
4. [E2E](#e2e)
5. [Performance](#performance)
6. [Segurança](#segurança)

## Visão Geral

O Sistema de Gestão para Gráficas utiliza diferentes tipos de testes para garantir qualidade e confiabilidade.

## Unitários

### 1. Configuração

```javascript
// jest.config.js
module.exports = {
  // Ambiente
  testEnvironment: 'jsdom',
  
  // Cobertura
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Mocks
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
```

### 2. Componentes

```javascript
// Button.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  // Renderização
  it('should render correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  // Eventos
  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    userEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });
  
  // Estados
  it('should be disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
  
  // Estilos
  it('should apply variant styles', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('primary');
  });
});
```

### 3. Serviços

```javascript
// OrderService.test.js
import { OrderService } from './OrderService';
import { mockFirebase } from '../__mocks__/firebase';

describe('OrderService', () => {
  // Setup
  beforeEach(() => {
    mockFirebase();
  });
  
  // Criação
  it('should create order', async () => {
    const order = {
      client: '123',
      products: [
        { id: '456', quantity: 2 }
      ]
    };
    
    const result = await OrderService.create(order);
    expect(result.id).toBeDefined();
    expect(result.status).toBe('pending');
  });
  
  // Atualização
  it('should update order', async () => {
    const order = {
      id: '123',
      status: 'completed'
    };
    
    const result = await OrderService.update(order);
    expect(result.status).toBe('completed');
  });
  
  // Exclusão
  it('should delete order', async () => {
    const result = await OrderService.delete('123');
    expect(result).toBe(true);
  });
});
```

## Integração

### 1. Configuração

```javascript
// cypress.config.js
module.exports = {
  // Configuração
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'
  },
  
  // Viewport
  viewportWidth: 1280,
  viewportHeight: 720,
  
  // Vídeo
  video: true,
  videoCompression: 32,
  
  // Screenshots
  screenshotOnRunFailure: true
};
```

### 2. Fluxos

```javascript
// orders.cy.js
describe('Orders Flow', () => {
  // Setup
  beforeEach(() => {
    cy.login('admin@empresa.com', 'senha123');
  });
  
  // Criação
  it('should create order', () => {
    // Acessa página
    cy.visit('/orders/new');
    
    // Preenche formulário
    cy.get('[data-testid="client"]').select('Cliente 1');
    cy.get('[data-testid="product"]').select('Produto 1');
    cy.get('[data-testid="quantity"]').type('10');
    cy.get('[data-testid="submit"]').click();
    
    // Verifica sucesso
    cy.url().should('include', '/orders');
    cy.get('[data-testid="success"]').should('be.visible');
  });
  
  // Edição
  it('should edit order', () => {
    // Acessa pedido
    cy.visit('/orders/123');
    
    // Edita dados
    cy.get('[data-testid="status"]').select('completed');
    cy.get('[data-testid="submit"]').click();
    
    // Verifica sucesso
    cy.get('[data-testid="success"]').should('be.visible');
  });
  
  // Exclusão
  it('should delete order', () => {
    // Acessa pedido
    cy.visit('/orders/123');
    
    // Exclui
    cy.get('[data-testid="delete"]').click();
    cy.get('[data-testid="confirm"]').click();
    
    // Verifica sucesso
    cy.url().should('include', '/orders');
    cy.get('[data-testid="success"]').should('be.visible');
  });
});
```

### 3. API

```javascript
// api.cy.js
describe('API Integration', () => {
  // Setup
  beforeEach(() => {
    cy.intercept('POST', '/api/orders', {
      statusCode: 201,
      body: {
        id: '123',
        status: 'pending'
      }
    }).as('createOrder');
  });
  
  // Criação
  it('should create order via API', () => {
    cy.request({
      method: 'POST',
      url: '/api/orders',
      body: {
        client: '456',
        products: [
          { id: '789', quantity: 2 }
        ]
      }
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.id).to.exist;
    });
  });
  
  // Atualização
  it('should update order via API', () => {
    cy.request({
      method: 'PUT',
      url: '/api/orders/123',
      body: {
        status: 'completed'
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.status).to.eq('completed');
    });
  });
});
```

## E2E

### 1. Configuração

```javascript
// playwright.config.js
module.exports = {
  // Configuração
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure'
  },
  
  // Projetos
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium' }
    },
    {
      name: 'Firefox',
      use: { browserName: 'firefox' }
    },
    {
      name: 'Safari',
      use: { browserName: 'webkit' }
    }
  ]
};
```

### 2. Fluxos

```javascript
// orders.spec.js
describe('Orders E2E', () => {
  // Setup
  beforeAll(async () => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@empresa.com');
    await page.fill('[data-testid="password"]', 'senha123');
    await page.click('[data-testid="submit"]');
  });
  
  // Criação
  it('should create order', async () => {
    // Acessa página
    await page.goto('/orders/new');
    
    // Preenche formulário
    await page.selectOption('[data-testid="client"]', 'Cliente 1');
    await page.selectOption('[data-testid="product"]', 'Produto 1');
    await page.fill('[data-testid="quantity"]', '10');
    await page.click('[data-testid="submit"]');
    
    // Verifica sucesso
    await expect(page).toHaveURL(/.*orders/);
    await expect(page.locator('[data-testid="success"]')).toBeVisible();
  });
  
  // Edição
  it('should edit order', async () => {
    // Acessa pedido
    await page.goto('/orders/123');
    
    // Edita dados
    await page.selectOption('[data-testid="status"]', 'completed');
    await page.click('[data-testid="submit"]');
    
    // Verifica sucesso
    await expect(page.locator('[data-testid="success"]')).toBeVisible();
  });
});
```

### 3. Performance

```javascript
// performance.spec.js
describe('Performance E2E', () => {
  // Setup
  beforeAll(async () => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@empresa.com');
    await page.fill('[data-testid="password"]', 'senha123');
    await page.click('[data-testid="submit"]');
  });
  
  // Carregamento
  it('should load dashboard quickly', async () => {
    // Inicia medição
    const start = Date.now();
    
    // Acessa dashboard
    await page.goto('/dashboard');
    
    // Verifica tempo
    const end = Date.now();
    expect(end - start).toBeLessThan(3000);
  });
  
  // Interação
  it('should respond quickly to actions', async () => {
    // Acessa página
    await page.goto('/orders');
    
    // Mede tempo de resposta
    const start = Date.now();
    await page.click('[data-testid="new"]');
    const end = Date.now();
    
    expect(end - start).toBeLessThan(1000);
  });
});
```

## Performance

### 1. Lighthouse

```javascript
// lighthouse.config.js
module.exports = {
  // Configuração
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }]
      }
    }
  }
};
```

### 2. Web Vitals

```javascript
// web-vitals.js
import { getCLS, getFID, getLCP } from 'web-vitals';

// Coleta métricas
function collectMetrics() {
  getCLS(console.log);
  getFID(console.log);
  getLCP(console.log);
}

// Envia métricas
function sendMetrics(metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating
  };
  
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}
```

### 3. Profiling

```javascript
// profiling.js
import { Profiler } from 'react';

// Componente com profiling
function ProfiledComponent({ id, children }) {
  function onRender(
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) {
    console.log({
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    });
  }
  
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
```

## Segurança

### 1. OWASP

```javascript
// security.test.js
describe('Security Tests', () => {
  // XSS
  it('should prevent XSS attacks', async () => {
    const script = '<script>alert("xss")</script>';
    
    await page.goto('/orders/new');
    await page.fill('[data-testid="notes"]', script);
    await page.click('[data-testid="submit"]');
    
    const content = await page.textContent('[data-testid="notes"]');
    expect(content).not.toContain('<script>');
  });
  
  // CSRF
  it('should prevent CSRF attacks', async () => {
    const response = await page.request.post('/api/orders', {
      headers: {
        'X-CSRF-Token': 'invalid'
      }
    });
    
    expect(response.status()).toBe(403);
  });
  
  // SQL Injection
  it('should prevent SQL injection', async () => {
    const query = "'; DROP TABLE users; --";
    
    await page.goto('/clients');
    await page.fill('[data-testid="search"]', query);
    await page.click('[data-testid="submit"]');
    
    const content = await page.textContent('[data-testid="search"]');
    expect(content).not.toContain("'; DROP TABLE users; --");
  });
});
```

### 2. Autenticação

```javascript
// auth.test.js
describe('Authentication Tests', () => {
  // Login
  it('should require valid credentials', async () => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'invalid@email.com');
    await page.fill('[data-testid="password"]', 'wrong');
    await page.click('[data-testid="submit"]');
    
    await expect(page.locator('[data-testid="error"]')).toBeVisible();
  });
  
  // Sessão
  it('should expire session', async () => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@empresa.com');
    await page.fill('[data-testid="password"]', 'senha123');
    await page.click('[data-testid="submit"]');
    
    // Espera expiração
    await page.waitForTimeout(3600000);
    
    // Tenta acesso
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });
});
```

### 3. Autorização

```javascript
// authorization.test.js
describe('Authorization Tests', () => {
  // Acesso
  it('should restrict access based on role', async () => {
    // Login como usuário
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@empresa.com');
    await page.fill('[data-testid="password"]', 'senha123');
    await page.click('[data-testid="submit"]');
    
    // Tenta acessar admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*dashboard/);
  });
  
  // Permissões
  it('should check permissions', async () => {
    // Login como usuário
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@empresa.com');
    await page.fill('[data-testid="password"]', 'senha123');
    await page.click('[data-testid="submit"]');
    
    // Tenta excluir
    await page.goto('/orders/123');
    await expect(page.locator('[data-testid="delete"]')).not.toBeVisible();
  });
});
```

## Recomendações

### 1. Cobertura
- Mantenha cobertura alta
- Teste casos de erro
- Teste edge cases
- Monitore métricas

### 2. Performance
- Teste em diferentes dispositivos
- Monitore Web Vitals
- Otimize carregamento
- Reduza bundle size

### 3. Segurança
- Siga OWASP
- Teste autenticação
- Verifique autorização
- Monitore vulnerabilidades 