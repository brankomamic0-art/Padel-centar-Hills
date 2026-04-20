const express  = require('express');
const Database = require('better-sqlite3');
const path     = require('path');
const crypto   = require('crypto');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

const STATIC_DIR = path.join(__dirname, 'ui_kits', 'website');

const ADMIN_USER  = process.env.ADMIN_USER  || 'vlasnik';
const ADMIN_PASS  = process.env.ADMIN_PASS  || 'H!lls826';
const RESEND_KEY  = process.env.RESEND_KEY  || 're_12u6jGHZ_KbjnD9kFzhu88FvBMFagA4tp';
const FROM_EMAIL  = 'Padel centar Hills <noreply@mamicwebdesign.com>';

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
const ADMIN_HASH = sha256(ADMIN_PASS);
const sessions   = new Set();

// ── Database (SQLite) ─────────────────────────────────────────────────────────
// Use /data if a Railway Volume is mounted there, otherwise fall back to local
const DB_DIR  = fs.existsSync('/data') ? '/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'contacts.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id         TEXT    PRIMARY KEY,
    status     TEXT    NOT NULL DEFAULT 'pending',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL DEFAULT '',
    phone      TEXT    NOT NULL DEFAULT '',
    message    TEXT    NOT NULL,
    type       TEXT    NOT NULL DEFAULT 'contact'
  )
`);
// Add type column if upgrading from older schema
try { db.exec("ALTER TABLE contacts ADD COLUMN type TEXT NOT NULL DEFAULT 'contact'"); } catch {}
console.log(`DB ready at ${DB_PATH}`);

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
app.post('/api/contact', (req, res) => {
  const { name, email = '', phone = '', message, type = 'contact' } = req.body;
  if (!name || !message)
    return res.status(400).json({ ok: false, error: 'Nedostaju podaci' });

  const id = Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  db.prepare(
    'INSERT INTO contacts (id, name, email, phone, message, type) VALUES (?,?,?,?,?,?)'
  ).run(id, name, email, phone, message, type);

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
app.get('/api/admin/contacts', authGuard, (_req, res) => {
  const rows = db.prepare(
    'SELECT * FROM contacts ORDER BY created_at DESC'
  ).all();
  res.json(rows);
});

// ── Admin: update status ──────────────────────────────────────────────────────
app.patch('/api/admin/contacts/:id', authGuard, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status))
    return res.status(400).json({ ok: false, error: 'Nevaljan status' });

  const contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id);
  if (!contact) return res.status(404).json({ ok: false, error: 'Nije pronađeno' });

  db.prepare('UPDATE contacts SET status=? WHERE id=?').run(status, req.params.id);

  // Send email notification to customer if they provided an email
  if (contact.email && (status === 'accepted' || status === 'rejected')) {
    sendStatusEmail(contact, status).catch(err =>
      console.error('Email send failed:', err.message)
    );
  }

  res.json({ ok: true });
});

async function sendStatusEmail(contact, status) {
  const accepted = status === 'accepted';

  const subject = accepted
    ? 'Vaša rezervacija je prihvaćena — Padel centar Hills'
    : 'Vaša rezervacija nije prihvaćena — Padel centar Hills';

  const color   = accepted ? '#3fb950' : '#f85149';
  const heading = accepted ? 'Rezervacija prihvaćena ✓' : 'Rezervacija nije prihvaćena';
  const body    = accepted
    ? `<p style="font-size:15px;color:#444;margin:0 0 16px">Dragi/a <strong>${contact.name}</strong>,<br><br>Vaša rezervacija je <strong style="color:#3fb950">prihvaćena</strong>. Vidimo se na terenu!</p>`
    : `<p style="font-size:15px;color:#444;margin:0 0 16px">Dragi/a <strong>${contact.name}</strong>,<br><br>Nažalost, traženi termin <strong>nije dostupan</strong>. Molimo kontaktirajte nas za alternativni termin.</p>`;

  const msgRows = contact.message.split('\n').map(line => {
    const [k, ...v] = line.split(':');
    return v.length
      ? `<tr><td style="padding:7px 12px;background:#f6f8fa;font-weight:600;width:160px;font-size:14px">${k.trim()}</td><td style="padding:7px 12px;font-size:14px">${v.join(':').trim()}</td></tr>`
      : `<tr><td colspan="2" style="padding:7px 12px;font-weight:700;background:#eaf4fb;font-size:14px">${line}</td></tr>`;
  }).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:${color};padding:20px 28px;border-radius:10px 10px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">${heading}</h1>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #e0e0e0;border-top:none">
        ${body}
        <table style="border-collapse:collapse;width:100%;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">
          ${msgRows}
        </table>
        <p style="margin:24px 0 0;font-size:13px;color:#888">
          Padel centar Hills · Butmirska cesta 18, Ilidža, Sarajevo<br>
          Tel: <a href="tel:+38761532892" style="color:#b3f000">+387 61 532 892</a>
        </p>
      </div>
    </div>`;

  const r = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [contact.email],
      subject,
      html,
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || r.status);
  }
}

// ── Admin: delete ─────────────────────────────────────────────────────────────
app.delete('/api/admin/contacts/:id', authGuard, (req, res) => {
  const info = db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ ok: false });
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Running on :${PORT}`));
