import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Megaphone, FileText, Upload, Link2, Globe, RefreshCw, Loader2,
} from 'lucide-react';
import { api } from '../utils/api';
import { metaReportesService } from '../services/metaReportesService';
import { periodoInicial, filtrosDeFecha, formatNum } from './ads/adsShared';
import { SelectorPeriodo } from './ads/adsUI';
import AdsResumen from './ads/AdsResumen';
import AdsCampanas from './ads/AdsCampanas';
import AdsReportes from './ads/AdsReportes';
import AdsImportar from './ads/AdsImportar';
import AdsRelaciones from './ads/AdsRelaciones';
import AdsEnVivo from './ads/AdsEnVivo';

/**
 * Ads & Campañas — shell de navegación.
 *
 * La pantalla dejó de ser "una página con todo apilado" y pasó a ser un
 * centro con vistas especializadas: el Resumen responde "cómo vamos", y
 * las tablas grandes viven dos niveles adentro, en Reportes.
 *
 * Los datos compartidos (campañas, período, resumen) los tiene este shell
 * y los baja por props: así las cinco vistas no vuelven a pedir la lista
 * de campañas cada vez que se cambia de pestaña.
 */

// Métricas en vivo contra la Graph API de Meta. Apagado: Gesicomm todavía
// no es partner de Meta, así que la app no puede pedir los permisos de
// Marketing API que esa vista necesita. El código sigue en
// ads/AdsEnVivo.jsx — prender esto lo devuelve como una sección más.
const MOSTRAR_EN_VIVO = false;

const SECCIONES = [
  { id: 'resumen', label: 'Resumen', icono: LayoutDashboard, conPeriodo: true },
  { id: 'campanas', label: 'Campañas', icono: Megaphone, conPeriodo: true },
  { id: 'reportes', label: 'Reportes', icono: FileText },
  { id: 'importar', label: 'Importar', icono: Upload },
  { id: 'relaciones', label: 'Relaciones', icono: Link2 },
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
    return 'resumen';
  });

  const [periodo, setPeriodo] = useState(periodoInicial);
  const [tiendas, setTiendas] = useState([]);

  const [campanas, setCampanas] = useState([]);
  const [cargandoCampanas, setCargandoCampanas] = useState(true);

  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);

  // Se incrementa después de importar o de relacionar: las vistas que
  // traen sus propios datos (Reportes, Relaciones) lo miran para recargar.
  const [refresco, setRefresco] = useState(0);

  const irA = useCallback((id) => {
    if (!seccionValida(id)) return;
    setSeccion(id);
    try { sessionStorage.setItem(CLAVE_SESION, id); } catch { /* modo privado */ }
  }, []);

  // Las tiendas solo se usan para el alta de campaña y para etiquetar la
  // importación. Si falla, no bloquea nada: el resto de la sección no
  // depende de tener una cuenta de Meta conectada.
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

  const cargarResumen = useCallback(() => {
    setCargandoResumen(true);
    return metaReportesService.resumen(filtrosDeFecha(periodo))
      .then(setResumen)
      .catch(() => setResumen(null))
      .finally(() => setCargandoResumen(false));
  }, [periodo]);

  useEffect(() => { cargarCampanas(); }, [cargarCampanas]);
  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  const refrescarTodo = useCallback(() => {
    cargarCampanas();
    cargarResumen();
    setRefresco((n) => n + 1);
  }, [cargarCampanas, cargarResumen]);

  const seccionActual = SECCIONES.find((s) => s.id === seccion) || SECCIONES[0];
  const pendientes = resumen?.relaciones_pendientes || 0;

  return (
    <div className="settings-container" style={{ maxWidth: '100%' }}>
      <div className="settings-header flex flex-wrap items-start justify-between gap-3">
        <h1>Ads &amp; Campañas</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={refrescarTodo}
            disabled={cargandoResumen || cargandoCampanas}
            title="Volver a traer los datos"
          >
            {cargandoResumen || cargandoCampanas
              ? <Loader2 size={15} className="animate-spin" style={{ marginRight: '0.35rem' }} />
              : <RefreshCw size={15} style={{ marginRight: '0.35rem' }} />}
            Actualizar
          </button>
          <button type="button" className="btn-primary" onClick={() => irA('importar')}>
            <Upload size={15} style={{ marginRight: '0.35rem' }} /> Importar datos
          </button>
        </div>
      </div>

      {/* Navegación */}
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
              {s.id === 'relaciones' && pendientes > 0 && (
                <span className="rounded-full bg-warning/15 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-warning">
                  {formatNum(pendientes)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Período — solo donde cambia lo que se ve */}
      {seccionActual.conPeriodo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />
        </div>
      )}

      {seccion === 'resumen' && (
        <AdsResumen
          periodo={periodo}
          resumen={resumen}
          cargando={cargandoResumen}
          irA={irA}
          onImportar={() => irA('importar')}
        />
      )}

      {seccion === 'campanas' && (
        <AdsCampanas
          campanas={campanas}
          cargando={cargandoCampanas}
          periodo={periodo}
          resumen={resumen}
          tiendas={tiendas}
          onCambio={refrescarTodo}
          irA={irA}
        />
      )}

      {seccion === 'reportes' && (
        <AdsReportes irA={irA} onImportar={() => irA('importar')} refrescoExterno={refresco} />
      )}

      {seccion === 'importar' && (
        <AdsImportar tiendas={tiendas} campanas={campanas} onImportado={refrescarTodo} irA={irA} />
      )}

      {seccion === 'relaciones' && (
        <AdsRelaciones campanas={campanas} onCambio={refrescarTodo} refrescoExterno={refresco} />
      )}

      {seccion === 'vivo' && <AdsEnVivo />}
    </div>
  );
}
