import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Layers, Edit2, Trash2, Power, PowerOff, Copy, Check, ExternalLink, Loader, Store, Home } from 'lucide-react';
import { landingService } from '../../services/landingService';
import { tiendaService } from '../../services/tiendaService';
import '../vitrina/vitrina.css';
import './landing.css';

function urlPublica(tienda, landing) {
  const base = `https://${tienda.subdominio}.gesicomm.com`;
  return landing.es_home ? base : `${base}/l/${landing.slug}`;
}

export default function MisLandings() {
  const navigate = useNavigate();
  const [tienda, setTienda] = useState(null);
  const [landings, setLandings] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const tiendaData = await tiendaService.obtener();
      setTienda(tiendaData);
      if (tiendaData) {
        setLandings(await landingService.listar());
      }
    } catch (err) {
      setError('No se pudieron cargar tus landings.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function togglePublicar(landing) {
    const nuevoEstado = !landing.activo;
    if (!nuevoEstado) {
      const ok = window.confirm('Si tenés anuncios o links compartidos apuntando acá, van a dejar de mostrar productos. ¿Despublicar de todos modos?');
      if (!ok) return;
    }
    setProcesando(landing.id);
    try {
      await landingService.cambiarEstado(landing.id, nuevoEstado);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar el estado.');
    } finally {
      setProcesando(null);
    }
  }

  async function eliminar(landing) {
    if (!window.confirm(`¿Eliminar "${landing.nombre}"? No se puede deshacer.`)) return;
    setProcesando(landing.id);
    try {
      await landingService.eliminar(landing.id);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar.');
    } finally {
      setProcesando(null);
    }
  }

  function copiarLink(landing) {
    navigator.clipboard.writeText(urlPublica(tienda, landing)).then(() => {
      setCopiadoId(landing.id);
      setTimeout(() => setCopiadoId(null), 1500);
    });
  }

  if (!cargando && !tienda) {
    return (
      <div className="vit-page">
        <div className="vit-empty">
          <Store size={32} opacity={0.3} />
          <p>Necesitás configurar tu tienda antes de armar una landing.</p>
          <Link to="/mi-tienda" className="land-btn-primary" style={{ textDecoration: 'none' }}>
            Configurar mi tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="vit-page">
      <div className="vit-header">
        <div>
          <h1 className="vit-title">Mis landings</h1>
          <p className="vit-subtitle">Armá vidrieras públicas con los productos que elijas y tu precio.</p>
        </div>
        <button className="land-btn-primary" onClick={() => navigate('/mis-landings/nuevo')}>
          <Plus size={16} /> Nueva landing
        </button>
      </div>

      {cargando ? (
        <div className="vit-empty"><Loader size={22} className="spin-icon" /><p>Cargando...</p></div>
      ) : error ? (
        <div className="vit-empty"><p>{error}</p><button className="btn-secondary" onClick={cargar}>Reintentar</button></div>
      ) : landings.length === 0 ? (
        <div className="vit-empty">
          <Layers size={32} opacity={0.3} />
          <p>Todavía no creaste ninguna landing.</p>
          <button className="land-btn-primary" onClick={() => navigate('/mis-landings/nuevo')}>
            <Plus size={16} /> Crear la primera
          </button>
        </div>
      ) : (
        <div className="land-grid">
          {landings.map(l => (
            <div key={l.id} className="land-card">
              <div className="land-card-header">
                <div>
                  <h3>{l.nombre}</h3>
                  <span className="land-card-meta">
                    {l.items?.length || 0} producto{(l.items?.length || 0) !== 1 ? 's' : ''}
                    {l.es_home && <> · <Home size={11} style={{ verticalAlign: 'text-bottom' }} /> Página principal</>}
                  </span>
                </div>
                <span className={`vit-badge ${l.activo ? 'saludable' : 'margen-bajo'}`}>{l.activo ? 'Publicada' : 'Borrador'}</span>
              </div>

              <div className="land-card-link">
                <code>{urlPublica(tienda, l)}</code>
                <button className="land-icon-btn" onClick={() => copiarLink(l)} title="Copiar link">
                  {copiadoId === l.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
                <a href={urlPublica(tienda, l)} target="_blank" rel="noreferrer" className="land-icon-btn" title="Abrir">
                  <ExternalLink size={14} />
                </a>
              </div>

              <div className="land-card-actions">
                <button className="btn-secondary" onClick={() => navigate(`/mis-landings/${l.id}/editar`)}>
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  className={l.activo ? 'land-btn-warn' : 'land-btn-ok'}
                  disabled={procesando === l.id}
                  onClick={() => togglePublicar(l)}
                >
                  {l.activo ? <><PowerOff size={13} /> Despublicar</> : <><Power size={13} /> Publicar</>}
                </button>
                <button className="btn-icon danger" disabled={procesando === l.id} onClick={() => eliminar(l)} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
