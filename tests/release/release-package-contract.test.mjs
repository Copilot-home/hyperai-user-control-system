import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const requiredReleaseFiles = [
  'run.sh',
  'start.bat',
  'RELEASE.md',
  'scripts/release/package-release.mjs',
];

const forbiddenPlaceholderPatterns = [
  /\/\/\s*TODO\b/i,
  /\/\*\s*TODO\b/i,
  /giữ nguyên code cũ/i,
  /placeholder implementation/i,
];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

for (const relativePath of requiredReleaseFiles) {
  test(`release file exists: ${relativePath}`, () => {
    assert.equal(
      existsSync(path.join(root, relativePath)),
      true,
      `${relativePath} is required by the end-user release contract`,
    );
  });
}

test('launchers reuse the canonical docker compose topology', () => {
  const unix = read('run.sh');
  const windows = read('start.bat');

  assert.match(unix, /docker\/docker-compose\.yml/);
  assert.match(windows.replaceAll('\\', '/'), /docker\/docker-compose\.yml/);
});

test('release-owned files contain no implementation placeholders', () => {
  for (const relativePath of requiredReleaseFiles) {
    const source = read(relativePath);
    for (const pattern of forbiddenPlaceholderPatterns) {
      assert.equal(
        pattern.test(source),
        false,
        `${relativePath} contains forbidden placeholder text matching ${pattern}`,
      );
    }
  }
});

test('packager declares mandatory secret and junk exclusions', () => {
  const source = read('scripts/release/package-release.mjs');
  const requiredExclusions = [
    '.git',
    'node_modules',
    '.venv',
    '__pycache__',
    '.env',
    'credentials.env',
    '.DS_Store',
  ];

  for (const excluded of requiredExclusions) {
    assert.ok(
      source.includes(excluded),
      `packager must explicitly exclude ${excluded}`,
    );
  }
});

test('canonical docker compose surface remains present', () => {
  assert.equal(existsSync(path.join(root, 'docker/docker-compose.yml')), true);
  assert.equal(existsSync(path.join(root, 'docker/Dockerfile.backend')), true);
  assert.equal(existsSync(path.join(root, 'docker/Dockerfile.frontend')), true);
});
