import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { FlujosWhatsapp } from "./FlujosWhatsapp";

function servicioEditor() {
  return {
    getFlujos: vi.fn(async () => []), getEtiquetas: vi.fn(async () => []),
    getVariables: vi.fn(async () => [
      { key: "courier_nombre", grupo: "Envío", desc: "Nombre del courier", ejemplo: "Delivery Luque" },
      { key: "courier_telefono", grupo: "Envío", desc: "Teléfono del courier", ejemplo: "0981 555 123" },
    ]),
    createFlujo: vi.fn(async () => ({})),
  };
}

test("el flujo de producto incluye descripción y beneficios y permite insertar el resumen del pedido", async () => {
  const servicio = servicioEditor();
  servicio.getVariables.mockResolvedValue([
    { key: "producto_descripcion", grupo: "Producto", desc: "Descripción del producto", ejemplo: "Silla plegable" },
    { key: "producto_beneficios", grupo: "Producto", desc: "Beneficios del producto", ejemplo: "Fácil de guardar" },
    { key: "pedido_resumen", grupo: "Pedido", desc: "Resumen completo del pedido", ejemplo: "Pedido SOM-1044" },
  ]);
  render(<FlujosWhatsapp servicio={servicio} />);
  const seccion = await screen.findByRole("region", { name: "Seguimiento de producto por WhatsApp" });
  fireEvent.click(within(seccion).getByRole("button", { name: /Agregar flujo/ }));
  fireEvent.click(screen.getAllByRole("button", { name: /Insertar variable/ })[0]);
  const selector = within(screen.getByRole("dialog", { name: "Insertar variable" }));
  expect(selector.getByRole("button", { name: /producto_descripcion/ })).toBeInTheDocument();
  expect(selector.getByRole("button", { name: /producto_beneficios/ })).toBeInTheDocument();
  fireEvent.click(selector.getByRole("button", { name: /pedido_resumen/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre del flujo" }), { target: { value: "Información de productos" } });
  fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/ }));
  await waitFor(() => expect(servicio.createFlujo).toHaveBeenCalled());
  const mensaje = servicio.createFlujo.mock.calls[0][0].fases[0].mensaje;
  expect(mensaje).toContain("{producto_descripcion}");
  expect(mensaje).toContain("{producto_beneficios}");
  expect(mensaje).toContain("{pedido_resumen}");
});

test("el editor crea Recuperación de clientes con sus mensajes y activación automática", async () => {
  const servicio = servicioEditor();
  render(<FlujosWhatsapp servicio={servicio} />);
  const seccion = await screen.findByRole("region", { name: "Recuperación de clientes" });
  fireEvent.click(within(seccion).getByRole("button", { name: /Agregar flujo/ }));
  expect(screen.queryByRole("combobox", { name: "Estado desde" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Estado hasta" })).not.toBeInTheDocument();
  fireEvent.change(screen.getAllByRole("combobox", { name: "Estado activador" })[0], { target: { value: "Perdido" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre del flujo" }), { target: { value: "Recuperar clientes" } });
  fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/ }));
  await waitFor(() => expect(servicio.createFlujo).toHaveBeenCalledWith(expect.objectContaining({
    tipo: "RECUPERACION_CLIENTES", activacion: "AUTOMATICA",
    fases: expect.arrayContaining([expect.objectContaining({ nombre: "Contacto tras incidencia", espera_sugerida_minutos: 0, estado_activador: "Perdido" })]),
  })));
});

test("el editor conserva los activadores logísticos y permite insertar el teléfono del courier", async () => {
  const servicio = servicioEditor();
  render(<FlujosWhatsapp servicio={servicio} />);
  const seccion = await screen.findByRole("region", { name: "Seguimiento de envío" });
  fireEvent.click(within(seccion).getByRole("button", { name: /Agregar flujo/ }));
  expect(screen.getAllByRole("combobox", { name: "Estado activador" }).map((select) => select.value)).toEqual(["Preparado", "Despachado", "Despachado"]);
  expect(screen.queryByRole("combobox", { name: "Estado desde" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Estado hasta" })).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: /Insertar variable/ })[0]);
  const selector = within(screen.getByRole("dialog", { name: "Insertar variable" }));
  fireEvent.click(selector.getByRole("button", { name: /courier_telefono/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre del flujo" }), { target: { value: "Avisos logísticos" } });
  fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/ }));
  await waitFor(() => expect(servicio.createFlujo).toHaveBeenCalled());
  const payload = servicio.createFlujo.mock.calls[0][0];
  expect(payload.fases[0]).toMatchObject({ estado_activador: "Preparado", transicion_estado_desde: null, transicion_estado_hasta: null });
  expect(payload.fases[0].mensaje).toContain("{courier_telefono}");
  expect(payload.fases[1].mensaje).toContain("{courier_nombre}");
  expect(payload.fases[1].mensaje).toContain("{courier_telefono}");
});
