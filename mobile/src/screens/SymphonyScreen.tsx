import React, { useEffect, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SymphonyContext } from '../contexts/SymphonyContext';
import SymphonyController from '../components/SymphonyController';
import EmpathyMeter from '../components/EmpathyMeter';
import { useWebSocket } from '../hooks/useWebSocket';

const SymphonyScreen = () => {
    const { symphonyState, updateSymphonyState } = useContext(SymphonyContext);
    const { connect, disconnect } = useWebSocket();

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Symphony Control</Text>
            <EmpathyMeter empathyLevel={symphonyState.empathyLevel} />
            <SymphonyController />
            <Text style={styles.status}>Current Status: {symphonyState.status}</Text>
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
    status: {
        marginTop: 20,
        fontSize: 16,
    },
});

export default SymphonyScreen;