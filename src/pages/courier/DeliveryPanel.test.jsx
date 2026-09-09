import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeliveryPanel } from "./DeliveryPanel";

const couriers = [
  { id: 1, nombre: "Propio", telefono: "0981 111 222", vehiculo: "Moto", activo: true },
  { id: 2, nombre: "TSI", telefono: "", vehiculo: "Camioneta", activo: false },
];

const zonas = [
  { id: 10, departamento: "Central", ciudad: "Luque", courier_id: 1, tipo_pago: "Ambos", rango_min: 0, rango_max: 3, costo: 25000, tiempo_entrega_hs: "En el día", activo: true },
  { id: 11, departamento: "Central", ciudad: "Luque", courier_id: 1, tipo_pago: "Al Recibir", rango_min: 4, rango_max: null, costo: 35000, tiempo_entrega_hs: "24 hs", activo: true },
  { id: 12, departamento: "Alto Paraná", ciudad: "Ciudad del Este", courier_id: 2, tipo_pago: "Ambos", rango_min: 0, rango_max: null, costo: 60000, tiempo_entrega_hs: "48 hs", activo: true },
];

function montar(overrides = {}) {
  const props = {
    zonas,
    couriers,
    enviosCountByCourier: { 1: 4 },
    onSaveZonas: async () => {},
    onCreateCourier: async () => ({ id: 3, nombre: "PAP" }),
    onUpdateCourier: async c => c,
    onDeleteCourier: async () => {},
    ...overrides,
  };
  return { props, ...render(<DeliveryPanel {...props} />) };
}

test("agrupa por courier y muestra sus ciudades adentro", () => {
  montar();

  expect(screen.getByText("Propio")).toBeInTheDocument();
  expect(screen.getByText("Luque, Central")).toBeInTheDocument();
  expect(screen.getByText(/2 ciudades/)).toBeInTheDocument();
  expect(screen.getByText(/4 envíos en el rango/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Ciudad" }));
  expect(screen.getByText("Ciudad del Este, Alto Paraná")).toBeInTheDocument();
  expect(screen.getByText("TSI")).toBeInTheDocument();
});

test("el asistente crea el courier y sus ciudades en una sola acción", async () => {
  const guardadas = [];
  const creados = [];
  montar({
    onCreateCourier: async c => { creados.push(c); return { id: 3, ...c }; },
    onSaveZonas: async z => { guardadas.push(z); },
  });

  fireEvent.click(screen.getByRole("button", { name: /Nuevo courier/ }));

  fireEvent.change(screen.getByPlaceholderText("Ej. Propio, TSI, PAP..."), { target: { value: "PAP" } });
  fireEvent.click(screen.getByRole("button", { name: /Continuar con ciudades/ }));

  fireEvent.change(screen.getByPlaceholderText("Luque"), { target: { value: "Encarnación" } });
  fireEvent.change(screen.getByPlaceholderText("Central"), { target: { value: "Itapúa" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

  expect(screen.getByText("Encarnación, Itapúa")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Guardar courier y ciudades/ }));

  await waitFor(() => expect(guardadas).toHaveLength(1));
  expect(creados[0].nombre).toBe("PAP");

  const nueva = guardadas[0].find(z => z.ciudad === "Encarnación");
  expect(nueva).toBeTruthy();
  expect(nueva.courier_id).toBe("3");
  expect(guardadas[0]).toHaveLength(zonas.length + 1);
});

test("exige una ciudad antes de dejar guardar el courier", () => {
  montar();

  fireEvent.click(screen.getByRole("button", { name: /Nuevo courier/ }));
  fireEvent.change(screen.getByPlaceholderText("Ej. Propio, TSI, PAP..."), { target: { value: "PAP" } });
  fireEvent.click(screen.getByRole("button", { name: /Continuar con ciudades/ }));
  fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

  expect(screen.getByText(/Agregá al menos una ciudad/)).toBeInTheDocument();
});

test("la barra de cambios aparece solo al retocar una tarifa en la grilla", () => {
  montar();

  expect(screen.queryByText(/sin guardar/)).toBeNull();

  const tiempos = screen.getAllByLabelText("Tiempo de entrega de Luque");
  fireEvent.change(tiempos[0], { target: { value: "2 hs" } });
  expect(screen.getByText(/sin guardar/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
  expect(screen.queryByText(/sin guardar/)).toBeNull();
});
