import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader, ArrowRight, ArrowLeft, Store, Dumbbell, Sparkles, Cpu, LayoutTemplate } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import { planesService } from '../../services/planesService';
import { onboardingTrackingService } from '../../services/onboardingTrackingService';
import { useDebounce } from '../../hooks/useDebounce';
import '../vitrina/vitrina.css';
import '../tienda/tienda.css';
import './onboarding.css';
import Logo from '../../components/public/Logo';

function slugifyLigero(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

const FICHAS = [
  {
    id: 'tech-electronica',
    titulo: 'Electrónica / Tecnología',
    detalle: 'Ideal para gadgets, accesorios, celulares, computadoras y productos con especificaciones.',
    icono: Cpu,
  },
  {
    id: 'fitness-suplementos',
    titulo: 'Fitness y Suplementos',
    detalle: 'Pensada para suplementos, bienestar, entrenamiento, packs y beneficios claros.',
    icono: Dumbbell,
  },
  {
    id: 'beauty-skincare',
    titulo: 'Skin Care',
    detalle: 'Para rutinas, cosmética, belleza, resultados, ingredientes y cuidado personal.',
    icono: Sparkles,
  },
  {
    id: 'basico',
    titulo: 'Básico / Otros',
    detalle: 'Una ficha flexible para vender cualquier otro tipo de producto.',
    icono: LayoutTemplate,
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [ficha, setFicha] = useState('');
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [creando, setCreando] = useState(false);
  const [accionCreando, setAccionCreando] = useState(null);
  const [error, setError] = useState(null);
  const ultimaConsulta = useRef(0);
  const inicioTrackeado = useRef(false);

  const subdominio = slugifyLigero(nombre);
  const subdominioDebounced = useDebounce(subdominio, 500);

  useEffect(() => {
    let activo = true;

    async function verificarEntrada() {
      try {
        const estadoCuenta = await planesService.miEstado();
        if (!activo) return;
        if (!estadoCuenta?.tiene_suscripcion_activa) {
          navigate('/planes', { replace: true });
          return;
        }

        const tienda = await tiendaService.obtener();
        if (!activo) return;
        if (tienda) navigate('/mi-dashboard', { replace: true });
        else if (!inicioTrackeado.current) {
          inicioTrackeado.current = true;
          onboardingTrackingService.registrarInicio({ paso: 'nombre_tienda' }).catch(() => null);
        }
      } catch {
        if (activo) setError('No pudimos verificar tu plan. Probá de nuevo.');
      } finally {
        if (activo) setVerificando(false);
      }
    }

    verificarEntrada();
    return () => { activo = false; };
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

  async function crearTienda({ continuarProductos }) {
    if (continuarProductos && !ficha) return;
    setError(null);
    setCreando(true);
    setAccionCreando(continuarProductos ? 'productos' : 'despues');
    try {
      if (continuarProductos) {
        sessionStorage.setItem('gesicomm:onboardingTemplateSlug', ficha);
      } else {
        sessionStorage.removeItem('gesicomm:onboardingTemplateSlug');
        sessionStorage.removeItem('gesicomm:prefilledLandingItems');
      }
      await tiendaService.crear({
        nombre: nombre.trim(),
        subdominio,
        onboarding: true,
        onboarding_ficha: continuarProductos ? ficha : null,
        onboarding_accion: continuarProductos ? 'seleccionar_productos' : 'configurar_mas_tarde',
      });
      navigate(continuarProductos ? '/mi-catalogo?onboarding=productos' : '/mi-dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear tu tienda. Probá de nuevo.');
      setCreando(false);
      setAccionCreando(null);
    }
  }

  if (verificando) {
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
          <Logo size={24} />
        </div>

        <div className="onb-steps">
          <span className={`onb-step ${paso === 1 ? 'active' : 'done'}`}>1</span>
          <span className="onb-step-line" />
          <span className={`onb-step ${paso === 2 ? 'active' : ''}`}>2</span>
        </div>

        {paso === 1 && (
          <form onSubmit={irAPaso2} className="onb-step-content">
            <h1>Bienvenido a Gesicomm</h1>
            <p className="onb-subtitle">Vamos a configurar tu tienda en unos minutos. Primero elegimos el nombre público.</p>

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

            {error && <div className="land-alert-error">{error}</div>}

            <button type="submit" className="land-btn-primary onb-btn-full" disabled={!nombreValido || !subdominioOk}>
              Continuar <ArrowRight size={15} />
            </button>
          </form>
        )}

        {paso === 2 && (
          <div className="onb-step-content">
            <h1>Elegí el tipo de tienda</h1>
            <p className="onb-subtitle">Esta ficha define cómo se va a presentar tu landing y la vista de tus productos.</p>

            <div className="onb-planes">
              {FICHAS.map(opcion => {
                const Icono = opcion.icono;
                return (
                  <button
                    key={opcion.id}
                    type="button"
                    className={`onb-plan-card ${ficha === opcion.id ? 'selected' : ''}`}
                    disabled={creando}
                    onClick={() => setFicha(opcion.id)}
                  >
                    <Icono size={22} />
                    <h3>{opcion.titulo}</h3>
                    <p>{opcion.detalle}</p>
                  </button>
                );
              })}
            </div>

            {error && <div className="land-alert-error">{error}</div>}

            <button type="button" className="land-btn-primary onb-btn-full" disabled={!ficha || creando} onClick={() => crearTienda({ continuarProductos: true })}>
              {accionCreando === 'productos' ? <Loader size={15} className="spin-icon" /> : <ArrowRight size={15} />}
              Seleccionar productos
            </button>

            <button type="button" className="onb-btn-secondary" onClick={() => crearTienda({ continuarProductos: false })} disabled={creando}>
              {accionCreando === 'despues' && <Loader size={15} className="spin-icon" />}
              Configurar más tarde
            </button>

            <button type="button" className="onb-btn-back" onClick={() => setPaso(1)} disabled={creando}>
              <ArrowLeft size={14} /> Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
