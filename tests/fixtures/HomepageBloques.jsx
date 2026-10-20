import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import ConfigurarVentaCodigo from '../../src/pages/landing-simple/ConfigurarVentaCodigo';

const productos = Array.from({ length: 30 }, (_, i) => ({ tipo: 'producto', id: i + 1, slug: `producto-${i}`, nombre: `Producto ${i}`, categoria: 'Hogar', precio_efectivo: 80000 }));
const cargarOfertas = async () => [];
createRoot(document.getElementById('root')).render(
  <div data-testid="contenedor" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ height: 48, flexShrink: 0 }}>Cabecera exterior</div>
    <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <ConfigurarVentaCodigo
        catalogo={{ productos, combos: [] }} inicial={{ seleccion: productos, venta: { configurado: true, seleccion: 'manual', tipo: 'catalogo' } }}
        tipo="catalogo" tienda={{ nombre: 'Tienda de prueba' }}
        cargarOfertas={cargarOfertas} onConfirmar={async () => true} onVolver={() => {}}
      />
    </main>
  </div>,
);
