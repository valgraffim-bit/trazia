# Fuentes de números SOS

Revisión documental: 12 de noviembre de 2026. `data/emergency-numbers.json` contiene 43 países con números de emergencia publicados por autoridades. No es un directorio mundial ni una garantía de cobertura de todos los operadores, localidades o territorios asociados.

| País | Número | Autoridad consultada |
| --- | --- | --- |
| Colombia | 123 | [Función Pública: línea única nacional](https://www1.funcionpublica.gov.co/preguntas-frecuentes/-/asset_publisher/sqxafjubsrEu/content/linea-unica-de-emergencias-nacional-123/28585938) |
| México | 911 | [Gobierno de México: número único](https://www.gob.mx/911/es/articulos/que-es-el-911emergencias?idiom=es) |
| Estados Unidos | 911 | [Programa Nacional 911](https://www.911.gov/calling-911/) |
| Canadá | 911 | [Policía Montada: llamadas de emergencia](https://rcmp.ca/en/bc/safety-tips/emergency-services/tips-calling-emergency-services) |
| Argentina | 911 | [Gobierno nacional: emergencias](https://www.argentina.gob.ar/tema/emergencias) |
| Chile | 133 | [Consulados de Chile: Carabineros](https://www.consulado.gob.cl/emergencias-en-chile) |
| Perú | 105 | [Gobierno del Perú: central policial](https://www.gob.pe/547-telefonos-de-emergencia) |
| Ecuador | 911 | [Servicio Integrado ECU 911](https://www.ecu911.gob.ec/servicio-integrado-de-seguridad-ecu-911/) |
| Brasil | 190 | [Ministerio de Comunicaciones: Policía Militar](https://www.gov.br/mcom/pt-br/noticias/noticias_alt/2026/setembro/emergencia-voce-sabe-para-quem-ligar-quando-precisa-de-ajuda) |
| Uruguay | 911 | [Ministerio del Interior: denuncia de emergencia](https://www.gub.uy/ministerio-interior/comunicacion/campanas/denunciar-0) |
| Costa Rica | 911 | [Poder Judicial: Sistema de Emergencias](https://diccionariousual.poder-judicial.go.cr/index.php/diccionario/sistema-de-emergencias-9-1-1) |
| Panamá | 104 | [Policía Nacional](https://policia.gob.pa/home25.php) |
| Reino Unido | 999 | [Gobierno del Reino Unido: contactar a la policía](https://www.gov.uk/contact-police) |
| Australia | 000 | [Gobierno de Australia: Triple Zero](https://www.infrastructure.gov.au/media-communications/phone/triple-zero/how-call-triple-zero-000) |
| Nueva Zelanda | 111 | [Policía de Nueva Zelanda](https://www.police.govt.nz/call-111) |
| Japón | 110 | [Agencia Nacional de Policía](https://www.npa.go.jp/goiken_index.html) |
| 27 miembros de la Unión Europea | 112 | [Comisión Europea: número 112](https://digital-strategy.ec.europa.eu/en/policies/112) |

La [lista oficial de miembros de la UE](https://european-union.europa.eu/principles-countries-history/eu-countries_en) se usó para limitar las entradas de 112 a esos 27 países. No se extendió esa regla a países o territorios no verificados. Los códigos son ISO 3166-1 alfa-2: `GB` para Reino Unido y `GR` para Grecia.

## Interpretación y límites

- Las centrales unificadas se identifican como «Emergencias · solicita Policía». El operador deriva al servicio correspondiente; no todas son líneas directas de policía.
- Se conservaron como líneas policiales específicas 133 (Carabineros de Chile), 105 (Perú), 190 (Policía Militar de Brasil), 104 (Panamá), 110 (Japón) y 911 policial en Uruguay.
- Los números cortos se marcan en el territorio correspondiente, sin código internacional. `000` es texto para conservar los ceros iniciales.
- En Canadá existen localidades sin cobertura de 911; la [autoridad de Columbia Británica](https://www2.gov.bc.ca/gov/content/justice/criminal-justice/bcs-criminal-justice-system/reporting-a-crime/how-to-report-a-crime) recomienda usar el número local en esas comunidades. La selección de país no garantiza recepción en una localidad remota.
- Estas fuentes verifican el número publicado, no la disponibilidad en vivo. No se realizaron llamadas para probarlos.
