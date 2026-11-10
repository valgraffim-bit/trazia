# Trazia

Primera versión de Trazia como aplicación web instalable (PWA), con una interfaz móvil propia inspirada en apps de navegación. Incluye mapa claro/oscuro, vista inclinada 3D, búsqueda de destinos, elección de vehículo, ruta dibujada por Trazia y una estimación de llegada, distancia y duración.

## Abrir Trazia en este computador

No abras `index.html` con doble clic. La app usa módulos web, ubicación del dispositivo y servicios de mapas; necesita abrirse desde un servidor local.

1. Haz doble clic en `abrir-trazia.cmd`.
2. Cuando se abra el navegador, permite el acceso a ubicación.
3. Escribe un destino, elige una sugerencia y pulsa **Buscar ruta**.

También puedes iniciar un servidor desde esta carpeta con:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Después visita `http://localhost:8000`. Para usar GPS desde un teléfono, publica la app en una dirección HTTPS y ábrela allí; el permiso de ubicación del navegador debe estar activado.

## Publicación en GitHub Pages

El diseño usa panel inferior en teléfonos y tabletas verticales, y vista dividida en tabletas horizontales y computadores. GitHub Pages publica la aplicación por HTTPS para que el navegador del móvil pueda solicitar permiso de ubicación.

La página publicada queda accesible desde Internet. Trazia usa la ubicación localmente para centrar el mapa y buscar rutas. Los registros del servidor local no se publican.

## Mapas, direcciones y rutas

Trazia no usa Google Maps como mapa base ni copia el mapa de Waze. Dibuja su propia interfaz y la ruta sobre datos abiertos de OpenStreetMap. Los mapas vectoriales llegan de OpenFreeMap y se muestran con MapLibre; la búsqueda principal usa Photon y las rutas se calculan con Valhalla. Si las sugerencias abiertas no sirven, el botón **Probar búsqueda de Google** abre Google Places UI Kit para buscar el destino; el mapa y la ruta siguen siendo de Trazia/Valhalla.

El respaldo de Google requiere un proyecto de Google Cloud con facturación y Places UI Kit habilitados. Para publicarlo en GitHub Pages, guarda la clave como secreto de Actions llamado `GOOGLE_PLACES_API_KEY` en **Settings → Secrets and variables → Actions**. El flujo de publicación la inyecta al sitio publicado y no la agrega al código del repositorio. Como las claves de navegador se pueden ver desde el sitio, restríngela por sitio web a `https://valgraffim-bit.github.io/*` y por API a las APIs de Google Maps necesarias para Places UI Kit. Sin ese secreto, el botón explica que Google aún no está conectado.

El selector permite carro, moto, camión y bicicleta. La ruta de moto está marcada como beta. La ruta de camión usa límites estándar; faltan controles para ingresar las dimensiones y el peso exactos del camión. La cobertura de calles y direcciones puede variar por país.

Los tiempos y la llegada son estimaciones a partir de la ruta calculada. Esta versión no tiene una fuente de tráfico en vivo. El botón **Reportar** guarda avisos solamente en el dispositivo actual; todavía no los comparte con otras personas. Los resultados de gasolineras, clínicas, farmacias y negocios dependen de la información disponible en OpenStreetMap.

Trazia puede abrir Spotify, Apple Music, YouTube Music o Deezer en el dispositivo. La conexión para controlar la reproducción desde Trazia requiere una autorización e integración adicional con el proveedor.

## Antes de publicar

OpenFreeMap, Photon, Overpass y el servidor público de Valhalla sirven para esta primera versión, pero no ofrecen a Trazia garantías de disponibilidad para un producto mundial. Antes de lanzar la app al público habrá que elegir o alojar servicios de mapas, búsqueda y rutas adecuados al uso esperado, preparar un servidor para sincronizar reportes y probar la cobertura de cada región. Los créditos del mapa quedan accesibles desde el botón de información sobre el mapa.

## Archivos principales

- `index.html`: pantallas, paneles y diálogos.
- `styles.css`: diseño adaptable, colores de mapa, modo nocturno y controles móviles.
- `app.js`: mapa, búsquedas, rutas, GPS, voz, vehículos, música y reportes locales.
- `manifest.webmanifest` y `sw.js`: instalación y caché básica de la app.
- `server.mjs` y `abrir-trazia.cmd`: servidor local para abrir Trazia.
- `assets/trazia-app-icon.png`: ícono de la app.

Trazia es una PWA en esta entrega. Crear un archivo IPA para iPhone requiere empaquetar la app y firmarla para iOS.

## Referencias de los servicios

- [OpenFreeMap](https://openfreemap.org/) y su [guía rápida](https://openfreemap.org/quick_start/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md)
- [Google Places UI Kit](https://developers.google.com/maps/documentation/javascript/places-ui-kit/overview)
- [Valhalla Route API](https://valhalla.github.io/valhalla/api/route/api-reference/)
- [Créditos y licencia de OpenStreetMap](https://www.openstreetmap.org/copyright)

