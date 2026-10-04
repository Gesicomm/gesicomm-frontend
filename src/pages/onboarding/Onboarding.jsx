import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import { Check, X, Loader, ArrowLeft, Store, ImagePlus, Palette } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import { planesService } from '../../services/planesService';
import { onboardingTrackingService } from '../../services/onboardingTrackingService';
import { getCourierGeografia } from '../../services/courierApi';
import { useDebounce } from '../../hooks/useDebounce';
import '../vitrina/vitrina.css';
import '../tienda/tienda.css';
import './onboarding.css';
import Logo from '../../components/public/Logo';

const COLOR_INICIAL = {
  primario: '#10b981',
  secundario: '#059669',
  fondo: '#0a0a0a',
};

const PALETAS_MARCA = [
  { nombre: 'Verde fresco', primario: '#10b981', secundario: '#059669', fondo: '#0a0a0a' },
  { nombre: 'Azul confianza', primario: '#2563eb', secundario: '#0ea5e9', fondo: '#0f172a' },
  { nombre: 'Rosa boutique', primario: '#e11d48', secundario: '#f59e0b', fondo: '#111827' },
];

function slugifyLigero(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

/** "0981 123-456" -> "595981123456". Vacio si no queda un numero plausible. */
function normalizarWhatsapp(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').replace(/^0/, '595');
  return digitos.length >= 8 && digitos.length <= 15 ? digitos : '';
}

const normalizarBusqueda = (valor = '') => String(valor)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const filterSelectOption = (option, inputValue) => {
  const q = normalizarBusqueda(inputValue);
  if (!q) return true;
  return normalizarBusqueda(`${option.label} ${option.data?.departamento || ''}`).includes(q);
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'var(--color-canvas)',
    borderColor: state.isFocused ? 'var(--vit-accent)' : 'var(--vit-border)',
    boxShadow: state.isFocused ? '0 0 0 2px var(--vit-accent-soft)' : 'none',
    borderRadius: '9px',
    minHeight: '42px',
    color: 'var(--vit-text)',
    '&:hover': {
      borderColor: 'var(--vit-accent)',
    },
  }),
  menu: (base) => ({
    ...base,
    background: 'var(--color-canvas)',
    border: '1px solid var(--vit-border)',
    zIndex: 999,
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected ? 'var(--vit-accent)' : state.isFocused ? 'var(--vit-accent-soft)' : 'var(--color-canvas)',
    color: state.isSelected ? 'var(--color-primary-fg)' : 'var(--vit-text)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    '&:active': {
      background: 'var(--vit-accent)',
      color: 'var(--color-primary-fg)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--vit-text)',
    fontSize: '0.9rem',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--vit-text)',
    fontSize: '0.9rem',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--vit-muted-2)',
    fontSize: '0.9rem',
  }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [subdominioManual, setSubdominioManual] = useState('');
  const [subdominioEditado, setSubdominioEditado] = useState(false);
  // PagoPar ya suele pedir comprador.documento durante el pago. Solo lo
  // mostramos como fallback si la suscripcion no lo trajo precargado.
  const [documento, setDocumento] = useState('');
  const [documentoPrecargado, setDocumentoPrecargado] = useState(false);
  const [zonaDepartamento, setZonaDepartamento] = useState('');
  const [zonaCiudad, setZonaCiudad] = useState('');
  const [zonaDireccion, setZonaDireccion] = useState('');
  const [geografia, setGeografia] = useState([]);
  const [geografiaError, setGeografiaError] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [colorPrimario, setColorPrimario] = useState(COLOR_INICIAL.primario);
  const [colorSecundario, setColorSecundario] = useState(COLOR_INICIAL.secundario);
  const [colorFondo, setColorFondo] = useState(COLOR_INICIAL.fondo);
  const [logoArchivo, setLogoArchivo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);
  const ultimaConsulta = useRef(0);
  const inicioTrackeado = useRef(false);

  const subdominio = slugifyLigero(subdominioEditado ? subdominioManual : nombre);
  const subdominioDebounced = useDebounce(subdominio, 500);

  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

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
        const datosSuscripcion = estadoCuenta.suscripcion || {};
        if (datosSuscripcion.documento) {
          setDocumento(datosSuscripcion.documento);
          setDocumentoPrecargado(true);
        }
        if (datosSuscripcion.telefono) {
          setWhatsapp(prev => prev || datosSuscripcion.telefono);
        }

        const tienda = await tiendaService.obtener();
        if (!activo) return;
        if (tienda) navigate('/mi-dashboard', { replace: true });
        else if (!inicioTrackeado.current) {
          inicioTrackeado.current = true;
          onboardingTrackingService.registrarInicio({ paso: 'datos_tienda' }).catch(() => null);
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
    let activo = true;
    setGeografiaError(false);
    getCourierGeografia({ conCiudades: true })
      .then(data => {
        if (activo) setGeografia(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (activo) {
          setGeografia([]);
          setGeografiaError(true);
        }
      });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!subdominioDebounced || subdominioDebounced.length < 3) {
      setDisponibilidad(null);
      return;
    }
    const idConsulta = ++ultimaConsulta.current;
    setDisponibilidad('cargando');
    tiendaService.disponibilidadSubdominio(subdominioDebounced)
      .then(res => { if (idConsulta === ultimaConsulta.current) setDisponibilidad({ ...res, subdominio: subdominioDebounced }); })
      .catch(() => { if (idConsulta === ultimaConsulta.current) setDisponibilidad({ valido: false, disponible: false, motivo: 'Error al verificar.', subdominio: subdominioDebounced }); });
  }, [subdominioDebounced]);

  const optionsDepartamentos = useMemo(() => (
    geografia.map(d => ({
      value: d.nombre,
      label: d.nombre,
      id: d.id,
      pais_id: d.pais_id,
      ciudades: d.ciudades || [],
    }))
  ), [geografia]);

  const ciudadExisteEnDepartamento = (ciudad, departamento) => {
    if (!ciudad || !departamento) return true;
    if (geografia.length === 0) return true;
    const deptoNorm = normalizarBusqueda(departamento);
    const ciudadNorm = normalizarBusqueda(ciudad);
    return geografia.some(d => (
      normalizarBusqueda(d.nombre) === deptoNorm &&
      (d.ciudades || []).some(c => normalizarBusqueda(c.nombre) === ciudadNorm)
    ));
  };

  const optionsCiudades = useMemo(() => {
    const deptoFiltro = normalizarBusqueda(zonaDepartamento);
    const ciudades = new Map();
    geografia.forEach(depto => {
      if (deptoFiltro && normalizarBusqueda(depto.nombre) !== deptoFiltro) return;
      (depto.ciudades || []).forEach(ciudad => {
        const nombreCiudad = ciudad.nombre?.trim();
        if (!nombreCiudad) return;
        ciudades.set(`${depto.nombre.toLowerCase()}::${nombreCiudad.toLowerCase()}`, {
          value: nombreCiudad,
          label: `${nombreCiudad} - ${depto.nombre}`,
          departamento: depto.nombre,
          ciudad_id: ciudad.id,
          departamento_id: depto.id,
          pais_id: depto.pais_id,
        });
      });
    });
    return Array.from(ciudades.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [geografia, zonaDepartamento]);

  const nombreValido = nombre.trim().length >= 2;
  const documentoValido = documentoPrecargado || /^[0-9.\-]{5,20}$/.test(documento.trim());
  const whatsappValido = !!normalizarWhatsapp(whatsapp);
  const validandoSubdominio = subdominio.length >= 3 && (
    subdominio !== subdominioDebounced || !disponibilidad || disponibilidad === 'cargando' || disponibilidad.subdominio !== subdominio
  );
  const subdominioOk = !validandoSubdominio && disponibilidad && disponibilidad.valido && disponibilidad.disponible;

  function irAPaso2(e) {
    e.preventDefault();
    if (!nombreValido) return setError('Ingresá el nombre público de tu tienda.');
    if (!subdominio || subdominio.length < 3) return setError('La URL de tu tienda necesita al menos 3 letras o números.');
    if (validandoSubdominio) return setError('Esperá un momento mientras verificamos si la URL está disponible.');
    if (!subdominioOk) return setError(disponibilidad?.motivo || 'Esa URL no está disponible. Probá con otro prefijo.');
    if (!documentoValido) return setError('Ingresá una cédula válida: 5 a 20 caracteres, solo números, puntos o guiones.');
    if (!whatsappValido) return setError('Ingresá un WhatsApp válido con código de país o formato local, por ejemplo 0981 123 456.');
    setError(null);
    setPaso(2);
  }

  function handleDepartamentoChange(departamento) {
    setZonaDepartamento(departamento);
    if (zonaCiudad && !ciudadExisteEnDepartamento(zonaCiudad, departamento)) {
      setZonaCiudad('');
    }
  }

  function handleCiudadChange(ciudad, departamentoSeleccionado) {
    if (departamentoSeleccionado !== undefined) {
      setZonaDepartamento(departamentoSeleccionado || '');
    }
    setZonaCiudad(ciudad || '');
  }

  function irAPaso3(e) {
    e.preventDefault();
    if (zonaDepartamento.trim().length < 2) return setError('Elegí el departamento donde opera tu negocio.');
    if (zonaCiudad.trim().length < 2) return setError('Elegí la ciudad donde opera tu negocio.');
    setError(null);
    setPaso(3);
  }

  function aplicarPaleta(paleta) {
    setColorPrimario(paleta.primario);
    setColorSecundario(paleta.secundario);
    setColorFondo(paleta.fondo);
  }

  function seleccionarLogo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!archivo.type?.startsWith('image/')) {
      setError('El logo tiene que ser una imagen.');
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setError('El logo no puede superar 2 MB.');
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoArchivo(archivo);
    setLogoPreview(URL.createObjectURL(archivo));
    setError(null);
  }

  function quitarLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoArchivo(null);
    setLogoPreview('');
  }

  async function crearTienda(e) {
    e.preventDefault();

    setError(null);
    setCreando(true);
    try {
      sessionStorage.removeItem('gesicomm:onboardingTemplateSlug');
      sessionStorage.removeItem('gesicomm:prefilledLandingItems');

      await tiendaService.crear({
        nombre: nombre.trim(),
        documento: documento.trim(),
        deposito_departamento: zonaDepartamento.trim(),
        deposito_ciudad: zonaCiudad.trim(),
        deposito_direccion: zonaDireccion.trim(),
        deposito_referencia: '',
        deposito_telefono: normalizarWhatsapp(whatsapp),
        // wa.me y el backend piden solo digitos con codigo de pais.
        whatsapp: normalizarWhatsapp(whatsapp),
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
        color_fondo: colorFondo,
        subdominio,
        onboarding: true,
        onboarding_ficha: null,
        onboarding_accion: 'crear_tienda',
      });
      if (logoArchivo) {
        const formData = new FormData();
        formData.append('imagen', logoArchivo);
        await tiendaService.subirLogo(formData);
      }
      navigate('/mi-dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear tu tienda. Probá de nuevo.');
      setCreando(false);
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

        <div className="onb-steps" aria-label="Pasos del onboarding">
          <span className={`onb-step ${paso === 1 ? 'active' : 'done'}`}>1</span>
          <span className="onb-step-line" />
          <span className={`onb-step ${paso === 2 ? 'active' : paso > 2 ? 'done' : ''}`}>2</span>
          <span className="onb-step-line" />
          <span className={`onb-step ${paso === 3 ? 'active' : ''}`}>3</span>
        </div>

        {paso === 1 && (
          <form onSubmit={irAPaso2} className="onb-step-content">
            <h1>Tu tienda</h1>
            <p className="onb-subtitle">Completá los datos básicos para crearla.</p>

            <label className="onb-label">Nombre de tu tienda
              <input
                autoFocus
                value={nombre}
                onChange={e => { setNombre(e.target.value); setError(null); }}
                placeholder="Ej: Ropa Fina"
              />
            </label>

            <label className="onb-label">Prefijo de URL
              <div className="onb-url-input">
                <Store size={13} />
                <span>https://</span>
                <input
                  value={subdominio}
                  onChange={e => {
                    setSubdominioEditado(true);
                    setSubdominioManual(slugifyLigero(e.target.value));
                    setError(null);
                  }}
                  placeholder="tu-tienda"
                  aria-label="Prefijo URL de tu tienda"
                />
                <span>.gesicomm.com</span>
              </div>
            </label>

            <div className="tn-disponibilidad">
              {validandoSubdominio && <span className="tn-check cargando"><Loader size={13} className="spin-icon" /> Verificando...</span>}
              {!validandoSubdominio && disponibilidad && disponibilidad !== 'cargando' && disponibilidad.disponible && (
                <span className="tn-check ok"><Check size={13} /> Disponible</span>
              )}
              {!validandoSubdominio && disponibilidad && disponibilidad !== 'cargando' && !disponibilidad.disponible && (
                <span className="tn-check error"><X size={13} /> {disponibilidad.motivo || 'Ese nombre ya está en uso. Probá con otro.'}</span>
              )}
            </div>

            {error && <div className="land-alert-error">{error}</div>}

            {!documentoPrecargado && (
              <label className="onb-campo">
                <span>Cédula</span>
                <input
                  value={documento}
                  onChange={e => setDocumento(e.target.value)}
                  placeholder="Ej: 4123456"
                  inputMode="numeric"
                />
                <small>La necesitamos para habilitar cobros. No se muestra a tus clientes.</small>
              </label>
            )}

            <label className="onb-campo">
              <span>WhatsApp</span>
              <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="0981 123 456" inputMode="tel" />
            </label>

            <button type="submit" className="onb-primary-action" disabled={validandoSubdominio}>
              Continuar
            </button>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={irAPaso3} className="onb-step-content">
            <h1>¿Desde qué zona opera tu negocio?</h1>
            <p className="onb-subtitle">Esto nos ayuda a configurar correctamente entregas, cobertura y servicios disponibles.</p>

            <label className="onb-campo">
              <span>Departamento</span>
              <CreatableSelect
                isClearable
                placeholder="Buscar departamento..."
                styles={selectStyles}
                options={optionsDepartamentos}
                filterOption={filterSelectOption}
                noOptionsMessage={() => geografiaError ? 'No pudimos cargar el catálogo. Podés escribirlo manualmente.' : 'Sin coincidencias.'}
                formatCreateLabel={(inputValue) => `Usar "${inputValue}"`}
                value={zonaDepartamento ? (
                  optionsDepartamentos.find(o => normalizarBusqueda(o.value) === normalizarBusqueda(zonaDepartamento))
                  || { value: zonaDepartamento, label: zonaDepartamento }
                ) : null}
                onChange={(newValue) => handleDepartamentoChange(newValue ? newValue.value : '')}
                onCreateOption={(inputValue) => handleDepartamentoChange(inputValue)}
              />
            </label>

            <label className="onb-campo">
              <span>Ciudad</span>
              <CreatableSelect
                isClearable
                isDisabled={!zonaDepartamento}
                placeholder={zonaDepartamento ? 'Buscar ciudad del departamento...' : 'Primero elegí departamento...'}
                styles={selectStyles}
                options={optionsCiudades}
                filterOption={filterSelectOption}
                noOptionsMessage={() => geografiaError ? 'No pudimos cargar el catálogo. Podés escribir la ciudad manualmente.' : 'No encontramos ciudades para ese departamento.'}
                formatCreateLabel={(inputValue) => `Usar "${inputValue}"`}
                formatOptionLabel={(option, { context }) => (
                  context === 'menu' ? (
                    <div className="onb-geo-option">
                      <span>{option.value}</span>
                      <small>{option.departamento || 'Sin departamento'}</small>
                    </div>
                  ) : option.value
                )}
                value={zonaCiudad ? (
                  optionsCiudades.find(o => normalizarBusqueda(o.value) === normalizarBusqueda(zonaCiudad) && normalizarBusqueda(o.departamento || '') === normalizarBusqueda(zonaDepartamento))
                  || { value: zonaCiudad, label: zonaCiudad }
                ) : null}
                onChange={(newValue) => handleCiudadChange(newValue ? newValue.value : '', newValue?.departamento)}
                onCreateOption={(inputValue) => handleCiudadChange(inputValue)}
              />
            </label>

            <label className="onb-campo">
              <span>Ubicación de referencia <em>(opcional)</em></span>
              <input
                value={zonaDireccion}
                onChange={e => setZonaDireccion(e.target.value)}
                placeholder="Ej. Zona centro, Av. Principal 123"
                autoComplete="street-address"
              />
            </label>

            {error && <div className="land-alert-error">{error}</div>}

            <button type="submit" className="onb-primary-action">
              Continuar
            </button>

            <button type="button" className="onb-btn-back" onClick={() => setPaso(1)}>
              <ArrowLeft size={14} /> Volver
            </button>
          </form>
        )}

        {paso === 3 && (
          <form onSubmit={crearTienda} className="onb-step-content">
            <h1>Marca de tu tienda</h1>
            <p className="onb-subtitle">Estos colores y logo se usan como base para tus landings y páginas de producto. Podés cambiarlos después.</p>

            <div className="onb-brand-preview" style={{ '--onb-brand': colorPrimario, '--onb-accent': colorSecundario, '--onb-bg': colorFondo }}>
              <div className="onb-brand-preview-head">
                <span className="onb-brand-logo">
                  {logoPreview ? <img src={logoPreview} alt="Logo seleccionado" /> : <Store size={18} />}
                </span>
                <strong>{nombre || 'Tu tienda'}</strong>
              </div>
              <div className="onb-brand-preview-body">
                <span>Producto destacado</span>
                <button type="button">Comprar ahora</button>
              </div>
            </div>

            <label className="onb-logo-picker">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={seleccionarLogo} />
              <ImagePlus size={16} />
              <span>{logoArchivo ? logoArchivo.name : 'Subir logo (opcional)'}</span>
            </label>
            {logoArchivo && (
              <button type="button" className="onb-btn-back" onClick={quitarLogo} disabled={creando}>
                Quitar logo
              </button>
            )}

            <div className="onb-palette-presets" aria-label="Paletas sugeridas">
              {PALETAS_MARCA.map(paleta => (
                <button key={paleta.nombre} type="button" onClick={() => aplicarPaleta(paleta)} disabled={creando}>
                  <span style={{ background: paleta.primario }} />
                  <span style={{ background: paleta.secundario }} />
                  <span style={{ background: paleta.fondo }} />
                  {paleta.nombre}
                </button>
              ))}
            </div>

            <div className="onb-color-grid">
              <label className="onb-color-field">
                <span><Palette size={13} /> Primario</span>
                <input type="color" value={colorPrimario} onChange={e => setColorPrimario(e.target.value)} />
              </label>
              <label className="onb-color-field">
                <span>Secundario</span>
                <input type="color" value={colorSecundario} onChange={e => setColorSecundario(e.target.value)} />
              </label>
              <label className="onb-color-field">
                <span>Fondo</span>
                <input type="color" value={colorFondo} onChange={e => setColorFondo(e.target.value)} />
              </label>
            </div>

            {error && <div className="land-alert-error">{error}</div>}

            <button type="submit" className="onb-primary-action" disabled={creando}>
              {creando && <Loader size={15} className="spin-icon" />}
              Crear mi tienda
            </button>

            <button type="button" className="onb-btn-secondary" onClick={crearTienda} disabled={creando}>
              Saltar y definir después
            </button>

            <button type="button" className="onb-btn-back" onClick={() => setPaso(2)} disabled={creando}>
              <ArrowLeft size={14} /> Volver
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
