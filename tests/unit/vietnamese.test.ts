import { render, screen, fireEvent } from '@testing-library/react';
import VietnameseNLPControls from '../../src/components/control-panel/VietnameseNLPControls';

describe('VietnameseNLPControls', () => {
    test('renders Vietnamese NLP controls', () => {
        render(<VietnameseNLPControls />);
        const titleElement = screen.getByText(/Vietnamese NLP Controls/i);
        expect(titleElement).toBeInTheDocument();
    });

    test('adjusts settings correctly', () => {
        render(<VietnameseNLPControls />);
        const toggleButton = screen.getByRole('checkbox', { name: /Enable Cultural Context/i });
        fireEvent.click(toggleButton);
        expect(toggleButton).toBeChecked();
    });

    test('calls the appropriate function on input change', () => {
        const mockFunction = jest.fn();
        render(<VietnameseNLPControls onChange={mockFunction} />);
        const inputElement = screen.getByLabelText(/Analysis Type/i);
        fireEvent.change(inputElement, { target: { value: 'full' } });
        expect(mockFunction).toHaveBeenCalledWith('full');
    });
});