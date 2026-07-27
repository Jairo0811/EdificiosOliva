<p align="center">
  <img src="./EdificiosOlivaFrontend/public/images/logo-residencial-oliva.png" alt="Logo de Edificios Oliva" width="320" />
</p>

<p align="center">
  <strong>Plataforma Full Stack para alquiler y administración de apartamentos vacacionales</strong><br>
  <strong>Bávaro • Punta Cana • República Dominicana</strong>
</p>

---

# 📖 Descripción

**Edificios Oliva** es una plataforma web Full Stack orientada a la promoción, alquiler y administración de apartamentos turísticos ubicados en **Bávaro, Punta Cana, República Dominicana**.

El proyecto nace de **Residencial Oliva**, una iniciativa personal iniciada en **2019** e inspirada en un proyecto familiar relacionado con el residencial. En 2026 fue recuperado y reconstruido con una arquitectura moderna, manteniendo la esencia de su propósito original y ampliándolo hasta convertirlo en una solución integral de gestión.

El sistema combina un sitio web público para visitantes con un panel administrativo privado desde el cual se gestionan apartamentos, imágenes, amenidades, clientes, reservas, pagos, disponibilidad, reportes y contenido general.

La solución fue reconstruida con **Angular 21**, **ASP.NET Core Web API sobre .NET 10**, **Entity Framework Core 10**, **SQL Server** y **Firebase Authentication**, y continúa evolucionando hacia una versión preparada para producción.

Firebase se utiliza exclusivamente como proveedor de autenticación. Toda la lógica del negocio, la persistencia de datos y la gestión de archivos son administradas por ASP.NET Core mediante una API REST y una arquitectura Clean.

El objetivo es consolidar el proyecto como una aplicación profesional, mantenible, escalable, segura y preparada para producción.

---

# ✨ Funcionalidades actuales

## 🌐 Sitio web público

- ✅ Landing page moderna.
- ✅ Hero principal con diseño turístico.
- ✅ Navegación responsive.
- ✅ Catálogo visual de apartamentos.
- ✅ Vista de detalle de apartamentos.
- ✅ Galería fotográfica.
- ✅ Página de contacto.
- ✅ Información institucional.
- ✅ Integración de ubicación y mapas.
- ✅ Animaciones mediante AOS.
- ✅ Carruseles y contenido visual con Swiper.
- ✅ Diseño adaptable a escritorio, tablet y móvil.

## 🔐 Autenticación

- ✅ Inicio de sesión con correo y contraseña.
- ✅ Inicio de sesión con Google.
- ✅ Firebase Authentication.
- ✅ Protección de rutas mediante Guards.
- ✅ Perfiles de usuario.
- ✅ Roles administrativos.
- ✅ Menú de usuario autenticado.
- ✅ Cierre de sesión.

## 🖥️ Panel administrativo

- ✅ Layout administrativo independiente.
- ✅ Sidebar de navegación.
- ✅ Dashboard administrativo con datos reales.
- ✅ Gestión de apartamentos.
- ✅ Gestión de clientes.
- ✅ Gestión de reservas.
- ✅ Gestión de pagos.
- ✅ Gestión de galería.
- ✅ Formularios para creación y edición.
- ✅ Selección y previsualización de imágenes.
- ✅ Ordenamiento visual de imágenes.
- ✅ Gestión visual de amenidades.
- ✅ Estados de apartamento.
- ✅ Persistencia mediante ASP.NET Core Web API.
- ✅ Gestión de imágenes desde el backend.
- ✅ Almacenamiento local de imágenes.
- ✅ Eliminación física de imágenes.

## ⚙️ Backend

- ✅ ASP.NET Core Web API sobre .NET 10.
- ✅ Clean Architecture.
- ✅ Separación en capas `Api`, `Application`, `Domain` e `Infrastructure`.
- ✅ Entity Framework Core 10.
- ✅ SQL Server.
- ✅ Base de datos `EdificiosOlivaDb`.
- ✅ Migraciones de Entity Framework Core.
- ✅ OpenAPI.
- ✅ Entidades y relaciones del dominio.
- ✅ Configuraciones Fluent API.
- ✅ CRUD REST de apartamentos.
- ✅ CRUD REST de clientes.
- ✅ CRUD REST de reservas.
- ✅ CRUD REST de pagos.
- ✅ Persistencia de galería.
- ✅ Integración Angular ↔ ASP.NET Core.
- ✅ Carga de imágenes mediante `multipart/form-data`.
- ✅ Publicación de archivos mediante ASP.NET Core Static Files.
- ✅ Almacenamiento local de imágenes en `wwwroot/uploads`.
- 🚧 Validación completa de tokens de Firebase en la API.

---

# 🛠️ Stack tecnológico

## 🎨 Frontend y diseño de interfaces

<p>
  <img src="https://skillicons.dev/icons?i=angular,ts,html,css,bootstrap" alt="Angular, TypeScript, HTML, CSS y Bootstrap" />
</p>

- **Angular 21:** framework principal de la aplicación SPA.
- **TypeScript 5.9:** lógica del cliente y tipado estático.
- **HTML5:** estructura semántica de las vistas.
- **CSS3:** estilos personalizados y diseño responsive.
- **Bootstrap 5:** componentes y utilidades de interfaz.
- **Angular Material y CDK:** componentes, overlays y utilidades de experiencia de usuario.
- **AOS:** animaciones al desplazarse.
- **Swiper:** carruseles y galerías.
- **Leaflet:** mapas y visualización geográfica.

## ⚙️ Backend, frameworks y APIs

<p>
  <img src="https://skillicons.dev/icons?i=dotnet,cs" alt=".NET y C#" />
</p>

<p>
  <img src="https://img.shields.io/badge/ASP.NET%20Core%20Web%20API-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt="ASP.NET Core Web API" />
  <img src="https://img.shields.io/badge/Entity%20Framework%20Core%2010-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt="Entity Framework Core 10" />
  <img src="https://img.shields.io/badge/OpenAPI-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white" alt="OpenAPI" />
</p>

- **.NET 10:** plataforma de ejecución del backend.
- **C#:** lenguaje principal del servidor.
- **ASP.NET Core Web API:** construcción de endpoints REST.
- **Entity Framework Core 10:** ORM, configuraciones y migraciones.
- **ASP.NET Core Static Files:** publicación de imágenes almacenadas localmente.
- **Multipart/Form-Data:** carga de archivos desde el frontend.
- **OpenAPI:** especificación y documentación de la API.
- **Clean Architecture:** separación en capas `Api`, `Application`, `Domain` e `Infrastructure`.

## 🔐 Autenticación y seguridad

<p>
  <img src="https://skillicons.dev/icons?i=firebase" alt="Firebase" />
</p>

- **Firebase Authentication:** autenticación mediante correo y contraseña.
- **Google Sign-In:** acceso mediante cuentas de Google.
- **Angular Guards:** protección de rutas del panel administrativo.
- **Roles administrativos:** control de acceso en la aplicación cliente.
- **Validación de tokens en la API:** integración planificada para completar la autorización del backend.

## 🗄️ Base de datos y almacenamiento

<p>
  <img src="https://img.shields.io/badge/SQL%20Server-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white" alt="SQL Server" />
</p>

- **Microsoft SQL Server:** persistencia principal de la información del negocio.
- **Entity Framework Core Migrations:** control de evolución del esquema.
- **Fluent API:** configuración de entidades, relaciones e índices.
- **`wwwroot/uploads`:** almacenamiento local y publicación de imágenes.

## 🧰 Herramientas e infraestructura

<p>
  <img src="https://skillicons.dev/icons?i=npm,visualstudio,vscode,git,github" alt="npm, Visual Studio, Visual Studio Code, Git y GitHub" />
</p>

<p>
  <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions" />
</p>

- **npm:** gestión de dependencias del frontend.
- **Visual Studio:** desarrollo y depuración del backend.
- **Visual Studio Code:** desarrollo del frontend y edición general.
- **Git y GitHub:** control de versiones y alojamiento del repositorio.
- **GitHub Actions:** integración continua.

---

# 🏗️ Arquitectura general

```text
                         Usuarios
                            │
                            ▼
                      Angular 21 SPA
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
 Firebase Authentication        ASP.NET Core Web API
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
             SQL Server Database                  wwwroot/uploads
```

Firebase Authentication se utiliza exclusivamente para la autenticación e inicio de sesión. Toda la información del negocio se administra mediante ASP.NET Core y SQL Server. Las imágenes se almacenan y sirven directamente desde `wwwroot/uploads`.

---

# 🧱 Clean Architecture del backend

```text
EdificiosOliva.Api
├── Controllers
├── Configurations
├── Extensions
├── Filters
├── Middlewares
└── Program.cs

EdificiosOliva.Application
├── Common
├── DTOs
├── Features
├── Interfaces
├── Mappings
├── Services
└── Validators

EdificiosOliva.Domain
├── Common
├── Entities
├── Enums
├── Exceptions
├── Interfaces
└── ValueObjects

EdificiosOliva.Infrastructure
├── Identity
├── Persistence
│   ├── Configurations
│   ├── Context
│   ├── Migrations
│   └── Seed
├── Repositories
├── Services
└── Storage
```

## Entidades implementadas

```text
Apartment
ApartmentImage
Amenity
ApartmentAmenity
Customer
Reservation
Payment
GalleryImage
ApartmentStatus
BaseEntity
```

---

# 📂 Estructura del repositorio

```text
EdificiosOliva
│
├── EdificiosOlivaFrontend
│   ├── public
│   ├── src
│   │   ├── app
│   │   │   ├── core
│   │   │   ├── layouts
│   │   │   ├── pages
│   │   │   └── shared
│   │   └── environments
│   ├── angular.json
│   └── package.json
│
├── EdificiosOlivaBackend
│   ├── EdificiosOliva.Api
│   ├── EdificiosOliva.Application
│   ├── EdificiosOliva.Domain
│   ├── EdificiosOliva.Infrastructure
│   └── EdificiosOliva.slnx
│
├── .github
│   └── workflows
│
└── README.md
```

---

# 🚀 Instalación

## 1. Clonar el repositorio

```bash
git clone https://github.com/Jairo0811/EdificiosOliva.git
cd EdificiosOliva
```

## 2. Ejecutar el frontend

```bash
cd EdificiosOlivaFrontend
npm install --legacy-peer-deps
npm start
```

La aplicación estará disponible en:

```text
http://localhost:4200
```

> `--legacy-peer-deps` es temporal mientras se completa la migración de AngularFire al SDK modular de Firebase compatible con Angular 21.

## 3. Ejecutar el backend

```bash
cd EdificiosOlivaBackend
dotnet restore
dotnet ef database update --project EdificiosOliva.Infrastructure --startup-project EdificiosOliva.Api
dotnet run --project EdificiosOliva.Api
```

La URL HTTPS se obtiene desde `EdificiosOliva.Api/Properties/launchSettings.json`.

## 4. Almacenamiento de imágenes

Las imágenes cargadas desde el panel administrativo se almacenan automáticamente en:

```text
EdificiosOlivaBackend/
└── EdificiosOliva.Api/
    └── wwwroot/
        └── uploads/
```

La carpeta `uploads` está excluida del repositorio mediante `.gitignore`, por lo que las imágenes generadas en cada entorno no forman parte del código fuente.

## 5. Requisitos

- Node.js compatible con Angular 21.
- npm 11 o superior.
- Angular CLI 21.
- .NET SDK 10.
- SQL Server o SQL Server LocalDB.
- Visual Studio 2026 o Visual Studio Code.
- Proyecto configurado en Firebase Authentication.

---

# 🗄️ Base de datos

La base de datos principal es:

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

Los modelos actuales permiten:

- Registrar y administrar apartamentos.
- Asociar múltiples imágenes.
- Seleccionar una imagen de portada.
- Ordenar imágenes.
- Registrar amenidades.
- Asociar amenidades mediante una relación muchos a muchos.
- Registrar clientes.
- Gestionar reservas y sus estados.
- Registrar pagos y balances pendientes.
- Persistir imágenes de galería.
- Manejar estados de disponibilidad, ocupación y mantenimiento.
- Aplicar eliminación lógica y auditoría básica mediante `BaseEntity`.

Las imágenes ya no dependen de Firebase Storage. La base de datos almacena la información y la ruta pública de los archivos generados por el backend.

---

# 📊 Estado del proyecto

| Módulo | Estado |
|---|:---:|
| 🏠 Landing page | ✅ |
| 📱 Responsive design | ✅ |
| 🏢 Catálogo de apartamentos | ✅ |
| 📷 Galería pública | ✅ |
| 📍 Mapas y ubicación | ✅ |
| 📞 Contacto visual | ✅ |
| 🔐 Firebase Authentication | ✅ |
| 🔑 Inicio con Google | ✅ |
| 🛡️ Guards y roles | ✅ |
| 🖥️ Panel administrativo | ✅ |
| 🏛️ Clean Architecture | ✅ |
| ⚙️ ASP.NET Core Web API | ✅ |
| 🗄️ SQL Server | ✅ |
| 🧩 Entity Framework Core | ✅ |
| 🧱 Migraciones | ✅ |
| 🏢 CRUD de apartamentos | ✅ |
| 👥 Gestión de clientes | ✅ |
| 📅 Reservas y disponibilidad | ✅ |
| 💳 Gestión de pagos | ✅ |
| 📊 Dashboard dinámico | ✅ |
| 🖼️ Galería administrativa | ✅ |
| 🔗 Integración Angular ↔ API | ✅ |
| 📁 Almacenamiento local de imágenes | ✅ |
| 🛡️ Autorización Firebase en API | 🚧 |
| 🧯 Manejo global de errores | 🚧 |
| 📈 Reportes y estadísticas | ⏳ |
| 🔔 Notificaciones | ⏳ |

Leyenda:

- ✅ Completado.
- 🚧 En desarrollo inmediato.
- ⏳ Planificado.

---

# 🗺️ Roadmap

## ✅ Etapa 1 — Experiencia visual y autenticación

- Reconstrucción del frontend con Angular moderno.
- Landing page.
- Responsive design.
- Navegación pública.
- Firebase Authentication.
- Inicio por correo y Google.
- Guards y roles.
- Panel administrativo.

## ✅ Etapa 2 — Backend y persistencia

- ASP.NET Core Web API.
- .NET 10.
- Clean Architecture.
- Entity Framework Core.
- SQL Server.
- Migraciones.
- Entidades, configuraciones y relaciones del dominio.
- OpenAPI.

## ✅ Etapa 3 — Integración Full Stack

- CRUD REST de apartamentos.
- CRUD REST de clientes.
- CRUD REST de reservas.
- CRUD REST de pagos.
- Servicios de aplicación.
- Repositorios con Entity Framework Core.
- Integración Angular ↔ API.
- Persistencia de galería.
- Dashboard con datos reales.

## ✅ Etapa 4 — Imágenes y contenido

- Migración desde Firebase Storage.
- Subida segura de imágenes mediante la API.
- Almacenamiento local mediante `wwwroot/uploads`.
- Imagen de portada.
- Ordenamiento de galería.
- Eliminación de archivos locales.
- Galería administrativa.

## 🚧 Etapa 5 — Seguridad y robustez

- Validar tokens de Firebase en ASP.NET Core.
- Proteger endpoints administrativos.
- Sincronizar perfiles, roles y permisos con SQL Server.
- Estandarizar respuestas HTTP.
- Implementar manejo global de excepciones.
- Mejorar validaciones de entrada.

## ⏳ Etapa 6 — Inteligencia administrativa

- Reportes PDF y Excel.
- Ocupación por apartamento.
- Ingresos por período.
- Próximas entradas y salidas.
- Auditoría.
- Notificaciones.
- Registro de actividad.

## ⏳ Etapa 7 — Calidad y producción

- Pruebas unitarias.
- Pruebas de integración.
- Pruebas end-to-end.
- CI/CD para Angular y .NET.
- Seguridad, CORS y rate limiting.
- Variables de entorno y secretos.
- Optimización SEO.
- Accesibilidad.
- Docker.
- Publicación del frontend, API y base de datos.

---

# 🎯 Próximo objetivo

El siguiente entregable técnico es reforzar la seguridad y la robustez transversal de la plataforma:

```text
Firebase Authentication
          │
          ▼
Angular Interceptors
          │
          ▼
ASP.NET Core Authorization
          │
          ▼
Application Services
          │
          ▼
SQL Server
```

Este bloque incluirá:

- Validación de tokens de Firebase en la API.
- Protección de endpoints administrativos.
- Manejo global de excepciones.
- Respuestas HTTP consistentes.
- Validaciones de entrada.
- Auditoría básica.
- Preparación para pruebas automatizadas.

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