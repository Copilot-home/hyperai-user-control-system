import { Request, Response } from 'express';
import { SymphonyService } from '../services/symphonyService';

const symphonyService = new SymphonyService();

export const getSymphonyStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
        const status = await symphonyService.getSymphonyStatus();
        res.status(200).json({ message: 'Current symphony status', status });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching symphony status', error: error.message });
    }
};

export const startSymphony = async (_req: Request, res: Response): Promise<void> => {
    try {
        await symphonyService.startSymphony();
        res.status(200).json({ message: 'Symphony started successfully', status: 'active' });
    } catch (error) {
        res.status(500).json({ message: 'Error starting symphony', error: error.message });
    }
};

export const stopSymphony = async (_req: Request, res: Response): Promise<void> => {
    try {
        await symphonyService.stopSymphony();
        res.status(200).json({ message: 'Symphony stopped successfully', status: 'inactive' });
    } catch (error) {
        res.status(500).json({ message: 'Error stopping symphony', error: error.message });
    }
};
