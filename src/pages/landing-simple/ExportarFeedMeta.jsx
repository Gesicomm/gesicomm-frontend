import React, { useEffect, useState } from 'react';
import { Copy, Check, Download, RefreshCw, Pause, X, ExternalLink, Loader } from 'lucide-react';
import { metaFeedService as service } from '../../services/metaFeedService';

export default function ExportarFeedMeta({ onCerrar }) {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    let vivo = true;
    const cargar = () => service.estadoActual().then(data => {
      if (vivo) { setEstado(data); setError(''); }
    }).catch(e => { if (vivo) setError(e.response?.data?.message || 'No se pudo consultar el feed.'); });
    cargar();
    const timer = setInterval(cargar, 10000);
    return () => { vivo = false; clearInterval(timer); };
  }, []);
  async function ejecutar(accion) {
    setOcupado(true); setError('');
    try { const data = await accion(); if (data?.url) setEstado(data); }
    catch (e) { setError(e.response?.data?.message || 'No se pudo completar la operación. Reintentá.'); }
    finally { setOcupado(false); }
  }
  return <section id="vitrina-meta-export" className="vit-meta-popover" role="dialog" aria-label="Exportar a Meta">
    <header className="vit-meta-popover-header"><div><h2>Tu catálogo en Meta</h2><p>Solo los productos de tu landing.</p></div><button type="button" className="vit-meta-icon-button" onClick={onCerrar} aria-label="Cerrar exportación" autoFocus><X size={17} /></button></header>
    {error && <p className="vit-meta-error" role="alert">{error}</p>}
    {!estado && !error && <p className="vit-meta-loading" role="status"><Loader size={15} className="spin-icon" />Cargando enlace…</p>}
    {estado && <>
      <div className="vit-meta-summary"><span>{estado.seleccionados.toLocaleString('es-PY')} productos · PYG</span><span className={`vit-meta-badge ${estado.activo ? 'active' : ''}`}>{estado.activo ? 'Activo' : 'Sin activar'}</span></div>
      <label className="vit-meta-url-label" htmlFor="vit-meta-url">Enlace de actualización automática</label>
      <div className="vit-meta-url"><input id="vit-meta-url" aria-label="URL del feed de esta landing" readOnly value={estado.url} onFocus={e => e.target.select()} /><button type="button" className="vit-meta-copy" disabled={ocupado} onClick={() => ejecutar(async () => { await navigator.clipboard.writeText(estado.url); setCopiado(true); })}>{copiado ? <Check size={15} /> : <Copy size={15} />}{copiado ? 'Copiado' : 'Copiar enlace'}</button></div>
      {copiado && <span className="vit-meta-sr-only" role="status">Enlace copiado.</span>}
      {!estado.activo && <button type="button" className="vit-meta-prepare" disabled={ocupado || estado.seleccionados > estado.limite} onClick={() => ejecutar(() => service.activar(estado.landing_id, true))}>{ocupado ? <Loader size={15} className="spin-icon" /> : <RefreshCw size={15} />}Preparar feed</button>}
      {estado.seleccionados > estado.limite && <p className="vit-meta-error" role="alert">El feed admite hasta {estado.limite} productos. Reducí la selección de tu landing.</p>}
      {estado.activo && estado.pendiente && <p className="vit-meta-hint" role="status">Preparando el archivo completo…</p>}
      {estado.error && <p className="vit-meta-error" role="alert">{estado.error}</p>}
      <p className="vit-meta-hint">Pegá este enlace una vez en Meta y programá sus descargas. Los precios, imágenes y stock se actualizan en cada importación.</p>
      {estado.activo && <div className="vit-meta-secondary-actions">
        {estado.generado_at && <a href={estado.url} target="_blank" rel="noreferrer"><Download size={13} />CSV</a>}
        <button type="button" disabled={ocupado} onClick={() => ejecutar(() => service.actualizar(estado.landing_id))}><RefreshCw size={13} />Actualizar</button>
        <button type="button" disabled={ocupado} onClick={() => ejecutar(() => service.activar(estado.landing_id, false))}><Pause size={13} />Pausar</button>
      </div>}
      {!!estado.omitidos?.length && <details className="vit-meta-details"><summary>{estado.omitidos.length} productos para revisar</summary><ul>{estado.omitidos.slice(0, 10).map((o, n) => <li key={n}>{o.clave}: {o.motivo}</li>)}</ul></details>}
    </>}
    <details className="vit-meta-details"><summary>Cómo conectarlo con Meta</summary><ol><li>Commerce Manager → tu catálogo → Orígenes de datos → Feed de datos.</li><li>Pegá el enlace y elegí una descarga programada.</li></ol><p>Meta refleja los cambios en su siguiente descarga y procesamiento. Pausar no elimina productos ya importados.</p><a href="https://business.facebook.com/commerce/" target="_blank" rel="noreferrer">Abrir Commerce Manager <ExternalLink size={12} /></a></details>
  </section>;
}
