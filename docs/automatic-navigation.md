# Inicio automático de la navegación

Al elegir una dirección, negocio o lugar de las sugerencias, Trazia calcula la ruta y comienza la navegación cuando recibe un recorrido válido. Los destinos guardados y los puntos importados usan el mismo flujo. Escribir una consulta sin seleccionar un resultado sigue mostrando coincidencias para elegir el destino correcto.

Se eliminó el botón «Iniciar navegación». El resumen del mapa conserva hora estimada de llegada, distancia y duración. «Terminar» permite detener la navegación, borrar el recorrido y volver a buscar.

El cálculo exige una ubicación GPS reciente; si el dato tiene más de treinta segundos, se consulta de nuevo. El inicio reutiliza ese origen sin pedir una segunda ubicación. Una denegación del GPS o un fallo del servicio no inicia la navegación. La preparación de la voz ocurre durante la selección, antes de esperar la respuesta de la ruta, para conservar el gesto requerido por los navegadores móviles.

Una respuesta descartada, una búsqueda que ya cambió o una ruta cancelada no puede iniciar navegación tardíamente. Iniciar de nuevo una navegación activa no la detiene. Los recálculos conservan la navegación y actualizan las indicaciones y las métricas; el destino activo solo se reemplaza cuando el nuevo cálculo termina correctamente.

Validación: `node --test tests/*.test.cjs` y `node tests/auto-navigation-browser.cjs`. El navegador simula GPS y servicios externos para comprobar selección → cálculo → navegación, métricas visibles, cancelación, errores y distribución móvil/horizontal/escritorio.
