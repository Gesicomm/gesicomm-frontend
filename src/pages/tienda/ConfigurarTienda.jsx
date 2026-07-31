import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Check, X, Loader, AlertCircle, Globe, Sparkles, Crown } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';
import { useDebounce } from '../../hooks/useDebounce';
import DominioPropio from './DominioPropio';
import '../vitrina/vitrina.css';
import '../landing/landing.css';
import './tienda.css';

function slugifyLigero(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

const PLANES = [
  { id: 'free', icono: Sparkles, titulo: 'Free' },
  { id: 'pago', icono: Crown, titulo: 'Pago' },
];

const FORM_INICIAL = {
  nombre: '',
  color_primario: '#10b981',
  color_secundario: '#059669',
  color_fondo: '#0a0a0a',
  whatsapp: '',
  telefono: '',
  mensaje_contacto: 'Hola, me interesa {producto}',
  plan: 'free',
};

// La creación de la tienda vive en /onboarding (nombre + plan, primer paso
// de una cuenta nueva) — a esta pantalla solo se llega ya con una tienda
// creada (lo garantiza el guard RequireTienda), así que acá es siempre
// edición.
export default function ConfigurarTienda() {
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [ok, setOk] = useState(false);

  const [disponibilidad, setDisponibilidad] = useState(null); // { valido, disponible, motivo } | null | 'cargando'
  const ultimaConsulta = useRef(0);

  // El subdominio no es un campo aparte: es siempre el nombre de la tienda
  // slugificado. Si no está disponible, la usuaria cambia el nombre, no un
  // campo de URL independiente. Cambiar el nombre de una tienda ya
  // publicada cambia su URL pública — cualquier link ya compartido
  // (WhatsApp, anuncios) deja de funcionar. Se avisa en el formulario
  // antes de guardar.
  const subdominioDerivado = slugifyLigero(form.nombre);
  const subdominioCambia = !!tienda && subdominioDerivado !== tienda.subdominio;
  const subdominioDebounced = useDebounce(subdominioDerivado, 500);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await tiendaService.obtener();
      setTienda(data);
      if (data) {
        setForm({
          nombre: data.nombre || '',
          color_primario: data.color_primario || '#10b981',
          color_secundario: data.color_secundario || '#059669',
          color_fondo: data.color_fondo || '#0a0a0a',
          whatsapp: data.whatsapp || '',
          telefono: data.telefono || '',
          mensaje_contacto: data.mensaje_contacto || FORM_INICIAL.mensaje_contacto,
          plan: data.plan || 'free',
        });
      }
    } catch (err) {
      setError('No se pudo cargar la información de tu tienda.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Chequeo de disponibilidad en vivo — solo hace falta consultar cuando
  // el subdominio derivado del nombre difiere del que ya tiene guardado
  // (si no cambió, no hay nada que validar).
  useEffect(() => {
    if (!subdominioCambia || !subdominioDebounced || subdominioDebounced.length < 3) {
      setDisponibilidad(null);
      return;
    }
    const idConsulta = ++ultimaConsulta.current;
    setDisponibilidad('cargando');
    tiendaService.disponibilidadSubdominio(subdominioDebounced)
      .then(res => { if (idConsulta === ultimaConsulta.current) setDisponibilidad(res); })
      .catch(() => { if (idConsulta === ultimaConsulta.current) setDisponibilidad({ valido: false, disponible: false, motivo: 'Error al verificar.' }); });
  }, [subdominioDebounced, subdominioCambia]);

  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setErroresValidacion([]);
    setOk(false);

    if (!form.nombre.trim()) return setError('El nombre de tu tienda es obligatorio.');
    if (subdominioCambia) {
      if (!subdominioDerivado || subdominioDerivado.length < 3) {
        return setError('Ese nombre no alcanza para generar una URL válida — probá con un nombre más largo, con letras o números.');
      }
      if (disponibilidad && (disponibilidad.valido === false || disponibilidad.disponible === false)) {
        return setError(disponibilidad.motivo || 'Ese nombre ya está en uso por otra tienda — probá con otro.');
      }
    }

    setGuardando(true);
    try {
      const actualizada = await tiendaService.actualizar({ ...form, subdominio: subdominioDerivado });
      setTienda(actualizada);
      setOk(true);
      setTimeout(() => setOk(false), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la tienda.');
      setErroresValidacion(err.response?.data?.errores || []);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className="vit-page"><div className="vit-empty"><Loader size={22} className="spin-icon" /><p>Cargando...</p></div></div>;
  }

  const urlPreview = `https://${subdominioDerivado || '...'}.gesicomm.com`;

  return (
    <div className="vit-page">
      <div className="vit-header">
        <div>
          <h1 className="vit-title">Mi tienda</h1>
          <p className="vit-subtitle">Nombre, colores, contacto y URL pública de tu tienda.</p>
        </div>
      </div>

      {error && (
        <div className="land-alert-error"><AlertCircle size={14} /> {error}
          {erroresValidacion.length > 0 && <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
      )}

      <div className="land-editor-grid">
        {/* DominioPropio tiene su propio <form> (guarda su dominio por
            separado, con su propio submit) — no puede ir anidado dentro de
            este. display:contents en land-editor-grid-form hace que el
            <form> no altere el layout de grid: sus hijos siguen siendo
            grid items directos, igual que si no existiera el wrapper. */}
        <form onSubmit={handleSubmit} className="land-editor-grid-form">
          <div className="land-section">
            <h2>Datos generales</h2>
            <label>Nombre de tu tienda
              <input value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Ropa Fina" required />
            </label>

            <label>Tu URL
              <div className="tn-url-readonly">
                <Globe size={13} /> {urlPreview}
              </div>
            </label>
            {subdominioCambia && (
              <div className="tn-disponibilidad">
                {disponibilidad === 'cargando' && <span className="tn-check cargando"><Loader size={13} className="spin-icon" /> Verificando...</span>}
                {disponibilidad && disponibilidad !== 'cargando' && disponibilidad.disponible && (
                  <span className="tn-check ok"><Check size={13} /> Disponible</span>
                )}
                {disponibilidad && disponibilidad !== 'cargando' && !disponibilidad.disponible && (
                  <span className="tn-check error"><X size={13} /> {disponibilidad.motivo || 'Ese nombre ya está en uso — probá con otro.'}</span>
                )}
              </div>
            )}
            {subdominioCambia && (
              <p className="tn-warning">
                <AlertCircle size={13} /> Tu URL va a cambiar de <strong>{tienda.subdominio}</strong> a <strong>{subdominioDerivado || '...'}</strong> al guardar.
                Cualquier link que ya hayas compartido con la URL vieja va a dejar de funcionar.
              </p>
            )}
          </div>

          <div className="land-section">
            <h2>Plan</h2>
            <div className="tn-plan-row">
              {PLANES.map(p => {
                const Icono = p.icono;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`tn-plan-chip ${form.plan === p.id ? 'selected' : ''}`}
                    onClick={() => handleChange('plan', p.id)}
                  >
                    <Icono size={15} /> {p.titulo}
                  </button>
                );
              })}
            </div>
            {form.plan === 'pago' && <p className="vit-subtitle">Un asesor te va a contactar para activar los beneficios del plan pago.</p>}
          </div>

          <div className="land-section">
            <h2>Colores</h2>
            <div className="land-color-row">
              <label>Primario<input type="color" value={form.color_primario} onChange={e => handleChange('color_primario', e.target.value)} /></label>
              <label>Secundario<input type="color" value={form.color_secundario} onChange={e => handleChange('color_secundario', e.target.value)} /></label>
              <label>Fondo<input type="color" value={form.color_fondo} onChange={e => handleChange('color_fondo', e.target.value)} /></label>
            </div>
            <p className="vit-subtitle">Estos colores son el default de todas tus landings.</p>
          </div>

          <div className="land-section">
            <h2>Contacto</h2>
            <label>WhatsApp
              <input value={form.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} placeholder="Ej: 595981234567 (código de país + número, sin +)" />
            </label>
            <label>Teléfono (opcional)
              <input value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} />
            </label>
            <label>Mensaje de contacto
              <input value={form.mensaje_contacto} onChange={e => handleChange('mensaje_contacto', e.target.value)} placeholder="Usá {producto} para insertar el nombre" />
            </label>
          </div>

          <div className="land-editor-footer">
            {ok && <span className="tn-saved"><Check size={14} /> Guardado</span>}
            <button type="submit" className="land-btn-primary" disabled={guardando}>
              {guardando ? <Loader size={15} className="spin-icon" /> : <Save size={15} />}
              Guardar cambios
            </button>
          </div>
        </form>

        <div className="land-section">
          <h2><Globe size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />Dominio propio</h2>
          <DominioPropio tienda={tienda} onActualizado={cargar} />
        </div>
      </div>
    </div>
  );
}
