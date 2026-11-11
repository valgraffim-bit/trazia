# Trazia para Android · APK de prueba

Este proyecto genera una app Android sencilla que abre Trazia en línea dentro de una vista WebView. Al publicar cambios en el sitio, la app muestra el contenido actualizado cuando hay conexión; no hay que volver a descargar el APK por cambios de la web.

## Descargar

El workflow **Build Android test APK** compila un APK de prueba y lo publica en la versión de GitHub llamada **trazia-android-test**. El archivo se llama `Trazia-Android-prueba.apk`.

El APK de prueba usa la firma de depuración automática de Android. Se puede instalar directamente en un teléfono Android, pero no está destinado a Google Play. El teléfono puede pedir que habilites temporalmente la instalación desde el navegador o desde Archivos.

## Permisos

Trazia solicita ubicación para mostrar dónde estás y usar el GPS, y micrófono si activas la búsqueda por voz. La ubicación y el audio se solicitan en el momento de uso.

El sitio y sus cambios se cargan por internet desde https://valgraffim-bit.github.io/trazia/. Esta versión necesita conexión para abrir Trazia.
