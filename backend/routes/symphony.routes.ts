import { Router } from 'express';
import { getSymphonyStatus, startSymphony, stopSymphony } from '../controllers/symphonyController';

const router = Router();

// Route to get the current status of the symphony
router.get('/status', getSymphonyStatus);

// Route to start the symphony
router.post('/start', startSymphony);

// Route to stop the symphony
router.post('/stop', stopSymphony);

// Route to adjust the frequency of the symphony
export default router;
