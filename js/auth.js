// js/auth.js

/**
 * Módulo de Autenticação
 * Este ficheiro gere o login, logout e o estado da sessão do utilizador.
 */

import { auth, db, onAuthStateChanged, signInAnonymously, getDocs, collection, query, where, shopInstanceAppId } from './firebase-config.js';

// **NOVO: Registo de diagnóstico para verificar o ID da instância no arranque**
console.log(`[Auth] Módulo de autenticação carregado. shopInstanceAppId: ${shopInstanceAppId}`);

/**
 * Realiza o login do funcionário com base no código de acesso.
 * @param {string} codigo - O código de acesso inserido.
 * @param {function} onSuccess - Callback a ser executado em caso de sucesso no login.
 */
export async function handleLogin(codigo, onSuccess) {
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    loginErrorMessage.classList.add('hidden');

    if (!auth.currentUser) {
        loginErrorMessage.textContent = "Aguardando autenticação. Tente novamente.";
        loginErrorMessage.classList.remove('hidden');
        return;
    }

    try {
        const collectionPath = `artifacts/${shopInstanceAppId}/funcionarios`;
        
        // **NOVO: Registos de diagnóstico**
        console.log(`[Auth] Tentando login com código: "${codigo}"`);
        console.log(`[Auth] Consultando a coleção no caminho: "${collectionPath}"`);

        const funcionariosRef = collection(db, collectionPath);
        const q = query(funcionariosRef, where("codigoAcesso", "==", codigo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            console.log("[Auth] Funcionário encontrado!");
            const funcionarioDoc = querySnapshot.docs[0];
            const funcionarioData = funcionarioDoc.data();
            
            localStorage.setItem('loggedInUserRole', funcionarioData.cargo.toLowerCase());
            localStorage.setItem('loggedInUserName', funcionarioData.nome);
            localStorage.setItem('loggedInUserId', funcionarioDoc.id);

            onSuccess({
                role: funcionarioData.cargo.toLowerCase(),
                name: funcionarioData.nome,
                id: funcionarioDoc.id
            });

        } else {
            // **NOVO: Registo de diagnóstico para falha**
            console.log("[Auth] Nenhum funcionário encontrado com esse código de acesso no caminho especificado.");
            loginErrorMessage.textContent = "Código inválido.";
            loginErrorMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error("[Auth] Erro durante a tentativa de login:", error);
        loginErrorMessage.textContent = "Ocorreu um erro ao tentar fazer login. Verifique a consola para mais detalhes.";
        loginErrorMessage.classList.remove('hidden');
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
