import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    getAutonomyDecisions,
    getAutonomyObjectives,
    getAutonomyPolicy,
    getAutonomyStatus,
    heartbeatAutonomy,
    startAutonomy,
    stopAutonomy,
    tickAutonomy,
} from '../services/api/autonomyAPI';
import { hasRuntimeApiOriginOverride } from '../services/runtimeConfig';
import { getRuntimeCapabilities, reconcileRuntime } from '../services/api/runtimeAPI';
import {
    AutonomyDecision,
    AutonomyObjective,
    AutonomyPolicyState,
    AutonomyStatus,
    BoundaryAutonomySnapshot,
    RuntimeCapabilitiesResponse,
} from '../types/runtime.types';

const POLL_INTERVAL_MS = 5000;
const RECONCILE_COOLDOWN_MS = 15000;
const HEARTBEAT_COOLDOWN_MS = 15000;
const RECOVERY_TICK_COOLDOWN_MS = 15000;
const BOUNDARY_SNAPSHOT_STORAGE_KEY = 'hyperai_autonomy_boundary_snapshot';

interface AutonomyContextValue {
    status: AutonomyStatus | null;
    objectives: AutonomyObjective[];
    decisions: AutonomyDecision[];
    policy: AutonomyPolicyState | null;
    boundaryState: BoundaryAutonomySnapshot | null;
    runtimeCapabilities: RuntimeCapabilitiesResponse | null;
    error: string | null;
    loading: boolean;
    refresh: () => Promise<void>;
    startRuntime: () => Promise<void>;
    stopRuntime: () => Promise<void>;
    tickRuntime: () => Promise<void>;
    markHealthy: () => Promise<void>;
    markDegraded: (detail?: string) => Promise<void>;
}

const AutonomyContext = createContext<AutonomyContextValue | undefined>(undefined);

const deriveRecoveryAction = (
    capabilities: RuntimeCapabilitiesResponse | null
): BoundaryAutonomySnapshot['recoveryAction'] => {
    const selectedAction = capabilities?.runtime_recovery?.selectedAction ?? capabilities?.selected_action;

    switch (selectedAction) {
        case 'start_managed_runtime':
            return 'start-runtime';
        case 'reconcile_managed_runtime':
        case 'promote_managed_runtime':
        case 'run_runtime_ensure':
            return 'reconcile-runtime';
        case 'mark_healthy':
            return 'mark-healthy';
        case 'mark_degraded':
            return 'mark-degraded';
        case 'tick':
            return 'tick-runtime';
        default:
            return 'none';
    }
};

const readPersistedRecoveryAttempts = (): number => {
    if (typeof window === 'undefined') {
        return 0;
    }

    try {
        const raw = window.localStorage.getItem(BOUNDARY_SNAPSHOT_STORAGE_KEY);
        if (!raw) {
            return 0;
        }

        const parsed = JSON.parse(raw) as Partial<BoundaryAutonomySnapshot>;
        return typeof parsed.recoveryAttempts === 'number' ? parsed.recoveryAttempts : 0;
    } catch {
        return 0;
    }
};

const persistBoundarySnapshot = (snapshot: BoundaryAutonomySnapshot | null): void => {
    if (typeof window === 'undefined' || !snapshot) {
        return;
    }

    window.localStorage.setItem(BOUNDARY_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
};

const buildBoundarySnapshot = (
    capabilities: RuntimeCapabilitiesResponse | null,
    status: AutonomyStatus | null,
    recoveryAttempts: number
): BoundaryAutonomySnapshot | null => {
    if (!capabilities && !status) {
        return null;
    }

    const selectedAction = capabilities?.runtime_recovery?.selectedAction ?? capabilities?.selected_action;
    const derivedRecoveryAction = deriveRecoveryAction(capabilities);
    const boundaryState = capabilities?.boundary_state ?? (status?.active ? 'operational' : 'recoverable');
    const recoveryAction =
        derivedRecoveryAction === 'none' && !status?.active && boundaryState === 'recoverable'
            ? 'start-runtime'
            : derivedRecoveryAction;

    const classificationReason =
        capabilities?.boundary_reason ??
        capabilities?.authority_reason ??
        status?.heartbeat.detail ??
        'Autonomy boundary has not produced a classification yet.';

    return {
        boundary: 'hyperai-user-control-system',
        state: boundaryState,
        localFirst: true,
        classificationReason,
        recoveryAction,
        recoveryAttempts: Math.max(recoveryAttempts, capabilities?.runtime_recovery?.launchStartedAt ? 1 : 0),
        lastEvaluatedAt:
            capabilities?.runtime_recovery?.lastEvaluatedAt ??
            capabilities?.generated_at ??
            new Date().toISOString(),
        lastHealthyAt: capabilities?.runtime_recovery?.lastHealthyAt ?? null,
        runtimeMode: status?.mode ?? capabilities?.runtime_mode ?? null,
        staleProcess: Boolean(capabilities?.runtime_authority?.stale_process),
    };
};

const canPromoteManagedFrontendBoundary = (
    capabilities: RuntimeCapabilitiesResponse | null,
): boolean => {
    const managedFrontendUrl =
        capabilities?.runtime_authority?.managed_frontend_url ??
        capabilities?.runtime_recovery?.managedRuntime?.frontendUrl;
    const managedHealthy =
        Boolean(capabilities?.runtime_recovery?.managedRuntime?.healthy) ||
        capabilities?.selected_action === 'reuse_managed_runtime';

    return Boolean(managedFrontendUrl) && managedHealthy;
};

const buildManagedFrontendBoundaryUrl = (managedFrontendUrl: string): string => {
    const target = new URL(managedFrontendUrl);
    if (typeof window !== 'undefined') {
        target.pathname = window.location.pathname;
        target.search = window.location.search;
        target.hash = window.location.hash;
    }
    return target.toString();
};

export const AutonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<AutonomyStatus | null>(null);
    const [objectives, setObjectives] = useState<AutonomyObjective[]>([]);
    const [decisions, setDecisions] = useState<AutonomyDecision[]>([]);
    const [policy, setPolicy] = useState<AutonomyPolicyState | null>(null);
    const [runtimeCapabilities, setRuntimeCapabilities] = useState<RuntimeCapabilitiesResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [recoveryAttempts, setRecoveryAttempts] = useState<number>(() => readPersistedRecoveryAttempts());
    const lastReconcileAtRef = useRef<number>(0);
    const lastHeartbeatAtRef = useRef<number>(0);
    const lastRecoveryTickAtRef = useRef<number>(0);
    const promotedFrontendRef = useRef<string | null>(null);

    const loadState = useCallback(async () => {
        setLoading(true);
        try {
            const [nextCapabilities, nextStatus, nextObjectives, nextDecisions, nextPolicy] = await Promise.all([
                getRuntimeCapabilities(),
                getAutonomyStatus(),
                getAutonomyObjectives(),
                getAutonomyDecisions(),
                getAutonomyPolicy(),
            ]);

            setRuntimeCapabilities(nextCapabilities);
            setStatus(nextStatus);
            setObjectives(nextObjectives);
            setDecisions(nextDecisions);
            setPolicy(nextPolicy);
            setError(null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load autonomy state.');
        } finally {
            setLoading(false);
        }
    }, []);

    const boundaryState = useMemo(
        () => buildBoundarySnapshot(runtimeCapabilities, status, recoveryAttempts),
        [recoveryAttempts, runtimeCapabilities, status]
    );

    useEffect(() => {
        void loadState();
        const interval = window.setInterval(() => {
            void loadState();
        }, POLL_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [loadState]);

    useEffect(() => {
        if (!runtimeCapabilities?.safe_recovery_available) {
            return;
        }

        const selectedAction = runtimeCapabilities.runtime_recovery?.selectedAction ?? runtimeCapabilities.selected_action;
        if (selectedAction !== 'start_managed_runtime' && selectedAction !== 'reconcile_managed_runtime') {
            return;
        }

        if (Date.now() - lastReconcileAtRef.current < RECONCILE_COOLDOWN_MS) {
            return;
        }

        lastReconcileAtRef.current = Date.now();
        void reconcileRuntime('autonomy-context-auto-reconcile')
            .catch((reconcileError) => {
                setError(
                    reconcileError instanceof Error
                        ? reconcileError.message
                        : 'Runtime reconciliation failed.'
                );
            })
            .finally(() => {
                void loadState();
            });
    }, [loadState, runtimeCapabilities]);

    useEffect(() => {
        if (!status || typeof window === 'undefined') {
            return;
        }

        if (Date.now() - lastHeartbeatAtRef.current < HEARTBEAT_COOLDOWN_MS) {
            return;
        }

        lastHeartbeatAtRef.current = Date.now();
        void heartbeatAutonomy({
            source: 'browser-shell',
            status: error ? 'degraded' : 'healthy',
            detail: error
                ? `Browser shell is degrading the autonomy boundary: ${error}`
                : `Browser shell polling is healthy and the boundary is ${boundaryState?.state ?? 'operational'}.`,
        }).catch((heartbeatError) => {
            console.warn('Unable to report browser heartbeat:', heartbeatError);
        });
    }, [boundaryState?.state, error, status]);

    useEffect(() => {
        if (!boundaryState) {
            return;
        }

        persistBoundarySnapshot(boundaryState);
    }, [boundaryState]);

    useEffect(() => {
        if (!status || status.active || !boundaryState) {
            return;
        }

        if (
            boundaryState.state !== 'recoverable' ||
            (boundaryState.recoveryAction !== 'tick-runtime' &&
                boundaryState.recoveryAction !== 'start-runtime')
        ) {
            return;
        }

        if (Date.now() - lastRecoveryTickAtRef.current < RECOVERY_TICK_COOLDOWN_MS) {
            return;
        }

        lastRecoveryTickAtRef.current = Date.now();
        setRecoveryAttempts((previous) => previous + 1);
        const recoveryRequest =
            boundaryState.recoveryAction === 'start-runtime'
                ? startAutonomy()
                : tickAutonomy('browser-boundary-recovery');

        void recoveryRequest
            .then((result) => {
                setStatus(result);
            })
            .catch((recoveryError) => {
                setError(
                    recoveryError instanceof Error
                        ? recoveryError.message
                        : 'Browser boundary recovery tick failed.'
                );
            })
            .finally(() => {
                void loadState();
            });
    }, [boundaryState, loadState, runtimeCapabilities?.safe_recovery_available, status]);

    useEffect(() => {
        if (
            typeof window === 'undefined' ||
            hasRuntimeApiOriginOverride() ||
            !canPromoteManagedFrontendBoundary(runtimeCapabilities)
        ) {
            return;
        }

        const managedFrontendUrl =
            runtimeCapabilities?.runtime_authority?.managed_frontend_url ??
            runtimeCapabilities?.runtime_recovery?.managedRuntime?.frontendUrl;

        if (!managedFrontendUrl) {
            return;
        }

        try {
            const targetUrl = buildManagedFrontendBoundaryUrl(managedFrontendUrl);
            if (promotedFrontendRef.current === targetUrl) {
                return;
            }

            if (new URL(targetUrl).origin === window.location.origin) {
                return;
            }

            promotedFrontendRef.current = targetUrl;
            window.location.assign(targetUrl);
        } catch (promotionError) {
            console.warn('Unable to promote the managed frontend boundary:', promotionError);
        }
    }, [runtimeCapabilities]);

    const refresh = useCallback(async () => {
        await loadState();
    }, [loadState]);

    const startRuntime = useCallback(async () => {
        const nextStatus = await startAutonomy();
        setStatus(nextStatus);
        await loadState();
    }, [loadState]);

    const stopRuntime = useCallback(async () => {
        const nextStatus = await stopAutonomy();
        setStatus(nextStatus);
        await loadState();
    }, [loadState]);

    const tickRuntime = useCallback(async () => {
        const nextStatus = await tickAutonomy('autonomy-context');
        setStatus(nextStatus);
        await loadState();
    }, [loadState]);

    const markHealthy = useCallback(async () => {
        const nextStatus = await heartbeatAutonomy({
            source: 'browser-shell',
            status: 'healthy',
            detail: 'Browser shell polling is healthy.',
        });
        setStatus(nextStatus);
        await loadState();
    }, [loadState]);

    const markDegraded = useCallback(
        async (detail = 'Browser shell requested stabilization.') => {
            const nextStatus = await heartbeatAutonomy({
                source: 'browser-shell',
                status: 'degraded',
                detail,
            });
            setStatus(nextStatus);
            await loadState();
        },
        [loadState]
    );

    const value = useMemo<AutonomyContextValue>(
        () => ({
            status,
            objectives,
            decisions,
            policy,
            boundaryState,
            runtimeCapabilities,
            error,
            loading,
            refresh,
            startRuntime,
            stopRuntime,
            tickRuntime,
            markHealthy,
            markDegraded,
        }),
        [
            status,
            objectives,
            decisions,
            policy,
            boundaryState,
            runtimeCapabilities,
            error,
            loading,
            refresh,
            startRuntime,
            stopRuntime,
            tickRuntime,
            markHealthy,
            markDegraded,
        ]
    );

    return <AutonomyContext.Provider value={value}>{children}</AutonomyContext.Provider>;
};

export const useAutonomyContext = (): AutonomyContextValue => {
    const context = useContext(AutonomyContext);
    if (!context) {
        throw new Error('useAutonomyContext must be used within an AutonomyProvider');
    }

    return context;
};
