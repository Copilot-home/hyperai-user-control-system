import React, { useState, useEffect } from 'react';
import { Button } from '../shared/Button';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { useVoiceControl } from '../../hooks/useVoiceControl';

const VoiceRecorder: React.FC = () => {
    const { startRecording, stopRecording, isRecording, audioUrl } = useVoiceControl();
    const [isLoading, setIsLoading] = useState(false);

    const handleStartRecording = async () => {
        setIsLoading(true);
        await startRecording();
        setIsLoading(false);
    };

    const handleStopRecording = async () => {
        setIsLoading(true);
        await stopRecording();
        setIsLoading(false);
    };

    useEffect(() => {
        if (audioUrl) {
            // Handle the audio URL (e.g., play it, upload it, etc.)
            console.log('Audio recorded:', audioUrl);
        }
    }, [audioUrl]);

    return (
        <div className="voice-recorder">
            <h2>Voice Recorder</h2>
            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <div>
                    <Button onClick={isRecording ? handleStopRecording : handleStartRecording}>
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default VoiceRecorder;