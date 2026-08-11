import React, { useEffect, useState } from 'react';
import { getRuntimeCapabilities } from '../../services/api/runtimeAPI';
import { mergeBrowserCockpitLanes } from '../../services/runtimeFlags';
import {
    AppBuildRuntimeSurface,
    ModelBindingSurface,
    RuntimeCapabilitiesResponse,
    RuntimeLane,
} from '../../types/runtime.types';
import styles from './RuntimeLaneStatus.module.css';

const POLL_INTERVAL_MS = 5000;

type ProtocolStatus = 'validated' | 'bounded' | 'blocked';

const CREATOR_EYES_BASELINE = {
    d0: 5,
    velocity: 1,
    kDomain: [0, 1, 2, 3, 4, 5],
    validTransitions: 5,
    totalTransitions: 5,
    totalCost: 38,
    totalComplexityDelta: 5,
};

const laneModeClassName = (mode: RuntimeLane['mode']): string => {
    switch (mode) {
        case 'live':
            return styles.live;
        case 'degraded':
            return styles.degraded;
        case 'local-only':
            return styles.localOnly;
        default:
            return styles.disabled;
    }
};

const boundaryStateClassName = (state?: RuntimeCapabilitiesResponse['boundary_state']): string => {
    switch (state) {
        case 'autonomous':
            return styles.live;
        case 'operational':
            return styles.degraded;
        case 'recoverable':
            return styles.localOnly;
        default:
            return styles.disabled;
    }
};

const backendClassificationMode = (classification?: string): RuntimeLane['mode'] => {
    switch (classification) {
        case 'autonomous-core-ready':
            return 'live';
        case 'operational-without-autonomy':
            return 'degraded';
        case 'stale-process runtime':
        case 'degraded/local-only':
            return 'local-only';
        default:
            return 'disabled';
    }
};

const authorityMode = (score: number): RuntimeLane['mode'] => {
    if (score >= 0.8) {
        return 'live';
    }
    if (score >= 0.55) {
        return 'degraded';
    }
    if (score > 0) {
        return 'local-only';
    }
    return 'disabled';
};

const modelBindingMode = (binding: ModelBindingSurface): RuntimeLane['mode'] => {
    if (binding.inferenceProofState === 'proven') {
        return 'live';
    }
    if (binding.inferenceProofState === 'gateway_auth_blocked') {
        return 'degraded';
    }
    if (binding.inventoryState === 'live') {
        return 'local-only';
    }
    return 'disabled';
};

const formatScore = (value: number): string => value.toFixed(2);

const proofLine = (surface: AppBuildRuntimeSurface): string =>
    surface.proofRefs?.[0] || surface.registryMatch || 'proof not provided';

const protocolStatusClassName = (status: ProtocolStatus): string => {
    switch (status) {
        case 'validated':
            return styles.protocolValidated;
        case 'bounded':
            return styles.protocolBounded;
        case 'blocked':
        default:
            return styles.protocolBlocked;
    }
};

const formatProtocolNumber = (value: number, digits = 4): string =>
    Number.isInteger(value) ? String(value) : value.toFixed(digits);

const selectedActionFromPolicy = (capabilities: RuntimeCapabilitiesResponse): string | undefined =>
    capabilities.autonomy_policy?.selected_action ||
    capabilities.autonomy_policy?.runtime_recovery?.selectedAction;

const hasRuntimePolicyContradiction = (capabilities: RuntimeCapabilitiesResponse): boolean => {
    const topLevelAutonomous =
        capabilities.boundary_state === 'autonomous' ||
        capabilities.backend_classification === 'autonomous-core-ready' ||
        capabilities.selected_action === 'reuse_default_runtime';

    const policyAction = selectedActionFromPolicy(capabilities);
    const policyStale = capabilities.autonomy_policy?.backend_classification === 'stale-process runtime';
    const policyHold = policyAction === 'hold_current_runtime';

    return topLevelAutonomous && (policyStale || policyHold);
};

const buildCreatorEyesProjection = (capabilities: RuntimeCapabilitiesResponse) => {
    const protocol = capabilities.creator_trace_protocol;
    const protocolBaseline = protocol?.baseline;
    const baseline = protocolBaseline
        ? {
            d0: protocolBaseline.D0,
            velocity: protocolBaseline.velocity,
            kDomain: protocolBaseline.k_domain,
            validTransitions: protocolBaseline.valid_transitions,
            totalTransitions: protocolBaseline.total_transitions,
            totalCost: protocolBaseline.total_cost,
            totalComplexityDelta: protocolBaseline.total_complexity_delta,
        }
        : CREATOR_EYES_BASELINE;
    const rConv = protocol?.convergence?.R_conv ?? baseline.validTransitions / baseline.totalTransitions;
    const costEfficiency = protocol?.cost_model?.eta_cost ?? baseline.totalComplexityDelta / baseline.totalCost;
    const unitComplexityCost = protocol?.cost_model?.C_delta_D ?? baseline.totalCost / baseline.totalComplexityDelta;
    const contradiction = protocol?.context_soundness?.manifest_policy_contradiction ?? hasRuntimePolicyContradiction(capabilities);
    const managersSelectedValid = protocol?.context_soundness?.managers_selected_in_valid_scope ??
        Boolean(capabilities.runtime_authority?.backend_runtime && capabilities.selected_action);
    const teardownGuarded = protocol?.context_soundness?.teardown_guarded ?? (
        capabilities.safe_recovery_available === false ||
        capabilities.selected_action === 'reuse_default_runtime' ||
        capabilities.selected_action === 'hold_current_runtime'
    );

    const contextStatus: ProtocolStatus = protocol?.context_soundness?.status ?? (
        managersSelectedValid && teardownGuarded && !contradiction
            ? 'validated'
            : managersSelectedValid && teardownGuarded
                ? 'bounded'
                : 'blocked'
    );

    const trustPath: Array<{ id: string; label: string; status: ProtocolStatus; evidence: string }> = protocol?.path_witness?.length
        ? protocol.path_witness.map((node) => ({
            id: node.id,
            label: node.id,
            status: node.status,
            evidence: node.evidence,
        }))
        : [
        {
            id: 'cu_scope',
            label: 'cu_scope',
            status: capabilities.core_boundary?.length ? 'validated' : 'blocked',
            evidence: capabilities.core_boundary?.join(', ') || 'missing core boundary',
        },
        {
            id: 'cu_registry',
            label: 'cu_registry',
            status: capabilities.runtime_authority && capabilities.lanes?.length ? 'validated' : 'bounded',
            evidence: `${capabilities.lanes?.length || 0} runtime lanes`,
        },
        {
            id: 'cu_impl',
            label: 'cu_impl',
            status: contradiction ? 'bounded' : capabilities.backend_classification ? 'validated' : 'blocked',
            evidence: capabilities.backend_classification || 'backend classification missing',
        },
    ];

    const operatorSurfaces: Array<{ name: string; state: string; status: ProtocolStatus; evidence: string }> = [
        {
            name: 'Codex',
            state: 'active worker surface',
            status: 'validated',
            evidence: 'current creator approval-intake lane',
        },
        {
            name: 'VS Code Insiders',
            state: 'operator cockpit',
            status: 'bounded',
            evidence: 'GitHub AI sign-in remains unresolved',
        },
        {
            name: 'Windsurf',
            state: 'quarantine',
            status: 'blocked',
            evidence: 'update/file-handle lock observed',
        },
        {
            name: 'BLACKBOXAI',
            state: 'observe-only',
            status: 'bounded',
            evidence: 'extension host instability observed',
        },
    ];

    return {
        baseline,
        sourcePath: protocol?.source_path ?? 'frontend fallback',
        runtimeWeighting: protocol?.context_soundness?.runtime_weighting ||
            protocol?.weighting_rule?.runtime_query ||
            'gamma(cu_shell) > gamma(cu_policy)',
        protocolStatus: protocol?.status ?? 'frontend_fallback',
        rConv,
        costEfficiency,
        unitComplexityCost,
        contradiction,
        contextStatus,
        managersSelectedValid,
        teardownGuarded,
        trustPath,
        operatorSurfaces,
    };
};

export const RuntimeLaneStatus: React.FC = () => {
    const [capabilities, setCapabilities] = useState<RuntimeCapabilitiesResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCapabilities = async () => {
            try {
                const response = await getRuntimeCapabilities();
                setCapabilities({
                    ...response,
                    lanes: mergeBrowserCockpitLanes(response.lanes),
                });
                setError(null);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load runtime capabilities.');
            }
        };

        loadCapabilities();
        const interval = window.setInterval(loadCapabilities, POLL_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, []);

    if (error) {
        return (
            <section className={styles.runtimeLaneStatus}>
                <h2>Runtime Lane Status</h2>
                <p className={styles.summary}>Capability reporting is unavailable: {error}</p>
            </section>
        );
    }

    if (!capabilities) {
        return (
            <section className={styles.runtimeLaneStatus}>
                <h2>Runtime Lane Status</h2>
                <p className={styles.summary}>Loading runtime capabilities...</p>
            </section>
        );
    }

    const creatorProjection = buildCreatorEyesProjection(capabilities);
    const appBuildRegistry = capabilities.app_build_runtime_registry;

    return (
        <section className={styles.runtimeLaneStatus}>
            <div className={styles.header}>
                <h2>Runtime Lane Status</h2>
                <span className={`${styles.badge} ${laneModeClassName(capabilities.status === 'ok' ? 'live' : 'degraded')}`}>
                    {capabilities.runtime_mode}
                </span>
            </div>
            {capabilities.boundary_state && (
                <div className={styles.boundaryStateRow}>
                    <span className={`${styles.badge} ${boundaryStateClassName(capabilities.boundary_state)}`}>
                        HAIOS {capabilities.boundary_state}
                    </span>
                    <span className={styles.boundaryReason}>{capabilities.boundary_reason}</span>
                </div>
            )}
            {capabilities.runtime_authority && (
                <div
                    className={`${styles.authorityNotice} ${
                        capabilities.runtime_authority.stale_process ? styles.staleAuthority : styles.freshAuthority
                    }`}
                >
                    <strong>Runtime authority:</strong> {capabilities.runtime_authority.summary}
                    <div className={styles.authorityMeta}>
                        Backend: {capabilities.runtime_authority.backend_runtime}. Process started:{' '}
                        {new Date(capabilities.runtime_authority.process_started_at).toLocaleString()}. File modified:{' '}
                        {new Date(capabilities.runtime_authority.file_modified_at).toLocaleString()}.
                    </div>
                </div>
            )}
            <p className={styles.summary}>
                Symphony running: {capabilities.symphony_running ? 'yes' : 'no'}.
                Commands observed: {capabilities.command_count}.
                Last command: {capabilities.last_command ?? 'none'}.
            </p>
            {capabilities.runtime_authority && (
                <div className={styles.authorityCard}>
                    <div className={styles.authorityTop}>
                        <strong>Runtime Authority</strong>
                        <span className={`${styles.badge} ${laneModeClassName(
                            backendClassificationMode(capabilities.backend_classification)
                        )}`}>
                            {capabilities.backend_classification ?? 'unknown'}
                        </span>
                    </div>
                    <p className={styles.evidence}>{capabilities.runtime_authority.summary}</p>
                    <p className={styles.endpoint}>
                        Next action: {capabilities.selected_action ?? 'hold'}.
                        Frontend state: {capabilities.frontend_classification ?? 'unknown'}.
                    </p>
                    {capabilities.runtime_strategy && (
                        <p className={styles.endpoint}>Strategy: {capabilities.runtime_strategy}.</p>
                    )}
                    {typeof capabilities.safe_recovery_available === 'boolean' && (
                        <p className={styles.endpoint}>
                            Safe recovery available: {capabilities.safe_recovery_available ? 'yes' : 'no'}.
                        </p>
                    )}
                    {capabilities.authority_reason && (
                        <p className={styles.endpoint}>{capabilities.authority_reason}</p>
                    )}
                    {capabilities.routine_decisions?.map((decision, index) => (
                        <p key={`routine-decision-${index}`} className={styles.endpoint}>
                            Decision {index + 1}: {decision}
                        </p>
                    ))}
                    {capabilities.runtime_authority.managed_runtime && (
                        <p className={styles.endpoint}>
                            Managed runtime:
                            {' '}
                            {capabilities.runtime_authority.managed_backend_url ?? 'n/a'}
                            {' | '}
                            {capabilities.runtime_authority.managed_frontend_url ?? 'n/a'}
                        </p>
                    )}
                    {capabilities.runtime_recovery && (
                        <>
                            <p className={styles.endpoint}>
                                Recovery: {capabilities.runtime_recovery.status}.
                                Action: {capabilities.runtime_recovery.selectedAction}.
                            </p>
                            <p className={styles.endpoint}>{capabilities.runtime_recovery.reason}</p>
                            {capabilities.runtime_recovery.launchStartedAt && (
                                <p className={styles.endpoint}>
                                    Last launch: {new Date(capabilities.runtime_recovery.launchStartedAt).toLocaleString()}.
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
            <div className={styles.creatorProtocolCard}>
                <div className={styles.creatorProtocolHeader}>
                    <div>
                        <h3>Creator-Eyes Protocol</h3>
                        <p>
                            GAM projection over runtime truth. Weighting: {creatorProjection.runtimeWeighting}.
                        </p>
                    </div>
                    <span className={`${styles.protocolPill} ${protocolStatusClassName(creatorProjection.contextStatus)}`}>
                        ContextCorrect={creatorProjection.contextStatus}
                    </span>
                </div>

                <div className={styles.protocolGrid}>
                    <div className={styles.protocolMetric}>
                        <span>D_k</span>
                        <strong>{creatorProjection.baseline.d0} - {creatorProjection.baseline.velocity}k</strong>
                        <small>k in [{creatorProjection.baseline.kDomain.join(', ')}]</small>
                    </div>
                    <div className={styles.protocolMetric}>
                        <span>R_conv</span>
                        <strong>{formatProtocolNumber(creatorProjection.rConv, 1)}</strong>
                        <small>N_valid / N_total</small>
                    </div>
                    <div className={styles.protocolMetric}>
                        <span>eta_cost</span>
                        <strong>{formatProtocolNumber(creatorProjection.costEfficiency)}</strong>
                        <small>DeltaD / C_total = 5 / 38</small>
                    </div>
                    <div className={styles.protocolMetric}>
                        <span>C_delta_D</span>
                        <strong>{formatProtocolNumber(creatorProjection.unitComplexityCost, 1)}</strong>
                        <small>C_total / DeltaD_total</small>
                    </div>
                </div>

                <p className={styles.protocolSource}>
                    Registry: {creatorProjection.sourcePath}. Status: {creatorProjection.protocolStatus}.
                </p>

                <div className={styles.contextSoundness}>
                    <span className={creatorProjection.managersSelectedValid ? styles.soundnessTrue : styles.soundnessFalse}>
                        ManagersSelected in ValidScope = {String(creatorProjection.managersSelectedValid)}
                    </span>
                    <span className={creatorProjection.teardownGuarded ? styles.soundnessTrue : styles.soundnessFalse}>
                        TeardownGuarded(paths) = {String(creatorProjection.teardownGuarded)}
                    </span>
                </div>

                {creatorProjection.contradiction && (
                    <div className={styles.protocolContradiction}>
                        Top-level manifest reports autonomous/reuse_default_runtime while nested policy reports stale-process or
                        hold_current_runtime. Promotion is bounded until the policy layer is recalibrated.
                    </div>
                )}

                <div className={styles.trustPath} aria-label="Shortest trustworthy path">
                    {creatorProjection.trustPath.map((node, index) => (
                        <React.Fragment key={node.id}>
                            <div className={`${styles.trustNode} ${protocolStatusClassName(node.status)}`}>
                                <span>{node.label}</span>
                                <strong>{node.status}</strong>
                                <small>{node.evidence}</small>
                            </div>
                            {index < creatorProjection.trustPath.length - 1 && <span className={styles.trustArrow}>-&gt;</span>}
                        </React.Fragment>
                    ))}
                </div>

                <div className={styles.operatorGrid}>
                    {creatorProjection.operatorSurfaces.map((surface) => (
                        <div className={`${styles.operatorCard} ${protocolStatusClassName(surface.status)}`} key={surface.name}>
                            <strong>{surface.name}</strong>
                            <span>{surface.state}</span>
                            <small>{surface.evidence}</small>
                        </div>
                    ))}
                </div>
            </div>
            {appBuildRegistry && (
                <div className={styles.truthMatrixCard}>
                    <div className={styles.truthMatrixHeader}>
                        <div>
                            <h3>App-Build Runtime Matrix</h3>
                            <p>
                                {appBuildRegistry.orchestration_mode}. Agent chain: {appBuildRegistry.agent_chain_status}.
                            </p>
                        </div>
                        <span className={`${styles.badge} ${styles.localOnly}`}>
                            {appBuildRegistry.target_state}
                        </span>
                    </div>

                    <div className={styles.truthSummaryGrid}>
                        {Object.entries(appBuildRegistry.summary || {}).map(([key, value]) => (
                            <div className={styles.truthSummaryItem} key={key}>
                                <span>{key}</span>
                                <strong>{String(value)}</strong>
                            </div>
                        ))}
                    </div>

                    <p className={styles.protocolSource}>
                        Registry: {appBuildRegistry.source_path ?? 'runtime/federation_orchestrator/app_build_runtime_registry_20260421.json'}.
                        Surfaces: {appBuildRegistry.runtime_surfaces.length}.
                        Model bindings: {appBuildRegistry.model_bindings.length}.
                    </p>

                    <div className={styles.surfaceGrid}>
                        {appBuildRegistry.runtime_surfaces.map((surface) => (
                            <article className={styles.surfaceCard} key={surface.id}>
                                <div className={styles.surfaceTop}>
                                    <strong>{surface.id}</strong>
                                    <span className={`${styles.badge} ${laneModeClassName(authorityMode(surface.authorityScore))}`}>
                                        {formatScore(surface.authorityScore)}
                                    </span>
                                </div>
                                <p className={styles.endpoint}>
                                    {surface.runtimeClass} / {surface.laneClass}
                                </p>
                                <p className={styles.evidence}>
                                    {surface.currentState}. Safe: {surface.safeState}. Proof: {proofLine(surface)}.
                                </p>
                                {surface.blockers.length > 0 && (
                                    <ul className={styles.compactList}>
                                        {surface.blockers.slice(0, 2).map((blocker) => (
                                            <li key={`${surface.id}-${blocker}`}>{blocker}</li>
                                        ))}
                                    </ul>
                                )}
                            </article>
                        ))}
                    </div>

                    {appBuildRegistry.model_facade_state && (
                        <div className={styles.modelFacadeCard}>
                            <div>
                                <strong>Model Facade</strong>
                                <p>
                                    Default: {appBuildRegistry.model_facade_state.default_provider_facade}.
                                    Route: {appBuildRegistry.model_facade_state.default_route_state}.
                                </p>
                            </div>
                            <span className={`${styles.badge} ${styles.degraded}`}>
                                {appBuildRegistry.model_facade_state.allowed_default_binding}
                            </span>
                        </div>
                    )}

                    <div className={styles.modelGrid}>
                        {appBuildRegistry.model_bindings.map((binding) => (
                            <article className={styles.modelCard} key={binding.model}>
                                <div className={styles.surfaceTop}>
                                    <strong>{binding.model}</strong>
                                    <span className={`${styles.badge} ${laneModeClassName(modelBindingMode(binding))}`}>
                                        {formatScore(binding.routeScore)}
                                    </span>
                                </div>
                                <p className={styles.endpoint}>
                                    {binding.providerFacade} / {binding.substrate} / {binding.locality}
                                </p>
                                <p className={styles.evidence}>
                                    Proof: {binding.inferenceProofState}. Bias risk: {formatScore(binding.publisherBiasRisk)}.
                                    Tasks: {binding.taskClasses.join(', ')}.
                                </p>
                            </article>
                        ))}
                    </div>

                    {appBuildRegistry.blockers.length > 0 && (
                        <div className={styles.protocolContradiction}>
                            Blockers: {appBuildRegistry.blockers.join(' | ')}
                        </div>
                    )}
                </div>
            )}
            <ul className={styles.laneList}>
                {capabilities.lanes.map((lane) => (
                    <li key={lane.id} className={styles.laneCard}>
                        <div className={styles.laneTop}>
                            <strong>{lane.label}</strong>
                            <span className={`${styles.badge} ${laneModeClassName(lane.mode)}`}>{lane.mode}</span>
                        </div>
                        <p className={styles.evidence}>
                            {lane.status}. {lane.evidence}
                        </p>
                        {lane.endpoint && <div className={styles.endpoint}>Endpoint: {lane.endpoint}</div>}
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default RuntimeLaneStatus;
