import React from 'react';
import styles from './EmpathyIndicator.module.css';

interface EmpathyIndicatorProps {
    empathyLevel: number; // A value between 0 and 100 representing the empathy level
}

const EmpathyIndicator: React.FC<EmpathyIndicatorProps> = ({ empathyLevel }) => {
    const getColor = (level: number) => {
        if (level < 30) return 'red';
        if (level < 70) return 'yellow';
        return 'green';
    };

    return (
        <div className={styles.indicatorContainer}>
            <div
                className={styles.indicator}
                style={{ backgroundColor: getColor(empathyLevel) }}
            >
                <span className={styles.levelText}>{empathyLevel}% Empathy</span>
            </div>
        </div>
    );
};

export default EmpathyIndicator;