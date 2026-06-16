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
    // Фокусируем на input поле после переключения табов
    setTimeout(() => {
        const input = tab === 0 ? document.getElementById('login-username') : document.getElementById('reg-username');
        if (input) input.focus();
    }, 100);
}

// Обработка Enter в полях логина
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-username').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performLogin();
    });
    document.getElementById('login-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performLogin();
    });
    document.getElementById('reg-username').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performRegister();
    });
    document.getElementById('reg-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performRegister();
    });
});

async function performRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!username || !password) return alert('Заполните все поля');

    const btn = document.querySelector('#register-form .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Регистрация...';

    try {
        const res = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            alert('Регистрация успешна! Теперь войдите.');
            switchTab(0);
            document.getElementById('login-username').value = username;
        } else {
            alert(data.error || 'Ошибка регистрации');
        }
    } catch (e) {
        alert('Ошибка соединения с сервером');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Зарегистрироваться';
    }
}

async function performLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!username || !password) return alert('Заполните все поля');

    const btn = document.querySelector('#login-form .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Вход...';

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success && data.token) {
            currentToken = data.token;
            currentUsername = data.username || username;
            localStorage.setItem('userToken', currentToken);
            localStorage.setItem('username', currentUsername);
            updateAuthUI(true);
            hideModal();
            await loadWatchingCache();
        } else {
            alert(data.error || 'Неверные данные');
        }
    } catch (e) {
        alert('Ошибка соединения с сервером');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Войти';
    }
}

function logout() {
    currentToken = null;
    currentUsername = null;
    watchingCache = {};
    localStorage.removeItem('userToken');
    localStorage.removeItem('username');
    updateAuthUI(false);
    navigateTo('/');
}

function updateAuthUI(loggedIn) {
    document.getElementById('login-btn').style.display = loggedIn ? 'none' : 'inline';
    document.getElementById('logout-btn').style.display = loggedIn ? 'inline' : 'none';
    document.getElementById('profile-nav-btn').style.display = loggedIn ? 'inline' : 'none';
    const userLabel = document.getElementById('username-label');
    if (userLabel) {
        userLabel.textContent = loggedIn && currentUsername ? currentUsername : '';
        userLabel.style.display = loggedIn ? 'inline' : 'none';
    }
}
