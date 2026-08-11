import React, { useContext } from 'react';
import { SymphonyContext } from '../../contexts/SymphonyContext';
import { Button } from '../shared/Button';
import { useWebSocket } from '../../hooks/useWebSocket';

const SymphonyController: React.FC = () => {
    const { symphonyState, updateSymphony } = useContext(SymphonyContext);
    const { sendMessage } = useWebSocket();

    const handleStartSymphony = () => {
        sendMessage({ action: 'start' });
        updateSymphony({ isActive: true });
    };

    const handleStopSymphony = () => {
        sendMessage({ action: 'stop' });
        updateSymphony({ isActive: false });
    };

    return (
        <div className="symphony-controller">
            <h2>Symphony Controller</h2>
            <p>Status: {symphonyState.isActive ? 'Active' : 'Inactive'}</p>
            <Button onClick={handleStartSymphony} disabled={symphonyState.isActive}>
                Start Symphony
            </Button>
            <Button onClick={handleStopSymphony} disabled={!symphonyState.isActive}>
                Stop Symphony
            </Button>
        </div>
    );
};

export default SymphonyController;