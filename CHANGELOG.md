# Changelog

Todos los cambios relevantes de Edificios Oliva se documentan en este archivo.

## [Unreleased] - v1.3.0 (en curso, PR #30)

> Alcance parcial: ver "Pendiente" al final de esta sección. No es una release.

### Añadido

- `POST /api/public/payments/status`: consulta de **solo lectura** del estado de pago. Autoriza con
  `reservationId` + código de reserva + correo (igual que el checkout), responde 404 uniforme ante
  cualquier discrepancia, limita la consulta a reservas de los últimos 30 días, usa la política de
  rate limit `PublicPayment` y `Cache-Control: no-store`. Se usa POST solo para no exponer correo ni
  código en la URL. Estados: `NotStarted, Pending, Confirmed, Declined, Cancelled, Refunded,
  RequiresReview` (numéricos). `Confirmed` exige intento `Succeeded` **y** reserva ya confirmada.
- Idempotencia en `POST /api/public/bookings` mediante la cabecera opcional `Idempotency-Key`
  (8-100 caracteres `[A-Za-z0-9._:-]`): reintento idéntico -> 200 con la reserva original y
  `Idempotent-Replayed: true`; misma clave con datos distintos -> 409. Índice único filtrado en
  `Reservations.IdempotencyKey`. Sin cabecera el comportamiento no cambia.
- **Migración `AddReservationIdempotency`**: aplicar `dotnet ef database update` **antes** de desplegar
  este backend (agrega dos columnas nulas y un índice).
- Stepper de reserva de cinco pasos (Estadía, Huésped, Revisión, Pago, Resultado) accesible por teclado.
- Verificación del pago en `/reservar` tras el retorno de AZUL con sondeo acotado (6 intentos / 4 s).
- Pruebas: backend 32 (CI); suite frontend ampliada con casos de paginación, tarjetas móviles y filtros PMS (recuento final sujeto a CI).

### Cambiado

- Administración de reservas: paginación backend de 20 registros por página, búsqueda que reinicia
  la página, indicadores de registros y tarjetas móviles con acciones de edición/eliminación.
- Intentos de pago: paginación de 20 registros, tarjetas móviles y conciliación accesible desde
  cada tarjeta. El indicador «requieren revisión» se etiqueta explícitamente como **conteo de la
  página actual**, no del total del sistema.
- Operación PMS: KPI adicionales de reservas confirmadas y noches de inventario, filtros locales
  por apartamento/estado de estadía, tarjetas móviles por apartamento y cálculo de período
  según `America/Santo_Domingo`. Exportes CSV vinculados al rango cargado; filtros locales
  no modifican los KPI del período.
- Dashboard administrativo: filtros locales de reservas recientes por cliente/apartamento y estado,
  tarjetas móviles con datos etiquetados y fecha de próximo check-in calculada según la zona horaria
  de la propiedad. Los KPI globales no se alteran al filtrar. Cuatro pruebas del dashboard.
- Dependencias sin consumidores eliminadas: `@fortawesome/fontawesome-free`, `aos`, `leaflet` (CSS y JS
  globales en `angular.json`) y `swiper`. Se conservan Bootstrap, Bootstrap Icons (92 usos) y Angular
  Material (aporta el tema `--mat-sys-*`; `@angular/cdk` es su dependencia). Medido en build de producción
  en sandbox (fuentes de Google desactivadas): carga inicial 322.08 kB -> 263.48 kB transferidos
  (1.46 MB -> 1.18 MB sin comprimir); `styles.css` 57.12 -> 35.81 kB; `scripts.js` (Leaflet, 37.29 kB) eliminado.
- Sistema de diseño: `.eo-hero`, `.eo-stepper`, `.eo-input`, `.eo-btn`, `.eo-alert` en `styles.css`.
- Administración: navegación agrupada (General, Alojamiento, Reservas, Finanzas, Operación), título de
  sección dinámico, enlace "Saltar al contenido", tablas desplazables enfocables y diálogo de conciliación
  accesible (foco, Escape). Sin cambios en las reglas de conciliación.
- Galería: lightbox accesible (Escape, flechas, foco atrapado y restaurado).
- Contacto: el formulario no enviaba nada; ahora valida y abre WhatsApp con el mensaje (no hay endpoint).
- Registro: placeholder reemplazado por página informativa (no existe registro público).

### Corregido

- Login: eliminado `console.log` de credenciales/perfil; los errores ya se muestran.
- Repintado sin Zone.js en Login, Navbar, layout admin, Intentos de pago y Operación.
- Parámetros entre detalle y `/reservar`, fechas en zona horaria de la propiedad, repintado sin Zone.js,
  textos que daban por confirmada una reserva solo por `?payment=approved`, `re2js` (GHSA-gg6h-894w-4m9c).

### Seguridad

- La UI nunca declara un pago aprobado sin confirmación del backend; un retorno manipulado no confirma.
- No se inicia un segundo cobro mientras el pago esté pendiente, confirmado, en revisión o sin verificar.
- Sin cambios en la verificación criptográfica de AZUL ni en la conciliación.

### Pendiente en v1.3 (no implementado)

Administración 2.0 (resto de tablas administrativas y uniformidad de tokens),
auditoría responsive/WCAG completa, métricas LCP/CLS/Lighthouse, pruebas E2E,
pruebas backend con base de datos (concurrencia real). README ampliado para documentar
la rama v1.3 sin presentarla como release. El audit de dependencias de desarrollo aún informa avisos; `npm audit --omit=dev` permanece limpio.

## [1.2.0] - 2026-10-27

### Añadido

- Consola administrativa de operación y analítica por rango de fechas.
- Ocupación, noches reservadas, tarifa media reservada e ingresos reconocidos.
- Rendimiento de ocupación e ingresos por apartamento.
- Calendario operativo de estadías.
- Exportes CSV UTF-8 de reservas y pagos.
- Feed público iCalendar por apartamento sin datos personales de huéspedes.
- Zona horaria de la propiedad configurable mediante `Property__TimeZoneId`.
- Readiness endpoint `GET /health/ready` con conectividad real a SQL Server.
- Dockerfile de ASP.NET Core 10.
- Dockerfile de Angular/Nginx y configuración SPA/reverse proxy.
- `.env.example` como catálogo de variables de entorno.
- `DEPLOYMENT.md` con runbook de producción y checklists AZUL/SMTP.

### Cambiado

- Validación de fechas de reserva y dashboard usan la fecha local de la propiedad, no UTC.
- README consolidado como v1.2.0 / línea v1 code-complete.
- El roadmap separa el código terminado de afiliación, credenciales y despliegue externos.

### Seguridad y operación

- Headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- El feed iCal no expone nombre, correo ni teléfono del huésped.
- SQL Server readiness puede devolver HTTP 503 cuando la base no está disponible.
- Los uploads locales se documentan como volumen persistente obligatorio en producción.
- Migraciones de producción permanecen como paso controlado de release; no se autoejecutan al arrancar.

### Estado

- La línea v1 queda **code-complete**.
- AZUL, SMTP, dominio/TLS, infraestructura y decisiones fiscales reales siguen siendo activaciones externas deliberadamente no simuladas.

## [1.1.2] - 2026-10-27

### Añadido

- Pantalla administrativa de intentos de pago y detección de casos que requieren revisión.
- Conciliación administrativa auditada para intentos expirados o inciertos.
- Referencia real del proveedor obligatoria para confirmar manualmente un pago.
- Protección contra sobrepago durante conciliación.
- Evento de auditoría para cada conciliación manual.

### Decisión técnica

- No se reutiliza `VerifyPayment` de AZUL Webservices como si fuera una API de Payment Page. La automatización adicional queda condicionada a un mecanismo documentado/habilitado por AZUL para el comercio.

## [1.1.4] - 2026-10-27

### Añadido

- Emails automáticos de solicitud de reserva y pago confirmado mediante SMTP configurable.
- Comprobante imprimible para reservas con pago aprobado.
- Página pública de políticas comerciales, cancelación, privacidad y seguridad de pagos.
- Enlaces legales visibles desde el footer.
- Aceptación explícita de políticas antes de iniciar el checkout AZUL.
- Referencia real de transacción AZUL preservada cuando está disponible.

### Seguridad y operación

- SMTP deshabilitado por defecto hasta configurar secretos reales.
- Los fallos de correo no revierten reservas ni pagos ya persistidos.
- Credenciales SMTP permanecen fuera del repositorio.
- Los datos de tarjeta continúan fuera de Edificios Oliva.

## [1.1.1] - 2026-10-27

### Añadido

- Integración provider-specific AzulPaymentGateway sobre la Payment Foundation de v1.1.
- Checkout público hospedado mediante AZUL Payment Page.
- Generación de formulario POST firmado con AuthHash HMAC-SHA512.
- Endpoint público POST /api/public/payments/checkout.
- Endpoint de retorno GET /api/public/payments/returns/AZUL/{outcome}.
- Validación de retorno aprobado, declinado y cancelado.
- Verificación del monto firmado contra el PaymentIntent.
- Restauración de la confirmación de reserva al regresar desde AZUL.
- Configuración por entorno para Merchant ID, AuthKey, URLs, moneda, locale e ITBIS.
- Rate limiting dedicado para checkout público.

### Seguridad

- Los datos de tarjeta permanecen en el Payment Page de AZUL; Edificios Oliva no captura PAN/CVV.
- SaveToDataVault=0 por defecto.
- AuthKey únicamente por secreto/variable de entorno.
- Checkout deshabilitado por defecto hasta completar configuración válida.
- Reserva pública validada por ID, código de confirmación y correo antes de iniciar un pago.
- Monto del pago calculado exclusivamente en backend.
- Retornos con firma inválida o monto inconsistente no generan Payment(Paid).

### Alcance conocido

- v1.1.1 usa el retorno firmado del navegador como confirmación del Payment Page.
- La conciliación server-to-server para pagos completados cuyo navegador no retorna queda para v1.1.2.
- La devolución automática de AZUL no está habilitada todavía; el flujo administrativo existente permanece disponible.
## [1.0.0] - 2026-09-04

### Añadido

- Motor público de reservas conectado a la API y SQL Server.
- Consulta de disponibilidad por apartamento, fechas y cantidad de huéspedes.
- Cálculo real de noches, tarifa nocturna y total estimado.
- Registro de reservas públicas con estado inicial `Pending`.
- Creación o reutilización de clientes por correo electrónico.
- Código de confirmación `EO-XXXXXXXX` para solicitudes públicas.
- Endpoint `GET /api/public/bookings/availability`.
- Endpoint `POST /api/public/bookings`.
- Transacción serializable al crear una reserva pública para reforzar la protección contra solapamientos concurrentes.
- Health endpoint público `GET /health`.
- Rate limiting para el motor público de reservas.
- CORS configurable por entorno.
- Pruebas frontend ejecutadas en GitHub Actions.
- Auditoría de dependencias de producción con `npm audit` en CI.

### Cambiado

- La página `/booking` dejó de utilizar apartamentos, noches y precios simulados.
- El falso botón de pago fue sustituido por un flujo honesto de solicitud, confirmación y coordinación de pago.
- La configuración de desarrollo ya no contiene el hostname de una computadora personal.
- `appsettings.Development.json` utiliza SQL Server LocalDB genérico.
- Producción exige `ConnectionStrings__DefaultConnection` y configuración de hosts/CORS por entorno.
- README reorganizado alrededor del alcance real de v1.0.

### Seguridad

- Firebase ID Tokens validados en ASP.NET Core.
- Policy `Admin` aplicada a operaciones administrativas.
- Problem Details consistentes para errores HTTP.
- HSTS fuera de Development.
- Carga de imágenes validada y recodificada.
- Protección frente a path traversal en eliminación de archivos.
- Limitación de frecuencia en endpoints públicos de reserva.

### Alcance conocido

- v1.0 registra y administra pagos, pero no procesa tarjetas ni PayPal dentro del checkout.
- La pasarela de pago online, webhooks y confirmaciones automáticas se reservan para v1.1.
- Multi-tenancy/SaaS no forma parte del alcance de Edificios Oliva v1.0.
