import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart, ImageOff, Layers, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio } from '../../lib/mensajeWhatsapp';

/**
 * "Entrar" a un producto de la landing pública: galería, variante (si
 * tiene), cantidad y agregar al carrito. Es un overlay, no una ruta propia
 * — usa los datos que ya trajo obtenerPublica() (imagenes[]/variantes[]
 * por item), sin pedir nada más al backend.
 */
export default function ProductDetailModal({ item, onClose, onAgregar }) {
  const tieneVariantes = item.variantes && item.variantes.length > 0;

  const [varianteId, setVarianteId] = useState(() => {
    if (!tieneVariantes) return null;
    const conStock = item.variantes.find(v => v.stock > 0);
    return (conStock || item.variantes[0]).id;
  });
  const [cantidad, setCantidad] = useState(1);
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [agregado, setAgregado] = useState(false);

  const variante = tieneVariantes ? item.variantes.find(v => v.id === varianteId) : null;

  const galeria = useMemo(() => {
    const propia = variante?.imagenes?.length ? variante.imagenes : item.imagenes;
    return propia && propia.length ? propia : [];
  }, [variante, item.imagenes]);

  // Si cambia la variante y la imagen actual queda fuera de rango, o si la
  // variante tiene su propia foto, se vuelve a la primera.
  useEffect(() => { setIndiceImagen(0); }, [varianteId]);

  const precio = variante ? variante.precio_efectivo : item.precio;
  const stock = variante ? variante.stock : item.stock;
  const stockConocido = stock !== null && stock !== undefined;
  const sinStock = stockConocido && stock <= 0;
  const maxCantidad = stockConocido && stock > 0 ? Math.min(stock, 99) : 99;

  function cambiarVariante(id) {
    setVarianteId(id);
    setCantidad(1);
    setAgregado(false);
  }

  function ajustarCantidad(delta) {
    setCantidad(c => Math.min(maxCantidad, Math.max(1, c + delta)));
  }

  function agregar() {
    if (sinStock) return;
    onAgregar({
      item,
      variante,
      cantidad,
      precio,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1400);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') onClose();
  }

  const descripcion = item.descripcion_larga || item.descripcion;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div className="lp-modal-overlay" onClick={onClose} onKeyDown={onKeyDown} role="presentation">
      <div className="lp-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="lp-modal-close" onClick={onClose} title="Cerrar" autoFocus>
          <X size={18} />
        </button>

        <div className="lp-modal-galeria">
          {galeria.length > 0 ? (
            <>
              <div className="lp-modal-imagen-grande">
                <img src={getMediaUrl(galeria[indiceImagen])} alt={item.nombre} />
                {galeria.length > 1 && (
                  <>
                    <button type="button" className="lp-modal-nav prev" onClick={() => setIndiceImagen(i => (i - 1 + galeria.length) % galeria.length)}>
                      <ChevronLeft size={18} />
                    </button>
                    <button type="button" className="lp-modal-nav next" onClick={() => setIndiceImagen(i => (i + 1) % galeria.length)}>
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
              {galeria.length > 1 && (
                <div className="lp-modal-miniaturas">
                  {galeria.map((url, i) => (
                    <button
                      key={url + i}
                      type="button"
                      className={`lp-modal-miniatura ${i === indiceImagen ? 'active' : ''}`}
                      onClick={() => setIndiceImagen(i)}
                    >
                      <img src={getMediaUrl(url)} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="lp-modal-imagen-grande placeholder">
              {item.tipo === 'combo' ? <Layers size={40} /> : <ImageOff size={40} />}
            </div>
          )}
        </div>

        <div className="lp-modal-info">
          {item.tipo === 'combo' && <span className="lp-modal-badge"><Layers size={11} /> Combo</span>}
          {item.etiqueta && <span className="lp-modal-tag">{item.etiqueta}</span>}
          <h2>{item.nombre}</h2>
          <div className="lp-modal-precio">{formatPrecio(precio)}</div>

          {item.tipo === 'combo' && item.productos_incluidos?.length > 0 && (
            <p className="lp-modal-incluye">Incluye: {item.productos_incluidos.join(', ')}</p>
          )}

          {descripcion && <p className="lp-modal-desc">{descripcion}</p>}

          {tieneVariantes && (
            <div className="lp-modal-variantes">
              <span className="lp-modal-label">Opciones</span>
              <div className="lp-modal-variante-pills">
                {item.variantes.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    className={`lp-modal-pill ${v.id === varianteId ? 'active' : ''} ${v.stock <= 0 ? 'agotada' : ''}`}
                    onClick={() => cambiarVariante(v.id)}
                    disabled={v.stock <= 0}
                    title={v.stock <= 0 ? 'Sin stock' : undefined}
                  >
                    {v.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {stockConocido && (
            <p className={`lp-modal-stock ${sinStock ? 'agotado' : ''}`}>
              {sinStock ? 'Sin stock' : `${stock} disponibles`}
            </p>
          )}

          <div className="lp-modal-acciones">
            <div className="lp-modal-stepper">
              <button type="button" onClick={() => ajustarCantidad(-1)} disabled={cantidad <= 1}><Minus size={14} /></button>
              <span>{cantidad}</span>
              <button type="button" onClick={() => ajustarCantidad(1)} disabled={cantidad >= maxCantidad}><Plus size={14} /></button>
            </div>

            <button type="button" className="lp-modal-agregar" onClick={agregar} disabled={sinStock}>
              {agregado ? <><Check size={16} /> Agregado</> : <><ShoppingCart size={16} /> Agregar al carrito</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
