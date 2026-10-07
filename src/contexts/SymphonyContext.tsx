import React, { createContext, useContext, useState, useEffect } from 'react';
import { SymphonyState } from '../types/symphony.types';
import { getSymphonyMetrics } from '../services/api/symphonyAPI';

interface SymphonyContextType {
    symphonyState: SymphonyState;
    setSymphonyState: React.Dispatch<React.SetStateAction<SymphonyState>>;
    refreshMetrics: () => void;
    liveData?: any;
    wsConnected?: boolean;
}

const SymphonyContext = createContext<SymphonyContextType | undefined>(undefined);

export const SymphonyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [symphonyState, setSymphonyState] = useState<SymphonyState>({
        frequency: 269,
        uptime: '',
        ca_dao_broadcasts: 0,
        active_agents: 1,
        empathy_circulation: 'active',
    });

    const [wsConnected, setWsConnected] = useState<boolean>(false);
    const [liveData, setLiveData] = useState<any>(null);

    const refreshMetrics = async () => {
        const metrics = await getSymphonyMetrics();
        setSymphonyState(metrics);
    };

    useEffect(() => {
        // Initial fetch
        refreshMetrics();
        
        let ws: WebSocket;
        let reconnectTimer: NodeJS.Timeout;

        const connectWebSocket = () => {
            // Cổng 8000 là mặc định của Empathy Symphony API
            ws = new WebSocket('ws://localhost:8000/symphony/live');
            
            ws.onopen = () => {
                setWsConnected(true);
                console.log('Connected to Symphony Live WebSocket');
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLiveData(data);
                    
                    if (data.symphony_state) {
                        setSymphonyState(prev => ({
                            ...prev,
                            frequency: data.frequency || prev.frequency,
                            uptime: data.symphony_state.uptime || prev.uptime,
                            ca_dao_broadcasts: data.symphony_state.ca_dao_broadcasts || data.ca_dao_broadcast || prev.ca_dao_broadcasts,
                            active_agents: data.symphony_state.active_agents || prev.active_agents,
                            empathy_circulation: data.symphony_state.empathy_circulation || prev.empathy_circulation,
                        }));
                    }
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e);
                }
            };
            
            ws.onclose = () => {
                setWsConnected(false);
                console.log('Disconnected from Symphony Live WebSocket');
                // Reconnect logic
                reconnectTimer = setTimeout(connectWebSocket, 5000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                ws.close();
            };
        };

        connectWebSocket();

        return () => {
            clearTimeout(reconnectTimer);
            if (ws) {
                ws.close();
            }
        };
    }, []);

    return (
        <SymphonyContext.Provider value={{ symphonyState, setSymphonyState, refreshMetrics, liveData, wsConnected } as any}>
            {children}
        </SymphonyContext.Provider>
    );
};

export const useSymphonyContext = (): SymphonyContextType => {
    const context = useContext(SymphonyContext);
    if (!context) {
        throw new Error('useSymphony must be used within a SymphonyProvider');
    }
    return context;
};

export const useSymphony = useSymphonyContext;
