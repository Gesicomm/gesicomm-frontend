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
  await waitFor(() => expect(seguimientoService.getFlujosPedido).toHaveBeenCalled());
  return { onRefreshPedido };
}

beforeEach(() => {
  vi.clearAllMocks();
  seguimientoService.getFlujosPedido.mockResolvedValue([]);
  seguimientoService.getConfiguracion.mockResolvedValue({ tiempos_rapidos_horas: [1, 4] });
  seguimientoService.getEtiquetasPedido.mockResolvedValue([]);
  seguimientoService.getEtiquetas.mockResolvedValue([]);
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

test.each([['cargado', 301, 'Pedido confirmado'], ['en_camino', 302, 'Pedido despachado']])('RAHA %s abre y completa la fase común correspondiente', async (status, faseId, nombre) => {
  seguimientoService.getFlujosPedido.mockResolvedValue([{
    ...FLUJO_ENVIO, envios_totales: 0, fases: [
      { id: 301, orden: 1, nombre: 'Pedido confirmado', disponible: faseId === 301, envios: 0, completada: false },
      { id: 302, orden: 2, nombre: 'Pedido despachado', disponible: faseId === 302, envios: 0, completada: false },
    ],
  }]);
  seguimientoService.crearContacto.mockResolvedValue({});
  seguimientoService.completarFase.mockResolvedValue({});
  render(<SeguimientoPanel open envio={pedido({ estado: 'Confirmado', raha_logistica: { gestionado: true, status } })} onClose={() => {}} />);
  await screen.findByText(new RegExp(`Fase ${faseId === 301 ? 1 : 2} — ${nombre}`));
  const abrir = screen.getAllByRole('button', { name: 'Abrir en WhatsApp' }).find(b => !b.disabled);
  expect(abrir).toBeDefined();
  fireEvent.click(abrir);
  await waitFor(() => expect(seguimientoService.crearContacto).toHaveBeenCalledWith(50, expect.objectContaining({ fase_id: faseId })));
  fireEvent.click(screen.getAllByRole('button', { name: 'Ya lo envié' }).find(b => !b.disabled));
  await waitFor(() => expect(seguimientoService.completarFase).toHaveBeenCalledWith(50, faseId));
});

test('la orden RAHA creada habilita su aviso de confirmado y espera el tránsito para el aviso de despacho', async () => {
  seguimientoService.crearContacto.mockResolvedValue({});
  seguimientoService.getFlujosPedido.mockResolvedValue([{ ...FLUJO_ENVIO, fases: [
    { id: 301, orden: 1, nombre: 'Pedido confirmado', disponible: true, envios: 0, completada: false },
    { id: 302, orden: 2, nombre: 'Pedido despachado', disponible: true, envios: 0, completada: false },
  ] }]);
  render(<SeguimientoPanel open envio={pedido({ estado: 'Confirmado', raha_logistica: { gestionado: true, status: 'pendiente_confirmacion' } })} onClose={() => {}} />);
  await screen.findByText(/Fase 1 — Pedido confirmado/);
  const botones = screen.getAllByRole('button', { name: 'Abrir en WhatsApp' });
  expect(botones.filter(b => !b.disabled)).toHaveLength(1);
  expect(botones.filter(b => b.disabled)).toHaveLength(1);
  fireEvent.click(botones.find(b => !b.disabled));
  await waitFor(() => expect(seguimientoService.crearContacto).toHaveBeenCalledWith(50, expect.objectContaining({ fase_id: 301 })));
});

test('RAHA pendiente permanece en seguimiento de envío y oculta confirmación comercial', async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([FLUJO_ENVIO, { ...FLUJO_CONFIRMACION, tipo: 'CONFIRMACION_PEDIDO_WEB' }]);
  render(<SeguimientoPanel open envio={pedido({ estado: 'Confirmado', raha_logistica: { gestionado: true, status: 'pendiente_confirmacion' } })} faseSugeridaId={302} onClose={() => {}} onConfirmarPedido={vi.fn()} />);
  await screen.findByText(/Fase 7 — Aviso custom/);
  expect(screen.queryByText(/Fase 2 — Recordatorio/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Confirmar pedido' })).not.toBeInTheDocument();
});

test('un entregado RAHA abre Recompra aunque el estado local aún sea Despachado', async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([FLUJO_ENVIO, {
    id: 40, tipo: 'ESCALAMIENTO_VENTAS', nombre: 'Escalamiento de ventas', predeterminado: true,
    fases: [{ id: 401, orden: 1, nombre: '¿Cómo te fue?', disponible: true, completada: false, envios: 0 }],
  }]);
  render(<SeguimientoPanel open envio={pedido({ estado: 'Despachado', raha_logistica: { gestionado: true, status: 'entregado' } })} onClose={() => {}} />);
  await screen.findByText(/Fase 1 — ¿Cómo te fue/);
  expect(screen.getByText('Escalamiento de ventas')).toBeInTheDocument();
  expect(screen.queryByText(/Fase 7 — Aviso custom/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Abrir en WhatsApp' })).toBeEnabled();
});

test("los avisos activados por logística esperan su estado y enviarlos no prepara ni despacha", async () => {
  const fases = [
    { id: 301, orden: 1, nombre: "Preparación", estado_activador: "Preparado", disponible: true, envios: 1, completada: false },
    { id: 302, orden: 2, nombre: "Despacho", estado_activador: "Despachado", disponible: false, envios: 0, completada: false },
  ];
  seguimientoService.getFlujosPedido.mockResolvedValue([{ ...FLUJO_ENVIO, fases }]);
  seguimientoService.completarFase.mockResolvedValue({ recordatorios_cumplidos: [], siguiente_fase: { id: 302 } });
  const onCambiarEstadoPedido = vi.fn();
  render(<SeguimientoPanel open envio={pedido({ estado: "Preparado" })} onClose={() => {}} onCambiarEstadoPedido={onCambiarEstadoPedido} />);
  await screen.findByText(/Fase 1 — Preparación/);
  expect(screen.getByText(/Espera que logística marque Despachado/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Abrir en WhatsApp" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Marcar como enviado" }));
  await waitFor(() => expect(seguimientoService.completarFase).toHaveBeenCalledWith(50, 301));
  expect(onCambiarEstadoPedido).not.toHaveBeenCalled();
});

test("marcar enviada una fase antigua de preparación conserva el estado logístico", async () => {
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
  const envio = pedido({ estado: "Preparado" });
  const onPrepararPedido = vi.fn(async () => ({ ...envio, estado: "Preparado" }));

  render(<SeguimientoPanel open envio={envio} onClose={() => {}} onPrepararPedido={onPrepararPedido} />);
  await screen.findByText(/Fase 4 — Texto renombrado/);

  fireEvent.click(screen.getByRole("button", { name: /Marcar como enviado/ }));

  await waitFor(() => expect(seguimientoService.completarFase).toHaveBeenCalledWith(50, 301));
  expect(onPrepararPedido).not.toHaveBeenCalled();
});

test("abrir el panel con un aviso antiguo enviado conserva el estado del pedido", async () => {
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

  expect(onPrepararPedido).not.toHaveBeenCalled();
});

test("un pendiente de preparación bloquea los mensajes aunque lleguen fases antiguas disponibles", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([{
    ...FLUJO_ENVIO,
    fases: [
      { id: 301, orden: 1, nombre: "Preparación", disponible: true, envios: 1, completada: false },
      { id: 302, orden: 2, nombre: "Despacho", disponible: true, envios: 0, completada: false },
    ],
  }]);
  render(<SeguimientoPanel open envio={pedido({ estado: "Confirmado" })} onClose={() => {}} />);
  await screen.findByText(/Fase 1 — Preparación/);
  for (const nombre of ["Abrir otra vez", "Abrir en WhatsApp", "Marcar como enviado", "Ya lo envié"]) {
    const boton = screen.getByRole("button", { name: nombre });
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
  }
  expect(screen.queryByText("Toca ahora")).not.toBeInTheDocument();
  expect(seguimientoService.crearContacto).not.toHaveBeenCalled();
  expect(seguimientoService.completarFase).not.toHaveBeenCalled();
});

test("marcar enviada una fase antigua de despacho conserva el estado logístico", async () => {
  seguimientoService.getFlujosPedido.mockResolvedValue([FLUJO_ENVIO]);
  seguimientoService.completarFase.mockResolvedValue({
    recordatorios_cumplidos: [],
    siguiente_fase: { id: 303, orden: 3, nombre: "Pedido en camino" },
  });
  const envio = pedido({ estado: "Despachado" });
  const onDespacharPedido = vi.fn(async () => ({ ...envio, estado: "Despachado" }));

  render(<SeguimientoPanel open envio={envio} onClose={() => {}} onDespacharPedido={onDespacharPedido} />);
  await screen.findByText(/Fase 7 — Aviso custom/);

  fireEvent.click(screen.getByRole("button", { name: /Marcar como enviado/ }));

  await waitFor(() => expect(seguimientoService.completarFase).toHaveBeenCalledWith(50, 302));
  expect(onDespacharPedido).not.toHaveBeenCalled();
});

test.each(["Despachado", "Reprogramado"])("un pedido %s abre despacho aunque la sugerencia antigua sea confirmación", async estado => {
  const flujo = { ...FLUJO_ENVIO, envios_totales: 0, fases: [
    { id: 301, orden: 1, nombre: "Pedido confirmado", disponible: true, envios: 0, completada: false, mensaje_resuelto: "Confirmá tu pedido" },
    { id: 302, orden: 2, nombre: "Pedido despachado", disponible: true, envios: 0, completada: false, mensaje_resuelto: "Tu pedido ya ha sido despachado. Atento a tu courier Express, teléfono 0982 333 444." },
  ] };
  seguimientoService.getFlujosPedido.mockResolvedValue([{ ...FLUJO_CONFIRMACION, tipo: "CONFIRMACION_PEDIDO_WEB" }, flujo]);
  seguimientoService.crearContacto.mockResolvedValue({});
  render(<SeguimientoPanel open envio={pedido({ estado })} faseSugeridaId={301} onClose={() => {}} />);
  await screen.findByText(/Fase 2 — Pedido despachado/);
  expect(screen.queryByText(/Fase 1 — Pedido confirmado/)).not.toBeInTheDocument();
  expect(screen.queryByText("Confirmá tu pedido")).not.toBeInTheDocument();
  expect(screen.getByText(/Tu pedido ya ha sido despachado/)).toBeInTheDocument();
  expect(screen.getByText("Toca ahora")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Abrir en WhatsApp" }));
  await waitFor(() => expect(seguimientoService.crearContacto).toHaveBeenCalledWith(50, expect.objectContaining({ fase_id: 302 })));
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
