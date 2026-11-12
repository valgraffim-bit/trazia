# Reportes compartidos con una hora de vigencia

## Estado y activación

La integración está preparada para el proyecto `trazia-5aca6`. Al verificar el servicio el 12 de noviembre de 2026, Google devolvió `SERVICE_DISABLED` para `firestore.googleapis.com`: todavía falta activar Cloud Firestore. No publicar esta versión antes de crear la base y aplicar las reglas.

1. Abrir https://console.firebase.google.com/project/trazia-5aca6/firestore y seleccionar **Crear base de datos**.
2. Elegir edición **Standard**, ID `(default)` y una ubicación apropiada para los usuarios. La ubicación es una decisión del propietario que no se cambia después de crear la base. No se necesita habilitar servicios de audio, TTL ni funciones de pago para esta integración.
3. Crear con reglas de **producción**. No habilitar el acceso abierto de modo de prueba.
4. En **Reglas**, publicar el contenido completo de `firestore.rules` de este repositorio. No abrir acceso anónimo. Estas reglas permiten leer hasta 500 reportes por consulta a usuarios autenticados, crear reportes propios validados y eliminar solo los propios.
5. Publicar el código mediante el workflow existente de GitHub Pages. No hace falta cambiar la configuración pública ni crear claves privadas.
6. Probar con dos cuentas distintas: publicar un reporte en una y comprobar que la otra lo ve en el mapa. El estado debe decir **Compartidos · visibles durante 1 hora**. Una conexión fallida mantiene deshabilitada la publicación y ofrece Reconectar.

## Comportamiento

`community-reports.mjs` utiliza el SDK oficial de Firebase y la misma sesión de Authentication. Cada publicación escribe el reporte y su control de frecuencia en un lote atómico. La fecha es un `serverTimestamp` y no puede ser elegida por el teléfono. Las reglas bloquean la edición posterior de esa fecha y una publicación cada menos de 30 segundos por cuenta.

Se comparten tipo, nota, coordenadas, subtipo y datos opcionales de lugar/combustible, con un identificador de autor. No se publica nombre de perfil, correo o contraseña. La interfaz informa que las notas y la ubicación se comparten.

Los usuarios conectados reciben los últimos 500 reportes de la consulta en tiempo real. La consulta inicial solicita reportes creados en la última hora. En cada pantalla, un temporizador de un segundo retira los que cumplieron una hora desde su fecha del servidor, actualiza los marcadores y el contador y vuelve a comprobar al regresar a la pestaña. La hora del dispositivo se usa para comparar con la fecha de creación del servidor. Los relojes del dispositivo deben ser correctos.

La desaparición se aplica a la visualización del mapa; no es una eliminación física programada de Firestore. No se habilita TTL: su borrado no es inmediato y puede requerir facturación. Si se necesita borrado físico de datos vencidos, configurar una política de retención separada. Hasta entonces se debe supervisar el almacenamiento y las cuotas de Firebase.

No se confirma «publicado» hasta que Firebase reconoce la escritura. Los cambios pendientes sin confirmar no aparecen como reportes públicos. Los errores no convierten el reporte a local ni muestran éxito. Mientras se publica, se evita un segundo envío; al cerrar sesión se cancelan los listeners, se limpian los reportes de la pantalla y se ignoran callbacks atrasados.

Los reportes locales anteriores se conservan privados y no se migran ni publican automáticamente. Depuración muestra los reportes comunitarios activos del autor y sus reportes locales anteriores. Eliminar un reporte comunitario propio se propaga a los demás usuarios. No se permite borrar el de otra persona.

## Verificación

- `node --test tests/*.test.cjs`: visibilidad exacta de una hora, marcadores que desaparecen en mapas abiertos, descarte de pendientes, callbacks de sesiones anteriores, validación y publicación con confirmación.
- `node tests/reports-browser.cjs`: interfaz, estado preparado para publicar, datos, ubicación y eliminación confirmada con servicio simulado.
- `node tests/auth-browser.cjs`: regresión del acceso con cuentas simuladas.
- `node tests/community-rules.cjs`: ejecutado contra el emulador oficial Firestore 1.22.0, con `firebase@11.10.0` y `@firebase/rules-unit-testing@4.0.1` instalados fuera del repositorio. Verifica dos usuarios con publicación/lectura real del emulador, hora del servidor, frecuencia, escritura atómica, validación, lectura anónima denegada, límites de consulta, inmutabilidad y eliminación exclusiva del autor. Nunca se ejecuta contra producción.

Para repetir el último, iniciar el emulador en `127.0.0.1:8085` con proyecto `demo-trazia` y estas reglas. Definir `FIREBASE_TEST_DEPENDENCIES` con la carpeta que contiene el package.json de las dependencias de prueba (predeterminada `/tmp/trazia-firebase-tests`).
