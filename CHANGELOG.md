# Changelog

Todos los cambios relevantes de Edificios Oliva se documentan en este archivo.

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
