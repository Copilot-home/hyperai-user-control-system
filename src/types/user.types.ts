export interface User {
    id: string;
    name: string;
    email: string;
    preferences: UserPreferences;
    username?: string;
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
