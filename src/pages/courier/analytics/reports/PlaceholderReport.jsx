import React from 'react';
import { Settings } from 'lucide-react';

export function PlaceholderReport({ titulo }) {
  return (
    <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', marginTop: '1rem' }}>
      <Settings size={32} style={{ margin: '0 auto 1rem auto', color: '#6366f1' }} />
      <h3 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.2rem' }}>{titulo}</h3>
      <p>Este reporte se encuentra en proceso de implementación.</p>
      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Los datos y métricas estarán disponibles próximamente.</p>
    </div>
  );
}
