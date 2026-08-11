import React, { useState } from 'react';
import { useVoiceControl } from '../../hooks/useVoiceControl';
import { Button } from '../shared/Button';
import styles from './VoiceInput.module.css';

interface VoiceInputProps {
    onSendMessage: (message: string) => Promise<void> | void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onSendMessage }) => {
    const {
        startListening,
        stopListening,
        resetTranscript,
        isListening,
        transcript,
        browserSupportsSpeechRecognition,
    } = useVoiceControl();
    const [message, setMessage] = useState('');

    const handleSendMessage = async () => {
        if (!message.trim()) {
            return;
        }
        await onSendMessage(message.trim());
        setMessage('');
        resetTranscript();
    };

    const handleVoiceInput = () => {
        if (!browserSupportsSpeechRecognition) {
            return;
        }
        if (isListening) {
            stopListening();
            setMessage(transcript.trim());
        } else {
            startListening();
        }
    };

    return (
        <div className={styles.voiceInputContainer}>
            <Button
                label={isListening ? 'Stop Listening' : 'Start Listening'}
                onClick={handleVoiceInput}
                disabled={!browserSupportsSpeechRecognition}
            />
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message or use voice input..."
                rows={3}
                className={styles.textArea}
            />
            {!browserSupportsSpeechRecognition && (
                <p className={styles.status}>Voice recognition is unavailable in this browser.</p>
            )}
            <Button label="Send" onClick={handleSendMessage} disabled={!message} />
        </div>
    );
};

export default VoiceInput;
