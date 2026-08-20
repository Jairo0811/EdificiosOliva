# Configuración de autenticación y roles

La API valida los ID tokens emitidos por el proyecto Firebase `edificios-oliva`. El frontend adjunta el token únicamente a llamadas dirigidas a `environment.apiUrl`.

## Asignar el rol administrativo

El documento `users/{uid}` de Firestore sirve para mostrar el perfil, pero **no concede permisos en la API**. El rol debe configurarse como custom claim desde un entorno administrativo confiable con Firebase Admin SDK:

```js
await getAuth().setCustomUserClaims(uid, { role: 'admin' });
```

Después de asignarlo, el usuario debe cerrar sesión e iniciar nuevamente para obtener un token actualizado.

## Política de acceso

- Público: lectura de apartamentos y galería.
- Administrador: escritura de apartamentos/galería, reservas, clientes, pagos, dashboard y archivos.

La creación directa de reservas queda temporalmente limitada a administradores porque el modelo actual no relaciona cada cliente con un Firebase UID. Abrirla a usuarios sin añadir esa propiedad permitiría reservar en nombre de cualquier cliente cambiando `CustomerId`.

Las imágenes se decodifican, validan hasta 20 megapíxeles y se recodifican como WebP. El nombre suministrado por el cliente nunca se usa como nombre físico.
