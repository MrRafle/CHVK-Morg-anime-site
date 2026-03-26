function router() {
    const path = window.location.pathname;
    
    if (path.startsWith('/anime/')) {
        const id = path.split('/')[2];
        showPage('anime-page');
        if (id) loadTitle(id);
    } else if (path === '/profile') {
        showProfilePage();
    } else {
        showPage('search-page');
    }
}

// Обработка переходов по истории браузера
window.addEventListener('popstate', router);

// Инициализация роутера при загрузке приложения
window.addEventListener('DOMContentLoaded', () => {
    router();
}, { once: true });