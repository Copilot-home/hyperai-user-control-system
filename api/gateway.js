import proxyHandler from './index.js';

const UPSTREAM = process.env.HYPERAI_UPSTREAM_URL || '';
const AUTHORITY_PROBE_TIMEOUT_MS = 5_000;
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTHORIZED_BOUNDARY_STATES = new Set(['operational', 'autonomous']);
const AUTHORIZED_RUNTIME_ACTIONS = new Set([
  'reuse_default_runtime',
  'reuse_managed_runtime',
]);

function getValidatedUpstreamBase() {
  if (!UPSTREAM) return null;

  try {
    const url = new URL(UPSTREAM);
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function probeRuntimeAuthority(upstreamBase) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTHORITY_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${upstreamBase}/api/runtime/capabilities`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        verified: false,
        reason: `capability_probe_http_${response.status}`,
      };
    }

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return { verified: false, reason: 'capability_probe_unparseable' };
    }

    const boundaryState = String(payload.boundary_state || '').toLowerCase();
    const selectedAction = String(payload.selected_action || '');
    const recoveryStatus = String(payload.runtime_recovery?.status || '').toLowerCase();
    const operatorAttentionRequired =
      payload.runtime_authority?.operator_attention_required === true;

    const checks = {
      autonomous_core_ready: payload.autonomous_core_ready === true,
      operator_relay_not_required: payload.requires_operator_relay === false,
      boundary_authorized: AUTHORIZED_BOUNDARY_STATES.has(boundaryState),
      recovery_ready: recoveryStatus === 'ready',
      runtime_action_authorized: AUTHORIZED_RUNTIME_ACTIONS.has(selectedAction),
      operator_attention_not_required: !operatorAttentionRequired,
    };

    const verified = Object.values(checks).every(Boolean);
    return {
      verified,
      reason: verified ? 'verified_runtime_authority' : 'runtime_authority_incomplete',
      checks,
      observed: {
        boundary_state: payload.boundary_state ?? null,
        autonomous_core_ready: payload.autonomous_core_ready ?? null,
        requires_operator_relay: payload.requires_operator_relay ?? null,
        selected_action: payload.selected_action ?? null,
        recovery_status: payload.runtime_recovery?.status ?? null,
      },
    };
  } catch (error) {
    return {
      verified: false,
      reason: error?.name === 'AbortError' ? 'capability_probe_timeout' : 'capability_probe_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (READ_METHODS.has(req.method)) {
    return proxyHandler(req, res);
  }

  const upstreamBase = getValidatedUpstreamBase();
  if (!upstreamBase) {
    return proxyHandler(req, res);
  }

  const authority = await probeRuntimeAuthority(upstreamBase);
  if (!authority.verified) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: 'upstream_authority_not_verified',
      detail:
        'Unsafe runtime actions remain fail-closed until the upstream independently proves complete execution authority.',
      authority,
    });
  }

  return proxyHandler(req, res);
}
