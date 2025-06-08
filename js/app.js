// Gerenciamento de estado global
const state = {
    isLoading: false,
    currentUser: null,
    notifications: [],
    theme: 'dark'
};

// Funções de utilidade
export const showLoading = () => {
    state.isLoading = true;
    document.getElementById('loadingOverlay').classList.remove('hidden');
};

export const hideLoading = () => {
    state.isLoading = false;
    document.getElementById('loadingOverlay').classList.add('hidden');
};

export const showNotification = (message, type = 'info', duration = 3000) => {
    const notification = {
        id: Date.now(),
        message,
        type
    };
    
    state.notifications.push(notification);
    
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification ${type}`;
    notificationElement.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    document.getElementById('notificationSystem').appendChild(notificationElement);
    
    setTimeout(() => {
        notificationElement.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            notificationElement.remove();
            state.notifications = state.notifications.filter(n => n.id !== notification.id);
        }, 300);
    }, duration);
};

const getNotificationIcon = (type) => {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
};

import { initRouteProtection, canAccessPage } from './permissions.js';
import { initDatabase } from './database.js';

// Inicialização do aplicativo
async function initApp() {
    try {
        // Inicializar banco de dados
        await initDatabase();
        
        // Inicializar proteção de rotas
        await initRouteProtection();
        
        // Configurar eventos globais
        setupGlobalEvents();
        
        // Verificar autenticação
        checkAuth();
        
        console.log('Aplicativo inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar aplicativo:', error);
        showNotification('Erro ao inicializar aplicativo', 'error');
    }
}

// Configurar eventos globais
function setupGlobalEvents() {
    // Evento de clique em links do menu
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
    
    // Evento de logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

// Verificar autenticação
function checkAuth() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const isAuthenticated = !!userData.id;
    
    // Atualizar interface baseado na autenticação
    updateAuthUI(isAuthenticated);
    
    // Redirecionar se não estiver autenticado
    if (!isAuthenticated && !window.location.pathname.includes('login')) {
        window.location.href = '/login';
    }
}

// Atualizar interface baseado na autenticação
function updateAuthUI(isAuthenticated) {
    const authElements = document.querySelectorAll('[data-auth]');
    const noAuthElements = document.querySelectorAll('[data-no-auth]');
    
    authElements.forEach(el => {
        el.style.display = isAuthenticated ? 'block' : 'none';
    });
    
    noAuthElements.forEach(el => {
        el.style.display = isAuthenticated ? 'none' : 'block';
    });
    
    // Atualizar informações do usuário
    if (isAuthenticated) {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userInfoElements = document.querySelectorAll('[data-user-info]');
        
        userInfoElements.forEach(el => {
            const info = el.dataset.userInfo;
            if (userData[info]) {
                el.textContent = userData[info];
            }
        });
    }
}

// Manipular logout
function handleLogout() {
    localStorage.removeItem('userData');
    window.location.href = '/login';
}

// Inicializar aplicativo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp); 