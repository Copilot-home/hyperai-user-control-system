import { Request, Response } from 'express';
import {
    analyzeVietnameseText as runVietnameseAnalysis,
} from '../services/vietnameseService';

export const analyzeVietnameseText = async (req: Request, res: Response): Promise<void> => {
    try {
        const { text = '', analysisType = 'full' } = req.body;
        const analysisResult = await runVietnameseAnalysis(text, analysisType);
        res.status(200).json(analysisResult);
    } catch (error) {
        console.error('Error analyzing text:', error);
        res.status(500).json({ message: 'Error analyzing text', error: error.message });
    }
};

export const generateCulturalContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt = '', culturalStyle = 'traditional', targetAudience = 'enterprise' } = req.body;
        res.status(200).json({
            prompt,
            culturalStyle,
            targetAudience,
            generated_content: `Generated Vietnamese cultural content for: ${prompt}`,
            tone: 'ceremonial',
            status: 'success',
        });
    } catch (error) {
        console.error('Error generating cultural content:', error);
        res.status(500).json({ message: 'Error generating cultural content', error: error.message });
    }
};
