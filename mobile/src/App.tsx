import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { EmpathyProvider } from './contexts/EmpathyContext';
import { SymphonyProvider } from './contexts/SymphonyContext';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/globals.css';

const App = () => {
  return (
    <EmpathyProvider>
      <SymphonyProvider>
        <UserProvider>
          <ThemeProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </UserProvider>
      </SymphonyProvider>
    </EmpathyProvider>
  );
};

export default App;