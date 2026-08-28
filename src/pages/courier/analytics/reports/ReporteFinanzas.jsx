import React, { useState } from 'react';
import { DollarSign, FileText } from 'lucide-react';
import { VistaComisiones } from './finanzas/VistaComisiones';
import { VistaFacturacion } from './finanzas/VistaFacturacion';

export function ReporteFinanzas({ filters }) {
  const [activeSubTab, setActiveSubTab] = useState('comisiones');

  return (
    <div className="cic-report-container">
      {/* Sub-Header / Toggle de Vistas */}
      <div className="cic-card-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="cic-card-title">Reportes Financieros</h2>
          <p className="cic-card-subtitle" style={{ marginTop: '0.25rem' }}>
            Análisis de comisiones de métodos de pago y facturación generada
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)', padding: '0.25rem', borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)' }}>
          <button 
            className={`cic-subnav-btn ${activeSubTab === 'comisiones' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('comisiones')}
            style={{ margin: 0 }}
          >
            <DollarSign size={16} /> Comisiones de Pago
          </button>
          <button 
            className={`cic-subnav-btn ${activeSubTab === 'facturacion' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('facturacion')}
            style={{ margin: 0 }}
          >
            <FileText size={16} /> Facturación e IVA
          </button>
        </div>
      </div>

      {activeSubTab === 'comisiones' && <VistaComisiones filters={filters} />}
      {activeSubTab === 'facturacion' && <VistaFacturacion filters={filters} />}

    </div>
  );
}
