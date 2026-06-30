/* ============================================================
   /api/token — DexScreener proxy for the $BRACKETS token
   ------------------------------------------------------------
   DexScreener's API is public/keyless. We proxy it for edge
   caching and to dodge any CORS edge-cases; the page also falls
   back to calling DexScreener directly if this function is absent.

   Usage:  /api/token?ca=<solana-mint-address>
   ============================================================ */

const DEX = "https://api.dexscreener.com/latest/dex/tokens/";
const DEFAULT_CA = "7V1KVUmGefA4qqsMTyebo3vxzvYK9xtpWLAmfiMWmoon";

export default async function handler(req, res) {
  var ca = String((req.query && req.query.ca) || DEFAULT_CA).replace(/[^A-Za-z0-9]/g, "");
  if (!ca) { res.status(400).json({ error: "bad_ca" }); return; }
  try {
    var r = await fetch(DEX + ca, { headers: { Accept: "application/json" } });
    var body = await r.text();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(r.status).send(body);
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "upstream_error", message: String((err && err.message) || err) });
  }
}
