import React from 'react';
import { Line } from 'react-chartjs-2';
import { useMetrics } from '../../hooks/useMetrics';
import styles from './MetricsChart.module.css';
import '../../lib/chartSetup';

interface MetricsChartProps {
    data?: Array<{ timestamp: string; value: number }> | null;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ data }) => {
    const { metricsData, loading, error } = useMetrics();
    const resolvedData = data && data.length > 0 ? data : metricsData;

    const chartData = {
        labels: resolvedData.map(dataPoint => dataPoint.timestamp),
        datasets: [
            {
                label: 'Performance Metrics',
                data: resolvedData.map(dataPoint => dataPoint.value),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
            },
        ],
    };

    if (loading && (!data || data.length === 0)) {
        return <div className={styles.loading}>Loading metrics...</div>;
    }

    if (error) {
        return <div className={styles.error}>Error loading metrics: {error.message}</div>;
    }

    return (
        <div className={styles.chartContainer}>
            <h2>Metrics Chart</h2>
            <Line data={chartData} />
        </div>
    );
};

export default MetricsChart;
