# ResidencialOliva

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.11.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Pruebas E2E con Playwright (v1.3)

Desde este directorio, con Node.js 24:

```bash
npm ci
npm install --no-save --package-lock=false @playwright/test@1.56.1 @axe-core/playwright@4.10.2
npx playwright install chromium
npx playwright test --config=playwright.config.ts
```

La suite levanta Angular en modo de producción en `127.0.0.1:4200`,
intercepta `/api/**` y **no procesa pagos ni modifica datos reales**.
Incluye reservas, seguridad del retorno de pago, 16 comprobaciones responsive,
4 auditorías WCAG automatizadas y captura LCP/CLS.
No sustituye E2E con SQL Server y AZUL reales.

Ver [documentación técnica](../docs/PLAYWRIGHT_UX_V13.md).

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
