import React from 'react';
import { Toast } from '../shared/Toast';

export const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = React.useState<string[]>([]);

    const addNotification = (message: string) => {
        setNotifications((prev) => [...prev, message]);
    };

    const removeNotification = (index: number) => {
        setNotifications((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="notification-center">
            {notifications.map((notification, index) => (
                <Toast key={index} message={notification} onClose={() => removeNotification(index)} />
            ))}
        </div>
    );
};

export default NotificationCenter;
