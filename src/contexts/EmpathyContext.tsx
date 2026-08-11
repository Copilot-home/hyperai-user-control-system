import React, { createContext, useContext, useState, useEffect } from 'react';
import { EmpathyRequest, EmpathyResponse } from '../types/empathy.types';
import { processEmpathy } from '../services/api/empathyAPI';

interface EmpathyContextType {
    empathyScore: number;
    culturalBridge: string;
    caDaoWisdom: string;
    processedMessage: string;
    processingTimeMs: number;
    processEmpathy: (request: EmpathyRequest) => Promise<void>;
}

const EmpathyContext = createContext<EmpathyContextType | undefined>(undefined);

export const EmpathyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [empathyScore, setEmpathyScore] = useState<number>(0);
    const [culturalBridge, setCulturalBridge] = useState<string>('');
    const [caDaoWisdom, setCaDaoWisdom] = useState<string>('');
    const [processedMessage, setProcessedMessage] = useState<string>('');
    const [processingTimeMs, setProcessingTimeMs] = useState<number>(0);

    const processEmpathyRequest = async (request: EmpathyRequest) => {
        const startTime = performance.now();
        const response: EmpathyResponse = await processEmpathy(request);
        const endTime = performance.now();

        setEmpathyScore(response.empathy_score ?? 0);
        setCulturalBridge(response.cultural_bridge ?? '');
        setCaDaoWisdom(response.ca_dao_wisdom ?? '');
        setProcessedMessage(response.processed_message ?? '');
        setProcessingTimeMs(response.processing_time_ms ?? endTime - startTime);
    };

    return (
        <EmpathyContext.Provider value={{ empathyScore, culturalBridge, caDaoWisdom, processedMessage, processingTimeMs, processEmpathy: processEmpathyRequest }}>
            {children}
        </EmpathyContext.Provider>
    );
};

export const useEmpathy = (): EmpathyContextType => {
    const context = useContext(EmpathyContext);
    if (!context) {
        throw new Error('useEmpathy must be used within an EmpathyProvider');
    }
    return context;
};
