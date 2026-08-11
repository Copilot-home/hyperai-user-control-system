import { UserPreferences } from '../../types/user.types';

const userPreferencesKey = 'userPreferences';

// Function to get user preferences from local storage
export const getUserPreferences = (): UserPreferences | null => {
    const preferences = localStorage.getItem(userPreferencesKey);
    return preferences ? JSON.parse(preferences) : null;
};

// Function to set user preferences in local storage
export const setUserPreferences = (preferences: UserPreferences): void => {
    localStorage.setItem(userPreferencesKey, JSON.stringify(preferences));
};

// Function to clear user preferences from local storage
export const clearUserPreferences = (): void => {
    localStorage.removeItem(userPreferencesKey);
};