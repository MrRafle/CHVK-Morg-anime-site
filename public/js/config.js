// ====================== API CONFIGURATION ======================
// Динамически определяем API URL на основе текущего хоста
const API_URL = (() => {
    const host = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    // Для localhost - используем тот же порт (по умолчанию 3001)
    if (host === 'localhost' || host === '127.0.0.1') {
        return `${protocol}//${host}:${port || 3001}`;
    }
    
    // Для продакшена - используем текущий протокол и хост без указания порта
    // (так как nginx/другой reverse proxy на порту 80/443)
    return `${protocol}//${host}`;
})();

console.log('API URL:', API_URL);

let currentToken = localStorage.getItem('userToken') || null;
let currentAnimeId = null;
let watchingCache = {};

// ====================== НАВИГАЦИЯ ======================
function navigateTo(path) {
    window.history.pushState(null, '', path);
    router();
}