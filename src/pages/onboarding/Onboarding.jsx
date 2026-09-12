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
  // PagoPar exige comprador.documento (la cedula) para cobrarle al comercio.
  // El RUC es aparte y opcional: la doc dice que puede ir vacio.
  const [documento, setDocumento] = useState('');
  const [ruc, setRuc] = useState('');
  const [depositoDepartamento, setDepositoDepartamento] = useState('');
  const [depositoCiudad, setDepositoCiudad] = useState('');
  const [depositoDireccion, setDepositoDireccion] = useState('');
  const [depositoReferencia, setDepositoReferencia] = useState('');
  const [depositoTelefono, setDepositoTelefono] = useState('');
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
  const documentoValido = /^[0-9.\-]{5,20}$/.test(documento.trim());
  const subdominioOk = disponibilidad && disponibilidad !== 'cargando' && disponibilidad.valido && disponibilidad.disponible;
  const depositoValido = depositoDepartamento.trim().length >= 2
    && depositoCiudad.trim().length >= 2
    && depositoDireccion.trim().length >= 5
    && depositoTelefono.trim().length >= 6;

  function irAPaso2(e) {
    e.preventDefault();
    if (!nombreValido || !subdominioOk) return;
    setError(null);
    setPaso(2);
  }

  function irAPaso3(e) {
    e.preventDefault();
    if (!depositoValido) return;
    setError(null);
    setPaso(3);
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
        documento: documento.trim(),
        ruc: ruc.trim(),
        deposito_departamento: depositoDepartamento.trim(),
        deposito_ciudad: depositoCiudad.trim(),
        deposito_direccion: depositoDireccion.trim(),
        deposito_referencia: depositoReferencia.trim(),
        deposito_telefono: depositoTelefono.trim(),
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
          <span className={`onb-step ${paso === 1 ? 'active' : paso > 1 ? 'done' : ''}`}>1</span>
          <span className="onb-step-line" />
          <span className={`onb-step ${paso === 2 ? 'active' : paso > 2 ? 'done' : ''}`}>2</span>
          <span className="onb-step-line" />
          <span className={`onb-step ${paso === 3 ? 'active' : ''}`}>3</span>
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

            <label className="onb-campo">
              <span>Tu número de cédula</span>
              <input
                value={documento}
                onChange={e => setDocumento(e.target.value)}
                placeholder="Ej: 4123456"
                inputMode="numeric"
              />
              <small>Lo pide la pasarela de pago para poder cobrarte. No se muestra a tus clientes.</small>
            </label>

            <label className="onb-campo">
              <span>RUC <em>(opcional)</em></span>
              <input
                value={ruc}
                onChange={e => setRuc(e.target.value)}
                placeholder="Ej: 80012345-6"
              />
              <small>Solo si facturás. Podés dejarlo vacío.</small>
            </label>

            <button type="submit" className="land-btn-primary onb-btn-full" disabled={!nombreValido || !subdominioOk || !documentoValido}>
              Continuar <ArrowRight size={15} />
            </button>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={irAPaso3} className="onb-step-content">
            <h1>Dirección de tu depósito</h1>
            <p className="onb-subtitle">Cuando vendas un producto que administra Gesicomm, te lo vamos a enviar acá. No es la dirección de entrega de tus clientes.</p>

            <label className="onb-campo">
              <span>Departamento</span>
              <input
                autoFocus
                value={depositoDepartamento}
                onChange={e => setDepositoDepartamento(e.target.value)}
                placeholder="Ej: Central"
              />
            </label>

            <label className="onb-campo">
              <span>Ciudad</span>
              <input
                value={depositoCiudad}
                onChange={e => setDepositoCiudad(e.target.value)}
                placeholder="Ej: Luque"
              />
            </label>

            <label className="onb-campo">
              <span>Dirección</span>
              <input
                value={depositoDireccion}
                onChange={e => setDepositoDireccion(e.target.value)}
                placeholder="Calle, número, barrio"
              />
            </label>

            <label className="onb-campo">
              <span>Referencia <em>(opcional)</em></span>
              <input
                value={depositoReferencia}
                onChange={e => setDepositoReferencia(e.target.value)}
                placeholder="Ej: portón negro, casa de dos pisos"
              />
            </label>

            <label className="onb-campo">
              <span>Teléfono de contacto</span>
              <input
                value={depositoTelefono}
                onChange={e => setDepositoTelefono(e.target.value)}
                placeholder="Quien recibe el envío, si no sos vos"
              />
            </label>

            {error && <div className="land-alert-error">{error}</div>}

            <button type="submit" className="land-btn-primary onb-btn-full" disabled={!depositoValido}>
              Continuar <ArrowRight size={15} />
            </button>

            <button type="button" className="onb-btn-back" onClick={() => setPaso(1)}>
              <ArrowLeft size={14} /> Volver
            </button>
          </form>
        )}

        {paso === 3 && (
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

            <button type="button" className="onb-btn-back" onClick={() => setPaso(2)} disabled={creando}>
              <ArrowLeft size={14} /> Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
