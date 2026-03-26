const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const X_APP_TOKEN = '_vl8tp821akabyzl';
const API_BASE = 'https://api.yani.tv';

const HEADERS = {
  'X-Application': X_APP_TOKEN,
  'Accept': 'application/json, image/avif, image/webp',
  'Accept-Language': 'ru',
  'User-Agent': 'Mozilla/5.0'
};

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432
});

// ====================== MIDDLEWARE ======================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

// ====================== ИНИЦИАЛИЗАЦИЯ БД ======================
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watch_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      anime_id INTEGER NOT NULL,
      anime_title TEXT,
      anime_poster TEXT,
      dubbing TEXT,
      player TEXT,
      episode VARCHAR(50),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, anime_id)
    );
  `);

  // Миграция (на всякий случай)
  const columns = [
    { name: 'anime_title', type: 'TEXT' },
    { name: 'anime_poster', type: 'TEXT' },
    { name: 'dubbing', type: 'TEXT' },
    { name: 'player', type: 'TEXT' },
    { name: 'episode', type: 'VARCHAR(50)' }
  ];

  for (const col of columns) {
    await pool.query(`ALTER TABLE watch_progress ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`)
      .catch(() => {});
  }

  console.log('✅ База данных инициализирована');
}

initDB().catch(console.error);

// ====================== РЕГИСТРАЦИЯ ======================
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', 
      [email.toLowerCase(), hashed]);
    res.json({ success: true, message: 'Регистрация прошла успешно' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Пользователь уже существует' });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ====================== ЛОГИН ======================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (user.rows.length === 0 || !(await bcrypt.compare(password, user.rows[0].password_hash))) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ====================== СОХРАНЕНИЕ ПРОГРЕССА ======================
app.post('/api/history', authMiddleware, async (req, res) => {
  const { animeId, animeTitle, animePoster, dubbing, player, episode } = req.body;

  if (!animeId || !episode) {
    return res.status(400).json({ error: 'animeId и episode обязательны' });
  }

  try {
    await pool.query(`
      INSERT INTO watch_progress (user_id, anime_id, anime_title, anime_poster, dubbing, player, episode, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, anime_id)
      DO UPDATE SET
        anime_title  = COALESCE($3, watch_progress.anime_title),
        anime_poster = COALESCE($4, watch_progress.anime_poster),
        dubbing      = $5,
        player       = $6,
        episode      = $7,
        updated_at   = CURRENT_TIMESTAMP
    `, [req.user.userId, animeId, animeTitle || null, animePoster || null, dubbing, player, episode]);

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка сохранения:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ====================== ПОЛУЧЕНИЕ ПРОГРЕССА ======================
app.get('/api/history/:animeId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.json(null);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT dubbing, player, episode, anime_title, anime_poster FROM watch_progress WHERE user_id = $1 AND anime_id = $2',
      [decoded.userId, req.params.animeId]
    );
    res.json(result.rows[0] || null);
  } catch {
    res.json(null);
  }
});

app.get('/api/history', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT anime_id, anime_title, anime_poster, dubbing, player, episode, updated_at
      FROM watch_progress 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `, [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/history/:animeId', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM watch_progress WHERE user_id = $1 AND anime_id = $2',
      [req.user.userId, req.params.animeId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ====================== API YANI.TV ======================
app.get('/search/:query', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/search`, {
      params: { q: req.params.query.trim(), limit: 12, offset: 0 },
      headers: HEADERS,
      timeout: 30000
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка API' });
  }
});

app.get('/anime/:id', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/anime/${req.params.id}`, { headers: HEADERS });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Не удалось загрузить аниме' });
  }
});

app.get('/anime/:id/videos', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/anime/${req.params.id}/videos`, {
      params: req.query.translation ? { translation: req.query.translation } : {},
      headers: HEADERS
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Не удалось загрузить серии' });
  }
});

// ====================== SPA FALLBACK ======================
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на 0.0.0.0:${PORT}`);
});