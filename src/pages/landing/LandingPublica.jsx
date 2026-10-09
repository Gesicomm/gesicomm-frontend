import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerLandingPublica, obtenerProductoLanding, registrarEventoLanding, registrarVisitaLanding } from '../../services/landingPublicaService';
import { generarEventId, inicializarPixel, leerCookiesFacebook, trackearEvento } from '../../lib/metaPixel';
import { inicializarGA } from '../../lib/googleAnalytics';
import { inicializarTikTokPixel } from '../../lib/tiktokPixel';
import { cargarFuenteGoogle } from '../../lib/landingDiseno';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import FunnelView from './FunnelView';
import TiendaPaginaView from './TiendaPaginaView';
import LandingCodigoPublica from '../landing-simple/LandingCodigoPublica';
import './landingPublica.css';

export default function LandingPublica({ vistaCodigo = null, categorySlug = null }) {
  const { slug, productId, categorySlug: categorySlugParam } = useParams();
  const categoriaVista = categorySlug || categorySlugParam || null;
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'no-encontrada' | 'no-disponible' | 'ok'
  const [data, setData] = useState(null);
  const pageviewEnviadoRef = useRef(null);

  useEffect(() => {
    let activo = true;
    setEstado('cargando');
    const promesa = productId
      ? (slug
          ? obtenerProductoLanding(slug, productId)
          : obtenerLandingPublica(productId)
              .then(res => (res === null ? obtenerProductoLanding(null, productId) : res))
              .catch(() => obtenerProductoLanding(null, productId)))
      : obtenerLandingPublica(slug);
    
    promesa
      .then((res) => {
        if (!activo) return;
        if (res === null) return setEstado('no-encontrada');
        // El hostname no es de una tienda sino de una página del Page
        // Builder (calcula.gesicomm.com). El backend lo resuelve en esta
        // misma respuesta para no agregarle una vuelta de red a las
        // visitas de tienda, que son las que hoy tienen tráfico.
        if (res.tipo === 'builder') {
          setData(res);
          return setEstado('builder');
        }
        if (!res.disponible) return setEstado('no-disponible');
        setData(res);
        setEstado('ok');
        if (res.meta?.pixel_id) inicializarPixel(res.meta.pixel_id, { trackPageView: false });
        if (res.meta?.google_analytics_id) inicializarGA(res.meta.google_analytics_id);
        if (res.meta?.tiktok_pixel_id) inicializarTikTokPixel(res.meta.tiktok_pixel_id);
        if (res.diseno?.fuente) cargarFuenteGoogle(res.diseno.fuente);

        const pageviewKey = `${slug || 'home'}:${productId || ''}:${window.location.pathname}`;
        if (pageviewEnviadoRef.current !== pageviewKey) {
          pageviewEnviadoRef.current = pageviewKey;
          // La visita la contaba el backend dentro de este GET, lo que lo hacía
          // incacheable. Solo cuando NO hay productId: la ficha de producto
          // tampoco contaba visita antes (obtenerProductoPublico no llamaba a
          // registrarVisita), y la idea es no cambiar qué se mide, solo quién
          // lo dispara.
          if (!productId) registrarVisitaLanding(slug);
          const eventId = generarEventId();
          const { fbc, fbp } = leerCookiesFacebook();
          trackearEvento('PageView', eventId, {});
          registrarEventoLanding(slug, {
            event_name: 'PageView',
            event_id: eventId,
            event_source_url: window.location.href,
            fbc,
            fbp,
          });
        }
      })
      .catch(() => { if (activo) setEstado('no-encontrada'); });
    return () => { activo = false; };
  }, [slug, productId]);

  // La pestaña del navegador mostraba el favicon estático de Gesicom
  // (index.html) en TODAS las páginas publicadas, logo de la tienda
  // incluido. El logo propio de la landing manda sobre el de "Mi Tienda" —
  // mismo orden de prioridad que `logo_imagen` en landing.service.js.
  const seoConFavicon = useMemo(() => {
    if (!data?.seo) return data?.seo;
    const favicon = data.logo_imagen || data.tienda?.logo_imagen || null;
    return favicon ? { ...data.seo, favicon } : data.seo;
  }, [data]);
  useDocumentSeo(seoConFavicon, typeof window !== 'undefined' ? window.location.href : undefined);

  if (estado === 'cargando') {
    return <div className="lp-status-page"><div className="lp-spinner" /></div>;
  }

  // Página del Page Builder: se pinta con el MISMO iframe sandbox que usa
  // el preview del editor (ver CodigoPreview / construirDocumentoCodigo).
  if (estado === 'builder') {
    return (
      <LandingCodigoPublica
        codigo={data.codigo}
        titulo={data.seo?.titulo || data.pagina?.nombre || ''}
        data={data}
        slug={slug}
      />
    );
  }

  if (estado === 'no-encontrada' || estado === 'no-disponible') {
    return (
      <div className="lp-status-page">
        <h1>Esta vidriera no está disponible</h1>
        <p>El link puede haber cambiado o el catálogo ya no está activo.</p>
      </div>
    );
  }

  // Rutear dependiendo del tipo de página (STI)
  if (data?.tipo_pagina === 'funnel') {
    return <FunnelView data={data} slug={slug} productId={productId} />;
  }

  return <TiendaPaginaView data={data} slug={slug} productId={productId} vistaCodigo={vistaCodigo} categorySlug={categoriaVista} />;
}
