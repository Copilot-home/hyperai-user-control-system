import { useEffect, useRef } from 'react';

const useFrequencyGenerator = (frequency: number, duration: number) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);

    useEffect(() => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();

        oscillator.type = 'sine'; // You can change the type to 'square', 'sawtooth', or 'triangle'
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.connect(audioContext.destination);
        oscillator.start();

        oscillatorRef.current = oscillator;
        audioContextRef.current = audioContext;

        const stopOscillator = () => {
            if (oscillatorRef.current) {
                oscillatorRef.current.stop();
                oscillatorRef.current.disconnect();
                audioContextRef.current?.close();
            }
        };

        const timeoutId = setTimeout(stopOscillator, duration);

        return () => {
            clearTimeout(timeoutId);
            stopOscillator();
        };
    }, [frequency, duration]);
};

export default useFrequencyGenerator;