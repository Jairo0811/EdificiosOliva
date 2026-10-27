<p align="center">
  <img src="./EdificiosOlivaFrontend/public/images/logo-residencial-oliva.png" alt="Logo de Edificios Oliva" width="320" />
</p>

<p align="center">
  <strong>Plataforma Full Stack de reservas y administración de apartamentos vacacionales</strong><br>
  <strong>Bávaro • Punta Cana • República Dominicana</strong>
</p>

<p align="center">
  <strong>Edificios Oliva v1.1.1</strong>
</p>

---

# 📖 Descripción

**Edificios Oliva** es una plataforma web Full Stack para la promoción, reserva y administración de apartamentos turísticos en **Bávaro, Punta Cana, República Dominicana**.

El proyecto nació en **2019** a partir de una iniciativa familiar relacionada con Residencial Oliva y fue reconstruido en 2026 con una arquitectura moderna. La línea **v1.1** evoluciona el producto desde reservas directas hacia cobros online reales: el visitante consulta disponibilidad, registra su reserva y, cuando AZUL está configurado, puede continuar al Payment Page hospedado sin que Edificios Oliva capture datos de tarjeta.

La solución utiliza **Angular 21**, **ASP.NET Core Web API sobre .NET 10**, **Entity Framework Core 10**, **SQL Server** y **Firebase Authentication mediante el SDK modular oficial**.

> **Alcance comercial de v1.1.1:** AZUL funciona como primer gateway real mediante su Payment Page hospedado. El backend genera el checkout firmado, valida criptográficamente el retorno y solo reconoce el pago cuando proveedor, referencia, firma y monto coinciden. WhatsApp permanece como canal alternativo.

---

# ✅ Edificios Oliva v1.0

## 🌐 Experiencia pública

- Landing page turística responsive.
- Catálogo de apartamentos obtenido desde la API.
- Vista de detalle y galería.
- Información institucional, contacto y ubicación.
- Consulta de disponibilidad real por apartamento y rango de fechas.
- Validación de capacidad máxima de huéspedes.
- Cálculo automático de noches, tarifa y total estimado.
- Registro real de la reserva en SQL Server.
- Creación/reutilización del cliente a partir de su correo electrónico.
- Código de confirmación `EO-XXXXXXXX` para cada solicitud.
- Estado inicial `Pending` hasta confirmación administrativa.
- Enlace de WhatsApp generado con los datos de la reserva para coordinar confirmación y pago.

## 🖥️ Panel administrativo

- Dashboard con datos persistidos.
- Gestión de apartamentos.
- Gestión de clientes.
- Gestión de reservas y estados.
- Gestión de pagos, transacciones y reembolsos lógicos.
- Gestión de galería e imágenes.
- Formularios de creación y edición.
- Imagen de portada y ordenamiento visual.
- Estados de disponibilidad, ocupación y mantenimiento.
- Eliminación lógica y auditoría básica mediante `BaseEntity`.

## 🔐 Autenticación y seguridad

- Firebase Authentication por correo/contraseña mediante SDK modular.
- Google Sign-In.
- Firebase ID Tokens validados en ASP.NET Core.
- Autenticación obligatoria por defecto en la API.
- Policy `Admin` mediante custom claim `role=admin`.
- Endpoints públicos limitados a catálogo, galería, health check y motor público de reservas.
- Guards e interceptor de autenticación en Angular.
- Respuestas 400/401/403/404/500 mediante Problem Details.
- `traceId` para diagnóstico.
- HSTS fuera de desarrollo.
- Validación y recodificación de imágenes a WebP.
- Protección frente a path traversal en eliminación de archivos.
- Rate limiting para el motor público de reservas.
- CORS configurable por entorno.

## 📅 Motor de reservas

El flujo público de v1.0 es:

```text
Visitante
   │
   ▼
Angular /booking
   │
   ├── GET /api/apartments
   │
   ├── GET /api/public/bookings/availability
   │          │
   │          ├── valida fechas
   │          ├── valida capacidad
   │          └── detecta solapamientos
   │
   └── POST /api/public/bookings
              │
              ├── crea/reutiliza Customer
              ├── vuelve a comprobar disponibilidad
              ├── crea Reservation(Pending)
              ├── persiste en transacción serializable
              └── devuelve confirmación EO-XXXXXXXX
```

La creación pública vuelve a validar la disponibilidad dentro de una **transacción serializable** para reducir el riesgo de dobles reservas concurrentes.

## 💳 Pagos online — v1.1.1

La capa de pagos mantiene separado el intento externo del pago reconocido:

```text
Reservation
   │
   ▼
PaymentIntent
   │
   ├── idempotencia
   ├── monto calculado por backend
   ├── referencia del proveedor
   └── estado del gateway
   │
   ▼
AzulPaymentGateway
   │
   ▼
AZUL Payment Page
   │
   ├── el huésped introduce tarjeta fuera de Edificios Oliva
   └── AZUL devuelve resultado firmado
   │
   ▼
GET /api/public/payments/returns/AZUL/{outcome}
   │
   ├── valida HMAC-SHA512
   ├── valida referencia
   ├── valida monto
   ├── deduplica evento
   └── aplica estado
   │
   ▼
Payment(Paid) → Reservation(Confirmed)
```

Reglas relevantes:

- Edificios Oliva **no recibe ni almacena PAN, fecha de expiración ni CVV**.
- El monto del checkout no se acepta desde Angular; se deriva del saldo persistido de la reserva.
- Los reintentos reutilizan la capa de idempotencia para evitar dobles cobros lógicos.
- El retorno de AZUL se valida mediante el AuthHash firmado antes de registrar un pago.
- El monto firmado por AZUL debe coincidir con el PaymentIntent.
- SaveToDataVault=0 en v1.1.1: no se tokenizan tarjetas.
- AZUL solo se registra como proveedor cuando Payments:Azul:Enabled=true y su configuración pasa validación.
- La devolución automática (Refund) de AZUL todavía no forma parte de v1.1.1.
- Si un pago se completa en AZUL pero el navegador nunca regresa al sitio, el intento puede permanecer pendiente de conciliación. La reconciliación server-to-server se reserva para v1.1.2.

---

# 🛠️ Stack tecnológico

## Frontend

- **Angular 21.2.x**
- **TypeScript 5.9**
- **Angular Material / CDK**
- **Bootstrap 5**
- **AOS**
- **Swiper**
- **Leaflet**
- **Firebase modular SDK**
- **Vitest**

## Backend

- **.NET 10**
- **ASP.NET Core Web API**
- **C#**
- **Entity Framework Core 10**
- **SQL Server**
- **OpenAPI / Swagger**
- **Clean Architecture**
- **SkiaSharp** para validación y normalización de imágenes

## Infraestructura y calidad

- Git / GitHub
- GitHub Actions
- npm
- CI de Angular y .NET
- Build de producción de Angular
- Pruebas frontend en CI
- Auditoría npm de dependencias de producción

---

# 🏗️ Arquitectura

```text
                           Visitantes
                               │
                               ▼
                         Angular 21 SPA
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
       Firebase Authentication      ASP.NET Core Web API
                                             │
                            ┌────────────────┴───────────────┐
                            ▼                                ▼
                     SQL Server                       wwwroot/uploads
                            │
            ┌───────────────┼────────────────┐
            ▼               ▼                ▼
        Customers       Reservations       Payments
                            │
                            ▼
                    PaymentIntents
                            │
                            ▼
                   AZUL Payment Page
```

El backend mantiene separación por capas:

```text
EdificiosOliva.Api
EdificiosOliva.Application
EdificiosOliva.Domain
EdificiosOliva.Infrastructure
```

Entidades principales:

```text
Apartment
ApartmentImage
Amenity
ApartmentAmenity
Customer
Reservation
Payment
PaymentIntent
PaymentWebhookEvent
GalleryImage
```

---

# 📂 Estructura del repositorio

```text
EdificiosOliva
│
├── EdificiosOlivaFrontend
│   ├── public
│   └── src
│       ├── app
│       │   ├── core
│       │   ├── layouts
│       │   ├── pages
│       │   └── shared
│       └── environments
│
├── EdificiosOlivaBackend
│   ├── EdificiosOliva.Api
│   ├── EdificiosOliva.Application
│   ├── EdificiosOliva.Domain
│   ├── EdificiosOliva.Infrastructure
│   └── EdificiosOliva.slnx
│
├── .github/workflows
├── SECURITY_SETUP.md
├── CHANGELOG.md
└── README.md
```

---

# 🚀 Desarrollo local

## Requisitos

- Node.js compatible con Angular 21.
- npm 11 o superior.
- Angular CLI 21.
- .NET SDK 10.
- SQL Server o SQL Server LocalDB.
- Proyecto de Firebase configurado.

## Frontend

```bash
cd EdificiosOlivaFrontend
npm ci
npm start
```

Disponible por defecto en:

```text
http://localhost:4200
```

La v1.0 utiliza directamente el **SDK modular de Firebase**, por lo que ya no depende de la capa AngularFire ni requiere `--legacy-peer-deps` para instalar las dependencias.

## Backend

En `Development`, el repositorio utiliza una cadena genérica de SQL Server LocalDB:

```text
Server=(localdb)\MSSQLLocalDB;Database=EdificiosOlivaDb;Trusted_Connection=True;TrustServerCertificate=True
```

Ejecutar:

```bash
cd EdificiosOlivaBackend
dotnet restore
dotnet ef database update --project EdificiosOliva.Infrastructure --startup-project EdificiosOliva.Api
dotnet run --project EdificiosOliva.Api
```

El health check público queda disponible en:

```text
GET /health
```

---

# ⚙️ Configuración de producción

La configuración personal de máquinas no se versiona. En producción deben suministrarse variables/secretos del entorno.

Variables principales:

```text
ConnectionStrings__DefaultConnection
Firebase__ProjectId
AllowedHosts
Cors__AllowedOrigins__0
Cors__AllowedOrigins__1
Payments__FrontendReturnUrl
Payments__Azul__Enabled
Payments__Azul__MerchantId
Payments__Azul__MerchantName
Payments__Azul__MerchantType
Payments__Azul__SettlementCurrency
Payments__Azul__CurrencyCode
Payments__Azul__AuthKey
Payments__Azul__PaymentPageUrl
Payments__Azul__AlternatePaymentPageUrl
Payments__Azul__ReturnBaseUrl
Payments__Azul__Locale
Payments__Azul__ItbisRate
Payments__Azul__PricesIncludeItbis
Payments__Azul__UseGooglePay
Notifications__Email__Enabled
Notifications__Email__Host
Notifications__Email__Port
Notifications__Email__EnableSsl
Notifications__Email__Username
Notifications__Email__Password
Notifications__Email__FromAddress
Notifications__Email__FromName
Notifications__Email__PublicBaseUrl
```

Ejemplo conceptual:

```text
ConnectionStrings__DefaultConnection=<SQL Server production connection string>
Firebase__ProjectId=edificios-oliva
AllowedHosts=api.edificiosoliva.com
Cors__AllowedOrigins__0=https://edificiosoliva.com
Cors__AllowedOrigins__1=https://www.edificiosoliva.com

Payments__FrontendReturnUrl=https://edificiosoliva.com/reservar
Payments__Azul__Enabled=true
Payments__Azul__MerchantId=<AZUL merchant id>
Payments__Azul__MerchantName=Edificios Oliva
Payments__Azul__MerchantType=ECommerce
Payments__Azul__SettlementCurrency=USD
Payments__Azul__CurrencyCode=$
Payments__Azul__AuthKey=<AZUL secret auth key>
Payments__Azul__PaymentPageUrl=https://pagos.azul.com.do/PaymentPage/Default.aspx
Payments__Azul__AlternatePaymentPageUrl=https://contpagos.azul.com.do/PaymentPage/Default.aspx
Payments__Azul__ReturnBaseUrl=https://api.edificiosoliva.com
Payments__Azul__Locale=ES
Payments__Azul__ItbisRate=0
Payments__Azul__PricesIncludeItbis=true
Payments__Azul__UseGooglePay=false

Notifications__Email__Enabled=true
Notifications__Email__Host=<SMTP host>
Notifications__Email__Port=587
Notifications__Email__EnableSsl=true
Notifications__Email__Username=<SMTP user>
Notifications__Email__Password=<SMTP secret>
Notifications__Email__FromAddress=reservas@edificiosoliva.com
Notifications__Email__FromName=Edificios Oliva
Notifications__Email__PublicBaseUrl=https://edificiosoliva.com
```

No deben versionarse contraseñas, service accounts, cadenas de conexión, Payments__Azul__AuthKey ni Notifications__Email__Password. El ReturnBaseUrl debe ser HTTPS público y corresponder a un host permitido/configurado para el comercio en AZUL. El valor fiscal de ItbisRate debe configurarse según el tratamiento real de la operación; el repositorio no asume una tasa por defecto.

Para asignar acceso administrativo se debe utilizar un Firebase custom claim:

```text
role=admin
```

Consultar `SECURITY_SETUP.md` para los pasos de seguridad asociados.

---

# 🗄️ Base de datos

Base principal:

```text
EdificiosOlivaDb
```

Tablas principales:

```text
Apartments
ApartmentImages
Amenities
ApartmentAmenities
Customers
Reservations
Payments
PaymentIntents
PaymentWebhookEvents
GalleryImages
__EFMigrationsHistory
```

Reglas de negocio relevantes de v1.0:

- `CheckOutDate` debe ser posterior a `CheckInDate`.
- No se permiten reservas nuevas con fecha de entrada pasada.
- Un apartamento en mantenimiento no puede reservarse.
- La cantidad de huéspedes no puede superar la capacidad.
- Reservas `Pending`, `Confirmed` o `InProgress` bloquean fechas superpuestas.
- El precio de la reserva se congela utilizando la tarifa nocturna vigente al crearla.
- Los pagos completados no pueden superar el total de la reserva.
- Un identificador de transacción no puede reutilizarse.
- Solo pagos completados pueden marcarse como reembolsados.

---

# 📊 Estado de v1.0

| Módulo | Estado |
|---|:---:|
| Landing / responsive | ✅ |
| Catálogo y detalle de apartamentos | ✅ |
| Galería y mapas | ✅ |
| Firebase Authentication | ✅ |
| Firebase ID Token validation en API | ✅ |
| Policy administrativa | ✅ |
| Problem Details / manejo global de errores | ✅ |
| CRUD de apartamentos | ✅ |
| Gestión de clientes | ✅ |
| Gestión administrativa de reservas | ✅ |
| Consulta pública de disponibilidad | ✅ |
| Reserva pública persistida | ✅ |
| Protección contra solapamientos | ✅ |
| Cálculo real de noches y total | ✅ |
| Código de confirmación | ✅ |
| Gestión administrativa de pagos | ✅ |
| Carga segura de imágenes | ✅ |
| CORS configurable | ✅ |
| Rate limiting de reservas públicas | ✅ |
| Health check | ✅ |
| Firebase modular sin AngularFire | ✅ |
| CI Angular | ✅ |
| CI .NET | ✅ |
| Pruebas frontend en CI | ✅ |
| Auditoría npm en CI | ✅ |
| Payment Foundation / idempotencia | ✅ v1.1 |
| Checkout hospedado AZUL | ✅ v1.1.1 |
| Validación HMAC y monto de retorno | ✅ v1.1.1 |
| Operación y conciliación administrativa de pagos | ✅ v1.1.2 |
| Emails de reserva y pago | ✅ v1.1.3 |
| Comprobante imprimible | ✅ v1.1.3 |
| Políticas comerciales y privacidad | ✅ v1.1.4 |
| Reportes avanzados | ➡️ v1.1+ |
| Notificaciones automáticas | ➡️ v1.1+ |
| Docker / despliegue empaquetado | ➡️ v1.1+ |
| Multi-tenant / SaaS | Fuera del alcance |

---

# 🧪 Validación

Antes de fusionar cambios hacia la rama principal, GitHub Actions valida:

```text
Frontend
├── npm ci
├── npm run build
├── npm test -- --watch=false
└── npm audit --omit=dev --audit-level=high

Backend
├── dotnet restore
├── dotnet build --configuration Release
└── xUnit v3: pruebas del gateway AZUL
```

Pruebas manuales recomendadas para el motor de reservas:

1. Consultar fechas válidas y comprobar el total.
2. Registrar una reserva pública.
3. Confirmar que el cliente aparece en administración.
4. Confirmar que la reserva aparece como `Pending`.
5. Intentar reservar de nuevo el mismo apartamento en fechas superpuestas.
6. Confirmar que la segunda operación es rechazada.
7. Confirmar la reserva desde administración y registrar el pago cuando corresponda.

---

# 🗺️ Después de v1.0

La rama v1 queda cerrada funcionalmente con reservas directas y administración. Las siguientes mejoras son evolución de producto, no requisitos pendientes de v1.0:

## v1.1 — Pagos y comunicación

- ✅ Payment Foundation provider-agnostic.
- ✅ Idempotencia y trazabilidad de eventos.
- ✅ Primer checkout real con AZUL Payment Page.
- ✅ Validación criptográfica del retorno y del monto.
- ✅ Revisión y conciliación administrativa de intents inciertos.
- ✅ Confirmaciones automáticas de reserva y pago por SMTP configurable.
- ✅ Comprobante imprimible tras pago aprobado.
- ✅ Políticas públicas de reserva, pago, cancelación, privacidad y seguridad.
- ➡️ Notificaciones operativas de entrada/salida.

## v1.2 — Operación y analítica

- Ocupación por período.
- Ingresos por apartamento.
- Reportes PDF/Excel.
- Auditoría ampliada.
- Registro de actividad.
- Exportación de calendarios / integración iCal.

## Futuro

Una eventual versión SaaS para terceros requeriría multi-tenancy, propietarios, planes, facturación, branding por negocio y aislamiento de datos. Ese producto no forma parte de Edificios Oliva v1.0.

---

# 👨‍💻 Autor

**Francis Jairo Matías Rosario**

Tecnólogo en Desarrollo de Software  
Estudiante de Ingeniería de Software

---

<p align="center">
  Desarrollado con ❤️ utilizando Angular, ASP.NET Core, Entity Framework Core, SQL Server y Firebase Authentication.
</p>

<p align="center">
  <strong>Edificios Oliva • 2019 — Presente</strong>
</p>
