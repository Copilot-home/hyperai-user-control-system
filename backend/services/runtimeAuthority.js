const fs = require('fs');
const path = require('path');

const runtimeManifestPath = path.resolve(__dirname, '..', '..', '..', 'runtime', 'hyperai-autonomous-runtime.json');

const provenEndpointMap = {
    empathy: 'GET /api/empathy/status',
    vietnamese: 'POST /api/vietnamese/analyze',
    notebooklm: 'GET /api/notebooklm/status',
    user: 'GET /api/users/:id',
    chat: 'GET /api/chat/messages',
};

const frozenLaneIds = {
    empathy: 'empathy',
    vietnamese: 'vietnamese',
    notebooklm: 'notebooklm',
    user: 'user',
    websocket: 'websocket',
    chat: 'chat',
};

const readManifest = () => {
    if (!fs.existsSync(runtimeManifestPath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(runtimeManifestPath, 'utf8'));
    } catch (error) {
        return null;
    }
};

const laneIsFrozen = (manifest, laneId) => {
    if (!manifest?.frozenLanes || !Array.isArray(manifest.frozenLanes)) {
        return false;
    }

    return manifest.frozenLanes.some((entry) => String(entry).toLowerCase().includes(frozenLaneIds[laneId]));
};

const laneIsProven = (manifest, laneId) => {
    if (!manifest?.provenLiveEndpoints || !Array.isArray(manifest.provenLiveEndpoints)) {
        return false;
    }

    return manifest.provenLiveEndpoints.includes(provenEndpointMap[laneId]);
};

const classifyLane = (manifest, laneId, defaults) => {
    if (laneIsFrozen(manifest, laneId)) {
        return {
            ...defaults,
            mode: laneId === 'chat' ? 'local-only' : laneId === 'user' ? 'local-only' : 'disabled',
            status: laneId === 'chat' ? 'Local-only fallback' : 'Inactive until re-proven',
            evidence: manifest?.reason
                ? `${defaults.evidence} ${manifest.reason}`
                : defaults.evidence,
        };
    }

    if (laneIsProven(manifest, laneId)) {
        return {
            ...defaults,
            mode: defaults.modeWhenProven || 'live',
            status: defaults.statusWhenProven || 'Runtime proven live',
            evidence: defaults.provenEvidence || defaults.evidence,
        };
    }

    return defaults;
};

const buildRuntimeAuthority = () => {
    const manifest = readManifest();
    const classification =
        manifest?.backend_classification ||
        manifest?.classification ||
        manifest?.defaultRuntime?.classification ||
        'unknown';
    const frontendClassification = manifest?.frontend_classification || 'missing-listener';
    const mode = manifest?.mode || 'default-runtime';
    const selectedAction =
        manifest?.selected_action ||
        (manifest?.managed ? 'reuse_managed_runtime' : 'reuse_default_runtime');
    const authorityReason =
        manifest?.reason ||
        'Runtime authority defaults to the current local backend and preview listeners.';
    const runtimeStrategy = manifest?.runtime_strategy || (manifest?.managed ? 'managed_runtime_active' : 'default_runtime_active');
    const boundaryState =
        manifest?.boundaryState ||
        (classification === 'autonomous-core-ready'
            ? 'autonomous'
            : classification === 'operational-without-autonomy'
                ? 'operational'
                : classification === 'stale-process runtime' || classification === 'degraded/local-only'
                    ? 'recoverable'
                    : 'dormant');
    const autonomousCoreReady = Boolean(manifest?.autonomousCoreReady || classification === 'autonomous-core-ready');
    const operatorAttentionRequired = manifest?.operatorAttentionRequired ?? !autonomousCoreReady;
    const managedRuntimeHealth = manifest?.managedRuntimeHealth || (manifest?.managed ? 'missing' : 'not-managed');
    const stateTransition = manifest?.stateTransition || selectedAction;
    const coreBoundary = Array.isArray(manifest?.coreBoundary) ? manifest.coreBoundary : ['dashboard', 'symphony', 'runtime', 'autonomy'];
    const nonCoreOperationalLanes = Array.isArray(manifest?.nonCoreOperationalLanes) ? manifest.nonCoreOperationalLanes : [];
    const degradedLanes = Array.isArray(manifest?.degradedLanes) ? manifest.degradedLanes : ['chat'];
    const safeRecoveryAvailable =
        classification === 'stale-process runtime' ||
        classification === 'operational-without-autonomy' ||
        !manifest;
    const routineDecisions = [
        boundaryState === 'autonomous'
            ? 'Routine authority selection can stay inside the current app boundary.'
            : 'Routine authority selection still needs a runtime bootstrap or recovery pass.',
        safeRecoveryAvailable
            ? 'Safe recovery is available through the managed local-first runtime path.'
            : 'No additional recovery action is currently required.',
    ];

    return {
        manifest,
        classification,
        boundaryState,
        autonomousCoreReady,
        operatorAttentionRequired,
        frontendClassification,
        mode,
        selectedAction,
        stateTransition,
        authorityReason,
        runtimeStrategy,
        managedRuntimeHealth,
        coreBoundary,
        nonCoreOperationalLanes,
        degradedLanes,
        safeRecoveryAvailable,
        routineDecisions,
    };
};

module.exports = {
    buildRuntimeAuthority,
    classifyLane,
};
