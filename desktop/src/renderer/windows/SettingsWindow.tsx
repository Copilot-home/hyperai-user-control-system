import React, { useState } from 'react';
import { Button, Modal } from '../../shared';
import { UserPreferences } from '../../../services/storage/userPreferences';

const SettingsWindow: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);

    const handleOpenModal = () => {
        setIsModalOpen(true);
        // Load user preferences when the modal opens
        loadUserPreferences();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const loadUserPreferences = async () => {
        const userPrefs = await UserPreferences.getPreferences();
        setPreferences(userPrefs);
    };

    const handleSavePreferences = async () => {
        if (preferences) {
            await UserPreferences.savePreferences(preferences);
            handleCloseModal();
        }
    };

    return (
        <div>
            <Button onClick={handleOpenModal}>Open Settings</Button>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
                <h2>User Settings</h2>
                {/* Add form fields to edit user preferences here */}
                <Button onClick={handleSavePreferences}>Save Preferences</Button>
            </Modal>
        </div>
    );
};

export default SettingsWindow;