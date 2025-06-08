// js/auth.js

/**
 * Módulo de Autenticação
 * Este ficheiro gere o login, logout e o estado da sessão do utilizador.
 */

import { auth, db, onAuthStateChanged, signInAnonymously, getDocs, collection, query, where } from './firebase-config.js';

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
        const funcionariosRef = collection(db, `artifacts/default-app-id/funcionarios`);
        const q = query(funcionariosRef, where("codigoAcesso", "==", codigo));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const funcionarioDoc = querySnapshot.docs[0];
            const funcionarioData = funcionarioDoc.data();
            
            // Armazena os dados do utilizador no localStorage
            localStorage.setItem('loggedInUserRole', funcionarioData.cargo.toLowerCase());
            localStorage.setItem('loggedInUserName', funcionarioData.nome);
            localStorage.setItem('loggedInUserId', funcionarioDoc.id);

            // Executa o callback de sucesso, passando os dados do utilizador
            onSuccess({
                role: funcionarioData.cargo.toLowerCase(),
                name: funcionarioData.nome,
                id: funcionarioDoc.id
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
