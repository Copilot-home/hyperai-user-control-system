import { useCallback, useEffect, useRef, useState } from 'react';
import { isWebSocketRuntimeEnabled } from '../services/runtimeFlags';

const useWebSocket = <T extends unknown = unknown>(
    url: string,
    onMessage?: (payload: T) => void
) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Event | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const runtimeEnabled = isWebSocketRuntimeEnabled;

    const teardown = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const connect = useCallback(() => {
        if (!runtimeEnabled) {
            console.info('WebSocket runtime is disabled in the current local contract.');
            return;
        }

        if (socketRef.current) {
            return;
        }

        const socket = new WebSocket(url);

        socket.onopen = () => {
            setIsConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data) as T;
                setData(parsed);
                onMessage?.(parsed);
            } catch (parseError) {
                console.error('Unable to parse WebSocket message:', parseError);
            }
        };

        socket.onerror = (event) => {
            setError(event);
        };

        socket.onclose = () => {
            setIsConnected(false);
            socketRef.current = null;
        };

        socketRef.current = socket;
    }, [onMessage, runtimeEnabled, url]);

    const disconnect = useCallback(() => {
        if (!socketRef.current) {
            return;
        }
        socketRef.current.close();
        socketRef.current = null;
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback(
        (message: unknown) => {
            if (!runtimeEnabled) {
                console.info('WebSocket runtime is disabled; sendMessage skipped.');
                return;
            }

            if (socketRef.current && isConnected) {
                socketRef.current.send(JSON.stringify(message));
            }
        },
        [isConnected, runtimeEnabled]
    );

    useEffect(() => {
        return () => {
            teardown();
        };
    }, [teardown]);

    return {
        connect,
        disconnect,
        sendMessage,
        data,
        error,
        isConnected,
        runtimeEnabled,
    };
};

export default useWebSocket;
