import React from 'react';
import { SystemController } from '../components/control-panel/SystemController';
import { RuntimeLaneStatus } from '../components/control-panel/RuntimeLaneStatus';

const SymphonyControl: React.FC = () => {
    return (
        <div className="symphony-control">
            <h1>Symphony Control Panel</h1>
            <p>
                This control surface anchors the active autonomy and symphony command lane. Other browser-facing lanes
                remain quarantined, degraded, or local-only until runtime authority is fresh and promotion is
                deliberate.
            </p>
            <SystemController />
            <RuntimeLaneStatus />
        </div>
    );
};

export default SymphonyControl;
