const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = Number(process.env.AUTH_SERVER_PORT || 4000);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stgeoargen',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true });
  } catch (error) {
    console.error('Health check failed: database not reachable', error);
    return res.status(500).json({ ok: false, message: 'Database not reachable' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'username, email and password are required' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim();

    const [existingRows] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [normalizedEmail, normalizedUsername],
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      return res.status(409).json({ message: 'Ein Konto mit dieser E-Mail oder diesem Benutzernamen existiert bereits.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const [insertResult] = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [normalizedUsername, normalizedEmail, passwordHash],
    );

    return res.status(201).json({
      user: {
        id: insertResult.insertId,
        username: normalizedUsername,
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error('Register failed:', error);
    return res.status(500).json({ message: 'Registrierung fehlgeschlagen. Bitte später erneut versuchen.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(String(password), user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ message: 'Anmeldung fehlgeschlagen. Bitte später erneut versuchen.' });
  }
});

async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log(`Database connection established (${process.env.DB_HOST || '127.0.0.1'}:${Number(process.env.DB_PORT || 3306)})`);

    app.listen(port, () => {
      console.log(`Auth API listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start Auth API: database connection check failed.');
    console.error('Please verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and that MySQL is running.');
    console.error(error);
    process.exit(1);
  }
}

startServer();
