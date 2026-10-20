import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';
import ProductList from '../../src/pages/productos/ProductList';
import VitrinaGrid from '../../src/pages/vitrina/VitrinaGrid';

const esVitrina = new URLSearchParams(location.search).get('lista') === 'vitrina';
createRoot(document.getElementById('root')).render(
  <MemoryRouter>{esVitrina ? <VitrinaGrid /> : <ProductList />}</MemoryRouter>,
);
