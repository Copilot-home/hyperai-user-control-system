import { LocalPrincipal, LocalAuthority } from './local.types';

export interface User {
    id: string;
    name: string;
    email: string;
    preferences: UserPreferences;
    username?: string;
    principal?: LocalPrincipal;
    authority?: LocalAuthority;
    capabilities?: string[];
}

export interface UserPreferences {
    language: string;
    theme: string;
    notificationsEnabled: boolean;
}

export interface UserSession {
    userId: string;
    token: string;
    expiresAt: Date;
}
