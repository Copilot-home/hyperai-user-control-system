import React from 'react';
import { useSymphony } from '../../hooks/useSymphony';
import { Button } from '../../components/shared/Button';
import { SymphonyDashboard } from '../control-panel/SymphonyDashboard';
import { EmpathyFlow } from '../visualization/EmpathyFlow';
import { CulturalBridge } from '../visualization/CulturalBridge';

const SymphonyWindow: React.FC = () => {
    const { symphonyState, startSymphony, stopSymphony } = useSymphony();

    return (
        <div className="symphony-window">
            <h1>🎶 Symphony Control</h1>
            <SymphonyDashboard state={symphonyState} />
            <EmpathyFlow />
            <CulturalBridge />
            <div className="controls">
                <Button onClick={startSymphony}>Start Symphony</Button>
                <Button onClick={stopSymphony}>Stop Symphony</Button>
            </div>
        </div>
    );
};

export default SymphonyWindow;