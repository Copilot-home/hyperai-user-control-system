import axios from 'axios';
import { isNotebookLMRuntimeEnabled } from '../runtimeFlags';
import { getApiBaseUrl } from '../runtimeConfig';

export const getNotebookLMStatus = async (): Promise<any> => {
  if (!isNotebookLMRuntimeEnabled) {
    throw new Error('NotebookLM runtime is disabled in the current local contract.');
  }
  const response = await axios.get(`${getApiBaseUrl()}/notebooklm/status`);
  return response.data;
};

export const listNotebookLMNotebooks = async (): Promise<any> => {
  if (!isNotebookLMRuntimeEnabled) {
    throw new Error('NotebookLM runtime is disabled in the current local contract.');
  }
  const response = await axios.get(`${getApiBaseUrl()}/notebooklm/notebooks`);
  return response.data;
};

export const createNotebookLMNotebook = async (payload: { title: string; description?: string }): Promise<any> => {
  if (!isNotebookLMRuntimeEnabled) {
    throw new Error('NotebookLM runtime is disabled in the current local contract.');
  }
  const response = await axios.post(`${getApiBaseUrl()}/notebooklm/notebooks`, payload);
  return response.data;
};

export const addNotebookLMSource = async (
  notebookId: string,
  payload: { uri?: string; text?: string; title?: string }
): Promise<any> => {
  if (!isNotebookLMRuntimeEnabled) {
    throw new Error('NotebookLM runtime is disabled in the current local contract.');
  }
  const response = await axios.post(`${getApiBaseUrl()}/notebooklm/notebooks/${notebookId}/sources`, payload);
  return response.data;
};
