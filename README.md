# ORIBI Website Redesign

Interactive homepage redesign prototype for **ORIBI South Africa** — a social-impact incubator supporting South African entrepreneurs through cohort mentorship, venture building, food-system partnerships, and civil society training.

## Project Structure

- `index.html` — Single-page interactive homepage prototype covering the ambient cinema hero, impact counters, six incubation programmes synced with the application form, the three-pillar Trust Model, founder stories, documentary gallery, and closing band.
- `styles/experience.css` — Custom visual-proof, motion, and responsive styling built on top of the base design system tokens and ORIBI palette (`#f7f6f2`, `#eceae2`, `#0f1c33`, `#012c7a`, `#f1a629`).
- `scripts/experience.js` — Client-side interactivity including the ambient hero controls, founder film lightbox modal, programme selector/application pill sync, animated impact counters, and reduced-motion handling.
- `media/` — Local video assets (`oribi-ambient-loop.mp4`, `oribi-founder-reel.mp4`) and `media/manifest.json`, which catalogs asset dimensions, focal points (`object-position`), slot assignments, and alt text.
- `images/` — Curated authentic ORIBI and Groupe SOS PULSE photography, including high-resolution desktop and mobile variants in `images/hi/`.
- `assets/` — Shared base CSS, layout, card, and motion utilities (`system.css`, `system.js`, `motion/`, `layout/`, `ui/`).
- `favicon.svg`, `share.jpg` — Brand favicon and Open Graph social sharing preview image.

## Local Preview

Because `index.html` loads ES modules (`<script type="module">`) and local media, serve the directory over HTTP rather than opening `index.html` directly via `file://`.

Using Node.js:

```bash
npx serve . -l 4173
```

Or using Python 3:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173/` in your browser.
