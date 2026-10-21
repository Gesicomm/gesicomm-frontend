import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';
import ConfigurarVentaCodigo from '../../src/pages/landing-simple/ConfigurarVentaCodigo';
import CodigoPreview from '../../src/pages/landing-simple/CodigoPreview';
import { PLANTILLA_INICIO, PLANTILLA_CATALOGO } from '../../src/pages/landing-simple/plantillasBaseCodigo';
import { datosRuntimePreview } from '../../src/pages/landing-simple/datosRuntime';

const imagen = nombre => `${location.origin}/__dev-lienzo/${nombre}.png`;
const combos = [
  { id: 201, tipo: 'combo', nombre: 'Combo Esenciales', descripcion: 'Dos productos que se complementan para tu rutina diaria.', etiqueta: 'Pack destacado', precio_efectivo: 240000, precio_ancla: 320000, imagen: imagen('colageno'), productos_incluidos: ['Colágeno', 'Magnesio'], productos_combo: [{ id: 1, nombre: 'Colágeno', imagen: imagen('colageno'), precio: 180000 }, { id: 2, nombre: 'Magnesio', imagen: imagen('magnesio'), precio: 140000 }] },
  { id: 202, tipo: 'combo', nombre: 'Combo Cuidado', descripcion: 'Una selección especial para acompañarte todos los días.', etiqueta: 'Pack completo', precio_efectivo: 200000, precio_ancla: 250000, imagen: imagen('adelfit'), productos_incluidos: ['Adelfit', 'Shaker'], productos_combo: [{ id: 3, nombre: 'Adelfit', imagen: imagen('adelfit'), precio: 200000 }, { id: 4, nombre: 'Shaker', imagen: imagen('shaker'), precio: 50000 }] },
  { id: 203, tipo: 'combo', nombre: 'Combo del Día', descripcion: 'Tus favoritos, juntos y listos en un solo pedido.', precio_efectivo: 170000, precio_ancla: 200000, imagen: imagen('implementa'), productos_incluidos: ['Implementa', 'Shaker'], productos_combo: [{ id: 5, nombre: 'Implementa', imagen: imagen('implementa'), precio: 150000 }, { id: 4, nombre: 'Shaker', imagen: imagen('shaker'), precio: 50000 }] },
  { id: 204, tipo: 'combo', nombre: 'Pack para compartir', descripcion: 'Un pack de tres unidades para organizar tu rutina.', precio_efectivo: 360000, imagen: imagen('magnesio'), producto_padre: { id: 2, nombre: 'Magnesio', imagen: imagen('magnesio'), precio: 140000 }, items: [{ cantidad: 2, producto_incluido: { id: 1, nombre: 'Colágeno', imagen: imagen('colageno'), precio: 180000 } }] },
];
const params = new URLSearchParams(location.search);
const demoConfianza = params.get('seccion') === 'confianza';
const oscuro = params.get('tema') === 'oscuro';
const tienda = { nombre: 'Sommix', colores: oscuro ? { fondo: '#0b171c', texto: '#e8eff3', primario: '#a78bfa' } : { fondo: '#ffffff', texto: '#192642', primario: '#6240c7' } };
const ventaBase = { configurado: true, seleccion: 'manual', tipo: 'catalogo', inicio: {
  anuncios: [{ texto: 'Conocé nuestros combos · Elegí todo en un solo pedido' }],
  bloques: demoConfianza ? [{ tipo: 'confianza', visible: true }] : [{ tipo: 'anuncios', visible: true }, { tipo: 'combos', visible: true }],
  confianza_estilo: params.get('estilo') || 'compacta',
} };
const claveDemo = demoConfianza ? 'gesicomm-demo-confianza-inicio-config' : 'gesicomm-demo-combos-inicio-config';
function leerVentaDemo() { try { return JSON.parse(localStorage.getItem(claveDemo)) || ventaBase; } catch { return ventaBase; } }
const venta = leerVentaDemo();
const soloTienda = params.get('vista') !== 'editor';
const catalogo = params.get('vista') === 'catalogo';
const individuales = [{ id: 1, tipo: 'producto', nombre: 'Colágeno individual', precio_efectivo: 180000, imagen: imagen('colageno') }];
const datos = datosRuntimePreview({ productos: [...combos, ...individuales], tienda, venta, vista: catalogo ? 'catalogo' : 'inicio', filtro: params.get('tipo') ? { tipo: params.get('tipo') } : null });

function Demo() {
  const [aviso, setAviso] = useState('Productos y precios de ejemplo');
  function navegar(pedido) {
    if (pedido.destino === 'inicio') { location.href = location.pathname; return; }
    if (pedido.pagina === 'catalogo') { location.href = `${location.pathname}?vista=catalogo${pedido.filtro?.tipo ? '&tipo=' + pedido.filtro.tipo : ''}${oscuro ? '&tema=oscuro' : ''}`; return; }
    setAviso('Esta tarjeta abre la ficha del combo en la tienda publicada.');
  }
  return (

  <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: '12px 20px', background: '#eff5f6', color: '#24434b', borderBottom: '1px solid #d7e2e5', fontSize: 13 }}>
      <strong>Vista local · {demoConfianza ? 'Zona de confianza' : catalogo ? 'Catálogo de combos' : 'Combos en el inicio'}</strong><span>{aviso}</span>
      {catalogo && <a href={location.pathname}>Volver al inicio</a>}
      <a style={{ marginLeft: 'auto', color: '#155e63', textDecoration: 'underline' }} href={`${soloTienda ? '?vista=editor' : '?vista=tienda'}${demoConfianza ? '&seccion=confianza' : ''}${oscuro ? '&tema=oscuro' : ''}`}>{soloTienda ? 'Ver bloque en el editor' : 'Ver sección en la tienda'}</a>
    </div>
    <main style={{ flex: 1, minHeight: 0 }}>
      {soloTienda ? <CodigoPreview key={catalogo ? 'catalogo' : 'inicio'} codigo={catalogo ? PLANTILLA_CATALOGO : PLANTILLA_INICIO} datos={datos} titulo="Combos en el inicio" onNavegar={navegar} onCheckout={() => setAviso('En la tienda publicada, este botón agrega el combo al carrito. Esta demo no crea pedidos.')} /> : <ConfigurarVentaCodigo
        catalogo={{ productos: [], combos }} inicial={{ seleccion: combos, venta }} tipo="catalogo" tienda={tienda}
        cargarOfertas={async () => []} onConfirmar={async ({ venta: guardada }) => { localStorage.setItem(claveDemo, JSON.stringify(guardada)); setAviso('Configuración guardada solo en esta demo local.'); return true; }} onVolver={() => {}}
      />}
    </main>
  </div>
  );
}
createRoot(document.getElementById('root')).render(<MemoryRouter><Demo /></MemoryRouter>);
