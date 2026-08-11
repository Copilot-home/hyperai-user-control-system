import React from 'react';
import { Line } from 'react-chartjs-2';
import { useEmpathy } from '../../hooks/useEmpathy';
import { EMPATHY_RUNTIME_ENABLED } from '../../services/api/empathyAPI';
import styles from '../../styles/empathy.module.css';
import '../../lib/chartSetup';

export const EmpathyFlow: React.FC = () => {
    const { empathyData } = useEmpathy();

    const data = {
        labels: empathyData.map((dataPoint) => dataPoint.timestamp),
        datasets: [
            {
                label: 'Empathy Level',
                data: empathyData.map((dataPoint) => dataPoint.level),
                fill: false,
                backgroundColor: 'rgba(75,192,192,0.4)',
                borderColor: 'rgba(75,192,192,1)',
            },
        ],
    };

    const options = {
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Empathy Level',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Time',
                },
            },
        },
    };

    return (
        <div className={styles.empathyFlowContainer}>
            <h2>Empathy Flow Over Time</h2>
            {!EMPATHY_RUNTIME_ENABLED && (
                <p className={styles.error}>
                    Empathy backend lane is currently frozen. This chart is showing local fallback telemetry only.
                </p>
            )}
            <Line data={data} options={options} />
        </div>
    );
};

export default EmpathyFlow;
