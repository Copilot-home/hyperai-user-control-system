import React from 'react';
import { useEmpathy } from '../../hooks/useEmpathy';
import styles from '../../styles/empathy.module.css';

const EmpathyMeter: React.FC = () => {
    const { empathyLevel } = useEmpathy();

    return (
        <div className={styles.empathyMeter}>
            <h2>Empathy Level</h2>
            <div className={styles.meter}>
                <div
                    className={styles.filled}
                    style={{ width: `${empathyLevel}%` }}
                />
            </div>
            <span>{empathyLevel}%</span>
        </div>
    );
};

export default EmpathyMeter;