# Edificios Oliva — Deployment v1

Este documento describe el despliegue reproducible de la línea v1. El repositorio no contiene credenciales reales de SQL Server, Firebase, AZUL o SMTP.

## Arquitectura recomendada

```text
Internet / HTTPS
      |
Reverse proxy / load balancer
      |
      +-- /          -> Angular / Nginx
      +-- /api/*     -> ASP.NET Core API
      +-- /health    -> liveness
      +-- /health/ready -> SQL readiness
                         |
                         +-- SQL Server
                         +-- volumen persistente /app/wwwroot/uploads
```

El frontend de producción utiliza `/api` como base URL, por lo que el proxy debe servir frontend y API bajo el mismo dominio o mantener una regla equivalente.

Cuando TLS termina en un reverse proxy y la conexión interna proxy → API es HTTP, configura `Security__UseHttpsRedirection=false` **solo en la API interna**. El proxy/ingress debe seguir forzando HTTPS público. Si Kestrel recibe HTTPS directamente, conserva el valor `true`.

## Contenedores

Desde la raíz:

```bash
docker build -f EdificiosOlivaBackend/Dockerfile -t edificios-oliva-api .
docker build -f EdificiosOlivaFrontend/Dockerfile -t edificios-oliva-web .
```

El contenedor API escucha en el puerto 8080. El contenedor web escucha en 80.

El `nginx.conf` incluido supone que el backend se resuelve internamente con hostname `api`. En otra plataforma, adapta únicamente el upstream/proxy; no recompiles código de negocio para cambiar hosts.

## Persistencia

Deben persistirse fuera del contenedor:

- SQL Server.
- `/app/wwwroot/uploads` mientras v1 mantenga almacenamiento local de imágenes.

No despliegues la API con un filesystem efímero sin volumen para uploads.

## Base de datos

Las migraciones no se ejecutan automáticamente al arrancar producción. Aplícalas como paso controlado de release:

```bash
dotnet ef database update \
  --project EdificiosOlivaBackend/EdificiosOliva.Infrastructure \
  --startup-project EdificiosOlivaBackend/EdificiosOliva.Api
```

Antes de migrar una base real, genera backup y valida la cadena objetivo.

## Variables y secretos

Usa `.env.example` únicamente como inventario. Nunca copies secretos reales al repositorio.

Secretos críticos:

- `ConnectionStrings__DefaultConnection`
- `Payments__Azul__AuthKey`
- `Notifications__Email__Password`
- cualquier credencial de infraestructura

AZUL y SMTP permanecen deshabilitados hasta tener credenciales reales.

## Health checks

- `GET /health`: proceso API vivo.
- `GET /health/ready`: API puede conectarse a SQL Server.

El balanceador debe usar `/health/ready` para readiness y retirar la instancia si responde 503.

## Checklist de activación AZUL

1. Afiliación comercial aprobada.
2. Merchant ID y AuthKey entregados por AZUL.
3. Dominio/URLs de retorno autorizados.
4. Políticas públicas revisadas por la administración.
5. Moneda e ITBIS confirmados para la operación real.
6. Pruebas de aprobación, rechazo y cancelación en ambiente de pruebas.
7. Verificación de un pago real de bajo monto según el proceso de certificación acordado con AZUL.
8. Configurar secretos de producción.
9. Cambiar `Payments__Azul__Enabled=true`.
10. Vigilar `/admin/intentos-pago` durante el lanzamiento.

## Checklist SMTP

1. Proveedor SMTP real.
2. Remitente/dominio autorizado.
3. SPF/DKIM/DMARC configurados cuando el proveedor lo requiera.
4. Prueba de reserva creada.
5. Prueba de pago confirmado.
6. Solo entonces activar `Notifications__Email__Enabled=true`.

## Seguridad operativa

- HTTPS obligatorio en el borde.
- SQL Server no debe publicarse a Internet.
- Firebase Admin custom claim `role=admin` solo para personal autorizado.
- Backups de SQL y uploads.
- Logs de aplicación centralizados.
- Rotación de AuthKey/SMTP/DB secrets según política del proveedor.
- Revisar intents marcados como “Requieren revisión”; no confirmar pagos por screenshots.
- Mantener npm/NuGet y las imágenes base de contenedores parchadas.

## Criterio de release

Un release v1 puede desplegarse cuando:

- CI Angular está verde.
- CI .NET y tests de pagos están verdes.
- migraciones se aplicaron a la base correcta.
- `/health/ready` responde 200.
- políticas son visibles.
- dominio HTTPS está activo.
- credenciales AZUL/SMTP fueron configuradas fuera de Git.
- prueba end-to-end reserva → pago → confirmación fue validada con el proveedor.
