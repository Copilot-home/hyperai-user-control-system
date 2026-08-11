import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationBar } from '../components/user-interface/NavigationBar';
import { EmpathyMeter } from '../components/EmpathyMeter';
import { SymphonyController } from '../components/SymphonyController';
import { MetricsChart } from '../components/visualization/MetricsChart';

const DashboardScreen = () => {
    return (
        <View style={styles.container}>
            <NavigationBar />
            <Text style={styles.title}>Dashboard</Text>
            <EmpathyMeter />
            <SymphonyController />
            <MetricsChart />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
});

export default DashboardScreen;