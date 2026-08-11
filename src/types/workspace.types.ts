export interface WorkspaceNodeProofState {
    exists: boolean;
    fresh: boolean;
    modified_at: string | null;
    age_seconds: number | null;
    summary: Record<string, unknown>;
}

export interface WorkspaceGraphNode {
    node_id: string;
    label: string;
    orchestrator_family: string;
    runtime_class: string;
    authority_class: string;
    node_origin: 'system_owned' | 'external' | 'observed';
    node_origin_reason?: string | null;
    status: string;
    current_maturity?: string | null;
    maturity_rationale?: string | null;
    connector_binding?: string | null;
    mission_capabilities: string[];
    reasoning_capability: string[];
    behavior_capability: string[];
    allowed_mission_roles: string[];
    forbidden_mission_roles: string[];
    dependencies: string[];
    proof_state: WorkspaceNodeProofState;
    root_identity: Record<string, unknown>;
    escalation_contract: Record<string, unknown>;
    destruction_or_retention_contract: string | null;
    worker_notice?: Record<string, unknown> | null;
}

export interface WorkspaceMissionBinding {
    mission_id: string;
    mission_root: string | null;
    mission_router: string | null;
    reasoning_delegates: string[];
    behavior_delegates: string[];
    approval_intake: string[];
    execution_adapter: string | null;
    evidence_recorder: string | null;
    observer_only: string[];
    lineage_only: string[];
    fallback_root: string | null;
    mode_hint?: string;
    phase_context?: Record<string, unknown>;
}

export interface WorkspaceLaneView {
    lane_id: string;
    label: string;
    family: string;
    runtime_class: string;
    node_origin: string;
    status: string;
    proof_state: WorkspaceNodeProofState;
    current_mission_role: string | null;
    direct_participant: boolean;
    available_actions: string[];
}

export interface WorkspaceSessionResponse {
    generated_at: string;
    shell: {
        status: string;
        boundary_state?: string;
        selected_action?: string;
        runtime_strategy?: string;
        authority?: Record<string, unknown>;
    };
    session: {
        mode: string;
        current_mission_id: string | null;
        last_route_at: string | null;
        last_route_summary: string | null;
    };
    project_state?: {
        workspace?: string;
        current_focus?: string;
        latest_summary?: string;
        last_updated?: string;
        telegram_node?: Record<string, unknown> | null;
        token_lifecycle_state?: string | null;
        lane_state?: string | null;
        last_proof?: Record<string, unknown> | null;
    } | null;
    autonomy: {
        mode: string;
        active: boolean;
        current_objective?: {
            title?: string;
            detail?: string;
        } | null;
        heartbeat?: {
            status?: string;
            detail?: string;
        } | null;
    };
    companion: {
        preferred_approval_surface?: Record<string, unknown> | null;
        active_creator_surfaces: Array<Record<string, unknown>>;
        fanout_policy?: Record<string, unknown> | null;
    };
    orchestration?: {
        mode: string;
        agent_chain_status: string;
        mission_id?: string | null;
        route_plan?: string | null;
        final_state?: string | null;
    };
    creator_law?: {
        status: string;
        error_score: number | null;
        claim_validity?: string | null;
    };
    telegram_mastery?: {
        status: string;
        telegram_error: number;
        current_variable?: string | null;
        current_packet?: string | null;
        blocking_factor?: string | null;
        success_condition?: string | null;
    };
    local_model_coordination?: {
        phase: string;
        handoff_rule: string;
        decision_authority: string;
        epistemic_policy?: Record<string, unknown> | null;
        bias_control?: Record<string, unknown> | null;
        router_model?: Record<string, unknown> | null;
        specialist_model?: Record<string, unknown> | null;
        verifier_model?: Record<string, unknown> | null;
        auditor_model?: Record<string, unknown> | null;
        telegram_executor?: Record<string, unknown> | null;
    };
    system_control?: {
        status: string;
        objective: string;
        focus_lane: string;
        control_surface: string;
        orchestration_mode: string;
        agent_chain_status: string;
        filtered_signals: Array<{
            label: string;
            value: string;
        }>;
        priority_actions: Array<{
            id: string;
            label: string;
            intent: string;
            tab: 'overview' | 'missions' | 'systems' | 'proof' | 'providers';
            reason: string;
        }>;
        credential_control?: {
            telegram_bot_token?: {
                present: boolean;
                source: string;
                masked?: string | null;
                updated_at?: string | null;
                validation?: Record<string, unknown> | null;
            };
        };
        connector_control?: {
            telegram_bot_api?: {
                present: boolean;
                source: string;
                base_url?: string | null;
                updated_at?: string | null;
                validation?: Record<string, unknown> | null;
            };
            telegram_node?: {
                connector_id: string;
                lane_state: string;
                active_lane: string;
                readback_engine_status: string;
                bot_registry?: {
                    total: number;
                    proven: number;
                    candidate: number;
                };
                last_proof?: {
                    kind: string;
                    status: string;
                    artifact_path?: string | null;
                    detail?: string | null;
                } | null;
            };
            botfather_lifecycle?: {
                active_lane: string;
                token_lifecycle_state: string;
                readback_mode: string;
                readback_engine_status: string;
                next_required_artifact: string;
                last_capture_path?: string | null;
                last_readback_status?: string | null;
                last_readback_matches?: string[];
            };
        };
    };
    intelligence?: {
        drift_status: string;
        drift_counts: Record<string, number>;
        maturity_level_counts: Record<string, number>;
        connector_count: number;
        cli_tool_count: number;
        raw_surface_count: number;
        meaningful_groups: number;
        noise_gap: number;
        creator_law_status: string;
        creator_law_error_score: number | null;
        telegram_mastery_status: string;
        telegram_error: number;
        current_packet?: string | null;
        local_coordination_phase: string;
    };
    current_phase?: Record<string, unknown>;
}

export interface WorkspaceGraphResponse {
    generated_at: string;
    orchestration_model: string;
    authority_model: string;
    nodes: WorkspaceGraphNode[];
    collisions: Array<Record<string, unknown>>;
    drift_summary?: {
        status: string;
        counts: Record<string, number>;
    };
    telegram_mastery_summary?: {
        status: string;
        telegram_error: number;
        current_variable?: string | null;
        current_packet?: string | null;
    };
    local_model_coordination?: {
        phase: string;
        handoff_rule: string;
        decision_authority: string;
    };
    orchestration_summary?: {
        mode: string;
        final_state: string;
        mission_id?: string | null;
    };
}

export interface WorkspaceLanesResponse {
    generated_at: string;
    lanes: WorkspaceLaneView[];
}

export interface WorkspaceMissionsResponse {
    generated_at: string;
    current_mission_id: string | null;
    bindings: WorkspaceMissionBinding[];
    requested_missions: Array<Record<string, unknown>>;
    available_roots: Array<{ node_id: string; label: string; family: string }>;
}

export interface WorkspaceProofResponse {
    generated_at: string;
    runtime_authority?: Record<string, unknown> | null;
    selected_action?: string | null;
    boundary_state?: string | null;
    collisions: Array<Record<string, unknown>>;
    drift_summary?: {
        status: string;
        counts: Record<string, number>;
        items: Array<Record<string, unknown>>;
    };
    orchestration?: {
        mode: string;
        agent_chain_status: string;
        mission_id?: string | null;
        final_state?: string | null;
    };
    connector_summary?: {
        connector_count: number;
        cli_tool_count: number;
        mcp_enabled_tools: string[];
        mcp_unconfigured_tools: string[];
    };
    telegram_mastery?: {
        status: string;
        telegram_error: number;
        current_variable?: string | null;
        current_packet?: string | null;
        blocking_factors: Array<Record<string, unknown>>;
    };
    local_model_coordination?: {
        phase: string;
        handoff_rule: string;
        decision_authority: string;
        epistemic_policy?: Record<string, unknown> | null;
        bias_control?: Record<string, unknown> | null;
        router_model?: Record<string, unknown> | null;
        specialist_model?: Record<string, unknown> | null;
        verifier_model?: Record<string, unknown> | null;
        auditor_model?: Record<string, unknown> | null;
        telegram_executor?: Record<string, unknown> | null;
    };
    proof_timeline: Array<{ id: string; label: string; status: string; detail: string }>;
    mission_roots: Array<{ node_id: string; status: string; proof: WorkspaceNodeProofState }>;
}

export interface WorkspaceProvidersResponse {
    generated_at: string;
    policy_mode: string;
    default_visibility: string;
    providers: Array<{
        node_id: string;
        label: string;
        status: string;
        runtime_class: string;
        node_origin: string;
        reasoning_capability: string[];
        behavior_capability: string[];
        proof_state: WorkspaceNodeProofState;
    }>;
    admin_surface: Record<string, unknown>;
}

export interface WorkspaceRouteResponse {
    generated_at: string;
    mode: string;
    mission_id: string;
    mission_binding: WorkspaceMissionBinding | null;
    selected_nodes: WorkspaceGraphNode[];
    synthesis: {
        enabled: boolean;
        strategy: string;
        summary: string;
    };
    proof: {
        boundary_state: string;
        selected_action: string;
        safe_recovery_available: boolean;
    };
    suggested_actions: string[];
    reply: string;
    mission_catalog: WorkspaceMissionBinding[];
}
