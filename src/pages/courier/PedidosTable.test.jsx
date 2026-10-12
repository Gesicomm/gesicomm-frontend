import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PedidosTable } from "./PedidosTable";

// El abastecimiento Gesicom por pedido ya no existe (2026-10-11): la tienda no
// paga ni espera mercadería para vender. La bandeja no tiene que mostrar nada
// de eso, ni siquiera en pedidos viejos que quedaron con un estado de
// abastecimiento guardado, y un pedido confirmado se prepara directo.

vi.mock("../../services/courierApi", () => ({
  getEnviosPaginados: vi.fn(),
  getConteoPorEstado: vi.fn(),
  getConteoPorAbastecimiento: vi.fn(),
  getResumenEntregados: vi.fn(),
  getMetodosPago: vi.fn(async () => []),
  deleteEnvio: vi.fn(),
}));
vi.mock("../../services/canalVentaService", () => ({ canalVentaService: { listar: vi.fn(async () => []) } }));
vi.mock("../../services/seguimiento.service", () => ({
  seguimientoService: { getEtiquetas: vi.fn(async () => []), getFlujos: vi.fn(async () => []) },
}));
vi.mock("../../utils/auth", () => ({ verificarSesion: vi.fn(async () => ({ id: 7, rol: "usuario" })) }));

import { getEnviosPaginados, getConteoPorEstado } from "../../services/courierApi";

const pedido = (id, estado, extra = {}) => ({
  id, numero_pedido: 1800 + id, estado, nombre_cliente: `Cliente ${id}`, telefono: "0981 111 222",
  ciudad: "Luque", monto: 150000, costo_envio: 0, createdAt: "2026-10-11T12:00:00.000Z",
  items: [{ nombre_producto: "Mancuerna 5kg", cantidad: 1 }],
  ...extra,
});

// Un confirmado viejo, con todo lo que dejaba guardado el abastecimiento.
const VIEJO_CON_ABASTECIMIENTO = pedido(1, "Confirmado", {
  abastecimiento_estado: "pendiente_pago",
  abastecimiento_costo: 90000,
  tipo_logistica_abastecimiento: null,
  accion_siguiente: { tipo: "preparar", cta: "Preparar", tono: "info", siguiente_estado: "Preparado", descripcion: "Separar y embalar." },
});
const EN_TRANSITO_VIEJO = pedido(2, "Confirmado", {
  abastecimiento_estado: "en_transito_a_deposito_cliente",
  abastecimiento_costo: 50000,
  accion_siguiente: { tipo: "preparar", cta: "Preparar", tono: "info", siguiente_estado: "Preparado" },
});

beforeEach(() => {
  vi.clearAllMocks();
  getEnviosPaginados.mockResolvedValue({ data: [VIEJO_CON_ABASTECIMIENTO, EN_TRANSITO_VIEJO], total: 2, totalPages: 1 });
  getConteoPorEstado.mockResolvedValue({ Confirmado: 2, abastecimiento_pagado: 5, total_visible_a_cobrar: 300000, total_cobrado: 0 });
});

async function montar(props = {}) {
  const onChangeEstado = vi.fn();
  render(<PedidosTable couriers={[]} onChangeEstado={onChangeEstado} onAbrirDetalle={vi.fn()} onAbrirSeguimiento={vi.fn()} {...props} />);
  await screen.findByText("Cliente 1");
  return { onChangeEstado };
}

test("la bandeja no muestra nada de abastecimiento, tampoco en pedidos viejos que lo tenían", async () => {
  await montar();

  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/pendiente de pago|pagar/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  // Tampoco al entrar a la etapa comercial, donde estaba la pestaña "Seguimiento Abastecimiento".
  fireEvent.click(screen.getByRole("button", { name: "Comercial" }));
  await screen.findByRole("button", { name: /Confirmado/ });
  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();
});

test("un pedido confirmado se prepara directo desde su fila", async () => {
  const { onChangeEstado } = await montar();
  const fila = screen.getByText("Cliente 1").closest("tr");

  fireEvent.click(within(fila).getByRole("button", { name: /Preparar/ }));

  await waitFor(() => expect(onChangeEstado).toHaveBeenCalledWith(1, "Preparado", expect.objectContaining({ id: 1 })));
});

test("la vista Kanban del Tablero tampoco muestra avisos de abastecimiento", async () => {
  await montar();

  fireEvent.click(screen.getByRole("button", { name: /Kanban/ }));

  await waitFor(() => expect(getEnviosPaginados).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 })));
  // Regresión: esta vista se caía entera ("Cannot read properties of
  // undefined (reading 'label')") porque los carriles Pendientes,
  // Confirmados y Cancelados llegaban sin rótulo.
  const confirmados = await screen.findByRole("region", { name: "Columna Confirmados" });
  expect(within(confirmados).getByText("Cliente 1")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Columna Pendientes" })).toBeInTheDocument();
  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();
});

// Tablero simplificado (2026-10-12): la tabla muestra el estado comercial y,
// recién cuando el pedido pasa a logística, el logístico. Los estados de
// seguimiento y de recompra ya no se muestran.
const encabezados = () => screen.getAllByRole("columnheader").map((th) => th.textContent);

test("sin pedidos en logística la tabla solo tiene el estado comercial", async () => {
  getEnviosPaginados.mockResolvedValue({
    data: [pedido(1, "EnSeguimiento", { recordatorio_id: 9, recordatorio_vencido: true, recompra_activa: true })],
    total: 1,
    totalPages: 1,
  });
  await montar();

  expect(encabezados()).toEqual(["#", "Fecha", "Cliente", "Producto / Oferta", "Total", "Estado comercial", "Acción"]);
  const fila = screen.getByText("Cliente 1").closest("tr");
  expect(within(fila).getByText("Pendiente")).toBeInTheDocument();
  expect(screen.queryByText(/recompra/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/acción vencida|disponible al confirmar|seguimiento activo|confirmación de pedido web/i)).not.toBeInTheDocument();
});

test("el estado logístico aparece recién cuando un pedido pasa a logística", async () => {
  getEnviosPaginados.mockResolvedValue({
    data: [pedido(1, "Pendiente"), pedido(2, "Despachado", { Courier: { nombre: "Raja" } })],
    total: 2,
    totalPages: 1,
  });
  await montar();

  expect(encabezados()).toEqual(["#", "Fecha", "Cliente", "Producto / Oferta", "Total", "Estado comercial", "Estado logístico", "Acción"]);
  const celdaLogistica = (cliente) => within(screen.getByText(cliente).closest("tr")).getAllByRole("cell")[6];
  expect(celdaLogistica("Cliente 1")).toBeEmptyDOMElement();
  expect(celdaLogistica("Cliente 2")).toHaveTextContent("Despachado");
  expect(celdaLogistica("Cliente 2")).toHaveTextContent("Raja");
});

test("no hay etapa Recompra ni chip de seguimiento, y Pendiente incluye a los que están en seguimiento", async () => {
  getConteoPorEstado.mockResolvedValue({ Pendiente: 3, EnSeguimiento: 2, Confirmado: 1, recompra_activa: 4, seguimiento_vencidos: 5 });
  await montar();

  expect(screen.queryByRole("button", { name: "Recompra" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Comercial" }));
  expect(screen.queryByText(/seguimiento/i)).not.toBeInTheDocument();

  const chipPendiente = await screen.findByRole("button", { name: /^Pendiente/ });
  expect(chipPendiente).toHaveTextContent("5");
  fireEvent.click(chipPendiente);

  await waitFor(() => expect(getEnviosPaginados).toHaveBeenCalledWith(
    expect.objectContaining({ estados: ["Pendiente", "EnSeguimiento"] })
  ));
});
