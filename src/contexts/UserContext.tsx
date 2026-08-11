import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserPreferences } from '../types/user.types';
import { getCurrentUser, upsertCurrentUser } from '../services/api/userAPI';
import { getUserPreferences, setUserPreferences } from '../services/storage/userPreferences';
import { isUserRuntimeEnabled } from '../services/runtimeFlags';

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    updateUser: (user: User) => void;
    userPreferences: UserPreferences;
    updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
}

const defaultPreferences: UserPreferences = {
    language: 'vi',
    theme: 'light',
    notificationsEnabled: true,
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userPreferences, setUserPreferencesState] = useState<UserPreferences>(() => getUserPreferences() ?? defaultPreferences);

    useEffect(() => {
        setUserPreferences(userPreferences);
    }, [userPreferences]);

    useEffect(() => {
        const loadUser = async () => {
            if (!isUserRuntimeEnabled) {
                setUser({
                    id: 'local-user',
                    name: 'operator',
                    email: '',
                    preferences: userPreferences,
                });
                return;
            }

            try {
                const runtimeUser = await getCurrentUser();
                setUser(runtimeUser);
                if (runtimeUser.preferences) {
                    setUserPreferencesState(runtimeUser.preferences);
                }
            } catch (error) {
                setUser({
                    id: 'runtime-user-fallback',
                    name: 'operator',
                    email: '',
                    preferences: userPreferences,
                });
            }
        };

        loadUser();
    }, []);

    const updateUser = (nextUser: User) => {
        setUser(nextUser);
        if (typeof nextUser.preferences === 'object' && nextUser.preferences !== null) {
            setUserPreferencesState(nextUser.preferences);
        }

        if (isUserRuntimeEnabled) {
            void upsertCurrentUser(nextUser).catch(() => undefined);
        }
    };

    const updateUserPreferences = (preferences: Partial<UserPreferences>) => {
        setUserPreferencesState((prev) => {
            const nextPreferences = { ...prev, ...preferences };
            if (user) {
                const nextUser = { ...user, preferences: nextPreferences };
                setUser(nextUser);
                if (isUserRuntimeEnabled) {
                    void upsertCurrentUser(nextUser).catch(() => undefined);
                }
            }
            return nextPreferences;
        });
    };

    return (
        <UserContext.Provider
            value={{ user, setUser, updateUser, userPreferences, updateUserPreferences }}
        >
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export const useUserContext = useUser;
