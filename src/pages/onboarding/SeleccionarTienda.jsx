import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader, Store } from 'lucide-react';
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

  useEffect(() => {
    let activo = true;
    tiendaService.mias()
      .then((data) => { if (activo) setTiendas(data); })
      .catch(() => { if (activo) setError('No pudimos cargar tus tiendas. Probá de nuevo.'); });
    return () => { activo = false; };
  }, []);

  async function elegir(tienda) {
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

  return (
    <div className="onb-page">
      <div className="onb-card st-card">
        <div className="onb-brand">
          <Logo size={24} />
        </div>

        <div className="onb-step-content">
          <h1>¿Con qué tienda querés trabajar?</h1>
          <p className="onb-subtitle">Tu cuenta tiene varias tiendas. Elegí una para continuar.</p>

          {error && <div className="land-alert-error">{error}</div>}

          {tiendas === null && (
            <div className="st-cargando"><Loader size={18} className="spin-icon" /></div>
          )}

          {tiendas && (
            <div className="st-lista">
              {tiendas.map((tienda) => (
                <button
                  key={tienda.id}
                  type="button"
                  className="st-item"
                  disabled={seleccionando !== null}
                  onClick={() => elegir(tienda)}
                >
                  <span className="st-item-logo">
                    {tienda.logo_imagen ? <img src={tienda.logo_imagen} alt="" /> : <Store size={18} />}
                  </span>
                  <span className="st-item-info">
                    <strong>{tienda.nombre}</strong>
                    <small>{tienda.subdominio}.gesicomm.com</small>
                  </span>
                  {seleccionando === tienda.id && <Loader size={15} className="spin-icon" />}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="onb-btn-secondary"
            disabled={seleccionando !== null}
            onClick={() => navigate('/onboarding', { state: { nueva: true } })}
          >
            + Crear otra tienda
          </button>
        </div>
      </div>
    </div>
  );
}
