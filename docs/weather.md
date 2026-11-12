# Tiempo en el mapa

El indicador junto a la brújula muestra un icono y la temperatura. Ajustes → General → Unidad de temperatura permite elegir Celsius o Fahrenheit, independientemente de kilómetros/millas. La elección permanece en este dispositivo y se aplica al instante, sin volver a consultar el servicio.

Con GPS se consulta la zona de la ubicación aceptada por Trazia. Sin GPS se usa el centro del mapa, identificado como «Zona del mapa» en la etiqueta accesible y los detalles. No se solicita otro permiso de ubicación. Al tocar el indicador se muestran la condición, el ámbito, la hora del dato y la atribución.

Fuente: [Open-Meteo Forecast API](https://open-meteo.com/en/docs), condiciones actuales de modelos meteorológicos con intervalos de quince minutos; no son mediciones de un sensor del teléfono. Se solicita temperatura en Celsius, código WMO e indicador día/noche, con tiempo Unix. Fahrenheit se calcula localmente. Se envían coordenadas redondeadas a dos decimales (aproximadamente un kilómetro), sin credenciales ni información de cuenta.

La consulta comienza después de entrar en Trazia y se detiene al cerrar sesión. Se actualiza cada diez minutos en la misma zona y como máximo una vez por minuto al cambiar de zona; la primera ubicación GPS puede reemplazar de inmediato la consulta inicial del mapa. No se consulta con la página oculta o sin conexión. Tras un fallo se reintenta a los cinco minutos. Las respuestas tienen un límite de diez segundos y se descartan al cerrar sesión.

Sin datos válidos se muestra «—», nunca una temperatura de ejemplo. Los datos conservados tras un fallo o sin conexión se identifican como «Último dato disponible»; también se advierte si tienen más de treinta minutos. Durante el recorrido se conserva una lectura reciente a menos de cinco kilómetros mientras se consulta la siguiente zona; se identifica como «Último dato de una zona cercana». No se muestra una temperatura de más de una hora ni de una zona a más de cinco kilómetros.

La API pública no requiere clave. Su [plan gratuito](https://open-meteo.com/en/terms) permite uso no comercial, con límites de consultas, y los datos requieren atribución CC BY 4.0. Una explotación comercial o un mayor volumen requiere revisar el proveedor o su plan.

Validación: `node --test tests/weather.test.cjs tests/settings.test.cjs`, `node tests/weather-browser.cjs`, `node tests/settings-browser.cjs`. Las pruebas de navegador simulan el servicio y el GPS; cubren las unidades, la procedencia del dato, errores, expiración, cierre de sesión y distribución vertical/horizontal.
