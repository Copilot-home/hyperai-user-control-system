import { Router } from 'express';
import { 
    analyzeVietnameseText, 
    generateCulturalContent 
} from '../controllers/vietnameseController';

const router = Router();

// Route for analyzing Vietnamese text
router.post('/analyze', analyzeVietnameseText);

// Route for generating cultural content
router.post('/generate', generateCulturalContent);

export default router;