import axios from 'axios';
import { getApiBaseUrl } from '../runtimeConfig';
import { isChatRuntimeEnabled } from '../runtimeFlags';

export interface ChatMessage {
    message: string;
    sender: 'user' | 'bot';
    timestamp: string;
}

export const CHAT_RUNTIME_ENABLED = isChatRuntimeEnabled;

const fallbackMessages: ChatMessage[] = [
    {
        message: 'HyperAI cockpit channel initialized in local-only mode.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
    },
    {
        message: 'Symphony commands remain live. Backend chat transport is not part of the proven runtime contract.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
    },
];

const buildLocalSystemReply = (message: string): ChatMessage => ({
    message,
    sender: 'bot',
    timestamp: new Date().toISOString(),
});

export const receiveMessages = async (): Promise<ChatMessage[]> => {
    if (!CHAT_RUNTIME_ENABLED) {
        return fallbackMessages;
    }
    try {
        const response = await axios.get<ChatMessage[]>(`${getApiBaseUrl()}/chat/messages`);
        return Array.isArray(response.data) ? response.data : fallbackMessages;
    } catch (error) {
        console.warn('Falling back to local chat seed:', error);
        return fallbackMessages;
    }
};

export const sendMessage = async (message: string): Promise<ChatMessage[]> => {
    const payload: ChatMessage = {
        message,
        sender: 'user',
        timestamp: new Date().toISOString(),
    };

    if (!CHAT_RUNTIME_ENABLED) {
        const normalized = message.trim().toLowerCase();
        let fallbackReply =
            'Local chat fallback captured your message. No live backend chat route is currently attached.';

        if (normalized.includes('symphony')) {
            fallbackReply =
                'Symphony control remains the authoritative live lane. Use start symphony, stop symphony, or check status.';
        } else if (normalized.includes('status')) {
            fallbackReply =
                'Chat transport is degraded. Use the explicit "check status" command to query the live symphony backend.';
        } else if (normalized.includes('help')) {
            fallbackReply =
                'Available local commands: start symphony, stop symphony, check status, open control panel, clear chat.';
        }

        return [payload, buildLocalSystemReply(fallbackReply)];
    }

    try {
        const response = await axios.post<ChatMessage>(`${getApiBaseUrl()}/chat/messages`, payload);
        return [response.data ?? payload];
    } catch (error) {
        console.warn('Falling back to local chat echo:', error);
        return [
            payload,
            buildLocalSystemReply(
                'Backend chat transport did not respond. Falling back to local-only chat lane.',
            ),
        ];
    }
};
