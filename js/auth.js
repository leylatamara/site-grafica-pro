import { showNotification } from './app.js';

// Configuração da autenticação
export const setupAuth = () => {
    const loginForm = document.getElementById('loginForm');
    const logoutButton = document.getElementById('logoutButton');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
};

// Manipulador de login
const handleLogin = async (e) => {
    e.preventDefault();
    
    const codigoAcesso = document.getElementById('codigoAcesso').value;
    const errorMessage = document.getElementById('loginErrorMessage');
    
    if (!codigoAcesso) {
        showError('Por favor, insira o código de acesso');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codigoAcesso })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Atualizar UI
            document.getElementById('loginScreen').classList.add('hidden');
            document.body.classList.add('app-visible');
            
            // Mostrar notificação de sucesso
            showNotification('Login realizado com sucesso!', 'success');
            
            // Recarregar página para atualizar estado
            window.location.reload();
        } else {
            const error = await response.json();
            showError(error.message || 'Código de acesso inválido');
        }
    } catch (error) {
        showError('Erro ao realizar login. Tente novamente.');
    }
};

// Manipulador de logout
const handleLogout = () => {
    // Limpar dados de autenticação
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Mostrar tela de login
    document.getElementById('loginScreen').classList.remove('hidden');
    document.body.classList.remove('app-visible');
    
    // Mostrar notificação
    showNotification('Logout realizado com sucesso!', 'info');
};

// Função auxiliar para mostrar erro
const showError = (message) => {
    const errorMessage = document.getElementById('loginErrorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
};

// Função para verificar se usuário está autenticado
export const isAuthenticated = () => {
    return !!localStorage.getItem('authToken');
};

// Função para obter dados do usuário
export const getUserData = () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
};

// Função para obter token de autenticação
export const getAuthToken = () => {
    return localStorage.getItem('authToken');
};

// Função para adicionar token em requisições
export const addAuthHeader = (headers = {}) => {
    const token = getAuthToken();
    if (token) {
        return {
            ...headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return headers;
};

// Função para fazer login
export async function login(username, password) {
    try {
        // Simular autenticação (em produção, isso seria uma chamada à API)
        const users = {
            'admin': {
                id: '1',
                name: 'Administrador',
                sector: 'admin',
                password: 'admin123'
            },
            'financeiro': {
                id: '2',
                name: 'Usuário Financeiro',
                sector: 'financeiro',
                password: 'fin123'
            },
            'producao': {
                id: '3',
                name: 'Usuário Produção',
                sector: 'producao',
                password: 'prod123'
            },
            'atendimento': {
                id: '4',
                name: 'Usuário Atendimento',
                sector: 'atendimento',
                password: 'atend123'
            }
        };

        const user = users[username];
        
        if (!user || user.password !== password) {
            throw new Error('Usuário ou senha inválidos');
        }

        // Remover senha antes de salvar
        const { password: _, ...userData } = user;
        
        // Salvar dados do usuário
        localStorage.setItem('userData', JSON.stringify(userData));
        
        return userData;
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        throw error;
    }
}

// Função para fazer logout
export function logout() {
    localStorage.removeItem('userData');
    window.location.href = '/';
}

// Função para verificar se o usuário é admin
export function isAdmin() {
    const userData = getUserData();
    return userData.sector === 'admin';
}

// Função para verificar se o usuário tem acesso a uma página
export async function canAccessPage(page) {
    const userData = getUserData();
    if (!userData.id) return false;
    
    // Admin tem acesso a tudo
    if (userData.sector === 'admin') return true;
    
    // Verificar permissões específicas
    const permissions = {
        'financeiro': ['dashboard', 'relatorios', 'faturamento', 'pagamentos'],
        'producao': ['dashboard', 'ordens-servico', 'estoque', 'maquinas'],
        'atendimento': ['dashboard', 'clientes', 'pedidos', 'orcamentos']
    };
    
    return permissions[userData.sector]?.includes(page) || false;
}

// Função para inicializar o formulário de login
export function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = form.username.value;
        const password = form.password.value;
        
        try {
            await login(username, password);
            window.location.href = '/dashboard';
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// Função para proteger rotas
export function protectRoute() {
    if (!isAuthenticated() && !window.location.pathname.includes('login')) {
        window.location.href = '/';
        return false;
    }
    
    return true;
}

// Função para inicializar proteção de rotas
export function initRouteProtection() {
    // Proteger rotas
    protectRoute();
    
    // Proteger links do menu
    document.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', async (e) => {
            const page = link.dataset.page;
            const hasAccess = await canAccessPage(page);
            
            if (!hasAccess) {
                e.preventDefault();
                showNotification('Você não tem permissão para acessar esta página', 'error');
            }
        });
    });
} 