// ═══════════════════════════════════════════════════════
//  FlickHub — server.js
//  Node.js + Express + MySQL2 + Bcrypt + node-fetch
//  TMDB API key is HIDDEN here — never exposed to frontend
//  Auto-creates the User table on first run
// ═══════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcrypt');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── MySQL Pool ──
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
});

// ── Auto-create User table ──
async function initDB() {
  const conn = await pool.getConnection();
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS User (
      UserId    VARCHAR(50)  PRIMARY KEY,
      name      VARCHAR(100) NOT NULL,
      password  VARCHAR(255) NOT NULL,
      email     VARCHAR(100) NOT NULL UNIQUE,
      phone     VARCHAR(15)  NOT NULL,
      createdAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  conn.release();
  console.log('✅ Database ready — User table exists');
}

// ══════════════════════════════════════════════════════
//  TMDB PROXY ROUTES
//  Frontend calls /api/tmdb/... → backend adds the key
//  The TMDB_API_KEY never leaves the server — 100% safe
// ══════════════════════════════════════════════════════

const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch(endpoint, res) {
  try {
    const nodeFetch = await import('node-fetch');
    const fetch = nodeFetch.default;
    const url = `${TMDB_BASE}${endpoint}?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('TMDB fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch from TMDB' });
  }
}

// Frontend calls these routes — no API key needed in HTML
app.get('/api/tmdb/trending',    (_, res) => tmdbFetch('/trending/movie/week', res));
app.get('/api/tmdb/top-rated',   (_, res) => tmdbFetch('/movie/top_rated', res));
app.get('/api/tmdb/now-playing', (_, res) => tmdbFetch('/movie/now_playing', res));
app.get('/api/tmdb/tv-popular',  (_, res) => tmdbFetch('/tv/popular', res));
app.get('/api/tmdb/upcoming',    (_, res) => tmdbFetch('/movie/upcoming', res));

// ══════════════════
//  AUTH ROUTES
// ══════════════════

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', message: 'FlickHub API running' });
});

// ── REGISTER ──
app.post('/api/register', async (req, res) => {
  try {
    const { userId, name, email, phone, password } = req.body;

    if (!userId || !name || !email || !phone || !password)
      return res.status(400).json({ success: false, message: 'All fields are required.' });

    if (userId.length < 4 || /\s/.test(userId))
      return res.status(400).json({ success: false, message: 'Invalid User ID.' });

    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password too short.' });

    const [existing] = await pool.execute(
      'SELECT UserId FROM User WHERE UserId = ? OR email = ?', [userId, email]
    );
    if (existing.length > 0)
      return res.status(409).json({ success: false, message: 'User ID or email already exists.' });

    const hashed = await bcrypt.hash(password, 12);
    await pool.execute(
      'INSERT INTO User (UserId, name, password, email, phone) VALUES (?, ?, ?, ?, ?)',
      [userId, name, hashed, email, phone]
    );

    console.log(`✅ Registered: ${userId}`);
    return res.status(201).json({ success: true, message: 'Account created!', userId });

  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── LOGIN ──
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ success: false, message: 'All fields required.' });

    const [rows] = await pool.execute(
      'SELECT * FROM User WHERE UserId = ? OR email = ?', [username, username]
    );

    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) {
      console.log(`❌ Failed login: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    console.log(`✅ Login: ${rows[0].UserId}`);
    return res.json({
      success:     true,
      message:     `Welcome back, ${rows[0].name}!`,
      userId:      rows[0].UserId,
      name:        rows[0].name,
      redirectUrl: '/index.html'
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Page Routes ──
app.get('/',         (_, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/login.html', (_, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (_, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/home',     (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/index.html', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Start ──
(async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n🎬 FlickHub running!`);
      console.log(`   Register : http://localhost:${PORT}/register`);
      console.log(`   Login    : http://localhost:${PORT}/`);
      console.log(`   Movies   : http://localhost:${PORT}/home\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
})();
