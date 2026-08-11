import { Router } from 'express';
import {
  addNotebookLMSource,
  createNotebookLMNotebook,
  getNotebookLMStatus,
  listNotebookLMNotebooks,
} from '../controllers/notebooklmController';

const router = Router();

router.get('/status', getNotebookLMStatus);
router.get('/notebooks', listNotebookLMNotebooks);
router.post('/notebooks', createNotebookLMNotebook);
router.post('/notebooks/:notebookId/sources', addNotebookLMSource);

export default router;
