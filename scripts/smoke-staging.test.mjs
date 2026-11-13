import assert from 'node:assert/strict';
import test from 'node:test';
import { validateStagingOrigin, readOnlySmoke } from './smoke-staging.mjs';

test('HTTPS staging host is allowed', () => {
  assert.equal(validateStagingOrigin('https://staging.example.org'), 'https://staging.example.org');
});
test('production hostname and its subdomains are forbidden', () => {
  for (const hostname of ['edificiosoliva.com', 'www.edificiosoliva.com', 'staging.edificiosoliva.com']) {
    assert.throws(() => validateStagingOrigin('https://' + hostname), /Production domains/);
  }
});
test('arbitrary hosts, HTTP remote hosts, embedded credentials and querystrings are forbidden', () => {
  for (const value of ['https://other.example.org', 'http://staging.example.org',
    'https://x:y@staging.example.org', 'https://staging.example.org/?secret=123']) {
    assert.throws(() => validateStagingOrigin(value));
  }
});
test('loopback only when opt-in provided', () => {
  assert.throws(() => validateStagingOrigin('http://127.0.0.1:8088'), /requires --loopback/);
  assert.equal(validateStagingOrigin('http://127.0.0.1:8088', true), 'http://127.0.0.1:8088');
});
test('only GETs are made, no mutating or payment requests', async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({ url, method: options.method });
    return { status: url.endsWith('/api/reservations') ? 401 : 200, body: { cancel: async () => {} } };
  };
  const results = await readOnlySmoke('https://staging.example.org', fakeFetch);
  assert.equal(results.length, 3);
  assert.ok(results.every((item) => item.passed));
  assert.ok(requests.every((request) => request.method === 'GET'));
  assert.ok(requests.every((request) => !request.url.includes('payments')));
});
test('unsecured admin endpoint is reported as failure', async () => {
  const fakeFetch = async () => ({ status: 200, body: { cancel: async () => {} } });
  const results = await readOnlySmoke('https://staging.example.org', fakeFetch);
  assert.equal(results.filter((item) => !item.passed).length, 1);
  assert.match(results.at(-1).check, /Admin/);
});
