import React, { useEffect, useMemo, useState } from 'react';
import {
    createWorkspaceMission,
    getWorkspaceConnectors,
    getWorkspaceGraph,
    getWorkspaceLanes,
    getWorkspaceMissions,
    getWorkspaceProof,
    getWorkspaceProviders,
    getWorkspaceRuntimes,
    getWorkspaceSession,
    routeWorkspaceChat,
    runWorkspaceTelegramNodeAction,
    setWorkspaceTelegramBotApiBaseUrl,
    setWorkspaceTelegramBotToken,
    triggerWorkspaceBotFatherReadback,
} from '../../services/api/workspaceAPI';
import {
    WorkspaceGraphNode,
    WorkspaceMissionBinding,
    WorkspaceProofResponse,
    WorkspaceProvidersResponse,
    WorkspaceRouteResponse,
    WorkspaceSessionResponse,
    WorkspaceLaneView,
} from '../../types/workspace.types';
import { NavigationBar } from '../user-interface/NavigationBar';
import styles from './WorkspaceShell.module.css';

type WorkbenchTab = 'overview' | 'missions' | 'systems' | 'proof' | 'providers';

interface WorkspaceShellProps {
    initialTab?: WorkbenchTab;
}

const POLL_MS = 15000;
const QUICK_PROMPTS = [
    'Tong hop trang thai he thong va lane dang tham gia',
    'Compare gemini_cli vs provider_reasoning cho yeu cau nay',
    'Promote task nay thanh mission va cho toi thay root + delegates',
    'Mo provider mode cho Azure/OpenAI routing',
];

const formatRole = (value?: string | null) => (value ? value.replace(/_/g, ' ') : 'none');

const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ initialTab = 'overview' }) => {
    const [activeTab, setActiveTab] = useState<WorkbenchTab>(initialTab);
    const [session, setSession] = useState<WorkspaceSessionResponse | null>(null);
    const [graph, setGraph] = useState<WorkspaceGraphNode[]>([]);
    const [lanes, setLanes] = useState<WorkspaceLaneView[]>([]);
    const [runtimes, setRuntimes] = useState<WorkspaceGraphNode[]>([]);
    const [connectors, setConnectors] = useState<WorkspaceGraphNode[]>([]);
    const [missions, setMissions] = useState<WorkspaceMissionBinding[]>([]);
    const [proof, setProof] = useState<WorkspaceProofResponse | null>(null);
    const [providers, setProviders] = useState<WorkspaceProvidersResponse | null>(null);
    const [draft, setDraft] = useState('');
    const [routing, setRouting] = useState<WorkspaceRouteResponse | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [telegramTokenDraft, setTelegramTokenDraft] = useState('');
    const [telegramBotApiBaseUrlDraft, setTelegramBotApiBaseUrlDraft] = useState('http://127.0.0.1:8081');
    const [telegramNodeTaskDraft, setTelegramNodeTaskDraft] = useState('{"action":"status"}');
    const [secretBusy, setSecretBusy] = useState(false);
    const [connectorBusy, setConnectorBusy] = useState(false);
    const [readbackBusy, setReadbackBusy] = useState(false);
    const [dispatchBusy, setDispatchBusy] = useState(false);

    const loadWorkspace = async () => {
        try {
            const [nextSession, nextGraph, nextLanes, nextRuntimes, nextConnectors, nextMissions, nextProof, nextProviders] = await Promise.all([
                getWorkspaceSession(),
                getWorkspaceGraph(),
                getWorkspaceLanes(),
                getWorkspaceRuntimes(),
                getWorkspaceConnectors(),
                getWorkspaceMissions(),
                getWorkspaceProof(),
                getWorkspaceProviders(),
            ]);
            setSession(nextSession);
            setGraph(nextGraph.nodes);
            setLanes(nextLanes.lanes);
            setRuntimes(nextRuntimes);
            setConnectors(nextConnectors);
            setMissions(nextMissions.bindings);
            setProof(nextProof);
            setProviders(nextProviders);
            setError(null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Workspace load failed.');
        }
    };

    useEffect(() => {
        void loadWorkspace();
        const interval = window.setInterval(() => {
            void loadWorkspace();
        }, POLL_MS);
        return () => window.clearInterval(interval);
    }, []);

    const handleRoute = async (message: string) => {
        if (!message.trim()) {
            return;
        }
        setBusy(true);
        try {
            const result = await routeWorkspaceChat(message.trim());
            setRouting(result);
            setDraft('');
            setActiveTab(
                result.mode === 'mission_mode'
                    ? 'missions'
                    : result.mode === 'provider_mode'
                        ? 'providers'
                        : result.mode === 'operator_mode'
                            ? 'proof'
                            : result.mode === 'parallel_compare_mode'
                                ? 'systems'
                                : 'overview',
            );
            setError(null);
            await loadWorkspace();
        } catch (routeError) {
            setError(routeError instanceof Error ? routeError.message : 'Routing failed.');
        } finally {
            setBusy(false);
        }
    };

    const promoteCurrentTask = async () => {
        const intent = routing?.mission_id || session?.session.current_mission_id || 'reasoning_request';
        await createWorkspaceMission({
            title: routing?.reply || draft || 'Workspace mission',
            intent,
            preferred_mode: 'mission_mode',
            requested_nodes: routing?.selected_nodes?.map((node) => node.node_id) || [],
        });
        await loadWorkspace();
        setActiveTab('missions');
    };

    const currentMission = useMemo(
        () => missions.find((mission) => mission.mission_id === (routing?.mission_id || session?.session.current_mission_id)),
        [missions, routing, session],
    );

    const visibleParticipants = routing?.selected_nodes || graph.filter((node) => node.node_id === currentMission?.mission_root);
    const driftCounts = proof?.drift_summary?.counts || session?.intelligence?.drift_counts || {};
    const maturityCounts = session?.intelligence?.maturity_level_counts || {};
    const controlSignals = session?.system_control?.filtered_signals || [];
    const controlActions = session?.system_control?.priority_actions || [];
    const telegramTokenState = session?.system_control?.credential_control?.telegram_bot_token;
    const telegramBotApiState = session?.system_control?.connector_control?.telegram_bot_api;
    const telegramNodeState = session?.system_control?.connector_control?.telegram_node;
    const botFatherLifecycleState = session?.system_control?.connector_control?.botfather_lifecycle;
    const projectState = session?.project_state;

    const runControlAction = (intent: string, tab: WorkbenchTab) => {
        setDraft(intent);
        setActiveTab(tab);
    };

    const submitTelegramToken = async () => {
        if (!telegramTokenDraft.trim()) {
            setError('Missing Telegram bot token.');
            return;
        }

        setSecretBusy(true);
        try {
            await setWorkspaceTelegramBotToken(telegramTokenDraft.trim(), true);
            setTelegramTokenDraft('');
            await loadWorkspace();
            setError(null);
        } catch (secretError) {
            setError(secretError instanceof Error ? secretError.message : 'Telegram token intake failed.');
        } finally {
            setSecretBusy(false);
        }
    };

    const submitTelegramBotApiBaseUrl = async () => {
        if (!telegramBotApiBaseUrlDraft.trim()) {
            setError('Missing Telegram Bot API base URL.');
            return;
        }

        setConnectorBusy(true);
        try {
            await setWorkspaceTelegramBotApiBaseUrl(telegramBotApiBaseUrlDraft.trim(), Boolean(telegramTokenState?.present), Boolean(telegramTokenState?.present));
            await loadWorkspace();
            setError(null);
        } catch (connectorError) {
            setError(connectorError instanceof Error ? connectorError.message : 'Telegram Bot API connector update failed.');
        } finally {
            setConnectorBusy(false);
        }
    };

    const triggerBotFatherReadback = async () => {
        setReadbackBusy(true);
        try {
            await triggerWorkspaceBotFatherReadback(undefined, 30);
            await loadWorkspace();
            setError(null);
        } catch (readbackError) {
            setError(readbackError instanceof Error ? readbackError.message : 'BotFather readback failed.');
        } finally {
            setReadbackBusy(false);
        }
    };

    const dispatchTelegramNodeTask = async () => {
        if (!telegramNodeTaskDraft.trim()) {
            setError('Missing Telegram node task JSON.');
            return;
        }

        setDispatchBusy(true);
        try {
            const parsedTask = JSON.parse(telegramNodeTaskDraft);
            await runWorkspaceTelegramNodeAction(parsedTask);
            await loadWorkspace();
            setError(null);
        } catch (dispatchError) {
            setError(dispatchError instanceof Error ? dispatchError.message : 'Telegram node dispatch failed.');
        } finally {
            setDispatchBusy(false);
        }
    };

    return (
        <div className={styles.workspacePage}>
            <NavigationBar />
            <div className={styles.workspaceShell}>
                <section className={styles.conversationCore}>
                    <div className={styles.heroBlock}>
                        <p className={styles.eyebrow}>HyperAI Unified Workspace</p>
                        <h1>Mot shell duy nhat cho nhieu AI, runtime, va mission cua chinh he thong.</h1>
                        <p className={styles.supportingText}>
                            Chat la trung tam. HyperAI tu chon conversation, compare, mission, provider, hoac operator mode theo task.
                        </p>
                        <div className={styles.metaRow}>
                            <span>Boundary: {session?.shell.boundary_state || 'unknown'}</span>
                            <span>Action: {session?.shell.selected_action || 'hold'}</span>
                            <span>Mode: {routing?.mode || session?.session.mode || 'conversation_mode'}</span>
                            <span>OODA: {session?.orchestration?.mode || 'preservation_only'}</span>
                            <span>Agent chain: {session?.orchestration?.agent_chain_status || 'not_requested'}</span>
                            <span>Law: {session?.creator_law?.status || 'unknown'}</span>
                            <span>TG packet: {session?.telegram_mastery?.current_packet || session?.intelligence?.current_packet || 'unknown'}</span>
                            <span>Coordination: {session?.local_model_coordination?.phase || session?.intelligence?.local_coordination_phase || 'unknown'}</span>
                        </div>
                    </div>

                    <div className={styles.chatComposer}>
                        <textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder="Nhap task, go @lane / @runtime / @mission neu can."
                            className={styles.input}
                        />
                        <div className={styles.actionRow}>
                            <button className={styles.primaryButton} onClick={() => void handleRoute(draft)} disabled={busy}>
                                {busy ? 'Dang route...' : 'Route task'}
                            </button>
                            <button className={styles.secondaryButton} onClick={() => void promoteCurrentTask()} disabled={!routing && !draft.trim()}>
                                Promote to mission
                            </button>
                        </div>
                        <div className={styles.quickPromptRow}>
                            {QUICK_PROMPTS.map((prompt) => (
                                <button key={prompt} className={styles.quickPrompt} onClick={() => setDraft(prompt)}>
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.responseCard}>
                        <div className={styles.responseHeader}>
                            <h2>Conversation Core</h2>
                            <span>{routing?.synthesis.strategy || 'waiting_for_route'}</span>
                        </div>
                        <p className={styles.responseText}>{routing?.reply || session?.session.last_route_summary || 'Chua co route moi. Dung companion rail de goi lane hoac bat dau bang chat.'}</p>
                        <div className={styles.participantGrid}>
                            {visibleParticipants.map((node) => (
                                <div key={node.node_id} className={styles.participantCard}>
                                    <strong>{node.label}</strong>
                                    <span>{node.orchestrator_family}</span>
                                    <span>{node.node_origin}</span>
                                    <span>proof: {node.proof_state.fresh ? 'fresh' : 'stale'}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.controlDeck}>
                        <div className={styles.controlHeader}>
                            <div>
                                <h2>System Control</h2>
                                <p>{session?.system_control?.objective || 'Workspace UI se dan tro thanh control surface chinh cho runtime truth.'}</p>
                            </div>
                            <span>{session?.system_control?.status || 'idle'}</span>
                        </div>
                        <div className={styles.controlSignalGrid}>
                            {controlSignals.map((signal) => (
                                <div key={`${signal.label}-${signal.value}`} className={styles.controlSignalCard}>
                                    <strong>{signal.label}</strong>
                                    <span>{signal.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.controlActionGrid}>
                            {controlActions.map((action) => (
                                <button
                                    key={action.id}
                                    type="button"
                                    className={styles.controlActionCard}
                                    onClick={() => runControlAction(action.intent, action.tab)}
                                >
                                    <strong>{action.label}</strong>
                                    <span>{action.reason}</span>
                                    <small>{action.tab}</small>
                                </button>
                            ))}
                        </div>
                        <div className={styles.secretControl}>
                            <div className={styles.secretHeader}>
                                <div>
                                    <h3>Telegram node health</h3>
                                    <p>Node state, registry, lane, and last proof surfaced from the connector contract.</p>
                                </div>
                                <span>{telegramNodeState?.lane_state || 'idle'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>connector: {telegramNodeState?.connector_id || 'telegram_connector_app'}</span>
                                <span>lane: {telegramNodeState?.active_lane || 'botfather_lifecycle_lane'}</span>
                                <span>engine: {telegramNodeState?.readback_engine_status || 'unknown'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>registry: {telegramNodeState?.bot_registry?.proven || 0}/{telegramNodeState?.bot_registry?.total || 0}</span>
                                <span>candidate: {telegramNodeState?.bot_registry?.candidate || 0}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>last proof: {telegramNodeState?.last_proof?.kind || 'none'}</span>
                                <span>status: {telegramNodeState?.last_proof?.status || 'unproven'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>artifact: {telegramNodeState?.last_proof?.artifact_path || 'none'}</span>
                            </div>
                            <div className={styles.secretForm}>
                                <textarea
                                    value={telegramNodeTaskDraft}
                                    onChange={(event) => setTelegramNodeTaskDraft(event.target.value)}
                                    className={styles.input}
                                    rows={4}
                                    placeholder='{"action":"status"}'
                                />
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() => void dispatchTelegramNodeTask()}
                                    disabled={dispatchBusy}
                                >
                                    {dispatchBusy ? 'Dang dispatch...' : 'Dispatch node task'}
                                </button>
                            </div>
                        </div>
                        <div className={styles.secretControl}>
                            <div className={styles.secretHeader}>
                                <div>
                                    <h3>Project state</h3>
                                    <p>Shared witness for token sync, dispatch proof, and current workspace focus.</p>
                                </div>
                                <span>{projectState?.current_focus || 'untracked'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>focus: {projectState?.current_focus || 'none'}</span>
                                <span>updated: {projectState?.last_updated || 'never'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>summary: {projectState?.latest_summary || 'none'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>token state: {projectState?.token_lifecycle_state || 'unknown'}</span>
                                <span>lane state: {projectState?.lane_state || 'unknown'}</span>
                            </div>
                        </div>
                        <div className={styles.secretControl}>
                            <div className={styles.secretHeader}>
                                <div>
                                    <h3>Telegram bot token intake</h3>
                                    <p>UI intake vao backend runtime de probe/discover, khong luu vao frontend storage.</p>
                                </div>
                                <span>{telegramTokenState?.present ? telegramTokenState?.source : 'missing'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>masked: {telegramTokenState?.masked || 'none'}</span>
                                <span>updated: {telegramTokenState?.updated_at || 'never'}</span>
                            </div>
                            <div className={styles.secretForm}>
                                <input
                                    type="password"
                                    value={telegramTokenDraft}
                                    onChange={(event) => setTelegramTokenDraft(event.target.value)}
                                    placeholder="Nhap TELEGRAM_BOT_TOKEN"
                                    className={styles.secretInput}
                                />
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() => void submitTelegramToken()}
                                    disabled={secretBusy}
                                >
                                    {secretBusy ? 'Dang probe...' : 'Load token'}
                                </button>
                            </div>
                        </div>
                        <div className={styles.secretControl}>
                            <div className={styles.secretHeader}>
                                <div>
                                    <h3>Telegram Bot API connector</h3>
                                    <p>Cloud mac dinh hoac local Bot API server theo docs Telegram; system se route probe/discover qua connector nay.</p>
                                </div>
                                <span>{telegramBotApiState?.validation?.status as string || telegramBotApiState?.source || 'unconfigured'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>base: {telegramBotApiState?.base_url || 'https://api.telegram.org'}</span>
                                <span>updated: {telegramBotApiState?.updated_at || 'never'}</span>
                            </div>
                            <div className={styles.secretForm}>
                                <input
                                    type="text"
                                    value={telegramBotApiBaseUrlDraft}
                                    onChange={(event) => setTelegramBotApiBaseUrlDraft(event.target.value)}
                                    placeholder="Nhap Telegram Bot API base URL"
                                    className={styles.secretInput}
                                />
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() => void submitTelegramBotApiBaseUrl()}
                                    disabled={connectorBusy}
                                >
                                    {connectorBusy ? 'Dang config...' : 'Set Bot API'}
                                </button>
                            </div>
                        </div>
                        <div className={styles.secretControl}>
                            <div className={styles.secretHeader}>
                                <div>
                                    <h3>BotFather lifecycle</h3>
                                    <p>Readback contract cho token lifecycle. UI chi trigger lane, backend/connector moi duoc sync token vao runtime.</p>
                                </div>
                                <span>{botFatherLifecycleState?.token_lifecycle_state || 'awaiting_readback'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>lane: {botFatherLifecycleState?.active_lane || 'botfather_lifecycle_lane'}</span>
                                <span>readback: {botFatherLifecycleState?.readback_mode || 'ocr_bounded'}</span>
                                <span>engine: {botFatherLifecycleState?.readback_engine_status || 'unknown'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>artifact: {botFatherLifecycleState?.next_required_artifact || 'bot_token_proof'}</span>
                                <span>status: {botFatherLifecycleState?.last_readback_status || 'unproven'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>capture: {botFatherLifecycleState?.last_capture_path || 'none'}</span>
                            </div>
                            <div className={styles.secretMeta}>
                                <span>matches: {botFatherLifecycleState?.last_readback_matches?.join(', ') || 'none'}</span>
                            </div>
                            <div className={styles.secretForm}>
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() => void triggerBotFatherReadback()}
                                    disabled={readbackBusy}
                                >
                                    {readbackBusy ? 'Dang readback...' : 'Read token from BotFather'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <aside className={styles.companionRail}>
                    <div className={styles.railSection}>
                        <h2>Companion Rail</h2>
                        <p>{String(session?.companion.preferred_approval_surface?.process_name || 'No preferred approval surface detected.')}</p>
                        <p className={styles.smallText}>Active creator surfaces: {session?.companion.active_creator_surfaces.length || 0}</p>
                    </div>
                    <div className={styles.railSection}>
                        <h3>AI lanes</h3>
                        {lanes.slice(0, 8).map((lane) => (
                            <button key={lane.lane_id} className={styles.railItem} onClick={() => setDraft(`@${lane.lane_id} `)}>
                                <span>{lane.label}</span>
                                <small>{formatRole(lane.current_mission_role)}</small>
                            </button>
                        ))}
                    </div>
                    <div className={styles.railSection}>
                        <h3>Status + Proof</h3>
                        {proof?.proof_timeline.map((item) => (
                            <div key={item.id} className={styles.statusRow}>
                                <strong>{item.label}</strong>
                                <span>{item.status}</span>
                                <small>{item.detail}</small>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>

            <section className={styles.workbench}>
                <div className={styles.tabRow}>
                    {[
                        ['overview', 'Overview'],
                        ['missions', 'Missions'],
                        ['systems', 'Systems'],
                        ['proof', 'Proof'],
                        ['providers', 'Providers'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            className={activeTab === value ? styles.activeTab : styles.tab}
                            onClick={() => setActiveTab(value as WorkbenchTab)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === 'overview' && (
                    <div className={styles.tabPanel}>
                        <h2>Workspace Overview</h2>
                        <div className={styles.panelGrid}>
                            <div className={styles.panelCard}>
                                <h3>Adaptive workbench</h3>
                                <p>Current mission root: {currentMission?.mission_root || 'none'}.</p>
                                <p>Current router: {currentMission?.mission_router || 'none'}.</p>
                                <p>Evidence owner: {currentMission?.evidence_recorder || 'none'}.</p>
                            </div>
                            <div className={styles.panelCard}>
                                <h3>System-owned runtimes</h3>
                                <p>{runtimes.length} runtime nodes available in the workspace graph.</p>
                                <p>System-owned app runtimes duoc render nhu sub-workspaces, khong chi la connector.</p>
                            </div>
                            <div className={styles.panelCard}>
                                <h3>Observed collisions</h3>
                                <p>{proof?.collisions.length || 0} collision(s) in drift guard.</p>
                                <p>{error || 'Workspace shell dang on dinh.'}</p>
                            </div>
                            <div className={styles.panelCard}>
                                <h3>Telegram mastery</h3>
                                <p>status: {session?.telegram_mastery?.status || session?.intelligence?.telegram_mastery_status || 'unknown'}</p>
                                <p>error: {session?.telegram_mastery?.telegram_error ?? session?.intelligence?.telegram_error ?? 'n/a'}</p>
                                <p>current packet: {session?.telegram_mastery?.current_packet || session?.intelligence?.current_packet || 'unknown'}</p>
                            </div>
                            <div className={styles.panelCard}>
                                <h3>Local model coordination</h3>
                                <p>phase: {session?.local_model_coordination?.phase || session?.intelligence?.local_coordination_phase || 'unknown'}</p>
                                <p>handoff: {session?.local_model_coordination?.handoff_rule || 'unknown'}</p>
                                <p>authority: {session?.local_model_coordination?.decision_authority || 'unknown'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'missions' && (
                    <div className={styles.tabPanel}>
                        <h2>Mission Board</h2>
                        <div className={styles.listGrid}>
                            {missions.map((mission) => (
                                <div key={mission.mission_id} className={styles.listCard}>
                                    <h3>{mission.mission_id}</h3>
                                    <p>root: {mission.mission_root || 'none'}</p>
                                    <p>router: {mission.mission_router || 'none'}</p>
                                    <p>execution: {mission.execution_adapter || 'none'}</p>
                                    <p>evidence: {mission.evidence_recorder || 'none'}</p>
                                    <p>mode: {mission.mode_hint || 'mission_mode'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'systems' && (
                    <div className={styles.tabPanel}>
                        <h2>System Graph</h2>
                        <div className={styles.listGrid}>
                            {runtimes.concat(connectors).map((node) => (
                                <div key={node.node_id} className={styles.listCard}>
                                    <h3>{node.label}</h3>
                                    <p>{node.orchestrator_family}</p>
                                    <p>authority: {node.authority_class}</p>
                                    <p>origin: {node.node_origin}</p>
                                    <p>status: {node.status}</p>
                                     <p>maturity: {node.current_maturity || 'unmapped'}</p>
                                     <p>connector: {node.connector_binding || 'unbound'}</p>
                                    <p>roles: {node.allowed_mission_roles.join(', ') || 'none'}</p>
                                    <p>proof: {node.proof_state.fresh ? 'fresh' : 'stale'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'proof' && (
                    <div className={styles.tabPanel}>
                        <h2>Proof Rail</h2>
                        <div className={styles.listGrid}>
                            {proof?.mission_roots.map((item) => (
                                <div key={item.node_id} className={styles.listCard}>
                                    <h3>{item.node_id}</h3>
                                    <p>status: {item.status}</p>
                                    <p>proof exists: {item.proof.exists ? 'yes' : 'no'}</p>
                                    <p>proof fresh: {item.proof.fresh ? 'yes' : 'no'}</p>
                                </div>
                            ))}
                            {(proof?.drift_summary?.items || []).map((item, index) => (
                                <div key={`${String(item.node_id || 'drift')}-${index}`} className={styles.listCard}>
                                    <h3>{String(item.drift_class || 'drift')}</h3>
                                    <p>scope: {String(item.scope || 'unknown')}</p>
                                    <p>node: {String(item.node_id || 'n/a')}</p>
                                    <p>severity: {String(item.severity || 'info')}</p>
                                    <p>{String(item.detail || '')}</p>
                                </div>
                            ))}
                            <div className={styles.listCard}>
                                <h3>Telegram mastery control</h3>
                                <p>status: {proof?.telegram_mastery?.status || 'unknown'}</p>
                                <p>error: {proof?.telegram_mastery?.telegram_error ?? 'n/a'}</p>
                                <p>variable: {proof?.telegram_mastery?.current_variable || 'unknown'}</p>
                                <p>packet: {proof?.telegram_mastery?.current_packet || 'unknown'}</p>
                            </div>
                            <div className={styles.listCard}>
                                <h3>Local coordination contract</h3>
                                <p>phase: {proof?.local_model_coordination?.phase || 'unknown'}</p>
                                <p>handoff: {proof?.local_model_coordination?.handoff_rule || 'unknown'}</p>
                                <p>authority: {proof?.local_model_coordination?.decision_authority || 'unknown'}</p>
                            </div>
                            {(proof?.telegram_mastery?.blocking_factors || []).slice(0, 3).map((item, index) => (
                                <div key={`telegram-blocker-${index}`} className={styles.listCard}>
                                    <h3>{String(item.variable || 'telegram_blocker')}</h3>
                                    <p>packet: {String(item.packet_id || 'unknown')}</p>
                                    <p>{String(item.blocker || '')}</p>
                                    <p>success: {String(item.success_condition || '')}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'providers' && (
                    <div className={styles.tabPanel}>
                        <h2>Provider Surface</h2>
                        <div className={styles.listGrid}>
                            {providers?.providers.map((provider) => (
                                <div key={provider.node_id} className={styles.listCard}>
                                    <h3>{provider.label}</h3>
                                    <p>status: {provider.status}</p>
                                    <p>reasoning: {provider.reasoning_capability.join(', ') || 'none'}</p>
                                    <p>behavior: {provider.behavior_capability.join(', ') || 'none'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
            <section className={styles.workspaceIntelligence}>
                <div className={styles.intelligenceCard}>
                    <h2>Drift summary</h2>
                    <p>status: {proof?.drift_summary?.status || session?.intelligence?.drift_status || 'unknown'}</p>
                    <p>critical: {driftCounts.critical || 0}</p>
                    <p>warning: {driftCounts.warning || 0}</p>
                    <p>total: {driftCounts.total || 0}</p>
                </div>
                <div className={styles.intelligenceCard}>
                    <h2>Maturity map</h2>
                    <p>L5 roots: {maturityCounts.L5 || 0}</p>
                    <p>L4 adapters: {maturityCounts.L4 || 0}</p>
                    <p>L3 workers: {maturityCounts.L3 || 0}</p>
                    <p>L0 observed: {maturityCounts.L0 || 0}</p>
                </div>
                <div className={styles.intelligenceCard}>
                    <h2>Creator-defined law</h2>
                    <p>status: {session?.creator_law?.status || session?.intelligence?.creator_law_status || 'unknown'}</p>
                    <p>error score: {session?.creator_law?.error_score ?? session?.intelligence?.creator_law_error_score ?? 'n/a'}</p>
                    <p>claim validity: {session?.creator_law?.claim_validity || 'Proof + Mapping + Gate'}</p>
                </div>
                <div className={styles.intelligenceCard}>
                    <h2>Telegram mastery OODA</h2>
                    <p>status: {session?.telegram_mastery?.status || session?.intelligence?.telegram_mastery_status || 'unknown'}</p>
                    <p>telegram error: {session?.telegram_mastery?.telegram_error ?? session?.intelligence?.telegram_error ?? 'n/a'}</p>
                    <p>packet: {session?.telegram_mastery?.current_packet || session?.intelligence?.current_packet || 'unknown'}</p>
                    <p>blocker: {session?.telegram_mastery?.blocking_factor || 'none'}</p>
                </div>
                <div className={styles.intelligenceCard}>
                    <h2>Local LLM coordination</h2>
                    <p>phase: {session?.local_model_coordination?.phase || session?.intelligence?.local_coordination_phase || 'unknown'}</p>
                    <p>router: {String(session?.local_model_coordination?.router_model?.model_id || 'unknown')}</p>
                    <p>specialist: {String(session?.local_model_coordination?.specialist_model?.model_id || 'unknown')}</p>
                    <p>auditor: {String(session?.local_model_coordination?.auditor_model?.model_id || 'unknown')}</p>
                    <p>prior control: {String(session?.local_model_coordination?.bias_control?.fallback_rule || 'unknown')}</p>
                    <p>truth order: {String(session?.local_model_coordination?.epistemic_policy?.runtime_truth_priority?.[0] || 'unknown')}</p>
                </div>
                <div className={styles.intelligenceCard}>
                    <h2>Connectorized CLI fabric</h2>
                    <p>connectors: {session?.intelligence?.connector_count || 0}</p>
                    <p>cli tools: {session?.intelligence?.cli_tool_count || 0}</p>
                    <p>raw surfaces: {session?.intelligence?.raw_surface_count || 0}</p>
                    <p>meaningful groups: {session?.intelligence?.meaningful_groups || 0}</p>
                </div>
            </section>
        </div>
    );
};

export default WorkspaceShell;
