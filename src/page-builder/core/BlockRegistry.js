/**
 * Registro central de todos los tipos de bloque disponibles en el Page Builder.
 * Open/Closed: agregar un bloque = registrar. No modificar este archivo.
 */
const _registry = new Map();

export const BlockRegistry = {
  register(definition) {
    if (!definition.type) throw new Error('BlockDefinition must have a type');
    _registry.set(definition.type, definition);
    return BlockRegistry; // chainable
  },
  resolve(type) {
    return _registry.get(type) || null;
  },
  getAll() {
    return Array.from(_registry.values());
  },
  getAllByCategory(category) {
    return this.getAll().filter(d => d.category === category);
  },
  migrate(sectionData) {
    const def = this.resolve(sectionData.tipo);
    if (!def) return sectionData;
    
    let currentVersion = sectionData.schema_version || 1;
    const targetVersion = def.schemaVersion || 1;
    let data = { ...sectionData };
    
    // Si ya está en la versión objetivo, no hacemos nada
    if (currentVersion >= targetVersion) return data;
    
    // Correr migraciones iterativamente (ej: de 1 a 2, de 2 a 3)
    while (currentVersion < targetVersion && def.migrations && def.migrations[currentVersion]) {
       data = def.migrations[currentVersion](data);
       currentVersion++;
       data.schema_version = currentVersion;
    }
    
    return data;
  }
};
