// APΩ Home Cloud - Vercel proxy to live Node Gateway
// All /api/* requests are forwarded to the MacBook cloudflared tunnel.
const UPSTREAM = 'https://macro-stomach-fill-families.trycloudflare.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const upstreamUrl = `${UPSTREAM}${req.url}`;
  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await upstreamRes.text();
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.status(upstreamRes.status).send(body);
  } catch (err) {
    res.status(502).json({ error: 'upstream_unavailable', detail: err.message, upstream: upstreamUrl });
  }
}
