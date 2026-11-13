const SDK = 'https://www.gstatic.com/firebasejs/11.10.0/';

export async function createAccountService(config) {
  if (!config?.apiKey || !config?.authDomain || !config?.projectId) throw new Error('auth/not-configured');
  const [app, sdk] = await Promise.all([import(`${SDK}firebase-app.js`), import(`${SDK}firebase-auth.js`)]);
  const auth = sdk.getAuth(app.initializeApp(config, 'trazia-accounts'));
  await sdk.setPersistence(auth, sdk.browserLocalPersistence);
  return {
    subscribe: (callback) => sdk.onAuthStateChanged(auth, callback),
    register: (email, password) => sdk.createUserWithEmailAndPassword(auth, email, password),
    login: (email, password) => sdk.signInWithEmailAndPassword(auth, email, password),
    google: () => {
      const provider = new sdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return sdk.signInWithPopup(auth, provider);
    },
    completeProfile: (user, name) => sdk.updateProfile(user, { displayName: name }),
    resetPassword: (email) => sdk.sendPasswordResetEmail(auth, email),
    logout: () => sdk.signOut(auth),
    deleteAccount: (user) => sdk.deleteUser(user),
  };
}

export function accountError(error) {
  const messages = {
    'auth/requires-recent-login': 'Para eliminar la cuenta, cerrá sesión, volvé a entrar y repetí la solicitud.',
    'auth/email-already-in-use': 'Este correo ya tiene una cuenta. Seleccioná Iniciar sesión o recuperá tu contraseña.',
    'auth/invalid-email': 'Revisá la dirección de correo.',
    'auth/weak-password': 'Usá una contraseña de al menos 8 caracteres.',
    'auth/invalid-credential': 'No pudimos iniciar sesión. Revisá el correo y la contraseña.',
    'auth/wrong-password': 'No pudimos iniciar sesión. Revisá el correo y la contraseña.',
    'auth/user-not-found': 'No pudimos iniciar sesión. Revisá el correo y la contraseña.',
    'auth/too-many-requests': 'Hubo varios intentos. Esperá unos minutos e intentá de nuevo.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google. Podés volver a intentarlo.',
    'auth/cancelled-popup-request': 'Intentá abrir Google nuevamente.',
    'auth/popup-blocked': 'Permití las ventanas emergentes para entrar con Google.',
    'auth/network-request-failed': 'Revisá tu conexión a internet e intentá de nuevo.',
    'auth/account-exists-with-different-credential': 'Este correo usa otro método de acceso. Iniciá sesión con ese método.',
    'auth/user-disabled': 'Esta cuenta no está disponible. Contactá al administrador de Trazia.',
    'auth/not-configured': 'El acceso con cuentas todavía no está disponible. Intentá más tarde.',
    'auth/operation-not-allowed': 'Este método de acceso todavía no está disponible.',
    'auth/unauthorized-domain': 'El acceso con Google todavía no está disponible en esta dirección.',
  };
  return messages[error?.code || error?.message] || 'No pudimos completar el acceso. Intentá de nuevo.';
}

export function setupAccountScreen({ document, config, onEnter, onLeave, serviceFactory = createAccountService }) {
  const $ = (id) => document.getElementById(id);
  const screen = $('account-screen');
  const shell = document.querySelector('.app-shell');
  const form = $('account-form');
  const profile = $('account-profile');
  const status = $('account-status');
  let service;
  let user;
  let mode = 'register';
  let busy = false;
  let entered = false;

  function lock(locked) {
    shell.inert = locked;
    shell.setAttribute('aria-hidden', String(locked));
    screen.hidden = !locked;
  }
  function setBusy(value) {
    busy = value;
    screen.setAttribute('aria-busy', String(value));
    screen.querySelectorAll('button').forEach((button) => { button.disabled = value || !service; });
  }
  function setMode(next) {
    mode = next;
    $('account-title').textContent = mode === 'register' ? 'Creá tu cuenta' : 'Bienvenido de nuevo';
    $('account-submit').textContent = mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
    $('account-password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    $('account-password').minLength = mode === 'register' ? 8 : 1;
    $('account-confirm-label').hidden = mode !== 'register';
    $('account-confirm').required = mode === 'register';
    $('account-confirm').value = '';
    $('account-reset').hidden = mode !== 'login';
    for (const name of ['register', 'login']) $('account-' + name).setAttribute('aria-pressed', String(mode === name));
    status.textContent = '';
  }
  async function action(callback) {
    if (busy || !service) return;
    status.textContent = '';
    setBusy(true);
    try { await callback(); } catch (error) {
      status.textContent = accountError(error);
      if (entered && $('account-operation-status')) $('account-operation-status').textContent = accountError(error);
    }
    finally { setBusy(false); }
  }
  lock(true);
  setBusy(true);
  $('account-register').addEventListener('click', () => setMode('register'));
  $('account-login').addEventListener('click', () => setMode('login'));
  $('account-confirm').addEventListener('input', () => $('account-confirm').setCustomValidity(''));
  $('account-password').addEventListener('input', () => $('account-confirm').setCustomValidity(''));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (mode === 'register' && $('account-password').value !== $('account-confirm').value) {
      $('account-confirm').setCustomValidity('Las contraseñas deben coincidir.');
      $('account-confirm').reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    void action(async () => {
      const email = $('account-email').value.trim();
      const password = $('account-password').value;
      window.TRAZIA_NATIVE_STAGE?.('enviando credenciales');
      try {
        if (mode === 'register') await service.register(email, password);
        else await service.login(email, password);
      } finally {
        $('account-password').value = '';
        $('account-confirm').value = '';
      }
    });
  });
  $('account-google').addEventListener('click', () => { void action(() => service.google()); });
  $('account-reset').addEventListener('click', () => {
    if (!$('account-email').reportValidity()) return;
    void action(async () => {
      await service.resetPassword($('account-email').value.trim());
      status.textContent = 'Si el correo tiene una cuenta, recibirás un enlace para cambiar la contraseña.';
    });
  });
  profile.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!profile.reportValidity() || !user) return;
    const name = $('account-name').value.trim();
    if (!name) { status.textContent = 'Escribí tu nombre para continuar.'; return; }
    void action(async () => {
      window.TRAZIA_NATIVE_STAGE?.('guardando perfil');
      await service.completeProfile(user, name);
      // Reveal the application before starting the map. On mobile Safari,
      // initializing WebGL under a full-screen authentication overlay can
      // leave a blank canvas until the map is explicitly resized.
      entered = true;
      window.TRAZIA_NATIVE_STAGE?.('abriendo mapa');
      lock(false);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      try {
        await onEnter(user);
      } catch (error) {
        // A map or optional service failure must never block account access.
        console.error('Trazia could not finish opening the map:', error);
        const note = document.getElementById('route-note');
        if (note) note.textContent = 'No se pudo cargar el mapa. Revisá la conexión y recargá Trazia.';
      }
      window.dispatchEvent(new Event('resize'));
      $('open-settings')?.focus({ preventScroll: true });
    });
  });
  $('account-change').addEventListener('click', () => { void action(() => service.logout()); });
  $('account-delete')?.addEventListener('click', () => { if (user) void action(() => service.deleteAccount(user)); });
  $('account-logout').addEventListener('click', () => { void action(() => service.logout()); });
  setMode('register');
  status.textContent = 'Preparando el acceso…';
  const ready = serviceFactory(config).then((result) => {
    service = result;
    service.subscribe((nextUser) => {
      window.TRAZIA_NATIVE_STAGE?.(nextUser ? 'sesión validada; preparando perfil' : 'sin sesión');
      user = nextUser;
      status.textContent = '';
      form.hidden = Boolean(user);
      profile.hidden = !user;
      $('account-methods').hidden = Boolean(user);
      $('account-logout').hidden = !user;
      if (user) {
        $('account-name').value = user.displayName || '';
        $('account-profile-email').value = user.email || '';
        if (user.displayName?.trim()) {
          // Existing profiles enter immediately. Never lock the visible map
          // again when Firebase refreshes the authentication state.
          if (!entered) {
            entered = true;
            window.TRAZIA_NATIVE_STAGE?.('abriendo sesión existente');
            lock(false);
            Promise.resolve().then(() => onEnter(user)).catch((error) => {
              console.error('Trazia map startup failed:', error);
              const note = document.getElementById('route-note');
              if (note) note.textContent = 'El mapa no pudo iniciar. Revisá tu conexión.';
            });
          }
        } else {
          if (entered) onLeave();
          entered = false;
          lock(true);
          $('account-title').textContent = 'Tus datos básicos';
        }
      } else {
        if (entered) onLeave();
        entered = false;
        profile.reset();
        form.reset();
        lock(true);
        setMode(mode);
      }
      setBusy(false);
    });
    setBusy(false);
  }).catch((error) => {
    status.textContent = accountError(error);
    setBusy(false);
  });
  return { ready };
}
