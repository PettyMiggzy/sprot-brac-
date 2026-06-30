/* ============================================================
   Sports Brackets — shared site chrome + helpers
   Injects a consistent header & footer on every page so the
   nav only has to be maintained in one place.
   ============================================================ */
(function () {
  "use strict";

  // ---- Theme: apply immediately to avoid flash ----
  var THEME_KEY = "sb.theme";
  function applyTheme(t) {
    if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e) {}

  // Resolve relative root depth (pages in /play/ need ../)
  var depth = (location.pathname.match(/\//g) || []).length;
  var inSub = /\/play\//.test(location.pathname);
  var ROOT = inSub ? "../" : "./";

  var NAV = [
    { label: "MLB", href: "schedules.html#mlb" },
    { label: "Basketball", href: "schedules.html#nba" },
    { label: "NFL", href: "schedules.html#nfl" },
    { label: "NCAA", href: "schedules.html#ncaa" },
    { label: "World Cup", href: "world-cup-2026.html" },
    { label: "Fantasy", href: "fantasy.html" },
    { label: "$BRACKETS", href: "brackets.html" },
    { label: "Play", href: "play/bracket-maker.html" },
    { label: "Blog", href: "blog.html" }
  ];

  var LOGO = '<svg class="logo" viewBox="0 0 40 40" fill="none" aria-hidden="true">' +
    '<rect width="40" height="40" rx="10" fill="#131725"/>' +
    '<path d="M9 11h6v4H9v6h6v4H9" stroke="#2f6df6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M21 15h4l3 5-3 5h-4" stroke="#f59e0b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="20" r="2.2" fill="#16a34a"/></svg>';

  function buildHeader() {
    var page = (document.body.getAttribute("data-page") || "");
    var links = NAV.map(function (n) {
      var active = n.label.toLowerCase().indexOf(page) === 0 || page === n.href ? " class=\"active\"" : "";
      return '<a href="' + ROOT + n.href + '"' + active + '>' + n.label + '</a>';
    }).join("");

    return '' +
      '<header class="site-header"><div class="wrap nav">' +
      '<a class="brand" href="' + ROOT + 'index.html">' + LOGO + 'Sports<b>Brackets</b></a>' +
      '<nav class="nav-links" id="navLinks">' + links + '</nav>' +
      '<div class="nav-cta">' +
      '<button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode" title="Toggle theme">' +
      '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" stroke-linecap="round"/></svg>' +
      '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<a class="btn btn--primary btn--sm" href="' + ROOT + 'play/bracket-maker.html">Build a Bracket</a>' +
      '<button class="nav-toggle" id="navToggle" aria-label="Menu">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/></svg>' +
      '</button></div></div></header>';
  }

  function buildFooter() {
    var cols = [
      { h: "Schedules", links: [["MLB", "schedules.html#mlb"], ["NBA / WNBA", "schedules.html#nba"], ["NFL", "schedules.html#nfl"], ["NCAA", "schedules.html#ncaa"]] },
      { h: "Play", links: [["Bracket Maker", "play/bracket-maker.html"], ["World Cup Fantasy", "fantasy.html"], ["Super Bowl Squares", "play/squares.html"], ["Round-Robin", "play/round-robin.html"], ["Pick'em Sheet", "play/pickem.html"]] },
      { h: "Token &amp; Social", links: [["$BRACKETS", "brackets.html"], ["X / Twitter", "https://x.com/sportbracketsol"], ["Telegram", "https://t.me/sportsbrackets"], ["Contact", "mailto:hello@sportsbrackets.net"]] }
    ];
    var colHtml = cols.map(function (c) {
      return '<div><h4>' + c.h + '</h4>' + c.links.map(function (l) {
        var ext = /^(https?:|mailto:|#)/.test(l[1]);
        var href = ext ? l[1] : ROOT + l[1];
        var attrs = /^https?:/.test(l[1]) ? ' target="_blank" rel="noopener"' : '';
        return '<a href="' + href + '"' + attrs + '>' + l[0] + '</a>';
      }).join("") + '</div>';
    }).join("");

    var social = function (label, href, path) {
      return '<a href="' + href + '" aria-label="' + label + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor">' + path + '</svg></a>';
    };
    var x = social("X / Twitter", "https://x.com/javanx3d", '<path d="M18.9 2H22l-7.3 8.3L23.3 22h-6.8l-5.3-6.9L5.1 22H2l7.8-8.9L1.7 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z"/>');
    var yt = social("YouTube", "https://www.youtube.com/", '<path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.7C19.3 5.2 12 5.2 12 5.2s-7.3 0-8.9.4A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.7c1.6.4 8.9.4 8.9.4s7.3 0 8.9-.4a2.5 2.5 0 0 0 1.7-1.7C23 15.2 23 12 23 12Zm-13 3V9l5.2 3-5.2 3Z"/>');
    var pin = social("Pinterest", "https://www.pinterest.com/", '<path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-2.4 3.1-5 0-2-1.4-3.7-3.9-3.7a4.2 4.2 0 0 0-4.4 4.2c0 .8.3 1.4.6 1.8.1.1.1.2.1.4l-.3 1.2c0 .2-.2.3-.4.2-1.1-.5-1.8-2.1-1.8-3.4 0-2.8 2-5.3 5.9-5.3 3.1 0 5.5 2.2 5.5 5.2 0 3.1-1.9 5.5-4.7 5.5-.9 0-1.8-.5-2.1-1l-.6 2.2c-.2.8-.8 1.9-1.2 2.5A10 10 0 1 0 12 2Z"/>');

    return '' +
      '<footer class="site-footer"><div class="wrap">' +
      '<div class="foot-grid">' +
      '<div><div class="foot-brand">' + LOGO + 'Sports<b style="color:#2f6df6">Brackets</b></div>' +
      '<p class="foot-about">Low-ink, printer-friendly tournament brackets, master broadcast schedules, and real-time playoff tracking across every league that matters.</p>' +
      '<div class="socials">' + x + yt + pin + '</div></div>' +
      colHtml + '</div>' +
      '<div class="foot-bottom"><span>© ' + new Date().getFullYear() + ' SportsBrackets.net — built for fans, by fans.</span>' +
      '<span>Made with 🏆 · Print free · Share freely</span></div>' +
      '</div></footer>';
  }

  function mountChrome() {
    var h = document.querySelector('[data-mount="header"]');
    var f = document.querySelector('[data-mount="footer"]');
    if (h) h.outerHTML = buildHeader();
    if (f) f.outerHTML = buildFooter();

    var themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var dark = document.documentElement.getAttribute("data-theme") === "dark";
        var next = dark ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      });
    }

    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (toggle && links) {
      toggle.addEventListener("click", function () { links.classList.toggle("open"); });
      links.addEventListener("click", function (e) {
        if (e.target.tagName === "A") links.classList.remove("open");
      });
    }
  }

  // Tiny toast helper, available globally
  window.SB = window.SB || {};
  window.SB.toast = function (msg) {
    var t = document.getElementById("sbToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "sbToast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.SB._tt);
    window.SB._tt = setTimeout(function () { t.classList.remove("show"); }, 2200);
  };

  // Reveal-on-scroll for [data-reveal]
  function initReveal() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.style.opacity = 1; });
      return;
    }
    els.forEach(function (e) {
      e.style.opacity = 0; e.style.transform = "translateY(16px)";
      e.style.transition = "opacity .6s ease, transform .6s ease";
    });
    var reveal = function (el) { el.style.opacity = 1; el.style.transform = "none"; };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); }
      });
    }, { threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
    // Safety net: never leave content invisible if the observer is slow/blocked.
    setTimeout(function () { els.forEach(reveal); }, 1200);
  }

  document.addEventListener("DOMContentLoaded", function () {
    mountChrome();
    initReveal();
  });
})();
