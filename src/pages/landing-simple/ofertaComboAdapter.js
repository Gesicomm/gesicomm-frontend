// Adaptación del JSON de combos al contrato único de la oferta de producto.
export const CAMPOS_OFERTA_COMBO = { urgencia_kicker: 'rotulo', urgencia_titulo: 'titulo', urgencia_texto: 'texto', urgencia_horas: 'horas', urgencia_minutos: 'minutos', urgencia_segundos: 'segundos' };
export const VISIBILIDAD_OFERTA_COMBO = { oferta_encabezado: 'mostrar_rotulo', oferta_nombre: 'mostrar_nombre', oferta_texto: 'mostrar_texto', oferta_duracion: 'mostrar_contador' };
export function ofertaProductoDesdeCombo(hero) {
  const c = hero.contador || {};
  return {
    datos: { urgencia_kicker: c.rotulo ?? (hero.etiqueta_oferta?.trim() || 'Oferta por tiempo limitado'), urgencia_titulo: c.titulo ?? '', urgencia_texto: c.texto ?? '', urgencia_horas: c.horas ?? 2, urgencia_minutos: c.minutos ?? 45, urgencia_segundos: c.segundos ?? 57 },
    partes: { oferta_encabezado: c.mostrar_rotulo ?? hero.partes?.oferta !== false, oferta_nombre: c.mostrar_nombre !== false, oferta_texto: c.mostrar_texto !== false, oferta_duracion: c.mostrar_contador !== false },
  };
}
