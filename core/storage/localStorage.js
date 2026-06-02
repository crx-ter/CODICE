// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/storage/localStorage.js
// LocalStorage Adapter: Implementación de StorageAdapter para localStorage del navegador
// ═════════════════════════════════════════════════════════════════════════════

class LocalStorageAdapter {
  constructor(prefix = 'codice_') {
    this.prefix = prefix;
    this.listeners = {};
  }

  /**
   * Obtener valor de localStorage
   */
  async get(key) {
    try {
      const fullKey = this.prefix + key;
      const value = localStorage.getItem(fullKey);
      
      if (value === null) return null;
      
      // Intentar parsear como JSON
      try {
        return JSON.parse(value);
      } catch {
        // Si no es JSON válido, retornar como string
        return value;
      }
    } catch (error) {
      console.error(`[LocalStorage] Error al obtener ${key}:`, error);
      return null;
    }
  }

  /**
   * Guardar valor en localStorage
   */
  async set(key, value) {
    try {
      const fullKey = this.prefix + key;
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      // Verificar límite de localStorage (típicamente 5-10MB)
      if (this._willExceedQuota(serialized)) {
        console.warn(`[LocalStorage] Cuota casi llena para ${key}`);
      }
      
      localStorage.setItem(fullKey, serialized);
      this._notifyListeners(key, value);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('[LocalStorage] Cuota excedida');
      } else {
        console.error(`[LocalStorage] Error al guardar ${key}:`, error);
      }
      return false;
    }
  }

  /**
   * Eliminar valor de localStorage
   */
  async remove(key) {
    try {
      const fullKey = this.prefix + key;
      localStorage.removeItem(fullKey);
      this._notifyListeners(key, null);
      return true;
    } catch (error) {
      console.error(`[LocalStorage] Error al eliminar ${key}:`, error);
      return false;
    }
  }

  /**
   * Listar todas las claves
   */
  async keys() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(this.prefix)) {
          const key = fullKey.substring(this.prefix.length);
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('[LocalStorage] Error al listar claves:', error);
      return [];
    }
  }

  /**
   * Limpiar todo localStorage con nuestro prefijo
   */
  async clear() {
    try {
      const keys = await this.keys();
      for (const key of keys) {
        await this.remove(key);
      }
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error al limpiar:', error);
      return false;
    }
  }

  /**
   * Obtener tamaño aproximado del almacenamiento usado
   */
  async getSize() {
    try {
      let size = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(this.prefix)) {
          const value = localStorage.getItem(fullKey);
          size += (fullKey + value).length;
        }
      }
      return size;
    } catch (error) {
      console.error('[LocalStorage] Error al calcular tamaño:', error);
      return 0;
    }
  }

  /**
   * Verificar si existe una clave
   */
  async has(key) {
    try {
      const fullKey = this.prefix + key;
      return localStorage.getItem(fullKey) !== null;
    } catch (error) {
      console.error(`[LocalStorage] Error al verificar ${key}:`, error);
      return false;
    }
  }

  /**
   * Suscribirse a cambios
   */
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
    
    // Retornar función para desuscribirse
    return () => {
      const index = this.listeners[key].indexOf(callback);
      if (index > -1) {
        this.listeners[key].splice(index, 1);
      }
    };
  }

  /**
   * Notificar listeners de cambios
   */
  _notifyListeners(key, value) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error(`[LocalStorage] Error en listener para ${key}:`, error);
        }
      });
    }
  }

  /**
   * Verificar si se excedería la cuota
   */
  _willExceedQuota(newData) {
    try {
      const test = '__ls_quota_test__';
      const currentSize = localStorage.length * 50; // Estimación
      return currentSize + newData.length > 5 * 1024 * 1024; // 5MB limit
    } catch {
      return false;
    }
  }

  /**
   * Obtener toda la data como objeto
   */
  async getAll() {
    try {
      const keys = await this.keys();
      const result = {};
      
      for (const key of keys) {
        result[key] = await this.get(key);
      }
      
      return result;
    } catch (error) {
      console.error('[LocalStorage] Error al obtener todo:', error);
      return {};
    }
  }

  /**
   * Guardar múltiples valores atomicamente (lo más posible)
   */
  async setMany(items) {
    try {
      for (const [key, value] of Object.entries(items)) {
        await this.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('[LocalStorage] Error al guardar múltiples:', error);
      return false;
    }
  }

  /**
   * Limpiar valores antiguos basado en timestamp
   */
  async cleanupOld(maxAgeMs) {
    try {
      const keys = await this.keys();
      const now = Date.now();
      let removed = 0;

      for (const key of keys) {
        if (key.endsWith('_timestamp')) {
          const timestamp = await this.get(key);
          if (now - timestamp > maxAgeMs) {
            const dataKey = key.replace('_timestamp', '');
            await this.remove(dataKey);
            await this.remove(key);
            removed++;
          }
        }
      }

      return removed;
    } catch (error) {
      console.error('[LocalStorage] Error en cleanup:', error);
      return 0;
    }
  }

  /**
   * Diagnosticar estado del almacenamiento
   */
  async diagnose() {
    try {
      const keys = await this.keys();
      const size = await this.getSize();
      
      return {
        available: true,
        keyCount: keys.length,
        estimatedSize: size,
        estimatedSizeMB: (size / (1024 * 1024)).toFixed(2),
        quota: '5-10MB',
        prefix: this.prefix,
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
      };
    }
  }
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LocalStorageAdapter };
}
