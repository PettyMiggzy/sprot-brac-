/* ============================================================
   /api/share — shareable bracket link with dynamic OG preview
   ------------------------------------------------------------
   OG/Twitter crawlers don't run JS and never see the URL #hash,
   so a shared bracket needs a server-rendered HTML page whose
   <meta og:image> points at /api/og for THAT bracket. Humans who
   open the link are redirected straight into the Bracket Maker
   with the bracket loaded.

   Usage:  /api/share?s=<encoded-state>
   ============================================================ */

function decodeState(raw) {
  try {
    var json = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
    var o = JSON.parse(json);
    if (o && o.r && o.s) return { title: o.t || "My Bracket", size: o.s, rounds: o.r };
  } catch (e) {}
  return null;
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function handler(req, res) {
  var raw = (req.query && req.query.s) ? String(req.query.s) : "";
  var state = decodeState(raw);

  var proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  var host = req.headers["x-forwarded-host"] || req.headers.host || "sportsbrackets.net";
  var origin = proto + "://" + host;

  var champ = state && state.rounds[state.rounds.length - 1] && state.rounds[state.rounds.length - 1][0];
  var title = state ? state.title : "Sports Brackets";
  var ogTitle = state
    ? (title + (champ ? " — " + champ + " to win it all" : " bracket"))
    : "Build a bracket — Sports Brackets";
  var desc = state
    ? ((state.size ? state.size + "-team bracket" : "Tournament bracket") + " built on SportsBrackets.net. Make your picks and print it free.")
    : "Free printable tournament brackets, schedules, and live playoff tracking.";

  // Pass the encoded state straight through (already URL-safe).
  var ogImage = origin + "/api/og" + (raw ? "?s=" + raw : "");
  var target = origin + "/play/bracket-maker.html" + (raw ? "#b=" + raw : "");

  var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
    "<title>" + esc(ogTitle) + "</title>" +
    '<meta name="description" content="' + esc(desc) + '" />' +
    '<link rel="canonical" href="' + esc(target) + '" />' +
    '<meta property="og:type" content="website" />' +
    '<meta property="og:title" content="' + esc(ogTitle) + '" />' +
    '<meta property="og:description" content="' + esc(desc) + '" />' +
    '<meta property="og:image" content="' + esc(ogImage) + '" />' +
    '<meta property="og:image:width" content="1200" />' +
    '<meta property="og:image:height" content="630" />' +
    '<meta property="og:url" content="' + esc(target) + '" />' +
    '<meta name="twitter:card" content="summary_large_image" />' +
    '<meta name="twitter:title" content="' + esc(ogTitle) + '" />' +
    '<meta name="twitter:description" content="' + esc(desc) + '" />' +
    '<meta name="twitter:image" content="' + esc(ogImage) + '" />' +
    '<meta http-equiv="refresh" content="0; url=' + esc(target) + '" />' +
    "</head><body>" +
    '<p style="font-family:sans-serif;padding:24px">Opening your bracket… ' +
    '<a href="' + esc(target) + '">Tap here if it doesn\'t load.</a></p>' +
    "<script>location.replace(" + JSON.stringify(target) + ");</script>" +
    "</body></html>";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).send(html);
}
