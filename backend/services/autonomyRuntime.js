const fs = require('fs');
const path = require('path');

const runtimeDir = path.resolve(__dirname, '../../..', 'runtime');
const statePath = path.join(runtimeDir, 'hyperai-autonomy-state.json');

class AutonomyRuntime {
    constructor() {
        const defaults = this.createDefaults();

        this.objectives = defaults.objectives;
        this.state = defaults.state;
        this.executionHistory = defaults.executionHistory;
        this.decisionHistory = defaults.decisionHistory;
        this.latestProbeSummary = defaults.latestProbeSummary;
        this.objectiveSnapshots = defaults.objectiveSnapshots;
        this.loopHandle = null;
        this.probeRunner = null;
        this.recoveryRunner = null;

        this.restore();
        this.persist('restore');
    }

    createDefaults() {
        const objectives = [
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
            {
                id: 'protect-user-context',
                title: 'Protect user context',
                priority: 'high',
                status: 'pending',
                detail: 'Retain operator intent and recent state transitions.',
            },
        ];
        const state = {
            active: false,
            mode: 'standby',
            currentObjectiveId: objectives[0].id,
            lastAction: 'system initialized',
            lastTickAt: null,
            heartbeat: {
                source: 'bootstrap',
                status: 'unknown',
                detail: 'No heartbeat received yet.',
                at: new Date().toISOString(),
            },
            metrics: {
                ticks: 0,
                recoveredIncidents: 0,
                blockedIncidents: 0,
                probeCycles: 0,
                healthyProbeCycles: 0,
                degradedProbeCycles: 0,
                criticalProbeCycles: 0,
            },
            recentActions: [],
            persistence: {
                restoredFromDisk: false,
                lastPersistedAt: null,
                statePath,
            },
        };
        return {
            objectives,
            state,
            executionHistory: [],
            decisionHistory: [],
            latestProbeSummary: {
                overallStatus: 'unknown',
                checkedAt: null,
                probes: [],
            },
            objectiveSnapshots: [],
        };
    }

    restore() {
        if (!fs.existsSync(statePath)) {
            return;
        }

        try {
            const persisted = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            if (Array.isArray(persisted.objectives) && persisted.objectives.length > 0) {
                this.objectives = persisted.objectives;
            }
            if (persisted.state && typeof persisted.state === 'object') {
                this.state = {
                    ...this.state,
                    ...persisted.state,
                    heartbeat: {
                        ...this.state.heartbeat,
                        ...(persisted.state.heartbeat || {}),
                    },
                    metrics: {
                        ...this.state.metrics,
                        ...(persisted.state.metrics || {}),
                    },
                    recentActions: Array.isArray(persisted.state.recentActions)
                        ? persisted.state.recentActions.slice(0, 12)
                        : this.state.recentActions,
                    persistence: {
                        ...this.state.persistence,
                        ...(persisted.state.persistence || {}),
                        restoredFromDisk: true,
                        statePath,
                    },
                };
            }
            if (Array.isArray(persisted.executionHistory)) {
                this.executionHistory = persisted.executionHistory
                    .slice(0, 20)
                    .map((entry) => this.sanitizeExecutionRecord(entry));
            }
            if (Array.isArray(persisted.decisionHistory)) {
                this.decisionHistory = persisted.decisionHistory.slice(0, 20).map((entry) => ({
                    at: entry?.at || new Date().toISOString(),
                    source: entry?.source || 'unknown',
                    status: entry?.status || 'unknown',
                    action: entry?.action || 'unknown',
                    detail: entry?.detail || '',
                }));
            }
            if (persisted.latestProbeSummary && typeof persisted.latestProbeSummary === 'object') {
                this.latestProbeSummary = this.sanitizeProbeSummary(persisted.latestProbeSummary);
            }
            if (Array.isArray(persisted.objectiveSnapshots)) {
                this.objectiveSnapshots = persisted.objectiveSnapshots.slice(0, 20).map((snapshot) => ({
                    at: snapshot?.at || new Date().toISOString(),
                    reason: snapshot?.reason || 'restored',
                    mode: snapshot?.mode || 'standby',
                    active: Boolean(snapshot?.active),
                    currentObjective: snapshot?.currentObjective || null,
                    heartbeat: snapshot?.heartbeat || this.state.heartbeat,
                    metrics: snapshot?.metrics || this.state.metrics,
                    lastAction: snapshot?.lastAction || 'restored snapshot',
                }));
            }
            this.recordAction('persistence', 'autonomy runtime state restored from disk');
        } catch (error) {
            this.recordAction(
                'persistence',
                `autonomy runtime restore failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    persist(reason = 'state-change') {
        try {
            fs.mkdirSync(runtimeDir, { recursive: true });
            const persistedAt = new Date().toISOString();
            this.state.persistence = {
                ...this.state.persistence,
                restoredFromDisk: this.state.persistence?.restoredFromDisk ?? false,
                lastPersistedAt: persistedAt,
                lastReason: reason,
                statePath,
            };
            const payload = {
                persistedAt,
                reason,
                objectives: this.objectives,
                state: this.state,
                executionHistory: this.executionHistory,
                decisionHistory: this.decisionHistory,
                latestProbeSummary: this.latestProbeSummary,
                objectiveSnapshots: this.objectiveSnapshots,
            };
            fs.writeFileSync(statePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
        } catch (error) {
            this.state.recentActions.unshift({
                type: 'persistence-error',
                detail: error instanceof Error ? error.message : String(error),
                at: new Date().toISOString(),
            });
            this.state.recentActions = this.state.recentActions.slice(0, 12);
        }
    }

    captureObjectiveSnapshot(reason = 'state-change') {
        const snapshot = {
            at: new Date().toISOString(),
            reason,
            mode: this.state.mode,
            active: this.state.active,
            currentObjective: this.getCurrentObjective(),
            heartbeat: this.state.heartbeat,
            metrics: this.state.metrics,
            lastAction: this.state.lastAction,
        };
        this.objectiveSnapshots.unshift(snapshot);
        this.objectiveSnapshots = this.objectiveSnapshots.slice(0, 20);
        return snapshot;
    }

    recordAction(type, detail) {
        const action = { type, detail, at: new Date().toISOString() };
        this.state.lastAction = detail;
        this.state.recentActions.unshift(action);
        this.state.recentActions = this.state.recentActions.slice(0, 12);
        return action;
    }

    getCurrentObjective() {
        return this.objectives.find((objective) => objective.id === this.state.currentObjectiveId) || null;
    }

    deriveMode() {
        if (!this.state.active) {
            return 'standby';
        }
        if (this.state.heartbeat.status === 'critical') {
            return 'recovering';
        }
        if (this.state.heartbeat.status === 'degraded') {
            return 'stabilizing';
        }
        return 'autonomous';
    }

    configure({ probeRunner, recoveryRunner } = {}) {
        if (typeof probeRunner === 'function') {
            this.probeRunner = probeRunner;
        }
        if (typeof recoveryRunner === 'function') {
            this.recoveryRunner = recoveryRunner;
        }
        this.persist('configure');
    }

    summarizePayload(payload) {
        if (payload == null) {
            return payload;
        }

        if (Array.isArray(payload)) {
            return payload.slice(0, 5).map((entry) => this.summarizePayload(entry));
        }

        if (typeof payload !== 'object') {
            return payload;
        }

        const summary = {};
        const keys = [
            'status',
            'message',
            'detail',
            'classification',
            'boundary_state',
            'selected_action',
            'reason',
            'mode',
            'active',
            'endpoint',
            'healthy',
        ];

        for (const key of keys) {
            if (payload[key] !== undefined) {
                summary[key] = payload[key];
            }
        }

        if (payload.metrics && typeof payload.metrics === 'object') {
            summary.metrics = {
                ticks: payload.metrics.ticks ?? 0,
                probeCycles: payload.metrics.probeCycles ?? 0,
            };
        }

        return Object.keys(summary).length ? summary : { type: payload.constructor?.name || 'object' };
    }

    sanitizeProbeSummary(summary = {}) {
        return {
            overallStatus: summary.overallStatus || 'unknown',
            checkedAt: summary.checkedAt || new Date().toISOString(),
            probes: Array.isArray(summary.probes)
                ? summary.probes.slice(0, 12).map((probe) => ({
                    id: probe?.id || 'unknown',
                    status: probe?.status || 'unknown',
                    detail: probe?.detail || '',
                    payload: this.summarizePayload(probe?.payload),
                }))
                : [],
        };
    }

    sanitizeExecutionRecord(record = {}) {
        return {
            source: record?.source || 'unknown',
            startedAt: record?.startedAt || null,
            completedAt: record?.completedAt || null,
            status: record?.status || 'unknown',
            probeSummary: record?.probeSummary ? this.sanitizeProbeSummary(record.probeSummary) : null,
            stateSummary: record?.stateSummary || null,
        };
    }

    appendExecution(record) {
        this.executionHistory.unshift(this.sanitizeExecutionRecord(record));
        this.executionHistory = this.executionHistory.slice(0, 20);
    }

    appendDecision(record) {
        this.decisionHistory.unshift(record);
        this.decisionHistory = this.decisionHistory.slice(0, 20);
    }

    buildStateSummary() {
        return {
            active: this.state.active,
            mode: this.state.mode,
            currentObjectiveId: this.state.currentObjectiveId,
            currentObjectiveTitle: this.getCurrentObjective()?.title || null,
            lastAction: this.state.lastAction,
            lastTickAt: this.state.lastTickAt,
            heartbeat: this.state.heartbeat,
            metrics: this.state.metrics,
        };
    }

    updateProbeSummary(summary = {}) {
        this.latestProbeSummary = this.sanitizeProbeSummary(summary);

        this.state.heartbeat = {
            source: 'autonomy.probe',
            status: this.latestProbeSummary.overallStatus,
            detail: this.describeProbeSummary(this.latestProbeSummary),
            at: this.latestProbeSummary.checkedAt,
        };

        this.state.metrics.probeCycles += 1;
        if (summary.overallStatus === 'healthy') {
            this.state.metrics.healthyProbeCycles += 1;
        } else if (summary.overallStatus === 'degraded') {
            this.state.metrics.degradedProbeCycles += 1;
        } else if (summary.overallStatus === 'critical') {
            this.state.metrics.criticalProbeCycles += 1;
            this.state.metrics.blockedIncidents += 1;
        }
        this.captureObjectiveSnapshot('probe-summary');
        this.persist('probe-summary');
    }

    describeProbeSummary(summary) {
        if (!summary.probes?.length) {
            return 'No autonomy probes recorded yet.';
        }

        const failed = summary.probes.filter((probe) => probe.status !== 'healthy');
        if (!failed.length) {
            return `All ${summary.probes.length} autonomy probes passed.`;
        }

        return `${failed.length}/${summary.probes.length} autonomy probes need attention: ${failed
            .map((probe) => probe.id)
            .join(', ')}.`;
    }

    tick(source = 'manual') {
        const heartbeatStatus = this.state.heartbeat.status;
        this.state.metrics.ticks += 1;
        this.state.lastTickAt = new Date().toISOString();

        let detail;
        if (!this.state.active) {
            detail = `tick ignored while inactive (${source})`;
        } else if (heartbeatStatus === 'critical') {
            this.state.metrics.recoveredIncidents += 1;
            this.state.currentObjectiveId = 'preserve-communication';
            detail = `recovery cycle scheduled from ${source}`;
        } else if (heartbeatStatus === 'degraded') {
            this.state.currentObjectiveId = 'stabilize-symphony';
            detail = `stabilization cycle scheduled from ${source}`;
        } else {
            detail = `autonomy tick completed from ${source}`;
        }

        this.objectives = this.objectives.map((objective) =>
            objective.id === this.state.currentObjectiveId
                ? { ...objective, status: 'in_progress' }
                : objective,
        );
        this.state.mode = this.deriveMode();
        const action = this.recordAction('tick', detail);
        this.captureObjectiveSnapshot(`tick:${source}`);
        this.persist(`tick:${source}`);
        return { state: this.getStatus(), action };
    }

    async runCycle(source = 'manual') {
        const startedAt = new Date().toISOString();
        const tickResult = this.tick(source);
        const execution = {
            source,
            startedAt,
            completedAt: null,
            status: this.state.active ? 'running' : 'ignored',
            probeSummary: null,
        };

        if (!this.state.active) {
            execution.completedAt = new Date().toISOString();
            execution.stateSummary = this.buildStateSummary();
            this.appendExecution(execution);
            this.persist(`run-cycle:${source}:inactive`);
            return {
                state: this.getStatus(),
                action: tickResult.action,
                execution,
            };
        }

        if (!this.probeRunner) {
            execution.status = 'no-probe-runner';
            execution.completedAt = new Date().toISOString();
            execution.stateSummary = this.buildStateSummary();
            this.recordAction('probe', 'autonomy probe runner is not configured');
            this.appendExecution(execution);
            this.captureObjectiveSnapshot(`run-cycle:${source}:no-probe-runner`);
            this.persist(`run-cycle:${source}:no-probe-runner`);
            return {
                state: this.getStatus(),
                action: tickResult.action,
                execution,
            };
        }

        try {
            const probeSummary = await this.probeRunner({
                source,
                startedAt,
            });
            this.updateProbeSummary(probeSummary);
            this.state.mode = this.deriveMode();
            execution.status = probeSummary.overallStatus || 'healthy';
            execution.probeSummary = this.latestProbeSummary;
            this.recordAction(
                'probe',
                `autonomy probe cycle ${execution.status} from ${source}`
            );
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.updateProbeSummary({
                overallStatus: 'critical',
                checkedAt: new Date().toISOString(),
                probes: [
                    {
                        id: 'probe-runner',
                        status: 'critical',
                        detail,
                    },
                ],
            });
            this.state.metrics.recoveredIncidents += 1;
            this.state.mode = this.deriveMode();
            execution.status = 'critical';
            execution.probeSummary = this.latestProbeSummary;
            this.recordAction('probe', `autonomy probe runner failed: ${detail}`);
        }

        if (
            this.recoveryRunner &&
            (execution.status === 'critical' || execution.status === 'degraded' || execution.status === 'healthy')
        ) {
            try {
                const decisions = await this.recoveryRunner({
                    source,
                    status: execution.status,
                    state: this.getStatus(),
                    latestProbeSummary: this.latestProbeSummary,
                });

                if (Array.isArray(decisions)) {
                    decisions.forEach((decision) => this.appendDecision({
                        at: new Date().toISOString(),
                        source,
                        status: execution.status,
                        ...decision,
                    }));
                }
            } catch (error) {
                this.appendDecision({
                    at: new Date().toISOString(),
                    source,
                    status: execution.status,
                    action: 'recovery-runner-error',
                    detail: error instanceof Error ? error.message : String(error),
                });
            }
        }

        execution.completedAt = new Date().toISOString();
        execution.stateSummary = this.buildStateSummary();
        this.appendExecution(execution);
        this.captureObjectiveSnapshot(`run-cycle:${source}:${execution.status}`);
        this.persist(`run-cycle:${source}:${execution.status}`);

        return {
            state: this.getStatus(),
            action: tickResult.action,
            execution,
        };
    }

    ensureLoop() {
        if (this.loopHandle) {
            return;
        }
        this.loopHandle = setInterval(() => {
            void this.runCycle('scheduler');
        }, 15000);
    }

    start() {
        if (this.state.active) {
            return this.getStatus();
        }
        this.state.active = true;
        this.state.mode = this.deriveMode();
        this.recordAction('lifecycle', 'autonomy runtime started');
        this.ensureLoop();
        this.captureObjectiveSnapshot('lifecycle:start');
        this.persist('lifecycle:start');
        return this.getStatus();
    }

    stop() {
        this.state.active = false;
        this.state.mode = this.deriveMode();
        if (this.loopHandle) {
            clearInterval(this.loopHandle);
            this.loopHandle = null;
        }
        this.recordAction('lifecycle', 'autonomy runtime stopped');
        this.captureObjectiveSnapshot('lifecycle:stop');
        this.persist('lifecycle:stop');
        return this.getStatus();
    }

    updateHeartbeat(payload = {}) {
        const nextHeartbeat = {
            source: payload.source || 'external',
            status: payload.status || 'healthy',
            detail: payload.detail || 'Heartbeat received.',
            at: new Date().toISOString(),
        };
        this.state.heartbeat = nextHeartbeat;
        if (nextHeartbeat.status === 'critical') {
            this.state.metrics.blockedIncidents += 1;
        }
        this.state.mode = this.deriveMode();
        this.recordAction('heartbeat', `${nextHeartbeat.source} reported ${nextHeartbeat.status}`);
        this.captureObjectiveSnapshot(`heartbeat:${nextHeartbeat.source}`);
        this.persist(`heartbeat:${nextHeartbeat.source}`);
        return this.getStatus();
    }

    addObjective(payload = {}) {
        const objective = {
            id: payload.id || `objective-${Date.now()}`,
            title: payload.title || 'Unnamed objective',
            priority: payload.priority || 'medium',
            status: payload.status || 'pending',
            detail: payload.detail || '',
        };
        this.objectives.push(objective);
        this.recordAction('objective', `registered objective ${objective.id}`);
        this.captureObjectiveSnapshot(`objective:${objective.id}`);
        this.persist(`objective:${objective.id}`);
        return objective;
    }

    getObjectives() {
        return this.objectives;
    }

    getExecutions() {
        return this.executionHistory;
    }

    getDecisions() {
        return this.decisionHistory;
    }

    getProbeSummary() {
        return this.latestProbeSummary;
    }

    getObjectiveSnapshots() {
        return this.objectiveSnapshots;
    }

    getStatus() {
        return {
            ...this.state,
            objectiveCount: this.objectives.length,
            currentObjective: this.getCurrentObjective(),
            latestProbeSummary: this.latestProbeSummary,
            executionCount: this.executionHistory.length,
            decisionCount: this.decisionHistory.length,
            latestDecisions: this.decisionHistory.slice(0, 5),
        };
    }
}

module.exports = new AutonomyRuntime();
