async function saveWatchProgress(animeId, animeTitle, animePoster, dubbing, player, episode) {
    if (!currentToken || !animeId || !episode) return;
    try {
        await fetch(`${API_URL}/api/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ animeId, animeTitle, animePoster, dubbing, player, episode })
        });
        watchingCache[String(animeId)] = true;
    } catch (e) { 
        console.error('Ошибка сохранения прогресса:', e); 
    }
}

async function getWatchProgress(animeId) {
    if (!currentToken) return null;
    try {
        const res = await fetch(`${API_URL}/api/history/${animeId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        return await res.json();
    } catch { 
        return null; 
    }
}

async function loadWatchingCache() {
    if (!currentToken) return;
    try {
        const res = await fetch(`${API_URL}/api/history`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const list = await res.json();
        watchingCache = {};
        list.forEach(item => watchingCache[String(item.anime_id)] = true);
    } catch (e) { 
        console.error(e); 
    }
}

async function showProfilePage() {
    showPage('profile-page');
    const container = document.getElementById('profile-list');
    container.innerHTML = '<p style="color: var(--text-secondary);">⏳ Загрузка...</p>';

    if (!currentToken) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 1.1em;">Войдите, чтобы видеть историю просмотра.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/history`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);

        const list = await res.json();

        if (!list || list.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 1.1em;">Вы ещё ничего не смотрели.</p>';
            return;
        }

        container.innerHTML = '';
        list.forEach(item => {
            const poster = item.anime_poster 
                ? (item.anime_poster.startsWith('//') ? 'https:' + item.anime_poster : item.anime_poster) 
                : 'https://via.placeholder.com/120x180?text=No+Poster';

            const card = document.createElement('div');
            card.className = 'profile-card';
            card.innerHTML = `
                <img src="${poster}" onerror="this.src='https://via.placeholder.com/120x180?text=Ошибка'">
                <h4>${item.anime_title || 'Аниме #' + item.anime_id}</h4>
                <div class="ep-info">
                    ${item.dubbing ? item.dubbing + '<br>' : ''}
                    ${item.episode ? 'Серия ' + item.episode : ''}
                </div>
                <button onclick="navigateTo('/anime/${item.anime_id}')">▶ Продолжить</button>
                <button class="delete-btn" onclick="deleteFromHistory(${item.anime_id}, this)">✕ Удалить</button>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error('Ошибка загрузки профиля:', e);
        container.innerHTML = '<p style="color: var(--btn-danger); font-size: 1.1em;">Ошибка загрузки: ' + e.message + '</p>';
    }
}

async function deleteFromHistory(animeId, btn) {
    if (!currentToken) return;
    try {
        await fetch(`${API_URL}/api/history/${animeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        delete watchingCache[String(animeId)];
        btn.closest('.profile-card').remove();
    } catch (e) {
        console.error(e);
    }
}