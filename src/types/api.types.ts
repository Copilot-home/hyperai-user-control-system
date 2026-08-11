export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface UserApiResponse {
    id: string;
    name: string;
    email: string;
    preferences: Record<string, any>;
}

export interface EmpathyApiResponse {
    empathyScore: number;
    culturalBridge: string;
    caDaoWisdom: string;
    processedMessage: string;
}

export interface SymphonyApiResponse {
    status: string;
    frequency: number;
    uptime: string;
    metrics: Record<string, any>;
}

export interface VietnameseNlpApiResponse {
    originalText: string;
    wordSegmentation: string[];
    posTags: string[];
    sentimentScore: number;
    culturalElements: string[];
    traditionalWisdom: string;
}