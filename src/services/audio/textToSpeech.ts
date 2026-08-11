import { useEffect, useRef } from 'react';

const useTextToSpeech = (text, onEnd) => {
    const speechRef = useRef(null);

    useEffect(() => {
        if (text) {
            const speech = new SpeechSynthesisUtterance(text);
            speechRef.current = speech;

            speech.onend = () => {
                if (onEnd) {
                    onEnd();
                }
            };

            window.speechSynthesis.speak(speech);

            return () => {
                window.speechSynthesis.cancel();
            };
        }
    }, [text, onEnd]);

    return {
        speak: (newText) => {
            if (newText) {
                window.speechSynthesis.cancel(); // Stop any ongoing speech
                const speech = new SpeechSynthesisUtterance(newText);
                window.speechSynthesis.speak(speech);
            }
        },
        stop: () => {
            window.speechSynthesis.cancel();
        },
    };
};

export default useTextToSpeech;