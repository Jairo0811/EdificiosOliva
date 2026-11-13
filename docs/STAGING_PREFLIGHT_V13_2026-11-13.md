# Edificios Oliva v1.3 — Preflight de staging y revisión del PR #30

**Fecha:** 2026-11-13
**Rama:** `feature/v1.3-frontend-ux` · **Base:** `master`
**PR:** https://github.com/Jairo0811/EdificiosOliva/pull/30
**Estado:** planificación documental. **No se ha desplegado, migrado ninguna base real ni habilitado un cobro.**

## 1. Evidencia revisada (HEAD de código `8a348da7407a9af797487a7ce1010aa6d9c8d6ae`)

| Gate | Verificación | Estado |
| --- | --- | --- |
| Angular | Build, 120/120 pruebas / 42 archivos; auditoría de dependencias de producción | PASS |
| Playwright / axe | 23/23, con API simulada y cuatro rutas públicas en estado inicial | PASS, alcance limitado |
| .NET 10 | Build Release y pruebas backend | PASS |
| Docker | Compilación de imagen API y frontend | PASS; arranque integrado no comprobado |
| SQL Server 2022 | Migraciones, segunda aplicación e idempotencia con DB efímera de CI | PASS; no es staging |
| Staging real | API + frontend + SQL + Firebase de prueba | PENDIENTE |
| AZUL / SMTP | Credenciales, pruebas end-to-end en proveedor y recepción de mensajes | PENDIENTE |
| Lighthouse / WCAG manual / carga | Red real, consola autenticada y resistencia | PENDIENTE |

Evidencia: https://github.com/Jairo0811/EdificiosOliva/actions/runs/43516317585 y demás workflows del mismo SHA. Los resultados no certifican el comportamiento de producción.

## 2. Hallazgos técnicos de la revisión (no equivalen a incidentes explotados)

### H1 — Contrato de consulta pública de pagos: decisión previa a producción — P1

`PublicPaymentStatusRequest` y `CreatePublicPaymentCheckoutRequest` utilizan `ReservationId + ConfirmationCode + Email`. El código `EO-XXXXXXXX` se deriva de los primeros ocho caracteres del mismo GUID. No debe tratarse como segundo secreto independiente de alta entropía.

**Acción propuesta:** decidir si sustituir o reforzar la autorización pública con un token aleatorio, opaco, acotado al propósito, con vencimiento y almacenamiento/verificación seguros. Mantener respuestas uniformes, límites de intentos, no registrar PII ni tokens en URLs, y probar autorización entre reservas distintas. Registrar la decisión del propietario antes de cambiar el contrato.

### H2 — Ventana de 30 días de consulta pública — P1 funcional

`PaymentIntentService.GetPublicStatusAsync` rechaza consultar reservas creadas hace más de 30 días (`PublicStatusLookupWindow`), independientemente de la fecha de entrada. Analizar la experiencia de una reserva realizada con mucha antelación, un retorno tardío o una aclaración posterior. Definir explícitamente retención, recuperación segura y estados permitidos.

### H3 — Alcance real de la accesibilidad automatizada — P2

`e2e/accessibility.spec.ts` falla solo si axe reporta `serious` o `critical`; el resultado verde **no afirma cero infracciones moderate/minor ni certificación WCAG 2.2 AA**. Revisar todos los hallazgos anexados, y auditar estados intermedios, formularios con errores, diálogos, teclado, lector de pantalla y panel administrativo autenticado.

### H4 — Rendimiento y reproducibilidad — P2

`e2e/performance.spec.ts` instrumenta LCP y CLS de laboratorio; solo establece aserción para CLS. Ejecutar Lighthouse en staging y medición con red/recursos reales. Las dependencias `@playwright/test@1.56.1` y `@axe-core/playwright@4.10.2` se instalan en CI con `--no-save --package-lock=false`; evaluar incorporarlas como devDependencies con lockfile para reproducibilidad completa.

### H5 — Límites públicos y configuración AZUL — P1 de preflight

`Program.cs` usa `AddFixedWindowLimiter` para reservas y pagos públicos. Comprobar bajo concurrencia si el límite es global por política (sin partición por cliente/IP) y definir controles antiabuso que no bloqueen a huéspedes legítimos.

**Atención:** `.env.example` contiene URLs de Payment Page de AZUL de producción mientras `appsettings.json` usa URL de pruebas. No copiar `.env.example` como configuración activa de staging; fijar explícitamente endpoints de sandbox autorizados y dejar `Payments__Azul__Enabled=false` hasta obtener credenciales y autorización.

## 3. Preparación del entorno de staging: sin ejecutar despliegue

- [ ] Acordar proveedor, proyecto, cuenta y dominio/subdominio de staging; limitar acceso al personal autorizado.
- [ ] Disponer de SQL Server **aislado**, sin credenciales, clientes, reservas ni medios de pago de producción.
- [ ] Crear almacenamiento persistente independiente para `/app/wwwroot/uploads` y estrategia verificable de backup/restore.
- [ ] Aprovisionar proyecto Firebase de pruebas con usuarios y custom claim `role=admin` de prueba; no usar cuentas reales.
- [ ] Establecer secretos en el gestor del proveedor, jamás en Git/README/artefactos: `ConnectionStrings__DefaultConnection`, `Firebase__ProjectId`, `Payments__Azul__AuthKey` y `Notifications__Email__Password` si aplican.
- [ ] Definir CORS y `AllowedHosts` únicamente para hostnames autorizados; HTTPS obligatorio en la entrada.
- [ ] Configurar el reverse proxy: `/` -> Angular/Nginx, `/api` -> .NET, `/health/ready` -> API; comprobar que `Security__UseHttpsRedirection=false` **solo** si TLS termina en un proxy confiable.
- [ ] Conservar `Payments__Azul__Enabled=false` y `Notifications__Email__Enabled=false` en el primer arranque; configurar URLs de retorno y sandbox solo después.
- [ ] Documentar responsables, ventanas de prueba, presupuesto/costos si corresponde y criterio para retirar staging.

## 4. Secuencia segura de validación en staging (propuesta)

**Fase S0 — Preflight documental, NO-GO para producción**

1. Aprobar arquitectura, financiación, inventario de secretos sin valores y matriz de pruebas.
2. Revisar H1/H2/H5 y decidir si hay cambios de contrato antes del despliegue.
3. Registrar plan de contingencia ante fallo y recopilar el HEAD exacto a probar.

**Fase S1 — Infraestructura aislada**

1. Crear DB de staging vacía o restaurada desde datos *sintéticos*, y verificar restauración de respaldo previo.
2. Aplicar con control la migración EF `20261105160000_AddReservationIdempotency`; repetir para comprobar idempotencia del esquema y validar rollback por restauración ensayada.
3. Levantar imágenes de frontend y API en red privada, con persistencia de uploads.
4. Verificar HTTPS, CORS, 401/403 y `/health`/`/health/ready` (esperado 200 cuando SQL está disponible; 503 cuando no).
5. Capturar versiones de imágenes, esquema y evidencias de arranque.

**Fase S2 — E2E reales sin cobros**

1. Ejecutar reserva contra API y SQL reales con datos sintéticos: disponible, no disponible, aforo, fechas y aceptación de términos.
2. Repetir mismo `Idempotency-Key` con mismo payload (una reserva); mismo key/diferente payload (409); validar concurrencia y transacciones.
3. Probar autenticación Firebase aislada y autorización admin para cada CRUD, reembolsos lógicos, galería, exportes e iCal.
4. Confirmar que `?payment=approved` y un `PaymentIntentId` ajeno no confirman pagos ni exponen datos.
5. Probar navegación móvil 320/390/768/1440, teclado, modales, errores de formulario, foco y lectores de pantalla.

**Fase S3 — Servicios externos y rendimiento (solo tras autorización explícita)**

1. Integrar AZUL **en sandbox autorizado**: firma, aprobación, rechazo, cancelación, retorno repetido, webhook duplicado, montos y conciliación. No usar transacciones comerciales reales sin autorización.
2. Integrar SMTP de pruebas con destinatarios controlados; comprobar plantillas, fallo de proveedor y reintentos.
3. Ejecutar Lighthouse (móvil/escritorio) y documentar LCP, CLS, INP y accesibilidad; comparar contra presupuestos propuestos: LCP <= 2.5 s, CLS <= 0.1 e INP <= 200 ms **en condiciones de evaluación acordadas**.
4. Ejecutar carga sostenida graduada y medible (por ejemplo 10 -> 25 -> 50 usuarios virtuales, sujeto a capacidad autorizada), registrar p95, errores, saturación SQL y ausencia de reservas duplicadas. No golpear servicios externos ni infraestructura ajena.
5. Confirmar logs, métricas, alertas, retención, respaldos, recuperación de uploads y guion de rollback probado.

## 5. Criterios de salida

- **Mantener PR #30 en Draft** hasta completar revisión de diff, resolver decisiones H1/H2/H5, y corroborar pruebas del HEAD final.
- **GO a staging** solo después de aprobar infraestructura aislada, rollback, protección de secretos y recursos necesarios.
- **GO a producción** exige validación de servicios reales y sus contratos, QA de administración y pagos, auditoría manual WCAG, rendimiento/carga, backup restaurable, CI verde del HEAD de código y **autorización explícita del propietario**.
- Ante fallos financieros, de seguridad, idempotencia, backup o permisos administrativos: **NO-GO**.

Este documento es un plan de verificación. Ninguno de los pasos de despliegue ni de proveedores ha sido ejecutado al redactarlo.

## 6. Bloque automatizado de seguridad de configuración (añadido posteriormente)

El PR incorpora un inventario de staging que **no contiene credenciales y no se puede usar tal cual**:

- `.env.staging.example`: host de ejemplo `.invalid`, Firebase de ejemplo, SQL sin credenciales, AZUL y SMTP deshabilitados.
- `scripts/validate-staging-config.mjs`: validación offline de nombres de dominio, CORS, URL de retorno, aislamiento Firebase/SQL, cifrado SQL, HTTPS y desactivación de servicios financieros/mensajería. No conecta a servicios y no imprime valores de secretos.
- `scripts/validate-staging-config.test.mjs`: pruebas de configuración segura y rechazo de valores de producción.
- `.github/workflows/staging-preflight.yml`: ejecuta los tests y el inventario **sin secretos**, sin crear infraestructura y sin desplegar.
- `.gitignore`: excluye `.env`, `.env.*`, claves y certificados privados; los inventarios de ejemplo permanecen versionables.

Comandos desde la raíz de la copia de trabajo:

```bash
node --test scripts/validate-staging-config.test.mjs
node scripts/validate-staging-config.mjs --template
```

Tras aprovisionar staging, **desde el propio entorno que recibe las variables inyectadas** (nunca copiar credenciales al repositorio):

```bash
node scripts/validate-staging-config.mjs --environment
```

`--environment` devuelve error si se mantiene el host de ejemplo, se usa el proyecto Firebase de producción, se habilita AZUL/SMTP, se apunta al dominio público o se conecta una base que no esté identificada como staging. También requiere `Encrypt=True` y `TrustServerCertificate=False` en SQL Server. Para un proxy HTTPS confiable que termine TLS y reenvíe HTTP interno, puede establecerse `Security__UseHttpsRedirection=false` **junto con** `Staging__TrustedHttpsProxy=true`; esta última es una declaración que consume el validador, no una comprobación automática de seguridad del proxy.

**Límites:** el validador verifica únicamente cadenas de configuración; no demuestra existencia de certificados válidos, aislamiento de red, credenciales correctas, acceso a la DB, permisos de Firebase, ni políticas AZUL/SMTP. Es un bloqueo de errores de preflight, no una prueba end-to-end.

**Estado de validación:** verificar el workflow de preflight del HEAD final antes de marcar este nuevo bloque PASS; los cinco workflows antiguos PASS correspondían al HEAD anterior `2fd8681`.
