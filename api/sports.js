/* ============================================================
   /api/sports — unified serverless proxy for all leagues
   ------------------------------------------------------------
   Most sports APIs are auth-gated and/or CORS-restricted, so the
   browser can't call them directly. This single Vercel function
   fetches them server-side and returns JSON the pages consume
   same-origin. It hides keys, solves CORS, and caches at the edge.

   Query params:
     ?league=mlb|nba|nfl|ncaa|global|wc   (required)
     &resource=standings|schedule         (default: standings)
     &resource=scorers|teams              (wc only)

   Keys (only the World Cup needs one):
     football-data.org → env var FOOTBALL_DATA_KEY
       Register free at https://www.football-data.org/client/register
       then add it in Vercel → Settings → Environment Variables.
   MLB Stats API and ESPN endpoints are public / keyless.

   Everything degrades gracefully: on any non-2xx or missing key
   the pages keep their bundled sample data.
   ============================================================ */

const ESPN = "https://site.api.espn.com/apis";
const FD = "https://api.football-data.org/v4/competitions/WC";

function pad(n) { return String(n).padStart(2, "0"); }
function ymd(d) { return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }

// MLB schedule needs an explicit date window (today .. +10 days).
function mlbScheduleUrl() {
  const now = new Date();
  const end = new Date(now.getTime() + 10 * 864e5);
  const season = now.getUTCFullYear();
  return "https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=" +
    ymd(now) + "&endDate=" + ymd(end) + "&season=" + season + "&hydrate=team,broadcasts(all)";
}

const ROUTES = {
  mlb: {
    standings: () => "https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=" +
      new Date().getUTCFullYear() + "&standingsTypes=regularSeason&hydrate=team",
    schedule: mlbScheduleUrl
  },
  nba: {
    standings: () => ESPN + "/v2/sports/basketball/nba/standings",
    schedule: () => ESPN + "/site/v2/sports/basketball/nba/scoreboard"
  },
  nfl: {
    standings: () => ESPN + "/v2/sports/football/nfl/standings",
    schedule: () => ESPN + "/site/v2/sports/football/nfl/scoreboard"
  },
  ncaa: {
    standings: () => ESPN + "/site/v2/sports/basketball/mens-college-basketball/rankings",
    schedule: () => ESPN + "/site/v2/sports/basketball/mens-college-basketball/scoreboard"
  },
  global: {
    standings: () => ESPN + "/v2/sports/hockey/nhl/standings",
    schedule: () => ESPN + "/site/v2/sports/hockey/nhl/scoreboard"
  },
  wc: {
    standings: () => FD + "/standings?season=2026",
    schedule: () => FD + "/matches?season=2026",
    scorers: () => FD + "/scorers?season=2026",
    teams: () => FD + "/teams?season=2026"
  }
};

export default async function handler(req, res) {
  const q = req.query || {};
  const league = String(q.league || "");
  const resource = String(q.resource || "standings");

  const routes = ROUTES[league];
  if (!routes) {
    res.status(400).json({ error: "bad_league", allowed: Object.keys(ROUTES) });
    return;
  }
  const build = routes[resource];
  if (!build) {
    res.status(400).json({ error: "bad_resource", league: league, allowed: Object.keys(routes) });
    return;
  }

  // World Cup is the only source that needs a key.
  let headers = {};
  if (league === "wc") {
    const key = process.env.FOOTBALL_DATA_KEY;
    if (!key) {
      res.setHeader("Cache-Control", "no-store");
      res.status(503).json({ error: "no_key", message: "Set FOOTBALL_DATA_KEY in Vercel env vars to enable World Cup live data." });
      return;
    }
    headers["X-Auth-Token"] = key;
  }

  try {
    const upstream = await fetch(build(), { headers: headers });
    const body = await upstream.text();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(upstream.status).send(body);
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "upstream_error", message: String((err && err.message) || err) });
  }
}
