# Cuentas de Trazia

La introducción con logo y barra aparece primero. Después se muestra el registro o inicio de sesión y, tras autenticar al usuario, la confirmación de nombre y correo con **Aceptar y entrar**. El mapa y la solicitud de ubicación comienzan después de aceptar. Al volver a abrir con una sesión guardada, se muestran los datos para confirmar la entrada.

El sitio GitHub Pages no tiene servidor de cuentas. Esta integración utiliza Firebase Authentication para correo/contraseña, Google, recuperación de contraseña y persistencia de sesión. No guarda contraseñas en localStorage ni en el repositorio. El nombre se guarda en el perfil de Firebase; los lugares guardados y reportes existentes siguen siendo locales y no se sincronizan entre cuentas. El acceso controla la interfaz: los archivos de GitHub Pages siguen siendo públicos. Cualquier futura base de datos privada requiere reglas de autorización del servidor.

## Activación

1. En la consola de Firebase, crear o seleccionar el proyecto de Trazia y registrar una aplicación web.
2. En **Authentication → Sign-in method**, habilitar **Correo electrónico/contraseña** y **Google**. Google requiere seleccionar un correo de soporte y configurar el nombre público Trazia.
3. En **Authentication → Settings → Authorized domains**, añadir `valgraffim-bit.github.io`. Para desarrollo, añadir `localhost` si hace falta. Conservar el dominio de autenticación de Firebase.
4. Copiar el objeto público `firebaseConfig` de la aplicación web. No usar una cuenta de servicio, clave privada ni contraseña de Google.
5. En GitHub → repositorio `trazia` → **Settings → Secrets and variables → Actions → Variables**, crear `FIREBASE_WEB_CONFIG` con el JSON del objeto, por ejemplo:

```json
{"apiKey":"PUBLIC_WEB_API_KEY","authDomain":"PROJECT.firebaseapp.com","projectId":"PROJECT","appId":"PUBLIC_WEB_APP_ID"}
```

6. Ejecutar el despliegue de GitHub Pages una vez autorizada la publicación del cambio. El workflow conserva la configuración de TomTom y añade Firebase a `config.js`.
7. Comprobar una cuenta de correo, salir y volver a entrar, recuperar contraseña y acceder con Google desde un teléfono. Los contenedores WebView de Android/iOS pueden requerir abrir Google en el navegador del sistema; el acceso web está pensado para un navegador normal.

No publicar esta nueva pantalla antes de conectar Firebase: sin configuración bloquea el acceso y avisa que las cuentas todavía no están disponibles. La configuración vacía no simula usuarios ni permite entrar sin autenticar.

## Datos y controles

- Datos básicos: nombre completo y correo autenticado. La contraseña solo se introduce para acceso por correo.
- Con Google no se solicita una nueva contraseña.
- **Aceptar y entrar** confirma el perfil; no representa aceptación de términos legales inexistentes.
- **Cerrar sesión** está en Ajustes y vuelve al acceso.
