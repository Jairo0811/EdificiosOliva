# ADR-PAY-001 — Control de acceso a pagos públicos (Bloque C)

**Estado:** IMPLEMENTADO EN PR #35 (Draft) — sin aprobación ni despliegue
**Fecha:** 2026-11-13 · **PR:** #35 (base PR #30) · **Impacto:** API pública, Angular, esquema SQL y seguridad

## Problema previo a la implementación del PR #35

1. `POST /api/public/payments/status` y `/checkout` autorizan con
   `ReservationId + ConfirmationCode + Email`.
2. `ConfirmationCode = EO-` + los primeros ocho caracteres hexadecimales
   de `ReservationId`: **no es un secreto independiente**.
3. `PaymentIntentService.GetPublicStatusAsync` rechaza reservas creadas
   más de 30 días atrás, aunque las fechas de estancia sean futuras.
4. `AddFixedWindowLimiter` está declarado a nivel de política; debe
   determinarse cómo particionarlo en producción cuando el tráfico llega
   a través de Nginx/otro proxy.

Estos hallazgos no demuestran una explotación, pero son **P1 de diseño**.

## Decisión propuesta para el contrato de v1.3

**NO declarar confirmado un pago por query string, email, código ni captura.**
El estado final sigue viniendo del backend tras validar eventos del adquirente.

**Introducir una credencial opaca por reserva (capability token).**

- Al crear una reserva, generar un nonce CSPRNG de 128+ bits y persistirlo
  en la tabla de reservas, con versión de llave y fecha de emisión.
- Usar una llave maestra aleatoria de al menos 256 bits suministrada
  por secret manager (nunca compilada en el frontend ni Git).
- Derivar una credencial opaca de 256 bits mediante HMAC-SHA256 de
  `purpose + reservationId + nonce + keyVersion`.
  Esto permite devolverla en un reintento idempotente sin guardar
  el token reversible o en texto plano en SQL.
- Verificar mediante comparación de tiempo constante y contexto
  de la reserva, con respuesta uniforme; exigir token para consultar
  estado e iniciar checkout.
- Guardar credencial solo en sesión mientras sea necesaria, sin
  mandarla en URL, logs, trazas o analytics. `POST` con `no-store`.
- Al revocar acceso, rotar nonce; definir rotación de llave y
  comportamiento cuando haya dos versiones activas.
- Reservas anteriores sin nonce: **no** aceptar caída automática al
  contrato débil. Implementar recuperación con email de un solo uso
  y rate limiting antes de habilitar el nuevo endpoint.
- Separar tokens de consulta de checkout si los permisos se diversifican
  en el futuro.

### Política temporal propuesta

Permitir consultas con token válido hasta **30 días después de la salida
programada**, no solamente 30 días tras la creación, con fecha de corte
derivada del huso horario `America/Santo_Domingo`. Definir excepciones
de conciliación, reembolso y disputas (consulta segura o trámite
administrativo) sin exponer detalles a un token ya vencido.

**Consideraciones:** token de larga vigencia tras reserva anticipada,
persistencia en sessionStorage y posible acceso desde dispositivo distinto
necesitan revisión de UX y privacidad. Un código de confirmación mostrado
públicamente no debe autorizar nada.

## Secuencia de implementación propuesta (PR separado o cambios acotados)

1. Migración EF Core para nonce, versión y vigencia; actualizar snapshot;
   SQL efímero y rollback de staging.
2. Servicio de capability tokens: CSPRNG, HMAC, validación constante,
   rotación, fail-closed si falta clave, interfaz y pruebas de seguridad.
3. Ajustar DTOs y respuestas de reserva; mantener idempotencia en replay.
4. Modificar `PaymentIntentService` y controladores para exigir
   capability token y no hacer fallback a GUID+email+código.
5. Adaptar Angular y Playwright, evitando URL/query/referrer y
   exposición en almacenamiento persistente.
6. Probar token ausente, de otra reserva, alterado, vencido, revocado,
   con diferente version de llave, replay y navegador manipulado.
7. E2E con SQL real de staging y revisión independiente de logging y
   errores; aprobar el cambio de contrato antes del merge.

## Rate limiting y proxy

Antes de instalar un limitador por IP, identificar la cadena de confianza:
un `X-Forwarded-For` arbitrario **no** es identidad confiable. Configurar
solo proxies/redes de confianza en ASP.NET Core, verificar cabeceras de
proxy con pruebas reales y particionar por IP efectiva confirmada,
manteniendo además un límite global de seguridad y monitoreo. Para
tokens de acceso, considerar controles por reserva más una cuota
agregada, sin bloqueo injustificado de clientes detrás del mismo NAT.

## Regla de salida

El PR #35 implementa el contrato opaco y la migración, pero faltan
recuperación segura de reservas legadas, pruebas E2E con proveedores, validación
real de proxy TLS y revisión manual. **NO-GO a producción**. AZUL/SMTP apagados.
