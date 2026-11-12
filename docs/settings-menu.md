# Menú de Ajustes

Se abre desde el menú y desde los accesos existentes a Ajustes. Cada sección tiene botón para volver; la X cierra el panel. En teléfono ocupa la pantalla y en escritorio aparece a la derecha. Los controles originales de apariencia, tráfico y sesión se conservan y se trasladan entre paneles sin perder sus eventos.

## Funciones conectadas

- General: idioma, distancias en km o millas y bloqueo de pantalla durante navegación (según compatibilidad del navegador).
- Mapa: apariencia, tráfico TomTom, vista 2D/3D y brújula.
- Voz: activar/desactivar, persistencia y prueba de voz; el volumen se controla desde el dispositivo.
- Navegación: evitar peajes, ferris, autopistas, pavimento sin asfaltar y priorizar menos maniobras. Se envían opciones Valhalla al calcular o recalcular. Preferencias de autopistas, pavimento e intersecciones se aplican a perfiles motorizados; no son prohibiciones absolutas. No se clasifica la dificultad real de intersecciones.
- Vehículo: perfil de ruta y anotaciones locales de matrícula, combustible y vehículo eléctrico.
- Pases: selección local de pases existentes; no valida permisos ni modifica las rutas o tarifas.
- Alertas: cámaras ANSV, distancia de aviso y recordatorio de luces al iniciar navegación.
- Velocímetro: mostrar/ocultar, km/h o mph. No hay alertas de límites de velocidad por falta de límites verificados.
- Gasolineras: abre búsqueda cercana existente. Sin precios en vivo ni filtro verificado por combustible.
- Audio: abre la selección de aplicaciones de música existente.
- Viajes: guardar salidas y descargar un evento .ics para el calendario del dispositivo. Sin sincronización ni notificaciones en segundo plano propias.
- Privacidad: consultar/borrar destinos recientes, cerrar sesión y solicitar eliminar la cuenta autenticada con confirmación explícita. Firebase puede requerir un nuevo inicio de sesión antes de eliminar. Los datos locales no se borran al eliminar la cuenta.

Las preferencias y viajes permanecen en este dispositivo y no se sincronizan entre cuentas. La información visible explica los límites de cada función.

## Comprobación

`node --test tests/*.test.cjs` cubre validación de preferencias, envío de opciones de ruta y bloqueo de pantalla, junto con las pruebas existentes.

`node tests/settings-browser.cjs` comprueba las 12 secciones, submenús, controles persistentes, exportación al calendario, manejo seguro de texto y distribución en vertical/horizontal. Con `SETTINGS_PREVIEW_DIR` genera capturas.

`node tests/auth-browser.cjs` comprueba el acceso y la respuesta a eliminación de cuenta con Firebase simulado. No elimina cuentas reales.
