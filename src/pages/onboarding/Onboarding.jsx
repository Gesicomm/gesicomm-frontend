import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader, ArrowRight, ArrowLeft, Store, Sparkles, Crown } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import { useDebounce } from '../../hooks/useDebounce';
import '../vitrina/vitrina.css';
import '../tienda/tienda.css';
import './onboarding.css';

function slugifyLigero(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

const PLANES = [
  {
    id: 'free',
    icono: Sparkles,
    titulo: 'Free',
    precio: 'Gratis',
    detalle: 'Tu tienda, tus landings y tu catálogo — sin costo, para arrancar.',
  },
  {
    id: 'pago',
    icono: Crown,
    titulo: 'Pago',
    precio: 'Próximamente',
    detalle: 'Un asesor te va a contactar para activar los beneficios del plan pago.',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [verificandoTienda, setVerificandoTienda] = useState(true);
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [plan, setPlan] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);
  const ultimaConsulta = useRef(0);

  const subdominio = slugifyLigero(nombre);
  const subdominioDebounced = useDebounce(subdominio, 500);

  // Si el usuario ya tiene tienda (volvió a /onboarding por error, o con
  // el botón "atrás" del navegador), no tiene sentido re-onboardearlo.
  useEffect(() => {
    tiendaService.obtener()
      .then(t => { if (t) navigate('/mi-catalogo', { replace: true }); })
      .finally(() => setVerificandoTienda(false));
  }, [navigate]);

  useEffect(() => {
    if (!subdominioDebounced || subdominioDebounced.length < 3) {
      setDisponibilidad(null);
      return;
    }
    const idConsulta = ++ultimaConsulta.current;
    setDisponibilidad('cargando');
    tiendaService.disponibilidadSubdominio(subdominioDebounced)
      .then(res => { if (idConsulta === ultimaConsulta.current) setDisponibilidad(res); })
      .catch(() => { if (idConsulta === ultimaConsulta.current) setDisponibilidad({ valido: false, disponible: false, motivo: 'Error al verificar.' }); });
  }, [subdominioDebounced]);

  const nombreValido = nombre.trim().length >= 2 && subdominio.length >= 3;
  const subdominioOk = disponibilidad && disponibilidad !== 'cargando' && disponibilidad.valido && disponibilidad.disponible;

  function irAPaso2(e) {
    e.preventDefault();
    if (!nombreValido || !subdominioOk) return;
    setError(null);
    setPaso(2);
  }

  async function crear(planElegido) {
    setPlan(planElegido);
    setError(null);
    setCreando(true);
    try {
      await tiendaService.crear({ nombre: nombre.trim(), subdominio, plan: planElegido });
      navigate('/mi-catalogo', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear tu tienda. Probá de nuevo.');
      setCreando(false);
      setPlan(null);
    }
  }

  if (verificandoTienda) {
    return (
      <div className="onb-page">
        <Loader size={22} className="spin-icon" />
      </div>
    );
  }

  return (
    <div className="onb-page">
      <div className="onb-card">
        <div className="onb-brand">
          <Store size={20} />
          <span>GESICOMM<span className="dot">.</span></span>
        </div>

        <div className="onb-steps">
          <span className={`onb-step ${paso === 1 ? 'active' : 'done'}`}>1</span>
          <span className="onb-step-line" />
          <span className={`onb-step ${paso === 2 ? 'active' : ''}`}>2</span>
        </div>

        {paso === 1 && (
          <form onSubmit={irAPaso2} className="onb-step-content">
            <h1>¿Cómo se llama tu tienda?</h1>
            <p className="onb-subtitle">Con esto armamos tu URL pública — la vas a poder compartir por WhatsApp o en tus anuncios.</p>

            <label className="onb-label">Nombre de tu tienda
              <input
                autoFocus
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Ropa Fina"
              />
            </label>

            <label className="onb-label">Tu URL
              <div className="tn-url-readonly">
                <Store size={13} /> https://{subdominio || '...'}.gesicomm.com
              </div>
            </label>

            <div className="tn-disponibilidad">
              {disponibilidad === 'cargando' && <span className="tn-check cargando"><Loader size={13} className="spin-icon" /> Verificando...</span>}
              {disponibilidad && disponibilidad !== 'cargando' && disponibilidad.disponible && (
                <span className="tn-check ok"><Check size={13} /> Disponible</span>
              )}
              {disponibilidad && disponibilidad !== 'cargando' && !disponibilidad.disponible && (
                <span className="tn-check error"><X size={13} /> {disponibilidad.motivo || 'Ese nombre ya está en uso — probá con otro.'}</span>
              )}
            </div>

            <button type="submit" className="land-btn-primary onb-btn-full" disabled={!nombreValido || !subdominioOk}>
              Continuar <ArrowRight size={15} />
            </button>
          </form>
        )}

        {paso === 2 && (
          <div className="onb-step-content">
            <h1>Elegí tu plan</h1>
            <p className="onb-subtitle">Podés cambiarlo después desde Mi tienda.</p>

            <div className="onb-planes">
              {PLANES.map(p => {
                const Icono = p.icono;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`onb-plan-card ${plan === p.id ? 'selected' : ''}`}
                    disabled={creando}
                    onClick={() => crear(p.id)}
                  >
                    <Icono size={22} />
                    <h3>{p.titulo}</h3>
                    <span className="onb-plan-precio">{p.precio}</span>
                    <p>{p.detalle}</p>
                    {creando && plan === p.id && <Loader size={16} className="spin-icon" />}
                  </button>
                );
              })}
            </div>

            {error && <div className="land-alert-error">{error}</div>}

            <button type="button" className="onb-btn-back" onClick={() => setPaso(1)} disabled={creando}>
              <ArrowLeft size={14} /> Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
