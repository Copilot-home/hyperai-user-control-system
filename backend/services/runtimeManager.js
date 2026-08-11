const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const runtimeDir = path.resolve(projectRoot, '..', 'runtime');
const manifestPath = path.join(runtimeDir, 'hyperai-autonomous-runtime.json');
const startScriptPath = path.join(projectRoot, 'scripts', 'runtime', 'start-autonomous-runtime.mjs');

const DEFAULT_BACKEND_PORT = Number(process.env.HYPERAI_DEFAULT_BACKEND_PORT || 5000);
const RECOVERY_COOLDOWN_MS = Number(process.env.HYPERAI_RUNTIME_RECOVERY_COOLDOWN_MS || 120000);

const state = {
    launchStartedAt: null,
    lastEvaluatedAt: null,
    lastHealthyAt: null,
    lastError: null,
    lastReason: 'runtime manager idle',
};

const readManifest = () => {
    if (!fs.existsSync(manifestPath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
        state.lastError = error instanceof Error ? error.message : String(error);
        return null;
    }
};

const probeUrl = async (url) => {
    try {
        const response = await fetch(url);
        return response.ok;
    } catch {
        return false;
    }
};

const inspectManagedRuntime = async () => {
    const manifest = readManifest();
    if (!manifest?.managed || !manifest.backendUrl || !manifest.frontendUrl) {
        return {
            manifest,
            healthy: false,
            reason: 'Managed runtime manifest is missing or incomplete.',
        };
    }

    const [backendHealthy, frontendHealthy] = await Promise.all([
        probeUrl(`${manifest.backendUrl}/api/health`),
        probeUrl(manifest.frontendUrl),
    ]);

    if (backendHealthy && frontendHealthy) {
        state.lastHealthyAt = new Date().toISOString();
        return {
            manifest,
            healthy: true,
            reason: 'Managed runtime manifest is live and responding.',
        };
    }

    return {
        manifest,
        healthy: false,
        reason: 'Managed runtime manifest exists but one or more managed listeners are unreachable.',
    };
};

const spawnRecoveryProcess = (reason) => {
    state.launchStartedAt = new Date().toISOString();
    state.lastReason = reason;
    state.lastError = null;

    const child = spawn('node', [startScriptPath], {
        cwd: projectRoot,
        env: { ...process.env },
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
    });
    child.unref();
};

const describeAction = ({ currentPort, healthy, launchActive, manifest }) => {
    if (currentPort !== DEFAULT_BACKEND_PORT) {
        return {
            status: 'self-managed-skip',
            selectedAction: 'hold_current_runtime',
            reason: 'Current backend listener is already running outside the default authority port, so nested recovery is skipped.',
        };
    }

    if (healthy && manifest) {
        return {
            status: 'ready',
            selectedAction: 'reuse_managed_runtime',
            reason: 'Managed autonomous runtime is healthy and can be reused.',
        };
    }

    if (launchActive) {
        return {
            status: 'reconciling',
            selectedAction: 'reconcile_managed_runtime',
            reason: 'Managed runtime recovery is already in progress.',
        };
    }

    return {
        status: manifest ? 'managed-runtime-degraded' : 'managed-runtime-missing',
        selectedAction: 'start_managed_runtime',
        reason: manifest
            ? 'Managed runtime metadata exists but the isolated listeners are not healthy.'
            : 'Managed runtime metadata is missing, so the default runtime must rebuild the isolated authority path.',
    };
};

const getRecoveryWindowOpen = () => {
    if (!state.launchStartedAt) {
        return false;
    }

    return Date.now() - new Date(state.launchStartedAt).getTime() < RECOVERY_COOLDOWN_MS;
};

const inspectRecoveryState = async ({ currentPort = DEFAULT_BACKEND_PORT } = {}) => {
    const inspectedAt = new Date().toISOString();
    state.lastEvaluatedAt = inspectedAt;

    const managed = await inspectManagedRuntime();
    const launchActive = getRecoveryWindowOpen() && !managed.healthy;
    const action = describeAction({
        currentPort,
        healthy: managed.healthy,
        launchActive,
        manifest: managed.manifest,
    });

    return {
        inspectedAt,
        currentPort,
        status: action.status,
        selectedAction: action.selectedAction,
        reason: `${action.reason} ${managed.reason}`.trim(),
        managedRuntime: managed.manifest
            ? {
                  backendUrl: managed.manifest.backendUrl || null,
                  frontendUrl: managed.manifest.frontendUrl || null,
                  managed: Boolean(managed.manifest.managed),
                  checkedAt: managed.manifest.checkedAt || null,
                  healthy: managed.healthy,
              }
            : null,
        launchStartedAt: state.launchStartedAt,
        lastHealthyAt: state.lastHealthyAt,
        lastEvaluatedAt: state.lastEvaluatedAt,
        lastError: state.lastError,
    };
};

const ensureManagedRuntime = async ({ currentPort = DEFAULT_BACKEND_PORT, reason = 'runtime-manager.ensure' } = {}) => {
    const recoveryState = await inspectRecoveryState({ currentPort });
    if (recoveryState.selectedAction !== 'start_managed_runtime') {
        return recoveryState;
    }

    if (getRecoveryWindowOpen()) {
        return {
            ...recoveryState,
            status: 'reconciling',
            selectedAction: 'reconcile_managed_runtime',
            reason: 'Recovery launch is still inside the cooldown window; waiting for the isolated runtime to settle.',
        };
    }

    spawnRecoveryProcess(reason);

    return {
        ...recoveryState,
        status: 'reconciling',
        selectedAction: 'reconcile_managed_runtime',
        reason: 'Recovery launch started for the isolated runtime authority path.',
        launchStartedAt: state.launchStartedAt,
    };
};

module.exports = {
    inspectRecoveryState,
    ensureManagedRuntime,
};
