import axios from 'axios';
import {
    adoptRuntimeAuthority,
    getApiBaseUrl,
    getDefaultApiOrigin,
    hasManagedRuntimeAuthority,
    maybeAdoptManagedRuntimeAuthority,
    maybeAdoptManagedRuntimeRecoveryAuthority,
} from '../runtimeConfig';
import { RuntimeCapabilitiesResponse } from '../../types/runtime.types';

export const getRuntimeCapabilities = async (): Promise<RuntimeCapabilitiesResponse> => {
    try {
        const response = await axios.get<RuntimeCapabilitiesResponse>(`${getApiBaseUrl()}/runtime/capabilities`);
        const adoptedManagedRuntime = maybeAdoptManagedRuntimeAuthority(response.data);

        if (!adoptedManagedRuntime) {
            return response.data;
        }

        const managedResponse = await axios.get<RuntimeCapabilitiesResponse>(`${getApiBaseUrl()}/runtime/capabilities`);
        return managedResponse.data;
    } catch (error) {
        if (!hasManagedRuntimeAuthority()) {
            throw error;
        }

        const fallbackOrigin = getDefaultApiOrigin();
        adoptRuntimeAuthority(fallbackOrigin, 'default-runtime-fallback', false);
        const response = await axios.get<RuntimeCapabilitiesResponse>(`${getApiBaseUrl()}/runtime/capabilities`);
        maybeAdoptManagedRuntimeAuthority(response.data);
        return response.data;
    }
};

export const reconcileRuntime = async (
    reason = 'browser-boundary-recovery',
): Promise<RuntimeCapabilitiesResponse['runtime_recovery']> => {
    const response = await axios.post<RuntimeCapabilitiesResponse['runtime_recovery']>(
        `${getApiBaseUrl()}/runtime/reconcile`,
        { reason },
    );
    maybeAdoptManagedRuntimeRecoveryAuthority(response.data);
    return response.data;
};
