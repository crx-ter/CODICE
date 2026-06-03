/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN — CÓDICE  (v4 — Email/Password only)

   Flujos:
     • Inicio de sesión
     • Registro con verificación de email por código visual
     • Recuperar contraseña (envío por correo)
     • Pantalla de "revisa tu correo" unificada

   USO:  LoginScreen.show()  /  LoginScreen.hide()
═══════════════════════════════════════════════════════════════ */

import Auth from "../services/auth.js";

// ── HTML ──────────────────────────────────────────────────────
const _HTML = `
<div id="ls-root" style="
  position:fixed;inset:0;z-index:10000;
  background:var(--bg);
  display:flex;align-items:center;justify-content:center;
  background-image:
    radial-gradient(ellipse 80% 50% at 20% 10%,  rgba(124,140,255,.18), transparent),
    radial-gradient(ellipse 60% 40% at 80% 90%,  rgba(176,108,255,.13), transparent),
    radial-gradient(ellipse 50% 50% at 50% 50%,  rgba(0,212,255,.04),   transparent);
  font-family:var(--fb);overflow-y:auto;
">
  <!-- Fondo ruido -->
  <div style="position:absolute;inset:0;pointer-events:none;opacity:.022;
    background:url('data:image/svg+xml,%3Csvg viewBox=%270 0 300 300%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.85%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E');
    background-size:200px 200px;"></div>

  <!-- Orbes decorativos -->
  <div class="ls-orb ls-orb-1"></div>
  <div class="ls-orb ls-orb-2"></div>
  <div class="ls-orb ls-orb-3"></div>

  <div class="ls-card" id="ls-card">

    <!-- Logo / Marca -->
    <div class="ls-logo-wrap">
      <div class="ls-logo-ring">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="6"  y="6"  width="10" height="10" rx="2" fill="var(--ac)"     opacity=".9"/>
          <rect x="20" y="6"  width="10" height="10" rx="2" fill="var(--purple)" opacity=".7"/>
          <rect x="6"  y="20" width="10" height="10" rx="2" fill="var(--cyan)"   opacity=".6"/>
          <rect x="20" y="20" width="10" height="10" rx="2" fill="var(--ac)"     opacity=".5"/>
        </svg>
      </div>
    </div>
    <h1 class="ls-title">CÓDICE</h1>
    <p class="ls-sub">Sistema Operativo de Estudio IA</p>
    <div class="ls-divider"></div>

    <!-- ══ FASE: selector ══════════════════════════════════════ -->
    <div id="ls-pre">
      <p class="ls-desc">Inicia sesión para sincronizar tus módulos,<br>clases y progreso en todos tus dispositivos.</p>
      <button id="ls-go-login"    class="ls-btn-primary">Iniciar sesión</button>
      <button id="ls-go-register" class="ls-btn-secondary" style="margin-top:10px">Crear cuenta nueva</button>
      <p class="ls-legal">Al continuar, aceptas que tus datos de estudio se guardan en Firebase asociados a tu cuenta.</p>
    </div>

    <!-- ══ FASE: login ══════════════════════════════════════════ -->
    <div id="ls-login" style="display:none">
      <p class="ls-phase-title">Iniciar sesión</p>

      <div class="ls-field">
        <label class="ls-label" for="li-email">Correo electrónico</label>
        <input id="li-email" type="email" placeholder="tu@correo.com"
               class="ls-input" autocomplete="email"/>
      </div>

      <div class="ls-field" style="margin-top:12px">
        <label class="ls-label" for="li-pass">Contraseña</label>
        <div class="ls-pass-wrap">
          <input id="li-pass" type="password" placeholder="••••••••"
                 class="ls-input" autocomplete="current-password"/>
          <button id="li-eye" class="ls-eye" tabindex="-1" aria-label="Mostrar contraseña">
            <svg id="li-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <button id="li-forgot" class="ls-link-btn" style="margin-top:8px">
        ¿Olvidaste tu contraseña?
      </button>

      <div id="li-error" class="ls-inline-error" style="display:none"></div>

      <button id="li-submit" class="ls-btn-primary" style="margin-top:18px">
        <span id="li-submit-txt">Entrar</span>
        <span id="li-submit-spin" class="ls-btn-spin" style="display:none"></span>
      </button>
      <button id="li-back" class="ls-btn-ghost" style="margin-top:10px">← Volver</button>
    </div>

    <!-- ══ FASE: registro ═══════════════════════════════════════ -->
    <div id="ls-register" style="display:none">
      <p class="ls-phase-title">Crear cuenta</p>

      <div class="ls-field">
        <label class="ls-label" for="reg-name">Nombre (opcional)</label>
        <input id="reg-name" type="text" placeholder="Tu nombre"
               class="ls-input" autocomplete="name"/>
      </div>

      <div class="ls-field" style="margin-top:12px">
        <label class="ls-label" for="reg-email">Correo electrónico</label>
        <input id="reg-email" type="email" placeholder="tu@correo.com"
               class="ls-input" autocomplete="email"/>
      </div>

      <div class="ls-field" style="margin-top:12px">
        <label class="ls-label" for="reg-pass">Contraseña</label>
        <div class="ls-pass-wrap">
          <input id="reg-pass" type="password" placeholder="Mínimo 6 caracteres"
                 class="ls-input" autocomplete="new-password"/>
          <button id="reg-eye" class="ls-eye" tabindex="-1" aria-label="Mostrar contraseña">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <!-- Indicador de fortaleza -->
        <div id="reg-strength" style="display:none;margin-top:8px">
          <div class="ls-strength-bar"><div id="reg-strength-fill" class="ls-strength-fill"></div></div>
          <span id="reg-strength-txt" class="ls-strength-txt"></span>
        </div>
      </div>

      <div class="ls-field" style="margin-top:12px">
        <label class="ls-label" for="reg-pass2">Confirmar contraseña</label>
        <div class="ls-pass-wrap">
          <input id="reg-pass2" type="password" placeholder="Repite tu contraseña"
                 class="ls-input" autocomplete="new-password"/>
          <button id="reg-eye2" class="ls-eye" tabindex="-1" aria-label="Mostrar contraseña">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div id="reg-match" class="ls-match-hint" style="display:none"></div>
      </div>

      <div id="reg-error" class="ls-inline-error" style="display:none"></div>

      <button id="reg-submit" class="ls-btn-primary" style="margin-top:18px">
        <span id="reg-submit-txt">Crear cuenta</span>
        <span id="reg-submit-spin" class="ls-btn-spin" style="display:none"></span>
      </button>
      <button id="reg-back" class="ls-btn-ghost" style="margin-top:10px">← Volver</button>
    </div>

    <!-- ══ FASE: recuperar contraseña ═══════════════════════════ -->
    <div id="ls-forgot" style="display:none">
      <p class="ls-phase-title">Recuperar contraseña</p>
      <p class="ls-desc" style="margin-bottom:18px">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <div class="ls-field">
        <label class="ls-label" for="fgt-email">Correo electrónico</label>
        <input id="fgt-email" type="email" placeholder="tu@correo.com"
               class="ls-input" autocomplete="email"/>
      </div>

      <div id="fgt-error" class="ls-inline-error" style="display:none"></div>

      <button id="fgt-submit" class="ls-btn-primary" style="margin-top:18px">
        <span id="fgt-submit-txt">Enviar enlace</span>
        <span id="fgt-submit-spin" class="ls-btn-spin" style="display:none"></span>
      </button>
      <button id="fgt-back" class="ls-btn-ghost" style="margin-top:10px">← Volver al inicio de sesión</button>
    </div>

    <!-- ══ FASE: revisar correo (verificación o reset) ══════════ -->
    <div id="ls-check-email" style="display:none">
      <!-- Icono sobre -->
      <div style="display:flex;justify-content:center;margin-bottom:20px">
        <div class="ls-mail-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
      </div>

      <p class="ls-phase-title" id="ce-title">Revisa tu correo</p>
      <p class="ls-desc" id="ce-body">
        Enviamos un correo a <strong id="ce-email" class="ls-email-hl"></strong>.
        Sigue las instrucciones ahí.
      </p>

      <!-- Solo visible en modo verificación de cuenta nueva -->
      <div id="ce-verify-actions" style="display:none">
        <button id="ce-done" class="ls-btn-primary">Ya verifiqué mi correo</button>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
          <span class="ls-tiny">¿No llegó?</span>
          <button id="ce-resend" class="ls-link-btn">Reenviar correo</button>
          <span id="ce-resend-cd" class="ls-tiny" style="display:none"></span>
        </div>
      </div>

      <!-- Solo visible en modo reset contraseña -->
      <div id="ce-reset-actions" style="display:none">
        <p class="ls-tiny" style="margin-bottom:16px">
          El enlace expira en 1 hora. Si no llega en unos minutos, revisa la carpeta de spam.
        </p>
        <button id="ce-reset-resend" class="ls-link-btn">Reenviar enlace</button>
      </div>

      <button id="ce-back-login" class="ls-btn-ghost" style="margin-top:14px">
        Volver al inicio de sesión
      </button>
    </div>

    <!-- ══ FASE: cargando ═══════════════════════════════════════ -->
    <div id="ls-loading" style="display:none;text-align:center;padding:20px 0">
      <div class="ls-spinner"></div>
      <p id="ls-loading-msg" class="ls-desc" style="margin-top:16px;margin-bottom:0">Cargando…</p>
    </div>

  </div><!-- /ls-card -->
</div><!-- /ls-root -->

<style>
/* ── Orbes ── */
.ls-orb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(80px);opacity:.35;animation:lsOrb 8s ease-in-out infinite alternate;}
.ls-orb-1{width:420px;height:420px;top:-120px;left:-80px;background:radial-gradient(circle,var(--ac),transparent 70%);animation-delay:0s;}
.ls-orb-2{width:300px;height:300px;bottom:-80px;right:-60px;background:radial-gradient(circle,var(--purple),transparent 70%);animation-delay:-3s;}
.ls-orb-3{width:200px;height:200px;top:40%;left:60%;background:radial-gradient(circle,var(--cyan),transparent 70%);opacity:.15;animation-delay:-5s;}
@keyframes lsOrb{from{transform:translate(0,0) scale(1)}to{transform:translate(20px,15px) scale(1.06)}}

/* ── Card ── */
.ls-card{
  position:relative;z-index:1;
  width:min(420px,calc(100vw - 32px));
  background:rgba(14,14,26,.84);
  backdrop-filter:blur(40px) saturate(180%);
  -webkit-backdrop-filter:blur(40px) saturate(180%);
  border:1px solid rgba(255,255,255,.09);
  border-radius:24px;padding:40px 36px 36px;
  box-shadow:0 32px 80px rgba(0,0,0,.7),
             0 0 0 1px rgba(255,255,255,.04) inset,
             0 1px 0 rgba(255,255,255,.12) inset;
  animation:lsCardIn .45s cubic-bezier(.34,1.56,.64,1) forwards;
  margin:24px auto;
}
@keyframes lsCardIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}

/* ── Logo ── */
.ls-logo-wrap{display:flex;justify-content:center;margin-bottom:20px;}
.ls-logo-ring{
  width:64px;height:64px;border-radius:18px;
  background:rgba(124,140,255,.08);border:1px solid rgba(124,140,255,.18);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 28px rgba(124,140,255,.18),0 0 0 8px rgba(124,140,255,.04);
  animation:lsLogoPulse 3s ease-in-out infinite;
}
@keyframes lsLogoPulse{
  0%,100%{box-shadow:0 0 28px rgba(124,140,255,.18),0 0 0 8px rgba(124,140,255,.04)}
  50%    {box-shadow:0 0 40px rgba(124,140,255,.30),0 0 0 14px rgba(124,140,255,.07)}
}
.ls-title{
  font-family:var(--fd);font-size:2.2rem;font-weight:800;letter-spacing:-2px;
  text-align:center;
  background:linear-gradient(145deg,#fff 0%,var(--ach) 50%,var(--purple) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  filter:drop-shadow(0 0 30px var(--acg));margin-bottom:6px;
}
.ls-sub{text-align:center;font-size:.7rem;letter-spacing:.3em;color:var(--t2);text-transform:uppercase;font-weight:500;margin-bottom:0;}
.ls-divider{height:1px;background:var(--b0);margin:24px 0;}

/* ── Tipografía ── */
.ls-phase-title{font-size:1.05rem;font-weight:700;color:var(--t0);text-align:center;margin-bottom:16px;}
.ls-desc{text-align:center;font-size:.84rem;color:var(--t1);line-height:1.6;margin-bottom:24px;}
.ls-tiny{font-size:.74rem;color:var(--t2);}
.ls-email-hl{color:var(--ac);}
.ls-legal{text-align:center;font-size:.68rem;color:var(--t2);margin-top:16px;line-height:1.5;}

/* ── Inputs ── */
.ls-field{display:flex;flex-direction:column;}
.ls-label{font-size:.75rem;color:var(--t2);margin-bottom:6px;font-weight:500;}
.ls-input{
  width:100%;padding:11px 14px;
  background:rgba(255,255,255,.05);
  border:1px solid var(--b1);border-radius:10px;
  color:var(--t0);font-family:var(--fb);font-size:.88rem;
  outline:none;transition:border-color 200ms,box-shadow 200ms;
  box-sizing:border-box;
}
.ls-input:focus{border-color:var(--ac);box-shadow:0 0 0 3px rgba(124,140,255,.15);}
.ls-input::placeholder{color:var(--t2);}
.ls-input.ls-error-border{border-color:var(--red,#ff5f5f);}
.ls-pass-wrap{position:relative;}
.ls-pass-wrap .ls-input{padding-right:40px;}
.ls-eye{
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;
  color:var(--t2);padding:4px;line-height:1;
  transition:color 200ms;
}
.ls-eye:hover{color:var(--t0);}

/* ── Fortaleza de contraseña ── */
.ls-strength-bar{height:3px;border-radius:2px;background:var(--b0);overflow:hidden;margin-bottom:4px;}
.ls-strength-fill{height:100%;border-radius:2px;width:0;transition:width 300ms,background 300ms;}
.ls-strength-txt{font-size:.72rem;color:var(--t2);}
.ls-match-hint{font-size:.72rem;margin-top:5px;}

/* ── Botones ── */
.ls-btn-primary{
  width:100%;padding:13px 20px;display:flex;align-items:center;justify-content:center;gap:8px;
  background:var(--ac);border:none;border-radius:12px;
  color:#fff;font-family:var(--fb);font-size:.9rem;font-weight:700;
  cursor:pointer;transition:all 200ms;
}
.ls-btn-primary:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:0 8px 24px rgba(124,140,255,.35);}
.ls-btn-primary:active{transform:scale(.98);}
.ls-btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;filter:none;}

.ls-btn-secondary{
  width:100%;padding:12px 20px;
  background:rgba(255,255,255,.06);border:1px solid var(--b1);border-radius:12px;
  color:var(--t0);font-family:var(--fb);font-size:.88rem;font-weight:600;
  cursor:pointer;transition:all 200ms;
}
.ls-btn-secondary:hover{background:rgba(255,255,255,.1);border-color:var(--b2);}

.ls-btn-ghost{
  width:100%;padding:10px;background:none;border:none;
  color:var(--t2);font-family:var(--fb);font-size:.82rem;
  cursor:pointer;transition:color 200ms;
}
.ls-btn-ghost:hover{color:var(--t0);}

.ls-link-btn{
  background:none;border:none;color:var(--ac);
  font-family:var(--fb);font-size:.78rem;cursor:pointer;
  padding:0;text-decoration:underline;text-underline-offset:3px;
  transition:opacity 200ms;
}
.ls-link-btn:hover{opacity:.8;}

/* ── Spinner en botón ── */
.ls-btn-spin{
  width:16px;height:16px;border-radius:50%;
  border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff;
  animation:spin .7s linear infinite;
  flex-shrink:0;
}

/* ── Error inline ── */
.ls-inline-error{
  background:rgba(255,95,95,.1);border:1px solid rgba(255,95,95,.25);
  border-radius:8px;padding:10px 12px;
  font-size:.8rem;color:var(--red,#ff6b6b);
  margin-top:12px;line-height:1.4;
}

/* ── Icono sobre ── */
.ls-mail-icon{
  width:64px;height:64px;border-radius:18px;
  background:rgba(124,140,255,.08);border:1px solid rgba(124,140,255,.18);
  display:flex;align-items:center;justify-content:center;
}

/* ── Loading ── */
.ls-spinner{
  width:36px;height:36px;border-radius:50%;margin:0 auto;
  border:2px solid var(--b1);border-top-color:var(--ac);
  animation:spin .8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
`;

// ── Estado interno ────────────────────────────────────────────
let _phase       = 'pre';
let _pendingEmail = '';
let _pendingMode  = 'verify';   // 'verify' | 'reset'
let _resendTimer  = null;
let _resendSecs   = 0;

// ── Montar ────────────────────────────────────────────────────
function _mount() {
  if (document.getElementById('ls-root')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = _HTML;
  document.body.appendChild(wrap);
  _wire();
}

// ── Eventos ───────────────────────────────────────────────────
function _wire() {
  // Navegación
  _on('ls-go-login',    'click', () => _go('login'));
  _on('ls-go-register', 'click', () => _go('register'));
  _on('li-back',        'click', () => _go('pre'));
  _on('reg-back',       'click', () => _go('pre'));
  _on('fgt-back',       'click', () => _go('login'));
  _on('li-forgot',      'click', () => _go('forgot'));
  _on('ce-back-login',  'click', () => _go('login'));

  // Acciones
  _on('li-submit',       'click', _doLogin);
  _on('reg-submit',      'click', _doRegister);
  _on('fgt-submit',      'click', _doForgot);
  _on('ce-done',         'click', _doCheckVerified);
  _on('ce-resend',       'click', _doResend);
  _on('ce-reset-resend', 'click', _doResendReset);

  // Enter en inputs
  _enter('li-email',   _doLogin);
  _enter('li-pass',    _doLogin);
  _enter('reg-pass2',  _doRegister);
  _enter('fgt-email',  _doForgot);

  // Toggle ojo
  _eye('li-eye',  'li-pass');
  _eye('reg-eye', 'reg-pass');
  _eye('reg-eye2','reg-pass2');

  // Fortaleza y confirmación de contraseña
  _q('#reg-pass')?.addEventListener('input',  _strength);
  _q('#reg-pass2')?.addEventListener('input', _matchHint);
}

function _q(sel) { return document.querySelector(sel); }
function _id(id) { return document.getElementById(id); }
function _on(id, ev, fn) { _id(id)?.addEventListener(ev, fn); }
function _enter(id, fn) {
  _id(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') fn(); });
}
function _eye(btnId, inputId) {
  const btn = _id(btnId);
  const inp = _id(inputId);
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    // Cambiar icono: ojo abierto / tachado
    btn.innerHTML = show
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  });
}

// ── Fortaleza de contraseña ───────────────────────────────────
function _strength() {
  const val  = _id('reg-pass')?.value || '';
  const wrap = _id('reg-strength');
  const fill = _id('reg-strength-fill');
  const txt  = _id('reg-strength-txt');
  if (!wrap) return;
  wrap.style.display = val ? '' : 'none';
  let s = 0;
  if (val.length >= 6)           s++;
  if (val.length >= 10)          s++;
  if (/[A-Z]/.test(val))         s++;
  if (/[0-9]/.test(val))         s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  const levels = [
    { w:'20%', c:'#ff5f5f', t:'Muy débil'   },
    { w:'40%', c:'#ff9f40', t:'Débil'        },
    { w:'60%', c:'#ffd040', t:'Regular'      },
    { w:'80%', c:'#7eff8a', t:'Buena'        },
    { w:'100%',c:'#7c8cff', t:'Muy fuerte'   },
  ];
  const lv = levels[Math.max(0, s - 1)];
  if (fill) { fill.style.width = lv.w; fill.style.background = lv.c; }
  if (txt)  { txt.textContent = lv.t; txt.style.color = lv.c; }
  _matchHint();   // también actualizar la coincidencia si ya hay algo escrito
}

function _matchHint() {
  const p1   = _id('reg-pass')?.value  || '';
  const p2   = _id('reg-pass2')?.value || '';
  const hint = _id('reg-match');
  if (!hint || !p2) { if (hint) hint.style.display = 'none'; return; }
  if (p1 === p2) {
    hint.textContent = '✓ Las contraseñas coinciden';
    hint.style.color = '#7eff8a';
  } else {
    hint.textContent = '✗ Las contraseñas no coinciden';
    hint.style.color = '#ff6b6b';
  }
  hint.style.display = '';
}

// ── Error inline por sección ──────────────────────────────────
function _setErr(section, msg) {
  const el = _id(section + '-error');
  if (!el) return;
  if (msg) { el.textContent = msg; el.style.display = ''; }
  else     { el.textContent = '';  el.style.display = 'none'; }
}
function _clearErr(section) { _setErr(section, ''); }

// ── Estado de carga en botón ──────────────────────────────────
function _setBusy(prefix, busy, label = null) {
  const btn  = _id(prefix + '-submit');
  const txt  = _id(prefix + '-submit-txt');
  const spin = _id(prefix + '-submit-spin');
  if (btn)  btn.disabled = busy;
  if (txt)  { if (label) txt.textContent = label; }
  if (spin) spin.style.display = busy ? '' : 'none';
}

// ── Cambiar fase ──────────────────────────────────────────────
const _PHASES = ['pre','login','register','forgot','check-email','loading'];
function _go(phase, msg = '') {
  _phase = phase;
  _PHASES.forEach(p => {
    const el = _id('ls-' + p);
    if (el) el.style.display = p === phase ? '' : 'none';
  });
  if (phase === 'loading') {
    const lm = _id('ls-loading-msg');
    if (lm) lm.textContent = msg || 'Cargando…';
  }
}

// ── Configurar fase "check-email" ─────────────────────────────
function _showCheckEmail(mode, email) {
  _pendingMode  = mode;
  _pendingEmail = email;

  const title   = _id('ce-title');
  const body    = _id('ce-body');
  const ceEmail = _id('ce-email');
  const va      = _id('ce-verify-actions');
  const ra      = _id('ce-reset-actions');

  if (ceEmail) ceEmail.textContent = email;

  if (mode === 'verify') {
    if (title) title.textContent = 'Verifica tu correo';
    if (body)  body.innerHTML = `Te enviamos un correo de verificación a <strong id="ce-email" class="ls-email-hl">${email}</strong>. Ábrelo y haz clic en el enlace para activar tu cuenta.`;
    if (va) va.style.display = '';
    if (ra) ra.style.display = 'none';
    _startResendCooldown(60);
  } else {
    if (title) title.textContent = 'Revisa tu correo';
    if (body)  body.innerHTML = `Te enviamos un enlace para restablecer tu contraseña a <strong id="ce-email" class="ls-email-hl">${email}</strong>. El enlace es válido durante 1 hora.`;
    if (va) va.style.display = 'none';
    if (ra) ra.style.display = '';
  }

  _go('check-email');
}

// ── Cooldown para no spamear verificación ─────────────────────
function _startResendCooldown(secs) {
  _resendSecs = secs;
  const btn = _id('ce-resend');
  const cd  = _id('ce-resend-cd');
  if (btn) btn.style.display = 'none';
  if (cd)  { cd.style.display = ''; cd.textContent = `Reenviar en ${secs}s`; }
  clearInterval(_resendTimer);
  _resendTimer = setInterval(() => {
    _resendSecs--;
    if (_resendSecs <= 0) {
      clearInterval(_resendTimer);
      if (btn) btn.style.display = '';
      if (cd)  cd.style.display  = 'none';
    } else {
      if (cd) cd.textContent = `Reenviar en ${_resendSecs}s`;
    }
  }, 1000);
}

// ── Toast ─────────────────────────────────────────────────────
function _toast(msg, color = 'var(--ac)') {
  if (window.Toast?.show) { window.Toast.show(msg); return; }
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
    background:rgba(20,20,38,.97);color:#fff;
    padding:10px 18px;border-radius:10px;font-size:.82rem;
    z-index:99999;pointer-events:none;
    border:1px solid ${color};box-shadow:0 4px 20px rgba(0,0,0,.4);
    max-width:calc(100vw - 40px);text-align:center;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ══════════════════════════════════════════════════════════════
// HANDLERS
// ══════════════════════════════════════════════════════════════

async function _doLogin() {
  _clearErr('li');
  const email = _id('li-email')?.value.trim();
  const pass  = _id('li-pass')?.value;

  if (!email) { _setErr('li', 'Ingresa tu correo electrónico.'); _id('li-email')?.focus(); return; }
  if (!pass)  { _setErr('li', 'Ingresa tu contraseña.');          _id('li-pass')?.focus();  return; }

  _setBusy('li', true, 'Iniciando sesión…');

  const res = await Auth.login(email, pass);

  _setBusy('li', false, 'Entrar');

  if (res.ok) {
    if (res.needsVerification) {
      _showCheckEmail('verify', email);
      return;
    }
    _go('loading', '¡Bienvenido! Cargando tu espacio…');
    return;
  }

  _setErr('li', res.message);
  // Resaltar campo con error
  if (res.code?.includes('email')) _id('li-email')?.classList.add('ls-error-border');
  if (res.code?.includes('password') || res.code?.includes('credential'))
    _id('li-pass')?.classList.add('ls-error-border');

  setTimeout(() => {
    _id('li-email')?.classList.remove('ls-error-border');
    _id('li-pass')?.classList.remove('ls-error-border');
  }, 2500);
}

async function _doRegister() {
  _clearErr('reg');
  const name  = _id('reg-name')?.value.trim()  || '';
  const email = _id('reg-email')?.value.trim()  || '';
  const pass  = _id('reg-pass')?.value          || '';
  const pass2 = _id('reg-pass2')?.value         || '';

  if (!email)         { _setErr('reg', 'Ingresa tu correo electrónico.'); return; }
  if (!pass)          { _setErr('reg', 'Ingresa una contraseña.');         return; }
  if (pass.length < 6){ _setErr('reg', 'La contraseña debe tener al menos 6 caracteres.'); return; }
  if (pass !== pass2) { _setErr('reg', 'Las contraseñas no coinciden. Verifica el segundo campo.'); return; }

  _setBusy('reg', true, 'Creando cuenta…');

  const res = await Auth.register(email, pass, name);

  _setBusy('reg', false, 'Crear cuenta');

  if (res.ok) {
    _showCheckEmail('verify', email);
    return;
  }

  _setErr('reg', res.message);
}

async function _doForgot() {
  _clearErr('fgt');
  const email = _id('fgt-email')?.value.trim() || '';

  if (!email) { _setErr('fgt', 'Ingresa tu correo electrónico.'); return; }

  _setBusy('fgt', true, 'Enviando…');

  const res = await Auth.sendPasswordReset(email);

  _setBusy('fgt', false, 'Enviar enlace');

  // Siempre mostrar "check email" aunque el email no exista
  // (por seguridad: no revelar si un correo está registrado)
  _showCheckEmail('reset', email);
}

async function _doCheckVerified() {
  const btn = _id('ce-done');
  if (btn) btn.disabled = true;

  const res = await Auth.reloadUser();

  if (btn) btn.disabled = false;

  if (res.verified) {
    _go('loading', '¡Cuenta verificada! Cargando tu espacio…');
    return;
  }
  _toast('Aún no detectamos la verificación. Revisa tu correo y haz clic en el enlace.', '#ffd040');
}

async function _doResend() {
  const res = await Auth.resendVerification();
  if (res.ok && !res.alreadyVerified) {
    _toast('Correo reenviado. Revisa tu bandeja de entrada (y el spam).', 'var(--ac)');
    _startResendCooldown(60);
  } else if (res.alreadyVerified) {
    _toast('Tu correo ya está verificado. Recarga la página.', '#7eff8a');
  } else {
    _toast(res.message || 'No se pudo reenviar. Espera un momento.', '#ff6b6b');
  }
}

async function _doResendReset() {
  const res = await Auth.sendPasswordReset(_pendingEmail);
  if (res.ok) {
    _toast('Enlace reenviado. Revisa tu correo (y el spam).', 'var(--ac)');
  } else {
    _toast(res.message || 'No se pudo reenviar.', '#ff6b6b');
  }
}

// ── API pública ───────────────────────────────────────────────
const LoginScreen = {
  show() {
    _mount();
    const el = _id('ls-root');
    if (el) { el.style.display = 'flex'; _go('pre'); }
  },
  hide() {
    const el = _id('ls-root');
    if (!el) return;
    el.style.transition = 'opacity .3s ease, transform .3s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'scale(1.02)';
    setTimeout(() => {
      el.style.display   = 'none';
      el.style.opacity   = '';
      el.style.transform = '';
    }, 300);
  }
};

window.LoginScreen = LoginScreen;
export default LoginScreen;
