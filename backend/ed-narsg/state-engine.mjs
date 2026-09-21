import { assertCommitBoundary } from './authority-model.mjs';

export const STATE_DIMENSIONS = Object.freeze([
  'existence',
  'identity',
  'location',
  'availability',
  'authorization',
  'task_status',
]);

const ALLOWED = Object.freeze({
  existence: new Set(['UNKNOWN', 'OBSERVED', 'VERIFIED']),
  identity: new Set(['UNKNOWN', 'IDENTIFIED', 'VERIFIED']),
  location: new Set(['UNKNOWN', 'OBSERVED', 'VERIFIED']),
  availability: new Set(['UNKNOWN', 'OBSERVED', 'VERIFIED']),
  authorization: new Set(['UNKNOWN', 'AUTHORIZED', 'DENIED']),
  task_status: new Set(['UNKNOWN', 'READY', 'RUNNING', 'BLOCKED', 'VERIFIED', 'COMMITTED']),
});

export function createState(input = {}) {
  const state = {};
  for (const dimension of STATE_DIMENSIONS) {
    const value = input[dimension] || 'UNKNOWN';
    if (!ALLOWED[dimension].has(value)) throw new Error(`STATE_VALUE_INVALID:${dimension}`);
    state[dimension] = value;
  }
  return Object.freeze(state);
}

export function transitionState(current, patch = {}, context = {}) {
  const base = createState(current);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('STATE_PATCH_INVALID');
  }

  for (const [dimension, value] of Object.entries(patch)) {
    if (!STATE_DIMENSIONS.includes(dimension)) throw new Error('STATE_DIMENSION_INVALID');
    if (!ALLOWED[dimension].has(value)) throw new Error(`STATE_VALUE_INVALID:${dimension}`);
    if (dimension === 'task_status' && value === 'COMMITTED') {
      assertCommitBoundary(context.actor || 'STATE_AUTHORITY', context);
    }
  }
  return Object.freeze({ ...base, ...patch });
}

export function reduceState(state, event) {
  if (event.event_type !== 'STATE_COMMITTED') return createState(state);
  if (!event.state_patch) throw new Error('STATE_PATCH_MISSING');
  return transitionState(state, event.state_patch, {
    actor: 'STATE_AUTHORITY',
    authorized: event.commit_authorized === true,
    verified: event.verified === true,
    mutation_state: event.mutation_state || 'KNOWN',
  });
}
