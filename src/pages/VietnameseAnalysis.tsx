// ------------------------------------------------------------------------------
// AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
// SYSTEM: HyperAI Phoenix – Unified Orchestrator
// AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong – Architect)
// ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
// LEGAL STATUS: This header is part of the identity & traceability layer.
// DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
// ------------------------------------------------------------------------------

import React, { useState } from 'react';
import { useVietnameseNLP } from '../hooks/useVietnameseNLP';
import { VIETNAMESE_RUNTIME_ENABLED, VietnameseAnalysisRequest } from '../services/api/vietnameseNLP';
import VietnameseNLPControls from '../components/control-panel/VietnameseNLPControls';
import { Button, LoadingSpinner } from '../components/shared';
import styles from '../styles/vietnamese.module.css';

const VietnameseAnalysis: React.FC = () => {
    const {
        analyzeText,
        generateContent,
        loading,
        generationLoading,
        result,
        generationResult,
        error,
        generationError,
        analysisType,
        includeCulturalContext,
        includeTraditionalWisdom,
        setAnalysisType,
        setIncludeCulturalContext,
        setIncludeTraditionalWisdom,
    } = useVietnameseNLP();
    const [text, setText] = useState<string>('');
    const [generationPrompt, setGenerationPrompt] = useState<string>('');
    const [culturalStyle, setCulturalStyle] = useState<string>('traditional');
    const [empathyLevel, setEmpathyLevel] = useState<string>('high');
    const [targetAudience, setTargetAudience] = useState<string>('enterprise');

    const handleAnalyze = async () => {
        const requestData: VietnameseAnalysisRequest = {
            text,
            analysis_type: analysisType,
            include_cultural_context: includeCulturalContext,
            include_traditional_wisdom: includeTraditionalWisdom,
        };
        await analyzeText(requestData);
    };

    const handleGenerate = async () => {
        await generateContent({
            prompt: generationPrompt,
            cultural_style: culturalStyle,
            empathy_level: empathyLevel,
            target_audience: targetAudience,
        });
    };

    return (
        <div className={styles.container}>
            <h1>Vietnamese Text Analysis</h1>
            <VietnameseNLPControls
                setText={setText}
                analysisType={analysisType}
                includeCulturalContext={includeCulturalContext}
                includeTraditionalWisdom={includeTraditionalWisdom}
                setAnalysisType={setAnalysisType}
                setIncludeCulturalContext={setIncludeCulturalContext}
                setIncludeTraditionalWisdom={setIncludeTraditionalWisdom}
            />
            {!VIETNAMESE_RUNTIME_ENABLED && (
                <p className={styles.error}>
                    Vietnamese runtime is currently operating in local fallback mode. Backend-backed analysis remains
                    quarantined until that lane is re-proven live.
                </p>
            )}
            <Button onClick={handleAnalyze} disabled={loading}>
                Analyze Text
            </Button>
            {loading && <LoadingSpinner />}
            {error && <p className={styles.error}>{error}</p>}
            {result && (
                <div className={styles.result}>
                    <h2>Analysis Result</h2>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
            <div className={styles.result}>
                <h2>Generate Cultural Content</h2>
                <label htmlFor="generationPrompt">Prompt</label>
                <textarea
                    id="generationPrompt"
                    className={styles.inputField}
                    value={generationPrompt}
                    onChange={(event) => setGenerationPrompt(event.target.value)}
                    placeholder="Describe the message or content you want to generate..."
                    rows={4}
                />
                <label htmlFor="culturalStyle">Cultural Style</label>
                <select
                    id="culturalStyle"
                    className={styles.inputField}
                    value={culturalStyle}
                    onChange={(event) => setCulturalStyle(event.target.value)}
                >
                    <option value="traditional">Traditional</option>
                    <option value="modern">Modern</option>
                    <option value="formal">Formal</option>
                </select>
                <label htmlFor="generationEmpathyLevel">Empathy Level</label>
                <select
                    id="generationEmpathyLevel"
                    className={styles.inputField}
                    value={empathyLevel}
                    onChange={(event) => setEmpathyLevel(event.target.value)}
                >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <label htmlFor="targetAudience">Target Audience</label>
                <select
                    id="targetAudience"
                    className={styles.inputField}
                    value={targetAudience}
                    onChange={(event) => setTargetAudience(event.target.value)}
                >
                    <option value="enterprise">Enterprise</option>
                    <option value="consumer">Consumer</option>
                    <option value="education">Education</option>
                </select>
                <Button
                    onClick={handleGenerate}
                    disabled={generationLoading}
                >
                    Generate Cultural Content
                </Button>
                {generationLoading && <LoadingSpinner />}
                {generationError && <p className={styles.error}>{generationError}</p>}
                {generationResult && (
                    <div className={styles.success}>
                        <h3>Generated Output</h3>
                        <p>{generationResult.content}</p>
                        <pre>{JSON.stringify(generationResult, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VietnameseAnalysis;
