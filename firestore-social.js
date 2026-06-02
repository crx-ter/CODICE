/* ══════════════════════════════════════════════════════════════════
   CÓDICE — Social con Firestore Real
   Reemplaza las funciones de amigos/mensajes que usaban localStorage.

   USO: Añadir <script src="firestore-social.js"></script>
        ANTES de codice-patch-v2.js en index.html.

   Funciones que sobreescribe (ya declaradas en index.html):
     addFriend()        → busca en public_profiles y crea friendship real
     removeFriend()     → borra el doc de amistad en Firestore
     renderFriendsList()→ lee de Firestore, no localStorage
     sendMessage()      → escribe en /messages en Firestore
     renderMessages()   → escucha /messages en tiempo real
══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Esperar Firebase ── */
  function _ready(fn) {
    const check = () => {
      if (window.FIREBASE_DB && window.doc && window.__codiceUser?.uid) {
        fn();
      } else {
        setTimeout(check, 150);
      }
    };
    check();
  }

  /* ── Helpers Firestore ── */
  function db()  { return window.FIREBASE_DB; }
  function uid() { return window.__codiceUser?.uid || null; }

  // Genera un ID de amistad determinístico (siempre uid menor primero)
  function _friendshipId(uid_a, uid_b) {
    return [uid_a, uid_b].sort().join('_');
  }

  // Escapa HTML para prevenir XSS
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Obtener perfil público de un usuario por su Códice-ID ──
  async function _findUserByCodiceId(codiceId) {
    try {
      const { collection, query, where, getDocs } = await _firestoreHelpers();
      const q = query(
        collection(db(), 'public_profiles'),
        where('codiceId', '==', codiceId)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { uid: snap.docs[0].id, ...snap.docs[0].data() };
    } catch(e) {
      console.warn('[Social] findUser error:', e);
      return null;
    }
  }

  // Obtener helpers de Firestore desde globales del index
  async function _firestoreHelpers() {
    // El index.html expone estos via import de firebase SDK
    const w = window;
    return {
      collection: w.collection || (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).collection,
      query:      w.query      || (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).query,
      where:      w.where      || (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).where,
      getDocs:    w.getDocs    || (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).getDocs,
      doc:        w.doc,
      setDoc:     w.setDoc,
      getDoc:     w.getDoc,
      deleteDoc:  w.deleteDoc  || (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).deleteDoc,
      addDoc:     w.addDoc     || (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).addDoc,
      orderBy:    w.orderBy    || (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).orderBy,
      limit:      w.limit      || (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).limit,
      onSnapshot: w.onSnapshot,
      serverTimestamp: w.serverTimestamp,
    };
  }

  // Cancelador del listener de mensajes
  let _msgUnsub = null;

  /* ══════════════════════════════════════════
     AMIGOS
  ══════════════════════════════════════════ */

  // Renderizar lista de amigos desde Firestore
  async function renderFriendsList() {
    const me = uid();
    if (!me) return;
    const list = document.getElementById('friends-list');
    const sel  = document.getElementById('msg-friend-select');
    if (!list) return;

    list.innerHTML = '<div style="font-size:.75rem;color:var(--t2);padding:8px">Cargando…</div>';

    try {
      const { collection, query, where, getDocs } = await _firestoreHelpers();
      const q1 = query(collection(db(), 'friends'), where('uid_a', '==', me), where('status', '==', 'accepted'));
      const q2 = query(collection(db(), 'friends'), where('uid_b', '==', me), where('status', '==', 'accepted'));
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      const friends = [];
      snap1.forEach(d => { const data = d.data(); friends.push({ fid: d.id, uid: data.uid_b, name: data.name_b || 'Usuario', codiceId: data.codiceId_b || '' }); });
      snap2.forEach(d => { const data = d.data(); friends.push({ fid: d.id, uid: data.uid_a, name: data.name_a || 'Usuario', codiceId: data.codiceId_a || '' }); });

      if (!friends.length) {
        list.innerHTML = '<div style="font-size:.78rem;color:var(--t2);text-align:center;padding:14px;background:var(--s1);border-radius:var(--r);border:1px dashed var(--b1)">Aún no tienes amigos agregados 🫂</div>';
        if (sel) sel.innerHTML = '<option value="">— Selecciona amigo —</option>';
        return;
      }

      list.innerHTML = friends.map(f => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r)">
          <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--ac),var(--purple));display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:700;color:#fff;flex-shrink:0">${esc(f.name).charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:.82rem;font-weight:600;color:var(--t0)">${esc(f.name)}</div>
            <div style="font-size:.68rem;color:var(--t2)">${esc(f.codiceId)}</div>
          </div>
          <button class="btn btn-ghost" style="font-size:.68rem;padding:3px 8px" onclick="removeFriend('${esc(f.fid)}')">✕</button>
        </div>
      `).join('');

      if (sel) {
        sel.innerHTML = '<option value="">— Selecciona amigo —</option>' +
          friends.map(f => `<option value="${esc(f.uid)}">${esc(f.name)}</option>`).join('');
        const sendArea = document.getElementById('send-msg-area');
        if (sendArea) sendArea.style.display = '';
      }
    } catch(e) {
      list.innerHTML = '<div style="font-size:.75rem;color:var(--t2);padding:8px">Error cargando amigos</div>';
      console.warn('[Social] renderFriends error:', e);
    }
  }

  // Buscar y agregar amigo real por Códice-ID
  async function addFriend() {
    const inp  = document.getElementById('friend-add-input');
    const me   = uid();
    if (!inp || !me) return;
    const val  = inp.value.trim();
    if (!val) { window.Toast?.error('Escribe un ID de Códice'); return; }

    // Obtener mi propio Códice-ID del perfil público
    const { doc, getDoc, setDoc } = await _firestoreHelpers();
    const myProfile = await getDoc(doc(db(), 'public_profiles', me)).catch(() => null);
    const myData    = myProfile?.data() || {};
    const myId      = myData.codiceId || window._getCodiceId?.(me) || ('C-' + me.slice(0,6));

    if (val === myId) { window.Toast?.error('¡Ese eres tú mismo!'); return; }

    // Buscar al usuario en public_profiles
    window.Toast?.info?.('Buscando usuario…');
    const targetUser = await _findUserByCodiceId(val);

    if (!targetUser) {
      window.Toast?.error('Usuario no encontrado. Asegúrate que haya iniciado sesión en Códice al menos una vez.');
      return;
    }

    const fid = _friendshipId(me, targetUser.uid);
    const fRef = doc(db(), 'friends', fid);
    const existing = await getDoc(fRef).catch(() => null);

    if (existing?.exists()) {
      const status = existing.data().status;
      window.Toast?.error(status === 'accepted' ? 'Ya son amigos' : 'Ya enviaste una solicitud');
      return;
    }

    // Crear friendship
    const [uid_a, uid_b] = [me, targetUser.uid].sort();
    await setDoc(fRef, {
      uid_a, uid_b,
      name_a:      uid_a === me ? (myData.name || 'Yo')            : (targetUser.displayName || val),
      name_b:      uid_b === me ? (myData.name || 'Yo')            : (targetUser.displayName || val),
      codiceId_a:  uid_a === me ? myId                              : val,
      codiceId_b:  uid_b === me ? myId                              : val,
      status:      'accepted', // simplificado: aceptación directa (sin pending)
      createdAt:   Date.now(),
    });

    inp.value = '';
    renderFriendsList();
    window.SoundFX?.play('success');
    window.Toast?.success(`${targetUser.displayName || val} agregado como amigo 👥`);
  }

  // Eliminar amistad
  async function removeFriend(friendshipId) {
    const me = uid();
    if (!me || !friendshipId) return;
    try {
      const { doc, deleteDoc } = await _firestoreHelpers();
      await deleteDoc(doc(db(), 'friends', friendshipId));
      renderFriendsList();
      window.SoundFX?.play('closePop');
    } catch(e) {
      window.Toast?.error('Error al eliminar amigo');
      console.warn('[Social] removeFriend error:', e);
    }
  }

  /* ══════════════════════════════════════════
     MENSAJES DIRECTOS
  ══════════════════════════════════════════ */

  // Escuchar mensajes entrantes en tiempo real
  async function renderMessages() {
    const me = uid();
    const list = document.getElementById('messages-list');
    if (!me || !list) return;

    // Cancelar listener anterior
    if (_msgUnsub) { try { _msgUnsub(); } catch(_) {} }

    list.innerHTML = '<div style="font-size:.75rem;color:var(--t2);padding:8px">Cargando mensajes…</div>';

    try {
      const { collection, query, where, orderBy, limit, onSnapshot } = await _firestoreHelpers();
      const q = query(
        collection(db(), 'messages'),
        where('toUid', '==', me),
        orderBy('ts', 'desc'),
        limit(50)
      );

      _msgUnsub = onSnapshot(q, (snap) => {
        if (!snap.docs.length) {
          list.innerHTML = '<div style="font-size:.78rem;color:var(--t2);text-align:center;padding:14px;background:var(--s1);border-radius:var(--r);border:1px dashed var(--b1)">No tienes mensajes aún ✉️</div>';
          return;
        }
        list.innerHTML = snap.docs.map(d => {
          const m = d.data();
          const date = m.ts ? new Date(m.ts).toLocaleString('es', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
          return `
            <div style="padding:8px 12px;background:var(--s1);border:1px solid var(--b0);border-radius:var(--r)">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:.72rem;font-weight:700;color:var(--ach)">${esc(m.fromName || m.fromUid || '?')}</span>
                <span style="font-size:.65rem;color:var(--t2)">${esc(date)}</span>
              </div>
              <div style="font-size:.78rem;color:var(--t0)">${esc(m.text)}</div>
            </div>
          `;
        }).join('');
      }, (e) => {
        console.warn('[Social] messages snapshot error:', e);
      });
    } catch(e) {
      list.innerHTML = '<div style="font-size:.75rem;color:var(--t2);padding:8px">Error cargando mensajes</div>';
      console.warn('[Social] renderMessages error:', e);
    }
  }

  // Enviar mensaje real a Firestore
  async function sendMessage() {
    const friendSel = document.getElementById('msg-friend-select');
    const textInp   = document.getElementById('msg-text-input');
    const me        = uid();
    if (!friendSel || !textInp || !me) return;

    const toUid = friendSel.value;
    const text  = textInp.value.trim();
    if (!toUid) { window.Toast?.error('Selecciona un amigo'); return; }
    if (!text)  { window.Toast?.error('Escribe un mensaje');  return; }
    if (text.length > 1000) { window.Toast?.error('Mensaje muy largo (máx 1000 caracteres)'); return; }

    try {
      const { collection, addDoc } = await _firestoreHelpers();
      const myProfile = window.__codiceUser || {};
      await addDoc(collection(db(), 'messages'), {
        toUid,
        fromUid:  me,
        fromName: myProfile.displayName || myProfile.email || 'Alguien',
        text,
        ts:       Date.now(),
        read:     false,
      });
      textInp.value = '';
      window.SoundFX?.play('success');
      window.Toast?.success('Mensaje enviado ✉️');
    } catch(e) {
      window.Toast?.error('Error al enviar mensaje');
      console.warn('[Social] sendMessage error:', e);
    }
  }

  /* ══════════════════════════════════════════
     PERFIL PÚBLICO — auto-publicar al login
     Para que otros puedan encontrarte por Códice-ID
  ══════════════════════════════════════════ */
  async function publishPublicProfile() {
    const me = uid();
    if (!me) return;
    try {
      const { doc, setDoc } = await _firestoreHelpers();
      const user    = window.__codiceUser || {};
      const codiceId = window._getCodiceId?.(me) || ('C-' + me.slice(0,6));
      await setDoc(doc(db(), 'public_profiles', me), {
        codiceId,
        displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
        photoURL:    user.photoURL    || null,
        updatedAt:   Date.now(),
      }, { merge: true });
    } catch(e) {
      console.warn('[Social] publishProfile error:', e);
    }
  }

  /* ── Instalar globalmente cuando Firebase esté listo ── */
  _ready(() => {
    window.addFriend        = addFriend;
    window.removeFriend     = removeFriend;
    window.renderFriendsList= renderFriendsList;
    window.sendMessage      = sendMessage;
    window.renderMessages   = renderMessages;

    // Publicar perfil público automáticamente
    publishPublicProfile();

    console.log('[Social] ✅ Funciones sociales con Firestore instaladas');
  });

})();
