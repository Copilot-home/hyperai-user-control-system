import React, { useEffect, useState } from 'react';
import { useSymphonyContext } from '../../contexts/SymphonyContext';
import { updateSymphonyFrequency } from '../../services/api/symphonyAPI';

export const FrequencyTuner: React.FC = () => {
    const { symphonyState, setSymphonyState } = useSymphonyContext();
    const [frequency, setFrequency] = useState<number>(symphonyState.frequency ?? 269);

    useEffect(() => {
        setFrequency(symphonyState.frequency ?? 269);
    }, [symphonyState.frequency]);

    const handleFrequencyChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newFrequency = Number(event.target.value);
        setFrequency(newFrequency);
        setSymphonyState((prevState) => ({ ...prevState, frequency: newFrequency }));

        try {
            const nextState = await updateSymphonyFrequency(newFrequency);
            setSymphonyState((prevState) => ({ ...prevState, ...nextState }));
        } catch (error) {
            console.error('Unable to update symphony frequency:', error);
        }
    };

    return (
        <div className="frequency-tuner">
            <h2>Frequency Tuner</h2>
            <label htmlFor="frequency">Adjust Frequency (Hz):</label>
            <input
                type="number"
                id="frequency"
                value={frequency}
                onChange={handleFrequencyChange}
                min="100"
                max="1000"
            />
            <p>Current Frequency: {frequency} Hz</p>
        </div>
    );
};

export default FrequencyTuner;


