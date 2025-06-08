// js/auth.js

/**
 * Módulo de Autenticação
 * Este ficheiro gere o login, logout e o estado da sessão do utilizador.
 */

import { auth, db, onAuthStateChanged, signInAnonymously, getDocs, collection, query, where, shopInstanceAppId } from './firebase-config.js';

/**
 * Realiza o login do funcionário e retorna os dados em caso de sucesso.
 * @param {string} codigo - O código de acesso inserido.
 * @returns {object|null} Retorna o objeto com os dados do utilizador ou null em caso de falha.
 */
export async function handleLogin(codigo) {
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    loginErrorMessage.classList.add('hidden');

    if (!auth.currentUser) {
        loginErrorMessage.textContent = "Aguardando autenticação. Tente novamente.";
        loginErrorMessage.classList.remove('hidden');
        return null;
    }

    try {
        const collectionPath = `artifacts/${shopInstanceAppId}/funcionarios`;
        const q = query(collection(db, collectionPath), where("codigoAcesso", "==", codigo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const funcionarioDoc = querySnapshot.docs[0];
            const funcionarioData = funcionarioDoc.data();
            
            const userData = {
                role: funcionarioData.cargo.toLowerCase(),
                name: funcionarioData.nome,
                id: funcionarioDoc.id
            };
            
            // Armazena os dados do utilizador no localStorage para persistir a sessão
            localStorage.setItem('loggedInUserRole', userData.role);
            localStorage.setItem('loggedInUserName', userData.name);
            localStorage.setItem('loggedInUserId', userData.id);

            return userData; // Retorna os dados em caso de sucesso

        } else {
            loginErrorMessage.textContent = "Código inválido.";
            loginErrorMessage.classList.remove('hidden');
            return null; // Retorna null em caso de falha
        }
    } catch (error) {
        console.error("[Auth] Erro durante a tentativa de login:", error);
        loginErrorMessage.textContent = "Ocorreu um erro ao tentar fazer login.";
        loginErrorMessage.classList.remove('hidden');
        return null;
    }
}

/**
 * Realiza o logout do utilizador, limpando os dados da sessão.
 */
export function logout() {
    localStorage.removeItem('loggedInUserRole');
    localStorage.removeItem('loggedInUserName');
    localStorage.removeItem('loggedInUserId');
    window.location.reload();
}

/**
 * Inicializa o listener de autenticação.
 */
export function initAuth(callbacks) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const storedRole = localStorage.getItem('loggedInUserRole');
            const storedName = localStorage.getItem('loggedInUserName');
            const storedId = localStorage.getItem('loggedInUserId');

            if (storedRole && storedName && storedId) {
                callbacks.onUserLoggedIn({
                    role: storedRole,
                    name: storedName,
                    id: storedId
                });
            } else {
                callbacks.onUserLoggedOut();
            }
            callbacks.onAuthReady(user.uid);
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Erro no login anônimo:", error);
                document.body.innerHTML = "Erro crítico de autenticação. Por favor, recarregue a página.";
            }
        }
    });
}
