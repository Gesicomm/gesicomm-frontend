import React, { useState } from 'react';
import FooterInspector from './FooterInspector';
import { useFooterBuilder } from './FooterContext';
import { renderInput } from '../../../pages/landing/inspectors/SchemaInspector';

const TABS = [
  { id: 'contenido', label: 'Contenido' },
  { id: 'diseno', label: 'Diseño' },
];

export default function FooterInspectorPanel({ onUploadImagen, paginas }) {
  const [activeTab, setActiveTab] = useState('contenido');
  const { data, actions } = useFooterBuilder();

  const updateColor = (key, val) => actions.updateRoot({ [key]: val });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="flex items-center gap-3 border-b border-[var(--vit-border)] p-4 shrink-0">
        <h3 className="font-semibold text-[var(--vit-text)]">Pie de página</h3>
      </div>

      <div className="flex border-b border-[var(--vit-border)] shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--vit-primary)] text-[var(--vit-primary)]'
                : 'border-transparent text-[var(--vit-muted)] hover:text-[var(--vit-text)]'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contenido' ? (
          <FooterInspector onUploadImagen={onUploadImagen} paginas={paginas} />
        ) : (
          <div className="p-4 flex flex-col gap-4">
            {/* Mismas claves (color_fondo/color_texto/color_boton) que usa
                InspectorSeccion.jsx para el resto de las secciones —
                SectionRenderer.jsx las toma de seccion.config y las expone
                como --l-bg/--l-text/--l-primary, que es lo que ya consumen
                PublicFooterRenderer.css y FooterCanvas.jsx. */}
            <h4 className="text-sm font-semibold text-[var(--vit-text)] border-b border-[var(--vit-border)] pb-2 mb-1">
              Personalización de colores
            </h4>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Color de fondo</span>
              {renderInput({ type: 'color', key: 'color_fondo' }, data.color_fondo, updateColor)}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Color del texto</span>
              {renderInput({ type: 'color', key: 'color_texto' }, data.color_texto, updateColor)}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Color del botón (Acento)</span>
              {renderInput({ type: 'color', key: 'color_boton' }, data.color_boton, updateColor)}
            </div>
            <p className="text-xs text-[var(--vit-muted)]">
              Dejalos vacíos para heredar los colores generales de la tienda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
