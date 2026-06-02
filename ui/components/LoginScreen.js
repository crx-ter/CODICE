/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN — CÓDICE
   Pantalla de autenticación con Google.
   Usa exactamente los CSS vars del index.html existente.
   
   USO: LoginScreen.show()  /  LoginScreen.hide()
   Se monta automáticamente en <body> al importar este módulo.
═══════════════════════════════════════════════════════════════ */

import Auth from "./auth.js";

// ── HTML de la pantalla ───────────────────────────────────────
const _HTML = `
<div id="login-screen" style="
  position:fixed;inset:0;z-index:10000;
  background:var(--bg);
  display:flex;align-items:center;justify-content:center;
  background-image:
    radial-gradient(ellipse 80% 50% at 20% 10%, rgba(124,140,255,.18), transparent),
    radial-gradient(ellipse 60% 40% at 80% 90%, rgba(176,108,255,.13), transparent),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,212,255,.04), transparent);
  font-family:var(--fb);
">
  <!-- Ruido de fondo igual que el body -->
  <div style="position:absolute;inset:0;pointer-events:none;opacity:.022;
    background:url('data:image/svg+xml,%3Csvg viewBox=%270 0 300 300%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.85%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E');
    background-size:200px 200px;"></div>

  <!-- Orbes decorativos animados -->
  <div class="login-orb login-orb-1"></div>
  <div class="login-orb login-orb-2"></div>
  <div class="login-orb login-orb-3"></div>

  <!-- Card principal -->
  <div class="login-card" id="login-card">

    <!-- Logo / marca -->
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

    <!-- Estado: antes de login -->
    <div id="login-pre">
      <p class="login-desc">
        Inicia sesión para sincronizar tus módulos,<br>
        clases y progreso en todos tus dispositivos.
      </p>

      <button id="login-google-btn" class="login-google-btn">
        <!-- Google SVG icon -->
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Continuar con Google
      </button>

      <p class="login-legal">
        Al continuar, aceptas que tus datos de estudio se guardan
        en Firebase asociados a tu cuenta de Google.
      </p>
    </div>

    <!-- Estado: cargando -->
    <div id="login-loading" style="display:none;text-align:center;padding:8px 0">
      <div class="login-spinner"></div>
      <p style="font-size:.8rem;color:var(--t2);margin-top:14px" id="login-loading-msg">Iniciando sesión…</p>
    </div>

    <!-- Estado: error -->
    <div id="login-error" style="display:none">
      <div class="login-error-box">
        <span style="font-size:1.1rem">⚠️</span>
        <p id="login-error-msg" style="font-size:.8rem;color:var(--red)">Error al iniciar sesión</p>
      </div>
      <button id="login-retry-btn" class="login-google-btn" style="margin-top:12px">
        Intentar de nuevo
      </button>
    </div>

  </div>
</div>

<style>
/* ── Orbes de fondo ── */
.login-orb{
  position:absolute;border-radius:50%;pointer-events:none;
  filter:blur(80px);opacity:.35;animation:loginOrbDrift 8s ease-in-out infinite alternate;
}
.login-orb-1{
  width:420px;height:420px;top:-120px;left:-80px;
  background:radial-gradient(circle,var(--ac),transparent 70%);
  animation-delay:0s;
}
.login-orb-2{
  width:300px;height:300px;bottom:-80px;right:-60px;
  background:radial-gradient(circle,var(--purple),transparent 70%);
  animation-delay:-3s;
}
.login-orb-3{
  width:200px;height:200px;top:40%;left:60%;
  background:radial-gradient(circle,var(--cyan),transparent 70%);
  opacity:.15;animation-delay:-5s;
}
@keyframes loginOrbDrift{
  from{transform:translate(0,0) scale(1)}
  to{transform:translate(20px,15px) scale(1.06)}
}

/* ── Card ── */
.login-card{
  position:relative;z-index:1;
  width:min(420px, calc(100vw - 32px));
  background:rgba(14,14,26,0.82);
  backdrop-filter:blur(40px) saturate(180%);
  -webkit-backdrop-filter:blur(40px) saturate(180%);
  border:1px solid rgba(255,255,255,.09);
  border-radius:24px;
  padding:40px 36px 36px;
  box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04) inset,0 1px 0 rgba(255,255,255,.12) inset;
  animation:loginCardIn .45s cubic-bezier(.34,1.56,.64,1) forwards;
}
@keyframes loginCardIn{
  from{opacity:0;transform:translateY(18px) scale(.97)}
  to{opacity:1;transform:none}
}

/* ── Logo ── */
.login-logo-wrap{
  display:flex;justify-content:center;margin-bottom:20px;
}
.login-logo-ring{
  width:64px;height:64px;border-radius:18px;
  background:rgba(124,140,255,.08);
  border:1px solid rgba(124,140,255,.18);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 28px rgba(124,140,255,.18),0 0 0 8px rgba(124,140,255,.04);
  animation:loginLogoPulse 3s ease-in-out infinite;
}
@keyframes loginLogoPulse{
  0%,100%{box-shadow:0 0 28px rgba(124,140,255,.18),0 0 0 8px rgba(124,140,255,.04)}
  50%{box-shadow:0 0 40px rgba(124,140,255,.30),0 0 0 14px rgba(124,140,255,.07)}
}

/* ── Tipografía ── */
.login-title{
  font-family:var(--fd);
  font-size:2.2rem;font-weight:800;letter-spacing:-2px;
  text-align:center;
  background:linear-gradient(145deg,#fff 0%,var(--ach) 50%,var(--purple) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
  filter:drop-shadow(0 0 30px var(--acg));
  margin-bottom:6px;
}
.login-sub{
  text-align:center;
  font-size:.7rem;letter-spacing:.3em;
  color:var(--t2);text-transform:uppercase;font-weight:500;
  margin-bottom:0;
}
.login-divider{
  height:1px;background:var(--b0);margin:24px 0;
}
.login-desc{
  text-align:center;font-size:.84rem;color:var(--t1);
  line-height:1.6;margin-bottom:24px;
}

/* ── Botón Google ── */
.login-google-btn{
  width:100%;
  display:flex;align-items:center;justify-content:center;gap:10px;
  padding:13px 20px;
  background:var(--s2);
  border:1px solid var(--b1);
  border-radius:12px;
  color:var(--t0);font-family:var(--fb);font-size:.9rem;font-weight:600;
  cursor:pointer;
  transition:all 200ms cubic-bezier(.4,0,.2,1);
  position:relative;overflow:hidden;
}
.login-google-btn::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(124,140,255,.08),rgba(176,108,255,.08));
  opacity:0;transition:opacity 200ms;
}
.login-google-btn:hover{
  background:var(--s3);border-color:var(--b2);
  transform:translateY(-1px);
  box-shadow:0 8px 24px rgba(0,0,0,.3),0 0 0 1px rgba(124,140,255,.15);
}
.login-google-btn:hover::before{opacity:1}
.login-google-btn:active{transform:scale(.98);transition-duration:80ms}

/* ── Legal ── */
.login-legal{
  text-align:center;font-size:.68rem;color:var(--t2);
  margin-top:16px;line-height:1.5;
}

/* ── Spinner ── */
.login-spinner{
  width:36px;height:36px;border-radius:50%;
  border:2px solid var(--b1);border-top-color:var(--ac);
  animation:spin .8s linear infinite;
  margin:0 auto;
}

/* ── Error box ── */
.login-error-box{
  display:flex;align-items:center;gap:10px;
  background:var(--rd);border:1px solid rgba(255,95,95,.2);
  border-radius:10px;padding:12px 14px;
}
</style>
`;

// ── Montar en DOM ─────────────────────────────────────────────
function _mount() {
  if (document.getElementById('login-screen')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = _HTML;
  document.body.appendChild(wrap);
  _wireEvents();
}

// ── Lógica de eventos ─────────────────────────────────────────
function _wireEvents() {
  const btn   = document.getElementById('login-google-btn');
  const retry = document.getElementById('login-retry-btn');
  if (btn)   btn.addEventListener('click',   _handleLogin);
  if (retry) retry.addEventListener('click', _handleLogin);
}

async function _handleLogin() {
  _setPhase('loading', 'Abriendo ventana de Google…');
  const res = await Auth.loginWithGoogle();

  if (res.ok) {
    _setPhase('loading', '¡Bienvenido! Cargando tu espacio…');
    // LoginScreen.hide() se llama desde el listener de auth en index.html
    return;
  }
  if (res.cancelled) {
    _setPhase('pre');
    return;
  }
  _setPhase('error', res.error || 'Error desconocido. Inténtalo de nuevo.');
}

function _setPhase(phase, msg = '') {
  const pre     = document.getElementById('login-pre');
  const loading = document.getElementById('login-loading');
  const error   = document.getElementById('login-error');
  const lmsg    = document.getElementById('login-loading-msg');
  const emsg    = document.getElementById('login-error-msg');

  if (pre)     pre.style.display     = phase === 'pre'     ? '' : 'none';
  if (loading) loading.style.display = phase === 'loading' ? '' : 'none';
  if (error)   error.style.display   = phase === 'error'   ? '' : 'none';
  if (lmsg && phase === 'loading') lmsg.textContent = msg;
  if (emsg && phase === 'error')   emsg.textContent = msg;
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
    setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; el.style.transform = ''; }, 300);
  }
};

// Exponer globalmente
window.LoginScreen = LoginScreen;
export default LoginScreen;
