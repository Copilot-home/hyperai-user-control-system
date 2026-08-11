import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useUserPreferences } from '../hooks/useUserPreferences';

const SettingsScreen = () => {
    const { preferences, updatePreferences } = useUserPreferences();

    const toggleTheme = () => {
        updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Dark Theme</Text>
                <Switch
                    value={preferences.theme === 'dark'}
                    onValueChange={toggleTheme}
                />
            </View>
            {/* Additional settings can be added here */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 10,
    },
    settingLabel: {
        fontSize: 18,
    },
});

export default SettingsScreen;