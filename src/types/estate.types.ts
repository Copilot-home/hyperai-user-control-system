export interface EstateCheckMap {
    [key: string]: boolean;
}

export interface EstateItemState {
    id: string;
    truth_state: string;
}

export interface EstateNode extends EstateItemState {
    type: string;
    reachable: boolean;
    verified: boolean;
    persistent: boolean;
    runtimes: string[];
    optional: boolean;
}

export interface EstateService extends EstateItemState {
    type?: string;
    healthy: boolean;
    persistent: boolean;
}

export interface EstateMemory extends EstateItemState {
    identity_verified: boolean;
    read_verified: boolean;
    write_verified: boolean;
    replicated: boolean;
}

export interface EstateSummary {
    generated_at: string;
    estate_generated_at: string | null;
    decision: 'CANONICAL' | 'HOLD';
    why: string;
    risk: string;
    outcome: string;
    state_change: string;
    canonical_state: {
        canonical?: boolean;
        truth_state?: string;
        run_id?: string;
        unresolved?: unknown[];
        validation_errors?: string[];
    };
    audit: {
        outcome: string;
        truth_state: string;
        checked_at: string | null;
        checks: EstateCheckMap;
    };
    counts: {
        models: number;
        canonical_models: number;
        ineligible_models: number;
        services: number;
        routes: number;
        health_targets: number;
        nodes: number;
        memory_systems: number;
        evidence_entries: number;
    };
    nodes: EstateNode[];
    runtimes: EstateService[];
    services: EstateService[];
    memory: EstateMemory[];
    excluded_models: Array<EstateItemState & { reason: string }>;
    unhealthy_targets: Array<{ target: string; status: string; error: string | null }>;
}
