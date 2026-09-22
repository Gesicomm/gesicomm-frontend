import React from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { analizarVideo, NOMBRE_PLATAFORMA } from './video';
import './mediaGaleria.css';

export function urlDeMedio(medio) {
  if (!medio) return '';
  if (typeof medio === 'string') return medio;
  return medio.url || medio.src || medio.imagen || medio.image || medio.video_url || '';
}

export function normalizarMedioProducto(medio) {
  const url = String(urlDeMedio(medio) || '').trim();
  if (!url) return null;
  const tipoDeclarado = typeof medio === 'object' ? (medio.tipo || medio.type || medio.clase) : null;
  const video = tipoDeclarado === 'video' ? analizarVideo(url) : null;
  const esVideo = tipoDeclarado === 'video' || !!video;

  if (esVideo) {
    const info = video || analizarVideo(url);
    return {
      tipo: 'video',
      url,
      id: typeof medio === 'object' ? (medio.id || medio.media_id || null) : null,
      titulo: typeof medio === 'object' ? (medio.titulo || medio.title || '') : '',
      portada: typeof medio === 'object' ? (medio.portada || medio.poster || medio.miniatura || null) : null,
      video: info,
    };
  }

  return {
    tipo: 'imagen',
    url,
    id: typeof medio === 'object' ? (medio.id || medio.imagen_id || medio.media_id || null) : null,
    imagenId: typeof medio === 'object' ? (medio.imagen_id || medio.id || null) : null,
    esPrincipal: typeof medio === 'object' ? !!medio.es_principal : false,
  };
}

export function normalizarGaleriaProducto(galeria = []) {
  return (galeria || []).map(normalizarMedioProducto).filter(Boolean);
}

function firmaMedioProducto(medio) {
  const m = normalizarMedioProducto(medio);
  if (!m) return null;
  if (m.id != null) return `${m.tipo}:id:${m.id}`;
  if (m.imagenId != null) return `${m.tipo}:imagen:${m.imagenId}`;
  return `${m.tipo}:url:${normalizarUrlComparacion(m.url)}`;
}

function normalizarUrlComparacion(url) {
  return String(getMediaUrl(url) || '').trim();
}

function mismoMedioProducto(a, b) {
  const primero = normalizarMedioProducto(a);
  const segundo = normalizarMedioProducto(b);
  if (!primero || !segundo || primero.tipo !== segundo.tipo) return false;

  const idsPrimero = [primero.id, primero.imagenId].filter(v => v != null).map(String);
  const idsSegundo = [segundo.id, segundo.imagenId].filter(v => v != null).map(String);
  if (idsPrimero.some(id => idsSegundo.includes(id))) return true;

  const urlPrimero = normalizarUrlComparacion(primero.url);
  return urlPrimero !== '' && urlPrimero === normalizarUrlComparacion(segundo.url);
}

export function galeriaConVariantePromovida(galeriaProducto = [], variante = null) {
  const base = normalizarGaleriaProducto(galeriaProducto);
  const imagenVariante = Array.isArray(variante?.imagenes) && variante.imagenes.length
    ? variante.imagenes[0]
    : (variante?.imagen || variante?.image || variante?.url || null);
  const promovida = normalizarMedioProducto(imagenVariante);

  if (!promovida || promovida.tipo !== 'imagen') return base;

  const firmaPromovida = firmaMedioProducto(promovida);
  return [
    promovida,
    ...base.filter(medio => firmaMedioProducto(medio) !== firmaPromovida && !mismoMedioProducto(medio, promovida)),
  ];
}

export function claveMedioProducto(medio, indice = 0) {
  const m = normalizarMedioProducto(medio);
  if (!m) return `medio-${indice}`;
  return `${m.tipo}-${m.id || m.imagenId || m.url}-${indice}`;
}

export function imagenPrincipalDeGaleria(galeria = []) {
  const medios = normalizarGaleriaProducto(galeria);
  return medios.find(m => m.tipo === 'imagen')?.url
    || medios.find(m => m.tipo === 'video' && (m.portada || m.video?.miniatura))?.portada
    || medios.find(m => m.tipo === 'video')?.video?.miniatura
    || medios[0]?.url
    || null;
}

export function MediaProducto({ medio, alt = '' }) {
  const m = normalizarMedioProducto(medio);
  if (!m) return null;

  if (m.tipo === 'imagen') {
    return <img src={getMediaUrl(m.url)} alt={alt} />;
  }

  const video = m.video || analizarVideo(m.url);
  const titulo = m.titulo || `Video de ${alt || 'producto'}`;
  const portada = m.portada || video?.miniatura || null;

  if (video?.incrustable && video.tipo === 'video') {
    return (
      <video src={video.embed} controls playsInline preload="metadata" poster={portada ? getMediaUrl(portada) : undefined}>
        Tu navegador no puede reproducir este video.
      </video>
    );
  }

  if (video?.incrustable && video.embed) {
    return (
      <iframe
        src={video.embed}
        title={titulo}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <a className="lsp-media-link" href={video?.url || m.url} target="_blank" rel="noreferrer">
      {portada ? <img src={getMediaUrl(portada)} alt="" /> : <ExternalLink size={34} />}
      <span>Ver video en {NOMBRE_PLATAFORMA[video?.plataforma] || 'otra pestaña'}</span>
    </a>
  );
}

export function MiniaturaMediaProducto({ medio, alt = '' }) {
  const m = normalizarMedioProducto(medio);
  if (!m) return null;

  if (m.tipo === 'imagen') {
    return <img src={getMediaUrl(m.url)} alt={alt} loading="lazy" />;
  }

  const video = m.video || analizarVideo(m.url);
  const portada = m.portada || video?.miniatura || null;
  const plataforma = NOMBRE_PLATAFORMA[video?.plataforma] || 'Video';
  return (
    <span className="lsp-media-thumb lsp-media-thumb-video" title={plataforma}>
      {portada
        ? <img src={getMediaUrl(portada)} alt={alt} loading="lazy" />
        : (
          <span className="lsp-media-thumb-fallback">
            <span className="lsp-media-fallback-mark"><Play size={15} fill="currentColor" /></span>
          </span>
        )}
      <span className="lsp-media-badge">VID</span>
      <span className="lsp-media-play"><Play size={13} fill="currentColor" /></span>
    </span>
  );
}
