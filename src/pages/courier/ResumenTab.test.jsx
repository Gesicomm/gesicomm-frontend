import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ResumenTab } from "./ResumenTab";

// Lo que se cuida acá: los números del tablero y la lista de abajo salen de
// la misma lista, y la cola de trabajo recorre exactamente lo filtrado.

const FASES = [
  { id: 101, orden: 1, nombre: "Confirmación", espera_sugerida_minutos: 0 },
  { id: 102, orden: 2, nombre: "Recordatorio", espera_sugerida_minutos: 240 },
];

const item = (id, fase, cuando, motivo, cliente) => ({
  envio_id: id, numero_pedido: 1800 + id, estado: "EnSeguimiento", cliente, telefono: "0981 111 222",
  ciudad: "Luque", monto: 150000, productos: "Mancuerna 5kg", creado_en: "2026-10-11T10:00:00.000Z",
  flujo_id: 1, flujo_nombre: "Confirmación de pedido",
  fase_id: fase.id, fase_orden: fase.orden, fase_nombre: fase.nombre, fase_origen: "derivada",
  cuando, motivo, recordatorio: null, ultimo_contacto_en: null, aperturas: 0,
});

const ITEMS = [
  item(1, FASES[0], "ahora", "nuevo", "María González"),
  item(2, FASES[1], "ahora", "nuevo", "Carlos Benítez"),
  item(3, FASES[1], "ahora", "nuevo", "Lucía Fernández"),
  item(4, FASES[1], "hoy", "nuevo", "Derlis Ayala"),
];

const respuesta = () => ({
  ventas: {
    recibidos: { cantidad: 12, monto: 1800000 }, por_confirmar: { cantidad: 4, monto: 600000 },
    en_curso: { cantidad: 3, monto: 450000 }, entregados: { cantidad: 5, monto: 750000 },
    cancelados: { cantidad: 0, monto: 0 }, devueltos_perdidos: { cantidad: 0, monto: 0 },
  },
  seguimiento: {
    totales: { ahora: 3, hoy: 1, despues: 0, sin_fecha: 0 },
    sin_fase: { ahora: 0, hoy: 0, despues: 0, sin_fecha: 0 },
    flujos: [{
      id: 1, nombre: "Confirmación de pedido",
      fases: [
        { ...FASES[0], ahora: 1, hoy: 0, despues: 0, sin_fecha: 0 },
        { ...FASES[1], ahora: 2, hoy: 1, despues: 0, sin_fecha: 0 },
      ],
    }],
    items: ITEMS,
    truncado: false,
  },
});

const servicioSeguimiento = {
  getFlujosPedido: vi.fn(async () => [{
    id: 1, nombre: "Confirmación de pedido", envios_totales: 0,
    fases: FASES.map((f) => ({ ...f, flujo_id: 1, envios: 0, ultimo_envio_en: null, mensaje_resuelto: `Mensaje de ${f.nombre}` })),
  }]),
  getConfiguracion: vi.fn(async () => ({ tiempos_rapidos_horas: [4] })),
  getEtiquetasPedido: vi.fn(async () => []),
  getEtiquetas: vi.fn(async () => []),
};

async function montar(servicio = vi.fn(async () => respuesta())) {
  render(
    <MemoryRouter>
      <ResumenTab servicio={servicio} servicioSeguimiento={servicioSeguimiento} />
    </MemoryRouter>,
  );
  await screen.findByText("Mensajes por enviar");
  return { servicio };
}

const filas = () => screen.queryAllByRole("listitem");

beforeEach(() => vi.clearAllMocks());

test("al entrar muestra lo que hay para enviar ahora, de todas las fases", async () => {
  await montar();

  expect(screen.getByRole("button", { name: /Empezar a enviar \(3\)/ })).toBeInTheDocument();
  expect(filas()).toHaveLength(3);
  expect(screen.getByText("12")).toBeInTheDocument(); // pedidos recibidos
});

test("el número de una fase y la lista que abre coinciden", async () => {
  await montar();

  const fase2 = screen.getByText("Recordatorio", { selector: ".rp-fase-nombre" }).closest("article");
  const botonAhora = within(fase2).getByRole("button", { name: /para enviar ahora/ });
  expect(botonAhora).toHaveTextContent("2");

  fireEvent.click(botonAhora);

  expect(filas()).toHaveLength(2);
  expect(screen.getByText("Carlos Benítez")).toBeInTheDocument();
  expect(screen.queryByText("María González")).not.toBeInTheDocument();

  fireEvent.click(within(fase2).getByRole("button", { name: /hoy más tarde/ }));
  expect(filas()).toHaveLength(1);
  expect(screen.getByText("Derlis Ayala")).toBeInTheDocument();
});

test("la cola recorre lo filtrado: abre el panel con la fase que toca y avanza", async () => {
  await montar();
  const fase2 = screen.getByText("Recordatorio", { selector: ".rp-fase-nombre" }).closest("article");
  fireEvent.click(within(fase2).getByRole("button", { name: /para enviar ahora/ }));

  fireEvent.click(screen.getByText("Carlos Benítez"));

  const panel = await screen.findByRole("dialog");
  expect(within(panel).getByText(/Pedido #1802 · Carlos Benítez/)).toBeInTheDocument();
  expect(within(panel).getByText("Pedido 1 de 2")).toBeInTheDocument();
  await within(panel).findByText("Toca ahora");
  // La vista previa de la fase que toca arranca abierta.
  expect(within(panel).getByText("Mensaje de Recordatorio")).toBeInTheDocument();
  expect(servicioSeguimiento.getFlujosPedido).toHaveBeenCalledWith(2);

  fireEvent.click(within(panel).getByRole("button", { name: /Siguiente pedido/ }));

  await waitFor(() => expect(screen.getByText(/Pedido #1803 · Lucía Fernández/)).toBeInTheDocument());
  expect(screen.getByText("Pedido 2 de 2")).toBeInTheDocument();

  // En el último, el botón cierra la cola y se vuelve a pedir el resumen.
  fireEvent.click(screen.getByRole("button", { name: /Terminar/ }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("cambiar el período vuelve a pedir el resumen con otro rango", async () => {
  const { servicio } = await montar();
  const [primerRango] = servicio.mock.calls[0];
  expect(primerRango.fecha_desde).toBe(primerRango.fecha_hasta);

  fireEvent.click(screen.getByRole("button", { name: "7 días" }));

  await waitFor(() => expect(servicio).toHaveBeenCalledTimes(2));
  const [rango] = servicio.mock.calls[1];
  expect(rango.fecha_desde < rango.fecha_hasta).toBe(true);
});

test("sin flujos configurados invita a crear el primero", async () => {
  const vacio = respuesta();
  vacio.seguimiento = { ...vacio.seguimiento, flujos: [], items: [], totales: { ahora: 0, hoy: 0, despues: 0, sin_fecha: 0 } };
  await montar(vi.fn(async () => vacio));

  expect(screen.getByRole("link", { name: /Crear mi primer flujo/ })).toHaveAttribute("href", "/pedidos/configuracion");
  expect(screen.getByRole("button", { name: /Nada para enviar ahora/ })).toBeDisabled();
});
