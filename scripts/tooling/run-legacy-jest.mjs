#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const laneEnabled = process.env.VITE_ENABLE_SYMPHONY_RUNTIME === 'true';
if (!laneEnabled) {
  console.log(
    'Symphony runtime lane is not enabled. Skipping legacy Jest suite (see VITE_ENABLE_SYMPHONY_RUNTIME).'
  );
  process.exit(0);
}

const extraArgs = process.argv.slice(2);
const args = ['jest', '--config', 'jest.config.js', ...extraArgs];

console.log('Running legacy Jest with config: jest.config.js');
const result = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(result.status ?? 0);
