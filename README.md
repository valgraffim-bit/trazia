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

Trazia no usa Google Maps ni copia el mapa de Waze. Dibuja su propia interfaz y la ruta sobre datos abiertos de OpenStreetMap. Los mapas vectoriales llegan de OpenFreeMap y se muestran con MapLibre; la búsqueda de direcciones usa Photon y las rutas se calculan con Valhalla. Estos servicios públicos no necesitan una clave de Google, pero dependen de internet y de la disponibilidad de cada servicio.

El selector permite carro, moto, camión y bicicleta. La ruta de moto está marcada como beta. La ruta de camión usa límites estándar; faltan controles para ingresar las dimensiones y el peso exactos del camión. La cobertura de calles y direcciones puede variar por país.

Los tiempos y la llegada son estimaciones a partir de la ruta calculada. La capa opcional de tráfico muestra datos recientes de TomTom sobre el mapa; estos datos no se usan todavía para ajustar el tiempo de viaje ni elegir la ruta. El botón **Reportar** guarda avisos solamente en el dispositivo actual; todavía no los comparte con otras personas. Los resultados de gasolineras, clínicas, farmacias y negocios dependen de la información disponible en OpenStreetMap.

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
- [Valhalla Route API](https://valhalla.github.io/valhalla/api/route/api-reference/)
- [Créditos y licencia de OpenStreetMap](https://www.openstreetmap.org/copyright)

## Búsqueda de direcciones completas

Las direcciones con `#` consultan primero ArcGIS World Geocoding para buscar la nomenclatura completa. Se aceptan únicamente coincidencias de dirección con puntuación mínima de 95, vía y números coincidentes, y ciudad coincidente cuando se especifica. Un resultado de calle sin número nunca se presenta como dirección completa. El punto de llegada puede ser interpolado sobre la vía; no garantiza la ubicación de la puerta.

Las consultas ArcGIS usan `forStorage=false`: sus resultados se muestran temporalmente en el mapa y la ruta; el historial conserva únicamente el texto original escrito por la persona. No se guarda la respuesta del proveedor. Si ArcGIS falla o no encuentra la nomenclatura, continúa la búsqueda abierta de Photon y la sugerencia de vía aproximada.

## Buscar y consultar el destino

El campo «¿A dónde quieres ir?», la búsqueda de ruta, el tiempo, la distancia, las opciones y el inicio de navegación están reunidos en una sola sección. El historial permanece cerrado por defecto bajo «Recientes»; una flecha permite desplegarlo y volver a ocultarlo. Los registros existentes del dispositivo no se borran. No hay botón ni diálogo de importación de Waze. Los enlaces de coordenadas compatibles pueden pegarse directamente en el campo de destino.

## Activar TomTom para todos los usuarios

La búsqueda puede consultar TomTom Orbis Geocoding v2 desde el mismo campo de destino. No se pide a cada usuario registrarse ni configurar claves. Sin clave configurada, continúan los proveedores existentes.

1. En MyTomTom, abre **API & SDK Keys** y crea o selecciona una clave habilitada para **Geocoding API (Orbis)**. Mantén el plan gratuito y no actives facturación por exceso.
2. Limita la clave de navegador al dominio `valgraffim-bit.github.io` en la lista de dominios permitidos de TomTom y habilita únicamente los productos necesarios.
3. En el repositorio, abre **Settings → Secrets and variables → Actions → Variables → New repository variable**. Usa el nombre `TOMTOM_BROWSER_KEY` y pega allí la clave. No la publiques en conversaciones, issues o commits.
4. Integra el cambio en `main` o ejecuta el workflow **Deploy Trazia to GitHub Pages**. Durante el despliegue se genera `config.js`; el repositorio mantiene una configuración vacía. La clave es de navegador y será visible en el sitio publicado, por lo que las restricciones de dominio y producto son obligatorias para esta configuración.

El módulo conserva todos los números y sufijos de la vía, verifica país y coordenadas, y rechaza coincidencias de calle sin número cuando se escribió una dirección completa. La caché vive solo en memoria durante cinco minutos, con hasta 50 consultas, y se esperan 650 ms después de escribir para reducir solicitudes. Los resultados del proveedor no se guardan en el historial: se conserva el texto original del usuario. La cobertura real debe verificarse con una clave válida y la dirección de prueba antes de considerar resuelto el caso. No se ha consultado TomTom con credenciales reales durante la implementación.

Pruebas TomTom: `node tests/tomtom-geocoding.test.cjs` y `node tests/tomtom-browser.cjs`. La prueba de navegador usa respuestas simuladas; no certifica cobertura real ni permisos de la clave.

### Publicar después de configurar la clave

Guardar o cambiar `TOMTOM_BROWSER_KEY` no publica el sitio automáticamente. Inicia una ejecución nueva de **Deploy Trazia to GitHub Pages** desde Actions → Run workflow. Si al reejecutar un job anterior aparece `Multiple artifacts named "github-pages"`, inicia un workflow nuevo en lugar de repetir ese job: la nueva ejecución tendrá su propio artefacto. Para verificar la activación, comprueba únicamente si la configuración publicada tiene una clave no vacía, sin copiar ni registrar su valor.

## Trancones en rojo

La capa vectorial de TomTom Orbis Traffic Flow muestra en rojo únicamente segmentos con `relative_speed` entre 0 y 0.5 (velocidad observada inferior a la mitad de la velocidad de flujo libre). No se colorean como congestión las vías sin dato ni los cierres. Las líneas rojas se colocan encima de la ruta morada, debajo de los nombres y marcadores. No se cambia la geometría de la ruta ni se inventan tramos.

La clave de navegador existente se envía solo en encabezados al endpoint oficial de tráfico. La capa se activa por defecto cuando hay una clave; puede ocultarse desde Ajustes → Mostrar trancones en rojo. Se conserva esa preferencia en el dispositivo. El mapa solicita actualizar sus tiles cada 60 segundos mientras esté visible, respetando el caché del proveedor. Errores de permisos/cuota (403/429) detienen nuevos intentos hasta volver a activar el control. La leyenda informa si los datos están disponibles; la ausencia de rojo no significa que toda la vía esté libre. El cálculo de rutas y los tiempos siguen siendo de Valhalla y no incorporan este tráfico.

Verificación: una consulta real desde el dominio publicado de Trazia obtuvo tiles de Cali con HTTP 200; la prueba con MapLibre real dibujó segmentos rojos y comprobó sus velocidades relativas. Se probaron por separado el control móvil y el orden de capas con mapa simulado. Estos datos cambian con el tiempo y dependen de la cobertura de TomTom.

## Paleta del mapa y panel desplegable

La v33 aplica una paleta propia inspirada en la referencia visual del usuario: fondo azul grisáceo, zonas verdes y vías principales amarillas, con variante clara y oscura. No reutiliza mapas, logos ni datos privados de Waze. Los colores se aplican solo al mapa base: la ruta morada, la congestión roja de TomTom y los iconos de cámaras conservan su significado.

El mapa espera a que el estilo esté listo para aplicar la paleta y la red vial, también al cambiar de tema. «Recientes» usa un desplegable nativo cerrado por defecto; el panel móvil inferior tiene una flecha que cambia al expandir o contraer. No se reintroduce el botón de importar Waze ni una tarjeta separada de destino.
