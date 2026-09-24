import React, { useEffect, useState } from 'react';
import { Star, X, Pencil, Sparkles } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { estiloVisualMedio } from '../landing-simple/templates/mediaGaleria';
import { useArrastreEncuadre } from './useArrastreEncuadre';

function estiloImagenGaleria(img) {
  return estiloVisualMedio(img);
}

const ENCUADRE_POR_DEFECTO = { visual_modo: 'contain', focal_x: 50, focal_y: 50, zoom: 1 };

/**
 * Tarjeta compacta: solo lo que hace falta para reconocer y actuar sobre la
 * imagen. Los controles de encuadre (antes uno por cada tarjeta, siempre
 * visibles) viven ahora en EditorEncuadreModal — mezclar galería y edición
 * técnica en la misma vista era lo que la hacía ilegible.
 */
export function ImagenCardCompacta({ img, esNueva = false, onEditarEncuadre, onMarcarPrincipal, onReprocesar, onEliminar }) {
  const optimizada = !!img.optimizacion_json || img.mime_type === 'image/webp';
  return (
    <div className={`imagen-card-compacta ${img.es_principal ? 'principal' : ''}`}>
      <div className="imagen-card-stage">
        <img
          src={esNueva ? img.url : getMediaUrl(img.url)}
          alt={img.alt_text || 'Imagen del producto'}
          style={estiloImagenGaleria(img)}
        />
        {img.es_principal && <span className="img-principal-badge">Principal</span>}
        {esNueva && <span className="img-principal-badge pending">Pendiente</span>}
        {!esNueva && optimizada && <span className="imagen-card-chip">Optimizada</span>}
      </div>
      <div className="imagen-card-compacta-acciones">
        {!esNueva && (
          <button type="button" className="btn-icon" title="Marcar como principal" onClick={onMarcarPrincipal}>
            <Star size={13} fill={img.es_principal ? 'currentColor' : 'none'} />
          </button>
        )}
        <button type="button" className="btn-chip" onClick={onEditarEncuadre}>
          <Pencil size={12} /> Editar encuadre
        </button>
        {!esNueva && onReprocesar && img.original_url && (
          <button type="button" className="btn-icon" title="Regenerar desde el original" onClick={onReprocesar}>
            <Sparkles size={13} />
          </button>
        )}
        <button type="button" className="btn-icon danger" title="Eliminar imagen" onClick={onEliminar}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

/**
 * Panel de edición de encuadre: vista previa grande + controles, con estado
 * propio (borrador) que solo se aplica de verdad al tocar "Aplicar
 * cambios" — así arrastrar o mover un slider nunca deja la imagen a medio
 * ajustar si el comercio cierra sin querer.
 */
export function EditorEncuadreModal({ img, esNueva = false, onCancelar, onAplicar }) {
  const [draft, setDraft] = useState(() => ({
    visual_modo: img?.visual_modo || 'contain',
    focal_x: img?.focal_x ?? 50,
    focal_y: img?.focal_y ?? 50,
    zoom: img?.zoom ?? 1,
  }));

  useEffect(() => {
    setDraft({
      visual_modo: img?.visual_modo || 'contain',
      focal_x: img?.focal_x ?? 50,
      focal_y: img?.focal_y ?? 50,
      zoom: img?.zoom ?? 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img?.id]);

  if (!img) return null;

  const cambiar = (cambios) => setDraft(prev => ({ ...prev, ...cambios }));
  const previewImg = { ...img, ...draft };
  const { onPointerDown, onPointerMove, onPointerUp } = useArrastreEncuadre(previewImg, cambiar);

  return (
    <div className="imagen-preview-overlay" role="dialog" aria-modal="true" aria-label="Editar encuadre">
      <div className="editor-encuadre-modal">
        <div className="imagen-preview-head">
          <div>
            <span className="product-preview-kicker">Editar encuadre</span>
            <h3>Ajustá cómo se ve esta foto</h3>
          </div>
          <button type="button" className="btn-icon" onClick={onCancelar} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="editor-encuadre-cuerpo">
          <div
            className="editor-encuadre-preview imagen-card-stage-arrastrable"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img src={esNueva ? img.url : getMediaUrl(img.url)} alt="" style={estiloImagenGaleria(previewImg)} draggable={false} />
          </div>

          <div className="editor-encuadre-controles">
            <div>
              <span className="editor-encuadre-label">Cómo se muestra</span>
              <div className="imagen-preview-segmented imagen-preview-segmented-ancho" role="group" aria-label="Cómo se muestra la imagen">
                <button type="button" className={draft.visual_modo !== 'cover' ? 'active' : ''} onClick={() => cambiar({ visual_modo: 'contain' })}>
                  Mostrar imagen completa
                </button>
                <button type="button" className={draft.visual_modo === 'cover' ? 'active' : ''} onClick={() => cambiar({ visual_modo: 'cover' })}>
                  Rellenar marco
                </button>
              </div>
            </div>

            <label>
              Zoom <span className="editor-encuadre-valor">{Math.round(draft.zoom * 100)}%</span>
              <input type="range" min="100" max="300" value={Math.round(draft.zoom * 100)} onChange={e => cambiar({ zoom: Number(e.target.value) / 100 })} />
            </label>
            <label>
              Posición horizontal
              <input type="range" min="0" max="100" value={draft.focal_x} onChange={e => cambiar({ focal_x: Number(e.target.value) })} />
            </label>
            <label>
              Posición vertical
              <input type="range" min="0" max="100" value={draft.focal_y} onChange={e => cambiar({ focal_y: Number(e.target.value) })} />
            </label>
            <p className="field-hint">También podés arrastrar directamente la foto para moverla.</p>

            <button type="button" className="btn-secondary btn-restablecer" onClick={() => setDraft(ENCUADRE_POR_DEFECTO)}>
              Restablecer encuadre
            </button>
          </div>
        </div>

        <div className="imagen-preview-footer">
          <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={() => onAplicar(draft)}>Aplicar cambios</button>
        </div>
      </div>
    </div>
  );
}
