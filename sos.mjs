export function normalizeEmergencyNumbers(payload) {
  if (!Array.isArray(payload)) throw new Error('Invalid emergency directory');
  const entries = [], seen = new Set();
  for (const entry of payload) {
    if (!entry || !/^[A-Z]{2}$/.test(entry.countryCode) || typeof entry.number !== 'string' || !/^\d{2,4}$/.test(entry.number)) continue;
    if (!['es', 'en'].every(lang => typeof entry.countryName?.[lang] === 'string' && entry.countryName[lang].length > 0 && entry.countryName[lang].length <= 80 && typeof entry.service?.[lang] === 'string' && entry.service[lang].length > 0 && entry.service[lang].length <= 160)) continue;
    let source;
    try { source = new URL(entry.source); } catch { continue; }
    if (source.protocol !== 'https:' || source.username || source.password || !/^\d{4}-\d{2}-\d{2}$/.test(entry.verifiedAt)) continue;
    if (seen.has(entry.countryCode)) throw new Error('Duplicate emergency country');
    seen.add(entry.countryCode);
    entries.push({ countryCode: entry.countryCode, countryName: { ...entry.countryName }, number: entry.number, service: { ...entry.service }, source: source.href, verifiedAt: entry.verifiedAt });
  }
  return entries;
}

export function countryFromReverse(payload) {
  const codes = new Set();
  for (const feature of Array.isArray(payload?.features) ? payload.features : []) {
    const code = feature?.properties?.countrycode || feature?.properties?.country_code;
    if (typeof code === 'string' && /^[a-z]{2}$/i.test(code)) codes.add(code.toUpperCase());
  }
  return codes.size === 1 ? [...codes][0] : null;
}

export function setupSOS({ window, document, getPosition, language = () => 'es', openDialog, fetcher = window.fetch.bind(window), entries }) {
  const $ = id => document.getElementById(id);
  const dialog = $('sos-dialog'), select = $('sos-country'), call = $('sos-call');
  const text = (es, en) => language() === 'en' ? en : es;
  let directory = [], loadError = false, selectedCode = '', status = 'manual';
  let generation = 0, controller, opened = false;

  function cancelDetection() { ++generation; controller?.abort(); controller = null; }
  function currentEntry() { return directory.find(entry => entry.countryCode === selectedCode); }
  function render() {
    const lang = language() === 'en' ? 'en' : 'es';
    $('open-sos').setAttribute('aria-label', text('SOS · llamada de emergencia', 'SOS · emergency call'));
    $('open-sos').title = text('SOS · emergencias', 'SOS · emergency');
    $('sos-title').textContent = text('SOS · Emergencias', 'SOS · Emergency');
    $('sos-country-label').textContent = text('País donde estás', 'Country you are in');
    const placeholder = document.createElement('option');
    placeholder.value = ''; placeholder.textContent = text('Selecciona tu país', 'Select your country');
    select.replaceChildren(placeholder);
    for (const entry of [...directory].sort((a, b) => a.countryName[lang].localeCompare(b.countryName[lang], lang))) {
      const option = document.createElement('option');
      option.value = entry.countryCode; option.textContent = entry.countryName[lang]; select.append(option);
    }
    select.value = selectedCode;
    select.disabled = directory.length === 0;
    const entry = currentEntry();
    if (entry) {
      call.href = `tel:${entry.number}`;
      call.textContent = `${text('Llamar al', 'Call')} ${entry.number} · ${entry.countryName[lang]}`;
      call.setAttribute('aria-disabled', 'false');
      $('sos-service').textContent = entry.service[lang];
      $('sos-source').href = entry.source;
      $('sos-source').textContent = text('Consultar fuente oficial', 'View official source');
      $('sos-source').hidden = false;
    } else {
      call.removeAttribute('href'); call.setAttribute('aria-disabled', 'true');
      call.textContent = text('Selecciona un país para llamar', 'Select a country to call');
      $('sos-service').textContent = text('Se mostrará el número verificado para el país elegido.', 'The verified number for your chosen country will appear here.');
      $('sos-source').hidden = true; $('sos-source').removeAttribute('href');
    }
    const messages = {
      loading: text('Cargando números de emergencia…', 'Loading emergency numbers…'),
      detecting: text('Consultando el país de tu ubicación… Puedes elegirlo manualmente.', 'Checking the country at your location… You can choose it manually.'),
      suggested: text('País sugerido por tu ubicación. Confírmalo antes de llamar, especialmente cerca de una frontera.', 'Country suggested by your location. Confirm it before calling, especially near a border.'),
      manual: text('Selecciona el país donde estás; no se usa el destino de tu ruta.', 'Select the country you are in; your route destination is not used.'),
      chosen: text('País elegido manualmente. Comprueba que coincide con tu ubicación.', 'Country chosen manually. Check that it matches your location.'),
      unsupported: text('No hay un número verificado para el país detectado. Usa la función de llamada de emergencia del teléfono.', 'No verified number is available for the detected country. Use your phone’s emergency calling feature.'),
      unavailable: text('No se pudo identificar tu país. Elígelo manualmente o usa la llamada de emergencia del teléfono.', 'Your country could not be identified. Choose it manually or use your phone’s emergency calling feature.'),
      error: text('No se pudieron cargar los números. Usa la función de llamada de emergencia del teléfono.', 'Emergency numbers could not be loaded. Use your phone’s emergency calling feature.'),
    };
    $('sos-location-status').textContent = messages[loadError ? 'error' : status];
    $('sos-location-status').setAttribute('aria-busy', String(status === 'detecting' || status === 'loading'));
    $('sos-speaker-note').textContent = text('Cuando se abra la llamada, activa Altavoz en el teléfono. Trazia no puede activarlo automáticamente.', 'When the call opens, turn on Speaker on your phone. Trazia cannot turn it on automatically.');
    $('sos-scope-note').textContent = text('Confirma el país donde estás antes de llamar. La cobertura puede variar por región. Trazia no envía tu ubicación a emergencias.', 'Confirm the country you are in before calling. Coverage may vary by region. Trazia does not send your location to emergency services.');
    $('sos-locate').textContent = text('Usar mi ubicación', 'Use my location');
    document.querySelector('[data-close="sos-dialog"]').setAttribute('aria-label', text('Cerrar SOS', 'Close SOS'));
  }

  const ready = (async () => {
    status = 'loading'; render();
    try {
      const response = entries ? null : await fetcher('./data/emergency-numbers.json?v=71', { credentials: 'omit' });
      if (response && !response.ok) throw new Error('Directory unavailable');
      directory = normalizeEmergencyNumbers(entries || await response.json());
      if (!directory.length) throw new Error('Directory empty');
    } catch { loadError = true; }
    status = 'manual'; render();
  })();

  async function detectCountry(request) {
    cancelDetection();
    const requestGeneration = generation;
    await ready;
    if (!opened || requestGeneration !== generation || loadError) return;
    status = 'detecting'; render();
    let timeout;
    try {
      const point = await getPosition({ request });
      if (!opened || requestGeneration !== generation) return;
      if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180 || window.navigator.onLine === false) throw new Error('Location unavailable');
      controller = new AbortController();
      const signal = controller.signal;
      timeout = window.setTimeout(() => controller?.signal === signal && controller.abort(), 8_000);
      const url = new URL('https://photon.komoot.io/reverse');
      url.search = new URLSearchParams({ lat: point.lat.toFixed(2), lon: point.lng.toFixed(2), radius: '5', limit: '5' });
      const response = await fetcher(url.href, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('Country lookup unavailable');
      const code = countryFromReverse(await response.json());
      if (!opened || requestGeneration !== generation) return;
      selectedCode = directory.some(entry => entry.countryCode === code) ? code : '';
      status = selectedCode ? 'suggested' : code ? 'unsupported' : 'unavailable';
    } catch {
      if (!opened || requestGeneration !== generation) return;
      status = currentEntry() ? 'chosen' : 'unavailable';
    } finally {
      window.clearTimeout(timeout);
      if (opened && requestGeneration === generation) render();
    }
  }

  function open() {
    cancelDetection(); opened = true; selectedCode = ''; status = directory.length ? 'manual' : 'loading';
    render(); openDialog(dialog);
    void detectCountry(false);
  }
  function close() { opened = false; cancelDetection(); dialog.close(); }
  select.addEventListener('change', () => {
    cancelDetection(); selectedCode = select.value; status = currentEntry() ? 'chosen' : 'manual'; render();
  });
  call.addEventListener('click', event => {
    if (!currentEntry()) event.preventDefault();
    else {
      cancelDetection();
      window.speechSynthesis?.cancel?.();
      // Only the user's explicit tel: link opens the phone.
    }
  });
  $('open-sos').addEventListener('click', open);
  $('sos-locate').addEventListener('click', () => { void detectCountry(true); });
  dialog.addEventListener('close', () => { opened = false; cancelDetection(); });
  return { open, close, refreshLanguage: render };
}
