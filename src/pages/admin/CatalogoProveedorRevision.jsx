import { useEffect, useRef, useState } from 'react';
import { Check, Inbox, PackageSearch, RefreshCw, X } from 'lucide-react';
import API from '../../services/api';
import './catalogoProveedorRevision.css';

/**
 * Qué quiere ofrecer cada proveedor.
 *
 * Un proveedor aceptado sube su catálogo por API, pero nada se publica
 * solo: hasta que un administrador lo apruebe, el producto no aparece en
 * Mi catálogo de ningún comercio ni se puede usar en una landing. Acá se
 * ve lo que mandaron —foto, precio, categoría— y se aprueba o se rechaza,
 * de a uno o varios juntos.
 */

const ESTADOS = { pendiente: 'Esperando revisión', aprobado: 'Aprobados', rechazado: 'Rechazados' };
const ETIQUETAS = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' };
const guaranies = valor => (valor == null ? 'Sin precio' : `Gs ${Number(valor).toLocaleString('es-PY')}`);
const fecha = valor => (valor ? new Date(valor).toLocaleString('es-PY') : '—');

export default function CatalogoProveedorRevision() {
  const [estado, setEstado] = useState('pendiente');
  const [proveedorId, setProveedorId] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState({ productos: [], proveedores: [], total: 0, total_paginas: 0, resumen: {} });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [elegidos, setElegidos] = useState([]);
  const [decision, setDecision] = useState(null); // 'aprobado' | 'rechazado'
  const [nota, setNota] = useState('');
  const [errorDecision, setErrorDecision] = useState('');
  const [guardando, setGuardando] = useState(false);
  const notaRef = useRef(null);
  const avisoRef = useRef(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true); setError('');
    API.get('/publico/admin/solicitudes-proveedores/catalogo', {
      params: { estado, page, limit: 20, ...(proveedorId ? { proveedorId } : {}) },
    })
      .then(({ data }) => {
        if (!vigente) return;
        if (page > 1 && !data.productos.length) { setPage(p => p - 1); return; }
        setResultado(data);
        setElegidos([]);
      })
      .catch(err => { if (vigente) setError(err.response?.data?.message || 'No pudimos cargar el catálogo de los proveedores. Volvé a intentar.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [estado, proveedorId, page, revision]);

  useEffect(() => { if (decision) notaRef.current?.focus(); }, [decision]);
  useEffect(() => { if (aviso) avisoRef.current?.focus(); }, [aviso]);

  const alternar = id => setElegidos(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const todos = () => setElegidos(elegidos.length === resultado.productos.length ? [] : resultado.productos.map(p => p.id));

  const empezar = siguiente => {
    if (!elegidos.length) return;
    setDecision(siguiente); setNota(''); setErrorDecision(''); setAviso('');
  };

  const guardar = async event => {
    event.preventDefault();
    if (guardando || !decision) return;
    if (decision === 'rechazado' && nota.trim().length < 3) {
      setErrorDecision('Indicá el motivo del rechazo: es lo que se le explica al proveedor.');
      notaRef.current?.focus();
      return;
    }
    setGuardando(true); setErrorDecision('');
    try {
      const { data } = await API.patch('/publico/admin/solicitudes-proveedores/catalogo', {
        ids: elegidos, estado: decision, nota: nota.trim(),
      });
      setAviso(data.estado === 'aprobado'
        ? `${data.revisados} ${data.revisados === 1 ? 'producto aprobado' : 'productos aprobados'}. Ya se ven en el catálogo de todos los comercios.`
        : `${data.revisados} ${data.revisados === 1 ? 'producto rechazado' : 'productos rechazados'}. No se publican y el motivo queda guardado.`);
      setDecision(null); setNota(''); setElegidos([]); setRevision(r => r + 1);
    } catch (err) {
      setErrorDecision(err.response?.data?.errores?.map(e => e.mensaje).join(' ') || err.response?.data?.message || 'No pudimos guardar la decisión. Tu nota se conserva para reintentar.');
    } finally { setGuardando(false); }
  };

  return <section className="prov-catalogo" aria-labelledby="prov-catalogo-titulo">
    <header className="prov-catalogo-head">
      <div>
        <span className="provider-eyebrow">Mercadería</span>
        <h2 id="prov-catalogo-titulo">Qué quieren ofrecer</h2>
        <p>Los productos que los proveedores subieron por su API. Hasta que los apruebes acá, no se ven en el catálogo de ningún comercio ni se pueden usar en una landing.</p>
      </div>
      <button type="button" disabled={cargando || guardando} onClick={() => { setDecision(null); setRevision(r => r + 1); }}>
        <RefreshCw size={18} /> Actualizar
      </button>
    </header>

    <nav className="provider-status-filters" aria-label="Estado de los productos">
      {Object.entries(ESTADOS).map(([key, label]) => <button type="button" key={key} aria-pressed={estado === key} disabled={guardando}
        onClick={() => { setEstado(key); setPage(1); setDecision(null); setAviso(''); }}>
        <span>{label}</span><strong>{cargando || error ? '—' : resultado.resumen[key] ?? 0}</strong>
      </button>)}
    </nav>

    {resultado.proveedores.length > 0 && (
      <div className="prov-catalogo-filtro">
        <label htmlFor="prov-catalogo-proveedor">Proveedor</label>
        <select id="prov-catalogo-proveedor" value={proveedorId} disabled={guardando}
          onChange={e => { setProveedorId(e.target.value); setPage(1); setDecision(null); }}>
          <option value="">Todos los proveedores</option>
          {resultado.proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.pendientes})</option>)}
        </select>
      </div>
    )}

    {aviso && <p className="provider-notice" role="status" tabIndex={-1} ref={avisoRef}>{aviso}</p>}

    {cargando ? <p role="status">Cargando productos…</p>
      : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRevision(r => r + 1)}>Reintentar</button></div>
        : !resultado.productos.length ? <div className="web-requests-empty">
          <PackageSearch size={32} />
          <h3>No hay productos {estado === 'pendiente' ? 'esperando revisión' : ESTADOS[estado].toLowerCase()}</h3>
          <p>Cuando un proveedor cargue su catálogo con su API Key, cada producto llega acá antes de publicarse.</p>
        </div> : <>

          {estado === 'pendiente' && <div className="prov-catalogo-barra">
            <label className="prov-catalogo-todos">
              <input type="checkbox" checked={elegidos.length === resultado.productos.length} onChange={todos} disabled={guardando} />
              Seleccionar los {resultado.productos.length} de esta página
            </label>
            <span className="prov-catalogo-elegidos">{elegidos.length} {elegidos.length === 1 ? 'elegido' : 'elegidos'}</span>
            <div className="provider-actions">
              <button type="button" className="provider-accept" disabled={!elegidos.length || guardando} onClick={() => empezar('aprobado')}>
                <Check size={18} /> Aprobar
              </button>
              <button type="button" className="provider-reject" disabled={!elegidos.length || guardando} onClick={() => empezar('rechazado')}>
                <X size={18} /> Rechazar
              </button>
            </div>
          </div>}

          {decision && <form className="provider-decision" onSubmit={guardar} aria-label="Confirmar la decisión">
            <h3>{decision === 'aprobado' ? 'Aprobar' : 'Rechazar'} {elegidos.length} {elegidos.length === 1 ? 'producto' : 'productos'}</h3>
            <label htmlFor="prov-catalogo-nota">{decision === 'rechazado' ? 'Motivo del rechazo (obligatorio)' : 'Nota de revisión (opcional)'}</label>
            <textarea id="prov-catalogo-nota" ref={notaRef} value={nota} onChange={e => setNota(e.target.value)} maxLength={2000} rows={3}
              required={decision === 'rechazado'} disabled={guardando} aria-describedby="prov-catalogo-nota-ayuda" />
            <p id="prov-catalogo-nota-ayuda">
              {decision === 'aprobado'
                ? 'Al aprobar, el producto queda visible en el catálogo de todos los comercios y se puede usar en landings y páginas de venta.'
                : 'El motivo queda guardado junto con la decisión y es lo que se le explica al proveedor.'}
            </p>
            {errorDecision && <p role="alert" className="provider-error">{errorDecision}</p>}
            <div className="provider-actions">
              <button type="submit" disabled={guardando} className={decision === 'aprobado' ? 'provider-accept' : 'provider-reject'}>
                {guardando ? 'Guardando…' : decision === 'aprobado' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
              </button>
              <button type="button" onClick={() => { setDecision(null); setErrorDecision(''); }} disabled={guardando}>Cancelar</button>
            </div>
          </form>}

          <ul className="prov-catalogo-lista">
            {resultado.productos.map(p => <li key={p.id}>
              <article className={`prov-producto ${elegidos.includes(p.id) ? 'is-selected' : ''}`}>
                {estado === 'pendiente' && <label className="prov-producto-check">
                  <input type="checkbox" checked={elegidos.includes(p.id)} onChange={() => alternar(p.id)} disabled={guardando}
                    aria-label={`Elegir ${p.nombre}`} />
                </label>}

                <div className="prov-producto-foto">
                  {p.imagenes[0]
                    ? <img src={p.imagenes[0]} alt="" loading="lazy" />
                    : <span className="prov-producto-sinfoto"><Inbox size={22} /> Sin foto</span>}
                </div>

                <div className="prov-producto-datos">
                  <div className="prov-producto-top">
                    {p.proveedor && <span className="prov-producto-proveedor">
                      {p.proveedor.logo_url && <img src={p.proveedor.logo_url} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                      {p.proveedor.nombre}
                    </span>}
                    <span className="provider-status" data-state={p.estado === 'aprobado' ? 'aceptada' : p.estado === 'rechazado' ? 'rechazada' : 'pendiente'}>
                      {ETIQUETAS[p.estado]}
                    </span>
                  </div>

                  <h3>{p.nombre}</h3>
                  {p.descripcion && <p className="prov-producto-desc">{p.descripcion}</p>}

                  <dl className="prov-producto-meta">
                    <div><dt>Precio</dt><dd>{guaranies(p.precio)}</dd></div>
                    <div><dt>Stock</dt><dd>{p.stock ?? 0}</dd></div>
                    <div><dt>Categoría</dt><dd>{p.categoria || 'Sin categoría'}</dd></div>
                    <div><dt>SKU</dt><dd>{p.sku || '—'}</dd></div>
                  </dl>

                  {p.imagenes.length > 1 && <div className="prov-producto-galeria">
                    {p.imagenes.slice(1).map(url => <img key={url} src={url} alt="" loading="lazy" />)}
                  </div>}

                  <p className="prov-producto-recibido">Recibido el {fecha(p.recibido_en)}</p>
                  {p.estado !== 'pendiente' && <div className="provider-reviewed">
                    <p><strong>{ETIQUETAS[p.estado]}</strong> el {fecha(p.revisado_en)}</p>
                    {p.nota_revision && <p className="provider-note">{p.nota_revision}</p>}
                  </div>}
                </div>
              </article>
            </li>)}
          </ul>

          <nav className="web-requests-pagination" aria-label="Páginas de productos">
            <button type="button" disabled={page <= 1 || guardando} onClick={() => { setPage(p => p - 1); setDecision(null); }}>Anterior</button>
            <span>Página {page} de {Math.max(1, resultado.total_paginas)}</span>
            <button type="button" disabled={page >= resultado.total_paginas || guardando} onClick={() => { setPage(p => p + 1); setDecision(null); }}>Siguiente</button>
          </nav>
        </>}
  </section>;
}
