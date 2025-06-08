// Tipos de notificação
export const NotificationType = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

// Configuração padrão
const defaultConfig = {
    duration: 3000,
    position: 'top-right',
    animation: 'slide-in'
};

// Gerenciador de notificações
class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.init();
    }

    // Inicializar container de notificações
    init() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    // Mostrar notificação
    show(message, type = NotificationType.INFO, config = {}) {
        const notification = this.createNotification(message, type, config);
        this.notifications.push(notification);
        this.container.appendChild(notification);

        // Remover após duração
        setTimeout(() => {
            this.remove(notification);
        }, config.duration || defaultConfig.duration);
    }

    // Criar elemento de notificação
    createNotification(message, type, config) {
        const notification = document.createElement('div');
        notification.className = `notification ${type} ${config.animation || defaultConfig.animation}`;
        
        // Ícone baseado no tipo
        const icon = this.getIconForType(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Evento de fechar
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => this.remove(notification));

        return notification;
    }

    // Remover notificação
    remove(notification) {
        const index = this.notifications.indexOf(notification);
        if (index > -1) {
            this.notifications.splice(index, 1);
            notification.classList.add('notification-hide');
            
            // Remover após animação
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    // Obter ícone para tipo de notificação
    getIconForType(type) {
        switch (type) {
            case NotificationType.SUCCESS:
                return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            case NotificationType.ERROR:
                return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            case NotificationType.WARNING:
                return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
            default:
                return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        }
    }
}

// Instância única do gerenciador
const notificationManager = new NotificationManager();

// Função para mostrar notificação
export function showNotification(message, type = NotificationType.INFO, config = {}) {
    notificationManager.show(message, type, config);
}

// Funções auxiliares para tipos comuns
export const showSuccess = (message, config = {}) => {
    showNotification(message, NotificationType.SUCCESS, config);
};

export const showError = (message, config = {}) => {
    showNotification(message, NotificationType.ERROR, config);
};

export const showWarning = (message, config = {}) => {
    showNotification(message, NotificationType.WARNING, config);
};

export const showInfo = (message, config = {}) => {
    showNotification(message, NotificationType.INFO, config);
}; 