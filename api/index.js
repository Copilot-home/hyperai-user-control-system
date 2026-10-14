// APΩ Home Cloud - Vercel proxy to the live Node Gateway.
//
// Production invariant:
// - The upstream gateway SHOULD be supplied through HYPERAI_UPSTREAM_URL.
// - Never hard-code an ephemeral tunnel URL into the deployed artifact.
// - Write/action routes remain fail-closed when the upstream is unavailable.
// - Read-only control-plane routes stay available in a bounded Recoverable state
//   so operators can observe the system without fabricating execution authority.

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
  '/api/autonomy/status',
  '/api/autonomy/objectives',
  '/api/autonomy/decisions',
  '/api/autonomy/policy',
  '/api/symphony/status',
  '/api/workspace/session',
  '/api/workspace/graph',
  '/api/workspace/lanes',
  '/api/workspace/runtimes',
  '/api/workspace/connectors',
  '/api/workspace/missions',
  '/api/workspace/proof',
  '/api/workspace/providers',
]);

function jsonError(res, status, error, detail) {
  res.status(status).json({ error, detail });
}

function normalizedPath(req) {
  const target = getTargetPath(req);
  const queryIndex = target.indexOf('?');
  return queryIndex >= 0 ? target.slice(0, queryIndex) : target;
}

function recoveryContext(reason) {
  const checkedAt = new Date().toISOString();

  if (reason === 'upstream_unavailable') {
    return {
      checkedAt,
      upstreamConfigured: true,
      detail:
        'Cloud control plane is reachable, but the configured runtime upstream did not respond. Execution authority remains disabled.',
    };
  }

  if (reason === 'upstream_invalid') {
    return {
      checkedAt,
      upstreamConfigured: false,
      detail:
        'Cloud control plane is reachable, but HYPERAI_UPSTREAM_URL is not a valid HTTPS origin. Execution authority remains disabled.',
    };
  }

  return {
    checkedAt,
    upstreamConfigured: false,
    detail:
      'Cloud control plane is reachable, but no validated HYPERAI_UPSTREAM_URL is configured. Runtime authority remains disabled.',
  };
}

function fallbackObjectives(detail) {
  return [
    {
      id: 'preserve-communication',
      title: 'Preserve communication bridge',
      priority: 'critical',
      status: 'in_progress',
      detail,
    },
    {
      id: 'restore-runtime-upstream',
      title: 'Restore verified runtime upstream',
      priority: 'high',
      status: 'pending',
      detail: 'Bind only a fresh, verified HTTPS runtime upstream; do not reuse historical tunnel evidence.',
    },
  ];
}

function buildFallbackPayload(pathname, reason) {
  const { checkedAt, upstreamConfigured, detail } = recoveryContext(reason);
  const objectives = fallbackObjectives(detail);
  const proofState = {
    exists: true,
    fresh: true,
    modified_at: checkedAt,
    age_seconds: 0,
    summary: {
      source: 'vercel-control-plane',
      execution_authority: false,
      upstream_configured: upstreamConfigured,
    },
  };

  if (pathname === '/api/health') {
    return {
      status: 'degraded',
      mode: 'cloud-control-plane',
      authority: false,
      recoverable: true,
      upstream_configured: upstreamConfigured,
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
      upstream_configured: upstreamConfigured,
      safe_recovery_available: true,
      selected_action: 'hold_core_degraded',
      reason: detail,
      checked_at: checkedAt,
      capabilities: {
        read_only_observability: true,
        workspace_read_model: true,
        write_actions: false,
        local_runtime: false,
      },
    };
  }

  if (pathname === '/api/runtime/state') {
    return {
      classification: 'Recoverable',
      classificationReason: detail,
      message: detail,
      status: {
        mode: 'cloud-control-plane',
        authority: false,
        upstream_configured: upstreamConfigured,
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
        runtimeAuthority: {
          summary: 'execution authority disabled',
          executionAuthority: false,
        },
        runtimeRecovery: {
          selectedAction: 'hold_core_degraded',
          managedRuntime: null,
        },
        latestProbeSummary: {
          overallStatus: 'degraded',
          checkedAt,
          probes: [
            {
              id: 'runtime-upstream',
              status: 'degraded',
              detail,
            },
          ],
        },
      },
    };
  }

  if (pathname === '/api/autonomy/status') {
    return {
      active: false,
      mode: 'recovering',
      currentObjectiveId: objectives[0].id,
      lastAction: 'hold_core_degraded',
      lastTickAt: null,
      heartbeat: {
        source: 'vercel-control-plane',
        status: 'degraded',
        detail,
        at: checkedAt,
      },
      metrics: {
        ticks: 0,
        recoveredIncidents: 0,
        blockedIncidents: 0,
      },
      recentActions: [],
      objectiveCount: objectives.length,
      currentObjective: objectives[0],
    };
  }

  if (pathname === '/api/autonomy/objectives') {
    return objectives;
  }

  if (pathname === '/api/autonomy/decisions') {
    return [];
  }

  if (pathname === '/api/autonomy/policy') {
    return {
      updated_at: checkedAt,
      cycle_number: 0,
      selected_action: 'hold_core_degraded',
      action_reason: detail,
      backend_classification: 'runtime-upstream-unavailable',
      frontend_classification: 'cloud-control-plane-ready',
      runtime_strategy: 'cloud-read-only-continuity',
      boundary_state: 'recoverable',
      boundary_reason: detail,
      haios_state: 'recoverable',
      haios_reason: detail,
      routine_decisions: ['preserve-observability', 'deny-write-authority'],
      policy_source: 'vercel-control-plane',
      fallback_triggered: true,
      proof_events: [
        {
          at: checkedAt,
          source: 'vercel-control-plane',
          type: 'bounded-read-only-continuity',
          detail,
        },
      ],
    };
  }

  if (pathname === '/api/symphony/status') {
    return {
      status: 'recoverable',
      uptime: 'cloud-control-plane',
      ca_dao_broadcasts: 0,
      active_agents: 0,
      empathy_circulation: 'recoverable',
      running: false,
      authority: false,
      upstream_configured: upstreamConfigured,
      detail,
      checked_at: checkedAt,
    };
  }

  if (pathname === '/api/workspace/session') {
    return {
      generated_at: checkedAt,
      shell: {
        status: 'recoverable',
        boundary_state: 'recoverable',
        selected_action: 'hold_core_degraded',
        runtime_strategy: 'cloud-read-only-continuity',
        authority: {
          execution: false,
          source: 'vercel-control-plane',
        },
      },
      session: {
        mode: 'recovery',
        current_mission_id: null,
        last_route_at: null,
        last_route_summary: null,
      },
      project_state: null,
      autonomy: {
        mode: 'recovering',
        active: false,
        current_objective: {
          title: objectives[0].title,
          detail: objectives[0].detail,
        },
        heartbeat: {
          status: 'degraded',
          detail,
        },
      },
      companion: {
        preferred_approval_surface: null,
        active_creator_surfaces: [],
        fanout_policy: null,
      },
      orchestration: {
        mode: 'cloud-control-plane',
        agent_chain_status: 'paused',
        mission_id: null,
        route_plan: null,
        final_state: 'hold_core_degraded',
      },
      creator_law: {
        status: 'unverified-runtime',
        error_score: null,
        claim_validity: 'insufficient-live-evidence',
      },
      telegram_mastery: {
        status: 'unverified',
        telegram_error: 0,
        blocking_factor: 'runtime upstream unavailable',
      },
    };
  }

  if (pathname === '/api/workspace/graph') {
    return {
      generated_at: checkedAt,
      orchestration_model: 'APΩ_HOME_CLOUD_FABRIC',
      authority_model: 'fail-closed-live-evidence',
      nodes: [],
      collisions: [],
      drift_summary: {
        status: 'unknown-live-runtime',
        counts: {},
      },
      orchestration_summary: {
        mode: 'cloud-control-plane',
        final_state: 'hold_core_degraded',
        mission_id: null,
      },
    };
  }

  if (pathname === '/api/workspace/lanes') {
    return {
      generated_at: checkedAt,
      lanes: [],
    };
  }

  if (pathname === '/api/workspace/runtimes') {
    return {
      generated_at: checkedAt,
      runtimes: [],
    };
  }

  if (pathname === '/api/workspace/connectors') {
    return {
      generated_at: checkedAt,
      connectors: [],
    };
  }

  if (pathname === '/api/workspace/missions') {
    return {
      generated_at: checkedAt,
      current_mission_id: null,
      bindings: [],
      requested_missions: [],
      available_roots: [],
    };
  }

  if (pathname === '/api/workspace/proof') {
    return {
      generated_at: checkedAt,
      runtime_authority: {
        execution_authority: false,
        source: 'vercel-control-plane',
        upstream_configured: upstreamConfigured,
      },
      selected_action: 'hold_core_degraded',
      boundary_state: 'recoverable',
      collisions: [],
      drift_summary: {
        status: 'unknown-live-runtime',
        counts: {},
        items: [],
      },
      orchestration: {
        mode: 'cloud-control-plane',
        agent_chain_status: 'paused',
        mission_id: null,
        final_state: 'hold_core_degraded',
      },
      connector_summary: {
        connector_count: 0,
        cli_tool_count: 0,
        mcp_enabled_tools: [],
        mcp_unconfigured_tools: [],
      },
      proof_timeline: [
        {
          id: 'cloud-read-only-continuity',
          label: 'Cloud read-only continuity',
          status: 'degraded',
          detail,
        },
      ],
      mission_roots: [],
    };
  }

  if (pathname === '/api/workspace/providers') {
    return {
      generated_at: checkedAt,
      policy_mode: 'fail-closed',
      default_visibility: 'verified-live-only',
      providers: [],
      admin_surface: {
        cloud_control_plane: true,
        execution_authority: false,
        upstream_configured: upstreamConfigured,
        proof_state: proofState,
      },
    };
  }

  return null;
}

function serveBoundedFallback(req, res, reason) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  const pathname = normalizedPath(req);
  if (!READ_ONLY_FALLBACK_ROUTES.has(pathname)) {
    return false;
  }

  const payload = buildFallbackPayload(pathname, reason);
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
    const reason = UPSTREAM ? 'upstream_invalid' : 'upstream_not_configured';
    if (serveBoundedFallback(req, res, reason)) {
      return;
    }

    return jsonError(
      res,
      503,
      reason,
      'Runtime authority is unavailable. Only bounded read-only control-plane endpoints remain available until a verified HTTPS runtime upstream is configured.',
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
    if (serveBoundedFallback(req, res, 'upstream_unavailable')) {
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
