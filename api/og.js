/* ============================================================
   /api/og — dynamic Open Graph image for a shared bracket
   ------------------------------------------------------------
   Renders a 1200×630 PNG (via @vercel/og / Satori) from the same
   encoded bracket state used by the Bracket Maker's share link,
   so every shared link unfurls with a preview of THAT bracket.

   Usage:  /api/og?s=<encoded-state>
   The Bracket Maker links to /api/share?s=... (see api/share.js),
   whose <meta property="og:image"> points here.
   ============================================================ */
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

// Minimal hyperscript so we don't need JSX compilation.
function h(type, props) {
  var children = Array.prototype.slice.call(arguments, 2);
  return { type: type, key: null, props: Object.assign({}, props, {
    children: children.length <= 1 ? children[0] : children
  }) };
}

// Mirror of the Bracket Maker's decodeState (base64 of JSON {t,s,r}).
function decodeState(raw) {
  try {
    var json = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
    var o = JSON.parse(json);
    if (o && o.r && o.s) return { title: o.t || "My Bracket", size: o.s, rounds: o.r };
  } catch (e) {}
  return null;
}

const COLORS = ["#2f6df6", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function handler(req) {
  var raw = (req.url.match(/[?&]s=([^&]+)/) || [])[1] || "";
  var state = decodeState(raw);

  var title = state ? state.title : "Build your bracket";
  var size = state ? state.size : null;
  var champ = null, dots = [];
  if (state) {
    champ = state.rounds[state.rounds.length - 1] && state.rounds[state.rounds.length - 1][0];
    var entrants = state.rounds[0] || [];
    for (var i = 0; i < Math.min(8, entrants.length); i++) dots.push(i);
  }

  var bg = h("div", {
    style: {
      width: "1200px", height: "630px", display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: "64px",
      background: "linear-gradient(135deg, #0b1020 0%, #131725 55%, #1e2f5e 100%)",
      fontFamily: "sans-serif", color: "#ffffff"
    }
  },
    // Header
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
      h("div", { style: { display: "flex", alignItems: "center" } },
        h("div", { style: { width: "44px", height: "44px", borderRadius: "12px", background: "#2f6df6", marginRight: "16px", display: "flex" } }),
        h("div", { style: { fontSize: "30px", fontWeight: 800 } }, "SportsBrackets")
      ),
      h("div", { style: { fontSize: "22px", color: "#9aa3bd", display: "flex" } }, "sportsbrackets.net")
    ),
    // Body
    h("div", { style: { display: "flex", flexDirection: "column" } },
      h("div", { style: { fontSize: "28px", color: "#9fb4dc", fontWeight: 700, letterSpacing: "2px", display: "flex" } },
        size ? (size + "-TEAM BRACKET") : "TOURNAMENT BRACKET"),
      h("div", { style: { fontSize: "78px", fontWeight: 800, lineHeight: 1.05, marginTop: "10px", display: "flex" } }, title),
      champ
        ? h("div", { style: { display: "flex", alignItems: "center", marginTop: "28px" } },
            h("div", { style: { fontSize: "26px", color: "#f59e0b", fontWeight: 800, letterSpacing: "2px", marginRight: "16px", display: "flex" } }, "CHAMPION"),
            h("div", { style: { fontSize: "44px", fontWeight: 800, color: "#ffd27a", display: "flex" } }, champ)
          )
        : h("div", { style: { fontSize: "30px", color: "#c7ccdd", marginTop: "22px", display: "flex" } }, "Pick every winner. Print it. Share it.")
    ),
    // Footer: team color dots + CTA
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
      h("div", { style: { display: "flex" } },
        dots.map(function (i) {
          return h("div", { key: i, style: { width: "26px", height: "26px", borderRadius: "999px", background: COLORS[i % COLORS.length], marginRight: "10px", display: "flex" } });
        })
      ),
      h("div", { style: { fontSize: "24px", color: "#9aa3bd", display: "flex" } }, "Build yours free →")
    )
  );

  return new ImageResponse(bg, {
    width: 1200, height: 630,
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" }
  });
}
