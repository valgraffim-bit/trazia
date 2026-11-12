const REFRESH_MS = 10 * 60_000;
const MAX_AGE_MS = 60 * 60_000;

export function weatherCondition(code, isDay, language = 'es') {
  const en = language === 'en';
  const condition = (icon, es, english) => ({ icon, text: en ? english : es });
  if (code === 0) return condition(isDay ? '☀️' : '🌙', 'Despejado', 'Clear');
  if (code === 1 || code === 2) return condition(isDay ? '🌤️' : '☁️', 'Parcialmente nublado', 'Partly cloudy');
  if (code === 3) return condition('☁️', 'Nublado', 'Overcast');
  if ([45, 48].includes(code)) return condition('🌫️', 'Niebla', 'Fog');
  if ([51, 53, 55, 56, 57].includes(code)) return condition('🌦️', 'Llovizna', 'Drizzle');
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return condition('🌧️', 'Lluvia', 'Rain');
  if ([71, 73, 75, 77, 85, 86].includes(code)) return condition('🌨️', 'Nieve', 'Snow');
  if ([95, 96, 99].includes(code)) return condition('⛈️', 'Tormenta', 'Thunderstorm');
  return condition('🌡️', 'Estado del tiempo no disponible', 'Weather condition unavailable');
}

export function formatTemperature(celsius, unit = 'celsius', language = 'es') {
  const fahrenheit = unit === 'fahrenheit';
  const value = fahrenheit ? celsius * 9 / 5 + 32 : celsius;
  const number = Number.isFinite(celsius) ? new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(Math.round(value) || 0) : '—';
  return `${number} °${fahrenheit ? 'F' : 'C'}`;
}

export function parseCurrentWeather(payload, nowMs = Date.now()) {
  const current = payload?.current;
  const observedAt = current?.time * 1000;
  if (payload?.current_units?.temperature_2m !== '°C' ||
      !Number.isFinite(current?.temperature_2m) || current.temperature_2m < -100 || current.temperature_2m > 80 ||
      !Number.isInteger(current?.weather_code) || ![0, 1].includes(current?.is_day) ||
      !Number.isFinite(current?.time) || observedAt > nowMs + 15 * 60_000 || nowMs - observedAt > MAX_AGE_MS) {
    throw new Error('Invalid or outdated weather');
  }
  return { temperatureC: current.temperature_2m, code: current.weather_code, isDay: current.is_day === 1, observedAt };
}

// Coordinates are rounded to about one kilometre. GPS updates reuse the current
// result; requests are limited to once a minute while moving and every ten
// minutes while stationary. No account details or precise GPS fixes are sent.
export function setupWeatherBadge({ window, document, getContext, openDialog, fetcher = window.fetch.bind(window), now = Date.now }) {
  const $ = id => document.getElementById(id);
  const badge = $('weather-badge');
  let active = false, timer, pending, controller, sequence = 0;
  let result = null, resultKey = '', resultPosition = null, lastAttemptKey = '', lastAttemptSource = '', lastAttempt = -Infinity, failed = false;

  function context() {
    const value = getContext();
    const point = value.position;
    const valid = Number.isFinite(point?.lat) && Number.isFinite(point?.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
    const position = valid ? { lat: Number(point.lat.toFixed(2)), lng: Number(point.lng.toFixed(2)) } : null;
    return { ...value, position, key: position ? `${position.lat},${position.lng}` : '' };
  }

  function render() {
    const ctx = context(), en = ctx.language === 'en';
    const text = (es, english) => en ? english : es;
    // Keep a recent nearby reading while the next GPS area waits for the rate
    // limit. Otherwise crossing a rounding boundary makes the badge blink off.
    const distance = resultPosition && ctx.position ? Math.hypot(
      (ctx.position.lat - resultPosition.lat) * 111_195,
      (ctx.position.lng - resultPosition.lng) * 111_195 * Math.cos(ctx.position.lat * Math.PI / 180),
    ) : Infinity;
    const available = result && distance <= 5_000 && now() - result.observedAt <= MAX_AGE_MS;
    const nearby = available && resultKey !== ctx.key;
    const stale = available && (nearby || failed || now() - result.observedAt > 30 * 60_000 || window.navigator.onLine === false);
    const condition = available ? weatherCondition(result.code, result.isDay, ctx.language) : { icon: '🌡️', text: text('Tiempo no disponible', 'Weather unavailable') };
    const temperature = formatTemperature(available ? result.temperatureC : null, ctx.unit, ctx.language);
    const scope = ctx.source === 'gps' ? text('En tu ubicación', 'At your location') : text('Zona del mapa', 'Map area');
    const status = pending ? 'loading' : stale ? 'stale' : available ? 'ready' : 'unavailable';
    badge.disabled = false;
    badge.dataset.status = status;
    badge.setAttribute('aria-busy', String(Boolean(pending)));
    $('weather-icon').textContent = condition.icon;
    $('weather-temperature').textContent = temperature;
    const statusText = nearby ? text('Último dato de una zona cercana', 'Last reading from a nearby area') : stale ? text('Último dato disponible', 'Last available reading') : !available && pending ? text('Consultando el tiempo…', 'Loading weather…') : condition.text;
    badge.title = `${scope} · ${statusText} · ${temperature}`;
    badge.setAttribute('aria-label', badge.title);
    $('weather-title').textContent = text('Tiempo actual', 'Current weather');
    $('weather-preference-note').textContent = text('°C / °F: Ajustes → General → Unidad de temperatura', '°C / °F: Settings → General → Temperature unit');
    $('weather-attribution').textContent = text('Datos meteorológicos: Open-Meteo', 'Weather data: Open-Meteo');
    document.querySelector('[data-close="weather-dialog"]').setAttribute('aria-label', text('Cerrar tiempo', 'Close weather'));
    $('weather-condition').textContent = available ? `${condition.text} · ${temperature}${stale ? ` · ${statusText}` : ''}` : statusText;
    $('weather-location').textContent = ctx.source === 'gps' ? scope : `${scope} · ${text('Activa tu ubicación para consultar el tiempo donde estás.', 'Enable location to see the weather where you are.')}`;
    $('weather-updated').textContent = available
      ? `${text('Datos de las', 'Data for')} ${new Intl.DateTimeFormat(ctx.language, { hour: '2-digit', minute: '2-digit' }).format(result.observedAt)} · ${text('Estimación meteorológica', 'Weather model estimate')}`
      : text('Revisa tu conexión. Se volverá a consultar automáticamente.', 'Check your connection. Weather will refresh automatically.');
  }

  async function refresh() {
    render();
    if (!active || document.hidden) return;
    const ctx = context(), time = now();
    if (!ctx.position || window.navigator.onLine === false) return;
    if (pending && pending.key === ctx.key) return;
    const gpsActivated = ctx.source === 'gps' && lastAttemptSource !== 'gps';
    if (!gpsActivated && time - lastAttempt < 60_000) return;
    if (ctx.key === lastAttemptKey && time - lastAttempt < (failed ? 5 * 60_000 : REFRESH_MS)) return;
    controller?.abort();
    const request = ++sequence;
    controller = new AbortController();
    const signal = controller.signal;
    lastAttempt = time; lastAttemptKey = ctx.key; lastAttemptSource = ctx.source;
    pending = { key: ctx.key };
    render();
    const timeout = window.setTimeout(() => controller?.signal === signal && controller.abort(), 10_000);
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({ latitude: ctx.position.lat, longitude: ctx.position.lng,
        current: 'temperature_2m,weather_code,is_day', temperature_unit: 'celsius', timeformat: 'unixtime', forecast_days: '1' }).toString();
      const response = await fetcher(url.href, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('Weather unavailable');
      const next = parseCurrentWeather(await response.json(), now());
      if (request !== sequence || !active) return;
      result = next; resultKey = ctx.key; resultPosition = ctx.position; failed = false;
    } catch {
      if (request === sequence && active) failed = true;
    } finally {
      window.clearTimeout(timeout);
      if (request === sequence) { pending = null; render(); }
    }
  }

  function start() {
    if (active) { void refresh(); return; }
    active = true; lastAttempt = -Infinity;
    timer = window.setInterval(() => { void refresh(); }, 60_000);
    void refresh();
  }
  function stop() {
    active = false; ++sequence; controller?.abort(); pending = null;
    window.clearInterval(timer);
    $('weather-dialog').close();
  }
  badge.addEventListener('click', () => { render(); openDialog($('weather-dialog')); });
  render();
  return { start, stop, refresh, render };
}
