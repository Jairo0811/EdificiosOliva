# Pruebas de navegador y auditoría UX — v1.3

## Alcance automatizado

El workflow `.github/workflows/browser-e2e.yml` inicia Angular en **modo de compilación de producción** y ejecuta Chromium mediante Playwright `1.56.1`.

- Reserva pública: precarga desde URL, disponibilidad, huésped, revisión, aceptación de políticas, creación con cabecera `Idempotency-Key`, código de reserva y pago en línea deshabilitado.
- Regresión de seguridad: manipular `?payment=approved` **no** declara el pago confirmado cuando el backend informa `Pending`.
- Responsive: rutas Inicio, Reservar, Contacto y Galería a 320, 390, 768 y 1440 px; se detecta contenido principal que sale del viewport.
- Accesibilidad: axe-core revisa WCAG 2.0/2.1/2.2 A/AA en las rutas públicas principales y bloquea infracciones graves/críticas; guarda todas las observaciones para revisión manual.
- Web Vitals de laboratorio: captura LCP y CLS en Chromium; CLS se verifica bajo 0.25. Se guarda evidencia JSON y trazas cuando falla.

## Resultado verificado — GitHub Actions, 13-11-2026

- **23 de 23 pruebas Playwright PASS**, en Chromium sobre Ubuntu 24.04.
- **16 de 16 escenarios responsive PASS**: Inicio, Reservar, Contacto y Galería,
  a 320, 390, 768 y 1440 px.
- **4 de 4 auditorías axe-core PASS**: cero infracciones graves/críticas
  detectadas en los estados públicos analizados, tras corregir cinco fallos
  de contraste (1 Inicio, 3 Reserva, 1 Contacto).
- Flujo de reserva completo con API simulada y regresión de `?payment=approved`: PASS.
- Home, laboratorio con mocks: **CLS ~0.000024** (antes ~0.69–0.71);
  **LCP ~396 ms**. La corrección principal fue reservar la altura del
  contenedor de ruta durante la carga diferida de Angular.
- [Workflow y evidencias](https://github.com/Jairo0811/EdificiosOliva/actions/runs/43515983817).

## Límites importantes

La suite intercepta `/api/**` con **respuestas contractuales deterministas**. No accede a AZUL, no procesa dinero, no envía emails ni prueba autenticación Firebase real. Tampoco sustituye una suite de integración E2E completa con SQL Server y API desplegada.

Los valores LCP/CLS en este entorno son **mediciones de laboratorio con mocks**, no métricas de campo ni auditoría Lighthouse de un sitio desplegado. Antes de producción se debe ejecutar Lighthouse y axe-core sobre staging con imágenes, fuentes, backend y red reales.

## Ejecución local

Desde `EdificiosOlivaFrontend`, con Node 24:

```bash
npm ci
npm install --no-save --package-lock=false @playwright/test@1.56.1 @axe-core/playwright@4.10.2
npx playwright install chromium
npx playwright test --config=playwright.config.ts
```

Playwright levanta `ng serve --configuration production` en `127.0.0.1:4200` y lo detiene al finalizar. No modifica datos reales.

**Release:** PR #30 sigue en borrador; la CI debe pasar antes de solicitar merge.
