import { WebSocket } from 'ws';
import { runtimeConfig } from '../runtimeConfig';

const METRICS_SOCKET_RUNTIME_ENABLED =
    typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ENABLE_WEBSOCKET_RUNTIME === 'true';
const metricsSocket = METRICS_SOCKET_RUNTIME_ENABLED ? new WebSocket(runtimeConfig.socketNamespace('/metrics')) : null;

metricsSocket?.on('open', () => {
    console.log('Connected to metrics WebSocket');
});

metricsSocket?.on('message', (data) => {
    const metrics = JSON.parse(data);
    console.log('Received metrics:', metrics);
    // Handle metrics data (e.g., update state, trigger UI updates)
});

metricsSocket?.on('close', () => {
    console.log('Disconnected from metrics WebSocket');
});

metricsSocket?.on('error', (error) => {
    console.error('WebSocket error:', error);
});

export default metricsSocket;
