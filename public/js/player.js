async function loadTitle(id) {
    if (!id) return alert('ID аниме не найден');

    currentAnimeId = id;

    document.getElementById('player').innerHTML = '';
    document.getElementById('controls').style.display = 'block';
    document.getElementById('dubbing-select').innerHTML = '<option value="">Загрузка...</option>';
    document.getElementById('player-select').innerHTML = '<option value="">Выберите плеер</option>';
    document.getElementById('episode-select').innerHTML = '<option value="">Выберите серию</option>';

    try {
        const [animeRes, epsRes, progress] = await Promise.all([
            fetch(`${API_URL}/anime/${id}`),
            fetch(`${API_URL}/anime/${id}/videos`),
            getWatchProgress(id)
        ]);

        if (!animeRes.ok || !epsRes.ok) throw new Error('Не удалось загрузить данные');

        const anime = (await animeRes.json()).response || await animeRes.json();
        const epsData = await epsRes.json();

        // Заполнение информации об аниме (оставляем как было)
        document.getElementById('anime-title').textContent = anime.title || 'Без названия';
        document.getElementById('anime-desc').textContent = anime.description || 'Описание отсутствует';

        const posterSrc = (anime.poster?.huge || anime.poster?.big || anime.poster?.medium || '');
        const fullPoster = posterSrc.startsWith('//') ? 'https:' + posterSrc : posterSrc || 
                          'https://via.placeholder.com/300x420?text=No+Poster';
        document.getElementById('anime-poster').innerHTML = 
            `<img src="${fullPoster}" alt="${anime.title}" onerror="this.src='https://via.placeholder.com/300x420?text=Ошибка';">`;

        // Детали аниме
        const detailsList = document.getElementById('anime-details');
        detailsList.innerHTML = '';
        const seasons = {1:'Зима',2:'Весна',3:'Лето',4:'Осень'};
        const seasonName = anime.season ? seasons[anime.season] || anime.season : '';

        const details = [
            { label: 'Статус', value: anime.status?.title },
            { label: 'Тип', value: anime.type?.name },
            { label: 'Год выхода', value: seasonName + (anime.year ? ` ${anime.year}` : '') },
            { label: 'Возраст', value: anime.min_age?.title_long || anime.min_age?.title },
            { label: 'Жанры', value: (anime.genres || []).map(g => g.title).filter(Boolean).join(', ') || '—' },
            { label: 'Студия', value: (anime.studios || []).map(s => s.title).filter(Boolean).join(', ') || '—' },
            { label: 'Режиссёр', value: (anime.directors || []).map(d => d.name || d.title).filter(Boolean).join(', ') || '—' },
            { label: 'Серий', value: anime.episodes?.count || anime.episodes || '—' }
        ];

        details.forEach(item => {
            if (item.value && item.value !== '—') {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
                detailsList.appendChild(li);
            }
        });

        // Группировка серий
        const videos = epsData.response?.videos || epsData.videos || epsData.response || [];
        if (!videos.length) {
            document.getElementById('episode-select').innerHTML = '<option value="">Нет серий</option>';
            return;
        }

        const groupedByDubAndPlayer = {};
        videos.forEach(vid => {
            const dub = vid.data?.dubbing || vid.dubbing || 'Оригинал';
            const playerName = vid.data?.player || vid.player || 'Плеер';
            const ep = String(vid.number || vid.episode || vid.series || '').trim();
            const url = vid.iframe_url || vid.player || vid.embed || '';
            const index = vid.index || 0;

            if (!ep || !url) return;

            if (!groupedByDubAndPlayer[dub]) groupedByDubAndPlayer[dub] = {};
            if (!groupedByDubAndPlayer[dub][playerName]) groupedByDubAndPlayer[dub][playerName] = [];

            groupedByDubAndPlayer[dub][playerName].push({ number: ep, url, index });
        });

        // Сортировка серий
        Object.keys(groupedByDubAndPlayer).forEach(dub => {
            Object.keys(groupedByDubAndPlayer[dub]).forEach(player => {
                groupedByDubAndPlayer[dub][player].sort((a, b) => 
                    a.index - b.index || Number(a.number) - Number(b.number)
                );
            });
        });

        // Заполнение селекта озвучек
        const dubSelect = document.getElementById('dubbing-select');
        dubSelect.innerHTML = '<option value="">Выберите озвучку</option>';
        Object.keys(groupedByDubAndPlayer).sort().forEach(dub => {
            const opt = document.createElement('option');
            opt.value = dub;
            opt.textContent = dub;
            dubSelect.appendChild(opt);
        });

        // Назначаем обработчики изменений
        dubSelect.onchange = () => updatePlayersForDub(groupedByDubAndPlayer);
        document.getElementById('player-select').onchange = () => updateEpisodesForPlayer(groupedByDubAndPlayer);
        document.getElementById('episode-select').onchange = () => playSelected();

        // ===== ВОССТАНОВЛЕНИЕ ПРОГРЕССА + АВТОЗАПУСК ПЛЕЕРА =====
        const shouldAutoPlay = !!(progress && progress.dubbing && progress.episode && groupedByDubAndPlayer[progress.dubbing]);

        if (shouldAutoPlay) {
            console.log(`Восстановлено: ${progress.dubbing} / серия ${progress.episode}`);

            // Выбираем озвучку
            let dubFound = false;
            for (let i = 0; i < dubSelect.options.length; i++) {
                if (dubSelect.options[i].value === progress.dubbing) {
                    dubSelect.selectedIndex = i;
                    dubFound = true;
                    break;
                }
            }
            if (!dubFound && dubSelect.options.length > 1) dubSelect.selectedIndex = 1;

            updatePlayersForDub(groupedByDubAndPlayer, true);

            // Выбираем плеер
            const playerSelect = document.getElementById('player-select');
            let playerFound = false;
            for (let i = 0; i < playerSelect.options.length; i++) {
                if (playerSelect.options[i].value === (progress.player || '')) {
                    playerSelect.selectedIndex = i;
                    playerFound = true;
                    break;
                }
            }
            if (!playerFound && playerSelect.options.length > 1) playerSelect.selectedIndex = 1;

            updateEpisodesForPlayer(groupedByDubAndPlayer, true);

            // Выбираем серию
            const epSelect = document.getElementById('episode-select');
            let epFound = false;
            for (let i = 0; i < epSelect.options.length; i++) {
                if (epSelect.options[i].value === String(progress.episode)) {
                    epSelect.selectedIndex = i;
                    epFound = true;
                    break;
                }
            }
            if (!epFound && epSelect.options.length > 1) epSelect.selectedIndex = 1;

            // ←←←←← КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: автоматически запускаем плеер
            setTimeout(() => {
                playSelected();
            }, 300);   // небольшая задержка, чтобы селекты успели обновиться

        } else {
            // Нет прогресса — просто выбираем первые значения
            if (dubSelect.options.length > 1) {
                dubSelect.selectedIndex = 1;
                updatePlayersForDub(groupedByDubAndPlayer);
            }
        }

    } catch (err) {
        console.error('Ошибка загрузки аниме:', err);
        alert('Не удалось загрузить аниме: ' + err.message);
    }
}

async function playSelected() {
    const epSelect = document.getElementById('episode-select');
    if (!epSelect.value) return;

    const option = epSelect.selectedOptions[0];
    const url = option.dataset.url;
    if (!url) return;

    const selectedDub = document.getElementById('dubbing-select').value;
    const selectedPlayer = document.getElementById('player-select').value;
    const selectedEp = epSelect.value;

    document.getElementById('player').innerHTML = `
        <iframe src="${url}" allowfullscreen frameborder="0"></iframe>`;

    if (currentToken && currentAnimeId) {
        const title = document.getElementById('anime-title').textContent;
        const poster = document.querySelector('#anime-poster img')?.src || null;
        await saveWatchProgress(currentAnimeId, title, poster, selectedDub, selectedPlayer, selectedEp);
    }
}