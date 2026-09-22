import test from 'node:test';
import assert from 'node:assert/strict';
import { getTargetPath } from '../api/index.js';

test('proxy preserves non-routing query parameters from Vercel rewrite capture', () => {
  const path = getTargetPath({
    query: {
      path: 'runtime/state',
      cursor: 'next',
      filter: ['active', 'healthy'],
      empty: null,
    },
    url: '/api/runtime/state?path=runtime%2Fstate&cursor=next',
  });
  assert.equal(path, '/api/runtime/state?cursor=next&filter=active&filter=healthy');
});

test('proxy keeps an already materialized API query string intact', () => {
  const path = getTargetPath({
    query: {},
    url: '/api/runtime/state?cursor=next',
  });
  assert.equal(path, '/api/runtime/state?cursor=next');
});
