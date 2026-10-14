import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SeguimientoPanel } from "./SeguimientoPanel";
import { seguimientoService } from "../../services/seguimiento.service";

// Regresión del 2026-10-11: el panel leía el recordatorio de la fila que le
// pasaba la bandeja, y esa fila no se vuelve a pedir mientras el panel está
// abierto. Agendar, completar o cancelar no cambiaba nada en pantalla, y un
// recordatorio vencido se mostraba sin ningún botón para cerrarlo.

vi.mock("../../services/seguimiento.service", () => ({
  seguimientoService: {
    getFlujosPedido: vi.fn(),
    getConfiguracion: vi.fn(),
    getEtiquetasPedido: vi.fn(),
    getEtiquetas: vi.fn(),
    programarRecordatorio: vi.fn(),
    completarRecordatorio: vi.fn(),
    cancelarRecordatorio: vi.fn(),
    guardarNota: vi.fn(),
    crearContacto: vi.fn(),
    completarFase: vi.fn(),
  },
}));

const pedido = (extra = {}) => ({ id: 50, telefono: "0981 111 222", ...extra });

async function montar(envio) {
  const onRefreshPedido = vi.fn();
  render(<SeguimientoPanel open envio={envio} onClose={() => {}} onRefreshPedido={onRefreshPedido} />);
  await screen.findByText("Próximo seguimiento");
  return { onRefreshPedido };
}

beforeEach(() => {
  vi.clearAllMocks();
  seguimientoService.getFlujosPedido.mockResolvedValue([]);
  seguimientoService.getConfiguracion.mockResolvedValue({ tiempos_rapidos_horas: [1, 4] });
  seguimientoService.getEtiquetasPedido.mockResolvedValue([]);
  seguimientoService.getEtiquetas.mockResolvedValue([]);
});

test("un recordatorio vencido se puede completar desde el panel", async () => {
  seguimientoService.completarRecordatorio.mockResolvedValue(undefined);
  const { onRefreshPedido } = await montar(pedido({
    recordatorio_id: 900,
    recordatorio_estado: "VENCIDO",
    recordatorio_ejecutar_en: "2026-10-10T15:00:00.000Z",
    recordatorio_nota: 'Enviar "Recordatorio" (Fase 2) si el cliente no responde',
  }));

  expect(screen.getByText("Seguimiento vencido")).toBeInTheDocument();
  expect(screen.getByText(/Enviar "Recordatorio" \(Fase 2\)/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Completar/ }));

  await waitFor(() => expect(screen.getByText("Sin próximo seguimiento")).toBeInTheDocument());
  expect(seguimientoService.completarRecordatorio).toHaveBeenCalledWith(50, 900);
  expect(screen.queryByText("Seguimiento vencido")).not.toBeInTheDocument();
  expect(onRefreshPedido).toHaveBeenCalled();
});

test("agendar un recordatorio se ve en el panel sin cerrarlo", async () => {
  seguimientoService.programarRecordatorio.mockResolvedValue({
    id: 901, estado: "PENDIENTE", ejecutar_en: "2099-01-01T12:00:00.000Z", nota: "",
  });
  await montar(pedido());

  expect(screen.getByText("Sin próximo seguimiento")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "+4h" }));
  fireEvent.click(screen.getByRole("button", { name: /Guardar nota \/ recordatorio/ }));

  await waitFor(() => expect(screen.getByText("Programado para:")).toBeInTheDocument());
  expect(seguimientoService.programarRecordatorio).toHaveBeenCalledWith(50, { nota: "", horas: 4 });
  expect(screen.queryByText("Sin próximo seguimiento")).not.toBeInTheDocument();
});

test("cancelar un recordatorio pendiente lo saca del panel", async () => {
  seguimientoService.cancelarRecordatorio.mockResolvedValue(undefined);
  await montar(pedido({
    recordatorio_id: 902,
    recordatorio_estado: "PENDIENTE",
    recordatorio_ejecutar_en: "2099-01-01T12:00:00.000Z",
  }));

  expect(screen.getByText("Programado para:")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Cancelar/ }));

  await waitFor(() => expect(screen.getByText("Sin próximo seguimiento")).toBeInTheDocument());
  expect(seguimientoService.cancelarRecordatorio).toHaveBeenCalledWith(50, 902);
});

// 2026-10-13: mientras el pedido está por confirmar, se puede confirmar desde
// el panel en la fase que sea, sin tener que mandar las que faltan.
const FLUJO_CONFIRMACION = {
  id: 10, nombre: "Confirmación de pedido", envios_totales: 1,
  fases: [
    { id: 101, orden: 1, nombre: "Confirmación", envios: 1, completada: true, ultimo_envio_en: "2026-10-12T15:00:00.000Z" },
    { id: 102, orden: 2, nombre: "Recordatorio", envios: 0, completada: false },
  ],
};

test("un pedido por confirmar se puede confirmar desde el panel, esté en la fase que esté", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([FLUJO_CONFIRMACION]);
  const onConfirmarPedido = vi.fn();
  const envio = pedido({ estado: "EnSeguimiento" });
  render(<SeguimientoPanel open envio={envio} onClose={() => {}} onConfirmarPedido={onConfirmarPedido} />);
  await screen.findByText(/Fase 2 — Recordatorio/);

  fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

  expect(onConfirmarPedido).toHaveBeenCalledWith(envio);
});

test("un pedido que ya se confirmó no ofrece confirmarlo de nuevo", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([FLUJO_CONFIRMACION]);
  render(<SeguimientoPanel open envio={pedido({ estado: "Despachado" })} onClose={() => {}} onConfirmarPedido={vi.fn()} />);
  await screen.findByText(/Fase 2 — Recordatorio/);

  expect(screen.queryByRole("button", { name: "Confirmar pedido" })).not.toBeInTheDocument();
});

test("un flujo legado de confirmación web no se muestra como Contacto inicial", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([{
    id: 99,
    nombre: "Contacto inicial",
    tipo: "CONFIRMACION_PEDIDO_WEB",
    envios_totales: 0,
    fases: [{ id: 991, orden: 1, nombre: "Fase 1", envios: 0, completada: false }],
  }]);

  render(<SeguimientoPanel open envio={pedido({ estado: "Pendiente" })} onClose={() => {}} />);
  await screen.findByText(/Fase 1/);

  expect(screen.getByText("Confirmación de pedido web")).toBeInTheDocument();
  expect(screen.queryByText("Contacto inicial")).not.toBeInTheDocument();
});

const FLUJO_ENVIO = {
  id: 30, nombre: "Seguimiento de envío", tipo: "SEGUIMIENTO_ENVIO", envios_totales: 2,
  fases: [
    { id: 301, orden: 4, nombre: "Texto renombrado", accion_operativa: "PREPARAR_PEDIDO", envios: 1, completada: true, ultimo_envio_en: "2026-10-12T15:00:00.000Z" },
    { id: 302, orden: 7, nombre: "Aviso custom", accion_operativa: "DESPACHAR_PEDIDO", envios: 1, completada: false, ultimo_envio_en: "2026-10-12T16:00:00.000Z" },
    { id: 303, orden: 8, nombre: "Pedido en camino", accion_operativa: "AVISO_EN_CAMINO", envios: 0, completada: false },
  ],
};

test("marcar enviada la fase Pedido confirmado también prepara el pedido", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([{
    ...FLUJO_ENVIO,
    envios_totales: 1,
    fases: FLUJO_ENVIO.fases.map((fase) => (
      fase.id === 301
        ? { ...fase, envios: 1, completada: false, ultimo_envio_en: "2026-10-12T15:00:00.000Z" }
        : { ...fase, envios: 0, completada: false, ultimo_envio_en: null }
    )),
  }]);
  seguimientoService.completarFase.mockResolvedValue({
    recordatorios_cumplidos: [],
    siguiente_fase: { id: 302, orden: 2, nombre: "Pedido despachado" },
  });
  const envio = pedido({ estado: "Confirmado" });
  const onPrepararPedido = vi.fn(async () => ({ ...envio, estado: "Preparado" }));

  render(<SeguimientoPanel open envio={envio} onClose={() => {}} onPrepararPedido={onPrepararPedido} />);
  await screen.findByText(/Fase 4 — Texto renombrado/);

  fireEvent.click(screen.getByRole("button", { name: /Marcar como enviado/ }));

  await waitFor(() => expect(seguimientoService.completarFase).toHaveBeenCalledWith(50, 301));
  expect(onPrepararPedido).toHaveBeenCalledWith(envio);
});

test("si la fase de preparación ya estaba enviada, al abrir el panel corrige el estado atrasado", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([{
    ...FLUJO_ENVIO,
    envios_totales: 1,
    fases: FLUJO_ENVIO.fases.map((fase) => (
      fase.id === 301
        ? { ...fase, envios: 1, completada: true, ultimo_envio_en: "2026-10-12T15:00:00.000Z" }
        : { ...fase, envios: 0, completada: false, ultimo_envio_en: null }
    )),
  }]);
  const envio = pedido({ estado: "Confirmado" });
  const onPrepararPedido = vi.fn(async () => ({ ...envio, estado: "Preparado" }));

  render(<SeguimientoPanel open envio={envio} onClose={() => {}} onPrepararPedido={onPrepararPedido} />);
  await screen.findByText(/Fase 4 — Texto renombrado/);

  await waitFor(() => expect(onPrepararPedido).toHaveBeenCalledWith(envio));
});

test("marcar enviada la fase Pedido despachado también despacha el pedido", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([FLUJO_ENVIO]);
  seguimientoService.completarFase.mockResolvedValue({
    recordatorios_cumplidos: [],
    siguiente_fase: { id: 303, orden: 3, nombre: "Pedido en camino" },
  });
  const envio = pedido({ estado: "Preparado" });
  const onDespacharPedido = vi.fn(async () => ({ ...envio, estado: "Despachado" }));

  render(<SeguimientoPanel open envio={envio} onClose={() => {}} onDespacharPedido={onDespacharPedido} />);
  await screen.findByText(/Fase 7 — Aviso custom/);

  fireEvent.click(screen.getByRole("button", { name: /Marcar como enviado/ }));

  await waitFor(() => expect(seguimientoService.completarFase).toHaveBeenCalledWith(50, 302));
  expect(onDespacharPedido).toHaveBeenCalledWith(envio);
});

test("marcar enviada la fase Pedido en camino es solo aviso y no cambia estado", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([{
    ...FLUJO_ENVIO,
    fases: FLUJO_ENVIO.fases.map((fase) => (
      fase.id === 302
        ? { ...fase, completada: true }
        : fase.id === 303
          ? { ...fase, envios: 1, completada: false, ultimo_envio_en: "2026-10-12T17:00:00.000Z" }
          : fase
    )),
  }]);
  seguimientoService.completarFase.mockResolvedValue({ recordatorios_cumplidos: [], siguiente_fase: null });
  const onDespacharPedido = vi.fn();

  render(<SeguimientoPanel open envio={pedido({ estado: "Despachado" })} onClose={() => {}} onDespacharPedido={onDespacharPedido} />);
  await screen.findByText(/Fase 8 — Pedido en camino/);

  fireEvent.click(screen.getByRole("button", { name: /Marcar como enviado/ }));

  await waitFor(() => expect(seguimientoService.completarFase).toHaveBeenCalledWith(50, 303));
  expect(onDespacharPedido).not.toHaveBeenCalled();
});
