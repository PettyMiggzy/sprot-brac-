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

  /* ---------- Optional live fetch (TheSportsDB free tier) ----------
     The free dev key "3" is intentionally public per TheSportsDB docs.
     We only *enhance* the schedule when reachable; standings & all
     layouts always work from SAMPLE so the site is never broken. */
  var LEAGUE_IDS = { mlb: 4424, nba: 4387, nfl: 4391, ncaa: 4607 };

  SB.fetchLiveSchedule = function (key) {
    var id = LEAGUE_IDS[key];
    if (!id || typeof fetch !== "function") return Promise.reject("unsupported");
    var url = "https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + id;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (ctrl) setTimeout(function () { ctrl.abort(); }, 4000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) {
        var evs = (j && j.events) || [];
        if (!evs.length) throw new Error("no events");
        return evs.slice(0, 6).map(function (e) {
          var date = (e.dateEvent || "").slice(5).replace("-", "/");
          var match = (e.strEvent || (e.strHomeTeam + " vs " + e.strAwayTeam));
          var time = (e.strTime || "").slice(0, 5) || "TBD";
          return [date || "TBD", match, time + " UTC", e.strTVStation || "—"];
        });
      });
  };
})();
