import React, { useState } from 'react';
import ModaProductPage from './ModaProductPage';
import FichaModaPanel from '../../panels/FichaModaPanel';
import { resolverFichaModa } from './fichaModa';
import { demoDeTemplate } from '../demoTemplates';
import TemplatePreviewModal from '../../TemplatePreviewModal';

// Mismos datos que el "Ver preview" del selector de templates. La ficha del
// demo ya viene resuelta; acá se le suma lo que se edite en el panel como
// capa "este producto en esta landing".
const DEMO = demoDeTemplate('moda-indumentaria');

const TEMAS = {
  'De fábrica (moda)': null,
  'Violeta': { fondo: '#FFFFFF', texto: '#1D1D1F', acento: '#7134C9' },
  'Oscuro': { fondo: '#17121A', texto: '#F6EEF2', acento: '#F0709A' },
};

export default function DevFichaModa() {
  const [temaNombre, setTemaNombre] = useState('De fábrica (moda)');
  const [movil, setMovil] = useState(false);
  const [editor, setEditor] = useState(false);
  const [panel, setPanel] = useState(false);
  const [fichaProducto, setFichaProducto] = useState(null);
  const [preview, setPreview] = useState(false);

  const ficha = resolverFichaModa(fichaProducto, DEMO.ficha, null);

  const btn = (activo) => ({
    fontSize: 11, padding: '4px 8px', border: 0, borderRadius: 5,
    background: activo ? '#fff' : '#333', color: activo ? '#000' : '#fff',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {panel && (
        <div data-test="panel-ficha" style={{ width: 340, flexShrink: 0, overflow: 'auto', maxHeight: '100vh', position: 'sticky', top: 0, padding: 12, background: '#0f1420', color: '#e8ecf5' }}>
          <FichaModaPanel
            ficha={fichaProducto}
            fichaResuelta={ficha}
            fichaLanding={DEMO.ficha}
            packs={DEMO.item.packs}
            variantes={DEMO.item.variantes}
            respaldos={{ titulo: DEMO.item.nombre, eyebrow: DEMO.item.categoria, lead: DEMO.item.descripcion }}
            modo="producto"
            onChange={setFichaProducto}
            onSubirImagen={async (file) => URL.createObjectURL(file)}
          />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: 'fixed', zIndex: 99, top: 8, right: 8, display: 'flex', gap: 6, background: '#111', padding: 6, borderRadius: 8 }}>
          {Object.keys(TEMAS).map(nombre => (
            <button key={nombre} onClick={() => setTemaNombre(nombre)} style={btn(nombre === temaNombre)}>{nombre}</button>
          ))}
          <button onClick={() => setMovil(!movil)} style={btn(movil)}>Móvil</button>
          <button onClick={() => setEditor(!editor)} style={btn(editor)}>Modo editor</button>
          <button onClick={() => setPanel(!panel)} style={btn(panel)} data-test="abrir-panel">Panel</button>
          <button onClick={() => setPreview(true)} style={btn(preview)}>Preview completa</button>
        </div>
        <div style={{ width: movil ? 390 : '100%', margin: '0 auto' }}>
          <ModaProductPage
            item={DEMO.item}
            ficha={ficha}
            tema={TEMAS[temaNombre]}
            nombreComercio="Tu comercio"
            isMobile={movil}
            previewMode={editor}
            onVolver={() => {}}
            onAgregar={() => {}}
          />
        </div>
      </div>
      {preview && <TemplatePreviewModal template={{ slug: 'moda-indumentaria', name: 'Moda e Indumentaria' }} onCerrar={() => setPreview(false)} onUsar={() => setPreview(false)} />}
    </div>
  );
}
