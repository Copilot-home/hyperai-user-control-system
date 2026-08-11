import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

const VietnameseKeyboard: React.FC = () => {
    const [inputValue, setInputValue] = React.useState('');

    const handleInputChange = (text: string) => {
        setInputValue(text);
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={handleInputChange}
                placeholder="Nhập văn bản tiếng Việt"
                multiline
                numberOfLines={4}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    input: {
        height: 100,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
    },
});

export default VietnameseKeyboard;