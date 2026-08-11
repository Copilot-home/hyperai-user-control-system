import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NavigationBar.module.css';

export const NavigationBar: React.FC = () => {
    return (
        <nav className={styles.navigationBar}>
            <ul>
                <li>
                    <Link to="/">Workspace</Link>
                </li>
                <li>
                    <Link to="/missions">Missions</Link>
                </li>
                <li>
                    <Link to="/systems">Systems</Link>
                </li>
                <li>
                    <Link to="/symphony-control">Operator Control</Link>
                </li>
                <li>
                    <Link to="/settings">Settings</Link>
                </li>
            </ul>
        </nav>
    );
};

export default NavigationBar;
