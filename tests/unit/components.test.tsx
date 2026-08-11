import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatInterface from '../../src/components/chat/ChatInterface';
import MessageBubble from '../../src/components/chat/MessageBubble';
import VoiceInput from '../../src/components/chat/VoiceInput';
import EmpathyIndicator from '../../src/components/chat/EmpathyIndicator';
import SystemController from '../../src/components/control-panel/SystemController';
import FrequencyTuner from '../../src/components/control-panel/FrequencyTuner';
import SymphonyDashboard from '../../src/components/control-panel/SymphonyDashboard';
import VietnameseNLPControls from '../../src/components/control-panel/VietnameseNLPControls';
import EmpathyFlow from '../../src/components/visualization/EmpathyFlow';
import CulturalBridge from '../../src/components/visualization/CulturalBridge';
import SymphonyVisualizer from '../../src/components/visualization/SymphonyVisualizer';
import MetricsChart from '../../src/components/visualization/MetricsChart';
import NavigationBar from '../../src/components/user-interface/NavigationBar';
import UserProfile from '../../src/components/user-interface/UserProfile';
import SettingsPanel from '../../src/components/user-interface/SettingsPanel';
import NotificationCenter from '../../src/components/user-interface/NotificationCenter';
import Button from '../../src/components/shared/Button';
import Modal from '../../src/components/shared/Modal';
import LoadingSpinner from '../../src/components/shared/LoadingSpinner';
import Toast from '../../src/components/shared/Toast';

describe('Component Tests', () => {
    test('renders ChatInterface', () => {
        render(<ChatInterface />);
        expect(screen.getByText(/chat/i)).toBeInTheDocument();
    });

    test('renders MessageBubble', () => {
        render(<MessageBubble message="Hello" />);
        expect(screen.getByText(/hello/i)).toBeInTheDocument();
    });

    test('renders VoiceInput', () => {
        render(<VoiceInput />);
        expect(screen.getByLabelText(/voice input/i)).toBeInTheDocument();
    });

    test('renders EmpathyIndicator', () => {
        render(<EmpathyIndicator level={5} />);
        expect(screen.getByText(/empathy level/i)).toBeInTheDocument();
    });

    test('renders SystemController', () => {
        render(<SystemController />);
        expect(screen.getByText(/system controls/i)).toBeInTheDocument();
    });

    test('renders FrequencyTuner', () => {
        render(<FrequencyTuner />);
        expect(screen.getByText(/frequency tuner/i)).toBeInTheDocument();
    });

    test('renders SymphonyDashboard', () => {
        render(<SymphonyDashboard />);
        expect(screen.getByText(/symphony dashboard/i)).toBeInTheDocument();
    });

    test('renders VietnameseNLPControls', () => {
        render(<VietnameseNLPControls />);
        expect(screen.getByText(/vietnamese nlp controls/i)).toBeInTheDocument();
    });

    test('renders EmpathyFlow', () => {
        render(<EmpathyFlow />);
        expect(screen.getByText(/empathy flow/i)).toBeInTheDocument();
    });

    test('renders CulturalBridge', () => {
        render(<CulturalBridge />);
        expect(screen.getByText(/cultural bridge/i)).toBeInTheDocument();
    });

    test('renders SymphonyVisualizer', () => {
        render(<SymphonyVisualizer />);
        expect(screen.getByText(/symphony visualizer/i)).toBeInTheDocument();
    });

    test('renders MetricsChart', () => {
        render(<MetricsChart />);
        expect(screen.getByText(/metrics chart/i)).toBeInTheDocument();
    });

    test('renders NavigationBar', () => {
        render(<NavigationBar />);
        expect(screen.getByText(/navigation bar/i)).toBeInTheDocument();
    });

    test('renders UserProfile', () => {
        render(<UserProfile />);
        expect(screen.getByText(/user profile/i)).toBeInTheDocument();
    });

    test('renders SettingsPanel', () => {
        render(<SettingsPanel />);
        expect(screen.getByText(/settings panel/i)).toBeInTheDocument();
    });

    test('renders NotificationCenter', () => {
        render(<NotificationCenter />);
        expect(screen.getByText(/notification center/i)).toBeInTheDocument();
    });

    test('renders Button', () => {
        render(<Button label="Click me" />);
        expect(screen.getByText(/click me/i)).toBeInTheDocument();
    });

    test('renders Modal', () => {
        render(<Modal isOpen={true} onClose={() => {}} />);
        expect(screen.getByText(/modal content/i)).toBeInTheDocument();
    });

    test('renders LoadingSpinner', () => {
        render(<LoadingSpinner />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('renders Toast', () => {
        render(<Toast message="This is a toast" />);
        expect(screen.getByText(/this is a toast/i)).toBeInTheDocument();
    });
});