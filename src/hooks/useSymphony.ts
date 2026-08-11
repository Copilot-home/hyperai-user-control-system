import { useEffect, useState } from 'react';
import { getSymphonyMetrics, startSymphony, stopSymphony } from '../services/api/symphonyAPI';
import { useSymphonyContext } from '../contexts/SymphonyContext';

export const useSymphony = () => {
    const { symphonyState, setSymphonyState } = useSymphonyContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                const metrics = await getSymphonyMetrics();
                setSymphonyState(metrics);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [setSymphonyState]);

    const start = async () => {
        try {
            await startSymphony();
            setSymphonyState(prevState => ({ ...prevState, running: true }));
        } catch (err) {
            setError(err);
        }
    };

    const stop = async () => {
        try {
            await stopSymphony();
            setSymphonyState(prevState => ({ ...prevState, running: false }));
        } catch (err) {
            setError(err);
        }
    };

    return {
        symphonyState,
        loading,
        error,
        start,
        stop,
        startSymphony: start,
        stopSymphony: stop,
        isRunning: Boolean(symphonyState.running),
    };
};

export default useSymphony;
