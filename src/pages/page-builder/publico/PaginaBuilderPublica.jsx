import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LandingCodigoPublica from '../../landing-simple/LandingCodigoPublica';
import { obtenerPaginaPublica } from '../../../services/pageBuilderPublicoService';

/**
 * La página pública del Page Builder.
 *
 * Reutiliza LandingCodigoPublica —y con él CodigoPreview y
 * construirDocumentoCodigo— a propósito: es EXACTAMENTE el mismo iframe
 * sandbox que usa el preview del editor. Dos renderers para la misma
 * vista divergen siempre, y acá además el iframe es la contención real
 * del JavaScript del usuario, así que una segunda implementación sería
 * también una segunda superficie de ataque.
 *
 * Rutas que la usan (fallback por path, ver builderPublicPage.service.js):
 *   /p/:pageSlug
 *   /f/:funnelSlug
 *   /f/:funnelSlug/:pageSlug
 *
 * Cuando la página tiene hostname propio (calcula.gesicomm.com), el
 * backend resuelve por Host y esta misma vista se monta en la raíz.
 */
export default function PaginaBuilderPublica() {
  const { pageSlug, funnelSlug } = useParams();

  const [estado, setEstado] = useState('cargando'); // cargando | ok | no-encontrada | en-construccion | error
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let activo = true;

    obtenerPaginaPublica({ pageSlug, funnelSlug })
      .then((resultado) => {
        if (!activo) return;
        setDatos(resultado);
        setEstado('ok');
      })
      .catch((err) => {
        if (!activo) return;
        const status = err.response?.status;
        if (err.response?.data?.en_construccion) setEstado('en-construccion');
        else if (status === 404) setEstado('no-encontrada');
        else setEstado('error');
      });

    return () => { activo = false; };
  }, [pageSlug, funnelSlug]);

  // El <title> y la descripción los pone el SPA para el visitante que sí
  // ejecuta JS. Para los bots, que no lo ejecutan, están las meta tags
  // que sirve el backend en /pb (ver routes/builderHtml.js).
  useEffect(() => {
    if (estado !== 'ok' || !datos?.seo) return;
    const anterior = document.title;
    document.title = datos.seo.titulo || datos.pagina?.nombre || '';

    let meta = document.querySelector('meta[name="description"]');
    const habiaMeta = !!meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const descripcionAnterior = meta.getAttribute('content');
    meta.setAttribute('content', datos.seo.descripcion || '');

    return () => {
      document.title = anterior;
      if (habiaMeta) meta.setAttribute('content', descripcionAnterior || '');
      else meta.remove();
    };
  }, [estado, datos]);

  if (estado === 'cargando') {
    return (
      <div style={estiloEstado} role="status" aria-live="polite">
        <span className="loader" />
      </div>
    );
  }

  if (estado === 'en-construccion') {
    return (
      <div style={estiloEstado}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Esta página todavía está en construcción</h1>
          <p style={{ color: '#666' }}>Volvé en un rato.</p>
        </div>
      </div>
    );
  }

  if (estado !== 'ok') {
    return (
      <div style={estiloEstado}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Página no encontrada</h1>
          <p style={{ color: '#666' }}>El link puede estar mal escrito o la página ya no existe.</p>
        </div>
      </div>
    );
  }

  return (
    <LandingCodigoPublica
      codigo={datos.codigo}
      titulo={datos.seo?.titulo || datos.pagina?.nombre || ''}
    />
  );
}

const estiloEstado = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  background: '#fff',
  color: '#111',
  fontFamily: 'system-ui, sans-serif',
  padding: '2rem',
};
