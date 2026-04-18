# Padel centar Hills — Website UI kit

High-fidelity marketing + booking site recreation for Padel centar Hills.

## Files
- `index.html` — the full single-page site (hero, o nama, galerija, cjenik, rezervacija, škola, članstvo, turniri, kontakt, footer).
- `style.css` — tokens + component styles extracted from `colors_and_type.css`.
- `app.js` — booking wizard, lightbox, theme toggle, calendar.
- `assets/` — logo, photography, hero video (copies of root `assets/`).

## Tech
- Vanilla HTML/CSS/JS. No frameworks.
- Fontshare (Cabinet Grotesk + Satoshi).
- Lucide-style inline SVG icons (not CDN — trimmed inline for zero external icon dep).
- In-memory session state only (no localStorage).

## Key components
- **Sticky backdrop-blur nav** with logo, links, theme toggle, Rezerviraj CTA + mobile menu.
- **Video hero** with fallback poster and dark gradient overlay.
- **4-step booking wizard**: Calendar → duration → slot grid → form → success + mailto.
- **Lightbox gallery** with keyboard nav (← →, Esc) and opacity fade.
- **Pricing table** with sectioned rows (off-peak / peak / weekend) + reket callout.
- **5 membership tiers** with VIP + Next Generation highlighted (lime border + glow).
