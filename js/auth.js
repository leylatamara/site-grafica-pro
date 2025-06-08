// js/auth.js

/**
 * Módulo de Autenticação
 * Este ficheiro gere o login, logout e o estado da sessão do utilizador.
 */

import { db, shopInstanceAppId, collection, query, where, getDocs } from './firebase-config.js';
import { showNotification } from './ui.js';

let currentUser = null;
let sessionTimeout = null;

/**
 * Inicializa o sistema de autenticação
 */
export function initAuth({ onUserLoggedIn, onUserLoggedOut, onAuthReady }) {
    // Verificar se há uma sessão ativa
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            if (session.expiresAt > Date.now()) {
                currentUser = session.user;
                onUserLoggedIn(session.user);
                startSessionTimeout(session.expiresAt - Date.now());
            } else {
                logout();
            }
        } catch (error) {
            console.error('Erro ao restaurar sessão:', error);
            logout();
        }
    }

    // Configurar listener do formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = document.getElementById('codigoAcesso').value;
            await handleLogin(codigo, onUserLoggedIn);
        });
    }

    // Configurar botão de logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logout();
            onUserLoggedOut();
        });
    }

    onAuthReady();
}

/**
 * Manipula o processo de login
 */
async function handleLogin(codigo, onUserLoggedIn) {
    try {
        const funcionariosRef = collection(db, `artifacts/${shopInstanceAppId}/funcionarios`);
        const q = query(funcionariosRef, where('codigoAcesso', '==', codigo));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showNotification({
                message: 'Código de acesso inválido.',
                type: 'error'
            });
            return;
        }

        const funcionario = snapshot.docs[0].data();
        currentUser = {
            id: snapshot.docs[0].id,
            name: funcionario.nome,
            role: funcionario.cargo
        };

        // Criar sessão com expiração de 8 horas
        const session = {
            user: currentUser,
            expiresAt: Date.now() + (8 * 60 * 60 * 1000)
        };
        localStorage.setItem('userSession', JSON.stringify(session));
        
        startSessionTimeout(8 * 60 * 60 * 1000);
        onUserLoggedIn(currentUser);
        
        showNotification({
            message: `Bem-vindo(a), ${currentUser.name}!`,
            type: 'success'
        });
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification({
            message: 'Erro ao fazer login. Tente novamente.',
            type: 'error'
        });
    }
}

/**
 * Realiza o logout do usuário
 */
export function logout() {
    currentUser = null;
    localStorage.removeItem('userSession');
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
    }
}

/**
 * Verifica se a sessão está ativa
 */
export function checkSession() {
    if (!currentUser) return false;
    
    const savedSession = localStorage.getItem('userSession');
    if (!savedSession) return false;
    
    try {
        const session = JSON.parse(savedSession);
        return session.expiresAt > Date.now();
    } catch {
        return false;
    }
}

/**
 * Inicia o timeout da sessão
 */
function startSessionTimeout(duration) {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
    }
    sessionTimeout = setTimeout(() => {
        logout();
        window.location.reload();
    }, duration);
}

/**
 * Retorna o usuário atual
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Verifica se o usuário tem permissão para acessar uma funcionalidade
 */
export function hasPermission(requiredRole) {
    if (!currentUser) return false;
    if (requiredRole === 'all') return true;
    return currentUser.role === requiredRole;
}
