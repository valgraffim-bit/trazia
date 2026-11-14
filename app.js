import { setupSOS } from './sos.mjs?v=71';
import { setupWeatherBadge } from './weather.mjs?v=69';
import { setupMusicDock } from './music-dock.mjs?v=68';
import { findSearchLocations } from './search-locations.mjs?v=66';
import { createCommunityReportService, watchCommunityReports, communityReportError } from './community-reports.mjs?v=64';
import { setupReportMenu } from './reports.mjs?v=64';
import { setupVoiceSearch } from './voice-search.mjs?v=59';
import { loadPreferences, setupSettings } from './settings.mjs?v=69';
import { setupAccountScreen } from './auth.mjs?v=63';
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl.mjs';

import { parseWazeLocation } from './waze-links.mjs?v=66';
import { findIgacCandidates } from './igac-cadastre.mjs?v=73';
import { findLocalCaliCandidates } from './local-cali-addresses.mjs?v=73';
import { findCaliCandidates, findNearbyCaliCandidates } from './cali-addresses.mjs?v=73';
import { findTomtomCandidates } from './tomtom-geocoding.mjs?v=73';
import { cameraFeatures, cameraApproach } from './speed-cameras.mjs?v=35';
import { TRAFFIC_SOURCE, TRAFFIC_LAYER, TRAFFIC_TILE_URL, trafficRequest, congestionLayer } from './live-traffic.mjs?v=32';
import { mapLayerPalette, roadColors } from './map-palette.mjs?v=33';

(() => {
  'use strict';

  // Prevent Safari from scaling the whole app; MapLibre keeps handling map touch gestures.
  const preventViewportPinch = (event) => event.preventDefault();
  document.addEventListener('gesturestart', preventViewportPinch, { passive: false });
  document.addEventListener('gesturechange', preventViewportPinch, { passive: false });

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const app = $('.app-shell');
  const destinationInput = $('#destination-input');
  const statusText = $('#connection-status');
  const toast = $('#toast');
  const menuDialog = $('#app-menu-dialog');
  let profileUser = null;
  let refreshProfileMenu = () => {};
  let refreshPlannedTrips = () => {};
  let clearPlannedTrips = () => {};
  const savedPlaceDialog = $('#saved-place-dialog');
  const reportDialog = $('#report-dialog');
  const settingsDialog = $('#settings-dialog');
  const weatherDialog = $('#weather-dialog');
  const sosDialog = $('#sos-dialog');
  let musicDock;
  const musicDialog = $('#music-dialog');
  const DEFAULT_MAP_CENTER = [-76.532, 3.452];
  const COLOMBIA_SEARCH_BOUNDS = { west: -82.2, south: -5.1, east: -66.5, north: 14.3 };

  const copy = {
    es: {
      nearbyFromLocation: 'Radio de 10 km desde tu ubicación', nearbyFromMap: 'Radio de 10 km desde el centro del mapa', nearbyResults: 'resultados', nearbyHours: 'Horario registrado', nearbyWebsite: 'Sitio web', nearbyEmpty10: 'No encontramos lugares de esta categoría dentro de 10 km.', nearbyUnavailable: 'No se pudo consultar los lugares cercanos. Intenta de nuevo.', nearbyDataNote: 'Hasta 30 resultados, ordenados por distancia en línea recta. Datos de OpenStreetMap: los horarios y contactos pueden estar incompletos o desactualizados.',
      showCongestion: 'Mostrar trancones en rojo', trafficCoverageNote: 'Tráfico según cobertura TomTom. La ausencia de rojo no confirma que la vía esté libre. El tiempo de ruta se calcula por separado.', trafficLoading: 'Consultando trancones…', trafficReady: 'Rojo: trancón · TomTom', trafficOff: 'Tráfico oculto', trafficUnavailable: 'Tráfico no disponible',
      importWaze: 'Importar ubicación de Waze', wazeInstructions: 'En Waze, selecciona el destino, pulsa Compartir y copia el enlace. Pégalo aquí para usar el mismo punto en Trazia.', wazeLinkLabel: 'Enlace compartido de Waze', useWazePoint: 'Usar ubicación en Trazia',
      tagline: 'Tu ruta, más clara', language: 'Idioma', demoMode: 'Cargando mapa Trazia…', mapReadyLabel: 'Mapa Trazia activo', mapSettings: 'Mapa Trazia', locationOff: 'Ubicación apagada', locationOn: 'Ubicación activada', menuSearch: 'Buscar destino', menuReport: 'Reportes', menuSettings: 'Ajustes', menuNote: 'Navegación clara, hecha por Trazia.', voiceEnabled: 'Voz de navegación activada', voiceMuted: 'Voz de navegación silenciada', voiceStarting: 'Preparando la guía de voz.', voiceTest: 'La voz de Trazia está activada.', voicePlaybackError: 'No se pudo reproducir la voz. Revisa el volumen del teléfono.', home: 'Casa', work: 'Trabajo', addNew: 'Nuevo', newPlace: 'Nuevo lugar', recent: 'Recientes', savedPlaceTitle: 'LUGARES GUARDADOS', savedPlaceName: 'Nombre', savedPlaceAddress: 'Dirección', savedPlaceIcon: 'Icono del lugar', placeShop: 'Tienda / negocio', placeClinic: 'Clínica', placeSchool: 'Estudio', placeFavorite: 'Favorito', placeOther: 'Otro lugar', chooseSavedLocation: 'Selecciona la ubicación correcta para guardar el lugar.', confirmSavedLocation: 'Pulsa Guardar y confirma la ubicación para mostrar su icono en el mapa.', savedLocationMissing: 'No se encontró la ubicación. Revisa la dirección e incluye la ciudad.', savedLocationError: 'No se pudo buscar la dirección. Intenta otra vez.', savePlace: 'Guardar', placeRequired: 'Escribe un nombre y una dirección.', placeSaved: 'Lugar guardado.',
      vehicleLabel: 'Tu vehículo', vehicleCar: 'Carro', vehicleMotorcycle: 'Moto', vehicleTruck: 'Camión', vehicleBicycle: 'Bicicleta', vehicleMotorcycleNote: 'Las rutas para moto están en beta; revisa las indicaciones en tu zona.', vehicleBicycleNote: 'Las rutas en bicicleta pueden variar según las vías disponibles en tu zona.', vehicleTruckNote: 'La ruta de camión aplica restricciones de peso y dimensiones estándar; configúralas para mayor precisión.', vehicleTruckUnavailable: 'No se pudo calcular esta ruta para el camión seleccionado.', destinationMarkerLabel: 'Llegada', view3d: 'Activar vista 3D', view2d: 'Activar vista 2D', compassSwitchNorth: 'Cambiar a norte arriba', compassSwitchFollow: 'Seguir rumbo del vehículo', compassNorthActive: 'Brújula: norte arriba', compassFollowActive: 'Brújula: siguiendo el rumbo del vehículo', musicConnect: 'Música', musicKicker: 'MÚSICA', musicTitle: 'Elegí tu aplicación de música', musicIntegrationNote: 'Elegí qué aplicación querés tener a mano en el mapa. Al tocar su ícono podrás abrirla; la reproducción y sus controles permanecen en el servicio de música.', musicOpen: 'Elegir', musicChosen: 'Elegida', musicOpening: 'Abriendo la app de música…',
      destinationPrompt: '¿A dónde quieres ir?', destinationPlaceholder: 'Dirección y municipio, negocio o lugar', findRoute: 'Buscar ruta', myLocation: 'Mi ubicación', nearbyTitle: 'Explora cerca de tu ruta', clear: 'Limpiar', suggestionLoading: 'Buscando direcciones y lugares…', chooseAddress: 'Elige una dirección o establecimiento de la lista para calcular la ruta.', autocompleteUnavailable: 'No se pudo consultar la búsqueda de direcciones. Intenta otra vez.', autocompleteAttribution: '© OpenStreetMap contributors',
      gasStations: 'Gasolineras', clinics: 'Clínicas', pharmacies: 'Farmacias', businesses: 'Negocios', suggestedRoute: 'RUTA TRAZIA', sampleDestination: 'Tu destino', lessTraffic: 'Ruta sugerida', minutes: 'min', kilometers: 'km', estimatedTime: 'Tiempo estimado', distance: 'Distancia', avoidTolls: 'Evitar peajes', finishNavigation: 'Terminar', sampleTraffic: 'Tiempo estimado sin ajuste por tráfico', sampleNote: 'Ruta calculada con datos abiertos; el tiempo no se ajusta por tráfico.', emptyRoute: 'Busca un destino para ver tu ruta.', arrivalTime: 'Llegada', routeDistanceLabel: 'Distancia', routeDurationLabel: 'Tiempo',
      communityTitle: 'Reportes', communityCopy: 'Compartí novedades de la vía durante 1 hora.', report: 'Reportar', sharedReportNote: 'Reporte de la comunidad · vigencia de 1 hora', localReportScope: 'Solo en este dispositivo', localReports: 'Los reportes se guardan en este dispositivo; todavía no se comparten con otras personas.', worldReady: 'Diseñada para usar en cualquier lugar', mapProviderLabel: 'Mapa Trazia', sampleMap: 'Mapa de Trazia', reportsLayer: 'Reportes', mapCaption: 'Mapa Trazia · datos abiertos de OpenStreetMap', mapCredits: 'Créditos del mapa',
      communityKicker: 'COMUNIDAD TRAZIA', reportTitle: 'Reportes', reportTypeLabel: 'Tipo de reporte', incidentTraffic: 'Tráfico detenido', incidentCrash: 'Choque', incidentHazard: 'Peligro u obstáculo', incidentClosure: 'Cierre de vía', incidentPlace: 'Lugar nuevo o incorrecto', reportDetailsLabel: 'Nota breve (opcional)', reportDetailsPlaceholder: 'Describe lo que ves', reportLocationNote: 'El reporte se asociará al centro del mapa. En esta versión solo queda guardado en este dispositivo.', cancel: 'Cancelar', publishReport: 'Guardar reporte',
      settingsKicker: 'CONFIGURACIÓN', settingsTitle: 'Mapa Trazia', settingsIntro: 'Trazia usa datos abiertos de OpenStreetMap, un diseño propio y rutas de código abierto.', themeLabel: 'Apariencia', themeAuto: 'Automática: clara de día, oscura de noche', themeLight: 'Clara', themeDark: 'Oscura', mapDataNote: 'Mapa base: OpenStreetMap. Las sugerencias de direcciones vienen de datos abiertos; las rutas y el tiempo son aproximados y no tienen tráfico en vivo.', openStreetMapCredits: 'Créditos y licencia de OpenStreetMap', mapProviderLabel: 'Servicio OpenFreeMap',
      noDestination: 'Escribe o dicta un destino primero.', demoRoute: 'El mapa todavía se está cargando. Intenta de nuevo en unos segundos.', noLocation: 'No se pudo obtener tu ubicación. Permite el acceso a ubicación e inténtalo de nuevo.', locationUnsupported: 'Este navegador no ofrece acceso a la ubicación.', routeLocationDenied: 'Permite que el navegador comparta tu ubicación para iniciar la ruta.', routeLocationUnavailable: 'No se pudo detectar tu ubicación. Pulsa Mi ubicación y revisa los ajustes de ubicación del celular.', routeNotFound: 'No encontramos esa ruta. Revisa el destino e incluye ciudad y país.', routeApiError: 'El servicio de rutas rechazó la consulta. Intenta de nuevo en unos minutos.', routeServiceError: 'No se pudo conectar con el servicio de rutas abiertas. Inténtalo otra vez.', voiceUnsupported: 'El reconocimiento de voz no está disponible aquí. Puedes escribir el destino.', voiceListening: 'Escuchando… di el destino.', voiceError: 'No se pudo escuchar el destino. Inténtalo otra vez.', searchError: 'No se pudo calcular esa ruta. Revisa el destino y vuelve a intentarlo.', autocompleteNoResults: 'No encontramos coincidencias. Prueba con otra dirección o agrega la ciudad.', vehicleChangedRoute: 'Vehículo cambiado. Busca la ruta de nuevo.',
      connecting: 'Buscando lugares…', mapError: 'No se pudo cargar el mapa abierto. Revisa tu conexión a internet.', invalidCategory: 'No se encontraron lugares en esta zona.', nearbyNeedsMaps: 'Activa la ubicación para encontrar lugares cerca de ti.', clearPlaces: 'Lugares quitados del mapa.', trafficEnabled: 'Reportes visibles en el mapa.', trafficDisabled: 'Reportes ocultos en el mapa.',
      reportSaved: 'Reporte publicado. Será visible durante 1 hora.', reportRequired: 'No se pudo guardar el reporte.', routeReady: 'Ruta calculada con OpenStreetMap. El tiempo es aproximado y no incluye tráfico en vivo.', navigationNeedsRoute: 'Busca una ruta antes de iniciar la navegación.', navigationLocation: 'Activa tu ubicación para iniciar la guía por voz.', navigationStarted: 'Guía por voz iniciada.', navigationStopped: 'Navegación detenida.', navigationFollowRoute: 'Sigue la ruta marcada.', rerouting: 'Te saliste de la ruta. Recalculando…', rerouteReady: 'Ruta actualizada desde tu ubicación.', rerouteFailed: 'No se pudo recalcular. Sigue la línea morada.', arrived: 'Has llegado a tu destino.', nextInstruction: 'Siguiente indicación', demoNotice: 'El mapa necesita conexión a internet para cargar los datos abiertos.',
      categoryGas: 'Gasolineras', categoryClinic: 'Clínicas', categoryPharmacy: 'Farmacias', categoryBusiness: 'Negocios', nearbyPlaces: 'Lugares cercanos', rating: 'Calificación', noAddress: 'Dirección no disponible', incidentSaved: 'Reporte',
    },
    en: {
      nearbyFromLocation: '10 km radius from your location', nearbyFromMap: '10 km radius from the map center', nearbyResults: 'results', nearbyHours: 'Listed opening hours', nearbyWebsite: 'Website', nearbyEmpty10: 'No places in this category found within 10 km.', nearbyUnavailable: 'Nearby places could not be loaded. Please try again.', nearbyDataNote: 'Up to 30 results, ordered by straight-line distance. OpenStreetMap data: hours and contact details may be missing or outdated.',
      showCongestion: 'Show congestion in red', trafficCoverageNote: 'Traffic depends on TomTom coverage. No red line does not guarantee a clear road. Route travel time is calculated separately.', trafficLoading: 'Loading traffic…', trafficReady: 'Red: congestion · TomTom', trafficOff: 'Traffic hidden', trafficUnavailable: 'Traffic unavailable',
      importWaze: 'Import Waze location', wazeInstructions: 'In Waze, select the destination, choose Share and copy the link. Paste it here to use that point in Trazia.', wazeLinkLabel: 'Shared Waze link', useWazePoint: 'Use location in Trazia',
      tagline: 'A clearer way there', language: 'Language', demoMode: 'Loading Trazia map…', mapReadyLabel: 'Trazia map ready', mapSettings: 'Trazia map', locationOff: 'Location off', locationOn: 'Location enabled', menuSearch: 'Find a destination', menuReport: 'Reports', menuSettings: 'Settings', menuNote: 'Clear navigation, made by Trazia.', voiceEnabled: 'Navigation voice on', voiceMuted: 'Navigation voice muted', voiceStarting: 'Starting voice guidance.', voiceTest: 'Trazia voice guidance is on.', voicePlaybackError: 'Voice could not play. Check your phone volume.', home: 'Home', work: 'Work', addNew: 'New', newPlace: 'New place', recent: 'Recent', savedPlaceTitle: 'SAVED PLACES', savedPlaceName: 'Name', savedPlaceAddress: 'Address', savedPlaceIcon: 'Place icon', placeShop: 'Shop / business', placeClinic: 'Clinic', placeSchool: 'School', placeFavorite: 'Favorite', placeOther: 'Other place', chooseSavedLocation: 'Select the correct location to save this place.', confirmSavedLocation: 'Press Save and confirm the location to show its map icon.', savedLocationMissing: 'Location not found. Check the address and include the city.', savedLocationError: 'Address lookup failed. Please try again.', savePlace: 'Save', placeRequired: 'Enter a name and address.', placeSaved: 'Place saved.',
      vehicleLabel: 'Your vehicle', vehicleCar: 'Car', vehicleMotorcycle: 'Motorcycle', vehicleTruck: 'Truck', vehicleBicycle: 'Bicycle', vehicleMotorcycleNote: 'Motorcycle routes are in beta; check the directions in your area.', vehicleBicycleNote: 'Bicycle routes can vary depending on the roads available in your area.', vehicleTruckNote: 'Truck routes use standard weight and size limits; configure them for better accuracy.', vehicleTruckUnavailable: 'Could not calculate this route for the selected truck.', destinationMarkerLabel: 'Destination', view3d: 'Turn on 3D view', view2d: 'Turn on 2D view', compassSwitchNorth: 'Switch to north up', compassSwitchFollow: 'Follow vehicle heading', compassNorthActive: 'Compass: north up', compassFollowActive: 'Compass: following vehicle heading', musicConnect: 'Music', musicKicker: 'MUSIC', musicTitle: 'Choose your music app', musicIntegrationNote: 'Choose the music app to keep handy on the map. Tap its icon to open the app; playback and its controls remain in the music service.', musicOpen: 'Choose', musicChosen: 'Selected', musicOpening: 'Opening your music app…',
      destinationPrompt: 'Where would you like to go?', destinationPlaceholder: 'Address and municipality, business or place', findRoute: 'Find route', myLocation: 'My location', nearbyTitle: 'Explore along your route', clear: 'Clear', suggestionLoading: 'Searching addresses and places…', chooseAddress: 'Choose the correct address from the list to calculate your route.', autocompleteUnavailable: 'Address search is unavailable right now. Please try again.', autocompleteAttribution: '© OpenStreetMap contributors',
      gasStations: 'Gas stations', clinics: 'Clinics', pharmacies: 'Pharmacies', businesses: 'Businesses', suggestedRoute: 'TRAZIA ROUTE', sampleDestination: 'Your destination', lessTraffic: 'Suggested route', minutes: 'min', kilometers: 'km', estimatedTime: 'Estimated time', distance: 'Distance', avoidTolls: 'Avoid tolls', finishNavigation: 'Finish', sampleTraffic: 'Travel time estimate excludes traffic', sampleNote: 'Open data route; travel time does not adjust for traffic.', emptyRoute: 'Search for a destination to see your route.', arrivalTime: 'Arrival', routeDistanceLabel: 'Distance', routeDurationLabel: 'Time',
      communityTitle: 'Reports', communityCopy: 'Share road updates for 1 hour.', report: 'Report', sharedReportNote: 'Community report · visible for 1 hour', localReportScope: 'On this device only', localReports: 'Reports are saved on this device; they are not yet shared with other people.', worldReady: 'Designed to work anywhere', mapProviderLabel: 'Trazia map', sampleMap: 'Trazia map', reportsLayer: 'Reports', mapCaption: 'Trazia map · open OpenStreetMap data', mapCredits: 'Map credits',
      communityKicker: 'TRAZIA COMMUNITY', reportTitle: 'Reports', reportTypeLabel: 'Report type', incidentTraffic: 'Stopped traffic', incidentCrash: 'Crash', incidentHazard: 'Hazard or obstacle', incidentClosure: 'Road closure', incidentPlace: 'New or incorrect place', reportDetailsLabel: 'Short note (optional)', reportDetailsPlaceholder: 'Describe what you see', reportLocationNote: 'The report will be linked to the center of the map. In this version it is saved only on this device.', cancel: 'Cancel', publishReport: 'Save report',
      settingsKicker: 'SETTINGS', settingsTitle: 'Trazia map', settingsIntro: 'Trazia uses open OpenStreetMap data, its own design, and open-source routing.', themeLabel: 'Appearance', themeAuto: 'Automatic: light by day, dark at night', themeLight: 'Light', themeDark: 'Dark', mapDataNote: 'Base map: OpenStreetMap. Address suggestions use open data; routes and travel time are estimates without live traffic.', openStreetMapCredits: 'OpenStreetMap credits and licence', mapProviderLabel: 'OpenFreeMap service',
      noDestination: 'Enter or say a destination first.', demoRoute: 'The map is still loading. Try again in a few seconds.', noLocation: 'Your location could not be found. Allow location access and try again.', locationUnsupported: 'This browser does not provide location access.', routeLocationDenied: 'Allow your browser to share your location to start the route.', routeLocationUnavailable: 'Your location could not be detected. Tap My location and check your phone location settings.', routeNotFound: 'We could not find that route. Check the destination, including city and country.', routeApiError: 'The open routing service rejected the request. Try again shortly.', routeServiceError: 'Could not connect to the open routing service. Please try again.', voiceUnsupported: 'Voice recognition is not available here. You can type your destination.', voiceListening: 'Listening… say your destination.', voiceError: 'Could not hear the destination. Please try again.', searchError: 'Could not calculate that route. Check the destination and try again.', autocompleteNoResults: 'No matches found. Try another address or add the city.', vehicleChangedRoute: 'Vehicle changed. Search for the route again.',
      connecting: 'Searching places…', mapError: 'The open map could not load. Check your internet connection.', invalidCategory: 'No places were found in this area.', nearbyNeedsMaps: 'Turn on location to find places nearby.', clearPlaces: 'Places cleared from the map.', trafficEnabled: 'Reports are visible on the map.', trafficDisabled: 'Reports are hidden from the map.',
      reportSaved: 'Report published. It will be visible for 1 hour.', reportRequired: 'Could not save the report.', routeReady: 'Route calculated from OpenStreetMap. Travel time is an estimate and does not include live traffic.', navigationNeedsRoute: 'Find a route before starting navigation.', navigationLocation: 'Enable your location to start voice guidance.', navigationStarted: 'Voice guidance started.', navigationStopped: 'Navigation stopped.', navigationFollowRoute: 'Follow the marked route.', rerouting: 'You left the route. Recalculating…', rerouteReady: 'Route updated from your location.', rerouteFailed: 'Could not recalculate. Follow the purple line.', arrived: 'You have arrived at your destination.', nextInstruction: 'Next direction', demoNotice: 'The map needs an internet connection to load open map data.',
      categoryGas: 'Gas stations', categoryClinic: 'Clinics', categoryPharmacy: 'Pharmacies', categoryBusiness: 'Businesses', nearbyPlaces: 'Nearby places', rating: 'Rating', noAddress: 'Address unavailable', incidentSaved: 'Report',
    },
  };

  const categoryLabels = {
    gas: { es: 'gasolineras', en: 'gas stations', icon: '⛽' },
    clinic: { es: 'clínicas', en: 'clinics', icon: '✚' },
    pharmacy: { es: 'farmacias', en: 'pharmacies', icon: '✚' },
    business: { es: 'negocios', en: 'businesses', icon: '⌂' },
  };

  const incidentLabels = {
    traffic: { es: 'Tráfico', en: 'Traffic' }, police: { es: 'Policía', en: 'Police' },
    crash: { es: 'Accidente', en: 'Accident' }, security: { es: 'Alerta de seguridad', en: 'Safety alert' },
    hazard: { es: 'Peligro', en: 'Hazard' }, lane: { es: 'Carril bloqueado', en: 'Blocked lane' },
    closure: { es: 'Cierre', en: 'Closure' }, map: { es: 'Error en el mapa', en: 'Map error' },
    animal: { es: 'Animal', en: 'Animal' }, weather: { es: 'Mal tiempo', en: 'Bad weather' },
    fuel: { es: 'Precios de combustible', en: 'Fuel prices' }, assistance: { es: 'Asistencia en la ruta', en: 'Roadside assistance' },
    place: { es: 'Lugar', en: 'Place' },
  };
  let reportMenu;

  const state = {
    settings: loadPreferences(localStorage),
    language: localStorage.getItem('trazia:language') || (navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es'),
    theme: localStorage.getItem('trazia:theme') || 'auto',
    map: null,
    mapStyle: '',
    mapPaletteSignature: null,
    mapLoaded: false,
    mapReady: false,
    trafficEnabled: true,
    liveTrafficEnabled: localStorage.getItem('trazia:live-traffic') !== 'off',
    liveTrafficStatus: 'loading',
    liveTrafficReceivedAt: null,
    liveTrafficBlocked: false,
    currentPosition: null,
    lastLocationTimestamp: 0,
    lastLocationAccuracy: null,
    lastHeading: null,
    compassMode: localStorage.getItem('trazia:compass-mode') === 'north' ? 'north' : 'follow',
    followCamera: true,
    userMarker: null,
    userMarkerElement: null,
    navigationIcon: ['arrow','car','motorcycle','truck','bicycle'].includes(localStorage.getItem('trazia:navigation-icon')) ? localStorage.getItem('trazia:navigation-icon') : 'arrow',
    destinationMarker: null,
    is3d: true,
    currentSpeed: 0,
    lastSpeedFix: null,
    locationWatch: null,
    vehicleType: ['car', 'motorcycle', 'truck', 'bicycle'].includes(localStorage.getItem('trazia:vehicle-type')) ? localStorage.getItem('trazia:vehicle-type') : 'car',
    selectedDestination: null,
    activeDestination: null,
    autocompleteTimer: null,
    autocompleteController: null,
    autocompleteRequestId: 0,
    autocompletePredictions: [],
    autocompleteQuery: '',
    activeSuggestionIndex: -1,
    autocompleteUnavailable: false,
    musicService: ['spotify', 'apple', 'youtube', 'deezer'].includes(localStorage.getItem('trazia:music-service')) ? localStorage.getItem('trazia:music-service') : 'youtube',
    placeMarkers: [],
    speedCameraDataset: null,
    speedCameraPromise: null,
    announcedCameras: new Set(),
    speedCameraEventsBound: false,
    updatePending: false,
    nearbyRequestId: 0,
    nearbyCache: new Map(),
    cityBoundaryCache: new Map(),
    tomtomCache: new Map(),
    nominatimCache: new Map(),
    nominatimLastRequestAt: 0,
    reportMarkers: [],
    routeCoordinates: [],
    routeProgress: 0,
    routeRequestId: 0,
    routeSearchController: null,
    currentRoutes: [],
    route: null,
    routeDestination: '',
    avoidTolls: localStorage.getItem('trazia:avoid-tolls') === 'on',
    navigationSteps: [],
    activeStep: 0,
    isNavigating: false,
    offRouteFixes: 0,
    lastRerouteAt: 0,
    isRerouting: false,
    voiceEnabled: localStorage.getItem('trazia:voice') !== 'off',
    toastTimer: null,
    reports: [],
    legacyReports: readReports(),
    communityUser: null,
    reportService: null,
    reportFeed: null,
    reportStatus: 'connecting',
    reportSession: 0,
    publishingReport: false,
    savedPlaces: [],
    savedPlacesOwner: null,
    savedPlaceMarkers: [],
    savedPlaceSearchId: 0,
    recentDestinations: readRecentDestinations(),
    editingSavedPlaceId: null,
  };

  function t(key) {
    return copy[state.language]?.[key] || copy.es[key] || key;
  }

  function applyTheme() {
    const selected = ['auto', 'light', 'dark'].includes(state.theme) ? state.theme : 'auto';
    const hour = new Date().getHours();
    const effective = selected === 'auto' ? (hour >= 19 || hour < 6 ? 'dark' : 'light') : selected;
    document.documentElement.dataset.theme = effective;
    const themeSelect = $('#theme-select');
    if (themeSelect) themeSelect.value = selected;
    if (state.map && state.mapStyle !== mapStyleForTheme(effective)) setMapStyle(effective);
  }

  function applyLanguage(language) {
    state.language = language === 'en' ? 'en' : 'es';
    document.documentElement.lang = state.language;
    $('#language-select').value = state.language;
    const splashNote = $('#splash-note');
    if (splashNote) splashNote.textContent = state.language === 'es' ? 'Preparando tu ruta' : 'Getting your route ready';
    $$('[data-i18n]').forEach((element) => {
      const value = t(element.dataset.i18n);
      if (value) element.textContent = value;
    });
    $$('[data-i18n-placeholder]').forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    $$('[data-i18n-aria]').forEach((element) => {
      element.setAttribute('aria-label', t(element.dataset.i18nAria));
    });
    $('#language-select').setAttribute('aria-label', t('language'));
    document.title = state.language === 'es' ? 'Trazia · Tu ruta, más clara' : 'Trazia · A clearer way there';
    updateConnectionLabels();
    updateVoiceToggle();
    renderReportCount();
    renderSavedPlaces();
    updateVehiclePicker();
    update3dButton();
    updateCompassControl();
    updateMusicOptions();
    state.weatherBadge?.render();
    state.sos?.refreshLanguage();
    renderRecentDestinations();
    $('#toggle-map-credits').setAttribute('aria-label', t('mapCredits'));
    $('#toggle-map-credits').title = t('mapCredits');
    updateLiveTrafficStatus();
    localStorage.setItem('trazia:language', state.language);
  }

  function updateConnectionLabels() {
    statusText.textContent = state.mapReady ? t('mapReadyLabel') : t('demoMode');
    $('#map-label').textContent = t(state.mapReady ? 'mapReadyLabel' : 'sampleMap');
    $('#status-dot').classList.toggle('live', state.mapReady);
    $('#map-live-dot').classList.toggle('live', state.mapReady);
    $('#location-status').textContent = state.currentPosition ? t('locationOn') : t('locationOff');
  }

  const VOICE_MODES = ['normal', 'reduced', 'alerts', 'off'];
  state.voiceMode = VOICE_MODES.includes(localStorage.getItem('trazia:voice-mode'))
    ? localStorage.getItem('trazia:voice-mode')
    : (state.voiceEnabled ? 'normal' : 'off');
  state.voiceEnabled = state.voiceMode !== 'off';
  function voiceModeDialog() {
    let dialog = document.getElementById('trazia-voice-modes');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'trazia-voice-modes';
    dialog.style.cssText = 'border:0;border-radius:22px;background:#202226;color:white;width:min(92vw,430px);padding:24px;max-height:85vh;box-shadow:0 20px 70px #0009';
    dialog.innerHTML = '<h2 style="margin:0 0 20px;font:700 24px system-ui">Indicaciones de voz</h2>';
    const options = [
      ['normal','🔊 Normal'],['reduced','🔉 Menos conversación'],
      ['alerts','📢 Solo alertas'],['off','🔇 Desactivado']
    ];
    for (const [mode,label] of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = mode;
      button.style.cssText = 'display:block;width:100%;margin:10px 0;padding:17px;border:2px solid #59616b;border-radius:15px;background:#383d42;color:white;text-align:left;font:600 18px system-ui';
      button.addEventListener('click', () => {
        state.voiceMode = mode;
        state.voiceEnabled = mode !== 'off';
        localStorage.setItem('trazia:voice-mode',mode);
        localStorage.setItem('trazia:voice',state.voiceEnabled?'on':'off');
        if (!state.voiceEnabled) window.speechSynthesis?.cancel();
        updateVoiceToggle();
        dialog.close();
        if (state.voiceEnabled) speak(t('voiceTest'),true);
      });
      button.textContent = label;
      dialog.appendChild(button);
    }
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Cerrar';
    close.style.cssText = 'margin-top:12px;padding:10px;color:white;background:transparent;border:0;font:16px system-ui';
    close.addEventListener('click', () => dialog.close());
    dialog.appendChild(close);
    document.body.appendChild(dialog);
    return dialog;
  }
  function openVoiceModeDialog() {
    const dialog = voiceModeDialog();
    dialog.querySelectorAll('[data-mode]').forEach(button => {
      const active = button.dataset.mode === state.voiceMode;
      button.style.borderColor = active ? '#38bdf8' : '#59616b';
      button.setAttribute('aria-pressed',String(active));
    });
    dialog.showModal();
  }
  let lastReducedSpeech = 0;
  function shouldSpeakNavigation(text, preview) {
    if (preview) return true;
    if (state.voiceMode === 'off') return false;
    if (state.voiceMode === 'normal') return true;
    const alert = /alert|atenci[oó]n|peligro|c[aá]mara|escolar|reduzca|desv[ií]o|rerout|recalcul|accident|warning|precauci[oó]n|llegad|arrived/i.test(text);
    if (state.voiceMode === 'alerts') return alert;
    if (alert) return true;
    if (Date.now() - lastReducedSpeech < 45000) return false;
    lastReducedSpeech = Date.now();
    return true;
  }

  function updateVoiceToggle() {
    const button = $('#toggle-voice');
    if (!button) return;
    button.classList.toggle('is-muted', !state.voiceEnabled);
    button.setAttribute('aria-label', t(state.voiceEnabled ? 'voiceEnabled' : 'voiceMuted'));
    button.title = t(state.voiceEnabled ? 'voiceEnabled' : 'voiceMuted');
  }

  function updateVehiclePicker() {
    $$('.vehicle-choice').forEach((button) => {
      const selected = button.dataset.vehicle === state.vehicleType;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const noteKey = state.vehicleType === 'motorcycle' ? 'vehicleMotorcycleNote'
      : state.vehicleType === 'bicycle' ? 'vehicleBicycleNote'
        : state.vehicleType === 'truck' ? 'vehicleTruckNote' : '';
    const note = $('#vehicle-note');
    note.hidden = !noteKey;
    note.textContent = noteKey ? t(noteKey) : '';
  }

  function setVehicleType(type) {
    if (!['car', 'motorcycle', 'truck', 'bicycle'].includes(type)) return;
    if (state.vehicleType === type) return;
    state.vehicleType = type;
    localStorage.setItem('trazia:vehicle-type', type);
    updateVehiclePicker();
    updateNavigationIcon();
    if (state.route) {
      clearRoutePolylines();
      state.route = null;
      state.currentRoutes = [];
      state.navigationSteps = [];
      $('#route-duration').innerHTML = `— <small>${t('minutes')}</small>`;
      $('#route-distance').innerHTML = `— <small>${t('kilometers')}</small>`;
      $('#route-note').textContent = t('vehicleChangedRoute');
    }
  }

  function runSplashScreen() {
    const splash = $('#app-splash');
    const progress = $('#splash-progress');
    const valueLabel = $('#splash-progress-value');
    if (!splash || !progress || !valueLabel) return;
    window.clearInterval(state.splashTimer);
    window.clearTimeout(state.splashHideTimer);
    splash.hidden = false;
    splash.classList.remove('is-finishing');
    progress.style.width = '0%';
    valueLabel.textContent = '0%';
    $('#splash-progress-meter')?.setAttribute('aria-valuenow', '0');
    const startedAt = performance.now();
    const minimumTime = 2700;
    let value = 0;
    const timer = state.splashTimer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const loadingValue = Math.min(92, Math.round((elapsed / 2300) * 92));
      value = document.readyState === 'complete' && elapsed >= minimumTime ? 100 : Math.max(value, loadingValue);
      progress.style.width = `${value}%`;
      valueLabel.textContent = `${value}%`;
      const meter = $('#splash-progress-meter');
      meter?.setAttribute('aria-valuenow', String(value));
      if (value < 100) return;
      window.clearInterval(timer);
      splash.classList.add('is-finishing');
      state.splashHideTimer = window.setTimeout(() => { splash.hidden = true; }, 360);
    }, 24);
  }

  function update3dButton() {
    const button = $('#toggle-3d');
    if (!button) return;
    button.classList.toggle('active', state.is3d);
    button.setAttribute('aria-pressed', String(state.is3d));
    button.setAttribute('aria-label', t(state.is3d ? 'view2d' : 'view3d'));
    button.title = t(state.is3d ? 'view2d' : 'view3d');
    button.textContent = state.is3d ? '2D' : '3D';
  }

  function compassBearing() {
    return (state.isNavigating || state.compassMode === 'follow') && Number.isFinite(state.lastHeading) ? state.lastHeading : 0;
  }

  function updateCompassControl() {
    const button = $('#compass-control');
    if (!button) return;
    const rose = $('#compass-rose');
    const bearing = state.map?.getBearing() ?? 0;
    if (rose) rose.style.transform = `rotate(${-bearing}deg)`;
    const action = state.compassMode === 'follow' ? 'compassSwitchNorth' : 'compassSwitchFollow';
    button.dataset.mode = state.compassMode;
    button.setAttribute('aria-label', t(action));
    button.title = t(action);
  }

  const navPngCache = new Map();
  function navPng(type) {
    if (navPngCache.has(type)) return navPngCache.get(type);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    if (type === 'arrow') {
      // Compact perspective-style 3D navigation pointer, transparent PNG.
      ctx.save();
      ctx.translate(80, 80);
      ctx.scale(0.83, 0.83);
      ctx.translate(-80, -80);
      ctx.shadowColor = 'rgba(0, 18, 48, 0.65)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 9;
      ctx.beginPath();
      ctx.moveTo(80, 9); ctx.lineTo(144, 141); ctx.lineTo(80, 112); ctx.lineTo(16, 141); ctx.closePath();
      ctx.fillStyle = '#07346c'; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // Beveled side facets create depth without changing the forward heading.
      ctx.beginPath();
      ctx.moveTo(80, 9); ctx.lineTo(144, 141); ctx.lineTo(80, 112); ctx.closePath();
      const rightFacet = ctx.createLinearGradient(80, 30, 146, 140);
      rightFacet.addColorStop(0, '#42aaff');
      rightFacet.addColorStop(0.55, '#1364cc');
      rightFacet.addColorStop(1, '#07346c');
      ctx.fillStyle = rightFacet; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(80, 9); ctx.lineTo(80, 112); ctx.lineTo(16, 141); ctx.closePath();
      const leftFacet = ctx.createLinearGradient(15, 120, 95, 20);
      leftFacet.addColorStop(0, '#0b3e84');
      leftFacet.addColorStop(1, '#9bddff');
      ctx.fillStyle = leftFacet; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(80, 9); ctx.lineTo(144, 141); ctx.lineTo(80, 112); ctx.lineTo(16, 141); ctx.closePath();
      ctx.lineWidth = 6; ctx.strokeStyle = '#e8f8ff'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(80, 26); ctx.lineTo(80, 94);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.stroke();
      ctx.restore();
    } else {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '112px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      ctx.fillText(({car:'🚗',motorcycle:'🏍️',truck:'🚚',bicycle:'🚲'})[type] || '🚗',80,82);
    }
    const png = canvas.toDataURL('image/png');
    navPngCache.set(type,png);
    return png;
  }
  function updateNavigationIcon() {
    const marker = state.userMarkerElement?.querySelector('img');
    if (marker) {
      marker.src = navPng(state.navigationIcon);
      const size = state.navigationIcon === 'arrow' ? 38 : 48;
      marker.width = marker.height = size;
      marker.style.width = marker.style.height = size + 'px';
    }
    updateVehicleMarkerOrientation();
    $$('.navigation-icon-choice').forEach((button) => {
      const selected = button.dataset.navigationIcon === state.navigationIcon;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-pressed',String(selected));
      const img = button.querySelector('img');
      if (img) img.src = navPng(button.dataset.navigationIcon);
    });
  }
  function setNavigationIcon(type) {
    if (!['arrow','car','motorcycle','truck','bicycle'].includes(type)) return;
    state.navigationIcon = type;
    localStorage.setItem('trazia:navigation-icon',type);
    updateNavigationIcon();
  }
  $$('.navigation-icon-choice').forEach((button) => button.addEventListener('click',() => setNavigationIcon(button.dataset.navigationIcon)));
  updateNavigationIcon();

  function updateVehicleMarkerOrientation() {
    // MapLibre subtracts the map bearing when rotationAlignment is 'map'.
    // Thus the arrow and vehicle markers point along the GPS travel heading,
    // even while the map turns to keep the road ahead at the top of the screen.
    if (!state.userMarker) return;
    const heading = Number.isFinite(state.lastHeading) ? state.lastHeading : 0;
    state.userMarker.setRotation(((heading % 360) + 360) % 360);
  }

  function bearingBetween(from, to) {
    const radians = (degrees) => degrees * Math.PI / 180;
    const lat1 = radians(from.lat);
    const lat2 = radians(to.lat);
    const longitudeDelta = radians(to.lng - from.lng);
    const y = Math.sin(longitudeDelta) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(longitudeDelta);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function toggleCompassMode() {
    if (state.isNavigating) {
      state.compassMode = 'follow';
      localStorage.setItem('trazia:compass-mode', 'follow');
      showToast('Durante la navegación, el mapa sigue la dirección del vehículo.');
      return;
    }
    state.compassMode = state.compassMode === 'follow' ? 'north' : 'follow';
    state.followCamera = state.isNavigating || !state.route;
    localStorage.setItem('trazia:compass-mode', state.compassMode);
    if (state.mapReady && state.map) {
      const camera = { bearing: compassBearing(), duration: 500 };
      if (state.currentPosition && state.followCamera) {
        camera.center = [state.currentPosition.lng, state.currentPosition.lat];
        camera.zoom = state.map.getZoom();
        camera.pitch = state.is3d ? 55 : 0;
        camera.offset = mobileMapOffset();
      }
      state.map.easeTo(camera);
    }
    updateCompassControl();
    showToast(t(state.compassMode === 'north' ? 'compassNorthActive' : 'compassFollowActive'));
  }

  function updateMusicOptions() {
    $$('.music-service').forEach((button) => {
      const selected = button.dataset.musicService === state.musicService;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.querySelector('.music-service-action').textContent = t(selected ? 'musicChosen' : 'musicOpen');
    });
    musicDock?.refresh();
  }

  function openMusicService(service, event) {
    if (!['spotify', 'apple', 'youtube', 'deezer'].includes(service)) return;
    state.musicService = service;
    try { localStorage.setItem('trazia:music-service', service); }
    catch { showToast(state.language === 'es' ? 'La elección se usará en esta sesión.' : 'Your choice will be used for this session.'); }
    updateMusicOptions();
    closeDialog(musicDialog);
    musicDock?.open(event);
  }

  function setMap3d(enabled) {
    state.is3d = Boolean(enabled);
    if (state.map) {
      if (state.is3d && state.currentPosition && (state.map.getZoom() || 0) < 14) state.map.setZoom(17);
      if (state.is3d) removeTraziaBuildingLayers();
      state.map.easeTo({ pitch: state.is3d ? 55 : 0, duration: 420, offset: mobileMapOffset() });
    }
    update3dButton();
  }

  function mobileMapOffset() {
    return [0, 0];
  }

  function collapseMobilePanel() {
    if (!window.matchMedia('(max-width: 820px)').matches) return;
    $('.side-panel').classList.remove('expanded');
    app.classList.remove('panel-expanded');
    $('#toggle-panel').setAttribute('aria-expanded', 'false');
    window.setTimeout(() => state.map?.resize(), 300);
  }

  function closeDestinationSuggestions() {
    const list = $('#destination-suggestions');
    list.hidden = true;
    list.replaceChildren();
    destinationInput.setAttribute('aria-expanded', 'false');
    destinationInput.removeAttribute('aria-activedescendant');
    state.activeSuggestionIndex = -1;
  }

  function showSuggestionMessage(message, loading = false) {
    const list = $('#destination-suggestions');
    list.replaceChildren();
    state.autocompletePredictions = [];
    state.activeSuggestionIndex = -1;
    destinationInput.removeAttribute('aria-activedescendant');
    const row = document.createElement('div');
    row.className = `suggestion-loading${loading ? ' is-loading' : ''}`;
    row.setAttribute('role', 'status');
    row.textContent = message;
    list.append(row);
    list.hidden = false;
    destinationInput.setAttribute('aria-expanded', 'true');
  }

  function renderDestinationSuggestions(suggestions) {
    const list = $('#destination-suggestions');
    list.replaceChildren();
    state.autocompletePredictions = suggestions.slice(0, 5);
    state.activeSuggestionIndex = -1;
    if (!state.autocompletePredictions.length) {
      showSuggestionMessage(t('autocompleteNoResults'));
      appendSuggestionAttribution(list);
      return;
    }
    state.autocompletePredictions.forEach((feature, index) => {
      const parts = photonFeatureParts(feature.properties || {}, state.autocompleteQuery);
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `destination-suggestion-${index}`;
      button.className = 'destination-suggestion';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', 'false');
      const icon = document.createElement('span');
      icon.className = 'destination-suggestion-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 10.1c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/></svg>';
      const copyBlock = document.createElement('span');
      copyBlock.className = 'destination-suggestion-copy';
      const main = document.createElement('span');
      main.className = 'destination-suggestion-main';
      main.textContent = parts.main;
      copyBlock.append(main);
      const approximate = /#/.test(state.autocompleteQuery) && !feature.properties?.housenumber;
      const secondaryText = [feature.properties?.sharedLocation ? (state.language === 'es' ? 'Ubicación del enlace compartido; confirmá el acceso' : 'Shared link location; confirm the entrance') : '', feature.properties?.nearbyFor ? (state.language === 'es' ? 'Dirección cercana; no es el número solicitado' : 'Nearby address; not the requested house number') : '', feature.properties?.geocoder === 'igac' ? (state.language === 'es' ? 'IGAC · Referencia del predio; acceso por confirmar' : 'IGAC · Parcel reference; entrance unconfirmed') : '', feature.properties?.geocoder === 'idesc' ? `IDESC Cali · ${feature.properties.certification || (state.language === 'es' ? 'Estado no indicado' : 'Status unavailable')}` : '',feature.properties?.geocoder === 'esri' ? (state.language === 'es' ? 'Dirección localizada · punto aproximado' : 'Address found · approximate point') : '', approximate ? (state.language === 'es' ? 'Calle encontrada; número exacto no disponible' : 'Street found; exact house number unavailable') : '', parts.secondary].filter(Boolean).join(' · ');
      if (secondaryText) {
        const secondary = document.createElement('span');
        secondary.className = 'destination-suggestion-secondary';
        secondary.textContent = secondaryText;
        copyBlock.append(secondary);
      }
      button.append(icon, copyBlock);
      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => { void selectDestinationSuggestion(index); });
      list.append(button);
    });
    appendSuggestionAttribution(list);
    list.hidden = false;
    destinationInput.setAttribute('aria-expanded', 'true');
  }

  function appendSuggestionAttribution(list) {
    const attribution = document.createElement('div');
    attribution.className = 'suggestion-attribution';
    attribution.textContent = state.autocompletePredictions.some((feature) => feature.properties?.geocoder === 'tomtom') ? 'Búsqueda © TomTom' : state.autocompletePredictions.some((feature) => feature.properties?.geocoder === 'esri') ? 'Geocodificación © Esri' : t('autocompleteAttribution');
    if (state.autocompletePredictions.some((feature) => feature.properties?.geocoder === 'idesc')) {
      const source = document.createElement('a');
      source.href = 'https://mg-idesc.cali.gov.co/geonetwork/geonetwork/api/records/26efce58-37c7-44e4-9386-b925c92d17d1';
      source.target = '_blank'; source.rel = 'noopener noreferrer';
      source.textContent = 'Direcciones: Planeación / IDESC Cali · CC BY-SA 4.0';
      attribution.replaceChildren(source);
    }
    if (state.autocompletePredictions.some(feature => feature.properties?.geocoder === 'igac')) {
      const source = document.createElement('a');
      const id = state.autocompletePredictions.find(feature => feature.properties?.geocoder === 'igac').properties.sourceItem;
      source.href = `https://www.arcgis.com/home/item.html?id=${id}`;
      source.target = '_blank'; source.rel = 'noopener noreferrer';
      source.textContent = 'Catastro público IGAC · CC BY-SA 4.0'; attribution.replaceChildren(source);
    }
    if (state.autocompletePredictions.some(feature => feature.properties?.sharedLocation)) {
      const source = document.createElement('a');
      const shared = state.autocompletePredictions.find(feature => feature.properties?.sharedLocation);
      const sourceUrl = shared.properties.sourceUrl;
      source.href = typeof sourceUrl === 'string' && sourceUrl.startsWith('https://www.waze.com/') ? sourceUrl : 'https://www.waze.com/live-map';
      source.target = '_blank'; source.rel = 'noopener noreferrer';
      source.textContent = state.language === 'es' ? 'Ubicación aportada mediante enlace compartido' : 'Location provided through a shared link';
      attribution.replaceChildren(source);
    }
    list.append(attribution);
  }

  function setActiveDestinationSuggestion(index) {
    const buttons = $$('#destination-suggestions .destination-suggestion');
    if (!buttons.length) return;
    state.activeSuggestionIndex = (index + buttons.length) % buttons.length;
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === state.activeSuggestionIndex;
      button.setAttribute('aria-selected', String(active));
      if (active) {
        destinationInput.setAttribute('aria-activedescendant', button.id);
        button.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function wazeImportError(error) {
    return error.code === 'WAZE_NO_COORDINATES'
      ? (state.language === 'es' ? 'El enlace no contiene un punto importable. Abre Waze, selecciona la ubicación en el mapa y comparte el enlace del lugar, no solo la búsqueda.' : 'This link has no importable point. In Waze, select the location on the map and share the place link, not just the search.')
      : (state.language === 'es' ? 'El enlace de Waze contiene coordenadas inválidas. Comparte de nuevo la ubicación.' : 'The Waze link has invalid coordinates. Share the location again.');
  }

  function setWazeDestination(imported) {
    const { lat, lng } = imported.location;
    const label = imported.label || `${state.language === 'es' ? 'Ubicación de Waze' : 'Waze location'} · ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    state.selectedDestination = { label, location: imported.location, wazeLink: imported.link };
    destinationInput.value = label;
    closeDestinationSuggestions();
    const message = imported.approximate
      ? (state.language === 'es' ? 'Punto aproximado importado de Waze. Pulsa Buscar ruta para continuar.' : 'Approximate point imported from Waze. Select Find route to continue.')
      : (state.language === 'es' ? 'Coordenadas importadas de Waze. Pulsa Buscar ruta para continuar.' : 'Coordinates imported from Waze. Select Find route to continue.');
    $('#route-note').textContent = message;
    showToast(message);
  }

  function handleDestinationInput() {
    state.selectedDestination = null;
    state.autocompleteRequestId += 1;
    const requestId = state.autocompleteRequestId;
    window.clearTimeout(state.autocompleteTimer);
    state.autocompleteController?.abort();
    const query = destinationInput.value.trim();
    try {
      const imported = parseWazeLocation(query);
      if (imported) {
        setWazeDestination(imported);
        return;
      }
    } catch (error) {
      showSuggestionMessage(wazeImportError(error));
      return;
    }
    if (query.length < 3) {
      closeDestinationSuggestions();
      return;
    }
    showSuggestionMessage(t('suggestionLoading'), true);
    state.autocompleteTimer = window.setTimeout(() => { void fetchDestinationSuggestions(query, requestId); }, 650);
  }

  async function fetchDestinationSuggestions(query, requestId) {
    const controller = new AbortController();
    state.autocompleteController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const features = await findDestinationCandidates(query, state.currentPosition, controller.signal);
      if (requestId !== state.autocompleteRequestId || destinationInput.value.trim() !== query) return;
      state.autocompleteQuery = query;
      renderDestinationSuggestions(features);
    } catch (error) {
      if (requestId !== state.autocompleteRequestId || controller.signal.aborted && destinationInput.value.trim() !== query) return;
      console.error('Trazia could not load open address suggestions:', error);
      showSuggestionMessage(t('autocompleteUnavailable'));
      appendSuggestionAttribution($('#destination-suggestions'));
    } finally {
      window.clearTimeout(timeout);
      if (state.autocompleteController === controller) state.autocompleteController = null;
    }
  }

  function selectDestinationSuggestion(index) {
    const feature = state.autocompletePredictions[index];
    if (!feature?.geometry?.coordinates) return;
    state.autocompleteRequestId += 1;
    const [lng, lat] = feature.geometry.coordinates;
    const parts = photonFeatureParts(feature.properties || {}, state.autocompleteQuery);
    state.selectedDestination = { label: parts.label, location: { lat, lng }, temporary: ['esri', 'tomtom', 'idesc', 'igac'].includes(feature.properties?.geocoder), query: state.autocompleteQuery, approximate: Boolean(feature.properties?.approximate), nearbyAddress: Boolean(feature.properties?.nearbyFor) };
    destinationInput.value = parts.label;
    closeDestinationSuggestions();
    collapseMobilePanel();
    if (state.isNavigating) setNavigationView(true);
    void searchRoute({ automatic: state.isNavigating });
  }

  function photonFeatureParts(properties, query = '') {
    if (['esri', 'tomtom'].includes(properties.geocoder) && properties.street && properties.housenumber) {
      const main = `${properties.street} # ${properties.housenumber}`;
      const secondary = [properties.district, properties.city, properties.state, properties.country].filter(Boolean).join(', ');
      return { main, secondary, label: [main, secondary].filter(Boolean).join(', ') };
    }
    if (['idesc', 'igac', 'shared-location'].includes(properties.geocoder)) {
      const main = properties.fullAddress || properties.name;
      const secondary = [properties.district, properties.city, properties.state, properties.country].filter(Boolean).join(', ');
      return { main, secondary, label: [main, secondary].filter(Boolean).join(', ') };
    }
    const streetAddress = [properties.housenumber, properties.street].filter(Boolean).join(' ');
    const locality = [properties.district, properties.city, properties.county, properties.state, properties.country].filter(Boolean);
    const addressQuery = /#|\b(?:cra|cr|kr|carrera|cll|cl|calle|av|avda|avenida|diag|diagonal|trans|transversal)\.?(?=\d|[^\p{L}\p{N}_]|$)/iu.test(query) && /\d/.test(query);
    const main = addressQuery && streetAddress
      ? streetAddress
      : properties.name || streetAddress || properties.city || properties.state || properties.country || '';
    const orderedParts = [main, streetAddress, properties.name, ...locality].filter(Boolean);
    const uniqueParts = orderedParts.filter((part, index) => orderedParts.findIndex((candidate) => normalizeGeocodeText(candidate) === normalizeGeocodeText(part)) === index);
    const secondary = uniqueParts.slice(1).join(', ');
    const label = uniqueParts.join(', ');
    return { main: main || label, secondary, label: label || main };
  }

  function normalizeGeocodeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\b(?:carrera|cra|cr|kr)\.?(?=\d|[^\p{L}\p{N}_]|$)/gu, ' carrera ')
      .replace(/\b(?:calle|cll|cl)\.?(?=\d|[^\p{L}\p{N}_]|$)/gu, ' calle ')
      .replace(/\b(?:av|avda)\b\.?/g, ' avenida ')
      .replace(/\bdiag\b\.?/g, ' diagonal ')
      .replace(/\btrans\b\.?/g, ' transversal ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeColombianAddressQuery(value) {
    return String(value || '')
      .replace(/\s*[-–—]\s*#\s*/g, ' # ')
      .replace(/\b(?:cra|cr|kr)\.?(?=\d|[^\p{L}\p{N}_]|$)/giu, 'carrera ')
      .replace(/\b(?:cll|cl)\.?(?=\d|[^\p{L}\p{N}_]|$)/giu, 'calle ')
      .replace(/\b(carrera|calle)\.?(?=\d)/gi, '$1 ')
      .replace(/\b(?:av|avda)\b\.?/gi, 'avenida')
      .replace(/\bdiag\b\.?/gi, 'diagonal')
      .replace(/\b(?:trans|transv)\b\.?/gi, 'transversal')
      .replace(/\bno\.?\s*/gi, ' ')
      .replace(/#/g, ' ')
      .replace(/[.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function colombianAddressQueryVariants(value, includeCountry = false) {
    const raw = String(value || '').trim().replace(/\s*[-–—]\s*#\s*/g, ' # ');
    const normalized = normalizeColombianAddressQuery(raw);
    const variants = [normalized, raw];
    const hashIndex = raw.indexOf('#');
    if (hashIndex >= 0) {
      const beforeHash = normalizeColombianAddressQuery(raw.slice(0, hashIndex));
      // Keep the house number after #. Removing leading digits here used to
      // discard the most useful part of Colombian addresses such as 45-53.
      const afterHash = raw.slice(hashIndex + 1).split(/[;,]/, 1)[0].trim().replace(/^(?:no\.?\s*)/i, '');
      if (beforeHash && afterHash) variants.push(`${beforeHash} ${afterHash}`);
      else if (beforeHash) variants.push(beforeHash);
      const road = beforeHash.match(/\b(?:carrera|calle|avenida|diagonal|transversal)\s+[\p{L}\p{N}]+/iu)?.[0];
      if (road && afterHash) variants.push(`${road} ${afterHash}`);
    }
    if (includeCountry && normalized && !/\bcolombia\b/i.test(normalized)) variants.push(`${normalized} Colombia`);
    return [...new Set(variants.filter(Boolean))];
  }

  function parseColombianStructuredAddress(value) {
    const raw = String(value || '').trim().replace(/\s*[-–—]\s*#\s*/g, ' # ');
    const hashIndex = raw.indexOf('#');
    if (hashIndex < 0) return [];
    const street = normalizeColombianAddressQuery(raw.slice(0, hashIndex).split(',')[0]);
    const tail = raw.slice(hashIndex + 1).trim();
    const houseMatch = tail.match(/^(\d+[a-z]?(?:\s*[-/]\s*\d+[a-z]?)?)/i);
    if (!street || !houseMatch) return [];
    const houseNumber = houseMatch[1].replace(/\s+/g, '');
    const commaIndex = raw.indexOf(',');
    const explicitLocalities = commaIndex >= 0 ? raw.slice(commaIndex + 1).split(',').map((part) => part.trim()).filter(Boolean) : [];
    const trailingLocality = tail.slice(houseMatch[0].length).split(',')[0].trim();
    const city = explicitLocalities.find((part) => !/^(?:colombia|valle del cauca|cauca|departamento de .+)$/i.test(part))
      || (/^[\p{L}][\p{L}\s.-]*$/u.test(trailingLocality) && !/^colombia$/i.test(trailingLocality) ? trailingLocality : '');
    const state = explicitLocalities.find((part) => /\bvalle del cauca\b/i.test(part)) || '';
    const addresses = [{ street, houseNumber, city, state }];

    // Some Colombian address conventions write the crossing road before #.
    // Search that common interpretation as a second structured candidate.
    const road = street.match(/^(carrera|calle|avenida|diagonal|transversal)\s+[\p{L}\p{N}]+/iu)?.[0];
    const suffix = road ? street.slice(road.length).trim() : '';
    const suffixNumber = suffix.match(/\d+[a-z]?/i)?.[0];
    const firstHouseNumber = houseNumber.match(/^\d+/)?.[0];
    if (road && suffixNumber && firstHouseNumber) {
      addresses.push({ street: road, houseNumber: `${suffixNumber}-${firstHouseNumber}`, city, state });
    }
    return addresses;
  }

  function isWithinColombiaSearchArea(point) {
    return Boolean(point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
      && point.lng >= COLOMBIA_SEARCH_BOUNDS.west && point.lng <= COLOMBIA_SEARCH_BOUNDS.east
      && point.lat >= COLOMBIA_SEARCH_BOUNDS.south && point.lat <= COLOMBIA_SEARCH_BOUNDS.north);
  }

  function isColombiaFeature(feature) {
    const properties = feature?.properties || {};
    const countryCode = String(properties.countrycode || properties.country_code || '').toLowerCase();
    if (countryCode) return countryCode === 'co';
    const country = normalizeGeocodeText(properties.country || '');
    if (country) return country.includes('colombia');
    const [lng, lat] = feature?.geometry?.coordinates || [];
    return isWithinColombiaSearchArea({ lat, lng });
  }

  function photonFeatureSearchText(feature) {
    const properties = feature.properties || {};
    return normalizeGeocodeText([
      properties.name,
      properties.housenumber,
      properties.street,
      properties.postcode,
      properties.district,
      properties.locality,
      properties.city,
      properties.county,
      properties.state,
      properties.country,
      properties.osm_value,
    ].filter(Boolean).join(' '));
  }

  function rankPhotonFeatures(features, query, origin) {
    const normalizedQuery = normalizeGeocodeText(query);
    const ignoredWords = new Set(['a', 'al', 'de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'the', 'and']);
    const queryTokens = [...new Set(normalizedQuery.split(' ').filter((token) => token && !ignoredWords.has(token)))];
    const isStreetAddress = /#|\b(?:cra|cr|kr|carrera|cll|cl|calle|av|avda|avenida|diag|diagonal|trans|transversal)\.?(?=\d|[^\p{L}\p{N}_]|$)/iu.test(query) && /\d/.test(query);
    const streetTokens = normalizedQuery.match(/\b(?:carrera|calle|avenida|diagonal|transversal)\s+[\p{L}\p{N}]+/iu)?.[0]?.split(' ') || [];
    const houseNumberTokens = String(query).includes('#')
      ? normalizeGeocodeText(String(query).split('#').slice(1).join(' ')).split(' ').filter((token) => /\d/.test(token))
      : [];
    const ranked = features.map((feature) => {
      const candidateText = photonFeatureSearchText(feature);
      const candidateTokens = new Set(candidateText.split(' '));
      const matchedTokens = queryTokens.filter((token) => candidateTokens.has(token) || (token.length >= 4 && [...candidateTokens].some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))));
      // Street numbers and suffixes must match exactly: 83, 83B and 83B1 are different roads.
      const matchingStreetTokens = streetTokens.filter((token) => candidateTokens.has(token));
      if (!matchedTokens.length || (isStreetAddress && streetTokens.length && matchingStreetTokens.length !== streetTokens.length)) return null;
      const coverage = matchedTokens.length / Math.max(1, queryTokens.length);
      if (isStreetAddress && !streetTokens.length && coverage < 0.3) return null;
      const phraseMatch = normalizedQuery.length >= 4 && candidateText.includes(normalizedQuery);
      let score = coverage * 100 + matchedTokens.length * 2 + (phraseMatch ? 30 : 0);
      if (isStreetAddress && streetTokens.length) score += 40;
      if (houseNumberTokens.length) {
        const numberMatches = houseNumberTokens.filter((token) => candidateTokens.has(token)).length;
        score += numberMatches === houseNumberTokens.length ? 35 : numberMatches * 8;
      }
      const [lng, lat] = feature.geometry?.coordinates || [];
      if (origin && Number.isFinite(lat) && Number.isFinite(lng)) {
        const proximity = 8 - (distanceMeters(origin, { lat, lng }) / 10000) * 2;
        score += Math.max(-12, proximity);
      }
      return { feature, score, label: photonFeatureParts(feature.properties || {}, query).label };
    }).filter(Boolean);
    ranked.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, state.language));
    const seen = new Set();
    return ranked.filter(({ feature, label }) => {
      const [lng, lat] = feature.geometry?.coordinates || [];
      const key = `${normalizeGeocodeText(label)}:${Number(lng).toFixed(4)}:${Number(lat).toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(({ feature }) => feature);
  }

  function makePhotonSearchParams(query, center, limit = 10) {
    const params = new URLSearchParams({ q: query, limit: String(limit), lang: photonLanguage(), countrycode: 'CO' });
    if (isWithinColombiaSearchArea(center)) {
      params.set('lat', String(center.lat));
      params.set('lon', String(center.lng));
      params.set('zoom', '10');
      params.set('location_bias_scale', '0.1');
    }
    return params;
  }

  async function findDestinationCandidates(query, center = state.currentPosition, signal, { allowNominatimFallback = false } = {}) {
    const baseQuery = String(query || '').trim().replace(/\s*[-–—]\s*#\s*/g, ' # ');
    const shared = findSearchLocations(baseQuery);
    if (shared.length) return shared;
    const variants = colombianAddressQueryVariants(baseQuery, allowNominatimFallback);
    const usableCenter = isWithinColombiaSearchArea(center) ? center : null;
    const found = [];
    let matches = [];
    let lastError = null;
    let completedSearch = false;
    try {
      const local = await findLocalCaliCandidates(baseQuery, { center: usableCenter, signal, fetchFn: (url, options) => fetchTimed(url, options, 2500) });
      if (local.length) return local;
    } catch (error) {
      if (signal?.aborted) throw error;
      // Keep live official/commercial providers if a snapshot is missing or corrupt.
    }
    try {
      state.idescCache ||= new Map();
      const key = `${baseQuery.toLowerCase()}:${usableCenter ? [usableCenter.lat.toFixed(2), usableCenter.lng.toFixed(2)].join(',') : 'none'}`;
      const cached = state.idescCache.get(key);
      let addresses = cached && cached.expiresAt > Date.now() ? cached.features : null;
      if (!addresses) {
        addresses = await findCaliCandidates(baseQuery, { center: usableCenter, signal, fetchFn: (url, options) => fetchTimed(url, options, 4500) });
        if (state.idescCache.size >= 50) state.idescCache.delete(state.idescCache.keys().next().value);
        state.idescCache.set(key, { features: addresses, expiresAt: Date.now() + 5 * 60 * 1000 });
      }
      if (addresses.length) return addresses;
    } catch (error) {
      if (signal?.aborted) throw error;
      // A slow/unavailable municipal service must not block other providers.
    }
    try {
      state.igacCache ||= new Map();
      const key = baseQuery.toLowerCase();
      const cached = state.igacCache.get(key);
      let addresses = cached && cached.expiresAt > Date.now() ? cached.features : null;
      if (!addresses) {
        addresses = await findIgacCandidates(baseQuery, { signal, fetchFn: (url, options) => fetchTimed(url, options, 6500) });
        if (state.igacCache.size >= 50) state.igacCache.delete(state.igacCache.keys().next().value);
        state.igacCache.set(key, { features: addresses, expiresAt: Date.now() + 5 * 60 * 1000 });
      }
      if (addresses.length) return addresses;
    } catch (error) {
      if (signal?.aborted) throw error;
    }
    const tomtomKey = window.TRAZIA_CONFIG?.tomtomApiKey;
    if (tomtomKey) {
      try {
        const cacheKey = `${state.language}:${baseQuery.toLowerCase()}:${usableCenter ? [usableCenter.lat.toFixed(2), usableCenter.lng.toFixed(2)].join(',') : 'default'}`;
        const cached = state.tomtomCache.get(cacheKey);
        let addresses = cached && cached.expiresAt > Date.now() ? cached.features : null;
        if (!addresses) {
          addresses = await findTomtomCandidates(baseQuery, {
            apiKey: tomtomKey, center: usableCenter || { lng: DEFAULT_MAP_CENTER[0], lat: DEFAULT_MAP_CENTER[1] },
            signal, language: state.language, expectedAddress: parseColombianStructuredAddress(baseQuery)[0],
            fetchFn: (url, options) => fetchTimed(url, options, 5000),
          });
          if (state.tomtomCache.size >= 50) state.tomtomCache.delete(state.tomtomCache.keys().next().value);
          state.tomtomCache.set(cacheKey, { features: addresses, expiresAt: Date.now() + 5 * 60 * 1000 });
        }
        completedSearch = true;
        if (addresses.length) return addresses;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    // Address lookup is temporary: Esri results are used for the current map
    // and route only. Persist the user's original query, never returned data.
    if (parseColombianStructuredAddress(baseQuery).length) {
      try {
        const addresses = await findArcgisCandidates(baseQuery, usableCenter, signal);
        if (addresses.length) return addresses;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    // Free-text search handles abbreviations without relying on the public
    // structured endpoint, which can fail for Colombian house numbers.
    for (const variant of variants.slice(0, 2)) {
      try {
        const payload = await fetchPhotonFeatures(makePhotonSearchParams(variant, usableCenter), signal, 3000);
        completedSearch = true;
        found.push(...payload.features.filter(isColombiaFeature));
        matches = rankPhotonFeatures(found, baseQuery, usableCenter);
        if (matches.length) break;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    // Nominatim permits explicit searches, never per-keystroke autocomplete.
    if (allowNominatimFallback && !matches.length) {
      try {
        const fallbackMatches = await findNominatimCandidates(baseQuery, signal);
        completedSearch = true;
        matches = rankPhotonFeatures(fallbackMatches, baseQuery, usableCenter);
        if (!matches.length) matches = fallbackMatches;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    // Keep verified neighboring doors distinct from the unlocated house number.
    const structured = parseColombianStructuredAddress(baseQuery)[0];
    if (structured && !matches.some((feature) => feature.properties?.housenumber)) {
      try {
        state.nearbyAddressCache ||= new Map();
        const key = `${baseQuery.toLowerCase()}:${usableCenter ? [usableCenter.lat.toFixed(2), usableCenter.lng.toFixed(2)].join(',') : 'none'}`;
        const cached = state.nearbyAddressCache.get(key);
        let nearby = cached && cached.expiresAt > Date.now() ? cached.features : null;
        if (!nearby) {
          nearby = await findNearbyCaliCandidates(baseQuery, {center: usableCenter, signal, fetchFn: (url, options) => fetchTimed(url, options, 3500)});
          if (state.nearbyAddressCache.size >= 50) state.nearbyAddressCache.delete(state.nearbyAddressCache.keys().next().value);
          state.nearbyAddressCache.set(key, {features: nearby, expiresAt: Date.now() + 5 * 60000});
        }
        if (nearby.length) { matches = [...nearby, ...matches].slice(0, 5); completedSearch = true; }
      } catch (error) { if (signal?.aborted) throw error; }
    }
    // Many streets are mapped without individual house numbers. Offer the
    // actual street as an explicitly labelled suggestion, never invent a pin
    // for a house number that the provider could not locate.
    if (!matches.length) {
      const address = parseColombianStructuredAddress(baseQuery)[0];
      if (address) {
        const streetQuery = [address.street, address.city, address.state].filter(Boolean).join(', ');
        try {
          const payload = await fetchPhotonFeatures(makePhotonSearchParams(streetQuery, usableCenter), signal, 3000);
          completedSearch = true;
          matches = rankPhotonFeatures(payload.features.filter(isColombiaFeature), baseQuery, usableCenter);
        } catch (error) {
          if (signal?.aborted) throw error;
          lastError = error;
        }
      }
    }
    if (!matches.length && !completedSearch && lastError) throw lastError;
    return matches;
  }

  async function findArcgisCandidates(query, center, signal) {
    const address = parseColombianStructuredAddress(query)[0];
    if (!address) return [];
    const params = new URLSearchParams({
      SingleLine: [address.street + ' # ' + address.houseNumber, address.city, address.state, 'Colombia'].filter(Boolean).join(', '),
      f: 'json', sourceCountry: 'COL', forStorage: 'false', maxLocations: '5', outSR: '4326',
      outFields: 'Addr_type,ShortLabel,City,Region,Nbrhd,Country',
    });
    const bias = center || { lng: DEFAULT_MAP_CENTER[0], lat: DEFAULT_MAP_CENTER[1] };
    params.set('location', `${bias.lng},${bias.lat}`);
    const response = await fetchTimed(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${params}`, {
      signal, headers: { Accept: 'application/json' },
    }, 3000);
    if (!response.ok) throw new Error(`Esri ${response.status}`);
    const payload = await response.json();
    if (payload.error || !Array.isArray(payload.candidates)) throw new Error('Esri address search unavailable');
    const required = normalizeGeocodeText(`${address.street} ${address.houseNumber}`).split(' ');
    return payload.candidates.filter((candidate) => {
      const attributes = candidate.attributes || {};
      const tokens = new Set(normalizeGeocodeText(attributes.ShortLabel || candidate.address).split(' '));
      return candidate.score >= 95 && ['PointAddress', 'StreetAddress'].includes(attributes.Addr_type)
        && attributes.Country === 'COL' && required.every((token) => tokens.has(token))
        && (!address.city || normalizeGeocodeText(attributes.City) === normalizeGeocodeText(address.city))
        && Number.isFinite(candidate.location?.x) && Number.isFinite(candidate.location?.y);
    }).map((candidate) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [candidate.location.x, candidate.location.y] },
      properties: {
        geocoder: 'esri', street: address.street, housenumber: address.houseNumber,
        district: candidate.attributes.Nbrhd, city: candidate.attributes.City,
        state: candidate.attributes.Region, country: 'Colombia', countrycode: 'CO',
      },
    }));
  }

  function fetchTimed(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const externalSignal = options.signal;
    const abortFromCaller = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => {
      window.clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromCaller);
    });
  }

  function isLocalApiHost() {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }

  function waitWithSignal(milliseconds, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const timer = window.setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, milliseconds);
      const abort = () => {
        window.clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  async function findNominatimCandidates(query, signal) {
    const key = normalizeGeocodeText(query);
    const cached = state.nominatimCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.features;
    const normalizedQuery = normalizeColombianAddressQuery(query);
    const countryQuery = /\bcolombia\b/i.test(normalizedQuery) ? normalizedQuery : `${normalizedQuery} Colombia`;
    const common = { countrycodes: 'co', format: 'jsonv2', addressdetails: '1', limit: '8', 'accept-language': state.language === 'es' ? 'es' : 'en' };
    const freeformParams = new URLSearchParams({ ...common, q: countryQuery });
    const address = parseColombianStructuredAddress(query)[0];
    const requests = [];
    if (address) {
      const structuredParams = new URLSearchParams({ ...common, street: `${address.houseNumber} ${address.street}` });
      if (address.city) structuredParams.set('city', address.city);
      if (address.state) structuredParams.set('state', address.state);
      requests.push(structuredParams);
    }
    requests.push(freeformParams);
    let results = [];
    let lastError = null;
    for (const params of requests) {
      const wait = Math.max(0, 1100 - (Date.now() - state.nominatimLastRequestAt));
      if (wait) await waitWithSignal(wait, signal);
      state.nominatimLastRequestAt = Date.now();
      try {
        const response = await fetchTimed(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal,
          headers: { Accept: 'application/json' },
        }, 12000);
        if (!response.ok) throw new Error(`Nominatim ${response.status}`);
        results = await response.json();
        if (!Array.isArray(results)) throw new Error('Nominatim returned an invalid response');
        lastError = null;
        if (results.length) break;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    const features = (Array.isArray(results) ? results : []).map((result) => {
      const address = result.address || {};
      const properties = {
        name: result.name || result.type || '',
        housenumber: address.house_number || '',
        street: address.road || address.pedestrian || address.residential || address.footway || '',
        district: address.suburb || address.neighbourhood || address.city_district || '',
        city: address.city || address.town || address.village || address.municipality || '',
        county: address.county || '',
        state: address.state || '',
        country: address.country || '',
        countrycode: 'co',
        postcode: address.postcode || '',
      };
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(result.lon), Number(result.lat)] },
        properties,
      };
    }).filter((feature) => feature.geometry.coordinates.every(Number.isFinite) && isColombiaFeature(feature));
    const ranked = rankPhotonFeatures(features, query, null);
    const useful = ranked.length ? ranked : features;
    state.nominatimCache.set(key, { expiresAt: Date.now() + 5 * 60 * 1000, features: useful });
    return useful;
  }

  function photonLanguage() {
    // The public Photon instance currently supports `default`, `de`, `en`, and `fr`.
    // `default` preserves local OpenStreetMap names for Spanish queries.
    return state.language === 'en' ? 'en' : 'default';
  }

  async function fetchPhotonFeatures(params, signal, timeoutMs = 11000) {
    const query = params.toString();
    const endpoints = isLocalApiHost()
      ? [`/api/photon?${query}`, `https://photon.komoot.io/api/?${query}`]
      : [`https://photon.komoot.io/api/?${query}`];
    let lastError;
    for (const endpoint of endpoints) {
      try {
        const response = await fetchTimed(endpoint, { signal, headers: { Accept: 'application/json' } }, timeoutMs / endpoints.length);
        if (!response.ok) {
          lastError = new Error(`Photon ${response.status}`);
          if (response.status === 404 || response.status === 429 || response.status >= 500) continue;
          throw lastError;
        }
        const payload = await response.json();
        if (!Array.isArray(payload.features)) throw new Error('Photon returned an invalid response');
        return payload;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    throw lastError || new Error('Photon unavailable');
  }

  async function fetchValhallaRoute(request, signal) {
    const identifiedRequest = { ...request, id: 'trazia.github.io' };
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Client-Id': 'trazia.github.io' };
    const attempts = [];
    if (isLocalApiHost()) attempts.push({ url: '/api/route', options: { method: 'POST', headers, body: JSON.stringify(identifiedRequest) } });
    attempts.push({ url: 'https://valhalla1.openstreetmap.de/route', options: { method: 'POST', headers, body: JSON.stringify(identifiedRequest) } });
    const query = new URLSearchParams({ json: JSON.stringify(identifiedRequest) }).toString();
    attempts.push({ url: `https://valhalla1.openstreetmap.de/route?${query}`, options: { headers: { Accept: 'application/json', 'X-Client-Id': 'trazia.github.io' } } });
    // Keep the old public hostname as a final compatibility fallback.
    attempts.push({ url: `https://valhalla.openstreetmap.de/route?${query}`, options: { headers: { Accept: 'application/json', 'X-Client-Id': 'trazia.github.io' } } });
    let lastError;
    for (const attempt of attempts) {
      try {
        const response = await fetchTimed(attempt.url, { ...attempt.options, signal }, 14000);
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`Valhalla ${response.status}`);
          continue;
        }
        return response;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    throw lastError || new Error('Valhalla unavailable');
  }

  // Inbox stores only alerts actually emitted by this device, scoped to the signed-in user.
  let inboxUserId = null;
  let inboxItems = [];
  const inboxKey = () => inboxUserId ? 'trazia:inbox:' + inboxUserId : null;
  function renderInbox() {
    const list = document.getElementById('trazia-inbox-list');
    if (!list) return;
    list.replaceChildren();
    document.getElementById('trazia-inbox-title').textContent = 'Bandeja de entrada (' + inboxItems.filter(item => !item.read).length + ')';
    if (!inboxItems.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Todavía no hay alertas emitidas.';
      list.append(empty);
      return;
    }
    for (const item of inboxItems) {
      const card = document.createElement('button');
      card.type = 'button';
      card.style.cssText = 'text-align:left;padding:17px;background:#292b30;color:white;border:1px solid #555b66;border-radius:14px;display:grid;gap:8px;width:100%';
      const title = document.createElement('strong');
      title.textContent = (item.read ? '○ ' : '🔵 ') + item.title;
      const detail = document.createElement('span');
      detail.textContent = item.detail;
      const date = document.createElement('small');
      date.style.color = '#b7bbc4';
      date.textContent = new Date(item.time).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'});
      card.append(title,detail,date);
      card.addEventListener('click',() => {
        item.read = true;
        if (inboxKey()) localStorage.setItem(inboxKey(),JSON.stringify(inboxItems));
        renderInbox();
      });
      list.append(card);
    }
  }
  function loadInboxForUser(uid) {
    inboxUserId = uid || null;
    try {
      const saved = inboxKey() ? JSON.parse(localStorage.getItem(inboxKey()) || '[]') : [];
      inboxItems = Array.isArray(saved) ? saved.slice(0,100) : [];
    } catch { inboxItems = []; }
    renderInbox();
  }
  function recordEmittedAlert(title,detail,key) {
    if (!inboxUserId) return;
    const time = Date.now();
    if (key && inboxItems.some(item => item.key === key && time - item.time < 6 * 60 * 60 * 1000)) return;
    inboxItems.unshift({id:String(time)+Math.random().toString(36).slice(2,6),title,detail,key,time,read:false});
    inboxItems = inboxItems.slice(0,100);
    try { localStorage.setItem(inboxKey(),JSON.stringify(inboxItems)); } catch(error) { console.info('Inbox storage unavailable',error); }
    renderInbox();
  }

  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3400);
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function readReports() {
    try {
      const raw = localStorage.getItem('trazia:reports');
      const reports = raw ? JSON.parse(raw) : [];
      return Array.isArray(reports) ? reports.filter((item) => item && typeof item.type === 'string' && typeof item.id === 'string').slice(0, 100) : [];
    } catch {
      return [];
    }
  }

  function readSavedPlaces(uid = null) {
    if (!uid) return [];
    try {
      const saved = JSON.parse(localStorage.getItem('trazia:saved-places:user:' + uid) || '[]');
      return Array.isArray(saved) ? saved.filter((place) => place && place.id && place.name && place.address) : [];
    } catch {
      return [];
    }
  }

  function readRecentDestinations() {
    try {
      const recent = JSON.parse(localStorage.getItem('trazia:recent-destinations') || '[]');
      return Array.isArray(recent) ? recent.filter((item) => typeof item === 'string').slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  function renderReportCount() {
    $('#report-count').textContent = String(state.reports.length);
  }

  function renderSavedPlaces() {
    const container = $('#quick-places');
    container.replaceChildren();
    const presets = [
      { id: 'home', name: t('home'), icon: '⌂' },
      { id: 'work', name: t('work'), icon: '▣' },
      ...state.savedPlaces.filter((place) => !['home', 'work'].includes(place.id)).map((place) => ({ id: place.id, name: place.name, icon: '⌖' })),
    ];
    presets.forEach((place) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-place-button';
      button.dataset.placeId = place.id;
      const icon = document.createElement('span');
      icon.className = 'quick-place-icon';
      icon.textContent = place.icon;
      const label = document.createElement('span');
      label.textContent = place.name;
      button.append(icon, label);
      container.append(button);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'quick-place-button quick-place-add';
    add.dataset.placeId = 'add';
    add.textContent = `＋ ${t('addNew')}`;
    container.append(add);
  }

  function renderRecentDestinations() {
    const section = $('#recent-destinations');
    const list = $('#recent-list');
    list.replaceChildren();
    section.hidden = state.recentDestinations.length === 0;
    state.recentDestinations.forEach((destination) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'recent-destination-button';
      button.textContent = destination;
      button.addEventListener('click', () => {
        section.open = false;
        setDestinationText(destination);
        void searchRoute();
      });
      list.append(button);
    });
  }

  function openSavedPlaceEditor(id = null) {
    const saved = state.savedPlaces.find((place) => place.id === id);
    state.editingSavedPlaceId = id;
    $('#saved-place-dialog-title').textContent = saved?.name || (id === 'home' ? t('home') : id === 'work' ? t('work') : t('newPlace'));
    $('#saved-place-name').value = saved?.name || (id === 'home' ? t('home') : id === 'work' ? t('work') : '');
    $('#saved-place-address').value = saved?.address || '';
    $('#saved-place-icon').value = savedPlaceKind(saved || { id });
    $('#saved-place-icon').disabled = ['home', 'work'].includes(id);
    resetSavedPlaceSearch();
    if (saved && !validSavedPlaceLocation(saved.location)) {
      $('#saved-place-results').hidden = false;
      $('#saved-place-results').textContent = t('confirmSavedLocation');
    }
    openDialog(savedPlaceDialog);
  }

  function selectSavedPlace(id) {
    if (id === 'add') {
      openSavedPlaceEditor();
      return;
    }
    const saved = state.savedPlaces.find((place) => place.id === id);
    if (!saved?.address) {
      openSavedPlaceEditor(id);
      return;
    }
    if (!validSavedPlaceLocation(saved.location)) { openSavedPlaceEditor(id); return; }
    setDestinationText(saved.address);
    state.selectedDestination = { label: saved.address, location: { ...saved.location }, approximate: Boolean(saved.approximate) };
    void searchRoute();
  }

  function setDestinationText(value) {
    state.selectedDestination = null;
    destinationInput.value = value;
    closeDestinationSuggestions();
  }

  function clearNavigationSearch() {
    // The accepted destination belongs to the route, not to the next search.
    destinationInput.value = '';
    destinationInput.blur();
    state.selectedDestination = null;
    state.autocompletePredictions = [];
    state.autocompleteQuery = '';
    closeDestinationSuggestions();
  }

  function validSavedPlaceLocation(location) {
    return Number.isFinite(location?.lat) && Number.isFinite(location?.lng) && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180;
  }

  function savedPlaceKind(place) {
    const kind = ['home', 'work'].includes(place.id) ? place.id : place.kind;
    return ['home', 'work', 'shop', 'clinic', 'school', 'favorite', 'other'].includes(kind) ? kind : 'other';
  }

  function resetSavedPlaceSearch() {
    state.savedPlaceSearchId += 1;
    state.savedPlaceController?.abort();
    state.savedPlaceController = null;
    $('#saved-place-results').replaceChildren();
    $('#saved-place-results').hidden = true;
    $('#save-place').disabled = false;
  }

  function persistSavedPlace(saved) {
    if (!state.savedPlacesOwner) { showToast('Inicia sesión para guardar direcciones privadas.', true); return; }
    const places = state.savedPlaces.filter(place => place.id !== saved.id).concat(saved);
    try { localStorage.setItem('trazia:saved-places:user:' + state.savedPlacesOwner, JSON.stringify(places)); }
    catch { showToast(t('savedLocationError'), true); return; }
    state.savedPlaces = places;
    renderSavedPlaces();
    renderSavedPlaceMarkers();
    closeDialog(savedPlaceDialog);
    if (state.mapReady && state.map && !state.isNavigating) {
      state.followCamera = false;
      collapseMobilePanel();
      state.map.flyTo({ center: [saved.location.lng, saved.location.lat], zoom: 16, duration: 500 });
    }
    showToast(t('placeSaved'));
  }

  async function saveSavedPlace() {
    const name = $('#saved-place-name').value.trim();
    const address = $('#saved-place-address').value.trim();
    if (!name || !address) { showToast(t('placeRequired'), true); return; }
    resetSavedPlaceSearch();
    const requestId = state.savedPlaceSearchId;
    const id = state.editingSavedPlaceId || `custom-${Date.now()}`;
    const existing = state.savedPlaces.find(place => place.id === id);
    const saved = { id, name, address, kind: savedPlaceKind({ id, kind: $('#saved-place-icon').value }) };
    if (existing?.address === address && validSavedPlaceLocation(existing.location)) {
      persistSavedPlace({ ...saved, location: existing.location, approximate: Boolean(existing.approximate) }); return;
    }
    const results = $('#saved-place-results');
    results.hidden = false; results.textContent = t('suggestionLoading');
    $('#save-place').disabled = true;
    const controller = new AbortController();
    state.savedPlaceController = controller;
    const searchTimeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const matches = await findDestinationCandidates(address, state.currentPosition || currentMapCenter(), controller.signal, { allowNominatimFallback: true });
      if (requestId !== state.savedPlaceSearchId || !savedPlaceDialog.open) return;
      results.replaceChildren();
      // Do not silently place a house marker at a street-only approximation.
      const candidates = matches.filter(feature => {
        const [lng, lat] = feature.geometry?.coordinates || [];
        return validSavedPlaceLocation({ lat, lng }) && (!address.includes('#') || feature.properties?.housenumber);
      });
      const note = document.createElement('p');
      note.textContent = candidates.length ? t('chooseSavedLocation') : t('savedLocationMissing'); results.append(note);
      candidates.slice(0, 5).forEach(feature => {
        const parts = photonFeatureParts(feature.properties || {}, address);
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'saved-location-option';
        const precision = feature.properties?.geocoder === 'igac' ? (state.language === 'es' ? 'Referencia del predio; acceso por confirmar' : 'Parcel reference; entrance unconfirmed') : feature.properties?.geocoder === 'idesc' ? feature.properties.certification : feature.properties?.geocoder === 'esri' ? (state.language === 'es' ? 'Punto aproximado' : 'Approximate point') : '';
        button.textContent = [parts.main, precision, parts.secondary].filter(Boolean).join(' · ');
        button.addEventListener('click', () => {
          if (requestId !== state.savedPlaceSearchId || !savedPlaceDialog.open) return;
          const [lng, lat] = feature.geometry.coordinates;
          persistSavedPlace({ ...saved, location: { lat, lng }, approximate: Boolean(feature.properties?.approximate) });
        });
        results.append(button);
      });
      if (candidates.length) {
        const source = document.createElement('small');
        source.textContent = candidates.some(feature => feature.properties?.geocoder === 'idesc') ? 'Direcciones: Planeación / IDESC Cali · CC BY-SA 4.0' : candidates.some(feature => feature.properties?.geocoder === 'tomtom') ? 'Búsqueda © TomTom' : candidates.some(feature => feature.properties?.geocoder === 'esri') ? 'Geocodificación © Esri' : t('autocompleteAttribution');
        results.append(source);
      }
    } catch (error) {
      if (requestId !== state.savedPlaceSearchId) return;
      results.textContent = t('savedLocationError');
    } finally {
      window.clearTimeout(searchTimeout);
      if (requestId === state.savedPlaceSearchId) { $('#save-place').disabled = false; state.savedPlaceController = null; }
    }
  }

  function renderSavedPlaceMarkers() {
    state.savedPlaceMarkers.forEach(marker => marker.remove());
    state.savedPlaceMarkers = [];
    if (!state.mapReady || !state.map) return;
    state.savedPlaces.filter(place => validSavedPlaceLocation(place.location)).forEach(place => {
      const element = document.createElement('button');
      element.type = 'button'; element.className = 'saved-place-marker'; element.setAttribute('aria-label', place.name); element.title = place.name;
      const image = document.createElement('img');
      image.src = `./assets/saved-places/${savedPlaceKind(place)}.png`; image.width = 44; image.height = 44; image.alt = ''; element.append(image);
      const content = document.createElement('div'); content.className = 'report-popup';
      const title = document.createElement('strong'); title.textContent = place.name;
      const address = document.createElement('p'); address.textContent = place.address;
      const go = document.createElement('button'); go.type = 'button'; go.textContent = t('findRoute'); go.className = 'saved-location-option'; go.addEventListener('click', () => selectSavedPlace(place.id));
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = state.language === 'es' ? 'Editar' : 'Edit'; edit.className = 'saved-location-option'; edit.addEventListener('click', () => openSavedPlaceEditor(place.id));
      content.append(title, address);
      if (place.approximate) { const precision = document.createElement('p'); precision.textContent = state.language === 'es' ? 'Referencia del predio; acceso por confirmar.' : 'Parcel reference; entrance unconfirmed.'; content.append(precision); }
      content.append(go, edit);
      const marker = new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat([place.location.lng, place.location.lat])
        .setPopup(new maplibregl.Popup({ offset: 28, maxWidth: '260px' }).setDOMContent(content)).addTo(state.map);
      state.savedPlaceMarkers.push(marker);
    });
  }

  function saveRecentDestination(destination) {
    state.recentDestinations = [destination, ...state.recentDestinations.filter((item) => item.toLowerCase() !== destination.toLowerCase())].slice(0, 5);
    try { localStorage.setItem('trazia:recent-destinations', JSON.stringify(state.recentDestinations)); }
    catch { /* An unavailable history store must not prevent navigation. */ }
    renderRecentDestinations();
  }

  function getUserPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('unsupported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!saveUserPosition(position)) {
            if (state.currentPosition) resolve(state.currentPosition);
            else reject(new Error('invalid-position'));
            return;
          }
          if (!state.currentPosition) {
            reject(new Error('invalid-position'));
            return;
          }
          resolve(state.currentPosition);
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 18000, maximumAge: 0 },
      );
    });
  }

  function updateUserMarker(position, heading) {
    if (Number.isFinite(heading)) state.lastHeading = heading;
    if (!state.mapReady || !state.map || !position) return;
    if (!state.userMarker) {
      const content = document.createElement('div');
      content.className = 'trazia-location-marker';
      content.setAttribute('aria-label', t('myLocation'));
      content.style.zIndex = '30';
      const symbol = document.createElement('img');
      symbol.src = navPng(state.navigationIcon);
      symbol.alt = '';
      const markerSize = state.navigationIcon === 'arrow' ? 38 : 48;
      symbol.width = markerSize;
      symbol.height = markerSize;
      symbol.style.cssText = 'display:block;width:' + markerSize + 'px;height:' + markerSize + 'px;object-fit:contain';
      content.append(symbol);
      state.userMarkerElement = content;
      state.userMarker = new maplibregl.Marker({ element: content, anchor: 'center', rotationAlignment: 'map', pitchAlignment: 'viewport' })
        .setLngLat([position.lng, position.lat])
        .addTo(state.map);
    } else {
      state.userMarker.setLngLat([position.lng, position.lat]);
    }
    updateVehicleMarkerOrientation();
  }

  function vehicleIconForType(type) {
    return ({ car: '🚗', motorcycle: '🏍️', truck: '🚚', bicycle: '🚲' })[type] || '🚗';
  }

  function saveUserPosition(position) {
    const coordinates = position?.coords;
    const lat = coordinates?.latitude;
    const lng = coordinates?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return false;
    const timestamp = Number.isFinite(position.timestamp) ? position.timestamp : Date.now();
    if (timestamp < state.lastLocationTimestamp) return false;
    const accuracy = Number.isFinite(coordinates.accuracy) && coordinates.accuracy >= 0 ? coordinates.accuracy : null;
    if (state.currentPosition && state.lastLocationTimestamp) {
      const elapsed = Math.max(0, (timestamp - state.lastLocationTimestamp) / 1000);
      if (elapsed > 0 && elapsed <= 45 && accuracy !== null && accuracy > 35) {
        const reportedSpeed = Number.isFinite(coordinates.speed) && coordinates.speed >= 0 ? coordinates.speed : null;
        const speedLimit = reportedSpeed === null ? 55 : Math.max(20, reportedSpeed * 2 + 10);
        const previousAccuracy = Number.isFinite(state.lastLocationAccuracy) ? state.lastLocationAccuracy : 50;
        const allowedDistance = speedLimit * elapsed + accuracy + previousAccuracy + 25;
        if (distanceMeters(state.currentPosition, { lat, lng }) > allowedDistance) return false;
      }
    }
    const previousPosition = state.currentPosition;
    const reportedSpeed = Number.isFinite(coordinates.speed) && coordinates.speed >= 0 ? coordinates.speed : null;
    let heading = Number.isFinite(coordinates.heading) && coordinates.heading >= 0 && coordinates.heading <= 360
      ? coordinates.heading
      : null;
    if (heading === null && previousPosition && accuracy !== null && accuracy <= 50) {
      const moved = distanceMeters(previousPosition, { lat, lng });
      const elapsed = Math.max(0, (timestamp - state.lastLocationTimestamp) / 1000);
      if (moved >= 4 && elapsed >= 1.5 && (reportedSpeed === null || reportedSpeed >= 0.8)) {
        heading = bearingBetween(previousPosition, { lat, lng });
      }
    }
    state.currentPosition = { lat, lng };
    void state.weatherBadge?.refresh();
    state.lastLocationTimestamp = timestamp;
    state.lastLocationAccuracy = accuracy;
    // At rest, GPS course can jump by 180° and flip the vehicle icon.
    // Keep the last reliable travel bearing until movement resumes.
    if (heading !== null && (reportedSpeed === null || reportedSpeed >= 0.8)) state.lastHeading = heading;
    else heading = null;
    updateSpeedometer(position);
    updateUserMarker(state.currentPosition, heading);
    updateSchoolWarning(state.currentPosition);
    if (!schoolZones.length) scheduleSchoolZones();
    updateConnectionLabels();
    return true;
  }

  function updateSpeedometer(position) {
    if (position?.coords) {
      const timestamp = position.timestamp || Date.now();
      let metersPerSecond = Number.isFinite(position.coords.speed) && position.coords.speed >= 0 ? position.coords.speed : null;
      if (metersPerSecond === null && state.lastSpeedFix) {
        const elapsed = (timestamp - state.lastSpeedFix.timestamp) / 1000;
        if (elapsed >= 1 && elapsed <= 30 && (position.coords.accuracy || 0) < 60) {
          const current = { lat: position.coords.latitude, lng: position.coords.longitude };
          metersPerSecond = distanceMeters(state.lastSpeedFix.position, current) / elapsed;
        }
      }
      state.lastSpeedFix = { timestamp, position: { lat: position.coords.latitude, lng: position.coords.longitude } };
      state.currentSpeed = Math.round(metersPerSecond === null || metersPerSecond < 0.55 ? 0 : metersPerSecond * 3.6);
    }
    const imperial = state.settings?.units === 'mi';
    const displayedSpeed = imperial ? Math.round(state.currentSpeed / 1.609344) : state.currentSpeed;
    $('#speed-value').textContent = String(displayedSpeed);
    $('#speedometer').hidden = state.settings?.showSpeed === false;
    $('#speedometer span').textContent = imperial ? 'mph' : 'km/h';
    $('#speedometer').classList.toggle('gps-active', Boolean(state.currentPosition));
    $('#speedometer').setAttribute('aria-label', `${displayedSpeed} ${imperial ? 'mph' : 'km/h'}`);
  }

  function startLocationWatch() {
    if (!navigator.geolocation?.watchPosition || state.locationWatch !== null) return;
    state.locationWatch = navigator.geolocation.watchPosition(
      onNavigationPosition,
      (error) => console.info('Trazia location updates are unavailable:', error.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }

  function getRouteErrorMessage(error) {
    if (error?.code === 1) return t('routeLocationDenied');
    if (error?.code === 2 || error?.code === 3) return t('routeLocationUnavailable');
    if (error?.message === 'unsupported') return t('locationUnsupported');
    if (error?.message === 'invalid-position') return t('routeLocationUnavailable');
    if (error?.message === 'no-route') return t('routeNotFound');
    const detail = `${error?.name || ''} ${error?.message || ''}`.toLowerCase();
    if (detail.includes('not authorized') || detail.includes('permission_denied') || detail.includes('api target blocked')) return t('routeApiError');
    return t('routeServiceError');
  }

  async function locateMe({ silent = false } = {}) {
    try {
      const position = await getUserPosition();
      collapseMobilePanel();
      state.followCamera = true;
      if (state.map) {
        // Preserve the zoom chosen before starting navigation; only follow position and heading.
      state.map.flyTo({ center: [position.lng, position.lat], zoom: state.map.getZoom(), pitch: state.is3d ? 55 : 0, bearing: compassBearing(), duration: 700, offset: mobileMapOffset() });
      }
      updateUserMarker(position);
      updateRouteProgress(position);
      setMap3d(true);
      window.setTimeout(() => {
        if (state.mapReady && state.map && state.followCamera && state.currentPosition) {
          state.map.easeTo({ center: [state.currentPosition.lng, state.currentPosition.lat], bearing: compassBearing(), offset: mobileMapOffset(), duration: 250 });
        }
      }, 320);
      startLocationWatch();
      if (!silent) showToast(t('locationOn'));
    } catch (error) {
      if (!silent) showToast(error.message === 'unsupported' ? t('locationUnsupported') : t('noLocation'), true);
    }
  }

  function mapStyleForTheme(theme) {
    return theme === 'dark' ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/liberty';
  }

  function setMapStyle(theme) {
    if (!state.map) return;
    const style = mapStyleForTheme(theme);
    if (style === state.mapStyle) return;
    state.mapStyle = style;
    state.map.setStyle(style);
  }

  function addTraziaBuildingLayer() {
    removeTraziaBuildingLayers();
  }

  function removeTraziaBuildingLayers() {
    if (!state.map?.isStyleLoaded()) return;
    const buildingLayers = (state.map.getStyle().layers || []).filter((layer) => (
      layer.type === 'fill-extrusion' || /building|structure/i.test(`${layer.id} ${layer['source-layer'] || ''}`)
    ));
    buildingLayers.forEach((layer) => {
      try {
        state.map.setLayoutProperty(layer.id, 'visibility', 'none');
        if (layer.type === 'fill-extrusion') state.map.removeLayer(layer.id);
      } catch { /* The base style can update while layers are being hidden. */ }
    });
  }

  function applyTraziaMapPalette() {
    if (!state.map?.isStyleLoaded()) return;
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const signature = `${state.mapStyle}:${theme}`;
    if (state.mapPaletteSignature === signature) return;
    state.mapPaletteSignature = signature;
    (state.map.getStyle().layers || []).forEach((layer) => {
      try {
        Object.entries(mapLayerPalette(layer, theme)).forEach(([property, value]) => state.map.setPaintProperty(layer.id, property, value));
      } catch (error) {
        console.info(`Trazia kept the base style for map layer ${layer.id}:`, error.message);
      }
    });
  }

  function addTraziaRoadLayer() {
    if (!state.map?.isStyleLoaded() || !state.map.getSource('openmaptiles') || state.map.getLayer('trazia-road-network')) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    const beforeId = (state.map.getStyle().layers || []).find((layer) => layer.type === 'symbol')?.id;
    state.map.addLayer({
      id: 'trazia-road-network',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 10,
      filter: ['all', ['has', 'class'], ['!in', 'class', 'rail', 'ferry', 'aerialway', 'transit', 'path']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': roadColors(dark ? 'dark' : 'light'),
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          10, ['match', ['get', 'class'], ['motorway', 'trunk'], 1.7, ['primary', 'secondary'], 1.4, 0.9],
          14, ['match', ['get', 'class'], ['motorway', 'trunk'], 4.7, ['primary', 'secondary'], 4.0, 3.0],
          17, ['match', ['get', 'class'], ['motorway', 'trunk'], 7.5, ['primary', 'secondary'], 6.2, 4.8],
        ],
        'line-opacity': 0.98,
      },
    }, beforeId);
  }

  function initializeMap() {
    try {
      const style = mapStyleForTheme(document.documentElement.dataset.theme || 'light');
      state.mapStyle = style;
      state.map = new maplibregl.Map({
        container: 'trazia-map',
        style,
        center: state.currentPosition ? [state.currentPosition.lng, state.currentPosition.lat] : DEFAULT_MAP_CENTER,
        zoom: state.currentPosition ? 16 : 15,
        pitch: state.is3d ? 55 : 0,
        maxPitch: 68,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
        transformRequest: (url) => trafficRequest(url, window.TRAZIA_CONFIG?.tomtomApiKey),
      });
      state.map.on('rotate', () => {
        updateCompassControl();
        updateVehicleMarkerOrientation();
      });
      state.map.on('dragstart', () => { state.followCamera = false; });
      state.map.on('moveend', () => { if (!state.currentPosition) void state.weatherBadge?.refresh(); });
      state.map.on('load', () => {
        state.mapLoaded = true;
        state.mapReady = true;
        app.classList.add('map-live');
        addTraziaBuildingLayer();
        if (state.is3d) removeTraziaBuildingLayers();
        addTraziaRoadLayer();
        applyTraziaMapPalette();
        updateConnectionLabels();
        renderSavedReportMarkers();
        renderSavedPlaceMarkers();
        if (state.currentPosition) {
          updateUserMarker(state.currentPosition);
          state.map.jumpTo({
            center: [state.currentPosition.lng, state.currentPosition.lat],
            zoom: Math.max(state.map.getZoom(), 16),
            pitch: state.is3d ? 55 : 0,
            bearing: compassBearing(),
            offset: mobileMapOffset(),
          });
        }
        updateCompassControl();
        drawRouteOnMap();
        void renderSpeedCameras();
        renderTrafficSignals();
        scheduleTrafficSignals();
        renderSchoolZones();
        scheduleSchoolZones();
        renderLiveTraffic();
      });
      state.map.on('style.load', () => {
        state.mapPaletteSignature = null;
        addTraziaBuildingLayer();
        if (state.is3d) removeTraziaBuildingLayers();
        addTraziaRoadLayer();
        applyTraziaMapPalette();
        drawRouteOnMap();
        void renderSpeedCameras();
        renderTrafficSignals();
        scheduleTrafficSignals();
        renderLiveTraffic();
      });
      // Style edits can keep isStyleLoaded() false during the load callback.
      // Attach overlays once the style settles, including after a theme change.
      state.map.on('idle', () => {
        if (!state.map.getLayer('trazia-road-network')) addTraziaRoadLayer();
        applyTraziaMapPalette();
        if (!state.map.getLayer('trazia-speed-cameras')) void renderSpeedCameras();
        if (!state.map.getLayer('trazia-traffic-signals-icon')) { renderTrafficSignals(); scheduleTrafficSignals(); }
        if (!state.map.getLayer('trazia-school-zones')) renderSchoolZones();
        if (state.liveTrafficEnabled && !state.liveTrafficBlocked && !state.map.getLayer(TRAFFIC_LAYER)) renderLiveTraffic();
        keepRouteInForeground();
      });
      state.map.on('moveend', scheduleTrafficSignals);
      state.map.on('moveend', scheduleSchoolZones);
      state.map.on('sourcedata', (event) => {
        if (event.sourceId === TRAFFIC_SOURCE && event.isSourceLoaded && state.liveTrafficEnabled && !state.liveTrafficBlocked) {
          state.liveTrafficStatus = 'ready';
          state.liveTrafficReceivedAt = Date.now();
          updateLiveTrafficStatus();
        }
      });
      state.map.on('error', (event) => {
        if (event.sourceId === TRAFFIC_SOURCE || event.error?.sourceId === TRAFFIC_SOURCE || String(event.error?.url || '').includes('/maps/orbis/traffic/flow/vector/tile/')) {
          state.liveTrafficStatus = 'unavailable';
          if ([403, 429].includes(event.error?.status)) {
            state.liveTrafficBlocked = true;
            if (state.map.getLayer(TRAFFIC_LAYER)) state.map.setLayoutProperty(TRAFFIC_LAYER, 'visibility', 'none');
          }
          updateLiveTrafficStatus();
          return;
        }
        console.info('Trazia map service notice:', event.error?.message || 'map tile unavailable');
      });
    } catch (error) {
      state.mapReady = false;
      updateConnectionLabels();
      showToast(t('mapError'), true);
      console.error('Trazia could not initialize its open map:', error);
    }
  }

  async function searchRoute({ automatic = state.isNavigating, target = null } = {}) {
    if (!target && !destinationInput.value.trim() && state.isNavigating) target = state.activeDestination;
    const typedDestination = target?.label || destinationInput.value.trim();
    if (!typedDestination) {
      showToast(t('noDestination'));
      destinationInput.focus();
      return;
    }
    if (!target && state.selectedDestination && String(state.selectedDestination.label || '').trim() !== typedDestination) {
      state.selectedDestination = null;
    }
    // Recent and saved Waze links must bypass address geocoding too.
    if (!target && !state.selectedDestination) {
      try {
        const imported = parseWazeLocation(typedDestination);
        if (imported) setWazeDestination(imported);
      } catch (error) {
        showSuggestionMessage(wazeImportError(error));
        return;
      }
    }
    if (!state.mapReady) {
      showToast(t('demoRoute'));
      return;
    }
    // Unlock speech while selection/search still has the user's tap gesture.
    // Navigation itself starts only after the route has been validated.
    if (!state.isNavigating && (target || state.selectedDestination)?.location) {
      speak(t('voiceStarting'));
      window.speechSynthesis?.resume?.();
    }
    const routeButton = $('#search-route');
    routeButton.disabled = true;
    state.routeSearchController?.abort();
    const routeController = new AbortController();
    state.routeSearchController = routeController;
    const routeRequestId = ++state.routeRequestId;
    if (!automatic) {
      clearRoutePolylines();
      state.route = null;
      state.currentRoutes = [];
      state.navigationSteps = [];
      state.activeStep = 0;
      $('#route-duration').innerHTML = `— <small>${t('minutes')}</small>`;
      $('#route-distance').innerHTML = `— <small>${t('kilometers')}</small>`;
      $('#route-summary-overlay').hidden = true;
    }
    $('#route-note').textContent = automatic ? t('rerouting') : t('connecting');
    const searchRequestId = ++state.autocompleteRequestId;
    window.clearTimeout(state.autocompleteTimer);
    state.autocompleteController?.abort();
    try {
      const recentPosition = state.currentPosition && Date.now() - state.lastLocationTimestamp <= 30_000;
      const origin = recentPosition ? state.currentPosition : await getUserPosition();
      if (routeController.signal.aborted || routeRequestId !== state.routeRequestId || searchRequestId !== state.autocompleteRequestId) return;
      updateUserMarker(origin);
      let selected = target || state.selectedDestination;
      if (!selected?.location) {
        const matches = await findDestinationCandidates(typedDestination, origin, routeController.signal, { allowNominatimFallback: true });
        if (routeController.signal.aborted || routeRequestId !== state.routeRequestId || destinationInput.value.trim() !== typedDestination || searchRequestId !== state.autocompleteRequestId) return;
        state.autocompleteQuery = typedDestination;
        if (!matches.length) {
          showSuggestionMessage(t('autocompleteNoResults'));
          appendSuggestionAttribution($('#destination-suggestions'));
          $('#route-note').textContent = t('autocompleteNoResults');
          return;
        }
        renderDestinationSuggestions(matches);
        $('#route-note').textContent = t('chooseAddress');
        destinationInput.focus({ preventScroll: true });
        return;
      }
      collapseMobilePanel();
      setMap3d(true);
      const costing = { car: 'auto', motorcycle: 'motorcycle', truck: 'truck', bicycle: 'bicycle' }[state.vehicleType];
      const request = {
        locations: [
          { lat: origin.lat, lon: origin.lng, type: 'break' },
          { lat: selected.location.lat, lon: selected.location.lng, type: 'break' },
        ],
        costing,
        units: 'kilometers',
        language: state.language === 'es' ? 'es-ES' : 'en-US',
        alternates: 2,
      };
      if (state.avoidTolls && ['auto', 'motorcycle', 'truck'].includes(costing)) {
        request.costing_options = { [costing]: { use_tolls: 0.05, toll_booth_penalty: 1200 } };
      }
      const options = { ...(request.costing_options?.[costing] || {}) };
      if (state.settings?.avoidFerries) options.use_ferry = 0;
      if (['auto', 'motorcycle', 'truck'].includes(costing)) {
        if (state.settings?.avoidHighways) options.use_highways = 0;
        if (state.settings?.unpaved === 'avoid') options.exclude_unpaved = true;
        if (state.settings?.avoidDifficult) options.maneuver_penalty = 30;
      }
      if (Object.keys(options).length) request.costing_options = { [costing]: options };
      const response = await fetchValhallaRoute(request, routeController.signal);
      if (routeController.signal.aborted || routeRequestId !== state.routeRequestId) return;
      let payload;
      try { payload = await response.json(); } catch { payload = {}; }
      // Parsing the response also yields: a stop, new choice or typed search
      // during that time must not apply a late route or start navigation.
      if (routeController.signal.aborted || routeRequestId !== state.routeRequestId || searchRequestId !== state.autocompleteRequestId) return;
      if (!response.ok || payload.error || !payload.trip?.legs?.length) {
        const detail = `${payload.error || ''} ${payload.status_message || ''}`.toLowerCase();
        throw new Error(detail.includes('path could not') ? 'no-route' : 'route-service');
      }
      const coordinates = [];
      const navigationSteps = [];
      payload.trip.legs.forEach((leg) => {
        const legCoordinates = decodePolyline(leg.shape, 6);
        const legOffset = coordinates.length > 0 ? coordinates.length - 1 : 0;
        if (coordinates.length && legCoordinates.length) legCoordinates.shift();
        coordinates.push(...legCoordinates);
        (leg.maneuvers || []).forEach((maneuver) => {
            const instruction = maneuver.instruction || maneuver.verbal_pre_transition_instruction || maneuver.verbal_transition_alert_instruction;
            if (!instruction) return;
            const beginIndex = Math.min(Math.max(0, Number(maneuver.begin_shape_index) || 0) + legOffset, coordinates.length - 1);
          const endpointIndex = Math.min(Math.max(0, maneuver.end_shape_index || 0) + legOffset, coordinates.length - 1);
          const [lng, lat] = coordinates[endpointIndex] || coordinates[coordinates.length - 1] || [origin.lng, origin.lat];
            const [beginLng, beginLat] = coordinates[beginIndex] || [origin.lng, origin.lat];
            navigationSteps.push({
              instructions: instruction,
              maneuverType: maneuver.type,
              alertInstruction: maneuver.verbal_transition_alert_instruction || maneuver.instruction,
              preInstruction: maneuver.verbal_pre_transition_instruction || maneuver.instruction,
              endLocation: { lat, lng },
              beginLocation: { lat: beginLat, lng: beginLng },
              alertSpoken: false,
              preSpoken: false,
            });
        });
      });
      if (coordinates.length < 2) throw new Error('no-route');
      const legSummaries = payload.trip.legs.map((leg) => leg.summary || {});
      const routeSummary = payload.trip.summary || {
        length: legSummaries.reduce((total, summary) => total + (Number(summary.length) || 0), 0),
        time: legSummaries.reduce((total, summary) => total + (Number(summary.time) || 0), 0),
      };
      const distanceKilometers = Number(routeSummary.length);
      const durationSeconds = Number(routeSummary.time);
      if (!Number.isFinite(distanceKilometers) || distanceKilometers <= 0 || !Number.isFinite(durationSeconds) || durationSeconds < 0) throw new Error('no-route');
      const route = {
        path: coordinates.map(([lng, lat]) => ({ lat, lng })),
        distanceMeters: distanceKilometers * 1000,
        durationMillis: durationSeconds * 1000,
        legs: [{ steps: navigationSteps }],
      };
      clearRoutePolylines();
      state.activeDestination = selected;
      state.selectedDestination = selected;
      state.routeDestination = selected.label || typedDestination;
      destinationInput.value = state.routeDestination;
      $('#route-title').textContent = state.routeDestination;
      state.currentRoutes = [route];
      state.routeCoordinates = coordinates;
      state.route = route;
      state.lastRerouteAt = automatic ? Date.now() : 0;
      state.offRouteFixes = 0;
      state.fitRouteToMap = true;
      collapseMobilePanel();
      drawRouteOnMap();
      const duration = route.durationMillis ? Math.max(1, Math.round(route.durationMillis / 60000)) : null;
      const distance = route.distanceMeters ? route.distanceMeters / (state.settings?.units === 'mi' ? 1609.344 : 1000) : null;
      $('#route-duration').innerHTML = `${duration ?? '—'} <small>${t('minutes')}</small>`;
      $('#route-distance').innerHTML = `${distance !== null ? new Intl.NumberFormat(state.language === 'es' ? 'es' : 'en', { maximumFractionDigits: 1 }).format(distance) : '—'} <small>${state.settings?.units === 'mi' ? 'mi' : t('kilometers')}</small>`;
      updateRouteSummary(route);
      $('#route-note').textContent = (automatic ? t('rerouteReady') : t('routeReady')) + (selected.nearbyAddress ? (state.language === 'es' ? ' Destino: dirección cercana seleccionada; el número solicitado no está confirmado.' : ' Destination: selected nearby address; requested house number is unconfirmed.') : '') + (selected.approximate ? (state.language === 'es' ? ' Destino: referencia del predio; confirma el acceso.' : ' Destination: parcel reference; confirm the entrance.') : '');
      state.navigationSteps = navigationSteps;
      state.activeStep = 0;
      if (state.isNavigating) {
        clearNavigationSearch();
        setNavigationView(true);
        const instruction = state.navigationSteps[0]?.instructions || t('navigationFollowRoute');
        updateNavigationInstruction(instruction);
        speak(instruction);
      }
      saveRecentDestination(selected.wazeLink || (selected.temporary ? selected.query : state.routeDestination));
      if (state.isNavigating) showToast(t('rerouteReady'));
      else await startNavigation({ position: origin, requestId: routeRequestId });
    } catch (error) {
      if (routeController.signal.aborted || routeRequestId !== state.routeRequestId || searchRequestId !== state.autocompleteRequestId) return;
      console.error('Trazia route search failed:', error);
      const message = automatic ? t('rerouteFailed') : getRouteErrorMessage(error);
      $('#route-note').textContent = message;
      if (automatic) {
        speak(message);
        showToast(message, true);
      } else showToast(message, true);
    } finally {
      if (routeRequestId === state.routeRequestId) {
        routeButton.disabled = false;
        if (automatic) state.isRerouting = false;
        state.routeSearchController = null;
      }
    }
  }

  function clearRoutePolylines() {
    ['trazia-route-line', 'trazia-route-outline'].forEach((layerId) => {
      if (state.map?.getLayer(layerId)) state.map.removeLayer(layerId);
    });
    if (state.map?.getSource('trazia-route')) state.map.removeSource('trazia-route');
    state.destinationMarker?.remove();
    state.destinationMarker = null;
    state.routeCoordinates = [];
    state.routeProgress = 0;
    state.fitRouteToMap = false;
    $('#route-summary-overlay').hidden = true;
  }

  // Keep the original geometry for guidance and rerouting; trim only its display.
  function remainingRouteCoordinates() {
    const coordinates = state.routeCoordinates;
    if (coordinates.length < 2) return coordinates;
    const index = Math.min(Math.floor(state.routeProgress), coordinates.length - 2);
    const fraction = state.routeProgress - index;
    const start = coordinates[index];
    const end = coordinates[index + 1];
    return [[start[0] + (end[0] - start[0]) * fraction,
      start[1] + (end[1] - start[1]) * fraction], ...coordinates.slice(index + 1)];
  }

  function updateRouteProgress(user) {
    if (!state.isNavigating || state.routeCoordinates.length < 2) return;
    const accuracy = state.lastLocationAccuracy;
    // Poor GPS fixes and positions away from the route must not erase it.
    if (Number.isFinite(accuracy) && accuracy > 70) return;
    const coordinates = state.routeCoordinates;
    const scaleY = 6371000 * Math.PI / 180;
    const scaleX = scaleY * Math.cos(user.lat * Math.PI / 180);
    let nearest = Infinity;
    let progress = state.routeProgress;
    for (let i = Math.floor(state.routeProgress); i < coordinates.length - 1; i += 1) {
      const a = coordinates[i];
      const b = coordinates[i + 1];
      const x = (a[0] - user.lng) * scaleX;
      const y = (a[1] - user.lat) * scaleY;
      const dx = (b[0] - a[0]) * scaleX;
      const dy = (b[1] - a[1]) * scaleY;
      const lengthSquared = dx * dx + dy * dy;
      const fraction = lengthSquared ? Math.max(0, Math.min(1, -(x * dx + y * dy) / lengthSquared)) : 0;
      const distance = Math.hypot(x + fraction * dx, y + fraction * dy);
      if (distance < nearest) {
        nearest = distance;
        progress = Math.max(state.routeProgress, i + fraction);
        // At crossings, prefer the first matching section still ahead.
        if (distance < 5) break;
      }
    }
    if (nearest > 45 || progress <= state.routeProgress) return;
    state.routeProgress = progress;
    state.map?.getSource('trazia-route')?.setData({
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: remainingRouteCoordinates() },
    });
  }

  function keepRouteInForeground() {
    const map = state.map;
    if (!map?.getLayer('trazia-route-outline') || !map.getLayer('trazia-route-line')) return;
    // Draw the route above every base-map layer, including labels and traffic.
    // Camera icons stay readable above the route; DOM markers are independent.
    const overlayIds = ['trazia-route-outline', 'trazia-route-line', 'trazia-speed-cameras'].filter(id => map.getLayer(id));
    const layers = map.getStyle()?.layers || [];
    const suffix = layers.slice(-overlayIds.length);
    if (suffix.length === overlayIds.length && suffix.every((layer, index) => layer.id === overlayIds[index])) return;
    // Only reorder when needed: moving on every idle event would keep the map busy.
    overlayIds.forEach(id => map.moveLayer(id));
  }

  function drawRouteOnMap() {
    if (!state.map?.isStyleLoaded() || state.routeCoordinates.length < 2) return;
    ['trazia-route-line', 'trazia-route-outline'].forEach((layerId) => {
      if (state.map.getLayer(layerId)) state.map.removeLayer(layerId);
    });
    if (state.map.getSource('trazia-route')) state.map.removeSource('trazia-route');
    if (state.isNavigating && state.currentPosition) updateRouteProgress(state.currentPosition);
    state.map.addSource('trazia-route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: remainingRouteCoordinates() } },
    });
    state.map.addLayer({ id: 'trazia-route-outline', type: 'line', source: 'trazia-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#420078', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 11, 16, 22], 'line-opacity': 1 } });
    state.map.addLayer({ id: 'trazia-route-line', type: 'line', source: 'trazia-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#a020ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 16, 14], 'line-opacity': 1 } });
    keepRouteInForeground();
    const destination = state.routeCoordinates[state.routeCoordinates.length - 1];
    if (destination) {
      state.destinationMarker?.remove();
      const markerElement = document.createElement('div');
      markerElement.className = 'trazia-destination-marker';
      markerElement.textContent = '🏁';
      markerElement.setAttribute('role', 'img');
      markerElement.setAttribute('aria-label', t('destinationMarkerLabel'));
      markerElement.title = t('destinationMarkerLabel');
      state.destinationMarker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat(destination)
        .addTo(state.map);
    }
    if (state.fitRouteToMap) {
      if (state.isNavigating && state.currentPosition) {
        state.followCamera = true;
        state.map.easeTo({ center: [state.currentPosition.lng, state.currentPosition.lat], zoom: 18, pitch: state.is3d ? 55 : 0, bearing: compassBearing(), duration: 450, offset: mobileMapOffset() });
      } else {
        state.followCamera = false;
        const bounds = new maplibregl.LngLatBounds();
        state.routeCoordinates.forEach((coordinate) => bounds.extend(coordinate));
        const padding = window.matchMedia('(max-width: 820px)').matches
          ? { top: 72, right: 32, bottom: 20, left: 32 }
          : 72;
        if (!bounds.isEmpty()) state.map.fitBounds(bounds, { padding, maxZoom: 16, duration: 650 });
      }
      state.fitRouteToMap = false;
      if (state.is3d) window.setTimeout(() => state.map?.easeTo({ pitch: 55, duration: 360 }), 700);
    }
  }

  function updateLiveTrafficStatus() {
    const label = $('#live-traffic-status');
    if (!label) return;
    const status = !state.liveTrafficEnabled ? 'off' : !window.TRAZIA_CONFIG?.tomtomApiKey ? 'unavailable' : state.liveTrafficStatus;
    const key = { off: 'trafficOff', ready: 'trafficReady', loading: 'trafficLoading', unavailable: 'trafficUnavailable' }[status] || 'trafficUnavailable';
    const time = status === 'ready' && state.liveTrafficReceivedAt
      ? new Date(state.liveTrafficReceivedAt).toLocaleTimeString(state.language === 'es' ? 'es-CO' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '';
    label.textContent = [t(key), time].filter(Boolean).join(' · ');
    $('#live-traffic-legend').dataset.status = status;
  }

  function renderLiveTraffic() {
    if (!state.mapReady || !state.map?.isStyleLoaded()) return;
    const key = window.TRAZIA_CONFIG?.tomtomApiKey;
    if (!state.liveTrafficEnabled || !key || state.liveTrafficBlocked) {
      if (state.map.getLayer(TRAFFIC_LAYER)) state.map.removeLayer(TRAFFIC_LAYER);
      if (state.map.getSource(TRAFFIC_SOURCE)) state.map.removeSource(TRAFFIC_SOURCE);
      updateLiveTrafficStatus();
      return;
    }
    try {
      if (!state.map.getSource(TRAFFIC_SOURCE)) {
        state.liveTrafficStatus = 'loading';
        state.map.addSource(TRAFFIC_SOURCE, { type: 'vector', tiles: [TRAFFIC_TILE_URL], minzoom: 10, maxzoom: 16, volatile: true, attribution: 'Traffic © TomTom' });
      }
      if (!state.map.getLayer(TRAFFIC_LAYER)) {
        const labels = (state.map.getStyle().layers || []).find((layer) => layer.type === 'symbol')?.id;
        state.map.addLayer(congestionLayer(), state.map.getLayer('trazia-route-outline') ? 'trazia-route-outline' : labels);
      }
      keepRouteInForeground();
      updateLiveTrafficStatus();
    } catch {
      state.liveTrafficStatus = 'unavailable';
      updateLiveTrafficStatus();
    }
  }

  function refreshLiveTraffic() {
    if (document.hidden || !state.liveTrafficEnabled || state.liveTrafficBlocked) return;
    const source = state.map?.getSource(TRAFFIC_SOURCE);
    if (source) source.setTiles([TRAFFIC_TILE_URL]);
    else renderLiveTraffic();
  }

  async function renderSpeedCameras() {
    if (!state.mapReady || !state.map?.isStyleLoaded()) return;
    const requestedStyle = state.mapStyle;
    try {
      if (!state.speedCameraDataset) {
        if (!state.speedCameraPromise) {
          state.speedCameraPromise = fetchTimed('./data/speed-cameras.json?v=30', {}, 12000)
            .then(async (response) => {
              if (!response.ok) throw new Error('Camera registry unavailable');
              const dataset = await response.json();
              if (!Array.isArray(dataset.cameras)) throw new Error('Invalid camera registry');
              state.speedCameraDataset = dataset;
              return dataset;
            }).finally(() => { state.speedCameraPromise = null; });
        }
        await state.speedCameraPromise;
      }
      if (requestedStyle !== state.mapStyle) return;
      if (!state.map.hasImage('trazia-camera-png')) {
        const icon = await state.map.loadImage('./assets/speed-camera.png');
        if (requestedStyle !== state.mapStyle) return;
        if (!state.map.hasImage('trazia-camera-png')) state.map.addImage('trazia-camera-png', icon.data, { pixelRatio: 4 });
      }
      const features = cameraFeatures(state.speedCameraDataset);
      if (state.map.getSource('trazia-speed-cameras')) state.map.getSource('trazia-speed-cameras').setData(features);
      else state.map.addSource('trazia-speed-cameras', { type: 'geojson', data: features });
      if (!state.map.getLayer('trazia-speed-cameras')) state.map.addLayer({
        id: 'trazia-speed-cameras', type: 'symbol', source: 'trazia-speed-cameras', minzoom: 10,
        layout: { 'icon-image': 'trazia-camera-png', 'icon-size': 1, 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-pitch-alignment': 'viewport' },
      });
      keepRouteInForeground();
      if (!state.speedCameraEventsBound) {
        state.speedCameraEventsBound = true;
        state.map.on('click', 'trazia-speed-cameras', (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const details = document.createElement('div');
          const title = document.createElement('strong');
          title.textContent = state.language === 'es' ? 'Cámara de fotodetección' : 'Traffic enforcement camera';
          const address = document.createElement('p');
          address.textContent = [feature.properties.address, feature.properties.city].filter(Boolean).join(', ');
          const status = document.createElement('p');
          const date = new Date(state.speedCameraDataset.updatedAt).toLocaleDateString(state.language === 'es' ? 'es-CO' : 'en-US');
          status.textContent = state.language === 'es' ? `Registro ANSV: Operando · Datos del ${date}. No es información en tiempo real.` : `ANSV registry: Operating · Data as of ${date}. Not real-time information.`;
          const source = document.createElement('a');
          source.href = 'https://fotodeteccion.ansv.gov.co/ubicaciones-aprobadas.html';
          source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = state.language === 'es' ? 'Consultar fuente ANSV' : 'View ANSV source';
          details.append(title, address, status, source);
          new maplibregl.Popup({ offset: 14 }).setLngLat(feature.geometry.coordinates).setDOMContent(details).addTo(state.map);
        });
      }
    } catch (error) {
      console.info('Trazia camera registry:', error.message);
    }
  }

  function announceCameraAhead(user) {
    const alert = $('#camera-approach-alert');
    if (!state.isNavigating || state.isRerouting || !state.speedCameraDataset || state.settings?.cameraAlerts === false) {
      alert.hidden = true;
      return;
    }
    const approach = cameraApproach(user, state.routeCoordinates, state.speedCameraDataset.cameras);
    if (!approach || approach.distanceMeters > (state.settings?.cameraDistance ?? 500)) {
      alert.hidden = true;
      return;
    }
    const meters = approach.distanceMeters;
    const rounded = Math.max(0, Math.round((meters + 0.000001) / (meters >= 100 ? 10 : 5)) * (meters >= 100 ? 10 : 5));
    $('#camera-alert-title').textContent = state.language === 'es' ? 'Cámara de fotodetección' : 'Traffic camera';
    $('#camera-alert-distance').textContent = `${rounded} m`;
    alert.hidden = false;
    // The visible countdown keeps updating even when voice is muted or busy.
    if (!state.voiceEnabled || window.speechSynthesis?.speaking || window.speechSynthesis?.pending) return;
    const stage = meters <= 20 ? 0 : meters <= 100 ? 100 : meters <= 300 ? 300 : 500;
    const key = `${approach.camera.id}:${stage}`;
    if (state.announcedCameras.has(key)) return;
    state.announcedCameras.add(key);
    recordEmittedAlert('📷 Cámara de fotodetección', 'Cámara detectada a ' + rounded + ' metros.', 'camera:' + key);
    speak(state.language === 'es'
      ? `Atención: cámara de fotodetección a ${rounded} metros.`
      : `Traffic enforcement camera ${rounded} meters ahead.`);
  }

  function updateRouteSummary(route) {
    const durationMillis = route.durationMillis || 0;
    const arrival = new Date(Date.now() + durationMillis);
    const locale = state.language === 'es' ? 'es-CO' : 'en-US';
    const distance = route.distanceMeters ? route.distanceMeters / (state.settings?.units === 'mi' ? 1609.344 : 1000) : 0;
    $('#arrival-time').textContent = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(arrival);
    $('#summary-distance').textContent = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(distance)} ${state.settings?.units === 'mi' ? 'mi' : 'km'}`;
    $('#summary-duration').textContent = `${Math.max(1, Math.round(durationMillis / 60000))} ${t('minutes')}`;
    $('#route-summary-overlay').hidden = false;
  }

  function decodePolyline(encoded, precision = 6) {
    const coordinates = [];
    const factor = 10 ** precision;
    let index = 0;
    let latitude = 0;
    let longitude = 0;
    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      latitude += result & 1 ? ~(result >> 1) : result >> 1;
      result = 0;
      shift = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      longitude += result & 1 ? ~(result >> 1) : result >> 1;
      coordinates.push([longitude / factor, latitude / factor]);
    }
    return coordinates;
  }

  // Traffic lights mapped in OpenStreetMap, always shown when zoomed in.
  // Missing OSM records are not interpreted as an absence of traffic lights.
  // Independently documented traffic-light intersections in Cali.
  // These are street names, not fabricated coordinates. Resolve against OSM
  // geocoding before plotting; never display a point at an unverified location.
  let CALI_OFFICIAL_SIGNALS = [
    'Calle 16 con Carrera 66', 'Calle 16 con Carrera 50',
    'Calle 16 con Carrera 44', 'Calle 16 con Carrera 80',
    'Calle 16 con Carrera 86', 'Calle 16 con Carrera 100'
  ];
  const officialSignalCoordinates = new Map();
  let officialSignalBusy = false;
  let officialSignalAttempted = false;
  async function loadCaliOfficialInventory() {
    try {
      const api = 'https://datos.cali.gov.co/api/3/action/datastore_search?resource_id=0ada8281-3f82-458f-b7c2-1ab4f71ef587&limit=1000';
      const response = await fetchTimed(api,{headers:{Accept:'application/json'}},14000);
      if (!response.ok) return;
      const payload = await response.json();
      const names = (payload.result?.records || []).map(r => String(r.DIRECCION || '').trim()).filter(Boolean);
      if (names.length) CALI_OFFICIAL_SIGNALS = [...new Set([...CALI_OFFICIAL_SIGNALS,...names])];
    } catch (error) { console.info('TRAZIA: official Cali inventory unavailable',error.message); }
  }
  async function loadOfficialCaliSignals() {
    if (officialSignalBusy || !state.mapReady || !state.map) return;
    const c = state.map.getCenter();
    if (c.lat < 3.30 || c.lat > 3.55 || c.lng < -76.65 || c.lng > -76.40) return;
    officialSignalBusy = true;
    officialSignalAttempted = true;
    try {
      await loadCaliOfficialInventory();
      const stored = JSON.parse(localStorage.getItem('trazia:official-cali-signals') || '{}');
      for (const [name,coords] of Object.entries(stored)) {
        if (Array.isArray(coords) && coords.length === 2) officialSignalCoordinates.set(name,coords);
      }
      let attempts = 0;
      for (const name of CALI_OFFICIAL_SIGNALS) {
        if (attempts >= 12) break;
        attempts++;
        if (officialSignalCoordinates.has(name)) continue;
        // Nominatim is rate limited; at most one address lookup per second.
        const params = new URLSearchParams({q:name+', Cali, Valle del Cauca, Colombia',format:'jsonv2',limit:'1',countrycodes:'co'});
        try {
          const response = await fetchTimed('https://nominatim.openstreetmap.org/search?'+params, {headers:{Accept:'application/json'}},10000);
          if (response.ok) {
            const items = await response.json();
            const match = items[0];
            const lat = Number(match?.lat), lon = Number(match?.lon);
            if (Number.isFinite(lat) && Number.isFinite(lon) && lat>3.3 && lat<3.55 && lon> -76.65 && lon< -76.4
                && /cal(i|í)/i.test(match.display_name || '')
                && name.match(/(?:calle|cl|carrera|cra|cr|avenida|av)\s*\d+/ig)?.every(part =>
                  (match.display_name || '').toLowerCase().includes(part.match(/\d+/)?.[0] || '---'))) {
              officialSignalCoordinates.set(name,[lon,lat]);
              try { localStorage.setItem('trazia:official-cali-signals',JSON.stringify(Object.fromEntries(officialSignalCoordinates))); } catch {}
            }
          }
        } catch (error) { console.info('TRAZIA: official signal geocode unavailable',error.message); }
        await new Promise(resolve => setTimeout(resolve,1100));
      }
    } finally { officialSignalBusy = false; updateOfficialCaliSignalSource(); }
  }
  function updateOfficialCaliSignalSource() {
    const source = state.map?.getSource('trazia-official-cali-signals');
    if (!source) return;
    source.setData({type:'FeatureCollection',features:[...officialSignalCoordinates].map(([name,coords])=>({
      type:'Feature',properties:{name,source:'Alcaldía de Cali / geocodificación OSM'},geometry:{type:'Point',coordinates:coords}
    }))});
  }
  const trafficSignalCache = new Map();
  let trafficSignalTimer = null;
  let trafficSignalRequest = 0;
  let trafficSignalLoadingKey = null;
  let trafficSignalLoadedKey = null;
  const trafficSignalEmpty = () => ({ type: 'FeatureCollection', features: [] });

  function renderTrafficSignals() {
    if (!state.mapReady || !state.map?.isStyleLoaded()) return;
    if (!state.map.getSource('trazia-traffic-signals')) {
      state.map.addSource('trazia-traffic-signals', { type: 'geojson', data: trafficSignalEmpty() });
    }
    // A fixed, high-contrast traffic-light pictogram, like the reference screenshot.
    // Drawn to a canvas and registered as a pixel-ratio-2 image to avoid platform emoji differences.
    if (!state.map.hasImage('trazia-signal-png')) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 112;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(56,56,51,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#f8c746';
        ctx.beginPath(); ctx.arc(56,56,46,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#283745';
        ctx.fillRect(40,22,32,68);
        for (const [y,color] of [[37,'#f25d55'],[56,'#f9c84a'],[75,'#38c879']]) {
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(56,y,8,0,Math.PI*2); ctx.fill();
        }
        const image = ctx.getImageData(0,0,112,112);
        state.map.addImage('trazia-signal-png', image, { pixelRatio: 2 });
      }
    }
    if (!state.map.getLayer('trazia-traffic-signals-icon')) {
      state.map.addLayer({
        id: 'trazia-traffic-signals-icon',
        type: 'symbol',
        source: 'trazia-traffic-signals',
        minzoom: 9,
        layout: {
          'icon-image': 'trazia-signal-png',
          'icon-size': ['interpolate',['linear'],['zoom'],9,0.48,13,0.65,17,0.85],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-pitch-alignment': 'viewport',
          'icon-rotation-alignment': 'viewport'
        }
      });
    }
    if (!state.map.getSource('trazia-official-cali-signals')) {
      state.map.addSource('trazia-official-cali-signals',{type:'geojson',data:trafficSignalEmpty()});
    }
    if (!state.map.getLayer('trazia-official-cali-signals-icon')) {
      state.map.addLayer({
        id:'trazia-official-cali-signals-icon',type:'symbol',source:'trazia-official-cali-signals',minzoom:9,
        layout:{'icon-image':'trazia-signal-png','icon-size':['interpolate',['linear'],['zoom'],9,0.48,13,0.65,17,0.85],
          'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-pitch-alignment':'viewport'}
      });
    }
    updateOfficialCaliSignalSource();
    keepRouteInForeground();
  }

  function scheduleTrafficSignals() {
    clearTimeout(trafficSignalTimer);
    trafficSignalTimer = setTimeout(() => { void loadTrafficSignals(); }, 550);
    if (!officialSignalBusy && !officialSignalAttempted) void loadOfficialCaliSignals();
  }

  async function loadTrafficSignals() {
    if (!state.mapReady || !state.map || document.hidden || state.map.getZoom() < 9) return;
    renderTrafficSignals();
    const source = state.map.getSource('trazia-traffic-signals');
    if (!source) return;
    const center = state.map.getCenter();
    const key = center.lat.toFixed(2) + ':' + center.lng.toFixed(2);
    if (key === trafficSignalLoadingKey) return;
    let cached = trafficSignalCache.get(key);
    if (!cached) {
      try {
        const stored = JSON.parse(localStorage.getItem('trazia:traffic-signals:' + key) || 'null');
        if (stored?.data?.features?.length && Date.now() - stored.time < 7 * 86400000) {
          cached = stored;
          trafficSignalCache.set(key, stored);
        }
      } catch {}
    }
    if (cached?.data?.features?.length && Date.now() - cached.time < 7 * 86400000) {
      if (trafficSignalLoadedKey !== key) source.setData(cached.data);
      trafficSignalLoadedKey = key;
      return;
    }
    trafficSignalLoadingKey = key;
    const request = ++trafficSignalRequest;
    // Query a neighborhood large enough to cover the visible intersections.
    const radiusLat = 0.025;
    const radiusLng = radiusLat / Math.max(0.3, Math.cos(center.lat * Math.PI / 180));
    const bounds = [center.lat-radiusLat,center.lng-radiusLng,center.lat+radiusLat,center.lng+radiusLng]
      .map(n => n.toFixed(5)).join(',');
    const query = '[out:json][timeout:20];node["highway"="traffic_signals"](' + bounds + ');out body;';
    try {
      const payload = await requestOverpass(query, 24000);
      const features = (payload.elements || [])
        .filter(el => Number.isFinite(el.lat) && Number.isFinite(el.lon))
        .map(el => ({type:'Feature',geometry:{type:'Point',coordinates:[el.lon,el.lat]},properties:{id:el.id}}));
      // Empty data may reflect incomplete OSM coverage. Never cache it for a week
      // or erase previously rendered signals when the provider returns no nodes.
      if (!features.length) {
        console.info('TRAZIA: No hay semáforos registrados en OpenStreetMap para esta zona:', key);
        return;
      }
      const data = {type:'FeatureCollection',features};
      const record = {time:Date.now(),data};
      trafficSignalCache.set(key,record);
      try { localStorage.setItem('trazia:traffic-signals:' + key, JSON.stringify(record)); } catch {}
      if (trafficSignalCache.size > 40) trafficSignalCache.delete(trafficSignalCache.keys().next().value);
      // Allow the last successful request to populate the map even if a newer
      // camera movement triggered another lookup.
      const liveSource = state.map?.getSource('trazia-traffic-signals');
      if (liveSource && request >= trafficSignalRequest - 1) {
        liveSource.setData(data);
        trafficSignalLoadedKey = key;
      }
    } catch (error) {
      console.warn('TRAZIA: Falló la consulta de semáforos:',error.message);
    } finally {
      if (trafficSignalLoadingKey === key) trafficSignalLoadingKey = null;
    }
  }

  // School zones from mapped schools and signed school-zone roads in OSM.
  const schoolZoneCache = new Map();
  let schoolZoneTimer = null;
  let schoolZones = [];
  let schoolAlerted = new Set();
  let schoolRequest = 0;
  function schoolBanner() {
    let banner = document.getElementById('trazia-school-warning');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'trazia-school-warning';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.style.cssText = 'position:fixed;z-index:110;top:calc(72px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(92vw,380px);padding:13px 18px;border:3px solid #eab308;border-radius:16px;background:#162b43;color:white;box-shadow:0 8px 28px #0008;font:bold 17px/1.4 system-ui;text-align:center;pointer-events:none';
      banner.hidden = true;
      document.body.appendChild(banner);
    }
    return banner;
  }
  function updateSchoolWarning(user) {
    const banner = schoolBanner();
    if (!user || !schoolZones.length) { banner.hidden = true; return; }
    const closest = schoolZones.map((zone) => ({ zone, meters: distanceMeters(user, zone.position) }))
      .filter((item) => item.meters <= 500)
      .sort((a, b) => a.meters - b.meters)[0];
    if (!closest) { banner.hidden = true; return; }
    const { zone, meters } = closest;
    banner.textContent = '🚸 ZONA ESCOLAR · ' + Math.max(0, Math.ceil(meters / 50) * 50) + ' m · Reduzca la velocidad';
    banner.hidden = false;
    if (!schoolAlerted.has(zone.id)) {
      schoolAlerted.add(zone.id);
      recordEmittedAlert('🚸 Zona escolar', 'Zona escolar detectada a 500 metros o menos.', 'school:' + zone.id);
      if (schoolAlerted.size > 300) schoolAlerted.clear();
      speak(state.language === 'es' ? 'Atención, zona escolar a quinientos metros o menos. Reduzca la velocidad.' : 'Attention, school zone ahead. Reduce speed.');
    }
  }
  function renderSchoolZones() {
    if (!state.mapReady || !state.map?.isStyleLoaded()) return;
    const sourceId = 'trazia-school-zones';
    if (!state.map.getSource(sourceId)) state.map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    if (!state.map.getLayer(sourceId)) state.map.addLayer({
      id: sourceId, type: 'symbol', source: sourceId, minzoom: 12,
      layout: { 'text-field': '🚸', 'text-size': 24, 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-pitch-alignment': 'viewport' },
    });
    keepRouteInForeground();
  }
  function scheduleSchoolZones() {
    clearTimeout(schoolZoneTimer);
    schoolZoneTimer = setTimeout(() => { void loadSchoolZones(); }, 850);
  }
  async function loadSchoolZones() {
    if (!state.mapReady || !state.map || document.hidden) return;
    renderSchoolZones();
    const center = state.currentPosition || currentMapCenter();
    if (!center) return;
    const key = center.lat.toFixed(2) + ':' + center.lng.toFixed(2);
    const cached = schoolZoneCache.get(key);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
      schoolZones = cached.zones;
      state.map.getSource('trazia-school-zones')?.setData(cached.data);
      updateSchoolWarning(state.currentPosition);
      return;
    }
    const request = ++schoolRequest;
    const deltaLat = 0.023;
    const deltaLng = 0.023 / Math.max(0.3, Math.cos(center.lat * Math.PI / 180));
    const bounds = [center.lat - deltaLat, center.lng - deltaLng, center.lat + deltaLat, center.lng + deltaLng]
      .map((v) => v.toFixed(5)).join(',');
    const query = '[out:json][timeout:14];(nwr["amenity"="school"](' + bounds + ');nwr["maxspeed:conditional"~"school"](' + bounds + ');way["hazard"="school"](' + bounds + '););out center;';
    try {
      const payload = await requestOverpass(query, 18000);
      if (request !== schoolRequest) return;
      const zones = (payload.elements || []).map((el) => ({
        id: el.type + '/' + el.id,
        position: { lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon },
      })).filter((zone) => Number.isFinite(zone.position.lat) && Number.isFinite(zone.position.lng));
      const data = { type: 'FeatureCollection', features: zones.map((zone) => ({
        type: 'Feature', properties: { id: zone.id },
        geometry: { type: 'Point', coordinates: [zone.position.lng, zone.position.lat] },
      })) };
      schoolZoneCache.set(key, { time: Date.now(), zones, data });
      if (schoolZoneCache.size > 30) schoolZoneCache.delete(schoolZoneCache.keys().next().value);
      schoolZones = zones;
      state.map.getSource('trazia-school-zones')?.setData(data);
      updateSchoolWarning(state.currentPosition);
    } catch (error) {
      console.info('School zone data unavailable:', error.message);
    }
  }

  async function requestOverpass(query, timeoutMs = 18000) {
    // Public Overpass instances can reject cross-origin POSTs from GitHub Pages.
    // Try GET as well, across independent endpoints, and validate the response.
    const endpoints = [
      ...(isLocalApiHost() ? ['/api/overpass'] : []),
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.nchc.org.tw/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
      'https://overpass-api.de/api/interpreter',
    ];
    let lastError;
    for (const endpoint of endpoints) {
      for (const method of ['GET', 'POST']) {
        try {
          const url = method === 'GET' ? endpoint + '?data=' + encodeURIComponent(query) : endpoint;
          const options = method === 'GET'
            ? { method: 'GET', headers: { Accept: 'application/json' } }
            : { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' }, body: new URLSearchParams({ data: query }).toString() };
          const response = await fetchTimed(url, options, Math.min(12000, timeoutMs));
          if (!response.ok) throw new Error('Overpass ' + response.status + ' at ' + endpoint);
          const payload = await response.json();
          if (!Array.isArray(payload.elements)) throw new Error('Invalid Overpass response');
          return payload;
        } catch (error) {
          lastError = error;
        }
      }
    }
    throw lastError || new Error('Overpass unavailable');
  }

  async function findCityBoundary(center) {
    const cacheKey = `${center.lat.toFixed(3)}:${center.lng.toFixed(3)}`;
    if (state.cityBoundaryCache.has(cacheKey)) return state.cityBoundaryCache.get(cacheKey);
    const query = `[out:json][timeout:14];is_in(${center.lat},${center.lng})->.containing;area.containing["boundary"="administrative"]["admin_level"~"^(5|6|7|8)$"];out tags;`;
    const payload = await requestOverpass(query, 14000);
    const candidates = (payload.elements || []).filter((element) => element.type === 'area' && element.tags?.boundary === 'administrative' && Number.isFinite(Number(element.tags.admin_level)));
    const boundary = candidates.sort((a, b) => Number(b.tags.admin_level) - Number(a.tags.admin_level))[0]?.id ?? null;
    state.cityBoundaryCache.set(cacheKey, boundary);
    return boundary;
  }

  function nearbyTagFilters(category) {
    return {
      gas: ['["amenity"="fuel"]'],
      clinic: ['["amenity"~"^(clinic|hospital|doctors)$"]', '["healthcare"~"^(clinic|hospital|doctor)$"]'],
      pharmacy: ['["amenity"="pharmacy"]', '["healthcare"="pharmacy"]'],
      business: ['["shop"]', '["office"]', '["amenity"~"^(restaurant|cafe|bank|marketplace|bar|fast_food)$"]'],
    }[category] || [];
  }

  function makeNearbySearchPlan(center) {
    return { points: [center], radius: 10000, onRoute: false };
  }

  function makeNearbyOverpassQuery(category, plan) {
    const point = plan.points[0];
    const searches = nearbyTagFilters(category).map((filter) => `nwr(around:10000,${point.lat},${point.lng})${filter};`).join('\n');
    return `[out:json][timeout:22];(${searches});out center tags qt 1500;`;
  }

  function nearbyFeaturesWithinRadius(features, center, radius = 10000) {
    return features.map((feature) => {
      const [lng, lat] = feature.geometry?.coordinates || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { feature, distance: distanceMeters(center, { lat, lng }) };
    }).filter((item) => item && item.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .map((item) => item.feature);
  }

  function nearbyFeatureCategory(feature, category) {
    const properties = feature.properties || {};
    const key = properties.osm_key;
    const value = properties.osm_value;
    return {
      gas: key === 'amenity' && value === 'fuel',
      clinic: key === 'amenity' && ['clinic', 'hospital', 'doctors'].includes(value) || key === 'healthcare' && ['clinic', 'hospital', 'doctor'].includes(value),
      pharmacy: ['amenity', 'healthcare'].includes(key) && value === 'pharmacy',
      business: ['shop', 'office'].includes(key) || key === 'amenity' && ['restaurant', 'cafe', 'bank', 'marketplace', 'bar', 'fast_food'].includes(value),
    }[category] || false;
  }

  function overpassFeature(element) {
    const tags = element.tags || {};
    const point = element.type === 'node' ? [element.lon, element.lat] : [element.center?.lon, element.center?.lat];
    if (!point.every(Number.isFinite)) return null;
    const properties = {
      name: tags.name || tags.brand || tags.operator || '',
      fullAddress: tags['addr:full'] || '',
      openingHours: tags.opening_hours || '',
      phone: tags['contact:phone'] || tags.phone || '',
      website: tags['contact:website'] || tags.website || '',
      housenumber: tags['addr:housenumber'] || '',
      street: tags['addr:street'] || tags['addr:place'] || '',
      city: tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '',
      state: tags['addr:state'] || '',
      country: tags['addr:country'] || '',
    };
    if (!properties.name) {
      const kind = tags.amenity || tags.healthcare || tags.shop || tags.office || t('nearbyPlaces');
      properties.name = kind.replaceAll('_', ' ');
    }
    return { id: `${element.type}/${element.id}`, geometry: { type: 'Point', coordinates: point }, properties };
  }

  async function searchNearbyTomTom(category, center) {
    const key = window.TRAZIA_CONFIG?.tomtomApiKey;
    if (!key) return null; // Existing OpenStreetMap fallback remains available.
    const queries = {
      gas: 'gas station', clinic: 'hospital clinic',
      pharmacy: 'pharmacy', business: 'shop store'
    };
    const url = new URL('https://api.tomtom.com/search/2/poiSearch/' + encodeURIComponent(queries[category]) + '.json');
    url.searchParams.set('key',key);
    url.searchParams.set('lat',String(center.lat));
    url.searchParams.set('lon',String(center.lng));
    url.searchParams.set('radius','10000');
    url.searchParams.set('limit','40');
    url.searchParams.set('countrySet','CO');
    url.searchParams.set('language',state.language === 'es' ? 'es-ES' : 'en-US');
    const response = await fetchTimed(url.toString(),{headers:{Accept:'application/json'}},14000);
    if (!response.ok) throw new Error('TomTom POI ' + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload.results)) throw new Error('Invalid TomTom POI response');
    return payload.results.filter(item => {
      const p = item.position;
      return Number.isFinite(p?.lat) && Number.isFinite(p?.lon) && item.address?.countryCode === 'CO';
    }).map(item => ({
      id:'tomtom/'+item.id,
      type:'Feature',
      geometry:{type:'Point',coordinates:[item.position.lon,item.position.lat]},
      properties:{
        name:item.poi?.name || item.address?.freeformAddress || '',
        fullAddress:item.address?.freeformAddress || '',
        street:item.address?.streetName || '',
        city:item.address?.municipality || '',
        source:'TomTom',
      }
    }));
  }

  async function searchNearby(category) {
    const requestId = ++state.nearbyRequestId;
    $$('.category-button').forEach((button) => button.classList.toggle('active', button.dataset.category === category));
    const results = $('#place-results');
    results.hidden = false;
    results.replaceChildren();
    results.className = 'place-results';
    if (!state.mapReady) {
      results.textContent = t('nearbyNeedsMaps');
      results.className = 'place-results place-results-message';
      showToast(t('nearbyNeedsMaps'));
      return;
    }
    results.textContent = t('connecting');
    clearPlaceMarkers();
    try {
      const center = state.currentPosition || currentMapCenter();
      if (!center) throw new Error('location-unavailable');
      const plan = makeNearbySearchPlan(center);
      const scope = state.currentPosition ? t('nearbyFromLocation') : t('nearbyFromMap');
      const cacheKey = `${category}:${center.lat.toFixed(4)},${center.lng.toFixed(4)}:10km`;
      const cached = state.nearbyCache.get(cacheKey);
      let features;
      if (cached && cached.expiresAt > Date.now()) features = cached.features;
      else {
        try {
          features = await searchNearbyTomTom(category, center);
        } catch (tomtomError) {
          console.info('TRAZIA: TomTom nearby POI unavailable; using open map data:',tomtomError.message);
        }
        if (!features?.length) try {
          const query = makeNearbyOverpassQuery(category, plan);
          const payload = await requestOverpass(query, 30000);
          const unique = new Map();
          (payload.elements || []).forEach((element) => {
            const feature = overpassFeature(element);
            if (feature) unique.set(feature.id, feature);
          });
          features = [...unique.values()];
        } catch (overpassError) {
          console.info('Trazia is using the nearby-search fallback:', overpassError.message);
          const queries = {
            gas: state.language === 'es' ? 'gasolinera' : 'gas station',
            clinic: state.language === 'es' ? 'clínica hospital' : 'clinic hospital',
            pharmacy: state.language === 'es' ? 'farmacia' : 'pharmacy',
            business: state.language === 'es' ? 'tienda negocio' : 'shop business',
          };
          const params = new URLSearchParams({ q: queries[category], limit: '30', lang: photonLanguage(), lat: String(center.lat), lon: String(center.lng), zoom: '14' });
          const payload = await fetchPhotonFeatures(params);
          features = (payload.features || []).filter((feature) => nearbyFeatureCategory(feature, category));
        }
        state.nearbyCache.set(cacheKey, { expiresAt: Date.now() + 3 * 60 * 1000, features });
      }
      if (requestId !== state.nearbyRequestId) return;
      features = nearbyFeaturesWithinRadius(features, center, 10000).slice(0, 30);
      results.replaceChildren();
      if (!features.length) {
        results.textContent = t('nearbyEmpty10');
        return;
      }
      const summary = document.createElement('p');
      summary.className = 'nearby-summary';
      summary.textContent = `${scope} · ${features.length} ${t('nearbyResults')}`;
      results.append(summary);
      const finder = document.createElement('input');
      finder.type = 'search';
      finder.placeholder = '🔎 Buscar por nombre o dirección entre estos lugares';
      finder.setAttribute('aria-label','Buscar lugares cercanos');
      finder.style.cssText = 'width:100%;box-sizing:border-box;margin:10px 0 14px;padding:13px 15px;border-radius:14px;border:1px solid #58606c;background:#22272d;color:#fff;font:inherit';
      results.append(finder);
      const placeRows = [];
      finder.addEventListener('input', () => {
        const term = finder.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
        placeRows.forEach(({row,searchText}) => { row.hidden = !!term && !searchText.includes(term); });
      });
      features.forEach((feature) => {
        const coordinates = feature.geometry?.coordinates;
        const parts = photonFeatureParts(feature.properties || {});
        if (coordinates?.length === 2) {
          const markerElement = document.createElement('div');
          markerElement.className = 'trazia-place-marker';
          markerElement.textContent = categoryLabels[category].icon;
          const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' }).setLngLat(coordinates).addTo(state.map);
          state.placeMarkers.push(marker);
        }
        const row = document.createElement('div');
        row.className = 'place-result';
        const icon = document.createElement('span');
        icon.className = 'place-result-icon';
        icon.textContent = categoryLabels[category].icon;
        const text = document.createElement('div');
        text.className = 'place-result-copy';
        const name = document.createElement('button');
        name.type = 'button';
        name.className = 'place-result-name';
        name.textContent = parts.main || t('nearbyPlaces');
        const meta = document.createElement('div');
        meta.className = 'place-result-meta';
        const [lng, lat] = coordinates;
        const point = { lat, lng };
        const distance = distanceMeters(center, point);
        const distanceLabel = `${new Intl.NumberFormat(state.language === 'es' ? 'es-CO' : 'en-US', { maximumFractionDigits: 1 }).format(distance / 1000)} km`;
        const properties = feature.properties || {};
        const address = properties.fullAddress || [properties.street, properties.housenumber, properties.city].filter(Boolean).join(', ') || t('noAddress');
        meta.textContent = [address, distanceLabel].join(' · ');
        name.addEventListener('click', () => state.map.flyTo({ center: coordinates, zoom: 16, duration: 500, offset: mobileMapOffset() }));
        text.append(name, meta);
        const go = document.createElement('button');
        go.type = 'button';
        go.textContent = '📍 Ir aquí · Trazar ruta';
        go.style.cssText = 'display:block;margin:9px 0;padding:10px 13px;border-radius:12px;border:1px solid #32c6ac;background:#16443f;color:#fff;font:inherit;font-weight:700;cursor:pointer';
        go.addEventListener('click', () => {
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          const label = parts.main || properties.name || 'Destino seleccionado';
          state.followCamera = true;
          setDestinationText(label);
          state.selectedDestination = {label,location:{lat,lng},temporary:true,query:label};
          void searchRoute({automatic:false,target:state.selectedDestination});
        });
        text.append(go);
        if (properties.openingHours) {
          const hours = document.createElement('div');
          hours.className = 'place-result-details';
          hours.textContent = `${t('nearbyHours')}: ${properties.openingHours}`;
          text.append(hours);
        }
        const contacts = document.createElement('div');
        contacts.className = 'place-result-contacts';
        if (properties.phone) {
          const phone = document.createElement('a');
          const dial = String(properties.phone).replace(/[^+\d;,]/g, '');
          if (/\d/.test(dial)) { phone.href = `tel:${dial}`; phone.textContent = properties.phone; contacts.append(phone); }
        }
        if (properties.website) {
          try {
            const website = new URL(/^https?:\/\//i.test(properties.website) ? properties.website : `https://${properties.website}`);
            if (['http:', 'https:'].includes(website.protocol) && !website.username && !website.password) {
              const link = document.createElement('a');
              link.href = website.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = t('nearbyWebsite'); contacts.append(link);
            }
          } catch { /* Invalid place URLs are not offered as links. */ }
        }
        text.append(contacts);
        row.append(icon, text);
        results.append(row);
        placeRows.push({row,searchText:(parts.main+' '+address).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()});
      });
      const note = document.createElement('p');
      note.className = 'nearby-summary'; note.textContent = t('nearbyDataNote'); results.append(note);
      const latitudeRadius = 10000 / 111195;
      const longitudeRadius = latitudeRadius / Math.max(0.1, Math.cos(center.lat * Math.PI / 180));
      state.followCamera = false;
      state.map.fitBounds([[center.lng - longitudeRadius, center.lat - latitudeRadius], [center.lng + longitudeRadius, center.lat + latitudeRadius]], { padding: 40, maxZoom: 13, duration: 500 });
      $('#clear-places').hidden = false;
    } catch (error) {
      if (requestId !== state.nearbyRequestId) return;
      console.error('Trazia open place search failed:', error);
      results.textContent = t('nearbyUnavailable');
      showToast(t('nearbyUnavailable'), true);
    }
  }

  function clearPlaceMarkers() {
    state.placeMarkers.forEach((marker) => marker.remove());
    state.placeMarkers = [];
    $('#clear-places').hidden = true;
  }

  function clearPlaces() {
    state.nearbyRequestId += 1;
    clearPlaceMarkers();
    $('#place-results').replaceChildren();
    $('#place-results').hidden = true;
    $$('.category-button').forEach((button) => button.classList.remove('active'));
    showToast(t('clearPlaces'));
  }

  function currentMapCenter() {
    if (state.map?.getCenter) {
      const center = state.map.getCenter();
      return { lat: center.lat, lng: center.lng };
    }
    return state.currentPosition;
  }

  function updateCommunityReportStatus(status, error) {
    state.reportStatus = status;
    reportMenu?.setConnection(status);
    if (error) console.info('Trazia shared reports:', error.code || error.message);
  }

  async function connectCommunityReports(user) {
    state.reportFeed?.stop();
    const session = ++state.reportSession;
    state.reportFeed = null;
    state.reportService = null;
    state.communityUser = user;
    state.publishingReport = false;
    reportMenu?.setBusy(false);
    updateCommunityReportStatus('connecting');
    try {
      const service = await createCommunityReportService(window.TRAZIA_CONFIG?.firebase, user);
      if (session !== state.reportSession) return;
      state.reportService = service;
      state.reportFeed = watchCommunityReports(service, {
        onReports: (reports) => {
          if (session !== state.reportSession) return;
          state.reports = reports;
          if (state.mapReady) renderSavedReportMarkers(); else renderReportCount();
        },
        onStatus: (status, error) => { if (session === state.reportSession) updateCommunityReportStatus(status, error); },
      });
    } catch (error) {
      if (session === state.reportSession) updateCommunityReportStatus('error', error);
    }
  }

  async function saveReport() {
    if (state.publishingReport) return;
    const draft = reportMenu.draft();
    if (!draft) return;
    if (!state.reportService || state.reportStatus !== 'ready' || navigator.onLine === false) {
      $('#report-error').textContent = communityReportError({code: 'offline'});
      return;
    }
    const session = state.reportSession;
    const revision = reportMenu.revision();
    state.publishingReport = true;
    reportMenu.setBusy(true);
    try {
      await state.reportService.publish(draft);
      if (session !== state.reportSession) return;
      if (reportDialog.open && reportMenu.revision() === revision) closeDialog(reportDialog);
      showToast(t('reportSaved'));
    } catch (error) {
      if (session !== state.reportSession) return;
      $('#report-error').textContent = communityReportError(error);
    } finally {
      if (session === state.reportSession) {
        state.publishingReport = false;
        reportMenu.setBusy(false);
      }
    }
  }

  function addReportMarker(report) {
    const label = incidentLabels[report.type]?.[state.language] || t('report');
    const markerElement = document.createElement('button');
    markerElement.type = 'button';
    markerElement.className = `trazia-report-marker report-${report.type}`;
    markerElement.textContent = ({ traffic: '🚗', police: '👮', crash: '💥', security: '🦺', hazard: '⚠️', lane: '🚧', closure: '⛔', map: '🗺️', animal: '🐄', weather: '⛈️', fuel: '⛽', assistance: '🛟', place: '📍' })[report.type] || '⚠️';
    markerElement.title = label;
    markerElement.setAttribute('aria-label', label);
    const details = document.createElement('div');
    details.className = 'report-popup';
    const title = document.createElement('strong');
    title.textContent = label;
    details.append(title);
    for (const value of [report.subtype, report.placeName]) {
      if (typeof value === 'string' && value) {
        const line = document.createElement('p'); line.textContent = value; details.append(line);
      }
    }
    if (report.fuel && Number.isFinite(report.fuel.price) && report.fuel.price > 0) {
      const line = document.createElement('p');
      line.textContent = `${report.fuel.type || ''} · ${new Intl.NumberFormat(state.language === 'es' ? 'es-CO' : 'en-US').format(report.fuel.price)} COP / ${report.fuel.unit || ''}`;
      details.append(line);
    }
    if (report.details) {
      const description = document.createElement('p');
      description.textContent = report.details;
      details.append(description);
    }
    const date = new Date(report.createdAt);
    if (Number.isFinite(date.getTime())) {
      const time = document.createElement('p');
      time.textContent = date.toLocaleString(state.language === 'es' ? 'es-CO' : 'en-US');
      details.append(time);
    }
    const source = document.createElement('small');
    source.textContent = t(report.shared ? 'sharedReportNote' : 'localReports');
    details.append(source);
    const popup = new maplibregl.Popup({ offset: 22, maxWidth: '260px' }).setDOMContent(details);
    const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
      .setLngLat([report.lng, report.lat])
      .setPopup(popup)
      .addTo(state.map);
    if (!state.trafficEnabled) marker.getElement().style.display = 'none';
    state.reportMarkers.push(marker);
  }

  function renderSavedReportMarkers() {
    state.reportMarkers.forEach((marker) => marker.remove());
    state.reportMarkers = [];
    state.reports.filter((report) => Number.isFinite(report.lat) && Number.isFinite(report.lng)).forEach(addReportMarker);
    renderReportCount();
  }

  function toggleTraffic() {
    state.trafficEnabled = $('#traffic-toggle').checked;
    state.reportMarkers.forEach((marker) => { marker.getElement().style.display = state.trafficEnabled ? '' : 'none'; });
    showToast(state.trafficEnabled ? t('trafficEnabled') : t('trafficDisabled'));
  }

  async function searchSpokenDestination(query) {
    setDestinationText(query);
    if (state.isNavigating) setNavigationView(false);
    app.classList.add('panel-expanded');
    $('.side-panel').classList.add('expanded');
    $('#toggle-panel').setAttribute('aria-expanded', 'true');
    state.autocompleteRequestId += 1;
    const requestId = state.autocompleteRequestId;
    window.clearTimeout(state.autocompleteTimer);
    state.autocompleteController?.abort();
    const controller = new AbortController();
    state.autocompleteController = controller;
    showSuggestionMessage(t('suggestionLoading'), true);
    destinationInput.focus({ preventScroll: true });
    // Avoid opening the keyboard over spoken search results on a phone.
    destinationInput.blur();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const features = await findDestinationCandidates(query, state.currentPosition, controller.signal, { allowNominatimFallback: true });
      if (requestId !== state.autocompleteRequestId || destinationInput.value.trim() !== query) return;
      state.autocompleteQuery = query;
      renderDestinationSuggestions(features);
      $('#voice-status').textContent = features.length
        ? (state.language === 'es' ? 'Elegí el lugar correcto para calcular la ruta.' : 'Choose the correct place to calculate the route.')
        : (state.language === 'es' ? 'Probá con otra dirección, negocio o municipio.' : 'Try another address, business or city.');
    } catch {
      if (requestId !== state.autocompleteRequestId || destinationInput.value.trim() !== query) return;
      showSuggestionMessage(t('autocompleteUnavailable'));
      appendSuggestionAttribution($('#destination-suggestions'));
    } finally {
      window.clearTimeout(timeout);
      if (state.autocompleteController === controller) state.autocompleteController = null;
      state.map?.resize();
    }
  }

  function navigationArrow(type, instruction = '') {
    // Valhalla maneuver types: use route data rather than a later turn in the
    // spoken instruction (which may include both right and left).
    const kinds = {
      1: 'straight', 2: 'slight-right', 3: 'slight-left', 4: 'straight',
      5: 'slight-right', 6: 'slight-left', 7: 'straight', 8: 'straight',
      9: 'slight-right', 10: 'right', 11: 'sharp-right', 12: 'uturn-right',
      13: 'uturn-left', 14: 'sharp-left', 15: 'left', 16: 'slight-left',
      17: 'straight', 18: 'slight-right', 19: 'slight-left', 20: 'slight-right',
      21: 'slight-left', 22: 'straight', 23: 'slight-right', 24: 'slight-left',
      25: 'straight', 26: 'roundabout', 27: 'slight-right', 37: 'slight-right', 38: 'slight-left',
    };
    let kind = kinds[type];
    if (!kind) {
      const first = instruction.split(/\b(?:despu[eé]s|luego|then)\b/i)[0];
      if (/rotonda|glorieta|roundabout/i.test(first)) kind = 'roundabout';
      else if (/retorno|vuelta en u|u-turn/i.test(first)) kind = /izquierda|left/i.test(first) ? 'uturn-left' : 'uturn-right';
      else if (/derecha|right/i.test(first)) kind = 'right';
      else if (/izquierda|left/i.test(first)) kind = 'left';
      else kind = 'straight';
    }
    const paths = {
      straight: 'M16 28V5M8 13l8-8 8 8',
      right: 'M8 28V16a5 5 0 0 1 5-5h14M20 4l7 7-7 7',
      slight: 'M9 28V20c0-3 1-5 3-7L25 3M15 3h10v10',
      sharp: 'M8 28V10c0-5 3-6 6-3l12 12M26 9v10H16',
      uturn: 'M7 28V12a9 9 0 0 1 18 0v9M18 14l7 7 6-7',
      roundabout: 'M16 29v-7a7 7 0 1 1 7-7h6M24 10l5 5-5 5',
    };
    const shape = kind.startsWith('uturn') ? 'uturn' : kind.startsWith('slight') ? 'slight' : kind.startsWith('sharp') ? 'sharp' : kind === 'left' ? 'right' : kind;
    return { kind, path: paths[shape], transform: kind.endsWith('left') || kind === 'left' ? 'translate(32 0) scale(-1 1)' : '' };
  }

  function updateNavigationInstruction(instruction, step = state.navigationSteps[state.activeStep]) {
    $('#navigation-instruction').textContent = instruction;
    const arrow = navigationArrow(step?.maneuverType, instruction);
    const path = $('#navigation-arrow-path');
    path.setAttribute('d', arrow.path);
    path.setAttribute('transform', arrow.transform);
    $('#navigation-banner').dataset.direction = arrow.kind;
  }

  function speak(text, preview = false) {
    if ((!state.voiceEnabled && !preview) || !text || $('#voice-search-dialog')?.open || !shouldSpeakNavigation(text,preview)) return;
    const speech = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    if (!speech || !Utterance) {
      if (state.isNavigating) showToast(t('voicePlaybackError'), true);
      return;
    }
    speech.cancel();
    speech.resume?.();
    const utterance = new Utterance(text.replace(/<[^>]*>/g, ' '));
    utterance.lang = state.language === 'es' ? 'es-CO' : 'en-US';
    utterance.rate = 0.96;
    utterance.volume = 1;
    utterance.pitch = 1;
    const preferredLanguage = state.language === 'es' ? /^es(?:-|$)/i : /^en(?:-|$)/i;
    const voices = speech.getVoices();
    const selectedVoice = voices.find((voice) => voice.voiceURI && voice.voiceURI === state.settings?.voiceURI);
    const preferredVoice = selectedVoice || voices.find((voice) => voice.lang.toLowerCase() === (state.language === 'es' ? 'es-co' : 'en-us'))
      || voices.find((voice) => preferredLanguage.test(voice.lang));
    if (preferredVoice) { utterance.voice = preferredVoice; utterance.lang = preferredVoice.lang; }
    utterance.onerror = (event) => {
      if (!['canceled', 'interrupted'].includes(event.error)) {
        console.info('Trazia speech playback failed:', event.error);
        if (preview && $('#settings-voice-availability')) $('#settings-voice-availability').textContent = t('voicePlaybackError');
        if (state.isNavigating) showToast(t('voicePlaybackError'), true);
      }
    };
    speech.speak(utterance);
  }

  async function startNavigation({ position: initialPosition = state.currentPosition, requestId = state.routeRequestId } = {}) {
    if (state.isNavigating) return;
    if (!state.mapReady || !state.route || state.routeCoordinates.length < 2) {
      showToast(t('navigationNeedsRoute'));
      return;
    }
    const route = state.route;
    try {
      const position = initialPosition || await getUserPosition();
      if (state.isNavigating || requestId !== state.routeRequestId || route !== state.route || state.routeSearchController?.signal.aborted) return;
      if (!Number.isFinite(position?.lat) || !Number.isFinite(position?.lng)) throw new Error('invalid-position');
      collapseMobilePanel();
      state.isNavigating = true;
      state.compassMode = 'follow';
      localStorage.setItem('trazia:compass-mode', 'follow');
      updateCompassControl();
      clearNavigationSearch();
      setNavigationView(true);
      state.announcedCameras.clear();
      state.followCamera = true;
      state.activeStep = 0;
      state.offRouteFixes = 0;
      const firstStep = state.navigationSteps[state.activeStep];
      if (firstStep) firstStep.alertSpoken = true;
      const firstInstruction = firstStep?.instructions || t('navigationFollowRoute');
      $('#route-note').textContent = firstInstruction;
      updateNavigationInstruction(firstInstruction, firstStep);
      $('#navigation-banner').hidden = false;
      speak(firstInstruction);
      if (navigator.geolocation?.watchPosition) {
        startLocationWatch();
      }
      updateRouteProgress(position);
      setMap3d(true);
      if (state.userMarker) state.userMarker.setLngLat([position.lng, position.lat]);
      state.map.flyTo({ center: [position.lng, position.lat], zoom: 18, pitch: state.is3d ? 55 : 0, bearing: compassBearing(), duration: 700, offset: mobileMapOffset() });
      void requestNavigationWakeLock();
      showToast(state.settings?.lightsReminder ? 'Recordá revisar las luces antes de salir.' : t('navigationStarted'));
    } catch {
      if (requestId === state.routeRequestId && route === state.route) showToast(t('navigationLocation'), true);
    }
  }

  function onNavigationPosition(position) {
    if (document.getElementById('trazia-sleep-screen')?.hidden === false) return;
    if (!saveUserPosition(position)) return;
    const user = state.currentPosition;
    if (state.mapReady && state.map && (state.followCamera || state.isNavigating)) {
      state.map.easeTo({
        center: [user.lng, user.lat],
        zoom: state.map.getZoom(),
        pitch: state.is3d ? 55 : 0,
        bearing: compassBearing(),
        duration: 380,
        offset: mobileMapOffset(),
      });
    }
    if (!state.isNavigating) return;
    updateRouteProgress(user);
    const accuracy = Number.isFinite(state.lastLocationAccuracy) ? state.lastLocationAccuracy : 0;
    const destination = (state.activeDestination || state.selectedDestination)?.location;
    if (destination && distanceMeters(user, destination) <= Math.max(40, Math.min(70, accuracy))) {
      stopNavigation(false);
      speak(t('arrived'));
      showToast(t('arrived'));
      return;
    }
    if (state.routeCoordinates.length >= 2 && !state.isRerouting && !state.routeSearchController) {
      const distanceFromRoute = distanceFromRouteMeters(user, state.routeCoordinates);
      const threshold = Math.max(45, Math.min(90, accuracy * 1.2 + 20));
      state.offRouteFixes = distanceFromRoute > threshold ? state.offRouteFixes + 1 : 0;
      if (state.offRouteFixes >= 2 && Date.now() - state.lastRerouteAt >= 12000) {
        state.isRerouting = true;
        state.offRouteFixes = 0;
        $('#route-note').textContent = t('rerouting');
        updateNavigationInstruction(t('rerouting'), null);
        $('#camera-approach-alert').hidden = true;
        showToast(t('rerouting'));
        void searchRoute({ automatic: true, target: state.activeDestination });
        return;
      }
    }
    const step = state.navigationSteps[state.activeStep];
    if (!step) {
      updateNavigationInstruction(t('navigationFollowRoute'), null);
      announceCameraAhead(user);
      return;
    }
    const end = step.endLocation;
    const endPoint = typeof end?.lat === 'function' ? { lat: end.lat(), lng: end.lng() } : end;
    if (!endPoint) { announceCameraAhead(user); return; }
    const metersToManeuver = distanceMeters(user, endPoint);
    if (!step.alertSpoken && metersToManeuver <= 650) {
      step.alertSpoken = true;
      speak(step.alertInstruction || step.instructions);
    }
    if (!step.preSpoken && metersToManeuver <= 230) {
      step.preSpoken = true;
      const preInstruction = step.preInstruction || step.instructions;
      $('#route-note').textContent = preInstruction;
      updateNavigationInstruction(preInstruction, step);
      speak(preInstruction);
    }
    if (metersToManeuver <= 65) {
      state.activeStep += 1;
      const next = state.navigationSteps[state.activeStep];
      if (!next) {
        const finalInstruction = t('navigationFollowRoute');
        $('#route-note').textContent = finalInstruction;
        updateNavigationInstruction(finalInstruction, null);
        announceCameraAhead(user);
        return;
      }
      $('#route-note').textContent = next.instructions;
      updateNavigationInstruction(next.instructions, next);
      next.alertSpoken = true;
      speak(next.instructions);
    }
    announceCameraAhead(user);
  }

  function distanceMeters(a, b) {
    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadius * Math.asin(Math.sqrt(h));
  }

  function distanceFromRouteMeters(point, coordinates) {
    const radians = Math.PI / 180;
    const earthRadius = 6371000;
    const longitudeScale = Math.cos(point.lat * radians) * earthRadius * radians;
    const latitudeScale = earthRadius * radians;
    let minimum = Infinity;
    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const [startLng, startLat] = coordinates[index];
      const [endLng, endLat] = coordinates[index + 1];
      const startX = (startLng - point.lng) * longitudeScale;
      const startY = (startLat - point.lat) * latitudeScale;
      const endX = (endLng - point.lng) * longitudeScale;
      const endY = (endLat - point.lat) * latitudeScale;
      const segmentX = endX - startX;
      const segmentY = endY - startY;
      const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
      const projection = segmentLengthSquared ? Math.max(0, Math.min(1, -(startX * segmentX + startY * segmentY) / segmentLengthSquared)) : 0;
      const x = startX + projection * segmentX;
      const y = startY + projection * segmentY;
      minimum = Math.min(minimum, Math.hypot(x, y));
    }
    return minimum;
  }

  async function requestNavigationWakeLock() {
    if (state.settings?.keepAwake === false || !state.isNavigating || document.hidden) return;
    if (!navigator.wakeLock) { updateScreenLockStatus(false); return; }
    if (state.wakeLockPending || (state.screenWakeLock && !state.screenWakeLock.released)) return;
    const generation = state.wakeLockGeneration || 0;
    state.wakeLockPending = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (state.settings?.keepAwake === false || !state.isNavigating || document.hidden || generation !== (state.wakeLockGeneration || 0)) {
        await lock.release();
        return;
      }
      state.screenWakeLock = lock;
      updateScreenLockStatus(true);
      lock.addEventListener('release', () => {
        if (state.screenWakeLock !== lock) return;
        state.screenWakeLock = null;
        updateScreenLockStatus(false);
        if (state.isNavigating && !document.hidden) {
          window.clearTimeout(state.wakeLockRetry);
          state.wakeLockRetry = window.setTimeout(() => { void requestNavigationWakeLock(); }, 1200);
        }
      });
    } catch { updateScreenLockStatus(false); }
    finally {
      state.wakeLockPending = false;
      if (generation !== (state.wakeLockGeneration || 0) && state.isNavigating && !document.hidden) void requestNavigationWakeLock();
    }
  }

  function updateScreenLockStatus(held) {
    const button = $('#screen-lock-status');
    if (!button) return;
    button.hidden = !state.isNavigating;
    button.dataset.held = String(held);
    button.textContent = state.language === 'es'
      ? (held ? 'Pantalla encendida' : 'Pantalla sin protección · toca para reintentar')
      : (held ? 'Screen stays awake' : 'Screen may lock · tap to retry');
  }

  function releaseNavigationWakeLock() {
    window.clearTimeout(state.wakeLockRetry);
    state.wakeLockGeneration = (state.wakeLockGeneration || 0) + 1;
    const lock = state.screenWakeLock;
    state.screenWakeLock = null;
    lock?.release?.()?.catch?.(() => {});
  }

  function suspendAppView() {
    state.resumeSplashPending = true;
    releaseNavigationWakeLock();
  }

  function resumeAppView() {
    if (document.hidden) return;
    if (state.resumeSplashPending) {
      state.resumeSplashPending = false;
      runSplashScreen();
    }
    if (state.theme === 'auto') applyTheme();
    state.map?.resize();
    void requestNavigationWakeLock();
  }

  function setNavigationView(active) {
    app.classList.toggle('navigation-fullscreen', active);
    $('#finish-navigation').hidden = !active;
    updateScreenLockStatus(Boolean(state.screenWakeLock && !state.screenWakeLock.released));
    if (!active) {
      $('.side-panel').classList.remove('expanded');
      app.classList.remove('panel-expanded');
      $('#toggle-panel').setAttribute('aria-expanded', 'false');
      $('.panel-scroll').scrollTop = 0;
    }
    state.map?.resize();
    window.requestAnimationFrame(() => state.map?.resize());
    if (active) $('#finish-navigation').focus({ preventScroll: true });
    else (window.matchMedia('(max-width: 820px)').matches ? $('#toggle-panel') : $('#search-route')).focus({ preventScroll: true });
  }

  function stopNavigation(showMessage = true) {
    state.isNavigating = false;
    setNavigationView(false);
    state.isRerouting = false;
    state.offRouteFixes = 0;
    state.followCamera = false;
    state.map?.stop();
    // Invalidate every pending calculation so a late response cannot redraw
    // the route after the user has stopped navigation.
    state.routeRequestId += 1;
    state.routeSearchController?.abort();
    state.routeSearchController = null;
    $('#search-route').disabled = false;
    clearRoutePolylines();
    state.route = null;
    state.activeDestination = null;
    state.currentRoutes = [];
    state.navigationSteps = [];
    state.activeStep = 0;
    $('#route-duration').innerHTML = `— <small>${t('minutes')}</small>`;
    $('#route-distance').innerHTML = `— <small>${t('kilometers')}</small>`;
    $('#navigation-banner').hidden = true;
    $('#camera-approach-alert').hidden = true;
    if (state.updatePending) {
      state.updatePending = false;
      window.setTimeout(() => window.location.reload(), 400);
    }
    window.speechSynthesis?.cancel();
    releaseNavigationWakeLock();
    if (showMessage) $('#route-note').textContent = t('navigationStopped');
    if (showMessage) showToast(t('navigationStopped'));
  }

  function setupEvents() {
    $('#finish-navigation').addEventListener('click', () => stopNavigation());
    $('#screen-lock-status').addEventListener('click', () => { void requestNavigationWakeLock(); });
    $('#language-select').addEventListener('change', (event) => applyLanguage(event.target.value));
    $$('.vehicle-choice').forEach((button) => button.addEventListener('click', () => setVehicleType(button.dataset.vehicle)));
    $('#theme-select').addEventListener('change', (event) => {
      state.theme = event.target.value;
      localStorage.setItem('trazia:theme', state.theme);
      applyTheme();
    });
    const profileDialog = $('#trazia-profile-dialog');
    const defaultAvatar = './assets/trazia-app-icon.png';
    function avatarKey() { return profileUser?.uid ? 'trazia:avatar:' + profileUser.uid : null; }
    refreshProfileMenu = function refreshProfileMenu() {
      const avatar = avatarKey() ? localStorage.getItem(avatarKey()) : null;
      $('#menu-avatar').src = avatar || profileUser?.photoURL || defaultAvatar;
      $('#menu-display-name').textContent = profileUser?.displayName || profileUser?.email?.split('@')[0] || 'Mi perfil';
    }
    function openProfileEditor() {
      if (!profileUser) { showToast('Inicia sesión para editar tu perfil.', true); return; }
      $('#trazia-profile-name').value = profileUser.displayName || '';
      $('#trazia-profile-email').textContent = profileUser.email || '';
      $('#trazia-profile-avatar').src = $('#menu-avatar').src;
      $('#trazia-profile-image').value = '';
      $('#trazia-profile-status').textContent = '';
      closeDialog(menuDialog);
      openDialog(profileDialog);
    }
    $('#menu-profile').addEventListener('click', openProfileEditor);
    $('#trazia-profile-image').addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2_000_000) {
        $('#trazia-profile-status').textContent = 'Selecciona una imagen JPG, PNG o WebP menor de 2 MB.';
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => { $('#trazia-profile-avatar').src = reader.result; };
      reader.readAsDataURL(file);
    });
    $('#trazia-profile-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!profileUser) return;
      const name = $('#trazia-profile-name').value.trim();
      if (!name) return;
      const status = $('#trazia-profile-status');
      status.textContent = 'Guardando…';
      try {
        const { updateProfile } = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');
        await updateProfile(profileUser, { displayName: name });
        const key = avatarKey();
        if (key && $('#trazia-profile-image').files.length) {
          localStorage.setItem(key, $('#trazia-profile-avatar').src);
        }
        refreshProfileMenu();
        status.textContent = 'Perfil actualizado.';
      } catch (error) {
        status.textContent = 'No se pudo guardar el perfil. ' + (error?.message || '');
      }
    });
    const tripDialog = $('#trazia-trip-dialog');
    let plannedTrips = [];
    const tripNotified = new Set();
    const tripStorageKey = () => profileUser?.uid ? 'trazia:planned-trips:' + profileUser.uid : null;
    function loadPlannedTrips() {
      try {
        const key = tripStorageKey();
        const data = key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
        plannedTrips = Array.isArray(data) ? data.filter(t => t && typeof t.destination === 'string' && typeof t.when === 'string') : [];
      } catch { plannedTrips = []; }
      renderPlannedTrips();
    }
    function savePlannedTrips() {
      const key = tripStorageKey();
      if (key) localStorage.setItem(key, JSON.stringify(plannedTrips));
      renderPlannedTrips();
    }
    function renderPlannedTrips() {
      const list = $('#trazia-trip-list');
      list.replaceChildren();
      if (!plannedTrips.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Todavía no tienes viajes planeados.';
        empty.style.color = '#bfc2c7';
        list.append(empty);
        return;
      }
      for (const trip of [...plannedTrips].sort((a,b) => a.when.localeCompare(b.when))) {
        const card = document.createElement('div');
        card.style.cssText = 'padding:14px;border:1px solid #50545a;border-radius:14px;display:grid;gap:8px';
        const title = document.createElement('strong');
        title.textContent = '📍 ' + trip.destination;
        const date = document.createElement('span');
        const dt = new Date(trip.when);
        date.textContent = Number.isNaN(dt.getTime()) ? trip.when : dt.toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'});
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap';
        const navigate = document.createElement('button');
        navigate.type = 'button'; navigate.textContent = 'Ver ruta';
        navigate.addEventListener('click', () => {
          closeDialog(tripDialog);
          setDestinationText(trip.destination);
          void searchRoute();
        });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.textContent = 'Eliminar';
        remove.addEventListener('click', () => {
          plannedTrips = plannedTrips.filter(t => t.id !== trip.id);
          savePlannedTrips();
        });
        actions.append(navigate,remove);
        card.append(title,date,actions);
        list.append(card);
      }
    }
    function showTripPlanner() {
      $('#trazia-trip-intro').hidden = true;
      $('#trazia-trip-planner').hidden = false;
      $('#trazia-trip-destination').focus();
    }
    $('#trazia-trip-start').addEventListener('click', showTripPlanner);
    $('#menu-schedule').addEventListener('click', () => {
      closeDialog(menuDialog);
      loadPlannedTrips();
      $('#trazia-trip-intro').hidden = false;
      $('#trazia-trip-planner').hidden = true;
      $('#trazia-trip-status').textContent = '';
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      $('#trazia-trip-date').min = local.toISOString().slice(0,10);
      $('#trazia-trip-date').value = local.toISOString().slice(0,10);
      $('#trazia-trip-time').value = '08:00';
      openDialog(tripDialog);
    });
    function updateTripSuggestions() {
      const query = $('#trazia-trip-destination').value.trim().toLocaleLowerCase();
      const list = $('#trazia-trip-suggestions');
      list.replaceChildren();
      if (query.length < 2) return;
      const candidates = [
        ...state.savedPlaces.map(p => p.name),
        ...state.recentDestinations
      ].filter((v,i,a) => typeof v === 'string' && v.toLocaleLowerCase().includes(query) && a.indexOf(v) === i).slice(0,6);
      for (const name of candidates) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '⌕ ' + name;
        button.style.cssText = 'text-align:left;padding:10px;background:#363a40;color:white;border:0;border-radius:8px';
        button.addEventListener('click', () => {
          $('#trazia-trip-destination').value = name;
          list.replaceChildren();
        });
        list.append(button);
      }
    }
    $('#trazia-trip-destination').addEventListener('input',updateTripSuggestions);
    $('#trazia-trip-form').addEventListener('submit',event => {
      event.preventDefault();
      if (!profileUser?.uid) { $('#trazia-trip-status').textContent = 'Inicia sesión para guardar viajes.'; return; }
      const destination = $('#trazia-trip-destination').value.trim();
      const when = $('#trazia-trip-date').value + 'T' + $('#trazia-trip-time').value;
      const timestamp = new Date(when).getTime();
      if (!destination || !Number.isFinite(timestamp) || timestamp < Date.now()) {
        $('#trazia-trip-status').textContent = 'Indica un destino y una fecha futura.';
        return;
      }
      plannedTrips.push({
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2,8),
        destination,when,reminder: Number($('#trazia-trip-reminder').value)
      });
      savePlannedTrips();
      $('#trazia-trip-form').reset();
      $('#trazia-trip-suggestions').replaceChildren();
      $('#trazia-trip-status').textContent = 'Viaje guardado en este dispositivo.';
      $('#trazia-trip-intro').hidden = true;
      $('#trazia-trip-planner').hidden = true;
    });
    function checkPlannedTripReminders() {
      if (!profileUser?.uid || document.hidden) return;
      const now = Date.now();
      for (const trip of plannedTrips) {
        const due = new Date(trip.when).getTime() - Number(trip.reminder || 0) * 60000;
        if (Number.isFinite(due) && now >= due && now - due < 60000 && !tripNotified.has(trip.id)) {
          tripNotified.add(trip.id);
          showToast('⏰ Viaje programado: ' + trip.destination);
          recordEmittedAlert('⏰ Recordatorio de viaje',trip.destination,'trip:' + trip.id);
        }
      }
    }
    refreshPlannedTrips = loadPlannedTrips;
    clearPlannedTrips = () => { plannedTrips = []; tripNotified.clear(); renderPlannedTrips(); };
    window.setInterval(checkPlannedTripReminders,15000);
    $('#menu-inbox').addEventListener('click', () => { closeDialog(menuDialog); renderInbox(); openDialog($('#trazia-inbox-dialog')); });
    $('#trazia-inbox-clear').addEventListener('click', () => { inboxItems = []; if (inboxKey()) localStorage.removeItem(inboxKey()); renderInbox(); });
    $('#menu-companion').addEventListener('click', () => { closeDialog(menuDialog); showToast('Los acompañantes estarán disponibles próximamente.'); });
    const helpDialog = $('#trazia-help-dialog');
    const helpContent = $('#trazia-help-content');
    const helpTopics = [
      ['¿Cómo iniciar una ruta?', 'Busca un destino, selecciona la ruta y toca Iniciar navegación. Activa la ubicación precisa para obtener mejores resultados.'],
      ['¿Cómo cambiar el vehículo o la flecha?', 'Abre el menú de configuración de vehículo y elige el icono de navegación. TRAZIA recuerda la selección.'],
      ['¿Cómo activar las indicaciones de voz?', 'Toca el botón de sonido del mapa y selecciona Normal, Menos conversación, Solo alertas o Desactivado.'],
      ['¿Por qué faltan semáforos o zonas escolares?', 'Las ubicaciones dependen de los registros disponibles en OpenStreetMap y de la conexión a internet.'],
      ['¿Dónde se guardan mis viajes y alertas?', 'Se guardan por cuenta en el navegador de este dispositivo; no se sincronizan automáticamente entre teléfonos.']
    ];
    function showHelpTopics() {
      helpContent.replaceChildren();
      const heading = document.createElement('h3'); heading.textContent = 'Centro de ayuda';
      helpContent.append(heading);
      for (const [question,answer] of helpTopics) {
        const details = document.createElement('details');
        details.style.cssText = 'border-top:1px solid #4c5158;padding:14px 0';
        const summary = document.createElement('summary');
        summary.textContent = question;
        const p = document.createElement('p');
        p.textContent = answer;
        p.style.color = '#c3c5ca';
        details.append(summary,p);
        helpContent.append(details);
      }
    }
    $('#menu-help').addEventListener('click', () => {
      closeDialog(menuDialog);
      helpContent.replaceChildren();
      openDialog(helpDialog);
    });
    $('#trazia-help-faq').addEventListener('click',showHelpTopics);
    $('#trazia-help-chat').addEventListener('click',() => {
      showHelpTopics();
      showToast('Asistencia guiada disponible. El chat de IA aún no está conectado.');
    });
    $('#trazia-help-community').addEventListener('click',() => {
      helpContent.replaceChildren();
      const p = document.createElement('p');
      p.textContent = 'La comunidad de TRAZIA aún no está habilitada. Puedes enviar comentarios desde Informar un problema.';
      helpContent.append(p);
    });
    $('#trazia-help-feedback').addEventListener('click',() => {
      helpContent.replaceChildren();
      const heading = document.createElement('h3'); heading.textContent = 'Informar un problema';
      const form = document.createElement('form');
      form.style.cssText = 'display:grid;gap:12px';
      const category = document.createElement('select');
      category.setAttribute('aria-label','Categoría');
      for (const label of ['Mapa o GPS','Navegación','Audio y alertas','Cuenta y perfil','Otro']) {
        const opt = document.createElement('option'); opt.value = label; opt.textContent = label; category.append(opt);
      }
      const description = document.createElement('textarea');
      description.required = true; description.maxLength = 2000; description.rows = 5;
      description.placeholder = 'Describe qué ocurrió y cómo reproducir el problema';
      description.style.cssText = 'width:100%;box-sizing:border-box;padding:12px;border-radius:10px';
      const submit = document.createElement('button');
      submit.type = 'submit'; submit.textContent = 'Guardar comentario';
      submit.className = 'primary-button';
      const status = document.createElement('p'); status.setAttribute('role','status');
      form.append(category,description,submit,status);
      form.addEventListener('submit',event => {
        event.preventDefault();
        if (!profileUser?.uid) { status.textContent = 'Inicia sesión para guardar el comentario.'; return; }
        const key = 'trazia:feedback:' + profileUser.uid;
        try {
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const items = Array.isArray(existing) ? existing : [];
          items.unshift({category:category.value,description:description.value.trim(),time:new Date().toISOString()});
          localStorage.setItem(key,JSON.stringify(items.slice(0,30)));
          status.textContent = 'Comentario guardado en este dispositivo. Aún no se envía al equipo de soporte.';
          description.value = '';
        } catch { status.textContent = 'No se pudo guardar el comentario.'; }
      });
      helpContent.append(heading,form);
    });
    $('#trazia-help-logs').addEventListener('click',() => {
      const diagnostic = {
        app:'TRAZIA',time:new Date().toISOString(),
        platform:navigator.platform,online:navigator.onLine,
        mapReady:Boolean(state.mapReady),locationPermission:'No incluida',
        routeActive:Boolean(state.isNavigating)
      };
      const blob = new Blob([JSON.stringify(diagnostic,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'trazia-diagnostico.json';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url),1000);
      showToast('Diagnóstico generado. No incluye contraseñas ni ubicación exacta.');
    });
    let sleeping = false;
    function setSleepMode(enabled) {
      if (sleeping === enabled) return;
      sleeping = enabled;
      const screen = $('#trazia-sleep-screen');
      screen.hidden = !enabled;
      screen.style.display = enabled ? 'flex' : 'none';
      document.body.style.overflow = enabled ? 'hidden' : '';
      if (enabled) {
        // Explicitly stop active navigation and geolocation polling.
        if (state.isNavigating) stopNavigation(false);
        state.followCamera = false;
        if (state.locationWatch !== null) {
          navigator.geolocation?.clearWatch(state.locationWatch);
          state.locationWatch = null;
        }
        window.speechSynthesis?.cancel();
        state.map?.stop();
      } else {
        startLocationWatch();
        window.requestAnimationFrame(() => state.map?.resize());
      }
    }
    $('#menu-sleep').addEventListener('click', () => { closeDialog(menuDialog); setSleepMode(true); });
    $('#trazia-sleep-wake').addEventListener('click', () => setSleepMode(false));
    $('#open-menu').addEventListener('click', () => openDialog(menuDialog));
    $('#menu-search').addEventListener('click', () => {
      closeDialog(menuDialog);
      $('.side-panel').classList.add('expanded');
      $('#toggle-panel').setAttribute('aria-expanded', 'true');
      destinationInput.focus({ preventScroll: true });
    });
    $('#menu-music').addEventListener('click', (event) => {
      closeDialog(menuDialog);
      musicDock?.open(event);
    });
    $('#menu-reports').addEventListener('click', () => {
      closeDialog(menuDialog);
      openDialog(reportDialog);
    });
    $('#menu-settings').addEventListener('click', () => {
      closeDialog(menuDialog);
      openDialog(settingsDialog);
    });
    $('#toggle-panel').addEventListener('click', (event) => {
      const expanded = $('.side-panel').classList.toggle('expanded');
      app.classList.toggle('panel-expanded', expanded);
      event.currentTarget.setAttribute('aria-expanded', String(expanded));
      window.setTimeout(() => state.map?.resize(), 300);
    });
    $('#toggle-map-credits').addEventListener('click', (event) => {
      const credits = $('#map-credits');
      credits.hidden = !credits.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!credits.hidden));
    });
    $('#open-report-map').addEventListener('click', () => openDialog(reportDialog));
    $$('.music-service').forEach((button) => button.addEventListener('click', (event) => openMusicService(button.dataset.musicService, event)));
    $('#toggle-voice').addEventListener('click', openVoiceModeDialog);
    $('#quick-places').addEventListener('click', (event) => {
      const button = event.target.closest('[data-place-id]');
      if (button) selectSavedPlace(button.dataset.placeId);
    });
    $('#save-place').addEventListener('click', () => { void saveSavedPlace(); });
    savedPlaceDialog.addEventListener('close', resetSavedPlaceSearch);
    ['#saved-place-name', '#saved-place-address', '#saved-place-icon'].forEach(selector => $(selector).addEventListener('input', resetSavedPlaceSearch));
    $('#search-route').addEventListener('click', () => { void searchRoute(); });
    $('#recalculate-route').addEventListener('click', () => { void searchRoute(); });
    destinationInput.addEventListener('input', handleDestinationInput);
    destinationInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' && !$('#destination-suggestions').hidden) {
        event.preventDefault();
        setActiveDestinationSuggestion(state.activeSuggestionIndex + 1);
        return;
      }
      if (event.key === 'ArrowUp' && !$('#destination-suggestions').hidden) {
        event.preventDefault();
        setActiveDestinationSuggestion(state.activeSuggestionIndex < 0 ? 0 : state.activeSuggestionIndex - 1);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!$('#destination-suggestions').hidden && state.autocompletePredictions.length) {
          if (state.activeSuggestionIndex < 0) {
            setActiveDestinationSuggestion(0);
            $('#route-note').textContent = t('chooseAddress');
            return;
          }
          void selectDestinationSuggestion(state.activeSuggestionIndex);
          return;
        }
        void searchRoute();
      }
      if (event.key === 'Escape') closeDestinationSuggestions();
    });
    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.destination-autocomplete')) closeDestinationSuggestions();
      if (!event.target.closest('#map-credits, #toggle-map-credits')) {
        $('#map-credits').hidden = true;
        $('#toggle-map-credits').setAttribute('aria-expanded', 'false');
      }
    });
    setupVoiceSearch({ window, document, language: () => state.language,
      onQuery: searchSpokenDestination,
      onManual: () => {
        if (state.isNavigating) setNavigationView(false);
        app.classList.add('panel-expanded');
        $('.side-panel').classList.add('expanded');
        $('#toggle-panel').setAttribute('aria-expanded', 'true');
        destinationInput.focus();
        state.map?.resize();
      },
      message: (text) => showToast(text, true),
    });
    $('#locate-me').addEventListener('click', () => { void locateMe(); });
    $('#map-locate').addEventListener('click', () => { void locateMe(); });
    $('#traffic-toggle').addEventListener('change', toggleTraffic);
    $('#live-traffic-toggle').checked = state.liveTrafficEnabled;
    $('#live-traffic-toggle').addEventListener('change', (event) => {
      state.liveTrafficEnabled = event.target.checked;
      state.liveTrafficBlocked = false;
      localStorage.setItem('trazia:live-traffic', state.liveTrafficEnabled ? 'on' : 'off');
      renderLiveTraffic();
      updateLiveTrafficStatus();
    });
    $('#avoid-tolls').checked = state.avoidTolls;
    $('#avoid-tolls').addEventListener('change', (event) => { state.avoidTolls = event.target.checked; localStorage.setItem('trazia:avoid-tolls', state.avoidTolls ? 'on' : 'off'); });
    $('.category-button').forEach((button) => button.addEventListener('click', () => {
      const results = $('#place-results');
      if (button.classList.contains('active') && !results.hidden) {
        clearPlaces();
      } else {
        void searchNearby(button.dataset.category);
      }
    }));
    $('#clear-places').addEventListener('click', clearPlaces);
    $('#open-report').addEventListener('click', () => openDialog(reportDialog));
    $('#save-report').addEventListener('click', saveReport);
    $('#open-settings').addEventListener('click', () => openDialog(settingsDialog));
    $('#open-settings-footer').addEventListener('click', () => openDialog(settingsDialog));
    $('#zoom-in').addEventListener('click', () => {
      if (state.map) state.map.setZoom(state.map.getZoom() + 1);
      else showToast(t('demoNotice'));
    });
    $('#zoom-out').addEventListener('click', () => {
      if (state.map) state.map.setZoom(state.map.getZoom() - 1);
      else showToast(t('demoNotice'));
    });
    $('#toggle-3d').addEventListener('click', () => setMap3d(!state.is3d));
    $('#compass-control').addEventListener('click', toggleCompassMode);
    updateCompassControl();
    $$('[data-close]').forEach((button) => button.addEventListener('click', () => closeDialog($(`#${button.dataset.close}`))));
    [menuDialog, musicDialog, savedPlaceDialog, reportDialog, settingsDialog, weatherDialog, sosDialog].forEach((dialog) => dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.isNavigating && !document.querySelector('dialog[open]')) stopNavigation();
    });
  }

  function renderSavedReportCount() {
    renderReportCount();
  }

  function initialize() {
    window.TRAZIA_APP_INITIALIZED = true;
    runSplashScreen();
    applyLanguage(state.language);
    applyTheme();
    setupEvents();
    state.sos = setupSOS({ window, document, openDialog, language: () => state.language,
      getPosition: async ({ request }) => {
        if (request) return getUserPosition();
        return state.currentPosition && Date.now() - state.lastLocationTimestamp <= 60_000 ? state.currentPosition : null;
      },
    });
    state.weatherBadge = setupWeatherBadge({ window, document, openDialog,
      getContext: () => ({
        position: state.currentPosition || currentMapCenter() || { lng: DEFAULT_MAP_CENTER[0], lat: DEFAULT_MAP_CENTER[1] },
        source: state.currentPosition ? 'gps' : 'map',
        unit: state.settings.weatherUnit,
        language: state.language,
      }),
    });
    musicDock = setupMusicDock({ window, document, getService: () => state.musicService, language: () => state.language, onChoose: () => openDialog(musicDialog) });
    reportMenu = setupReportMenu({ document, language: () => state.language,
      center: currentMapCenter, position: () => state.currentPosition,
      reports: () => [...state.reports.filter((report) => report.authorId === state.communityUser?.uid), ...state.legacyReports],
      message: (text) => { $('#report-error').textContent = text; },
      reconnect: () => { if (state.communityUser) void connectCommunityReports(state.communityUser); },
      remove: async (report) => {
        if (report.shared) {
          if (report.authorId !== state.communityUser?.uid || !state.reportService || navigator.onLine === false) throw new Error('offline');
          await state.reportService.remove(report.id);
          state.reports = state.reports.filter((item) => item.id !== report.id);
        } else {
          const next = state.legacyReports.filter((item) => item.id !== report.id);
          localStorage.setItem('trazia:reports', JSON.stringify(next));
          state.legacyReports = next;
        }
        if (state.mapReady) renderSavedReportMarkers(); else renderReportCount();
        return true;
      },
    });
    setupSettings({ document, storage: localStorage, preferences: state.settings, hooks: {
      state: () => state,
      message: (text) => showToast(text),
      language: applyLanguage,
      vehicle: setVehicleType,
      view: setMap3d,
      compass: (mode) => { if (mode !== state.compassMode) toggleCompassMode(); },
      voice: (enabled) => { state.voiceMode = enabled ? 'normal' : 'off'; state.voiceEnabled = Boolean(enabled); localStorage.setItem('trazia:voice-mode',state.voiceMode); localStorage.setItem('trazia:voice',enabled?'on':'off'); if (!enabled) window.speechSynthesis?.cancel(); updateVoiceToggle(); },
      testVoice: () => speak(t('voiceTest'), true),
      tolls: (enabled) => { $('#avoid-tolls').checked = enabled; $('#avoid-tolls').dispatchEvent(new Event('change')); },
      fuel: () => { void searchNearby('gas'); },
      audio: () => musicDock?.open(),
      recents: () => state.recentDestinations,
      clearRecents: () => { localStorage.removeItem('trazia:recent-destinations'); state.recentDestinations = []; renderRecentDestinations(); showToast('Ubicaciones recientes borradas.'); },
      change: (key) => {
        if (key === 'weatherUnit') state.weatherBadge.render();
        updateSpeedometer();
        if (key === 'keepAwake') { if (state.settings.keepAwake) void requestNavigationWakeLock(); else releaseNavigationWakeLock(); }
        if (key === 'cameraAlerts' && !state.settings.cameraAlerts) $('#camera-approach-alert').hidden = true;
        if (key === 'units' && state.route) {
          updateRouteSummary(state.route);
          const value = state.route.distanceMeters / (state.settings.units === 'mi' ? 1609.344 : 1000);
          $('#route-distance').textContent = `${new Intl.NumberFormat(state.language, {maximumFractionDigits: 1}).format(value)} ${state.settings.units}`;
        }
      },
    }});
    renderSavedPlaces();
    renderSavedPlaceMarkers();
    renderRecentDestinations();
    renderSavedReportCount();
    let mapStarted = false;
    setupAccountScreen({
      document,
      config: window.TRAZIA_CONFIG?.firebase,
      onEnter: (user) => {
        profileUser = user;
        loadInboxForUser(user?.uid);
        refreshProfileMenu();
        refreshPlannedTrips();
        const uid = user?.uid;
        if (!uid) return;
        if (state.savedPlacesOwner !== uid) {
          state.savedPlacesOwner = uid;
          state.savedPlaces = readSavedPlaces(uid);
          renderSavedPlaces();
          renderSavedPlaceMarkers();
        }
        state.weatherBadge.start();
        void connectCommunityReports(user);
        if (!mapStarted) {
          mapStarted = true;
          initializeMap();
          void locateMe({ silent: true });
        } else {
          state.map?.resize();
        }
      },
      onLeave: () => {
        profileUser = null;
        loadInboxForUser(null);
        clearPlannedTrips();
        refreshProfileMenu();
        $('#trazia-profile-dialog')?.close();
        state.savedPlacesOwner = null;
        state.savedPlaces = [];
        renderSavedPlaces();
        renderSavedPlaceMarkers();
        state.sos.close();
        state.weatherBadge.stop();
        musicDock?.close();
        state.reportFeed?.stop();
        state.reportSession += 1;
        state.reportFeed = null;
        state.reportService = null;
        state.communityUser = null;
        state.publishingReport = false;
        updateCommunityReportStatus('signedout');
        $('#voice-search-dialog').close();
        if (state.isNavigating) stopNavigation(false);
        [menuDialog, musicDialog, savedPlaceDialog, reportDialog, settingsDialog, weatherDialog, sosDialog].forEach((dialog) => dialog.close());
      },
    });
    updateSpeedometer();
    window.setInterval(() => { if (state.theme === 'auto') applyTheme(); }, 60_000);
    window.setInterval(refreshLiveTraffic, 60_000);
    window.setInterval(() => { if (state.isNavigating && !document.hidden) void requestNavigationWakeLock(); }, 15000);
    window.addEventListener('focus', () => { void requestNavigationWakeLock(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) suspendAppView();
      else { resumeAppView(); state.reportFeed?.refresh(); void state.weatherBadge.refresh(); }
    });
    window.addEventListener('online', () => { void state.weatherBadge.refresh(); if (state.communityUser && state.reportStatus !== 'ready') void connectCommunityReports(state.communityUser); });
    window.addEventListener('offline', () => { state.weatherBadge.render(); if (state.communityUser) updateCommunityReportStatus('offline'); });
    window.addEventListener('pagehide', suspendAppView);
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) state.resumeSplashPending = true;
      resumeAppView();
    });
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      let refreshing = false;
      const wasControlled = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!wasControlled || refreshing) return;
        if (state.isNavigating) {
          state.updatePending = true;
          return;
        }
        refreshing = true;
        window.location.reload();
      });
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch((error) => console.info('Trazia offline shell is unavailable:', error));
    }
  }

  initialize();
})();

