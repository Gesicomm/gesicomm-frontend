import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PedidosTable } from "./PedidosTable";
import { estadoParaSeguimiento, esRahaConfirmado } from './orderLifecycle';

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
  id, numero_pedido: 1800 + id, tienda_nombre: "Mi tienda", estado, nombre_cliente: `Cliente ${id}`, telefono: "0981 111 222",
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
  getConteoPorEstado.mockResolvedValue({ Confirmado: 2, logistica_raha: 0, abastecimiento_pagado: 5, total_visible_a_cobrar: 300000, total_cobrado: 0 });
});

async function montar(props = {}) {
  const onChangeEstado = vi.fn();
  const onAbrirDetalle = vi.fn();
  const onAbrirSeguimiento = vi.fn();
  const { esperarCliente = "Cliente 1", ...tableProps } = props;
  const rendered = render(<PedidosTable couriers={[]} onChangeEstado={onChangeEstado} onAbrirDetalle={onAbrirDetalle} onAbrirSeguimiento={onAbrirSeguimiento} {...tableProps} />);
  await screen.findByText(esperarCliente);
  return { ...rendered, onChangeEstado, onAbrirDetalle, onAbrirSeguimiento };
}

const irAEtapa = (nombre) => fireEvent.click(
  within(screen.getByRole("tablist", { name: "Filtrar por etapa" })).getByRole("button", { name: nombre }),
);

test("la bandeja no muestra nada de abastecimiento, tampoco en pedidos viejos que lo tenían", async () => {
  await montar();

  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/pendiente de pago|pagar/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  // Tampoco junto al chip de Pendiente de preparación (ex Confirmados, ahora en Logística),
  // donde estaba la pestaña "Seguimiento Abastecimiento".
  irAEtapa("Logística");
  await screen.findByRole("button", { name: /^Pendiente de preparación\s*2$/ });
  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();
});

test("un pedido confirmado se prepara directo desde su fila en Logística", async () => {
  const { onChangeEstado } = await montar({ etapasDisponibles: ["logistica"], initialEtapa: "logistica", initialEstado: "Confirmado" });
  const fila = screen.getByText("Cliente 1").closest("tr");

  fireEvent.click(within(fila).getByRole("button", { name: /Preparar/ }));

  await waitFor(() => expect(onChangeEstado).toHaveBeenCalledWith(1, "Preparado", expect.objectContaining({ id: 1 })));
});

test("tabla y Kanban muestran la referencia de la tienda y la búsqueda envía el texto completo", async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, "Confirmado", { tienda_id: 9, numero_pedido: 3, numero_pedido_tienda: 1 })], total: 1, totalPages: 1 });
  await montar();
  expect(screen.getByText("MIT-1001")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar por número de pedido" }), { target: { value: "MIT-1001" } });
  await waitFor(() => expect(getEnviosPaginados).toHaveBeenLastCalledWith(expect.objectContaining({ pedido_id: "MIT-1001" })));
  fireEvent.click(screen.getByRole("button", { name: /Kanban/ }));
  irAEtapa("Logística");
  expect(await screen.findByText("MIT-1001")).toBeInTheDocument();
});

test("la vista Kanban del Tablero tampoco muestra avisos de abastecimiento", async () => {
  await montar();

  fireEvent.click(screen.getByRole("button", { name: /Kanban/ }));

  await waitFor(() => expect(getEnviosPaginados).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 })));
  // Regresión: esta vista se caía entera ("Cannot read properties of
  // undefined (reading 'label')") porque algunos carriles llegaban sin rótulo.
  // Comercial ya no tiene a los Confirmados (se mudaron a Logística): el carril
  // Pendientes se reparte por paso del flujo; las columnas se renderizan igual
  // aunque queden vacías con estos datos de prueba.
  expect(screen.getByRole("region", { name: "Columna Paso 1" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Columna Sin mensajes por enviar" })).toBeInTheDocument();
  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();

  irAEtapa("Logística");
  const confirmados = await screen.findByRole("region", { name: "Columna Pendientes de preparación" });
  expect(within(confirmados).getByText("Cliente 1")).toBeInTheDocument();
  expect(screen.queryByText(/abastecimiento/i)).not.toBeInTheDocument();
});

// Tablero por etapas (2026-10-14): Comercial (Pendiente / Cancelado) →
// Logística (Pendiente de preparación [ex Confirmado] … Entregado / Devuelto
// / Perdido) → Recompra (los entregados). Confirmar pasa el pedido directo a
// Logística; Comercial no tiene "Todos" de Confirmado y Logística no tiene
// pestaña "Todos".
const encabezados = () => screen.getAllByRole("columnheader").map((th) => th.textContent);
const ultimoPedido = () => getEnviosPaginados.mock.calls.at(-1)[0];

test("las etapas incluyen Seguimiento de envío y cada una pide solo sus estados", async () => {
  await montar();

  const etapas = within(screen.getByRole("tablist", { name: "Filtrar por etapa" })).getAllByRole("button");
  expect(etapas.map((b) => b.textContent)).toEqual(["Proceso de confirmación", "Seguimiento de envío", "Logística", "Recompra", "Recuperación"]);

  // Se entra por Comercial, que ahora termina en Cancelado: al confirmar, el
  // pedido pasa directo a Logística como "Pendiente de preparación".
  await waitFor(() => expect(ultimoPedido()).toMatchObject({ estados: ["Pendiente", "EnSeguimiento"], incluir_seguimiento: true }));
  const chips = () => screen.getAllByRole("button").filter((b) => b.classList.contains("pt-status-chip")).map((b) => b.textContent.replace(/\d+$/, ""));
  expect(chips()).toEqual(["Pendiente", "Cancelado"]);
  expect(encabezados()).toEqual(["Registro", "Origen", "Fecha", "Cliente", "Teléfono", "Producto / Interés", "Total", "Método de pago", "Estado comercial", "Seguimiento", "Acción"]);

  irAEtapa("Seguimiento de envío");
  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Preparado", "Despachado", "Reprogramado"]));
  expect(chips()).toEqual([]);
  expect(within(screen.getByRole("region", { name: "Estados de seguimiento de envío" })).getAllByText(/Preparado|Despachado|Reprogramado/).map((chip) => chip.textContent))
    .toEqual(["Preparado", "Despachado", "Reprogramado"]);
  expect(ultimoPedido()).toMatchObject({ incluir_seguimiento: true });
  expect(ultimoPedido()).not.toHaveProperty("excluir_logistica_raha");
  expect(encabezados()).toEqual(["Pedido", "Tipo", "Fecha", "Cliente", "Teléfono", "Producto / Oferta", "Total", "Método de pago", "Estado logístico", "Mensaje de seguimiento", "Acción"]);
  await waitFor(() => expect(getConteoPorEstado.mock.calls.at(-1)[0]).not.toHaveProperty("separar_logistica_raha"));

  irAEtapa("Logística");
  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Confirmado", "Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"]));
  // Sin "Todos": Envíos RAHA primero, Pendiente de preparación y el resto de los estados de siempre.
  expect(chips()).toEqual(["Envíos RAHA", "Pendiente de preparación", "Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"]);
  fireEvent.click(screen.getAllByRole("button").find((b) => b.classList.contains("pt-status-chip") && b.textContent.startsWith("Pendiente de preparación")));
  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Confirmado"]));
  expect(encabezados()).toContain("Estado logístico");
  expect(encabezados()).not.toContain("Estado comercial");
  expect(encabezados()).not.toContain("Seguimiento");
  await waitFor(() => expect(ultimoPedido()).not.toHaveProperty("incluir_seguimiento"));

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

  const estado = (cliente) => within(screen.getByText(cliente).closest("tr")).getAllByRole("cell")[8];
  // Estado comercial: Pendiente o Cancelado (Confirmado ya es logístico).
  expect(estado("Cliente 1")).toHaveTextContent(/^Pendiente$/);
  expect(estado("Cliente 2")).toHaveTextContent("Pendiente de preparación");
  // Estado logístico: el del envío, incluido Entregado.
  expect(estado("Cliente 3")).toHaveTextContent("Despachado");
  expect(estado("Cliente 3")).toHaveTextContent("Raja");
  expect(estado("Cliente 3")).not.toHaveTextContent("Pendiente de preparación");
  expect(estado("Cliente 4")).toHaveTextContent("Entregado");

  // En Recompra el mismo entregado muestra cómo viene su escalamiento de ventas.
  irAEtapa("Recompra");
  await waitFor(() => expect(encabezados()).toContain("Estado de recompra"));
  expect(estado("Cliente 4")).toHaveTextContent(/^En seguimiento$/);
  expect(estado("Cliente 5")).toHaveTextContent(/^Sin seguimiento$/);
});

test("Logística tiene el subestado Envíos RAHA y muestra solo estados RAHA sin cambio manual", async () => {
  getConteoPorEstado.mockResolvedValue({
    Preparado: 1,
    Despachado: 0,
    Reprogramado: 0,
    Entregado: 0,
    Devuelto: 0,
    Perdido: 0,
    logistica_raha: 1,
  });
  getEnviosPaginados.mockResolvedValue({
    data: [
      pedido(9, "Confirmado", {
        raha_logistica: {
          gestionado: true,
          order_id: "900000000123456",
          external_order_id: "GESICOMM-sandbox-7-9",
          environment: "sandbox",
          gesicom_tienda_id: 1,
          gesicom_store_name: "Mobfre",
          tienda_id: "65",
          store_name: "sommix",
          remote_http_status: 201,
          status: "en_camino",
          eventos: [
            { id: 1, tipo: "shipment.status_changed", status: "cargado", occurred_at: "2026-10-13T12:00:00.000Z" },
            { id: 2, tipo: "shipment.status_changed", status: "en_camino", occurred_at: "2026-10-13T13:00:00.000Z" },
          ],
        },
      }),
    ],
    total: 1,
    totalPages: 1,
  });

  const { onChangeEstado } = await montar({ esperarCliente: "Cliente 9" });

  irAEtapa("Logística");
  fireEvent.click(await screen.findByRole("button", { name: /^Envíos RAHA/ }));

  await waitFor(() => expect(ultimoPedido()).toMatchObject({ logistica_raha: true }));
  const fila = await screen.findByText("Cliente 9").then((el) => el.closest("tr"));
  expect(within(fila).getByText("Despachado")).toBeInTheDocument();
  expect(within(fila).queryByText(/Tienda RAHA/)).not.toBeInTheDocument();
  expect(within(fila).queryByText(/Enviado como/)).not.toBeInTheDocument();
  expect(within(fila).queryByRole("button", { name: /Confirmado|Preparado|Despachado|En tránsito/ })).not.toBeInTheDocument();
  expect(within(fila).queryByRole("button", { name: /Ver timeline/ })).not.toBeInTheDocument();

  fireEvent.click(fila);
  const estados = await screen.findByLabelText("Timeline RAHA del pedido #MIT-2809");
  expect(within(estados).getByText("Confirmado")).toBeInTheDocument();
  expect(within(estados).getByText("Despachado")).toBeInTheDocument();
  expect(within(estados).getByText("Preparado")).toBeInTheDocument();
  expect(within(estados).getByText("Entregado")).toBeInTheDocument();
  expect(within(estados).queryByText("Devuelto")).not.toBeInTheDocument();
  expect(screen.queryByText("Estado actual RAHA")).not.toBeInTheDocument();
  expect(screen.queryByText("Resultado")).not.toBeInTheDocument();
  expect(screen.queryByText("Mobfre")).not.toBeInTheDocument();
  expect(screen.queryByText("sommix")).not.toBeInTheDocument();
  expect(screen.queryByText("GESICOMM-sandbox-7-9")).not.toBeInTheDocument();
  expect(screen.queryByText(/Estos estados vienen de RAHA/)).not.toBeInTheDocument();
  expect(onChangeEstado).not.toHaveBeenCalled();
});

test("Logística RAHA muestra cuando falta la confirmación de RAHA", async () => {
  getConteoPorEstado.mockResolvedValue({
    Preparado: 0,
    Despachado: 0,
    Reprogramado: 0,
    Entregado: 0,
    Devuelto: 0,
    Perdido: 0,
    logistica_raha: 1,
  });
  getEnviosPaginados.mockResolvedValue({
    data: [
      pedido(10, "Confirmado", {
        raha_logistica: {
          gestionado: true,
          order_id: "900000000999999",
          external_order_id: "GESICOMM-sandbox-7-10",
          environment: "sandbox",
          gesicom_tienda_id: 1,
          gesicom_store_name: "Mobfre",
          tienda_id: "65",
          store_name: "sommix",
          remote_http_status: 201,
          status: "pendiente_confirmacion",
          eventos: [],
        },
      }),
    ],
    total: 1,
    totalPages: 1,
  });

  await montar({ esperarCliente: "Cliente 10" });
  irAEtapa("Logística");
  fireEvent.click(await screen.findByRole("button", { name: /^Envíos RAHA/ }));

  const fila = await screen.findByText("Cliente 10").then((el) => el.closest("tr"));
  expect(within(fila).getByText("Confirmado")).toBeInTheDocument();
  expect(within(fila).queryByText(/Tienda RAHA/)).not.toBeInTheDocument();
});

test("el teléfono va en su propia columna y ya no hay botón de WhatsApp en el cliente", async () => {
  await montar();

  const celdas = within(screen.getByText("Cliente 1").closest("tr")).getAllByRole("cell");
  expect(celdas[3]).toHaveTextContent("Cliente 1");
  expect(celdas[3]).not.toHaveTextContent("0981");
  expect(celdas[4]).toHaveTextContent(/^0981 111 222$/);
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

  const celda = (cliente) => within(screen.getByText(cliente).closest("tr")).getAllByRole("cell")[9];
  expect(celda("Cliente 1")).toHaveTextContent("Confirmación de pedido web");
  expect(celda("Cliente 1")).toHaveTextContent("1/3 · Confirmación");
  expect(celda("Cliente 1")).toHaveTextContent("Mensaje por enviar");
  expect(within(celda("Cliente 1")).getByText("Mensaje por enviar")).toHaveClass("pt-seg__estado--warning");
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
  // Acotado a los chips de filtro: el badge de la fila también puede decir
  // "Pendiente de preparación" (Confirmado, ahora en Logística) y matchea el mismo regex.
  const filtrosSecundarios = await screen.findByRole("region", { name: "Filtros secundarios de comercial" });
  const chipPendiente = within(filtrosSecundarios).getByRole("button", { name: /^Pendiente\d+$/ });
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
  const abrir = (cliente) => fireEvent.click(within(fila(cliente)).getByRole("button", { name: /^(Pendiente|Pendiente de preparación|Despachado|Cancelado)$/ }));
  // El menú se monta fuera de la tabla para escapar de su scroll.
  const opciones = () => within(screen.getByRole("menu")).getAllByRole("menuitem").map((o) => o.textContent.replace("✓", ""));

  // Un pendiente (aunque esté en seguimiento) se confirma o se cancela: confirmar abre los datos del pedido.
  // Las opciones NO seleccionadas del menú muestran el valor crudo del estado
  // ("Confirmado"), no el rótulo "Pendiente de preparación" — ese solo se usa
  // para el badge del estado actual (ver EstadoBadgeDropdown).
  abrir("Cliente 1");
  expect(opciones()).toEqual(["Pendiente", "Confirmado", "Cancelado"]);
  fireEvent.click(screen.getByRole("menuitem", { name: "Confirmado" }));
  expect(onAbrirDetalle).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

  // Confirmado (ahora "Pendiente de preparación") pasa a Preparado: no se saltea ese paso.
  abrir("Cliente 2");
  expect(opciones()).toEqual(["Pendiente de preparación", "Preparado", "Cancelado"]);
  fireEvent.click(screen.getByRole("menuitem", { name: "Preparado" }));
  expect(onChangeEstado).toHaveBeenCalledWith(2, "Preparado", expect.objectContaining({ id: 2 }));

  // Despachado muestra su estado; el resultado se elige en Acción.
  const celdasDespachado = within(fila("Cliente 3")).getAllByRole("cell");
  expect(celdasDespachado[8]).toHaveTextContent("Despachado");
  expect(within(celdasDespachado[8]).queryByRole("button")).not.toBeInTheDocument();
  fireEvent.click(within(celdasDespachado.at(-1)).getByRole("button", { name: "Cambiar estado" }));
  expect(opciones()).toEqual(["Entregado", "Reprogramado", "Devuelto", "Perdido"]);
  fireEvent.click(screen.getByRole("menuitem", { name: "Entregado" }));
  expect(onAccionEspecial).toHaveBeenCalledWith("entregar", expect.objectContaining({ id: 3 }));

  // Un estado final no abre nada.
  abrir("Cliente 4");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

const ETAPAS_COMERCIALES = ["comercial", "seguimiento_envio", "recompra", "recuperacion"];
const SEGUIMIENTO_ENVIO = {
  etapa: "SEGUIMIENTO_ENVIO", etapa_nombre: "Seguimiento de envío", flujo_id: 30,
  fase_id: 301, fase_nombre: "Pedido confirmado", fase_posicion: 1, total_fases: 3,
  terminado: false, cuando: "ahora", motivo: "nuevo",
};

test("Recuperación reúne Devuelto y Perdido sin subestados, abre sus mensajes y tiene Kanban propio", async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, "Devuelto", { seguimiento: { ...SEGUIMIENTO_ENVIO, etapa: "RECUPERACION_CLIENTES", etapa_nombre: "Recuperación de clientes", fase_nombre: "Contacto tras incidencia" } })], total: 1, totalPages: 1 });
  const { onAbrirSeguimiento } = await montar({ etapasDisponibles: ETAPAS_COMERCIALES });
  irAEtapa("Recuperación");
  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Devuelto", "Perdido"]));
  expect(screen.queryByRole("region", { name: "Filtros secundarios de recuperacion" })).not.toBeInTheDocument();
  expect(ultimoPedido()).toMatchObject({ incluir_seguimiento: true });
  expect(encabezados()).toContain("Estado de recuperación");
  const fila = within(screen.getByText("Cliente 1").closest("tr"));
  expect(fila.getByText("Devuelto")).toBeInTheDocument();
  expect(fila.getByText("1/3 · Contacto tras incidencia")).toBeInTheDocument();
  fireEvent.click(fila.getByRole("button", { name: "Seguimiento" }));
  expect(onAbrirSeguimiento).toHaveBeenCalledWith(expect.objectContaining({ estado: "Devuelto" }));
  fireEvent.click(screen.getByRole("button", { name: /Kanban/ }));
  const columna = await screen.findByRole("region", { name: "Columna Con mensajes por enviar" });
  expect(within(columna).getByText("Cliente 1")).toBeInTheDocument();
  // La tarjeta muestra el paso del flujo; la etapa ya la dice la columna.
  expect(within(columna).getByText("Contacto tras incidencia")).toBeInTheDocument();
});

test("el Kanban de Proceso de confirmación reparte los pendientes por paso del flujo", async () => {
  const seg = (fase_posicion, extra = {}) => ({ seguimiento: { ...SEGUIMIENTO_ENVIO, fase_posicion, fase_nombre: `Fase ${fase_posicion}`, ...extra } });
  getEnviosPaginados.mockResolvedValue({ data: [
    pedido(41, "Pendiente", seg(1)),
    pedido(42, "Pendiente", seg(2)),
    pedido(43, "Pendiente", seg(4)),
    pedido(44, "Pendiente", { seguimiento: null }),
    pedido(45, "Pendiente", seg(2, { terminado: true })),
  ], total: 5, totalPages: 1 });
  await montar({ esperarCliente: "Cliente 41" });
  fireEvent.click(screen.getByRole("button", { name: /Kanban/ }));
  const col = async (nombre) => within(await screen.findByRole("region", { name: `Columna ${nombre}` }));
  expect((await col("Paso 1")).getByText("Cliente 41")).toBeInTheDocument();
  expect((await col("Paso 2")).getByText("Cliente 42")).toBeInTheDocument();
  expect((await col("Paso 3 o más")).getByText("Cliente 43")).toBeInTheDocument();
  const sin = await col("Sin mensajes por enviar");
  expect(sin.getByText("Cliente 44")).toBeInTheDocument();
  expect(sin.getByText("Cliente 45")).toBeInTheDocument();
  expect(screen.getByText(/Cada columna es el paso del flujo de WhatsApp/)).toBeInTheDocument();
});

test.each(["Devuelto", "Perdido"])("Recuperación reúne las incidencias aunque se llegue con el filtro anterior %s", async (estadoAnterior) => {
  getEnviosPaginados.mockImplementation(async ({ estados }) => {
    const data = [pedido(1, "Devuelto"), pedido(2, "Perdido")].filter((p) => estados.includes(p.estado));
    return { data, total: data.length, totalPages: 1 };
  });
  await montar({ etapasDisponibles: ETAPAS_COMERCIALES, initialEtapa: "recuperacion", initialEstado: estadoAnterior });
  expect(await screen.findByText("Cliente 2")).toBeInTheDocument();
  expect(ultimoPedido().estados).toEqual(["Devuelto", "Perdido"]);
  expect(screen.queryByRole("region", { name: "Filtros secundarios de recuperacion" })).not.toBeInTheDocument();
});

test.each([
  ["Entregado", "entregar"],
  ["Reprogramado", "reprogramar"],
  ["Devuelto", "devolver"],
  ["Perdido", "perder"],
])("en Despachado, Acción permite elegir %s y abre su formulario", async (estado, tipoModal) => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, "Despachado")], total: 1, totalPages: 1 });
  const onAccionEspecial = vi.fn();
  const { onChangeEstado, onAbrirDetalle } = await montar({ etapasDisponibles: ["logistica"], initialEtapa: "logistica", initialEstado: "Despachado", onAccionEspecial });
  const celdas = within(screen.getByText("Cliente 1").closest("tr")).getAllByRole("cell");
  const acciones = within(celdas.at(-1));

  expect(celdas[8]).toHaveTextContent(/^Despachado$/);
  expect(within(celdas[8]).queryByRole("button")).not.toBeInTheDocument();
  fireEvent.click(acciones.getByRole("button", { name: "Cambiar estado" }));
  expect(screen.queryByRole("menuitem", { name: "Confirmado" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("menuitem", { name: estado }));

  expect(onAccionEspecial).toHaveBeenCalledWith(tipoModal, expect.objectContaining({ id: 1, estado: "Despachado" }));
  expect(onChangeEstado).not.toHaveBeenCalled();
  expect(onAbrirDetalle).not.toHaveBeenCalled();
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("el desplegable de Acción se cierra con Escape, clic fuera o desplazamiento de la tabla", async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, "Despachado")], total: 1, totalPages: 1 });
  await montar({ etapasDisponibles: ["logistica"], initialEtapa: "logistica", initialEstado: "Despachado" });
  const boton = screen.getByRole("button", { name: "Cambiar estado" });
  fireEvent.click(boton);
  fireEvent.keyDown(screen.getByRole("menuitem", { name: "Entregado" }), { key: "Escape" });
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(boton).toHaveFocus();

  fireEvent.click(boton);
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();

  fireEvent.click(boton);
  fireEvent.scroll(document.querySelector(".pt-table-wrap"));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("Seguimiento de envío gestiona mensajes y muestra el estado logístico sin acción de preparar", async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, "Preparado", { seguimiento: SEGUIMIENTO_ENVIO, accion_siguiente: VIEJO_CON_ABASTECIMIENTO.accion_siguiente })], total: 1, totalPages: 1 });
  const { onAbrirSeguimiento, onChangeEstado } = await montar({ etapasDisponibles: ETAPAS_COMERCIALES, initialEtapa: "seguimiento_envio" });
  const fila = within(screen.getByText("Cliente 1").closest("tr"));

  expect(within(screen.getByRole("tablist", { name: "Filtrar por etapa" })).getAllByRole("button").map((button) => button.textContent))
    .toEqual(["Proceso de confirmación", "Seguimiento de envío", "Recompra", "Recuperación"]);

  expect(encabezados()).toContain("Mensaje de seguimiento");
  expect(fila.getByText("Preparado")).toBeInTheDocument();
  expect(fila.getByText("1/3 · Pedido confirmado")).toBeInTheDocument();
  expect(fila.queryByRole("button", { name: /Preparar|Pendiente de preparación/ })).not.toBeInTheDocument();
  fireEvent.click(fila.getByRole("button", { name: "Seguimiento" }));
  expect(onAbrirSeguimiento).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  expect(onChangeEstado).not.toHaveBeenCalled();
});

test("Logística no muestra mensajes ni accesos a WhatsApp en tabla y Kanban", async () => {
  getEnviosPaginados.mockResolvedValue({
    data: [pedido(1, "Confirmado", {
      seguimiento: SEGUIMIENTO_ENVIO,
      recordatorio_estado: "PENDIENTE", recordatorio_ejecutar_en: "2026-10-15T12:00:00.000Z",
      accion_siguiente: VIEJO_CON_ABASTECIMIENTO.accion_siguiente,
    })], total: 1, totalPages: 1,
  });
  const { onAbrirSeguimiento } = await montar({ etapasDisponibles: ["logistica"], initialEtapa: "logistica", initialEstado: "Confirmado" });
  expect(encabezados()).toEqual(["Pedido", "Tipo", "Fecha", "Cliente", "Teléfono", "Producto / Oferta", "Total", "Método de pago", "Estado logístico", "Acción"]);
  expect(screen.queryByText("1/3 · Pedido confirmado")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Preparar" })).toBeInTheDocument();
  expect(ultimoPedido()).not.toHaveProperty("incluir_seguimiento");

  fireEvent.click(screen.getByRole("button", { name: /Kanban/ }));
  await screen.findByRole("region", { name: "Columna Pendientes de preparación" });
  expect(screen.queryByRole("button", { name: /WhatsApp|seguimiento|mensaje/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Pendientes del pedido")).not.toBeInTheDocument();
  expect(onAbrirSeguimiento).not.toHaveBeenCalled();
  expect(ultimoPedido()).toMatchObject({ limit: 100 });
  expect(ultimoPedido()).not.toHaveProperty("incluir_seguimiento");
});

test('una orden RAHA creada está confirmada y ofrece seguimiento sin una confirmación adicional', async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, 'Confirmado', { raha_logistica: { gestionado: true, status: 'pendiente_confirmacion' } })], total: 1, totalPages: 1 });
  getConteoPorEstado.mockResolvedValue({ Confirmado: 1, Preparado: 0, Despachado: 0, Reprogramado: 0 });
  const { onAbrirSeguimiento } = await montar({ etapasDisponibles: ETAPAS_COMERCIALES, initialEtapa: 'seguimiento_envio' });
  const fila = screen.getByText('Cliente 1').closest('tr');
  expect(within(fila).getByText('Confirmado')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Estados de seguimiento de envío' })).toHaveTextContent('Confirmado1');
  expect(screen.queryByText(/Pendiente de confirmación/)).not.toBeInTheDocument();
  expect(screen.queryByText('Pendiente de confirmación RAHA')).not.toBeInTheDocument();
  expect(ultimoPedido()).toMatchObject({ seguimiento_comercial: true, incluir_confirmados_raha: true, estados: ['Preparado', 'Despachado', 'Reprogramado'] });
  expect(ultimoPedido()).not.toHaveProperty('excluir_logistica_raha');
  expect(getConteoPorEstado.mock.calls.at(-1)[0]).toMatchObject({ seguimiento_comercial: true });
  fireEvent.click(within(fila).getByRole('button', { name: 'Seguimiento', exact: true }));
  expect(onAbrirSeguimiento).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  expect(within(fila).queryByText('Espera confirmación')).not.toBeInTheDocument();
  expect(within(fila).queryByRole('button', { name: 'Preparar' })).not.toBeInTheDocument();
});

test('al enviar a RAHA el pedido confirmado queda solo en seguimiento de envío, también en Kanban', async () => {
  const pedidos = [pedido(1, 'Confirmado', { raha_logistica: { gestionado: true, status: 'pendiente_confirmacion' } }), pedido(2, 'Pendiente')];
  getEnviosPaginados.mockImplementation(async ({ estados, incluir_confirmados_raha }) => {
    const data = pedidos.filter(p => estados.includes(estadoParaSeguimiento(p)) || (incluir_confirmados_raha && esRahaConfirmado(p)));
    return { data, total: data.length, totalPages: 1 };
  });
  getConteoPorEstado.mockResolvedValue({ Pendiente: 1, Confirmado: 1 });
  await montar({ esperarCliente: 'Cliente 2', etapasDisponibles: ETAPAS_COMERCIALES, initialEtapa: 'comercial' });
  expect(screen.queryByText('Cliente 1')).not.toBeInTheDocument();
  irAEtapa('Seguimiento de envío');
  await screen.findByText('Cliente 1');
  expect(screen.queryByText('Cliente 2')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Kanban/ }));
  const esperando = await screen.findByRole('region', { name: 'Columna Confirmados' });
  expect(within(esperando).getByText('Cliente 1')).toBeInTheDocument();
});

test('Kanban reúne el despachado RAHA en Preparados aunque el estado local siga Confirmado', async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, 'Confirmado', { raha_logistica: { gestionado: true, status: 'cargado' }, seguimiento: SEGUIMIENTO_ENVIO })], total: 1, totalPages: 1 });
  await montar({ etapasDisponibles: ETAPAS_COMERCIALES, initialEtapa: 'seguimiento_envio' });
  fireEvent.click(screen.getByRole('button', { name: /Kanban/ }));
  const columna = await screen.findByRole('region', { name: 'Columna Preparados' });
  expect(within(columna).getByText('Cliente 1')).toBeInTheDocument();
  expect(ultimoPedido()).toMatchObject({ seguimiento_comercial: true });
});

test.each([['cargado', 'Preparado', 'info'], ['en_camino', 'Despachado', 'violet']])('RAHA %s usa la etiqueta y color del estado común %s', async (status, label, tone) => {
  getConteoPorEstado.mockResolvedValue({ Preparado: 1, Despachado: 1, Confirmado: 0 });
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, 'Confirmado', { raha_logistica: { gestionado: true, status }, seguimiento: SEGUIMIENTO_ENVIO })], total: 1, totalPages: 1 });
  await montar({ etapasDisponibles: ETAPAS_COMERCIALES, initialEtapa: 'seguimiento_envio' });
  const fila = screen.getByText('Cliente 1').closest('tr');
  expect(fila).toHaveAttribute('data-followup-tone', tone);
  expect(within(fila).getByText(label)).toBeInTheDocument();
  const leyenda = screen.getByRole('region', { name: 'Estados de seguimiento de envío' });
  expect(leyenda.querySelectorAll('.pt-status-chip')).toHaveLength(3);
  expect(leyenda).not.toHaveTextContent('RAHA');
});

test('Recompra RAHA ofrece seguimiento aunque todavía quede una acción local de preparación', async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, 'Confirmado', { raha_logistica: { gestionado: true, status: 'entregado' }, accion_siguiente: VIEJO_CON_ABASTECIMIENTO.accion_siguiente })], total: 1, totalPages: 1 });
  const { onAbrirSeguimiento } = await montar({ etapasDisponibles: ETAPAS_COMERCIALES, initialEtapa: 'recompra' });
  expect(screen.queryByRole('button', { name: 'Preparar' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Seguimiento', exact: true }));
  expect(onAbrirSeguimiento).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  expect(ultimoPedido()).toMatchObject({ estados: ['Entregado'], seguimiento_comercial: true });
});

test("seguimiento bloquea pedidos pendientes antiguos y su Kanban comienza en Preparado", async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(1, "Confirmado", { seguimiento: SEGUIMIENTO_ENVIO })], total: 1, totalPages: 1 });
  const { onAbrirSeguimiento } = await montar({ etapasDisponibles: ETAPAS_COMERCIALES, initialEtapa: "seguimiento_envio", initialEstado: "Confirmado" });
  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Preparado", "Despachado", "Reprogramado"]));
  const fila = within(screen.getByText("Cliente 1").closest("tr"));
  for (const boton of fila.getAllByRole("button", { name: /Seguimiento/ })) {
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
  }
  expect(onAbrirSeguimiento).not.toHaveBeenCalled();
  expect(within(screen.getByRole("region", { name: "Estados de seguimiento de envío" })).getAllByText(/Preparado|Despachado|Reprogramado/).map((chip) => chip.textContent))
    .toEqual(["Preparado", "Despachado", "Reprogramado"]);
  fireEvent.click(screen.getByRole("button", { name: /Kanban/ }));
  await screen.findByRole("region", { name: "Columna Preparados" });
  expect(screen.queryByRole("region", { name: "Columna Pendientes de preparación" })).not.toBeInTheDocument();
  expect(screen.queryByText("Cliente 1")).not.toBeInTheDocument();
});

test("al confirmar sale de comercial y recién al prepararse aparece en Seguimiento de envío", async () => {
  let estado = "Pendiente";
  getEnviosPaginados.mockImplementation(async ({ estados }) => {
    const data = estados.includes(estado) ? [pedido(1, estado, { seguimiento: estado === "Preparado" ? SEGUIMIENTO_ENVIO : null })] : [];
    return { data, total: data.length, totalPages: 1 };
  });
  const props = { couriers: [], etapasDisponibles: ETAPAS_COMERCIALES };
  const { rerender, onAbrirSeguimiento } = await montar(props);

  // El guardado de la confirmación actualiza Envio.estado y refrescarKey.
  estado = "Confirmado";
  rerender(<PedidosTable {...props} refrescarKey={1} onAbrirSeguimiento={onAbrirSeguimiento} />);
  await waitFor(() => expect(screen.queryByText("Cliente 1")).not.toBeInTheDocument());
  irAEtapa("Seguimiento de envío");
  await waitFor(() => expect(ultimoPedido().estados).toEqual(["Preparado", "Despachado", "Reprogramado"]));
  expect(screen.queryByText("Cliente 1")).not.toBeInTheDocument();
  estado = "Preparado";
  rerender(<PedidosTable {...props} refrescarKey={2} onAbrirSeguimiento={onAbrirSeguimiento} />);
  const fila = within((await screen.findByText("Cliente 1")).closest("tr"));
  expect(fila.getByText("1/3 · Pedido confirmado")).toBeInTheDocument();

  // La entrega cierra esta etapa; el pedido ya pertenece a Recompra.
  estado = "Entregado";
  rerender(<PedidosTable {...props} refrescarKey={3} onAbrirSeguimiento={onAbrirSeguimiento} />);
  await waitFor(() => expect(screen.queryByText("Cliente 1")).not.toBeInTheDocument());
  irAEtapa("Recompra");
  expect(await screen.findByText("Cliente 1")).toBeInTheDocument();
});


test('distingue el lead con productos de interés del pedido y separa sus contadores', async () => {
  getEnviosPaginados.mockResolvedValue({ data: [pedido(88, 'Pendiente', { origen: 'WHATSAPP', es_lead: true, lead_tipo_manual: 'organico' })], total: 2, total_leads: 1, total_pedidos: 1, totalPages: 1 });
  await montar({ esperarCliente: 'Cliente 88' });
  expect(screen.getByText('LEAD-88')).toBeInTheDocument();
  expect(screen.getByText('Lead · Sin pedido')).toBeInTheDocument();
  expect(screen.getByText('Valor de interés')).toBeInTheDocument();
  expect(screen.getByText('1 lead · 1 pedido')).toBeInTheDocument();
});

describe('seguimiento operativo desde las tarjetas móviles', () => {
  let originalMatchMedia;
  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });
  afterEach(() => { window.matchMedia = originalMatchMedia; });

  test('un pedido sin resumen de seguimiento conserva acceso a sus mensajes', async () => {
    const envio = pedido(1, 'Pendiente', { seguimiento: null });
    getEnviosPaginados.mockResolvedValue({ data: [envio], total: 1, totalPages: 1 });
    const { onAbrirSeguimiento, onAbrirDetalle } = await montar();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje de seguimiento' }));
    expect(onAbrirSeguimiento).toHaveBeenCalledWith(envio);
    expect(onAbrirDetalle).not.toHaveBeenCalled();
  });

  test('muestra la fase pendiente y permite confirmar un mensaje ya abierto', async () => {
    const envio = pedido(1, 'Pendiente', { seguimiento: { etapa: 'CONFIRMACION_PEDIDO_WEB', etapa_nombre: 'Confirmación', fase_id: 102, fase_nombre: 'Recordatorio', fase_posicion: 2, total_fases: 3, fase_abierta_en: '2026-10-17T12:30:00Z' } });
    getEnviosPaginados.mockResolvedValue({ data: [envio], total: 1, totalPages: 1 });
    const { onAbrirSeguimiento } = await montar();
    expect(screen.getByText('2/3 · Recordatorio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envío del mensaje' }));
    expect(onAbrirSeguimiento).toHaveBeenCalledWith(expect.objectContaining({ seguimiento: expect.objectContaining({ fase_id: 102 }) }));
  });

  test('logística mantiene Preparar y las acciones de detalle e historial', async () => {
    const onAbrirHistorial = vi.fn();
    const { onChangeEstado, onAbrirDetalle } = await montar({ etapasDisponibles: ['logistica'], initialEtapa: 'logistica', initialEstado: 'Confirmado', onAbrirHistorial });
    const tarjeta = screen.getByRole('article', { name: /MIT-2801/ });
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Preparar' }));
    await waitFor(() => expect(onChangeEstado).toHaveBeenCalledWith(1, 'Preparado', expect.objectContaining({ id: 1 })));
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Ver / editar pedido' }));
    expect(onAbrirDetalle).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Historial' }));
    expect(onAbrirHistorial).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
});

test("el total dice si el envío lo absorbe el comercio o ya está incluido, y avisa los pedidos sin productos", async () => {
  getEnviosPaginados.mockResolvedValue({
    data: [
      pedido(31, "Confirmado", { costo_envio: 15000, delivery_a_cargo: "negocio" }),
      pedido(32, "Confirmado", { costo_envio: 20000, delivery_a_cargo: "cliente" }),
      pedido(33, "Confirmado", { items: [] }),
    ],
    total: 3,
    totalPages: 1,
  });
  await montar({ esperarCliente: "Cliente 31" });
  const fila = (cliente) => screen.getByText(cliente).closest("tr");
  expect(within(fila("Cliente 31")).getByText(/Envío Gs\.? 15\.000 a tu cargo/)).toBeInTheDocument();
  expect(within(fila("Cliente 32")).getByText(/Incluye envío Gs\.? 20\.000/)).toBeInTheDocument();
  expect(within(fila("Cliente 31")).queryByText(/^\+/)).not.toBeInTheDocument();
  expect(within(fila("Cliente 33")).getByText("Sin productos cargados")).toBeInTheDocument();
});

test("el Por cobrar del resumen pide los mismos estados que la tabla", async () => {
  await montar();
  irAEtapa("Logística");
  await waitFor(() => expect(getConteoPorEstado.mock.calls.at(-1)[0].estados_totales).toEqual(["Confirmado", "Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"]));
  fireEvent.click(screen.getAllByRole("button").find((b) => b.classList.contains("pt-status-chip") && b.textContent.startsWith("Pendiente de preparación")));
  await waitFor(() => expect(getConteoPorEstado.mock.calls.at(-1)[0].estados_totales).toEqual(["Confirmado"]));
});
