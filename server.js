const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

// Static marketing site lives here
const STATIC_DIR    = path.join(__dirname, 'ui_kits', 'website');
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

// Admin credentials (override via Railway env vars)
const ADMIN_USER = process.env.ADMIN_USER || 'vlasnik';
const ADMIN_PASS = process.env.ADMIN_PASS || 'H!lls826';

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
const ADMIN_HASH = sha256(ADMIN_PASS);

// In-memory session tokens (reset on server restart — acceptable for single-owner use)
const sessions = new Set();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// /admin route must be declared BEFORE static middleware
// so Express handles it instead of looking for a file named "admin"
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Everything else: serve the static marketing site
app.use(express.static(STATIC_DIR));

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadContacts() {
  try { return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); }
  catch { return []; }
}
function saveContacts(list) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(list, null, 2), 'utf8');
}
function authGuard(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

// ── Public API ────────────────────────────────────────────────────────────────

// POST /api/contact  — called by the Kontakt form on the main site
app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Nedostaju podaci' });
  }
  const contacts = loadContacts();
  contacts.unshift({
    id:        Date.now().toString(36) + crypto.randomBytes(2).toString('hex'),
    status:    'pending',
    createdAt: new Date().toISOString(),
    name, email, phone: phone || '', message,
  });
  saveContacts(contacts);
  res.json({ ok: true });
});

// ── Admin API (all routes require valid session token) ────────────────────────

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && sha256(password || '') === ADMIN_HASH) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    return res.json({ ok: true, token });
  }
  res.status(401).json({ ok: false, error: 'Pogrešno korisničko ime ili lozinka' });
});

// GET /api/admin/contacts
app.get('/api/admin/contacts', authGuard, (_req, res) => {
  res.json(loadContacts());
});

// PATCH /api/admin/contacts/:id  — set status: pending | accepted | rejected
app.patch('/api/admin/contacts/:id', authGuard, (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Nevaljan status' });
  }
  const contacts = loadContacts();
  const idx = contacts.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Nije pronađeno' });
  contacts[idx].status = status;
  saveContacts(contacts);
  res.json({ ok: true });
});

// DELETE /api/admin/contacts/:id
app.delete('/api/admin/contacts/:id', authGuard, (req, res) => {
  const contacts = loadContacts();
  const next = contacts.filter(c => c.id !== req.params.id);
  if (next.length === contacts.length) return res.status(404).json({ ok: false });
  saveContacts(next);
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Padel centar Hills running on :${PORT}`));
