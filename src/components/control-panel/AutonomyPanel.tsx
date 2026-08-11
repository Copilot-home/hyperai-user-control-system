import React, { useState } from 'react';
import { useAutonomy } from '../../hooks/useAutonomy';
import { Button } from '../shared/Button';
import styles from './AutonomyPanel.module.css';

const modeClassName = (mode: 'standby' | 'autonomous' | 'stabilizing' | 'recovering'): string => {
    switch (mode) {
        case 'autonomous':
            return styles.autonomous;
        case 'stabilizing':
            return styles.stabilizing;
        case 'recovering':
            return styles.recovering;
        default:
            return styles.standby;
    }
};

export const AutonomyPanel: React.FC = () => {
    const [busy, setBusy] = useState(false);
    const {
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
    } = useAutonomy();
    const ecosystemRegistry = runtimeCapabilities?.ecosystem_registry ?? [];

    const runAction = async (action: () => Promise<void>) => {
        try {
            setBusy(true);
            await action();
        } catch (actionError) {
            console.error('Autonomy action failed:', actionError);
        } finally {
            setBusy(false);
        }
    };

    if (loading && !status) {
        return (
            <section className={styles.autonomyPanel}>
                <div className={styles.header}>
                    <h2>Autonomy Control Plane</h2>
                    <span className={`${styles.mode} ${modeClassName('standby')}`}>loading</span>
                </div>
                <p className={styles.summary}>Loading autonomy runtime...</p>
            </section>
        );
    }

    return (
        <section className={styles.autonomyPanel}>
            <div className={styles.header}>
                <h2>Autonomy Control Plane</h2>
                <span className={`${styles.mode} ${modeClassName(status?.mode ?? 'standby')}`}>
                    {status?.mode ?? 'loading'}
                </span>
            </div>
            <p className={styles.summary}>
                This panel exposes the active autonomy loop that keeps communication, symphony stability, and operator
                context in the live backend path.
            </p>
            {error && <p className={styles.error}>{error}</p>}
            {status && (
                <>
                    <div className={styles.grid}>
                        <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Boundary State</div>
                            <div className={styles.metricValue}>{boundaryState?.state ?? 'unknown'}</div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Heartbeat</div>
                            <div className={styles.metricValue}>{status.heartbeat.status}</div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Active Lane</div>
                            <div className={styles.metricValue}>{status.active ? 'symphony-backed' : 'recovery posture'}</div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Current Objective</div>
                            <div className={styles.metricValue}>{status.currentObjective?.title ?? 'Unassigned'}</div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Scheduler Ticks</div>
                            <div className={styles.metricValue}>{status.metrics.ticks}</div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Last Action</div>
                            <div className={styles.metricValue}>{status.lastAction}</div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Recovery Action</div>
                            <div className={styles.metricValue}>{boundaryState?.recoveryAction ?? 'none'}</div>
                        </div>
                    </div>
                    <p className={styles.summary}>
                        {boundaryState?.classificationReason ?? 'Boundary classification is loading.'}
                    </p>
                    <p className={styles.summary}>
                        Runtime authority: {runtimeCapabilities?.runtime_authority?.summary ?? 'No runtime authority summary available.'}
                    </p>
                    <p className={styles.summary}>
                        Safe recovery available: {runtimeCapabilities?.safe_recovery_available ? 'yes' : 'no'}.
                        Selected action: {runtimeCapabilities?.selected_action ?? 'hold'}.
                    </p>
                    <p className={styles.summary}>
                        Runtime strategy: {runtimeCapabilities?.runtime_strategy ?? 'unknown'}.
                        Recovery status: {runtimeCapabilities?.runtime_recovery?.status ?? 'idle'}.
                    </p>
                    {policy ? (
                        <div className={styles.policyCard}>
                            <div className={styles.policyHeader}>
                                <strong>Autonomous Policy Authority</strong>
                                <span className={styles.statusPill}>
                                    {policy.boundary_state ?? policy.haios_state ?? 'unknown'}
                                </span>
                            </div>
                            <p className={styles.policyLine}>
                                Action: {policy.selected_action} — {policy.action_reason}
                            </p>
                            <p className={styles.policyLine}>
                                Backend: {policy.backend_classification ?? 'unknown'} | Frontend: {policy.frontend_classification ?? 'unknown'}
                            </p>
                            <p className={styles.policyLine}>
                                Strategy: {policy.runtime_strategy ?? 'unknown'} | Safe recovery: {policy.safe_recovery_available ? 'enabled' : 'disabled'}
                            </p>
                            <p className={styles.policyLine}>
                                Policy source: {policy.policy_source ?? 'runtime-policy'} | Fallback triggered:{' '}
                                {policy.fallback_triggered ? 'yes' : 'no'}
                            </p>
                            {policy.runtime_authority?.summary && (
                                <p className={styles.policyLine}>{policy.runtime_authority.summary}</p>
                            )}
                            {policy.active_runtime && (
                                <div className={styles.runtimeAuthority}>
                                    <strong>Active runtime:</strong> {policy.active_runtime.type ?? 'default'}
                                    <p className={styles.policyLine}>
                                        Backend: {policy.active_runtime.backend?.url ?? 'n/a'}
                                        {policy.active_runtime.backend?.port ? `:${policy.active_runtime.backend.port}` : ''}
                                    </p>
                                    <p className={styles.policyLine}>
                                        Frontend: {policy.active_runtime.frontend?.url ?? 'n/a'}
                                        {policy.active_runtime.frontend?.port ? `:${policy.active_runtime.frontend.port}` : ''}
                                    </p>
                                </div>
                            )}
                            {policy.proof_events?.length ? (
                                <>
                                    <p className={styles.policyLine}>Recent proof events:</p>
                                    <ul className={styles.policyList}>
                                        {policy.proof_events.map((event, index) => (
                                            <li key={`${event.at}-${event.type}-${index}`} className={styles.policyListItem}>
                                                [{new Date(event.at).toLocaleTimeString()}] {event.type}: {event.detail}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                    ) : null}
                    {policy.routine_decisions?.length ? (
                        <ul className={styles.policyList}>
                            {policy.routine_decisions.map((decision, index) => (
                                <li key={`${decision}-${index}`} className={styles.policyListItem}>
                                    {decision}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}
            <h3 className={styles.sectionTitle}>Runtime Ecosystem Map</h3>
            {ecosystemRegistry.length === 0 ? (
                <p className={styles.detail}>No ecosystem registry data has been reported yet.</p>
            ) : (
                <div className={styles.ecosystemGrid}>
                    {ecosystemRegistry.map((entry) => (
                        <div key={entry.id} className={styles.ecosystemCard}>
                            <div className={styles.listTop}>
                                <strong>{entry.label}</strong>
                                <span className={styles.statusPill}>{entry.status}</span>
                            </div>
                            <p className={styles.detail}>{entry.path}</p>
                            <p className={styles.detail}>
                                Last evidence: {entry.lastSeenAt ? new Date(entry.lastSeenAt).toLocaleString() : 'unknown'}
                            </p>
                            {entry.evidence && entry.evidence.length > 0 && (
                                <ul className={styles.evidenceList}>
                                    {entry.evidence.map((evidence, index) => (
                                        <li key={`${entry.id}-${evidence.path}-${index}`} className={styles.evidenceItem}>
                                            {evidence.status}: {evidence.path}
                                            {evidence.updatedAt ? ` (${new Date(evidence.updatedAt).toLocaleString()})` : ''}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className={styles.controls}>
                <Button onClick={() => runAction(status.active ? stopRuntime : startRuntime)} disabled={busy}>
                    {status.active ? 'Pause Autonomy' : 'Start Autonomy'}
                </Button>
                        <Button onClick={() => runAction(tickRuntime)} disabled={busy}>
                            Run Tick
                        </Button>
                        <Button onClick={() => runAction(() => markDegraded('Browser shell requested stabilization.'))} disabled={busy}>
                            Stabilize
                        </Button>
                        <Button onClick={() => runAction(markHealthy)} disabled={busy}>
                            Mark Healthy
                        </Button>
                        <Button onClick={() => runAction(refresh)} disabled={busy}>
                            Refresh
                        </Button>
                    </div>
                    <h3 className={styles.sectionTitle}>Objectives</h3>
                    <ul className={styles.list}>
                        {objectives.map((objective) => (
                            <li key={objective.id} className={styles.listItem}>
                                <div className={styles.listTop}>
                                    <strong>{objective.title}</strong>
                                    <span className={styles.statusPill}>{objective.status}</span>
                                </div>
                                <p className={styles.detail}>
                                    Priority: {objective.priority}. {objective.detail || 'No detail provided.'}
                                </p>
                            </li>
                        ))}
                    </ul>
                    <h3 className={styles.sectionTitle}>Recent Actions</h3>
                    <ul className={styles.list}>
                        {status.recentActions.map((action) => (
                            <li key={`${action.at}-${action.type}`} className={styles.listItem}>
                                <div className={styles.listTop}>
                                    <strong>{action.type}</strong>
                                    <span className={styles.statusPill}>{new Date(action.at).toLocaleTimeString()}</span>
                                </div>
                                <p className={styles.detail}>{action.detail}</p>
                            </li>
                        ))}
                    </ul>
                    <h3 className={styles.sectionTitle}>Recovery Decisions</h3>
                    <ul className={styles.list}>
                        {decisions.length === 0 && (
                            <li className={styles.listItem}>
                                <p className={styles.detail}>No autonomous recovery decisions recorded yet.</p>
                            </li>
                        )}
                        {decisions.map((decision, index) => (
                            <li key={`${decision.at}-${decision.action}-${index}`} className={styles.listItem}>
                                <div className={styles.listTop}>
                                    <strong>{decision.action}</strong>
                                    <span className={styles.statusPill}>
                                        {decision.status ?? new Date(decision.at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className={styles.detail}>{decision.detail}</p>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
};

export default AutonomyPanel;
