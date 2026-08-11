import { configure } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { TextEncoder, TextDecoder } from 'util';

(global as typeof globalThis & { TextEncoder?: typeof TextEncoder; TextDecoder?: typeof TextDecoder }).TextEncoder =
    TextEncoder;
(global as typeof globalThis & { TextEncoder?: typeof TextEncoder; TextDecoder?: typeof TextDecoder }).TextDecoder =
    TextDecoder;

// Global setup for testing environment
configure({ testIdAttribute: 'data-test-id' });
