// js/ui.js

/**
 * Módulo de Interface do Utilizador (UI)
 * Este ficheiro contém funções para manipular o DOM, mostrar/esconder elementos,
 * e gerir a aparência geral da aplicação.
 */

let notificationTimeout;

/**
 * Ajusta o padding do topo do corpo da página para compensar a altura do cabeçalho.
 */
export function ajustarPaddingBody() {
    const menuGlobalContainer = document.querySelector('.exo-menu-container'); 
    const bodyEl = document.body;
    if (!menuGlobalContainer || !bodyEl) return;
    
    let totalOffset = menuGlobalContainer.offsetHeight;
    const notificationBar = document.getElementById('notificationBar');
    if (notificationBar?.classList.contains('visible')) {
        totalOffset += notificationBar.offsetHeight;
    }
    bodyEl.style.paddingTop = totalOffset + 'px';
}

/**
 * Marca o link do menu ativo com base na secção visível.
 * @param {string} targetSectionId - O ID da secção que está ativa.
 */
export function setActiveMenuLink(targetSectionId) { 
    document.querySelectorAll('.exo-menu a[data-section]').forEach(link => { 
        link.classList.remove('active');
        if (link.dataset.section === targetSectionId) {
            link.classList.add('active');
            const parentLi = link.closest('li.drop-down');
            if (parentLi) {
                // Garante que o item pai do dropdown também seja marcado como ativo
                const parentLink = parentLi.querySelector('a:not([data-section])');
                if (parentLink) parentLink.classList.add('active');
            }
        }
    });
}

/**
 * Mostra a barra de notificação com uma mensagem e tipo específicos.
 * @param {object} config - Configuração da notificação.
 * @param {string} config.message - A mensagem a ser exibida.
 * @param {string} [config.type='info'] - O tipo de notificação (success, error, warning, info, confirm-delete).
 * @param {number} [config.duration=5000] - Duração em milissegundos.
 * @param {function} [config.onConfirm] - Callback para o botão de confirmação.
 */
export function showNotification(config) {
    const bar = document.getElementById('notificationBar');
    if (!bar) return;
    if (notificationTimeout) clearTimeout(notificationTimeout);
    
    const iconMap = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle', 'confirm-delete': 'fa-exclamation-triangle' };
    bar.className = `notification-bar ${config.type}`;
    document.getElementById('notificationIcon').innerHTML = `<i class="fas ${iconMap[config.type] || 'fa-info-circle'}"></i>`;
    document.getElementById('notificationMessage').textContent = config.message;
    const actions = document.getElementById('notificationActions');
    actions.innerHTML = '';

    if (config.type === 'confirm-delete') {
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = config.confirmText || 'Excluir';
        confirmBtn.className = 'btn btn-confirm-action';
        confirmBtn.onclick = () => { if (config.onConfirm) config.onConfirm(); hideNotification(); };
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = config.cancelText || 'Cancelar';
        cancelBtn.className = 'btn btn-cancel-action';
        cancelBtn.onclick = () => { if (config.onCancel) config.onCancel(); hideNotification(); };
        
        actions.append(confirmBtn, cancelBtn);
    } else {
        notificationTimeout = setTimeout(hideNotification, config.duration || 5000);
    }
    bar.classList.add('visible');
    ajustarPaddingBody(); 
}

/**
 * Esconde a barra de notificação.
 */
export function hideNotification() {
    const bar = document.getElementById('notificationBar');
    if (bar) {
        bar.classList.remove('visible');
        if (notificationTimeout) clearTimeout(notificationTimeout);
        // Aguarda a transição CSS terminar antes de reajustar o padding
        setTimeout(ajustarPaddingBody, 400); 
    }
}

/**
 * Abre um modal específico.
 * @param {string} overlayId - O ID do overlay do modal a ser aberto.
 */
export function abrirModalEspecifico(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });
}

/**
 * Fecha um modal específico.
 * @param {string} overlayId - O ID do overlay do modal a ser fechado.
 */
export function fecharModalEspecifico(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.classList.remove('active');
    // Aguarda a transição CSS terminar antes de o esconder
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
}
