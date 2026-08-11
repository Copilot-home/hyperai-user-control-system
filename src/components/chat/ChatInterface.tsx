import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import VoiceInput from './VoiceInput';
import EmpathyIndicator from './EmpathyIndicator';
import { ChatMessage, sendMessage, receiveMessages } from '../../services/api/chatAPI';
import { getSymphonyStatus, startSymphony, stopSymphony } from '../../services/api/symphonyAPI';
import { getAutonomyStatus, heartbeatAutonomy, startAutonomy, stopAutonomy, tickAutonomy } from '../../services/api/autonomyAPI';

interface CommandResult {
    handled: boolean;
    message: string;
}

interface ChatInterfaceProps {
    messages?: ChatMessage[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages: seededMessages }) => {
    const history = useHistory();
    const [messages, setMessages] = useState<ChatMessage[]>(seededMessages ?? []);
    const [empathyLevel, setEmpathyLevel] = useState(0);
    const [commandStatus, setCommandStatus] = useState<string | null>(null);

    useEffect(() => {
        if (seededMessages && seededMessages.length > 0) {
            setMessages(seededMessages);
            return;
        }

        const fetchMessages = async () => {
            const initialMessages = await receiveMessages();
            setMessages(initialMessages);
        };

        fetchMessages();
    }, [seededMessages]);

    const appendSystemMessage = (message: string) => {
        const systemMessage: ChatMessage = {
            message,
            sender: 'bot',
            timestamp: new Date().toISOString(),
        };
        setMessages((prevMessages) => [...prevMessages, systemMessage]);
    };

    const handleCommand = async (message: string): Promise<CommandResult> => {
        const normalized = message.trim().toLowerCase();

        if (normalized === 'start symphony') {
            await startSymphony();
            return { handled: true, message: 'Symphony started successfully.' };
        }

        if (normalized === 'stop symphony') {
            await stopSymphony();
            return { handled: true, message: 'Symphony stopped successfully.' };
        }

        if (normalized === 'check status') {
            const status = await getSymphonyStatus();
            return {
                handled: true,
                message: `Symphony status: ${status.status ?? 'unknown'} at ${status.frequency ?? 'n/a'} Hz.`,
            };
        }

        if (normalized === 'open control panel') {
            history.push('/symphony-control');
            return { handled: true, message: 'Opened the Symphony control panel.' };
        }

        if (normalized === 'start autonomy') {
            const status = await startAutonomy();
            return { handled: true, message: `Autonomy runtime started in ${status.mode} mode.` };
        }

        if (normalized === 'stop autonomy') {
            const status = await stopAutonomy();
            return { handled: true, message: `Autonomy runtime stopped. Current mode: ${status.mode}.` };
        }

        if (normalized === 'autonomy status') {
            const status = await getAutonomyStatus();
            return {
                handled: true,
                message: `Autonomy is ${status.mode}. Objective: ${status.currentObjective?.title ?? 'unassigned'}. Heartbeat: ${status.heartbeat.status}.`,
            };
        }

        if (normalized === 'stabilize autonomy') {
            const status = await heartbeatAutonomy({
                source: 'chat-command',
                status: 'degraded',
                detail: 'Operator requested stabilization from the chat shell.',
            });
            return {
                handled: true,
                message: `Autonomy moved to ${status.mode}. Active objective: ${status.currentObjective?.title ?? 'unassigned'}.`,
            };
        }

        if (normalized === 'run autonomy tick') {
            const status = await tickAutonomy('chat-command');
            return {
                handled: true,
                message: `Autonomy tick executed. Last action: ${status.lastAction}.`,
            };
        }

        if (normalized === 'clear chat') {
            setMessages([]);
            return { handled: true, message: 'Chat history cleared.' };
        }

        return { handled: false, message: '' };
    };

    const handleSendMessage = async (message: string) => {
        try {
            const commandResult = await handleCommand(message);
            if (commandResult.handled) {
                setCommandStatus(commandResult.message);
                appendSystemMessage(commandResult.message);
                return;
            }
        } catch (error) {
            const failureMessage =
                error instanceof Error ? error.message : 'Voice command failed to execute.';
            setCommandStatus(failureMessage);
            appendSystemMessage(`Command failed: ${failureMessage}`);
            return;
        }

        const newMessages = await sendMessage(message);
        setMessages((prevMessages) => [...prevMessages, ...newMessages]);
        setEmpathyLevel((prevLevel) => Math.min(prevLevel + 5, 100));
        setCommandStatus('Chat is running in local-only fallback mode.');
    };

    return (
        <div className="chat-interface">
            <div className="chat-command-status" role="note">
                Local-only fallback lane. Use this surface for lightweight interaction and symphony commands,
                not as proof of live backend chat transport.
            </div>
            {commandStatus && (
                <div className="chat-command-status" role="status">
                    {commandStatus}
                </div>
            )}
            <div className="message-list">
                {messages.map((msg, index) => (
                    <MessageBubble
                        key={`${msg.timestamp}-${index}`}
                        message={msg.message}
                        sender={msg.sender}
                        timestamp={msg.timestamp}
                    />
                ))}
            </div>
            <EmpathyIndicator empathyLevel={empathyLevel} />
            <VoiceInput onSendMessage={handleSendMessage} />
        </div>
    );
};

export default ChatInterface;
