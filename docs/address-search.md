# Búsqueda de nomenclatura y direcciones cercanas

El buscador acepta separadores como `Cra 83b 3 -# 45-53, Cali` y conserva la vía **83B3**, distinta de 83B, así como la placa completa 45-53. Se normaliza el guion adicional antes de #, sin cambiar el número de destino.

Si no se encuentra un punto exacto, la fuente oficial IDESC puede ofrecer direcciones registradas de la misma vía y cruce con números próximos. Las coordenadas son las del registro de cada dirección mostrada. Cada sugerencia indica **Dirección cercana; no es el número solicitado** y conserva el estado de certificación del proveedor. No se inventan coordenadas para la dirección buscada ni se cambia su número por el de otra puerta.

Los resultados existen solo en el buscador; no se agrega un lugar, favorito, reporte o marcador permanente al mapa. Después de seleccionar una sugerencia, la ruta usa su dirección real y coordenadas y recuerda que es una dirección cercana si corresponde. Las búsquedas exactas existentes siguen teniendo prioridad.

## Verificación de la solicitud

La dirección solicitada se interpretó como Carrera 83B3 #45-53, Cali, pendiente de confirmación del usuario. El 12 de noviembre de 2026 no se encontró el número exacto en el snapshot público de Trazia ni en el WFS oficial; Esri devolvió calles, no la puerta exacta. No se agregó un punto falso. La consulta de direcciones cercanas encontró, entre otras, `KR 83 B 3 #45-47`, `#45-41` y `#45-35` en Caney, todas mostrando el estado de certificación de la fuente.

Para agregar un destino exacto que no aparezca en los proveedores hace falta que el usuario confirme la nomenclatura y comparta el punto o coordenadas del vehículo. Nunca se debe tratar una dirección cercana como si fuera 45-53.

Pruebas: `node --test tests/*.test.cjs` y `node tests/nearby-address-browser.cjs`. Comprueban sufijos, separadores, fuente y coordenadas reales, exclusión de otras vías/cruces, prioridades, etiqueta de cercanía, ausencia de marcador permanente y selección para ruta en móvil/escritorio. También se comprobó el adaptador con una respuesta real de la fuente oficial.
