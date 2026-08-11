export type UserRecord = {
    id: string;
    name: string;
    email: string;
    preferences: Record<string, unknown>;
};

const userStore = new Map<string, UserRecord>();

export class UserService {
    async createUser(userData: Partial<UserRecord>): Promise<UserRecord> {
        const id = userData.id || `user_${Date.now()}`;
        const user: UserRecord = {
            id,
            name: userData.name || 'HyperAI User',
            email: userData.email || 'creator@hyperai.local',
            preferences: userData.preferences || {},
        };
        userStore.set(id, user);
        return user;
    }

    async getUserById(userId: string): Promise<UserRecord | null> {
        return userStore.get(userId) ?? null;
    }

    async updateUser(userId: string, updateData: Partial<UserRecord>): Promise<UserRecord | null> {
        const existing = userStore.get(userId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updateData,
            id: userId,
        };
        userStore.set(userId, updated);
        return updated;
    }

    async deleteUser(userId: string): Promise<void> {
        userStore.delete(userId);
    }

    async getUserPreferences(userId: string): Promise<Record<string, unknown> | null> {
        const user = userStore.get(userId);
        return user ? user.preferences : null;
    }

    async updateUserPreferences(userId: string, preferences: Record<string, unknown>): Promise<Record<string, unknown> | null> {
        const user = userStore.get(userId);
        if (!user) {
            return null;
        }
        user.preferences = { ...user.preferences, ...preferences };
        userStore.set(userId, user);
        return user.preferences;
    }

    async validateUserSession(_sessionId: string): Promise<boolean> {
        return true;
    }
}
