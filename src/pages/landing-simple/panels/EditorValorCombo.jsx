import React from 'react';
import SubbloqueCombo from './SubbloqueCombo';
import ControlCombo from './ControlCombo';
import { Texto } from './FichaComboPanel';

export default function EditorValorCombo({ d, set, item }) {
  const gs = v => `Gs ${Number(v || 0).toLocaleString('es-PY')}`;
  const productos = item.productos_combo || [];
  const total = productos.reduce((v, p) => v + Number(p.precio || 0) * (p.cantidad || 1), 0);
  const precio = item.precio_efectivo ?? item.precio;
  return <div className="space-y-2">
    <SubbloqueCombo titulo="Textos de la sección" resumen={d.encabezado} inicial>
      <Texto label="Sobre-título de la sección" parte="eyebrow" valor={d.eyebrow} onChange={eyebrow => set({ eyebrow })} />
      <Texto label="Título de la sección de valor" parte="titulo" valor={d.encabezado} onChange={encabezado => set({ encabezado })} />
    </SubbloqueCombo>
    <SubbloqueCombo titulo="Precios por separado" resumen={`${productos.length} productos · ${gs(total)}`}>
      <ControlCombo label="Desglose de precios" parte="desglose" />
      <Texto label="Título — precio por separado" parte="rotulo_desglose" valor={d.titulo} onChange={titulo => set({ titulo })} />
      <div className="space-y-2 text-xs text-fg-muted">{productos.map(p => <div key={p.id} className="flex justify-between gap-2"><span>{p.nombre} ×{p.cantidad || 1}</span><span className="shrink-0">{gs(p.precio * (p.cantidad || 1))}</span></div>)}</div>
      <Texto label="Rótulo del total por separado" parte="total" valor={d.rotulo_total} onChange={rotulo_total => set({ rotulo_total })} />
    </SubbloqueCombo>
    <SubbloqueCombo titulo="Precio del combo" resumen={gs(precio)}>
      <ControlCombo label={`Precio del combo: ${gs(precio)}`} parte="precio" />
      <Texto label="Título — precio del combo" parte="rotulo_precio" valor={d.titulo_combo} onChange={titulo_combo => set({ titulo_combo })} />
    </SubbloqueCombo>
    <SubbloqueCombo titulo="Ahorro" resumen={total > precio ? gs(total - precio) : 'Sin ahorro sobre el precio por separado'}>
      <ControlCombo label="Mostrar el ahorro calculado" parte="ahorro" />
      <Texto label="Nota bajo el ahorro (opcional)" parte="nota" valor={d.nota_ahorro} onChange={nota_ahorro => set({ nota_ahorro })} />
    </SubbloqueCombo>
    <SubbloqueCombo titulo="Botón de compra" resumen={d.cta_texto}>
      <Texto label="Botón de compra" parte="compra" valor={d.cta_texto} onChange={cta_texto => set({ cta_texto })} />
    </SubbloqueCombo>
  </div>;
}
