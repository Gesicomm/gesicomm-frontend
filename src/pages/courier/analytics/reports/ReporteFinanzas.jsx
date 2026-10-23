import React, { useState } from 'react';
import { VistaComisiones } from './finanzas/VistaComisiones';
import { VistaFacturacion } from './finanzas/VistaFacturacion';

// Antes Facturación e IVA vivía plegada debajo de Comisiones y había que
// bajar hasta el final para encontrarla. Ahora son dos pestañas.
const VISTAS = [
  { id: 'comisiones', label: 'Comisiones de pago', desc: 'Lo que se llevan las pasarelas y el POS de cada pedido entregado.' },
  { id: 'facturacion', label: 'Facturación e IVA', desc: 'Pedidos del período cuyo cliente pidió factura legal, con su IVA.' },
];

export function ReporteFinanzas({ filters }) {
  const [vista, setVista] = useState('comisiones');
  const actual = VISTAS.find(v => v.id === vista);

  return (
    <div className="cic-report-container">
      <div className="cic-report-header">
        <h2 className="cic-report-title">Comisiones, facturación e IVA</h2>
        <div className="cic-segmented" role="tablist" aria-label="Vista" style={{ margin: '0.75rem 0 0.5rem' }}>
          {VISTAS.map(v => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={vista === v.id}
              className={`cic-preset-pill ${vista === v.id ? 'active' : ''}`}
              onClick={() => setVista(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="cic-report-desc">{actual.desc}</p>
      </div>

      {vista === 'comisiones' ? <VistaComisiones filters={filters} /> : <VistaFacturacion filters={filters} />}
    </div>
  );
}
