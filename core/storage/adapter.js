// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/storage/adapter.js
// Storage Interface: Adaptador abstracto para diferentes backends de almacenamiento
// ═════════════════════════════════════════════════════════════════════════════

/**
 * StorageAdapter
 * Interface abstracta para operaciones de almacenamiento
 * Soporta: localStorage, IndexedDB, cloud sync
 */
class StorageAdapter {
  constructor(name = 'codice') {
    this.name = name;
  }

  /**
   * Obtener un valor del almacenamiento
   * @param {string} key - Clave del ítem
   * @returns {Promise<any>} Valor almacenado o null
   */
  async get(key) {
    throw new Error('get() no implementado en StorageAdapter');
  }

  /**
   * Guardar un valor en el almacenamiento
   * @param {string} key - Clave del ítem
   * @param {any} value - Valor a almacenar
   * @returns {Promise<boolean>} true si la operación fue exitosa
   */
  async set(key, value) {
    throw new Error('set() no implementado en StorageAdapter');
  }

  /**
   * Eliminar un valor del almacenamiento
   * @param {string} key - Clave del ítem
   * @returns {Promise<boolean>} true si la operación fue exitosa
   */
  async remove(key) {
    throw new Error('remove() no implementado en StorageAdapter');
  }

  /**
   * Listar todas las claves del almacenamiento
   * @returns {Promise<string[]>} Array de claves
   */
  async keys() {
    throw new Error('keys() no implementado en StorageAdapter');
  }

  /**
   * Limpiar todo el almacenamiento
   * @returns {Promise<boolean>} true si la operación fue exitosa
   */
  async clear() {
    throw new Error('clear() no implementado en StorageAdapter');
  }

  /**
   * Obtener el tamaño del almacenamiento usado
   * @returns {Promise<number>} Bytes usados
   */
  async getSize() {
    throw new Error('getSize() no implementado en StorageAdapter');
  }

  /**
   * Verificar si una clave existe
   * @param {string} key - Clave del ítem
   * @returns {Promise<boolean>} true si existe
   */
  async has(key) {
    const value = await this.get(key);
    return value !== null && value !== undefined;
  }

  /**
   * Obtener múltiples valores
   * @param {string[]} keys - Array de claves
   * @returns {Promise<Object>} Objeto con pares clave-valor
   */
  async getMany(keys) {
    const results = {};
    for (const key of keys) {
      results[key] = await this.get(key);
    }
    return results;
  }

  /**
   * Guardar múltiples valores
   * @param {Object} items - Objeto con pares clave-valor
   * @returns {Promise<boolean>} true si la operación fue exitosa
   */
  async setMany(items) {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value);
    }
    return true;
  }

  /**
   * Eliminar múltiples valores
   * @param {string[]} keys - Array de claves
   * @returns {Promise<boolean>} true si la operación fue exitosa
   */
  async removeMany(keys) {
    for (const key of keys) {
      await this.remove(key);
    }
    return true;
  }

  /**
   * Incrementar un valor numérico
   * @param {string} key - Clave del ítem
   * @param {number} increment - Cantidad a incrementar (default: 1)
   * @returns {Promise<number>} Nuevo valor
   */
  async increment(key, increment = 1) {
    const current = (await this.get(key)) || 0;
    const newValue = current + increment;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Obtener y eliminar un valor (pop)
   * @param {string} key - Clave del ítem
   * @returns {Promise<any>} Valor que fue eliminado
   */
  async pop(key) {
    const value = await this.get(key);
    if (value !== null && value !== undefined) {
      await this.remove(key);
    }
    return value;
  }

  /**
   * Esperar a que una condición sea verdadera
   * @param {string} key - Clave del ítem
   * @param {Function} condition - Función que evalúa el valor
   * @param {number} timeout - Timeout en ms (default: 5000)
   * @returns {Promise<any>} El valor cuando la condición es true
   */
  async waitFor(key, condition, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const value = await this.get(key);
      if (condition(value)) {
        return value;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout esperando por ${key}`);
  }

  /**
   * Actualizar un valor sin reemplazarlo completamente
   * @param {string} key - Clave del ítem
   * @param {Function} updater - Función que recibe el valor actual y retorna el nuevo
   * @returns {Promise<any>} El nuevo valor
   */
  async update(key, updater) {
    const current = await this.get(key);
    const newValue = updater(current);
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Obtener estadísticas del almacenamiento
   * @returns {Promise<Object>} Información de uso
   */
  async stats() {
    const keys = await this.keys();
    const size = await this.getSize();
    
    return {
      keyCount: keys.length,
      byteSize: size,
      keySizeAvg: keys.length > 0 ? size / keys.length : 0,
      keys: keys,
    };
  }

  /**
   * Exportar todo el almacenamiento como JSON
   * @returns {Promise<string>} JSON string del almacenamiento completo
   */
  async export() {
    const keys = await this.keys();
    const data = {};
    
    for (const key of keys) {
      data[key] = await this.get(key);
    }
    
    return JSON.stringify(data);
  }

  /**
   * Importar datos desde JSON
   * @param {string} jsonData - JSON string a importar
   * @param {boolean} merge - Si true, mezcla con datos existentes; si false, reemplaza
   * @returns {Promise<boolean>} true si la operación fue exitosa
   */
  async import(jsonData, merge = false) {
    const data = JSON.parse(jsonData);
    
    if (!merge) {
      await this.clear();
    }
    
    return this.setMany(data);
  }
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageAdapter };
}
