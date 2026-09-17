import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { VistaComisiones } from './finanzas/VistaComisiones';
import { VistaFacturacion } from './finanzas/VistaFacturacion';

export function ReporteFinanzas({ filters }) {
  const [showFacturacion, setShowFacturacion] = useState(false);

  return (
    <div className="cic-report-container">
      {/* Sub-Header / Toggle de Vistas */}
      <div className="cic-card-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="cic-card-title">Comisiones de Pago</h2>
          <p className="cic-card-subtitle" style={{ marginTop: '0.25rem' }}>
            Análisis de costos de pasarelas, comisiones POS y métodos de pago
          </p>
        </div>
      </div>

      <VistaComisiones filters={filters} />

      <div style={{ marginTop: '3rem', borderTop: '1px dashed color-mix(in srgb, var(--color-fg) 10%, transparent)', paddingTop: '2rem' }}>
        <button 
          onClick={() => setShowFacturacion(!showFacturacion)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
            background: 'var(--color-surface-2)', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)',
            padding: '1rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
            color: 'var(--color-fg)'
          }}
        >
          <div style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', padding: '0.5rem', borderRadius: '8px', color: 'var(--color-primary-text)' }}>
            <FileText size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Facturación e IVA</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)', marginTop: '0.1rem' }}>
              Pedidos del período que solicitaron boleta legal
            </div>
          </div>
          <div style={{ color: 'var(--color-fg-muted)' }}>
            {showFacturacion ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {showFacturacion && (
          <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
            <VistaFacturacion filters={filters} />
          </div>
        )}
      </div>
    </div>
  );
}
