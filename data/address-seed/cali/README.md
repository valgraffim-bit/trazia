# Copia inicial de direcciones de Cali

Esta copia permite publicar la aplicación incluso cuando el WFS oficial rechaza las peticiones del servidor de GitHub Actions. No se utiliza como una fuente nueva ni reemplaza la tarea semanal.

Fuente: Departamento Administrativo de Planeación / Equipo de Nomenclatura, publicada por IDESC Cali.
Servicio: https://ws-idesc.cali.gov.co/geoserver/wfs
Capa: dapm:pdt_nmc_nomenclatura_domiciliaria
Metadatos y licencia: https://mg-idesc.cali.gov.co/geonetwork/geonetwork/api/records/26efce58-37c7-44e4-9386-b925c92d17d1
Licencia: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ . Conservar atribución y compartir derivados bajo esas condiciones.

Descarga del 11 de noviembre de 2026: 692.389 registros de origen, 294.361 entradas consultables. Los datos de muestra indican corte 2026-09-03. Se seleccionaron campos públicos de dirección, barrio, certificación, fecha de corte y geometría; se normalizó el índice, deduplicó y validó. No contiene información de propietarios ni preferencias privadas de usuarios.

Los archivos `part-00.bin` a `part-15.bin` son fragmentos, en orden, de un único archivo ZIP de 8.192.278 bytes. `seed.json` contiene tamaños y SHA-256 de cada parte y del archivo completo. El actualizador comprueba esas huellas, la estructura del ZIP, las huellas de los 256 grupos JSON y sus registros antes de restaurar la copia.

Se recupera primero la caché o copia publicada. Si ninguna existe, se restaura esta semilla incluida y luego se aplican las reglas normales de antigüedad/actualización. Si el proveedor sigue devolviendo 403, la actualización lo advierte y conserva la copia válida. No se promete que el proveedor permita futuras descargas desde GitHub ni que haya datos nuevos cada semana. Solo la copia inicial se guarda en Git; las actualizaciones continúan publicándose mediante artefactos y caché.
