// empathy.types.ts

export interface EmpathyRequest {
    message: string;
    context?: Record<string, any>;
    frequency?: number;
    cultural_mode?: string;
}

export interface EmpathyResponse {
    empathy_score: number;
    cultural_bridge: string;
    ca_dao_wisdom: string;
    processed_message: string;
    symphony_resonance: number;
    processing_time_ms: number;
}

export interface EmpathyProcessingError {
    message: string;
    code: number;
}