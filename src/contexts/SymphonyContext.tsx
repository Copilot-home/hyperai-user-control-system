import React, { createContext, useContext, useState, useEffect } from 'react';
import { SymphonyState } from '../types/symphony.types';
import { getSymphonyMetrics } from '../services/api/symphonyAPI';

interface SymphonyContextType {
    symphonyState: SymphonyState;
    setSymphonyState: React.Dispatch<React.SetStateAction<SymphonyState>>;
    refreshMetrics: () => void;
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

    const refreshMetrics = async () => {
        const metrics = await getSymphonyMetrics();
        setSymphonyState(metrics);
    };

    useEffect(() => {
        const interval = setInterval(refreshMetrics, 5000); // Refresh metrics every 5 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <SymphonyContext.Provider value={{ symphonyState, setSymphonyState, refreshMetrics }}>
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
