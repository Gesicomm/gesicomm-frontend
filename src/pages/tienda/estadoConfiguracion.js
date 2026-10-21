const texto = value => String(value ?? '').trim();
const telefono = value => /^\+?[\d\s()-]+$/.test(texto(value)) && /^\d{7,15}$/.test(texto(value).replace(/\D/g, ''));
const estado = (completo, detalle) => ({ completo, detalle, texto: completo ? 'Completo' : 'Pendiente' });

// Se evalúan datos guardados; un borrador todavía no completa una sección.
export function estadosConfiguracion(tienda, recursos = {}) {
  const canal = tienda?.canal_contacto || 'whatsapp';
  const contactos = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(tienda?.email || tienda?.email_contacto)),
    whatsapp: /^\d{8,15}$/.test(texto(tienda?.whatsapp)),
    telefono: telefono(tienda?.telefono),
    instagram: /^(?:https?:\/\/(?:www\.)?instagram\.com\/)?@?[a-zA-Z0-9._]{1,30}\/?$/.test(texto(tienda?.instagram)),
  };
  const detalleContacto = canal === 'instagram' ? 'tu usuario o enlace de Instagram' : canal === 'email' ? 'un email válido' : 'un número válido';
  const costos = recursos.costos;
  const costosValidos = costos && ['cpa_porcentaje', 'costo_envio', 'costo_confirmacion', 'costo_empaque']
    .every(campo => costos[campo] != null && texto(costos[campo]) !== '' && Number.isFinite(Number(costos[campo])) && Number(costos[campo]) >= 0);
  const conexiones = recursos.logistica?.connections || (recursos.logistica?.connection ? [recursos.logistica.connection] : []);
  return {
    tienda: estado(Boolean(texto(tienda?.nombre) && texto(tienda?.subdominio) && /^[0-9.\-]{5,20}$/.test(texto(tienda?.documento))), 'Guardá el nombre de tu tienda, su prefijo URL y la cédula del titular.'),
    contacto: estado(Boolean(contactos[canal]), `Guardá ${detalleContacto} para el canal de contacto elegido.`),
    pasarelas: estado(Array.isArray(recursos.pagos) && recursos.pagos.some(m => m.activo), 'Activá al menos un método de pago.'),
    economica: estado(Boolean(costosValidos), 'Configurá y guardá los costos. Los valores en cero también son válidos.'),
    analitica: estado(Boolean(texto(tienda?.meta_pixel_id) || texto(tienda?.google_analytics_id) || texto(tienda?.tiktok_pixel_id)), 'Opcional: guardá un píxel o Google Analytics para medir tus visitas.'),
    raha: estado(recursos.solicitud?.estado === 'aprobada' && conexiones.some(c => c.environment === 'production' && c.activo), 'Completá la solicitud y habilitá tu conexión logística en producción.'),
  };
}
