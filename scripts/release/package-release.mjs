import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

const DEFAULT_ARCHIVE = path.join(
  projectRoot,
  'release',
  `${packageJson.name}-${packageJson.version}.zip`,
);
const DEFAULT_MANIFEST = path.join(projectRoot, 'release', 'release-manifest.json');

const EXCLUDED_SEGMENTS = new Set([
  '.git',
  '.venv',
  'venv',
  'node_modules',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.cache',
  '.vercel',
  '.superpowers',
  'coverage',
  'release',
  'dist-isolated',
]);

const EXCLUDED_BASENAMES = new Set([
  '.DS_Store',
  'credentials.env',
  'npm-debug.log',
  'yarn-error.log',
  'pnpm-debug.log',
]);

function parseArgs(argv) {
  const result = {
    listOnly: false,
    output: DEFAULT_ARCHIVE,
    manifest: DEFAULT_MANIFEST,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--list') {
      result.listOnly = true;
      continue;
    }
    if (arg === '--output') {
      const next = argv[index + 1];
      if (!next) throw new Error('--output requires a path');
      result.output = path.resolve(projectRoot, next);
      index += 1;
      continue;
    }
    if (arg === '--manifest') {
      const next = argv[index + 1];
      if (!next) throw new Error('--manifest requires a path');
      result.manifest = path.resolve(projectRoot, next);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return result;
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/').replace(/^\.\//, '');
}

function isEnvironmentSecret(relativePath) {
  const base = path.posix.basename(relativePath);
  if (base === '.env.example') return false;
  return base === '.env' || base.startsWith('.env.');
}

function shouldExclude(relativePath) {
  const normalized = normalize(relativePath);
  if (!normalized) return false;

  const parts = normalized.split('/');
  if (parts.some((part) => EXCLUDED_SEGMENTS.has(part))) return true;
  if (EXCLUDED_BASENAMES.has(parts.at(-1))) return true;
  if (isEnvironmentSecret(normalized)) return true;
  if (normalized.endsWith('.pyc') || normalized.endsWith('.pyo')) return true;
  if (normalized.endsWith('.log')) return true;
  return false;
}

function gitTrackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error || result.status !== 0) return null;
  return result.stdout
    .split('\0')
    .map((entry) => normalize(entry.trim()))
    .filter(Boolean);
}

function walk(relativeDir = '') {
  const absoluteDir = path.join(projectRoot, relativeDir);
  const files = [];

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = normalize(path.join(relativeDir, entry.name));
    if (shouldExclude(relativePath)) continue;

    const absolutePath = path.join(projectRoot, relativePath);
    if (entry.isSymbolicLink()) {
      // Symlinks can escape the package root. A release contains regular files only.
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...walk(relativePath));
      continue;
    }
    if (entry.isFile()) files.push(relativePath);
  }

  return files;
}

function collectFiles() {
  const source = gitTrackedFiles() ?? walk();
  return [...new Set(source)]
    .filter((relativePath) => !shouldExclude(relativePath))
    .filter((relativePath) => {
      const absolutePath = path.join(projectRoot, relativePath);
      return existsSync(absolutePath) && lstatSync(absolutePath).isFile();
    })
    .sort((left, right) => left.localeCompare(right, 'en'));
}

function assertPackageContract(files) {
  const required = [
    'package.json',
    'package-lock.json',
    '.env.example',
    'run.sh',
    'start.bat',
    'RELEASE.md',
    'docker/docker-compose.yml',
    'docker/Dockerfile.backend',
    'docker/Dockerfile.frontend',
    'backend/server.js',
    'src/main.tsx',
  ];

  for (const requiredPath of required) {
    if (!files.includes(requiredPath)) {
      throw new Error(`Release package is missing required file: ${requiredPath}`);
    }
  }

  for (const relativePath of files) {
    if (shouldExclude(relativePath)) {
      throw new Error(`Forbidden path escaped release filtering: ${relativePath}`);
    }
  }
}

function copyToStaging(files) {
  const stagingRoot = mkdtempSync(path.join(os.tmpdir(), 'hyperai-release-'));
  const payloadRoot = path.join(stagingRoot, packageJson.name);
  mkdirSync(payloadRoot, { recursive: true });

  for (const relativePath of files) {
    const source = path.join(projectRoot, relativePath);
    const destination = path.join(payloadRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }

  return { stagingRoot, payloadRoot };
}

function createZipWithSystemTool(stagingRoot, payloadRoot, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  rmSync(outputPath, { force: true });

  if (process.platform === 'win32') {
    const command = [
      '$ErrorActionPreference = "Stop";',
      `Compress-Archive -Path ${JSON.stringify(`${payloadRoot}\\*`)} -DestinationPath ${JSON.stringify(outputPath)} -CompressionLevel Optimal -Force`,
    ].join(' ');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      cwd: stagingRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error || result.status !== 0) {
      throw new Error(`PowerShell ZIP creation failed: ${result.error?.message || result.stderr || result.status}`);
    }
    return;
  }

  const result = spawnSync('zip', ['-X', '-q', '-r', outputPath, path.basename(payloadRoot)], {
    cwd: stagingRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `System zip creation failed. Install the 'zip' utility or run packaging on the release CI builder. ${result.error?.message || result.stderr || result.status}`,
    );
  }
}

function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = collectFiles();
  assertPackageContract(files);

  if (options.listOnly) {
    process.stdout.write(`${JSON.stringify({ package: packageJson.name, version: packageJson.version, file_count: files.length, files }, null, 2)}\n`);
    return;
  }

  const { stagingRoot, payloadRoot } = copyToStaging(files);
  try {
    createZipWithSystemTool(stagingRoot, payloadRoot, options.output);
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }

  const archiveStats = statSync(options.output);
  const manifest = {
    schema_version: 1,
    package: packageJson.name,
    version: packageJson.version,
    archive: path.basename(options.output),
    archive_size_bytes: archiveStats.size,
    sha256: sha256(options.output),
    file_count: files.length,
    source_commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
    generated_at: new Date().toISOString(),
    files,
  };

  mkdirSync(path.dirname(options.manifest), { recursive: true });
  writeFileSync(options.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
