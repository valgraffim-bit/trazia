# Direcciones oficiales de Cali en Trazia

## Fuente y licencia

- Entidad: Alcaldía de Santiago de Cali, Departamento Administrativo de Planeación / Equipo de Nomenclatura. Publicación mediante IDESC.
- Servicio oficial WFS: https://ws-idesc.cali.gov.co/geoserver/wfs
- Capa: `dapm:pdt_nmc_nomenclatura_domiciliaria`.
- Publicación del servicio: https://www.cali.gov.co/planeacion/publicaciones/46986/servicios_wfs_idesc/
- Metadatos específicos: https://mg-idesc.cali.gov.co/geonetwork/geonetwork/api/records/26efce58-37c7-44e4-9386-b925c92d17d1
- Licencia específica: **CC BY-SA 4.0**, https://creativecommons.org/licenses/by-sa/4.0/. Los metadatos permiten uso comercial, atribución y derivados bajo las mismas condiciones. Se aplica esta licencia específica a los datos obtenidos de la capa; no se presume que las condiciones generales del sitio autoricen otras capas o contenidos.
- Atribución visible en sugerencias y créditos: «Direcciones: Planeación / IDESC Cali · CC BY-SA 4.0».
- Cualquier extracto o base derivada que se distribuya debe conservar fuente, licencia y las condiciones de compartir igual. Este cambio no distribuye un extracto masivo ni copia datos de otros geocodificadores.

## Alcance real

Validación del 11 de noviembre de 2026: GetFeature resultType=hits informó **692.389 registros**, no necesariamente direcciones únicas, certificadas o todas las direcciones existentes. Los registros de muestra indican fecha de corte `2026-09-03`; no se afirma actualidad en tiempo real. La disponibilidad de una capa urbana no implica cobertura nacional ni garantiza todos los predios de Cali.

Se consulta la base oficial en línea; **no se ha creado ni descargado una base nacional propia**. No necesita otra clave ni un servidor nuevo para Trazia; el servidor WFS permite CORS. Su disponibilidad y políticas de uso dependen de IDESC. No hay promesa de servicio ilimitado.

## Funcionamiento

`cali-addresses.mjs` consulta una dirección completa con tipo de vía, número, #, cruce y placa. Se utiliza cuando el usuario indica Cali expresamente, o no indica otra ciudad y su ubicación está dentro de un rectángulo conservador de Cali. Otros municipios y búsquedas por nombres de negocios siguen usando los proveedores existentes.

El WFS devuelve puntos en EPSG:4326 (longitud, latitud). Se solicitan únicamente dirección, barrio, certificación, fecha de corte y geometría: no se piden números prediales, identificadores catastrales ni datos de propietarios. El filtro CQL se genera con tokens alfanuméricos validados, nunca con texto libre interpolado.

El filtro remoto permite distintas separaciones entre números y letras; luego una comprobación local exige igualdad de la dirección normalizada, conservando las letras y dígitos de la vía y la separación entre cruce y placa. Se rechazan coordenadas inválidas o fuera del área de Cali. No se calculan puntos aproximados ni se inventan números. Las sugerencias muestran el estado de certificación que devuelve la fuente.

La búsqueda utiliza IDESC antes de TomTom y los respaldos existentes, con tiempo límite de 4,5 segundos y caché temporal de sesión de hasta 50 consultas durante cinco minutos. Si el servicio no responde o no encuentra una coincidencia, continúa con los proveedores existentes. Una búsqueda envía la dirección consultada a IDESC. Los puntos devueltos se usan para la selección y ruta actual; el historial conserva la consulta original.

## Comprobaciones

Tres direcciones tomadas de la muestra pública de la propia capa, sin usar direcciones personales del usuario:

| Dirección en la fuente | Coordenadas WGS84 (longitud, latitud) | Estado | Respuesta observada |
| --- | --- | --- | --- |
| KR 15 # 12 - 83 | -76.52895843, 3.44289173 | Certificada | 2,71 s |
| CL 12 # 11 - 49 | -76.5301456, 3.4461346 | Certificada | 2,57 s |
| DG 50 # 7 OESTE - 12 (Dirección Catastral) | -76.55865753, 3.41612953 | Por Certificar | 1,96 s |

Las coordenadas se comprobaron contra la respuesta oficial, no mediante visita física. Los tiempos no son una garantía de rendimiento.

- `node tests/cali-addresses.test.cjs`: filtro de ciudad/ámbito, direcciones completas, sufijos, límites cruce/placa, campos mínimos, certificación, fallos y cancelación.
- `node tests/cali-browser.cjs`: sugerencias IDESC, atribución/licencia, selección de coordenadas y respaldo TomTom en móvil/escritorio con servicios simulados.
- Pruebas existentes de geocodificación y TomTom para conservar sus comportamientos.
