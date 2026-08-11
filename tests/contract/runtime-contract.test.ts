import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

describe('runtime contract', () => {
  test('App keeps dashboard route at root', () => {
    const appSource = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
    expect(appSource).toContain('path="/" exact component={Dashboard}');
  });

  test('backend runtime stub exposes smoke-critical routes on disk', () => {
    const serverSource = fs.readFileSync(path.join(root, 'backend', 'server.js'), 'utf8');
    expect(serverSource).toContain("/api/health");
    expect(serverSource).toContain("/api/symphony/status");
    expect(serverSource).toContain("/api/symphony/start");
    expect(serverSource).toContain("/api/symphony/stop");
  });
});
