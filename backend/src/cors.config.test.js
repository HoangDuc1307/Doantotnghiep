import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedOrigin, readAllowedOrigins } from './cors.config.js';

test('allows configured development origins and requests without an Origin header', () => {
  const origins = readAllowedOrigins('http://localhost:4200,http://192.168.31.181:4200');

  assert.equal(isAllowedOrigin(undefined, origins), true);
  assert.equal(isAllowedOrigin('http://localhost:4200', origins), true);
  assert.equal(isAllowedOrigin('http://192.168.31.181:4200', origins), true);
});

test('rejects an origin that is not configured', () => {
  const origins = readAllowedOrigins('http://localhost:4200');

  assert.equal(isAllowedOrigin('http://example.test:4200', origins), false);
});
