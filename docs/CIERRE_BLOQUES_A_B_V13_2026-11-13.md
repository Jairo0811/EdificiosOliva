# Cierre técnico de los bloques A y B — Edificios Oliva v1.3

**Fecha:** 13 de noviembre de 2026 · **Rama:** `feature/v1.3-frontend-ux` ·
**PR:** [#30](https://github.com/Jairo0811/EdificiosOliva/pull/30) (borrador, sin merge).

## Bloque A — Administración 2.0 y accesibilidad

- Reservas, pagos e intentos de pago: paginación backend de 20 registros y tarjetas
  móviles que preservan CRUD, reembolso y conciliación según el módulo.
- Clientes y apartamentos: tarjetas móviles; dashboard y operación PMS con
  filtros, métricas y presentación adaptable.
- Galería administrativa: diálogo de vista previa accesible, filtros con
  `aria-pressed`, Escape y restauración del foco.
- Formularios administrativos: trampa de foco, Escape y retorno del foco;
  sidebar móvil fuera de la navegación por teclado cuando está cerrado.
- Páginas públicas: corregidos cinco elementos de contraste insuficiente
  detectados por axe-core en Inicio, Reservar y Contacto.

## Bloque B — Calidad, rendimiento y seguridad

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Angular | 120/120 pruebas, 42 archivos, build PASS | [Angular](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983260) |
| Playwright Chromium | 23/23 pruebas PASS | [Browser E2E](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983817) |
| Responsive | 16/16 escenarios PASS a 320, 390, 768 y 1440 px | [Browser E2E](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983817) |
| WCAG automatizado | 4/4 rutas sin infracciones graves/críticas de axe-core | [Browser E2E](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983817) |
| CLS/LCP (laboratorio) | CLS ~0.000024 (antes ~0.69); LCP ~396 ms | [Browser E2E](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983817) |
| Dependencias frontend de producción | `npm audit --omit=dev`: 0 vulnerabilidades | [Angular](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983260) |
| Backend / Docker | 32 pruebas backend, builds .NET/Docker PASS | [Informe previo](VALIDACION_V13_2026-11-13.md) |
| Migración e idempotencia | EF Core / SQL Server 2022 efímero, migración y carreras acotadas PASS | [Informe previo](VALIDACION_V13_2026-11-13.md) |

**Advertencia:** Playwright usa `/api/**` interceptada con datos de prueba.
No se probó AZUL, SMTP, Firebase Auth ni SQL Server de producción.
Lighthouse y WCAG manual en staging no están ejecutados. La auditoría axe
se limitó a cuatro rutas públicas en sus estados iniciales; no certifica
accesibilidad de todo el producto.

## Bloqueos para producción

1. Staging real con respaldos, migración, restauración y prueba de carga.
2. Certificación comercial AZUL, SMTP, DNS/HTTPS, Firebase y secretos.
3. Lighthouse y auditoría WCAG manual/admin autenticado.
4. Revisión de dependencias de desarrollo y autorización para reforzar
   la consulta pública de pagos con token opaco.
5. Revisión final del PR y autorización expresa antes de fusionar.

**Decisión:** los bloques A/B cuentan con evidencia CI; **producción sigue
bloqueada por validaciones externas y de staging**. No se modificó `master`.
