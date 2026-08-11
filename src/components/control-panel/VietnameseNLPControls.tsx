// ------------------------------------------------------------------------------
// AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
// SYSTEM: HyperAI Phoenix – Unified Orchestrator
// AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong – Architect)
// ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
// LEGAL STATUS: This header is part of the identity & traceability layer.
// DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
// ------------------------------------------------------------------------------

import React from 'react';
import { Button } from '../shared/Button';
import styles from '../../styles/vietnamese.module.css';

interface VietnameseNLPControlsProps {
    setText?: React.Dispatch<React.SetStateAction<string>>;
    analysisType: string;
    includeCulturalContext: boolean;
    includeTraditionalWisdom: boolean;
    setAnalysisType: (value: string) => void;
    setIncludeCulturalContext: (value: boolean) => void;
    setIncludeTraditionalWisdom: (value: boolean) => void;
}

export const VietnameseNLPControls: React.FC<VietnameseNLPControlsProps> = ({
    setText,
    analysisType,
    includeCulturalContext,
    includeTraditionalWisdom,
    setAnalysisType,
    setIncludeCulturalContext,
    setIncludeTraditionalWisdom,
}) => {
    const handleAnalysisTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setAnalysisType(event.target.value);
    };

    const handleCulturalContextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIncludeCulturalContext(event.target.checked);
    };

    const handleTraditionalWisdomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIncludeTraditionalWisdom(event.target.checked);
    };

    return (
        <div className={styles.controlPanel}>
            <h2>Vietnamese NLP Controls</h2>
            <div>
                <label htmlFor="analysisType">Analysis Type:</label>
                <select id="analysisType" value={analysisType} onChange={handleAnalysisTypeChange}>
                    <option value="full">Full Analysis</option>
                    <option value="summary">Summary Analysis</option>
                </select>
            </div>
            {setText && (
                <div>
                    <label htmlFor="analysisText">Text:</label>
                    <textarea
                        id="analysisText"
                        onChange={(event) => setText(event.target.value)}
                    />
                </div>
            )}
            <div>
                <label>
                    <input
                        type="checkbox"
                        checked={includeCulturalContext}
                        onChange={handleCulturalContextChange}
                    />
                    Include Cultural Context
                </label>
            </div>
            <div>
                <label>
                    <input
                        type="checkbox"
                        checked={includeTraditionalWisdom}
                        onChange={handleTraditionalWisdomChange}
                    />
                    Include Traditional Wisdom
                </label>
            </div>
            <Button onClick={() => console.log('Settings saved!')}>Save Settings</Button>
        </div>
    );
};

export default VietnameseNLPControls;
