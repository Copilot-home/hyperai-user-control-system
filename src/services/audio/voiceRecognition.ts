import { useEffect, useState } from 'react';

const VoiceRecognitionService = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');

    useEffect(() => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const currentTranscript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            setTranscript(currentTranscript);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        return () => {
            recognition.stop();
        };
    }, []);

    const startListening = () => {
        setTranscript('');
        recognition.start();
    };

    const stopListening = () => {
        recognition.stop();
    };

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
    };
};

export default VoiceRecognitionService;