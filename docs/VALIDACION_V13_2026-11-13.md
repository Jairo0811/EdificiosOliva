# Validación técnica de Edificios Oliva v1.3 — 13 de noviembre de 2026

> **Rama:** `feature/v1.3-frontend-ux` · **PR:** [#30](https://github.com/Jairo0811/EdificiosOliva/pull/30) · **Estado:** validación de código/CI; NO despliegue ni certificación de producción.

## Evidencia ejecutada

| Área | Resultado | Evidencia |
| --- | --- | --- |
| Angular | **PASS** · 120 pruebas / 42 archivos, build de producción y auditoría de dependencias de producción sin vulnerabilidades | [Angular CI](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983260) |
| Playwright / axe-core | **PASS** · 23/23 pruebas: reserva simulada, retorno de pago manipulado, 16 escenarios responsive y 4 auditorías WCAG sin infracciones graves/críticas detectadas | [Browser E2E CI](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983817) |
| Web Vitals de laboratorio | **PASS** · CLS ~0.000024 tras corregir un fallo inicial ~0.69; LCP ~396 ms con mocks | [Browser E2E CI](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983817) |
| .NET 10 | **PASS** · build Release, 32 pruebas backend | [.NET CI](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43512031802) |
| Docker | **PASS** · imágenes de frontend y backend construidas | [Docker CI](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43512031666) |
| Migraciones EF / SQL Server 2022 | **PASS** · modelo vs snapshot, aplicación desde base vacía, segunda aplicación sin cambios | [SQL Server CI](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43511884017) |
| Idempotencia con SQL Server 2022 | **PASS** · creación, reintento idéntico, conflicto con payload distinto y tres carreras de dos solicitudes simultáneas (una reserva por clave) | [SQL Server CI + integración](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43512417690) |
| Seguridad de dependencia Pkcs | **CORREGIDO** · fijado `System.Security.Cryptography.Pkcs` a `9.0.21`, versión corregida para GHSA-846f-f764-76mx y GHSA-2fmv-rv2c-59x7; sin avisos NU1902/NU1903 en el build .NET posterior | [.NET CI](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43512031802) |

La prueba de SQL Server usa una **base efímera aislada de GitHub Actions**, no la base del propietario. El workflow está en `.github/workflows/sqlserver-migration-validation.yml` y las pruebas de integración en `EdificiosOlivaBackend/EdificiosOliva.IntegrationChecks`. No envían correos ni llaman a AZUL.

## Qué demuestra la integración

1. La primera solicitud con `Idempotency-Key` crea una reserva.
2. Un reintento idéntico devuelve el mismo `ReservationId`, sin duplicar el registro.
3. Reutilizar la clave con huéspedes distintos produce `IdempotencyConflictException`.
4. Tres rondas de dos solicitudes simultáneas con la misma clave devuelven un solo `ReservationId` y persisten una sola reserva por ronda.

Las tres carreras son una **prueba de integración real pero acotada**; no sustituyen pruebas de carga, estrés prolongado ni certificación de concurrencia en producción.

## Pendiente para aprobar despliegue

- Aplicar migraciones en una copia/entorno de staging con datos representativos, respaldos y procedimiento de reversión; no ejecutar sobre producción sin aprobación.
- E2E adicional contra backend real en staging, Firebase Authentication y entorno certificado de AZUL; la suite Playwright actual usa API simulada.
- Validación de AZUL con el comercio, certificados y firmas reales; no se probaron cargos reales.
- Validar SMTP, DNS/TLS, SQL Server de producción, secretos, copias de seguridad y observabilidad.
- Auditoría manual WCAG 2.2 AA, revisión axe de administración autenticada y Lighthouse/LCP/CLS con datos, CDN y red reales (la auditoría pública y métricas de laboratorio ya pasan).
- Sustituir el esquema de consulta pública de pago por credenciales opacas antes de producción, si se aprueba el cambio de contrato.

**Decisión:** la integración continua y la migración en SQL Server de pruebas están validadas; **la salida a producción sigue BLOQUEADA por dependencias externas y pruebas de aceptación**. No fusionar ni desplegar sin autorización del propietario.
