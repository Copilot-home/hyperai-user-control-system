import axios from 'axios';
import { EmpathyProcessRequest, VietnameseAnalysisAPIRequest } from '../../types/api.types';
import { SymphonyState, SymphonyStatusResponse } from '../../types/symphony.types';
import { getApiBaseUrl } from '../runtimeConfig';

export const getSymphonyStatus = async (): Promise<SymphonyStatusResponse> => {
    try {
        const response = await axios.get(`${getApiBaseUrl()}/symphony/status`);
        return response.data;
    } catch (error) {
        console.error('Error fetching symphony status:', error);
        throw error;
    }
};

export const getSymphonyMetrics = async (): Promise<SymphonyState> => {
    try {
        const response = await axios.get(`${getApiBaseUrl()}/symphony/status`);
        const data = response.data as Partial<SymphonyStatusResponse>;
        return {
            status: data.status ?? 'recoverable',
            frequency: data.frequency ?? 269,
            uptime: data.uptime ?? 'unknown',
            ca_dao_broadcasts: data.ca_dao_broadcasts ?? 0,
            active_agents: data.active_agents ?? 1,
            empathy_circulation: data.empathy_circulation ?? 'active',
            running: data.status ? data.status !== 'stopped' : true,
            autonomy: data.autonomy,
        };
    } catch (error) {
        console.error('Error fetching symphony metrics:', error);
        return {
            status: 'recoverable',
            frequency: 269,
            uptime: 'offline-fallback',
            ca_dao_broadcasts: 0,
            active_agents: 1,
            empathy_circulation: 'recoverable',
            running: false,
            autonomy: undefined,
        };
    }
};

export const startSymphony = async (): Promise<void> => {
    await axios.post(`${getApiBaseUrl()}/symphony/start`);
};

export const stopSymphony = async (): Promise<void> => {
    await axios.post(`${getApiBaseUrl()}/symphony/stop`);
};

export const updateSymphonyFrequency = async (frequency: number): Promise<SymphonyState> => {
    const response = await axios.post(`${getApiBaseUrl()}/symphony/frequency`, { frequency });
    const data = response.data as Partial<SymphonyStatusResponse>;
    return {
        status: data.status ?? 'recoverable',
        frequency: data.frequency ?? frequency,
        uptime: data.uptime ?? 'unknown',
        ca_dao_broadcasts: data.ca_dao_broadcasts ?? 0,
        active_agents: data.active_agents ?? 1,
        empathy_circulation: data.empathy_circulation ?? 'active',
        running: data.status ? data.status !== 'stopped' : true,
        autonomy: data.autonomy,
    };
};

export const processEmpathy = async (request: EmpathyProcessRequest): Promise<any> => {
    try {
        const response = await axios.post(`${getApiBaseUrl()}/empathy/process`, request);
        return response.data;
    } catch (error) {
        console.error('Error processing empathy:', error);
        throw error;
    }
};

export const analyzeVietnameseText = async (request: VietnameseAnalysisAPIRequest): Promise<any> => {
    try {
        const response = await axios.post(`${getApiBaseUrl()}/vietnamese/analyze`, request);
        return response.data;
    } catch (error) {
        console.error('Error analyzing Vietnamese text:', error);
        throw error;
    }
};
