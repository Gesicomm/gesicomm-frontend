import React, { useState } from 'react';
import FitnessProductPage from './FitnessProductPage';
import { demoDeTemplate } from '../demoTemplates';

// Mismos datos que el "Ver preview" del selector de templates: así lo que
// se prueba acá es exactamente lo que ve el comercio antes de elegirlo.
const DEMO = demoDeTemplate('fitness-suplementos');

const TEMAS = {
  'De fábrica (verde)': null,
  'Fitness (oscuro)': { fondo: '#0B0B0E', texto: '#FFFFFF', acento: '#FF5A1F' },
  'Beauty': { fondo: '#FBEFEF', texto: '#3A2A2E', acento: '#C25A72' },
};

export default function DevFicha() {
  const [temaNombre, setTemaNombre] = useState('De fábrica (verde)');
  const [movil, setMovil] = useState(false);
  const [editor, setEditor] = useState(false);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', zIndex: 99, top: 8, right: 8, display: 'flex', gap: 6, background: '#111', padding: 6, borderRadius: 8 }}>
        {Object.keys(TEMAS).map(n => (
          <button key={n} onClick={() => setTemaNombre(n)} style={{ fontSize: 11, padding: '4px 8px', background: n === temaNombre ? '#fff' : '#333', color: n === temaNombre ? '#000' : '#fff', border: 0, borderRadius: 5 }}>{n}</button>
        ))}
        <button onClick={() => setMovil(!movil)} style={{ fontSize: 11, padding: '4px 8px', background: movil ? '#fff' : '#333', color: movil ? '#000' : '#fff', border: 0, borderRadius: 5 }}>Móvil</button>
        <button onClick={() => setEditor(!editor)} style={{ fontSize: 11, padding: '4px 8px', background: editor ? '#fff' : '#333', color: editor ? '#000' : '#fff', border: 0, borderRadius: 5 }}>Modo editor</button>
      </div>
      <div style={{ width: movil ? 390 : '100%', margin: '0 auto' }}>
        <FitnessProductPage
          item={DEMO.item}
          ficha={DEMO.ficha}
          tema={TEMAS[temaNombre]}
          isMobile={movil}
          previewMode={editor}
          onVolver={() => {}}
          onComprar={() => {}}
        />
      </div>
    </div>
  );
}
