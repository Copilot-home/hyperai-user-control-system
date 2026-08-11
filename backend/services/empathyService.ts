import { EmpathyRequest, EmpathyResponse } from '../types/empathy.types';
import { getEmpathyEngine } from '../database/connection';
import { EmpathyProcessingError } from '../controllers/empathyController';

/**
 * Service for managing empathy-related business logic.
 */
class EmpathyService {
    private empathyEngine;

    constructor() {
        this.empathyEngine = getEmpathyEngine();
    }

    /**
     * Process an empathy request.
     * @param request - The empathy request object.
     * @returns A promise that resolves to the empathy response.
     */
    async processEmpathy(request: EmpathyRequest): Promise<EmpathyResponse> {
        try {
            const response = await this.empathyEngine.processEmpathy(request);
            return response;
        } catch (error) {
            throw new EmpathyProcessingError('Error processing empathy request', error);
        }
    }

    /**
     * Get the current empathy metrics.
     * @returns A promise that resolves to the current empathy metrics.
     */
    async getMetrics(): Promise<any> {
        try {
            return await this.empathyEngine.getMetrics();
        } catch (error) {
            throw new Error('Error fetching empathy metrics');
        }
    }
}

export default new EmpathyService();