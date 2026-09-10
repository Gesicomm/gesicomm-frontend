import API from './api';

/**
 * Cliente de la API privada del Page Builder (/api/page-builder).
 *
 * ⚠️ No confundir con el embudo legacy de producto sobre `landings`.
 * Ese flujo de creación fue retirado; acá los funnels son secuencias de
 * páginas de código.
 *
 * Hoy el módulo es exclusivo del administrador (el backend lo corta con
 * soloAdministrador). Cuando se libere a los usuarios no hay que tocar
 * nada de este archivo.
 *
 * Los errores vienen con { message, errores? }: `errores` es el array de
 * motivos que devuelve el sanitizador cuando el código no se puede
 * guardar. El interceptor de api.js ya maneja el 401/refresh.
 */
export const pageBuilderService = {

  // ─── Proyectos ──────────────────────────────────────────────────────
  listarProyectos: (params = {}) =>
    API.get('/page-builder/proyectos', { params }).then(r => r.data),

  crearProyecto: (datos) =>
    API.post('/page-builder/proyectos', datos).then(r => r.data),

  obtenerProyecto: (id) =>
    API.get(`/page-builder/proyectos/${id}`).then(r => r.data),

  actualizarProyecto: (id, datos) =>
    API.put(`/page-builder/proyectos/${id}`, datos).then(r => r.data),

  eliminarProyecto: (id) =>
    API.delete(`/page-builder/proyectos/${id}`).then(r => r.data),

  // ─── Páginas sueltas y funnels de un proyecto ───────────────────────
  crearPagina: (proyectoId, datos) =>
    API.post(`/page-builder/proyectos/${proyectoId}/paginas`, datos).then(r => r.data),

  crearFunnel: (proyectoId, datos) =>
    API.post(`/page-builder/proyectos/${proyectoId}/funnels`, datos).then(r => r.data),

  // ─── Funnels ────────────────────────────────────────────────────────
  obtenerFunnel: (id) =>
    API.get(`/page-builder/funnels/${id}`).then(r => r.data),

  actualizarFunnel: (id, datos) =>
    API.put(`/page-builder/funnels/${id}`, datos).then(r => r.data),

  eliminarFunnel: (id) =>
    API.delete(`/page-builder/funnels/${id}`).then(r => r.data),

  agregarPaginaAFunnel: (funnelId, datos) =>
    API.post(`/page-builder/funnels/${funnelId}/pages`, datos).then(r => r.data),

  adjuntarPaginaAFunnel: (funnelId, pageId) =>
    API.post(`/page-builder/funnels/${funnelId}/pages/${pageId}`).then(r => r.data),

  quitarPaginaDeFunnel: (funnelId, pageId) =>
    API.delete(`/page-builder/funnels/${funnelId}/pages/${pageId}`).then(r => r.data),

  /** orden = array COMPLETO de ids, no deltas: es idempotente. */
  reordenarFunnel: (funnelId, orden) =>
    API.put(`/page-builder/funnels/${funnelId}/pages/order`, { orden }).then(r => r.data),

  definirEntrada: (funnelId, paginaId) =>
    API.put(`/page-builder/funnels/${funnelId}/entry`, { pagina_id: paginaId }).then(r => r.data),

  publicarFunnel: (funnelId) =>
    API.post(`/page-builder/funnels/${funnelId}/publish`).then(r => r.data),

  despublicarFunnel: (funnelId) =>
    API.post(`/page-builder/funnels/${funnelId}/unpublish`).then(r => r.data),

  // ─── Páginas ────────────────────────────────────────────────────────
  /** Devuelve la página + el código de su BORRADOR. */
  obtenerPagina: (id) =>
    API.get(`/page-builder/paginas/${id}`).then(r => r.data),

  actualizarPagina: (id, datos) =>
    API.put(`/page-builder/paginas/${id}`, datos).then(r => r.data),

  eliminarPagina: (id) =>
    API.delete(`/page-builder/paginas/${id}`).then(r => r.data),

  /** Reparte un documento HTML pegado en las tres pestañas. NO guarda. */
  importarHtml: (id, documento) =>
    API.post(`/page-builder/paginas/${id}/importar`, { documento }).then(r => r.data),

  /**
   * GUARDAR. Crea una versión nueva en estado draft y NO publica.
   * Devuelve el código ya sanitizado: puede venir recortado, así que el
   * editor tiene que reemplazar su borrador con esto.
   */
  guardar: (id, codigo) =>
    API.post(`/page-builder/paginas/${id}/versions`, codigo).then(r => r.data),

  /**
   * Preview EN VIVO: resuelve los tokens de navegación ({{siguiente}},
   * {{cta}}, ...) contra código que todavía no se guardó. NO persiste
   * nada. Sin esto, el iframe del editor mostraría el token crudo como
   * href y un clic navegaría a esa URL literal.
   */
  previsualizar: (id, codigo) =>
    API.post(`/page-builder/paginas/${id}/preview`, codigo).then(r => r.data),

  listarVersiones: (id) =>
    API.get(`/page-builder/paginas/${id}/versions`).then(r => r.data),

  obtenerVersion: (id, versionId) =>
    API.get(`/page-builder/paginas/${id}/versions/${versionId}`).then(r => r.data),

  restaurarVersion: (id, versionId) =>
    API.post(`/page-builder/paginas/${id}/versions/${versionId}/restore`).then(r => r.data),

  /** Lo único que cambia lo que ve el visitante. */
  publicar: (id, versionId = null) =>
    API.post(`/page-builder/paginas/${id}/publish`,
      versionId ? { version_id: versionId } : {}).then(r => r.data),

  despublicar: (id) =>
    API.post(`/page-builder/paginas/${id}/unpublish`).then(r => r.data),

  // ─── Hostnames ──────────────────────────────────────────────────────
  listarHostnames: (params = {}) =>
    API.get('/page-builder/hostnames', { params }).then(r => r.data),

  crearSubdominio: (datos) =>
    API.post('/page-builder/hostnames/subdominio', datos).then(r => r.data),

  crearDominioPropio: (datos) =>
    API.post('/page-builder/hostnames/dominio-propio', datos).then(r => r.data),

  verificarHostname: (id) =>
    API.post(`/page-builder/hostnames/${id}/verificar`).then(r => r.data),

  habilitarHostname: (id, habilitado) =>
    API.patch(`/page-builder/hostnames/${id}/habilitado`, { habilitado }).then(r => r.data),

  definirHostnamePrincipal: (id) =>
    API.put(`/page-builder/hostnames/${id}/principal`).then(r => r.data),

  eliminarHostname: (id) =>
    API.delete(`/page-builder/hostnames/${id}`).then(r => r.data),
};

/** El texto de error que conviene mostrarle al usuario. */
export function mensajeDeError(err, porDefecto = 'Ocurrió un error.') {
  const data = err?.response?.data;
  if (data?.errores?.length) return data.errores.join(' ');
  return data?.message || porDefecto;
}

export default pageBuilderService;
