import { Request, Response } from 'express';
import { GithubAgentService } from '../services/githubAgentService';

const githubAgentService = new GithubAgentService();

export const handleAgentQuery = async (req: Request, res: Response) => {
  try {
    const { query, context, type, language } = req.body;
    const github = githubAgentService.getSurfaceStatus();
    let response: string;

    switch (type) {
      case 'completion':
        response = await githubAgentService.generateCodeCompletion(context || '', language || 'typescript');
        break;
      case 'documentation':
        response = await githubAgentService.generateDocumentation(context || '', language || 'typescript');
        break;
      case 'review':
        response = await githubAgentService.reviewCode(context || '', language || 'typescript');
        break;
      default:
        response = await githubAgentService.queryLocalModel(
          `GitHub surface query. Context: ${context || 'none'}. Query: ${query || 'none'}`,
        );
    }

    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
      source: github.agent_mode === 'live-gh' ? 'live-gh-surface' : 'filesystem-github-surface',
      type: type || 'general',
      github,
    });
  } catch (error) {
    console.error('Local agent error:', error);
    res.status(500).json({
      success: false,
      error: 'GitHub surface unavailable',
      fallback: 'Check workflow authority and runtime policy artifacts.',
    });
  }
};

export const getAgentStatus = async (req: Request, res: Response) => {
  try {
    const github = githubAgentService.getSurfaceStatus();
    res.json(github);
  } catch (error) {
    res.status(500).json({
      status: 'missing',
      error: error instanceof Error ? error.message : 'GitHub surface unavailable',
    });
  }
};
