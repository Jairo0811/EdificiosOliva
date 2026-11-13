import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseEnvTemplate, validateStagingConfig } from './validate-staging-config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const template = parseEnvTemplate(readFileSync(join(root, '.env.staging.example'), 'utf8'));

function configuredStaging() {
  return {
    ...template,
    AllowedHosts: 'staging.oliva-tests.example.org',
    Cors__AllowedOrigins__0: 'https://staging.oliva-tests.example.org',
    Payments__FrontendReturnUrl: 'https://staging.oliva-tests.example.org/reservar',
    Notifications__Email__PublicBaseUrl: 'https://staging.oliva-tests.example.org',
    Firebase__ProjectId: 'edificios-oliva-staging-qa',
    ConnectionStrings__DefaultConnection: 'Server=sqlserver,1433;Database=EdificiosOliva_Staging;User Id=staging_user;Password=SYNTHETIC_TEST_ONLY;Encrypt=True;TrustServerCertificate=False',
    Security__UseHttpsRedirection: 'true',
  };
}

test('staging inventory is safe by default and without credentials', () => {
  assert.deepEqual(validateStagingConfig(template, { template: true }), []);
  assert.equal(template.Payments__Azul__Enabled, 'false');
  assert.equal(template.Notifications__Email__Enabled, 'false');
  assert.equal(template.Payments__Azul__AuthKey, '');
  assert.equal(template.Notifications__Email__Password, '');
});

test('strict staging config accepts isolated database and staging hosts', () => {
  assert.deepEqual(validateStagingConfig(configuredStaging()), []);
});

test('strict staging rejects placeholder hostname and Firebase project', () => {
  const violations = validateStagingConfig(template);
  assert.ok(violations.some((message) => message.includes('hostname real')));
  assert.ok(violations.some((message) => message.includes('Firebase todavía')));
});

test('production domain is not an approved staging host', () => {
  const config = configuredStaging();
  config.AllowedHosts = 'edificiosoliva.com';
  assert.ok(validateStagingConfig(config).some((message) => message.includes('dominio de producción')));
});

test('CORS cannot reference production or an unrelated domain', () => {
  const config = configuredStaging();
  config.Cors__AllowedOrigins__0 = 'https://edificiosoliva.com';
  assert.ok(validateStagingConfig(config).some((message) => message.includes('CORS')));
});

test('payment and email integration are prohibited during first staging preflight', () => {
  const config = configuredStaging();
  config.Payments__Azul__Enabled = 'true';
  config.Notifications__Email__Enabled = 'true';
  assert.equal(validateStagingConfig(config).filter((message) => message.includes('debe permanecer false')).length, 2);
});

test('production AZUL PaymentPage URL is rejected even when payments are disabled', () => {
  const config = configuredStaging();
  config.Payments__Azul__PaymentPageUrl = 'https://pagos.azul.com.do/PaymentPage/Default.aspx';
  assert.ok(validateStagingConfig(config).some((message) => message.includes('pasarelas productivas')));
});

test('SQL connection must identify staging and encrypt without trusting unknown certs', () => {
  const config = configuredStaging();
  config.ConnectionStrings__DefaultConnection = 'Server=sqlserver;Database=EdificiosOlivaDb;User Id=sa;Password=SYNTHETIC_TEST_ONLY;Encrypt=False;TrustServerCertificate=True';
  const errors = validateStagingConfig(config);
  assert.ok(errors.some((message) => message.includes('base claramente')));
  assert.ok(errors.some((message) => message.includes('Encrypt=True')));
  assert.ok(!JSON.stringify(errors).includes('SYNTHETIC_TEST_ONLY'));
});

test('only an explicitly declared trusted HTTPS proxy permits disabling app redirect', () => {
  const config = configuredStaging();
  config.Security__UseHttpsRedirection = 'false';
  assert.ok(validateStagingConfig(config).some((message) => message.includes('HTTPS debe')));
  config.Staging__TrustedHttpsProxy = 'true';
  assert.deepEqual(validateStagingConfig(config), []);
});

test('template parser rejects malformed and duplicate keys', () => {
  assert.throws(() => parseEnvTemplate('INVALID_LINE'));
  assert.throws(() => parseEnvTemplate('FOO=one\nFOO=two'));
});

test('an additional CORS origin is rejected even when the first origin is correct', () => {
  const config = configuredStaging();
  config.Cors__AllowedOrigins__1 = 'https://edificiosoliva.com';
  assert.ok(validateStagingConfig(config).some((message) => message.includes('CORS')));
});

test('the committed template never contains payment or SMTP credentials', () => {
  const config = { ...template, Payments__Azul__AuthKey: 'SYNTHETIC_TEST_ONLY' };
  assert.ok(validateStagingConfig(config, { template: true }).some((message) => message.includes('debe estar vacío')));
});
