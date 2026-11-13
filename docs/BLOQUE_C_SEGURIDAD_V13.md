# Bloque C — Seguridad de Edificios Oliva v1.3

**Rama:** `feature/v1.3-security-hardening` · **PR:** #35 (Draft)  
**Fecha:** 13/11/2026 · **Estado:** código propuesto, no desplegado, sin cobros ni correos reales.

## Cambios del contrato público

- `POST /api/public/payments/status` y `/checkout` exigen
  `ReservationId` + `CapabilityToken` (hexadecimal de 64 caracteres).
- El código visible `EO-XXXXXXXX` no es secreto ni autoriza pagos.
- Al crear una reserva se guarda nonce aleatorio de 32 bytes en
  `Reservations.PublicAccessNonce` y versión entera en
  `Reservations.PublicAccessKeyVersion`. La capacidad se deriva mediante
  **HMAC-SHA256** de propósito + ID + versión + nonce, usando una clave externa.
  La clave y el token nunca se guardan en SQL.
- Idempotencia: repetir el payload con la misma clave devuelve el mismo token;
  si el payload cambia, responde 409.
- Validez del estado: hasta 30 días inclusive tras `CheckOutDate`,
  comprobado en zona `America/Santo_Domingo`. No depende de `CreatedAtUtc`.
- Checkout nuevo: no se inicia tras la salida ni para reservas canceladas/completadas.
- Angular conserva la capacidad solo temporalmente en `sessionStorage`
  para el retorno del proveedor, no en URL; se elimina del almacenamiento
  tras confirmación del backend. Revisar CSP/XSS antes de usar datos reales.

**Variables de configuración:** `PublicPayments__ActiveKeyVersion=1` y
`PublicPayments__CapabilityKeys__1` con Base64 de al menos 32 bytes aleatorios
inyectados desde un gestor de secretos. Sin clave válida, falla el alta de reserva
pública (fail-closed), no se emplea una clave por defecto.

**Reservas previas a la migración:** nonce y versión quedan nulos. No
existe fallback a GUID + código + email. Debe implementarse recuperación por
correo verificado de un solo uso, revocable y limitada en intentos, antes de
activar servicios reales. La recuperación entre dispositivos sigue pendiente.

## Red y límites

- Reservas: 30 peticiones/min por IP efectiva.
- Estado/checkout públicos: 20 peticiones/min por IP efectiva.
- Webhooks: 120 peticiones/min por IP efectiva.
- Seguridad global: 2000 peticiones/min por instancia.

En staging el contenedor Nginx tiene dirección privada fija
`172.29.77.10` y el backend la incluye explícitamente en
`ReverseProxy:KnownProxies`, con `ForwardLimit=1`. El proxy HTTPS
externo, no proporcionado en Compose, DEBE sobrescribir
`X-Real-IP` y `X-Forwarded-Proto` que provengan de clientes;
Nginx solo debe ser alcanzable por loopback. La regla por IP no sustituye
WAF, controles distribuidos, protección contra bots ni validación de firmas.

## Criterios para liberar

- [ ] Seis workflows y pruebas de migración en SQL Server efímero PASS en HEAD.
- [ ] Token ajeno, alterado, ausente, revocado, expirado y replay cubiertos;
  verificar no exposición en URLs, respuestas cacheadas, logs o analytics.
- [ ] Recuperación segura para reservas legadas y uso multidispositivo.
- [ ] E2E real con API, SQL Server y Firebase de pruebas; permisos 401/403.
- [ ] Pruebas de cabeceras falsificadas, NAT y 429 detrás de proxy TLS confiable.
- [ ] Backup y restauración verificados; rollback/migraciones en staging aislado.
- [ ] AZUL sandbox y SMTP de pruebas únicamente después de autorización.
- [ ] Revisión manual WCAG, Lighthouse, carga, seguridad y observabilidad.

**NO-GO a producción** hasta completar todos los criterios y obtener
la aprobación del propietario. No se ha creado ni desplegado infraestructura.
