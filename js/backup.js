import { db, collection, getDocs, addDoc, Timestamp } from './firebase-config.js';
import { showNotification } from './ui.js';

/**
 * Sistema de Backup e Recuperação
 * Gerencia backups automáticos e manuais dos dados do sistema
 */

// Configurações do backup
const BACKUP_CONFIG = {
    autoBackupInterval: 24 * 60 * 60 * 1000, // 24 horas
    maxBackups: 30, // Manter últimos 30 backups
    collections: ['clientes', 'produtos', 'pedidos', 'funcionarios', 'fornecedores']
};

/**
 * Realiza backup completo do sistema
 */
export async function realizarBackupCompleto() {
    try {
        const backupData = {
            timestamp: Timestamp.now(),
            collections: {}
        };

        // Coletar dados de todas as coleções
        for (const collectionName of BACKUP_CONFIG.collections) {
            const snapshot = await getDocs(collection(db, `artifacts/${shopInstanceAppId}/${collectionName}`));
            backupData.collections[collectionName] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        // Salvar backup
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/backups`), backupData);

        // Limpar backups antigos
        await limparBackupsAntigos();

        showNotification({
            message: 'Backup realizado com sucesso!',
            type: 'success'
        });

        return true;
    } catch (error) {
        console.error('Erro ao realizar backup:', error);
        showNotification({
            message: 'Erro ao realizar backup. Por favor, tente novamente.',
            type: 'error'
        });
        return false;
    }
}

/**
 * Limpa backups antigos mantendo apenas os últimos N backups
 */
async function limparBackupsAntigos() {
    try {
        const backupsRef = collection(db, `artifacts/${shopInstanceAppId}/backups`);
        const snapshot = await getDocs(backupsRef);
        
        if (snapshot.docs.length > BACKUP_CONFIG.maxBackups) {
            const backupsToDelete = snapshot.docs
                .sort((a, b) => b.data().timestamp.seconds - a.data().timestamp.seconds)
                .slice(BACKUP_CONFIG.maxBackups);

            for (const backup of backupsToDelete) {
                await deleteDoc(doc(db, `artifacts/${shopInstanceAppId}/backups`, backup.id));
            }
        }
    } catch (error) {
        console.error('Erro ao limpar backups antigos:', error);
    }
}

/**
 * Recupera dados de um backup específico
 * @param {string} backupId - ID do backup a ser recuperado
 */
export async function recuperarBackup(backupId) {
    try {
        const backupRef = doc(db, `artifacts/${shopInstanceAppId}/backups`, backupId);
        const backupDoc = await getDoc(backupRef);

        if (!backupDoc.exists()) {
            throw new Error('Backup não encontrado');
        }

        const backupData = backupDoc.data();

        // Restaurar cada coleção
        for (const [collectionName, documents] of Object.entries(backupData.collections)) {
            const batch = writeBatch(db);
            
            for (const doc of documents) {
                const { id, ...data } = doc;
                const docRef = doc(db, `artifacts/${shopInstanceAppId}/${collectionName}`, id);
                batch.set(docRef, data);
            }

            await batch.commit();
        }

        showNotification({
            message: 'Dados recuperados com sucesso!',
            type: 'success'
        });

        return true;
    } catch (error) {
        console.error('Erro ao recuperar backup:', error);
        showNotification({
            message: 'Erro ao recuperar backup. Por favor, tente novamente.',
            type: 'error'
        });
        return false;
    }
}

/**
 * Inicia o sistema de backup automático
 */
export function iniciarBackupAutomatico() {
    setInterval(async () => {
        await realizarBackupCompleto();
    }, BACKUP_CONFIG.autoBackupInterval);
}

/**
 * Registra uma ação no log de auditoria
 * @param {string} acao - Tipo de ação realizada
 * @param {string} usuario - Usuário que realizou a ação
 * @param {object} detalhes - Detalhes adicionais da ação
 */
export async function registrarLogAuditoria(acao, usuario, detalhes = {}) {
    try {
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/logs`), {
            acao,
            usuario,
            detalhes,
            timestamp: Timestamp.now(),
            ip: await getClientIP()
        });
    } catch (error) {
        console.error('Erro ao registrar log:', error);
    }
}

/**
 * Obtém o IP do cliente
 */
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Erro ao obter IP:', error);
        return 'unknown';
    }
} 