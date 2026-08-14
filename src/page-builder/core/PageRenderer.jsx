import React from 'react';
import { RenderProvider } from './RenderContext';
import { SectionRenderer } from './SectionRenderer';

// Agrupa las secciones que comparten config.fila_id para renderizarlas
// lado a lado (máximo 2 por fila). El fila_id lo asigna el editor cuando
// el usuario usa "Agregar sección al lado" (ver handleAgregarSeccion en
// LandingEditor.jsx) — NO depende del orden ni de un flag de ancho: dos
// secciones están en la misma fila si y solo si comparten fila_id.
//
// Cada columna sigue siendo una sección independiente, con su propio
// inspector y su propia entrada en la lista. Si un fila_id queda con una
// sola sección (porque se borró la otra), esa se renderiza sola a ancho
// completo — una fila de uno no es una fila.
function agruparEnFilas(secciones) {
  const grupos = [];
  const yaUsadas = new Set();

  secciones.forEach((sec, i) => {
    if (yaUsadas.has(i)) return;
    const filaId = sec.config?.fila_id;
    if (!filaId) {
      grupos.push({ fila: false, seccion: sec });
      return;
    }
    const companeraIdx = secciones.findIndex((s, j) => j > i && s.config?.fila_id === filaId);
    if (companeraIdx === -1) {
      grupos.push({ fila: false, seccion: sec });
      return;
    }
    yaUsadas.add(companeraIdx);
    grupos.push({ fila: true, filaId, secciones: [sec, secciones[companeraIdx]] });
  });

  return grupos;
}

export const PageRenderer = ({ context, sectionWrapper }) => {
  const secciones = context.page.secciones.filter(s => s.activo !== false);
  const grupos = agruparEnFilas(secciones);

  return (
    <RenderProvider context={context}>
      <main className="page-renderer w-full flex-grow flex flex-col">
        {grupos.map((grupo, gi) => {
          if (!grupo.fila) {
            const sec = grupo.seccion;
            return (
              <SectionRenderer
                key={sec.stable_id || sec.id || gi}
                section={sec}
                Wrapper={sectionWrapper}
              />
            );
          }
          return (
            <div key={`fila-${gi}`} className="lp-fila-mitad">
              {grupo.secciones.map((sec, si) => (
                <div key={sec.stable_id || sec.id || `${gi}-${si}`} className="lp-fila-mitad-col">
                  <SectionRenderer section={sec} Wrapper={sectionWrapper} />
                </div>
              ))}
            </div>
          );
        })}
      </main>
    </RenderProvider>
  );
};
