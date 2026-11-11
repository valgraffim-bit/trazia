# Trazia para iPhone: paquete IPA sin firmar

Este proyecto crea una app contenedora para iOS que abre la versión en línea de Trazia en una vista WKWebView. Cuando el sitio de Trazia se actualiza, la app carga la versión publicada al conectarse a internet; no es necesario reemplazar el contenido web dentro del IPA.

## Compilar el IPA

El workflow **Build downloadable unsigned iOS IPA** compila con Xcode en GitHub Actions, empaqueta la app sin firma y publica el archivo como un asset de la versión **trazia-ios-unsigned**.

## Limitación de instalación

Este IPA está intencionalmente sin firma ni perfil de aprovisionamiento. iOS no permite instalarlo directamente. Para instalarlo hay que volver a firmarlo con un certificado y un perfil de desarrollo/distribución válidos. No incluye integración CarPlay aprobada por Apple.
