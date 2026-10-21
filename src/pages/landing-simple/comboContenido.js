// El combo recién creado trae producto_padre/items; el catálogo y la página
// pública traen productos_combo. Ambos deben alimentar los mismos bloques.
export function contenidoCombo(item = {}) {
  const imagenes = (item.imagenes || []).filter(i => typeof i === 'string' || i?.tipo !== 'video').slice()
    .sort((a, b) => Number(!!b?.es_principal) - Number(!!a?.es_principal) || (Number(a?.orden) || 0) - (Number(b?.orden) || 0));
  const portada = imagenes.map(i => typeof i === 'string' ? i : i?.url).find(Boolean);
  const incluidos = item.productos_combo?.length ? item.productos_combo : [
    ...(item.producto_padre ? [{ ...item.producto_padre, cantidad: 1 }] : []),
    ...(item.items || []).map(i => ({ ...i.producto_incluido, cantidad: i.cantidad || 1 })),
  ];
  const productos_combo = incluidos.filter(p => p?.id || p?.nombre).map(p => ({
    ...p, precio: p.precio ?? p.precio_efectivo ?? p.precio_usuario ?? p.precio_base ?? 0,
    imagen: p.imagen || p.imagen_principal || p.imagenes?.[0]?.url || p.imagenes?.[0] || null,
    beneficios: p.beneficios || [], cantidad: Number(p.cantidad) || 1,
  }));
  return { ...item, imagen: portada || item.imagen, imagenes, productos_combo, precio_efectivo: item.precio_efectivo ?? item.precio_usuario ?? item.precio ?? item.precio_total ?? item.precio_base,
    preguntas_frecuentes: item.preguntas_frecuentes ?? item.faq ?? [],
  };
}

export function combinarDetalleCombo(item, detalle) {
  if (!detalle) return contenidoCombo(item);
  detalle = contenidoCombo(detalle);
  const marketing = Object.fromEntries(['descripcion', 'descripcion_larga', 'propuesta_valor', 'beneficios', 'confianza',
    'preguntas_frecuentes', 'faq_titulo', 'ficha_datos'].filter(k => detalle[k] != null).map(k => [k, detalle[k]]));
  const enriquecidos = item.productos_combo || [];
  const componentes = detalle.productos_combo || [];
  const productos_combo = enriquecidos.length ? enriquecidos.map(p => {
    const completo = componentes.find(c => Number(c.id) === Number(p.id)) || {};
    return { ...completo, ...p, precio: p.precio ?? completo.precio,
      imagen: p.imagen || completo.imagen,
      beneficios: p.beneficios?.length ? p.beneficios : completo.beneficios || [],
    };
  }) : componentes;
  return contenidoCombo({ ...item, ...marketing, productos_combo,
    ...(detalle.imagenes.length ? { imagenes: detalle.imagenes, imagen: detalle.imagen } : {}),
  });
}

export function productosSeccionCombo(productos, config = {}) {
  return (productos || []).map(p => ({ ...p, ...(config.productos || []).find(v => String(v.id) === String(p.id)) }));
}

export function textosBeneficiosCombo(beneficios, quitarVacios = true) {
  const valores = (Array.isArray(beneficios) ? beneficios : []).map(b => typeof b === 'string' ? b :
    [b?.titulo, b?.texto].filter(Boolean).join(' · '));
  return quitarVacios ? valores.map(v => v.trim()).filter(Boolean) : valores;
}

export function beneficiosVisiblesCombo(producto) {
  return textosBeneficiosCombo(producto.beneficios, false).filter((v, i) => v.trim() && producto.beneficios_visibles?.[i] !== false);
}
