import { Router } from 'express';
import { 
    processEmpathy, 
    getEmpathyStatus, 
    generateCulturalContent 
} from '../controllers/empathyController';

const router = Router();

// Route for processing empathy requests
router.post('/process', processEmpathy);

// Route for getting empathy status
router.get('/status', getEmpathyStatus);

// Route for generating cultural content
router.post('/generate', generateCulturalContent);

export default router;