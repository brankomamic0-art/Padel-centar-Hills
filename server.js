const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

const STATIC_DIR   = path.join(__dirname, 'ui_kits', 'website');
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const ADMIN_USER   = process.env.ADMIN_USER || 'vlasnik';
const ADMIN_PASS   = process.env.ADMIN_PASS || 'H!lls826';
let   ADMIN_HASH;

const sessions = new Set();

ADMIN_HASH = hash(ADMIN_PASS);

app.use(express.json());
app.use(express.static(STATIC_DIR));

// ---------- helpers ----------
function hash(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
function loadBookings() {
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8')); }
  catch { return []; }
}
function saveBookings(list) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(list, null, 2), 'utf8');
}
function authGuard(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !sessions.has(token)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
}

// ---------- public: submit booking ----------
app.post('/api/booking', (req, res) => {
  const { name, surname, phone, date, court, startTime, endTime, duration, price, racket } = req.body;
  if (!name || !date || !court || !startTime) return res.status(400).json({ ok: false, error: 'Nedostaju podaci' });

  const bookings = loadBookings();
  const entry = {
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    status:    'pending',
    createdAt: new Date().toISOString(),
    name, surname, phone,
    date, court, startTime, endTime, duration, price, racket,
  };
  bookings.unshift(entry);
  saveBookings(bookings);
  res.json({ ok: true, id: entry.id });
});

// ---------- admin: login ----------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && hash(password || '') === ADMIN_HASH) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    return res.json({ ok: true, token });
  }
  res.status(401).json({ ok: false, error: 'Pogrešno korisničko ime ili lozinka' });
});

// ---------- admin: list bookings ----------
app.get('/api/admin/bookings', authGuard, (req, res) => {
  res.json(loadBookings());
});

// ---------- admin: update status ----------
app.patch('/api/admin/bookings/:id', authGuard, (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status))
    return res.status(400).json({ ok: false, error: 'Nevaljan status' });

  const bookings = loadBookings();
  const idx = bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Rezervacija nije pronađena' });

  bookings[idx].status = status;
  saveBookings(bookings);
  res.json({ ok: true });
});

// ---------- admin: delete booking ----------
app.delete('/api/admin/bookings/:id', authGuard, (req, res) => {
  const bookings = loadBookings();
  const filtered = bookings.filter(b => b.id !== req.params.id);
  if (filtered.length === bookings.length) return res.status(404).json({ ok: false });
  saveBookings(filtered);
  res.json({ ok: true });
});

// ---------- serve admin page at secret URL ----------
app.get('/admin-hills', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
