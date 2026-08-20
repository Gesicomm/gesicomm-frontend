import React, { useMemo, useState } from 'react';
import { ExternalLink, Monitor, Smartphone, Search, MessageCircle, Layers, ImageOff, Plus, Check, Heart } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { calcularEstiloLanding } from '../../lib/landingDiseno';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import { RenderProvider } from '../../page-builder/core/RenderContext';
import { PageRenderer } from '../../page-builder/core/PageRenderer';
import { FooterAdapter } from '../../page-builder/blocks/legacyBlocks';
import FooterCanvas from '../../page-builder/blocks/footer-builder/FooterCanvas';
import PreviewFrame from './PreviewFrame';
import './landingPublica.css';

function precioItem(item) {
  return item.precio ?? item.precio_efectivo ?? item.precio_total ?? item.precio_base ?? 0;
}

function normalizarItem(item, idx) {
  const tipo = item.tipo || (item.precio_total !== undefined ? 'combo' : 'producto');
  return {
    ...item,
    tipo,
    content_id: item.content_id || item.slug || `${tipo}-${item.id || idx}`,
    precio: precioItem(item),
    imagen: item.imagen || item.imagen_principal || item.imagenes?.[0] || null,
    imagenes: item.imagenes || (item.imagen ? [item.imagen] : []),
    destacado: !!item.destacado,
  };
}


import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

function SectionWrapper({ id, name, selected, style, children, onSelect, onReorder, onDelete, interactive }) {
  return (
    <div
      className={`relative group transition-all duration-200 cursor-pointer ${selected ? 'ring-2 ring-[var(--vit-accent)] z-20' : 'hover:ring-2 hover:ring-[var(--vit-accent-soft)] hover:z-10'}`}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSelect) onSelect(id);
      }}
    >
      {/* Etiqueta de hover (solo cuando no está seleccionado) */}
      {!selected && (
        <div className="absolute top-0 left-0 bg-[var(--vit-accent-soft)] text-[var(--vit-accent)] font-medium text-[11px] px-2 py-0.5 rounded-br opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
          {name}
        </div>
      )}

      {/* Toolbar contextual (solo cuando está seleccionado) */}
      {selected && (
        <div 
          className="absolute -top-7 left-0 bg-[var(--vit-accent)] text-white text-[12px] font-medium flex items-center rounded-t shadow-sm z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-r border-white/20 pointer-events-none">{name}</div>
          <button 
            type="button"
            className="p-1.5 hover:bg-white/20 transition-colors"
            title="Mover arriba"
            onClick={(e) => {
              e.stopPropagation();
              if (onReorder) onReorder(id, -1);
            }}
          >
            <ArrowUp size={14} />
          </button>
          <button 
            type="button"
            className="p-1.5 hover:bg-white/20 transition-colors"
            title="Mover abajo"
            onClick={(e) => {
              e.stopPropagation();
              if (onReorder) onReorder(id, 1);
            }}
          >
            <ArrowDown size={14} />
          </button>
          <button 
            type="button"
            className="p-1.5 hover:bg-red-500 transition-colors rounded-tr"
            title="Eliminar sección"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* El resto de las secciones son de solo lectura acá (se editan desde
          el panel derecho) así que bloquean el mouse para que un click
          adentro solo seleccione la sección. El footer, cuando está
          seleccionado, muestra el canvas libre (FooterCanvas/BuilderElement
          con react-rnd) y necesita recibir clicks/drag reales — si no,
          nunca se puede arrastrar ni tocar sus elementos. */}
      <div className={interactive ? '' : 'pointer-events-none'}>
        {children}
      </div>
    </div>
  );
}

export default function LandingPreview({
  titulo, descripcion, filtros, items, tema, diseno, contacto, banner, urlPublica,
  secciones, mostrarTestimonios, testimonios, mostrarFaq, faqs,
  seccionSeleccionadaId, onSelectSeccion, viewportMode,
  onReorderSeccion, onDeleteSeccion,
  // Clic directo sobre un producto real en la preview (secciones
  // "Productos"/"Destacados") → editar SU diseño propio. Sin esto, las
  // tarjetas de producto quedan inertes acá (pointer-events-none del
  // SectionWrapper, ver más abajo) — mismo motivo por el que antes no
  // hacían nada al clickearlas en el editor.
  onEditarProducto,
  // "Visualizar checkout" del inspector de Detalle de Producto — ver
  // ProductDetailBlock.jsx.
  previewCheckoutAbierto,
  onTogglePreviewCheckout,
}) {


  const itemsPreview = useMemo(() => (items || []).map(normalizarItem), [items]);
  const noop = () => {};
  const categorias = useMemo(() => [...new Set(itemsPreview.map(i => i.categoria).filter(Boolean))], [itemsPreview]);
  const marcas = useMemo(() => [...new Set(itemsPreview.map(i => i.marca).filter(Boolean))], [itemsPreview]);
  const etiquetas = useMemo(() => {
    const mapa = new Map();
    itemsPreview.forEach(i => {
      if (!i.etiqueta) return;
      i.etiqueta.split(',').map(s => s.trim()).filter(Boolean).forEach(tag => {
        const clave = tag.toLowerCase();
        if (!mapa.has(clave)) mapa.set(clave, tag);
      });
    });
    return Array.from(mapa.values());
  }, [itemsPreview]);

  const categoriaImagen = useMemo(() => {
    const mapa = new Map();
    itemsPreview.forEach(i => {
      if (i.categoria && i.imagen && !mapa.has(i.categoria)) mapa.set(i.categoria, i.imagen);
    });
    return mapa;
  }, [itemsPreview]);



  const itemsDestacados = useMemo(() => itemsPreview.filter(i => i.destacado), [itemsPreview]);
  const testimoniosVisibles = mostrarTestimonios ? (testimonios || []).filter(t => t.nombre?.trim() || t.comentario?.trim()) : [];
  const faqsVisibles = mostrarFaq ? (faqs || []).filter(f => f.pregunta?.trim() || f.respuesta?.trim()) : [];
  const hayFiltros = filtros.categoria || filtros.marca || filtros.etiqueta || filtros.buscador || filtros.orden_precio;
  const ratingPromedio = testimoniosVisibles.length
    ? testimoniosVisibles.reduce((s, t) => s + (Number(t.calificacion) || 5), 0) / testimoniosVisibles.length
    : 0;
  const bannerLinkEsExterno = banner?.boton_link && /^https?:\/\//i.test(banner.boton_link);
  const seccionesOrdenadas = useMemo(() => (
    Array.isArray(secciones) && secciones.length
      ? secciones.map((s, idx) => ({ ...s, orden: s.orden ?? idx }))
      : [
        'header', 'hero', 'beneficios', 'categorias', 'destacados',
        'banner', 'productos', 'testimonios', 'faq', 'footer',
      ].map((tipo, idx) => ({ tipo, activo: true, orden: idx }))
  ), [secciones]);
  const ordenSeccion = useMemo(() => {
    const mapa = new Map();
    seccionesOrdenadas.forEach((s, idx) => mapa.set(s.tipo, idx));
    return mapa;
  }, [seccionesOrdenadas]);
  const visibleSeccion = useMemo(() => {
    const mapa = new Map();
    seccionesOrdenadas.forEach(s => mapa.set(s.tipo, s.activo !== false));
    return (tipo) => mapa.get(tipo) !== false;
  }, [seccionesOrdenadas]);

  function orden(tipo) {
    return ordenSeccion.has(tipo) ? ordenSeccion.get(tipo) : 99;
  }

  function contenido(tipo) {
    return seccionesOrdenadas.find(s => s.tipo === tipo)?.contenido || {};
  }

  const renderContextValue = useMemo(() => {
    // Provide a mock item if we are in product view but no item is selected
    const mockItem = itemsPreview?.[0] || {
      id: 'preview',
      tipo: 'producto',
      nombre: 'Producto de prueba',
      precio: 9990,
      imagenes: [],
      descripcion: 'Descripción del producto de prueba',
    };

    return {
      theme: tema,
      page: {
        titulo: titulo,
        contacto,
        slug: '',
        redes: seccionesOrdenadas.find(s => s.tipo === 'header')?.config?.redes_sociales || {},
        secciones: seccionesOrdenadas,
        filtros: filtros,
      },
      data: {
        item: mockItem,
        itemsDestacados: itemsPreview,
        itemsFiltrados: itemsPreview, // En preview mostramos todos o los configurados en la seccion
        categorias: categorias,
        categoriaImagen: categoriaImagen,
        marcas: marcas,
        etiquetas: etiquetas,
        hayFiltroActivo: false,
        conteo: itemsPreview.length
      },
      state: {
        previewCheckoutAbierto,
        wishlist: new Set(),
        agregadoRapido: null,
        busqueda: '',
        filtroCategoria: '',
        filtroMarca: '',
        filtroEtiqueta: '',
        orden: ''
      },
      actions: {
        navigate: (path, item) => {
          if (item && item.id) {
            if (onEditarProducto) {
              onEditarProducto(item.id);
            } else {
              if (item.tipo === 'producto') {
                window.open(`/products/${item.id}/editar`, '_blank');
              } else if (item.tipo === 'combo') {
                window.open(`/combos/${item.id}/editar`, '_blank');
              }
            }
          }
        },
        agregarRapido: () => {},
        toggleWishlist: () => {},
        setBusqueda: () => {},
        setFiltroCategoria: () => {},
        setFiltroMarca: () => {},
        setFiltroEtiqueta: () => {},
        setOrden: () => {},
        limpiarFiltros: () => {},
        seleccionarCategoria: () => {},
        onTogglePreviewCheckout: onTogglePreviewCheckout || noop,
      }
    };
  }, [itemsPreview, contacto, seccionesOrdenadas, tema, previewCheckoutAbierto, onTogglePreviewCheckout]);

  return (
    <>
      <div style={{ width: '100%', height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <RenderProvider context={renderContextValue}>
        <PreviewFrame className="lb-live-preview-iframe" style={{ flex: 1 }}>
          <div
            className={`lp-page lb-live-preview-page ${tema?.modo === 'claro' ? 'claro' : ''}`}
            style={{ ...calcularEstiloLanding({ tema, diseno }), display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
            onClick={() => onSelectSeccion(null)}
          >
            <PageRenderer 
              context={renderContextValue} 
              sectionWrapper={({ section, children, style }) => {
                const selected = seccionSeleccionadaId === section.id;
                return (
                  <SectionWrapper
                    id={section.id || section.tipo}
                    name={section.nombre_interno || section.tipo}
                    style={style}
                    selected={selected}
                    interactive={selected && section.tipo === 'footer'}
                    onSelect={onSelectSeccion}
                    onReorder={onReorderSeccion}
                    onDelete={onDeleteSeccion}
                  >
                    {children}
                  </SectionWrapper>
                );
              }}
            />
          </div>
        </PreviewFrame>
        </RenderProvider>
      </div>
      {!contacto?.whatsapp && (
        <p className="lb-preview-hint">
          Sin WhatsApp configurado no se muestra el boton de contacto. Se configura en Mi tienda.
        </p>
      )}
    </>
  );
}
