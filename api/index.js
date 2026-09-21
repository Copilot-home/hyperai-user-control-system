// APΩ Home Cloud - Vercel proxy to the live Node Gateway.
//
// Production invariant:
// - The upstream gateway MUST be supplied through HYPERAI_UPSTREAM_URL.
// - Never hard-code an ephemeral tunnel URL into the deployed artifact.
// - If the upstream is unavailable or unconfigured, fail closed with a
//   machine-readable 503/502 response and do not expose the upstream address.

const UPSTREAM = process.env.HYPERAI_UPSTREAM_URL || '';

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

function getValidatedUpstreamBase() {
  if (!UPSTREAM) {
    return null;
  }

  try {
    const url = new URL(UPSTREAM);
    if (url.protocol !== 'https:') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins() {
  return new Set(
    [
      process.env.HYPERAI_PUBLIC_ORIGIN,
      'https://hyperai-user-control-system.vercel.app',
      'https://hyperai-user-control-system-ng-andys-projects.vercel.app',
      'https://hyperai-user-control-system-git-main-ng-andys-projects.vercel.app',
    ].filter(Boolean),
  );
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function jsonError(res, status, error, detail) {
  res.status(status).json({ error, detail });
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
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const upstreamBase = getValidatedUpstreamBase();
  if (!upstreamBase) {
    return jsonError(
      res,
      503,
      'upstream_not_configured',
      'HYPERAI_UPSTREAM_URL is missing or invalid; runtime authority is unavailable.',
    );
  }

  const upstreamUrl = `${upstreamBase}${getTargetPath(req)}`;

  try {
    const body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? await getBody(req)
        : undefined;

    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization
          ? { Authorization: req.headers.authorization }
          : {}),
      },
      body,
    });

    const upstreamBody = await upstreamRes.text();
    res.setHeader(
      'Content-Type',
      upstreamRes.headers.get('content-type') || 'application/json',
    );
    return res.status(upstreamRes.status).send(upstreamBody);
  } catch {
    return jsonError(
      res,
      502,
      'upstream_unavailable',
      'The configured runtime upstream could not be reached.',
    );
  }
}
