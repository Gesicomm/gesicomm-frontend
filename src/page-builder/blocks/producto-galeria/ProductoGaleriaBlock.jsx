import React, { useState } from 'react';
import { useRenderContext } from '../../core/RenderContext';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';

/**
 * Sección independiente de galería — separada a propósito de
 * ProductDetailBlock (que solo trae precio/botones/descripción) para que
 * el usuario pueda armar "Galería al lado de Beneficios" con dos
 * secciones sueltas, cada una con su propio inspector (ver
 * ProductoGaleriaInspector.jsx). Ancho "mitad" por defecto — ver
 * PageRenderer.jsx, que empareja en fila dos secciones consecutivas con
 * config.ancho==='mitad'.
 *
 * `contenido.imagenes` son URLs propias de ESTA sección (subidas a mano,
 * pueden ser distintas de las fotos del producto en el catálogo). Si está
 * vacío, cae a las fotos del producto — así una sección recién agregada
 * ya muestra algo sin configuración previa.
 */
export const ProductoGaleriaBlock = ({ content }) => {
  const { data } = useRenderContext();
  const item = data.item;
  const [indice, setIndice] = useState(0);

  const imagenes = (content?.imagenes?.length ? content.imagenes : item?.imagenes) || [];

  if (imagenes.length === 0) {
    return (
      <div className="lp-product-galeria-seccion">
        <div className="lp-product-main-image placeholder">
          <div className="lp-placeholder-content">
            <ImageOff size={44} />
            <span>Sin imágenes todavía</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lp-product-galeria-seccion">
      <div className="lp-product-main-image">
        <img src={getMediaUrl(imagenes[indice])} alt="" />
        {imagenes.length > 1 && (
          <>
            <button type="button" className="lp-modal-nav prev" onClick={() => setIndice(i => (i - 1 + imagenes.length) % imagenes.length)}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="lp-modal-nav next" onClick={() => setIndice(i => (i + 1) % imagenes.length)}>
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
      {imagenes.length > 1 && (
        <div className="lp-product-thumbnails">
          {imagenes.map((url, i) => (
            <button key={url + i} type="button" className={`lp-product-thumbnail ${i === indice ? 'active' : ''}`} onClick={() => setIndice(i)}>
              <img src={getMediaUrl(url)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
