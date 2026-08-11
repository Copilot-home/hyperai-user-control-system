import { RuntimeCapabilitiesResponse } from '../types/runtime.types';

const DEFAULT_API_ORIGIN = 'http://localhost:5000';
const RUNTIME_AUTHORITY_STORAGE_KEY = 'hyperai.runtime.authority';
const RUNTIME_API_ORIGIN_OVERRIDE_KEY = 'hyperai_runtime_api_origin';

interface StoredRuntimeAuthority {
    apiOrigin: string;
    source: string;
    managed: boolean;
    adoptedAt: string;
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const normalizeApiOrigin = (value: string): string => trimTrailingSlash(value).replace(/\/api$/, '');

const readBrowserOverride = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const value = window.localStorage.getItem(RUNTIME_API_ORIGIN_OVERRIDE_KEY);
    return typeof value === 'string' && value.trim() ? normalizeApiOrigin(value) : null;
};

const readEnv = (key: string): string | undefined => {
    if (typeof import.meta === 'undefined') {
        return undefined;
    }

    const env = (import.meta as any).env;
    const value = env?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const resolveInitialApiOrigin = (): string => {
    const explicitApiBaseUrl = readEnv('VITE_API_BASE_URL');
    if (explicitApiBaseUrl) {
        return normalizeApiOrigin(explicitApiBaseUrl);
    }

    const explicitApiOrigin = readEnv('VITE_API_ORIGIN');
    if (explicitApiOrigin) {
        return normalizeApiOrigin(explicitApiOrigin);
    }

    return DEFAULT_API_ORIGIN;
};

const buildSocketOrigin = (apiOrigin: string): string => {
    if (apiOrigin.startsWith('https://')) {
        return apiOrigin.replace(/^https:\/\//, 'wss://');
    }

    if (apiOrigin.startsWith('http://')) {
        return apiOrigin.replace(/^http:\/\//, 'ws://');
    }

    return apiOrigin;
};

const readStoredRuntimeAuthority = (): StoredRuntimeAuthority | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(RUNTIME_AUTHORITY_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<StoredRuntimeAuthority>;
        if (!parsed.apiOrigin || typeof parsed.apiOrigin !== 'string') {
            return null;
        }

        return {
            apiOrigin: normalizeApiOrigin(parsed.apiOrigin),
            source: typeof parsed.source === 'string' ? parsed.source : 'local-storage',
            managed: Boolean(parsed.managed),
            adoptedAt: typeof parsed.adoptedAt === 'string' ? parsed.adoptedAt : new Date().toISOString(),
        };
    } catch {
        return null;
    }
};

const persistRuntimeAuthority = (authority: StoredRuntimeAuthority): void => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(RUNTIME_AUTHORITY_STORAGE_KEY, JSON.stringify(authority));
};

const clearStoredRuntimeAuthority = (): void => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.removeItem(RUNTIME_AUTHORITY_STORAGE_KEY);
};

const initialApiOrigin = resolveInitialApiOrigin();
const storedAuthority = readStoredRuntimeAuthority();
const reusableStoredAuthority = storedAuthority?.managed ? storedAuthority : null;
const browserOverride = readBrowserOverride();
const browserOverrideLocked = Boolean(browserOverride);

if (storedAuthority && !storedAuthority.managed && !browserOverride) {
    clearStoredRuntimeAuthority();
}

let currentApiOrigin = browserOverride || reusableStoredAuthority?.apiOrigin || initialApiOrigin;
let currentRuntimeSource = browserOverride ? 'browser-override' : reusableStoredAuthority?.source || 'env';
let currentManagedRuntime = browserOverride ? false : reusableStoredAuthority?.managed || false;

export const getDefaultApiOrigin = (): string => initialApiOrigin;

export const getApiOrigin = (): string => currentApiOrigin;

export const getApiBaseUrl = (): string => `${currentApiOrigin}/api`;

export const getSocketOrigin = (): string => buildSocketOrigin(currentApiOrigin);

export const hasManagedRuntimeAuthority = (): boolean => currentManagedRuntime;

export const hasRuntimeApiOriginOverride = (): boolean => browserOverrideLocked;

export const getRuntimeAuthoritySnapshot = () => ({
    apiOrigin: currentApiOrigin,
    apiBaseUrl: getApiBaseUrl(),
    socketOrigin: getSocketOrigin(),
    source: currentRuntimeSource,
    managed: currentManagedRuntime,
});

export const adoptRuntimeAuthority = (
    nextApiOrigin: string,
    source = 'runtime-authority',
    managed = false,
): boolean => {
    const normalizedOrigin = normalizeApiOrigin(nextApiOrigin);
    if (!normalizedOrigin || normalizedOrigin === currentApiOrigin) {
        return false;
    }

    currentApiOrigin = normalizedOrigin;
    currentRuntimeSource = source;
    currentManagedRuntime = managed;
    persistRuntimeAuthority({
        apiOrigin: normalizedOrigin,
        source,
        managed,
        adoptedAt: new Date().toISOString(),
    });
    return true;
};

export const resetRuntimeAuthority = (source = 'runtime-authority-reset'): boolean => {
    return adoptRuntimeAuthority(initialApiOrigin, source, false);
};

export const maybeAdoptManagedRuntimeAuthority = (
    capabilities: RuntimeCapabilitiesResponse | null | undefined,
): boolean => {
    if (browserOverrideLocked) {
        return false;
    }

    const managedBackendUrl = capabilities?.runtime_authority?.managed_backend_url;
    const shouldAdoptManagedRuntime =
        Boolean(capabilities?.runtime_authority?.managed_runtime) &&
        Boolean(managedBackendUrl) &&
        (capabilities?.selected_action === 'reuse_managed_runtime' ||
            capabilities?.selected_action === 'reconcile_managed_runtime' ||
            capabilities?.selected_action === 'start_managed_runtime' ||
            capabilities?.backend_classification === 'stale-process runtime');

    if (!shouldAdoptManagedRuntime || !managedBackendUrl) {
        return false;
    }

    return adoptRuntimeAuthority(managedBackendUrl, 'managed-runtime-authority', true);
};

export const maybeAdoptManagedRuntimeRecoveryAuthority = (
    recovery: RuntimeCapabilitiesResponse['runtime_recovery'] | null | undefined,
): boolean => {
    if (browserOverrideLocked) {
        return false;
    }

    const managedBackendUrl = recovery?.managedRuntime?.backendUrl;
    const managedHealthy = Boolean(recovery?.managedRuntime?.healthy);

    if (!managedBackendUrl || !managedHealthy) {
        return false;
    }

    return adoptRuntimeAuthority(managedBackendUrl, 'managed-runtime-recovery', true);
};

export const runtimeConfig = {
    get apiOrigin(): string {
        return getApiOrigin();
    },
    get apiBaseUrl(): string {
        return getApiBaseUrl();
    },
    get socketOrigin(): string {
        return getSocketOrigin();
    },
    socketNamespace(path: string): string {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${getSocketOrigin()}${normalizedPath}`;
    },
};
