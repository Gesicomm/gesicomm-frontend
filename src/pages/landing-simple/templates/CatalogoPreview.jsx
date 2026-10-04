import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { hexToRgba, resolverTemaPorSlug } from './themeUtils';
import { RedesSocialesFooter } from './sections';
import StoreFooterLegal from '../../landing/StoreFooterLegal';
import StoreHeader from './StoreHeader';
import CatalogoView from './CatalogoView';

/**
 * Adapta un item crudo del catálogo (forma de vitrinaService.catalogo(),
 * ver catalogoPorIdMapeado en LandingSimpleEditor.jsx) a la forma
 * normalizada que espera CatalogoView. Se guarda el item original en
 * `_raw` porque `onClickProducto` (abrir el panel de edición) lo necesita
 * completo, con campos que la forma normalizada no lleva.
 */
function normalizarProducto(p) {
  return {
    id: `${p.tipo}:${p.id}`,
    nombre: p.nombre,
    precio: p.precio_publico ?? p.precio_efectivo ?? p.precio_base ?? null,
    // precio_ancla (de esta landing) manda sobre precio_tachado (del
    // producto global) — mismo criterio que la landing pública.
    precioAntes: p.precio_ancla ?? p.precio_tachado ?? null,
    imagen: p.imagen ? getMediaUrl(p.imagen) : null,
    imagenes: (p.imagenes || []).filter(Boolean).map(getMediaUrl),
    categoria: p.categoria || null,
    etiqueta: p.etiqueta || null,
    stock: p.stock ?? null,
    _raw: p,
  };
}

/**
 * Vista previa (dentro del editor) de la página de Catálogo completo —
 * TODOS los productos que el comercio agregó a esta landing (curados para
 * el home o no, ver mostrar_en_inicio), no solo los destacados. Antes,
 * clickear "Catálogo" en el preview del editor abría la landing PÚBLICA de
 * verdad en una pestaña nueva, sin forma de editar nada desde ahí — esta
 * vista in-editor resuelve eso: clickear un producto acá abre el mismo
 * panel de edición que Productos (panels/ProductoPanel.jsx).
 *
 * Título y descripción son PROPIOS de esta página (catalogo_titulo /
 * catalogo_descripcion), no los de la sección "Productos destacados" del
 * home (productos_titulo) — son dos páginas distintas.
 *
 * El cuerpo (filtros + grilla) es CatalogoView.jsx, el MISMO componente que
 * monta CatalogoPublico.jsx — ver memoria gesicomm-preview-igual-publicada.
 */
export default function CatalogoPreview({
  productos, titulo, descripcion, tema, templateSlug, contacto, nombreComercio, logo, onClickProducto, onClickInicio, onClickCatalogo, onClickContacto, onVolver, isMobile = false,
}) {
  const t = resolverTemaPorSlug(tema, templateSlug);
  const bordeSuave = hexToRgba(t.texto, 0.12);
  const productosNormalizados = productos.map(normalizarProducto);
  const gridClassName = isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="w-full min-h-full" style={{ backgroundColor: t.fondo, color: t.texto }}>
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: t.fondo }}>
        <button type="button" onClick={onVolver} className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70">
          <ArrowLeft size={16} /> Volver a la landing
        </button>
        <span className="text-xs" style={{ color: hexToRgba(t.texto, 0.5) }}>Catálogo completo — clickeá un producto para editarlo</span>
      </div>
      
      <StoreHeader
        templateSlug={templateSlug}
        isMobile={isMobile}
        nombreComercio={nombreComercio}
        logo={logo}
        tema={t}
        cantidadCarrito={0}
        previewMode={true}
        onClickInicio={onClickInicio}
        onClickCatalogo={onClickCatalogo}
        onClickContacto={onClickContacto}
      />

      <CatalogoView
        productos={productosNormalizados}
        titulo={titulo}
        descripcion={descripcion}
        tema={t}
        bordeSuave={bordeSuave}
        onClickProducto={(p) => onClickProducto(p._raw)}
        previewMode={true}
        gridClassName={gridClassName}
      />

      {/* Orden pedido explícitamente: primero las redes sociales, y el
          copyright al final de TODO. Igual en las 3 páginas
          (inicio/catálogo/contacto) y en la landing pública real. */}
      {contacto && (
        <RedesSocialesFooter contacto={contacto} acento={t.acento} bordeSuave={bordeSuave} isMobile={isMobile} />
      )}
      <StoreFooterLegal tema={t} bordeSuave={bordeSuave} nombreComercio={nombreComercio} isPreview={true} />
    </div>
  );
}
