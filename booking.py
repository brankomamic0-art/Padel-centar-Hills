from fastapi import FastAPI, HTTPException, BackgroundTasks, Response, Depends, Cookie
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
import sqlite3, os, smtplib, secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = FastAPI(title="Booking Terena")

DB_PATH = "rezervacije.db"

# ── Konfiguracija ────────────────────────────────────────────────────────────
VLASNIK_USERNAME = "admin"          # korisničko ime vlasnika
VLASNIK_PASSWORD = "lozinka123"     # ← PROMIJENI OVO!

SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 587
SMTP_USER     = ""                  # tvoj Gmail
SMTP_PASSWORD = ""                  # App Password
VLASNIK_EMAIL = ""                  # kome idu obavijesti
VLASNIK_TEL   = "+387 61 532 892"
# ────────────────────────────────────────────────────────────────────────────

TERENI = [
    {"id": 1, "naziv": "Teren 1", "cijena_po_satu": 45.0},
    {"id": 2, "naziv": "Teren 2", "cijena_po_satu": 45.0},
    {"id": 3, "naziv": "Teren 3", "cijena_po_satu": 40.0},
]

TRAJANJA = [
    {"minuta": 60,  "label": "60 min"},
    {"minuta": 90,  "label": "90 min"},
    {"minuta": 120, "label": "120 min"},
]

# In-memory sesije: token -> korisničko_ime
sessions: dict[str, str] = {}


# ── DB ───────────────────────────────────────────────────────────────────────

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS rezervacije (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ime         TEXT    NOT NULL,
            email       TEXT    NOT NULL,
            telefon     TEXT,
            datum       TEXT    NOT NULL,
            pocetak     TEXT    NOT NULL,
            kraj        TEXT    NOT NULL,
            trajanje    INTEGER NOT NULL,
            teren_id    INTEGER NOT NULL,
            teren_naziv TEXT    NOT NULL,
            cijena      REAL    NOT NULL,
            status      TEXT    NOT NULL DEFAULT 'aktivna',
            kreirano    TEXT    NOT NULL
        )
    """)
    conn.commit()
    conn.close()


init_db()


def db_conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


# ── Auth ─────────────────────────────────────────────────────────────────────

def zahtijeva_login(session: str = Cookie(default=None)):
    if not session or session not in sessions:
        raise HTTPException(status_code=401, detail="Niste prijavljeni")
    return sessions[session]


class LoginIn(BaseModel):
    korisnicko_ime: str
    lozinka: str


@app.post("/api/login")
def login(cred: LoginIn, response: Response):
    if cred.korisnicko_ime != VLASNIK_USERNAME or cred.lozinka != VLASNIK_PASSWORD:
        raise HTTPException(status_code=401, detail="Pogrešno korisničko ime ili lozinka")
    token = secrets.token_hex(32)
    sessions[token] = cred.korisnicko_ime
    response.set_cookie(
        key="session", value=token,
        httponly=True, samesite="lax", max_age=86400 * 7  # 7 dana
    )
    return {"korisnik": cred.korisnicko_ime}


@app.post("/api/logout")
def logout(response: Response, session: str = Cookie(default=None)):
    if session and session in sessions:
        del sessions[session]
    response.delete_cookie("session")
    return {"poruka": "Odjavljeni ste"}


@app.get("/api/me")
def me(session: str = Cookie(default=None)):
    if session and session in sessions:
        return {"prijavljen": True, "korisnik": sessions[session]}
    return {"prijavljen": False, "korisnik": None}


# ── Modeli ───────────────────────────────────────────────────────────────────

class RezervacijaIn(BaseModel):
    ime: str
    email: str
    telefon: str = ""
    datum: str
    pocetak: str
    trajanje: int
    teren_id: int


class RezervacijaOut(RezervacijaIn):
    id: int
    kraj: str
    teren_naziv: str
    cijena: float
    status: str
    kreirano: str


# ── Helpers ──────────────────────────────────────────────────────────────────

def izracunaj_kraj(pocetak: str, trajanje: int) -> str:
    t = datetime.strptime(pocetak, "%H:%M") + timedelta(minutes=trajanje)
    return t.strftime("%H:%M")


def dohvati_teren(teren_id: int):
    return next((t for t in TERENI if t["id"] == teren_id), None)


def posalji_email(rez: dict):
    if not SMTP_USER or not SMTP_PASSWORD or not VLASNIK_EMAIL:
        return
    try:
        datum_hr = datetime.strptime(rez["datum"], "%Y-%m-%d").strftime("%-d. %B %Y")
    except Exception:
        datum_hr = rez["datum"]

    tijelo = (
        f"Nova rezervacija zaprimljena!\n\n"
        f"Ime:      {rez['ime']}\n"
        f"Email:    {rez['email']}\n"
        f"Telefon:  {rez['telefon'] or '-'}\n"
        f"Datum:    {datum_hr}\n"
        f"Teren:    {rez['teren_naziv']}\n"
        f"Termin:   {rez['pocetak']} – {rez['kraj']}\n"
        f"Trajanje: {rez['trajanje']} min\n"
        f"Cijena:   {rez['cijena']:.2f} KM\n"
    )
    msg = MIMEMultipart()
    msg["From"]    = SMTP_USER
    msg["To"]      = VLASNIK_EMAIL
    msg["Subject"] = f"Rezervacija – {rez['ime']} – {rez['datum']}"
    msg.attach(MIMEText(tijelo, "plain"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(SMTP_USER, VLASNIK_EMAIL, msg.as_string())
    except Exception:
        pass


def posalji_potvrdu_gostu(rez: dict):
    if not SMTP_USER or not SMTP_PASSWORD:
        return
    try:
        datum_hr = datetime.strptime(rez["datum"], "%Y-%m-%d").strftime("%-d. %B %Y")
    except Exception:
        datum_hr = rez["datum"]

    tijelo = (
        f"Poštovani/a {rez['ime']},\n\n"
        f"Vaša rezervacija je uspješno zaprimljena.\n\n"
        f"Datum:    {datum_hr}\n"
        f"Teren:    {rez['teren_naziv']}\n"
        f"Termin:   {rez['pocetak']} – {rez['kraj']}\n"
        f"Trajanje: {rez['trajanje']} min\n"
        f"Cijena:   {rez['cijena']:.2f} KM\n\n"
        f"Za pitanja nas kontaktirajte na: {VLASNIK_TEL}\n\nHvala i vidimo se!"
    )
    msg = MIMEMultipart()
    msg["From"]    = SMTP_USER
    msg["To"]      = rez["email"]
    msg["Subject"] = f"Potvrda rezervacije – {datum_hr}"
    msg.attach(MIMEText(tijelo, "plain"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(SMTP_USER, rez["email"], msg.as_string())
    except Exception:
        pass


# ── Javni API ────────────────────────────────────────────────────────────────

@app.get("/api/config")
def get_config():
    return {"vlasnik_tel": VLASNIK_TEL}


@app.get("/", response_class=HTMLResponse)
def index():
    with open(os.path.join(os.path.dirname(__file__), "index.html"), encoding="utf-8") as f:
        return f.read()


@app.get("/api/tereni")
def get_tereni():
    return TERENI


@app.get("/api/trajanja")
def get_trajanja():
    return TRAJANJA


@app.get("/api/slobodni-termini")
def slobodni_termini(datum: str, teren_id: int, trajanje: int):
    conn = db_conn()
    zauzeti = conn.execute(
        "SELECT pocetak, kraj FROM rezervacije WHERE datum=? AND teren_id=? AND status='aktivna'",
        (datum, teren_id)
    ).fetchall()
    conn.close()

    termini = []
    for h in range(8, 22):
        poc  = f"{h:02d}:00"
        kraj = izracunaj_kraj(poc, trajanje)
        if kraj > "22:00":
            break
        poc_dt  = datetime.strptime(poc, "%H:%M")
        kraj_dt = datetime.strptime(kraj, "%H:%M")
        slobodan = all(
            kraj_dt <= datetime.strptime(z["pocetak"], "%H:%M") or
            poc_dt  >= datetime.strptime(z["kraj"], "%H:%M")
            for z in zauzeti
        )
        termini.append({"pocetak": poc, "kraj": kraj, "slobodan": slobodan})
    return termini


@app.post("/api/rezervacije", response_model=RezervacijaOut, status_code=201)
def kreiraj(rez: RezervacijaIn, bg: BackgroundTasks):
    teren = dohvati_teren(rez.teren_id)
    if not teren:
        raise HTTPException(400, "Nepoznati teren")

    kraj     = izracunaj_kraj(rez.pocetak, rez.trajanje)
    cijena   = teren["cijena_po_satu"] * rez.trajanje / 60
    kreirano = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = db_conn()
    konflikti = conn.execute(
        """SELECT id FROM rezervacije
           WHERE datum=? AND teren_id=? AND status='aktivna'
             AND NOT (kraj <= ? OR pocetak >= ?)""",
        (rez.datum, rez.teren_id, rez.pocetak, kraj)
    ).fetchall()
    if konflikti:
        conn.close()
        raise HTTPException(409, "Termin nije dostupan")

    cur = conn.execute(
        """INSERT INTO rezervacije
             (ime, email, telefon, datum, pocetak, kraj, trajanje, teren_id, teren_naziv, cijena, kreirano)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (rez.ime, rez.email, rez.telefon, rez.datum, rez.pocetak, kraj,
         rez.trajanje, rez.teren_id, teren["naziv"], cijena, kreirano)
    )
    conn.commit()
    row = dict(conn.execute("SELECT * FROM rezervacije WHERE id=?", (cur.lastrowid,)).fetchone())
    conn.close()

    bg.add_task(posalji_email, row)
    bg.add_task(posalji_potvrdu_gostu, row)
    return row


# ── Zaštićeni admin API (zahtijeva prijavu) ──────────────────────────────────

@app.get("/api/rezervacije", response_model=list[RezervacijaOut])
def lista(
    datum: str = None,
    teren_id: int = None,
    _: str = Depends(zahtijeva_login),
):
    conn = db_conn()
    q, params = "SELECT * FROM rezervacije WHERE 1=1", []
    if datum:
        q += " AND datum=?"; params.append(datum)
    if teren_id:
        q += " AND teren_id=?"; params.append(teren_id)
    q += " ORDER BY datum, pocetak"
    rows = [dict(r) for r in conn.execute(q, params).fetchall()]
    conn.close()
    return rows


@app.delete("/api/rezervacije/{rid}")
def otkazi(rid: int, _: str = Depends(zahtijeva_login)):
    conn = db_conn()
    if not conn.execute("SELECT id FROM rezervacije WHERE id=?", (rid,)).fetchone():
        conn.close()
        raise HTTPException(404, "Nije pronađena")
    conn.execute("UPDATE rezervacije SET status='otkazana' WHERE id=?", (rid,))
    conn.commit()
    conn.close()
    return {"poruka": "Otkazana"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("booking:app", host="0.0.0.0", port=8000, reload=True)
