/* ============================================================
   Sports Brackets — data layer
   - Team color map (for tasteful accents; no copyrighted logos)
   - Sample standings/schedules
   - Optional live fetch (TheSportsDB free tier) with graceful
     fallback to the sample data when offline / rate-limited.
   ============================================================ */
(function () {
  "use strict";
  window.SB = window.SB || {};

  /* ---------- Team colors (primary hex) ---------- */
  var COLORS = {
    // MLB
    "Yankees": "#0c2340", "Orioles": "#df4601", "Red Sox": "#bd3039", "Rays": "#092c5c", "Blue Jays": "#134a8e",
    // NBA
    "Thunder": "#007ac1", "Nuggets": "#0e2240", "Timberwolves": "#236192", "Clippers": "#c8102e", "Mavericks": "#00538c",
    "Knicks": "#006bb6", "Pacers": "#fdbb30",
    // NFL
    "Chiefs": "#e31837", "Bills": "#00338d", "Ravens": "#241773", "Bengals": "#fb4f14", "Texans": "#03202f",
    // NCAA
    "UConn": "#000e2f", "Houston": "#c8102e", "Purdue": "#ceb888", "Arizona": "#003366", "Auburn": "#0c2340",
    // Soccer
    "Argentina": "#75aadb", "Brazil": "#009c3b", "France": "#0055a4", "Spain": "#c60b1e", "England": "#cf081f",
    "Germany": "#000000", "Portugal": "#006600", "Netherlands": "#ff6900", "Mexico": "#006847", "USA": "#0a3161",
    "Canada": "#d52b1e"
  };
  SB.colorFor = function (name) {
    if (!name) return "#2f6df6";
    var key = String(name).replace(/^.*:\s*/, "").trim(); // strip "NHL: " style prefixes
    return COLORS[key] || "#2f6df6";
  };

  /* ---------- Sample data ---------- */
  SB.SAMPLE = {
    mlb: {
      title: "MLB — American League East",
      sub: "Top six in each league reach the postseason.",
      stand: [["Yankees",54,32,"L2"],["Orioles",51,35,"W4"],["Red Sox",47,39,"W1"],["Rays",44,42,"L1"],["Blue Jays",40,46,"L3"]],
      sched: [["Jul 1","Yankees @ Orioles","7:05 PM","ESPN"],["Jul 1","Red Sox @ Rays","6:40 PM","NESN"],["Jul 2","Blue Jays @ Yankees","7:05 PM","YES"],["Jul 3","Orioles @ Red Sox","7:10 PM","MASN"]]
    },
    nba: {
      title: "Basketball — NBA Western Conference",
      sub: "Seeds 7–10 play into the bracket via the play-in.",
      stand: [["Thunder",58,18,"W6"],["Nuggets",53,23,"W2"],["Timberwolves",50,26,"L1"],["Clippers",48,28,"W3"],["Mavericks",46,30,"L2"]],
      sched: [["Jul 1","Thunder @ Nuggets","9:00 PM","TNT"],["Jul 2","Clippers @ Mavericks","8:30 PM","ESPN"],["Jul 3","Wolves @ Thunder","9:30 PM","ABC"]]
    },
    nfl: {
      title: "NFL — AFC Standings",
      sub: "Seven teams per conference reach the playoffs.",
      stand: [["Chiefs",13,4,"W3"],["Bills",12,5,"W1"],["Ravens",11,6,"L1"],["Bengals",10,7,"W2"],["Texans",9,8,"L1"]],
      sched: [["Sep 7","Chiefs @ Bills","8:20 PM","NBC"],["Sep 7","Ravens @ Bengals","1:00 PM","CBS"],["Sep 8","Texans @ Chiefs","4:25 PM","FOX"]]
    },
    ncaa: {
      title: "NCAA — Men's Basketball Top 5",
      sub: "68 teams make the March Madness field.",
      stand: [["UConn",30,3,"W8"],["Houston",29,4,"W5"],["Purdue",28,5,"L1"],["Arizona",26,7,"W2"],["Auburn",25,8,"W1"]],
      sched: [["Mar 1","UConn @ Houston","6:00 PM","CBS"],["Mar 2","Purdue @ Arizona","4:00 PM","ESPN"],["Mar 3","Auburn @ UConn","9:00 PM","ESPN2"]]
    },
    global: {
      title: "Global Events — This Week",
      sub: "Tennis, NHL, F1, NASCAR and the soccer calendar at a glance.",
      stand: [["NHL: Panthers",52,24,"W3"],["F1: Verstappen",1,0,"P1"],["Tennis: Sinner",1,0,"No.1"],["NASCAR: Larson",1,0,"P1"],["NHL: Oilers",50,26,"W2"]],
      sched: [["Jul 1","F1 — Austrian GP","9:00 AM","ESPN"],["Jul 2","NHL — Cup Final G5","8:00 PM","TNT"],["Jul 5","Tennis — Wimbledon R3","6:00 AM","ESPN"]]
    }
  };

  /* ====================================================================
     LIVE DATA via the same-origin /api/sports proxy
     --------------------------------------------------------------------
     The proxy fronts MLB Stats API (keyless), ESPN hidden JSON (keyless),
     and football-data.org (keyed). These public shapes are undocumented
     and can change, so every mapper is defensive and returns null on any
     mismatch — the page then keeps its SAMPLE data. Standings rows map to
     [team, W, L, streakCode]; schedule rows to [date, matchup, time, tv].
     ==================================================================== */

  function etTime(iso) {
    try { return new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }); }
    catch (e) { return "TBD"; }
  }
  function etDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }); }
    catch (e) { return "TBD"; }
  }
  function streakFromNum(n) {
    if (n == null || isNaN(n)) return "—";
    n = Number(n);
    if (n === 0) return "—";
    return (n > 0 ? "W" : "L") + Math.abs(n);
  }
  // Small broadcast map — TV networks aren't in these free feeds.
  var TVMAP = { mlb: "MLB.TV", nba: "League Pass", nfl: "CBS / FOX", ncaa: "ESPN", global: "ESPN+" };
  function tvFor(key, fallback) { return fallback || TVMAP[key] || "—"; }

  function proxy(key, resource) {
    if (typeof fetch !== "function") return Promise.reject("nofetch");
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (ctrl) setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch("/api/sports?league=" + key + "&resource=" + resource, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error("proxy " + r.status); return r.json(); });
  }

  /* ---------- ESPN helpers (nba / nfl / global) ---------- */
  function espnStatVal(stats, names) {
    for (var i = 0; i < stats.length; i++) {
      if (names.indexOf(stats[i].name) > -1 || names.indexOf(stats[i].type) > -1) return stats[i];
    }
    return null;
  }
  function espnStandings(json) {
    // entries can live at top-level standings, or nested in children groups
    var entries = [];
    function collect(node) {
      if (!node) return;
      if (node.standings && node.standings.entries) entries = entries.concat(node.standings.entries);
      if (node.children) node.children.forEach(collect);
    }
    collect(json);
    if (json.standings && json.standings.entries && !entries.length) entries = json.standings.entries;
    if (!entries.length) return null;

    var rows = entries.map(function (e) {
      var s = e.stats || [];
      var w = espnStatVal(s, ["wins"]);
      var l = espnStatVal(s, ["losses"]);
      var pct = espnStatVal(s, ["winPercent"]);
      var stk = espnStatVal(s, ["streak"]);
      var name = (e.team && (e.team.shortDisplayName || e.team.displayName || e.team.name)) || "—";
      var strk = stk ? (stk.displayValue || streakFromNum(stk.value)) : "—";
      return { name: name, w: w ? Math.round(w.value) : 0, l: l ? Math.round(l.value) : 0, pct: pct ? pct.value : 0, strk: strk };
    });
    rows.sort(function (a, b) { return b.pct - a.pct; });
    return rows.slice(0, 8).map(function (r) { return [r.name, r.w, r.l, r.strk]; });
  }
  function espnScoreboard(key, json) {
    var events = json && json.events;
    if (!Array.isArray(events) || !events.length) return null;
    return events.slice(0, 8).map(function (ev) {
      var comp = (ev.competitions && ev.competitions[0]) || {};
      var cs = comp.competitors || [];
      var home = cs.filter(function (c) { return c.homeAway === "home"; })[0];
      var away = cs.filter(function (c) { return c.homeAway === "away"; })[0];
      var matchup = (away && home)
        ? (teamShort(away.team) + " @ " + teamShort(home.team))
        : (ev.shortName || ev.name || "TBD");
      var tv = "";
      if (comp.broadcasts && comp.broadcasts[0] && comp.broadcasts[0].names) tv = comp.broadcasts[0].names[0];
      return [etDate(ev.date), matchup, etTime(ev.date), tvFor(key, tv)];
    });
  }
  function teamShort(t) { return (t && (t.abbreviation || t.shortDisplayName || t.displayName || t.name)) || "TBD"; }

  /* ---------- MLB Stats API ---------- */
  function mlbStandings(json) {
    var recs = json && json.records;
    if (!Array.isArray(recs) || !recs.length) return null;
    var teams = [];
    recs.forEach(function (div) {
      (div.teamRecords || []).forEach(function (tr) {
        teams.push({
          name: (tr.team && tr.team.name) || "—",
          w: tr.wins || 0, l: tr.losses || 0,
          pct: parseFloat(tr.winningPercentage || "0") || (tr.wins / Math.max(1, tr.wins + tr.losses)),
          strk: (tr.streak && tr.streak.streakCode) || "—"
        });
      });
    });
    if (!teams.length) return null;
    teams.sort(function (a, b) { return b.pct - a.pct; });
    return teams.slice(0, 8).map(function (t) { return [t.name, t.w, t.l, t.strk]; });
  }
  function mlbSchedule(json) {
    var dates = json && json.dates;
    if (!Array.isArray(dates) || !dates.length) return null;
    var out = [];
    dates.forEach(function (d) {
      (d.games || []).forEach(function (g) {
        if (out.length >= 8) return;
        var away = g.teams && g.teams.away && g.teams.away.team;
        var home = g.teams && g.teams.home && g.teams.home.team;
        var tv = "";
        if (g.broadcasts && g.broadcasts[0]) tv = g.broadcasts[0].name;
        out.push([etDate(g.gameDate), ((away && away.name) || "TBD") + " @ " + ((home && home.name) || "TBD"), etTime(g.gameDate), tvFor("mlb", tv)]);
      });
    });
    return out.length ? out : null;
  }

  /* ---------- NCAA rankings (AP poll) ---------- */
  function ncaaRankings(json) {
    var ranks = json && json.rankings && json.rankings[0] && json.rankings[0].ranks;
    if (!Array.isArray(ranks) || !ranks.length) return null;
    return ranks.slice(0, 8).map(function (r) {
      var rec = (r.recordSummary || "0-0").split("-");
      var name = (r.team && (r.team.nickname || r.team.location || r.team.name)) || "—";
      return [name, parseInt(rec[0], 10) || 0, parseInt(rec[1], 10) || 0, "—"];
    });
  }

  var STAND_MAP = { mlb: mlbStandings, nba: espnStandings, nfl: espnStandings, global: espnStandings, ncaa: ncaaRankings };

  /* ---------- public: fetch + map a league for the schedules page ---------- */
  SB.fetchLeagueData = function (key) {
    var standP = proxy(key, "standings")
      .then(function (j) { try { return STAND_MAP[key] ? STAND_MAP[key](j) : null; } catch (e) { return null; } })
      .catch(function () { return null; });
    var schedP = proxy(key, "schedule")
      .then(function (j) { try { return key === "mlb" ? mlbSchedule(j) : espnScoreboard(key, j); } catch (e) { return null; } })
      .catch(function () { return null; });
    return Promise.all([standP, schedP]).then(function (r) { return { standings: r[0], sched: r[1] }; });
  };
})();
