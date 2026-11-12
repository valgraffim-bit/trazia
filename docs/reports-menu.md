# Versión local anterior

Este documento describe el menú previo. Para la nueva integración compartida y su activación, ver [community-reports.md](community-reports.md). Los reportes locales anteriores se conservan privados.

# Reportes

La sección anterior «¿Qué estás viendo?» ahora se llama **Reportes**. Se abre desde los accesos existentes del menú, mapa o panel. Presenta 14 categorías en tres columnas: Tráfico, Policía, Accidente, Alerta de seguridad, Peligro, Carril bloqueado, Cierre, Error en el mapa, Animal, Mal tiempo, Precios de combustible, Asistencia en la ruta, Lugar y Depuración.

Cada categoría de reporte abre sus detalles, selección de subtipo cuando corresponde, nota opcional y ubicación. Se puede elegir el centro del mapa o la última ubicación GPS disponible; las coordenadas se muestran antes de guardar. No se guardan reportes sin una ubicación válida.

Combustible permite registrar estación, combustible, precio observado en COP y unidad (galón, litro, m³ o kWh). Lugar requiere nombre. Los marcadores muestran categoría, subtipo, nombre o precio, descripción y fecha de observación. Los precios son aportados manualmente y no son precios verificados en vivo.

Asistencia permite anotar una avería y ofrece un enlace para llamar al 123 en Colombia, mediante acción del usuario. Guardar no solicita ayuda ni despacha servicios. Los errores del mapa no cambian automáticamente las vías o direcciones del proveedor.

Depuración permite revisar y eliminar reportes de este dispositivo. Cada eliminación requiere una segunda pulsación de confirmación. La cuadrícula y los formularios indican que los reportes son locales: no se comparten con otros usuarios ni se envían a autoridades. No se ha añadido un servicio comunitario en tiempo real.

Los últimos 100 reportes se conservan en el almacenamiento local existente. Los reportes anteriores se mantienen. Si falla el almacenamiento, la lista y los marcadores no se modifican y el error queda visible dentro del formulario.

## Verificación

- `node --test tests/*.test.cjs`: etiquetas y ventanas de las 13 categorías de reporte, texto seguro, persistencia de metadatos, límite de 100, validación de ubicación y ausencia de cambios ante fallos al guardar, además de las pruebas existentes.
- `node tests/reports-browser.cjs`: las 14 opciones, formularios, precio inválido/válido, ubicación mapa/GPS, ubicación ausente, nota de asistencia, eliminación confirmada, reapertura y tamaños de pantalla. `REPORTS_PREVIEW_DIR` guarda capturas.
- Integración comprobada en la aplicación completa con una ubicación de prueba y Firebase real inicializado, sin crear cuentas: menú, guardado local, contador, persistencia y eliminación.
