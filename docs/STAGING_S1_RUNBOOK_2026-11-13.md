# Bloque S1 — Staging aislado (preparación, NO despliegue)

**Fecha:** 2026-11-13 · **Base:** PR #30 fusionado · **Seguridad:** PR #35 Draft

## Alcance

Se añadió `ops/staging/compose.yml` para levantar el **frontend Angular** y la
**API .NET** después de validar la configuración. No incluye SQL Server, Firebase
Auth, DNS, proxy TLS ni AZUL: **esos recursos deben aprovisionarse como servicios
de pruebas independientes y autorizados**. No es un staging funcional por sí solo.

### Arquitectura propuesta

```text
Navegador autorizado (HTTPS)
          |
     DNS / TLS / proxy externo (NO incluido en Compose)
          |
     127.0.0.1:8088  <- puerto de loopback, nunca público
          |
       nginx / Angular  (contenedor web)
          | /api
          v
       ASP.NET Core 10 (contenedor api, sin ports)
          |                             |
          v                             v
 SQL Server staging externo      volumen Docker uploads-staging
 con TLS válido (no incluido)    (persistente)
          ^
  Firebase staging independiente
  (tokens verificados por la API)
```

El servicio de preflight Node es ejecutado antes del contenedor API y
rechaza la configuración con dominios de producción, CORS ajeno, AZUL/SMTP
activos o bases sin nombre de staging. `Staging__TrustedHttpsProxy=true`
solo expresa la intención de la topología: **no instala, verifica ni
configura el proxy**. El puerto web local usa HTTP exclusivamente dentro
de loopback; para cualquier acceso público o remoto es obligatorio
terminar TLS en un proxy externo autorizado y validar cabeceras y confianza.

## Requisitos antes de cualquier arranque

- [ ] Aprobar proveedor, costos, responsable, hostname HTTPS y restricción de
  acceso al personal de pruebas.
- [ ] Registrar un proyecto Firebase **independiente** (sin cuentas reales de huéspedes).
- [ ] Crear SQL Server staging aislado (sin datos de producción), con base que
  contenga `Staging` en el nombre, credenciales de aplicación de privilegios
  mínimos y certificado TLS con cadena confiable: `Encrypt=True`,
  `TrustServerCertificate=False`. El nombre de la DB **no garantiza**
  aislamiento; verificar también el endpoint y la cuenta a nivel de infraestructura.
- [ ] Separar credencial de **migraciones** (DDL) de la credencial usada por
  la API. El archivo Compose **no** crea usuarios SQL ni aplica migraciones.
- [ ] Confirmar que los backups estén fuera del mismo almacenamiento/volumen
  del servidor y demostrar una restauración de prueba antes de migrar.
- [ ] Preparar copia/backup recuperable del volumen de imágenes
  `edificios_oliva_uploads_staging`.
- [ ] Verificar regla de firewall: SQL privado, API interna, Nginx en loopback.
- [ ] Configurar TLS real en el proxy y revisar forwarding HTTP seguro con
  infraestructura y código. Validar que el proxy no permita suplantación de
  `X-Forwarded-*`. Si no hay proxy HTTPS, **NO exponer staging al público**.
- [ ] Inyectar variables desde un **gestor de secretos** del proveedor o
  proceso local seguro. No crear archivos `.env` con contraseñas en el repo.
- [ ] Inyectar `STAGING_PUBLIC_PAYMENT_CAPABILITY_KEY` desde gestor de secretos
  (Base64 de 32 bytes aleatorios); no usar claves sintéticas de CI.
- [ ] Confirmar nginx en IP privada `172.29.77.10` dentro de red
  `172.29.77.0/24` sin conflicto con infraestructura, y configurar
  un proxy TLS externo que **sobrescriba** `X-Real-IP` y
  `X-Forwarded-Proto` antes de reenviarlos; nunca confiar en valores del navegador.
- [ ] Mantener pagos AZUL y SMTP deshabilitados. Nada de credenciales,
  endpoints ni montos de producción.
- [ ] Autorizar explícitamente el arranque antes de ejecutar `up`.

## Validaciones offline actuales (seguras)

Desde la raíz del repositorio, sin credenciales:

```bash
node --test scripts/validate-staging-config.test.mjs
node --test scripts/assert-staging-compose.test.mjs
node scripts/validate-staging-config.mjs --template
```

La CI hace además un **dry-run** del modelo de Docker Compose con variables
sintéticas. Se inspeccionan exposición de puertos, dependencias de arranque,
persistencia, separación de redes y opciones de pago/correo. Ese análisis
**no** descarga imágenes, inicia contenedores, prueba TLS ni SQL.

## Procedimiento operativo FUTURO (requiere aprobación)

1. Configurar `STAGING_HOST` (hostname de staging no productivo),
   `STAGING_ORIGIN` (su URL HTTPS), `STAGING_FIREBASE_PROJECT_ID`,
   `STAGING_SQL_CONNECTION_STRING` (cadena SQL aislada y cifrada),
   `STAGING_PUBLIC_PAYMENT_CAPABILITY_KEY` (gestor de secretos),
   y opcionalmente `STAGING_LOCAL_HTTP_PORT` (default 8088).
2. Ejecutar `node scripts/validate-staging-config.mjs --environment` desde
   un contexto con las variables de configuración real inyectadas. El
   script imprime únicamente fallos de política, nunca valores.
3. Ejecutar `docker compose -f ops/staging/compose.yml config --quiet`
   para confirmar validez de Compose sin exponer el contenido en terminal.
4. Registrar el identificador exacto de imágenes y la versión de migración.
5. **Antes de tocar SQL**: efectuar `BACKUP DATABASE` del destino staging
   a almacenamiento separado; ejecutar `RESTORE VERIFYONLY` y un
   *restore drill* independiente. No apuntar nunca a producción.
6. Con credenciales DDL temporales de staging, aplicar de forma controlada
   `dotnet ef database update` utilizando el proyecto
   `EdificiosOliva.Infrastructure` y startup `EdificiosOliva.Api`.
   Confirmar tablas e índice de idempotencia y la migración
   `20261113193000_AddPublicPaymentCapability`. Repetir; las reservas legadas
   permanecen sin nonce y no pueden usar checkout público sin recuperación segura.
7. Tras aprobación del responsable, levantar únicamente staging:
   `docker compose -f ops/staging/compose.yml up -d --build`.
   Compose primero ejecuta el preflight offline; si falla, no inicia la API.
8. Solo en la red prevista, comprobar `/health` y `/health/ready`
   (200 con SQL, 503 cuando SQL está caído), protección 401/403,
   reservas sintéticas, galería, persistencia y observabilidad.
9. Con autorización y un dominio de staging operativo, lanzar solo lectura:

   ```bash
   node scripts/smoke-staging.mjs https://staging.example.org
   ```

   Consulta exclusivamente `GET /health` (200), `GET /health/ready`
   (200) y `GET /api/reservations` sin token (401); no crea reservas,
   no procesa pagos y no envía correos. Para diagnosticar el puerto
   de loopback existe `--loopback`, pero con `AllowedHosts` restringido
   puede devolver 400 si no se conserva el Host de staging, por lo que
   **no sustituye la prueba detrás del proxy HTTPS real**.
10. Cerrar con evidencias, no habilitar AZUL/SMTP hasta su propia
    certificación explícita.

**Importante:** el paso 7 NO ha sido ejecutado. `docker compose config`
puede mostrar contraseñas si se omite `--quiet`; evitar pegar salidas
con secretos en issues o chats.

## Reversión

- Para detener la aplicación: `docker compose -f ops/staging/compose.yml down`.
  **No usar `down -v`**: destruiría el volumen de imágenes.
- La reversión de cambios de esquema se hará por restauración controlada
  de **SQL Server staging** a partir de un respaldo probado, no de
  producción, después de decidir compatibilidad de datos.
- Revertir a la imagen anterior registrada y recuperar uploads del backup
  específico si es necesario.
- Cualquier fallo de verificación de firma/pago, autorización, migración,
  copia de seguridad o separación de entornos es un **NO-GO**.

## Decisiones de seguridad que permanecen abiertas

1. El PR #35 implementa el contrato de [ADR-PAY-001](ADR_PAY_001_CAPABILITY_TOKEN_V13.md),
   pero permanecen pendientes la recuperación de reservas legadas, UX
   multidispositivo, validación de TLS/cabeceras con proveedor y E2E en staging.
2. Definir la política de consulta de pagos cuando la reserva se crea con
   más de 30 días de anticipación, evitando prolongar acceso por identificadores
   derivados del GUID.
3. Verificar rate limiting por IP/identidad confiable (no global) con el
   proxy real; evitar suplantación de cabeceras y bloqueo entre huéspedes.
4. Validar forward headers, redirecciones y TLS en el proxy externo, no solo
   por valores declarados en Docker Compose.
5. Probar frontend contra API + SQL + Firebase reales **de staging**;
   Playwright con mocks no sustituye esta validación.

**Resultado esperado de S1:** infraestructura declarada, barreras offline y
procedimiento controlado; el staging funcional sigue pendiente de infraestructura
real, secretos, respaldos y autorización de despliegue.
