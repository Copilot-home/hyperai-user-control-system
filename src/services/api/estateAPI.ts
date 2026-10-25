import axios from 'axios';
import { getApiBaseUrl } from '../runtimeConfig';
import { EstateSummary } from '../../types/estate.types';

export const getEstateSummary = async (): Promise<EstateSummary> => {
    const baseUrl = typeof window === 'undefined' ? getApiBaseUrl() : '/api';
    const response = await axios.get<EstateSummary>(`${baseUrl}/estate/summary`, {
        timeout: 5000,
    });
    return response.data;
};
