import React from 'react';
import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { Button } from '../components/shared/Button';
import { SettingsPanel } from '../components/user-interface/SettingsPanel';

const Settings: React.FC = () => {
    const { userPreferences, updateUserPreferences } = useContext(UserContext);

    const handleSave = (preferences: any) => {
        updateUserPreferences(preferences);
    };

    return (
        <div className="settings-container">
            <h1>Settings</h1>
            <p>
                Settings currently persist in local UI state. The backend user lane is quarantined until it is
                re-proven live.
            </p>
            <SettingsPanel preferences={userPreferences} onSave={handleSave} />
            <Button onClick={() => handleSave(userPreferences)}>Save Changes</Button>
        </div>
    );
};

export default Settings;
