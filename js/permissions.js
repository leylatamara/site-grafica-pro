import { savePermissions, getPermissions, logAccess } from './database.js';
import { showNotification } from './app.js';

// Níveis de permissão
export const PermissionLevel = {
    NONE: 0,
    READ: 1,
    WRITE: 2,
    ADMIN: 3
};

// Configuração de permissões por setor
const sectorPermissions = {
    admin: {
        name: 'Administrador',
        permissions: {
            '*': PermissionLevel.ADMIN
        }
    },
    financeiro: {
        name: 'Financeiro',
        permissions: {
            'dashboard': PermissionLevel.READ,
            'relatorios': PermissionLevel.READ,
            'faturamento': PermissionLevel.WRITE,
            'pagamentos': PermissionLevel.WRITE
        }
    },
    producao: {
        name: 'Produção',
        permissions: {
            'dashboard': PermissionLevel.READ,
            'ordens-servico': PermissionLevel.WRITE,
            'estoque': PermissionLevel.WRITE,
            'maquinas': PermissionLevel.READ
        }
    },
    atendimento: {
        name: 'Atendimento',
        permissions: {
            'dashboard': PermissionLevel.READ,
            'clientes': PermissionLevel.WRITE,
            'pedidos': PermissionLevel.WRITE,
            'orcamentos': PermissionLevel.WRITE
        }
    }
};

// Função para verificar permissão
export const checkPermission = async (sector, page, requiredLevel = PermissionLevel.READ) => {
    try {
        // Carregar permissões do banco de dados
        const permissions = await getPermissions(sector);
        
        // Se não houver permissões no banco, usar as padrões
        const sectorConfig = permissions.length > 0 ? 
            { permissions: permissions.reduce((acc, p) => ({ ...acc, [p.page]: p.level }), {}) } :
            sectorPermissions[sector];

        if (!sectorConfig) return false;
        
        // Admin tem acesso total
        if (sector === 'admin') return true;
        
        // Verificar nível de permissão
        const pagePermission = sectorConfig.permissions[page];
        return pagePermission >= requiredLevel;
    } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
    }
};

// Função para obter todas as páginas disponíveis
export const getAvailablePages = () => {
    const pages = new Set();
    Object.values(sectorPermissions).forEach(sector => {
        Object.keys(sector.permissions).forEach(page => {
            if (page !== '*') pages.add(page);
        });
    });
    return Array.from(pages);
};

// Função para obter todos os setores
export const getSectors = () => {
    return Object.entries(sectorPermissions).map(([id, config]) => ({
        id,
        name: config.name
    }));
};

// Função para atualizar permissões de um setor
export const updateSectorPermissions = async (sector, permissions) => {
    try {
        // Converter formato de permissões
        const formattedPermissions = Object.entries(permissions).map(([page, level]) => ({
            page,
            level
        }));

        // Salvar no banco de dados
        await savePermissions(sector, formattedPermissions);
        
        // Registrar ação
        await logAccess('admin', 'permissions', 'update', 'success');
        
        return true;
    } catch (error) {
        console.error('Erro ao atualizar permissões:', error);
        await logAccess('admin', 'permissions', 'update', 'error');
        return false;
    }
};

// Função para verificar se o usuário atual tem acesso à página
export const canAccessPage = async (page, requiredLevel = PermissionLevel.READ) => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    return checkPermission(userData.sector, page, requiredLevel);
};

// Função para proteger rotas
export const protectRoute = async (page, requiredLevel = PermissionLevel.READ) => {
    const hasAccess = await canAccessPage(page, requiredLevel);
    
    if (!hasAccess) {
        showNotification('Você não tem permissão para acessar esta página', 'error');
        window.location.href = '/dashboard';
        return false;
    }
    
    // Registrar acesso
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    await logAccess(userData.id, page, 'access', 'success');
    
    return true;
};

// Função para inicializar proteção de rotas
export const initRouteProtection = async () => {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard';
    await protectRoute(currentPage);
    
    // Proteger links do menu
    document.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', async (e) => {
            const page = link.dataset.page;
            const hasAccess = await canAccessPage(page);
            
            if (!hasAccess) {
                e.preventDefault();
                showNotification('Você não tem permissão para acessar esta página', 'error');
            }
        });
    });
};

// Função para obter nível de permissão em texto
export const getPermissionLevelText = (level) => {
    switch (level) {
        case PermissionLevel.NONE: return 'Sem Acesso';
        case PermissionLevel.READ: return 'Leitura';
        case PermissionLevel.WRITE: return 'Escrita';
        case PermissionLevel.ADMIN: return 'Administrador';
        default: return 'Desconhecido';
    }
}; 