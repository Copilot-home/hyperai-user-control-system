// ------------------------------------------------------------------------------
// AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
// SYSTEM: HyperAI Phoenix – Unified Orchestrator
// AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong – Architect)
// ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
// LEGAL STATUS: This header is part of the identity & traceability layer.
// DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
// ------------------------------------------------------------------------------

import { useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export const useVoiceControl = (onCommand?: (command: string) => void) => {
    const {
        transcript,
        resetTranscript,
        browserSupportsSpeechRecognition,
        listening,
    } = useSpeechRecognition();

    useEffect(() => {
        if (!browserSupportsSpeechRecognition) {
            console.error('Browser does not support speech recognition.');
            return;
        }

        const handleCommand = (command: string) => {
            onCommand?.(command);
            resetTranscript();
        };

        if (transcript) {
            handleCommand(transcript);
        }
    }, [transcript, onCommand, resetTranscript, browserSupportsSpeechRecognition]);

    const startListening = () => {
        resetTranscript();
        SpeechRecognition.startListening({ continuous: true });
    };

    const stopListening = () => {
        SpeechRecognition.stopListening();
    };

    return {
        startListening,
        stopListening,
        resetTranscript,
        transcript,
        isListening: listening,
        browserSupportsSpeechRecognition,
    };
};

export default useVoiceControl;
