/* ============================================================
   js/wc.js — 2026 FIFA World Cup hub data wiring
   ------------------------------------------------------------
   1. Renders bundled SAMPLE data immediately so the page is
      always complete (and works with no API key / offline).
   2. Calls the same-origin /api/wc proxy (football-data.org) and,
      when live data is available, upgrades the group standings,
      match schedule, and knockout bracket in place.

   Live data requires FOOTBALL_DATA_KEY set in the Vercel project.
   Without it the proxy returns 503 and we keep the sample data.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var colorFor = (window.SB && SB.colorFor) ? SB.colorFor : function () { return "#2f6df6"; };

  /* ---------- TV map (not provided by the API) ---------- */
  var TV = {
    GROUP_STAGE: "FOX / FS1", LAST_32: "FOX", LAST_16: "FOX",
    QUARTER_FINALS: "FOX", SEMI_FINALS: "FOX", THIRD_PLACE: "FS1", FINAL: "FOX"
  };

  /* ---------- Stage labels + knockout order ---------- */
  var STAGE_LABEL = {
    GROUP_STAGE: "Group", LAST_32: "Round of 32", LAST_16: "Round of 16",
    QUARTER_FINALS: "Quarterfinal", SEMI_FINALS: "Semifinal",
    THIRD_PLACE: "Third Place", FINAL: "Final"
  };
  var KO_ORDER = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];

  /* ====================================================================
     SAMPLE DATA (fallback) — illustrative until live data is available
     ==================================================================== */
  var SAMPLE_GROUPS = {
    "Group A": [["Mexico", 6], ["Poland", 4], ["Saudi Arabia", 1], ["New Zealand", 1]],
    "Group B": [["Canada", 7], ["Belgium", 5], ["Ecuador", 3], ["Qatar", 0]],
    "Group C": [["Argentina", 9], ["Australia", 4], ["Nigeria", 3], ["Iran", 1]],
    "Group D": [["USA", 7], ["Wales", 4], ["Senegal", 3], ["Tunisia", 2]],
    "Group E": [["Spain", 6], ["Japan", 6], ["Egypt", 2], ["Costa Rica", 1]],
    "Group F": [["France", 7], ["Denmark", 5], ["Ghana", 2], ["Honduras", 1]]
  };

  var SAMPLE_SCORERS = [
    ["K. Mbappé", "France", 6, 2], ["L. Messi", "Argentina", 5, 3], ["H. Kane", "England", 5, 1],
    ["V. Osimhen", "Nigeria", 4, 0], ["P. Foden", "England", 3, 4], ["J. Álvarez", "Argentina", 3, 2]
  ];

  var SAMPLE_SCHED = [
    ["Jun 11", "Opening", "Mexico vs TBD", "Estadio Azteca", "8:00 PM", "FOX"],
    ["Jun 12", "Group", "Canada vs TBD", "BMO Field", "6:00 PM", "FS1"],
    ["Jun 12", "Group", "USA vs TBD", "SoFi Stadium", "9:00 PM", "FOX"],
    ["Jun 28", "Round of 32", "TBD vs TBD", "MetLife Stadium", "3:00 PM", "FOX"],
    ["Jul 4", "Round of 16", "TBD vs TBD", "AT&T Stadium", "4:00 PM", "FOX"],
    ["Jul 11", "Quarterfinal", "TBD vs TBD", "Mercedes-Benz Stadium", "3:00 PM", "FOX"],
    ["Jul 14", "Semifinal", "TBD vs TBD", "AT&T Stadium", "3:00 PM", "FOX"],
    ["Jul 19", "Final", "TBD vs TBD", "MetLife Stadium", "3:00 PM", "FOX"]
  ];

  /* ====================================================================
     RENDERERS (shared by sample + live)
     ==================================================================== */

  // groups: array of { name, rows:[ [team, pts, advancing] ] }
  function renderGroups(groups) {
    $("groupGrid").innerHTML = groups.map(function (g) {
      var rows = g.rows.map(function (t, i) {
        var adv = (t[2] != null ? t[2] : i < 2);
        var style = adv ? ' style="font-weight:700"' : '';
        return '<tr' + style + '><td>' + (i + 1) + '</td>' +
          '<td class="team" style="border-left:3px solid ' + colorFor(t[0]) + '">' + t[0] + '</td>' +
          '<td>' + t[1] + '</td></tr>';
      }).join("");
      return '<div class="table-wrap"><table class="data"><thead>' +
        '<tr><th colspan="3" style="color:var(--accent)">' + g.name + '</th></tr>' +
        '<tr><th>#</th><th>Team</th><th>Pts</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).join("");
  }

  // rows: [date, roundLabel, matchLabel, venue, kickoff, tv, statusPill?]
  function renderSchedule(rows) {
    $("schedRows").innerHTML = rows.map(function (r) {
      var teams = r[2].split(/\svs\s|\s–\s|\s[–-]\s/);
      var accent = colorFor(teams[0]);
      var pill = r[6] ? " " + r[6] : (r[1] === "Final" ? ' <span class="pill win">★</span>' : "");
      return '<tr><td>' + r[0] + '</td><td>' + r[1] + pill + '</td>' +
        '<td class="team" style="border-left:3px solid ' + accent + '">' + r[2] + '</td>' +
        '<td>' + r[3] + '</td><td>' + r[4] + '</td><td>' + r[5] + '</td></tr>';
    }).join("");
  }

  // scorers: array of [player, team, goals, assists]
  function renderScorers(rows) {
    var el = $("scorerRows");
    if (!el) return;
    el.innerHTML = rows.map(function (s, i) {
      return '<tr><td>' + (i + 1) + '</td><td class="team">' + s[0] + '</td>' +
        '<td style="border-left:3px solid ' + colorFor(s[1]) + '">' + s[1] + '</td>' +
        '<td><b>' + s[2] + '</b></td><td>' + (s[3] != null ? s[3] : "—") + '</td></tr>';
    }).join("");
  }
  function mapScorers(data) {
    var list = data && data.scorers;
    if (!Array.isArray(list) || !list.length) return null;
    return list.slice(0, 10).map(function (s) {
      return [
        (s.player && s.player.name) || "—",
        (s.team && (s.team.shortName || s.team.name)) || "—",
        s.goals != null ? s.goals : 0,
        s.assists
      ];
    });
  }

  // Sample/static bracket (used until knockout matches exist)
  function renderSampleBracket() {
    var R32_LEFT = ["Argentina", "Poland", "France", "Senegal", "Spain", "Japan", "England", "Mexico"];
    var R32_RIGHT = ["Brazil", "Croatia", "Portugal", "Morocco", "Germany", "USA", "Netherlands", "Canada"];
    function col(title, teams, winners) {
      var matches = "";
      for (var i = 0; i < teams.length; i += (winners ? 1 : 2)) {
        if (winners) {
          matches += '<div class="match"><div class="slot picked"><span class="nm">' + teams[i] + '</span></div></div>';
        } else {
          matches += '<div class="match">' +
            '<div class="slot"><span class="seed">' + (i + 1) + '</span><span class="nm">' + teams[i] + '</span></div>' +
            '<div class="slot"><span class="seed">' + (i + 2) + '</span><span class="nm">' + teams[i + 1] + '</span></div></div>';
        }
      }
      return '<div class="round"><div class="round-title">' + title + '</div>' + matches + '</div>';
    }
    var wc = "";
    wc += col("Round of 32", R32_LEFT, false);
    wc += col("Round of 16", ["Argentina", "France", "Spain", "England"], true);
    wc += col("Quarterfinal", ["Argentina", "Spain"], true);
    wc += '<div class="round"><div class="round-title">Final</div>' +
      '<div class="champion-box"><div class="lbl">🏆 Champion</div><div class="nm">Your pick</div></div></div>';
    wc += col("Quarterfinal", ["Brazil", "Germany"], true);
    wc += col("Round of 16", ["Brazil", "Portugal", "Germany", "Netherlands"], true);
    wc += col("Round of 32", R32_RIGHT, false);
    $("wcBracket").innerHTML = wc;
  }

  /* ====================================================================
     LIVE DATA (football-data.org via /api/wc proxy)
     ==================================================================== */

  function teamName(t) {
    if (!t || !t.name) return "TBD";
    return t.tla || t.shortName || t.name;
  }
  function et(iso, opts) {
    try {
      return new Date(iso).toLocaleString("en-US",
        Object.assign({ timeZone: "America/New_York" }, opts));
    } catch (e) { return "TBD"; }
  }
  function etDate(iso) { return iso ? et(iso, { month: "short", day: "numeric" }) : "TBD"; }
  function etTime(iso) { return iso ? et(iso, { hour: "numeric", minute: "2-digit" }) : "TBD"; }

  function statusPill(m) {
    var s = m.status;
    if (s === "IN_PLAY" || s === "PAUSED" || s === "LIVE") return '<span class="pill live">LIVE</span>';
    if (s === "FINISHED") return '<span class="pill win">FT</span>';
    if (s === "POSTPONED" || s === "SUSPENDED" || s === "CANCELLED") return '<span class="pill loss">' + s.slice(0, 4) + '</span>';
    return "";
  }
  function matchLabel(m) {
    var h = teamName(m.homeTeam), a = teamName(m.awayTeam);
    var ft = m.score && m.score.fullTime;
    var scored = ft && ft.home != null && ft.away != null;
    var show = scored && (m.status === "FINISHED" || m.status === "IN_PLAY" || m.status === "PAUSED" || m.status === "LIVE");
    if (show) return h + " " + ft.home + "–" + ft.away + " " + a;
    return h + " vs " + a;
  }

  function fetchResource(resource) {
    return fetch("/api/sports?league=wc&resource=" + resource, { headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("proxy " + r.status);
        return r.json();
      });
  }

  function mapStandings(data) {
    if (!data || !Array.isArray(data.standings)) return null;
    var groups = data.standings
      .filter(function (s) { return s.stage === "GROUP_STAGE" && (s.type === "TOTAL" || !s.type); })
      .map(function (s) {
        var name = (s.group || "Group").replace("GROUP_", "Group ").replace(/_/g, " ");
        var rows = (s.table || []).map(function (row) {
          return [teamFull(row.team), row.points, row.position <= 2];
        });
        return { name: name, rows: rows };
      });
    return groups.length ? groups : null;
  }
  function teamFull(t) { return (t && (t.shortName || t.name)) || "TBD"; }

  function mapSchedule(matches) {
    if (!Array.isArray(matches) || !matches.length) return null;
    var sorted = matches.slice().sort(function (a, b) {
      return new Date(a.utcDate || 0) - new Date(b.utcDate || 0);
    });
    return sorted.map(function (m) {
      var round = STAGE_LABEL[m.stage] || (m.stage || "Match");
      var venue = m.venue || "TBD";
      return [etDate(m.utcDate), round, matchLabel(m), venue, etTime(m.utcDate), TV[m.stage] || "FOX", statusPill(m)];
    });
  }

  function mapBracket(matches) {
    if (!Array.isArray(matches)) return false;
    var byStage = {};
    KO_ORDER.forEach(function (s) { byStage[s] = []; });
    matches.forEach(function (m) {
      if (byStage[m.stage]) byStage[m.stage].push(m);
    });
    // need at least one knockout match to take over from the sample bracket
    var hasKO = KO_ORDER.some(function (s) { return byStage[s].length; });
    if (!hasKO) return false;

    function slot(team, win, score) {
      var name = teamName(team);
      var cls = "slot" + (name === "TBD" ? " empty" : "") + (win ? " picked" : "");
      var sc = (score != null && name !== "TBD") ? '<span class="bk-score">' + score + '</span>' : "";
      return '<div class="' + cls + '"><span class="nm">' + name + '</span>' + sc + '</div>';
    }
    function isLive(m) { return m.status === "IN_PLAY" || m.status === "PAUSED" || m.status === "LIVE"; }

    var html = "";
    KO_ORDER.forEach(function (stage) {
      var games = byStage[stage];
      if (stage === "FINAL") return; // rendered as champion box below
      if (!games.length) {
        // placeholder column so the bracket keeps its shape
        html += '<div class="round"><div class="round-title">' + STAGE_LABEL[stage] +
          '</div><div class="match"><div class="slot empty"><span class="nm">TBD</span></div>' +
          '<div class="slot empty"><span class="nm">TBD</span></div></div></div>';
        return;
      }
      var matches3 = games.map(function (m) {
        var w = m.score && m.score.winner;
        var ft = m.score && m.score.fullTime;
        var hs = ft ? ft.home : null, as = ft ? ft.away : null;
        return '<div class="match' + (isLive(m) ? " live" : "") + '">' +
          slot(m.homeTeam, w === "HOME_TEAM", hs) + slot(m.awayTeam, w === "AWAY_TEAM", as) + '</div>';
      }).join("");
      html += '<div class="round"><div class="round-title">' + STAGE_LABEL[stage] + '</div>' + matches3 + '</div>';
    });

    // Final / champion
    var finals = byStage.FINAL;
    var champ = "TBD";
    if (finals && finals.length) {
      var f = finals[0];
      var w = f.score && f.score.winner;
      if (w === "HOME_TEAM") champ = teamName(f.homeTeam);
      else if (w === "AWAY_TEAM") champ = teamName(f.awayTeam);
    }
    html += '<div class="round"><div class="round-title">Final</div>' +
      '<div class="champion-box"><div class="lbl">🏆 Champion</div><div class="nm">' + champ + '</div></div></div>';

    $("wcBracket").innerHTML = html;
    return true;
  }

  function setStatus(state) {
    var el = $("wcStatus");
    if (!el) return;
    if (state === "live") { el.textContent = "Live via football-data.org"; el.className = "pill live"; }
    else if (state === "checking") { el.textContent = "checking live data…"; el.className = "pill"; }
    else { el.textContent = "Sample data — add an API key to go live"; el.className = "pill"; }
  }

  /* ====================================================================
     LIVE LOADER — fetches standings + matches and upgrades the page.
     As real results come in, the bracket auto-advances winners and the
     champion resolves itself. Re-run on an interval to stay live.
     ==================================================================== */
  function loadLive() {
    var gotLive = false;

    var pStand = fetchResource("standings").then(function (d) {
      var g = mapStandings(d);
      if (g) { renderGroups(g); gotLive = true; }
    }).catch(function () { /* keep sample */ });

    // ROUTES.wc.schedule on the proxy maps to football-data's /matches endpoint,
    // which we use for BOTH the schedule table and the knockout bracket.
    var pMatch = fetchResource("schedule").then(function (d) {
      var rows = mapSchedule(d && d.matches);
      if (rows) { renderSchedule(rows); gotLive = true; }
      if (d && mapBracket(d.matches)) gotLive = true;
    }).catch(function () { /* keep sample */ });

    var pScore = fetchResource("scorers").then(function (d) {
      var rows = mapScorers(d);
      if (rows) { renderScorers(rows); gotLive = true; }
    }).catch(function () { /* keep sample */ });

    return Promise.all([pStand, pMatch, pScore]).then(function () {
      setStatus(gotLive ? "live" : "sample");
      return gotLive;
    });
  }

  /* ====================================================================
     BOOT
     ==================================================================== */
  var REFRESH_MS = 60000; // auto-refresh once a minute while the tab is open
  document.addEventListener("DOMContentLoaded", function () {
    // 1) Always render the sample data first so the page is complete.
    renderGroups(Object.keys(SAMPLE_GROUPS).map(function (name) {
      return { name: name, rows: SAMPLE_GROUPS[name] };
    }));
    renderSchedule(SAMPLE_SCHED);
    renderScorers(SAMPLE_SCORERS);
    renderSampleBracket();
    setStatus("checking");

    // 2) Upgrade to live data now, then keep it fresh.
    loadLive();
    setInterval(function () {
      if (!document.hidden) loadLive();
    }, REFRESH_MS);
    // Refresh immediately when the user returns to the tab.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) loadLive();
    });
  });
})();
