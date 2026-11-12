# Voces del teléfono

En Ajustes → Voz y sonido se pueden elegir las voces que el navegador expone mediante `speechSynthesis.getVoices()`. No se añaden servicios externos de pago ni voces exclusivas de ChatGPT. Algunas voces del sistema pueden requerir conexión a internet.

La opción Automática mantiene la selección según el idioma de Trazia. Una selección explícita guarda `voiceURI` en las preferencias locales y usa esa voz y su idioma en las indicaciones. Si deja de estar disponible, se conserva la preferencia y se usa temporalmente la voz automática. La lista se actualiza mediante `voiceschanged` o el botón Actualizar voces; no se pierde la selección cuando el teléfono tarda en cargarla.

Probar la voz reproduce una muestra aun si la guía está silenciada, sin activar las indicaciones. No se reproduce audio cuando está abierto el micrófono de búsqueda. Si falla la muestra, el error aparece en la sección. El volumen se controla en el dispositivo. No se genera audio mediante OpenAI ni se solicita una clave de API.

Comprobación: `node --test tests/*.test.cjs`, `node tests/device-voices-browser.cjs` y `node tests/settings-browser.cjs`. Las pruebas de navegador simulan el catálogo de voces y la salida de audio; la lista y reproducción efectivas dependen del teléfono. `VOICES_PREVIEW_DIR` permite capturar la sección.
