#!/usr/bin/env node
/**
 * READ-ONLY smoke test of an explicitly selected staging endpoint.
 * Will never POST/PATCH/DELETE, connect to payment providers or inspect PII.
 * Run only after staging deployment has been authorized.
 *
 * node scripts/smoke-staging.mjs https://staging.example.org
 * node scripts/smoke-staging.mjs http://127.0.0.1:8088 --loopback
 */
export function validateStagingOrigin(value, allowLoopback = false) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid staging URL.'); }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (url.username || url.password || url.search || url.hash ||
      url.pathname !== '/' || !hostname) {
    throw new Error('Provide origin only, without credentials, query, or path.');
  }
  if (hostname === 'edificiosoliva.com' || hostname.endsWith('.edificiosoliva.com')) {
    throw new Error('Production domains are forbidden.');
  }
  const isLoopback = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
  if (isLoopback) {
    if (!allowLoopback) throw new Error('Loopback requires --loopback.');
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported loopback protocol.');
    }
  } else if (url.protocol !== 'https:' ||
    !hostname.split('.').some((part) => part === 'staging' || part.startsWith('staging-') || part.endsWith('-staging'))) {
    throw new Error('Only explicitly named HTTPS staging hosts are allowed.');
  }
  return url.origin;
}

export async function readOnlySmoke(origin, fetcher = fetch) {
  const checks = [
    { path: '/health', expected: 200, label: 'API liveness' },
    { path: '/health/ready', expected: 200, label: 'SQL readiness' },
    { path: '/api/reservations', expected: 401, label: 'Admin endpoint denies unauthenticated access' },
  ];
  const results = [];
  for (const check of checks) {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetcher(origin + check.path, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        signal: controller.signal,
      });
      results.push({ check: check.label, passed: response.status === check.expected,
        expected: check.expected, got: response.status });
      await response.body?.cancel();
    } finally {
      clearTimeout(abort);
    }
  }
  return results;
}

if (/smoke-staging\.mjs$/.test(process.argv[1] ?? '')) {
  const args = process.argv.slice(2);
  try {
    if (args.length < 1 || args.length > 2 ||
        (args.length === 2 && args[1] !== '--loopback')) {
      throw new Error('Usage: node scripts/smoke-staging.mjs <HTTPS staging origin> [--loopback]');
    }
    const origin = validateStagingOrigin(args[0], args[1] === '--loopback');
    const results = await readOnlySmoke(origin);
    for (const item of results) {
      console.log((item.passed ? 'PASS' : 'NO-GO') + ' ' + item.check +
        ': expected HTTP ' + item.expected + ', got ' + item.got);
    }
    if (results.some((item) => !item.passed)) process.exitCode = 1;
  } catch (error) {
    console.error('NO-GO: Staging read-only checks could not be completed: ' + error.message);
    process.exitCode = 2;
  }
}
