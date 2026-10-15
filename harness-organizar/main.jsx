import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';
import ConfigurarVentaCodigo from '../src/pages/landing-simple/ConfigurarVentaCodigo';

// Banco de pruebas temporal de "Organizar productos": datos falsos, sin
// backend. Borrar la carpeta al terminar.
const foto = n => `${window.location.origin}/__dev-lienzo/${n}.png`;
const p = (id, slug, nombre, categoria, precio, img) => ({ tipo: 'producto', id, slug, nombre, categoria, precio_efectivo: precio, imagen: foto(img) });
const productos = [
  p(1, 'adelfit', 'AdelFit – Suplemento para bajar de peso', 'Suplementos', 40000, 'adelfit'),
  p(2, 'implementa', 'Implementa · Dolores articulares', 'Suplementos', 170000, 'implementa'),
  p(3, 'colageno', 'Colágeno hidrolizado 300 g', 'Suplementos', 95000, 'colageno'),
  p(4, 'magnesio', 'Magnesio + Zinc 60 cápsulas', 'Vitaminas', 65000, 'magnesio'),
  p(5, 'shaker', 'Shaker deportivo 600 ml', 'Accesorios', 35000, 'shaker'),
  p(6, 'adelfit2', 'AdelFit x2 – Tratamiento 60 días', 'Suplementos', 75000, 'adelfit2'),
];
function App() {
  return (
    <MemoryRouter>
      <ConfigurarVentaCodigo
        catalogo={{ productos, combos: [] }}
        inicial={{ seleccion: productos, venta: { configurado: true } }}
        cargarOfertas={() => Promise.resolve([])}
        onConfirmar={async (payload) => { window.__ultimoGuardado = payload; return true; }}
        onVolver={() => {}}
      />
    </MemoryRouter>
  );
}
createRoot(document.getElementById('root')).render(<App />);
