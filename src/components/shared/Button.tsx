import React from 'react';

interface ButtonProps {
    label?: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onClick,
    disabled = false,
    className = '',
    children,
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 ${className}`}
        >
            {children ?? label}
        </button>
    );
};

export default Button;
