// APΩ Home Cloud - Vercel proxy to live Node Gateway
// All /api/* requests are forwarded to the MacBook cloudflared tunnel.
const UPSTREAM = 'https://convenient-cross-leone-amp.trycloudflare.com';

function getTargetPath(req) {
  const queryPath = req.query?.path;
  if (typeof queryPath === 'string') {
    return `/api/${queryPath}`;
  }
  if (req.url.startsWith('/api/')) {
    return req.url;
  }
  return `/api${req.url}`;
}

async function getBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const upstreamUrl = `${UPSTREAM}${getTargetPath(req)}`;
  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await getBody(req) : undefined;
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const upstreamBody = await upstreamRes.text();
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.status(upstreamRes.status).send(upstreamBody);
  } catch (err) {
    res.status(502).json({ error: 'upstream_unavailable', detail: err.message, upstream: upstreamUrl });
  }
}
