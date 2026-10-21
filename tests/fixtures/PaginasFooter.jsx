import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import ConfigurarVentaCodigo from '../../src/pages/landing-simple/ConfigurarVentaCodigo';
import { plantillaInicioPara } from '../../src/pages/landing-simple/plantillasBaseCodigo';
import { landingSimpleService } from '../../src/services/landingSimpleService';

const producto = { id: 1, tipo: 'producto', slug: 'uno', nombre: 'Producto de muestra', precio_efectivo: 100000 };
const venta = { configurado: true, tipo: 'catalogo', seleccion: 'manual', abrir_en: 'tienda' };

function Fixture() {
  const [codigos, setCodigos] = useState(() => JSON.parse(localStorage.getItem('footer-test') || 'null') || { inicio: plantillaInicioPara('catalogo') });
  return <main style={{ height: '100dvh' }}><ConfigurarVentaCodigo
    catalogo={{ productos: [producto], combos: [] }} inicial={{ venta, seleccion: [producto] }}
    tienda={{ nombre: 'SomMix', email: 'hola@sommix.com', colores: { fondo: '#ffffff', texto: '#08111f', primario: '#ff5c45' } }}
    landing={{ id: 240, titulo: 'SomMix', content: { venta } }} codigos={codigos}
    onCambiarCodigo={(key, parte, valor) => setCodigos(prev => ({ ...prev, [key]: { ...prev[key], [parte]: valor } }))}
    cargarOfertas={async () => []} onVolver={() => {}}
    onSubirImagen={async archivo => { const form = new FormData(); form.append('imagen', archivo); const { url } = await landingSimpleService.subirImagenFicha(240, form); return url; }}
    onConfirmar={async () => { localStorage.setItem('footer-test', JSON.stringify(codigos)); }}
  /></main>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
