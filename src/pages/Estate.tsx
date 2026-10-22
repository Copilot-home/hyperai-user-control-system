import React, { useEffect, useState } from 'react';
import NavigationBar from '../components/user-interface/NavigationBar';
import { getEstateSummary } from '../services/api/estateAPI';
import { EstateSummary } from '../types/estate.types';
import styles from '../styles/estate.module.css';

const POLL_MS = 15000;

const label = (value: string) => value.replace(/_/g, ' ');
const stateClass = (value: boolean) => (value ? styles.proven : styles.held);

const Estate: React.FC = () => {
    const [estate, setEstate] = useState<EstateSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            setEstate(await getEstateSummary());
            setError(null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Estate summary is unavailable.');
        }
    };

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => void load(), POLL_MS);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <main className={styles.page}>
            <NavigationBar />
            <section className={styles.hero}>
                <div>
                    <p className={styles.eyebrow}>APΩ Canonical Estate</p>
                    <h1>Decision-first control surface for the model, runtime, memory, and service fabric.</h1>
                    <p className={styles.supporting}>This surface reads the same proof-bound registries used by the estate router. It does not infer health from labels.</p>
                </div>
                <div className={`${styles.decision} ${estate?.decision === 'CANONICAL' ? styles.proven : styles.held}`}>
                    <span>Decision</span>
                    <strong>{estate?.decision || 'LOADING'}</strong>
                    <small>{estate?.state_change || 'UNKNOWN'}</small>
                </div>
            </section>

            {error && <div className={styles.error}>{error}</div>}

            <section className={styles.decisionGrid}>
                <article><span>Why</span><p>{estate?.why || 'Waiting for runtime evidence.'}</p></article>
                <article><span>Risk</span><p>{estate?.risk || 'Unknown until the registry responds.'}</p></article>
                <article><span>Outcome</span><p>{estate?.outcome || 'unknown'}</p></article>
                <article><span>State change</span><p>{estate?.state_change || 'UNKNOWN'}</p></article>
            </section>

            <section className={styles.metricGrid} aria-label="Estate registry counts">
                {Object.entries(estate?.counts || {}).map(([name, value]) => (
                    <article key={name} className={styles.metricCard}><strong>{value}</strong><span>{label(name)}</span></article>
                ))}
            </section>

            <section className={styles.section}>
                <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>Verification</p><h2>Mission gates</h2></div><span>{estate?.audit?.checked_at || 'not checked'}</span></div>
                <div className={styles.checkGrid}>
                    {Object.entries(estate?.audit?.checks || {}).map(([name, passed]) => (
                        <article key={name} className={styles.checkCard}><span className={stateClass(passed)}>{passed ? 'PROVEN' : 'HOLD'}</span><p>{label(name)}</p></article>
                    ))}
                </div>
            </section>

            <section className={styles.twoColumn}>
                <div className={styles.section}>
                    <div className={styles.sectionHeader}><h2>Nodes</h2><span>{estate?.nodes?.length || 0}</span></div>
                    <div className={styles.list}>
                        {(estate?.nodes || []).map((node) => (
                            <article key={node.id} className={styles.row}>
                                <div><strong>{node.id}</strong><small>{node.type} · {node.runtimes.join(', ') || 'no runtime'}</small></div>
                                <span className={stateClass(node.verified && node.persistent)}>{node.optional ? node.truth_state : node.verified && node.persistent ? 'PROVEN' : 'HOLD'}</span>
                            </article>
                        ))}
                    </div>
                </div>
                <div className={styles.section}>
                    <div className={styles.sectionHeader}><h2>Runtimes</h2><span>{estate?.runtimes?.length || 0}</span></div>
                    <div className={styles.list}>
                        {(estate?.runtimes || []).map((runtime) => (
                            <article key={runtime.id} className={styles.row}><div><strong>{runtime.id}</strong><small>health + restart persistence</small></div><span className={stateClass(runtime.healthy && runtime.persistent)}>{runtime.truth_state}</span></article>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.twoColumn}>
                <div className={styles.section}>
                    <div className={styles.sectionHeader}><h2>Memory fabric</h2><span>{estate?.memory?.length || 0}</span></div>
                    <div className={styles.list}>
                        {(estate?.memory || []).map((memory) => (
                            <article key={memory.id} className={styles.row}><div><strong>{memory.id}</strong><small>identity · read · write · replica</small></div><span className={stateClass(memory.identity_verified && memory.read_verified && memory.write_verified && memory.replicated)}>{memory.truth_state}</span></article>
                        ))}
                    </div>
                </div>
                <div className={styles.section}>
                    <div className={styles.sectionHeader}><h2>Explicit exclusions</h2><span>{estate?.excluded_models?.length || 0}</span></div>
                    <div className={styles.list}>
                        {(estate?.excluded_models || []).map((model) => (
                            <article key={model.id} className={styles.row}><div><strong>{model.id}</strong><small>{label(model.reason)}</small></div><span className={styles.held}>{model.truth_state}</span></article>
                        ))}
                    </div>
                </div>
            </section>

            <footer className={styles.footer}>Estate run: {estate?.canonical_state?.run_id || 'unknown'} · refreshed {estate?.estate_generated_at || 'unknown'} · UI polled {estate?.generated_at || 'unknown'}</footer>
        </main>
    );
};

export default Estate;
