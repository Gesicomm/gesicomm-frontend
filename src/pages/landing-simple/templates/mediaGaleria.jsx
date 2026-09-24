import React from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { analizarVideo, NOMBRE_PLATAFORMA } from './video';
import './mediaGaleria.css';

function numeroOFallback(valor, fallback) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
}

/** 1 = sin zoom. Tope en 3x — más que eso ya pixela la versión optimizada de 1600px. */
export function normalizarZoom(valor) {
  return Math.min(3, Math.max(1, numeroOFallback(valor, 1)));
}

/**
 * Fondo de la galería — una propiedad del ESCENARIO (marco + miniaturas +
 * espacios alrededor), no de la imagen. Vive en `content.galeria_fondo`
 * (+ `content.galeria_fondo_color` para el personalizado) de la landing, no
 * en la imagen ni en el producto — así nunca se confunde con el recorte o
 * el modo contain/cover, que sí son por imagen.
 */
export const GALERIA_FONDOS = {
  blanco: { label: 'Blanco', hex: '#FFFFFF' },
  negro: { label: 'Negro', hex: '#0B0B0E' },
  gris_claro: { label: 'Gris claro', hex: '#F1F1F1' },
  gris_medio: { label: 'Gris medio', hex: '#AFAFAF' },
  personalizado: { label: 'Personalizado', hex: null },
};

const HEX_VALIDO = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** {modo, color} de `content` → el hex final a pintar. Blanco si no hay nada configurado. */
export function resolverFondoGaleria(content) {
  const modo = content?.galeria_fondo && GALERIA_FONDOS[content.galeria_fondo] ? content.galeria_fondo : 'blanco';
  if (modo === 'personalizado') {
    return HEX_VALIDO.test(content?.galeria_fondo_color || '') ? content.galeria_fondo_color : '#FFFFFF';
  }
  return GALERIA_FONDOS[modo].hex;
}

export function estiloVisualMedio(medio) {
  const data = medio && typeof medio === 'object' ? medio : null;
  const modo = data?.visual_modo === 'cover' ? 'cover' : 'contain';
  const focalX = Math.min(100, Math.max(0, numeroOFallback(data?.focal_x, 50)));
  const focalY = Math.min(100, Math.max(0, numeroOFallback(data?.focal_y, 50)));
  const width = numeroOFallback(data?.width, null);
  const height = numeroOFallback(data?.height, null);
  const zoom = normalizarZoom(data?.zoom);

  // `width/height: 100%` + object-fit es lo único que deja que la imagen
  // ocupe el marco de verdad. Antes "contain" usaba width/height:auto con
  // un tope en el ancho/alto NATURAL del archivo — object-fit nunca llegaba
  // a agrandar nada, así que una foto ya recortada (más chica que el marco)
  // se quedaba como un cuadrado de su tamaño real, flotando en un marco
  // mucho más grande. Y "cover" (Rellenar marco) tenía el mismo tope, que le
  // impedía cumplir su propio propósito de llenar el marco con fotos chicas.
  const style = {
    objectFit: modo,
    objectPosition: `${focalX}% ${focalY}%`,
    width: '100%',
    height: '100%',
  };

  if (modo === 'contain') {
    // "Rellenar marco" no lleva tope (tiene que llenar sí o sí, para eso
    // existe). "Mostrar completa" sí lo lleva, pero generoso (1.6x el
    // tamaño real) — deja que la foto crezca para ocupar el marco sin
    // llegar al upscale agresivo que la pixelaría.
    style.maxWidth = width && width > 0 ? `min(100%, ${Math.round(width * 1.6)}px)` : '100%';
    style.maxHeight = height && height > 0 ? `min(100%, ${Math.round(height * 1.6)}px)` : '100%';
  }

  // Zoom manual: acerca desde el mismo punto focal que ya define el
  // encuadre, en vez de sumar un sistema de recorte aparte. El frame que
  // envuelve la imagen (.lsp-media-frame / .lsp-media-thumb) ya tiene
  // overflow:hidden, así que lo que se sale del marco simplemente se recorta.
  if (zoom > 1) {
    style.transform = `scale(${zoom})`;
    style.transformOrigin = `${focalX}% ${focalY}%`;
  }

  return style;
}

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

  const data = typeof medio === 'object' ? medio : null;
  return {
    tipo: 'imagen',
    url,
    id: data ? (data.id || data.imagen_id || data.media_id || null) : null,
    imagenId: data ? (data.imagen_id || data.id || null) : null,
    esPrincipal: data ? !!data.es_principal : false,
    visual_modo: data?.visual_modo === 'cover' ? 'cover' : 'contain',
    focal_x: numeroOFallback(data?.focal_x, 50),
    focal_y: numeroOFallback(data?.focal_y, 50),
    zoom: normalizarZoom(data?.zoom),
    width: numeroOFallback(data?.width, null),
    height: numeroOFallback(data?.height, null),
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
    return (
      <img
        className={`lsp-media-img lsp-media-img--${m.visual_modo}`}
        src={getMediaUrl(m.url)}
        alt={alt}
        style={estiloVisualMedio(m)}
      />
    );
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

  // Misma miniatura, mismo badge de tipo, tanto en el editor (ProductoPanel)
  // como en la landing publicada — es un único componente, así que no hay
  // forma de que uno muestre "Foto"/"Video" y el otro no.
  if (m.tipo === 'imagen') {
    return (
      <span className="lsp-media-thumb" title="Foto">
        <img
          className={`lsp-media-thumb-img lsp-media-img--${m.visual_modo}`}
          src={getMediaUrl(m.url)}
          alt={alt}
          loading="lazy"
          style={estiloVisualMedio(m)}
        />
        <span className="lsp-media-badge">FOTO</span>
      </span>
    );
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
      <span className="lsp-media-badge">VIDEO</span>
      <span className="lsp-media-play"><Play size={13} fill="currentColor" /></span>
    </span>
  );
}
