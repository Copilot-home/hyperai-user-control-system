import axios from 'axios';
import { EmpathyProcessRequest, EmpathyProcessResponse } from '../../types/api.types';
import { getApiBaseUrl } from '../runtimeConfig';
import { isEmpathyRuntimeEnabled } from '../runtimeFlags';

export const EMPATHY_RUNTIME_ENABLED = isEmpathyRuntimeEnabled;

export const processEmpathy = async (requestData: EmpathyProcessRequest): Promise<EmpathyProcessResponse> => {
    if (!EMPATHY_RUNTIME_ENABLED) {
        return {
            empathyScore: 0,
            culturalBridge: 'Empathy runtime is disabled in the current local contract.',
            caDaoWisdom: '',
            processedMessage: requestData.message,
        } as EmpathyProcessResponse;
    }
    try {
        const response = await axios.post(`${getApiBaseUrl()}/empathy/process`, requestData);
        return response.data;
    } catch (error) {
        throw new Error(`Error processing empathy: ${error.response?.data?.detail || error.message}`);
    }
};

export const getSymphonyStatus = async (): Promise<any> => {
    if (!EMPATHY_RUNTIME_ENABLED) {
        return {
            status: 'inactive',
            reason: 'Empathy runtime is disabled in the current local contract.',
        };
    }
    try {
        const response = await axios.get(`${getApiBaseUrl()}/empathy/status`);
        return response.data;
    } catch (error) {
        throw new Error(`Error fetching symphony status: ${error.response?.data?.detail || error.message}`);
    }
};

export const getEmpathyScore = async (): Promise<number> => {
    if (!EMPATHY_RUNTIME_ENABLED) {
        return 0;
    }
    try {
        const response = await axios.get(`${getApiBaseUrl()}/empathy/status`);
        return response.data?.empathyScore ?? response.data?.empathy_score ?? 0;
    } catch (error) {
        console.error('Error fetching empathy score:', error);
        return 0;
    }
};

export const subscribeToEmpathyUpdates = (callback: (newScore: number) => void): (() => void) => {
    if (!EMPATHY_RUNTIME_ENABLED) {
        callback(0);
        return () => undefined;
    }
    const interval = window.setInterval(async () => {
        const score = await getEmpathyScore();
        callback(score);
    }, 5000);

    return () => window.clearInterval(interval);
};

export const fetchAnalyticsData = async (): Promise<Array<{ timestamp: string; value: number }>> => {
    if (!EMPATHY_RUNTIME_ENABLED) {
        return [
            {
                timestamp: new Date().toISOString(),
                value: 0,
            },
        ];
    }
    try {
        const response = await axios.get(`${getApiBaseUrl()}/empathy/analytics`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        return [
            {
                timestamp: new Date().toISOString(),
                value: 0,
            },
        ];
    }
};
