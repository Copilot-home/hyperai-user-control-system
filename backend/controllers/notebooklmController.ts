import { Request, Response } from 'express';
import { NotebookLMService } from '../services/notebooklmService';

const notebooklmService = new NotebookLMService();

export const getNotebookLMStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await notebooklmService.getStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('NotebookLM status error:', error);
    res.status(500).json({ ok: false, message: 'NotebookLM status check failed' });
  }
};

export const listNotebookLMNotebooks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const notebooks = await notebooklmService.listNotebooks();
    res.status(200).json(notebooks);
  } catch (error) {
    console.error('NotebookLM list error:', error);
    res.status(500).json({ ok: false, message: 'NotebookLM notebook listing failed' });
  }
};

export const createNotebookLMNotebook = async (req: Request, res: Response): Promise<void> => {
  try {
    const notebook = await notebooklmService.createNotebook(req.body);
    res.status(201).json(notebook);
  } catch (error) {
    console.error('NotebookLM create error:', error);
    res.status(500).json({ ok: false, message: 'NotebookLM notebook creation failed' });
  }
};

export const addNotebookLMSource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { notebookId } = req.params;
    const source = await notebooklmService.addSource(notebookId, req.body);
    res.status(201).json(source);
  } catch (error) {
    console.error('NotebookLM add source error:', error);
    res.status(500).json({ ok: false, message: 'NotebookLM source creation failed' });
  }
};
