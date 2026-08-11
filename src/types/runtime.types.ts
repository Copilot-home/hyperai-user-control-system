export interface RuntimeLane {
    id: string;
    label: string;
    mode: 'live' | 'degraded' | 'local-only' | 'disabled';
    status: string;
    evidence: string;
    endpoint?: string;
}

export interface RuntimeEcosystemEvidence {
    path: string;
    status: 'present' | 'missing';
    updatedAt?: string;
}

export interface RuntimeEcosystemEntry {
    id: string;
    label: string;
    path: string;
    status: 'active' | 'present' | 'missing' | 'unknown';
    lastSeenAt?: string | null;
    evidence?: RuntimeEcosystemEvidence[];
}

export interface CreatorTraceProtocolNode {
    id: string;
    status: 'validated' | 'bounded' | 'blocked';
    evidence: string;
}

export interface CreatorTraceProtocolProjection {
    protocol_id: string;
    status: string;
    source_path?: string;
    generated_at?: string;
    baseline: {
        D0: number;
        velocity: number;
        k_domain: number[];
        total_cost: number;
        total_complexity_delta: number;
        valid_transitions: number;
        total_transitions: number;
        R_conv: number;
        eta_cost: number;
        C_delta_D: number;
    };
    weighting_rule?: {
        runtime_query?: string;
        priority_order?: string[];
    };
    safety_invariant?: {
        safe_cu?: string;
        context_correct?: string;
        max_k?: number;
    };
    trust_path?: string[];
    convergence?: {
        D0: number;
        velocity: number;
        max_k: number;
        R_conv: number;
        equation: string;
        monotonic_non_increasing: boolean;
    };
    cost_model?: {
        eta_cost: number;
        C_delta_D: number;
        invariant: number;
        expected_total_cost: number;
        invariant_holds: boolean;
    };
    context_soundness?: {
        status: 'validated' | 'bounded' | 'blocked';
        managers_selected_in_valid_scope: boolean;
        teardown_guarded: boolean;
        manifest_policy_contradiction: boolean;
        runtime_weighting: string;
    };
    path_witness?: CreatorTraceProtocolNode[];
}

export interface AppBuildRuntimeSurface {
    id: string;
    rootIdentity: string;
    runtimeClass:
        | 'web'
        | 'mobile-rn'
        | 'ios-native'
        | 'mcp-bridge'
        | 'model-gateway'
        | 'model-substrate'
        | 'operator-ide';
    laneClass: string;
    currentState: string;
    authorityScore: number;
    processProof?: Record<string, unknown> | null;
    httpProof?: Record<string, unknown> | null;
    registryMatch?: string;
    safeState: string;
    proofRefs: string[];
    blockers: string[];
    allowedActions: string[];
}

export interface ModelBindingSurface {
    model: string;
    substrate: 'ollama' | 'quantumreason' | 'remote-provider' | 'unknown';
    locality: 'local' | 'cloud' | 'hybrid' | 'unknown';
    providerFacade: string;
    taskClasses: string[];
    inventoryState: 'live' | 'stale' | 'missing';
    inferenceProofState: 'proven' | 'unproven' | 'failed' | 'gateway_auth_blocked';
    publisherLabel?: string;
    capabilityClaimSource?: string;
    publisherBiasRisk: number;
    routeScore: number;
    allowedUse: string[];
}

export interface ModelFacadeState {
    default_provider_facade: string;
    default_route_state: string;
    allowed_default_binding: string;
    direct_provider_binding: string;
    gateway_candidate: string;
    substrate: string;
    blockers: string[];
}

export interface AppBuildRuntimeRegistry {
    schema_version: string;
    generated_at: string;
    source_path?: string;
    orchestration_mode: string;
    agent_chain_status: string;
    packet: string;
    target_state: string;
    summary: Record<string, string | number | boolean | null>;
    runtime_surfaces: AppBuildRuntimeSurface[];
    model_facade_state?: ModelFacadeState;
    model_bindings: ModelBindingSurface[];
    blockers: string[];
    next_actions?: string[];
    contradictions?: Array<{
        id: string;
        detail: string;
        resolution: string;
    }>;
}

export interface RuntimeCapabilitiesResponse {
    status: string;
    runtime_mode: string;
    boundary_state?: 'dormant' | 'recoverable' | 'operational' | 'autonomous' | 'sovereign';
    boundary_reason?: string;
    autonomous_core_ready?: boolean;
    requires_operator_relay?: boolean;
    core_boundary?: string[];
    non_core_lanes?: string[];
    degraded_lanes?: string[];
    generated_at: string;
    symphony_running: boolean;
    command_count: number;
    last_command: string | null;
    backend_classification?: string;
    frontend_classification?: string;
    selected_action?: string;
    state_transition?: string;
    authority_reason?: string;
    runtime_strategy?: string;
    safe_recovery_available?: boolean;
    routine_decisions?: string[];
    runtime_recovery?: {
        inspectedAt: string;
        currentPort: number;
        status: string;
        selectedAction: string;
        reason: string;
        launchStartedAt: string | null;
        lastHealthyAt: string | null;
        lastEvaluatedAt: string | null;
        lastError: string | null;
        managedRuntime: {
            backendUrl: string | null;
            frontendUrl: string | null;
            managed: boolean;
            checkedAt: string | null;
            healthy: boolean;
        } | null;
    };
    autonomy_policy?: AutonomyPolicyState | null;
    runtime_authority?: {
        backend_runtime: string;
        stale_process: boolean;
        process_started_at: string;
        file_modified_at: string;
        managed_runtime?: boolean;
        managed_backend_url?: string | null;
        managed_frontend_url?: string | null;
        operator_attention_required?: boolean;
        managed_runtime_health?: string;
        summary: string;
    };
    creator_trace_protocol?: CreatorTraceProtocolProjection;
    app_build_runtime_registry?: AppBuildRuntimeRegistry | null;
    model_facade_state?: ModelFacadeState | null;
    ecosystem_registry?: RuntimeEcosystemEntry[];
    lanes: RuntimeLane[];
}

export interface RuntimeAuthoritySummary {
    url?: string;
    port?: number;
    pid?: number;
    commandLine?: string;
}

export interface RuntimeRecoverySummary {
    status: string;
    selectedAction?: string;
    reason?: string;
    managedRuntime?: {
        managed?: boolean;
        backendUrl?: string | null;
        frontendUrl?: string | null;
    };
    launchStartedAt?: string | null;
    lastHealthyAt?: string | null;
    lastEvaluatedAt?: string | null;
    lastError?: string | null;
}

export interface ActiveRuntimeSummary {
    type: 'managed' | 'default';
    backend?: RuntimeAuthoritySummary | null;
    frontend?: RuntimeAuthoritySummary | null;
}

export interface RuntimeUrlSnapshot {
    backendUrl?: string | null;
    frontendUrl?: string | null;
}

export interface AutonomyProofEvent {
    at: string;
    source: string;
    type: string;
    detail: string;
}

export interface AutonomyPolicyState {
    status?: string;
    detail?: string;
    updated_at: string;
    daemon_pid?: number;
    cycle_number: number;
    selected_action: string;
    action_reason: string;
    backend_classification: string;
    frontend_classification: string;
    runtime_strategy: string;
    state_transition?: string;
    boundary_state?: HAIOSBoundaryState;
    boundary_reason?: string;
    haios_state?: string;
    haios_reason?: string;
    routine_decisions?: string[];
    safe_recovery_available?: boolean;
    core_ready?: boolean;
    requires_operator_relay?: boolean;
    active_runtime?: ActiveRuntimeSummary;
    runtime_authority?: RuntimeAuthoritySummary & { summary?: string };
    runtime_recovery?: RuntimeRecoverySummary;
    managed_runtime?: RuntimeUrlSnapshot;
    default_runtime?: RuntimeUrlSnapshot;
    manifest_version?: string | null;
    previous_cycle_number?: number;
    previous_daemon_pid?: number;
    policy_source?: string;
    fallback_triggered?: boolean;
    proof_events?: AutonomyProofEvent[];
}

export interface AutonomyHeartbeat {
    source: string;
    status: 'unknown' | 'healthy' | 'degraded' | 'critical';
    detail: string;
    at: string;
}

export interface AutonomyAction {
    type: string;
    detail: string;
    at: string;
}

export interface AutonomyDecision {
    action: string;
    detail: string;
    at: string;
    source?: string;
    status?: string;
}

export interface AutonomyObjective {
    id: string;
    title: string;
    priority: string;
    status: string;
    detail: string;
}

export interface AutonomyStatus {
    active: boolean;
    mode: 'standby' | 'autonomous' | 'stabilizing' | 'recovering';
    currentObjectiveId: string;
    lastAction: string;
    lastTickAt: string | null;
    heartbeat: AutonomyHeartbeat;
    metrics: {
        ticks: number;
        recoveredIncidents: number;
        blockedIncidents: number;
        probeCycles?: number;
        healthyProbeCycles?: number;
        degradedProbeCycles?: number;
        criticalProbeCycles?: number;
    };
    recentActions: AutonomyAction[];
    objectiveCount: number;
    currentObjective: AutonomyObjective | null;
    decisionCount?: number;
    latestDecisions?: AutonomyDecision[];
    latestProbeSummary?: {
        overallStatus: 'unknown' | 'healthy' | 'degraded' | 'critical';
        checkedAt: string | null;
        probes: Array<{
            id: string;
            status: 'healthy' | 'degraded' | 'critical';
            detail: string;
        }>;
    };
    executionCount?: number;
}

export interface AutonomyHeartbeatRequest {
    source: string;
    status: 'healthy' | 'degraded' | 'critical';
    detail: string;
}

export type HAIOSBoundaryState = 'dormant' | 'recoverable' | 'operational' | 'autonomous';

export interface BoundaryAutonomySnapshot {
    boundary: 'hyperai-user-control-system';
    state: HAIOSBoundaryState;
    localFirst: boolean;
    classificationReason: string;
    recoveryAction: 'none' | 'start-runtime' | 'tick-runtime' | 'mark-degraded' | 'mark-healthy' | 'reconcile-runtime';
    recoveryAttempts: number;
    lastEvaluatedAt: string;
    lastHealthyAt: string | null;
    runtimeMode: string | null;
    staleProcess: boolean;
}
