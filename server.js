const express = require('express');
const { Pool } = require('pg');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

const STATIC_DIR = path.join(__dirname, 'ui_kits', 'website');

const ADMIN_USER = process.env.ADMIN_USER || 'vlasnik';
const ADMIN_PASS = process.env.ADMIN_PASS || 'H!lls826';

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
const ADMIN_HASH = sha256(ADMIN_PASS);
const sessions   = new Set();

// ── Database ──────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id         TEXT        PRIMARY KEY,
      status     TEXT        NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name       TEXT        NOT NULL,
      email      TEXT        NOT NULL DEFAULT '',
      phone      TEXT        NOT NULL DEFAULT '',
      message    TEXT        NOT NULL
    )
  `);
  console.log('DB ready');
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use(express.static(STATIC_DIR));

// ── Auth helper ───────────────────────────────────────────────────────────────
function authGuard(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !sessions.has(token))
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
}

// ── Public: save contact/booking query ───────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email = '', phone = '', message } = req.body;
  if (!name || !message)
    return res.status(400).json({ ok: false, error: 'Nedostaju podaci' });

  const id = Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  await pool.query(
    'INSERT INTO contacts (id, name, email, phone, message) VALUES ($1,$2,$3,$4,$5)',
    [id, name, email, phone, message]
  );
  res.json({ ok: true, id });
});

// ── Admin: login ──────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && sha256(password || '') === ADMIN_HASH) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    return res.json({ ok: true, token });
  }
  res.status(401).json({ ok: false, error: 'Pogrešno korisničko ime ili lozinka' });
});

// ── Admin: list all contacts ──────────────────────────────────────────────────
app.get('/api/admin/contacts', authGuard, async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM contacts ORDER BY created_at DESC'
  );
  res.json(rows);
});

// ── Admin: update status ──────────────────────────────────────────────────────
app.patch('/api/admin/contacts/:id', authGuard, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status))
    return res.status(400).json({ ok: false, error: 'Nevaljan status' });

  const { rowCount } = await pool.query(
    'UPDATE contacts SET status=$1 WHERE id=$2',
    [status, req.params.id]
  );
  if (!rowCount) return res.status(404).json({ ok: false, error: 'Nije pronađeno' });
  res.json({ ok: true });
});

// ── Admin: delete ─────────────────────────────────────────────────────────────
app.delete('/api/admin/contacts/:id', authGuard, async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM contacts WHERE id=$1',
    [req.params.id]
  );
  if (!rowCount) return res.status(404).json({ ok: false });
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB()
  .then(() => app.listen(PORT, () => console.log(`Running on :${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
