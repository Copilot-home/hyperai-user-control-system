import React, { useEffect, useState } from 'react';
import { EMPATHY_RUNTIME_ENABLED, fetchAnalyticsData } from '../services/api/empathyAPI';
import { MetricsChart } from '../components/visualization/MetricsChart';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import styles from '../styles/empathy.module.css';

const Analytics = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getAnalyticsData = async () => {
            try {
                const data = await fetchAnalyticsData();
                setAnalyticsData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getAnalyticsData();
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    return (
        <div className={styles.analyticsContainer}>
            <h1>Analytics Dashboard</h1>
            {!EMPATHY_RUNTIME_ENABLED && (
                <p className={styles.error}>
                    Empathy analytics runtime is currently operating in local fallback mode.
                </p>
            )}
            <MetricsChart data={analyticsData} />
        </div>
    );
};

export default Analytics;
