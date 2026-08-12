// APΩ Home Cloud - Vercel serverless backend stub
// Serves the frontend with deterministic, design-auditable responses while the real
// Titan/MacBook/MacMini runtime fabric is bridged separately.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req;

  if (url === '/api/health' || url.startsWith('/api/health')) {
    return res.status(200).json({ status: 'OK', service: 'hyperai-user-control-system' });
  }

  if (url.startsWith('/api/workspace/session')) {
    return res.status(200).json({ user: 'creator', role: 'sovereign', authenticated: true });
  }

  if (url.startsWith('/api/workspace/graph')) {
    return res.status(200).json({
      nodes: [
        { id: 'macbook.andym2', kind: 'node-server', status: 'reachable' },
        { id: 'titan.gt77', kind: 'node-server', status: 'reachable' },
        { id: 'macmini.cuongm1', kind: 'node-server', status: 'unreachable' },
      ],
      edges: [
        { from: 'macbook.andym2', to: 'titan.gt77', transport: 'ssh' },
      ],
    });
  }

  if (url.startsWith('/api/workspace/lanes')) {
    return res.status(200).json({ lanes: [{ id: 'symphony', active: true }] });
  }

  if (url.startsWith('/api/workspace/runtimes')) {
    return res.status(200).json({
      runtimes: [
        { id: 'macbook.codex.01', type: 'agent-runtime', healthy: true },
        { id: 'titan.ollama.inference', type: 'model-substrate', healthy: true },
        { id: 'titan.hyperai.execution', type: 'execution-system', healthy: true },
      ],
    });
  }

  if (url.startsWith('/api/workspace/connectors')) {
    return res.status(200).json({ connectors: [] });
  }

  if (url.startsWith('/api/workspace/missions')) {
    return res.status(200).json({ missions: [] });
  }

  if (url.startsWith('/api/workspace/proof')) {
    return res.status(200).json({ status: 'verified', timestamp: new Date().toISOString() });
  }

  if (url.startsWith('/api/workspace/providers')) {
    return res.status(200).json({ providers: [{ id: 'ollama', label: 'Ollama Local' }] });
  }

  if (url.startsWith('/api/runtime/capabilities')) {
    return res.status(200).json({
      capabilities: ['inference', 'code', 'shell-plan', 'os-control'],
      runtime_authority: { managed_runtime: false },
    });
  }

  if (url.startsWith('/api/autonomy/status')) {
    return res.status(200).json({ status: 'active', boundary: 'sovereign' });
  }

  if (url.startsWith('/api/autonomy/objectives')) {
    return res.status(200).json({ objectives: [] });
  }

  if (url.startsWith('/api/autonomy/decisions')) {
    return res.status(200).json({ decisions: [] });
  }

  if (url.startsWith('/api/autonomy/policy')) {
    return res.status(200).json({ policy: 'creator-approved' });
  }

  if (url.startsWith('/api/symphony/status')) {
    return res.status(200).json({ status: 'active', empathy_circulation: true });
  }

  if (url.startsWith('/api/symphony/start') || url.startsWith('/api/symphony/stop')) {
    return res.status(200).json({ status: 'active' });
  }

  return res.status(404).json({ error: 'not_found', path: url });
}
