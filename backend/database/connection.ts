export const getEmpathyEngine = () => ({
    processEmpathy: async (request: Record<string, unknown>) => ({
        ...request,
        processed: true,
        timestamp: new Date().toISOString(),
    }),
    getMetrics: async () => ({
        status: 'ok',
        empathy_score: 72,
        timestamp: new Date().toISOString(),
    }),
});

export default { connected: true };
