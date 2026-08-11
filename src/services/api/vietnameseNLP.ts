// ------------------------------------------------------------------------------
// AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
// SYSTEM: HyperAI Phoenix – Unified Orchestrator
// AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong – Architect)
// ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
// LEGAL STATUS: This header is part of the identity & traceability layer.
// DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
// ------------------------------------------------------------------------------

import axios from 'axios';
import { getApiBaseUrl } from '../runtimeConfig';
import { isVietnameseRuntimeEnabled } from '../runtimeFlags';

export const VIETNAMESE_RUNTIME_ENABLED = isVietnameseRuntimeEnabled;

export interface VietnameseAnalysisRequest {
    text: string;
    analysis_type?: string;
    include_cultural_context?: boolean;
    include_traditional_wisdom?: boolean;
}

export interface VietnameseGenerationRequest {
    prompt: string;
    cultural_style?: string;
    empathy_level?: string;
    target_audience?: string;
}

export interface VietnameseGenerationResponse {
    prompt: string;
    culturalStyle: string;
    empathyLevel: string;
    targetAudience: string;
    content: string;
}

export const analyzeVietnameseText = async (request: VietnameseAnalysisRequest) => {
    if (!VIETNAMESE_RUNTIME_ENABLED) {
        const words = request.text.split(/\s+/).filter(Boolean);
        return {
            originalText: request.text,
            analysisType: request.analysis_type ?? 'full',
            wordSegmentation: words,
            posTags: words.map(() => 'N'),
            sentimentScore: request.text ? 0.5 : 0,
            culturalElements: request.include_cultural_context === false ? [] : ['local-fallback'],
            traditionalWisdom:
                request.include_traditional_wisdom === false
                    ? ''
                    : 'Vietnamese runtime is operating in local fallback mode.',
            runtimeMode: 'local-fallback',
        };
    }
    try {
        const response = await axios.post(`${getApiBaseUrl()}/vietnamese/analyze`, {
            text: request.text,
            analysis_type: request.analysis_type ?? 'full',
            include_cultural_context: request.include_cultural_context ?? true,
            include_traditional_wisdom: request.include_traditional_wisdom ?? true,
        });
        return response.data;
    } catch (error) {
        console.error('Error analyzing Vietnamese text:', error);
        throw error;
    }
};

export const generateCulturalContent = async (
    request: VietnameseGenerationRequest
): Promise<VietnameseGenerationResponse> => {
    if (!VIETNAMESE_RUNTIME_ENABLED) {
        return {
            prompt: request.prompt,
            culturalStyle: request.cultural_style ?? 'traditional',
            empathyLevel: request.empathy_level ?? 'high',
            targetAudience: request.target_audience ?? 'enterprise',
            content: `Local fallback Vietnamese content for: ${request.prompt}`,
        };
    }
    try {
        const response = await axios.post(`${getApiBaseUrl()}/vietnamese/generate`, {
            prompt: request.prompt,
            cultural_style: request.cultural_style ?? 'traditional',
            empathy_level: request.empathy_level ?? 'high',
            target_audience: request.target_audience ?? 'enterprise',
        });
        return response.data;
    } catch (error) {
        console.error('Error generating cultural content:', error);
        throw error;
    }
};
