import { render, screen, fireEvent } from '@testing-library/react';
import SymphonyDashboard from '../../src/components/control-panel/SymphonyDashboard';
import { SymphonyContext } from '../../src/contexts/SymphonyContext';

describe('SymphonyDashboard', () => {
    const mockState = {
        frequency: 269,
        activeAgents: 1,
        caDaoBroadcasts: 0,
        empathyCirculation: 'active',
    };

    const renderComponent = () => {
        return render(
            <SymphonyContext.Provider value={{ state: mockState }}>
                <SymphonyDashboard />
            </SymphonyContext.Provider>
        );
    };

    test('renders SymphonyDashboard component', () => {
        renderComponent();
        expect(screen.getByText(/Symphony Dashboard/i)).toBeInTheDocument();
    });

    test('displays the correct frequency', () => {
        renderComponent();
        expect(screen.getByText(/Frequency: 269/i)).toBeInTheDocument();
    });

    test('updates the frequency when the FrequencyTuner is used', () => {
        renderComponent();
        const frequencyTuner = screen.getByLabelText(/Adjust Frequency/i);
        fireEvent.change(frequencyTuner, { target: { value: 300 } });
        expect(screen.getByText(/Frequency: 300/i)).toBeInTheDocument();
    });

    test('displays the number of active agents', () => {
        renderComponent();
        expect(screen.getByText(/Active Agents: 1/i)).toBeInTheDocument();
    });

    test('displays the number of ca dao broadcasts', () => {
        renderComponent();
        expect(screen.getByText(/Ca Dao Broadcasts: 0/i)).toBeInTheDocument();
    });
});