import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserPreferences } from '../types/user.types';
import { getCurrentUser, upsertCurrentUser } from '../services/api/userAPI';
import { getUserPreferences, setUserPreferences } from '../services/storage/userPreferences';
import { isUserRuntimeEnabled } from '../services/runtimeFlags';
import { resolvePrincipal, resolveEffectiveCapabilities, validatePrincipalSession } from '../services/localAuthority';

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    updateUser: (user: User) => void;
    userPreferences: UserPreferences;
    updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
    capabilityFailures: Array<{ capability: string; reason: string }>;
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
    const [capabilityFailures, setCapabilityFailures] = useState<Array<{ capability: string; reason: string }>>([]);

    useEffect(() => {
        setUserPreferences(userPreferences);
    }, [userPreferences]);

    useEffect(() => {
        const loadUser = async () => {
            if (!isUserRuntimeEnabled) {
                // runtime build does not include user implementation
                setCapabilityFailures([{ capability: '*', reason: 'CAPABILITY_NOT_IMPLEMENTED' }]);
                return;
            }

            try {
                const runtimeUser = await getCurrentUser();
                const principal = resolvePrincipal(runtimeUser);

                if (!principal) {
                    setCapabilityFailures([{ capability: '*', reason: 'UNKNOWN_PRINCIPAL' }]);
                    setUser({
                        id: 'unknown',
                        name: 'unknown',
                        email: '',
                        preferences: userPreferences,
                    });
                    return;
                }

                const sessionValidation = validatePrincipalSession(principal, null);
                if (!sessionValidation.valid) {
                    setCapabilityFailures([{ capability: '*', reason: sessionValidation.failure ?? 'SESSION_INVALID' }]);
                    setUser({
                        id: principal.principal_id,
                        name: principal.display_name,
                        email: principal.email,
                        preferences: userPreferences,
                        principal,
                    });
                    return;
                }

                const resolved = await resolveEffectiveCapabilities(principal);
                setCapabilityFailures(resolved.failures);

                const boundUser: User = {
                    id: principal.principal_id,
                    name: principal.display_name,
                    email: principal.email,
                    preferences: runtimeUser.preferences ?? userPreferences,
                    principal: resolved.principal,
                    authority: resolved.authority,
                    capabilities: resolved.capabilities,
                };

                setUser(boundUser);
            } catch (error) {
                setCapabilityFailures([{ capability: '*', reason: 'SESSION_INVALID' }]);
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

    const updateUser = async (updated: User) => {
        if (!isUserRuntimeEnabled || !user) {
            setUser(updated);
            return;
        }
        try {
            const saved = await upsertCurrentUser(updated);
            const principal = resolvePrincipal(saved);
            if (principal) {
                const resolved = await resolveEffectiveCapabilities(principal);
                setCapabilityFailures(resolved.failures);
                setUser({ ...saved, principal: resolved.principal, authority: resolved.authority, capabilities: resolved.capabilities });
            } else {
                setUser(saved);
            }
        } catch {
            setUser(updated);
        }
    };

    const updateUserPreferences = (preferences: Partial<UserPreferences>) => {
        setUserPreferencesState((prev) => {
            const next = { ...prev, ...preferences };
            setUserPreferences(next);
            return next;
        });
    };

    return (
        <UserContext.Provider value={{ user, setUser, updateUser, userPreferences, updateUserPreferences, capabilityFailures }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export const useUserContext = useUser;
