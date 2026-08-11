// ------------------------------------------------------------------------------
// AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
// SYSTEM: HyperAI Phoenix – Unified Orchestrator
// AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong – Architect)
// ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
// LEGAL STATUS: This header is part of the identity & traceability layer.
// DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
// ------------------------------------------------------------------------------

const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const { Server } = require('socket.io');
const cors = require('cors');
const autonomyRuntime = require('./services/autonomyRuntime');
const { buildRuntimeAuthority, classifyLane } = require('./services/runtimeAuthority');
const runtimeManager = require('./services/runtimeManager');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const resolveProbeState = (probes) => {
    if (probes.some((probe) => probe.status === 'critical')) {
        return 'critical';
    }
    if (probes.some((probe) => probe.status === 'degraded')) {
        return 'degraded';
    }
    return 'healthy';
};
const executeJsonProbe = async (id, url, options = {}) => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            return {
                id,
                status: response.status >= 500 ? 'critical' : 'degraded',
                detail: `${response.status} ${response.statusText}`,
            };
        }

        const payload = await response.json();
        return {
            id,
            status: 'healthy',
            detail: 'ok',
            payload,
        };
    } catch (error) {
        return {
            id,
            status: 'critical',
            detail: error instanceof Error ? error.message : String(error),
        };
    }
};

const executeTextProbe = async (url) => {
    try {
        const response = await fetch(url);
        return {
            ok: response.ok,
            status: response.status,
        };
    } catch (error) {
        return {
            ok: false,
            status: null,
            error: error instanceof Error ? error.message : String(error),
        };
    }
};

const bootTimestamp = Date.now();
const serverFilePath = path.join(__dirname, 'server.js');
const workspaceRoot = path.resolve(__dirname, '..', '..');
const policyStatePath = path.resolve(workspaceRoot, 'runtime', 'hyperai-autonomous-policy.json');
const runtimeManifestPath = path.resolve(workspaceRoot, 'runtime', 'hyperai-autonomous-runtime.json');
const notebookRegistry = [
    {
        id: 'notebook_default',
        title: 'HyperAI Knowledge Notebook',
        description: 'Default notebook runtime surface',
    },
];
const operatorProfile = {
    id: 'operator-1',
    name: 'HyperAI Operator',
    email: 'creator@hyperai.local',
    preferences: {
        language: 'vi',
        theme: 'light',
        notificationsEnabled: true,
    },
};
const chatMessages = [
    {
        message: 'HyperAI cockpit channel initialized in runtime-backed mode.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
    },
];
const symphonyRuntimeState = {
    frequency: 269,
};
const MANAGED_RUNTIME_RECONCILE_INTERVAL_MS = Number(
    process.env.HYPERAI_MANAGED_RUNTIME_RECONCILE_INTERVAL_MS || 30000
);
let runtimeRecoveryInFlight = null;

const canReuseDefaultRuntime = async () => {
    if (PORT !== 5000) {
        return false;
    }

    const fileModifiedAt = fs.statSync(serverFilePath).mtime;
    const processStartedAt = new Date(bootTimestamp);
    const staleProcess = processStartedAt.getTime() < fileModifiedAt.getTime();
    if (staleProcess) {
        return false;
    }

    try {
        const response = await fetch('http://127.0.0.1:4173');
        return response.ok;
    } catch {
        return false;
    }
};

const ensureManagedRuntimeRecovery = async (reason) => {
    if (await canReuseDefaultRuntime()) {
        return {
            inspectedAt: new Date().toISOString(),
            currentPort: PORT,
            status: 'ready',
            selectedAction: 'reuse_default_runtime',
            reason: 'Default runtime boundary is healthy; managed runtime recovery is not required.',
            managedRuntime: null,
            launchStartedAt: null,
            lastHealthyAt: new Date().toISOString(),
            lastEvaluatedAt: new Date().toISOString(),
            lastError: null,
        };
    }

    if (!runtimeRecoveryInFlight) {
        runtimeRecoveryInFlight = runtimeManager
            .ensureManagedRuntime({
                currentPort: PORT,
                reason,
            })
            .catch((error) => ({
                inspectedAt: new Date().toISOString(),
                currentPort: PORT,
                status: 'recovery-error',
                selectedAction: 'hold_core_degraded',
                reason: error instanceof Error ? error.message : String(error),
                managedRuntime: null,
                launchStartedAt: null,
                lastHealthyAt: null,
                lastEvaluatedAt: new Date().toISOString(),
                lastError: error instanceof Error ? error.message : String(error),
            }))
            .finally(() => {
                runtimeRecoveryInFlight = null;
            });
    }

    return runtimeRecoveryInFlight;
};
const restoreOperatorProfile = () => ({
    id: 'operator-1',
    name: 'HyperAI Operator',
    email: 'creator@hyperai.local',
    preferences: {
        language: 'vi',
        theme: 'light',
        notificationsEnabled: true,
    },
});

const normalizeAutonomyPolicyState = (policyState) => {
    if (!policyState || typeof policyState !== 'object') {
        return policyState;
    }

    const manifestPolicy =
        policyState.manifest_policy && typeof policyState.manifest_policy === 'object'
            ? policyState.manifest_policy
            : null;
    if (!manifestPolicy) {
        return policyState;
    }

    return {
        ...policyState,
        ...manifestPolicy,
        manifest_policy: manifestPolicy,
        queue: policyState.queue ?? null,
        hard_gates: policyState.hard_gates ?? null,
        cycle_number:
            typeof policyState.cycle_number === 'number'
                ? policyState.cycle_number
                : (typeof manifestPolicy.cycle_number === 'number' ? manifestPolicy.cycle_number : 0),
    };
};

const readAutonomyPolicy = () => {
    if (!fs.existsSync(policyStatePath)) {
        return {
            status: 'missing',
            detail: 'No autonomous policy state has been persisted yet.',
        };
    }

    try {
        return normalizeAutonomyPolicyState(JSON.parse(fs.readFileSync(policyStatePath, 'utf8')));
    } catch (error) {
        return {
            status: 'invalid',
            detail: error instanceof Error ? error.message : String(error),
        };
    }
};

const omegaRootPath = path.resolve(workspaceRoot, 'omega_system');
const omegaMainPath = path.join(omegaRootPath, 'main.py');
const emergencyBridgeRoot = path.resolve(workspaceRoot, 'emergency_bridge');
const emergencyBridgeProcessed = path.join(emergencyBridgeRoot, 'processed');
const emergencyBridgeHeartbeat = path.join(emergencyBridgeRoot, 'hyperai_to_copilot');
const projectStatePath = path.resolve(workspaceRoot, 'memory', 'project_state.json');
const creatorTraceProtocolPath = path.resolve(workspaceRoot, 'memory', 'DR_CREATOR_TRACE_PROTOCOL.json');
const ollamaTagsUrl = 'http://127.0.0.1:11434/api/tags';
const ollamaModelsUrl = 'http://127.0.0.1:11434/v1/models';
const ollamaResponsesUrl = 'http://127.0.0.1:11434/v1/responses';
const aidevPorts = [8002, 8501, 8511];
const focusedOperatorCallerPaths = [
    {
        id: 'vscode-insiders-ollama-copilot-bridge',
        label: 'VS Code Insiders Ollama Copilot Bridge',
        filePath: path.resolve(process.env.USERPROFILE || 'C:\\Users\\pc', '.vscode-insiders', 'extensions', 'alejandrog.ollama-copilot-bridge-0.0.23', 'out', 'config.js'),
        match: 'http://localhost:11434',
        risk: 'editor copilot bridge may assume Ollama-compatible routing from localhost:11434',
    },
    {
        id: 'vscode-insiders-oai-compatible-copilot',
        label: 'VS Code Insiders OAI Compatible Copilot',
        filePath: path.resolve(process.env.USERPROFILE || 'C:\\Users\\pc', '.vscode-insiders', 'extensions', 'johnny-zhao.oai-compatible-copilot-0.4.2', 'readme.md'),
        match: 'http://localhost:11434',
        risk: 'operator docs advertise localhost:11434 as an OpenAI-style base URL',
    },
    {
        id: 'vscode-insiders-kong-chat-bridge',
        label: 'VS Code Insiders Kong Chat Bridge',
        filePath: path.resolve(process.env.USERPROFILE || 'C:\\Users\\pc', '.vscode-insiders', 'extensions', 'kongkong.kong-chat-bridge-1.0.4', 'out', 'openai', 'openaiResponsesWebsocketApi.js'),
        match: '/v1/responses',
        risk: 'bundle includes OpenAI Responses routing logic',
    },
];

const federationRuntimeDir = path.resolve(workspaceRoot, 'runtime', 'federation_orchestrator');
const appBuildRuntimeRegistryPath = path.join(federationRuntimeDir, 'app_build_runtime_registry_20260421.json');
const workspaceMissionRequests = [];
let workspaceSessionState = {
    mode: 'conversation_mode',
    currentMissionId: 'reasoning_request',
    lastRouteAt: null,
    lastRouteSummary: null,
};
let runtimeSecretStatus = {
    telegram_bot_token: {
        present: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        source: process.env.TELEGRAM_BOT_TOKEN ? 'process_env' : 'missing',
        updated_at: null,
        validation: null,
    },
    telegram_bot_api: {
        present: true,
        source: process.env.TELEGRAM_BOT_API_BASE_URL ? 'process_env' : 'default_cloud',
        base_url: process.env.TELEGRAM_BOT_API_BASE_URL || 'https://api.telegram.org',
        updated_at: null,
        validation: null,
    },
};

const readJsonFile = (filePath, fallback = {}) => {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
};

const buildAppBuildRuntimeRegistry = () => {
    const registry = readJsonFile(appBuildRuntimeRegistryPath, null);
    if (!registry || typeof registry !== 'object') {
        return null;
    }

    const runtimeSurfaces = Array.isArray(registry.runtime_surfaces) ? registry.runtime_surfaces : [];
    const modelBindings = Array.isArray(registry.model_bindings) ? registry.model_bindings : [];
    const hardBlockers = Array.isArray(registry.blockers) ? registry.blockers : [];
    return {
        ...registry,
        source_path: appBuildRuntimeRegistryPath,
        runtime_surfaces: runtimeSurfaces,
        model_bindings: modelBindings,
        summary: {
            ...(registry.summary || {}),
            runtime_surface_count: runtimeSurfaces.length,
            model_binding_count: modelBindings.length,
            hard_blocker_count: hardBlockers.length,
        },
    };
};

const defaultCreatorTraceProtocol = {
    protocol_id: 'creator_trace_dr_protocol_v1',
    status: 'fallback_registry_missing',
    baseline: {
        D0: 5,
        velocity: 1,
        k_domain: [0, 1, 2, 3, 4, 5],
        total_cost: 38,
        total_complexity_delta: 5,
        valid_transitions: 5,
        total_transitions: 5,
        R_conv: 1,
        eta_cost: 5 / 38,
        C_delta_D: 7.6,
    },
    weighting_rule: {
        runtime_query: 'gamma(cu_shell) > gamma(cu_policy)',
        priority_order: ['log_process_http_proof', 'memory_registry', 'policy_spec'],
    },
    safety_invariant: {
        safe_cu: 'Risk(cu) <= rho_max && LongTerm(cu) && EvidenceBacked(cu)',
        context_correct: 'ManagersSelected subset ValidScope && all ActivationPaths TeardownGuarded',
        max_k: 5,
    },
    trust_path: ['cu_scope', 'cu_registry', 'cu_impl'],
    execution_contract: {
        route: ['scope', 'registry', 'impl'],
        no_layer_jump: true,
        promotion_requires: ['EvidenceBacked', 'ValidatedBy', 'NoHiddenContradiction'],
        fail_closed_on: ['unsafe_context_unit', 'missing_runtime_proof', 'manifest_policy_contradiction'],
    },
    memory_sources: [],
};

const buildCreatorTraceProtocol = (capabilities) => {
    const registry = readJsonFile(creatorTraceProtocolPath, defaultCreatorTraceProtocol);
    const baseline = {
        ...defaultCreatorTraceProtocol.baseline,
        ...(registry.baseline || {}),
    };
    const policyAction = capabilities.autonomy_policy?.selected_action ||
        capabilities.autonomy_policy?.runtime_recovery?.selectedAction ||
        null;
    const topLevelAutonomous = capabilities.boundary_state === 'autonomous' ||
        capabilities.backend_classification === 'autonomous-core-ready' ||
        capabilities.selected_action === 'reuse_default_runtime';
    const policyStale = capabilities.autonomy_policy?.backend_classification === 'stale-process runtime';
    const policyHold = policyAction === 'hold_current_runtime';
    const contradiction = Boolean(topLevelAutonomous && (policyStale || policyHold));
    const managersSelectedValid = Boolean(capabilities.runtime_authority?.backend_runtime && capabilities.selected_action);
    const teardownGuarded = capabilities.safe_recovery_available === false ||
        capabilities.selected_action === 'reuse_default_runtime' ||
        capabilities.selected_action === 'hold_current_runtime';
    const contextCorrect = managersSelectedValid && teardownGuarded && !contradiction;

    return {
        ...registry,
        baseline,
        status: registry.status || defaultCreatorTraceProtocol.status,
        source_path: creatorTraceProtocolPath,
        generated_at: new Date().toISOString(),
        convergence: {
            D0: baseline.D0,
            velocity: baseline.velocity,
            max_k: Math.max(...baseline.k_domain),
            R_conv: baseline.R_conv,
            equation: 'D_k = D0 - velocity * k',
            monotonic_non_increasing: true,
        },
        cost_model: {
            eta_cost: baseline.eta_cost,
            C_delta_D: baseline.C_delta_D,
            invariant: baseline.C_delta_D * baseline.D0,
            expected_total_cost: baseline.total_cost,
            invariant_holds: baseline.C_delta_D * baseline.D0 === baseline.total_cost,
        },
        context_soundness: {
            status: contextCorrect ? 'validated' : managersSelectedValid && teardownGuarded ? 'bounded' : 'blocked',
            managers_selected_in_valid_scope: managersSelectedValid,
            teardown_guarded: teardownGuarded,
            manifest_policy_contradiction: contradiction,
            runtime_weighting: registry.weighting_rule?.runtime_query || defaultCreatorTraceProtocol.weighting_rule.runtime_query,
        },
        path_witness: [
            {
                id: 'cu_scope',
                status: capabilities.core_boundary?.length ? 'validated' : 'blocked',
                evidence: capabilities.core_boundary?.join(', ') || 'missing core boundary',
            },
            {
                id: 'cu_registry',
                status: capabilities.runtime_authority && capabilities.lanes?.length ? 'validated' : 'bounded',
                evidence: `${capabilities.lanes?.length || 0} runtime lanes; registry=${creatorTraceProtocolPath}`,
            },
            {
                id: 'cu_impl',
                status: contradiction ? 'bounded' : capabilities.backend_classification ? 'validated' : 'blocked',
                evidence: capabilities.backend_classification || 'backend classification missing',
            },
        ],
    };
};

const PYTHON_BIN = process.env.PYTHON || 'python';
const TELEGRAM_BOT_API_PATH = path.resolve(workspaceRoot, 'tools', 'telegram_bot_api.py');
const TELEGRAM_CONNECTOR_APP_PATH = path.resolve(workspaceRoot, 'tools', 'telegram_connector_app.py');

const maskSecret = (value) => {
    if (!value || value.length < 10) {
        return '***';
    }
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const runTelegramBotTool = (args, extraEnv = {}) => {
    const result = spawnSync(PYTHON_BIN, [TELEGRAM_BOT_API_PATH, ...args], {
        cwd: workspaceRoot,
        encoding: 'utf8',
        windowsHide: true,
        env: {
            ...process.env,
            ...extraEnv,
        },
    });

    if (result.status !== 0) {
        return {
            ok: false,
            status: result.status,
            stderr: result.stderr?.trim() || result.stdout?.trim() || 'telegram tool failed',
            payload: null,
        };
    }

    try {
        return {
            ok: true,
            status: 0,
            stderr: null,
            payload: JSON.parse(result.stdout),
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            stderr: error instanceof Error ? error.message : String(error),
            payload: null,
        };
    }
};

const runTelegramConnectorTool = (args, extraEnv = {}) => {
    const result = spawnSync(PYTHON_BIN, [TELEGRAM_CONNECTOR_APP_PATH, ...args], {
        cwd: workspaceRoot,
        encoding: 'utf8',
        windowsHide: true,
        env: {
            ...process.env,
            ...extraEnv,
        },
    });

    if (result.status !== 0) {
        return {
            ok: false,
            status: result.status,
            stderr: result.stderr?.trim() || result.stdout?.trim() || 'telegram connector tool failed',
            payload: null,
        };
    }

    try {
        return {
            ok: true,
            status: 0,
            stderr: null,
            payload: JSON.parse(result.stdout),
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            stderr: error instanceof Error ? error.message : String(error),
            payload: null,
        };
    }
};

const runTelegramNodeConnectorAction = (task) => {
    const result = runTelegramConnectorTool([
        'dispatch-task',
        '--task-json',
        JSON.stringify(task || {}),
    ]);

    if (!result.ok) {
        return {
            ok: false,
            status: result.status,
            stderr: result.stderr,
            payload: null,
        };
    }

    return {
        ok: true,
        status: 0,
        stderr: null,
        payload: result.payload,
    };
};

const classifyNodeOrigin = (node) => {
    const explicitOrigin = node?.node_origin;
    if (explicitOrigin) {
        return explicitOrigin;
    }

    if (node?.orchestrator_family === 'observed_ecosystem_orchestrators') {
        return 'observed';
    }

    if (['chrome_browser', 'edge_browser'].includes(node?.node_id)) {
        return 'external';
    }

    return 'system_owned';
};

const summarizeProofState = (proofState = {}) => ({
    exists: Boolean(proofState.exists),
    fresh: Boolean(proofState.fresh),
    modified_at: proofState.modified_at || null,
    age_seconds: proofState.age_seconds ?? null,
    summary: proofState.summary || {},
});

const readWorkspaceArtifacts = () => {
    const graph = readJsonFile(path.join(federationRuntimeDir, 'ecosystem_orchestrator_registry.json'), { nodes: {} });
    const missionBindings = readJsonFile(path.join(federationRuntimeDir, 'mission_binding_registry.json'), { bindings: {} });
    const capabilityMatrix = readJsonFile(path.join(federationRuntimeDir, 'orchestrator_capability_matrix.json'), { rows: [] });
    const dependencyGraph = readJsonFile(path.join(federationRuntimeDir, 'orchestrator_dependency_graph.json'), { edges: [] });
    const creatorPolicy = readJsonFile(path.join(federationRuntimeDir, 'creator_surface_policy.json'), {});
    const driftGuard = readJsonFile(path.join(federationRuntimeDir, 'orchestrator_drift_guard.json'), { collisions: [] });
    const phaseState = readJsonFile(path.join(federationRuntimeDir, 'phase_state.json'), {});
    const telegramFabric = readJsonFile(path.resolve(workspaceRoot, 'runtime', 'telegram_node', 'telegram_fabric_registry.json'), {});
    const treasuryRegistry = readJsonFile(path.join(federationRuntimeDir, 'treasury_registry.json'), {});
    const geminiHandoff = readJsonFile(path.join(federationRuntimeDir, 'gemini_cli_handoff.json'), {});
    const driftVerification = readJsonFile(path.join(federationRuntimeDir, 'drift_verification_report.json'), { summary: { status: 'unknown', counts: {} }, drifts: [] });
    const maturityMap = readJsonFile(path.join(federationRuntimeDir, 'autonomous_capability_maturity_map.json'), { surfaces: {}, summary: { level_counts: {} } });
    const connectorCanon = readJsonFile(path.join(federationRuntimeDir, 'connector_canon_map.json'), { connectors: {}, surface_bindings: [] });
    const cliCapabilityRegistry = readJsonFile(path.join(federationRuntimeDir, 'cli_capability_registry.json'), { summary: {}, tools: [] });
    const orchestrationBridge = readJsonFile(path.join(federationRuntimeDir, 'autonomous_cycle_orchestration_bridge.json'), {});
    const creatorLawModel = readJsonFile(path.join(federationRuntimeDir, 'creator_defined_law_model.json'), {
        alignment_model: { status: 'unknown', error_score: null, error_inputs: {} },
        law: {},
    });
    const telegramMastery = readJsonFile(path.join(federationRuntimeDir, 'telegram_mastery_equation.json'), {
        variables: {},
        telegram_error: 1,
        status: 'repairing',
        blocking_factors: [],
    });
    const oodaControlContract = readJsonFile(path.join(federationRuntimeDir, 'ooda_control_contract.json'), {
        current_variable: 'target_proof',
        current_packet: 'target_discovery_packet',
        blocking_factor: 'Telegram mastery OODA contract missing.',
        success_condition: 'Contract generation required.',
    });
    const localModelCoordination = readJsonFile(path.join(federationRuntimeDir, 'local_model_coordination_contract.json'), {
        phase: 'local_llm_telegram_coordination',
        handoff_rule: 'strict',
        decision_authority: 'ooda_control_contract',
        claim_policy: 'proof_only',
    });
    const telegramConnectorContract = readJsonFile(path.join(federationRuntimeDir, 'telegram_connector_app_contract.json'), {
        connector_id: 'telegram_connector_app',
        active_lane: 'botfather_lifecycle_lane',
        lane_state: 'idle',
        token_lifecycle_state: 'awaiting_readback',
        readback_config: {
            mode: 'ocr_bounded',
            target_regex: '[0-9]{8,12}:[A-Za-z0-9_-]{20,}',
            timeout: 30,
        },
        next_required_artifact: 'bot_token_proof',
        last_proof: { kind: 'none', status: 'unproven' },
        bot_api_lane: { registry: { total: 0, proven: 0, candidate: 0 } },
    });
    return {
        graph,
        missionBindings,
        capabilityMatrix,
        dependencyGraph,
        creatorPolicy,
        driftGuard,
        phaseState,
        telegramFabric,
        treasuryRegistry,
        geminiHandoff,
        driftVerification,
        maturityMap,
        connectorCanon,
        cliCapabilityRegistry,
        orchestrationBridge,
        creatorLawModel,
        telegramMastery,
        oodaControlContract,
        localModelCoordination,
        telegramConnectorContract,
    };
};

const findMaturityEntry = (artifacts, nodeId) => {
    const surfaces = artifacts.maturityMap?.surfaces || {};
    return surfaces[nodeId] || null;
};

const findConnectorBinding = (artifacts, nodeId) => {
    const bindings = artifacts.connectorCanon?.surface_bindings || [];
    return bindings.find((binding) => binding.surface_id === nodeId)?.connector_id || null;
};

const summarizeWorkspaceIntelligence = (artifacts) => ({
    drift_status: artifacts.driftVerification?.summary?.status || 'unknown',
    drift_counts: artifacts.driftVerification?.summary?.counts || {},
    maturity_level_counts: artifacts.maturityMap?.summary?.level_counts || {},
    connector_count: Object.keys(artifacts.connectorCanon?.connectors || {}).length,
    cli_tool_count: artifacts.cliCapabilityRegistry?.summary?.tool_count || 0,
    raw_surface_count: artifacts.driftVerification?.noise_assessment?.raw_surface_count || 0,
    meaningful_groups: artifacts.driftVerification?.noise_assessment?.meaningful_groups || 0,
    noise_gap: artifacts.driftVerification?.noise_assessment?.noise_gap || 0,
    creator_law_status: artifacts.creatorLawModel?.alignment_model?.status || 'unknown',
    creator_law_error_score: artifacts.creatorLawModel?.alignment_model?.error_score ?? null,
    telegram_mastery_status: artifacts.telegramMastery?.status || 'unknown',
    telegram_error: artifacts.telegramMastery?.telegram_error ?? 1,
    current_packet: artifacts.oodaControlContract?.current_packet || null,
    local_coordination_phase: artifacts.localModelCoordination?.phase || 'unknown',
});

const buildWorkspaceControlPayload = (artifacts, runtimeCapabilities) => {
    const telegramPacket = artifacts.oodaControlContract?.current_packet || 'unknown';
    const telegramVariable = artifacts.oodaControlContract?.current_variable || 'unknown';
    const telegramBlocker = artifacts.oodaControlContract?.blocking_factor || 'No active blocker recorded.';
    const criticalDrift = artifacts.driftVerification?.summary?.counts?.critical || 0;
    const warningDrift = artifacts.driftVerification?.summary?.counts?.warning || 0;
    const orchestrationMode = artifacts.orchestrationBridge?.mode || 'preservation_only';
    const agentChainStatus = artifacts.orchestrationBridge?.final_state ? 'executed_with_proof' : 'not_requested';

    const focusObjective =
        telegramPacket === 'target_discovery_packet'
            ? 'Move target_proof from 0 to 1 using existing local Telegram/browser/runtime evidence.'
            : telegramPacket === 'send_lane_packet'
                ? 'Prove send_message and target_channel_permission without expanding scope.'
                : 'Keep the active packet moving through proof-backed UI control.';

    const priorityActions = [
        {
            id: 'control-route-current-packet',
            label: 'Route active packet',
            intent: `Execute ${telegramPacket} with current blocker context and return only proof-backed next action.`,
            tab: 'overview',
            reason: telegramBlocker,
        },
        {
            id: 'control-open-proof',
            label: 'Inspect proof rail',
            intent: `Show proof state for ${telegramVariable}, ${telegramPacket}, and current drift summary.`,
            tab: 'proof',
            reason: 'Keep UI control tied to proof instead of side stories.',
        },
        {
            id: 'control-open-systems',
            label: 'Inspect runtime surfaces',
            intent: 'Show the runtime and connector surfaces that currently participate in the active packet.',
            tab: 'systems',
            reason: 'Use the shell to control the system through surfaced runtime truth.',
        },
        {
            id: 'control-open-mission',
            label: 'Promote packet to mission',
            intent: `Promote ${telegramPacket} into mission mode with explicit root, delegates, and evidence owner.`,
            tab: 'missions',
            reason: 'Escalate only when packet-level UI control is insufficient.',
        },
    ];

    return {
        status: telegramPacket === 'unknown' ? 'idle' : 'active_control',
        objective: focusObjective,
        focus_lane: telegramPacket,
        control_surface: 'hyperai_workspace_ui',
        orchestration_mode: orchestrationMode,
        agent_chain_status: agentChainStatus,
        filtered_signals: [
            {
                label: 'Boundary',
                value: runtimeCapabilities.boundary_state || 'unknown',
            },
            {
                label: 'Selected action',
                value: runtimeCapabilities.selected_action || 'hold',
            },
            {
                label: 'Telegram packet',
                value: telegramPacket,
            },
            {
                label: 'Telegram blocker',
                value: telegramBlocker,
            },
            {
                label: 'Critical drift',
                value: String(criticalDrift),
            },
            {
                label: 'Warning drift',
                value: String(warningDrift),
            },
        ],
        priority_actions: priorityActions,
        credential_control: {
            telegram_bot_token: runtimeSecretStatus.telegram_bot_token,
        },
        connector_control: {
            telegram_bot_api: runtimeSecretStatus.telegram_bot_api,
            telegram_node: {
                connector_id: artifacts.telegramConnectorContract?.connector_id || 'telegram_connector_app',
                lane_state: artifacts.telegramConnectorContract?.lane_state || 'idle',
                active_lane: artifacts.telegramConnectorContract?.active_lane || 'botfather_lifecycle_lane',
                last_proof: artifacts.telegramConnectorContract?.last_proof || null,
                bot_registry: artifacts.telegramConnectorContract?.bot_api_lane?.registry || { total: 0, proven: 0, candidate: 0 },
                readback_engine_status: artifacts.telegramConnectorContract?.readback_config?.engine_status || 'unknown',
            },
            botfather_lifecycle: {
                active_lane: artifacts.telegramConnectorContract?.active_lane || 'botfather_lifecycle_lane',
                token_lifecycle_state: artifacts.telegramConnectorContract?.token_lifecycle_state || 'awaiting_readback',
                readback_mode: artifacts.telegramConnectorContract?.readback_config?.mode || 'ocr_bounded',
                readback_engine_status: artifacts.telegramConnectorContract?.readback_config?.engine_status || 'unknown',
                next_required_artifact: artifacts.telegramConnectorContract?.next_required_artifact || 'bot_token_proof',
                last_capture_path: artifacts.telegramConnectorContract?.botfather_lane?.last_capture_path || null,
                last_readback_status: artifacts.telegramConnectorContract?.botfather_lane?.readback_status || 'unproven',
                last_readback_matches: artifacts.telegramConnectorContract?.botfather_lane?.readback_matches || [],
            },
        },
    };
};

const buildWorkspaceNodeView = (node, capabilitiesByNode, dependencyGraph, artifacts) => {
    const capabilityRow = capabilitiesByNode.get(node.node_id) || {};
    const dependencies = (dependencyGraph.edges || [])
        .filter((edge) => edge.from === node.node_id)
        .map((edge) => edge.to);
    const maturityEntry = findMaturityEntry(artifacts, node.node_id);
    return {
        node_id: node.node_id,
        label: node.node_id.replace(/_/g, ' '),
        orchestrator_family: node.orchestrator_family,
        runtime_class: node.runtime_class,
        authority_class: node?.escalation_contract?.authority_class || maturityEntry?.authority_class || 'unknown',
        node_origin: classifyNodeOrigin(node),
        node_origin_reason: node.node_origin_reason || null,
        status: node.status || 'unknown',
        current_maturity: maturityEntry?.current_maturity || null,
        maturity_rationale: maturityEntry?.maturity_rationale || null,
        connector_binding: findConnectorBinding(artifacts, node.node_id),
        mission_capabilities: node.mission_capabilities || [],
        reasoning_capability: capabilityRow.reasoning_capability || [],
        behavior_capability: capabilityRow.behavior_capability || [],
        allowed_mission_roles: node.allowed_mission_roles || [],
        forbidden_mission_roles: node.forbidden_mission_roles || [],
        dependencies,
        proof_state: summarizeProofState(node.proof_state),
        root_identity: node.root_identity || {},
        escalation_contract: node.escalation_contract || {},
        destruction_or_retention_contract: node.destruction_or_retention_contract || null,
        worker_notice: node.worker_notice || null,
    };
};

const buildWorkspaceGraphPayload = () => {
    const artifacts = readWorkspaceArtifacts();
    const capabilitiesByNode = new Map((artifacts.capabilityMatrix.rows || []).map((row) => [row.node_id, row]));
    const nodes = Object.values(artifacts.graph.nodes || {}).map((node) => buildWorkspaceNodeView(node, capabilitiesByNode, artifacts.dependencyGraph, artifacts));
    return {
        generated_at: new Date().toISOString(),
        orchestration_model: artifacts.graph.orchestration_model || 'all_orchestrators',
        authority_model: artifacts.graph.authority_model || 'mission_scoped_dynamic_partitioning',
        nodes,
        collisions: artifacts.driftGuard.collisions || [],
        drift_summary: artifacts.driftVerification.summary || { status: 'unknown', counts: {} },
        telegram_mastery_summary: {
            status: artifacts.telegramMastery?.status || 'unknown',
            telegram_error: artifacts.telegramMastery?.telegram_error ?? 1,
            current_variable: artifacts.oodaControlContract?.current_variable || null,
            current_packet: artifacts.oodaControlContract?.current_packet || null,
        },
        local_model_coordination: {
            phase: artifacts.localModelCoordination?.phase || 'unknown',
            handoff_rule: artifacts.localModelCoordination?.handoff_rule || 'unknown',
            decision_authority: artifacts.localModelCoordination?.decision_authority || 'unknown',
        },
        orchestration_summary: {
            mode: artifacts.orchestrationBridge.mode || 'preservation_only',
            final_state: artifacts.orchestrationBridge.final_state || 'not_requested',
            mission_id: artifacts.orchestrationBridge.mission_id || null,
        },
    };
};

const buildWorkspaceLanePayload = (graphPayload, missionBindings) => {
    const currentMission = missionBindings.bindings?.[workspaceSessionState.currentMissionId] || null;
    const participatingNodes = new Set([
        currentMission?.mission_root,
        currentMission?.mission_router,
        currentMission?.execution_adapter,
        currentMission?.evidence_recorder,
        ...(currentMission?.reasoning_delegates || []),
        ...(currentMission?.behavior_delegates || []),
        ...(currentMission?.approval_intake || []),
    ].filter(Boolean));

    return graphPayload.nodes.map((node) => ({
        lane_id: node.node_id,
        label: node.label,
        family: node.orchestrator_family,
        runtime_class: node.runtime_class,
        node_origin: node.node_origin,
        status: node.status,
        proof_state: node.proof_state,
        current_mission_role: currentMission
            ? Object.entries(currentMission)
                .find(([role, value]) =>
                    role !== 'phase_context' &&
                    (Array.isArray(value) ? value.includes(node.node_id) : value === node.node_id)
                )?.[0] || null
            : null,
        direct_participant: participatingNodes.has(node.node_id),
        available_actions: node.mission_capabilities,
    }));
};

const buildWorkspaceMissionPayload = (graphPayload, missionBindings) => {
    const bindings = Object.values(missionBindings.bindings || {}).map((binding) => ({
        ...binding,
        mode_hint:
            binding.mission_id === 'reasoning_request'
                ? 'conversation_mode'
                : binding.mission_id === 'creator_approval_delivery'
                    ? 'parallel_compare_mode'
                    : 'mission_mode',
    }));

    return {
        generated_at: new Date().toISOString(),
        current_mission_id: workspaceSessionState.currentMissionId,
        bindings,
        requested_missions: workspaceMissionRequests,
        available_roots: graphPayload.nodes
            .filter((node) => node.allowed_mission_roles.includes('mission_root'))
            .map((node) => ({ node_id: node.node_id, label: node.label, family: node.orchestrator_family })),
    };
};

const buildWorkspaceProviderPayload = (graphPayload, artifacts) => ({
    generated_at: new Date().toISOString(),
    policy_mode: 'adaptive_hybrid',
    default_visibility: 'admin_only',
    providers: graphPayload.nodes
        .filter((node) => node.node_id === 'provider_reasoning' || node.node_id === 'gemini_cli')
        .map((node) => ({
            node_id: node.node_id,
            label: node.label,
            status: node.status,
            runtime_class: node.runtime_class,
            node_origin: node.node_origin,
            reasoning_capability: node.reasoning_capability,
            behavior_capability: node.behavior_capability,
            proof_state: node.proof_state,
        })),
    admin_surface: {
        provider_runtime: artifacts.geminiHandoff.incoming_profile || null,
        treasury_mode: artifacts.treasuryRegistry.mode || null,
        telegram_lane: artifacts.telegramFabric.canonical_execution_lane || null,
    },
});

const buildWorkspaceProofPayload = (graphPayload, artifacts, runtimeCapabilities) => ({
    generated_at: new Date().toISOString(),
    runtime_authority: runtimeCapabilities.runtime_authority || null,
    selected_action: runtimeCapabilities.selected_action || null,
    boundary_state: runtimeCapabilities.boundary_state || null,
    collisions: artifacts.driftGuard.collisions || [],
    drift_summary: {
        status: artifacts.driftVerification?.summary?.status || 'unknown',
        counts: artifacts.driftVerification?.summary?.counts || {},
        items: (artifacts.driftVerification?.drifts || []).slice(0, 6),
    },
    orchestration: {
        mode: artifacts.orchestrationBridge?.mode || 'preservation_only',
        agent_chain_status: artifacts.orchestrationBridge?.final_state ? 'executed_with_proof' : 'not_requested',
        mission_id: artifacts.orchestrationBridge?.mission_id || null,
        final_state: artifacts.orchestrationBridge?.final_state || null,
    },
    connector_summary: {
        connector_count: Object.keys(artifacts.connectorCanon?.connectors || {}).length,
        cli_tool_count: artifacts.cliCapabilityRegistry?.summary?.tool_count || 0,
        mcp_enabled_tools: artifacts.cliCapabilityRegistry?.summary?.mcp_enabled_tools || [],
        mcp_unconfigured_tools: artifacts.cliCapabilityRegistry?.summary?.mcp_unconfigured_tools || [],
    },
    telegram_mastery: {
        status: artifacts.telegramMastery?.status || 'unknown',
        telegram_error: artifacts.telegramMastery?.telegram_error ?? 1,
        current_variable: artifacts.oodaControlContract?.current_variable || null,
        current_packet: artifacts.oodaControlContract?.current_packet || null,
        blocking_factors: artifacts.telegramMastery?.blocking_factors || [],
    },
    local_model_coordination: {
        phase: artifacts.localModelCoordination?.phase || 'unknown',
        handoff_rule: artifacts.localModelCoordination?.handoff_rule || 'unknown',
        decision_authority: artifacts.localModelCoordination?.decision_authority || 'unknown',
        epistemic_policy: artifacts.localModelCoordination?.epistemic_policy || null,
        bias_control: artifacts.localModelCoordination?.bias_control || null,
        router_model: artifacts.localModelCoordination?.router_model || null,
        specialist_model: artifacts.localModelCoordination?.specialist_model || null,
        verifier_model: artifacts.localModelCoordination?.verifier_model || null,
        auditor_model: artifacts.localModelCoordination?.auditor_model || null,
        telegram_executor: artifacts.localModelCoordination?.telegram_executor || null,
    },
    proof_timeline: [
        {
            id: 'runtime-proof',
            label: 'Runtime boundary',
            status: runtimeCapabilities.status,
            detail: runtimeCapabilities.boundary_reason || runtimeCapabilities.authority_reason || 'Runtime authority active.',
        },
        {
            id: 'telegram-proof',
            label: 'Telegram execution fabric',
            status: artifacts.telegramFabric?.target_counts?.proven ? 'proven' : 'awaiting-proof',
            detail: `${artifacts.telegramFabric?.target_counts?.proven || 0} proven targets; canonical lane ${artifacts.telegramFabric?.canonical_execution_lane || 'unknown'}.`,
        },
        {
            id: 'treasury-proof',
            label: 'Treasury control',
            status: artifacts.treasuryRegistry?.mode || 'unknown',
            detail: artifacts.treasuryRegistry?.custody_mode || 'Treasury custody mode not classified.',
        },
    ],
    mission_roots: graphPayload.nodes
        .filter((node) => node.allowed_mission_roles.includes('mission_root'))
        .map((node) => ({ node_id: node.node_id, status: node.status, proof: node.proof_state })),
});

const inferWorkspaceMode = (message) => {
    const normalized = String(message || '').trim().toLowerCase();
    if (!normalized) {
        return 'conversation_mode';
    }
    if (normalized.includes('@mission') || normalized.includes('mission') || normalized.includes('workflow') || normalized.includes('evidence')) {
        return 'mission_mode';
    }
    if (normalized.includes('compare') || normalized.includes('vs') || normalized.includes('song song') || normalized.includes('parallel')) {
        return 'parallel_compare_mode';
    }
    if (normalized.includes('provider') || normalized.includes('deploy') || normalized.includes('azure') || normalized.includes('openai') || normalized.includes('model')) {
        return 'provider_mode';
    }
    if (normalized.includes('runtime') || normalized.includes('policy') || normalized.includes('probe') || normalized.includes('debug')) {
        return 'operator_mode';
    }
    return 'conversation_mode';
};

const inferMissionBindingId = (message) => {
    const normalized = String(message || '').trim().toLowerCase();
    if (normalized.includes('telegram') || normalized.includes('publish')) {
        return 'telegram_publish_proof';
    }
    if (normalized.includes('funding') || normalized.includes('treasury') || normalized.includes('payment')) {
        return 'funding_reconciliation';
    }
    if (normalized.includes('approval')) {
        return 'creator_approval_delivery';
    }
    if (normalized.includes('runtime') || normalized.includes('recover')) {
        return 'runtime_preservation';
    }
    if (normalized.includes('ecosystem') || normalized.includes('bind') || normalized.includes('attachment')) {
        return 'ecosystem_attachment_review';
    }
    return 'reasoning_request';
};

const detectExplicitNodeMentions = (message, graphPayload) => {
    const normalized = String(message || '').toLowerCase();
    const candidates = [];
    for (const node of graphPayload.nodes) {
        if (normalized.includes(`@${node.node_id}`) || normalized.includes(`@${node.label}`.toLowerCase())) {
            candidates.push(node.node_id);
        }
    }
    return candidates;
};

const buildWorkspaceRouteResponse = async (message) => {
    const runtimeCapabilities = await buildRuntimeCapabilities();
    const artifacts = readWorkspaceArtifacts();
    const graphPayload = buildWorkspaceGraphPayload();
    const missionPayload = buildWorkspaceMissionPayload(graphPayload, artifacts.missionBindings);
    const mode = inferWorkspaceMode(message);
    const missionId = inferMissionBindingId(message);
    const missionBinding = (artifacts.missionBindings.bindings || {})[missionId] || null;
    const explicitNodes = detectExplicitNodeMentions(message, graphPayload);
    let selectedNodes = explicitNodes;
    if (selectedNodes.length === 0 && missionBinding) {
        selectedNodes = [
            missionBinding.mission_root,
            missionBinding.mission_router,
            missionBinding.execution_adapter,
            ...(missionBinding.reasoning_delegates || []).slice(0, mode === 'parallel_compare_mode' ? 3 : 2),
            ...(missionBinding.behavior_delegates || []).slice(0, 1),
        ].filter(Boolean);
    }

    const selectedLaneViews = graphPayload.nodes.filter((node) => selectedNodes.includes(node.node_id));
    const summary =
        mode === 'parallel_compare_mode'
            ? 'HyperAI da chuyen sang che do so sanh song song giua cac lane phu hop.'
            : mode === 'mission_mode'
                ? 'HyperAI da nang tac vu len mission mode va giu ro root, delegates, va evidence owner.'
                : mode === 'provider_mode'
                    ? 'HyperAI da mo provider/workbench context vi yeu cau lien quan toi model va deployment.'
                    : mode === 'operator_mode'
                        ? 'HyperAI da dat operator mode de uu tien runtime, policy, va proof context.'
                        : 'HyperAI dang xu ly trong conversation mode voi routing da duoc tom tat.';

    const response = {
        generated_at: new Date().toISOString(),
        mode,
        mission_id: missionId,
        mission_binding: missionBinding,
        selected_nodes: selectedLaneViews,
        synthesis: {
            enabled: selectedLaneViews.length > 1,
            strategy: selectedLaneViews.length > 1 ? 'mission_scoped_multi_lane_synthesis' : 'single_lane_response',
            summary,
        },
        proof: {
            boundary_state: runtimeCapabilities.boundary_state || 'unknown',
            selected_action: runtimeCapabilities.selected_action || 'hold',
            safe_recovery_available: Boolean(runtimeCapabilities.safe_recovery_available),
        },
        suggested_actions: [
            'Promote to mission',
            'Open systems view',
            'Inspect proof rail',
            'Compare more lanes',
        ],
        reply: `${summary} Lanes: ${selectedLaneViews.map((node) => node.label).join(', ') || 'none selected'}.`,
        mission_catalog: missionPayload.bindings,
    };

    workspaceSessionState = {
        mode,
        currentMissionId: missionId,
        lastRouteAt: response.generated_at,
        lastRouteSummary: response.reply,
    };
    return response;
};

const buildWorkspaceSessionPayload = async () => {
    const runtimeCapabilities = await buildRuntimeCapabilities();
    const autonomyStatus = autonomyRuntime.getStatus();
    const artifacts = readWorkspaceArtifacts();
    const projectState = readProjectState();
    return {
        generated_at: new Date().toISOString(),
        shell: {
            status: runtimeCapabilities.status,
            boundary_state: runtimeCapabilities.boundary_state,
            selected_action: runtimeCapabilities.selected_action,
            runtime_strategy: runtimeCapabilities.runtime_strategy,
            authority: runtimeCapabilities.runtime_authority,
        },
        session: {
            mode: workspaceSessionState.mode,
            current_mission_id: workspaceSessionState.currentMissionId,
            last_route_at: workspaceSessionState.lastRouteAt,
            last_route_summary: workspaceSessionState.lastRouteSummary,
        },
        autonomy: {
            mode: autonomyStatus.mode,
            active: autonomyStatus.active,
            current_objective: autonomyStatus.currentObjective,
            heartbeat: autonomyStatus.heartbeat,
        },
        companion: {
            preferred_approval_surface: artifacts.creatorPolicy.preferred_approval_surface || null,
            active_creator_surfaces: artifacts.creatorPolicy.active_creator_surface_set || [],
            fanout_policy: artifacts.creatorPolicy.fanout_policy || null,
        },
        orchestration: {
            mode: artifacts.orchestrationBridge.mode || 'preservation_only',
            agent_chain_status: artifacts.orchestrationBridge.final_state ? 'executed_with_proof' : 'not_requested',
            mission_id: artifacts.orchestrationBridge.mission_id || null,
            route_plan: artifacts.orchestrationBridge?.monitoring_artifacts?.route_plan || null,
            final_state: artifacts.orchestrationBridge.final_state || null,
        },
        creator_law: {
            status: artifacts.creatorLawModel?.alignment_model?.status || 'unknown',
            error_score: artifacts.creatorLawModel?.alignment_model?.error_score ?? null,
            claim_validity: artifacts.creatorLawModel?.law?.claim_validity || null,
        },
        telegram_mastery: {
            status: artifacts.telegramMastery?.status || 'unknown',
            telegram_error: artifacts.telegramMastery?.telegram_error ?? 1,
            current_variable: artifacts.oodaControlContract?.current_variable || null,
            current_packet: artifacts.oodaControlContract?.current_packet || null,
            blocking_factor: artifacts.oodaControlContract?.blocking_factor || null,
            success_condition: artifacts.oodaControlContract?.success_condition || null,
        },
        local_model_coordination: {
            phase: artifacts.localModelCoordination?.phase || 'unknown',
            handoff_rule: artifacts.localModelCoordination?.handoff_rule || 'unknown',
            decision_authority: artifacts.localModelCoordination?.decision_authority || 'unknown',
            epistemic_policy: artifacts.localModelCoordination?.epistemic_policy || null,
            bias_control: artifacts.localModelCoordination?.bias_control || null,
            router_model: artifacts.localModelCoordination?.router_model || null,
            specialist_model: artifacts.localModelCoordination?.specialist_model || null,
            verifier_model: artifacts.localModelCoordination?.verifier_model || null,
            auditor_model: artifacts.localModelCoordination?.auditor_model || null,
            telegram_executor: artifacts.localModelCoordination?.telegram_executor || null,
        },
        system_control: buildWorkspaceControlPayload(artifacts, runtimeCapabilities),
        intelligence: summarizeWorkspaceIntelligence(artifacts),
        project_state: projectState,
        current_phase: artifacts.phaseState,
    };
};

const getOmegaSystemSummary = () => {
    if (!fs.existsSync(omegaMainPath)) {
        return {
            status: 'missing',
            detail: 'omega_system main.py is not available in this workspace.',
        };
    }

    const pythonBin = process.env.PYTHON || 'python';
    const result = spawnSync(pythonBin, [omegaMainPath, '--summary'], {
        encoding: 'utf8',
        timeout: 8000,
        windowsHide: true,
    });

    if (result.error) {
        return {
            status: 'error',
            detail: result.error.message,
        };
    }

    if (result.status !== 0) {
        return {
            status: 'error',
            detail: (result.stderr || 'omega_system summary failed').trim(),
        };
    }

    const payloadText = (result.stdout || '').trim();
    if (!payloadText) {
        return {
            status: 'error',
            detail: 'omega_system summary returned empty output.',
        };
    }

    try {
        return {
            status: 'ok',
            summary: JSON.parse(payloadText),
        };
    } catch (error) {
        return {
            status: 'error',
            detail: error instanceof Error ? error.message : String(error),
        };
    }
};

const getEmergencyBridgeStatus = () => {
    if (!fs.existsSync(emergencyBridgeRoot)) {
        return {
            status: 'missing',
            detail: 'emergency_bridge directory is not available in this workspace.',
        };
    }

    let processedCount = 0;
    let lastProcessedAt = null;
    if (fs.existsSync(emergencyBridgeProcessed)) {
        const processedFiles = fs.readdirSync(emergencyBridgeProcessed)
            .filter((entry) => entry.endsWith('.json'))
            .map((entry) => ({
                name: entry,
                stats: fs.statSync(path.join(emergencyBridgeProcessed, entry)),
            }))
            .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);
        processedCount = processedFiles.length;
        if (processedFiles.length > 0) {
            lastProcessedAt = processedFiles[0].stats.mtime.toISOString();
        }
    }

    let heartbeat = null;
    if (fs.existsSync(emergencyBridgeHeartbeat)) {
        const heartbeatFiles = fs.readdirSync(emergencyBridgeHeartbeat)
            .filter((entry) => entry.startsWith('heartbeat_') && entry.endsWith('.json'))
            .map((entry) => ({
                name: entry,
                stats: fs.statSync(path.join(emergencyBridgeHeartbeat, entry)),
            }))
            .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);
        if (heartbeatFiles.length > 0) {
            const heartbeatPath = path.join(emergencyBridgeHeartbeat, heartbeatFiles[0].name);
            try {
                heartbeat = JSON.parse(fs.readFileSync(heartbeatPath, 'utf8'));
            } catch (error) {
                heartbeat = {
                    status: 'invalid',
                    detail: error instanceof Error ? error.message : String(error),
                };
            }
        }
    }

    return {
        status: 'ok',
        processed_count: processedCount,
        last_processed_at: lastProcessedAt,
        heartbeat,
    };
};

const getObservedOperatorCallers = () => focusedOperatorCallerPaths
    .map((candidate) => {
        if (!fs.existsSync(candidate.filePath)) {
            return null;
        }

        try {
            const source = fs.readFileSync(candidate.filePath, 'utf8');
            if (!source.includes(candidate.match)) {
                return null;
            }

            return {
                id: candidate.id,
                label: candidate.label,
                file_path: candidate.filePath,
                proof: candidate.match,
                risk: candidate.risk,
            };
        } catch (error) {
            return {
                id: candidate.id,
                label: candidate.label,
                file_path: candidate.filePath,
                proof: 'read-error',
                risk: error instanceof Error ? error.message : String(error),
            };
        }
    })
    .filter(Boolean);

const getOllamaStatus = async () => {
    const [tagsProbe, modelsProbe, responsesProbe] = await Promise.all([
        executeJsonProbe('ollama-tags', ollamaTagsUrl),
        executeJsonProbe('ollama-models', ollamaModelsUrl),
        executeJsonProbe('ollama-responses', ollamaResponsesUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3.2:3b',
                input: 'compatibility_probe',
            }),
        }),
    ]);

    if (tagsProbe.status !== 'healthy') {
        return {
            status: 'missing',
            detail: tagsProbe.detail,
            compatibility: {
                substrate_api: 'missing',
                models_api: modelsProbe.status === 'healthy' ? 'supported' : 'missing',
                responses_api: responsesProbe.status === 'healthy'
                    ? 'supported'
                    : responsesProbe.detail === '404 Not Found'
                        ? 'unsupported'
                        : 'missing',
            },
        };
    }

    const models = Array.isArray(tagsProbe.payload?.models) ? tagsProbe.payload.models.length : null;
    const modelsApiSupported = modelsProbe.status === 'healthy';
    const responsesApiState = responsesProbe.status === 'healthy'
        ? 'supported'
        : responsesProbe.detail === '404 Not Found'
            ? 'unsupported'
            : 'missing';
    const detail = responsesApiState === 'unsupported'
        ? 'Ollama substrate is reachable, but OpenAI Responses API is not exposed on localhost:11434.'
        : responsesApiState === 'missing'
            ? 'Ollama substrate is reachable, but Responses API compatibility is not currently proven.'
            : 'Ollama substrate and Responses API compatibility are reachable.';
    const observed_callers = getObservedOperatorCallers();
    return {
        status: 'ok',
        models,
        detail,
        observed_callers,
        compatibility: {
            substrate_api: 'supported',
            models_api: modelsApiSupported ? 'supported' : 'missing',
            responses_api: responsesApiState,
        },
    };
};

const getAidevRuntimeStatus = async () => {
    const checks = await Promise.all(
        aidevPorts.map(async (port) => {
            const url = `http://127.0.0.1:${port}`;
            const result = await executeTextProbe(url);
            return {
                port,
                url,
                status: result.ok ? 'ok' : 'missing',
                detail: result.ok ? 'reachable' : (result.error || 'unreachable'),
            };
        })
    );

    const anyLive = checks.some((check) => check.status === 'ok');
    return {
        status: anyLive ? 'ok' : 'missing',
        services: checks,
    };
};

const getGitLineageCandidates = () => {
    const candidates = [
        path.resolve('C:/Users/pc/aidev'),
        path.resolve('C:/aios_project/aidev'),
        path.resolve(workspaceRoot, 'AI_EMERGENCY_VAULT', 'aidev', 'aidev'),
        path.resolve(workspaceRoot, '_CONSOLIDATED', 'aidev'),
        path.resolve('C:/Users/pc/AIOS_HyperAI'),
    ];

    return candidates
        .filter((candidate, index, list) => candidate && list.indexOf(candidate) === index)
        .map((candidatePath) => {
            const gitDir = path.join(candidatePath, '.git');
            const configPath = path.join(gitDir, 'config');
            const exists = fs.existsSync(candidatePath);
            const hasGit = fs.existsSync(gitDir);
            let remoteUrl = null;
            let branch = null;
            let lastCommit = null;

            if (hasGit && fs.existsSync(configPath)) {
                try {
                    const configText = fs.readFileSync(configPath, 'utf8');
                    const remoteMatch = configText.match(/\[remote "origin"\][\s\S]*?url = ([^\r\n]+)/);
                    const branchMatch = configText.match(/\[branch "([^\"]+)"\]/);
                    remoteUrl = remoteMatch ? remoteMatch[1].trim() : null;
                    branch = branchMatch ? branchMatch[1].trim() : null;
                } catch {
                    remoteUrl = null;
                }
            }

            if (hasGit) {
                const logProbe = spawnSync('git', ['-C', candidatePath, 'log', '-1', '--pretty=format:%H|%ad|%an|%s', '--date=iso-strict'], {
                    encoding: 'utf8',
                    timeout: 4000,
                    windowsHide: true,
                });
                if (logProbe.status === 0 && logProbe.stdout.trim()) {
                    const [commit, committedAt, author, subject] = logProbe.stdout.trim().split('|');
                    lastCommit = {
                        commit,
                        committedAt,
                        author,
                        subject,
                    };
                }
            }

            const role = candidatePath === path.resolve('C:/Users/pc/aidev')
                ? 'preferred-lineage'
                : candidatePath === path.resolve('C:/aios_project/aidev')
                    ? 'secondary-lineage'
                    : candidatePath.includes('AI_EMERGENCY_VAULT')
                        ? 'archive-lineage'
                        : candidatePath.includes('_CONSOLIDATED')
                            ? 'consolidated-lineage'
                            : 'adjacent-surface';

            return {
                path: candidatePath,
                exists,
                has_git: hasGit,
                remote_url: remoteUrl,
                branch,
                role,
                last_commit: lastCommit,
            };
        })
        .filter((candidate) => candidate.exists);
};

const probeGithubCli = () => {
    const candidatePaths = [
        'C:/Program Files/GitHub CLI/gh.exe',
        'C:/Program Files (x86)/GitHub CLI/gh.exe',
        'C:/Users/pc/AppData/Local/GitHub CLI/bin/gh.exe',
        'C:/Users/pc/AppData/Local/Programs/GitHub CLI/gh.exe',
        'C:/Users/pc/scoop/apps/gh/current/bin/gh.exe',
        'C:/ProgramData/chocolatey/bin/gh.exe',
    ].map((candidate) => path.resolve(candidate));

    const commandProbe = spawnSync('gh', ['--version'], {
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
    });
    if (!commandProbe.error && commandProbe.status === 0) {
        const commandPath = spawnSync('where', ['gh'], {
            encoding: 'utf8',
            timeout: 4000,
            windowsHide: true,
        });
        return {
            gh_cli: 'available',
            gh_probe_status: 'ready',
            gh_binary_path: commandPath.status === 0 ? commandPath.stdout.split(/\r?\n/)[0].trim() : 'gh',
            gh_source: 'path',
            attachment_gate_a: 'ready',
        };
    }

    const installedBinary = candidatePaths.find((candidate) => fs.existsSync(candidate)) || null;
    if (installedBinary) {
        return {
            gh_cli: 'missing',
            gh_probe_status: 'installed-outside-path',
            gh_binary_path: installedBinary,
            gh_source: 'binary-outside-path',
            attachment_gate_a: 'blocked',
        };
    }

    const desktopRoot = path.resolve('C:/Users/pc/AppData/Local/GitHubDesktop');
    const desktopInstalled = fs.existsSync(desktopRoot);
    return {
        gh_cli: 'missing',
        gh_probe_status: desktopInstalled ? 'desktop-present-gh-missing' : 'not-found',
        gh_binary_path: null,
        gh_source: desktopInstalled ? 'desktop-missing' : 'not-found',
        attachment_gate_a: 'blocked',
    };
};

const probeGithubBrowserApp = () => {
    const edgeUserDataRoot = path.resolve('C:/Users/pc/AppData/Local/Microsoft/Edge/User Data');
    const localStatePath = path.join(edgeUserDataRoot, 'Local State');
    const appId = 'mjoklplbddabcmpepnokjaffbmgbkkgg';
    const appOrigin = 'https://github.com/';
    const appIconPath = path.join(
        edgeUserDataRoot,
        'Default',
        'Web Applications',
        `_crx__${appId}`,
        'GitHub.ico'
    );

    if (!fs.existsSync(localStatePath)) {
        return {
            browser_app_status: 'missing',
            browser_app_id: appId,
            browser_app_origin: appOrigin,
            browser_app_installed: false,
            browser_app_scope: null,
            browser_app_last_used_at: null,
            browser_app_source: 'edge-local-state-missing',
            browser_app_profiles: [],
            browser_app_icon_path: fs.existsSync(appIconPath) ? appIconPath : null,
        };
    }

    try {
        const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
        const appShims = localState?.app_shims?.[appId] || null;
        const webAppMetrics = localState?.web_app_install_metrics?.[appId] || null;
        const dailyMetrics = localState?.web_apps?.daily_metrics?.[appOrigin] || null;
        const installedProfiles = Array.isArray(appShims?.installed_profiles) ? appShims.installed_profiles : [];
        const lastActiveProfiles = Array.isArray(appShims?.last_active_profiles) ? appShims.last_active_profiles : [];
        const installed = Boolean(appShims || webAppMetrics || dailyMetrics);

        return {
            browser_app_status: installed ? 'available' : 'missing',
            browser_app_id: appId,
            browser_app_origin: appOrigin,
            browser_app_installed: installed,
            browser_app_scope: dailyMetrics?.effective_display_mode != null ? `display-mode-${dailyMetrics.effective_display_mode}` : null,
            browser_app_last_used_at: webAppMetrics?.install_timestamp || null,
            browser_app_source: installed ? 'edge-local-state' : 'edge-app-missing',
            browser_app_profiles: installedProfiles.length ? installedProfiles : lastActiveProfiles,
            browser_app_icon_path: fs.existsSync(appIconPath) ? appIconPath : null,
            browser_app_link_capture: Boolean(dailyMetrics?.captures_links),
        };
    } catch (error) {
        return {
            browser_app_status: 'degraded',
            browser_app_id: appId,
            browser_app_origin: appOrigin,
            browser_app_installed: false,
            browser_app_scope: null,
            browser_app_last_used_at: null,
            browser_app_source: error instanceof Error ? error.message : String(error),
            browser_app_profiles: [],
            browser_app_icon_path: fs.existsSync(appIconPath) ? appIconPath : null,
        };
    }
};

const getGithubSurfaceStatus = () => {
    const workflowsRoot = path.resolve(workspaceRoot, 'hyperai-user-control-system', '.github', 'workflows');
    const productRoot = path.resolve(workspaceRoot, 'hyperai-user-control-system');
    const workflowFiles = fs.existsSync(workflowsRoot)
        ? fs.readdirSync(workflowsRoot).filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
        : [];
    const ghProbe = probeGithubCli();
    const gitWorkTree = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
        cwd: productRoot,
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
    });
    const ghAvailable = ghProbe.gh_probe_status === 'ready';
    const insideGitWorkTree = gitWorkTree.status === 0 && gitWorkTree.stdout.trim() === 'true';
    const localGitName = spawnSync('git', ['config', '--local', 'user.name'], {
        cwd: productRoot,
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
    });
    const localGitEmail = spawnSync('git', ['config', '--local', 'user.email'], {
        cwd: productRoot,
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
    });
    const localIdentityScope = spawnSync('git', ['config', '--local', 'hyperai.identity.scope'], {
        cwd: productRoot,
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
    });
    const globalGitName = spawnSync('git', ['config', '--global', 'user.name'], {
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
    });
    const globalGitEmail = spawnSync('git', ['config', '--global', 'user.email'], {
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
    });
    const ciWorkflowPresent = workflowFiles.includes('ci.yml');
    const identityWorkflowPresent = workflowFiles.includes('identity-surface.yml');
    const releaseWorkflowPresent = workflowFiles.includes('release.yml');
    const runtimePolicy = readManifestPolicy() || {};
    const browserApp = probeGithubBrowserApp();
    const status =
        ghAvailable && insideGitWorkTree && ciWorkflowPresent
            ? 'ok'
            : ciWorkflowPresent || browserApp.browser_app_installed
                ? 'degraded'
                : 'missing';
    const agentMode = ghAvailable && insideGitWorkTree
        ? 'live-gh'
        : ciWorkflowPresent
            ? 'filesystem-authority'
            : 'missing';

    const gitName = (localGitName.status === 0 ? localGitName.stdout : globalGitName.stdout).trim() || null;
    const gitEmail = (localGitEmail.status === 0 ? localGitEmail.stdout : globalGitEmail.stdout).trim() || null;
    const identityScope = (localIdentityScope.status === 0 ? localIdentityScope.stdout.trim() : '') || 'global-default';
    const lineageCandidates = getGitLineageCandidates();
    const preferredLineage = lineageCandidates.find((candidate) => candidate.role === 'preferred-lineage' && candidate.has_git)
        || lineageCandidates.find((candidate) => candidate.has_git)
        || null;
    const preferredLineageHealthy = Boolean(
        preferredLineage
        && preferredLineage.has_git
        && preferredLineage.remote_url === 'https://github.com/sowhat1989/aidev.git'
        && preferredLineage.branch === 'main'
        && preferredLineage.last_commit?.commit
    );
    const attachmentRecommendation = ghProbe.attachment_gate_a === 'ready' && preferredLineageHealthy
        ? 'remote-reference only'
        : 'hold-filesystem-authority';

    return {
        status,
        gh_cli: ghProbe.gh_cli,
        gh_probe_status: ghProbe.gh_probe_status,
        gh_binary_path: ghProbe.gh_binary_path,
        gh_source: ghProbe.gh_source,
        browser_app_status: browserApp.browser_app_status,
        browser_app_id: browserApp.browser_app_id,
        browser_app_origin: browserApp.browser_app_origin,
        browser_app_installed: browserApp.browser_app_installed,
        browser_app_scope: browserApp.browser_app_scope,
        browser_app_last_used_at: browserApp.browser_app_last_used_at,
        browser_app_source: browserApp.browser_app_source,
        browser_app_profiles: browserApp.browser_app_profiles,
        browser_app_icon_path: browserApp.browser_app_icon_path,
        browser_app_link_capture: browserApp.browser_app_link_capture,
        git_worktree: insideGitWorkTree ? 'attached' : 'snapshot-only',
        git_name: gitName,
        git_email: gitEmail,
        identity_scope: identityScope,
        ci_workflow: ciWorkflowPresent ? 'present' : 'missing',
        identity_workflow: identityWorkflowPresent ? 'present' : 'missing',
        release_workflow: releaseWorkflowPresent ? 'present' : 'missing',
        workflow_count: workflowFiles.length,
        agent_mode: agentMode,
        query_ready: ciWorkflowPresent,
        selected_action: runtimePolicy.selected_action || null,
        boundary_state: runtimePolicy.boundary_state || runtimePolicy.haios_state || null,
        attachment_gate_a: ghProbe.attachment_gate_a,
        attachment_gate_b: preferredLineageHealthy ? 'ready' : 'blocked',
        attachment_recommendation: attachmentRecommendation,
        preferred_lineage: preferredLineage,
        lineage_candidates: lineageCandidates,
        detail: ghAvailable
            ? insideGitWorkTree
                ? 'Local GitHub CLI is available and the product surface is attached to a git worktree.'
                : 'GitHub workflows exist, but this local product surface is currently a filesystem snapshot rather than a git worktree.'
            : ghProbe.gh_probe_status === 'installed-outside-path'
                ? 'GitHub CLI binary exists outside PATH. Filesystem-authority remains active until PATH is normalized.'
                : browserApp.browser_app_installed
                    ? 'GitHub workflows exist, gh is unresolved, and the GitHub Edge app remains available as a browser-app authority alongside filesystem-authority.'
                    : 'GitHub workflows exist, but gh is not installed in the current shell path. Global git identity is available for filesystem-authority operation.',
    };
};

const readProjectState = () => {
    if (!fs.existsSync(projectStatePath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(projectStatePath, 'utf8'));
    } catch {
        return null;
    }
};

const readProjectStateSummary = () => {
    const payload = readProjectState();
    if (!payload) {
        return null;
    }
    return {
        current_focus: payload.current_focus || '',
        latest_summary: payload.latest_summary || '',
    };
};

const writeProjectStateSummary = (patch = {}) => {
    const current = readProjectState() || {};
    const next = {
        ...current,
        ...patch,
        last_updated: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(projectStatePath), { recursive: true });
    fs.writeFileSync(projectStatePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return next;
};

const buildGithubAgentReply = ({ query = '', context = '', type = 'general', language = 'typescript' } = {}) => {
    const github = getGithubSurfaceStatus();
    const projectState = readProjectStateSummary();
    const responseParts = [
        `GitHub surface mode: ${github.agent_mode}.`,
        `gh CLI: ${github.gh_cli}.`,
        `Git worktree: ${github.git_worktree}.`,
        `Workflow coverage: ci=${github.ci_workflow}, identity=${github.identity_workflow}, release=${github.release_workflow}.`,
    ];

    if (github.boundary_state || github.selected_action) {
        responseParts.push(
            `App boundary policy: state=${github.boundary_state || 'unknown'}, action=${github.selected_action || 'unknown'}.`
        );
    }

    if (projectState?.current_focus) {
        responseParts.push(`Current workspace focus: ${projectState.current_focus}.`);
    }
    if (projectState?.latest_summary) {
        responseParts.push(`Latest memory summary: ${projectState.latest_summary}.`);
    }
    if (context) {
        responseParts.push(`Context anchor: ${context}.`);
    }
    if (query) {
        responseParts.push(`Requested query: ${query}.`);
    }
    responseParts.push(`Response mode: ${type} for ${language}.`);
    responseParts.push(`Attachment readiness: gateA=${github.attachment_gate_a || 'unknown'}, gateB=${github.attachment_gate_b || 'unknown'}, recommendation=${github.attachment_recommendation || 'unknown'}.`);
    responseParts.push(
        github.query_ready
            ? 'Use the workflow files and runtime policy as the current GitHub authority because the local shell lacks a guaranteed gh runtime.'
            : 'GitHub workflow authority is incomplete in this workspace snapshot.'
    );

    return {
        success: true,
        source: github.gh_cli === 'available' ? 'gh-surface' : 'filesystem-github-surface',
        response: responseParts.join(' '),
        github,
        project_state: projectState,
        timestamp: new Date().toISOString(),
    };
};

const summarizeEvidence = (basePath, evidenceFiles) => {
    const details = [];
    let latest = null;
    for (const evidence of evidenceFiles) {
        const target = path.join(basePath, evidence);
        if (!fs.existsSync(target)) {
            details.push({ path: evidence, status: 'missing' });
            continue;
        }
        const stats = fs.statSync(target);
        details.push({
            path: evidence,
            status: 'present',
            updatedAt: stats.mtime.toISOString(),
        });
        if (!latest || stats.mtime > latest) {
            latest = stats.mtime;
        }
    }
    return {
        details,
        latestAt: latest ? latest.toISOString() : null,
    };
};

const buildEcosystemRegistry = () => {
    const runtimeArtifacts = summarizeEvidence(path.resolve(workspaceRoot, 'runtime'), [
        'hyperai-autonomous-runtime.json',
        'hyperai-autonomous-policy.json',
    ]);
    const emergencyBridgeStatus = getEmergencyBridgeStatus();
    const emergencyLastSeen = emergencyBridgeStatus.last_processed_at ||
        (emergencyBridgeStatus.heartbeat && emergencyBridgeStatus.heartbeat.at) ||
        null;

    const entries = [
        {
            id: 'hyperai-user-control-system',
            label: 'HyperAI User Control System',
            path: path.resolve(workspaceRoot, 'hyperai-user-control-system'),
            evidence: summarizeEvidence(path.resolve(workspaceRoot, 'hyperai-user-control-system'), [
                'package.json',
                path.join('backend', 'server.js'),
            ]),
        },
        {
            id: 'runtime-artifacts',
            label: 'Runtime Policy + Manifest',
            path: path.resolve(workspaceRoot, 'runtime'),
            evidence: runtimeArtifacts,
        },
        {
            id: 'emergency-bridge',
            label: 'Emergency Bridge',
            path: emergencyBridgeRoot,
            evidence: summarizeEvidence(emergencyBridgeRoot, ['logs', 'processed']),
            lastSeenAt: emergencyLastSeen,
        },
        {
            id: 'omega-system',
            label: 'Omega System',
            path: omegaRootPath,
            evidence: summarizeEvidence(omegaRootPath, ['main.py']),
        },
        {
            id: 'hyperai-phoenix',
            label: 'HyperAI Phoenix Core',
            path: path.resolve(workspaceRoot, 'hyperai_phoenix'),
            evidence: summarizeEvidence(path.resolve(workspaceRoot, 'hyperai_phoenix'), ['__init__.py', 'README.md']),
        },
        {
            id: 'hyperai-agents',
            label: 'HyperAI Agents',
            path: path.resolve(workspaceRoot, 'hyperai_agents'),
            evidence: summarizeEvidence(path.resolve(workspaceRoot, 'hyperai_agents'), ['README.md', 'registry']),
        },
        {
            id: 'github-control-surface',
            label: 'GitHub Control Surface',
            path: path.resolve(workspaceRoot, 'hyperai-user-control-system', '.github'),
            evidence: summarizeEvidence(path.resolve(workspaceRoot, 'hyperai-user-control-system', '.github'), [
                path.join('workflows', 'ci.yml'),
                path.join('workflows', 'identity-surface.yml'),
                path.join('workflows', 'release.yml'),
            ]),
        },
        {
            id: 'git-lineage',
            label: 'Git Lineage Candidates',
            path: path.resolve('C:/Users/pc'),
            evidence: getGitLineageCandidates().map((candidate) => ({
                path: candidate.path,
                status: candidate.has_git ? 'present' : 'missing',
                updatedAt: candidate.last_commit?.committedAt || null,
            })),
            lastSeenAt: getGitLineageCandidates().find((candidate) => candidate.last_commit)?.last_commit?.committedAt || null,
        },
        {
            id: 'github-browser-app',
            label: 'GitHub Browser App',
            path: path.resolve('C:/Users/pc/AppData/Local/Microsoft/Edge/User Data/Default/Web Applications'),
            evidence: [probeGithubBrowserApp()].map((browserApp) => ({
                path: browserApp.browser_app_icon_path || browserApp.browser_app_origin,
                status: browserApp.browser_app_installed ? 'present' : (browserApp.browser_app_status === 'degraded' ? 'degraded' : 'missing'),
                updatedAt: browserApp.browser_app_last_used_at || null,
            })),
            lastSeenAt: probeGithubBrowserApp().browser_app_last_used_at || null,
        },
        {
            id: 'vietnamese-ecosystem',
            label: 'Vietnamese AI Ecosystem',
            path: path.resolve(workspaceRoot, 'vietnamese_ai_ecosystem'),
            evidence: summarizeEvidence(path.resolve(workspaceRoot, 'vietnamese_ai_ecosystem'), ['README.md', 'docs']),
        },
    ];

    return entries.map((entry) => {
        const exists = fs.existsSync(entry.path);
        const evidenceDetails = Array.isArray(entry.evidence)
            ? entry.evidence
            : (entry.evidence?.details || []);
        const hasEvidence = evidenceDetails.some((item) => item.status === 'present');
        const status = !exists
            ? 'missing'
            : entry.lastSeenAt
                ? 'active'
                : hasEvidence
                    ? 'present'
                    : 'unknown';
        return {
            id: entry.id,
            label: entry.label,
            path: entry.path,
            status,
            lastSeenAt: entry.lastSeenAt || entry.evidence?.latestAt || null,
            evidence: evidenceDetails,
        };
    });
};

const ensureRuntimeManifestDir = () => {
    fs.mkdirSync(path.dirname(runtimeManifestPath), { recursive: true });
};

const readRuntimeManifest = () => {
    if (!fs.existsSync(runtimeManifestPath)) {
        return {};
    }

    try {
        return JSON.parse(fs.readFileSync(runtimeManifestPath, 'utf8')) || {};
    } catch {
        return {};
    }
};

const readManifestPolicy = () => {
    const manifest = readRuntimeManifest();
    return manifest.policy || null;
};

const persistAutonomyPolicyManifest = (capabilities) => {
    const manifest = readRuntimeManifest();
    const previousPolicy = manifest.policy || {};
    const previousProofEvents = Array.isArray(previousPolicy.proof_events) ? previousPolicy.proof_events : [];
    const nextProofEvent = {
        at: capabilities.generated_at,
        source: 'backend/server.js',
        type: capabilities.selected_action,
        detail: capabilities.authority_reason,
    };
    const proofEvents = previousProofEvents.length > 0 &&
        previousProofEvents[previousProofEvents.length - 1]?.type === nextProofEvent.type &&
        previousProofEvents[previousProofEvents.length - 1]?.detail === nextProofEvent.detail
        ? previousProofEvents.slice(-6)
        : [...previousProofEvents.slice(-5), nextProofEvent];
    const payload = {
        updated_at: capabilities.generated_at,
        cycle_number: previousPolicy.cycle_number,
        daemon_pid: previousPolicy.daemon_pid,
        selected_action: capabilities.selected_action,
        state_transition: capabilities.state_transition,
        action_reason: capabilities.authority_reason,
        boundary_state: capabilities.boundary_state,
        boundary_reason: capabilities.boundary_reason,
        haios_state: capabilities.boundary_state,
        haios_reason: capabilities.boundary_reason,
        backend_classification: capabilities.backend_classification,
        frontend_classification: capabilities.frontend_classification,
        runtime_strategy: capabilities.runtime_strategy,
        routine_decisions: capabilities.routine_decisions,
        safe_recovery_available: capabilities.safe_recovery_available,
        core_ready: capabilities.autonomous_core_ready,
        requires_operator_relay: capabilities.requires_operator_relay,
        runtime_authority: capabilities.runtime_authority,
        runtime_recovery: capabilities.runtime_recovery,
        status: capabilities.status,
        manifest_version: previousPolicy.manifest_version || previousPolicy.updated_at,
        policy_source: 'backend/server.js',
        fallback_triggered: capabilities.selected_action !== 'reuse_default_runtime',
        active_runtime: {
            type: capabilities.selected_action === 'reuse_managed_runtime' ? 'managed' : 'default',
            backend: {
                url: capabilities.selected_action === 'reuse_managed_runtime'
                    ? (capabilities.runtime_authority?.managed_backend_url || null)
                    : 'http://127.0.0.1:5000',
                port: capabilities.selected_action === 'reuse_managed_runtime'
                    ? (capabilities.runtime_recovery?.managedRuntime?.backendUrl
                        ? Number(new URL(capabilities.runtime_recovery.managedRuntime.backendUrl).port || 80)
                        : undefined)
                    : 5000,
            },
            frontend: {
                url: capabilities.selected_action === 'reuse_managed_runtime'
                    ? (capabilities.runtime_authority?.managed_frontend_url || null)
                    : 'http://127.0.0.1:4173',
                port: capabilities.selected_action === 'reuse_managed_runtime'
                    ? (capabilities.runtime_recovery?.managedRuntime?.frontendUrl
                        ? Number(new URL(capabilities.runtime_recovery.managedRuntime.frontendUrl).port || 80)
                        : undefined)
                    : 4173,
            },
        },
        proof_events: proofEvents,
    };

    manifest.policy = {
        ...previousPolicy,
        ...payload,
    };

    ensureRuntimeManifestDir();
    fs.writeFileSync(runtimeManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return manifest.policy;
};

const compactAutonomyPolicyState = (policyState) => {
    if (!policyState || typeof policyState !== 'object') {
        return null;
    }

    return {
        updated_at: policyState.updated_at || null,
        cycle_number: typeof policyState.cycle_number === 'number' ? policyState.cycle_number : 0,
        selected_action: typeof policyState.selected_action === 'string' ? policyState.selected_action : 'unknown',
        action_reason: typeof policyState.action_reason === 'string' ? policyState.action_reason : '',
        backend_classification:
            typeof policyState.backend_classification === 'string' ? policyState.backend_classification : 'unknown',
        frontend_classification:
            typeof policyState.frontend_classification === 'string' ? policyState.frontend_classification : 'unknown',
        runtime_strategy: typeof policyState.runtime_strategy === 'string' ? policyState.runtime_strategy : 'unknown',
        boundary_state: typeof policyState.boundary_state === 'string' ? policyState.boundary_state : null,
        boundary_reason: typeof policyState.boundary_reason === 'string' ? policyState.boundary_reason : '',
        haios_state: typeof policyState.haios_state === 'string' ? policyState.haios_state : null,
        haios_reason: typeof policyState.haios_reason === 'string' ? policyState.haios_reason : '',
        safe_recovery_available: Boolean(policyState.safe_recovery_available),
        fallback_triggered: Boolean(policyState.fallback_triggered),
        policy_source: typeof policyState.policy_source === 'string' ? policyState.policy_source : 'runtime-manifest',
        routine_decisions: Array.isArray(policyState.routine_decisions) ? policyState.routine_decisions : [],
        proof_events: Array.isArray(policyState.proof_events) ? policyState.proof_events : [],
        runtime_authority:
            policyState.runtime_authority && typeof policyState.runtime_authority === 'object'
                ? policyState.runtime_authority
                : null,
        runtime_recovery:
            policyState.runtime_recovery && typeof policyState.runtime_recovery === 'object'
                ? policyState.runtime_recovery
                : null,
        active_runtime:
            policyState.active_runtime && typeof policyState.active_runtime === 'object'
                ? policyState.active_runtime
                : null,
    };
};

const buildPolicyArtifactStatus = ({ rootPolicyState, manifestPolicyState, selectedAction }) => {
    const rootPolicy = compactAutonomyPolicyState(rootPolicyState);
    const manifestPolicy = compactAutonomyPolicyState(manifestPolicyState);
    const rootUpdatedAt = rootPolicy?.updated_at ? Date.parse(rootPolicy.updated_at) : null;
    const manifestUpdatedAt = manifestPolicy?.updated_at ? Date.parse(manifestPolicy.updated_at) : null;
    const activeRuntimeType =
        selectedAction === 'reuse_managed_runtime'
            ? 'managed'
            : selectedAction === 'hold_current_runtime' && manifestPolicy?.active_runtime?.type
                ? manifestPolicy.active_runtime.type
                : 'default';

    return {
        root_policy: rootPolicy,
        manifest_policy: manifestPolicy,
        mismatch_flags: {
            root_missing: !rootPolicy,
            manifest_missing: !manifestPolicy,
            root_older_than_manifest: Boolean(
                Number.isFinite(rootUpdatedAt) &&
                Number.isFinite(manifestUpdatedAt) &&
                rootUpdatedAt < manifestUpdatedAt
            ),
            selected_action_disagreement: Boolean(
                rootPolicy?.selected_action &&
                manifestPolicy?.selected_action &&
                rootPolicy.selected_action !== manifestPolicy.selected_action
            ),
            active_runtime_type_disagreement: Boolean(
                manifestPolicy?.active_runtime?.type &&
                manifestPolicy.active_runtime.type !== activeRuntimeType
            ),
            frontend_classification_disagreement: Boolean(
                rootPolicy?.frontend_classification &&
                manifestPolicy?.frontend_classification &&
                rootPolicy.frontend_classification !== manifestPolicy.frontend_classification
            ),
        },
    };
};

const buildRuntimeCapabilities = async () => {
    const autonomyStatus = autonomyRuntime.getStatus();
    const active = autonomyStatus.active;
    const selfManagedRuntime = PORT !== 5000;
    const policyState = readAutonomyPolicy();
    const fileModifiedAt = fs.statSync(serverFilePath).mtime;
    const processStartedAt = new Date(bootTimestamp);
    const staleProcess = processStartedAt.getTime() < fileModifiedAt.getTime();
    const authority = buildRuntimeAuthority();
    const manifest = authority.manifest || {};
    const recovery = await ensureManagedRuntimeRecovery('runtime-capabilities');
    const frontendPreview = await executeTextProbe('http://127.0.0.1:4173');
    const appBuildRuntimeRegistry = buildAppBuildRuntimeRegistry();
    const hasProbeEvidence = Boolean(autonomyStatus.latestProbeSummary?.checkedAt);
    const currentDefaultBoundaryHealthy = !selfManagedRuntime && !staleProcess && frontendPreview.ok;
    const backendClassification = staleProcess
        ? 'stale-process runtime'
        : active && hasProbeEvidence
            ? 'autonomous-core-ready'
            : active
                ? 'operational-without-autonomy'
                : 'degraded/local-only';
    const recoveryInFlight = !currentDefaultBoundaryHealthy && (
        recovery.selectedAction === 'start_managed_runtime' ||
        recovery.selectedAction === 'reconcile_managed_runtime' ||
        recovery.status === 'reconciling'
    );
    const boundaryState = recoveryInFlight
        ? 'recoverable'
        : staleProcess
            ? 'recoverable'
            : authority.autonomousCoreReady && active && hasProbeEvidence
                ? 'autonomous'
                : active
                    ? 'operational'
                    : 'recoverable';
    const boundaryReason = recoveryInFlight
        ? `Boundary is waiting for the managed local-first runtime to reconcile safely. ${recovery.reason}`
        : staleProcess
            ? 'Runtime responds, but this listener predates the current backend/server.js timestamp and cannot claim fresh authority.'
            : active && hasProbeEvidence
                ? 'Autonomy loop is active, probe evidence exists, and routine stabilization can proceed without operator relay.'
                : 'Runtime is booted and controllable, but autonomy proof is incomplete or paused.';
    const policySelectedAction = typeof policyState?.selected_action === 'string' ? policyState.selected_action : null;
    const policyStateHealthy = policyState?.status !== 'missing' && policyState?.status !== 'invalid';
    const policyConfirmsRoutineControl = Boolean(
        active &&
        policyStateHealthy &&
        policySelectedAction &&
        (
            policySelectedAction === 'reuse_default_runtime' ||
            policySelectedAction === 'reuse_managed_runtime' ||
            policySelectedAction === 'hold_current_runtime'
        )
    );
    const selfManagedRoutineControl = Boolean(
        selfManagedRuntime &&
        !staleProcess &&
        active &&
        hasProbeEvidence &&
        backendClassification === 'autonomous-core-ready'
    );
    const effectiveBoundaryState = (policyConfirmsRoutineControl || selfManagedRoutineControl)
        ? 'autonomous'
        : boundaryState;
    const effectiveBoundaryReason = policyConfirmsRoutineControl
        ? `Autonomous policy selected ${policySelectedAction} and the live loop is handling routine runtime selection without operator relay.`
        : selfManagedRoutineControl
            ? 'Local-first proof runtime is handling routine runtime selection without operator relay.'
        : boundaryReason;
    const effectiveAutonomousCoreReady = Boolean(
        (authority.autonomousCoreReady || selfManagedRoutineControl) &&
        active &&
        hasProbeEvidence
    );
    const requiresOperatorRelay = !policyConfirmsRoutineControl &&
        !selfManagedRoutineControl &&
        (recoveryInFlight || staleProcess || !authority.autonomousCoreReady || !active || !hasProbeEvidence);

    const capabilities = {
        status: 'ok',
        runtime_mode: currentDefaultBoundaryHealthy ? 'default-runtime' : authority.mode,
        boundary_state: effectiveBoundaryState,
        boundary_reason: effectiveBoundaryReason,
        generated_at: new Date().toISOString(),
        symphony_running: active,
        autonomous_core_ready: effectiveAutonomousCoreReady,
        requires_operator_relay: requiresOperatorRelay,
        core_boundary: authority.coreBoundary,
        non_core_lanes: authority.nonCoreOperationalLanes,
        degraded_lanes: authority.degradedLanes,
        command_count: autonomyStatus.metrics.ticks,
        decision_count: autonomyStatus.decisionCount || 0,
        last_command: autonomyStatus.lastAction,
        backend_classification: backendClassification,
        frontend_classification: currentDefaultBoundaryHealthy ? 'preview-alive' : authority.frontendClassification,
        selected_action: currentDefaultBoundaryHealthy ? 'reuse_default_runtime' : (recovery.selectedAction || authority.selectedAction),
        state_transition: authority.stateTransition,
        authority_reason: currentDefaultBoundaryHealthy
            ? 'Current default runtime boundary is fresh, reachable, and can keep handling routine decisions locally.'
            : (recovery.reason || authority.authorityReason),
        safe_recovery_available: currentDefaultBoundaryHealthy ? false : authority.safeRecoveryAvailable,
        routine_decisions: [
            ...authority.routineDecisions,
            policyConfirmsRoutineControl
                ? `Autonomous policy confirms routine runtime action ${policySelectedAction}.`
                : selfManagedRoutineControl
                    ? 'Self-managed proof runtime confirms routine runtime control without operator relay.'
                : 'Autonomous policy has not yet confirmed a reusable runtime action.',
        ],
        runtime_strategy: authority.runtimeStrategy,
        runtime_recovery: recovery,
        autonomy_policy: policyStateHealthy ? compactAutonomyPolicyState(policyState) : null,
        runtime_authority: {
            backend_runtime: 'backend/server.js',
            stale_process: staleProcess,
            process_started_at: processStartedAt.toISOString(),
            file_modified_at: fileModifiedAt.toISOString(),
            managed_runtime: currentDefaultBoundaryHealthy ? false : Boolean(recovery.managedRuntime?.managed || manifest.managed),
            managed_backend_url: currentDefaultBoundaryHealthy ? null : (recovery.managedRuntime?.backendUrl || manifest.backendUrl || null),
            managed_frontend_url: currentDefaultBoundaryHealthy ? null : (recovery.managedRuntime?.frontendUrl || manifest.frontendUrl || null),
            operator_attention_required: currentDefaultBoundaryHealthy ? false : authority.operatorAttentionRequired,
            managed_runtime_health: currentDefaultBoundaryHealthy ? 'not-required' : authority.managedRuntimeHealth,
            summary: staleProcess
                ? 'The live backend listener predates the current backend/server.js timestamp. Treat this runtime as stale until it is restarted or re-proven.'
                : 'The live backend listener is aligned with the current backend/server.js timestamp.',
        },
        app_build_runtime_registry: appBuildRuntimeRegistry,
        model_facade_state: appBuildRuntimeRegistry?.model_facade_state || null,
        ecosystem_registry: buildEcosystemRegistry(),
        lanes: [
            {
                id: 'autonomy',
                label: 'Autonomy Loop',
                mode: active ? 'live' : 'degraded',
                status: active ? 'Autonomy scheduler running' : 'Autonomy loop stopped',
                evidence: autonomyStatus.heartbeat.detail,
                endpoint: '/api/autonomy/status',
            },
            {
                id: 'symphony',
                label: 'Symphony Orchestrator',
                mode: active ? 'live' : 'degraded',
                status: active ? 'Command lane active' : 'Command lane paused',
                evidence: 'Start/stop/status commands are backed by the active CI runtime path in backend/server.js.',
                endpoint: '/api/symphony/status',
            },
            classifyLane(manifest, 'empathy', {
                id: 'empathy',
                label: 'Empathy Processing',
                mode: 'disabled',
                modeWhenProven: 'live',
                status: 'Inactive until re-proven',
                statusWhenProven: 'Runtime-backed empathy lane',
                evidence: 'Empathy stays outside the autonomous-safe contract unless the runtime authority proves it live.',
                provenEvidence: 'Empathy requests are currently handled by the active backend runtime and reflected in analytics/status endpoints.',
                endpoint: '/api/empathy/process',
            }),
            classifyLane(manifest, 'vietnamese', {
                id: 'vietnamese',
                label: 'Vietnamese Cultural Analysis',
                mode: 'local-only',
                modeWhenProven: 'live',
                status: 'Local fallback analysis',
                statusWhenProven: 'Runtime-backed analysis lane',
                evidence: 'Vietnamese analysis remains executable in local fallback mode until runtime authority proves the live NLP lane.',
                provenEvidence: 'Vietnamese NLP routes are currently executable from the active backend runtime.',
                endpoint: '/api/vietnamese/analyze',
            }),
            classifyLane(manifest, 'notebooklm', {
                id: 'notebooklm',
                label: 'NotebookLM Integration',
                mode: 'disabled',
                modeWhenProven: 'degraded',
                status: 'Optional integration quarantined',
                statusWhenProven: 'Operational stub surface',
                evidence: 'NotebookLM remains outside the autonomous-safe core unless runtime authority re-proves it.',
                provenEvidence: 'Notebook routes exist for contract validation, but still need upstream credentials for production autonomy.',
                endpoint: '/api/notebooklm/status',
            }),
            classifyLane(manifest, 'chat', {
                id: 'chat',
                label: 'Chat Transport',
                mode: 'local-only',
                modeWhenProven: 'degraded',
                status: 'Local fallback command shell',
                statusWhenProven: 'Runtime-backed command shell',
                evidence: 'Chat remains command-oriented and local-first until runtime authority proves the backend lane.',
                provenEvidence: 'Chat history is now retained by the active backend runtime, but freeform conversational intelligence remains command-oriented.',
                endpoint: '/api/chat/messages',
            }),
            classifyLane(manifest, 'websocket', {
                id: 'websocket',
                label: 'Realtime Telemetry',
                mode: 'disabled',
                modeWhenProven: 'degraded',
                status: 'Websocket lane quarantined',
                statusWhenProven: 'Socket.IO root channel only',
                evidence: 'Realtime telemetry is not authoritative for the autonomous-safe lane until explicitly re-proven.',
                provenEvidence: 'The runtime exposes a root Socket.IO channel, but dedicated metrics and symphony namespaces are not first-class contracts yet.',
            }),
        ],
    };
    const policyManifest = persistAutonomyPolicyManifest(capabilities);
    capabilities.autonomy_policy = policyManifest;
    capabilities.policy_artifacts = buildPolicyArtifactStatus({
        rootPolicyState: policyState,
        manifestPolicyState: policyManifest,
        selectedAction: capabilities.selected_action,
    });
    capabilities.creator_trace_protocol = buildCreatorTraceProtocol(capabilities);
    return capabilities;
};

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'APO-NET Core Active' }));
app.get('/api/runtime/capabilities', async (req, res) => {
    res.json(await buildRuntimeCapabilities());
});
app.get('/api/github-agent/status', (req, res) => {
    res.json(getGithubSurfaceStatus());
});
app.post('/api/github-agent/query', (req, res) => {
    res.json(buildGithubAgentReply(req.body || {}));
});
app.get('/api/runtime/ecosystems', async (req, res) => {
    const [ollama, aidev] = await Promise.all([
        getOllamaStatus(),
        getAidevRuntimeStatus(),
    ]);
    const github = getGithubSurfaceStatus();

    res.json({
        generated_at: new Date().toISOString(),
        ecosystems: buildEcosystemRegistry(),
        runtime_services: {
            github,
            ollama,
            aidev,
        },
    });
});

app.get('/api/workspace/session', async (req, res) => {
    res.json(await buildWorkspaceSessionPayload());
});

app.get('/api/workspace/graph', async (req, res) => {
    res.json(buildWorkspaceGraphPayload());
});

app.get('/api/workspace/lanes', async (req, res) => {
    const artifacts = readWorkspaceArtifacts();
    const graphPayload = buildWorkspaceGraphPayload();
    res.json({
        generated_at: new Date().toISOString(),
        lanes: buildWorkspaceLanePayload(graphPayload, artifacts.missionBindings),
    });
});

app.get('/api/workspace/runtimes', async (req, res) => {
    const graphPayload = buildWorkspaceGraphPayload();
    res.json({
        generated_at: new Date().toISOString(),
        runtimes: graphPayload.nodes.filter((node) => node.node_origin === 'system_owned'),
    });
});

app.get('/api/workspace/connectors', async (req, res) => {
    const graphPayload = buildWorkspaceGraphPayload();
    res.json({
        generated_at: new Date().toISOString(),
        connectors: graphPayload.nodes.filter((node) => node.node_origin === 'external' || node.node_origin === 'observed'),
    });
});

app.get('/api/workspace/missions', async (req, res) => {
    const artifacts = readWorkspaceArtifacts();
    const graphPayload = buildWorkspaceGraphPayload();
    res.json(buildWorkspaceMissionPayload(graphPayload, artifacts.missionBindings));
});

app.post('/api/workspace/missions', async (req, res) => {
    const payload = req.body || {};
    const requestedMission = {
        mission_request_id: `mission_${Date.now()}`,
        title: payload.title || payload.intent || 'Untitled mission',
        intent: payload.intent || 'general',
        preferred_mode: payload.preferred_mode || 'mission_mode',
        requested_nodes: Array.isArray(payload.requested_nodes) ? payload.requested_nodes : [],
        created_at: new Date().toISOString(),
        status: 'queued',
    };
    workspaceMissionRequests.unshift(requestedMission);
    workspaceSessionState.mode = requestedMission.preferred_mode;
    res.status(201).json(requestedMission);
});

app.get('/api/workspace/missions/:id', async (req, res) => {
    const artifacts = readWorkspaceArtifacts();
    const mission = (artifacts.missionBindings.bindings || {})[req.params.id] || workspaceMissionRequests.find((item) => item.mission_request_id === req.params.id);
    if (!mission) {
        res.status(404).json({ status: 'missing', detail: 'Mission was not found.' });
        return;
    }
    res.json(mission);
});

app.post('/api/workspace/chat/route', async (req, res) => {
    const payload = req.body || {};
    const route = await buildWorkspaceRouteResponse(payload.message || '');
    chatMessages.push({
        message: payload.message || '',
        sender: 'user',
        timestamp: payload.timestamp || new Date().toISOString(),
    });
    chatMessages.push({
        message: route.reply,
        sender: 'bot',
        timestamp: new Date().toISOString(),
    });
    autonomyRuntime.tick('workspace.chat.route');
    res.json(route);
});

app.post('/api/workspace/runtime-secrets/telegram-bot-token', async (req, res) => {
    const token = String(req.body?.token || '').trim();
    const discover = Boolean(req.body?.discover_targets ?? true);

    if (!token) {
        res.status(400).json({
            status: 'invalid',
            detail: 'Missing token.',
        });
        return;
    }

    process.env.TELEGRAM_BOT_TOKEN = token;
    const masked = maskSecret(token);
    const probe = runTelegramBotTool(['probe', '--token-env', 'TELEGRAM_BOT_TOKEN'], {
        TELEGRAM_BOT_TOKEN: token,
    });

    let discoverResult = null;
    if (probe.ok && discover) {
        discoverResult = runTelegramBotTool(['discover-targets', '--token-env', 'TELEGRAM_BOT_TOKEN'], {
            TELEGRAM_BOT_TOKEN: token,
        });
    }

    runtimeSecretStatus.telegram_bot_token = {
        present: true,
        source: 'workspace_ui_runtime_env',
        masked,
        updated_at: new Date().toISOString(),
        validation: probe.ok
            ? {
                  status: 'proven',
                  bot_username: probe.payload?.bot_identity?.username || null,
                  discover_status: discoverResult?.ok ? 'completed' : discover ? 'failed_or_empty' : 'skipped',
                  target_count: discoverResult?.payload?.counts?.total ?? null,
                  proven_target_count: discoverResult?.payload?.counts?.proven ?? null,
              }
            : {
                  status: 'failed',
                  detail: probe.stderr,
              },
    };
    writeProjectStateSummary({
        current_focus: 'Telegram sovereign node closure',
        latest_summary: probe.ok
            ? `Workspace UI token intake validated ${runtimeSecretStatus.telegram_bot_token.validation?.bot_username || 'Telegram bot'} and updated runtime secret state.`
            : `Workspace UI token intake failed: ${probe.stderr}`,
        telegram_node: {
            token_lifecycle_state: probe.ok ? 'token_synced' : 'awaiting_readback',
            lane_state: probe.ok ? 'operational' : 'degraded',
            active_lane: 'bot_api_lane',
            last_secret_source: 'workspace_ui_runtime_env',
            last_secret_masked: masked,
        },
    });

    if (!probe.ok) {
        res.status(400).json({
            status: 'probe_failed',
            secret: runtimeSecretStatus.telegram_bot_token,
            detail: probe.stderr,
        });
        return;
    }

    res.json({
        status: 'ok',
        secret: runtimeSecretStatus.telegram_bot_token,
        probe: probe.payload,
        discover: discoverResult?.payload || null,
    });
});

app.post('/api/workspace/runtime-connectors/telegram-bot-api', async (req, res) => {
    const baseUrl = String(req.body?.base_url || '').trim();
    const probe = Boolean(req.body?.probe ?? false);
    const discoverTargets = Boolean(req.body?.discover_targets ?? false);

    if (!baseUrl) {
        res.status(400).json({
            status: 'invalid',
            detail: 'Missing base_url.',
        });
        return;
    }

    process.env.TELEGRAM_BOT_API_BASE_URL = baseUrl;
    const result = runTelegramConnectorTool(
        [
            'configure-bot-api',
            '--base-url',
            baseUrl,
            ...(probe ? ['--probe'] : []),
            ...(discoverTargets ? ['--discover-targets'] : []),
        ],
        {
            TELEGRAM_BOT_API_BASE_URL: baseUrl,
        },
    );

    runtimeSecretStatus.telegram_bot_api = {
        present: true,
        source: 'workspace_ui_connector',
        base_url: baseUrl,
        updated_at: new Date().toISOString(),
        validation: result.ok
            ? {
                  status: 'configured',
                  server_mode: result.payload?.server_mode || result.payload?.connector_contract?.bot_api_server?.mode || 'unknown',
                  probe_status: result.payload?.probe?.ok ? 'proven' : probe ? 'failed' : 'skipped',
                  discover_status: result.payload?.discover_targets?.ok ? 'completed' : discoverTargets ? 'failed' : 'skipped',
              }
            : {
                  status: 'failed',
                  detail: result.stderr,
              },
    };
    writeProjectStateSummary({
        current_focus: 'Telegram sovereign node closure',
        latest_summary: result.ok
            ? `Workspace UI configured Telegram Bot API connector at ${baseUrl}.`
            : `Workspace UI Telegram Bot API connector update failed: ${result.stderr}`,
        telegram_node: {
            lane_state: result.ok ? 'monitoring' : 'degraded',
            active_lane: 'bot_api_lane',
            bot_api_base_url: baseUrl,
            bot_api_mode: result.payload?.server_mode || 'unknown',
        },
    });

    if (!result.ok) {
        res.status(400).json({
            status: 'connector_failed',
            connector: runtimeSecretStatus.telegram_bot_api,
            detail: result.stderr,
        });
        return;
    }

    res.json({
        status: 'configured',
        connector: runtimeSecretStatus.telegram_bot_api,
        contract: result.payload?.connector_contract || null,
        probe: result.payload?.probe || null,
        discover_targets: result.payload?.discover_targets || null,
    });
});

app.post('/api/workspace/runtime-connectors/telegram-node', async (req, res) => {
    const task = req.body || {};
    const action = String(task.action || 'status').trim().toLowerCase();
    const result = runTelegramNodeConnectorAction({ ...task, action });

    if (!result.ok) {
        writeProjectStateSummary({
            current_focus: 'Telegram sovereign node closure',
            latest_summary: `Telegram node dispatch failed for action=${action}.`,
            telegram_node: {
                lane_state: 'degraded',
                active_lane: 'bot_api_lane',
                last_dispatch_action: action,
                last_dispatch_status: 'failed',
            },
        });
        res.status(400).json({
            status: 'connector_failed',
            action,
            detail: result.stderr,
        });
        return;
    }

    writeProjectStateSummary({
        current_focus: 'Telegram sovereign node closure',
        latest_summary: `Telegram node dispatch completed for action=${action}.`,
        telegram_node: {
            lane_state: result.payload?.status === 'ok' || result.payload?.status === 'completed' ? 'operational' : 'monitoring',
            active_lane: 'bot_api_lane',
            last_dispatch_action: action,
            last_dispatch_status: result.payload?.status || 'ok',
            last_dispatch_proof: result.payload?.proof || result.payload?.payload || null,
        },
    });

    res.json({
        status: 'ok',
        action,
        payload: result.payload,
    });
});

app.post('/api/workspace/runtime-connectors/telegram-botfather/readback', async (req, res) => {
    const imagePath = String(req.body?.image_path || '').trim();
    const timeoutSeconds = Number(req.body?.timeout_seconds || 30);
    const result = runTelegramConnectorTool(
        [
            'botfather-readback',
            ...(imagePath ? ['--image-path', imagePath] : []),
            '--timeout-seconds',
            String(timeoutSeconds),
        ],
        {},
    );

    if (!result.ok) {
        res.status(400).json({
            status: 'readback_failed',
            detail: result.stderr,
        });
        return;
    }

    const readback = result.payload?.readback || null;
    const matchedToken = Array.isArray(readback?.matches) && readback.matches.length > 0 ? String(readback.matches[0]) : null;
    let tokenSync = null;

    if (matchedToken) {
        process.env.TELEGRAM_BOT_TOKEN = matchedToken;
        const probe = runTelegramBotTool(['probe', '--token-env', 'TELEGRAM_BOT_TOKEN'], {
            TELEGRAM_BOT_TOKEN: matchedToken,
            TELEGRAM_BOT_API_BASE_URL: process.env.TELEGRAM_BOT_API_BASE_URL || 'https://api.telegram.org',
        });
        let discoverResult = null;
        if (probe.ok) {
            discoverResult = runTelegramBotTool(['discover-targets', '--token-env', 'TELEGRAM_BOT_TOKEN'], {
                TELEGRAM_BOT_TOKEN: matchedToken,
                TELEGRAM_BOT_API_BASE_URL: process.env.TELEGRAM_BOT_API_BASE_URL || 'https://api.telegram.org',
            });
        }
        runtimeSecretStatus.telegram_bot_token = {
            present: true,
            source: 'botfather_readback',
            masked: maskSecret(matchedToken),
            updated_at: new Date().toISOString(),
            validation: probe.ok
                ? {
                      status: 'proven',
                      bot_username: probe.payload?.bot_identity?.username || null,
                      discover_status: discoverResult?.ok ? 'completed' : 'failed_or_empty',
                      target_count: discoverResult?.payload?.counts?.total ?? null,
                      proven_target_count: discoverResult?.payload?.counts?.proven ?? null,
                  }
                : {
                      status: 'failed',
                      detail: probe.stderr,
                  },
        };
        tokenSync = {
            status: probe.ok ? 'token_synced' : 'token_detected_probe_failed',
            secret: runtimeSecretStatus.telegram_bot_token,
            discover_targets: discoverResult?.payload || null,
        };
        writeProjectStateSummary({
            current_focus: 'Telegram sovereign node closure',
            latest_summary: probe.ok
                ? `BotFather readback synced a verified Telegram bot token for ${runtimeSecretStatus.telegram_bot_token.validation?.bot_username || 'the current bot lane'}.`
                : `BotFather readback detected a token but verification failed: ${probe.stderr}`,
            telegram_node: {
                token_lifecycle_state: probe.ok ? 'token_synced' : 'token_detected_probe_failed',
                lane_state: probe.ok ? 'operational' : 'degraded',
                active_lane: 'bot_api_lane',
                last_readback_status: result.payload?.readback?.status || 'unproven',
                last_readback_matches: result.payload?.readback?.matches || [],
                last_capture_path: result.payload?.readback?.image_path || result.payload?.capture?.capture_result?.artifact_path || null,
                last_secret_source: 'botfather_readback',
                last_secret_masked: maskSecret(matchedToken),
            },
        });
    } else {
        writeProjectStateSummary({
            current_focus: 'Telegram sovereign node closure',
            latest_summary: 'BotFather readback did not surface a token; node remains awaiting readback.',
            telegram_node: {
                token_lifecycle_state: 'awaiting_readback',
                lane_state: 'monitoring',
                active_lane: 'botfather_lifecycle_lane',
                last_readback_status: result.payload?.readback?.status || 'unproven',
                last_readback_matches: result.payload?.readback?.matches || [],
                last_capture_path: result.payload?.readback?.image_path || result.payload?.capture?.capture_result?.artifact_path || null,
                last_secret_source: 'botfather_readback',
            },
        });
    }

    res.json({
        status: matchedToken ? 'token_detected' : 'awaiting_readback',
        readback,
        token_sync: tokenSync,
        contract: result.payload?.contract || null,
    });
});

app.get('/api/workspace/proof', async (req, res) => {
    const runtimeCapabilities = await buildRuntimeCapabilities();
    const artifacts = readWorkspaceArtifacts();
    const graphPayload = buildWorkspaceGraphPayload();
    res.json(buildWorkspaceProofPayload(graphPayload, artifacts, runtimeCapabilities));
});

app.get('/api/workspace/providers', async (req, res) => {
    const artifacts = readWorkspaceArtifacts();
    const graphPayload = buildWorkspaceGraphPayload();
    res.json(buildWorkspaceProviderPayload(graphPayload, artifacts));
});

app.get('/api/autonomy/policy', async (req, res) => {
    const capabilities = await buildRuntimeCapabilities();
    const policyPayload = capabilities.autonomy_policy || readManifestPolicy();
    if (!policyPayload) {
        res.status(404).json({
            status: 'missing',
            detail: 'Autonomy policy manifest is not available yet.',
        });
        return;
    }

    res.json(policyPayload);
});
app.post('/api/runtime/reconcile', async (req, res) => {
    res.json(await ensureManagedRuntimeRecovery(req.body?.reason || 'runtime-reconcile-endpoint'));
});
app.get('/api/autonomy/status', (req, res) => {
    res.json(autonomyRuntime.getStatus());
});
app.get('/api/autonomy/objectives', (req, res) => {
    res.json(autonomyRuntime.getObjectives());
});
app.get('/api/autonomy/executions', (req, res) => {
    res.json(autonomyRuntime.getExecutions());
});
app.get('/api/autonomy/probes', (req, res) => {
    res.json(autonomyRuntime.getProbeSummary());
});
app.get('/api/autonomy/decisions', (req, res) => {
    res.json(autonomyRuntime.getDecisions());
});
app.get('/api/autonomy/snapshots', (req, res) => {
    res.json(autonomyRuntime.getObjectiveSnapshots());
});
app.post('/api/autonomy/start', (req, res) => {
    res.json({
        status: 'active',
        autonomy: autonomyRuntime.start(),
    });
});
app.post('/api/autonomy/stop', (req, res) => {
    res.json({
        status: 'stopped',
        autonomy: autonomyRuntime.stop(),
    });
});
app.post('/api/autonomy/heartbeat', (req, res) => {
    res.json({
        status: 'accepted',
        autonomy: autonomyRuntime.updateHeartbeat(req.body || {}),
    });
});
app.post('/api/autonomy/objectives', (req, res) => {
    const objective = autonomyRuntime.addObjective(req.body || {});
    res.status(201).json({
        status: 'created',
        objective,
    });
});
app.post('/api/autonomy/tick', (req, res) => {
    const payload = req.body || {};
    autonomyRuntime.runCycle(payload.source || 'manual')
        .then((result) => res.json(result))
        .catch((error) => {
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : String(error),
            });
        });
});
app.post('/api/users', (req, res) => {
    const payload = req.body || {};
    res.status(201).json({
        id: payload.id || `user_${Date.now()}`,
        name: payload.name || 'HyperAI User',
        email: payload.email || 'creator@hyperai.local',
        preferences: payload.preferences || {},
    });
});
app.get('/api/users/current', (req, res) => {
    res.json(operatorProfile);
});
app.put('/api/users/current', (req, res) => {
    const payload = req.body || {};
    operatorProfile.name = payload.name || payload.username || operatorProfile.name;
    operatorProfile.email = payload.email || operatorProfile.email;
    operatorProfile.preferences =
        typeof payload.preferences === 'object' && payload.preferences !== null
            ? { ...operatorProfile.preferences, ...payload.preferences }
            : operatorProfile.preferences;
    autonomyRuntime.tick('user.current.update');
    res.json(operatorProfile);
});
app.get('/api/users/:id', (req, res) => {
    res.json({
        id: req.params.id,
        name: operatorProfile.name,
        email: operatorProfile.email,
        preferences: operatorProfile.preferences,
    });
});
app.put('/api/users/:id', (req, res) => {
    const payload = req.body || {};
    res.json({
        id: req.params.id,
        name: payload.name || operatorProfile.name,
        email: payload.email || operatorProfile.email,
        preferences: payload.preferences || operatorProfile.preferences,
    });
});
app.delete('/api/users/:id', (req, res) => {
    res.status(204).send();
});
app.get('/api/empathy/status', (req, res) => {
    const autonomyStatus = autonomyRuntime.getStatus();
    res.json({
        status: autonomyStatus.active ? 'active' : 'standby',
        empathy_score: autonomyStatus.active ? 72 : 48,
        empathyScore: autonomyStatus.active ? 72 : 48,
        timestamp: new Date().toISOString(),
    });
});
app.get('/api/empathy/analytics', (req, res) => {
    const now = Date.now();
    res.json(
        Array.from({ length: 6 }, (_, index) => ({
            timestamp: new Date(now - (5 - index) * 60_000).toISOString(),
            value: 45 + index * 5,
        })),
    );
});
app.post('/api/empathy/process', (req, res) => {
    const { message = '', frequency = 269, cultural_mode = 'vietnamese' } = req.body || {};
    autonomyRuntime.tick('empathy.process');
    res.json({
        empathy_score: Math.min(100, 50 + String(message).length),
        frequency,
        cultural_mode,
        original_message: message,
        processed_message: `Empathy runtime processed ${String(message).slice(0, 120)}`,
        cultural_bridge: cultural_mode === 'vietnamese' ? 'strong' : 'adaptive',
        ca_dao_wisdom: 'Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau.',
        symphony_resonance: autonomyRuntime.getStatus().active ? 'high' : 'recovering',
        processing_time_ms: 35,
        status: 'success',
    });
});
app.post('/api/vietnamese/analyze', (req, res) => {
    const {
        text = '',
        analysis_type = 'full',
        include_cultural_context = true,
        include_traditional_wisdom = true,
    } = req.body || {};
    const words = String(text).split(/\s+/).filter(Boolean);
    autonomyRuntime.tick('vietnamese.analyze');
    res.json({
        originalText: text,
        original_text: text,
        analysisType: analysis_type,
        analysis_type,
        wordSegmentation: words,
        word_segmentation: words,
        posTags: words.map(() => 'N'),
        pos_tags: words.map(() => 'N'),
        sentimentScore: text ? 0.82 : 0,
        sentiment_score: text ? 0.82 : 0,
        culturalElements: include_cultural_context ? ['quan ho', 'ca dao'] : [],
        cultural_elements: include_cultural_context ? ['quan ho', 'ca dao'] : [],
        traditionalWisdom: include_traditional_wisdom
            ? 'Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau.'
            : '',
        traditional_wisdom: include_traditional_wisdom
            ? 'Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau.'
            : '',
        respect_level: 'high',
        regional_influence: 'north',
        business_context: 'relationship-first',
        processing_time_ms: 42,
        status: 'success',
    });
});
app.post('/api/vietnamese/generate', (req, res) => {
    const {
        prompt = '',
        cultural_style = 'traditional',
        empathy_level = 'high',
        target_audience = 'enterprise',
    } = req.body || {};
    autonomyRuntime.tick('vietnamese.generate');
    res.json({
        prompt,
        culturalStyle: cultural_style,
        empathyLevel: empathy_level,
        targetAudience: target_audience,
        content: `Generated Vietnamese cultural content for: ${prompt}`,
        generated_content: `Generated Vietnamese cultural content for: ${prompt}`,
        cultural_authenticity: 0.89,
        empathy_resonance: 'high',
        traditional_elements: ['ca dao', 'relationship-first'],
        status: 'success',
    });
});
app.get('/api/notebooklm/status', (req, res) => {
    res.json({
        status: 'stub-ready',
        notebooks: notebookRegistry.length,
        lane: 'notebooklm',
        requires_credentials: true,
    });
});
app.get('/api/notebooklm/notebooks', (req, res) => {
    res.json(notebookRegistry);
});
app.post('/api/notebooklm/notebooks', (req, res) => {
    const payload = req.body || {};
    const notebook = {
        id: `notebook_${Date.now()}`,
        title: payload.title || 'Untitled Notebook',
        description: payload.description || '',
    };
    notebookRegistry.push(notebook);
    autonomyRuntime.tick('notebooklm.create');
    res.status(201).json(notebook);
});
app.post('/api/notebooklm/notebooks/:notebookId/sources', (req, res) => {
    const payload = req.body || {};
    autonomyRuntime.tick('notebooklm.source.attach');
    res.status(201).json({
        notebookId: req.params.notebookId,
        source: {
            uri: payload.uri || null,
            text: payload.text || null,
            title: payload.title || 'Untitled Source',
        },
        status: 'attached',
    });
});
app.get('/api/chat/messages', (req, res) => {
    res.json(chatMessages);
});
app.post('/api/chat/messages', (req, res) => {
    const payload = req.body || {};
    const incomingMessage = {
        message: payload.message || '',
        sender: payload.sender || 'user',
        timestamp: payload.timestamp || new Date().toISOString(),
    };
    chatMessages.push(incomingMessage);

    let replyText = 'Runtime-backed chat captured your message.';
    const normalized = String(payload.message || '').trim().toLowerCase();
    if (normalized.includes('status')) {
        replyText = `Autonomy mode is ${autonomyRuntime.getStatus().mode}.`;
    } else if (normalized.includes('objective')) {
        const currentObjective = autonomyRuntime.getStatus().currentObjective;
        replyText = currentObjective
            ? `Current objective: ${currentObjective.title}.`
            : 'No active objective is registered.';
    } else if (normalized.includes('heartbeat')) {
        replyText = `Last heartbeat: ${autonomyRuntime.getStatus().heartbeat.status}.`;
    } else if (normalized.includes('github') || normalized.startsWith('gh ')) {
        const github = getGithubSurfaceStatus();
        replyText = `GitHub surface is ${github.status}; gh ${github.gh_cli}, git ${github.git_worktree}, workflows ${github.workflow_count}, boundary ${github.boundary_state || 'unknown'}.`;
    }

    autonomyRuntime.tick('chat.message');
    const reply = {
        message: replyText,
        sender: 'bot',
        timestamp: new Date().toISOString(),
    };
    chatMessages.push(reply);
    res.json(reply);
});
app.get('/api/symphony/status', (req, res) => {
    const autonomyStatus = autonomyRuntime.getStatus();
    res.json({
        status: autonomyStatus.active ? 'active' : 'stopped',
        frequency: symphonyRuntimeState.frequency,
        uptime: `${Math.max(1, Math.floor((Date.now() - bootTimestamp) / 1000))}s`,
        empathy_circulation: autonomyStatus.active ? 'active' : 'standby',
        active_agents: 1,
        ca_dao_broadcasts: autonomyStatus.metrics.ticks,
        factory_metrics: {
            coherence: autonomyStatus.active ? 1 : 0.72,
            throughput: autonomyStatus.metrics.ticks,
        },
        autonomy: autonomyStatus,
    });
});
app.post('/api/symphony/frequency', (req, res) => {
    const nextFrequency = Number(req.body?.frequency);
    if (!Number.isFinite(nextFrequency) || nextFrequency < 100 || nextFrequency > 1000) {
        res.status(400).json({
            status: 'error',
            message: 'Frequency must be a finite number between 100 and 1000.',
        });
        return;
    }

    symphonyRuntimeState.frequency = nextFrequency;
    autonomyRuntime.tick('symphony.frequency.update');
    const autonomyStatus = autonomyRuntime.getStatus();
    res.json({
        status: autonomyStatus.active ? 'active' : 'stopped',
        frequency: symphonyRuntimeState.frequency,
        uptime: `${Math.max(1, Math.floor((Date.now() - bootTimestamp) / 1000))}s`,
        empathy_circulation: autonomyStatus.active ? 'active' : 'standby',
        active_agents: 1,
        ca_dao_broadcasts: autonomyStatus.metrics.ticks,
        factory_metrics: {
            coherence: autonomyStatus.active ? 1 : 0.72,
            throughput: autonomyStatus.metrics.ticks,
        },
        autonomy: autonomyStatus,
    });
});
app.post('/api/symphony/start', (req, res) => {
    autonomyRuntime.start();
    res.json({ status: 'active', message: 'Symphony started successfully' });
});
app.post('/api/symphony/stop', (req, res) => {
    autonomyRuntime.stop();
    res.json({ status: 'stopped', message: 'Symphony stopped successfully' });
});

const toHaiosLabel = (boundaryState) => {
    switch (boundaryState) {
        case 'autonomous':
            return 'Autonomous';
        case 'operational':
            return 'Operational';
        case 'recoverable':
            return 'Recoverable';
        default:
            return 'Dormant';
    }
};

app.get('/api/runtime/state', async (req, res) => {
    const status = autonomyRuntime.getStatus();
    const capabilities = await buildRuntimeCapabilities();
    const classification = toHaiosLabel(capabilities.boundary_state);
    const proof = {
        heartbeat: status.heartbeat,
        lastAction: status.lastAction,
        metrics: status.metrics,
        latestProbeSummary: autonomyRuntime.getProbeSummary(),
        runtimeRecovery: capabilities.runtime_recovery,
        runtimeAuthority: capabilities.runtime_authority,
    };

    res.json({
        classification,
        message: `HAIOS boundary is ${classification.toLowerCase()} for the HyperAI cockpit.`,
        classificationReason: capabilities.boundary_reason,
        status,
        proof,
    });
});

app.get('/api/runtime/ecosystem', async (req, res) => {
    const omegaSummary = getOmegaSystemSummary();
    const emergencyBridge = getEmergencyBridgeStatus();
    const github = getGithubSurfaceStatus();
    const [ollama, aidev] = await Promise.all([
        getOllamaStatus(),
        getAidevRuntimeStatus(),
    ]);

    res.json({
        status: 'ok',
        generated_at: new Date().toISOString(),
        surfaces: {
            omega_system: omegaSummary,
            emergency_bridge: emergencyBridge,
            github,
            ollama,
            aidev,
        },
    });
});

io.on('connection', (socket) => {
    console.log('>>> [COCKPIT] Operator connected:', socket.id);
    socket.on('message', (data) => {
        console.log('>>> [SIGNAL] Received:', data);
        socket.emit('response', { text: 'APO Core received your signal.', timestamp: new Date() });
    });
});

const PORT = Number(process.env.PORT || 5000);
autonomyRuntime.configure({
    probeRunner: async ({ source } = {}) => {
        await ensureManagedRuntimeRecovery(`autonomy-probe:${source || 'manual'}`);
        const baseUrl = `http://127.0.0.1:${PORT}`;
        const probes = await Promise.all([
            executeJsonProbe('health', `${baseUrl}/api/health`),
            executeJsonProbe('runtime-capabilities', `${baseUrl}/api/runtime/capabilities`),
            executeJsonProbe('symphony-status', `${baseUrl}/api/symphony/status`),
            executeJsonProbe('empathy-status', `${baseUrl}/api/empathy/status`),
            executeJsonProbe('vietnamese-analyze', `${baseUrl}/api/vietnamese/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'Xin chao HyperAI',
                    analysis_type: 'full',
                    include_cultural_context: true,
                    include_traditional_wisdom: true,
                }),
            }),
            executeJsonProbe('notebooklm-status', `${baseUrl}/api/notebooklm/status`),
        ]);

        return {
            source: source || 'manual',
            checkedAt: new Date().toISOString(),
            overallStatus: resolveProbeState(probes),
            probes,
        };
    },
    recoveryRunner: async ({ source, status } = {}) => {
        const decisions = [];

        if (!operatorProfile.name || !operatorProfile.email) {
            Object.assign(operatorProfile, restoreOperatorProfile());
            decisions.push({
                action: 'restore-operator-profile',
                detail: 'Recovered the operator profile to a safe local-first default contract.',
            });
        }

        if (!Array.isArray(chatMessages) || chatMessages.length === 0) {
            chatMessages.push({
                message: 'HyperAI cockpit channel re-seeded by autonomy recovery.',
                sender: 'bot',
                timestamp: new Date().toISOString(),
            });
            decisions.push({
                action: 'reseed-chat-history',
                detail: 'Rebuilt the runtime-backed chat seed after an empty history was detected.',
            });
        }

        if (!Array.isArray(notebookRegistry) || notebookRegistry.length === 0) {
            notebookRegistry.push({
                id: 'notebook_default',
                title: 'HyperAI Knowledge Notebook',
                description: 'Default notebook runtime surface',
            });
            decisions.push({
                action: 'restore-notebook-registry',
                detail: 'Re-seeded the notebook registry so local-first execution keeps a valid default notebook surface.',
            });
        }

        const runtimeRecovery = await ensureManagedRuntimeRecovery(
            `autonomy-recovery:${source || 'manual'}:${status || 'unknown'}`
        );
        decisions.push({
            action: runtimeRecovery.selectedAction || 'inspect-runtime-authority',
            detail: runtimeRecovery.reason,
        });

        return decisions;
    },
});
server.listen(PORT, () => {
    void ensureManagedRuntimeRecovery('backend-bootstrap');
    autonomyRuntime.start();
    void autonomyRuntime.runCycle('bootstrap');
    setInterval(() => {
        void ensureManagedRuntimeRecovery('backend-reconcile-loop');
    }, MANAGED_RUNTIME_RECONCILE_INTERVAL_MS);
    console.log(`>>> [SERVER] Core listening on port ${PORT}`);
});
