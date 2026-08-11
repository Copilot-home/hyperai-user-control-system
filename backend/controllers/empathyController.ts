import { Request, Response } from 'express';
import empathyService from '../services/empathyService';

export const processEmpathy = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, context, frequency, cultural_mode } = req.body;
        const result = await empathyService.processEmpathy({
            message,
            context,
            frequency,
            cultural_mode,
        });
        res.status(200).json(result);
    } catch (error) {
        console.error('Error processing empathy:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getEmpathyStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
        const status = await empathyService.getMetrics();
        res.status(200).json(status);
    } catch (error) {
        console.error('Error fetching empathy status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const generateCulturalContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt = '', cultural_mode = 'vietnamese' } = req.body;
        const computedScore = 50 + String(prompt).length % 50;
        res.status(200).json({
            prompt,
            cultural_mode,
            generated_content: `Empathy lane crafted content for "${prompt}"`,
            empathy_score: computedScore,
            status: 'success',
        });
    } catch (error) {
        console.error('Error generating cultural content:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
