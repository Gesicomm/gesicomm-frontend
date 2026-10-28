import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ChevronDown, CirclePlay, Film, Grip, Maximize2, Minus, Play, X } from 'lucide-react';
import useTutorialesSistema from '../hooks/useTutorialesSistema';
import { MODULOS_ACCESO, moduloDeRuta } from '../utils/accesos';
import { analizarVideo } from '../pages/landing-simple/templates/video';
import './tutorialDock.css';

const TutorialContext = createContext(null);
const SECCIONES_NEGOCIO = {
  tienda: 'Tienda', contacto: 'Contacto', pasarelas: 'Pagos', economica: 'Costos',
  analitica: 'Analítica', raha: 'Conexión a proveedor',
};

// Cada página ubica esta acción en su encabezado, sin agregar un banner global.
export function TutorialHeaderAction() {
  const tutorial = useContext(TutorialContext);
  if (!tutorial) return null;
  return <button type="button" className="gc-tutorial-header-action"
    onClick={tutorial.abrir} aria-label={`Ver tutorial de ${tutorial.nombre}`}
    aria-expanded={tutorial.estado === 'open'} aria-controls={tutorial.estado !== 'closed' ? tutorial.panelId : undefined}>
    <CirclePlay size={18} aria-hidden="true" /><span>Ver tutorial</span><ChevronDown size={15} aria-hidden="true" />
  </button>;
}

export default function TutorialDock({ children }) {
  const location = useLocation();
  const modulo = MODULOS_ACCESO.find(item => item.clave === moduloDeRuta(location.pathname));
  // El editor de E-commerce conserva los tutoriales de su vista previa.
  if (!modulo || /^\/(?:mi-landing|landing)\/[^/]+/.test(location.pathname)) return children;
  return <TutorialProvider modulo={modulo} search={location.search}>{children}</TutorialProvider>;
}

function TutorialProvider({ modulo, search, children }) {
  const videos = useTutorialesSistema();
  const [estado, setEstado] = useState('closed');
  const [reproduciendo, setReproduciendo] = useState(false);
  const [posicion, setPosicion] = useState(null);
  const panelRef = useRef(null);
  const origenRef = useRef(null);
  const arrastreRef = useRef(null);
  const panelId = useId();
  const tabSolicitada = new URLSearchParams(search).get('tab');
  const tab = tabSolicitada === 'speedbox' ? 'raha' : tabSolicitada;
  const seccion = modulo.clave === 'negocio' ? (SECCIONES_NEGOCIO[tab] ? tab : 'tienda') : null;
  const nombre = seccion ? SECCIONES_NEGOCIO[seccion] : modulo.nombre;
  const url = seccion ? videos[`mi-negocio.${seccion}`] || videos['modulo.negocio'] : videos[`modulo.${modulo.clave}`];
  const video = analizarVideo(url);
  const minimizado = estado === 'minimized';

  useEffect(() => { setReproduciendo(false); }, [url]);

  const limitar = (x, y) => {
    const rect = panelRef.current?.getBoundingClientRect();
    return {
      x: Math.max(12, Math.min(x, (document.documentElement.clientWidth || window.innerWidth) - (rect?.width || 400) - 12)),
      y: Math.max(12, Math.min(y, (document.documentElement.clientHeight || window.innerHeight) - (rect?.height || 300) - 12)),
    };
  };
  useEffect(() => {
    if (estado === 'closed') return undefined;
    const ajustar = () => setPosicion(actual => {
      if (!actual) return actual;
      const siguiente = limitar(actual.x, actual.y);
      return siguiente.x === actual.x && siguiente.y === actual.y ? actual : siguiente;
    });
    ajustar();
    window.addEventListener('resize', ajustar);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(ajustar);
    if (panelRef.current) observer?.observe(panelRef.current);
    return () => { window.removeEventListener('resize', ajustar); observer?.disconnect(); };
  }, [estado]);

  const cerrar = () => {
    setEstado('closed'); setReproduciendo(false); arrastreRef.current = null;
    origenRef.current?.focus({ preventScroll: true });
  };
  const abrir = event => {
    origenRef.current = event.currentTarget;
    setEstado('open');
    requestAnimationFrame(() => panelRef.current?.querySelector('[data-tutorial-toggle]')?.focus({ preventScroll: true }));
  };
  const alternarTamano = () => {
    setEstado(minimizado ? 'open' : 'minimized');
    requestAnimationFrame(() => panelRef.current?.querySelector('[data-tutorial-toggle]')?.focus({ preventScroll: true }));
  };
  const iniciarArrastre = event => {
    if (event.button !== 0) return;
    const rect = panelRef.current.getBoundingClientRect();
    arrastreRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const mover = event => {
    if (arrastreRef.current) setPosicion(limitar(event.clientX - arrastreRef.current.x, event.clientY - arrastreRef.current.y));
  };
  const moverConTeclado = event => {
    const direcciones = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direccion = direcciones[event.key];
    if (!direccion) return;
    event.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    const paso = event.shiftKey ? 48 : 16;
    setPosicion(limitar(rect.left + direccion[0] * paso, rect.top + direccion[1] * paso));
  };

  return <TutorialContext.Provider value={{ nombre, estado, panelId, abrir }}>
    {children}
    {estado !== 'closed' && createPortal(<section ref={panelRef} id={panelId}
      className={`gc-tutorial-player gc-panel${minimizado ? ' is-minimized' : ''}`}
      style={posicion ? { left: posicion.x, top: posicion.y, right: 'auto', bottom: 'auto' } : undefined}
      aria-label={`Tutorial de ${nombre}`}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); cerrar(); } }}>
      <header className="gc-tutorial-player-head">
        <button type="button" className="gc-tutorial-move" aria-label="Mover tutorial" title="Arrastrá para mover, o usá las flechas del teclado"
          onPointerDown={iniciarArrastre} onPointerMove={mover} onPointerUp={() => { arrastreRef.current = null; }}
          onPointerCancel={() => { arrastreRef.current = null; }} onLostPointerCapture={() => { arrastreRef.current = null; }} onKeyDown={moverConTeclado}>
          <Grip size={18} aria-hidden="true" />
        </button>
        <h2>Tutorial · {nombre}</h2>
        <button type="button" data-tutorial-toggle onClick={alternarTamano} aria-label={minimizado ? 'Restaurar tutorial' : 'Minimizar tutorial'}>
          {minimizado ? <Maximize2 size={17} aria-hidden="true" /> : <Minus size={18} aria-hidden="true" />}
        </button>
        <button type="button" onClick={cerrar} aria-label="Cerrar tutorial"><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="gc-tutorial-player-content" hidden={minimizado}>
        {video?.incrustable ? reproduciendo
          ? <iframe key={video.embed} src={`${video.embed}${video.embed.includes('?') ? '&' : '?'}autoplay=1`} title={`Video tutorial de ${nombre}`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          : <button type="button" className="gc-tutorial-play" onClick={() => setReproduciendo(true)} aria-label={`Reproducir tutorial de ${nombre}`}>
            {video.miniatura && <img src={video.miniatura} alt="" />}
            <span><Play size={24} fill="currentColor" aria-hidden="true" /></span>
          </button>
          : <div className="gc-tutorial-empty"><Film size={27} aria-hidden="true" /><span>Acá va el video explicativo</span><small>Video próximamente</small></div>}
        <p>{video?.incrustable ? `Guía de ${nombre}` : 'El tutorial aparecerá acá cuando esté disponible.'}</p>
      </div>
    </section>, document.body)}
  </TutorialContext.Provider>;
}
