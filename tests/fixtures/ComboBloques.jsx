import CodigoPreview from '../../src/pages/landing-simple/CodigoPreview';
import { PLANTILLA_PRODUCTO } from '../../src/pages/landing-simple/plantillasBaseCodigo';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';
import EditorFichaCombo from '../../src/pages/landing-simple/EditorFichaCombo';
import FichaComboLienzo from '../../src/pages/landing-simple/FichaComboLienzo';
import { itemPanelARuntime } from '../../src/pages/landing-simple/datosRuntime';
import { datosRuntimePreview } from '../../src/pages/landing-simple/datosRuntime';
import { PLANTILLA_INICIO } from '../../src/pages/landing-simple/plantillasBaseCodigo';
import LandingCodigoPublica from '../../src/pages/landing-simple/LandingCodigoPublica';

const inicial = { tipo: 'combo', id: 99, nombre: 'Combo cocina · prueba123', categoria: 'Cocina', precio_efectivo: 179000,
  propuesta_valor: 'Todo lo que necesitás para cocinar, en una sola compra.',
  productos_combo: [{ id: 1, nombre: 'Cacerola', precio: 150000, cantidad: 1, beneficios: ['Antiadherente', 'Fácil de limpiar', 'Calor uniforme'] },
    { id: 2, nombre: 'Utensilios', precio: 60000, cantidad: 1, beneficios: ['Mango cómodo', 'Resistentes al calor'] }],
  beneficios: [{ titulo: 'Un kit completo', texto: 'Productos que se complementan.' }],
  confianza: [{ titulo: 'Atención de la tienda', texto: 'Consultá las condiciones antes de comprar.' }],
  preguntas_frecuentes: [{ pregunta: '¿Qué incluye?', respuesta: 'Una cacerola y utensilios.' }],
};
const oscuro = new URLSearchParams(window.location.search).get('tema') === 'oscuro';
const tienda = { nombre: 'Sommix', colores: { fondo: oscuro ? '#0b171c' : '#fff', texto: oscuro ? '#e8eff3' : '#111827', primario: oscuro ? '#14777b' : '#155E63' } };
const venta = { inicio: { anuncios: [{ texto: 'Envíos a todo Paraguay · Pago al recibir' }] }, cross_sell: { activo: false } };
const content = { codigo: PLANTILLA_INICIO, venta };
function leerGuardado() {
  try { return JSON.parse(localStorage.getItem('combo-bloques-qa')) || inicial; } catch { return inicial; }
}
function Demo() {
  const [item, setItem] = useState(leerGuardado);
  const [activo, setActivo] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [ancla, setAncla] = useState('');
  const runtime = itemPanelARuntime({ ...item, precio_ancla: Number(ancla) || null });
  const datos = datosRuntimePreview({ productos: [item], tienda, venta, vista: 'producto', productoId: 'combo-99' });
  return <main style={{ display: 'grid', gridTemplateColumns: '480px minmax(0,1fr)', height: '100vh', overflow: 'hidden', background: 'var(--color-surface)' }}>
    <aside style={{ padding: 24, overflowY: 'auto' }}><h1 className="text-xl font-bold mb-4">Vista del combo</h1>
      <a href="?vista=publicada" className="text-sm text-primary-text block mb-4">Ver página pública de prueba</a>
      <EditorFichaCombo item={item} activo={activo} onActivo={setActivo} pedido={pedido} ancla={ancla} onAncla={setAncla}
        onCambiar={(campo, valor) => setItem(prev => { const siguiente = { ...prev, [campo]: valor }; localStorage.setItem('combo-bloques-qa', JSON.stringify(siguiente)); return siguiente; })} />
    </aside>
    <div style={{ overflow: 'hidden', height: '100%' }}><FichaComboLienzo item={item} runtime={runtime} tienda={tienda}
      codigoInicio={PLANTILLA_INICIO} content={content} datos={datos}
      preview bloqueActivo={activo} onActivo={setActivo} onBloque={clave => { setPedido({ clave, n: Date.now() }); setActivo(clave); }} onVolver={() => {}} />
    </div>
  </main>;
}
const publicado = new URLSearchParams(window.location.search).get('vista') === 'publicada';
const productoPublico = { ...leerGuardado(), referencia_id: 99, content_id: 'combo-99', precio: inicial.precio_efectivo };
const data = { titulo: 'Sommix', tienda, tema: tienda.colores, content,
  producto: productoPublico, catalogo_items: [productoPublico], checkout: { pasarelas: [] } };
const vistaProducto = new URLSearchParams(window.location.search).get('vista') === 'producto';
const datosProducto = datosRuntimePreview({ productos: [{ ...leerGuardado(), tipo: 'producto', content_id: 'producto-99' }], tienda, venta, vista: 'producto', productoId: 'producto-99' });
createRoot(document.getElementById('root')).render(<MemoryRouter>{vistaProducto ? <div style={{ height: '100vh' }}><CodigoPreview codigo={PLANTILLA_PRODUCTO} datos={datosProducto} /></div> : publicado
  ? <LandingCodigoPublica codigo={PLANTILLA_INICIO} data={data} slug="qa-combo-globales" productId="combo-99" />
  : <Demo />}</MemoryRouter>);
