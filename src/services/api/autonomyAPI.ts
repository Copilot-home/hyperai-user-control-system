import axios from 'axios';
import { getApiBaseUrl } from '../runtimeConfig';
import {
    AutonomyDecision,
    AutonomyHeartbeatRequest,
    AutonomyObjective,
    AutonomyPolicyState,
    AutonomyStatus,
    RuntimeStateResponse,
} from '../../types/runtime.types';

const fallbackObjectives: AutonomyObjective[] = [
    {
        id: 'preserve-communication',
        title: 'Preserve communication bridge',
        priority: 'critical',
        status: 'in_progress',
        detail: 'Keep backend, browser, and orchestration surfaces reachable.',
    },
    {
        id: 'stabilize-symphony',
        title: 'Stabilize symphony runtime',
        priority: 'high',
        status: 'pending',
        detail: 'Track runtime health and prevent silent degradation.',
    },
];

const buildFallbackStatus = (detail: string): AutonomyStatus => ({
    active: false,
    mode: 'recovering',
    currentObjectiveId: fallbackObjectives[0].id,
    lastAction: detail,
    lastTickAt: null,
    heartbeat: {
        source: 'browser-cockpit',
        status: 'degraded',
        detail,
        at: new Date().toISOString(),
    },
    metrics: {
        ticks: 0,
        recoveredIncidents: 0,
        blockedIncidents: 0,
    },
    recentActions: [],
    objectiveCount: fallbackObjectives.length,
    currentObjective: fallbackObjectives[0],
});

const normalizeBoundaryState = (value?: string | null): AutonomyPolicyState['boundary_state'] => {
    switch ((value || '').toLowerCase()) {
        case 'autonomous':
            return 'autonomous';
        case 'operational':
            return 'operational';
        case 'recoverable':
            return 'recoverable';
        default:
            return 'dormant';
    }
};

export const getAutonomyStatus = async (): Promise<AutonomyStatus> => {
    try {
        const response = await axios.get<AutonomyStatus>(`${getApiBaseUrl()}/autonomy/status`);
        return response.data;
    } catch (error) {
        console.warn('Falling back to local autonomy status:', error);
        return buildFallbackStatus('Autonomy endpoint unavailable; browser cockpit is holding a recovery posture.');
    }
};

export const getAutonomyObjectives = async (): Promise<AutonomyObjective[]> => {
    try {
        const response = await axios.get<AutonomyObjective[]>(`${getApiBaseUrl()}/autonomy/objectives`);
        return response.data;
    } catch (error) {
        console.warn('Falling back to local autonomy objectives:', error);
        return fallbackObjectives;
    }
};

export const getAutonomyDecisions = async (): Promise<AutonomyDecision[]> => {
    try {
        const response = await axios.get<AutonomyDecision[]>(`${getApiBaseUrl()}/autonomy/decisions`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.warn('Falling back to empty autonomy decisions:', error);
        return [];
    }
};

export const getAutonomyPolicy = async (): Promise<AutonomyPolicyState | null> => {
    try {
        const response = await axios.get<AutonomyPolicyState>(`${getApiBaseUrl()}/autonomy/policy`);
        if (response.data?.status === 'missing') {
            return null;
        }
        return response.data;
    } catch (error) {
        console.warn('Unable to load autonomy policy state:', error);
        try {
            const runtimeResponse = await axios.get<RuntimeStateResponse>(`${getApiBaseUrl()}/runtime/state`);
            const runtimeData = runtimeResponse.data;
            return {
                updated_at: new Date().toISOString(),
                cycle_number: 0,
                selected_action:
                    runtimeData.proof?.runtimeRecovery?.selectedAction ??
                    runtimeData.classification ??
                    'hold_core_degraded',
                action_reason: runtimeData.classificationReason ?? runtimeData.message,
                backend_classification: runtimeData.proof?.runtimeAuthority?.summary ?? 'unknown',
                frontend_classification:
                    runtimeData.proof?.runtimeRecovery?.managedRuntime?.frontendUrl ? 'managed-preview-ready' : 'preview-alive',
                runtime_strategy: 'runtime-state-fallback',
                boundary_state: normalizeBoundaryState(runtimeData.classification),
                boundary_reason: runtimeData.classificationReason ?? runtimeData.message,
                haios_state: normalizeBoundaryState(runtimeData.classification),
                haios_reason: runtimeData.classificationReason ?? runtimeData.message,
                routine_decisions: runtimeData.proof?.latestProbeSummary?.probes?.map((probe) => probe.detail) ?? [],
                policy_source: 'runtime-state-fallback',
                fallback_triggered: true,
                proof_events: [
                    {
                        at: new Date().toISOString(),
                        source: 'autonomy-api',
                        type: 'policy-fallback',
                        detail: 'Fell back to /api/runtime/state because /api/autonomy/policy was unavailable.',
                    },
                ],
            };
        } catch (runtimeError) {
            console.warn('Fallback to runtime state failed:', runtimeError);
            return null;
        }
    }
};

export const startAutonomy = async (): Promise<AutonomyStatus> => {
    const response = await axios.post<{ autonomy: AutonomyStatus }>(`${getApiBaseUrl()}/autonomy/start`);
    return response.data.autonomy;
};

export const stopAutonomy = async (): Promise<AutonomyStatus> => {
    const response = await axios.post<{ autonomy: AutonomyStatus }>(`${getApiBaseUrl()}/autonomy/stop`);
    return response.data.autonomy;
};

export const heartbeatAutonomy = async (payload: AutonomyHeartbeatRequest): Promise<AutonomyStatus> => {
    const response = await axios.post<{ autonomy: AutonomyStatus }>(`${getApiBaseUrl()}/autonomy/heartbeat`, payload);
    return response.data.autonomy;
};

export const tickAutonomy = async (source = 'browser-cockpit'): Promise<AutonomyStatus> => {
    const response = await axios.post<{ state: AutonomyStatus }>(`${getApiBaseUrl()}/autonomy/tick`, { source });
    return response.data.state;
};
