// Gerenciamento de tema
const themes = {
    dark: {
        '--interactive-bg-dark-primary': '#1a1a2e',
        '--interactive-bg-dark-secondary': '#24283b',
        '--interactive-bg-dark-tertiary': '#2a2f45',
        '--interactive-header-top-bg': '#2c3e50',
        '--interactive-text-light-primary': '#ffffff',
        '--interactive-text-light-secondary': '#e0e7ff',
        '--interactive-text-muted': '#c0c5e0'
    },
    light: {
        '--interactive-bg-dark-primary': '#f8fafc',
        '--interactive-bg-dark-secondary': '#ffffff',
        '--interactive-bg-dark-tertiary': '#f1f5f9',
        '--interactive-header-top-bg': '#1e293b',
        '--interactive-text-light-primary': '#1e293b',
        '--interactive-text-light-secondary': '#334155',
        '--interactive-text-muted': '#64748b'
    }
};

export const setupTheme = () => {
    // Verificar preferência salva
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    // Adicionar botão de alternar tema
    addThemeToggle();
};

const applyTheme = (themeName) => {
    const theme = themes[themeName];
    Object.entries(theme).forEach(([property, value]) => {
        document.documentElement.style.setProperty(property, value);
    });
    
    // Atualizar classes do body
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${themeName}`);
    
    // Salvar preferência
    localStorage.setItem('theme', themeName);
};

const addThemeToggle = () => {
    const headerActions = document.querySelector('.header-top-row .actions-area');
    if (!headerActions) return;
    
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle ml-4 p-2 rounded-lg hover:bg-opacity-10 hover:bg-white transition-colors';
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.setAttribute('aria-label', 'Alternar tema');
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        
        // Atualizar ícone
        themeToggle.innerHTML = `<i class="fas fa-${newTheme === 'dark' ? 'moon' : 'sun'}"></i>`;
    });
    
    headerActions.insertBefore(themeToggle, headerActions.firstChild);
};

// Função para obter tema atual
export const getCurrentTheme = () => {
    return localStorage.getItem('theme') || 'dark';
};

// Função para verificar se o tema atual é escuro
export const isDarkTheme = () => {
    return getCurrentTheme() === 'dark';
}; 