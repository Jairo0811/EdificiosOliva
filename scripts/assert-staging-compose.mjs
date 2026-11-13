#!/usr/bin/env node
/**
 * Consume docker compose config --format json on stdin.
 * Wiring inspection only: no containers started, no network calls.
 * In CI use synthetic values, never production credentials.
 */
import { readFileSync } from 'node:fs';
import { validateStagingConfig } from './validate-staging-config.mjs';

export function auditStagingCompose(config) {
  const findings = [];
  const bad = (message) => findings.push(message);
  const services = config?.services ?? {};
  for (const name of ['preflight', 'api', 'web']) {
    if (!services[name]) bad('Missing ' + name + ' service.');
  }
  if (findings.length) return findings;

  for (const name of ['api', 'preflight']) {
    if ((services[name].ports?.length ?? 0) > 0) {
      bad(name + ': public/host ports are forbidden.');
    }
  }
  const webPorts = services.web.ports ?? [];
  if (webPorts.length !== 1 || webPorts[0]?.host_ip !== '127.0.0.1' ||
      Number(webPorts[0]?.target) !== 80) {
    bad('web: exactly one loopback-only mapping to container port 80 required.');
  }
  const api = services.api;
  const preflight = services.preflight;
  const web = services.web;
  if (api.depends_on?.preflight?.condition !== 'service_completed_successfully') {
    bad('api must wait for successful staging preflight.');
  }
  if (web.depends_on?.api?.condition !== 'service_started') {
    bad('web must depend on the internal API.');
  }
  if (!preflight.read_only || !preflight.command?.includes('--environment')) {
    bad('preflight must be read-only and inspect the environment.');
  }
  const stageEnvironment = api.environment ?? {};
  const preflightEnvironment = preflight.environment ?? {};
  for (const [key, value] of Object.entries(preflightEnvironment)) {
    if (stageEnvironment[key] !== value) bad('preflight/API mismatch for ' + key + '.');
  }
  for (const finding of validateStagingConfig(stageEnvironment)) {
    bad('api configuration: ' + finding);
  }
  for (const service of [api, web, preflight]) {
    if (!service.networks || !Object.hasOwn(service.networks, 'internal')) {
      bad('every service must use the same internal Docker network.');
    }
  }
  if (!api.volumes?.some((volume) =>
    volume.target === '/app/wwwroot/uploads' && volume.type === 'volume')) {
    bad('API must persist uploaded images in its own Docker volume.');
  }
  return findings;
}

const calledDirectly = /assert-staging-compose\.mjs$/.test(process.argv[1] ?? '');
if (calledDirectly) {
  try {
    const data = JSON.parse(readFileSync(0, 'utf8'));
    const findings = auditStagingCompose(data);
    if (findings.length) {
      findings.forEach((message) => console.error('NO-GO: ' + message));
      process.exitCode = 1;
    } else {
      console.log('PASS: Compose staging isolation, startup gate and defaults.');
    }
  } catch {
    console.error('NO-GO: Could not parse Docker Compose model.');
    process.exitCode = 2;
  }
}
