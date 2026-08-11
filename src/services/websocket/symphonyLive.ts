import { WebSocket } from 'ws';
import { runtimeConfig } from '../runtimeConfig';

const SYMPHONY_LIVE_SOCKET_RUNTIME_ENABLED =
    typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ENABLE_WEBSOCKET_RUNTIME === 'true';
const symphonyLiveSocket = SYMPHONY_LIVE_SOCKET_RUNTIME_ENABLED
    ? new WebSocket(runtimeConfig.socketNamespace('/symphony/live'))
    : null;

symphonyLiveSocket && (symphonyLiveSocket.onopen = () => {
    console.log('Connected to the symphony live feed');
});

symphonyLiveSocket && (symphonyLiveSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received live data:', data);
    // Handle the live data (e.g., update UI, store in state)
});

symphonyLiveSocket && (symphonyLiveSocket.onerror = (error) => {
    console.error('WebSocket error:', error);
});

symphonyLiveSocket && (symphonyLiveSocket.onclose = () => {
    console.log('Disconnected from the symphony live feed');
});

export default symphonyLiveSocket;
