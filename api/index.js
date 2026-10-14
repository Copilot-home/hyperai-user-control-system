// APΩ Home Cloud - Vercel proxy to the live Node Gateway.
//
// Production invariant:
// - The upstream gateway SHOULD be supplied through HYPERAI_UPSTREAM_URL.
// - Never hard-code an ephemeral tunnel URL into the deployed artifact.
// - Write/action routes remain fail-closed when the upstream is unavailable.
// - Read-only observability routes stay available in a bounded Recoverable state
//   so operators can see exactly why authority is unavailable instead of getting
//   a blind 503 from the control plane.

const UPSTREAM = process.env.HYPERAI_UPSTREAM_URL || '';

export function getTargetPath(req) {
  const queryPath = req.query?.path;
  if (typeof queryPath === 'string') {
    const target = `/api/${queryPath}`;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === 'path' || value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) query.append(key, String(item));
      } else {
        query.append(key, String(value));
      }
    }
    const encodedQuery = query.toString();
    return encodedQuery ? `${target}?${encodedQuery}` : target;
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

const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_REQUEST_BODY_BYTES = 1_048_576;
const READ_ONLY_FALLBACK_ROUTES = new Set([
  '/api/health',
  '/api/runtime/capabilities',
  '/api/runtime/state',
]);

function jsonError(res, status, error, detail) {
  res.status(status).json({ error, detail });
}

function normalizedPath(req) {
  const target = getTargetPath(req);
  const queryIndex = target.indexOf('?');
  return queryIndex >= 0 ? target.slice(0, queryIndex) : target;
}

function buildFallbackPayload(pathname) {
  const checkedAt = new Date().toISOString();
  const detail = 'Cloud control plane is reachable, but no validated HYPERAI_UPSTREAM_URL is configured. Runtime authority remains disabled.';

  if (pathname === '/api/health') {
    return {
      status: 'degraded',
      mode: 'cloud-control-plane',
      authority: false,
      recoverable: true,
      upstream_configured: false,
      detail,
      checked_at: checkedAt,
    };
  }

  if (pathname === '/api/runtime/capabilities') {
    return {
      boundary_state: 'recoverable',
      autonomous_core_ready: false,
      execution_authority: false,
      cloud_control_plane: true,
      upstream_configured: false,
      safe_recovery_available: true,
      selected_action: 'hold_core_degraded',
      reason: detail,
      checked_at: checkedAt,
      capabilities: {
        read_only_observability: true,
        write_actions: false,
        local_runtime: false,
      },
    };
  }

  if (pathname === '/api/runtime/state') {
    return {
      classification: 'Recoverable',
      message: detail,
      status: {
        mode: 'cloud-control-plane',
        authority: false,
        upstream_configured: false,
        selected_action: 'hold_core_degraded',
      },
      proof: {
        heartbeat: {
          status: 'degraded',
          detail,
          source: 'vercel-control-plane',
          at: checkedAt,
        },
        lastAction: 'hold_core_degraded',
        metrics: {
          ticks: 0,
          probeCycles: 1,
        },
        latestProbeSummary: {
          overallStatus: 'degraded',
          checkedAt,
          probes: [
            {
              id: 'runtime-upstream',
              status: 'degraded',
              detail: 'HYPERAI_UPSTREAM_URL missing or invalid',
            },
          ],
        },
      },
    };
  }

  return null;
}

function serveBoundedFallback(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  const pathname = normalizedPath(req);
  if (!READ_ONLY_FALLBACK_ROUTES.has(pathname)) {
    return false;
  }

  const payload = buildFallbackPayload(pathname);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'HEAD') {
    res.status(200).end();
  } else {
    res.status(200).json(payload);
  }
  return true;
}

async function getBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_REQUEST_BODY_BYTES) {
        reject(new Error('REQUEST_BODY_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
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
    if (serveBoundedFallback(req, res)) {
      return;
    }

    return jsonError(
      res,
      503,
      'upstream_not_configured',
      'Runtime authority is unavailable. Only bounded read-only observability endpoints remain available until HYPERAI_UPSTREAM_URL is configured.',
    );
  }

  const upstreamUrl = `${upstreamBase}${getTargetPath(req)}`;

  try {
    const body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? await getBody(req)
        : undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization
            ? { Authorization: req.headers.authorization }
            : {}),
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const upstreamBody = await upstreamRes.text();
    res.setHeader(
      'Content-Type',
      upstreamRes.headers.get('content-type') || 'application/json',
    );
    return res.status(upstreamRes.status).send(upstreamBody);
  } catch {
    if (serveBoundedFallback(req, res)) {
      return;
    }

    return jsonError(
      res,
      502,
      'upstream_unavailable',
      'The configured runtime upstream could not be reached.',
    );
  }
}
