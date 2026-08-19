import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { obtenerLandingPublica } from '../../services/landingPublicaService';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { mapPublicDtoToTemplateData } from '../landing-simple/mapLandingToTemplateData';
import { Store, Loader, Filter, X, ChevronDown } from 'lucide-react';
import { hexToRgba, resolverTema } from '../landing-simple/templates/themeUtils';
// Remove missing import
// We'll use inline JSX for the product card

// Inline formatting function for prices
const fmtPrecio = (num) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(num || 0);
const DEFAULT_TEMA = { fondo: '#FFFFFF', texto: '#000000', acento: '#000000' };

export default function CatalogoPublico() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [estadoCarga, setEstadoCarga] = useState('cargando');
  const [data, setData] = useState(null);

  // Filters
  const [filtroOrden, setFiltroOrden] = useState('destacados');
  const [filtroPrecioMin, setFiltroPrecioMin] = useState('');
  const [filtroPrecioMax, setFiltroPrecioMax] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todas');
  const [mobileFiltrosAbierto, setMobileFiltrosAbierto] = useState(false);

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
  }, []);

  useDocumentSeo(data ? `Catálogo - ${data.titulo || data.tienda?.nombre}` : 'Catálogo', data?.seo_descripcion || '');

  if (estadoCarga === 'cargando') return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader className="animate-spin text-white/50" /></div>;
  if (estadoCarga === 'no-encontrada') return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Tienda no encontrada.</div>;
  if (estadoCarga === 'no-disponible') return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Esta tienda no está disponible actualmente.</div>;

  const datosTemplate = mapPublicDtoToTemplateData(data);
  const { nombreComercio, logo, tema: temaData } = datosTemplate;
  // `productos_titulo` (panel "Productos" del editor) es el título de la
  // sección "Productos destacados" del home — en esta página de catálogo
  // completo se usa solo si el comercio lo personalizó explícitamente,
  // nunca el default genérico de esa sección ("Productos destacados"), que
  // no tiene sentido como título de esta página.
  const tituloCatalogo = data?.productos_titulo || 'Catálogo de Productos';
  const tema = resolverTema(temaData, DEFAULT_TEMA);
  const bordeSuave = hexToRgba(tema.texto, 0.1);

  // Map products preserving extra raw fields like estado
  const rawProducts = data?.items || [];
  const mappedProducts = rawProducts.map(i => ({
    id: i.content_id,
    nombre: i.nombre,
    precio: i.precio,
    precioAntes: i.precio_antes,
    imagen: i.imagen ? (i.imagen.startsWith('http') ? i.imagen : `https://api.gesicomm.com${i.imagen}`) : null, // A fallback if getMediaUrl is not accessible here
    etiqueta: i.etiqueta || null,
    estado: i.estado || 'nuevo' // fallback
  }));

  // Sin useMemo: un Hook nunca puede ir después de los `return` tempranos
  // de arriba (cambia la cantidad de Hooks entre renders y React tira
  // "Rendered more hooks than during the previous render") — el cálculo es
  // liviano (loop sobre los productos de la landing), no necesita memoizar.
  const etiquetasUnicas = Array.from(new Set(mappedProducts.map(p => p.etiqueta).filter(Boolean))).sort();

  const filteredAndSortedProducts = mappedProducts.filter(p => {
    // Rango de precios
    if (filtroPrecioMin && p.precio < Number(filtroPrecioMin)) return false;
    if (filtroPrecioMax && p.precio > Number(filtroPrecioMax)) return false;
    // Estado
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    // Etiqueta
    if (filtroEtiqueta !== 'todas' && p.etiqueta !== filtroEtiqueta) return false;
    return true;
  }).sort((a, b) => {
    if (filtroOrden === 'az') return a.nombre.localeCompare(b.nombre);
    if (filtroOrden === 'za') return b.nombre.localeCompare(a.nombre);
    if (filtroOrden === 'min-max') return a.precio - b.precio;
    if (filtroOrden === 'max-min') return b.precio - a.precio;
    return 0; // destacados (default)
  });

  const isLocalFallback = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  const linkInicio = isLocalFallback && slug ? `/l/${slug}` : '/';
  const linkContacto = isLocalFallback && slug ? `/l/${slug}/contacto` : '/contacto';

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

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8 pb-20 flex flex-col md:flex-row gap-8">
        
        {/* Filtros Sidebar */}
        <aside className={`md:w-64 shrink-0 fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:static md:bg-transparent md:backdrop-blur-none transition-opacity ${mobileFiltrosAbierto ? 'opacity-100' : 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto'}`}>
          <div className={`absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] p-6 shadow-2xl transition-transform transform md:translate-x-0 md:static md:w-full md:p-0 md:shadow-none ${mobileFiltrosAbierto ? 'translate-x-0' : 'translate-x-full'}`} style={{ backgroundColor: tema.fondo, borderLeft: `1px solid ${bordeSuave}` }}>
            <div className="flex items-center justify-between mb-6 md:hidden">
              <h2 className="font-bold text-xl">Filtros</h2>
              <button onClick={() => setMobileFiltrosAbierto(false)} className="p-2 -mr-2"><X size={20} /></button>
            </div>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold mb-3 text-sm tracking-wider uppercase opacity-60">Ordenar por</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'destacados', label: 'Destacados' },
                    { id: 'az', label: 'Alfabéticamente, A-Z' },
                    { id: 'za', label: 'Alfabéticamente, Z-A' },
                    { id: 'min-max', label: 'Precio, menor a mayor' },
                    { id: 'max-min', label: 'Precio, mayor a menor' }
                  ].map(opt => (
                    <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-4 h-4 rounded-full border flex items-center justify-center transition-colors" style={{ borderColor: filtroOrden === opt.id ? tema.acento : bordeSuave, backgroundColor: filtroOrden === opt.id ? tema.acento : 'transparent' }}>
                        {filtroOrden === opt.id && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tema.fondo }} />}
                      </div>
                      <input type="radio" className="hidden" checked={filtroOrden === opt.id} onChange={() => setFiltroOrden(opt.id)} />
                      <span className="text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-sm tracking-wider uppercase opacity-60">Precio</h3>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Mín" value={filtroPrecioMin} onChange={e => setFiltroPrecioMin(e.target.value)} className="w-full bg-transparent px-3 py-2 rounded-lg text-sm outline-none transition-colors" style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }} />
                  <span>-</span>
                  <input type="number" placeholder="Máx" value={filtroPrecioMax} onChange={e => setFiltroPrecioMax(e.target.value)} className="w-full bg-transparent px-3 py-2 rounded-lg text-sm outline-none transition-colors" style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }} />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-sm tracking-wider uppercase opacity-60">Estado</h3>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full bg-transparent px-3 py-2.5 rounded-lg text-sm font-medium outline-none appearance-none cursor-pointer" style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}>
                  <option value="todos" style={{ color: '#000' }}>Todos los estados</option>
                  <option value="nuevo" style={{ color: '#000' }}>Nuevo</option>
                  <option value="usado" style={{ color: '#000' }}>Usado</option>
                </select>
              </div>

              {etiquetasUnicas.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm tracking-wider uppercase opacity-60">Etiquetas</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFiltroEtiqueta('todas')}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: filtroEtiqueta === 'todas' ? tema.acento : 'transparent',
                        color: filtroEtiqueta === 'todas' ? tema.fondo : tema.texto,
                        border: `1px solid ${filtroEtiqueta === 'todas' ? tema.acento : bordeSuave}`
                      }}
                    >
                      Todas
                    </button>
                    {etiquetasUnicas.map(etq => (
                      <button
                        key={etq}
                        onClick={() => setFiltroEtiqueta(etq)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors uppercase tracking-wider"
                        style={{
                          backgroundColor: filtroEtiqueta === etq ? tema.acento : 'transparent',
                          color: filtroEtiqueta === etq ? tema.fondo : tema.texto,
                          border: `1px solid ${filtroEtiqueta === etq ? tema.acento : bordeSuave}`
                        }}
                      >
                        {etq}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Grilla */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{tituloCatalogo}</h1>
            <button onClick={() => setMobileFiltrosAbierto(true)} className="md:hidden flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ backgroundColor: hexToRgba(tema.texto, 0.05) }}>
              <Filter size={16} /> Filtros
            </button>
          </div>

          {filteredAndSortedProducts.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center rounded-2xl" style={{ border: `1px dashed ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.02) }}>
               <Filter size={48} className="opacity-20 mb-4" />
               <h3 className="text-lg font-bold mb-2">No se encontraron productos</h3>
               <p className="opacity-60 max-w-sm text-sm">Intenta ajustar los filtros o el rango de precios para ver más resultados.</p>
               <button onClick={() => { setFiltroOrden('destacados'); setFiltroPrecioMin(''); setFiltroPrecioMax(''); setFiltroEstado('todos'); }} className="mt-6 px-6 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: tema.fondo }}>Limpiar filtros</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredAndSortedProducts.map((p) => (
                <div key={p.id} onClick={() => window.location.href = `/${p.id}`} className="rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-opacity hover:opacity-90" style={{ backgroundColor: tema.fondo, border: `1px solid ${bordeSuave}` }}>
                  <div className="aspect-square relative" style={{ backgroundColor: hexToRgba(tema.texto, 0.05) }}>
                    {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />}
                    {p.etiqueta && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: tema.acento, color: tema.fondo }}>
                        {p.etiqueta}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm leading-tight mb-1 truncate">{p.nombre}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold">{fmtPrecio(p.precio)}</span>
                      {p.precioAntes > p.precio && (
                        <span className="text-xs line-through opacity-50">{fmtPrecio(p.precioAntes)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
