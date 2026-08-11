import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/empathy.module.css';

type Classification = 'Dormant' | 'Recoverable' | 'Operational' | 'Autonomous';

interface RuntimeProof {
    heartbeat?: {
        status?: string;
        detail?: string;
        source?: string;
        at?: string;
    };
    lastAction?: string;
    metrics?: Record<string, number | string>;
    latestProbeSummary?: {
        overallStatus?: string;
        checkedAt?: string;
        probes?: Array<{ id?: string; status?: string; detail?: string }>;
    };
}

interface RuntimeStateResponse {
    classification: Classification;
    message: string;
    status: Record<string, unknown>;
    proof: RuntimeProof;
}

const classificationColors: Record<Classification, string> = {
    Dormant: '#9e9e9e',
    Recoverable: '#ff9800',
    Operational: '#2196f3',
    Autonomous: '#4caf50',
};

const POLL_INTERVAL = 15000;

const RuntimeStatePanel: React.FC = () => {
    const [runtimeState, setRuntimeState] = useState<RuntimeStateResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchState = async () => {
        try {
            const response = await fetch('/api/runtime/state');
            if (!response.ok) {
                throw new Error(`Runtime state fetch failed (${response.status})`);
            }
            const payload: RuntimeStateResponse = await response.json();
            setRuntimeState(payload);
            setError(null);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
        }
    };

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const badgeColor = runtimeState ? classificationColors[runtimeState.classification] : '#bdbdbd';

    const proofList = useMemo(() => {
        if (!runtimeState) {
            return [];
        }
        const { proof } = runtimeState;
        const entries: Array<[string, string]> = [];
        if (proof.heartbeat) {
            entries.push([
                'Heartbeat',
                `${proof.heartbeat.status || 'unknown'} - ${proof.heartbeat.detail || 'no detail'} (${proof.heartbeat.source || 'unknown'})`,
            ]);
        }
        if (proof.lastAction) {
            entries.push(['Last action', proof.lastAction]);
        }
        if (proof.latestProbeSummary?.overallStatus) {
            entries.push([
                'Probe summary',
                `${proof.latestProbeSummary.overallStatus} at ${proof.latestProbeSummary.checkedAt || 'unknown'}`,
            ]);
        }
        if (proof.metrics) {
            entries.push([
                'Metrics ticks',
                `${proof.metrics.ticks || 'n/a'} ticks, probes: ${proof.metrics.probeCycles || 0}`,
            ]);
        }
        return entries;
    }, [runtimeState]);

    return (
        <div className={styles.runtimePanel}>
            <h2 className={styles.empathyHeader}>Runtime Classification</h2>
            {runtimeState ? (
                <>
                    <div className={styles.runtimeBadge} style={{ backgroundColor: badgeColor }}>
                        {runtimeState.classification}
                    </div>
                    <p className={styles.empathyMessage}>{runtimeState.message}</p>
                    <div className={styles.runtimeProofList}>
                        {proofList.map(([label, detail]) => (
                            <div key={label} className={styles.runtimeProofItem}>
                                <strong className={styles.runtimeProofLabel}>{label}:</strong> {detail}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p className={styles.empathyMessage}>
                    {error ? `Unable to load runtime state: ${error}` : 'Loading runtime classification...'}
                </p>
            )}
        </div>
    );
};

export default RuntimeStatePanel;
