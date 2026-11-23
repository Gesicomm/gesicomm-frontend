import { useEffect, useRef, useState } from 'react';
import { useTema } from '../components/public/ThemeProvider';

const recurso = '/director-recursos/director.html';

/* El Director se sirve desde el servidor (/opt/gesicom-director) con su propio
   gesicom.css. Acá solo se reemplazan sus colores por la paleta verde de Gesicom
   (Negro #0b0f0e, Acento #22b573, Blanco #fafcfb); la estructura no cambia.
   Los colores de cada estilo de video (muestras y maqueta) quedan como están. */
const PALETA_VERDE = `
:root{--noche:#0b0f0e;--marfil:#fafcfb;--ice:#53d99b;--ambar:#22b573;--bg:#fafcfb;--panel:#fff;--hundido:#eef2f0;--tinta:#0b0f0e;--suave:#435b4d;--linea:#d5e2da;--borde-control:#9db6a7;--acento:#22b573;--acento-tinta:#087d4b;--monitor:#0b0f0e;--foco:#087d4b;--ok:#047857;--aviso:#946000}
:root[data-theme="dark"]{--bg:#141916;--panel:#1b221e;--hundido:#232b26;--tinta:#f0f3f0;--suave:#b2bdb5;--linea:#39473e;--borde-control:#54645a;--acento:#25b978;--acento-tinta:#57d99e;--monitor:#0b0f0e;--foco:#57d99e;--ok:#49d5a0;--aviso:#d9ac51}
.paso-btn[aria-selected="true"] .num{background:rgba(11,15,14,.12)}
.btn.primario:hover{background:#36c88a;border-color:#36c88a}
.sello-pro,.division span{background:#22b573;color:#0b0f0e}
.division{border-top-color:#22b573}
.division.vertical{border-left-color:#22b573}
.difu-rect{background:rgba(34,181,115,.18)}
.arbol .c{color:var(--acento-tinta)}
.rec::before{background:#22b573}
.capa .rotulo{background:rgba(34,181,115,.9);color:#0b0f0e}
.zonas div{background:repeating-linear-gradient(45deg,rgba(34,181,115,.18) 0,rgba(34,181,115,.18) 14px,rgba(34,181,115,.05) 14px,rgba(34,181,115,.05) 28px);border-color:rgba(34,181,115,.7)}
.escena .capa [data-mov="titulo"]:hover>*,.escena.moviendo .capa [data-mov="titulo"]>*{outline-color:rgba(34,181,115,.55)}
`;

// Va al final del documento para ganarle a gesicom.css, que el Director carga al final del body.
function aplicarPaletaVerde(marco) {
  const doc = marco?.contentDocument;
  if (!doc?.body) return;
  let estilo = doc.getElementById('gesicom-paleta-verde');
  if (!estilo) {
    estilo = doc.createElement('style');
    estilo.id = 'gesicom-paleta-verde';
    estilo.textContent = PALETA_VERDE;
  }
  doc.body.appendChild(estilo);
}

export default function TutorEdicion() {
  const { tema } = useTema();
  const marco = useRef(null);
  const [estado, setEstado] = useState('cargando');
  const temaInicial = useRef(tema);

  useEffect(() => {
    const comprobacion = new AbortController();
    fetch(recurso, { method: 'HEAD', credentials: 'same-origin', signal: comprobacion.signal })
      .then((res) => setEstado(res.ok && res.headers.get('X-Gesicom-Director') === '1' ? 'listo' : 'error'))
      .catch((error) => { if (error.name !== 'AbortError') setEstado('error'); });
    return () => comprobacion.abort();
  }, []);

  const sincronizarTema = () => {
    marco.current?.contentWindow?.postMessage({ tipo: 'gesicom-tema', tema }, window.location.origin);
  };

  useEffect(sincronizarTema, [tema]);

  if (estado !== 'listo') {
    return (
      <section className="rounded-xl border border-border bg-surface p-6">
        <h1>Tutor de edición con IA</h1>
        {estado === 'cargando'
          ? <p role="status">Abriendo el Director de Edición…</p>
          : <p role="alert">El Director de Edición no está disponible para esta sesión.</p>}
      </section>
    );
  }

  return (
    <iframe
      ref={marco}
      src={`${recurso}?tema=${temaInicial.current}`}
      onLoad={() => { aplicarPaletaVerde(marco.current); sincronizarTema(); }}
      title="Tutor de edición con IA · Director de Edición"
      allow="clipboard-write"
      referrerPolicy="no-referrer"
      className="block w-full rounded-xl border border-border bg-canvas"
      style={{ height: 'calc(100dvh - 112px)', minHeight: '420px' }}
    />
  );
}
