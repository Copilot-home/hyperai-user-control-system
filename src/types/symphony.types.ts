export interface SymphonyStatus {
    empathyCirculation: string;
    frequency: number;
    uptime: string;
    caDaoBroadcasts: number;
    activeAgents: number;
    soChungStatus: string;
}

export interface SymphonyState {
    status?: string;
    frequency: number;
    uptime: string;
    ca_dao_broadcasts: number;
    active_agents: number;
    empathy_circulation: string;
    running?: boolean;
    autonomy?: import('./runtime.types').AutonomyStatus;
}

export interface SymphonyStatusResponse {
    status: string;
    factory_metrics: Record<string, number>;
    frequency?: number;
    uptime?: string;
    empathy_circulation?: string;
    active_agents?: number;
    ca_dao_broadcasts?: number;
    autonomy?: import('./runtime.types').AutonomyStatus;
}

export interface HealthCheckResponse {
    status: string;
    timestamp: string;
    version: string;
    factoryMetrics: Record<string, any>;
}

export interface CulturalContentGenerationRequest {
    prompt: string;
    culturalStyle?: string;
    empathyLevel?: string;
    targetAudience?: string;
}

export interface CulturalContentGenerationResponse {
    generatedContent: string;
    culturalAuthenticity: number;
    empathyResonance: number;
    traditionalElements: any[];
    status: string;
}
