import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { ofertaAFormaPublica, ofertaService } from '../../services/ofertaService';
import { tiendaService } from '../../services/tiendaService';
import CodigoPreview from '../landing-simple/CodigoPreview';
import { codigoFichaProducto } from '../landing-simple/fichaCodigoLanding';
import { datosRuntimePublico } from '../landing-simple/datosRuntime';
import { usePagoparConectado } from '../landing-simple/usePagoparConectado';
import { landingSimpleService } from '../../services/landingSimpleService';

const DEVICE_OPTIONS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

function imagenesOrdenadas(imagenes = [], imagenesNuevas = []) {
  return [
    ...[...imagenes].sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    ...imagenesNuevas,
  ].filter(img => img?.url);
}

function variantesPreview(variantes = [], precioBase = 0, imagenes = []) {
  return variantes
    // Con Opciones, la fila no trae `nombre` tipeado — se deriva de
    // `valores` (mismo criterio que el backend). Las combinaciones
    // destildadas ("incluida: false") no se guardan, tampoco se previsualizan.
    .filter(v => v?.incluida !== false)
    .map(v => ({ ...v, nombre: v.nombre || (v.valores || []).map(x => x.valor).join(' / ') }))
    .filter(v => v.nombre)
    .map((v, idx) => {
      const diferencial = Number(v.precio_diferencial) || 0;
      const id = v.id || `preview-${idx}`;
      return {
        id,
        nombre: v.nombre,
        sku_variante: v.sku_variante || '',
        stock: v.stock_salon != null || v.stock_deposito != null
          ? (Number(v.stock_salon) || 0) + (Number(v.stock_deposito) || 0)
          : Number(v.stock) || 0,
        precio_diferencial: diferencial,
        precio_efectivo: Math.max(0, Number(precioBase) + diferencial),
        valoresOpcion: v.valores || [],
        imagenes: v.id
          ? (imagenes || []).filter(img => img.variante_id === v.id)
          : [],
      };
    });
}

export default function ProductLandingPreview({
  productoId,
  activo = true,
  producto,
  categoriaNombre,
  imagenes,
  imagenesNuevas,
  variantes,
  opciones,
  tieneVariantes,
  faq,
  precioFinal,
  precioAncla,
  device,
  onDeviceChange,
}) {
  const [ofertas, setOfertas] = useState([]);
  const [tienda, setTienda] = useState(null);
  // La landing de la tienda. Si es de lienzo (HTML), la vista previa usa la
  // MISMA ficha y el mismo runtime que la página publicada, no las
  // plantillas React de las landings rígidas.
  const [landing, setLanding] = useState(null);
  const pagoparConectado = usePagoparConectado();

  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    landingSimpleService.listar()
      .then(lista => (lista?.length ? landingSimpleService.obtener(lista[0].id) : null))
      .then(l => { if (vivo) setLanding(l || null); })
      .catch(() => { if (vivo) setLanding(null); });
    return () => { vivo = false; };
  }, [activo]);

  useEffect(() => {
    let vivo = true;
    tiendaService.obtener()
      .then(t => { if (vivo) setTienda(t || null); })
      .catch(() => { if (vivo) setTienda(null); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!activo || !productoId) {
      setOfertas([]);
      return undefined;
    }
    let vivo = true;
    ofertaService.listarPorProducto(productoId, { soloActivas: true })
      .then(data => {
        if (!vivo) return;
        const lista = Array.isArray(data) ? data : [];
        setOfertas(lista.map(o => ofertaAFormaPublica(o, productoId)));
      })
      .catch(() => {
        if (vivo) setOfertas([]);
      });
    return () => { vivo = false; };
  }, [productoId, activo]);

  const dto = useMemo(() => {
    const precio = Number(precioFinal) || null;
    return {
      id: productoId || 'preview',
      content_id: productoId || 'preview',
      nombre: producto?.nombre || 'Producto sin nombre',
      categoria: categoriaNombre || null,
      descripcion: producto?.descripcion_corta || producto?.descripcion_larga || '',
      descripcion_larga: producto?.descripcion_larga || producto?.descripcion_corta || '',
      precio,
      precio_antes: Number(precioAncla) > Number(precio) ? Number(precioAncla) : null,
      imagenes: imagenesOrdenadas(imagenes, imagenesNuevas),
      ofertas,
      variantes: tieneVariantes ? variantesPreview(variantes, precio || 0, imagenesOrdenadas(imagenes, imagenesNuevas)) : [],
      opciones: tieneVariantes
        ? (opciones || [])
          .map(o => ({ nombre: (o.nombre || '').trim(), orden: o.orden || 0, valores: (o.valores || []).map(v => (v.valor || '').trim()).filter(Boolean) }))
          .filter(o => o.nombre && o.valores.length > 0)
        : [],
      faq: Array.isArray(faq) ? faq : [],
      faq_titulo: producto?.faq_titulo || '',
      propuesta_valor: producto?.propuesta_valor || '',
      sobre_este_producto: producto?.ficha_rubro === 'basico' ? (producto?.sobre_este_producto || '') : '',
      beneficios: Array.isArray(producto?.beneficios) ? producto.beneficios : [],
      confianza: Array.isArray(producto?.confianza) ? producto.confianza : [],
      ficha_datos: producto?.ficha_datos || {},
    };
  }, [
    productoId,
    producto,
    categoriaNombre,
    imagenes,
    imagenesNuevas,
    ofertas,
    tieneVariantes,
    variantes,
    opciones,
    faq,
    precioFinal,
    precioAncla,
  ]);

  const previewLienzo = useMemo(() => {
    const contentId = producto?.slug || (productoId ? `producto-${productoId}` : 'preview');
    // Mismo formato que un item de /api/l: así pasa por itemPublicoARuntime
    // igual que en la tienda publicada.
    const item = {
      content_id: contentId,
      referencia_id: productoId || 0,
      tipo: 'producto',
      nombre: dto.nombre,
      descripcion: producto?.descripcion_corta || '',
      descripcion_larga: producto?.descripcion_larga || '',
      propuesta_valor: dto.propuesta_valor,
      sobre_este_producto: producto?.sobre_este_producto || '',
      precio: dto.precio,
      precio_antes: dto.precio_antes,
      imagen: dto.imagenes[0]?.url || null,
      imagenes: dto.imagenes,
      categoria: dto.categoria,
      stock: Number(producto?.cantidad_disponible) || null,
      variantes: dto.variantes,
      ofertas: dto.ofertas,
      beneficios: dto.beneficios,
      confianza: dto.confianza,
      preguntas: dto.faq,
      ficha_datos: dto.ficha_datos,
    };
    const data = {
      ...(landing || {}),
      content: landing?.content || {},
      template: landing?.template || { kind: 'codigo', slug: 'lienzo-blanco', name: 'Lienzo en blanco' },
      catalogo_items: [item],
      tienda: { nombre: tienda?.nombre || '', logo_imagen: tienda?.logo_imagen || null, colores: tienda ? { primario: tienda.color_primario || null, secundario: tienda.color_secundario || null, fondo: tienda.color_fondo || null } : undefined },
      // Mismo bloque que arma /api/l (landing.service → contacto). Sin él el
      // runtime no recibía ni el número ni las plantillas de Mi Tienda y el
      // botón de WhatsApp de la vista previa mandaba el texto fijo "Hola, me
      // interesa {producto}" en vez del mensaje configurado.
      contacto: {
        whatsapp: landing?.mostrar_whatsapp === false ? null : (tienda?.whatsapp || null),
        telefono: tienda?.telefono || null,
        mensaje: tienda?.mensaje_contacto || '',
        mensaje_general: tienda?.mensaje_consulta_general || '',
        incluir_precio: !!landing?.whatsapp_incluir_precio,
        incluir_url: !!landing?.whatsapp_incluir_url,
      },
    };
    return {
      codigo: codigoFichaProducto(landing?.content, contentId),
      datos: datosRuntimePublico(data, landing?.slug || null, item, { vista: 'producto', pagoparConectado }),
    };
  }, [landing, tienda, dto, producto, productoId, pagoparConectado]);

  const preview = useMemo(() => (
    <div style={{ height: 'min(78vh, 900px)' }}>
      <CodigoPreview
        codigo={previewLienzo.codigo}
        titulo={dto.nombre}
        datos={previewLienzo.datos}
        previewDevice={device}
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    </div>
  ), [device, dto.nombre, previewLienzo]);

  return (
    <section className="product-preview-panel" aria-label="Vista pública del producto">
      <div className="product-preview-toolbar">
        <div>
          <span className="product-preview-kicker">Vista del producto</span>
          <h3>Cómo se verá en la landing</h3>
        </div>
        <div className="product-preview-devices" role="group" aria-label="Resolucion de preview">
          {DEVICE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={device === id ? 'active' : ''}
              onClick={() => onDeviceChange(id)}
              title={label}
              aria-label={label}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`product-preview-frame ${device}`}>
        <div className="product-preview-surface">
          {preview}
        </div>
      </div>
    </section>
  );
}
