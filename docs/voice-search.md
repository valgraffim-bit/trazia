# Búsqueda por voz

El micrófono del buscador o del mapa abre una ventana de escucha cancelable. El navegador solicita permiso de audio y reconocimiento, si hace falta. Se muestran palabras provisionales pero solo se busca una transcripción final. Se reconocen frases como «Llévame a Jardín Plaza», «Dónde queda Clínica Valle del Lili» o «Buscar dirección Carrera 80 # 42-15».

La consulta final pasa por los buscadores existentes de direcciones y negocios con búsqueda explícita habilitada. Las coincidencias se muestran antes de calcular una ruta: el usuario elige el establecimiento o dirección correcto. Si se busca durante un recorrido, la ruta anterior se conserva hasta que se calcule la nueva selección.

Cancelar usa abort y descarta eventos tardíos, Escape cierra la escucha y al ocultar la página se libera el micrófono. El reconocimiento tiene un límite de 20 segundos. Los errores de permiso, red o silencio permiten reintentar o escribir. Se pausa la voz sintetizada mientras está abierta la ventana para evitar que el dispositivo se escuche a sí mismo.

Se utiliza SpeechRecognition o webkitSpeechRecognition en español colombiano o inglés, según el idioma de Trazia. La disponibilidad depende del navegador, dispositivo y servicio de reconocimiento; normalmente requiere internet. Si no está disponible se conserva la búsqueda escrita y se sugiere el dictado del teclado. No se añade un servicio propio de grabación ni se envía audio a los buscadores de lugares desde el código de Trazia; el navegador gestiona el reconocimiento y solo la transcripción final se usa como consulta.

## Verificación

- `node --test tests/*.test.cjs`: normalización de frases, consulta explícita de direcciones/negocios y protección contra resultados atrasados, más las pruebas existentes.
- `node tests/voice-search-browser.cjs`: transcripción provisional/final, cancelación, permisos, reintentos, eventos tardíos, errores al iniciar, navegador sin reconocimiento y diseños móviles con voz simulada. `VOICE_PREVIEW_DIR` genera una captura de la escucha.
- Integración comprobada en la aplicación completa con reconocimiento y respuesta de búsqueda simulados y Firebase real inicializado sin crear cuentas. El audio real debe comprobarse desde un teléfono con permiso de micrófono.
