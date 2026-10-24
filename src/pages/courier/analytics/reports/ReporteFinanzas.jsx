import React, { useState } from 'react';
import { VistaComisiones } from './finanzas/VistaComisiones';
import { VistaFacturacion } from './finanzas/VistaFacturacion';

// Antes Facturación e IVA vivía plegada debajo de Comisiones y había que
// bajar hasta el final para encontrarla. Ahora son dos pestañas.
const VISTAS = [
  { id: 'comisiones', label: 'Comisiones', desc: 'Lo que se llevan las tarjetas, el POS y los pagos online de cada pedido entregado.' },
  { id: 'facturacion', label: 'Facturas e IVA', desc: 'Pedidos del período en los que el cliente pidió factura, con el IVA que tenés que declarar.' },
];

export function ReporteFinanzas({ filters }) {
  const [vista, setVista] = useState('comisiones');
  const actual = VISTAS.find(v => v.id === vista);

  return (
    <div className="cic-report-container">
      <div className="cic-report-header">
        <h2 className="cic-report-title">Comisiones e IVA</h2>
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
