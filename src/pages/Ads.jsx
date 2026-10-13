import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Megaphone, Globe, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { metaReportesService } from '../services/metaReportesService';
import AdsCampanas from './ads/AdsCampanas';
import AdsEnVivo from './ads/AdsEnVivo';

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
  { id: 'campanas', label: 'Campañas', icono: Megaphone },
  ...(MOSTRAR_EN_VIVO ? [{ id: 'vivo', label: 'En vivo (Meta)', icono: Globe }] : []),
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
    return metaReportesService.listarCampanas()
      .then((res) => setCampanas(Array.isArray(res) ? res : []))
      .catch(() => setCampanas([]))
      .finally(() => setCargandoCampanas(false));
  }, []);

  useEffect(() => { cargarCampanas(); }, [cargarCampanas]);

  return (
    <div className="settings-container" style={{ maxWidth: '100%' }}>
      <div className="settings-header flex flex-wrap items-start justify-between gap-3">
        <h1>Ads &amp; Campañas</h1>
        {seccion === 'campanas' && (
          <button
            type="button"
            className="btn-secondary"
            onClick={cargarCampanas}
            disabled={cargandoCampanas}
            title="Volver a traer los datos"
          >
            {cargandoCampanas
              ? <Loader2 size={15} className="animate-spin" style={{ marginRight: '0.35rem' }} />
              : <RefreshCw size={15} style={{ marginRight: '0.35rem' }} />}
            Actualizar
          </button>
        )}
      </div>

      {/* Navegación — con una sola sección no hay entre qué elegir */}
      {SECCIONES.length > 1 && (
        <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
          {SECCIONES.map((s) => {
            const activa = s.id === seccion;
            return (
              <button
                key={s.id}
                type="button"
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

      {seccion === 'campanas' && (
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
