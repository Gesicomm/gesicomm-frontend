import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import './comparadorAntesDespues.css';

/**
 * Comparador deslizante de antes y después ("puerta corrediza"), compartido
 * por las fichas de los templates rígidos.
 *
 * Las dos fotos ocupan el recuadro entero, una encima de la otra: la de
 * "después" abajo y la de "antes" arriba, recortada desde la derecha hasta
 * la línea. Arrastrar la línea (mouse, dedo o flechas del teclado) corre ese
 * recorte: a la izquierda de la línea se ve el antes, a la derecha el
 * después.
 *
 * El tamaño del recuadro lo pone quien lo usa con `className`; los colores
 * de la manija y las etiquetas, con las variables --cad-* (ver el CSS).
 */
export default function ComparadorAntesDespues({
  antes,
  despues,
  etiquetaAntes = '',
  etiquetaDespues = '',
  previewMode = false,
  className = '',
}) {
  const [posicion, setPosicion] = useState(50);
  const [arrastrando, setArrastrando] = useState(false);
  const cajaRef = useRef(null);

  const moverA = (clientX) => {
    const caja = cajaRef.current?.getBoundingClientRect();
    if (!caja || !caja.width) return;
    const pct = ((clientX - caja.left) / caja.width) * 100;
    setPosicion(Math.min(100, Math.max(0, pct)));
  };

  const alApretar = (e) => {
    // Captura el puntero: el arrastre sigue aunque el dedo o el mouse se
    // salgan del recuadro, y el scroll de la página no se lo roba (ver
    // touch-action en el CSS).
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setArrastrando(true);
    moverA(e.clientX);
  };

  const alTeclear = (e) => {
    const paso = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPosicion(p => Math.max(0, p - paso)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPosicion(p => Math.min(100, p + paso)); }
    if (e.key === 'Home') { e.preventDefault(); setPosicion(0); }
    if (e.key === 'End') { e.preventDefault(); setPosicion(100); }
  };

  const falta = (texto) => <span className="cad-falta">{previewMode ? texto : ''}</span>;

  return (
    <div
      ref={cajaRef}
      className={`cad ${arrastrando ? 'arrastrando' : ''} ${className}`}
      onPointerDown={alApretar}
      onPointerMove={e => { if (arrastrando) moverA(e.clientX); }}
      onPointerUp={() => setArrastrando(false)}
      onPointerCancel={() => setArrastrando(false)}
    >
      <div className="cad-capa">
        {despues ? <img src={getMediaUrl(despues)} alt={etiquetaDespues} draggable={false} /> : falta('Subí la foto de después')}
      </div>
      <div className="cad-capa cad-antes" style={{ clipPath: `inset(0 ${100 - posicion}% 0 0)` }}>
        {antes ? <img src={getMediaUrl(antes)} alt={etiquetaAntes} draggable={false} /> : falta('Subí la foto de antes')}
      </div>

      {etiquetaAntes && <span className="cad-etiqueta izq" style={{ opacity: posicion < 18 ? 0 : 1 }}>{etiquetaAntes}</span>}
      {etiquetaDespues && <span className="cad-etiqueta der" style={{ opacity: posicion > 82 ? 0 : 1 }}>{etiquetaDespues}</span>}

      <div
        className="cad-linea"
        style={{ left: `${posicion}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Deslizá para comparar antes y después"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(posicion)}
        onKeyDown={alTeclear}
      >
        <span className="cad-manija" aria-hidden="true">
          <ChevronLeft size={16} /><ChevronRight size={16} />
        </span>
      </div>
    </div>
  );
}

/**
 * Una sola foto que ya trae el antes y el después juntos: va fija, con las
 * dos etiquetas y la línea al medio, sin deslizador (no hay dos capas que
 * correr).
 */
export function FotoAntesDespuesCombinada({ src, etiquetaAntes = '', etiquetaDespues = '', className = '' }) {
  return (
    <div className={`cad cad-fija ${className}`}>
      <img className="cad-unica" src={getMediaUrl(src)} alt={[etiquetaAntes, etiquetaDespues].filter(Boolean).join(' y ')} />
      {etiquetaAntes && <span className="cad-etiqueta izq">{etiquetaAntes}</span>}
      {etiquetaDespues && <span className="cad-etiqueta der">{etiquetaDespues}</span>}
      <span className="cad-linea cad-linea--fija" aria-hidden="true" />
    </div>
  );
}
