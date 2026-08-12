import React from 'react';
import { RenderProvider } from './RenderContext';
import { SectionRenderer } from './SectionRenderer';

export const PageRenderer = ({ context }) => {
  return (
    <RenderProvider context={context}>
      <div className="page-renderer">
        {context.page.secciones.map((sec, i) => (
          <SectionRenderer key={sec.stable_id || sec.id || i} section={sec} />
        ))}
      </div>
    </RenderProvider>
  );
};
