import React from 'react';
import { ArrowRight } from 'lucide-react';
import { LANDING_TEMPLATES } from './landingTemplates';

export default function LandingTemplatePicker({ onSelect }) {
  return (
    <div className="lb-plantillas-page">
      <div className="lb-plantillas-header">
        <h1>Elegí un punto de partida</h1>
        <p>Cada plantilla trae secciones, textos de ejemplo y un estilo visual ya pensado para ese tipo de negocio. Después podés cambiar todo desde el editor.</p>
      </div>

      <div className="lb-plantillas-grid">
        {LANDING_TEMPLATES.map(template => {
          const Icono = template.icono;
          return (
            <button
              key={template.id}
              type="button"
              className="lb-plantilla-card"
              onClick={() => onSelect(template)}
            >
              <div className="lb-plantilla-swatch" style={{ background: `${template.colorSwatch}1a` }}>
                <Icono size={30} color={template.colorSwatch} />
              </div>
              <h3>{template.nombre}</h3>
              <p>{template.descripcion}</p>
              <span className="lb-plantilla-usar">
                Usar esta plantilla <ArrowRight size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
