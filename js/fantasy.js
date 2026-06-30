/* ============================================================
   js/fantasy.js — World Cup Fantasy squad builder
   Budget draft: formations, 11 players, max 3 per country,
   captain (2x), pitch UI, player picker, save + share.
   Standalone strategy sandbox — no wallet / no real money here.
   ============================================================ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var colorFor = (window.SB && SB.colorFor) ? SB.colorFor : function () { return "#2f6df6"; };

  var BUDGET = 100.0;       // £m
  var MAX_PER_COUNTRY = 3;
  var KEY = "sb.squad.v1";

  var FORMATIONS = {
    "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
    "3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
    "3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
    "5-3-2": { GK: 1, DEF: 5, MID: 3, FWD: 2 },
    "5-4-1": { GK: 1, DEF: 5, MID: 4, FWD: 1 }
  };
  var ROWS = ["FWD", "MID", "DEF", "GK"]; // top -> bottom on the pitch

  // id, name, country, pos, price (£m)
  var POOL = [
    // FWD
    ["mbappe","K. Mbappé","France","FWD",12.5],["haaland","E. Haaland","Norway","FWD",11.5],
    ["messi","L. Messi","Argentina","FWD",11.0],["kane","H. Kane","England","FWD",11.0],
    ["vinicius","Vinícius Jr","Brazil","FWD",11.5],["alvarez","J. Álvarez","Argentina","FWD",8.5],
    ["osimhen","V. Osimhen","Nigeria","FWD",9.0],["lautaro","L. Martínez","Argentina","FWD",9.0],
    ["pulisic","C. Pulisic","USA","FWD",7.5],["lukaku","R. Lukaku","Belgium","FWD",8.0],
    ["nunez","D. Núñez","Uruguay","FWD",7.0],["raphinha","Raphinha","Brazil","FWD",8.0],
    ["griezmann","A. Griezmann","France","FWD",9.0],["lewandowski","R. Lewandowski","Poland","FWD",8.5],
    // MID
    ["bellingham","J. Bellingham","England","MID",10.5],["pedri","Pedri","Spain","MID",8.5],
    ["debruyne","K. De Bruyne","Belgium","MID",10.0],["wirtz","F. Wirtz","Germany","MID",8.5],
    ["bruno","B. Fernandes","Portugal","MID",9.0],["valverde","F. Valverde","Uruguay","MID",8.0],
    ["rodri","Rodri","Spain","MID",8.0],["musiala","J. Musiala","Germany","MID",9.0],
    ["foden","P. Foden","England","MID",9.5],["mcennis","W. McKennie","USA","MID",6.0],
    ["mac","E. Mac Allister","Argentina","MID",7.5],["gavi","Gavi","Spain","MID",7.0],
    ["fofana","Y. Fofana","France","MID",6.5],["szoboszlai","D. Szoboszlai","Hungary","MID",6.5],
    ["modric","L. Modrić","Croatia","MID",7.0],["kimmich","J. Kimmich","Germany","MID",7.5],
    // DEF
    ["vandijk","V. van Dijk","Netherlands","DEF",6.5],["hakimi","A. Hakimi","Morocco","DEF",6.5],
    ["saliba","W. Saliba","France","DEF",6.0],["dias","R. Dias","Portugal","DEF",6.0],
    ["alexander","T. Alexander-Arnold","England","DEF",6.5],["marquinhos","Marquinhos","Brazil","DEF",6.0],
    ["bastoni","A. Bastoni","Italy","DEF",5.5],["theo","T. Hernández","France","DEF",6.0],
    ["robertson","A. Robertson","Scotland","DEF",6.0],["gvardiol","J. Gvardiol","Croatia","DEF",5.5],
    ["araujo","R. Araújo","Uruguay","DEF",5.5],["robinson","A. Robinson","USA","DEF",5.0],
    ["romero","C. Romero","Argentina","DEF",5.5],["rudiger","A. Rüdiger","Germany","DEF",5.5],
    ["cancelo","J. Cancelo","Portugal","DEF",5.5],["stones","J. Stones","England","DEF",5.5],
    // GK
    ["martinez","E. Martínez","Argentina","GK",6.0],["alisson","Alisson","Brazil","GK",6.0],
    ["courtois","T. Courtois","Belgium","GK",6.0],["maignan","M. Maignan","France","GK",5.5],
    ["bono","Y. Bounou","Morocco","GK",5.0],["pickford","J. Pickford","England","GK",5.5],
    ["neuer","M. Neuer","Germany","GK",5.5],["turner","M. Turner","USA","GK",4.5],
    ["ochoa","G. Ochoa","Mexico","GK",4.5],["livakovic","D. Livaković","Croatia","GK",5.0]
  ].map(function (p) { return { id: p[0], name: p[1], country: p[2], pos: p[3], price: p[4] }; });

  var BY_ID = {};
  POOL.forEach(function (p) { BY_ID[p.id] = p; });

  var SCORING = [
    ["Goal", "6", "5", "4"], ["Assist", "3", "3", "3"], ["Clean sheet", "4", "1", "0"],
    ["60+ minutes", "2", "2", "2"], ["Yellow card", "−1", "−1", "−1"], ["Red card", "−3", "−3", "−3"]
  ];

  var state = load() || { formation: "4-3-3", picks: {}, captain: null };
  var filterPos = "ALL";
  var activeSlot = null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function slotIdsFor(formation) {
    var counts = FORMATIONS[formation], ids = [];
    ["GK", "DEF", "MID", "FWD"].forEach(function (pos) {
      for (var i = 0; i < counts[pos]; i++) ids.push(pos + i);
    });
    return ids;
  }
  function posOfSlot(slotId) { return slotId.replace(/\d+$/, ""); }

  function pickedPlayers() {
    return Object.keys(state.picks).map(function (s) { return BY_ID[state.picks[s]]; }).filter(Boolean);
  }
  function spent() { return pickedPlayers().reduce(function (a, p) { return a + p.price; }, 0); }
  function remaining() { return BUDGET - spent(); }
  function countryCount(country) {
    return pickedPlayers().filter(function (p) { return p.country === country; }).length;
  }
  function isPicked(id) {
    return Object.keys(state.picks).some(function (s) { return state.picks[s] === id; });
  }
  function pickedCount() { return Object.keys(state.picks).filter(function (s) { return state.picks[s]; }).length; }

  /* ---------- mutations ---------- */
  function firstEmptySlot(pos) {
    var ids = slotIdsFor(state.formation);
    for (var i = 0; i < ids.length; i++) {
      if (posOfSlot(ids[i]) === pos && !state.picks[ids[i]]) return ids[i];
    }
    return null;
  }

  function addPlayer(id) {
    var p = BY_ID[id];
    if (!p || isPicked(id)) return;
    var slot = (activeSlot && posOfSlot(activeSlot) === p.pos && !state.picks[activeSlot]) ? activeSlot : firstEmptySlot(p.pos);
    if (!slot) { SB.toast("No open " + p.pos + " slot in this formation."); return; }
    if (p.price > remaining() + 1e-9) { SB.toast("Over budget — free up £" + (p.price - remaining()).toFixed(1) + "m."); return; }
    if (countryCount(p.country) >= MAX_PER_COUNTRY) { SB.toast("Max " + MAX_PER_COUNTRY + " players from " + p.country + "."); return; }
    state.picks[slot] = id;
    activeSlot = null;
    save(); renderAll();
  }
  function removeSlot(slotId) {
    var id = state.picks[slotId];
    delete state.picks[slotId];
    if (state.captain === id) state.captain = null;
    save(); renderAll();
  }
  function setCaptain(id) {
    state.captain = (state.captain === id) ? null : id;
    save(); renderAll();
  }

  function changeFormation(f) {
    // Keep players that still fit the new position counts; refund the rest.
    var counts = FORMATIONS[f];
    var keep = {}; var usedByPos = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    var dropped = 0;
    // preserve in slot order
    slotIdsFor(state.formation).forEach(function (s) {
      var id = state.picks[s]; if (!id) return;
      var pos = BY_ID[id].pos;
      if (usedByPos[pos] < counts[pos]) { keep[pos + usedByPos[pos]] = id; usedByPos[pos]++; }
      else dropped++;
    });
    state.formation = f; state.picks = keep;
    if (state.captain && !isPicked(state.captain)) state.captain = null;
    if (dropped) SB.toast(dropped + " player(s) didn't fit " + f + " — removed.");
    save(); renderAll();
  }

  function autoPick() {
    state.picks = {}; state.captain = null;
    var ids = slotIdsFor(state.formation);
    // cheapest-first fill, respecting budget + country cap
    ids.forEach(function (slot) {
      var pos = posOfSlot(slot);
      var cands = POOL.filter(function (p) {
        return p.pos === pos && !isPicked(p.id) && countryCount(p.country) < MAX_PER_COUNTRY && p.price <= remaining() + 1e-9;
      }).sort(function (a, b) { return a.price - b.price; });
      // pick a mid-priced option when affordable for a more realistic squad
      var choice = cands[Math.min(cands.length - 1, Math.floor(cands.length * 0.35))] || cands[0];
      if (choice) state.picks[slot] = choice.id;
    });
    // captain = priciest forward/mid picked
    var stars = pickedPlayers().filter(function (p) { return p.pos === "FWD" || p.pos === "MID"; })
      .sort(function (a, b) { return b.price - a.price; });
    if (stars[0]) state.captain = stars[0].id;
    save(); renderAll();
    SB.toast("Auto-picked a valid XI — tweak away!");
  }

  /* ---------- render ---------- */
  function renderPitch() {
    var counts = FORMATIONS[state.formation];
    var html = "";
    ROWS.forEach(function (pos) {
      var row = "";
      for (var i = 0; i < counts[pos]; i++) {
        var slotId = pos + i, id = state.picks[slotId], p = id ? BY_ID[id] : null;
        if (p) {
          var isCap = state.captain === id;
          row += '<div class="pslot filled" data-slot="' + slotId + '">' +
            '<span class="swatch" style="background:' + colorFor(p.country) + '"></span>' +
            '<span class="nm">' + p.name + (isCap ? ' Ⓒ' : '') + '</span>' +
            '<span class="meta2">' + p.country + ' · £' + p.price.toFixed(1) + 'm</span>' +
            '<span class="acts"><button class="cbtn' + (isCap ? ' on' : '') + '" data-cap="' + id + '" title="Captain">C</button>' +
            '<button class="xbtn" data-rm="' + slotId + '" title="Remove">✕</button></span></div>';
        } else {
          var active = activeSlot === slotId ? " active" : "";
          row += '<div class="pslot' + active + '" data-slot="' + slotId + '"><span class="pos">' + pos + '</span><span class="nm" style="color:rgba(255,255,255,.85)">+ Add</span></div>';
        }
      }
      html += '<div class="pitch-row">' + row + '</div>';
    });
    $("pitch").innerHTML = html;
  }

  function renderSide() {
    $("budget").textContent = "£" + BUDGET.toFixed(1) + "m";
    var rem = remaining();
    var remEl = $("remaining");
    remEl.textContent = "£" + rem.toFixed(1) + "m";
    remEl.className = rem < 0 ? "invalid" : "";
    var cap = state.captain ? BY_ID[state.captain] : null;
    $("captainName").textContent = cap ? cap.name : "—";

    var n = pickedCount();
    var complete = n === 11 && rem >= -1e-9 && !!state.captain;
    var st = $("statusTxt");
    st.textContent = complete ? "Ready to play ✓" : (n + "/11 · " + (state.captain ? "" : "pick a captain · ") + "£" + rem.toFixed(1) + "m left").replace("· £", "· £");
    st.className = complete ? "valid" : "invalid";

    var sv = $("squadValid");
    sv.textContent = n + " / 11 picked" + (state.captain ? " · ✓ captain" : "");
    sv.className = "pill " + (complete ? "win" : "");
    $("formation").value = state.formation;
  }

  function renderList() {
    var rows = POOL.filter(function (p) { return filterPos === "ALL" || p.pos === filterPos; })
      .sort(function (a, b) { return b.price - a.price; });
    $("playerList").innerHTML = rows.map(function (p) {
      var picked = isPicked(p.id);
      var slotOpen = !!firstEmptySlot(p.pos) || (activeSlot && posOfSlot(activeSlot) === p.pos);
      var afford = p.price <= remaining() + 1e-9;
      var capOk = countryCount(p.country) < MAX_PER_COUNTRY;
      var disabled = picked || !slotOpen || !afford || !capOk;
      var why = picked ? "Picked" : (!slotOpen ? "No slot" : (!afford ? "£" : (!capOk ? "Max 3" : "Add")));
      return '<div class="pl-row' + (picked ? ' picked' : '') + '">' +
        '<span class="swatch" style="display:inline-block;width:16px;height:6px;border-radius:3px;background:' + colorFor(p.country) + '"></span>' +
        '<span class="nm">' + p.name + ' <span class="ct">' + p.pos + ' · ' + p.country + '</span></span>' +
        '<span class="pr">£' + p.price.toFixed(1) + '</span>' +
        '<button data-add="' + p.id + '"' + (disabled ? ' disabled' : '') + '>' + (picked ? '✓' : 'Add') + '</button></div>';
    }).join("");
  }

  function renderScoring() {
    var t = $("scoreTable");
    if (t) t.innerHTML = SCORING.map(function (r) {
      return '<tr><td class="team">' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>';
    }).join("");
  }

  function renderAll() { renderPitch(); renderSide(); renderList(); }

  /* ---------- share ---------- */
  function shareSquad() {
    try {
      var payload = { f: state.formation, p: state.picks, c: state.captain };
      var code = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
      var url = location.origin + location.pathname + "#sq=" + code;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { SB.toast("Squad link copied!"); }, function () { prompt("Copy:", url); });
      else prompt("Copy:", url);
      if (history.replaceState) history.replaceState(null, "", "#sq=" + code);
    } catch (e) { SB.toast("Couldn't build link."); }
  }
  function loadShared() {
    var m = location.hash.match(/sq=([^&]+)/);
    if (!m) return false;
    try {
      var o = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
      if (o && o.f && FORMATIONS[o.f] && o.p) {
        state.formation = o.f; state.picks = o.p; state.captain = o.c || null;
        save(); SB.toast("Loaded a shared squad!");
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ---------- events ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    loadShared();
    renderScoring();
    renderAll();

    $("pitch").addEventListener("click", function (e) {
      var cap = e.target.closest("[data-cap]");
      if (cap) { setCaptain(cap.getAttribute("data-cap")); return; }
      var rm = e.target.closest("[data-rm]");
      if (rm) { removeSlot(rm.getAttribute("data-rm")); return; }
      var slot = e.target.closest(".pslot");
      if (slot && !slot.classList.contains("filled")) {
        var id = slot.getAttribute("data-slot");
        activeSlot = (activeSlot === id) ? null : id;
        if (activeSlot) filterPos = posOfSlot(activeSlot);
        syncFilterButtons();
        renderAll();
      }
    });

    $("playerList").addEventListener("click", function (e) {
      var add = e.target.closest("[data-add]");
      if (add && !add.disabled) addPlayer(add.getAttribute("data-add"));
    });

    $("posFilters").addEventListener("click", function (e) {
      if (e.target.tagName !== "BUTTON") return;
      filterPos = e.target.getAttribute("data-pos");
      syncFilterButtons();
      renderList();
    });

    $("formation").addEventListener("change", function () { changeFormation($("formation").value); });
    $("autoBtn").addEventListener("click", autoPick);
    $("clearBtn").addEventListener("click", function () { state.picks = {}; state.captain = null; activeSlot = null; save(); renderAll(); });
    $("shareBtn").addEventListener("click", shareSquad);
  });

  function syncFilterButtons() {
    Array.prototype.forEach.call($("posFilters").children, function (b) {
      b.classList.toggle("on", b.getAttribute("data-pos") === filterPos);
    });
  }
})();
