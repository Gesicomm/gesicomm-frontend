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
