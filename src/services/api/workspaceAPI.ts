import axios from 'axios';
import { getApiBaseUrl } from '../runtimeConfig';
import {
    WorkspaceGraphResponse,
    WorkspaceLanesResponse,
    WorkspaceMissionsResponse,
    WorkspaceProofResponse,
    WorkspaceProvidersResponse,
    WorkspaceRouteResponse,
    WorkspaceSessionResponse,
} from '../../types/workspace.types';

export const getWorkspaceSession = async (): Promise<WorkspaceSessionResponse> => {
    const response = await axios.get<WorkspaceSessionResponse>(`${getApiBaseUrl()}/workspace/session`);
    return response.data;
};

export const getWorkspaceGraph = async (): Promise<WorkspaceGraphResponse> => {
    const response = await axios.get<WorkspaceGraphResponse>(`${getApiBaseUrl()}/workspace/graph`);
    return response.data;
};

export const getWorkspaceLanes = async (): Promise<WorkspaceLanesResponse> => {
    const response = await axios.get<WorkspaceLanesResponse>(`${getApiBaseUrl()}/workspace/lanes`);
    return response.data;
};

export const getWorkspaceRuntimes = async (): Promise<WorkspaceGraphResponse['nodes']> => {
    const response = await axios.get<{ generated_at: string; runtimes: WorkspaceGraphResponse['nodes'] }>(`${getApiBaseUrl()}/workspace/runtimes`);
    return response.data.runtimes;
};

export const getWorkspaceConnectors = async (): Promise<WorkspaceGraphResponse['nodes']> => {
    const response = await axios.get<{ generated_at: string; connectors: WorkspaceGraphResponse['nodes'] }>(`${getApiBaseUrl()}/workspace/connectors`);
    return response.data.connectors;
};

export const getWorkspaceMissions = async (): Promise<WorkspaceMissionsResponse> => {
    const response = await axios.get<WorkspaceMissionsResponse>(`${getApiBaseUrl()}/workspace/missions`);
    return response.data;
};

export const createWorkspaceMission = async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await axios.post<Record<string, unknown>>(`${getApiBaseUrl()}/workspace/missions`, payload);
    return response.data;
};

export const routeWorkspaceChat = async (message: string): Promise<WorkspaceRouteResponse> => {
    const response = await axios.post<WorkspaceRouteResponse>(`${getApiBaseUrl()}/workspace/chat/route`, { message });
    return response.data;
};

export const getWorkspaceProof = async (): Promise<WorkspaceProofResponse> => {
    const response = await axios.get<WorkspaceProofResponse>(`${getApiBaseUrl()}/workspace/proof`);
    return response.data;
};

export const getWorkspaceProviders = async (): Promise<WorkspaceProvidersResponse> => {
    const response = await axios.get<WorkspaceProvidersResponse>(`${getApiBaseUrl()}/workspace/providers`);
    return response.data;
};

export const setWorkspaceTelegramBotToken = async (
    token: string,
    discoverTargets = true,
): Promise<Record<string, unknown>> => {
    const response = await axios.post<Record<string, unknown>>(
        `${getApiBaseUrl()}/workspace/runtime-secrets/telegram-bot-token`,
        {
            token,
            discover_targets: discoverTargets,
        },
    );
    return response.data;
};

export const setWorkspaceTelegramBotApiBaseUrl = async (
    baseUrl: string,
    probe = false,
    discoverTargets = false,
): Promise<Record<string, unknown>> => {
    const response = await axios.post<Record<string, unknown>>(
        `${getApiBaseUrl()}/workspace/runtime-connectors/telegram-bot-api`,
        {
            base_url: baseUrl,
            probe,
            discover_targets: discoverTargets,
        },
    );
    return response.data;
};

export const triggerWorkspaceBotFatherReadback = async (
    imagePath?: string,
    timeoutSeconds = 30,
): Promise<Record<string, unknown>> => {
    const response = await axios.post<Record<string, unknown>>(
        `${getApiBaseUrl()}/workspace/runtime-connectors/telegram-botfather/readback`,
        {
            image_path: imagePath,
            timeout_seconds: timeoutSeconds,
        },
    );
    return response.data;
};

export const runWorkspaceTelegramNodeAction = async (
    task: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
    const response = await axios.post<Record<string, unknown>>(
        `${getApiBaseUrl()}/workspace/runtime-connectors/telegram-node`,
        task,
    );
    return response.data;
};
