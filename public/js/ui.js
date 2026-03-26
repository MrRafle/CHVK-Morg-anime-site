function updatePlayersForDub(grouped, skipAutoPlay = false) {
    const selectedDub = document.getElementById('dubbing-select').value;
    if (!selectedDub) return;

    const players = Object.keys(grouped[selectedDub] || {}).sort();
    const playerSelect = document.getElementById('player-select');
    playerSelect.innerHTML = '<option value="">Выберите плеер</option>';

    players.forEach(player => {
        const opt = document.createElement('option');
        opt.value = player;
        opt.textContent = player;
        playerSelect.appendChild(opt);
    });

    if (!skipAutoPlay && players.length > 0) {
        playerSelect.selectedIndex = 1;
        updateEpisodesForPlayer(grouped);
    }
}

function updateEpisodesForPlayer(grouped, skipAutoPlay = false) {
    const selectedDub = document.getElementById('dubbing-select').value;
    const selectedPlayer = document.getElementById('player-select').value;
    if (!selectedDub || !selectedPlayer) return;

    const episodes = grouped[selectedDub][selectedPlayer] || [];
    const epSelect = document.getElementById('episode-select');
    epSelect.innerHTML = '<option value="">Выберите серию</option>';

    episodes.forEach(ep => {
        const opt = document.createElement('option');
        opt.value = ep.number;
        opt.textContent = `Серия ${ep.number}`;
        opt.dataset.url = ep.url;
        epSelect.appendChild(opt);
    });

    if (!skipAutoPlay && epSelect.options.length > 1) {
        epSelect.selectedIndex = 1;
        playSelected();
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}