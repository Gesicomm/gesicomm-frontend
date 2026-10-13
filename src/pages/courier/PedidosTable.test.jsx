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
  const onAbrirDetalle = vi.fn();
  const onAbrirSeguimiento = vi.fn();
  render(<PedidosTable couriers={[]} onChangeEstado={onChangeEstado} onAbrirDetalle={onAbrirDetalle} onAbrirSeguimiento={onAbrirSeguimiento} {...props} />);
  await screen.findByText("Cliente 1");
  return { onChangeEstado, onAbrirDetalle, onAbrirSeguimiento };
}

const irAEtapa = (nombre) => fireEvent.click(
  within(screen.getByRole("tablist", { name: "Filtrar por etapa" })).getByRole("button", { name: nombre }),
);

test("la bandeja no muestra nada de abastecimiento, tampoco en pedidos viejos que lo tenían", async () => {
  await montar();

  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/pendiente de pago|pagar/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  // Tampoco junto al chip de confirmados, donde estaba la pestaña "Seguimiento Abastecimiento".
  await screen.findByRole("button", { name: /^Confirmado\s*2$/ });
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
  // undefined (reading 'label')") porque algunos carriles llegaban sin rótulo.
  const confirmados = await screen.findByRole("region", { name: "Columna Confirmados" });
  expect(within(confirmados).getByText("Cliente 1")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Columna Pendientes" })).toBeInTheDocument();
  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();
});

// Tablero por etapas (2026-10-13): Comercial (Pendiente / Confirmado /
// Cancelado) → Logística (Preparado … Entregado / Devuelto / Perdido) →
// Recompra (los entregados). No hay etapa "Todos".
const encabezados = () => screen.getAllByRole("columnheader").map((th) => th.textContent);
const ultimoPedido = () => getEnviosPaginados.mock.calls.at(-1)[0];

test("las etapas son Comercial, Logística y Recompra, y cada una pide solo sus estados", async () => {
  await montar();

  const etapas = within(screen.getByRole("tablist", { name: "Filtrar por etapa" })).getAllByRole("button");
  expect(etapas.map((b) => b.textContent)).toEqual(["Comercial", "Logística", "Recompra"]);

  // Se entra por Comercial, que llega hasta Confirmado.
  expect(ultimoPedido()).toMatchObject({ estados: ["Pendiente", "EnSeguimiento", "Confirmado", "Cancelado"], incluir_seguimiento: true });
  const chips = () => screen.getAllByRole("button").filter((b) => b.classList.contains("pt-status-chip")).map((b) => b.textContent.replace(/\d+$/, ""));
  expect(chips()).toEqual(["Todos", "Pendiente", "Confirmado", "Cancelado"]);
  expect(encabezados()).toEqual(["#", "Fecha", "Cliente", "Teléfono", "Producto / Oferta", "Total", "Estado comercial", "Seguimiento", "Acción"]);

  irAEtapa("Logística");
  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"]));
  expect(chips()).toEqual(["Todos", "Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"]);
  expect(encabezados()).toContain("Estado logístico");
  expect(encabezados()).not.toContain("Estado comercial");

  irAEtapa("Recompra");
  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Entregado"]));
  expect(encabezados()).toContain("Estado de recompra");
});

test("el estado que se muestra es el de la etapa que se está mirando", async () => {
  getEnviosPaginados.mockResolvedValue({
    data: [
      pedido(1, "EnSeguimiento"),
      pedido(2, "Confirmado"),
      pedido(3, "Despachado", { Courier: { nombre: "Raja" } }),
      pedido(4, "Entregado", { metodo_pago: "Transferencia", seguimiento: { etapa_nombre: "Escalamiento de ventas", fase_id: 401, fase_nombre: "¿Cómo te fue?", fase_posicion: 1, total_fases: 2, terminado: false, cuando: "ahora", motivo: "nuevo" } }),
      pedido(5, "Entregado", { seguimiento: null }),
    ],
    total: 5,
    totalPages: 1,
  });
  await montar();

  const estado = (cliente) => within(screen.getByText(cliente).closest("tr")).getAllByRole("cell")[6];
  // Estado comercial: Pendiente, Confirmado o Cancelado.
  expect(estado("Cliente 1")).toHaveTextContent(/^Pendiente$/);
  expect(estado("Cliente 2")).toHaveTextContent("Confirmado");
  // Estado logístico: el del envío, incluido Entregado.
  expect(estado("Cliente 3")).toHaveTextContent("Despachado");
  expect(estado("Cliente 3")).toHaveTextContent("Raja");
  expect(estado("Cliente 3")).not.toHaveTextContent("Confirmado");
  expect(estado("Cliente 4")).toHaveTextContent("Entregado");

  // En Recompra el mismo entregado muestra cómo viene su escalamiento de ventas.
  irAEtapa("Recompra");
  await waitFor(() => expect(encabezados()).toContain("Estado de recompra"));
  expect(estado("Cliente 4")).toHaveTextContent(/^En seguimiento$/);
  expect(estado("Cliente 5")).toHaveTextContent(/^Sin seguimiento$/);
});

test("el teléfono va en su propia columna y ya no hay botón de WhatsApp en el cliente", async () => {
  await montar();

  const celdas = within(screen.getByText("Cliente 1").closest("tr")).getAllByRole("cell");
  expect(celdas[2]).toHaveTextContent("Cliente 1");
  expect(celdas[2]).not.toHaveTextContent("0981");
  expect(celdas[3]).toHaveTextContent(/^0981 111 222$/);
  expect(screen.queryByRole("button", { name: /WhatsApp/i })).not.toBeInTheDocument();
});

test("la columna Seguimiento muestra el mensaje que toca y abre los mensajes del pedido", async () => {
  const seguimiento = (extra) => ({
    etapa: "CONFIRMACION_PEDIDO_WEB", etapa_nombre: "Confirmación de pedido web", flujo_id: 10, fase_id: 101,
    fase_nombre: "Confirmación", fase_posicion: 1, total_fases: 3, terminado: false, cuando: "ahora", motivo: "nuevo",
    toca_en: null, fase_abierta_en: null, ...extra,
  });
  getEnviosPaginados.mockResolvedValue({
    data: [
      pedido(1, "Pendiente", { seguimiento: seguimiento() }),
      pedido(2, "EnSeguimiento", { seguimiento: seguimiento({ fase_id: 102, fase_nombre: "Recordatorio", fase_posicion: 2, motivo: "vencido", toca_en: "2026-10-01T12:00:00.000Z" }) }),
      pedido(3, "Pendiente", { seguimiento: seguimiento({ fase_id: null, fase_nombre: null, fase_posicion: null, terminado: true, cuando: null, motivo: null }) }),
      pedido(4, "Cancelado", { seguimiento: null }),
    ],
    total: 4,
    totalPages: 1,
  });
  const { onAbrirSeguimiento, onAbrirDetalle } = await montar();

  const celda = (cliente) => within(screen.getByText(cliente).closest("tr")).getAllByRole("cell")[7];
  expect(celda("Cliente 1")).toHaveTextContent("Confirmación de pedido web");
  expect(celda("Cliente 1")).toHaveTextContent("1/3 · Confirmación");
  expect(celda("Cliente 1")).toHaveTextContent("Pendiente de envío");
  expect(within(celda("Cliente 1")).getByText("Pendiente de envío")).toHaveClass("pt-seg__estado--warning");
  expect(celda("Cliente 2")).toHaveTextContent("2/3 · Recordatorio");
  expect(celda("Cliente 2")).toHaveTextContent(/Expiró/);
  expect(within(celda("Cliente 2")).getByText(/Expiró/)).toHaveClass("pt-seg__estado--danger", "is-pulsing");
  expect(celda("Cliente 3")).toHaveTextContent("Todos los mensajes enviados");
  expect(celda("Cliente 3")).toHaveTextContent("Enviado");
  expect(within(celda("Cliente 3")).getByText("Enviado")).toHaveClass("pt-seg__estado--success");
  expect(celda("Cliente 4")).toHaveTextContent(/^—$/);

  fireEvent.click(within(celda("Cliente 2")).getByRole("button", { name: "Seguimiento de Cliente 2" }));

  expect(onAbrirSeguimiento).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  expect(onAbrirDetalle).not.toHaveBeenCalled();
});

test("Pendiente incluye a los pedidos que están en seguimiento, sin chip aparte", async () => {
  getConteoPorEstado.mockResolvedValue({ Pendiente: 3, EnSeguimiento: 2, Confirmado: 4, Cancelado: 1 });
  await montar();

  expect(screen.queryByRole("button", { name: /Seguimiento Contacto/i })).not.toBeInTheDocument();
  const chipPendiente = await screen.findByRole("button", { name: /^Pendiente/ });
  expect(chipPendiente).toHaveTextContent("5");
  fireEvent.click(chipPendiente);

  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Pendiente", "EnSeguimiento"]));
});

test("el estado de cada fila se cambia desde su desplegable, solo hacia los pasos permitidos", async () => {
  getEnviosPaginados.mockResolvedValue({
    data: [pedido(1, "EnSeguimiento"), pedido(2, "Confirmado"), pedido(3, "Despachado"), pedido(4, "Cancelado")],
    total: 4,
    totalPages: 1,
  });
  const onAccionEspecial = vi.fn();
  const { onChangeEstado, onAbrirDetalle } = await montar({ onAccionEspecial });

  const fila = (cliente) => screen.getByText(cliente).closest("tr");
  const abrir = (cliente) => fireEvent.click(within(fila(cliente)).getByRole("button", { name: /^(Pendiente|Confirmado|Despachado|Cancelado)$/ }));
  const opciones = (cliente) => within(within(fila(cliente)).getByRole("menu")).getAllByRole("menuitem").map((o) => o.textContent.replace("✓", ""));

  // Un pendiente (aunque esté en seguimiento) se confirma o se cancela: confirmar abre los datos del pedido.
  abrir("Cliente 1");
  expect(opciones("Cliente 1")).toEqual(["Pendiente", "Confirmado", "Cancelado"]);
  fireEvent.click(within(fila("Cliente 1")).getByRole("menuitem", { name: "Confirmado" }));
  expect(onAbrirDetalle).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

  // Confirmado pasa a Preparado: no se saltea ese paso.
  abrir("Cliente 2");
  expect(opciones("Cliente 2")).toEqual(["Confirmado", "Preparado", "Cancelado"]);
  fireEvent.click(within(fila("Cliente 2")).getByRole("menuitem", { name: "Preparado" }));
  expect(onChangeEstado).toHaveBeenCalledWith(2, "Preparado", expect.objectContaining({ id: 2 }));

  // Despachado: el resultado de la entrega, cada uno con su formulario.
  abrir("Cliente 3");
  expect(opciones("Cliente 3")).toEqual(["Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"]);
  fireEvent.click(within(fila("Cliente 3")).getByRole("menuitem", { name: "Entregado" }));
  expect(onAccionEspecial).toHaveBeenCalledWith("entregar", expect.objectContaining({ id: 3 }));

  // Un estado final no abre nada.
  abrir("Cliente 4");
  expect(within(fila("Cliente 4")).queryByRole("menu")).not.toBeInTheDocument();
});
