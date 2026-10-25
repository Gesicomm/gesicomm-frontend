import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Megaphone, Globe } from 'lucide-react';
import { api } from '../utils/api';
import { metaReportesService } from '../services/metaReportesService';
import AdsCampanas from './ads/AdsCampanas';
import AdsEnVivo from './ads/AdsEnVivo';
import './ads/publicidad.css';

/**
 * Ads & Campañas — shell de navegación.
 *
 * La sección es la lista de campañas: se crean acá, se copia el nombre en
 * Meta Ads Manager y se les carga a mano cuánto se gastó en cada rango de
 * fechas. Ya no se importan reportes CSV.
 *
 * La lista de campañas la tiene este shell y la baja por props.
 */

// Métricas en vivo contra la Graph API de Meta. Para apagarla: Gesicomm
// todavía no es partner de Meta, así que la app no puede pedir los permisos
// de Marketing API que esa vista necesita. El código está en
// ads/AdsEnVivo.jsx — este flag la saca o la devuelve como una sección más.
const MOSTRAR_EN_VIVO = true;

const SECCIONES = [
  { id: 'campanas', label: 'Mis campañas', icono: Megaphone },
  ...(MOSTRAR_EN_VIVO ? [{ id: 'vivo', label: 'Métricas de Meta', icono: Globe }] : []),
];

// La sección activa NO viaja por la URL (en Gesicomm el estado de UI nunca
// va en query params): entra por router state y se recuerda en la sesión.
const CLAVE_SESION = 'ads:seccion';

const seccionValida = (id) => SECCIONES.some((s) => s.id === id);

export default function Ads() {
  const location = useLocation();

  const [seccion, setSeccion] = useState(() => {
    const desdeRouter = location.state?.adsSeccion;
    if (seccionValida(desdeRouter)) return desdeRouter;
    try {
      const guardada = sessionStorage.getItem(CLAVE_SESION);
      if (seccionValida(guardada)) return guardada;
    } catch { /* modo privado */ }
    return 'campanas';
  });

  const [errorCampanas, setErrorCampanas] = useState(null);
  const [tiendas, setTiendas] = useState([]);
  const [campanas, setCampanas] = useState([]);
  const [cargandoCampanas, setCargandoCampanas] = useState(true);

  const irA = useCallback((id) => {
    if (!seccionValida(id)) return;
    setSeccion(id);
    try { sessionStorage.setItem(CLAVE_SESION, id); } catch { /* modo privado */ }
  }, []);

  // Las tiendas solo se usan para el alta de campaña. Si falla, no bloquea
  // nada: la sección no depende de tener una cuenta de Meta conectada.
  useEffect(() => {
    api.get('/api/meta/stores')
      .then((res) => setTiendas(res.tiendas || []))
      .catch(() => setTiendas([]));
  }, []);

  const cargarCampanas = useCallback(() => {
    setCargandoCampanas(true);
    setErrorCampanas(null);
    return metaReportesService.listarCampanas()
      .then((res) => setCampanas(Array.isArray(res) ? res : []))
      .catch(() => setErrorCampanas('No pudimos cargar tus campañas. Reintentá para ver los datos actualizados.'))
      .finally(() => setCargandoCampanas(false));
  }, []);

  useEffect(() => { cargarCampanas(); }, [cargarCampanas]);

  return (
    <div className="ads-page settings-container" style={{ maxWidth: '100%' }}>
      <div className="settings-header flex flex-wrap items-start justify-between gap-3">
        <div><h1>Publicidad</h1><p>Organizá tus campañas de Meta y registrá cuánto invertiste en cada una.</p></div>
      </div>

      {/* Navegación — con una sola sección no hay entre qué elegir */}
      {SECCIONES.length > 1 && (
        <nav className="ads-tabs" aria-label="Secciones de publicidad">
          {SECCIONES.map((s) => {
            const activa = s.id === seccion;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={activa ? 'page' : undefined}
                onClick={() => irA(s.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 border-solid bg-transparent px-3.5 py-2.5 text-[0.88rem] transition-colors ${
                  activa
                    ? 'border-primary font-semibold text-fg'
                    : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                <s.icono size={15} /> {s.label}
              </button>
            );
          })}
        </nav>
      )}

      {errorCampanas && seccion === 'campanas' && <div role="alert" className="ads-error"><p>{errorCampanas}</p><button type="button" className="btn-secondary" onClick={cargarCampanas} disabled={cargandoCampanas}>Reintentar</button></div>}
      {seccion === 'campanas' && (!errorCampanas || campanas.length > 0) && (
        <AdsCampanas
          campanas={campanas}
          cargando={cargandoCampanas}
          tiendas={tiendas}
          onCambio={cargarCampanas}
        />
      )}

      {seccion === 'vivo' && <AdsEnVivo />}
    </div>
  );
}
