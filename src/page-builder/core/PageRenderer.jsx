import React from 'react';
import { RenderProvider } from './RenderContext';
import { SectionRenderer } from './SectionRenderer';

export const PageRenderer = ({ context }) => {
  return (
    <RenderProvider context={context}>
      <main className="page-renderer w-full flex-grow flex flex-col">
        {context.page.secciones.filter(s => s.activo !== false).map((sec, i) => (
          <SectionRenderer key={sec.stable_id || sec.id || i} section={sec} />
        ))}
      </main>
    </RenderProvider>
  );
};
