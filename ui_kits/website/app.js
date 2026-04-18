/* =========================================================
   Padel centar Hills — Booking wizard + lightbox + theme
   Vanilla JS — in-memory state only
   ========================================================= */

// ----- Constants -----
const OWNER_EMAIL = "brankomamic0@gmail.com";
const COURTS = ["Teren 1", "Teren 2", "Teren 3", "Teren 4"];
const GALLERY = ["1.webp","2.webp","3.webp","4.webp","5.webp","6.webp"]
  .map(f => `./assets/gallery/${f}`);

// ----- Theme toggle -----
const themeBtn = document.getElementById("theme-toggle");
function setTheme(t){
  document.documentElement.dataset.theme = t;
  themeBtn.setAttribute("aria-label", t === "light" ? "Uključi tamni način" : "Uključi svijetli način");
  themeBtn.innerHTML = t === "light"
    ? '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
    : '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
}
setTheme("dark");
themeBtn.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});

// ----- Mobile menu -----
const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
menuBtn?.addEventListener("click", () => mobileMenu.classList.toggle("open"));
mobileMenu?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mobileMenu.classList.remove("open")));

// ----- Scroll reveal -----
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// ----- Gallery + Lightbox -----
const lb = document.getElementById("lightbox");
const lbImg = document.getElementById("lb-img");
const lbCount = document.getElementById("lb-count");
let lbIdx = 0;
function openLB(i){ lbIdx = i; lb.classList.add("open"); updateLB(); document.body.style.overflow="hidden"; }
function closeLB(){ lb.classList.remove("open"); document.body.style.overflow=""; }
function updateLB(){
  lbImg.style.opacity = 0;
  setTimeout(() => {
    lbImg.src = GALLERY[lbIdx];
    lbImg.style.opacity = 1;
    lbCount.textContent = `${lbIdx+1} / ${GALLERY.length}`;
  }, 150);
}
function navLB(d){ lbIdx = (lbIdx + d + GALLERY.length) % GALLERY.length; updateLB(); }
document.querySelectorAll(".gallery-item").forEach((el, i) => el.addEventListener("click", () => openLB(i)));
document.getElementById("lb-close").addEventListener("click", closeLB);
document.getElementById("lb-prev").addEventListener("click", () => navLB(-1));
document.getElementById("lb-next").addEventListener("click", () => navLB(1));
lb.addEventListener("click", (e) => { if (e.target === lb) closeLB(); });
document.addEventListener("keydown", (e) => {
  if (!lb.classList.contains("open")) return;
  if (e.key === "Escape") closeLB();
  if (e.key === "ArrowRight") navLB(1);
  if (e.key === "ArrowLeft") navLB(-1);
});

// ===========================================================
// BOOKING WIZARD
// ===========================================================

const state = {
  step: 1,
  date: null,        // Date obj
  duration: null,    // 60 | 90 | 120
  courtIdx: null,
  startTime: null,   // "HH:MM"
  name: "", surname: "", phone: "", racket: false,
  calMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
};

// ----- Pricing logic -----
function isWeekend(d){ const w = d.getDay(); return w===0 || w===6; }
function isPeak(d, startHour){
  if (isWeekend(d)) return true;
  return startHour >= 16;
}
function priceFor(d, startHour, duration){
  const peak = isPeak(d, startHour);
  if (!peak){
    if (duration===60) return 25;
    if (duration===90) return 45;
    return null; // 120 not available off-peak
  }
  if (duration===60) return 45;
  if (duration===90) return 70;
  if (duration===120) return 85;
  return null;
}
// For duration step preview, use 8am if morning, 18 if peak-ish. But we haven't picked a time yet.
// Strategy: show OFF-PEAK pricing if weekday, PEAK pricing if weekend. 120 disabled if weekday.
function durationPreview(d){
  const weekend = isWeekend(d);
  return {
    60:  { price: weekend ? 45 : 25, disabled: false },
    90:  { price: weekend ? 70 : 45, disabled: false },
    120: { price: 85, disabled: !weekend, disabledReason: "Dostupno samo u udarnim terminima i vikendom" },
  };
}

// ----- Demo bookings (deterministic per-session) -----
// Map: "YYYY-MM-DD|duration|HH:MM|courtIdx" => true
const bookings = new Map();
function bkKey(dateStr, duration, time, courtIdx){
  return `${dateStr}|${duration}|${time}|${courtIdx}`;
}
function fmtDateKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
// Seeded PRNG so demo is stable across reloads within session
let seed = 42;
function rnd(){ seed = (seed*9301 + 49297) % 233280; return seed/233280; }

function generateSlotsForDay(dateStr, duration){
  // Returns array of "HH:MM" time slots
  const slots = [];
  const startHours = duration === 60 ? [...Array(16)].map((_,i)=>8+i) // 8..23
                   : duration === 90 ? [8,9.5,11,12.5,14,15.5,17,18.5,20,21.5] // ends by 23:00
                   : [8,10,12,14,16,18,20,22]; // 120 -> ends by 00:00
  startHours.forEach(h => {
    const hour = Math.floor(h);
    const mins = (h - hour) * 60;
    slots.push(`${String(hour).padStart(2,"0")}:${String(mins).padStart(2,"0")}`);
  });
  return slots;
}
function prePopulateBookings(dateStr, duration){
  const slots = generateSlotsForDay(dateStr, duration);
  slots.forEach(t => {
    COURTS.forEach((_, ci) => {
      const k = bkKey(dateStr, duration, t, ci);
      if (bookings.has(k)) return;
      // 35% chance
      if (rnd() < 0.35) bookings.set(k, true);
    });
  });
}

// ----- Calendar rendering -----
const MONTHS = ["Siječanj","Veljača","Ožujak","Travanj","Svibanj","Lipanj","Srpanj","Kolovoz","Rujan","Listopad","Studeni","Prosinac"];
const DOWS = ["Pon","Uto","Sri","Čet","Pet","Sub","Ned"];

function renderCalendar(){
  const m = state.calMonth;
  document.getElementById("cal-month").textContent = `${MONTHS[m.getMonth()]} ${m.getFullYear()}`;
  const grid = document.getElementById("cal-grid");
  grid.innerHTML = "";
  DOWS.forEach(d => { const el = document.createElement("div"); el.className="cal-dow"; el.textContent=d; grid.appendChild(el); });

  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  // convert JS Sunday=0 to Monday=0
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(m.getFullYear(), m.getMonth()+1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  for (let i=0;i<offset;i++){
    const e = document.createElement("div"); e.className="cal-day empty"; grid.appendChild(e);
  }
  for (let day=1; day<=daysInMonth; day++){
    const d = new Date(m.getFullYear(), m.getMonth(), day);
    const btn = document.createElement("button");
    btn.className = "cal-day";
    btn.type = "button";
    btn.textContent = day;
    if (d < today) btn.classList.add("disabled");
    if (isWeekend(d)) btn.classList.add("weekend");
    if (d.getTime() === today.getTime()) btn.classList.add("today");
    if (state.date && state.date.getTime() === d.getTime()) btn.classList.add("selected");
    btn.setAttribute("aria-label", `${day}. ${MONTHS[m.getMonth()]} ${m.getFullYear()}`);
    if (!btn.classList.contains("disabled")){
      btn.addEventListener("click", () => {
        state.date = d;
        renderCalendar();
        setTimeout(() => goStep(2), 150);
      });
    }
    grid.appendChild(btn);
  }
}
document.getElementById("cal-prev").addEventListener("click", () => {
  state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth()-1, 1);
  renderCalendar();
});
document.getElementById("cal-next").addEventListener("click", () => {
  state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth()+1, 1);
  renderCalendar();
});

// ----- Step switching -----
function goStep(n){
  state.step = n;
  document.querySelectorAll(".wz-panel").forEach(p => p.classList.remove("active"));
  document.getElementById(`wz-step-${n}`).classList.add("active");
  // progress
  document.querySelectorAll(".wz-step-num").forEach(e => {
    const s = Number(e.dataset.step);
    e.classList.remove("active","done");
    if (s === n) e.classList.add("active");
    else if (s < n) e.classList.add("done");
  });
  if (n===2) renderDurationStep();
  if (n===3) renderSlotsStep();
  if (n===4) renderDetailsStep();
  if (n===5) renderSuccessStep();
  document.getElementById("rezervacija").scrollIntoView({ behavior:"smooth", block:"start" });
}
document.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => goStep(Number(b.dataset.back))));

// ----- Step 2: Duration -----
function fmtDate(d){
  return `${d.getDate()}. ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}
function renderDurationStep(){
  document.getElementById("dur-date").textContent = fmtDate(state.date);
  const prev = durationPreview(state.date);
  const host = document.getElementById("dur-grid");
  host.innerHTML = "";
  [60,90,120].forEach(d => {
    const info = prev[d];
    const b = document.createElement("button");
    b.className = "dur-btn" + (info.disabled ? " disabled" : "");
    b.type = "button";
    b.innerHTML = `
      <div class="dur-val">${d}</div>
      <div class="dur-min">min</div>
      <div class="dur-price">${info.price},00 KM</div>
    `;
    if (info.disabled){
      b.title = info.disabledReason;
      b.setAttribute("aria-disabled","true");
    } else {
      b.addEventListener("click", () => { state.duration = d; goStep(3); });
    }
    host.appendChild(b);
  });
}

// ----- Step 3: Slots -----
function renderSlotsStep(){
  const dateStr = fmtDateKey(state.date);
  prePopulateBookings(dateStr, state.duration);
  document.getElementById("slot-date").textContent = fmtDate(state.date);
  document.getElementById("slot-dur").textContent = `${state.duration} min`;

  const slots = generateSlotsForDay(dateStr, state.duration);
  const table = document.getElementById("slot-table");
  table.innerHTML = `
    <thead><tr><th>Vrijeme</th>${COURTS.map(c => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${slots.map(t => {
      const [h,m] = t.split(":").map(Number);
      const endMin = h*60 + m + state.duration;
      const eh = Math.floor(endMin/60)%24, em = endMin%60;
      const endT = `${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}`;
      return `<tr><td class="slot-time">${t} – ${endT}</td>${COURTS.map((_, ci) => {
        const booked = bookings.get(bkKey(dateStr, state.duration, t, ci));
        return `<td><button class="slot-cell ${booked?'booked':'free'}" ${booked?'aria-disabled="true" disabled':''} data-time="${t}" data-court="${ci}" aria-label="${t} ${COURTS[ci]} ${booked?'zauzet':'slobodan'}">${booked?'zauzet':'slobodan'}</button></td>`;
      }).join("")}</tr>`;
    }).join("")}</tbody>`;
  table.querySelectorAll(".slot-cell.free").forEach(btn => {
    btn.addEventListener("click", () => {
      state.startTime = btn.dataset.time;
      state.courtIdx = Number(btn.dataset.court);
      goStep(4);
    });
  });
}

// ----- Step 4: Details -----
function calcEndTime(){
  const [h,m] = state.startTime.split(":").map(Number);
  const endMin = h*60 + m + state.duration;
  const eh = Math.floor(endMin/60)%24, em = endMin%60;
  return `${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}`;
}
function currentPrice(){
  const [h] = state.startTime.split(":").map(Number);
  return priceFor(state.date, h, state.duration);
}
function updateSummary(containerSuffix=""){
  const price = currentPrice();
  const racketLine = state.racket ? `<div class="summary-row"><span class="k">Reket</span><span class="v">+5,00 KM</span></div>` : "";
  const total = price + (state.racket ? 5 : 0);
  const html = `
    <div class="summary-row"><span class="k">Datum</span><span class="v">${fmtDate(state.date)}</span></div>
    <div class="summary-row"><span class="k">Teren</span><span class="v">${COURTS[state.courtIdx]}</span></div>
    <div class="summary-row"><span class="k">Termin</span><span class="v">${state.startTime} – ${calcEndTime()}</span></div>
    <div class="summary-row"><span class="k">Trajanje</span><span class="v">${state.duration} min</span></div>
    <div class="summary-row"><span class="k">Cijena</span><span class="v">${price},00 KM</span></div>
    ${racketLine}
    <div class="summary-row total"><span class="k">Ukupno</span><span class="v">${total},00 KM</span></div>
  `;
  const el = document.getElementById(`summary${containerSuffix}`);
  if (el) el.innerHTML = html;
}
function renderDetailsStep(){
  updateSummary();
  // reset form state
  const f = document.getElementById("booking-form");
  f.reset();
  state.racket = false;
}
document.getElementById("racket-check").addEventListener("change", (e) => {
  state.racket = e.target.checked;
  updateSummary();
});
document.getElementById("booking-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  state.name = fd.get("name").toString().trim();
  state.surname = fd.get("surname").toString().trim();
  state.phone = fd.get("phone").toString().trim();
  state.racket = !!fd.get("racket");
  // mark booking as taken immediately
  const dateStr = fmtDateKey(state.date);
  bookings.set(bkKey(dateStr, state.duration, state.startTime, state.courtIdx), true);
  goStep(5);
});

// ----- Step 5: Success -----
function renderSuccessStep(){
  updateSummary("-success");
  const price = currentPrice();
  const total = price + (state.racket ? 5 : 0);
  const body = [
    "Nova rezervacija primljena:",
    "",
    `Ime i prezime: ${state.name} ${state.surname}`,
    `Broj mobitela: ${state.phone}`,
    `Datum: ${fmtDate(state.date)}`,
    `Teren: ${COURTS[state.courtIdx]}`,
    `Termin: ${state.startTime} – ${calcEndTime()}`,
    `Trajanje: ${state.duration} min`,
    `Iznajmljivanje reketa: ${state.racket ? "Da" : "Ne"}`,
    `Ukupna cijena: ${total},00 KM`,
    "",
    "Padel centar Hills rezervacijski sustav"
  ].join("\n");
  const mailto = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent("Nova rezervacija – Padel centar Hills")}&body=${encodeURIComponent(body)}`;
  document.getElementById("mail-btn").href = mailto;
}
document.getElementById("reset-btn").addEventListener("click", () => {
  Object.assign(state, { step:1, date:null, duration:null, courtIdx:null, startTime:null, name:"", surname:"", phone:"", racket:false });
  renderCalendar();
  goStep(1);
});

// ----- Init -----
renderCalendar();
// Init Lucide after DOM ready
if (window.lucide) lucide.createIcons();
