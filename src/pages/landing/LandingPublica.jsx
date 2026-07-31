import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, MessageCircle, Package, Layers, ImageOff } from 'lucide-react';
import { obtenerLandingPublica } from '../../services/landingPublicaService';
import { getMediaUrl } from '../../services/api';
import './landingPublica.css';

function formatPrecio(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

function armarLinkWhatsapp(contacto, nombreItem) {
  if (!contacto?.whatsapp) return null;
  const plantilla = contacto.mensaje || 'Hola, me interesa {producto}';
  const mensaje = plantilla.replace('{producto}', nombreItem);
  return `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export default function LandingPublica() {
  const { slug } = useParams();
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'no-encontrada' | 'no-disponible' | 'ok'
  const [data, setData] = useState(null);

  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('');

  useEffect(() => {
    let activo = true;
    setEstado('cargando');
    obtenerLandingPublica(slug)
      .then((res) => {
        if (!activo) return;
        if (res === null) return setEstado('no-encontrada');
        if (!res.disponible) return setEstado('no-disponible');
        setData(res);
        setEstado('ok');
      })
      .catch(() => { if (activo) setEstado('no-encontrada'); });
    return () => { activo = false; };
  }, [slug]);

  const categorias = useMemo(() => data ? [...new Set(data.items.map(i => i.categoria).filter(Boolean))] : [], [data]);
  const marcas = useMemo(() => data ? [...new Set(data.items.map(i => i.marca).filter(Boolean))] : [], [data]);

  // Etiquetas agrupadas case-insensitive: "Ofertas" y "ofertas " son el mismo filtro.
  const etiquetas = useMemo(() => {
    if (!data) return [];
    const mapa = new Map();
    data.items.forEach(i => {
      if (i.etiqueta) {
        const clave = i.etiqueta.toLowerCase();
        if (!mapa.has(clave)) mapa.set(clave, i.etiqueta);
      }
    });
    return Array.from(mapa.values());
  }, [data]);

  const itemsFiltrados = useMemo(() => {
    if (!data) return [];
    let arr = data.items;
    if (filtroCategoria) arr = arr.filter(i => i.categoria === filtroCategoria);
    if (filtroMarca) arr = arr.filter(i => i.marca === filtroMarca);
    if (filtroEtiqueta) arr = arr.filter(i => i.etiqueta && i.etiqueta.toLowerCase() === filtroEtiqueta.toLowerCase());
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      arr = arr.filter(i => i.nombre.toLowerCase().includes(q));
    }
    if (orden === 'asc') arr = [...arr].sort((a, b) => a.precio - b.precio);
    if (orden === 'desc') arr = [...arr].sort((a, b) => b.precio - a.precio);
    return arr;
  }, [data, filtroCategoria, filtroMarca, filtroEtiqueta, busqueda, orden]);

  if (estado === 'cargando') {
    return <div className="lp-status-page"><div className="lp-spinner" /></div>;
  }

  if (estado === 'no-encontrada' || estado === 'no-disponible') {
    return (
      <div className="lp-status-page">
        <h1>Esta vidriera no está disponible</h1>
        <p>El link puede haber cambiado o el catálogo ya no está activo.</p>
      </div>
    );
  }

  const { filtros, contacto } = data;
  const hayFiltrosVisibles = filtros.categoria || filtros.marca || filtros.etiqueta || filtros.buscador || filtros.orden_precio;

  return (
    <div
      className="lp-page"
      style={{
        '--l-primary': data.tema.primario || '#10b981',
        '--l-secondary': data.tema.secundario || '#059669',
        '--l-bg': data.tema.fondo || '#0a0a0a',
      }}
    >
      <header className="lp-header">
        <h1>{data.titulo}</h1>
        {data.descripcion && <p>{data.descripcion}</p>}
      </header>

      {hayFiltrosVisibles && (
        <div className="lp-filters">
          {filtros.buscador && (
            <div className="lp-search">
              <Search size={14} />
              <input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
          )}
          {filtros.categoria && categorias.length > 0 && (
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {filtros.marca && marcas.length > 0 && (
            <select value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)}>
              <option value="">Todas las marcas</option>
              {marcas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {filtros.etiqueta && etiquetas.length > 0 && (
            <select value={filtroEtiqueta} onChange={e => setFiltroEtiqueta(e.target.value)}>
              <option value="">Todas las etiquetas</option>
              {etiquetas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          {filtros.orden_precio && (
            <select value={orden} onChange={e => setOrden(e.target.value)}>
              <option value="">Orden por defecto</option>
              <option value="asc">Precio: menor a mayor</option>
              <option value="desc">Precio: mayor a menor</option>
            </select>
          )}
        </div>
      )}

      {itemsFiltrados.length === 0 ? (
        <div className="lp-empty">No hay productos que coincidan con el filtro.</div>
      ) : (
        <div className="lp-grid">
          {itemsFiltrados.map(item => {
            const linkWhatsapp = armarLinkWhatsapp(contacto, item.nombre);
            return (
              <div key={item.content_id} className="lp-card">
                <div className="lp-card-media">
                  {item.imagen ? (
                    <img src={getMediaUrl(item.imagen)} alt={item.nombre} />
                  ) : (
                    <div className="lp-card-media-placeholder">
                      {item.tipo === 'combo' ? <Layers size={26} /> : <ImageOff size={26} />}
                    </div>
                  )}
                  {item.tipo === 'combo' && <span className="lp-card-badge"><Layers size={11} /> Combo</span>}
                </div>
                <div className="lp-card-body">
                  {item.etiqueta && <span className="lp-card-tag">{item.etiqueta}</span>}
                  <h3>{item.nombre}</h3>
                  {item.descripcion && <p className="lp-card-desc">{item.descripcion}</p>}
                  <span className="lp-card-price">{formatPrecio(item.precio)}</span>
                  {linkWhatsapp && (
                    <a className="lp-card-contact" href={linkWhatsapp} target="_blank" rel="noreferrer">
                      <MessageCircle size={15} /> Consultar
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
