import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ComboBuilder } from '../combos/ComboEditor';
import ComboCodigoPreview from './ComboCodigoPreview';

export function comboComoItemLanding(combo) {
  const fotos = combo.imagenes || [];
  const foto = fotos.find(i => i.es_principal) || fotos[0];
  const productos = [combo.producto_padre, ...(combo.items || []).map(i => i.producto_incluido)].filter(Boolean);
  return {
    ...combo, tipo: 'combo', precio: Number(combo.precio_total), precio_efectivo: Number(combo.precio_total),
    imagen: foto?.url || combo.producto_padre?.imagen || null,
    categoria: combo.producto_padre?.categoria || 'Combos',
    estado_venta: combo.estado === 'ACTIVO' ? 'EN_VENTA' : 'BORRADOR',
    productos_incluidos: productos.map(p => p.nombre).join(', '),
    productos_combo: productos.map(p => ({ id: Number(p.id), nombre: p.nombre, imagen: p.imagen,
      slug: p.slug, precio: Number(p.precio_base), cantidad: 1 })),
  };
}

/** El armador de Productos, dentro de la landing y sin perder su configuración. */
export default function ArmarComboPanel({ principalInicial = null, onCerrar, onCreado, landingPreview = null }) {
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, []);

  return (
    <div className="cw-landing-overlay" role="dialog" aria-modal="true" aria-label="Armar combo">
      <div className="cw-landing-panel">
        <header className="cw-landing-header">
          <div>
            <strong>Crear combo para esta landing</strong>
            <p>El mismo armador de Productos. Se guarda en Mis combos; al ponerlo en venta, se suma a esta landing.</p>
          </div>
          <button type="button" className="btn-icon" onClick={onCerrar} aria-label="Cerrar armador de combo"><X size={18} /></button>
        </header>
        <div className="cw-landing-body">
          <ComboBuilder principalInicial={principalInicial} integrado onCancelar={onCerrar} onGuardado={combo => onCreado?.(comboComoItemLanding(combo))}
            renderVistaCombo={landingPreview ? props => <ComboCodigoPreview {...props} landing={landingPreview} /> : null} />
        </div>
      </div>
    </div>
  );
}
