import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, Smartphone, Tablet, Maximize2 } from 'lucide-react';
import { ofertaAFormaPublica, ofertaService } from '../../services/ofertaService';
import { tiendaService } from '../../services/tiendaService';
import CodigoPreview from '../landing-simple/CodigoPreview';
import { codigoFichaProducto } from '../landing-simple/fichaCodigoLanding';
import { datosRuntimePublico } from '../landing-simple/datosRuntime';
import { usePagoparConectado } from '../landing-simple/usePagoparConectado';
import { landingSimpleService } from '../../services/landingSimpleService';
import { BLOQUES_CONTENIDO_PRODUCTO } from './ProductContentBlocks';

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
  onExpand,
  seleccionBloque,
  onSeleccionarBloque,
}) {
  const [ofertas, setOfertas] = useState([]);
  const [tienda, setTienda] = useState(null);
  // La landing de la tienda. Si es de lienzo (HTML), la vista previa usa la
  // MISMA ficha y el mismo runtime que la página publicada, no las
  // plantillas React de las landings rígidas.
  const [landing, setLanding] = useState(null);
  const [cargandoDiseno, setCargandoDiseno] = useState(true);
  const [errorDiseno, setErrorDiseno] = useState(false);
  const [reintentoDiseno, setReintentoDiseno] = useState(0);
  const pagoparConectado = usePagoparConectado();

  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    setCargandoDiseno(true);
    setErrorDiseno(false);
    Promise.all([
      tiendaService.obtener(),
      landingSimpleService.listar().then(lista => lista?.length ? landingSimpleService.obtener(lista[0].id) : null),
    ]).then(([t, l]) => {
      if (!vivo) return;
      setTienda(t || null);
      setLanding(l || null);
    }).catch(() => { if (vivo) setErrorDiseno(true); })
      .finally(() => { if (vivo) setCargandoDiseno(false); });
    return () => { vivo = false; };
  }, [activo, reintentoDiseno]);

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
    // En Productos se está editando la ficha original. Los ajustes ya guardados
    // en la landing no deben tapar el borrador de estos campos en su preview.
    const presentacion = dto.ficha_datos.presentacion || {};
    const camposEditables = ['titulo_comercial', 'resenas_calificacion', 'resenas_texto'];
    const borrador = Object.fromEntries(camposEditables
      .filter(campo => Object.prototype.hasOwnProperty.call(presentacion, campo))
      .map(campo => [campo, campo === 'titulo_comercial' ? (presentacion[campo] || dto.nombre) : presentacion[campo]]));
    if (Object.keys(borrador).length) {
      const clave = `producto:${item.referencia_id}`;
      data.content = { ...data.content, venta: { ...data.content.venta,
        presentacion_productos: { ...data.content.venta?.presentacion_productos,
          [clave]: { ...data.content.venta?.presentacion_productos?.[clave], ...borrador },
        },
      } };
    }
    return {
      codigo: codigoFichaProducto(landing?.content, contentId),
      datos: {
        ...datosRuntimePublico(data, landing?.slug || null, item, { vista: 'producto', pagoparConectado }),
        ...(onSeleccionarBloque ? { editor_bloques: Object.fromEntries(BLOQUES_CONTENIDO_PRODUCTO.flatMap(b => (b.zonas || [b.destino]).map(zona => [zona, b.titulo]))), editor_seleccion: BLOQUES_CONTENIDO_PRODUCTO.find(b => b.id === seleccionBloque?.id)?.destino || null } : {}),
      },
    };
  }, [landing, tienda, dto, producto, productoId, pagoparConectado, onSeleccionarBloque, seleccionBloque?.id]);

  const preview = useMemo(() => (
    <div style={{ height: '100%' }}>
      <CodigoPreview
        codigo={previewLienzo.codigo}
        titulo={dto.nombre}
        datos={previewLienzo.datos}
        typography={landing?.typography?.resolved || tienda?.typography}
        previewDevice={device}
        preservarScroll
        resaltar={onSeleccionarBloque ? { lista: BLOQUES_CONTENIDO_PRODUCTO.find(b => b.id === seleccionBloque?.id)?.destino || 'nombre_comercial', n: seleccionBloque?.n || 0 } : null}
        onBloque={clave => { const bloque = BLOQUES_CONTENIDO_PRODUCTO.find(b => (b.zonas || [b.destino]).includes(clave)); if (bloque) onSeleccionarBloque?.(bloque.id); }}
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    </div>
  ), [device, dto.nombre, previewLienzo, landing?.typography?.resolved, tienda?.typography, seleccionBloque, onSeleccionarBloque]);

  return (
    <section className="product-preview-panel" aria-label="Vista pública del producto">
      <div className="product-preview-toolbar">
        <div>
          <span className="product-preview-kicker">Vista del producto</span>
          <h3>Cómo se verá en la landing</h3>
        </div>
        <div className="product-preview-devices" role="group" aria-label="Resolucion de preview">
          {onExpand && <button type="button" className="product-preview-expand" onClick={onExpand} aria-label="Ampliar" title="Ampliar vista previa" aria-haspopup="dialog"><Maximize2 size={16} aria-hidden="true" /><span>Ampliar</span></button>}
          {DEVICE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={device === id ? 'active' : ''}
              onClick={() => onDeviceChange(id)}
              title={label}
              aria-label={label}
              aria-pressed={device === id}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`product-preview-frame ${device}`}>
        <div className="product-preview-surface">
          {cargandoDiseno ? <div className="product-preview-loading" role="status"><span className="loader" aria-hidden="true" /><strong>Preparando tu vista previa</strong><p>Cargando el diseño y los colores de tu tienda…</p></div>
            : errorDiseno ? <div className="product-preview-loading" role="alert"><strong>No pudimos cargar el diseño de tu tienda</strong><p>Reintentá para ver el producto con sus colores y tipografía.</p><button type="button" className="btn-secondary" onClick={() => setReintentoDiseno(n => n + 1)}>Reintentar vista previa</button></div>
              : activo ? preview : null}
        </div>
      </div>
    </section>
  );
}
