# Padel centar Hills — Design System

Brand and design system for **Padel centar Hills**, a premium indoor padel sports centre in Sarajevo, Bosnia and Herzegovina, located inside the Hotel Hills complex at Butmirska cesta 18, Ilidža.

## Sources
- **Business brief:** provided in the chat (Croatian content, pricing, facility specs, membership tiers, tournaments).
- **Photography:** `uploads/1.webp` – `uploads/6.webp` (event/court photography from Ilidža Padel Open '25, Državno prvenstvo BiH '25, BPK International Tournament).
- **Video:** `uploads/padelcentar.mp4` (hero background).
- **Repo:** `brankomamic0-art/Padel-centar-Hills` (empty on inspection — only placeholder metadata; no code / components to mine).

Because no codebase or Figma was attached, the system is defined from brand context + spec. The visual direction is grounded in the photography (dark indoor courts, blue playing surface, dramatic lighting) and the brief's explicit token palette.

---

## Company context

Padel centar Hills operates **4 premium indoor padel courts** (Teren 1–4), each equipped with **Matchi TV** match-recording. It sits within the **Hotel Hills** complex and positions itself as the flagship padel venue in Sarajevo. Revenue streams:

- **Court rental** — tiered pricing (off-peak / peak / weekend, 60/90/120 min).
- **Padel škola** — lessons for ages 10+, 20 KM per training, first one free.
- **Membership** — 5 tiers: Basic, Gold, VIP, Next Generation, Takmičar.
- **Tournaments** — International Sarajevo Open (prize fund €2.160) and Late Night Americano (recreational).

Bookings happen via an on-site 4-step wizard: date → duration → court+slot → details → emailed confirmation.

**Audience:** Bosnian/regional adults, families, competitive players. Bilingual-ready but content is Croatian/Bosnian first.

---

## Content fundamentals

**Language:** Croatian / Bosnian (`lang="hr"`). Never English in user-facing copy.

**Tone:** Direct, confident, sporty. Second-person singular ("Rezerviraj termin", "Odaberi trajanje", "Tvoji podaci"). Not corporate. Not cute. No exclamation-point spam.

**Casing:**
- Headings in display font, sentence-case with proper nouns capitalised (e.g. "Padel centar Hills", "Teren 1").
- Button labels are imperative, short, sentence-case: "Rezerviraj termin", "Pošalji potvrdu".
- Eyebrow / label chrome uses UPPERCASE with wide tracking — only for small nav/meta text.

**Money:** `25,00 KM` — Bosnian marka, comma as decimal separator, space before "KM". Euro for prize funds (`2.160 €`). Never "KM 25" or "25 KM,00".

**Time:** 24-hour with colons (`08:00 – 00:00`), en-dash for ranges.

**Voice examples:**
- ✅ "4 premium indoor terena, Matchi TV snimanje, otvoreno svaki dan do ponoći."
- ✅ "Prvi trening besplatno. Dođi, isprobaj, odluči."
- ❌ "Welcome to our amazing padel club! 🎾"

**Emoji:** none. The brand is athletic, not playful.

**Unicode chrome:** en-dash (`–`) for ranges, arrow (`←`) for back buttons, multiplication sign (`×`) for close buttons. No ✓ emoji — checkmarks are drawn as SVG.

---

## Visual foundations

**Color mood:** Night match under floodlights. Deep navy base with a single electric-lime accent doing all the heavy lifting — buttons, links, highlights, the free-slot chips, the logo racket head. No secondary accent. No tertiary accent. Discipline is the point.

- **Base:** `#0d1b2a` navy. Everything sits on this.
- **Accent:** `#b3f000` lime. Used sparingly and confidently — CTA only, never decorative.
- **Semantic red:** `#ff3b3b` for booked slots. Reserved for unavailable states.
- **Text:** pure white on navy. `rgba(255,255,255,0.75)` for muted.

**Typography pairing:** Cabinet Grotesk 700/800 for display (tight tracking, confident), Satoshi 400/500 for body. Both from Fontshare. Display numerals are big and decisive — pricing, stats, slide counters all lean on large display weights.

**Backgrounds:** mostly flat navy. One full-bleed looping video in the hero. Images are always enclosed in rounded cards (`--radius-md`) with dark overlays on hover.

**Animation:** restrained. Scroll-driven fades using `opacity` + `clip-path` only (no translateY — avoid CLS). Button hovers use color shift + 1–2px scale, 240ms `ease-out`. Calendar/step transitions fade + slight horizontal clip. Success checkmark: single stroke-draw animation, no bounce.

**Hover states:**
- Primary button: accent → `--lime-600`, subtle glow shadow.
- Card: border lifts from `rgba(255,255,255,0.08)` → `rgba(255,255,255,0.16)`, optional 2–3% lime-glow shadow.
- Gallery image: `scale(1.03)` + overlay + zoom icon.
- Links: underline on hover, accent color.

**Press/active:** 0.98 scale, no color change beyond the hover state.

**Borders:** hairline `rgba(255,255,255,0.08)` everywhere. Strong border `rgba(255,255,255,0.16)` for focused/selected. Accent border only on highlighted membership tiers (VIP, Next Generation).

**Shadows:** minimal on dark; mostly `0 20px 60px rgba(0,0,0,0.5)` for lifted cards, plus accent-colored glow (`0 0 32px rgba(179,240,0,0.35)`) reserved for the selected slot and primary button focus.

**Radii:** medium default (14px) for cards, small (8px) for inputs + slot cells, pill for badges/chips, large (20–28px) for hero/container treatments.

**Layout:** wide max-width 1280px, generous vertical rhythm (80–128px between sections), 4px spacing grid. Grid over flexbox for the pricing table, gallery, and booking slots.

**Transparency/blur:** sticky nav uses `backdrop-filter: blur(18px)` with `rgba(13,27,42,0.7)`. Lightbox overlay: `rgba(0,0,0,0.92)`. Gallery hover overlay: `rgba(0,0,0,0.5)`.

**Imagery vibe:** high-contrast, cool-toned, blue-court action shots with watermark overlays. We honour the source photos' aesthetic — no forced warmth, no filters.

---

## Iconography

**Primary icon set:** [Lucide](https://lucide.dev) via CDN (`https://unpkg.com/lucide@latest`). Stroke-based, 2px weight, matches the clean athletic vibe. Used for: nav, social, gallery zoom, calendar arrows, close buttons, step indicators.

**Custom logo:** inline SVG in the site header — a padel racket silhouette with a lime-green accent, optimised to work at 24px (favicon) and 48px+ (hero). See `assets/logo.svg`.

**No emoji, no unicode icons.** The exceptions are dashes (`–`, `—`), multiplication sign (`×`), arrows (`←`, `→`) used only as simple text glyphs where an icon would be overkill.

**No icon font.** Lucide is loaded as SVG on demand.

---

## Index

| File / folder | Purpose |
|---|---|
| `README.md` | This doc — brand overview, content rules, visual foundations. |
| `SKILL.md` | Agent-skill entrypoint for generating Padel centar Hills assets. |
| `colors_and_type.css` | Design tokens (CSS custom properties) — colors, type, spacing, radii, shadow, motion. |
| `assets/` | Logo, photography (`gallery/1.webp`–`6.webp`), hero video (`padelcentar.mp4`). |
| `preview/` | Design System tab cards (colors, type, spacing, components, brand). |
| `ui_kits/website/` | Full marketing + booking website recreation — `index.html` is the deliverable. |

---

## Caveats & substitutions

- **Fonts:** Cabinet Grotesk + Satoshi are loaded from Fontshare CDN. No local TTFs bundled. If you need offline use, download from [fontshare.com](https://fontshare.com).
- **GitHub repo was empty** — no components to extract. All visual decisions are derived from the brief + photography.
- **Owner email** is left as `[UPIŠI EMAIL VLASNIKA OVDJE]` per brief and should be filled before launch.
- **Custom racket-logo SVG** is a minimal original mark built from primitives — if a real brand logo exists, drop it in `assets/logo.svg` to replace.
