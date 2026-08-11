import { RuntimeLane } from '../types/runtime.types';

const getEnvFlag = (key: string): boolean => {
    if (typeof import.meta === 'undefined') {
        return false;
    }

    const env = (import.meta as any).env;
    return env?.[key] === 'true';
};

export const isEmpathyRuntimeEnabled = getEnvFlag('VITE_ENABLE_EMPATHY_RUNTIME');
export const isVietnameseRuntimeEnabled = getEnvFlag('VITE_ENABLE_VIETNAMESE_RUNTIME');
export const isChatRuntimeEnabled = getEnvFlag('VITE_ENABLE_CHAT_RUNTIME');
export const isUserRuntimeEnabled = getEnvFlag('VITE_ENABLE_USER_RUNTIME');
export const isNotebookLMRuntimeEnabled = getEnvFlag('VITE_ENABLE_NOTEBOOKLM_RUNTIME');
export const isWebSocketRuntimeEnabled = getEnvFlag('VITE_ENABLE_WEBSOCKET_RUNTIME');

export const runtimeFlags = {
    empathy: isEmpathyRuntimeEnabled,
    vietnamese: isVietnameseRuntimeEnabled,
    chat: isChatRuntimeEnabled,
    user: isUserRuntimeEnabled,
    notebook: isNotebookLMRuntimeEnabled,
    websocket: isWebSocketRuntimeEnabled,
};

const browserCockpitLaneOrder = ['autonomy', 'symphony', 'chat', 'vietnamese', 'empathy', 'user', 'notebooklm', 'websocket'];

const laneOverrides: Record<string, RuntimeLane> = {
    chat: {
        id: 'chat',
        label: 'Chat Transport',
        mode: isChatRuntimeEnabled ? 'live' : 'local-only',
        status: isChatRuntimeEnabled ? 'Backend chat runtime enabled' : 'Fallback command shell',
        evidence: isChatRuntimeEnabled
            ? 'Chat runtime was explicitly enabled for this browser cockpit session.'
            : 'Chat remains available as a local orchestration shell. Symphony commands still target the proven live backend lane.',
    },
    vietnamese: {
        id: 'vietnamese',
        label: 'Vietnamese Cultural Analysis',
        mode: isVietnameseRuntimeEnabled ? 'live' : 'local-only',
        status: isVietnameseRuntimeEnabled ? 'Vietnamese runtime explicitly enabled' : 'Local fallback analysis',
        evidence: isVietnameseRuntimeEnabled
            ? 'Vietnamese runtime was explicitly enabled for this browser cockpit session.'
            : 'This route stays executable for smoke and operator flow, but browser cockpit does not assume a live backend NLP lane by default.',
        endpoint: '/api/vietnamese/analyze',
    },
    empathy: {
        id: 'empathy',
        label: 'Empathy Processing',
        mode: isEmpathyRuntimeEnabled ? 'live' : 'disabled',
        status: isEmpathyRuntimeEnabled ? 'Empathy runtime explicitly enabled' : 'Quarantined in browser cockpit',
        evidence: isEmpathyRuntimeEnabled
            ? 'Empathy runtime was explicitly enabled for this browser cockpit session.'
            : 'Empathy telemetry stays outside the active browser contract until that backend lane is deliberately re-proven live.',
        endpoint: '/api/empathy/process',
    },
    user: {
        id: 'user',
        label: 'User Preferences',
        mode: isUserRuntimeEnabled ? 'live' : 'local-only',
        status: isUserRuntimeEnabled ? 'User runtime explicitly enabled' : 'Local-only preferences shell',
        evidence: isUserRuntimeEnabled
            ? 'User runtime was explicitly enabled for this browser cockpit session.'
            : 'Settings and profile state persist locally and do not represent a live backend user lane.',
        endpoint: '/api/users/:id',
    },
    notebooklm: {
        id: 'notebooklm',
        label: 'NotebookLM Integration',
        mode: isNotebookLMRuntimeEnabled ? 'degraded' : 'disabled',
        status: isNotebookLMRuntimeEnabled ? 'Optional integration enabled' : 'Optional integration quarantined',
        evidence: isNotebookLMRuntimeEnabled
            ? 'NotebookLM integration is operator-enabled, but still depends on external credentials.'
            : 'NotebookLM remains outside the active browser shell until its optional integration is deliberately enabled.',
        endpoint: '/api/notebooklm/status',
    },
    websocket: {
        id: 'websocket',
        label: 'Realtime Telemetry',
        mode: isWebSocketRuntimeEnabled ? 'degraded' : 'disabled',
        status: isWebSocketRuntimeEnabled ? 'Explicit websocket runtime enabled' : 'Websocket lane quarantined',
        evidence: isWebSocketRuntimeEnabled
            ? 'Websocket runtime was enabled, but it is still treated as secondary to the HTTP symphony lane.'
            : 'The browser shell does not treat websocket telemetry as authoritative unless explicitly enabled.',
    },
};

export const mergeBrowserCockpitLanes = (lanes: RuntimeLane[]): RuntimeLane[] => {
    const laneMap = new Map(lanes.map((lane) => [lane.id, lane]));

    Object.entries(laneOverrides).forEach(([id, override]) => {
        if (laneMap.has(id)) {
            laneMap.set(id, { ...laneMap.get(id), ...override });
            return;
        }

        laneMap.set(id, override);
    });

    return Array.from(laneMap.values()).sort((left, right) => {
        const leftIndex = browserCockpitLaneOrder.indexOf(left.id);
        const rightIndex = browserCockpitLaneOrder.indexOf(right.id);
        return (leftIndex === -1 ? browserCockpitLaneOrder.length : leftIndex)
            - (rightIndex === -1 ? browserCockpitLaneOrder.length : rightIndex);
    });
};
