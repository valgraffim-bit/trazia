# Marcadores de lugares guardados

Casa y Trabajo utilizan PNG propios; los lugares nuevos permiten elegir Casa, Trabajo, Tienda/negocio, Clínica, Estudio, Favorito u Otro. Los archivos transparentes de 128×128 se muestran en marcadores de 44×44 y se incluyen en la caché de la aplicación.

Al pulsar Guardar se busca la dirección mediante el buscador existente. La persona elige una coincidencia antes de guardar sus coordenadas. Una dirección con # no puede guardarse con un resultado sin número de casa. Si la búsqueda falla o no encuentra la ubicación, el formulario continúa abierto y no crea un marcador aproximado. Cambiar los campos o cerrar el formulario cancela la búsqueda pendiente.

Los lugares se guardan únicamente en localStorage (`trazia:saved-places`) del navegador/dispositivo, con nombre, dirección escrita por el usuario, tipo de icono y coordenadas seleccionadas. No se suben a la base pública de direcciones ni se comparten con otros usuarios. La búsqueda utiliza los proveedores ya configurados y conserva su atribución.

Al cargar el mapa se restauran los puntos con coordenadas válidas. Cada PNG se ancla a esas coordenadas. Su ficha ofrece dirección, Buscar ruta y Editar. Elegir un lugar guardado usa directamente el punto confirmado para calcular la ruta. Volver a guardar una dirección que no cambió conserva su punto.

Los lugares antiguos que solo contienen texto necesitan confirmar su ubicación una vez: al seleccionarlos se abre el editor con una indicación. No se geocodifican todas las direcciones privadas automáticamente al abrir la aplicación ni se inventan puntos. Los accesos de lugares guardados también quedan disponibles en escritorio.

Validación: pruebas de coordenadas válidas y tipos permitidos; Playwright móvil/escritorio con Casa, Trabajo y negocio personalizado, carga de PNG, coordenadas, restauración tras recargar, ruta directa desde el punto guardado, resultados vacíos y migración de lugares antiguos. Mapa/geocodificadores simulados. Los siete archivos PNG se comprobaron como RGBA transparentes de 128×128.
