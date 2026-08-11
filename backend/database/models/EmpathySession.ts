export interface EmpathySession {
    id: string;
    userId: string;
    startTime: Date;
    endTime: Date;
    messages: Array<{
        sender: 'user' | 'system';
        content: string;
        timestamp: Date;
    }>;
    empathyScore: number;
    culturalContext: string;
}