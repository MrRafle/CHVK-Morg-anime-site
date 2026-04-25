// ====================== API CONFIGURATION ======================
// Динамически определяем API URL на основе текущего хоста
const API_URL = (() => {
    const host = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    // Если порт указан (например, :3001 при обращении по IP), используем его.
    // Если порта нет (работает Nginx на 80/443), используем просто хост.
    if (port) {
        return `${protocol}//${host}:${port}`;
    }
    
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
