# Cámaras de fotodetección

`speed-cameras.json` contiene únicamente coordenadas públicas del registro de la Agencia Nacional de Seguridad Vial (ANSV): https://fotodeteccion.ansv.gov.co/data/sast.json. Página de consulta: https://fotodeteccion.ansv.gov.co/ubicaciones-aprobadas.html.

El archivo se genera con `python3 scripts/update-speed-cameras.py`. Se conservan solo ubicaciones con estado `Aprobada` y estado de operación `Operando`, coordenadas válidas en Colombia e identificador único. Se usa la coordenada original del dispositivo: no se desplazan puntos ni se utilizan las coordenadas de las señales. Se descartan datos de tramitadores, archivos y otros metadatos innecesarios.

`updatedAt` corresponde a la fecha del registro ANSV, no a una verificación en tiempo real. Una cámara puede cambiar de estado después de esa fecha. El popup muestra esa limitación y un enlace a la fuente. En la instantánea del 10 de noviembre de 2026 hay 360 ubicaciones, 63 de ellas en Cali.

El workflow de publicación intenta refrescar el archivo antes de publicar. Si la fuente está caída, conserva la instantánea incluida y su fecha, sin inventar una actualización. No se ejecutan consultas de ubicación de usuarios contra ANSV.

El PNG transparente `assets/speed-camera.png` es un icono geométrico creado para Trazia y se muestra a 24 píxeles. Durante la navegación se avisa una vez de los puntos situados aproximadamente entre 15 y 350 metros por delante sobre el trazado y a menos de 40 metros de él. La cercanía al trazado no confirma el carril o sentido fiscalizado. La guía de voz de las maniobras tiene prioridad.
