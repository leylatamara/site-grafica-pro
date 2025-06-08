// js/ui.js

/**
 * Módulo de Interface do Utilizador (UI)
 * Este ficheiro contém funções para manipular o DOM, mostrar/esconder elementos,
 * e gerir a aparência geral da aplicação.
 */

let notificationTimeout = null;

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
 * @param {function} [config.onCancel] - Callback para o botão de cancelamento.
 * @param {string} [config.confirmText] - Texto do botão de confirmação.
 * @param {string} [config.cancelText] - Texto do botão de cancelamento.
 */
export function showNotification(config) {
    const bar = document.getElementById('notificationBar');
    if (!bar) {
        console.error('Elemento de notificação não encontrado');
        return;
    }

    // Limpar timeout anterior
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    // Mapeamento de ícones e cores
    const iconMap = {
        success: { icon: 'fa-check-circle', color: 'var(--color-success)' },
        error: { icon: 'fa-times-circle', color: 'var(--color-danger)' },
        warning: { icon: 'fa-exclamation-triangle', color: 'var(--color-warning)' },
        info: { icon: 'fa-info-circle', color: 'var(--color-info)' },
        'confirm-delete': { icon: 'fa-exclamation-triangle', color: 'var(--color-warning)' }
    };

    // Configurar estilo da notificação
    const style = iconMap[config.type] || iconMap.info;
    bar.style.borderLeftColor = style.color;
    bar.className = `notification-bar ${config.type} animate-slide-in`;

    // Configurar ícone e mensagem
    const icon = document.getElementById('notificationIcon');
    const message = document.getElementById('notificationMessage');
    if (icon) icon.innerHTML = `<i class="fas ${style.icon}" style="color: ${style.color}"></i>`;
    if (message) message.textContent = config.message;

    // Configurar ações
    const actions = document.getElementById('notificationActions');
    if (actions) {
        actions.innerHTML = '';

        if (config.type === 'confirm-delete') {
            // Botão de confirmação
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = config.confirmText || 'Confirmar';
            confirmBtn.className = 'btn btn-confirm-action';
            confirmBtn.style.backgroundColor = 'var(--color-danger)';
            confirmBtn.onclick = () => {
                if (config.onConfirm) config.onConfirm();
                hideNotification();
            };

            // Botão de cancelamento
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = config.cancelText || 'Cancelar';
            cancelBtn.className = 'btn btn-cancel-action';
            cancelBtn.style.backgroundColor = 'var(--color-secondary)';
            cancelBtn.onclick = () => {
                if (config.onCancel) config.onCancel();
                hideNotification();
            };

            actions.append(confirmBtn, cancelBtn);
        } else {
            // Botão de fechar para notificações normais
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.className = 'notification-close-btn';
            closeBtn.onclick = hideNotification;
            actions.appendChild(closeBtn);

            // Auto-fechar após duração
            notificationTimeout = setTimeout(hideNotification, config.duration || 5000);
        }
    }

    // Mostrar notificação com animação
    bar.classList.add('visible');
    ajustarPaddingBody();

    // Adicionar evento de tecla ESC para fechar
    document.addEventListener('keydown', handleEscKey);
}

/**
 * Esconde a notificação com animação.
 */
export function hideNotification() {
    const bar = document.getElementById('notificationBar');
    if (!bar) return;

    bar.classList.add('animate-slide-out');
    setTimeout(() => {
        bar.classList.remove('visible', 'animate-slide-in', 'animate-slide-out');
        ajustarPaddingBody();
    }, 300);

    // Remover evento de tecla ESC
    document.removeEventListener('keydown', handleEscKey);
}

/**
 * Manipula o evento de tecla ESC.
 * @param {KeyboardEvent} e - O evento de tecla.
 */
function handleEscKey(e) {
    if (e.key === 'Escape') {
        hideNotification();
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
