// Configuração do banco de dados
const DB_NAME = 'graficaProDB';
const DB_VERSION = 1;

// Inicialização do banco de dados
export const initDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store de permissões
            if (!db.objectStoreNames.contains('permissions')) {
                const permissionsStore = db.createObjectStore('permissions', { keyPath: 'id' });
                permissionsStore.createIndex('sector', 'sector', { unique: false });
            }

            // Store de logs
            if (!db.objectStoreNames.contains('accessLogs')) {
                const logsStore = db.createObjectStore('accessLogs', { keyPath: 'id', autoIncrement: true });
                logsStore.createIndex('userId', 'userId', { unique: false });
                logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                logsStore.createIndex('page', 'page', { unique: false });
            }

            // Store de grupos
            if (!db.objectStoreNames.contains('userGroups')) {
                const groupsStore = db.createObjectStore('userGroups', { keyPath: 'id' });
                groupsStore.createIndex('name', 'name', { unique: true });
            }

            // Store de backups
            if (!db.objectStoreNames.contains('backups')) {
                const backupsStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
                backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

// Operações com permissões
export const savePermissions = async (sector, permissions) => {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['permissions'], 'readwrite');
        const store = transaction.objectStore('permissions');
        
        const request = store.put({
            id: `sector_${sector}`,
            sector,
            permissions,
            lastUpdated: new Date()
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

export const getPermissions = async (sector) => {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['permissions'], 'readonly');
        const store = transaction.objectStore('permissions');
        const request = store.get(`sector_${sector}`);

        request.onsuccess = () => resolve(request.result?.permissions || []);
        request.onerror = () => reject(request.error);
    });
};

// Operações com logs
export const logAccess = async (userId, page, action, status) => {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['accessLogs'], 'readwrite');
        const store = transaction.objectStore('accessLogs');
        
        const request = store.add({
            userId,
            page,
            action,
            status,
            timestamp: new Date(),
            userAgent: navigator.userAgent,
            ip: '127.0.0.1' // Em produção, obter IP real
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

export const getAccessLogs = async (filters = {}) => {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['accessLogs'], 'readonly');
        const store = transaction.objectStore('accessLogs');
        const request = store.getAll();

        request.onsuccess = () => {
            let logs = request.result;
            
            // Aplicar filtros
            if (filters.userId) {
                logs = logs.filter(log => log.userId === filters.userId);
            }
            if (filters.page) {
                logs = logs.filter(log => log.page === filters.page);
            }
            if (filters.startDate) {
                logs = logs.filter(log => log.timestamp >= filters.startDate);
            }
            if (filters.endDate) {
                logs = logs.filter(log => log.timestamp <= filters.endDate);
            }
            
            resolve(logs);
        };
        request.onerror = () => reject(request.error);
    });
};

// Operações com grupos
export const createUserGroup = async (name, permissions) => {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['userGroups'], 'readwrite');
        const store = transaction.objectStore('userGroups');
        
        const request = store.add({
            id: `group_${Date.now()}`,
            name,
            permissions,
            createdAt: new Date()
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

export const getUserGroups = async () => {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['userGroups'], 'readonly');
        const store = transaction.objectStore('userGroups');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Operações com backup
export const createBackup = async () => {
    const db = await initDatabase();
    return new Promise(async (resolve, reject) => {
        try {
            const permissions = await getAllPermissions();
            const groups = await getUserGroups();
            
            const transaction = db.transaction(['backups'], 'readwrite');
            const store = transaction.objectStore('backups');
            
            const request = store.add({
                timestamp: new Date(),
                data: {
                    permissions,
                    groups
                }
            });

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
};

export const getBackups = async () => {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const restoreBackup = async (backupId) => {
    const db = await initDatabase();
    return new Promise(async (resolve, reject) => {
        try {
            const transaction = db.transaction(['backups'], 'readonly');
            const store = transaction.objectStore('backups');
            const request = store.get(backupId);

            request.onsuccess = async () => {
                const backup = request.result;
                if (!backup) {
                    reject(new Error('Backup não encontrado'));
                    return;
                }

                // Restaurar permissões
                for (const permission of backup.data.permissions) {
                    await savePermissions(permission.sector, permission.permissions);
                }

                // Restaurar grupos
                for (const group of backup.data.groups) {
                    await createUserGroup(group.name, group.permissions);
                }

                resolve(true);
            };
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}; 