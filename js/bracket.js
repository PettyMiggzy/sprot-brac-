/* ============================================================
   Bracket Maker — single-elimination, click-to-advance
   State persists to localStorage. No dependencies.
   ============================================================ */
(function () {
  "use strict";

  var KEY = "sb.bracket.v1";
  var $ = function (id) { return document.getElementById(id); };

  var DEFAULT_TEAMS = [
    "Top Seeds", "Underdogs", "Cinderella", "Wildcards",
    "Road Warriors", "Hometown", "Dark Horse", "The Champs"
  ];

  // ---- Presets ----
  var PRESETS = {
    nba: { title: "NBA Playoffs", size: 16, teams: [
      "Thunder","Grizzlies","Nuggets","Clippers","Timberwolves","Suns","Lakers","Pelicans",
      "Celtics","Heat","Knicks","76ers","Bucks","Pacers","Cavaliers","Magic"] },
    wc: { title: "World Cup Knockout", size: 32, teams: [
      "Argentina","Australia","France","Senegal","Spain","Japan","England","Mexico",
      "Brazil","Croatia","Portugal","Morocco","Germany","USA","Netherlands","Canada",
      "Belgium","Ecuador","Uruguay","Ghana","Italy","Nigeria","Colombia","Korea Rep.",
      "Denmark","Tunisia","Switzerland","Cameroon","Poland","Iran","Wales","Qatar"] },
    madness: { title: "March Madness", size: 64, teams: (function () {
      var east = ["UConn","Houston","Purdue","Auburn","Iowa St.","Tennessee","Duke","Kentucky"];
      var pool = ["UConn","Houston","Purdue","Auburn","Tennessee","Iowa St.","Duke","Kentucky",
        "Arizona","Marquette","Illinois","Kansas","Baylor","Alabama","Creighton","UNC",
        "Gonzaga","Michigan St.","Wisconsin","BYU","Texas Tech","San Diego St.","Florida","Saint Mary's",
        "Nevada","Dayton","Texas","Colorado","Nebraska","Washington St.","Drake","Yale",
        "Grand Canyon","Oakland","Duquesne","Akron","Morehead St.","Stetson","Longwood","Wagner",
        "Charleston","Colgate","Vermont","UNC Wilmington","Samford","McNeese","Western KY","Montana St.",
        "South Dakota St.","Howard","Saint Peter's","Norfolk St.","Grambling","Long Beach St.","NC State","Oregon",
        "New Mexico","James Madison","Northwestern","Utah St.","TCU","Mississippi St.","Clemson","Florida Atlantic"];
      return pool;
    })() }
  };

  // state.rounds[r] = array of team-name-or-null, length = size / 2^r
  // round 0 holds the entrants (length = size). Winners flow up.
  var state = load() || {
    title: "My Tournament",
    size: 8,
    rounds: [ DEFAULT_TEAMS.slice() ]
  };

  /* ---------- persistence ---------- */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    var n = $("saveNote"); if (n) n.textContent = "Saved locally just now.";
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  /* ---------- helpers ---------- */
  function roundsCount(size) { return Math.log2(size); }
  function roundName(idx, total) {
    var fromEnd = total - idx; // 1 = final
    if (fromEnd === 1) return "Final";
    if (fromEnd === 2) return "Semifinals";
    if (fromEnd === 3) return "Quarterfinals";
    var teams = Math.pow(2, fromEnd);
    return "Round of " + teams;
  }

  // Standard seeding order so 1 plays N, 2 plays N-1, etc.
  function seedOrder(n) {
    var rounds = Math.log2(n);
    var arr = [1, 2];
    for (var r = 1; r < rounds; r++) {
      var next = [];
      var sum = Math.pow(2, r + 1) + 1;
      for (var i = 0; i < arr.length; i++) {
        next.push(arr[i]);
        next.push(sum - arr[i]);
      }
      arr = next;
    }
    return arr; // seeds in slot order
  }

  /* ---------- read inputs into entrants ---------- */
  function entrantsFromTextarea() {
    var size = parseInt($("tSize").value, 10);
    var lines = $("tTeams").value.split("\n").map(function (s) { return s.trim(); });
    var out = [];
    for (var i = 0; i < size; i++) out.push(lines[i] && lines[i].length ? lines[i] : "TBD");
    return out;
  }

  /* ---------- (re)build bracket structure ---------- */
  function build(entrants, keepPicks) {
    var size = entrants.length;
    var total = roundsCount(size);
    var rounds = [entrants.slice()];
    for (var r = 1; r <= total; r++) {
      rounds.push(new Array(size / Math.pow(2, r)).fill(null));
    }
    if (keepPicks && state.rounds) {
      // best-effort: keep picks that still reference valid teams
      for (var rr = 1; rr <= total; rr++) {
        if (!state.rounds[rr]) break;
        for (var s = 0; s < rounds[rr].length; s++) {
          var prev = state.rounds[rr][s];
          if (prev != null) rounds[rr][s] = prev;
        }
      }
    }
    state.size = size;
    state.rounds = rounds;
    propagate();
  }

  // Ensure no winner survives if its source matchup changed
  function propagate() {
    for (var r = 1; r < state.rounds.length; r++) {
      for (var s = 0; s < state.rounds[r].length; s++) {
        var a = state.rounds[r - 1][s * 2];
        var b = state.rounds[r - 1][s * 2 + 1];
        var w = state.rounds[r][s];
        if (w !== a && w !== b) state.rounds[r][s] = null;
      }
    }
  }

  /* ---------- pick a winner ---------- */
  function pick(round, slot) {
    var winner = state.rounds[round][slot];
    if (!winner || winner === "TBD") return;
    var nextRound = round + 1;
    if (nextRound >= state.rounds.length) return;
    var nextSlot = Math.floor(slot / 2);
    // toggle off if clicking the already-advanced team
    if (state.rounds[nextRound][nextSlot] === winner) {
      clearFrom(nextRound, nextSlot);
    } else {
      state.rounds[nextRound][nextSlot] = winner;
      // changing a pick invalidates everything downstream from that path
      clearDownstream(nextRound, nextSlot);
    }
    save();
    render();
  }

  function clearFrom(round, slot) {
    state.rounds[round][slot] = null;
    clearDownstream(round, slot);
  }
  function clearDownstream(round, slot) {
    var r = round + 1, s = Math.floor(slot / 2);
    while (r < state.rounds.length) {
      // only clear if it was fed by this slot's previous winner
      state.rounds[r][s] = null;
      r++; s = Math.floor(s / 2);
    }
  }

  /* ---------- render ---------- */
  function slotHTML(round, slot, isChampCol) {
    var name = state.rounds[round][slot];
    var label = name == null ? "TBD" : name;
    var empty = name == null || name === "TBD";
    var seed = "";
    if (round === 0) seed = '<span class="seed">' + (slot + 1) + '</span>';

    // is this team the advanced winner of its matchup?
    var picked = false;
    if (round + 1 < state.rounds.length && name != null) {
      var ns = Math.floor(slot / 2);
      picked = state.rounds[round + 1][ns] === name;
    }
    var cls = "slot" + (empty ? " empty" : "") + (picked ? " picked" : "");
    return '<div class="' + cls + '" data-r="' + round + '" data-s="' + slot + '">' +
      seed + '<span class="nm">' + label + '</span></div>';
  }

  function render() {
    $("tName").value = state.title;
    $("tSize").value = String(state.size);
    $("boardTitle").textContent = state.title || "Bracket";

    var total = state.rounds.length - 1; // index of final
    var html = "";

    for (var r = 0; r < state.rounds.length; r++) {
      var isFinalCol = r === total;
      html += '<div class="round"><div class="round-title">' +
        (isFinalCol ? "Champion" : roundName(r, total)) + '</div>';

      if (isFinalCol) {
        var champ = state.rounds[r][0];
        html += '<div class="champion-box"><div class="lbl">🏆 Champion</div><div class="nm">' +
          (champ || "—") + '</div></div></div>';
      } else {
        for (var s = 0; s < state.rounds[r].length; s += 2) {
          html += '<div class="match">' + slotHTML(r, s) + slotHTML(r, s + 1) + '</div>';
        }
        html += '</div>';
      }
    }
    $("board").innerHTML = html;

    var champ = state.rounds[total][0];
    var tag = $("champTag");
    if (champ) { tag.style.display = ""; tag.textContent = "🏆 " + champ; }
    else { tag.style.display = "none"; }
  }

  /* ---------- share link (encode/decode state in URL) ---------- */
  function encodeState() {
    try {
      var json = JSON.stringify({ t: state.title, s: state.size, r: state.rounds });
      return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
    } catch (e) { return ""; }
  }
  function decodeState(str) {
    try {
      var json = decodeURIComponent(escape(atob(decodeURIComponent(str))));
      var o = JSON.parse(json);
      if (o && o.r && o.s) return { title: o.t || "Shared Bracket", size: o.s, rounds: o.r };
    } catch (e) {}
    return null;
  }
  function shareLink() {
    var code = encodeState();
    // Share the /api/share link: it unfurls with a generated OG preview of
    // THIS bracket, then redirects whoever opens it into the maker.
    var url = location.origin + "/api/share?s=" + code;
    var done = function () { SB.toast("Share link copied — it previews your bracket!"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { prompt("Copy this link:", url); });
    } else { prompt("Copy this link:", url); }
    // Keep the current page's own state in the hash so a reload restores it.
    if (history.replaceState) history.replaceState(null, "", "#b=" + code);
  }

  /* ---------- PNG export (draw bracket to canvas) ---------- */
  function exportPNG() {
    var unitH = 30, colW = 168, gapX = 38, boxH = 26, pad = 40, titleH = 50;
    var total = state.rounds.length - 1;
    var cols = state.rounds.length;
    var scale = 2;
    var W = pad * 2 + cols * colW + (cols - 1) * gapX;
    var H = titleH + pad * 2 + state.size * unitH;

    var cv = document.createElement("canvas");
    cv.width = W * scale; cv.height = H * scale;
    var x = cv.getContext("2d");
    x.scale(scale, scale);
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    x.fillStyle = dark ? "#0e1220" : "#ffffff";
    x.fillRect(0, 0, W, H);

    // title
    x.fillStyle = dark ? "#eef1f8" : "#1c2030";
    x.font = "800 22px Inter, system-ui, sans-serif";
    x.fillText(state.title || "Bracket", pad, 32);
    x.fillStyle = "#8c93ab";
    x.font = "600 12px Inter, system-ui, sans-serif";
    x.fillText("sportsbrackets.net", pad, 46);

    function centerY(r, i) { return titleH + pad + (i + 0.5) * Math.pow(2, r) * unitH; }

    for (var r = 0; r < cols; r++) {
      var cx = pad + r * (colW + gapX);
      for (var i = 0; i < state.rounds[r].length; i++) {
        var cyc = centerY(r, i);
        var name = state.rounds[r][i];
        var isChamp = r === total;
        // connector to next round
        if (r < total) {
          var nx = pad + (r + 1) * (colW + gapX);
          var ny = centerY(r + 1, Math.floor(i / 2));
          x.strokeStyle = dark ? "#2a3042" : "#e4e7ee";
          x.lineWidth = 1.5;
          x.beginPath();
          x.moveTo(cx + colW, cyc);
          x.lineTo(cx + colW + gapX / 2, cyc);
          x.lineTo(cx + colW + gapX / 2, ny);
          x.lineTo(nx, ny);
          x.stroke();
        }
        // box
        var picked = false;
        if (r + 1 < cols && name != null) picked = state.rounds[r + 1][Math.floor(i / 2)] === name;
        x.fillStyle = dark ? "#141a2b" : "#ffffff";
        x.strokeStyle = isChamp ? "#f59e0b" : (picked ? "#2f6df6" : (dark ? "#2a3042" : "#e4e7ee"));
        x.lineWidth = isChamp || picked ? 2 : 1.2;
        roundRect(x, cx, cyc - boxH / 2, colW, boxH, 6);
        x.fill(); x.stroke();
        // color swatch
        var label = name == null ? "—" : name;
        if (name && SB.colorFor) {
          x.fillStyle = SB.colorFor(name);
          x.fillRect(cx + 1, cyc - boxH / 2 + 1, 4, boxH - 2);
        }
        x.fillStyle = dark ? "#eef1f8" : "#1c2030";
        x.font = (isChamp || picked ? "800 " : "600 ") + "12px Inter, system-ui, sans-serif";
        x.fillText(clip(x, label, colW - 18), cx + 11, cyc + 4);
      }
    }

    var url = cv.toDataURL("image/png");
    var a = document.createElement("a");
    a.href = url;
    a.download = (state.title || "bracket").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".png";
    document.body.appendChild(a); a.click(); a.remove();
    SB.toast("Bracket PNG downloaded!");
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function clip(c, text, maxW) {
    if (c.measureText(text).width <= maxW) return text;
    while (text.length > 1 && c.measureText(text + "…").width > maxW) text = text.slice(0, -1);
    return text + "…";
  }

  /* ---------- wire up ---------- */
  function syncTextarea() {
    $("tTeams").value = state.rounds[0].map(function (t) { return t === "TBD" ? "" : t; }).join("\n");
  }

  function onBuild() {
    state.title = $("tName").value.trim() || "My Tournament";
    build(entrantsFromTextarea(), false);
    save(); render();
    SB.toast("Bracket built — start picking winners!");
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Load a shared bracket from the URL if present (overrides saved state)
    var m = location.hash.match(/b=([^&]+)/);
    if (m) {
      var shared = decodeState(m[1]);
      if (shared) { state = shared; save(); SB.toast("Loaded a shared bracket!"); }
    }

    // first paint
    if (!state.rounds || state.rounds.length < 2) build(state.rounds ? state.rounds[0] : DEFAULT_TEAMS.slice(), false);
    syncTextarea();
    render();

    $("board").addEventListener("click", function (e) {
      var el = e.target.closest(".slot");
      if (!el || el.classList.contains("empty")) return;
      pick(parseInt(el.getAttribute("data-r"), 10), parseInt(el.getAttribute("data-s"), 10));
    });

    $("buildBtn").addEventListener("click", onBuild);

    $("tName").addEventListener("input", function () {
      state.title = $("tName").value;
      $("boardTitle").textContent = state.title || "Bracket";
      save();
    });

    $("tSize").addEventListener("change", function () {
      var size = parseInt($("tSize").value, 10);
      var cur = state.rounds[0];
      var entrants = [];
      for (var i = 0; i < size; i++) entrants.push(cur[i] || "TBD");
      build(entrants, false);
      syncTextarea(); save(); render();
    });

    $("seedBtn").addEventListener("click", function () {
      // Re-order current entrants into standard seed slots
      var teams = state.rounds[0].slice();
      var order = seedOrder(teams.length); // seed number per slot
      var bySeed = teams.slice(); // assume already in seed order 1..N as typed
      var arranged = order.map(function (seed) { return bySeed[seed - 1] || "TBD"; });
      build(arranged, false);
      syncTextarea(); save(); render();
      SB.toast("Seeded 1 vs N, 2 vs N-1 …");
    });

    $("shuffleBtn").addEventListener("click", function () {
      var t = state.rounds[0].slice();
      for (var i = t.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = t[i]; t[i] = t[j]; t[j] = tmp;
      }
      build(t, false);
      syncTextarea(); save(); render();
      SB.toast("Teams shuffled.");
    });

    $("resetBtn").addEventListener("click", function () {
      build(state.rounds[0].slice(), false);
      save(); render();
      SB.toast("Picks cleared.");
    });

    $("printBtn").addEventListener("click", function () { window.print(); });
    $("shareBtn").addEventListener("click", shareLink);
    $("pngBtn").addEventListener("click", exportPNG);

    $("tPreset").addEventListener("change", function () {
      var p = PRESETS[$("tPreset").value];
      if (!p) return;
      state.title = p.title;
      build(p.teams.slice(0, p.size), false);
      syncTextarea(); save(); render();
      SB.toast(p.title + " loaded — " + p.size + " teams.");
      $("tPreset").value = "";
    });
  });
})();
