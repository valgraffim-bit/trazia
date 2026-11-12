# Llamada SOS

El botón rojo SOS permanece disponible en el mapa, también durante la navegación. Abre un diálogo con el país, servicio, número y enlace a la fuente oficial. Solo el enlace «Llamar al …» abre el teléfono mediante `tel:`; abrir SOS, detectar el país o cambiar una opción nunca realiza una llamada.

Se incluyen los 43 países del [directorio verificado](sos-sources.md). Para las centrales unificadas se indica «Emergencias · solicita Policía»; las líneas policiales directas se identifican por su servicio. No se garantiza cobertura mundial ni de todas las localidades u operadores. No se añaden prefijos internacionales a los números cortos y se conservan los ceros de `000` de Australia.

Al abrir se intenta sugerir el país únicamente si Trazia ya tiene un GPS de menos de un minuto. No se usa el centro del mapa, el destino, el idioma ni una selección anterior. «Usar mi ubicación» permite solicitar un GPS nuevo. El país se puede seleccionar manualmente, también sin conexión cuando la aplicación está almacenada.

La consulta de país usa [Photon reverse](https://github.com/komoot/photon/blob/master/docs/api-v1.md), con coordenadas redondeadas a dos decimales, radio de cinco kilómetros y hasta cinco resultados. Es una sugerencia geográfica, no una certificación de jurisdicción. Si aparecen varios países, el país no está cubierto o falla la consulta, no se ofrece un número automático ni se usa 112 como sustituto universal. El usuario confirma el país y número antes de abrir el teléfono. Una selección manual o el cierre del diálogo invalida las respuestas pendientes.

La llamada nativa puede pedir su propia confirmación. Trazia no accede al audio de la llamada ni controla su altavoz: el usuario lo activa en la pantalla de llamada del teléfono. Se cancela cualquier locución de Trazia al tocar el enlace, sin cambiar la preferencia de voz. No se envía la ubicación ni información de cuenta al servicio de emergencias desde Trazia; las funciones del sistema telefónico son independientes.

El directorio local y el módulo se precargan en la caché de la aplicación. Sin soporte de llamadas en el dispositivo, el número continúa visible para usarlo desde un teléfono.

Pruebas: `node --test tests/sos.test.cjs`, `node tests/sos-browser.cjs`. Todas las acciones `tel:` se interceptan antes de navegar; no se realizan llamadas ni se contacta a emergencias para probar el producto. Las pruebas cubren datos inválidos, selección, región desconocida/ambigua, ausencia de GPS/red, respuestas tardías, idiomas y distribución móvil/horizontal/escritorio.
