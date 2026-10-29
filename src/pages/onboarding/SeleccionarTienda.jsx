import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader, Plus, Power, Store, Trash2 } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import Logo from '../../components/public/Logo';
import './onboarding.css';
import './seleccionarTienda.css';

/**
 * Cuenta con más de una tienda y ninguna activa todavía: elegir con cuál
 * trabajar. RequireTienda manda acá (nunca por query param — vía router
 * state, ver [[gesicomm_no_url_state]]) guardando a dónde quería ir.
 */
export default function SeleccionarTienda() {
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.desde || '/seleccionar-modulo';

  const [tiendas, setTiendas] = useState(null);
  const [error, setError] = useState(null);
  const [seleccionando, setSeleccionando] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(null);
  const [nombreConfirmacion, setNombreConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [opcionesAbiertas, setOpcionesAbiertas] = useState(null);
  const ocupado = seleccionando !== null || guardando;
  const confirmacionAbierta = confirmando !== null || borrando !== null;

  useEffect(() => {
    let activo = true;
    tiendaService.mias()
      .then((data) => { if (activo) setTiendas(data); })
      .catch(() => { if (activo) setError('No pudimos cargar tus tiendas. Probá de nuevo.'); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (opcionesAbiertas === null) return undefined;
    const cerrarAlHacerClickFuera = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.st-opciones-tienda')) {
        setOpcionesAbiertas(null);
      }
    };
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') setOpcionesAbiertas(null);
    };
    document.addEventListener('pointerdown', cerrarAlHacerClickFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarAlHacerClickFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [opcionesAbiertas]);

  async function elegir(tienda) {
    setOpcionesAbiertas(null);
    setError(null);
    setSeleccionando(tienda.id);
    try {
      await tiendaService.seleccionar(tienda.id);
      navigate(destino, { replace: true });
    } catch {
      setError('No pudimos activar esa tienda. Probá de nuevo.');
      setSeleccionando(null);
    }
  }

  async function cambiarEstado(tienda) {
    setOpcionesAbiertas(null);
    setError(null);
    setMensaje('');
    setGuardando(true);
    try {
      const actualizada = await tiendaService.cambiarEstado(tienda.id, tienda.activo === false);
      setTiendas(actuales => actuales.map(item => item.id === tienda.id ? { ...item, ...actualizada } : item));
      setConfirmando(null);
      setMensaje(actualizada.activo ? `${tienda.nombre} está activa.` : `${tienda.nombre} está inactiva. Podés reactivarla cuando quieras.`);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos cambiar el estado. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(tienda) {
    setOpcionesAbiertas(null);
    setError(null);
    setMensaje('');
    setGuardando(true);
    try {
      await tiendaService.eliminar(tienda.id, nombreConfirmacion);
      setTiendas(actuales => actuales.filter(item => item.id !== tienda.id));
      setBorrando(null);
      setNombreConfirmacion('');
      setMensaje(`${tienda.nombre} fue eliminada.`);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos eliminar la tienda. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="onb-page st-page">
      <div className="onb-card st-card">
        <div className="onb-brand">
          <Logo size={24} />
        </div>

        <div className="onb-step-content">
          <h1>Mis tiendas</h1>
          <p className="onb-subtitle">Entrá a tu tienda o administrá su disponibilidad.</p>

          {error && <div className="land-alert-error" role="alert">{error}</div>}
          <p className="st-feedback" role="status">{mensaje}</p>

          {tiendas === null && (
            <div className="st-cargando"><Loader size={18} className="spin-icon" /></div>
          )}

          {tiendas && (
            <div className="st-lista">
              {tiendas.map((tienda) => (
                <div key={tienda.id} className="st-tienda">
                <button
                  type="button"
                  className="st-item"
                  aria-label={`Administrar ${tienda.nombre}`}
                  disabled={ocupado || confirmacionAbierta}
                  onClick={() => elegir(tienda)}
                >
                  <span className="st-item-logo">
                    {tienda.logo_imagen ? <img src={tienda.logo_imagen} alt="" /> : <Store size={18} />}
                  </span>
                  <span className="st-item-info">
                    <strong>{tienda.nombre}</strong>
                    <small>{tienda.subdominio}.gesicomm.com</small>
                  </span>
                  <span className="st-entrar">{seleccionando === tienda.id ? <Loader size={17} className="spin-icon" /> : <ArrowRight size={18} />}</span>
                </button>
                <div className="st-pie">
                  <span className={`st-estado ${tienda.activo === false ? 'st-inactiva' : ''}`}>
                    <span className="st-estado-punto" />{tienda.activo === false ? 'Inactiva' : 'Activa'}
                  </span>
                  <div className="st-opciones-tienda">
                    <button
                      type="button"
                      className="st-opciones-trigger"
                      aria-label={`Opciones de ${tienda.nombre}`}
                      aria-expanded={opcionesAbiertas === tienda.id}
                      aria-controls={`st-opciones-${tienda.id}`}
                      disabled={ocupado || confirmacionAbierta}
                      onClick={() => setOpcionesAbiertas(actual => actual === tienda.id ? null : tienda.id)}
                    >Opciones</button>
                    {opcionesAbiertas === tienda.id && <div id={`st-opciones-${tienda.id}`} className="st-pie-acciones" role="group" aria-label={`Acciones de ${tienda.nombre}`}>
                  <button type="button" className="st-cambiar-estado"
                    aria-label={`${tienda.activo === false ? 'Reactivar' : 'Inactivar'} ${tienda.nombre}`}
                    disabled={ocupado || confirmacionAbierta}
                    onClick={() => {
                      setError(null);
                      setMensaje('');
                      if (tienda.activo === false) cambiarEstado(tienda);
                      else setConfirmando(tienda.id);
                    }}>
                    <Power size={14} />{tienda.activo === false ? 'Reactivar' : 'Inactivar'}
                  </button>
                  <button type="button" className="st-cambiar-estado st-eliminar"
                    aria-label={`Eliminar ${tienda.nombre}`}
                    title={tienda.activo === false ? 'Eliminar definitivamente una tienda vacía' : 'Inactivá la tienda antes de eliminarla'}
                    disabled={ocupado || confirmacionAbierta || tienda.activo !== false}
                    onClick={() => { setError(null); setMensaje(''); setNombreConfirmacion(''); setBorrando(tienda.id); }}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                    </div>}
                  </div>
                </div>
                {borrando === tienda.id && (
                  <form className="st-confirmacion" onSubmit={event => { event.preventDefault(); if (nombreConfirmacion === tienda.nombre && !guardando) eliminar(tienda); }}>
                    <p><strong>Eliminar «{tienda.nombre}» definitivamente</strong></p>
                    <p>Esta acción no se puede deshacer. Solo se pueden eliminar tiendas sin datos asociados. Si tiene historial, mantenela inactiva.</p>
                    <label className="st-confirmar-nombre">
                      Escribí «{tienda.nombre}» para confirmar
                      <input value={nombreConfirmacion} onChange={event => setNombreConfirmacion(event.target.value)} disabled={guardando} autoComplete="off" autoFocus />
                    </label>
                    <div className="st-acciones">
                      <button type="button" className="onb-btn-secondary" disabled={guardando} onClick={() => setBorrando(null)}>Cancelar</button>
                      <button type="submit" className="onb-btn-secondary st-confirmar" disabled={guardando || nombreConfirmacion !== tienda.nombre}>{guardando ? 'Eliminando…' : 'Eliminar definitivamente'}</button>
                    </div>
                  </form>
                )}
                {confirmando === tienda.id ? (
                  <div className="st-confirmacion" role="group" aria-label={`Inactivar ${tienda.nombre}`}>
                    <p>Al inactivar «{tienda.nombre}», su sitio público dejará de estar disponible y no recibirá nuevas compras. Conservás los pedidos, productos y la configuración. Podés reactivarla cuando quieras.</p>
                    <div className="st-acciones">
                      <button type="button" className="onb-btn-secondary" disabled={guardando} onClick={() => setConfirmando(null)} autoFocus>Cancelar</button>
                      <button type="button" className="onb-btn-secondary st-confirmar" disabled={guardando} onClick={() => cambiarEstado(tienda)}>{guardando ? 'Inactivando…' : 'Confirmar inactivación'}</button>
                    </div>
                  </div>
                ) : null}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="onb-btn-secondary st-crear"
            disabled={ocupado || confirmacionAbierta}
            onClick={() => navigate('/onboarding', { state: { nueva: true } })}
          >
            <Plus size={17} /> Crear otra tienda
          </button>
        </div>
      </div>
    </div>
  );
}
