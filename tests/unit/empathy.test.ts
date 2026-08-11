import { render, screen, fireEvent } from '@testing-library/react';
import ChatInterface from '../../src/components/chat/ChatInterface';
import { EmpathyContext } from '../../src/contexts/EmpathyContext';

describe('ChatInterface Component', () => {
    const setup = () => {
        render(
            <EmpathyContext.Provider value={{ empathyLevel: 5 }}>
                <ChatInterface />
            </EmpathyContext.Provider>
        );
    };

    test('renders chat interface', () => {
        setup();
        const chatInput = screen.getByPlaceholderText(/type your message/i);
        expect(chatInput).toBeInTheDocument();
    });

    test('allows user to send a message', () => {
        setup();
        const chatInput = screen.getByPlaceholderText(/type your message/i);
        const sendButton = screen.getByRole('button', { name: /send/i });

        fireEvent.change(chatInput, { target: { value: 'Hello, world!' } });
        fireEvent.click(sendButton);

        const messageBubble = screen.getByText(/hello, world!/i);
        expect(messageBubble).toBeInTheDocument();
    });

    test('displays empathy level', () => {
        setup();
        const empathyIndicator = screen.getByText(/empathy level: 5/i);
        expect(empathyIndicator).toBeInTheDocument();
    });
});