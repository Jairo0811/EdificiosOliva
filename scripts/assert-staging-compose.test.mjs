import assert from 'node:assert/strict';
import test from 'node:test';
import { auditStagingCompose } from './assert-staging-compose.mjs';

function validComposeModel() {
  const env = {
    AllowedHosts: 'staging.oliva-tests.example.org',
    Cors__AllowedOrigins__0: 'https://staging.oliva-tests.example.org',
    Payments__FrontendReturnUrl: 'https://staging.oliva-tests.example.org/reservar',
    Notifications__Email__PublicBaseUrl: 'https://staging.oliva-tests.example.org',
    Property__TimeZoneId: 'America/Santo_Domingo',
    ConnectionStrings__DefaultConnection: 'Server=staging-sql;Database=EdificiosOliva_Staging;User Id=staging_user;Password=SYNTHETIC_TEST_ONLY;Encrypt=True;TrustServerCertificate=False',
    Firebase__ProjectId: 'edificios-oliva-staging-qa',
    Payments__Azul__Enabled: 'false',
    Notifications__Email__Enabled: 'false',
    Security__UseHttpsRedirection: 'false',
    Staging__TrustedHttpsProxy: 'true',
    ReverseProxy__KnownProxies__0: '172.29.77.10',
    PublicPayments__ActiveKeyVersion: '1',
    PublicPayments__CapabilityKeys__1: Buffer.alloc(32, 12).toString('base64'),
  };
  return {
    services: {
      preflight: {
        environment: { ...env }, ports: [], read_only: true,
        command: ['node', '/checks/validate-staging-config.mjs', '--environment'],
        networks: { internal: null },
      },
      api: {
        environment: { ...env }, ports: [], networks: { internal: null },
        depends_on: { preflight: { condition: 'service_completed_successfully' } },
        volumes: [{ type: 'volume', target: '/app/wwwroot/uploads', source: 'uploads-staging' }],
      },
      web: {
        ports: [{ target: 80, published: '8088', host_ip: '127.0.0.1' }],
        networks: { internal: null },
        depends_on: { api: { condition: 'service_started' } },
      },
    },
  };
}

test('safe Compose model passes the offline architecture audit', () => {
  assert.deepEqual(auditStagingCompose(validComposeModel()), []);
});

test('API port mapping is forbidden', () => {
  const model = validComposeModel();
  model.services.api.ports.push({ target: 8080, published: '8080', host_ip: '0.0.0.0' });
  assert.ok(auditStagingCompose(model).some((s) => s.includes('api: public')));
});

test('exposing web to all interfaces fails the gate', () => {
  const model = validComposeModel();
  model.services.web.ports[0].host_ip = '0.0.0.0';
  assert.ok(auditStagingCompose(model).some((s) => s.includes('loopback-only')));
});

test('API cannot start without successful preflight dependency', () => {
  const model = validComposeModel();
  model.services.api.depends_on.preflight.condition = 'service_started';
  assert.ok(auditStagingCompose(model).some((s) => s.includes('wait for successful')));
});

test('API cannot run without persistent uploads', () => {
  const model = validComposeModel();
  model.services.api.volumes = [];
  assert.ok(auditStagingCompose(model).some((s) => s.includes('persist uploaded images')));
});

test('the preflight must inspect the same API configuration', () => {
  const model = validComposeModel();
  model.services.preflight.environment.Cors__AllowedOrigins__0 = 'https://different.example.org';
  assert.ok(auditStagingCompose(model).some((s) => s.includes('preflight/API mismatch')));
});

test('provider activation cannot be sneaked into Compose', () => {
  const model = validComposeModel();
  model.services.api.environment.Payments__Azul__Enabled = 'true';
  assert.ok(auditStagingCompose(model).some((s) => s.includes('debe permanecer false')));
});
