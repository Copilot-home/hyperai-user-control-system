import { BoundaryAutonomySnapshot } from '../../types/runtime.types';

const STORAGE_KEY = 'hyperai_autonomy_boundary_snapshot';

export const readAutonomyBoundarySnapshot = (): BoundaryAutonomySnapshot | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const payload = window.localStorage.getItem(STORAGE_KEY);
        return payload ? JSON.parse(payload) as BoundaryAutonomySnapshot : null;
    } catch (error) {
        console.warn('Unable to read autonomy boundary snapshot:', error);
        return null;
    }
};

export const writeAutonomyBoundarySnapshot = (snapshot: BoundaryAutonomySnapshot): void => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.warn('Unable to persist autonomy boundary snapshot:', error);
    }
};
