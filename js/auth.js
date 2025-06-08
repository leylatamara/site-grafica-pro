// js/auth.js

/**
 * Módulo de Autenticação
 * Este ficheiro gere o login, logout e o estado da sessão do utilizador.
 */

import { auth, db, onAuthStateChanged, signInAnonymously, getDocs, collection, query, where } from './firebase-config.js';

// Gerar token CSRF
function generateCSRFToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Validar token CSRF
function validateCSRFToken(token) {
    const storedToken = localStorage.getItem('csrfToken');
    return token === storedToken;
}

/**
 * Realiza o login do funcionário com base no código de acesso.
 * @param {string} codigo - O código de acesso inserido.
 * @param {function} onSuccess - Callback a ser executado em caso de sucesso no login.
 */
export async function handleLogin(codigo, onSuccess) {
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    loginErrorMessage.classList.add('hidden');

    // Validar entrada
    if (!codigo || codigo.length < 4) {
        loginErrorMessage.textContent = "Código de acesso inválido.";
        loginErrorMessage.classList.remove('hidden');
        return;
    }

    try {
        // Gerar novo token CSRF
        const csrfToken = generateCSRFToken();
        localStorage.setItem('csrfToken', csrfToken);

        const funcionariosRef = collection(db, `artifacts/default-app-id/funcionarios`);
        const q = query(funcionariosRef, where("codigoAcesso", "==", codigo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const funcionarioDoc = querySnapshot.docs[0];
            const funcionarioData = funcionarioDoc.data();
            
            // Validar dados do funcionário
            if (!funcionarioData.cargo || !funcionarioData.nome) {
                throw new Error("Dados do funcionário inválidos");
            }

            // Gerar token de sessão
            const sessionToken = generateSessionToken();
            
            // Armazena os dados do utilizador no localStorage com token
            localStorage.setItem('loggedInUserRole', funcionarioData.cargo.toLowerCase());
            localStorage.setItem('loggedInUserName', funcionarioData.nome);
            localStorage.setItem('loggedInUserId', funcionarioDoc.id);
            localStorage.setItem('sessionToken', sessionToken);
            localStorage.setItem('lastActivity', Date.now().toString());

            // Executa o callback de sucesso, passando os dados do utilizador
            onSuccess({
                role: funcionarioData.cargo.toLowerCase(),
                name: funcionarioData.nome,
                id: funcionarioDoc.id,
                csrfToken
            });

        } else {
            loginErrorMessage.textContent = "Código inválido.";
            loginErrorMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Erro no login:", error);
        loginErrorMessage.textContent = "Erro ao tentar fazer login. Tente novamente.";
        loginErrorMessage.classList.remove('hidden');
    }
}

// Gerar token de sessão
function generateSessionToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Verificar sessão
export function checkSession() {
    const sessionToken = localStorage.getItem('sessionToken');
    const lastActivity = localStorage.getItem('lastActivity');
    
    if (!sessionToken || !lastActivity) {
        return false;
    }

    // Verificar se a sessão expirou (30 minutos)
    const now = Date.now();
    const lastActivityTime = parseInt(lastActivity);
    if (now - lastActivityTime > 30 * 60 * 1000) {
        logout();
        return false;
    }

    // Atualizar última atividade
    localStorage.setItem('lastActivity', now.toString());
    return true;
}

/**
 * Realiza o logout do utilizador, limpando os dados da sessão.
 */
export function logout() {
    localStorage.removeItem('loggedInUserRole');
    localStorage.removeItem('loggedInUserName');
    localStorage.removeItem('loggedInUserId');

    // Recarrega a página para redefinir o estado da aplicação
    window.location.reload();
}

/**
 * Inicializa o listener de autenticação para verificar se o utilizador já está logado
 * ou se precisa de fazer login anónimo.
 * @param {object} callbacks - Objeto com funções de callback.
 * @param {function} callbacks.onUserLoggedIn - Chamado quando um utilizador está logado (da sessão anterior).
 * @param {function} callbacks.onUserLoggedOut - Chamado quando não há utilizador logado.
 * @param {function} callbacks.onAuthReady - Chamado após a primeira verificação de autenticação estar completa.
 */
export function initAuth(callbacks) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Um utilizador (anónimo ou persistido) está presente.
            // Verifica se há uma sessão guardada no localStorage.
            const storedRole = localStorage.getItem('loggedInUserRole');
            const storedName = localStorage.getItem('loggedInUserName');
            const storedId = localStorage.getItem('loggedInUserId');

            if (storedRole && storedName && storedId) {
                // Se houver, informa a aplicação para continuar com o utilizador logado.
                callbacks.onUserLoggedIn({
                    role: storedRole,
                    name: storedName,
                    id: storedId
                });
            } else {
                // Se não houver, mostra a tela de login.
                callbacks.onUserLoggedOut();
            }
            // Informa que a verificação de autenticação inicial está pronta.
            callbacks.onAuthReady(user.uid);
        } else {
            // Nenhum utilizador base (nem anónimo). Tenta fazer login anónimo.
            try {
                await signInAnonymously(auth);
                // O listener onAuthStateChanged será acionado novamente após o login anónimo.
            } catch (error) {
                console.error("Erro no login anônimo:", error);
                document.body.innerHTML = "Erro crítico de autenticação. Por favor, recarregue a página.";
            }
        }
    });
}
