import React, { useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { SymphonyMetrics } from '../../types/symphony.types';
import styles from '../../styles/symphony.module.css';

const SymphonyVisualizer: React.FC = () => {
    const { connect, disconnect, runtimeEnabled, isConnected, error, data: metrics } =
        useWebSocket<SymphonyMetrics>('/symphony/live');

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return (
        <div className={styles.visualizerContainer}>
            <h2>Symphony Visualizer</h2>
            {!runtimeEnabled && (
                <p className={styles.quarantineNotice}>
                    WebSocket-driven metrics are quarantined until the live websocket lane is proven. Only local
                    instrumentation is available right now.
                </p>
            )}
            {runtimeEnabled && !isConnected && (
                <p className={styles.statusLine}>Awaiting the live websocket connection (port 8000 / 5000 may be blocked).</p>
            )}
            {error && <p className={styles.statusLine}>WebSocket error detected; relying on local fallbacks.</p>}
            {metrics ? (
                <div className={styles.metricsDisplay}>
                    <p>Empathy Pulse: {metrics.empathy_pulse}</p>
                    <p>Frequency: {metrics.frequency} Hz</p>
                    <p>Ca Dao Broadcast: {metrics.ca_dao_broadcast}</p>
                    <p>Uptime: {metrics.uptime}</p>
                </div>
            ) : (
                <p className={styles.loadingLine}>Loading metrics...</p>
            )}
        </div>
    );
};

export default SymphonyVisualizer;
