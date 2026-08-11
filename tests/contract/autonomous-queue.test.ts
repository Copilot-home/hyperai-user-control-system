import fs from 'fs';
import path from 'path';

const workspaceRoot = path.resolve(__dirname, '../../..');

describe('autonomous queue files', () => {
  test('master autonomous todo exists and tracks key runtime items', () => {
    const todoPath = path.join(workspaceRoot, 'memory', 'master_autonomous_todo.md');
    const todoSource = fs.readFileSync(todoPath, 'utf8');

    expect(todoSource).toContain('HyperAI Master Autonomous Todo');
    expect(todoSource).toContain('hyperai-user-control-system');
    expect(todoSource).toContain('backend/server.js');
    expect(todoSource).toContain('ci.yml');
  });

  test('runtime execution todo is an archived pointer to the master checklist', () => {
    const todoPath = path.join(workspaceRoot, 'memory', 'runtime_execution_todo.md');
    const todoSource = fs.readFileSync(todoPath, 'utf8');

    expect(todoSource).toContain('archived pointer');
    expect(todoSource).toContain('memory/master_autonomous_todo.md');
    expect(todoSource).toContain('Do not add checklist items here');
  });
});
