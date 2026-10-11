import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ResumenTab } from "./ResumenTab";

// Lo que se cuida acá:
//  - el tablero es un Kanban con una columna por fase;
//  - buscar, filtrar y paginar se le pide al backend (el componente no
//    filtra ni corta nada: muestra la página que le mandan);
//  - un pedido se abre en la fase en la que está, y pasa de fase cuando se
//    marca el mensaje como enviado.

const item = (id, fase, extra = {}) => ({
  envio_id: id, numero_pedido: 1800 + id, estado: "EnSeguimiento", cliente: `Cliente ${id}`, telefono: "0981 111 222",
  ciudad: "Luque", monto: 150000, productos: "Mancuerna 5kg", creado_en: "2026-10-11T10:00:00.000Z",
  flujo_id: 1, flujo_nombre: "Confirmación de pedido",
  fase_id: fase.fase_id, fase_orden: fase.orden, fase_nombre: fase.nombre, fase_origen: "derivada", fase_abierta_en: null,
  cuando: "ahora", motivo: "nuevo", recordatorio: null, ultima_fase_completada_en: null,
  ...extra,
});

const FASE_1 = { clave: "101", fase_id: 101, orden: 1, nombre: "Confirmación", espera_sugerida_minutos: 0 };
const FASE_2 = { clave: "102", fase_id: 102, orden: 2, nombre: "Recordatorio", espera_sugerida_minutos: 240 };

const ETAPAS = [
  { tipo: "CONFIRMACION_PEDIDO_WEB", nombre: "Confirmación de pedido web", descripcion: "Pedidos nuevos por confirmar.", pedidos: 27, vencidos: 1 },
  { tipo: "VENTA_WHATSAPP", nombre: "Venta por WhatsApp", descripcion: "Ventas por WhatsApp.", pedidos: 0, vencidos: 0 },
  { tipo: "SEGUIMIENTO_ENVIO", nombre: "Seguimiento de envío", descripcion: "Pedidos ya confirmados.", pedidos: 4, vencidos: 2 },
  { tipo: "ESCALAMIENTO_VENTAS", nombre: "Escalamiento de ventas", descripcion: "Pedidos entregados.", pedidos: 3, vencidos: 0 },
];

const AVISO_ENVIO = { clave: "301", fase_id: 301, orden: 1, nombre: "Pedido confirmado", espera_sugerida_minutos: 0 };

/** La etapa de envío: otro flujo, otras columnas, otros pedidos. */
function tableroDeEnvio() {
  return {
    etapa: "SEGUIMIENTO_ENVIO", etapas: ETAPAS,
    flujos: [{ id: 3, nombre: "Seguimiento de envío", predeterminado: true, pendientes: 4 }],
    flujo_id: 3,
    totales: { ahora: 4, hoy: 0, despues: 0, sin_fecha: 0 },
    truncado: false,
    columnas: [{
      ...AVISO_ENVIO, conteo: { ahora: 4, hoy: 0, despues: 0, sin_fecha: 0 },
      data: [item(50, AVISO_ENVIO, { cliente: "Noelia Cáceres", estado: "Despachado", etapa: "SEGUIMIENTO_ENVIO" })],
      total: 4, page: 1, totalPages: 1, limit: 10,
    }],
  };
}

/** Respuesta del backend: la fase 1 tiene 25 pedidos y manda de a 10. */
function tablero({ etapa, paginas = {}, busqueda, cuando } = {}) {
  if (etapa === "SEGUIMIENTO_ENVIO") return tableroDeEnvio();
  const pagina1 = paginas["101"] || 1;
  const fase1 = busqueda || cuando
    ? [item(7, FASE_1, { cliente: "Carlos Benítez" })]
    : Array.from({ length: pagina1 === 3 ? 5 : 10 }, (_, i) => item((pagina1 - 1) * 10 + i + 1, FASE_1));
  const totalFase1 = busqueda || cuando ? 1 : 25;
  return {
    etapa: "CONFIRMACION_PEDIDO_WEB", etapas: ETAPAS,
    flujos: [{ id: 1, nombre: "Confirmación de pedido", predeterminado: true, pendientes: 27 }],
    flujo_id: 1,
    totales: { ahora: 26, hoy: 1, despues: 0, sin_fecha: 0 },
    vencidos: 1,
    truncado: false,
    columnas: [
      { ...FASE_1, conteo: { ahora: 25, hoy: 0, despues: 0, sin_fecha: 0 }, vencidos: 0, data: fase1, total: totalFase1, page: pagina1, totalPages: Math.ceil(totalFase1 / 10), limit: 10 },
      {
        ...FASE_2, conteo: { ahora: 1, hoy: 1, despues: 0, sin_fecha: 0 }, vencidos: 1,
        data: busqueda || cuando ? [] : [
          item(30, FASE_2, { cliente: "Lucía Fernández", fase_abierta_en: "2026-10-11T12:55:00.000Z", motivo: "vencido", recordatorio: { id: 8, estado: "VENCIDO", ejecutar_en: "2026-10-11T09:00:00.000Z" } }),
          item(31, FASE_2, { cliente: "Derlis Ayala", cuando: "hoy", motivo: "programado", recordatorio: { id: 9, estado: "PENDIENTE", ejecutar_en: "2026-10-11T21:30:00.000Z" } }),
        ],
        total: busqueda || cuando ? 0 : 2, page: 1, totalPages: 1, limit: 10,
      },
    ],
  };
}

const VENTAS = {
  recibidos: { cantidad: 12, monto: 1800000 }, por_confirmar: { cantidad: 4, monto: 600000 },
  en_curso: { cantidad: 3, monto: 450000 }, entregados: { cantidad: 5, monto: 750000 },
  cancelados: { cantidad: 0, monto: 0 }, devueltos_perdidos: { cantidad: 0, monto: 0 },
};

function nuevosServicios(extra = {}) {
  return {
    resumen: vi.fn(async () => ({ ventas: VENTAS })),
    tablero: vi.fn(async (filtros) => tablero(filtros)),
    pendientes: vi.fn(async () => ({ data: [item(1, FASE_1), item(2, FASE_1)], total: 26, page: 1, totalPages: 1, limit: 50 })),
    enviarMensaje: vi.fn(async () => ({ whatsapp_url: "https://wa.me/595981111222?text=Hola" })),
    completarFase: vi.fn(async () => ({ siguiente_fase: null, recordatorios_cumplidos: [] })),
    ...extra,
  };
}

const servicioSeguimiento = {
  getFlujosPedido: vi.fn(async () => [{
    id: 1, nombre: "Confirmación de pedido", envios_totales: 1,
    fases: [
      { id: 101, flujo_id: 1, orden: 1, nombre: "Confirmación", espera_sugerida_minutos: 0, envios: 1, ultimo_envio_en: "2026-10-11T09:00:00.000Z", completada: true, mensaje_resuelto: "Mensaje de Confirmación" },
      { id: 102, flujo_id: 1, orden: 2, nombre: "Recordatorio", espera_sugerida_minutos: 240, envios: 1, ultimo_envio_en: "2026-10-11T12:55:00.000Z", completada: false, mensaje_resuelto: "Mensaje de Recordatorio" },
    ],
  }]),
  getConfiguracion: vi.fn(async () => ({ tiempos_rapidos_horas: [4] })),
  getEtiquetasPedido: vi.fn(async () => []),
  getEtiquetas: vi.fn(async () => []),
  completarFase: vi.fn(async () => ({ siguiente_fase: null, recordatorios_cumplidos: [] })),
};

async function montar(servicios = nuevosServicios()) {
  render(
    <MemoryRouter>
      <ResumenTab servicios={servicios} servicioSeguimiento={servicioSeguimiento} />
    </MemoryRouter>,
  );
  await screen.findByRole("region", { name: "Fase 1: Confirmación" });
  return servicios;
}

const columna = (nombre) => screen.getByRole("region", { name: nombre });
const tarjetas = (col) => within(col).queryAllByRole("article");

beforeEach(() => vi.clearAllMocks());

test("es un Kanban: una columna por fase, con el número de pedido en cada tarjeta", async () => {
  await montar();

  const fase1 = columna("Fase 1: Confirmación");
  const fase2 = columna("Fase 2: Recordatorio");
  expect(tarjetas(fase1)).toHaveLength(10);
  expect(tarjetas(fase2)).toHaveLength(2);
  expect(within(fase1).getByText("#1801")).toBeInTheDocument();
  expect(within(fase2).getByText("Lucía Fernández")).toBeInTheDocument();
  expect(within(fase1).getByText("1–10 de 25")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Empezar a enviar \(26\)/ })).toBeInTheDocument();
  expect(screen.getByText("12")).toBeInTheDocument(); // pedidos recibidos
});

test("el selector de etapa pide al backend el tablero de esa etapa, con su flujo y sus pedidos", async () => {
  const servicios = await montar();
  expect(servicios.tablero).toHaveBeenLastCalledWith(expect.objectContaining({ etapa: "CONFIRMACION_PEDIDO_WEB" }));
  // Las cuatro etapas están siempre, cada una con cuántos pedidos tiene.
  expect(screen.getAllByRole("tab").map((t) => t.textContent.replace(/\s+/g, " ").trim())).toEqual([
    "Confirmación de pedido web 27 1 vencido", "Venta por WhatsApp 0", "Seguimiento de envío 4 2 vencidos", "Escalamiento de ventas 3",
  ]);

  fireEvent.click(screen.getByRole("tab", { name: /Seguimiento de envío/ }));

  await waitFor(() => expect(servicios.tablero).toHaveBeenLastCalledWith(expect.objectContaining({ etapa: "SEGUIMIENTO_ENVIO", paginas: {} })));
  const aviso = await screen.findByRole("region", { name: "Fase 1: Pedido confirmado" });
  expect(within(aviso).getByText("Noelia Cáceres")).toBeInTheDocument();
  expect(within(aviso).getByText(/Despachado, sin avisos enviados/)).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Fase 2: Recordatorio" })).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /Seguimiento de envío/ })).toHaveAttribute("aria-selected", "true");
});

test("lo vencido se ve en rojo en la pestaña, la columna y la tarjeta, y tiene su filtro", async () => {
  const servicios = await montar();

  // Pestaña: avisa aunque no sea la etapa que se está mirando.
  expect(within(screen.getByRole("tab", { name: /Seguimiento de envío/ })).getByText(/2 vencidos/)).toHaveClass("rp-etapa-vencidos");
  expect(screen.getByRole("tab", { name: /Venta por WhatsApp/ }).querySelector(".rp-etapa-vencidos")).toBeNull();

  // Columna y tarjeta de la etapa abierta.
  const fase2 = columna("Fase 2: Recordatorio");
  expect(within(fase2).getByText("1 vencido")).toHaveClass("rp-vencidos");
  expect(within(fase2).getByText("Lucía Fernández").closest("article")).toHaveClass("rp-tarjeta--vencido");
  expect(within(fase2).getByText("Derlis Ayala").closest("article")).not.toHaveClass("rp-tarjeta--vencido");

  // Filtro: se le pide al backend, no se filtra acá.
  fireEvent.click(screen.getByRole("button", { name: "Vencidos 1" }));
  await waitFor(() => expect(servicios.tablero).toHaveBeenLastCalledWith(expect.objectContaining({ cuando: "vencido", paginas: {} })));
});

test("paginar una columna le pide esa página al backend, sin tocar las demás", async () => {
  const servicios = await montar();
  const fase1 = columna("Fase 1: Confirmación");

  fireEvent.click(within(fase1).getByRole("button", { name: "Página siguiente" }));

  await waitFor(() => expect(servicios.tablero).toHaveBeenLastCalledWith(expect.objectContaining({ paginas: { 101: 2 }, limit: 10 })));
  await within(columna("Fase 1: Confirmación")).findByText("11–20 de 25");
  expect(within(columna("Fase 1: Confirmación")).getByText("#1811")).toBeInTheDocument();
});

test("buscar y filtrar viajan al backend y vuelven a la primera página", async () => {
  const servicios = await montar();
  fireEvent.click(within(columna("Fase 1: Confirmación")).getByRole("button", { name: "Página siguiente" }));
  await waitFor(() => expect(servicios.tablero).toHaveBeenCalledTimes(2));

  fireEvent.change(screen.getByPlaceholderText(/Buscar cliente/), { target: { value: "benítez" } });

  await waitFor(() => expect(servicios.tablero).toHaveBeenLastCalledWith(expect.objectContaining({ busqueda: "benítez", paginas: {} })));
  await within(columna("Fase 1: Confirmación")).findByText("Carlos Benítez");
  expect(tarjetas(columna("Fase 1: Confirmación"))).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Hoy más tarde" }));
  await waitFor(() => expect(servicios.tablero).toHaveBeenLastCalledWith(expect.objectContaining({ cuando: "hoy", busqueda: "benítez" })));

  fireEvent.change(screen.getByLabelText("Registros por página"), { target: { value: "20" } });
  await waitFor(() => expect(servicios.tablero).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 20, paginas: {} })));
});

test("tocar una tarjeta abre el panel parado en la fase en la que está el pedido", async () => {
  await montar();

  fireEvent.click(within(columna("Fase 2: Recordatorio")).getByRole("button", { name: /Pedido 1830, Lucía Fernández/ }));

  const panel = await screen.findByRole("dialog");
  expect(within(panel).getByText(/Pedido #1830 · Lucía Fernández/)).toBeInTheDocument();
  await within(panel).findByText("Toca ahora");
  expect(within(panel).getByText("Mensaje de Recordatorio")).toBeInTheDocument();
  expect(servicioSeguimiento.getFlujosPedido).toHaveBeenCalledWith(30);

  // WhatsApp ya se abrió para esa fase: el botón principal es marcarla.
  fireEvent.click(within(panel).getByRole("button", { name: /Marcar como enviado/ }));
  await waitFor(() => expect(servicioSeguimiento.completarFase).toHaveBeenCalledWith(30, 102));
});

test("la tarjeta tiene los dos pasos: primero enviar el mensaje, después marcarlo", async () => {
  const servicios = await montar();
  const abrir = vi.spyOn(window, "open").mockImplementation(() => null);
  const sinEnviar = within(columna("Fase 2: Recordatorio")).getByText("Derlis Ayala").closest("article");

  // Antes de enviar: "Enviar mensaje" es el paso disponible y marcar está bloqueado.
  expect(within(sinEnviar).getByRole("button", { name: /Marcar como enviado/ })).toBeDisabled();
  fireEvent.click(within(sinEnviar).getByRole("button", { name: /Enviar mensaje/ }));

  await waitFor(() => expect(servicios.enviarMensaje).toHaveBeenCalledWith(31, { fase_id: 102, telefono: "0981 111 222" }));
  await waitFor(() => expect(abrir).toHaveBeenCalledWith("https://wa.me/595981111222?text=Hola", "_blank"));
  // Enviar no mueve al pedido: no se llamó a completar.
  expect(servicios.completarFase).not.toHaveBeenCalled();
  abrir.mockRestore();
});

test("después de enviar, \"Marcar como enviado\" es lo que pasa el pedido de fase", async () => {
  const servicios = await montar();
  const yaEnviado = within(columna("Fase 2: Recordatorio")).getByText("Lucía Fernández").closest("article");

  expect(within(yaEnviado).getByText(/WhatsApp abierto/)).toBeInTheDocument();
  expect(within(yaEnviado).getByRole("button", { name: /Reenviar/ })).toBeEnabled();
  fireEvent.click(within(yaEnviado).getByRole("button", { name: /Marcar como enviado/ }));

  await waitFor(() => expect(servicios.completarFase).toHaveBeenCalledWith(30, 102));
  // El tablero se vuelve a pedir: el pedido ya está en otra columna.
  await waitFor(() => expect(servicios.tablero).toHaveBeenCalledTimes(2));
});

test("\"Empezar a enviar\" arma la cola con lo que devuelve el backend para ahora", async () => {
  const servicios = await montar();

  fireEvent.click(screen.getByRole("button", { name: /Empezar a enviar/ }));

  await waitFor(() => expect(servicios.pendientes).toHaveBeenCalledWith({ etapa: "CONFIRMACION_PEDIDO_WEB", flujo_id: 1, cuando: "ahora", page: 1, limit: 50 }));
  const panel = await screen.findByRole("dialog");
  expect(within(panel).getByText("Pedido 1 de 2")).toBeInTheDocument();

  fireEvent.click(within(panel).getByRole("button", { name: /Siguiente pedido/ }));
  await waitFor(() => expect(screen.getByText("Pedido 2 de 2")).toBeInTheDocument());
});

test("una etapa sin flujo activo manda a Flujos y plantillas", async () => {
  const servicios = nuevosServicios({
    tablero: vi.fn(async () => ({ etapa: "CONFIRMACION_PEDIDO_WEB", etapas: ETAPAS, flujos: [], flujo_id: null, totales: { ahora: 0, hoy: 0, despues: 0, sin_fecha: 0 }, columnas: [], truncado: false })),
  });
  render(<MemoryRouter><ResumenTab servicios={servicios} servicioSeguimiento={servicioSeguimiento} /></MemoryRouter>);

  expect(await screen.findByRole("link", { name: /Ir a Flujos y plantillas/ })).toHaveAttribute("href", "/pedidos/configuracion");
  expect(screen.getByRole("button", { name: /Nada para enviar ahora/ })).toBeDisabled();
});
