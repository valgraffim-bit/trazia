# Búsqueda de direcciones en el catastro público IGAC

## Fuente comprobada

- Base Catastral Pública del Gestor IGAC 09-2026: https://www.arcgis.com/home/item.html?id=6a2c6ddbcfac43e098667594e59b7ad7
- Servicio oficial: https://services2.arcgis.com/RVvWzU3lgJISqdke/arcgis/rest/services/CATASTRO_PUBLICO_31092026/FeatureServer
- Tabla `REGISTRO_1` (17): dirección completa, municipio y código predial para el enlace.
- Capas `U_TERRENO` (7) y `R_TERRENO` (14): terrenos urbanos/rurales.
- Licencia del ítem oficial: CC BY-SA 4.0. Se mantienen atribución y condiciones de CompartirIgual. No se atribuye aval del IGAC a Trazia.
- Catálogo de nombres municipales: https://sigi.igac.gov.co/catastro/rest/services/Catastro/DirectoriosDescargaCatastro/MapServer/0

La fuente cubre municipios bajo gestión del IGAC, **no todo el catastro colombiano**. Cali, Bogotá, Medellín y otros gestores pueden requerir sus propias fuentes. La base propia de Cali y los proveedores anteriores se conservan. El catálogo contiene 828 nombres/códigos municipales, lo que no demuestra que todos tengan registros consultables en este corte.

## Por qué no importar cualquier capa de nomenclatura

También se examinó el SHP oficial de nomenclatura urbana (ítem 6a45e5254433463b8663f3fc410c06fd): contiene 2.504.371 elementos con geometría de línea. En muchas filas TEXTO es una placa parcial o NS; no son 2,5 millones de direcciones completas georreferenciadas. No se importan esas placas inventando una calle. La integración usa en cambio la dirección del Registro 1 y un enlace exacto al terreno.

## Funcionamiento

El usuario escribe una dirección completa con #, guion y municipio; puede añadir departamento para distinguir municipios homónimos. Ejemplo probado: `Calle 27 #17-83, Baranoa, Atlántico`.

`igac-cadastre.mjs` consulta primero Registro 1 restringido al municipio. Compara la secuencia completa de letras y números, conservando fronteras entre grupos numéricos: CL 27 17 83 no equivale a CL 2 717 83. Se rechazan cadenas con interiores o texto adicional que no coincidan; no se adivinan. Si el usuario no especifica municipio o busca un negocio, continúan los proveedores anteriores.

Solo solicita DIRECCION, MUNICIPIO y NUMERO_PREDIAL. El código sirve para enlazar de forma exacta con CODIGO en el terreno; se comprueba también el municipio. No se publica, guarda en la base propia ni presenta ese identificador. No se solicitan propietarios, documentos, avalúos, áreas o información tributaria. Si un código de propiedad horizontal no enlaza exactamente con un terreno, no se recorta ni inventa otro código: se utiliza el respaldo existente.

La ubicación es el **centroide que devuelve el servicio para el terreno en WGS84**, no una puerta. Las sugerencias y la ruta indican «Referencia del predio; acceso por confirmar». No se presenta como dirección certificada o acceso exacto. La persona confirma una sugerencia antes de calcular la ruta. Esta condición también se conserva al guardar el punto como Casa/Trabajo u otro favorito.

Se consulta primero el terreno urbano y el rural si no hay coincidencia urbana válida. Coordenadas inválidas, códigos o municipios discordantes no se muestran. Las consultas tienen tiempo límite y cancelación; si falla el proveedor o no hay coincidencia, se continúa con TomTom y los respaldos existentes. Los resultados no constituyen un inventario completo de predios ni una consulta de impuestos.

## Actualización

`scripts/update-cadastre-catalog.py` revisa el catálogo en el flujo existente, incluido el horario semanal. Solo acepta cortes públicos de la cuenta oficial configurada, URLs de la organización IGAC, licencia CompartirIgual 4.0 y las tablas/campos esperados. No retrocede a un periodo anterior. Si la revisión falla, mantiene la configuración incluida. No descarga todas las tablas prediales ni replica información de propietarios.

Las direcciones se consultan en línea en el corte oficial seleccionado, con caché de sesión de cinco minutos. El catálogo de servicio se renueva como máximo cada hora de sesión. Actualizar el catálogo semanalmente no significa que el IGAC produzca datos nuevos cada semana. La disponibilidad depende del servicio público y no requiere otra clave de pago.

## Validación

Prueba real del 11 de noviembre de 2026: Registro 1 devolvió `CL 27   17   83`, municipio 08078 (Baranoa). El código enlazó exactamente con U_TERRENO y devolvió centroide WGS84 `[-74.91911172290051, 10.788915843568581]`. La última medición observó 316 ms para el registro y 186 ms para el terreno, sin garantía de latencia futura. No se comprobó la entrada mediante visita física.

Una prueba en Villanueva (Bolívar) no produjo una coincidencia y no se inventó resultado. La revisión real del catálogo encontró y validó el corte 09-2026. Se probó mediante unidades la selección municipal, homónimos, números y sufijos, unión exacta, coordenadas inválidas, respaldo rural, fallos y cancelación; Playwright móvil/escritorio verifica la referencia aproximada, atribución, selección y respaldo con servicios/mapa simulados. Tres pruebas Python cubren revisión oficial, rechazo de fuentes ajenas/esquemas cambiados y protección frente a retroceso de corte.
