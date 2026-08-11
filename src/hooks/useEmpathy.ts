import { useState, useEffect } from 'react';
import { getEmpathyScore, subscribeToEmpathyUpdates } from '../services/api/empathyAPI';

export const useEmpathy = () => {
    const [empathyScore, setEmpathyScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [empathyData, setEmpathyData] = useState([{ timestamp: new Date().toISOString(), level: 0 }]);

    useEffect(() => {
        const fetchEmpathyScore = async () => {
            try {
                const score = await getEmpathyScore();
                setEmpathyScore(score);
                setEmpathyData([{ timestamp: new Date().toISOString(), level: score }]);
            } catch (error) {
                console.error('Error fetching empathy score:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEmpathyScore();

        const unsubscribe = subscribeToEmpathyUpdates((newScore) => {
            setEmpathyScore(newScore);
            setEmpathyData([{ timestamp: new Date().toISOString(), level: newScore }]);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return { empathyScore, empathyData, loading };
};

export default useEmpathy;
