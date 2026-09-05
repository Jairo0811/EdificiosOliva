<p align="center">
  <img src="./EdificiosOlivaFrontend/public/images/logo-residencial-oliva.png" alt="Logo de Edificios Oliva" width="320" />
</p>

<p align="center">
  <strong>Plataforma Full Stack de reservas y administración de apartamentos vacacionales</strong><br>
  <strong>Bávaro • Punta Cana • República Dominicana</strong>
</p>

<p align="center">
  <strong>Edificios Oliva v1.0</strong>
</p>

---

# 📖 Descripción

**Edificios Oliva** es una plataforma web Full Stack para la promoción, reserva y administración de apartamentos turísticos en **Bávaro, Punta Cana, República Dominicana**.

El proyecto nació en **2019** a partir de una iniciativa familiar relacionada con Residencial Oliva y fue reconstruido en 2026 con una arquitectura moderna. La versión **v1.0** consolida el proyecto como una aplicación funcional: el visitante consulta apartamentos y disponibilidad real, registra una solicitud de reserva y recibe un código de confirmación; el personal autorizado administra apartamentos, clientes, reservas, pagos, galería y operación desde un panel privado.

La solución utiliza **Angular 21**, **ASP.NET Core Web API sobre .NET 10**, **Entity Framework Core 10**, **SQL Server** y **Firebase Authentication**.

> **Alcance comercial de v1.0:** la reserva se registra realmente en SQL Server y queda pendiente de confirmación/pago. El cobro se coordina fuera del checkout —por ejemplo mediante WhatsApp— y posteriormente se registra en el módulo administrativo de pagos. La integración con una pasarela de pago online queda explícitamente fuera del alcance de v1.0 para no simular transacciones inexistentes.

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

- Firebase Authentication por correo/contraseña.
- Google Sign-In.
- Firebase ID Tokens validados en ASP.NET Core.
- Autenticación obligatoria por defecto en la API.
- Policy `Admin` mediante custom claim `role=admin`.
- Endpoints públicos limitados a catálogo, galería y motor público de reservas.
- Guards e interceptor de autenticación en Angular.
- Respuestas 400/401/403/404/500 mediante Problem Details.
- `traceId` para diagnóstico.
- HSTS fuera de desarrollo.
- Validación y recodificación de imágenes a WebP.
- Protección frente a path traversal en eliminación de archivos.
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

---

# 🛠️ Stack tecnológico

## Frontend

- **Angular 21**
- **TypeScript 5.9**
- **Angular Material / CDK**
- **Bootstrap 5**
- **AOS**
- **Swiper**
- **Leaflet**
- **Firebase / AngularFire**
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
npm install --legacy-peer-deps
npm start
```

Disponible por defecto en:

```text
http://localhost:4200
```

> El uso de `--legacy-peer-deps` se mantiene en v1.0 por la combinación actual Angular 21 / AngularFire 20. El proyecto compila con esta instalación en CI; eliminar esta compatibilidad es mantenimiento posterior y no bloquea el alcance funcional de v1.0.

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
```

Ejemplo conceptual:

```text
ConnectionStrings__DefaultConnection=<SQL Server production connection string>
Firebase__ProjectId=edificios-oliva
AllowedHosts=api.edificiosoliva.com
Cors__AllowedOrigins__0=https://edificiosoliva.com
Cors__AllowedOrigins__1=https://www.edificiosoliva.com
```

No deben versionarse contraseñas, service accounts ni cadenas de conexión de producción.

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
| CI Angular | ✅ |
| CI .NET | ✅ |
| Pruebas frontend en CI | ✅ |
| Pasarela de pago online | ➡️ v1.1 |
| Reportes avanzados | ➡️ v1.1+ |
| Notificaciones automáticas | ➡️ v1.1+ |
| Docker / despliegue empaquetado | ➡️ v1.1+ |
| Multi-tenant / SaaS | Fuera del alcance |

---

# 🧪 Validación

Antes de fusionar cambios hacia la rama principal, GitHub Actions valida:

```text
Frontend
├── npm ci --legacy-peer-deps
├── npm run build
├── npm test -- --watch=false
└── npm audit --omit=dev --audit-level=high

Backend
├── dotnet restore
└── dotnet build --configuration Release
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

- Integración con una pasarela de pago real.
- Webhooks e idempotencia de cobro.
- Confirmaciones automáticas por correo.
- Notificaciones de entrada/salida.
- Recibos/comprobantes.

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
