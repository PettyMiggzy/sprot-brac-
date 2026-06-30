# 🏆 Sports Brackets

A modern rebuild of [sportsbrackets.net](https://sportsbrackets.net) — the fan's HQ for
**low-ink, printer-friendly tournament brackets, master broadcast schedules, and
real-time playoff tracking** across MLB, the NBA, NFL, NCAA, and the 2026 FIFA World Cup.

Built as a fast, dependency-free **static site** — no build step, no framework, hosts
anywhere (GitHub Pages, Netlify, Vercel, S3, or any plain web server).

---

## ✨ What's inside

| Page | What it does |
| --- | --- |
| `index.html` | Landing page — hero, World Cup feature, sport hubs, tools, blog teasers, newsletter |
| `world-cup-2026.html` | 2026 FIFA World Cup hub — printable 48-team knockout bracket, group standings, broadcast schedule, fantasy pool |
| `schedules.html` | Tabbed standings + schedules for MLB / NBA / NFL / NCAA / Global events |
| `play/bracket-maker.html` | **Interactive bracket maker** — 4–32 teams, click to advance winners, seed/shuffle, auto-saves, print |
| `play/squares.html` | **Super Bowl Squares generator** — random 100-square fill + hidden number draw, print-ready |
| `blog.html` | "Bracket Banter" blog index |
| `404.html` | Friendly not-found page |

### Highlights
- **Truly print-friendly** — dedicated `@media print` styles strip the chrome and render clean, low-ink brackets and tables. Hit *Print* on any tool.
- **Interactive bracket maker** — full single-elimination logic with downstream pick invalidation, standard 1-vs-N seeding, and `localStorage` persistence.
- **Shared chrome** — header/nav/footer are injected from `js/main.js`, so the nav is maintained in exactly one place.
- **Responsive** — mobile nav, fluid type, and horizontal-scroll brackets on small screens.
- **Zero dependencies** — just HTML, CSS, and vanilla JS. Inter is loaded from Google Fonts.

---

## 🚀 Run it locally

No build needed. Any static server works:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

> Open via a server (not `file://`) so the shared header/footer and tools load correctly.

---

## 🌐 Deploy

**GitHub Pages:** push to your repo, then *Settings → Pages → Deploy from branch* and pick the
branch root. The included `.nojekyll` keeps Pages from touching the folders.

**Netlify / Vercel:** point it at the repo with **no build command** and the publish
directory set to the project root.

---

## 🗂 Structure

```
.
├── index.html
├── world-cup-2026.html
├── schedules.html
├── blog.html
├── 404.html
├── play/
│   ├── bracket-maker.html
│   └── squares.html
├── css/styles.css          # design system + print styles
├── js/
│   ├── main.js             # shared header/footer, nav, toast, reveal-on-scroll
│   └── bracket.js          # bracket maker engine
├── assets/                 # logo + favicon (SVG)
├── robots.txt · sitemap.xml · .nojekyll
```

---

## 🎨 Design tokens

Defined as CSS custom properties at the top of `css/styles.css` — change the brand
in one place:

```css
--ink: #1c2030;      /* primary text  */
--accent: #2f6df6;   /* primary blue  */
--accent-2: #16a34a; /* live / win    */
--accent-3: #f59e0b; /* featured gold */
```

---

## 📝 Notes

Standings, schedules, and bracket seedings shown on the site are **illustrative sample
data** to demonstrate the layouts. Wire them to a live sports data API (e.g. ESPN,
SportsDataIO, or TheSportsDB) to make them real-time.

Built for fans, by fans. Print free, share freely. 🏀⚾🏈⚽
