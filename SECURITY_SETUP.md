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

## Proveedores externos

El frontend admite correo/contraseña, Google y Apple mediante Firebase Authentication. En Firebase Console habilita `Google` y `Apple` en **Authentication > Sign-in method** y registra todos los dominios usados por el frontend en **Authorized domains**.

Para Apple también debes crear un Services ID en Apple Developer, asociarlo al App ID correspondiente y configurar como Return URL la URL de callback que muestra Firebase para el proveedor Apple. La clave privada, Team ID, Key ID y secreto de Apple se configuran únicamente en Firebase Console; nunca deben almacenarse en este repositorio.

Las imágenes se decodifican, validan hasta 20 megapíxeles y se recodifican como WebP. El nombre suministrado por el cliente nunca se usa como nombre físico.
