import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obtenerLandingPublica, obtenerProductoLanding } from '../../services/landingPublicaService';
import { inicializarPixel } from '../../lib/metaPixel';
import { inicializarGA } from '../../lib/googleAnalytics';
import { inicializarTikTokPixel } from '../../lib/tiktokPixel';
import { cargarFuenteGoogle } from '../../lib/landingDiseno';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import FunnelView from './FunnelView';
import TiendaPaginaView from './TiendaPaginaView';
import LandingCodigoPublica from '../landing-simple/LandingCodigoPublica';
import './landingPublica.css';

export default function LandingPublica() {
  const { slug, productId } = useParams();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'no-encontrada' | 'no-disponible' | 'ok'
  const [data, setData] = useState(null);

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
        if (res.meta?.pixel_id) inicializarPixel(res.meta.pixel_id);
        if (res.meta?.google_analytics_id) inicializarGA(res.meta.google_analytics_id);
        if (res.meta?.tiktok_pixel_id) inicializarTikTokPixel(res.meta.tiktok_pixel_id);
        if (res.diseno?.fuente) cargarFuenteGoogle(res.diseno.fuente);
      })
      .catch(() => { if (activo) setEstado('no-encontrada'); });
    return () => { activo = false; };
  }, [slug, productId]);

  useDocumentSeo(data?.seo, typeof window !== 'undefined' ? window.location.href : undefined);

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

  return <TiendaPaginaView data={data} slug={slug} productId={productId} />;
}
