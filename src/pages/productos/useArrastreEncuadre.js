import { useCallback, useRef } from 'react';

/**
 * Arrastrar directamente sobre la foto para mover el punto focal — pensado
 * como atajo del zoom manual (stage 2 del encuadre): con zoom > 1 hace falta
 * poder desplazarse dentro de la imagen, y mover dos sliders a tientas es
 * peor que arrastrar sobre lo que se está mirando.
 *
 * La sensibilidad se divide por el zoom actual: a más zoom, el mismo
 * desplazamiento en píxels de pantalla debe mover menos el punto focal (a
 * ojo, no es una conversión geométrica exacta — alcanza para que se sienta
 * bien al usarlo).
 */
/**
 * `onCambio(cambios, { final })` se llama en cada movimiento con
 * `final: false` (solo actualiza la vista) y una vez más al soltar con
 * `final: true` (recién ahí conviene persistir contra el backend — así el
 * arrastre no dispara un PUT por cada pixel).
 */
export function useArrastreEncuadre(img, onCambio) {
  const arrastreRef = useRef(null);

  const calcular = useCallback((e) => {
    const arrastre = arrastreRef.current;
    const zoom = Math.max(1, img.zoom || 1);
    const dxPct = ((e.clientX - arrastre.startX) / arrastre.rect.width) * 100 / zoom;
    const dyPct = ((e.clientY - arrastre.startY) / arrastre.rect.height) * 100 / zoom;
    return {
      focal_x: Math.round(Math.min(100, Math.max(0, arrastre.focalX - dxPct))),
      focal_y: Math.round(Math.min(100, Math.max(0, arrastre.focalY - dyPct))),
    };
  }, [img.zoom]);

  const onPointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    arrastreRef.current = {
      rect,
      startX: e.clientX,
      startY: e.clientY,
      focalX: img.focal_x ?? 50,
      focalY: img.focal_y ?? 50,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [img.focal_x, img.focal_y]);

  const onPointerMove = useCallback((e) => {
    if (!arrastreRef.current) return;
    onCambio(calcular(e), { final: false });
  }, [calcular, onCambio]);

  const onPointerUp = useCallback((e) => {
    if (!arrastreRef.current) return;
    onCambio(calcular(e), { final: true });
    arrastreRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, [calcular, onCambio]);

  return { onPointerDown, onPointerMove, onPointerUp };
}
