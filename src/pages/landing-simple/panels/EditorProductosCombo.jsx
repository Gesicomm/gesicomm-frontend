import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Texto } from './FichaComboPanel';
import ControlCombo, { ContextoControlCombo } from './ControlCombo';
import SubbloqueCombo from './SubbloqueCombo';
import { productosSeccionCombo, textosBeneficiosCombo } from '../comboContenido';

export default function EditorProductosCombo({ productos, config, bloque, onChange, pedido, onActivo }) {
  const lista = productosSeccionCombo(productos, config);
  if (!lista.length) return <p className="text-sm text-fg-muted">Este combo todavía no tiene productos incluidos.</p>;
  return <div className="space-y-2">{lista.map((p, i) => {
    // Guardar solo la presentación que se editó, sin copiar precios ni datos
    // heredados de los otros productos a esta configuración.
    const editar = cambio => {
      const propios = config.productos || [];
      const anterior = propios.find(v => String(v.id) === String(p.id)) || { id: p.id };
      onChange({ productos: [...propios.filter(v => String(v.id) !== String(p.id)), { ...anterior, ...cambio }] });
    };
    const beneficios = textosBeneficiosCombo(p.beneficios, false);
    const actualizarBeneficio = (n, texto) => editar({ beneficios: beneficios.map((v, k) => k === n ? texto : v) });
    const parteBeneficios = bloque === 'incluye' ? 'beneficio' : 'beneficios';
    const clave = `${bloque}_producto_${p.id}`;
    return <ContextoControlCombo.Provider key={p.id} value={{ partes: { ...config.partes, ...p.partes },
      cambiar: (parte, valor) => editar({ partes: { ...p.partes, [parte]: valor } }),
    }}><SubbloqueCombo titulo={`Producto ${i + 1} · ${p.nombre || 'Sin nombre'}`} clave={clave}
      resumen={`Cantidad: ${p.cantidad || 1} · ${beneficios.filter(Boolean).length} beneficios`} inicial={i === 0} pedido={pedido} onActivo={onActivo}>
      <Texto label={`Nombre del producto ${i + 1}`} parte="nombre" valor={p.nombre} onChange={nombre => editar({ nombre })} />
      <Texto label={`Imagen del producto ${i + 1}`} parte="imagen" valor={p.imagen || ''} onChange={imagen => editar({ imagen })} />
      <ControlCombo label={`Cantidad: ×${p.cantidad || 1}`} parte="cantidad" />
      <div className="border-t border-border pt-4 space-y-3">
        <ControlCombo label={`Beneficios de ${p.nombre || `producto ${i + 1}`}`} parte={parteBeneficios} />
        <p className="text-xs text-fg-muted">Cada fila es un beneficio de este producto. Todos los que estén marcados aparecen en su tarjeta.</p>
        {beneficios.map((texto, n) => <div key={n} className="flex items-center gap-2">
          <input type="checkbox" className="accent-primary shrink-0" aria-label={`Mostrar beneficio ${n + 1} del producto ${i + 1}`}
            checked={p.beneficios_visibles?.[n] !== false} onChange={e => editar({ beneficios_visibles: beneficios.map((_, k) => k === n ? e.target.checked : p.beneficios_visibles?.[k] !== false) })} />
          <input aria-label={`Beneficio ${n + 1} del producto ${i + 1}`} value={texto} className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm text-fg"
            onChange={e => actualizarBeneficio(n, e.target.value)} />
          <button type="button" aria-label={`Quitar beneficio ${n + 1} del producto ${i + 1}`} className="p-2 text-fg-muted hover:text-danger"
            onClick={() => editar({ beneficios: beneficios.filter((_, k) => k !== n), beneficios_visibles: beneficios.filter((_, k) => k !== n).map((_, k) => p.beneficios_visibles?.[k >= n ? k + 1 : k] !== false) })}><Trash2 size={14} /></button>
        </div>)}
        <button type="button" disabled={beneficios.length >= 10} className="inline-flex items-center gap-2 text-sm text-primary-text"
          onClick={() => editar({ beneficios: [...beneficios, ''], beneficios_visibles: [...beneficios.map((_, n) => p.beneficios_visibles?.[n] !== false), true] })}>
          <Plus size={14} />Agregar beneficio al producto {i + 1}
        </button>
      </div>
    </SubbloqueCombo></ContextoControlCombo.Provider>;
  })}</div>;
}
