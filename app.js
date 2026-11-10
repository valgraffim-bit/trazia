import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl.mjs';

(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const app = $('.app-shell');
  const destinationInput = $('#destination-input');
  const statusText = $('#connection-status');
  const toast = $('#toast');
  const menuDialog = $('#app-menu-dialog');
  const savedPlaceDialog = $('#saved-place-dialog');
  const reportDialog = $('#report-dialog');
  const settingsDialog = $('#settings-dialog');
  const musicDialog = $('#music-dialog');
  const DEFAULT_MAP_CENTER = [-76.532, 3.452];
  const COLOMBIA_SEARCH_BOUNDS = { west: -82.2, south: -5.1, east: -66.5, north: 14.3 };

  const copy = {
    es: {
      tagline: 'Tu ruta, más clara', language: 'Idioma', demoMode: 'Cargando mapa Trazia…', mapReadyLabel: 'Mapa Trazia activo', mapSettings: 'Mapa Trazia', locationOff: 'Ubicación apagada', locationOn: 'Ubicación activada', menuSearch: 'Buscar destino', menuReport: 'Reportar algo en la vía', menuSettings: 'Ajustes', menuNote: 'Navegación clara, hecha por Trazia.', voiceEnabled: 'Voz de navegación activada', voiceMuted: 'Voz de navegación silenciada', voiceStarting: 'Preparando la guía de voz.', voiceTest: 'La voz de Trazia está activada.', voicePlaybackError: 'No se pudo reproducir la voz. Revisa el volumen del teléfono.', home: 'Casa', work: 'Trabajo', addNew: 'Nuevo', newPlace: 'Nuevo lugar', recent: 'Recientes', savedPlaceTitle: 'LUGARES GUARDADOS', savedPlaceName: 'Nombre', savedPlaceAddress: 'Dirección', savePlace: 'Guardar', placeRequired: 'Escribe un nombre y una dirección.', placeSaved: 'Lugar guardado.',
      vehicleLabel: 'Tu vehículo', vehicleCar: 'Carro', vehicleMotorcycle: 'Moto', vehicleTruck: 'Camión', vehicleBicycle: 'Bicicleta', vehicleMotorcycleNote: 'Las rutas para moto están en beta; revisa las indicaciones en tu zona.', vehicleBicycleNote: 'Las rutas en bicicleta pueden variar según las vías disponibles en tu zona.', vehicleTruckNote: 'La ruta de camión aplica restricciones de peso y dimensiones estándar; configúralas para mayor precisión.', vehicleTruckUnavailable: 'No se pudo calcular esta ruta para el camión seleccionado.', destinationMarkerLabel: 'Llegada', view3d: 'Activar vista 3D', view2d: 'Activar vista 2D', compassSwitchNorth: 'Cambiar a norte arriba', compassSwitchFollow: 'Seguir rumbo del vehículo', compassNorthActive: 'Brújula: norte arriba', compassFollowActive: 'Brújula: siguiendo el rumbo del vehículo', musicConnect: 'Conectar música', musicKicker: 'MÚSICA', musicTitle: 'Conecta tu app de música', musicIntegrationNote: 'Elige tu servicio y Trazia lo abrirá en este dispositivo. Los controles directos de reproducción requieren una conexión autorizada del proveedor.', musicOpen: 'Abrir', musicChosen: 'Elegida', musicOpening: 'Abriendo la app de música…',
      destinationPrompt: '¿A dónde quieres ir?', destinationPlaceholder: 'Busca una dirección o lugar', findRoute: 'Buscar ruta', myLocation: 'Mi ubicación', nearbyTitle: 'Explora cerca de tu ruta', clear: 'Limpiar', suggestionLoading: 'Buscando direcciones…', chooseAddress: 'Elige la dirección correcta de la lista para calcular la ruta.', autocompleteUnavailable: 'No se pudo consultar la búsqueda de direcciones. Intenta otra vez.', autocompleteAttribution: '© OpenStreetMap contributors',
      gasStations: 'Gasolineras', clinics: 'Clínicas', pharmacies: 'Farmacias', businesses: 'Negocios', suggestedRoute: 'RUTA TRAZIA', sampleDestination: 'Tu destino', lessTraffic: 'Ruta sugerida', minutes: 'min', kilometers: 'km', estimatedTime: 'Tiempo estimado', distance: 'Distancia', avoidTolls: 'Evitar peajes', startNavigation: 'Iniciar navegación', stopNavigation: 'Detener navegación', sampleTraffic: 'Datos abiertos · sin tráfico en vivo', sampleNote: 'Ruta calculada con datos abiertos; el tráfico en vivo aún no está disponible.', emptyRoute: 'Busca un destino para ver tu ruta.', arrivalTime: 'Llegada', routeDistanceLabel: 'Distancia', routeDurationLabel: 'Tiempo',
      communityTitle: 'Comparte lo que ves', communityCopy: 'Ayuda a otras personas con un reporte.', report: 'Reportar', localReports: 'En esta versión, los reportes se guardan en este dispositivo.', worldReady: 'Diseñada para usar en cualquier lugar', mapProviderLabel: 'Mapa Trazia', sampleMap: 'Mapa de Trazia', reportsLayer: 'Reportes', mapCaption: 'Mapa Trazia · datos abiertos de OpenStreetMap', mapCredits: 'Créditos del mapa',
      communityKicker: 'COMUNIDAD TRAZIA', reportTitle: '¿Qué estás viendo?', reportTypeLabel: 'Tipo de reporte', incidentTraffic: 'Tráfico detenido', incidentCrash: 'Choque', incidentHazard: 'Peligro u obstáculo', incidentClosure: 'Cierre de vía', incidentPlace: 'Lugar nuevo o incorrecto', reportDetailsLabel: 'Nota breve (opcional)', reportDetailsPlaceholder: 'Describe lo que ves', reportLocationNote: 'El reporte se asociará al centro del mapa. En esta versión solo queda guardado en este dispositivo.', cancel: 'Cancelar', publishReport: 'Guardar reporte',
      settingsKicker: 'CONFIGURACIÓN', settingsTitle: 'Mapa Trazia', settingsIntro: 'Trazia usa datos abiertos de OpenStreetMap, un diseño propio y rutas de código abierto.', themeLabel: 'Apariencia', themeAuto: 'Automática: clara de día, oscura de noche', themeLight: 'Clara', themeDark: 'Oscura', mapDataNote: 'Mapa base: OpenStreetMap. Las sugerencias de direcciones vienen de datos abiertos; las rutas y el tiempo son aproximados y no tienen tráfico en vivo.', openStreetMapCredits: 'Créditos y licencia de OpenStreetMap', mapProviderLabel: 'Servicio OpenFreeMap',
      noDestination: 'Escribe o dicta un destino primero.', demoRoute: 'El mapa todavía se está cargando. Intenta de nuevo en unos segundos.', noLocation: 'No se pudo obtener tu ubicación. Permite el acceso a ubicación e inténtalo de nuevo.', locationUnsupported: 'Este navegador no ofrece acceso a la ubicación.', routeLocationDenied: 'Permite que el navegador comparta tu ubicación para iniciar la ruta.', routeLocationUnavailable: 'No se pudo detectar tu ubicación. Pulsa Mi ubicación y revisa los ajustes de ubicación del celular.', routeNotFound: 'No encontramos esa ruta. Revisa el destino e incluye ciudad y país.', routeApiError: 'El servicio de rutas rechazó la consulta. Intenta de nuevo en unos minutos.', routeServiceError: 'No se pudo conectar con el servicio de rutas abiertas. Inténtalo otra vez.', voiceUnsupported: 'El reconocimiento de voz no está disponible aquí. Puedes escribir el destino.', voiceListening: 'Escuchando… di el destino.', voiceError: 'No se pudo escuchar el destino. Inténtalo otra vez.', searchError: 'No se pudo calcular esa ruta. Revisa el destino y vuelve a intentarlo.', autocompleteNoResults: 'No encontramos coincidencias. Prueba con otra dirección o agrega la ciudad.', vehicleChangedRoute: 'Vehículo cambiado. Busca la ruta de nuevo.',
      connecting: 'Buscando lugares…', mapError: 'No se pudo cargar el mapa abierto. Revisa tu conexión a internet.', invalidCategory: 'No se encontraron lugares en esta zona.', nearbyNeedsMaps: 'Activa la ubicación para encontrar lugares cerca de ti.', clearPlaces: 'Lugares quitados del mapa.', trafficEnabled: 'Reportes visibles en el mapa.', trafficDisabled: 'Reportes ocultos en el mapa.',
      reportSaved: 'Reporte guardado en este dispositivo.', reportRequired: 'No se pudo guardar el reporte.', routeReady: 'Ruta calculada con OpenStreetMap. El tiempo es aproximado y no incluye tráfico en vivo.', navigationNeedsRoute: 'Busca una ruta antes de iniciar la navegación.', navigationLocation: 'Activa tu ubicación para iniciar la guía por voz.', navigationStarted: 'Guía por voz iniciada.', navigationStopped: 'Navegación detenida.', navigationFollowRoute: 'Sigue la ruta marcada.', rerouting: 'Te saliste de la ruta. Recalculando…', rerouteReady: 'Ruta actualizada desde tu ubicación.', rerouteFailed: 'No se pudo recalcular. Sigue la línea morada.', arrived: 'Has llegado a tu destino.', nextInstruction: 'Siguiente indicación', demoNotice: 'El mapa necesita conexión a internet para cargar los datos abiertos.',
      categoryGas: 'Gasolineras', categoryClinic: 'Clínicas', categoryPharmacy: 'Farmacias', categoryBusiness: 'Negocios', nearbyPlaces: 'Lugares cercanos', rating: 'Calificación', noAddress: 'Dirección no disponible', incidentSaved: 'Reporte',
    },
    en: {
      tagline: 'A clearer way there', language: 'Language', demoMode: 'Loading Trazia map…', mapReadyLabel: 'Trazia map ready', mapSettings: 'Trazia map', locationOff: 'Location off', locationOn: 'Location enabled', menuSearch: 'Find a destination', menuReport: 'Report something on the road', menuSettings: 'Settings', menuNote: 'Clear navigation, made by Trazia.', voiceEnabled: 'Navigation voice on', voiceMuted: 'Navigation voice muted', voiceStarting: 'Starting voice guidance.', voiceTest: 'Trazia voice guidance is on.', voicePlaybackError: 'Voice could not play. Check your phone volume.', home: 'Home', work: 'Work', addNew: 'New', newPlace: 'New place', recent: 'Recent', savedPlaceTitle: 'SAVED PLACES', savedPlaceName: 'Name', savedPlaceAddress: 'Address', savePlace: 'Save', placeRequired: 'Enter a name and address.', placeSaved: 'Place saved.',
      vehicleLabel: 'Your vehicle', vehicleCar: 'Car', vehicleMotorcycle: 'Motorcycle', vehicleTruck: 'Truck', vehicleBicycle: 'Bicycle', vehicleMotorcycleNote: 'Motorcycle routes are in beta; check the directions in your area.', vehicleBicycleNote: 'Bicycle routes can vary depending on the roads available in your area.', vehicleTruckNote: 'Truck routes use standard weight and size limits; configure them for better accuracy.', vehicleTruckUnavailable: 'Could not calculate this route for the selected truck.', destinationMarkerLabel: 'Destination', view3d: 'Turn on 3D view', view2d: 'Turn on 2D view', compassSwitchNorth: 'Switch to north up', compassSwitchFollow: 'Follow vehicle heading', compassNorthActive: 'Compass: north up', compassFollowActive: 'Compass: following vehicle heading', musicConnect: 'Connect music', musicKicker: 'MUSIC', musicTitle: 'Connect your music app', musicIntegrationNote: 'Choose a service and Trazia will open it on this device. Direct playback controls require an authorized provider connection.', musicOpen: 'Open', musicChosen: 'Selected', musicOpening: 'Opening your music app…',
      destinationPrompt: 'Where would you like to go?', destinationPlaceholder: 'Search an address or place', findRoute: 'Find route', myLocation: 'My location', nearbyTitle: 'Explore along your route', clear: 'Clear', suggestionLoading: 'Searching addresses…', chooseAddress: 'Choose the correct address from the list to calculate your route.', autocompleteUnavailable: 'Address search is unavailable right now. Please try again.', autocompleteAttribution: '© OpenStreetMap contributors',
      gasStations: 'Gas stations', clinics: 'Clinics', pharmacies: 'Pharmacies', businesses: 'Businesses', suggestedRoute: 'TRAZIA ROUTE', sampleDestination: 'Your destination', lessTraffic: 'Suggested route', minutes: 'min', kilometers: 'km', estimatedTime: 'Estimated time', distance: 'Distance', avoidTolls: 'Avoid tolls', startNavigation: 'Start navigation', stopNavigation: 'Stop navigation', sampleTraffic: 'Open data · no live traffic', sampleNote: 'Open data route; live traffic is not available yet.', emptyRoute: 'Search for a destination to see your route.', arrivalTime: 'Arrival', routeDistanceLabel: 'Distance', routeDurationLabel: 'Time',
      communityTitle: 'Share what you see', communityCopy: 'Help others with a quick report.', report: 'Report', localReports: 'In this version, reports are saved on this device.', worldReady: 'Designed to work anywhere', mapProviderLabel: 'Trazia map', sampleMap: 'Trazia map', reportsLayer: 'Reports', mapCaption: 'Trazia map · open OpenStreetMap data', mapCredits: 'Map credits',
      communityKicker: 'TRAZIA COMMUNITY', reportTitle: 'What are you seeing?', reportTypeLabel: 'Report type', incidentTraffic: 'Stopped traffic', incidentCrash: 'Crash', incidentHazard: 'Hazard or obstacle', incidentClosure: 'Road closure', incidentPlace: 'New or incorrect place', reportDetailsLabel: 'Short note (optional)', reportDetailsPlaceholder: 'Describe what you see', reportLocationNote: 'The report will be linked to the center of the map. In this version it is saved only on this device.', cancel: 'Cancel', publishReport: 'Save report',
      settingsKicker: 'SETTINGS', settingsTitle: 'Trazia map', settingsIntro: 'Trazia uses open OpenStreetMap data, its own design, and open-source routing.', themeLabel: 'Appearance', themeAuto: 'Automatic: light by day, dark at night', themeLight: 'Light', themeDark: 'Dark', mapDataNote: 'Base map: OpenStreetMap. Address suggestions use open data; routes and travel time are estimates without live traffic.', openStreetMapCredits: 'OpenStreetMap credits and licence', mapProviderLabel: 'OpenFreeMap service',
      noDestination: 'Enter or say a destination first.', demoRoute: 'The map is still loading. Try again in a few seconds.', noLocation: 'Your location could not be found. Allow location access and try again.', locationUnsupported: 'This browser does not provide location access.', routeLocationDenied: 'Allow your browser to share your location to start the route.', routeLocationUnavailable: 'Your location could not be detected. Tap My location and check your phone location settings.', routeNotFound: 'We could not find that route. Check the destination, including city and country.', routeApiError: 'The open routing service rejected the request. Try again shortly.', routeServiceError: 'Could not connect to the open routing service. Please try again.', voiceUnsupported: 'Voice recognition is not available here. You can type your destination.', voiceListening: 'Listening… say your destination.', voiceError: 'Could not hear the destination. Please try again.', searchError: 'Could not calculate that route. Check the destination and try again.', autocompleteNoResults: 'No matches found. Try another address or add the city.', vehicleChangedRoute: 'Vehicle changed. Search for the route again.',
      connecting: 'Searching places…', mapError: 'The open map could not load. Check your internet connection.', invalidCategory: 'No places were found in this area.', nearbyNeedsMaps: 'Turn on location to find places nearby.', clearPlaces: 'Places cleared from the map.', trafficEnabled: 'Reports are visible on the map.', trafficDisabled: 'Reports are hidden from the map.',
      reportSaved: 'Report saved on this device.', reportRequired: 'Could not save the report.', routeReady: 'Route calculated from OpenStreetMap. Travel time is an estimate and does not include live traffic.', navigationNeedsRoute: 'Find a route before starting navigation.', navigationLocation: 'Enable your location to start voice guidance.', navigationStarted: 'Voice guidance started.', navigationStopped: 'Navigation stopped.', navigationFollowRoute: 'Follow the marked route.', rerouting: 'You left the route. Recalculating…', rerouteReady: 'Route updated from your location.', rerouteFailed: 'Could not recalculate. Follow the purple line.', arrived: 'You have arrived at your destination.', nextInstruction: 'Next direction', demoNotice: 'The map needs an internet connection to load open map data.',
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
    traffic: { es: 'Tráfico detenido', en: 'Stopped traffic' },
    crash: { es: 'Choque', en: 'Crash' },
    hazard: { es: 'Peligro u obstáculo', en: 'Hazard or obstacle' },
    closure: { es: 'Cierre de vía', en: 'Road closure' },
    place: { es: 'Lugar nuevo o incorrecto', en: 'New or incorrect place' },
  };

  const state = {
    language: localStorage.getItem('trazia:language') || (navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es'),
    theme: localStorage.getItem('trazia:theme') || 'auto',
    map: null,
    mapStyle: '',
    mapLoaded: false,
    mapReady: false,
    trafficEnabled: true,
    currentPosition: null,
    lastLocationTimestamp: 0,
    lastLocationAccuracy: null,
    lastHeading: null,
    compassMode: localStorage.getItem('trazia:compass-mode') === 'north' ? 'north' : 'follow',
    followCamera: true,
    userMarker: null,
    userMarkerElement: null,
    destinationMarker: null,
    is3d: true,
    currentSpeed: 0,
    lastSpeedFix: null,
    locationWatch: null,
    vehicleType: ['car', 'motorcycle', 'truck', 'bicycle'].includes(localStorage.getItem('trazia:vehicle-type')) ? localStorage.getItem('trazia:vehicle-type') : 'car',
    selectedDestination: null,
    autocompleteTimer: null,
    autocompleteController: null,
    autocompleteRequestId: 0,
    autocompletePredictions: [],
    autocompleteQuery: '',
    activeSuggestionIndex: -1,
    autocompleteUnavailable: false,
    musicService: localStorage.getItem('trazia:music-service') || '',
    placeMarkers: [],
    nearbyRequestId: 0,
    nearbyCache: new Map(),
    cityBoundaryCache: new Map(),
    nominatimCache: new Map(),
    nominatimLastRequestAt: 0,
    reportMarkers: [],
    routeCoordinates: [],
    routeRequestId: 0,
    routeSearchController: null,
    currentRoutes: [],
    route: null,
    routeDestination: '',
    avoidTolls: false,
    navigationSteps: [],
    activeStep: 0,
    isNavigating: false,
    offRouteFixes: 0,
    lastRerouteAt: 0,
    isRerouting: false,
    voiceEnabled: true,
    toastTimer: null,
    recognition: null,
    reports: readReports(),
    savedPlaces: readSavedPlaces(),
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
    renderRecentDestinations();
    updateVehiclePicker();
    update3dButton();
    updateCompassControl();
    updateMusicOptions();
    $('#toggle-map-credits').setAttribute('aria-label', t('mapCredits'));
    $('#toggle-map-credits').title = t('mapCredits');
    localStorage.setItem('trazia:language', state.language);
  }

  function updateConnectionLabels() {
    statusText.textContent = state.mapReady ? t('mapReadyLabel') : t('demoMode');
    $('#map-label').textContent = t(state.mapReady ? 'mapReadyLabel' : 'sampleMap');
    $('#status-dot').classList.toggle('live', state.mapReady);
    $('#map-live-dot').classList.toggle('live', state.mapReady);
    $('#location-status').textContent = state.currentPosition ? t('locationOn') : t('locationOff');
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
    if (state.userMarkerElement) state.userMarkerElement.querySelector('span').textContent = vehicleIconForType(type);
    if (state.route) {
      clearRoutePolylines();
      state.route = null;
      state.currentRoutes = [];
      state.navigationSteps = [];
      $('#route-duration').innerHTML = `— <small>${t('minutes')}</small>`;
      $('#route-distance').innerHTML = `— <small>${t('kilometers')}</small>`;
      $('#route-note').textContent = t('vehicleChangedRoute');
      $('#start-navigation').disabled = true;
    }
  }

  function runSplashScreen() {
    const splash = $('#app-splash');
    const progress = $('#splash-progress');
    const valueLabel = $('#splash-progress-value');
    if (!splash || !progress || !valueLabel) return;
    const startedAt = performance.now();
    const minimumTime = 950;
    let value = 0;
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const loadingValue = Math.min(92, Math.round((elapsed / 760) * 92));
      value = document.readyState === 'complete' && elapsed >= minimumTime ? 100 : Math.max(value, loadingValue);
      progress.style.width = `${value}%`;
      valueLabel.textContent = `${value}%`;
      const meter = $('#splash-progress-meter');
      meter?.setAttribute('aria-valuenow', String(value));
      if (value < 100) return;
      window.clearInterval(timer);
      splash.classList.add('is-finishing');
      window.setTimeout(() => { splash.hidden = true; }, 360);
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
    return state.compassMode === 'follow' && Number.isFinite(state.lastHeading) ? state.lastHeading : 0;
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

  function updateVehicleMarkerOrientation() {
    // The vehicle glyph is deliberately kept level on screen, as requested.
    // Map rotation is handled by the camera; rotating the marker made emoji vehicles stand upright.
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
    state.compassMode = state.compassMode === 'follow' ? 'north' : 'follow';
    state.followCamera = state.isNavigating || !state.route;
    localStorage.setItem('trazia:compass-mode', state.compassMode);
    if (state.mapReady && state.map) {
      const camera = { bearing: compassBearing(), duration: 500 };
      if (state.currentPosition && state.followCamera) {
        camera.center = [state.currentPosition.lng, state.currentPosition.lat];
        camera.zoom = Math.max(state.map.getZoom(), 16);
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
  }

  function openMusicService(service) {
    const urls = {
      spotify: 'https://open.spotify.com/',
      apple: 'https://music.apple.com/',
      youtube: 'https://music.youtube.com/',
      deezer: 'https://www.deezer.com/',
    };
    const url = urls[service];
    if (!url) return;
    state.musicService = service;
    localStorage.setItem('trazia:music-service', service);
    updateMusicOptions();
    showToast(t('musicOpening'));
    window.open(url, '_blank', 'noopener,noreferrer');
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
      const secondaryText = parts.secondary;
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
    attribution.textContent = t('autocompleteAttribution');
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

  function handleDestinationInput() {
    state.selectedDestination = null;
    state.autocompleteRequestId += 1;
    const requestId = state.autocompleteRequestId;
    window.clearTimeout(state.autocompleteTimer);
    state.autocompleteController?.abort();
    const query = destinationInput.value.trim();
    if (query.length < 3) {
      closeDestinationSuggestions();
      return;
    }
    showSuggestionMessage(t('suggestionLoading'), true);
    state.autocompleteTimer = window.setTimeout(() => { void fetchDestinationSuggestions(query, requestId); }, 350);
  }

  async function fetchDestinationSuggestions(query, requestId) {
    const controller = new AbortController();
    state.autocompleteController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
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
    state.selectedDestination = { label: parts.label, location: { lat, lng } };
    destinationInput.value = parts.label;
    closeDestinationSuggestions();
    collapseMobilePanel();
    void searchRoute();
  }

  function photonFeatureParts(properties, query = '') {
    const streetAddress = [properties.housenumber, properties.street].filter(Boolean).join(' ');
    const locality = [properties.district, properties.city, properties.county, properties.state, properties.country].filter(Boolean);
    const addressQuery = /#|\b(?:cra|cr|kr|carrera|cl|calle|av|avda|avenida|diag|diagonal|trans|transversal)\b/i.test(query) && /\d/.test(query);
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
      .replace(/\b(?:cra|cr|kr)\b\.?/g, ' carrera ')
      .replace(/\bcl\b\.?/g, ' calle ')
      .replace(/\b(?:av|avda)\b\.?/g, ' avenida ')
      .replace(/\bdiag\b\.?/g, ' diagonal ')
      .replace(/\btrans\b\.?/g, ' transversal ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeColombianAddressQuery(value) {
    return String(value || '')
      .replace(/\b(?:cra|cr|kr)\b\.?/gi, 'carrera')
      .replace(/\bcl\b\.?/gi, 'calle')
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
    const raw = String(value || '').trim();
    const normalized = normalizeColombianAddressQuery(raw);
    const variants = [raw, normalized];
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
    const raw = String(value || '').trim();
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
    const addresses = [{ street, houseNumber, city }];

    // Some Colombian address conventions write the crossing road before #.
    // Search that common interpretation as a second structured candidate.
    const road = street.match(/^(carrera|calle|avenida|diagonal|transversal)\s+[\p{L}\p{N}]+/iu)?.[0];
    const suffix = road ? street.slice(road.length).trim() : '';
    const suffixNumber = suffix.match(/\d+[a-z]?/i)?.[0];
    const firstHouseNumber = houseNumber.match(/^\d+/)?.[0];
    if (road && suffixNumber && firstHouseNumber) {
      addresses.push({ street: road, houseNumber: `${suffixNumber}-${firstHouseNumber}`, city });
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
    const isStreetAddress = /#|\b(?:cra|cr|kr|carrera|cl|calle|av|avda|avenida|diag|diagonal|trans|transversal)\b/i.test(query) && /\d/.test(query);
    const streetTokens = normalizedQuery.match(/\b(?:carrera|calle|avenida|diagonal|transversal)\s+[\p{L}\p{N}]+/iu)?.[0]?.split(' ') || [];
    const houseNumberTokens = String(query).includes('#')
      ? normalizeGeocodeText(String(query).split('#').slice(1).join(' ')).split(' ').filter((token) => /\d/.test(token))
      : [];
    const ranked = features.map((feature) => {
      const candidateText = photonFeatureSearchText(feature);
      const candidateTokens = new Set(candidateText.split(' '));
      const matchedTokens = queryTokens.filter((token) => candidateTokens.has(token) || (token.length >= 4 && [...candidateTokens].some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))));
      const matchingStreetTokens = streetTokens.filter((token) => candidateTokens.has(token) || [...candidateTokens].some((candidate) => candidate.startsWith(token) || token.startsWith(candidate)));
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
    let matches = [];
    let photonError = null;
    const baseQuery = String(query || '').trim();
    const normalizedQuery = normalizeColombianAddressQuery(baseQuery);
    const variants = colombianAddressQueryVariants(baseQuery, allowNominatimFallback);
    const usableCenter = isWithinColombiaSearchArea(center) ? center : null;
    const found = [];
    for (const address of parseColombianStructuredAddress(baseQuery)) {
      try {
        const params = new URLSearchParams({ street: address.street, housenumber: address.houseNumber, countrycode: 'CO', lang: photonLanguage() });
        if (address.city) params.set('city', address.city);
        if (usableCenter) {
          params.set('lat', String(usableCenter.lat));
          params.set('lon', String(usableCenter.lng));
          params.set('zoom', '10');
          params.set('location_bias_scale', '0.1');
        }
        const structured = await fetchPhotonStructuredFeatures(params, signal);
        found.push(...(structured.features || []).filter(isColombiaFeature));
        matches = rankPhotonFeatures(found, baseQuery, usableCenter);
        if (matches.length >= (allowNominatimFallback ? 4 : 2)) break;
      } catch (error) {
        if (signal?.aborted) throw error;
        photonError = error;
      }
    }
    try {
      for (const [index, variant] of variants.entries()) {
        if (!variant) continue;
        const payload = await fetchPhotonFeatures(makePhotonSearchParams(variant, index === 0 ? usableCenter : null), signal);
        found.push(...(payload.features || []).filter(isColombiaFeature));
        matches = rankPhotonFeatures(found, baseQuery, usableCenter);
        if (matches.length >= (allowNominatimFallback ? 4 : 2)) break;
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      photonError = error;
    }
    // Nominatim is only used after an explicit route-search action. Its public
    // service does not permit per-keystroke autocomplete.
    if (allowNominatimFallback && matches.length < 4) {
      try {
        const fallbackMatches = await findNominatimCandidates(baseQuery, signal);
        matches = rankPhotonFeatures([...matches, ...fallbackMatches], baseQuery, usableCenter);
        if (!matches.length) matches = fallbackMatches;
      } catch (error) {
        if (signal?.aborted) throw error;
        if (photonError) console.info('Trazia geocoding fallback:', photonError.message, error.message);
      }
    }
    return matches;
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
    const wait = Math.max(0, 1100 - (Date.now() - state.nominatimLastRequestAt));
    if (wait) await waitWithSignal(wait, signal);
    const normalizedQuery = normalizeColombianAddressQuery(query);
    const countryQuery = /\bcolombia\b/i.test(normalizedQuery) ? normalizedQuery : `${normalizedQuery} Colombia`;
    const params = new URLSearchParams({ q: countryQuery, countrycodes: 'co', format: 'jsonv2', addressdetails: '1', limit: '8', 'accept-language': state.language === 'es' ? 'es' : 'en' });
    state.nominatimLastRequestAt = Date.now();
    const response = await fetchTimed(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    }, 12000);
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const results = await response.json();
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

  async function fetchPhotonFeatures(params, signal) {
    const query = params.toString();
    const endpoints = isLocalApiHost()
      ? [`/api/photon?${query}`, `https://photon.komoot.io/api/?${query}`]
      : [`https://photon.komoot.io/api/?${query}`];
    let lastError;
    for (const endpoint of endpoints) {
      try {
        const response = await fetchTimed(endpoint, { signal, headers: { Accept: 'application/json' } }, 11000);
        if (!response.ok) {
          lastError = new Error(`Photon ${response.status}`);
          if (response.status === 404 || response.status === 429 || response.status >= 500) continue;
          throw lastError;
        }
        return await response.json();
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    throw lastError || new Error('Photon unavailable');
  }

  async function fetchPhotonStructuredFeatures(params, signal) {
    const response = await fetchTimed(`https://photon.komoot.io/structured?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    }, 11000);
    if (!response.ok) throw new Error(`Photon structured ${response.status}`);
    return response.json();
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
      return Array.isArray(reports) ? reports : [];
    } catch {
      return [];
    }
  }

  function readSavedPlaces() {
    try {
      const saved = JSON.parse(localStorage.getItem('trazia:saved-places') || '[]');
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
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M12 8v4l2.5 1.5M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5');
      icon.append(path);
      const text = document.createElement('span');
      text.textContent = destination;
      button.append(icon, text);
      button.addEventListener('click', () => {
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
    setDestinationText(saved.address);
    void searchRoute();
  }

  function setDestinationText(value) {
    state.selectedDestination = null;
    destinationInput.value = value;
    closeDestinationSuggestions();
  }

  function saveSavedPlace() {
    const name = $('#saved-place-name').value.trim();
    const address = $('#saved-place-address').value.trim();
    if (!name || !address) {
      showToast(t('placeRequired'), true);
      return;
    }
    const id = state.editingSavedPlaceId || `custom-${Date.now()}`;
    const existingIndex = state.savedPlaces.findIndex((place) => place.id === id);
    const saved = { id, name, address };
    if (existingIndex >= 0) state.savedPlaces[existingIndex] = saved;
    else state.savedPlaces.push(saved);
    localStorage.setItem('trazia:saved-places', JSON.stringify(state.savedPlaces));
    renderSavedPlaces();
    closeDialog(savedPlaceDialog);
    showToast(t('placeSaved'));
  }

  function saveRecentDestination(destination) {
    state.recentDestinations = [destination, ...state.recentDestinations.filter((item) => item.toLowerCase() !== destination.toLowerCase())].slice(0, 5);
    localStorage.setItem('trazia:recent-destinations', JSON.stringify(state.recentDestinations));
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
      const symbol = document.createElement('span');
      symbol.textContent = vehicleIconForType(state.vehicleType);
      content.append(symbol);
      state.userMarkerElement = content;
      state.userMarker = new maplibregl.Marker({ element: content, anchor: 'center', rotationAlignment: 'viewport', pitchAlignment: 'viewport' })
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
    state.lastLocationTimestamp = timestamp;
    state.lastLocationAccuracy = accuracy;
    if (heading !== null) state.lastHeading = heading;
    updateSpeedometer(position);
    updateUserMarker(state.currentPosition, heading);
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
    $('#speed-value').textContent = String(state.currentSpeed);
    $('#speedometer').classList.toggle('gps-active', Boolean(state.currentPosition));
    $('#speedometer').setAttribute('aria-label', `${state.currentSpeed} km/h`);
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
        state.map.flyTo({ center: [position.lng, position.lat], zoom: 17, pitch: state.is3d ? 55 : 0, bearing: compassBearing(), duration: 700, offset: mobileMapOffset() });
      }
      updateUserMarker(position);
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
    const dark = document.documentElement.dataset.theme === 'dark';
    (state.map.getStyle().layers || []).forEach((layer) => {
      try {
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
          state.map.setPaintProperty(layer.id, 'text-color', dark ? '#e0e9ef' : '#263b4d');
          state.map.setPaintProperty(layer.id, 'text-halo-color', dark ? '#17232e' : '#f5f8f6');
          state.map.setPaintProperty(layer.id, 'text-halo-width', dark ? 1.35 : 1.1);
        }
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
        'line-color': dark
          ? ['match', ['get', 'class'], ['motorway', 'trunk'], '#f2c34e', 'primary', '#16a981', ['secondary', 'tertiary'], '#278aa0', '#455e76']
          : ['match', ['get', 'class'], ['motorway', 'trunk'], '#f2c34e', 'primary', '#42bd69', ['secondary', 'tertiary'], '#e8c746', '#d3dde0'],
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
      });
      state.map.on('rotate', () => {
        updateCompassControl();
        updateVehicleMarkerOrientation();
      });
      state.map.on('dragstart', () => { state.followCamera = false; });
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
      });
      state.map.on('style.load', () => {
        addTraziaBuildingLayer();
        if (state.is3d) removeTraziaBuildingLayers();
        addTraziaRoadLayer();
        applyTraziaMapPalette();
        drawRouteOnMap();
      });
      state.map.on('error', (event) => console.info('Trazia map service notice:', event.error?.message || 'map tile unavailable'));
    } catch (error) {
      state.mapReady = false;
      updateConnectionLabels();
      showToast(t('mapError'), true);
      console.error('Trazia could not initialize its open map:', error);
    }
  }

  async function searchRoute({ automatic = false } = {}) {
    const typedDestination = destinationInput.value.trim();
    if (!typedDestination) {
      showToast(t('noDestination'));
      destinationInput.focus();
      return;
    }
    if (!state.mapReady) {
      showToast(t('demoRoute'));
      return;
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
      $('#start-navigation').disabled = true;
      $('#route-summary-overlay').hidden = true;
    }
    $('#route-note').textContent = automatic ? t('rerouting') : t('connecting');
    const searchRequestId = ++state.autocompleteRequestId;
    window.clearTimeout(state.autocompleteTimer);
    state.autocompleteController?.abort();
    try {
      const origin = state.currentPosition || await getUserPosition();
      if (routeController.signal.aborted || routeRequestId !== state.routeRequestId) return;
      updateUserMarker(origin);
      let selected = state.selectedDestination;
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
      state.selectedDestination = selected;
      state.routeDestination = selected.label || typedDestination;
      destinationInput.value = state.routeDestination;
      $('#route-title').textContent = state.routeDestination;
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
      const response = await fetchValhallaRoute(request, routeController.signal);
      if (routeController.signal.aborted || routeRequestId !== state.routeRequestId) return;
      let payload;
      try { payload = await response.json(); } catch { payload = {}; }
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
      state.currentRoutes = [route];
      state.routeCoordinates = coordinates;
      state.route = route;
      state.lastRerouteAt = automatic ? Date.now() : 0;
      state.offRouteFixes = 0;
      state.fitRouteToMap = true;
      collapseMobilePanel();
      drawRouteOnMap();
      const duration = route.durationMillis ? Math.max(1, Math.round(route.durationMillis / 60000)) : null;
      const distance = route.distanceMeters ? route.distanceMeters / 1000 : null;
      $('#route-duration').innerHTML = `${duration ?? '—'} <small>${t('minutes')}</small>`;
      $('#route-distance').innerHTML = `${distance !== null ? new Intl.NumberFormat(state.language === 'es' ? 'es' : 'en', { maximumFractionDigits: 1 }).format(distance) : '—'} <small>${t('kilometers')}</small>`;
      updateRouteSummary(route);
      $('#route-note').textContent = automatic ? t('rerouteReady') : t('routeReady');
      state.navigationSteps = navigationSteps;
      state.activeStep = 0;
      $('#start-navigation').disabled = state.routeCoordinates.length < 2;
      if (state.isNavigating) {
        const instruction = state.navigationSteps[0]?.instructions || t('navigationFollowRoute');
        $('#navigation-instruction').textContent = instruction;
        speak(instruction);
      }
      saveRecentDestination(state.routeDestination);
      if (automatic) showToast(t('rerouteReady'));
      else showToast(t('routeReady'));
    } catch (error) {
      if (routeController.signal.aborted || routeRequestId !== state.routeRequestId) return;
      console.error('Trazia route search failed:', error);
      const message = automatic ? t('rerouteFailed') : getRouteErrorMessage(error);
      $('#route-note').textContent = message;
      $('#start-navigation').disabled = state.routeCoordinates.length < 2;
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
    state.fitRouteToMap = false;
    $('#route-summary-overlay').hidden = true;
  }

  function drawRouteOnMap() {
    if (!state.map?.isStyleLoaded() || state.routeCoordinates.length < 2) return;
    ['trazia-route-line', 'trazia-route-outline'].forEach((layerId) => {
      if (state.map.getLayer(layerId)) state.map.removeLayer(layerId);
    });
    if (state.map.getSource('trazia-route')) state.map.removeSource('trazia-route');
    state.map.addSource('trazia-route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: state.routeCoordinates } },
    });
    const labelLayer = (state.map.getStyle().layers || []).find((layer) => layer.type === 'symbol')?.id;
    state.map.addLayer({ id: 'trazia-route-outline', type: 'line', source: 'trazia-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#34205f', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 8, 16, 17], 'line-opacity': 0.9 } }, labelLayer);
    state.map.addLayer({ id: 'trazia-route-line', type: 'line', source: 'trazia-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#9364f4', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 10] } }, labelLayer);
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
        state.map.easeTo({ center: [state.currentPosition.lng, state.currentPosition.lat], zoom: 17, pitch: state.is3d ? 55 : 0, bearing: compassBearing(), duration: 450, offset: mobileMapOffset() });
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

  function updateRouteSummary(route) {
    const durationMillis = route.durationMillis || 0;
    const arrival = new Date(Date.now() + durationMillis);
    const locale = state.language === 'es' ? 'es-CO' : 'en-US';
    const distance = route.distanceMeters ? route.distanceMeters / 1000 : 0;
    $('#arrival-time').textContent = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(arrival);
    $('#summary-distance').textContent = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(distance)} km`;
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

  async function requestOverpass(query, timeoutMs = 18000) {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
      body: new URLSearchParams({ data: query }).toString(),
    };
    const endpoints = [
      ...(isLocalApiHost() ? ['/api/overpass'] : []),
      'https://overpass.private.coffee/api/interpreter',
      'https://overpass-api.de/api/interpreter',
    ];
    const perEndpointTimeout = Math.max(7000, Math.min(14000, Math.floor(timeoutMs / endpoints.length)));
    let lastError;
    for (const endpoint of endpoints) {
      try {
        const response = await fetchTimed(endpoint, options, perEndpointTimeout);
        if (!response.ok) {
          lastError = new Error(`Overpass ${response.status}`);
          if (response.status === 404 || response.status === 408 || response.status === 429 || response.status >= 500) continue;
          throw lastError;
        }
        return await response.json();
      } catch (error) {
        lastError = error;
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
    const coordinates = state.route && state.routeCoordinates.length > 1 ? state.routeCoordinates : [];
    if (!coordinates.length) return { points: [center], radius: 12000, onRoute: false };
    const routePoints = coordinates.map(([lng, lat]) => ({ lat, lng }));
    const lengths = routePoints.slice(1).map((point, index) => distanceMeters(routePoints[index], point));
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    if (!Number.isFinite(totalLength) || totalLength < 100) return { points: [center], radius: 12000, onRoute: false };
    const pointCount = Math.min(14, Math.max(2, Math.ceil(totalLength / 2500) + 1));
    const spacing = totalLength / (pointCount - 1);
    const radius = Math.max(1100, Math.min(5000, spacing * 0.62));
    const points = [];
    for (let target = 0; target <= pointCount - 1; target += 1) {
      const targetDistance = Math.min(totalLength, target * spacing);
      let traversed = 0;
      let segmentIndex = 0;
      while (segmentIndex < lengths.length - 1 && traversed + lengths[segmentIndex] < targetDistance) {
        traversed += lengths[segmentIndex];
        segmentIndex += 1;
      }
      const segmentLength = lengths[segmentIndex] || 1;
      const fraction = Math.max(0, Math.min(1, (targetDistance - traversed) / segmentLength));
      const from = routePoints[segmentIndex];
      const to = routePoints[segmentIndex + 1] || from;
      const point = { lat: from.lat + (to.lat - from.lat) * fraction, lng: from.lng + (to.lng - from.lng) * fraction };
      if (!points.some((candidate) => Math.abs(candidate.lat - point.lat) < 0.002 && Math.abs(candidate.lng - point.lng) < 0.002)) points.push(point);
    }
    return { points, radius, onRoute: true };
  }

  function makeNearbyOverpassQuery(category, plan, boundaryId) {
    const localSelector = (point) => boundaryId
      ? `nwr(area.city)(around:${Math.round(plan.radius)},${point.lat},${point.lng})`
      : `nwr(around:${Math.round(plan.radius)},${point.lat},${point.lng})`;
    const areaQuery = boundaryId ? `area(${boundaryId})->.city;` : '';
    const searches = plan.points.flatMap((point) => nearbyTagFilters(category).map((filter) => `${localSelector(point)}${filter};`)).join('\n');
    return `[out:json][timeout:22];${areaQuery}(${searches});out center tags qt 200;`;
  }

  function overpassFeature(element) {
    const tags = element.tags || {};
    const point = element.type === 'node' ? [element.lon, element.lat] : [element.center?.lon, element.center?.lat];
    if (!point.every(Number.isFinite)) return null;
    const properties = {
      name: tags.name || tags.brand || tags.operator || '',
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
      if (!state.currentPosition) {
        const position = await getUserPosition();
        startLocationWatch();
        state.map.easeTo({ center: [position.lng, position.lat], zoom: 13.5, duration: 450, offset: mobileMapOffset() });
      }
      const center = state.currentPosition || currentMapCenter();
      if (!center) throw new Error('location-unavailable');
      const plan = makeNearbySearchPlan(center);
      const route = state.routeCoordinates;
      const routeKey = plan.onRoute && route.length
        ? `${route[0][0].toFixed(3)},${route[0][1].toFixed(3)}:${route[route.length - 1][0].toFixed(3)},${route[route.length - 1][1].toFixed(3)}:${route.length}`
        : 'city-radius';
      const cacheKey = `${category}:${center.lat.toFixed(3)},${center.lng.toFixed(3)}:${routeKey}`;
      const cached = state.nearbyCache.get(cacheKey);
      let features;
      if (cached && cached.expiresAt > Date.now()) features = cached.features;
      else {
        try {
          const boundaryId = await findCityBoundary(center);
          const query = makeNearbyOverpassQuery(category, plan, boundaryId);
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
          features = (payload.features || []).filter((feature) => {
            const [lng, lat] = feature.geometry?.coordinates || [];
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
            return plan.onRoute ? distanceFromRouteMeters({ lat, lng }, state.routeCoordinates) <= plan.radius : distanceMeters(center, { lat, lng }) <= plan.radius;
          });
        }
        state.nearbyCache.set(cacheKey, { expiresAt: Date.now() + 3 * 60 * 1000, features });
      }
      if (requestId !== state.nearbyRequestId) return;
      features = features
        .map((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          const point = { lat, lng };
          return { feature, distance: distanceMeters(center, point), routeDistance: plan.onRoute ? distanceFromRouteMeters(point, state.routeCoordinates) : null };
        })
        .filter((item) => plan.onRoute ? item.routeDistance <= plan.radius + 100 : item.distance <= plan.radius + 500)
        .sort((a, b) => plan.onRoute ? a.routeDistance - b.routeDistance : a.distance - b.distance)
        .slice(0, 8)
        .map((item) => item.feature);
      state.nearbyCache.set(cacheKey, { expiresAt: Date.now() + 3 * 60 * 1000, features });
      results.replaceChildren();
      if (!features.length) {
        results.textContent = t('invalidCategory');
        return;
      }
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
        const name = document.createElement('div');
        name.className = 'place-result-name';
        name.textContent = parts.main || t('nearbyPlaces');
        const meta = document.createElement('div');
        meta.className = 'place-result-meta';
        const [lng, lat] = coordinates;
        const point = { lat, lng };
        const distance = plan.onRoute ? distanceFromRouteMeters(point, state.routeCoordinates) : distanceMeters(center, point);
        const distanceLabel = `${new Intl.NumberFormat(state.language === 'es' ? 'es-CO' : 'en-US', { maximumFractionDigits: 1 }).format(distance / 1000)} km`;
        meta.textContent = [parts.secondary || parts.label || t('noAddress'), distanceLabel].filter(Boolean).join(' · ');
        text.append(name, meta);
        row.append(icon, text);
        row.addEventListener('click', () => {
          state.map.flyTo({ center: coordinates, zoom: 16, duration: 500, offset: mobileMapOffset() });
        });
        results.append(row);
      });
      state.map.easeTo({ center: [center.lng, center.lat], zoom: Math.max(state.map.getZoom(), 13.5), duration: 500, offset: mobileMapOffset() });
      $('#clear-places').hidden = false;
    } catch (error) {
      if (requestId !== state.nearbyRequestId) return;
      console.error('Trazia open place search failed:', error);
      results.textContent = t('invalidCategory');
      showToast(t('invalidCategory'), true);
    }
  }

  function clearPlaceMarkers() {
    state.placeMarkers.forEach((marker) => marker.remove());
    state.placeMarkers = [];
    $('#clear-places').hidden = true;
  }

  function clearPlaces() {
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

  function saveReport() {
    const type = $('#report-type').value;
    const details = $('#report-details').value.trim();
    const center = currentMapCenter();
    const report = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      details,
      createdAt: new Date().toISOString(),
      lat: center?.lat ?? null,
      lng: center?.lng ?? null,
    };
    state.reports.unshift(report);
    state.reports = state.reports.slice(0, 100);
    try {
      localStorage.setItem('trazia:reports', JSON.stringify(state.reports));
    } catch {
      showToast(t('reportRequired'), true);
      return;
    }
    if (state.mapReady && Number.isFinite(report.lat) && Number.isFinite(report.lng)) addReportMarker(report);
    renderReportCount();
    $('#report-details').value = '';
    closeDialog(reportDialog);
    showToast(t('reportSaved'));
  }

  function addReportMarker(report) {
    const markerElement = document.createElement('div');
    markerElement.className = `trazia-report-marker report-${report.type}`;
    markerElement.textContent = ({ traffic: '🚦', crash: '⚠️', hazard: '⚠️', closure: '🚧', place: '⌖' })[report.type] || '⚠️';
    markerElement.title = `${t('incidentSaved')}: ${incidentLabels[report.type]?.[state.language] || t('report')}`;
    const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
      .setLngLat([report.lng, report.lat])
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

  function startVoiceSearch() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      showToast(t('voiceUnsupported'));
      return;
    }
    if (state.recognition) {
      state.recognition.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = state.language === 'es' ? 'es-CO' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    state.recognition = recognition;
    $('#voice-search').classList.add('listening');
    $('#voice-status').textContent = t('voiceListening');
    recognition.onresult = (event) => {
      setDestinationText(event.results[0][0].transcript);
      $('#voice-status').textContent = '';
      void searchRoute();
    };
    recognition.onerror = () => {
      $('#voice-status').textContent = t('voiceError');
      showToast(t('voiceError'), true);
    };
    recognition.onend = () => {
      state.recognition = null;
      $('#voice-search').classList.remove('listening');
      window.setTimeout(() => { $('#voice-status').textContent = ''; }, 1800);
    };
    recognition.start();
  }

  function speak(text) {
    if (!state.voiceEnabled || !text) return;
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
    const preferredVoice = voices.find((voice) => voice.lang.toLowerCase() === (state.language === 'es' ? 'es-co' : 'en-us'))
      || voices.find((voice) => preferredLanguage.test(voice.lang));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onerror = (event) => {
      if (!['canceled', 'interrupted'].includes(event.error)) {
        console.info('Trazia speech playback failed:', event.error);
        if (state.isNavigating) showToast(t('voicePlaybackError'), true);
      }
    };
    speech.speak(utterance);
  }

  async function toggleNavigation() {
    if (state.isNavigating) {
      stopNavigation();
      return;
    }
    if (!state.mapReady || !state.route || state.routeCoordinates.length < 2) {
      showToast(t('navigationNeedsRoute'));
      return;
    }
    // Start a short utterance inside the tap gesture so mobile browsers unlock speech output.
    speak(t('voiceStarting'));
    window.speechSynthesis?.resume?.();
    try {
      const position = await getUserPosition();
      collapseMobilePanel();
      state.isNavigating = true;
      state.followCamera = true;
      state.activeStep = 0;
      state.offRouteFixes = 0;
      const firstStep = state.navigationSteps[state.activeStep];
      if (firstStep) firstStep.alertSpoken = true;
      const firstInstruction = firstStep?.instructions || t('navigationFollowRoute');
      $('#route-note').textContent = firstInstruction;
      $('#navigation-instruction').textContent = firstInstruction;
      $('#navigation-banner').hidden = false;
      updateNavigationButton();
      speak(firstInstruction);
      if (navigator.geolocation?.watchPosition) {
        startLocationWatch();
      }
      setMap3d(true);
      if (state.userMarker) state.userMarker.setLngLat([position.lng, position.lat]);
      state.map.flyTo({ center: [position.lng, position.lat], zoom: 17, pitch: state.is3d ? 55 : 0, bearing: compassBearing(), duration: 700, offset: mobileMapOffset() });
      if ('wakeLock' in navigator) {
        try { state.screenWakeLock = await navigator.wakeLock.request('screen'); } catch { /* Wake lock is optional. */ }
      }
      showToast(t('navigationStarted'));
    } catch {
      showToast(t('navigationLocation'), true);
    }
  }

  function onNavigationPosition(position) {
    if (!saveUserPosition(position)) return;
    const user = state.currentPosition;
    if (state.mapReady && state.map && (state.followCamera || state.isNavigating)) {
      state.map.easeTo({
        center: [user.lng, user.lat],
        zoom: Math.max(state.map.getZoom(), 16),
        pitch: state.is3d ? 55 : 0,
        bearing: compassBearing(),
        duration: 380,
        offset: mobileMapOffset(),
      });
    }
    if (!state.isNavigating) return;
    const accuracy = Number.isFinite(state.lastLocationAccuracy) ? state.lastLocationAccuracy : 0;
    const destination = state.selectedDestination?.location;
    if (destination && distanceMeters(user, destination) <= Math.max(40, Math.min(70, accuracy))) {
      stopNavigation(false);
      speak(t('arrived'));
      showToast(t('arrived'));
      return;
    }
    if (state.routeCoordinates.length >= 2 && !state.isRerouting) {
      const distanceFromRoute = distanceFromRouteMeters(user, state.routeCoordinates);
      const threshold = Math.max(45, Math.min(90, accuracy * 1.2 + 20));
      state.offRouteFixes = distanceFromRoute > threshold ? state.offRouteFixes + 1 : 0;
      if (state.offRouteFixes >= 2 && Date.now() - state.lastRerouteAt >= 12000) {
        state.isRerouting = true;
        state.offRouteFixes = 0;
        $('#route-note').textContent = t('rerouting');
        $('#navigation-instruction').textContent = t('rerouting');
        showToast(t('rerouting'));
        void searchRoute({ automatic: true });
        return;
      }
    }
    const step = state.navigationSteps[state.activeStep];
    if (!step) {
      $('#navigation-instruction').textContent = t('navigationFollowRoute');
      return;
    }
    const end = step.endLocation;
    const endPoint = typeof end?.lat === 'function' ? { lat: end.lat(), lng: end.lng() } : end;
    if (!endPoint) return;
    const metersToManeuver = distanceMeters(user, endPoint);
    if (!step.alertSpoken && metersToManeuver <= 650) {
      step.alertSpoken = true;
      speak(step.alertInstruction || step.instructions);
    }
    if (!step.preSpoken && metersToManeuver <= 230) {
      step.preSpoken = true;
      const preInstruction = step.preInstruction || step.instructions;
      $('#route-note').textContent = preInstruction;
      $('#navigation-instruction').textContent = preInstruction;
      speak(preInstruction);
    }
    if (metersToManeuver <= 65) {
      state.activeStep += 1;
      const next = state.navigationSteps[state.activeStep];
      if (!next) {
        const finalInstruction = t('navigationFollowRoute');
        $('#route-note').textContent = finalInstruction;
        $('#navigation-instruction').textContent = finalInstruction;
        return;
      }
      $('#route-note').textContent = next.instructions;
      $('#navigation-instruction').textContent = next.instructions;
      next.alertSpoken = true;
      speak(next.instructions);
    }
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

  function updateNavigationButton() {
    const button = $('#start-navigation');
    const label = button.querySelector('span');
    label.textContent = state.isNavigating ? t('stopNavigation') : t('startNavigation');
    button.classList.toggle('is-navigating', state.isNavigating);
    button.setAttribute('aria-pressed', String(state.isNavigating));
  }

  function stopNavigation(showMessage = true) {
    const wasRerouting = state.isRerouting;
    state.isNavigating = false;
    state.isRerouting = false;
    state.offRouteFixes = 0;
    state.followCamera = false;
    state.map?.stop();
    if (wasRerouting) {
      state.routeRequestId += 1;
      state.routeSearchController?.abort();
      state.routeSearchController = null;
      $('#search-route').disabled = false;
    }
    $('#navigation-banner').hidden = true;
    window.speechSynthesis?.cancel();
    const wakeLockRelease = state.screenWakeLock?.release?.();
    wakeLockRelease?.catch?.(() => {});
    state.screenWakeLock = null;
    updateNavigationButton();
    if (showMessage) $('#route-note').textContent = t('navigationStopped');
    if (showMessage) showToast(t('navigationStopped'));
  }

  function setupEvents() {
    $('#language-select').addEventListener('change', (event) => applyLanguage(event.target.value));
    $$('.vehicle-choice').forEach((button) => button.addEventListener('click', () => setVehicleType(button.dataset.vehicle)));
    $('#theme-select').addEventListener('change', (event) => {
      state.theme = event.target.value;
      localStorage.setItem('trazia:theme', state.theme);
      applyTheme();
    });
    $('#open-menu').addEventListener('click', () => openDialog(menuDialog));
    $('#menu-search').addEventListener('click', () => {
      closeDialog(menuDialog);
      $('.side-panel').classList.add('expanded');
      $('#toggle-panel').setAttribute('aria-expanded', 'true');
      destinationInput.focus({ preventScroll: true });
    });
    $('#menu-music').addEventListener('click', () => {
      closeDialog(menuDialog);
      openDialog(musicDialog);
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
    $('#open-music').addEventListener('click', () => openDialog(musicDialog));
    $$('.music-service').forEach((button) => button.addEventListener('click', () => openMusicService(button.dataset.musicService)));
    $('#toggle-voice').addEventListener('click', () => {
      state.voiceEnabled = !state.voiceEnabled;
      if (!state.voiceEnabled) window.speechSynthesis?.cancel();
      updateVoiceToggle();
      if (state.voiceEnabled) {
        window.speechSynthesis?.resume?.();
        speak(t('voiceTest'));
      }
    });
    $('#quick-places').addEventListener('click', (event) => {
      const button = event.target.closest('[data-place-id]');
      if (button) selectSavedPlace(button.dataset.placeId);
    });
    $('#save-place').addEventListener('click', saveSavedPlace);
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
    $('#voice-search').addEventListener('click', startVoiceSearch);
    $('#locate-me').addEventListener('click', () => { void locateMe(); });
    $('#map-locate').addEventListener('click', () => { void locateMe(); });
    $('#traffic-toggle').addEventListener('change', toggleTraffic);
    $('#avoid-tolls').addEventListener('change', (event) => { state.avoidTolls = event.target.checked; });
    $$('.category-button').forEach((button) => button.addEventListener('click', () => { void searchNearby(button.dataset.category); }));
    $('#clear-places').addEventListener('click', clearPlaces);
    $('#open-report').addEventListener('click', () => openDialog(reportDialog));
    $('#save-report').addEventListener('click', saveReport);
    $('#open-settings').addEventListener('click', () => openDialog(settingsDialog));
    $('#open-settings-footer').addEventListener('click', () => openDialog(settingsDialog));
    $('#start-navigation').addEventListener('click', () => { void toggleNavigation(); });
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
    [menuDialog, musicDialog, savedPlaceDialog, reportDialog, settingsDialog].forEach((dialog) => dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.isNavigating) stopNavigation();
    });
  }

  function renderSavedReportCount() {
    renderReportCount();
  }

  function initialize() {
    runSplashScreen();
    applyLanguage(state.language);
    applyTheme();
    setupEvents();
    renderSavedPlaces();
    renderRecentDestinations();
    renderSavedReportCount();
    initializeMap();
    updateSpeedometer();
    void locateMe({ silent: true });
    window.setInterval(() => { if (state.theme === 'auto') applyTheme(); }, 60_000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && state.theme === 'auto') applyTheme(); });
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.info('Trazia offline shell is unavailable:', error));
    }
  }

  initialize();
})();

