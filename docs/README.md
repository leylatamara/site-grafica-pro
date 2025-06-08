# Sistema de Gestão para Gráficas

## Visão Geral
Sistema completo de gestão para gráficas, desenvolvido para otimizar processos de produção, controle de pedidos, gestão de clientes e recursos.

## Funcionalidades Principais

### 1. Gestão de Pedidos
- Criação e acompanhamento de pedidos
- Controle de status e etapas de produção
- Gestão de pagamentos e valores
- Anexo de imagens e referências
- Histórico completo de pedidos

### 2. Gestão de Clientes
- Cadastro completo de clientes
- Histórico de pedidos por cliente
- Controle de informações de contato
- Suporte a clientes finais e revendas

### 3. Gestão de Produtos
- Cadastro de produtos e materiais
- Precificação por unidade ou metro quadrado
- Controle de estoque
- Histórico de preços

### 4. Gestão de Funcionários
- Controle de acesso por perfil
- Registro de funcionários
- Gestão de permissões
- Acompanhamento de produtividade

### 5. Gestão de Fornecedores
- Cadastro de fornecedores
- Controle de materiais fornecidos
- Histórico de compras

## Estrutura do Sistema

### Frontend
- Interface moderna e responsiva
- Tema claro/escuro
- Notificações em tempo real
- Validações de formulários
- Upload de imagens

### Backend
- Firebase Realtime Database
- Autenticação segura
- Sistema de backup automático
- Monitoramento de performance
- Logs de auditoria

## Segurança

### Autenticação
- Login com código de acesso
- Tokens de sessão
- Proteção CSRF
- Validação de permissões

### Dados
- Sanitização de inputs
- Validação de CPF/CNPJ
- Criptografia de dados sensíveis
- Backup automático

## Performance

### Otimizações
- Cache de dados
- Lazy loading de imagens
- Compressão de recursos
- Monitoramento de memória

### Monitoramento
- Métricas de performance
- Logs de erros
- Alertas de uso
- Relatórios de sistema

## Instalação

1. Clone o repositório
```bash
git clone [url-do-repositorio]
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

4. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

## Configuração

### Firebase
1. Crie um projeto no Firebase Console
2. Ative o Realtime Database
3. Configure as regras de segurança
4. Adicione as credenciais ao arquivo de configuração

### Variáveis de Ambiente
- `FIREBASE_API_KEY`: Chave da API do Firebase
- `FIREBASE_AUTH_DOMAIN`: Domínio de autenticação
- `FIREBASE_DATABASE_URL`: URL do banco de dados
- `FIREBASE_PROJECT_ID`: ID do projeto
- `FIREBASE_STORAGE_BUCKET`: Bucket de armazenamento
- `FIREBASE_MESSAGING_SENDER_ID`: ID do remetente
- `FIREBASE_APP_ID`: ID do aplicativo

## Uso

### Login
1. Acesse a página inicial
2. Insira o código de acesso
3. Selecione o perfil de acesso

### Pedidos
1. Clique em "Novo Pedido"
2. Selecione o cliente
3. Adicione os produtos
4. Configure os detalhes
5. Salve o pedido

### Clientes
1. Acesse "Cadastros > Clientes"
2. Clique em "Novo Cliente"
3. Preencha os dados
4. Salve o cadastro

## Manutenção

### Backup
- Backups automáticos diários
- Retenção de 30 dias
- Restauração manual disponível

### Logs
- Logs de sistema
- Logs de auditoria
- Logs de performance
- Logs de erros

## Suporte

### Contato
- Email: [email-suporte]
- Telefone: [telefone-suporte]
- Horário: Seg-Sex, 8h-18h

### Documentação Adicional
- [Manual do Usuário](docs/manual-usuario.md)
- [Manual Técnico](docs/manual-tecnico.md)
- [API Reference](docs/api-reference.md)

## Contribuição
1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença
Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes. 