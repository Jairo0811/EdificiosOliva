#!/usr/bin/env node
/**
 * Valida las barreras de seguridad de un STAGING aislado sin hacer llamadas de red,
 * conectarse a SQL Server, enviar correos ni crear/autorizar pagos.
 *
 * node scripts/validate-staging-config.mjs --template
 * node scripts/validate-staging-config.mjs --environment
 *
 * --environment solo lee process.env, idealmente inyectado por el secret manager.
 * No imprime el valor de ninguna variable, para no filtrar credenciales en CI.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export function parseEnvTemplate(source) {
  const vars = {};
  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) {
      throw new Error(`Formato inválido en línea ${index + 1} del inventario.`);
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(key) || Object.hasOwn(vars, key)) {
      throw new Error(`Clave inválida o duplicada en línea ${index + 1}.`);
    }
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

export function validateStagingConfig(vars, { template = false } = {}) {
  const errors = [];
  const read = (key) => typeof vars[key] === 'string' ? vars[key].trim() : '';
  const problem = (message) => errors.push(message);

  const hosts = read('AllowedHosts').split(';').filter(Boolean);
  const host = hosts.length === 1 ? hosts[0].toLowerCase() : '';
  if (!host || !/^[a-z0-9.-]+$/.test(host) || host.includes('..') || host === '*' || hosts.length !== 1) {
    problem('AllowedHosts debe contener exactamente un hostname válido de staging, sin comodines.');
  }
  const isProductionHost = (value) => value === 'edificiosoliva.com' || value.endsWith('.edificiosoliva.com');
  if (host && isProductionHost(host)) problem('AllowedHosts no puede usar el dominio de producción.');
  if (!template && (host.endsWith('.invalid') || host === 'localhost' || host.startsWith('127.'))) {
    problem('El modo --environment requiere hostname real de staging, no el del ejemplo ni localhost.');
  }
  const expectedOrigin = host ? `https://${host}` : '';
  const configuredCorsOrigins = Object.entries(vars)
    .filter(([key, value]) => /^Cors__AllowedOrigins__[0-9]+$/.test(key) && typeof value === 'string' && value.trim())
    .map(([key]) => key);
  if (!expectedOrigin || read('Cors__AllowedOrigins__0') !== expectedOrigin ||
      configuredCorsOrigins.length !== 1 || configuredCorsOrigins[0] !== 'Cors__AllowedOrigins__0') {
    problem('CORS debe usar únicamente el origen HTTPS de staging.');
  }

  function requireStagingUrl(key, { allowEmpty = false } = {}) {
    const raw = read(key);
    if (!raw && allowEmpty) return;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.origin !== expectedOrigin || url.username || url.password) {
        problem(`${key} debe apuntar exclusivamente al origen HTTPS de staging.`);
      }
    } catch {
      problem(`${key} debe ser una URL HTTPS válida de staging.`);
    }
  }
  requireStagingUrl('Payments__FrontendReturnUrl');
  requireStagingUrl('Notifications__Email__PublicBaseUrl');
  requireStagingUrl('Payments__Azul__ReturnBaseUrl', { allowEmpty: true });

  const activeKeyVersion = read('PublicPayments__ActiveKeyVersion');
  const secretKey = read('PublicPayments__CapabilityKeys__1');
  if (activeKeyVersion !== '1') problem('La versión activa del token público debe ser 1 en staging inicial.');
  if (template) {
    if (!secretKey.startsWith('REPLACE_WITH_'))
      problem('El inventario no puede contener una clave HMAC pública real.');
  } else {
    const bytes = Buffer.from(secretKey, 'base64');
    if (bytes.length < 32 || !/^[A-Za-z0-9+/]+={0,2}$/.test(secretKey) ||
        secretKey.toLowerCase().includes('replace')) {
      problem('La clave HMAC pública debe ser Base64 de al menos 256 bits, inyectada fuera de Git.');
    }
  }

  const firebase = read('Firebase__ProjectId').toLowerCase();
  if (!firebase || firebase === 'edificios-oliva' || !firebase.includes('staging')) {
    problem('Firebase debe utilizar un proyecto explícitamente separado de producción.');
  }
  if (!template && /replace|change.me|example/i.test(firebase)) {
    problem('Firebase todavía contiene un identificador de ejemplo.');
  }

  for (const key of ['Payments__Azul__Enabled', 'Notifications__Email__Enabled']) {
    if (read(key).toLowerCase() !== 'false') {
      problem(`${key} debe permanecer false durante el preflight.`);
    }
  }
  if (template) {
    for (const key of [
      'Payments__Azul__AuthKey',
      'Payments__Azul__MerchantId',
      'Notifications__Email__Password',
      'Notifications__Email__Username',
    ]) {
      if (read(key)) problem(`${key} debe estar vacío en el inventario versionado.`);
    }
  }
  for (const key of ['Payments__Azul__PaymentPageUrl', 'Payments__Azul__AlternatePaymentPageUrl']) {
    const value = read(key);
    if (!value) continue;
    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' ||
          hostname === 'pagos.azul.com.do' || hostname === 'contpagos.azul.com.do' ||
          (!hostname.endsWith('.azul.com.do') && !hostname.endsWith('.azul.com'))) {
        problem(`${key} no debe usar pasarelas productivas ni endpoints desconocidos en staging.`);
      }
    } catch {
      problem(`${key} debe estar vacío o contener una URL HTTPS autorizada de pruebas.`);
    }
  }

  const sql = read('ConnectionStrings__DefaultConnection');
  if (!sql) {
    problem('Falta ConnectionStrings__DefaultConnection (gestionar fuera de Git).');
  } else if (template) {
    if (!sql.startsWith('REPLACE_WITH_')) problem('El inventario no debe contener una cadena SQL real.');
  } else {
    const database = /(?:^|;)\s*(?:database|initial catalog)\s*=\s*([^;]+)/i.exec(sql)?.[1]?.trim() ?? '';
    if (!database || !/staging/i.test(database)) {
      problem('SQL Server debe utilizar una base claramente identificada como staging.');
    }
    if (!/(?:^|;)\s*encrypt\s*=\s*(?:true|yes)(?:;|$)/i.test(sql) ||
        !/(?:^|;)\s*trustservercertificate\s*=\s*(?:false|no)(?:;|$)/i.test(sql)) {
      problem('SQL Server requiere Encrypt=True y TrustServerCertificate=False.');
    }
  }

  const tls = read('Security__UseHttpsRedirection').toLowerCase();
  const trustedProxy = read('Staging__TrustedHttpsProxy').toLowerCase();
  const knownProxy = read('ReverseProxy__KnownProxies__0');
  if (!template && tls === 'false' && trustedProxy === 'true' &&
      !/^(?:10\\.|172\\.(?:1[6-9]|2[0-9]|3[01])\\.|192\\.168\\.)[0-9.]+$/.test(knownProxy)) {
    problem('La terminación TLS exige la IP privada exacta del proxy nginx confiable.');
  }
  if (tls !== 'true' && !(tls === 'false' && trustedProxy === 'true')) {
    problem('HTTPS debe mantenerse activo, salvo TLS terminado en proxy confiable declarado.');
  }

  if (read('Property__TimeZoneId') !== 'America/Santo_Domingo') {
    problem('La zona horaria de la propiedad debe ser America/Santo_Domingo.');
  }

  return errors;
}

const executing = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executing) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--template', '--environment'].includes(args[0])) {
    console.error('Uso: node scripts/validate-staging-config.mjs --template|--environment');
    process.exitCode = 2;
  } else {
    const isTemplate = args[0] === '--template';
    try {
      const config = isTemplate
        ? parseEnvTemplate(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '.env.staging.example'), 'utf8'))
        : process.env;
      const violations = validateStagingConfig(config, { template: isTemplate });
      if (violations.length) {
        console.error('NO-GO staging: se detectaron barreras de configuración no cumplidas:');
        violations.forEach((error) => console.error(`- ${error}`));
        process.exitCode = 1;
      } else {
        console.log(`PASS: configuración de ${isTemplate ? 'inventario' : 'entorno'} staging validada (sin conexiones externas).`);
      }
    } catch (error) {
      console.error('No se pudo evaluar el inventario staging (sin mostrar valores de configuración).');
      process.exitCode = 2;
    }
  }
}
