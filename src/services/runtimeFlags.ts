import { RuntimeLane } from '../types/runtime.types';

// Build availability only: is the capability code present in this build?
const getEnvFlag = (key: string): boolean => {
    if (typeof import.meta === 'undefined') {
        return false;
    }

    const env = (import.meta as any).env;
    return env?.[key] === 'true';
};

export const isEmpathyImplemented = getEnvFlag('VITE_ENABLE_EMPATHY_RUNTIME');
export const isVietnameseImplemented = getEnvFlag('VITE_ENABLE_VIETNAMESE_RUNTIME');
export const isChatImplemented = getEnvFlag('VITE_ENABLE_CHAT_RUNTIME');
export const isUserImplemented = getEnvFlag('VITE_ENABLE_USER_RUNTIME');
export const isNotebookLMImplemented = getEnvFlag('VITE_ENABLE_NOTEBOOKLM_RUNTIME');
export const isWebSocketImplemented = getEnvFlag('VITE_ENABLE_WEBSOCKET_RUNTIME');

export const isUserRuntimeEnabled = isUserImplemented;
export const isEmpathyRuntimeEnabled = isEmpathyImplemented;
export const isVietnameseRuntimeEnabled = isVietnameseImplemented;
export const isChatRuntimeEnabled = isChatImplemented;
export const isNotebookLMRuntimeEnabled = isNotebookLMImplemented;
export const isWebSocketRuntimeEnabled = isWebSocketImplemented;

export const implementedCapabilities: string[] = [
    ...(isChatImplemented ? ['chat'] : []),
    ...(isEmpathyImplemented ? ['empathy'] : []),
    ...(isVietnameseImplemented ? ['vietnamese'] : []),
    ...(isUserImplemented ? ['user'] : []),
    ...(isNotebookLMImplemented ? ['notebook'] : []),
    ...(isWebSocketImplemented ? ['websocket'] : []),
];

export const mergeBrowserCockpitLanes = (lanes: RuntimeLane[]): RuntimeLane[] => {
    // Identity function for now to resolve build error
    return lanes;
};
