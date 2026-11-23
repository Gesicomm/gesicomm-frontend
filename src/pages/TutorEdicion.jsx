import { useEffect, useRef, useState } from 'react';
import { useTema } from '../components/public/ThemeProvider';

const recurso = '/director-recursos/director.html';

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
      onLoad={sincronizarTema}
      title="Tutor de edición con IA · Director de Edición"
      allow="clipboard-write"
      referrerPolicy="no-referrer"
      className="block w-full rounded-xl border border-border bg-canvas"
      style={{ height: 'calc(100dvh - 112px)', minHeight: '420px' }}
    />
  );
}
