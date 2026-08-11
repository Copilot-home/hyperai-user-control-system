import React, { useEffect, useState } from 'react';
import { getSymphonyMetrics } from '../../services/api/symphonyAPI';
import { Button } from '../shared/Button';
import { MetricsChart } from '../visualization/MetricsChart';
import { SymphonyStatusResponse } from '../../types/symphony.types';

export const SymphonyDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<SymphonyStatusResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchMetrics = async () => {
        try {
            const data = await getSymphonyMetrics();
            setMetrics(data as unknown as SymphonyStatusResponse);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        await fetchMetrics();
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="symphony-dashboard">
            <h2>Symphony Dashboard</h2>
            <Button onClick={handleRefresh}>Refresh Metrics</Button>
            {metrics && (
                <div>
                    <h3>Status: {metrics.status ?? 'recoverable'}</h3>
                    {metrics.autonomy && (
                        <p>
                            Autonomy mode: {metrics.autonomy.mode}. Current objective:{' '}
                            {metrics.autonomy.currentObjective?.title ?? 'unassigned'}.
                        </p>
                    )}
                    <MetricsChart />
                </div>
            )}
        </div>
    );
};

export default SymphonyDashboard;
