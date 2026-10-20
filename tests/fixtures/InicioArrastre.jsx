import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { EditorBloquesInicio } from '../../src/pages/landing-simple/ConfigurarVentaCodigo';
import CodigoPreview from '../../src/pages/landing-simple/CodigoPreview';
import { PLANTILLA_INICIO } from '../../src/pages/landing-simple/plantillasBaseCodigo';
import { datosRuntimePreview } from '../../src/pages/landing-simple/datosRuntime';
const inicial = ['anuncios', 'banner', 'productos_categoria', 'confianza', 'testimonios', 'marca'].map(tipo => ({ tipo, visible: true }));
function Demo() {
  const [bloques, setBloques] = useState(() => JSON.parse(localStorage.getItem('inicio-arrastre-qa') || 'null') || inicial);
  const guardar = lista => { setBloques(lista); localStorage.setItem('inicio-arrastre-qa', JSON.stringify(lista)); };
  const venta = { inicio: { bloques, anuncios: [{ texto: 'Envíos a todo Paraguay' }] } };
  const datos = datosRuntimePreview({ tienda: { nombre: 'Sommix' }, venta, vista: 'inicio', productos: [] });
  return <main style={{ display: 'grid', gridTemplateColumns: '460px minmax(0,1fr)', height: '100vh', overflow: 'hidden' }}>
    <aside style={{ overflowY: 'auto', padding: 24 }}><h1 className="text-xl font-bold mb-4">Bloques de Inicio</h1>
      <EditorBloquesInicio bloques={bloques} menuPanel={<p>Encabezado de la tienda</p>} paneles={{ banner: <input aria-label="Título del banner" defaultValue="Oferta de la tienda" /> }}
        onAlternar={tipo => guardar(bloques.map(b => b.tipo === tipo ? { ...b, visible: !b.visible } : b))}
        onReordenar={(desde, hasta) => { const movibles = bloques.filter(b => b.tipo !== 'anuncios'); const [movido] = movibles.splice(desde, 1); movibles.splice(hasta, 0, movido); guardar([...bloques.filter(b => b.tipo === 'anuncios'), ...movibles]); }} />
      <output data-testid="orden-guardado" className="mt-4 block text-xs text-fg-muted">{bloques.map(b => b.tipo).join(', ')}</output>
    </aside><div style={{ minWidth: 0, overflow: 'hidden' }}><CodigoPreview codigo={PLANTILLA_INICIO} datos={datos} /></div>
  </main>;
}
createRoot(document.getElementById('root')).render(<Demo />);
