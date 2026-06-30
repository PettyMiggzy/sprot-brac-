/* ============================================================
   js/token.js — $BRACKETS live market data (DexScreener)
   Tries the /api/token proxy first, then DexScreener directly
   (its API is CORS-enabled), so it works with or without the
   serverless function. Degrades gracefully if the token isn't
   indexed yet.
   ============================================================ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var CA = ($("caText") && $("caText").textContent.trim()) || "7V1KVUmGefA4qqsMTyebo3vxzvYK9xtpWLAmfiMWmoon";
  var REFRESH_MS = 45000;

  /* ---------- formatting ---------- */
  function trimNum(s) { return s.indexOf(".") >= 0 ? s.replace(/0+$/, "").replace(/\.$/, "") : s; }
  function fmtPrice(n) {
    n = Number(n);
    if (!isFinite(n) || n <= 0) return "$—";
    if (n >= 1) return "$" + trimNum(n.toFixed(4));
    var d = Math.min(12, Math.max(4, 2 - Math.floor(Math.log10(n))));
    return "$" + trimNum(n.toFixed(d));
  }
  function fmtCompact(n, prefix) {
    n = Number(n); prefix = prefix || "";
    if (!isFinite(n)) return "—";
    var a = Math.abs(n);
    if (a >= 1e9) return prefix + trimNum((n / 1e9).toFixed(2)) + "B";
    if (a >= 1e6) return prefix + trimNum((n / 1e6).toFixed(2)) + "M";
    if (a >= 1e3) return prefix + trimNum((n / 1e3).toFixed(1)) + "K";
    return prefix + Math.round(n);
  }

  /* ---------- fetch ---------- */
  function fetchToken() {
    return fetch("/api/token?ca=" + CA, { headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("proxy " + r.status); return r.json(); })
      .catch(function () {
        // Fallback: DexScreener allows browser CORS.
        return fetch("https://api.dexscreener.com/latest/dex/tokens/" + CA).then(function (r) { return r.json(); });
      });
  }

  function bestPair(data) {
    var pairs = (data && data.pairs) || [];
    if (!pairs.length) return null;
    return pairs.slice().sort(function (a, b) {
      var la = (a.liquidity && a.liquidity.usd) || 0, lb = (b.liquidity && b.liquidity.usd) || 0;
      return lb - la;
    })[0];
  }

  function setText(id, v) { var el = $(id); if (el) el.textContent = v; }

  function renderChange(p) {
    var ch = (p.priceChange && p.priceChange.h24);
    var chEl = $("change"), sEl = $("s-change");
    if (ch == null || isNaN(ch)) { if (chEl) chEl.textContent = ""; if (sEl) sEl.textContent = "—"; return; }
    var up = Number(ch) >= 0;
    var txt = (up ? "▲ " : "▼ ") + Math.abs(Number(ch)).toFixed(1) + "%";
    if (chEl) { chEl.textContent = txt; chEl.className = "chg " + (up ? "up" : "down"); }
    if (sEl) { sEl.textContent = txt; sEl.style.color = up ? "#14F195" : "#ff6e7e"; }
  }

  function render(data) {
    var p = bestPair(data);
    if (!p) {
      setText("priceState", "Not indexed on DexScreener yet — check back once trading is live.");
      var fb = $("chartFallback");
      if (fb) fb.innerHTML = 'Chart appears here once $BRACKETS is trading on a Solana DEX.<br><a href="https://dexscreener.com/solana/' + CA + '" target="_blank" rel="noopener" style="color:#7df3c0">Open on DexScreener ↗</a>';
      return;
    }

    var price = p.priceUsd;
    setText("price", fmtPrice(price));
    setText("s-price", fmtPrice(price));
    renderChange(p);
    setText("s-mcap", fmtCompact(p.marketCap, "$"));
    setText("s-fdv", fmtCompact(p.fdv, "$"));
    setText("s-liq", fmtCompact(p.liquidity && p.liquidity.usd, "$"));
    setText("s-vol", fmtCompact(p.volume && p.volume.h24, "$"));
    var t = p.txns && p.txns.h24;
    setText("s-txns", t ? ((t.buys || 0) + (t.sells || 0)) + " (" + (t.buys || 0) + "B/" + (t.sells || 0) + "S)" : "—");
    setText("s-dex", (p.dexId ? p.dexId.charAt(0).toUpperCase() + p.dexId.slice(1) : "—"));
    setText("priceState", "live · updates every 45s");

    // total supply ≈ fdv / price
    if (p.fdv && price > 0) setText("t-supply", fmtCompact(p.fdv / Number(price), ""));

    // token logo from DexScreener if available
    if (p.info && p.info.imageUrl && $("coinImg")) {
      var img = new Image();
      img.onload = function () { $("coinImg").src = p.info.imageUrl; };
      img.src = p.info.imageUrl;
    }

    // chart embed
    if (p.pairAddress && p.chainId && $("chartFrame")) {
      var src = "https://dexscreener.com/" + p.chainId + "/" + p.pairAddress + "?embed=1&theme=dark&trades=0&info=0";
      var frame = $("chartFrame");
      if (frame.src !== src) {
        frame.onload = function () { var fb = $("chartFallback"); if (fb) fb.style.display = "none"; };
        frame.src = src;
      }
    }
  }

  function load() { fetchToken().then(render).catch(function () { setText("priceState", "Couldn't load live data — try DexScreener."); }); }

  /* ---------- copy CA ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var copy = $("copyCa");
    if (copy) copy.addEventListener("click", function () {
      var done = function () { SB.toast("Contract address copied!"); copy.textContent = "Copied ✓"; setTimeout(function () { copy.textContent = "Copy CA"; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(CA).then(done, function () { prompt("Copy:", CA); });
      else prompt("Copy:", CA);
    });

    load();
    setInterval(function () { if (!document.hidden) load(); }, REFRESH_MS);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) load(); });
  });
})();
