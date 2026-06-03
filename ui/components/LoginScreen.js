/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN — CÓDICE
   Autenticación con email/contraseña + verificación por Gmail.
   También mantiene Google Sign-In para la versión web.

   USO: LoginScreen.show()  /  LoginScreen.hide()
═══════════════════════════════════════════════════════════════ */

import Auth from "../services/auth.js";

// ── HTML ──────────────────────────────────────────────────────
const _HTML = `
<div id="login-screen" style="
  position:fixed;inset:0;z-index:10000;
  background:var(--bg);
  display:flex;align-items:center;justify-content:center;
  background-image:
    radial-gradient(ellipse 80% 50% at 20% 10%, rgba(124,140,255,.18), transparent),
    radial-gradient(ellipse 60% 40% at 80% 90%, rgba(176,108,255,.13), transparent),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,212,255,.04), transparent);
  font-family:var(--fb);overflow-y:auto;
">
  <div style="position:absolute;inset:0;pointer-events:none;opacity:.022;
    background:url('data:image/svg+xml,%3Csvg viewBox=%270 0 300 300%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.85%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E');
    background-size:200px 200px;"></div>

  <div class="login-orb login-orb-1"></div>
  <div class="login-orb login-orb-2"></div>
  <div class="login-orb login-orb-3"></div>

  <div class="login-card" id="login-card">

    <!-- Logo -->
    <div class="login-logo-wrap">
      <div class="login-logo-ring">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="6" y="6" width="10" height="10" rx="2" fill="var(--ac)" opacity=".9"/>
          <rect x="20" y="6" width="10" height="10" rx="2" fill="var(--purple)" opacity=".7"/>
          <rect x="6" y="20" width="10" height="10" rx="2" fill="var(--cyan)" opacity=".6"/>
          <rect x="20" y="20" width="10" height="10" rx="2" fill="var(--ac)" opacity=".5"/>
        </svg>
      </div>
    </div>
    <h1 class="login-title">CÓDICE</h1>
    <p class="login-sub">Sistema Operativo de Estudio IA</p>
    <div class="login-divider"></div>

    <!-- ── FASE: selector login/registro ── -->
    <div id="login-pre">
      <p class="login-desc">Inicia sesión para sincronizar tus módulos,<br>clases y progreso en todos tus dispositivos.</p>

      <button id="btn-go-login" class="login-btn-primary">Iniciar sesión</button>
      <button id="btn-go-register" class="login-btn-secondary" style="margin-top:10px">Crear cuenta nueva</button>

      <!-- Google solo en web -->
      <div id="login-google-wrap">
        <div class="login-or"><span>o</span></div>
        <button id="login-google-btn" class="login-google-btn">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>
      </div>

      <p class="login-legal">Al continuar, aceptas que tus datos de estudio se guardan en Firebase asociados a tu cuenta.</p>
    </div>

    <!-- ── FASE: login con email ── -->
    <div id="login-email" style="display:none">
      <p class="login-desc" style="margin-bottom:18px">Ingresa tu email y contraseña.</p>
      <div class="login-field-wrap">
        <label class="login-label">Email</label>
        <input id="li-email" type="email" placeholder="tu@email.com" class="login-input" autocomplete="email"/>
      </div>
      <div class="login-field-wrap" style="margin-top:12px">
        <label class="login-label">Contraseña</label>
        <div style="position:relative">
          <input id="li-pass" type="password" placeholder="••••••••" class="login-input" autocomplete="current-password"/>
          <button id="li-toggle-pass" class="login-eye-btn" tabindex="-1">👁</button>
        </div>
      </div>
      <button id="li-forgot" class="login-link-btn" style="margin-top:6px">¿Olvidaste tu contraseña?</button>
      <button id="li-submit" class="login-btn-primary" style="margin-top:18px">Entrar</button>
      <button id="li-back" class="login-btn-ghost" style="margin-top:10px">← Volver</button>
    </div>

    <!-- ── FASE: registro ── -->
    <div id="login-register" style="display:none">
      <p class="login-desc" style="margin-bottom:18px">Crea tu cuenta gratuita.</p>
      <div class="login-field-wrap">
        <label class="login-label">Email</label>
        <input id="reg-email" type="email" placeholder="tu@email.com" class="login-input" autocomplete="email"/>
      </div>
      <div class="login-field-wrap" style="margin-top:12px">
        <label class="login-label">Contraseña</label>
        <div style="position:relative">
          <input id="reg-pass" type="password" placeholder="Mín. 6 caracteres" class="login-input" autocomplete="new-password"/>
          <button id="reg-toggle-pass" class="login-eye-btn" tabindex="-1">👁</button>
        </div>
      </div>
      <div class="login-field-wrap" style="margin-top:12px">
        <label class="login-label">Confirmar contraseña</label>
        <div style="position:relative">
          <input id="reg-pass2" type="password" placeholder="Repite la contraseña" class="login-input" autocomplete="new-password"/>
          <button id="reg-toggle-pass2" class="login-eye-btn" tabindex="-1">👁</button>
        </div>
      </div>
      <div id="reg-strength" class="login-strength" style="margin-top:8px;display:none">
        <div id="reg-strength-bar" class="login-strength-bar"></div>
        <span id="reg-strength-txt" class="login-strength-txt"></span>
      </div>
      <button id="reg-submit" class="login-btn-primary" style="margin-top:18px">Crear cuenta</button>
      <button id="reg-back" class="login-btn-ghost" style="margin-top:10px">← Volver</button>
    </div>

    <!-- ── FASE: verificar email ── -->
    <div id="login-verify" style="display:none;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:16px">📧</div>
      <p style="font-size:.95rem;font-weight:600;color:var(--t0);margin-bottom:8px">Verifica tu email</p>
      <p style="font-size:.82rem;color:var(--t1);line-height:1.6;margin-bottom:20px">
        Te enviamos un correo a <strong id="verify-email-addr" style="color:var(--ac)"></strong>.<br>
        Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
      </p>
      <button id="verify-resend" class="login-btn-secondary" style="margin-bottom:10px">Reenviar correo</button>
      <button id="verify-done" class="login-btn-primary">Ya verifiqué, continuar</button>
      <button id="verify-back" class="login-btn-ghost" style="margin-top:10px">← Volver al inicio</button>
    </div>

    <!-- ── FASE: recuperar contraseña ── -->
    <div id="login-forgot" style="display:none">
      <p class="login-desc" style="margin-bottom:18px">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
      <div class="login-field-wrap">
        <label class="login-label">Email</label>
        <input id="forgot-email" type="email" placeholder="tu@email.com" class="login-input"/>
      </div>
      <button id="forgot-submit" class="login-btn-primary" style="margin-top:18px">Enviar enlace</button>
      <button id="forgot-back" class="login-btn-ghost" style="margin-top:10px">← Volver</button>
    </div>

    <!-- ── FASE: loading ── -->
    <div id="login-loading" style="display:none;text-align:center;padding:8px 0">
      <div class="login-spinner"></div>
      <p style="font-size:.8rem;color:var(--t2);margin-top:14px" id="login-loading-msg">Iniciando sesión…</p>
    </div>

    <!-- ── FASE: error ── -->
    <div id="login-error" style="display:none">
      <div class="login-error-box">
        <span style="font-size:1.1rem">⚠️</span>
        <p id="login-error-msg" style="font-size:.8rem;color:var(--red)">Error al iniciar sesión</p>
      </div>
      <button id="login-retry-btn" class="login-btn-primary" style="margin-top:14px">Intentar de nuevo</button>
    </div>

  </div>
</div>

<style>
.login-orb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(80px);opacity:.35;animation:loginOrbDrift 8s ease-in-out infinite alternate;}
.login-orb-1{width:420px;height:420px;top:-120px;left:-80px;background:radial-gradient(circle,var(--ac),transparent 70%);animation-delay:0s;}
.login-orb-2{width:300px;height:300px;bottom:-80px;right:-60px;background:radial-gradient(circle,var(--purple),transparent 70%);animation-delay:-3s;}
.login-orb-3{width:200px;height:200px;top:40%;left:60%;background:radial-gradient(circle,var(--cyan),transparent 70%);opacity:.15;animation-delay:-5s;}
@keyframes loginOrbDrift{from{transform:translate(0,0) scale(1)}to{transform:translate(20px,15px) scale(1.06)}}

.login-card{
  position:relative;z-index:1;
  width:min(420px, calc(100vw - 32px));
  background:rgba(14,14,26,0.82);
  backdrop-filter:blur(40px) saturate(180%);
  -webkit-backdrop-filter:blur(40px) saturate(180%);
  border:1px solid rgba(255,255,255,.09);
  border-radius:24px;padding:40px 36px 36px;
  box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04) inset,0 1px 0 rgba(255,255,255,.12) inset;
  animation:loginCardIn .45s cubic-bezier(.34,1.56,.64,1) forwards;
  margin:24px auto;
}
@keyframes loginCardIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}

.login-logo-wrap{display:flex;justify-content:center;margin-bottom:20px;}
.login-logo-ring{width:64px;height:64px;border-radius:18px;background:rgba(124,140,255,.08);border:1px solid rgba(124,140,255,.18);display:flex;align-items:center;justify-content:center;box-shadow:0 0 28px rgba(124,140,255,.18),0 0 0 8px rgba(124,140,255,.04);animation:loginLogoPulse 3s ease-in-out infinite;}
@keyframes loginLogoPulse{0%,100%{box-shadow:0 0 28px rgba(124,140,255,.18),0 0 0 8px rgba(124,140,255,.04)}50%{box-shadow:0 0 40px rgba(124,140,255,.30),0 0 0 14px rgba(124,140,255,.07)}}

.login-title{font-family:var(--fd);font-size:2.2rem;font-weight:800;letter-spacing:-2px;text-align:center;background:linear-gradient(145deg,#fff 0%,var(--ach) 50%,var(--purple) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;filter:drop-shadow(0 0 30px var(--acg));margin-bottom:6px;}
.login-sub{text-align:center;font-size:.7rem;letter-spacing:.3em;color:var(--t2);text-transform:uppercase;font-weight:500;margin-bottom:0;}
.login-divider{height:1px;background:var(--b0);margin:24px 0;}
.login-desc{text-align:center;font-size:.84rem;color:var(--t1);line-height:1.6;margin-bottom:24px;}

/* Inputs */
.login-field-wrap{display:flex;flex-direction:column;}
.login-label{font-size:.75rem;color:var(--t2);margin-bottom:6px;font-weight:500;}
.login-input{
  width:100%;padding:11px 14px;
  background:rgba(255,255,255,.05);
  border:1px solid var(--b1);border-radius:10px;
  color:var(--t0);font-family:var(--fb);font-size:.88rem;
  outline:none;transition:border-color 200ms,box-shadow 200ms;
  box-sizing:border-box;
}
.login-input:focus{border-color:var(--ac);box-shadow:0 0 0 3px rgba(124,140,255,.15);}
.login-input::placeholder{color:var(--t2);}
.login-eye-btn{
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;font-size:.9rem;
  color:var(--t2);padding:4px;line-height:1;
}

/* Botones */
.login-btn-primary{
  width:100%;padding:13px 20px;
  background:var(--ac);border:none;border-radius:12px;
  color:#fff;font-family:var(--fb);font-size:.9rem;font-weight:700;
  cursor:pointer;transition:all 200ms;
}
.login-btn-primary:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:0 8px 24px rgba(124,140,255,.35);}
.login-btn-primary:active{transform:scale(.98);}

.login-btn-secondary{
  width:100%;padding:12px 20px;
  background:rgba(255,255,255,.06);
  border:1px solid var(--b1);border-radius:12px;
  color:var(--t0);font-family:var(--fb);font-size:.88rem;font-weight:600;
  cursor:pointer;transition:all 200ms;
}
.login-btn-secondary:hover{background:rgba(255,255,255,.1);border-color:var(--b2);}

.login-btn-ghost{
  width:100%;padding:10px;background:none;border:none;
  color:var(--t2);font-family:var(--fb);font-size:.82rem;
  cursor:pointer;transition:color 200ms;
}
.login-btn-ghost:hover{color:var(--t0);}

.login-link-btn{
  background:none;border:none;color:var(--ac);
  font-family:var(--fb);font-size:.78rem;cursor:pointer;
  padding:0;text-decoration:underline;text-underline-offset:3px;
}

/* Google */
.login-or{text-align:center;position:relative;margin:18px 0 14px;}
.login-or::before{content:'';position:absolute;top:50%;left:0;right:0;height:1px;background:var(--b0);}
.login-or span{position:relative;background:rgba(14,14,26,0.82);padding:0 10px;font-size:.75rem;color:var(--t2);}
.login-google-btn{
  width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
  padding:13px 20px;background:var(--s2);border:1px solid var(--b1);border-radius:12px;
  color:var(--t0);font-family:var(--fb);font-size:.9rem;font-weight:600;
  cursor:pointer;transition:all 200ms;position:relative;overflow:hidden;
}
.login-google-btn:hover{background:var(--s3);border-color:var(--b2);transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.3);}

/* Strength */
.login-strength{display:flex;align-items:center;gap:8px;}
.login-strength-bar{flex:1;height:3px;border-radius:2px;background:var(--b0);position:relative;overflow:hidden;}
.login-strength-bar::after{content:'';position:absolute;inset:0;border-radius:2px;transition:width 300ms,background 300ms;width:var(--sw,0%);background:var(--sc,var(--red));}
.login-strength-txt{font-size:.72rem;color:var(--t2);white-space:nowrap;}

/* Spinner / error */
.login-spinner{width:36px;height:36px;border-radius:50%;border:2px solid var(--b1);border-top-color:var(--ac);animation:spin .8s linear infinite;margin:0 auto;}
.login-error-box{display:flex;align-items:center;gap:10px;background:var(--rd);border:1px solid rgba(255,95,95,.2);border-radius:10px;padding:12px 14px;}

/* Legal */
.login-legal{text-align:center;font-size:.68rem;color:var(--t2);margin-top:16px;line-height:1.5;}
</style>
`;

// ── Estado interno ─────────────────────────────────────────────
let _currentPhase = 'pre';
let _pendingEmail = '';

// ── Montar ────────────────────────────────────────────────────
function _mount() {
  if (document.getElementById('login-screen')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = _HTML;
  document.body.appendChild(wrap);
  _wireEvents();
}

// ── Eventos ───────────────────────────────────────────────────
function _wireEvents() {
  // Navegación entre fases
  _on('btn-go-login',    'click', () => _setPhase('email'));
  _on('btn-go-register', 'click', () => _setPhase('register'));
  _on('li-back',         'click', () => _setPhase('pre'));
  _on('reg-back',        'click', () => _setPhase('pre'));
  _on('forgot-back',     'click', () => _setPhase('email'));
  _on('verify-back',     'click', () => _setPhase('pre'));
  _on('login-retry-btn', 'click', () => _setPhase('pre'));

  // Acciones
  _on('li-submit',      'click', _handleLogin);
  _on('reg-submit',     'click', _handleRegister);
  _on('forgot-submit',  'click', _handleForgot);
  _on('verify-done',    'click', _handleVerifyDone);
  _on('verify-resend',  'click', _handleResend);
  _on('login-google-btn','click', _handleGoogle);
  _on('li-forgot',      'click', () => _setPhase('forgot'));

  // Enter en inputs
  _onEnter('li-pass',    _handleLogin);
  _onEnter('li-email',   _handleLogin);
  _onEnter('reg-pass2',  _handleRegister);
  _onEnter('forgot-email', _handleForgot);

  // Toggle contraseña
  _togglePass('li-toggle-pass',  'li-pass');
  _togglePass('reg-toggle-pass', 'reg-pass');
  _togglePass('reg-toggle-pass2','reg-pass2');

  // Fuerza de contraseña
  const regPass = document.getElementById('reg-pass');
  if (regPass) regPass.addEventListener('input', _checkStrength);

  // Ocultar Google en APK nativo
  if (window.Capacitor?.isNativePlatform?.()) {
    const gw = document.getElementById('login-google-wrap');
    if (gw) gw.style.display = 'none';
  }
}

function _on(id, ev, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(ev, fn);
}

function _onEnter(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') fn(); });
}

function _togglePass(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inputId);
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  });
}

function _checkStrength() {
  const val = document.getElementById('reg-pass')?.value || '';
  const bar = document.getElementById('reg-strength-bar');
  const txt = document.getElementById('reg-strength-txt');
  const wrap = document.getElementById('reg-strength');
  if (!bar || !txt || !wrap) return;
  wrap.style.display = val ? 'flex' : 'none';
  let score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { w:'20%', c:'#ff5f5f', t:'Muy débil' },
    { w:'40%', c:'#ff9f40', t:'Débil' },
    { w:'60%', c:'#ffd040', t:'Regular' },
    { w:'80%', c:'#7eff8a', t:'Buena' },
    { w:'100%',c:'#7c8cff', t:'Fuerte' },
  ];
  const lv = levels[Math.max(0, score - 1)];
  bar.style.setProperty('--sw', lv.w);
  bar.style.setProperty('--sc', lv.c);
  txt.textContent = lv.t;
  txt.style.color = lv.c;
}

// ── Handlers ──────────────────────────────────────────────────
async function _handleLogin() {
  const email = document.getElementById('li-email')?.value.trim();
  const pass  = document.getElementById('li-pass')?.value;
  if (!email || !pass) return _showError('Completa todos los campos.');
  _setPhase('loading', 'Iniciando sesión…');
  const res = await Auth.loginWithEmail(email, pass);
  if (res.ok) {
    if (res.needsVerification) {
      _pendingEmail = email;
      _setPhase('verify');
      return;
    }
    _setPhase('loading', '¡Bienvenido! Cargando tu espacio…');
    return;
  }
  _showError(_friendlyError(res.error));
}

async function _handleRegister() {
  const email = document.getElementById('reg-email')?.value.trim();
  const pass  = document.getElementById('reg-pass')?.value;
  const pass2 = document.getElementById('reg-pass2')?.value;
  if (!email || !pass || !pass2) return _showError('Completa todos los campos.');
  if (pass !== pass2) return _showError('Las contraseñas no coinciden.');
  if (pass.length < 6) return _showError('La contraseña debe tener al menos 6 caracteres.');
  _setPhase('loading', 'Creando tu cuenta…');
  const res = await Auth.registerWithEmail(email, pass);
  if (res.ok) {
    _pendingEmail = email;
    _setPhase('verify');
    return;
  }
  // Si el email ya existe como cuenta Google, mostrar mensaje especial
  if (res.hasGoogle) {
    _showError('⚠️ Este email ya tiene una cuenta de Google. Usa el botón "Continuar con Google" para entrar.');
    _setPhase('login'); // redirigir al panel de login para que use Google
    return;
  }
  _showError(_friendlyError(res.error));
}

async function _handleForgot() {
  const email = document.getElementById('forgot-email')?.value.trim();
  if (!email) return _showError('Ingresa tu email.');
  _setPhase('loading', 'Enviando enlace…');
  const res = await Auth.sendPasswordReset(email);
  if (res.ok) {
    _pendingEmail = email;
    _setPhase('verify');
    const addr = document.getElementById('verify-email-addr');
    if (addr) addr.textContent = email;
    const p = document.querySelector('#login-verify p:nth-child(3)');
    if (p) p.innerHTML = `Te enviamos un enlace para restablecer tu contraseña a <strong style="color:var(--ac)">${email}</strong>.`;
    return;
  }
  _showError(_friendlyError(res.error));
}

async function _handleVerifyDone() {
  _setPhase('loading', 'Verificando…');
  const res = await Auth.reloadUser();
  if (res.verified) {
    _setPhase('loading', '¡Cuenta verificada! Cargando…');
    return;
  }
  _setPhase('verify');
  _showToast('Aún no hemos detectado la verificación. Revisa tu Gmail.');
}

async function _handleResend() {
  const res = await Auth.resendVerification();
  if (res.ok) _showToast('Correo reenviado. Revisa tu Gmail.');
  else _showToast('Espera un momento antes de reenviar.');
}

async function _handleGoogle() {
  _setPhase('loading', 'Abriendo Google…');
  const res = await Auth.loginWithGoogle();
  if (res.ok) {
    _setPhase('loading', '¡Bienvenido! Cargando tu espacio…');
    return;
  }
  if (res.cancelled) { _setPhase('pre'); return; }
  _showError(_friendlyError(res.error));
}

// ── Helpers ───────────────────────────────────────────────────
function _friendlyError(code = '') {
  const map = {
    'auth/user-not-found':       'No existe una cuenta con ese email.',
    'auth/wrong-password':       'Contraseña incorrecta.',
    'auth/invalid-credential':   'Email o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
    'auth/email-already-in-use:google': '⚠️ Este email ya tiene cuenta Google. Inicia sesión con Google arriba.',
    'auth/weak-password':        'La contraseña es muy débil (mín. 6 caracteres).',
    'auth/invalid-email':        'El email no es válido.',
    'auth/too-many-requests':    'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  };
  for (const [k, v] of Object.entries(map)) {
    if (code.includes(k)) return v;
  }
  return code || 'Error desconocido. Inténtalo de nuevo.';
}

function _showError(msg) {
  _setPhase('error', msg);
}

function _showToast(msg) {
  if (window.Toast?.show) { window.Toast.show(msg); return; }
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(30,30,50,.95);color:#fff;padding:10px 18px;border-radius:10px;font-size:.82rem;z-index:99999;pointer-events:none;';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Fases ─────────────────────────────────────────────────────
const _phases = ['pre','email','register','verify','forgot','loading','error'];

function _setPhase(phase, msg = '') {
  _currentPhase = phase;
  _phases.forEach(p => {
    const el = document.getElementById('login-' + p) ||
               document.getElementById('login-' + p.replace('email','email'));
    // mapeo especial
    const ids = {
      pre:      'login-pre',
      email:    'login-email',
      register: 'login-register',
      verify:   'login-verify',
      forgot:   'login-forgot',
      loading:  'login-loading',
      error:    'login-error',
    };
    const elem = document.getElementById(ids[p]);
    if (elem) elem.style.display = p === phase ? '' : 'none';
  });

  if (phase === 'loading') {
    const lmsg = document.getElementById('login-loading-msg');
    if (lmsg) lmsg.textContent = msg || 'Cargando…';
  }
  if (phase === 'error') {
    const emsg = document.getElementById('login-error-msg');
    if (emsg) emsg.textContent = msg || 'Error desconocido.';
  }
  if (phase === 'verify') {
    const addr = document.getElementById('verify-email-addr');
    if (addr) addr.textContent = _pendingEmail;
  }
}

// ── API pública ───────────────────────────────────────────────
const LoginScreen = {
  show() {
    _mount();
    const el = document.getElementById('login-screen');
    if (el) { el.style.display = 'flex'; _setPhase('pre'); }
  },
  hide() {
    const el = document.getElementById('login-screen');
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'scale(1.02)';
    el.style.transition = 'opacity .3s ease, transform .3s ease';
    setTimeout(() => {
      el.style.display = 'none';
      el.style.opacity = '';
      el.style.transform = '';
    }, 300);
  }
};

window.LoginScreen = LoginScreen;
export default LoginScreen;
