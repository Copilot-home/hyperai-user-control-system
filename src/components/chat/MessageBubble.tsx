import React from 'react';
import './MessageBubble.css';

interface MessageBubbleProps {
    message: string;
    sender: 'user' | 'bot';
    timestamp: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, sender, timestamp }) => {
    return (
        <div className={`message-bubble ${sender}`}>
            <div className="message-content">
                <p>{message}</p>
                <span className="timestamp">{timestamp}</span>
            </div>
        </div>
    );
};

export default MessageBubble;