type NotebookLMNotebookPayload = {
  title: string;
  description?: string;
};

type NotebookLMSourcePayload = {
  uri?: string;
  text?: string;
  title?: string;
};

// MOCK LOCAL STORE FOR OFFLINE AUTONOMY
const localNotebooks: any[] = [];
const localSources: Record<string, any[]> = {};

export class NotebookLMService {
  private readonly baseUrl: string;

  constructor() {
    // FORCE LOCAL OLLAMA ROUTING - BYPASS CLOUD
    this.baseUrl = process.env.OLLAMA_API_BASE_URL || 'http://127.0.0.1:11434';
  }

  async getStatus(): Promise<Record<string, unknown>> {
    try {
      // Check local Ollama health instead of cloud NotebookLM
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return {
        ok: response.ok,
        configured: true,
        status: response.status,
        baseUrl: this.baseUrl,
        mode: 'LOCAL_AUTONOMOUS_OLLAMA_MODE'
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        baseUrl: this.baseUrl,
        mode: 'LOCAL_AUTONOMOUS_OLLAMA_MODE',
        error: error instanceof Error ? error.message : 'Local Ollama connectivity error',
      };
    }
  }

  async listNotebooks(): Promise<unknown> {
    return localNotebooks;
  }

  async createNotebook(payload: NotebookLMNotebookPayload): Promise<unknown> {
    const notebook = {
      id: `local_nb_${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString()
    };
    localNotebooks.push(notebook);
    return notebook;
  }

  async addSource(notebookId: string, payload: NotebookLMSourcePayload): Promise<unknown> {
    if (!localSources[notebookId]) {
      localSources[notebookId] = [];
    }
    const source = {
      id: `local_src_${Date.now()}`,
      ...payload,
      addedAt: new Date().toISOString()
    };
    localSources[notebookId].push(source);
    return source;
  }
}
