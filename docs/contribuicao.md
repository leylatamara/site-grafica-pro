# Contribuição - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Como Contribuir](#como-contribuir)
3. [Padrões](#padrões)
4. [Workflow](#workflow)
5. [Documentação](#documentação)
6. [Testes](#testes)

## Visão Geral

Este documento descreve as diretrizes e padrões para contribuição no Sistema de Gestão para Gráficas.

## Como Contribuir

### 1. Configuração do Ambiente

```bash
# Clone o repositório
git clone https://github.com/empresa/sistema-graficas.git

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm start
```

### 2. Processo de Contribuição

```markdown
## Passos para Contribuir

1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Execute os testes
5. Faça commit das alterações
6. Envie um Pull Request
```

### 3. Código de Conduta

```markdown
## Código de Conduta

- Seja respeitoso
- Mantenha o foco no problema
- Colabore com a comunidade
- Mantenha comunicação profissional
```

## Padrões

### 1. Padrões de Código

```javascript
// JavaScript/TypeScript
const codeStandards = {
  // Variáveis
  variables: {
    useConst: true,
    useLet: true,
    avoidVar: true
  },
  
  // Funções
  functions: {
    useArrow: true,
    useAsync: true,
    useAwait: true
  },
  
  // Strings
  strings: {
    useTemplate: true,
    useSingleQuote: true
  },
  
  // Objetos
  objects: {
    useShorthand: true,
    useSpread: true
  }
};

// Exemplo de código
const formatUser = async (user) => {
  const { name, email, role } = user;
  
  return {
    name,
    email,
    role,
    fullName: `${name} (${role})`
  };
};
```

### 2. Nomenclatura

```javascript
// Convenções de nomenclatura
const namingConventions = {
  // Variáveis
  variables: {
    camelCase: true,
    descriptive: true,
    avoidAbbreviations: true
  },
  
  // Funções
  functions: {
    camelCase: true,
    verbFirst: true,
    descriptive: true
  },
  
  // Classes
  classes: {
    PascalCase: true,
    nounFirst: true,
    descriptive: true
  },
  
  // Interfaces
  interfaces: {
    PascalCase: true,
    prefixI: true,
    descriptive: true
  },
  
  // Enums
  enums: {
    PascalCase: true,
    descriptive: true
  }
};

// Exemplos
const userCount = 0;
function calculateTotal() {}
class UserService {}
interface IUserData {}
enum UserRole {}
```

### 3. Estrutura de Arquivos

```javascript
// Estrutura de diretórios
const directoryStructure = {
  // Componentes
  components: {
    path: 'src/components',
    structure: {
      common: 'Componentes comuns',
      layout: 'Componentes de layout',
      features: 'Componentes específicos'
    }
  },
  
  // Páginas
  pages: {
    path: 'src/pages',
    structure: {
      auth: 'Páginas de autenticação',
      dashboard: 'Páginas do dashboard',
      settings: 'Páginas de configuração'
    }
  },
  
  // Serviços
  services: {
    path: 'src/services',
    structure: {
      api: 'Serviços de API',
      auth: 'Serviços de autenticação',
      storage: 'Serviços de armazenamento'
    }
  }
};
```

## Workflow

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

## Documentação

### 1. Código

```javascript
// Documentação de funções
/**
 * Calcula o total do pedido
 * @param {Order} order - Objeto do pedido
 * @param {boolean} [includeTax=true] - Incluir impostos
 * @returns {number} Total do pedido
 */
function calculateOrderTotal(order, includeTax = true) {
  // Implementação
}

// Documentação de classes
/**
 * Serviço de gerenciamento de pedidos
 */
class OrderService {
  /**
   * Cria um novo pedido
   * @param {OrderData} data - Dados do pedido
   * @returns {Promise<Order>} Pedido criado
   */
  async createOrder(data) {
    // Implementação
  }
}
```

### 2. README

```markdown
# Nome do Projeto

## Descrição
Breve descrição do projeto

## Instalação
```bash
npm install
```

## Uso
```bash
npm start
```

## Contribuição
Veja [CONTRIBUTING.md](CONTRIBUTING.md)

## Licença
MIT
```

### 3. Changelog

```markdown
# Changelog

## [1.0.0] - 2024-01-01
### Adicionado
- Feature 1
- Feature 2

### Corrigido
- Bug 1
- Bug 2

### Alterado
- Change 1
- Change 2
```

## Testes

### 1. Unitários

```javascript
// Teste de componente
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
// Teste de integração
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

### 3. Documentação
- Mantenha README atualizado
- Documente mudanças
- Use comentários claros
- Atualize changelog 