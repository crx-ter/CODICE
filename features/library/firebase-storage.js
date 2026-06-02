// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE — features/library/firebase-storage.js
// Subida/listado/borrado de archivos en Firebase Storage.
// Mantiene la misma API que el sistema de objectURL existente en index.html,
// por lo que handleLibUpload / delFile solo necesitan llamar aquí en lugar de
// URL.createObjectURL().
// ═════════════════════════════════════════════════════════════════════════════

import { _stor } from '../../services/firebase.js';

import {
  ref,
  uploadBytesResumable,
  getDownloadURL   as fbGetDownloadURL,
  deleteObject,
  listAll,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ── Tipos permitidos ────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function _uid() {
  return window.__codiceUser?.uid ?? null;
}

function _storePath(filename) {
  const uid = _uid();
  if (!uid) throw new Error('Usuario no autenticado');
  return `users/${uid}/library/${filename}`;
}

/** Sanitizar nombre: sin caracteres raros que rompen el path de Storage */
function _safeName(name) {
  return name.replace(/[#%?&+]/g, '_');
}

// ── API pública ──────────────────────────────────────────────────────────────

/**
 * Subir un archivo a Firebase Storage.
 *
 * @param {File}     file
 * @param {Function} [onProgress]  – callback(percent: 0-100)
 * @returns {Promise<{ id:string, url:string, name:string, type:string, size:number, storagePath:string }>}
 */
async function uploadFile(file, onProgress = null) {
  if (!_uid()) throw new Error('[FBStorage] Sin usuario autenticado');
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`[FBStorage] Tipo no permitido: ${file.type}`);
  }

  const safeName   = _safeName(file.name);
  const timestamp  = Date.now();
  // Prefijo con timestamp para evitar colisiones y poder ordenar por fecha
  const storagePath = _storePath(`${timestamp}_${safeName}`);
  const storageRef  = ref(_stor, storagePath);

  const metadata = {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: String(timestamp),
    },
  };

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata);

    task.on('state_changed',
      (snap) => {
        if (typeof onProgress === 'function') {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await fbGetDownloadURL(task.snapshot.ref);
          resolve({
            id:          `fb_${timestamp}`,
            url,
            name:        file.name,
            type:        file.type,
            size:        file.size,
            storagePath,
            uploadedAt:  timestamp,
          });
        } catch (e) { reject(e); }
      }
    );
  });
}

/**
 * Obtener URL de descarga de un archivo ya subido.
 * @param {string} storagePath
 * @returns {Promise<string>}
 */
async function getDownloadURL(storagePath) {
  const storageRef = ref(_stor, storagePath);
  return fbGetDownloadURL(storageRef);
}

/**
 * Listar todos los archivos del usuario en Storage.
 * @returns {Promise<Array<{ storagePath:string, name:string }>>}
 */
async function listFiles() {
  if (!_uid()) return [];
  const folderRef = ref(_stor, `users/${_uid()}/library`);
  try {
    const result = await listAll(folderRef);
    return result.items.map(item => ({
      storagePath: item.fullPath,
      name: item.name,
    }));
  } catch (e) {
    console.warn('[FBStorage] listFiles falló:', e.message);
    return [];
  }
}

/**
 * Eliminar un archivo de Storage.
 * @param {string} storagePath
 */
async function deleteFile(storagePath) {
  if (!storagePath) return;
  try {
    const storageRef = ref(_stor, storagePath);
    await deleteObject(storageRef);
  } catch (e) {
    // Si ya no existe (404), ignorar silenciosamente
    if (e.code !== 'storage/object-not-found') {
      console.warn('[FBStorage] deleteFile falló:', e.message);
    }
  }
}

export default { uploadFile, getDownloadURL, listFiles, deleteFile };
