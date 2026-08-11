import { Session } from '../types/session.types';

class SessionManager {
    private sessions: Map<string, Session>;

    constructor() {
        this.sessions = new Map();
    }

    createSession(userId: string): Session {
        const session: Session = {
            id: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            data: {},
        };
        this.sessions.set(userId, session);
        return session;
    }

    getSession(userId: string): Session | undefined {
        return this.sessions.get(userId);
    }

    updateSession(userId: string, data: object): Session | undefined {
        const session = this.sessions.get(userId);
        if (session) {
            session.data = { ...session.data, ...data };
            session.updatedAt = new Date();
            return session;
        }
        return undefined;
    }

    deleteSession(userId: string): boolean {
        return this.sessions.delete(userId);
    }

    clearSessions(): void {
        this.sessions.clear();
    }
}

export default new SessionManager();