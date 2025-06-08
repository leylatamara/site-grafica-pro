import { db, collection, addDoc, Timestamp } from './firebase-config.js';
import { showNotification } from './ui.js';

/**
 * Sistema de Monitoramento
 * Monitora performance, erros e uso do sistema
 */

// Configurações do monitoramento
const MONITOR_CONFIG = {
    performanceInterval: 5 * 60 * 1000, // 5 minutos
    errorThreshold: 5, // Número de erros antes de alertar
    maxLogSize: 1000 // Tamanho máximo do log em memória
};

// Cache de logs em memória
let performanceLogs = [];
let errorLogs = [];

/**
 * Inicia o sistema de monitoramento
 */
export function iniciarMonitoramento() {
    // Monitorar performance
    setInterval(monitorarPerformance, MONITOR_CONFIG.performanceInterval);
    
    // Monitorar erros
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handlePromiseError);
    
    // Monitorar uso de memória
    setInterval(monitorarUsoMemoria, MONITOR_CONFIG.performanceInterval);
}

/**
 * Monitora métricas de performance
 */
async function monitorarPerformance() {
    try {
        const metrics = {
            timestamp: Timestamp.now(),
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize
            } : null,
            timing: {
                navigationStart: performance.timing.navigationStart,
                loadEventEnd: performance.timing.loadEventEnd,
                domComplete: performance.timing.domComplete
            },
            resources: performance.getEntriesByType('resource').map(resource => ({
                name: resource.name,
                duration: resource.duration,
                size: resource.transferSize
            }))
        };

        // Adicionar ao log em memória
        performanceLogs.push(metrics);
        if (performanceLogs.length > MONITOR_CONFIG.maxLogSize) {
            performanceLogs.shift();
        }

        // Salvar no Firebase
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/performance`), metrics);

        // Verificar anomalias
        verificarAnomaliasPerformance(metrics);
    } catch (error) {
        console.error('Erro ao monitorar performance:', error);
    }
}

/**
 * Monitora uso de memória
 */
function monitorarUsoMemoria() {
    if (performance.memory) {
        const usedHeap = performance.memory.usedJSHeapSize;
        const totalHeap = performance.memory.totalJSHeapSize;
        const heapUsage = (usedHeap / totalHeap) * 100;

        if (heapUsage > 80) {
            showNotification({
                message: 'Uso de memória elevado detectado!',
                type: 'warning'
            });
        }
    }
}

/**
 * Verifica anomalias de performance
 */
function verificarAnomaliasPerformance(metrics) {
    // Verificar tempo de carregamento
    const loadTime = metrics.timing.loadEventEnd - metrics.timing.navigationStart;
    if (loadTime > 5000) { // Mais de 5 segundos
        showNotification({
            message: 'Tempo de carregamento elevado detectado!',
            type: 'warning'
        });
    }

    // Verificar recursos lentos
    const slowResources = metrics.resources.filter(r => r.duration > 1000);
    if (slowResources.length > 0) {
        console.warn('Recursos lentos detectados:', slowResources);
    }
}

/**
 * Manipula erros não capturados
 */
function handleError(event) {
    const error = {
        timestamp: Timestamp.now(),
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
    };

    registrarErro(error);
}

/**
 * Manipula erros de Promises não tratadas
 */
function handlePromiseError(event) {
    const error = {
        timestamp: Timestamp.now(),
        message: event.reason?.message || 'Erro em Promise',
        stack: event.reason?.stack
    };

    registrarErro(error);
}

/**
 * Registra erro no sistema
 */
async function registrarErro(error) {
    try {
        // Adicionar ao log em memória
        errorLogs.push(error);
        if (errorLogs.length > MONITOR_CONFIG.maxLogSize) {
            errorLogs.shift();
        }

        // Salvar no Firebase
        await addDoc(collection(db, `artifacts/${shopInstanceAppId}/errors`), error);

        // Verificar se atingiu o threshold
        if (errorLogs.length >= MONITOR_CONFIG.errorThreshold) {
            showNotification({
                message: 'Múltiplos erros detectados! Verifique o console.',
                type: 'error'
            });
        }
    } catch (err) {
        console.error('Erro ao registrar erro:', err);
    }
}

/**
 * Obtém métricas de performance
 */
export function getPerformanceMetrics() {
    return {
        performance: performanceLogs,
        errors: errorLogs
    };
}

/**
 * Limpa logs em memória
 */
export function limparLogs() {
    performanceLogs = [];
    errorLogs = [];
} 