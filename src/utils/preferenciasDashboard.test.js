import { beforeEach, describe, expect, it, vi } from 'vitest';
import { leerPreferenciaDashboard, guardarPreferenciaDashboard } from './preferenciasDashboard';
import { filtrosInicialesDashboard } from '../pages/dashboard/precargaDashboard';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePreferenciaDashboard } from './preferenciasDashboard';
const actual = vi.hoisted(() => ({ usuario: { id: 171, tiendaId: 69 } }));
vi.mock('./auth', () => ({ sesionVerificadaVigente: () => actual, verificarSesionDetallada: async () => actual }));
vi.mock('../services/courierApi', () => ({ getMetricasDashboardPedidos: vi.fn() }));
vi.mock('../services/landingService', () => ({ landingService: { estadisticasRango: vi.fn() } }));
beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); actual.usuario = { id: 171, tiendaId: 69 }; });
describe('Historial de filtros del dashboard', () => {
 it('hidrata antes de guardar y restaura el mes al volver a montar la vista', async () => {
  guardarPreferenciaDashboard('general', { periodo: 'personalizado_mes', mes: 10, anio: 2026 });
  const defaults = () => ({ periodo: 'este_mes', mes: 11, anio: 2026 });
  const first = renderHook(() => usePreferenciaDashboard('general', defaults));
  await waitFor(() => expect(first.result.current[2]).toBe(true));
  expect(first.result.current[0].mes).toBe(10);
  act(() => first.result.current[1](p => ({ ...p, mes: 9 })));
  first.unmount();
  sessionStorage.clear();
  const second = renderHook(() => usePreferenciaDashboard('general', defaults));
  await waitFor(() => expect(second.result.current[2]).toBe(true));
  expect(second.result.current[0]).toEqual({ periodo: 'personalizado_mes', mes: 9, anio: 2026 });
  second.unmount();
 });
 it('guarda una edición tardía aunque venza la caché breve de identidad', async () => {
  const hook = renderHook(() => usePreferenciaDashboard('operativo', () => ({ reporte: 'resumen', filtros: {} })));
  await waitFor(() => expect(hook.result.current[2]).toBe(true));
  // La clave de la cuenta ya se resolvió al montar; editar no depende de
  // consultar de nuevo el valor de la caché de cinco segundos.
  actual.usuario = null;
  act(() => hook.result.current[1]({ reporte: 'ventas', filtros: { periodo: 'personalizado_mes', mes: 10, anio: 2026 } }));
  expect(JSON.parse(localStorage.getItem('gesicomm.dashboard.operativo.v1.171.69')).filtros.mes).toBe(10);
  hook.unmount();
 });
 it('restaura octubre fijo al recargar y al abrir otra sesión de pestaña', () => {
  guardarPreferenciaDashboard('general', { periodo: 'personalizado_mes', mes: 10, anio: 2026 });
  sessionStorage.clear();
  expect(filtrosInicialesDashboard()).toEqual({ periodo: 'personalizado_mes', mes: 10, anio: 2026, producto_id: undefined });
 });
 it('restaura filtros y reporte operativo sin depender de sessionStorage', () => {
  const valor = { reporte: 'resumen', filtros: { periodo: 'personalizado_mes', mes: 10, anio: 2026 } };
  guardarPreferenciaDashboard('operativo', valor); sessionStorage.clear();
  expect(leerPreferenciaDashboard('operativo')).toEqual(valor);
 });
 it('no comparte la selección entre cuentas, tiendas o dashboards', () => {
  guardarPreferenciaDashboard('general', { periodo: 'personalizado_mes', mes: 10, anio: 2026 });
  expect(leerPreferenciaDashboard('operativo')).toEqual({});
  actual.usuario.tiendaId = 81; expect(leerPreferenciaDashboard('general')).toEqual({});
  actual.usuario = { id: 31, tiendaId: 69 }; expect(leerPreferenciaDashboard('general')).toEqual({});
  actual.usuario = { id: 171, tiendaId: 69 }; expect(leerPreferenciaDashboard('general').mes).toBe(10);
 });
 it('sin identidad confirmada no guarda preferencias compartidas', () => {
  actual.usuario = null; guardarPreferenciaDashboard('general', { mes: 10 });
  expect(localStorage.length).toBe(0); expect(leerPreferenciaDashboard('general')).toEqual({});
 });
 it('tolera datos dañados y almacenamiento bloqueado', () => {
  localStorage.setItem('gesicomm.dashboard.general.v1.171.69', '{');
  expect(filtrosInicialesDashboard().periodo).toBe('este_mes');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('bloqueado'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('bloqueado'); });
  expect(leerPreferenciaDashboard('general')).toEqual({});
  expect(() => guardarPreferenciaDashboard('general', { mes: 10 })).not.toThrow();
 });
});
