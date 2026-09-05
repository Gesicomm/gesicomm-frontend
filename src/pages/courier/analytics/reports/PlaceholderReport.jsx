import React from 'react';
import { Settings } from 'lucide-react';

export function PlaceholderReport({ titulo }) {
  return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-fg-muted)', background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)', borderRadius: '12px', border: '1px dashed color-mix(in srgb, var(--color-fg) 10%, transparent)', marginTop: '1rem' }}>
      <Settings size={32} style={{ margin: '0 auto 1rem auto', color: 'var(--color-primary-text)' }} />
      <h3 style={{ color: 'var(--color-fg)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>{titulo}</h3>
      <p>Este reporte se encuentra en proceso de implementación.</p>
      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Los datos y métricas estarán disponibles próximamente.</p>
    </div>
  );
}
