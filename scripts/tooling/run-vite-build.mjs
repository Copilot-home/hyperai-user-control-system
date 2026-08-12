import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const viteEntrypoint = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const viteArgs = ['build', ...process.argv.slice(2)];

const deterministicBuildEnv = {
    ...process.env,
    VITE_API_BASE_URL: '/api',
    VITE_API_ORIGIN: '',
    VITE_ENABLE_CHAT_RUNTIME: 'false',
    VITE_ENABLE_USER_RUNTIME: 'false',
    VITE_ENABLE_NOTEBOOKLM_RUNTIME: 'false',
    VITE_ENABLE_WEBSOCKET_RUNTIME: 'false',
};

const result = spawnSync(process.execPath, [viteEntrypoint, ...viteArgs], {
    cwd: projectRoot,
    env: deterministicBuildEnv,
    stdio: 'inherit',
});

if (result.error) {
    throw result.error;
}

process.exit(result.status ?? 1);
