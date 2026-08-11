// ------------------------------------------------------------------------------
// AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
// SYSTEM: HyperAI Phoenix – Unified Orchestrator
// AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong – Architect)
// ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
// LEGAL STATUS: This header is part of the identity & traceability layer.
// DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
// ------------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import {
    analyzeVietnameseText,
    generateCulturalContent,
    VietnameseAnalysisRequest,
    VietnameseGenerationRequest,
    VietnameseGenerationResponse,
} from '../services/api/vietnameseNLP';

export const useVietnameseNLP = (text = '') => {
    const [analysisResult, setAnalysisResult] = useState(null);
    const [generationResult, setGenerationResult] = useState<VietnameseGenerationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [generationLoading, setGenerationLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [analysisType, setAnalysisType] = useState('full');
    const [includeCulturalContext, setIncludeCulturalContext] = useState(true);
    const [includeTraditionalWisdom, setIncludeTraditionalWisdom] = useState(true);

    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await analyzeVietnameseText({
                    text,
                    analysis_type: analysisType,
                    include_cultural_context: includeCulturalContext,
                    include_traditional_wisdom: includeTraditionalWisdom,
                });
                setAnalysisResult(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (text) {
            fetchAnalysis();
        }
    }, [text, analysisType, includeCulturalContext, includeTraditionalWisdom]);

    const analyzeText = async (requestData: VietnameseAnalysisRequest) => {
        setLoading(true);
        setError(null);
        try {
            const result = await analyzeVietnameseText({
                text: requestData.text,
                analysis_type: requestData.analysis_type ?? analysisType,
                include_cultural_context: requestData.include_cultural_context ?? includeCulturalContext,
                include_traditional_wisdom: requestData.include_traditional_wisdom ?? includeTraditionalWisdom,
            });
            setAnalysisResult(result);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const generateContent = async (requestData: VietnameseGenerationRequest) => {
        setGenerationLoading(true);
        setGenerationError(null);
        try {
            const result = await generateCulturalContent(requestData);
            setGenerationResult(result);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to generate cultural content.';
            setGenerationError(message);
            throw err;
        } finally {
            setGenerationLoading(false);
        }
    };

    return {
        analysisResult,
        result: analysisResult,
        generationResult,
        loading,
        generationLoading,
        error,
        generationError,
        analysisType,
        includeCulturalContext,
        includeTraditionalWisdom,
        analyzeText,
        generateContent,
        setAnalysisType,
        setIncludeCulturalContext,
        setIncludeTraditionalWisdom,
    };
};
