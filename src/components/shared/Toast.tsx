import React from 'react';

interface ToastProps {
    message: string;
    duration?: number; // Duration in milliseconds
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, duration = 3000, onClose }) => {
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className="toast">
            {message}
        </div>
    );
};

export default Toast;
