import React, { useState } from 'react';
import { Button } from '../shared/Button';
import { UserProfile } from './UserProfile';
import { NotificationCenter } from './NotificationCenter';
import { useUserContext } from '../../contexts/UserContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import styles from './SettingsPanel.module.css';

export const SettingsPanel: React.FC = () => {
    const { userPreferences, updateUserPreferences } = useUserContext();
    const { theme, toggleTheme } = useThemeContext();
    const [notificationsEnabled, setNotificationsEnabled] = useState(userPreferences.notificationsEnabled);

    const handleSavePreferences = () => {
        updateUserPreferences({ notificationsEnabled });
    };

    return (
        <div className={styles.settingsPanel}>
            <h2>Settings</h2>
            <p className={styles.localOnlyNotice}>
                This panel is running in local-only mode. Websocket and backend user sync remain outside the active runtime contract.
            </p>
            <UserProfile />
            <div className={styles.notificationSettings}>
                <h3>Notification Settings</h3>
                <label>
                    <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                    />
                    Enable Notifications
                </label>
            </div>
            <div className={styles.themeToggle}>
                <h3>Theme</h3>
                <Button onClick={toggleTheme}>
                    Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
                </Button>
            </div>
            <Button onClick={handleSavePreferences}>Save Preferences</Button>
            <NotificationCenter />
        </div>
    );
};

export default SettingsPanel;
