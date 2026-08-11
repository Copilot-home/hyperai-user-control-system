import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { chatSocket } from '../services/websocket/chatSocket';
import MessageBubble from '../components/chat/MessageBubble';
import VoiceInput from '../components/chat/VoiceInput';
import EmpathyIndicator from '../components/chat/EmpathyIndicator';

const ChatScreen = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');

    useEffect(() => {
        chatSocket.on('message', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        return () => {
            chatSocket.off('message');
        };
    }, []);

    const sendMessage = () => {
        if (inputMessage.trim()) {
            chatSocket.emit('message', { text: inputMessage });
            setInputMessage('');
        }
    };

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <FlatList
                data={messages}
                renderItem={({ item }) => <MessageBubble message={item} />}
                keyExtractor={(item, index) => index.toString()}
                inverted
            />
            <EmpathyIndicator />
            <TextInput
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Type a message..."
                style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
            />
            <Button title="Send" onPress={sendMessage} />
            <VoiceInput />
        </View>
    );
};

export default ChatScreen;