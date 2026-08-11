type NotebookLMNotebookPayload = {
  title: string;
  description?: string;
};

type NotebookLMSourcePayload = {
  uri?: string;
  text?: string;
  title?: string;
};

export class NotebookLMService {
  private readonly baseUrl: string;
  private readonly accessToken?: string;

  constructor() {
    this.baseUrl = process.env.NOTEBOOKLM_API_BASE_URL || '';
    this.accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN || process.env.NOTEBOOKLM_ACCESS_TOKEN;
  }

  private get headers(): Record<string, string> {
    if (!this.accessToken) {
      throw new Error('NotebookLM access token is missing');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private ensureConfigured(): void {
    if (!this.baseUrl) {
      throw new Error('NOTEBOOKLM_API_BASE_URL is missing');
    }
  }

  async getStatus(): Promise<Record<string, unknown>> {
    const configured = Boolean(this.baseUrl && this.accessToken);
    if (!configured) {
      return {
        ok: false,
        configured,
        baseUrlPresent: Boolean(this.baseUrl),
        accessTokenPresent: Boolean(this.accessToken),
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/notebooks`, {
        method: 'GET',
        headers: this.headers,
      });

      return {
        ok: response.ok,
        configured,
        status: response.status,
        baseUrl: this.baseUrl,
      };
    } catch (error) {
      return {
        ok: false,
        configured,
        baseUrl: this.baseUrl,
        error: error instanceof Error ? error.message : 'Unknown NotebookLM connectivity error',
      };
    }
  }

  async listNotebooks(): Promise<unknown> {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}/notebooks`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`NotebookLM list failed with status ${response.status}`);
    }

    return response.json();
  }

  async createNotebook(payload: NotebookLMNotebookPayload): Promise<unknown> {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}/notebooks`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`NotebookLM create failed with status ${response.status}`);
    }

    return response.json();
  }

  async addSource(notebookId: string, payload: NotebookLMSourcePayload): Promise<unknown> {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}/notebooks/${notebookId}/sources`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`NotebookLM add source failed with status ${response.status}`);
    }

    return response.json();
  }
}
