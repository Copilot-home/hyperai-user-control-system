import React from 'react';
import { useSymphony } from '../../hooks/useSymphony';
import { Button } from '../shared/Button';
import { AutonomyPanel } from './AutonomyPanel';
import { FrequencyTuner } from './FrequencyTuner';
import { SymphonyDashboard } from './SymphonyDashboard';

export const SystemController: React.FC = () => {
    const { startSymphony, stopSymphony, isRunning } = useSymphony();

    return (
        <div className="system-controller">
            <h2>System Controller</h2>
            <div className="controls">
                <Button onClick={isRunning ? stopSymphony : startSymphony}>
                    {isRunning ? 'Stop Symphony' : 'Start Symphony'}
                </Button>
                <FrequencyTuner />
            </div>
            <SymphonyDashboard />
            <AutonomyPanel />
        </div>
    );
};

export default SystemController;

