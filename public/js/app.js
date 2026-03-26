// Инициализация приложения
window.addEventListener('load', async () => {
    updateAuthUI(!!currentToken);
    if (currentToken) {
        await loadWatchingCache();
    }
});

document.getElementById('back-btn').addEventListener('click', () => {
    history.back();
});

// Поиск
async function searchAnime() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return alert('Введите название');

    const container = document.getElementById('results');
    const btn = event.target;
    
    try {
        btn.disabled = true;
        btn.textContent = 'Поиск...';
        
        const res = await fetch(`${API_URL}/search/${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`Сервер: ${res.status}`);

        const data = await res.json();
        const animes = data.response || [];

        container.innerHTML = '';

        if (!animes.length) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 1.1em;">Ничего не найдено</p>';
            return;
        }

        animes.forEach(anime => {
            const title = anime.title || 'Без названия';
            const poster = anime.poster || {};
            const posterSrc = poster.big || poster.medium || poster.small || '';
            const fullPoster = posterSrc.startsWith('//') ? 'https:' + posterSrc : posterSrc || 
                              'https://via.placeholder.com/140x210?text=No+Poster';
            const animeId = String(anime.anime_id || 0);
            const isWatching = watchingCache[animeId];

            const card = document.createElement('div');
            card.className = 'card' + (isWatching ? ' watching' : '');
            card.innerHTML = `
                ${isWatching ? '<div class="watching-badge">Смотрю</div>' : ''}
                <img src="${fullPoster}" alt="${title}" onerror="this.src='https://via.placeholder.com/140x210?text=Ошибка';">
                <h4>${title}</h4>
                <button onclick="navigateTo('/anime/${animeId}')">Серии</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Ошибка поиска:', err);
        container.innerHTML = `<p style="color: var(--btn-danger); font-size: 1.1em;">Ошибка: ${err.message}</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Искать';
    }
}

document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchAnime();
});