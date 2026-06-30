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
| `schedules.html` | Tabbed standings + schedules for MLB / NBA / NFL / NCAA / Global, with **live-feed upgrade** + team colors |
| `play/bracket-maker.html` | **Interactive bracket maker** — 4–64 teams, presets, click to advance, **share link**, **PNG export**, auto-saves, print |
| `play/squares.html` | **Super Bowl Squares generator** — random 100-square fill + hidden number draw, print-ready |
| `play/round-robin.html` | **Round-robin generator** — every team plays everyone, single or double, printable |
| `play/raffle.html` | **Raffle picker + bingo cards** — animated random draw and printable 5×5 bingo |
| `play/pickem.html` | **Pick'em sheet** — pick every game, share a link, score against results |
| `blog.html` | "Bracket Banter" blog index |
| `404.html` | Friendly not-found page |

### Highlights
- **Truly print-friendly** — dedicated `@media print` styles strip the chrome and render clean, low-ink brackets and tables. Hit *Print* on any tool.
- **Interactive bracket maker** — full single-elimination logic with downstream pick invalidation, standard 1-vs-N seeding, presets (NBA / World Cup / March Madness 64), `localStorage` persistence, **shareable URLs** (state encoded in the link), and a self-contained **canvas PNG export**.
- **Self-spreading share links** — the bracket maker's "Share" button returns a link that unfurls in iMessage/Discord/X with a generated **OG preview image of that exact bracket** (champion called out), then drops whoever opens it straight into the maker with the bracket loaded.
- **Dark mode** — light/dark toggle in the header, remembered across visits, applied before first paint (no flash).
- **Live data, gracefully** — `js/data.js` upgrades schedules from [TheSportsDB](https://www.thesportsdb.com) when reachable and silently falls back to bundled sample data otherwise, so nothing ever breaks offline.
- **Team colors** — tasteful per-team color accents across standings, schedules, and exports (no copyrighted logos).
- **Shared chrome** — header/nav/footer are injected from `js/main.js`, so the nav is maintained in exactly one place.
- **SEO-ready** — JSON-LD structured data (`WebSite` + `SportsEvent`), canonical tags, OpenGraph/Twitter cards, sitemap, and an opt-in privacy-friendly analytics hook.
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
│   ├── squares.html
│   ├── round-robin.html
│   ├── raffle.html
│   └── pickem.html
├── api/
│   ├── sports.js           # serverless proxy for all live league data
│   ├── og.js               # @vercel/og — dynamic bracket preview image (edge)
│   └── share.js            # shareable link w/ per-bracket OG meta + redirect
├── package.json            # only @vercel/og (for the OG function); no build step
├── css/styles.css          # design system + dark theme + print styles
├── js/
│   ├── main.js             # shared header/footer, nav, theme toggle, toast, reveal
│   ├── data.js             # team colors + sample data + proxy fetch & mappers
│   ├── wc.js               # World Cup hub: live groups/schedule/bracket mapping
│   └── bracket.js          # bracket engine, presets, share-link, PNG export
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

## 📡 Live data (optional)

The schedules and World Cup pages **upgrade to live data automatically** when a
serverless proxy is available, and **fall back to bundled sample data** otherwise — so
the site is never broken, online or off.

### How it works
- `api/sports.js` is a single **Vercel serverless function** that proxies every league
  server-side (solving CORS and hiding keys), with edge caching
  (`s-maxage=300, stale-while-revalidate=600`):

  | League (tab) | Source | Key needed? |
  | --- | --- | --- |
  | MLB | MLB Stats API (`statsapi.mlb.com`) | No |
  | NBA / NFL / NCAA / Global (NHL) | ESPN public JSON | No |
  | World Cup 2026 | [football-data.org](https://www.football-data.org) v4 | **Yes** |

- The pages call it same-origin, e.g. `fetch('/api/sports?league=nfl&resource=standings')`,
  and `js/data.js` / `js/wc.js` map each provider's JSON into the table/bracket DOM.
  Every mapper is defensive and returns `null` on any shape mismatch (these public
  feeds are undocumented and can change) → the page keeps its sample data.

### To enable live World Cup data
1. Register a free key at <https://www.football-data.org/client/register>.
2. In **Vercel → Project → Settings → Environment Variables**, add
   `FOOTBALL_DATA_KEY = <your key>`.
3. Redeploy. (Until then the WC page shows sample data and the proxy returns a clean
   `503 {error:"no_key"}`.)

> MLB and ESPN need **no key** — those tabs go live as soon as the function deploys.
> Broadcast (TV) columns aren't in these free feeds, so they use a small manual map in `js/data.js`.

## 📝 Notes

Until the live feeds are reachable, the standings, schedules, and bracket seedings shown
are **illustrative sample data** to demonstrate the layouts.

Built for fans, by fans. Print free, share freely. 🏀⚾🏈⚽
