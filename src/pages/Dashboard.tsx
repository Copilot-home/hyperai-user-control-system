import React, { useEffect, useState } from 'react';
import { AutonomyPanel } from '../components/control-panel/AutonomyPanel';
import { SymphonyDashboard } from '../components/control-panel/SymphonyDashboard';
import { RuntimeLaneStatus } from '../components/control-panel/RuntimeLaneStatus';
import { NavigationBar } from '../components/user-interface/NavigationBar';
import { NotificationCenter } from '../components/user-interface/NotificationCenter';
import { UserProfile } from '../components/user-interface/UserProfile';
import { useAutonomy } from '../hooks/useAutonomy';
import styles from '../styles/empathy.module.css';

type EcosystemSurfaceStatus = {
    status: string;
    detail?: string;
    compatibility?: {
        substrate_api?: string;
        models_api?: string;
        responses_api?: string;
    };
    observed_callers?: Array<{
        id: string;
        label: string;
        file_path: string;
        proof: string;
        risk: string;
    }>;
    summary?: {
        state?: string;
        module_count?: number;
        queue_depth?: number;
    };
    processed_count?: number;
    last_processed_at?: string | null;
    heartbeat?: {
        status?: string;
        detail?: string;
        at?: string;
    } | null;
    gh_cli?: string;
    gh_probe_status?: string;
    gh_binary_path?: string | null;
    gh_source?: string | null;
    browser_app_status?: string;
    browser_app_id?: string;
    browser_app_origin?: string;
    browser_app_installed?: boolean;
    browser_app_scope?: string | null;
    browser_app_last_used_at?: string | null;
    browser_app_source?: string | null;
    browser_app_profiles?: string[];
    browser_app_link_capture?: boolean;
    git_worktree?: string;
    git_name?: string | null;
    git_email?: string | null;
    identity_scope?: string | null;
    preferred_lineage?: {
        path: string;
        remote_url?: string | null;
        branch?: string | null;
        role?: string;
    } | null;
    lineage_candidates?: Array<{
        path: string;
        remote_url?: string | null;
        branch?: string | null;
        role?: string;
        has_git: boolean;
    }>;
    ci_workflow?: string;
    identity_workflow?: string;
    release_workflow?: string;
    workflow_count?: number;
    agent_mode?: string;
    query_ready?: boolean;
    attachment_gate_a?: string;
    attachment_gate_b?: string;
    attachment_recommendation?: string | null;
    models?: number | null;
    services?: Array<{
        port: number;
        url: string;
        status: string;
        detail: string;
    }>;
};

type EcosystemStatus = {
    status: string;
    generated_at: string;
    surfaces: {
        omega_system?: EcosystemSurfaceStatus;
        emergency_bridge?: EcosystemSurfaceStatus;
        github?: EcosystemSurfaceStatus;
        ollama?: EcosystemSurfaceStatus;
        aidev?: EcosystemSurfaceStatus;
    };
};

const ECOSYSTEM_POLL_MS = 30000;

const Dashboard: React.FC = () => {
    const { boundaryState, runtimeCapabilities } = useAutonomy();
    const [ecosystemStatus, setEcosystemStatus] = useState<EcosystemStatus | null>(null);
    const [ecosystemError, setEcosystemError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const fetchEcosystem = async () => {
            try {
                const response = await fetch('/api/runtime/ecosystem');
                if (!response.ok) {
                    throw new Error(`Ecosystem fetch failed (${response.status})`);
                }
                const payload: EcosystemStatus = await response.json();
                if (active) {
                    setEcosystemStatus(payload);
                    setEcosystemError(null);
                }
            } catch (error) {
                if (active) {
                    setEcosystemError(error instanceof Error ? error.message : 'Unknown error');
                }
            }
        };

        fetchEcosystem();
        const interval = setInterval(fetchEcosystem, ECOSYSTEM_POLL_MS);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <div className={styles.dashboardContainer}>
            <NavigationBar />
            <div className={styles.empathyContainer}>
                <h1 className={styles.empathyHeader}>HyperAI Symphony Core</h1>
                <p className={styles.empathyMessage}>
                    This dashboard reflects the active autonomy and symphony control plane exposed by the current backend runtime.
                </p>
                <p className={styles.empathyFooter}>
                    Chat remains degraded. Settings are local-only. Non-core lanes stay hidden from primary navigation until runtime authority is fresh and their browser contract is deliberately widened.
                </p>
            </div>
            <div className={styles.empathyContainer}>
                <h2 className={styles.empathyHeader}>Boundary State</h2>
                <p className={styles.empathyMessage}>
                    `hyperai-user-control-system` is currently {boundaryState?.state ?? 'unclassified'} for local-first execution.
                </p>
                <p className={styles.empathyFooter}>
                    {boundaryState?.classificationReason ?? 'Boundary classifier is still gathering proof signals.'}
                </p>
                <p className={styles.empathyFooter}>
                    Recovery action: {boundaryState?.recoveryAction ?? 'none'}. Runtime authority:{' '}
                    {runtimeCapabilities?.runtime_authority?.summary ?? 'pending'}.
                </p>
                <p className={styles.empathyFooter}>
                    Safe recovery available: {runtimeCapabilities?.safe_recovery_available ? 'yes' : 'no'}. Selected action:{' '}
                    {runtimeCapabilities?.selected_action ?? 'hold'}.
                </p>
            </div>
            <UserProfile />
            <NotificationCenter />
            <SymphonyDashboard />
            <AutonomyPanel />
            <RuntimeLaneStatus />
            <div className={styles.empathyContainer}>
                <h2 className={styles.empathyHeader}>Ecosystem Runtime Surfaces</h2>
                {ecosystemStatus ? (
                    <>
                        <p className={styles.empathyMessage}>
                            Snapshot generated at {new Date(ecosystemStatus.generated_at).toLocaleString()}.
                        </p>
                        <p className={styles.empathyFooter}>
                            Omega system:{' '}
                            {ecosystemStatus.surfaces.omega_system?.status === 'ok'
                                ? `state ${ecosystemStatus.surfaces.omega_system.summary?.state || 'unknown'}, modules ${ecosystemStatus.surfaces.omega_system.summary?.module_count ?? 'n/a'}, queue ${ecosystemStatus.surfaces.omega_system.summary?.queue_depth ?? 'n/a'}`
                                : (ecosystemStatus.surfaces.omega_system?.detail || 'not available')}
                        </p>
                        <p className={styles.empathyFooter}>
                            Emergency bridge:{' '}
                            {ecosystemStatus.surfaces.emergency_bridge?.status === 'ok'
                                ? `processed ${ecosystemStatus.surfaces.emergency_bridge.processed_count ?? 0}, last ${ecosystemStatus.surfaces.emergency_bridge.last_processed_at || 'n/a'}`
                                : (ecosystemStatus.surfaces.emergency_bridge?.detail || 'not available')}
                        </p>
                        {ecosystemStatus.surfaces.emergency_bridge?.heartbeat && (
                            <p className={styles.empathyFooter}>
                                Bridge heartbeat: {ecosystemStatus.surfaces.emergency_bridge.heartbeat.status || 'unknown'}{' '}
                                {ecosystemStatus.surfaces.emergency_bridge.heartbeat.at || ''}
                            </p>
                        )}
                        <p className={styles.empathyFooter}>
                            GitHub surface:{' '}
                            {ecosystemStatus.surfaces.github
                                ? `${ecosystemStatus.surfaces.github.status}; mode ${ecosystemStatus.surfaces.github.agent_mode || 'unknown'}, gh ${ecosystemStatus.surfaces.github.gh_cli || 'unknown'}, git ${ecosystemStatus.surfaces.github.git_worktree || 'unknown'}, ci ${ecosystemStatus.surfaces.github.ci_workflow || 'unknown'}, workflows ${ecosystemStatus.surfaces.github.workflow_count ?? 'n/a'}`
                                : 'not available'}
                        </p>
                        <p className={styles.empathyFooter}>
                            {ecosystemStatus.surfaces.github?.detail || 'GitHub capability state has not been classified yet.'}{' '}
                            Query ready: {ecosystemStatus.surfaces.github?.query_ready ? 'yes' : 'no'}.
                        </p>
                        <p className={styles.empathyFooter}>
                            GitHub CLI readiness:{' '}
                            {ecosystemStatus.surfaces.github?.gh_probe_status || 'unknown'}{' '}
                            via {ecosystemStatus.surfaces.github?.gh_source || 'unknown'}{' '}
                            {ecosystemStatus.surfaces.github?.gh_binary_path ? `(${ecosystemStatus.surfaces.github.gh_binary_path})` : ''}
                        </p>
                        <p className={styles.empathyFooter}>
                            GitHub browser app:{' '}
                            {ecosystemStatus.surfaces.github?.browser_app_status || 'unknown'}{' '}
                            {ecosystemStatus.surfaces.github?.browser_app_origin || 'unknown-origin'}{' '}
                            {ecosystemStatus.surfaces.github?.browser_app_installed
                                ? `(id ${ecosystemStatus.surfaces.github.browser_app_id || 'unknown'}, link-capture ${ecosystemStatus.surfaces.github.browser_app_link_capture ? 'yes' : 'no'})`
                                : ''}
                        </p>
                        <p className={styles.empathyFooter}>
                            Browser-app authority:{' '}
                            {ecosystemStatus.surfaces.github?.browser_app_source || 'unknown'}{' '}
                            {ecosystemStatus.surfaces.github?.browser_app_scope
                                ? `scope ${ecosystemStatus.surfaces.github.browser_app_scope}`
                                : ''}{' '}
                            {ecosystemStatus.surfaces.github?.browser_app_profiles?.length
                                ? `profiles ${ecosystemStatus.surfaces.github.browser_app_profiles.join(', ')}`
                                : ''}
                        </p>
                        <p className={styles.empathyFooter}>
                            Git identity:{' '}
                            {ecosystemStatus.surfaces.github?.git_name && ecosystemStatus.surfaces.github?.git_email
                                ? `${ecosystemStatus.surfaces.github.git_name} <${ecosystemStatus.surfaces.github.git_email}>`
                                : 'not configured'}{' '}
                            via {ecosystemStatus.surfaces.github?.identity_scope || 'unknown'}.
                        </p>
                        <p className={styles.empathyFooter}>
                            Preferred git lineage:{' '}
                            {ecosystemStatus.surfaces.github?.preferred_lineage
                                ? `${ecosystemStatus.surfaces.github.preferred_lineage.path} -> ${ecosystemStatus.surfaces.github.preferred_lineage.remote_url || 'no remote'}`
                                : 'not classified'}
                        </p>
                        <p className={styles.empathyFooter}>
                            Lineage candidates:{' '}
                            {ecosystemStatus.surfaces.github?.lineage_candidates?.length
                                ? ecosystemStatus.surfaces.github.lineage_candidates
                                    .map((candidate) => `${candidate.role}:${candidate.has_git ? 'git' : 'nogit'}`)
                                    .join(', ')
                                : 'none'}
                        </p>
                        <p className={styles.empathyFooter}>
                            Attachment gates:{' '}
                            A={ecosystemStatus.surfaces.github?.attachment_gate_a || 'unknown'}, B={ecosystemStatus.surfaces.github?.attachment_gate_b || 'unknown'}, recommendation={ecosystemStatus.surfaces.github?.attachment_recommendation || 'unknown'}.
                        </p>
                        <p className={styles.empathyFooter}>
                            Ollama:{' '}
                            {ecosystemStatus.surfaces.ollama?.status === 'ok'
                                ? `models ${ecosystemStatus.surfaces.ollama.models ?? 'n/a'}`
                                : (ecosystemStatus.surfaces.ollama?.detail || 'not available')}
                        </p>
                        {ecosystemStatus.surfaces.ollama?.compatibility && (
                            <p className={styles.empathyFooter}>
                                Local model API compatibility:{' '}
                                substrate {ecosystemStatus.surfaces.ollama.compatibility.substrate_api || 'unknown'},{' '}
                                models {ecosystemStatus.surfaces.ollama.compatibility.models_api || 'unknown'},{' '}
                                responses {ecosystemStatus.surfaces.ollama.compatibility.responses_api || 'unknown'}.
                            </p>
                        )}
                        {ecosystemStatus.surfaces.ollama?.detail && (
                            <p className={styles.empathyFooter}>
                                {ecosystemStatus.surfaces.ollama.detail}
                            </p>
                        )}
                        {ecosystemStatus.surfaces.ollama?.observed_callers?.length ? (
                            <p className={styles.empathyFooter}>
                                Observed local callers:{' '}
                                {ecosystemStatus.surfaces.ollama.observed_callers
                                    .map((caller) => `${caller.label} (${caller.proof}; ${caller.risk})`)
                                    .join(', ')}
                            </p>
                        ) : null}
                        <p className={styles.empathyFooter}>
                            Aidev runtime:{' '}
                            {ecosystemStatus.surfaces.aidev?.services?.length
                                ? ecosystemStatus.surfaces.aidev.services.map((service) => `${service.port}=${service.status}`).join(', ')
                                : (ecosystemStatus.surfaces.aidev?.detail || ecosystemStatus.surfaces.aidev?.status || 'not available')}
                        </p>
                    </>
                ) : (
                    <p className={styles.empathyMessage}>
                        {ecosystemError ? `Unable to load ecosystem status: ${ecosystemError}` : 'Loading ecosystem status...'}
                    </p>
                )}
            </div>
            <div className={styles.empathyContainer}>
                <h2 className={styles.empathyHeader}>Frozen Lanes</h2>
                <p className={styles.empathyMessage}>
                    The browser shell still treats empathy, Vietnamese analysis, NotebookLM, and websocket telemetry as non-core lanes even when the backend stub exposes probeable contracts.
                </p>
                <p className={styles.empathyFooter}>
                    Those surfaces stay quarantined, degraded, or local-only until runtime authority is fresh and the shell explicitly promotes them.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
