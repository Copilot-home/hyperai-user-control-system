#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const laneEnabled = process.env.VITE_ENABLE_SYMPHONY_RUNTIME === 'true';
if (!laneEnabled) {
  console.log(
    'Symphony runtime lane is not enabled. Skipping legacy ESLint run (see VITE_ENABLE_SYMPHONY_RUNTIME).'
  );
  process.exit(0);
}

console.log('Running legacy ESLint with config: .eslintrc.cjs');
const args = ['eslint', '.', '--ext', '.ts,.tsx', '--config', '.eslintrc.cjs'];
const result = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(result.status ?? 0);
