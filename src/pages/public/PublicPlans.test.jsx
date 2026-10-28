import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation, Routes, Route } from 'react-router-dom';
import PublicPlans from './PublicPlans';
import Landing from './Landing';
import { planesService } from '../../services/planesService';

vi.mock('../../services/planesService', () => ({ planesService: { listar: vi.fn() } }));
vi.mock('../../components/public/Seo', () => ({ default: () => null, SCHEMA_ORGANIZACION: {} }));
const base = { codigo: 'plan-nuevo-admin', acceso_rutas: 'elegir', nombre: 'Plan creado por admin', resumen: 'Resumen publicado', precio: 123456, moneda: 'PYG', periodicidad: 'mensual', features: ['Beneficio publicado'], etiqueta: 'Edición especial', cta: 'Elegir este plan', destacado: true, activo: true, orden: 2 };
const precio = plan => within(screen.getByRole('heading', { name: plan.nombre }).closest('article'));
function Destino() { const location = useLocation(); return <p>Checkout: {location.pathname}{location.search}</p>; }
function montar() { return render(<MemoryRouter><Routes><Route path="/" element={<PublicPlans />} /><Route path="/checkout/public/:codigo" element={<Destino />} /></Routes></MemoryRouter>); }
beforeEach(() => { vi.clearAllMocks(); planesService.listar.mockResolvedValue([base]); });

it('publica el nombre, importe, beneficios, etiqueta y CTA de un código arbitrario del admin', async () => {
  montar();
  expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  expect(await screen.findByRole('heading', { name: base.nombre })).toBeInTheDocument();
  const card = precio(base);
  expect(card.getByText(/123.456/)).toBeInTheDocument();
  expect(card.getByText(base.resumen)).toBeInTheDocument();
  expect(card.getByText(base.features[0])).toBeInTheDocument();
  expect(card.getByText(base.etiqueta)).toBeInTheDocument();
  fireEvent.click(card.getByRole('button', { name: base.cta }));
  expect(await screen.findByText(/Checkout:/)).toHaveTextContent('/checkout/public/plan-nuevo-admin?ruta=fisico&moneda_referencia=PYG');
});

it('respeta visibilidad, orden y monedas sin calcular precios de respaldo', async () => {
  planesService.listar.mockResolvedValue([
    base,
    { ...base, codigo: 'primero', nombre: 'Primero', orden: 1 },
    { ...base, codigo: 'oculto', nombre: 'Oculto', activo: false },
    { ...base, codigo: 'dolares', nombre: 'Dolarizado', moneda: 'USD', precio: 29.5 },
    { ...base, codigo: 'anual', nombre: 'Anual real', periodicidad: 'anual', precio: 800000 },
    { ...base, codigo: 'unico', nombre: 'Acceso único', periodicidad: 'unico', precio: 900000 },
  ]);
  montar();
  await screen.findByRole('heading', { name: 'Primero' });
  expect(screen.getAllByRole('article').map(el => el.querySelector('h3').textContent)).toEqual(['Primero', base.nombre]);
  expect(screen.queryByRole('heading', { name: 'Oculto' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Anual', exact: true }));
  expect(precio({ nombre: 'Anual real' }).getByText(/800.000/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pago único', exact: true }));
  expect(precio({ nombre: 'Acceso único' }).getByText('pago único')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dólares · USD' }));
  expect(precio({ nombre: 'Dolarizado' }).getByText('US$ 29.5')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Anual', exact: true })).not.toBeInTheDocument();
});

it('al volver a la pestaña toma los cambios y deja de ofrecer planes desactivados', async () => {
  montar();
  await screen.findByRole('heading', { name: base.nombre });
  planesService.listar.mockResolvedValue([{ ...base, nombre: 'Nombre actualizado', precio: 654321, features: ['Nuevo beneficio'] }]);
  fireEvent(window, new Event('focus'));
  await screen.findByRole('heading', { name: 'Nombre actualizado' });
  expect(screen.getByText(/654.321/)).toBeInTheDocument();
  expect(screen.getByText('Nuevo beneficio')).toBeInTheDocument();
  planesService.listar.mockResolvedValue([]);
  fireEvent(window, new Event('focus'));
  expect(await screen.findByText('Por ahora no hay planes disponibles para contratar.')).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

it('si no hay planes activos no inventa tarjetas ni precios', async () => {
  planesService.listar.mockResolvedValue([{ ...base, activo: false }]);
  montar();
  await screen.findByText('Por ahora no hay planes disponibles para contratar.');
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(screen.queryByText(/297.000/)).not.toBeInTheDocument();
});

it('un error de carga se puede reintentar sin ofrecer precios viejos', async () => {
  planesService.listar.mockRejectedValueOnce(new Error('sin conexión'));
  montar();
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los planes');
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByRole('heading', { name: base.nombre });
});

it('la landing muestra el catálogo en su sección de precios y conserva la ruta personal elegida', async () => {
  render(<MemoryRouter><Routes><Route path="/" element={<Landing />} /><Route path="/checkout/public/:codigo" element={<Destino />} /></Routes></MemoryRouter>);
  await screen.findByRole('heading', { name: base.nombre });
  expect(screen.getByRole('heading', { name: base.nombre }).closest('#precios')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Marca personal y servicios', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: base.cta, exact: true }));
  expect(await screen.findByText(/Checkout:/)).toHaveTextContent('ruta=personal');
});
