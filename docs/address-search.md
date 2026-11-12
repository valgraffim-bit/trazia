# Búsqueda de nomenclatura y direcciones cercanas

El buscador acepta separadores como `Cra 83b 3 -# 45-53, Cali` y conserva la vía **83B3**, distinta de 83B, así como la placa completa 45-53. Se normaliza el guion adicional antes de #, sin cambiar el número de destino.

Si no se encuentra un punto exacto, la fuente oficial IDESC puede ofrecer direcciones registradas de la misma vía y cruce con números próximos. Las coordenadas son las del registro de cada dirección mostrada. Cada sugerencia indica **Dirección cercana; no es el número solicitado** y conserva el estado de certificación del proveedor. No se inventan coordenadas para la dirección buscada ni se cambia su número por el de otra puerta.

Los resultados existen solo en el buscador; no se agrega un lugar, favorito, reporte o marcador permanente al mapa. Después de seleccionar una sugerencia, la ruta usa su dirección real y coordenadas y recuerda que es una dirección cercana si corresponde. Las búsquedas exactas existentes siguen teniendo prioridad.

## Verificación de la solicitud

La dirección solicitada fue confirmada mediante el enlace de Waze que compartió el usuario: Carrera 83B3 #45-53, Cali. El 12 de noviembre de 2026 no se encontró el número exacto en el snapshot público de Trazia ni en el WFS oficial; Esri devolvió calles, no la puerta exacta. En esa primera fase no se agregó un punto falso. La consulta de direcciones cercanas encontró, entre otras, `KR 83 B 3 #45-47`, `#45-41` y `#45-35` en Caney, todas mostrando el estado de certificación de la fuente.

## Referencia del enlace compartido

El usuario aportó https://www.waze.com/es-MX/live-map/directions/co/valle-del-cauca/cali/cra.-83b-3-45-53?to=place.ChIJa_eLJRahMI4RX7x1pcEZXCM . La página pública del lugar de Google Maps con ese mismo identificador devolvió el nombre `Cra. 83b 3 # 45-53`, la dirección de Cali y la posición `3.384056, -76.517773` dentro del registro del lugar, no solo como centro de visualización. Los detalles públicos se consultaron el 12 de noviembre de 2026. El endpoint público de detalles de Waze devolvió 403 y no se intentó sortear ese bloqueo; se corroboró el mismo identificador mediante la página pública del lugar de Google Maps.

`search-locations.mjs` mantiene esa referencia de búsqueda y devuelve un Feature solo al consultar la nomenclatura compatible. No agrega capas, marcadores, favoritos ni reportes. La interfaz la distingue como ubicación de un enlace compartido, sin presentarla como certificada por IDESC ni como ubicación de un vehículo en tiempo real. Debe confirmarse el acceso al llegar.

Se conserva 83B3 como vía distinta de 83B, y 45-53 como placa distinta de 45-35 o 45-530. Una ciudad explícita diferente de Cali no utiliza este registro. El enlace Waze aportado también se reconoce directamente; otros place IDs desconocidos siguen requiriendo coordenadas verificables.

Las direcciones cercanas continúan siendo destinos separados y nunca se tratan como si fueran 45-53. La prueba de selección verifica el destino enviado al cálculo de ruta; no se ejecutó una consulta real de navegación con estas coordenadas desde el entorno de trabajo.

Pruebas: `node --test tests/*.test.cjs` y `node tests/nearby-address-browser.cjs`. Comprueban sufijos, separadores, fuente y coordenadas reales, exclusión de otras vías/cruces, prioridades, etiqueta de cercanía, ausencia de marcador permanente y selección para ruta en móvil/escritorio. También se comprobó el adaptador con una respuesta real de la fuente oficial.

`node tests/search-location-browser.cjs` comprueba la etiqueta, la atribución al enlace, la ausencia de marcador permanente y la selección del destino en móvil y escritorio. `node --test tests/search-locations.test.cjs` comprueba variantes y la importación del mismo place ID.
