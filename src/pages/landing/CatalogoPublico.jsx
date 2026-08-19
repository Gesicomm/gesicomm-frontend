import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerLandingPublica } from '../../services/landingPublicaService';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { mapPublicDtoToTemplateData } from '../landing-simple/mapLandingToTemplateData';
import { getMediaUrl } from '../../services/api';
import { Store, Loader, ImageOff } from 'lucide-react';
import { hexToRgba, resolverTemaPorSlug } from '../landing-simple/templates/themeUtils';
import { RedesSocialesFooter } from '../landing-simple/templates/sections';

const fmtPrecio = (num) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(num || 0);

const OPCIONES_ORDEN = [
  { id: 'destacados', label: 'Destacados' },
  { id: 'az', label: 'Alfabéticamente, A-Z' },
  { id: 'za', label: 'Alfabéticamente, Z-A' },
  { id: 'min-max', label: 'Precio, menor a mayor' },
  { id: 'max-min', label: 'Precio, mayor a menor' },
];

/**
 * Catálogo completo de la landing (todos los items seleccionados en el
 * panel "Productos" del editor, no solo los destacados del home). Barra de
 * filtros horizontal y compacta (ordenar/disponibilidad/etiqueta + precio),
 * en vez de un sidebar pesado — mismo criterio que una vidriera de
 * e-commerce estándar (grilla al frente, filtros livianos arriba).
 */
export default function CatalogoPublico() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [estadoCarga, setEstadoCarga] = useState('cargando');
  const [data, setData] = useState(null);

  const [filtroOrden, setFiltroOrden] = useState('destacados');
  const [filtroPrecioMin, setFiltroPrecioMin] = useState('');
  const [filtroPrecioMax, setFiltroPrecioMax] = useState('');
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todas');

  useEffect(() => {
    let activo = true;
    obtenerLandingPublica(slug)
      .then((res) => {
        if (!activo) return;
        if (res === null) return setEstadoCarga('no-encontrada');
        if (!res.disponible) return setEstadoCarga('no-disponible');
        setData(res);
        setEstadoCarga('ok');
      })
      .catch(() => {
        if (activo) setEstadoCarga('no-encontrada');
      });
    return () => { activo = false; };
  }, [slug]);

  useDocumentSeo(data ? `Catálogo - ${data.titulo || data.tienda?.nombre}` : 'Catálogo', data?.seo_descripcion || '');

  if (estadoCarga === 'cargando') return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader className="animate-spin text-white/50" /></div>;
  if (estadoCarga === 'no-encontrada') return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Tienda no encontrada.</div>;
  if (estadoCarga === 'no-disponible') return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Esta tienda no está disponible actualmente.</div>;

  const datosTemplate = mapPublicDtoToTemplateData(data);
  const { nombreComercio, logo, contacto, tema: temaData } = datosTemplate;
  // `productos_titulo` (panel "Productos" del editor) es el título de la
  // sección "Productos destacados" del home — en esta página de catálogo
  // completo se usa solo si el comercio lo personalizó explícitamente,
  // nunca el default genérico de esa sección ("Productos destacados"), que
  // no tiene sentido como título de esta página.
  // Título propio de esta página (catalogo_titulo); si no lo personalizaron,
  // se cae al genérico — NUNCA a productos_titulo, que es el de la sección
  // "Productos destacados" del home (son dos páginas distintas).
  const tituloCatalogo = data?.catalogo_titulo || 'Catálogo de Productos';
  const tema = resolverTemaPorSlug(temaData, data?.template?.slug);
  const bordeSuave = hexToRgba(tema.texto, 0.1);

  // A propósito NO es `data.items` (esa es solo la selección con
  // mostrar_en_inicio para "Productos destacados" del home) — `catalogo_items`
  // trae TODOS los items que el comercio agregó a esta landing, sin importar
  // ese flag, para que pueda tener productos que solo aparezcan acá.
  const productos = (data?.catalogo_items || []).map(i => ({
    id: i.content_id,
    nombre: i.nombre,
    precio: i.precio,
    precioAntes: i.precio_antes,
    imagen: i.imagen ? getMediaUrl(i.imagen) : null,
    categoria: i.categoria || null,
    etiqueta: i.etiqueta || null,
    stock: i.stock,
  }));

  const categoriasUnicas = Array.from(new Set(productos.map(p => p.categoria).filter(Boolean))).sort();
  const etiquetasUnicas = Array.from(new Set(productos.map(p => p.etiqueta).filter(Boolean))).sort();

  const filteredAndSortedProducts = productos.filter(p => {
    if (filtroPrecioMin && p.precio < Number(filtroPrecioMin)) return false;
    if (filtroPrecioMax && p.precio > Number(filtroPrecioMax)) return false;
    // Disponibilidad: `stock` es null cuando el producto no rastrea stock
    // (siempre disponible) — solo se filtra cuando el dato existe.
    if (filtroDisponibilidad === 'en_stock' && p.stock != null && p.stock <= 0) return false;
    if (filtroDisponibilidad === 'agotado' && !(p.stock != null && p.stock <= 0)) return false;
    if (filtroCategoria !== 'todas' && p.categoria !== filtroCategoria) return false;
    if (filtroEtiqueta !== 'todas' && p.etiqueta !== filtroEtiqueta) return false;
    return true;
  }).sort((a, b) => {
    if (filtroOrden === 'az') return a.nombre.localeCompare(b.nombre);
    if (filtroOrden === 'za') return b.nombre.localeCompare(a.nombre);
    if (filtroOrden === 'min-max') return a.precio - b.precio;
    if (filtroOrden === 'max-min') return b.precio - a.precio;
    return 0; // destacados (default)
  });

  const hayFiltrosActivos = filtroPrecioMin || filtroPrecioMax || filtroDisponibilidad !== 'todos' || filtroCategoria !== 'todas' || filtroEtiqueta !== 'todas';
  function limpiarFiltros() {
    setFiltroPrecioMin('');
    setFiltroPrecioMax('');
    setFiltroDisponibilidad('todos');
    setFiltroCategoria('todas');
    setFiltroEtiqueta('todas');
  }

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const linkInicio = isLocalFallback && slug ? `/l/${slug}` : '/';
  const linkContacto = isLocalFallback && slug ? `/l/${slug}/contacto` : '/contacto';
  const linkProducto = (productoId) => (isLocalFallback && slug ? `/l/${slug}/${productoId}` : `/${productoId}`);

  const inputClase = 'bg-transparent px-3 py-2 rounded-lg text-sm font-medium outline-none transition-colors';

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: tema.fondo, color: tema.texto }}>
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur z-20" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.fondo, 0.95) }}>
        <a href={linkInicio} className="flex items-center gap-2 transition-opacity hover:opacity-80">
          {logo ? (
            <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
          ) : (
            <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: tema.acento }}><Store size={18} style={{ color: tema.fondo }} /></div>
          )}
          <span className="font-bold tracking-tight text-lg">{nombreComercio}</span>
        </a>
        <nav className="flex gap-4">
          <a href={linkContacto} className="font-semibold text-sm hover:opacity-80 transition-opacity">Contacto</a>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{tituloCatalogo}</h1>
          {data?.catalogo_descripcion && (
            <p className="mt-2 max-w-2xl text-sm" style={{ color: hexToRgba(tema.texto, 0.6) }}>{data.catalogo_descripcion}</p>
          )}
        </div>

        {/* Barra de filtros horizontal — compacta, sin sidebar ni drawer móvil. */}
        <div className="flex flex-wrap items-center gap-3 pb-5 mb-6" style={{ borderBottom: `1px solid ${bordeSuave}` }}>
          <select
            value={filtroOrden}
            onChange={e => setFiltroOrden(e.target.value)}
            className={inputClase}
            style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
          >
            {OPCIONES_ORDEN.map(o => <option key={o.id} value={o.id} style={{ color: '#000' }}>{o.label}</option>)}
          </select>

          <select
            value={filtroDisponibilidad}
            onChange={e => setFiltroDisponibilidad(e.target.value)}
            className={inputClase}
            style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
          >
            <option value="todos" style={{ color: '#000' }}>Disponibilidad: todas</option>
            <option value="en_stock" style={{ color: '#000' }}>En stock</option>
            <option value="agotado" style={{ color: '#000' }}>Agotado</option>
          </select>

          {categoriasUnicas.length > 0 && (
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className={inputClase}
              style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
            >
              <option value="todas" style={{ color: '#000' }}>Categoría: todas</option>
              {categoriasUnicas.map(cat => <option key={cat} value={cat} style={{ color: '#000' }}>{cat}</option>)}
            </select>
          )}

          {etiquetasUnicas.length > 0 && (
            <select
              value={filtroEtiqueta}
              onChange={e => setFiltroEtiqueta(e.target.value)}
              className={inputClase}
              style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
            >
              <option value="todas" style={{ color: '#000' }}>Etiqueta: todas</option>
              {etiquetasUnicas.map(etq => <option key={etq} value={etq} style={{ color: '#000' }}>{etq}</option>)}
            </select>
          )}

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Precio mín"
              value={filtroPrecioMin}
              onChange={e => setFiltroPrecioMin(e.target.value)}
              className={`${inputClase} w-28`}
              style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
            />
            <span style={{ color: hexToRgba(tema.texto, 0.4) }}>–</span>
            <input
              type="number"
              placeholder="Precio máx"
              value={filtroPrecioMax}
              onChange={e => setFiltroPrecioMax(e.target.value)}
              className={`${inputClase} w-28`}
              style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
            />
          </div>

          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="text-xs font-semibold underline underline-offset-2 hover:opacity-70" style={{ color: hexToRgba(tema.texto, 0.6) }}>
              Limpiar filtros
            </button>
          )}

          <span className="ml-auto text-sm" style={{ color: hexToRgba(tema.texto, 0.5) }}>
            {filteredAndSortedProducts.length} producto{filteredAndSortedProducts.length === 1 ? '' : 's'}
          </span>
        </div>

        {filteredAndSortedProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center rounded-2xl" style={{ border: `1px dashed ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.02) }}>
             <ImageOff size={40} className="opacity-20 mb-4" />
             <h3 className="text-lg font-bold mb-2">No se encontraron productos</h3>
             <p className="opacity-60 max-w-sm text-sm">Intenta ajustar los filtros para ver más resultados.</p>
             {hayFiltrosActivos && (
               <button onClick={limpiarFiltros} className="mt-6 px-6 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: tema.fondo }}>Limpiar filtros</button>
             )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredAndSortedProducts.map((p) => {
              const agotado = p.stock != null && p.stock <= 0;
              const enOferta = p.precioAntes > p.precio;
              return (
                <div key={p.id} onClick={() => navigate(linkProducto(p.id))} className="rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-opacity hover:opacity-90" style={{ backgroundColor: tema.fondo, border: `1px solid ${bordeSuave}` }}>
                  <div className="aspect-square relative flex items-center justify-center" style={{ backgroundColor: hexToRgba(tema.texto, 0.05) }}>
                    {p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" /> : <ImageOff size={28} style={{ color: hexToRgba(tema.texto, 0.2) }} />}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                      {agotado && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: tema.texto, color: tema.fondo }}>Agotado</span>
                      )}
                      {enOferta && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: tema.acento, color: tema.fondo }}>Oferta</span>
                      )}
                      {p.etiqueta && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: hexToRgba(tema.texto, 0.85), color: tema.fondo }}>{p.etiqueta}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm leading-tight mb-1 truncate">{p.nombre}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold">{fmtPrecio(p.precio)}</span>
                      {enOferta && (
                        <span className="text-xs line-through opacity-50">{fmtPrecio(p.precioAntes)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Mismo pie que el home (BasicTemplate.jsx y hermanos): primero las
          redes sociales, y el copyright al final de TODO — consistente en
          las 3 páginas (inicio/catálogo/contacto). */}
      {contacto && (
        <RedesSocialesFooter contacto={contacto} acento={tema.acento} bordeSuave={bordeSuave} isMobile={false} />
      )}
      <footer className="px-6 py-8 text-center text-xs" style={{ borderTop: `1px solid ${bordeSuave}`, color: hexToRgba(tema.texto, 0.4) }}>
        © {new Date().getFullYear()} {nombreComercio}
      </footer>
    </div>
  );
}
