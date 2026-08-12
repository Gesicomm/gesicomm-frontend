import React from 'react';
import { BlockRegistry } from './BlockRegistry';

export const SectionRenderer = ({ section }) => {
  const definition = BlockRegistry.resolve(section.tipo);
  
  if (!definition) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[PageBuilder] Bloque desconocido: ${section.tipo}`);
    }
    return null;
  }

  // The component expects { content, settings, id } (or similar props as defined by the block)
  // For backwards compatibility while we migrate, we'll pass both new and legacy formats.
  const props = {
    id: section.stable_id || section.id,
    content: section.content_json || section.contenido || {},
    settings: section.settings_json || section.config || {},
    // Pass the raw section for legacy components
    section: section,
    contenido: section.content_json || section.contenido || {},
    config: section.settings_json || section.config || {},
  };

  const wrapperStyle = {};
  if (props.config.color_fondo) wrapperStyle['--l-bg'] = props.config.color_fondo;
  if (props.config.color_texto) wrapperStyle['--l-text'] = props.config.color_texto;
  if (props.config.color_boton) wrapperStyle['--l-primary'] = props.config.color_boton;

  const Component = definition.component;
  return (
    <div style={wrapperStyle}>
      <Component {...props} />
    </div>
  );
};
