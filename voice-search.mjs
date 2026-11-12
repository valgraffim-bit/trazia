export function spokenQuery(value) {
  let query = String(value || '').trim().replace(/[.!?¿¡]+$/g, '').trim();
  query = query.replace(/^¿/, '').replace(/^(?:hola\s+)?trazia[,\s]+/i, '');
  query = query.replace(/^(?:por favor[,\s]+)?(?:ll[eé]vame\s+al?|quiero\s+ir\s+al?|c[oó]mo\s+(?:llego|llegar)\s+al?|d[oó]nde\s+(?:queda|est[aá])|buscar\s+direcci[oó]n|busca(?:r|me)?|take\s+me\s+to|directions\s+to|find|search\s+for)\s+/i, '');
  return query.replace(/[,\s]+por favor$/i, '').trim().slice(0, 300);
}

export function setupVoiceSearch({window, document, language, onQuery, onManual, message}) {
  const $ = id => document.getElementById(id);
  const dialog = $('voice-search-dialog');
  const triggers = [$('voice-search'), $('map-voice-search'), $('wide-map-voice-search')].filter(Boolean);
  let active = null;
  let origin = null;
  const text = (es,en) => language() === 'es' ? es : en;
  const setLabel = value => { $('voice-listening-title').textContent = value; $('voice-status').textContent = value; };
  function release(session) {
    if (active !== session) return;
    active = null;
    window.clearTimeout(session.timer);
    triggers.forEach(button => { button.classList.remove('listening'); button.setAttribute('aria-pressed','false'); });
    try { session.recognition.abort(); } catch { /* Some browsers already ended the session. */ }
  }
  function cancel() {
    if (active) release(active);
    if (dialog.open) dialog.close();
    $('voice-status').textContent = '';
  }
  function fail(session, reason) {
    if (active !== session) return;
    release(session);
    const errors = {
      'not-allowed': text('Permití el micrófono y el reconocimiento de voz en los ajustes del navegador.', 'Allow microphone and speech recognition in your browser settings.'),
      'service-not-allowed': text('El reconocimiento de voz no está habilitado en este dispositivo.', 'Speech recognition is not enabled on this device.'),
      'audio-capture': text('No se detectó un micrófono disponible. Revisá si otra aplicación lo está usando.', 'No microphone is available. Check whether another app is using it.'),
      network: text('No se pudo conectar el reconocimiento de voz. Revisá tu conexión.', 'Speech recognition could not connect. Check your internet connection.'),
      'no-speech': text('No escuché una dirección o un negocio. Intentá de nuevo.', 'I did not hear an address or business. Try again.'),
    };
    dialog.classList.add('voice-search-error');
    setLabel(text('No pude escucharte', 'Could not hear you'));
    $('voice-listening-hint').textContent = errors[reason] || text('No se pudo reconocer la voz. Intentá de nuevo o escribí el destino.', 'Speech could not be recognized. Try again or type your destination.');
    $('voice-retry').hidden = false;
    $('voice-type').hidden = false;
    $('voice-cancel-label').textContent = text('Cerrar', 'Close');
    $('voice-retry').focus({preventScroll:true});
  }
  function start(event) {
    if (active) { cancel(); return; }
    if (triggers.includes(event?.currentTarget)) origin = event.currentTarget;
    origin ||= triggers[0];
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      cancel();
      message(text('Este navegador no admite búsqueda por voz. Podés dictar con el micrófono del teclado o escribir el destino.', 'This browser does not support voice search. Use keyboard dictation or type your destination.'));
      onManual();
      return;
    }
    dialog.classList.remove('voice-search-error');
    $('voice-retry').hidden = true;
    $('voice-type').hidden = true;
    $('voice-transcript').textContent = '';
    $('voice-listening-hint').textContent = text('Decí una dirección, un negocio o un lugar.', 'Say an address, a business or a place.');
    $('voice-cancel-label').textContent = text('Tocá para cancelar', 'Tap to cancel');
    setLabel(text('Activando micrófono…', 'Starting microphone…'));
    let session;
    try {
      const recognition = new Recognition();
      session = {recognition, timer: null};
      active = session;
      recognition.lang = language() === 'es' ? 'es-CO' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { if (active === session) setLabel(text('Escuchando…', 'Listening…')); };
      recognition.onresult = event => {
        if (active !== session) return;
        const final = [];
        const partial = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript?.trim();
          if (transcript) (result.isFinal ? final : partial).push(transcript);
        }
        $('voice-transcript').textContent = [...final,...partial].join(' ');
        if (!final.length) return;
        const query = spokenQuery(final.join(' '));
        if (!query) { fail(session,'no-speech'); return; }
        release(session);
        dialog.close();
        $('voice-status').textContent = '';
        Promise.resolve().then(() => onQuery(query)).catch(() => message(text('No se pudo buscar ese lugar. Intentá de nuevo.', 'Could not search for that place. Try again.')));
      };
      recognition.onerror = event => { if (active === session) fail(session,event.error); };
      recognition.onend = () => { if (active === session) fail(session,'no-speech'); };
      window.speechSynthesis?.cancel();
      triggers.forEach(button => { button.classList.add('listening'); button.setAttribute('aria-pressed','true'); });
      if (!dialog.open) dialog.showModal();
      session.timer = window.setTimeout(() => fail(session,'no-speech'), 20000);
      // Keep this call in the microphone tap gesture for Safari permission prompts.
      recognition.start();
    } catch (error) {
      if (session && dialog.open) fail(session, error.name === 'NotAllowedError' ? 'not-allowed' : 'unknown');
      else {
        if (session) release(session);
        message(text('No se pudo activar el micrófono. Podés escribir el destino.', 'Could not start the microphone. You can type your destination.'));
      }
    }
  }
  triggers.forEach(button => button.addEventListener('click',start));
  $('voice-cancel').addEventListener('click',cancel);
  $('voice-retry').addEventListener('click',start);
  $('voice-type').addEventListener('click',() => { cancel(); onManual(); });
  dialog.addEventListener('cancel',event => { event.preventDefault(); cancel(); });
  dialog.addEventListener('click',event => { if (event.target === dialog) cancel(); });
  dialog.addEventListener('close',() => {
    if (dialog.open) return;
    if (active) release(active);
    origin?.focus({preventScroll:true});
  });
  document.addEventListener('visibilitychange',() => { if (document.hidden) cancel(); });
  window.addEventListener('pagehide',cancel);
  return {start,cancel};
}
