function showModal() { 
    document.getElementById('auth-modal').style.display = 'flex'; 
    switchTab(0); 
}

function hideModal() { 
    document.getElementById('auth-modal').style.display = 'none'; 
}

function switchTab(tab) {
    document.getElementById('login-form').style.display = tab === 0 ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 1 ? 'block' : 'none';
    document.getElementById('tab-login').classList.toggle('active', tab === 0);
    document.getElementById('tab-register').classList.toggle('active', tab === 1);
}

async function performRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!email || !password) return alert('Заполните все поля');

    const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    alert(data.success ? 'Регистрация успешна!' : (data.error || 'Ошибка'));
    if (data.success) switchTab(0);
}

async function performLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
        currentToken = data.token;
        localStorage.setItem('userToken', currentToken);
        updateAuthUI(true);
        hideModal();
        await loadWatchingCache();
        alert('Вы вошли!');
    } else {
        alert((data.error || 'Неверные данные'));
    }
}

function logout() {
    currentToken = null;
    watchingCache = {};
    localStorage.removeItem('userToken');
    updateAuthUI(false);
}

function updateAuthUI(loggedIn) {
    document.getElementById('login-btn').style.display = loggedIn ? 'none' : 'inline';
    document.getElementById('logout-btn').style.display = loggedIn ? 'inline' : 'none';
    document.getElementById('profile-nav-btn').style.display = loggedIn ? 'inline' : 'none';
}