import { useState, useEffect, useMemo, useRef } from "react";
import { X, Plus, Trash2, MapPin, ShoppingBag, User, Truck, AlertCircle, ImageOff, Minus, Package, ChevronLeft, ChevronRight, CheckCircle2, ClipboardCheck, Receipt, Save } from "lucide-react";
import { productService } from "../../services/productService";
import { ofertaService } from "../../services/ofertaService";
import { getCouriers, getMetodosPago } from "../../services/courierApi";
import { canalVentaService } from "../../services/canalVentaService";
import { obtenerTarifaPara, buscarCourierYTarifa, buscarZonaDelivery } from "../../lib/tarifaCourier";
import { getMediaUrl } from "../../services/api";
import CurrencyInput from "../../components/CurrencyInput";
import CreatableSelect from "react-select/creatable";
import ProductPicker from "../landing/ProductPicker";
import "../landing/landing.css";
import { numeroPedidoVisible } from "./pedidoNumero";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'var(--color-canvas)',
    borderColor: state.isFocused ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
    borderRadius: '0.375rem',
    minHeight: '38px',
    color: 'var(--color-fg)',
    '&:hover': {
      borderColor: 'var(--color-primary)'
    }
  }),
  menu: (base) => ({
    ...base,
    background: 'var(--color-canvas)',
    border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
    zIndex: 999
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected ? 'var(--color-primary)' : state.isFocused ? 'color-mix(in srgb, var(--color-fg) 8%, transparent)' : 'var(--color-canvas)',
    color: state.isSelected ? '#fff' : 'var(--color-fg)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    '&:active': {
      background: 'var(--color-primary)',
      color: '#fff'
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--color-fg)',
    fontSize: '0.85rem'
  }),
  input: (base) => ({
    ...base,
    color: 'var(--color-fg)',
    fontSize: '0.85rem'
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--color-fg-subtle)',
    fontSize: '0.85rem'
  })
};

const precioProducto = (producto) => (
  Number(producto?.precio_efectivo ?? producto?.precio_base ?? producto?.precio_venta ?? producto?.precio ?? 0) || 0
);

const imagenProducto = (producto) => (
  producto?.imagen || producto?.imagenes?.[0]?.url || producto?.imagenes?.[0] || null
);

const PASOS_PEDIDO = [
  { id: "cliente", label: "Cliente", icon: User },
  { id: "entrega", label: "Entrega", icon: MapPin },
  { id: "productos", label: "Productos", icon: ShoppingBag },
  { id: "revision", label: "Revisión", icon: ClipboardCheck },
];

const ERROR_KEYS_POR_PASO = {
  cliente: ["nombre_cliente", "telefono"],
  entrega: ["ciudad", "direccion", "link_maps"],
  productos: ["items"],
  revision: ["ruc"],
};

function buildFormFromEnvio(envio) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' });
  const horaActual = new Date().toLocaleTimeString('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit' });

  if (!envio) {
    return {
      fecha: hoy,
      hora: horaActual,
      confirmador: "",
      origen: "WEB",
      canal_venta_id: "",
      nombre_cliente: "",
      apellido_cliente: "",
      telefono: "",
      departamento: "",
      ciudad: "",
      direccion: "",
      referencia: "",
      link_maps: "",
      metodo_pago: "Efectivo",
      metodo_pago_id: "",
      quiere_factura: false,
      razon_social: "",
      ruc: "",
      nro_comprobante: "",
      observaciones: "",
      courier_id: "",
      incluye_delivery: false,
      // Si el cliente paga cuando recibe (contra entrega, el caso normal)
      // o si ya pagó antes (anticipado). Es independiente del método de
      // pago puntual que se elija — no se deriva de él ni lo condiciona.
      pago_anticipado: false,
      costo_envio: 0
    };
  }

  const nombreCompleto = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "";
  const tieneFactura = Boolean(
    envio.quiere_factura ||
    (envio.ruc && String(envio.ruc).trim().length > 0)
  );

  let horaFinal = envio.hora || horaActual;
  if (envio.createdAt) {
    try {
      const d = new Date(envio.createdAt);
      if (!isNaN(d.getTime())) {
        horaFinal = d.toLocaleTimeString('es-PY', {
          timeZone: 'America/Asuncion',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {}
  }

  return {
    fecha: envio.fecha || (envio.createdAt ? new Date(envio.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' }) : hoy),
    hora: horaFinal,
    confirmador: envio.confirmador || "",
    origen: envio.origen || "WEB",
    canal_venta_id: envio.canal_venta_id || "",
    nombre_cliente: nombreCompleto,
    apellido_cliente: "",
    telefono: envio.telefono || "",
    departamento: envio.departamento || "",
    ciudad: envio.ciudad || "",
    direccion: envio.direccion || "",
    referencia: envio.referencia || "",
    link_maps: envio.link_maps || "",
    metodo_pago: envio.metodo_pago || "Efectivo",
    metodo_pago_id: envio.metodo_pago_id || "",
    quiere_factura: tieneFactura,
    razon_social: envio.razon_social || (tieneFactura ? nombreCompleto : ""),
    ruc: envio.ruc || "",
    nro_comprobante: envio.nro_comprobante || "",
    observaciones: envio.observaciones || "",
    courier_id: envio.courier_id || "",
    incluye_delivery: envio.delivery_a_cargo === "negocio",
    // NULL en pedidos anteriores a esta columna (no se registró, ver
    // migración 20260909170000) — se lee como contra entrega, igual que
    // el default de la columna.
    pago_anticipado: envio.pago_anticipado === true,
    costo_envio: envio.costo_envio || 0
  };
}

/**
 * Modal único para Pedidos: alta (envio=null) y "completar" un pedido
 * existente al confirmarlo (envio=<registro>) — mismo formulario, mismos
 * campos, para no tener dos versiones divergentes del mismo flujo. En modo
 * "completar" los ítems y la fecha/hora original no son editables (ya
 * comprometieron stock/registro), todo lo demás sí.
 */
export function NuevoPedidoModal({ open, onClose, onSubmit, envio = null, deliveryZonas = [] }) {
  const modoCompletar = !!envio;
  // Confirmar solo aplica a un pedido Pendiente. Sobre uno que ya avanzó, el
  // modal es un editor: guarda datos y no toca el estado. El título y el
  // botón lo dicen, para no prometer una acción que el backend va a rechazar.
  const vaAConfirmar = modoCompletar && envio.estado === "Pendiente";

  const [form, setForm] = useState(() => buildFormFromEnvio(null));
  const [items, setItems] = useState([]);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [canalesVenta, setCanalesVenta] = useState([]);
  const [ofertasPorProducto, setOfertasPorProducto] = useState({});
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [pasoActivo, setPasoActivo] = useState(0);
  const modalRef = useRef(null);
  /**
   * Foto de los campos que determinan el precio, tomada al abrir el pedido.
   *
   * Editar un pedido existente NO tiene que moverle el importe: abrirlo para
   * corregir un teléfono y guardar recalculaba el monto como `subtotales +
   * flete`, y en un pedido cuyo monto no traía el flete adentro eso lo subía
   * solo (el #385 pasaba de Gs 166.138 a Gs 216.138 sin que nadie tocara
   * nada). El monto solo se recalcula si de verdad cambió algo que lo afecta.
   *
   * Los ítems no entran en la foto porque en modo edición no son editables
   * (ver el JSDoc del componente). Si algún día lo son, tienen que sumarse
   * acá o vuelve el mismo problema.
   */
  const precioAlAbrirRef = useRef(null);

  useEffect(() => {
    if (open) {
      const inicial = buildFormFromEnvio(envio);
      setForm(inicial);
      precioAlAbrirRef.current = envio
        ? {
            monto: Number(envio.monto) || 0,
            costo_envio: Number(inicial.costo_envio) || 0,
            incluye_delivery: inicial.incluye_delivery === true,
          }
        : null;
      setItems([]);
      setOfertasPorProducto({});
      setErrors({});
      setSubmitError(null);
      setPasoActivo(0);
      cargarDatosIniciales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, envio]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const panelActivo = modalRef.current?.querySelector(".np-step-panel.is-active");
      const primerControl = panelActivo?.querySelector(
        "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      (primerControl || modalRef.current)?.focus?.();
    }, 40);
    return () => window.clearTimeout(t);
  }, [open, pasoActivo]);

  const cargarDatosIniciales = async () => {
    try {
      const [resProds, dataCouriers, dataMetodos, dataCanales] = await Promise.all([
        // Sin `sin_limite` solo llegan 10 productos (paginación por defecto
        // de ProductoService.buscar) y el pedido no se puede cargar con el
        // resto del catálogo.
        productService.buscar({ sin_limite: true }),
        getCouriers(),
        getMetodosPago(),
        canalVentaService.listar().catch(() => []),
      ]);
      const prods = Array.isArray(resProds) ? resProds : (resProds.productos || resProds.rows || []);
      setProductosDisponibles(prods);
      setCouriers(dataCouriers || []);
      setCanalesVenta(dataCanales || []);

      const metodosActivos = (dataMetodos || []).filter(m => m.activo);
      setMetodosPago(metodosActivos);
      if (metodosActivos.length > 0) {
        setForm(prev => {
          if (prev.metodo_pago_id && metodosActivos.some(m => m.id === Number(prev.metodo_pago_id))) {
            return prev;
          }
          const porNombre = prev.metodo_pago && metodosActivos.find(m => m.nombre.toLowerCase() === prev.metodo_pago.toLowerCase());
          const porDefecto = metodosActivos.find(m => m.nombre.toLowerCase().includes('efectivo'));
          const elegido = porNombre || porDefecto || metodosActivos[0];
          return { ...prev, metodo_pago: elegido.nombre, metodo_pago_id: elegido.id };
        });
      }
    } catch (err) {
      console.error("Error al cargar datos iniciales:", err);
    }
  };

  // Ítems a considerar para calcular tarifa de courier: en modo "completar"
  // ya están comprometidos (no editables acá), en modo alta son los que se
  // van agregando en el formulario.
  // Normalizamos siempre el subtotal porque los items que vienen del endpoint
  // paginado no tienen el campo "subtotal" precalculado — lo calculamos acá.
  const itemsParaTarifa = modoCompletar
    ? (envio?.items || []).map(it => ({
        ...it,
        subtotal: Number(it.subtotal) || (Number(it.precio_unitario) * Number(it.cantidad)),
      }))
    : items;

  // Si se está completando un pedido sin courier asignado, intenta
  // autocompletarlo apenas ciudad + couriers + métodos de pago están listos.
  useEffect(() => {
    if (!open || !modoCompletar) return;
    if (form.courier_id) return;
    if (!form.ciudad || metodosPago.length === 0) return;
    const esAnticipado = form.pago_anticipado;
    const resultado = buscarZonaDelivery(deliveryZonas, form.ciudad, esAnticipado, itemsParaTarifa, form.departamento)
      || buscarCourierYTarifa(couriers, form.ciudad, esAnticipado, itemsParaTarifa, form.departamento);
    if (resultado) {
      setForm(prev => (prev.courier_id ? prev : { ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modoCompletar, couriers, deliveryZonas, metodosPago, form.ciudad, form.departamento]);

  // Opciones de ciudades: matriz nueva de delivery + tarifas legacy dentro
  // de couriers, para no perder zonas ya cargadas.
  const optionsCiudades = useMemo(() => {
    const ciudades = new Map();
    const agregar = ({ ciudad, departamento }) => {
      const city = ciudad?.trim();
      if (!city) return;
      const depto = departamento?.trim() || "";
      const key = `${depto.toLowerCase()}::${city.toLowerCase()}`;
      if (!ciudades.has(key)) {
        ciudades.set(key, {
          value: city,
          label: depto ? `${city} - ${depto}` : city,
          departamento: depto,
        });
      }
    };

    deliveryZonas.forEach(z => agregar({ ciudad: z.ciudad, departamento: z.departamento }));

    couriers.forEach(c => {
      if (c.tarifas && Array.isArray(c.tarifas)) {
        c.tarifas.forEach(t => {
          agregar({ ciudad: t.ciudad_zona, departamento: t.departamento });
        });
      }
    });

    return Array.from(ciudades.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [couriers, deliveryZonas]);

  const productoPorId = useMemo(() => {
    const map = new Map();
    productosDisponibles.forEach(p => map.set(Number(p.id), p));
    return map;
  }, [productosDisponibles]);

  const catalogoPedidoPicker = useMemo(() => ({
    productos: productosDisponibles.map(p => ({
      id: p.id,
      nombre: p.nombre,
      imagen: imagenProducto(p),
      precio_efectivo: precioProducto(p),
      stock: p.cantidad_disponible ?? p.stock ?? null,
      categoria: p.categoria?.nombre || (typeof p.categoria === 'string' ? p.categoria : null),
      marca: p.marca?.nombre || (typeof p.marca === 'string' ? p.marca : null),
      destacado: p.destacado,
    })),
    combos: [],
  }), [productosDisponibles]);

  const seleccionPedidoPicker = useMemo(() => {
    const map = new Map();
    items.forEach(it => {
      if (it.producto_id) map.set(`producto:${Number(it.producto_id)}`, { id: Number(it.producto_id), tipo: 'producto' });
    });
    return map;
  }, [items]);

  // Al cambiar la ciudad, buscar tarifa configurada de delivery
  const handleCiudadChange = (valCiudad, departamentoSeleccionado) => {
    setForm(prev => {
      const nextForm = { ...prev, ciudad: valCiudad };
      if (departamentoSeleccionado !== undefined) {
        nextForm.departamento = departamentoSeleccionado || "";
      }
      const departamentoParaTarifa = departamentoSeleccionado !== undefined ? departamentoSeleccionado : prev.departamento;

      if (valCiudad) {
        const esAnticipado = prev.pago_anticipado;
        const resultadoZona = buscarZonaDelivery(deliveryZonas, valCiudad, esAnticipado, itemsParaTarifa, departamentoParaTarifa);
        if (resultadoZona) {
          nextForm.courier_id = resultadoZona.courierId || "";
          nextForm.costo_envio = resultadoZona.costo;
          return nextForm;
        }

        // Si ya hay un courier seleccionado, intentar buscar su tarifa para la nueva ciudad
        if (prev.courier_id) {
          const costo = obtenerTarifaPara(couriers, valCiudad, prev.courier_id, esAnticipado, itemsParaTarifa, departamentoParaTarifa);
          if (costo !== null) {
            nextForm.costo_envio = costo;
            return nextForm;
          }
        }

        // Si no hay courier o el seleccionado no cubre la nueva ciudad, buscar el primero que la cubra
        const resultado = buscarCourierYTarifa(couriers, valCiudad, esAnticipado, itemsParaTarifa, departamentoParaTarifa);
        if (resultado) {
          nextForm.courier_id = resultado.courierId;
          nextForm.costo_envio = resultado.costo;
        } else {
          // Si nadie la cubre, dejamos el costo en 0
          nextForm.costo_envio = 0;
        }
      }
      return nextForm;
    });

    if (errors.ciudad) {
      setErrors(prev => ({ ...prev, ciudad: null }));
    }
  };

  const handleCourierChange = (courierId) => {
    setForm(prev => {
      const nextForm = { ...prev, courier_id: courierId };
      if (courierId && prev.ciudad) {
        const esAnticipado = prev.pago_anticipado;
        const costo = obtenerTarifaPara(couriers, prev.ciudad, courierId, esAnticipado, itemsParaTarifa, prev.departamento);
        if (costo !== null) {
          nextForm.costo_envio = costo;
        }
      }
      return nextForm;
    });
  };

  // Solo fija QUIÉN cobra y a nombre de qué método — ya no toca la tarifa
  // de delivery. Eso ahora depende de "Pago anticipado" (ver más abajo),
  // no de qué método puntual se elija.
  const handleMetodoPagoChange = (metodoPagoId) => {
    const metodo = metodosPago.find(m => m.id === Number(metodoPagoId));
    setForm(prev => ({
      ...prev,
      metodo_pago_id: metodoPagoId,
      metodo_pago: metodo ? metodo.nombre : prev.metodo_pago,
    }));
  };

  // "¿Contra entrega o ya pagó?" — nada que ver con qué método puntual se
  // use. Es lo que decide qué tarifa de courier/zona buscar (algunas zonas
  // cobran distinto según si el courier va a cobrar en el momento o el
  // envío ya viene pago), así que al cambiarlo se recalcula igual que al
  // cambiar de ciudad o de courier.
  const handlePagoAnticipadoChange = (nuevoValor) => {
    setForm(prev => {
      const nextForm = { ...prev, pago_anticipado: nuevoValor };
      if (!prev.ciudad) return nextForm;

      const resultadoZona = buscarZonaDelivery(deliveryZonas, prev.ciudad, nuevoValor, itemsParaTarifa, prev.departamento);
      if (resultadoZona) {
        nextForm.courier_id = resultadoZona.courierId || "";
        nextForm.costo_envio = resultadoZona.costo;
      } else if (prev.courier_id) {
        const costo = obtenerTarifaPara(couriers, prev.ciudad, prev.courier_id, nuevoValor, itemsParaTarifa, prev.departamento);
        nextForm.costo_envio = costo !== null ? costo : 0;
      } else {
        const resultado = buscarCourierYTarifa(couriers, prev.ciudad, nuevoValor, itemsParaTarifa, prev.departamento);
        if (resultado) {
          nextForm.courier_id = resultado.courierId;
          nextForm.costo_envio = resultado.costo;
        } else {
          nextForm.costo_envio = 0;
        }
      }
      return nextForm;
    });
  };

  const handleDepartamentoChange = (departamento) => {
    setForm(prev => {
      const nextForm = { ...prev, departamento };
      if (!prev.ciudad) return nextForm;

      const esAnticipado = prev.pago_anticipado;
      if (prev.courier_id) {
        const costo = obtenerTarifaPara(couriers, prev.ciudad, prev.courier_id, esAnticipado, itemsParaTarifa, departamento);
        if (costo !== null) {
          nextForm.costo_envio = costo;
          return nextForm;
        }
      }

      const resultado = buscarZonaDelivery(deliveryZonas, prev.ciudad, esAnticipado, itemsParaTarifa, departamento)
        || buscarCourierYTarifa(couriers, prev.ciudad, esAnticipado, itemsParaTarifa, departamento);
      if (resultado) {
        nextForm.courier_id = resultado.courierId;
        nextForm.costo_envio = resultado.costo;
      } else {
        nextForm.costo_envio = 0;
      }
      return nextForm;
    });
  };

  const cargarOfertasProducto = async (productoId) => {
    const id = Number(productoId);
    if (!id) return [];
    if (ofertasPorProducto[id]) return ofertasPorProducto[id];

    try {
      const data = await ofertaService.listarPorProducto(id);
      const activas = (Array.isArray(data) ? data : []).filter(o => o.activo);
      setOfertasPorProducto(prev => ({ ...prev, [id]: activas }));
      return activas;
    } catch {
      setOfertasPorProducto(prev => ({ ...prev, [id]: [] }));
      return [];
    }
  };

  const aplicarTarifaConItems = (nuevosItems) => {
    if (!form.ciudad) return;
    const esAnticipado = form.pago_anticipado;
    const resultadoZona = buscarZonaDelivery(deliveryZonas, form.ciudad, esAnticipado, nuevosItems, form.departamento);
    if (resultadoZona) {
      setForm(prev => ({ ...prev, courier_id: resultadoZona.courierId || "", costo_envio: resultadoZona.costo }));
    } else if (form.courier_id) {
      const nuevoCosto = obtenerTarifaPara(couriers, form.ciudad, form.courier_id, esAnticipado, nuevosItems, form.departamento);
      setForm(prev => ({ ...prev, costo_envio: nuevoCosto !== null ? nuevoCosto : 0 }));
    } else {
      const resultado = buscarCourierYTarifa(couriers, form.ciudad, esAnticipado, nuevosItems, form.departamento);
      if (resultado) {
        setForm(prev => ({ ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
      } else {
        setForm(prev => ({ ...prev, costo_envio: 0 }));
      }
    }
  };

  const crearItemPedido = (producto, oferta = null, cantidad = 1) => {
    const qty = Math.max(1, Number(cantidad) || 1);
    const precioUnit = oferta ? Number(oferta.precio) : precioProducto(producto);
    return {
      producto_id: Number(producto.id),
      oferta_id: oferta ? oferta.id : null,
      oferta_codigo: oferta ? oferta.codigo : null,
      oferta_nombre: oferta ? oferta.nombre : null,
      nombre_producto: oferta ? `${producto.nombre} — ${oferta.nombre}` : producto.nombre,
      cantidad: qty,
      precio_unitario: precioUnit,
      subtotal: qty * precioUnit
    };
  };

  const actualizarItemsPedido = (nuevosItems) => {
    setItems(nuevosItems);
    setErrors(prev => ({ ...prev, items: null, producto: null }));
    aplicarTarifaConItems(nuevosItems);
  };

  const handleToggleProductoPedido = (item) => {
    if (item?.tipo && item.tipo !== 'producto') return;
    const productoId = Number(item.id);
    const yaEsta = items.some(it => Number(it.producto_id) === productoId);

    if (yaEsta) {
      actualizarItemsPedido(items.filter(it => Number(it.producto_id) !== productoId));
      return;
    }

    const producto = { ...(productoPorId.get(productoId) || {}), ...item };
    cargarOfertasProducto(productoId);
    actualizarItemsPedido([...items, crearItemPedido(producto)]);
  };

  const handleRemoveItem = (index) => {
    const nuevosItems = items.filter((_, i) => i !== index);
    actualizarItemsPedido(nuevosItems);
  };

  const handleCantidadItemChange = (index, cantidad) => {
    const qty = Math.max(1, Number(cantidad) || 1);
    const nuevosItems = items.map((it, i) => (
      i === index
        ? { ...it, cantidad: qty, subtotal: qty * (Number(it.precio_unitario) || 0) }
        : it
    ));
    actualizarItemsPedido(nuevosItems);
  };

  const handleOfertaItemChange = (index, ofertaId) => {
    const nuevosItems = items.map((it, i) => {
      if (i !== index) return it;
      const producto = productoPorId.get(Number(it.producto_id)) || { id: it.producto_id, nombre: it.nombre_producto };
      const oferta = ofertaId
        ? (ofertasPorProducto[Number(it.producto_id)] || []).find(o => Number(o.id) === Number(ofertaId))
        : null;
      return crearItemPedido(producto, oferta || null, it.cantidad);
    });
    actualizarItemsPedido(nuevosItems);
  };

  const subtotalProductos = itemsParaTarifa.reduce((acc, curr) => {
    const pUnit = Number(curr.precio_unitario) || 0;
    const cant = Number(curr.cantidad) || 1;
    const sub = Number(curr.subtotal) || (pUnit * cant);
    return acc + (Number(sub) || 0);
  }, 0);
  // "Incluye delivery" tildado = el envío va incluido en lo que ofrece el
  // negocio, o sea que lo paga el negocio y NO se le cobra al cliente. Sin
  // tildar, el flete se le suma al total del pedido.
  //
  // El tilde NO decide si hay delivery ni cuánto cuesta: el courier y el
  // costo se cargan siempre, libres. Solo decide a quién se le cobra.
  const deliveryLoPagaNegocio = form.incluye_delivery === true;
  const fleteAlCliente = deliveryLoPagaNegocio ? 0 : (Number(form.costo_envio) || 0);
  const montoRecalculado = (Number(subtotalProductos) || 0) + fleteAlCliente;

  // Sobre un pedido ya cargado se respeta su monto salvo que se toque el
  // costo del envío o quién lo paga — que es justo lo que el usuario cambia
  // cuando SÍ quiere mover el precio. El auto-completado de tarifa por zona
  // también entra por acá: si rellena un flete que estaba en cero, el monto
  // se actualiza, porque eso es un cambio real del envío.
  const precioBase = precioAlAbrirRef.current;
  const cambioAlgoDelPrecio = !precioBase
    || (Number(form.costo_envio) || 0) !== precioBase.costo_envio
    || deliveryLoPagaNegocio !== precioBase.incluye_delivery;
  const precioTotalVendido = modoCompletar && !cambioAlgoDelPrecio
    ? precioBase.monto
    : montoRecalculado;

  const erroresDePaso = (pasoId) => {
    const newErrors = {};

    if (pasoId === "cliente") {
      if (!form.nombre_cliente.trim()) {
        newErrors.nombre_cliente = "Por favor, ingresa el nombre del cliente.";
      }
      const telefonoLimpio = String(form.telefono || "").replace(/\D/g, "");
      if (form.telefono.trim() && telefonoLimpio.length < 6) {
        newErrors.telefono = "Revisa el teléfono: parece demasiado corto.";
      }
    }

    if (pasoId === "entrega") {
      if (!form.ciudad.trim()) {
        newErrors.ciudad = "Por favor, selecciona o ingresa la ciudad de destino.";
      }
      if (!form.direccion.trim()) {
        newErrors.direccion = "Por favor, ingresa la dirección de entrega.";
      }
      if (form.link_maps.trim()) {
        try {
          new URL(form.link_maps.trim());
        } catch {
          newErrors.link_maps = "Pega un link válido de Google Maps o deja este campo vacío.";
        }
      }
    }

    if (pasoId === "productos" && !modoCompletar && items.length === 0) {
      newErrors.items = "Debes agregar al menos un producto al pedido.";
    }

    if (pasoId === "revision" && form.quiere_factura && !form.ruc.trim()) {
      newErrors.ruc = "El RUC es obligatorio cuando se solicita factura.";
    }

    return newErrors;
  };

  const setErroresDelPaso = (pasoId, nuevosErrores) => {
    const keys = ERROR_KEYS_POR_PASO[pasoId] || [];
    setErrors(prev => {
      const next = { ...prev };
      keys.forEach(key => delete next[key]);
      return { ...next, ...nuevosErrores };
    });
  };

  const validarPaso = (pasoId) => {
    const newErrors = erroresDePaso(pasoId);
    setErroresDelPaso(pasoId, newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validaciones personalizadas en español (sin HTML native form tooltips)
  const validarFormulario = () => {
    const newErrors = PASOS_PEDIDO.reduce((acc, paso) => ({ ...acc, ...erroresDePaso(paso.id) }), {});
    setErrors(newErrors);

    const primerPasoConError = PASOS_PEDIDO.findIndex(paso =>
      (ERROR_KEYS_POR_PASO[paso.id] || []).some(key => newErrors[key])
    );
    if (primerPasoConError >= 0) {
      setPasoActivo(primerPasoConError);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e, { explicit = false } = {}) => {
    e?.preventDefault();

    if (!explicit) {
      return;
    }

    if (!validarFormulario()) {
      return;
    }

    const metodoSeleccionado = metodosPago.find(m => m.id === Number(form.metodo_pago_id));
    const comunes = {
      ...form,
      courier_id: form.courier_id ? Number(form.courier_id) : null,
      metodo_pago_id: form.metodo_pago_id ? Number(form.metodo_pago_id) : null,
      comision_pct_aplicada: metodoSeleccionado ? Number(metodoSeleccionado.comision_porcentaje) : 0,
      costo_envio: Number(form.costo_envio) || 0,
      delivery_a_cargo: deliveryLoPagaNegocio ? "negocio" : "cliente",
      pago_anticipado: form.pago_anticipado === true,
      monto: precioTotalVendido
    };

    // Confirmar es un PASO del pedido, no un efecto de guardar. Solo un
    // pedido Pendiente puede pasar a Confirmado (ver TRANSICIONES_VALIDAS en
    // envioController); mandar el estado en toda edición hacía que abrir un
    // pedido ya entregado para corregirle un dato terminara en
    // 'No se puede pasar de "Entregado" a "Confirmado"' y no dejara guardar
    // nada. Si el pedido ya avanzó, se guardan los datos y el estado no se
    // toca.
    const payload = modoCompletar
      ? { ...comunes, id: envio.id, ...(vaAConfirmar ? { estado: "Confirmado" } : {}) }
      : { ...comunes, items };

    setGuardando(true);
    setSubmitError(null);
    try {
      await onSubmit(payload, modoCompletar);
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Ocurrió un error al guardar el pedido.");
    } finally {
      setGuardando(false);
    }
  };

  const unidadesSeleccionadas = itemsParaTarifa.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  const resumenCarga = [
    { label: "Cliente", ok: Boolean(form.nombre_cliente.trim()) },
    { label: "Entrega", ok: Boolean(form.ciudad.trim() && form.direccion.trim()) },
    { label: "Productos", ok: itemsParaTarifa.length > 0 },
    { label: "Total", ok: precioTotalVendido > 0 },
  ];
  const pasoActual = PASOS_PEDIDO[pasoActivo];
  const esUltimoPaso = pasoActivo === PASOS_PEDIDO.length - 1;
  const hayDatosSinGuardar = !modoCompletar && !guardando && (
    items.length > 0 ||
    form.nombre_cliente.trim() ||
    form.telefono.trim() ||
    form.ciudad.trim() ||
    form.direccion.trim() ||
    form.observaciones.trim()
  );

  const handleRequestClose = () => {
    if (hayDatosSinGuardar && !window.confirm("Hay datos cargados en este pedido. ¿Querés cerrar y descartarlos?")) {
      return;
    }
    onClose();
  };

  const irAlPaso = (index) => {
    if (index === pasoActivo) return;
    if (index < pasoActivo) {
      setPasoActivo(index);
      return;
    }
    if (validarPaso(pasoActual.id)) {
      setPasoActivo(index);
    }
  };

  const continuarPaso = () => {
    if (!validarPaso(pasoActual.id)) return;
    setPasoActivo(prev => Math.min(PASOS_PEDIDO.length - 1, prev + 1));
  };

  const volverPaso = () => {
    setPasoActivo(prev => Math.max(0, prev - 1));
  };

  const handleFormKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleRequestClose();
      return;
    }

    const tag = e.target?.tagName;
    const role = e.target?.getAttribute?.("role");
    const inputType = e.target?.getAttribute?.("type");
    const estaEnPicker = e.target?.closest?.(".lb-modal-overlay, .lb-modal-panel, .lb-picker");
    const dejarEnterAlControl =
      tag === "TEXTAREA" ||
      tag === "BUTTON" ||
      tag === "SELECT" ||
      role === "combobox" ||
      inputType === "checkbox" ||
      estaEnPicker;

    if (e.key === "Enter" && !esUltimoPaso && !dejarEnterAlControl) {
      e.preventDefault();
      continuarPaso();
    }

    if (e.key === "Enter" && esUltimoPaso && !dejarEnterAlControl) {
      e.preventDefault();
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleRequestClose}>
      <div
        className="modal-content np-modal-container"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuevo-pedido-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <div className="np-header-banner">
          <div className="np-header-copy">
            <span className="np-brand-mark">Gesicom<span>.</span></span>
            <h2 id="nuevo-pedido-title">
              {modoCompletar
                ? `${vaAConfirmar ? "Completar" : "Editar"} pedido #${numeroPedidoVisible(envio)}`
                : "Nuevo pedido"}
            </h2>
          </div>
          <button type="button" onClick={handleRequestClose} className="np-close-action" aria-label="Cerrar modal">
            <X size={20} />
            <span>Cerrar</span>
          </button>
        </div>

        <div className="np-progress-strip" aria-label="Resumen de carga del pedido">
          {resumenCarga.map(paso => (
            <span key={paso.label} className={`np-progress-chip ${paso.ok ? 'is-ready' : ''}`}>
              <span />
              {paso.label}
            </span>
          ))}
          <strong>Gs. {(Number(precioTotalVendido) || 0).toLocaleString('es-PY')}</strong>
        </div>

        {/* Error de guardado (servidor) */}
        {submitError && (
          <div className="form-error-banner" style={{ margin: '1rem 1.5rem 0' }}>
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </div>
        )}

        {/* Banner Global de Errores de validación */}
        {Object.values(errors).some(Boolean) && (
          <div className="form-error-banner" style={{ margin: '1rem 1.5rem 0' }}>
            <AlertCircle size={18} />
            <div>
              <strong>Por favor corrige los siguientes campos:</strong>
              <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0 }}>
                {Object.values(errors).filter(Boolean).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="np-form np-wizard-form" onKeyDown={handleFormKeyDown} noValidate>
          <div className="np-stepper" role="tablist" aria-label="Pasos del pedido">
            {PASOS_PEDIDO.map((paso, index) => {
              const Icono = paso.icon;
              const tieneError = (ERROR_KEYS_POR_PASO[paso.id] || []).some(key => errors[key]);
              const completo = !tieneError && index < pasoActivo;
              const actual = index === pasoActivo;
              return (
                <button
                  type="button"
                  key={paso.id}
                  className={`np-stepper-item ${actual ? 'is-current' : ''} ${completo ? 'is-complete' : ''} ${tieneError ? 'has-error' : ''}`}
                  onClick={() => irAlPaso(index)}
                  role="tab"
                  aria-selected={actual}
                >
                  <span className="np-stepper-icon">
                    {completo ? <CheckCircle2 size={16} /> : <Icono size={16} />}
                  </span>
                  <span>
                    <small>Paso {index + 1}</small>
                    {paso.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="np-wizard-body">
            <div className="np-wizard-main">
          <div className="np-grid">

            {/* Columna Izquierda: Datos del Cliente */}
            <div className={`np-section np-step-panel ${pasoActivo === 0 ? 'is-active' : ''}`}>
              <h3 className="np-section-title">
                <User size={16} /> Datos del Cliente y Registro
              </h3>

              <div className="np-row">
                <label>Fecha</label>
                {modoCompletar ? (
                  <div className="form-input" style={{ opacity: 0.7 }}>{form.fecha}</div>
                ) : (
                  <input
                    type="date"
                    className="form-input"
                    value={form.fecha}
                    onChange={e => setForm({ ...form, fecha: e.target.value })}
                  />
                )}
              </div>

              <div className="np-row">
                <label>Hora</label>
                {modoCompletar ? (
                  <div className="form-input" style={{ opacity: 0.7 }}>{form.hora}</div>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    value={form.hora}
                    onChange={e => setForm({ ...form, hora: e.target.value })}
                  />
                )}
              </div>

              <div className="np-row">
                <label>Confirmador</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre de quien confirmó"
                  value={form.confirmador}
                  onChange={e => setForm({ ...form, confirmador: e.target.value })}
                />
              </div>

              {/* Select contra el catálogo `canales_venta`, no texto libre:
                  antes cada pedido podía traer un canal escrito distinto
                  ("Organico", "organico", "Tienda Online") y los reportes
                  lo contaban como canales separados. */}
              <div className="np-row">
                <label>Canal / Origen</label>
                <select
                  className="form-input"
                  value={form.canal_venta_id}
                  onChange={e => setForm({ ...form, canal_venta_id: e.target.value })}
                >
                  <option value="">Sin especificar</option>
                  {canalesVenta.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="np-row">
                <label>Nombre del cliente <span className="req">*</span></label>
                <input
                  type="text"
                  className={`form-input ${errors.nombre_cliente ? 'input-error' : ''}`}
                  placeholder="Ej. Juan Pérez"
                  value={form.nombre_cliente}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.nombre_cliente)}
                  aria-describedby={errors.nombre_cliente ? "np-nombre-error" : undefined}
                  onChange={e => {
                    setForm({ ...form, nombre_cliente: e.target.value });
                    if (errors.nombre_cliente) setErrors({ ...errors, nombre_cliente: null });
                  }}
                />
                {errors.nombre_cliente && <span id="np-nombre-error" className="field-error">{errors.nombre_cliente}</span>}
              </div>

              <div className="np-row">
                <label>Teléfono del cliente</label>
                <input
                  type="text"
                  className={`form-input ${errors.telefono ? 'input-error' : ''}`}
                  placeholder="0981 123 456"
                  value={form.telefono}
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.telefono)}
                  aria-describedby={errors.telefono ? "np-telefono-error" : undefined}
                  onChange={e => {
                    setForm({ ...form, telefono: e.target.value });
                    if (errors.telefono) setErrors({ ...errors, telefono: null });
                  }}
                />
                {errors.telefono && <span id="np-telefono-error" className="field-error">{errors.telefono}</span>}
              </div>
            </div>

            {/* Columna Derecha: Ubicación de Entrega y Delivery */}
            <div className={`np-section np-step-panel ${pasoActivo === 1 ? 'is-active' : ''}`}>
              <h3 className="np-section-title">
                <MapPin size={16} /> Ubicación de Entrega y Courier
              </h3>

              <div className="np-row">
                <label>Departamento</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Central"
                  value={form.departamento}
                  onChange={e => handleDepartamentoChange(e.target.value)}
                />
              </div>

              <div className="np-row">
                <label>Ciudad <span className="req">*</span></label>
                <CreatableSelect
                  isClearable
                  placeholder="Escribe o selecciona ciudad..."
                  styles={selectStyles}
                  aria-invalid={Boolean(errors.ciudad)}
                  aria-describedby={errors.ciudad ? "np-ciudad-error" : undefined}
                  options={optionsCiudades}
                  value={form.ciudad ? (
                    optionsCiudades.find(o => o.value === form.ciudad && (o.departamento || "") === (form.departamento || ""))
                    || { value: form.ciudad, label: [form.ciudad, form.departamento].filter(Boolean).join(" - ") }
                  ) : null}
                  onChange={(newValue) => {
                    const val = newValue ? newValue.value : "";
                    handleCiudadChange(val, newValue?.departamento);
                  }}
                  onCreateOption={(inputValue) => {
                    handleCiudadChange(inputValue);
                  }}
                />
                {errors.ciudad && <span id="np-ciudad-error" className="field-error">{errors.ciudad}</span>}
              </div>

              <div className="np-row">
                <label>Dirección <span className="req">*</span></label>
                <input
                  type="text"
                  className={`form-input ${errors.direccion ? 'input-error' : ''}`}
                  placeholder="Calle y Nro de casa"
                  value={form.direccion}
                  autoComplete="street-address"
                  aria-invalid={Boolean(errors.direccion)}
                  aria-describedby={errors.direccion ? "np-direccion-error" : undefined}
                  onChange={e => {
                    setForm({ ...form, direccion: e.target.value });
                    if (errors.direccion) setErrors({ ...errors, direccion: null });
                  }}
                />
                {errors.direccion && <span id="np-direccion-error" className="field-error">{errors.direccion}</span>}
              </div>

              <div className="np-row">
                <label>Referencia para llegar</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Al lado de la farmacia"
                  value={form.referencia}
                  onChange={e => setForm({ ...form, referencia: e.target.value })}
                />
              </div>

              <div className="np-row">
                <label>Link ubicación Google Maps</label>
                <input
                  type="url"
                  className={`form-input ${errors.link_maps ? 'input-error' : ''}`}
                  placeholder="https://maps.google.com/..."
                  value={form.link_maps}
                  aria-invalid={Boolean(errors.link_maps)}
                  aria-describedby={errors.link_maps ? "np-link-maps-error" : undefined}
                  onChange={e => {
                    setForm({ ...form, link_maps: e.target.value });
                    if (errors.link_maps) setErrors({ ...errors, link_maps: null });
                  }}
                />
                {errors.link_maps && <span id="np-link-maps-error" className="field-error">{errors.link_maps}</span>}
              </div>

              {/* El tilde dice UNA sola cosa: si el envío se suma o no al
                  total del pedido. No hay "quién paga" atrás de esto — es
                  solo eso. El courier y el costo se cargan siempre, libres,
                  sin importar el tilde: antes destildarlo también los
                  escondía y ponía el costo en cero, así que no había forma
                  de cargar un envío que no se sumara al total. */}
              <div className="np-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.incluye_delivery}
                    onChange={e => setForm(prev => ({ ...prev, incluye_delivery: e.target.checked }))}
                  />
                  <span style={{ color: 'var(--color-primary-text)', fontSize: '0.85rem' }}>
                    Incluye delivery
                  </span>
                </label>
                <span className="np-hint" style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>
                  {deliveryLoPagaNegocio ? 'El envío no se suma al total del pedido.' : 'El envío se suma al total del pedido.'}
                </span>
              </div>

              <div className="np-delivery-box">
                <div className="np-row">
                  <label style={{ color: 'var(--color-primary-text)' }}><Truck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Courier asignado</label>
                  <select
                    className="form-input"
                    value={form.courier_id}
                    onChange={e => handleCourierChange(e.target.value)}
                  >
                    <option value="">-- Sin asignar --</option>
                    {couriers.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} ({c.vehiculo})</option>
                    ))}
                  </select>
                </div>

                <div className="np-row">
                  {/* htmlFor/id atados: sin eso el lector de pantalla anuncia
                      una caja de números sin nombre, y el campo tampoco se
                      puede alcanzar haciendo clic en su etiqueta. */}
                  <label htmlFor="np-costo-envio" style={{ color: 'var(--color-success)' }}>Costo del envío (Gs)</label>
                  <CurrencyInput
                    id="np-costo-envio"
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                    value={form.costo_envio}
                    onChange={val => setForm({ ...form, costo_envio: val })}
                    prefix=""
                  />
                </div>

                {/* Nada que ver con el método de pago: es sobre el MOMENTO
                    del cobro. Algunas zonas/couriers cobran una tarifa
                    distinta si van a cobrar en el momento (contra entrega)
                    que si el envío ya viene pago — por eso, al tocarlo, se
                    vuelve a buscar la tarifa igual que al cambiar de
                    ciudad o de courier. */}
                <div className="np-row">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.pago_anticipado}
                      onChange={e => handlePagoAnticipadoChange(e.target.checked)}
                    />
                    <span>Pago anticipado</span>
                  </label>
                  <span className="np-hint" style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>
                    {form.pago_anticipado
                      ? 'El cliente ya pagó. Sin tildar, se asume que paga contra entrega.'
                      : 'Contra entrega: el cliente paga cuando recibe el pedido.'}
                  </span>
                </div>
              </div>



            </div>

          </div>

          {/* Sección de Productos Vendidos */}
          <div className={`np-section np-full-width np-step-panel ${pasoActivo === 2 ? 'is-active' : ''}`}>
            <h3 className="np-section-title">
              <ShoppingBag size={16} /> Productos Vendidos en el Pedido
            </h3>
            <div className="np-products-hero">
              <div>
                <span className="np-kicker">Selección visual</span>
                <p>Buscá en el catálogo, elegí por imagen y ajustá cada línea antes de confirmar.</p>
              </div>
              <div className="np-products-metrics">
                <span><strong>{itemsParaTarifa.length}</strong> ítems</span>
                <span><strong>{unidadesSeleccionadas}</strong> unidades</span>
              </div>
            </div>

            <div className="np-product-workbench">
              {!modoCompletar && (
                <div className="np-picker-panel">
                  <div className="np-panel-head">
                    <div>
                      <span className="np-kicker">Catálogo</span>
                      <strong>Elegí productos con imagen y búsqueda</strong>
                    </div>
                    <Package size={18} />
                  </div>

                  <ProductPicker
                    catalogo={catalogoPedidoPicker}
                    seleccion={seleccionPedidoPicker}
                    onToggle={handleToggleProductoPedido}
                    max={80}
                    mostrarLista={false}
                    mostrarInputs={false}
                    zIndexModal={1300}
                    themeScopeClassName="np-picker-theme"
                    triggerLabel="Abrir catálogo visual"
                    modalTitle="Agregar productos al pedido"
                    refrescarCatalogoAlAbrir
                    permitirCombos={false}
                  />

                  {errors.producto && <span className="field-error">{errors.producto}</span>}
                  {errors.items && <span className="field-error">{errors.items}</span>}
                </div>
              )}

              <div className="np-cart-panel">
                <div className="np-panel-head">
                  <div>
                    <span className="np-kicker">Pedido</span>
                    <strong>Productos seleccionados</strong>
                  </div>
                  <span className="np-count-pill">{itemsParaTarifa.length}</span>
                </div>

                {itemsParaTarifa.length > 0 ? (
                  <div className="np-order-items-list">
                    {itemsParaTarifa.map((it, idx) => {
                      const productoCatalogo = productoPorId.get(Number(it.producto_id));
                      const foto = imagenProducto(productoCatalogo);
                      const ofertas = ofertasPorProducto[Number(it.producto_id)] || [];
                      const pUnit = Number(it.precio_unitario) || 0;
                      const cantLinea = Number(it.cantidad) || 1;
                      const sub = Number(it.subtotal) || (pUnit * cantLinea);

                      return (
                        <div className="np-order-item-card" key={`${it.producto_id || idx}-${idx}`}>
                          <div className="np-order-item-media">
                            {foto ? (
                              <img src={getMediaUrl(foto)} alt="" loading="lazy" />
                            ) : (
                              <ImageOff size={18} />
                            )}
                          </div>

                          <div className="np-order-item-main">
                            <div className="np-order-item-title-row">
                              <div>
                                <strong>{it.nombre_producto}</strong>
                                <span>Gs. {pUnit.toLocaleString('es-PY')} c/u</span>
                              </div>
                              {!modoCompletar && (
                                <button type="button" onClick={() => handleRemoveItem(idx)} className="btn-icon danger" title="Quitar producto">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            <div className="np-order-item-controls">
                              {!modoCompletar ? (
                                <>
                                  <label>
                                    Presentación
                                    <select
                                      className="form-input np-offer-select"
                                      value={it.oferta_id || ""}
                                      onFocus={() => cargarOfertasProducto(it.producto_id)}
                                      onChange={e => handleOfertaItemChange(idx, e.target.value)}
                                    >
                                      <option value="">Individual (Gs. {precioProducto(productoCatalogo || it).toLocaleString('es-PY')})</option>
                                      {ofertas.map(o => (
                                        <option key={o.id} value={o.id}>{o.nombre} (Gs. {Number(o.precio).toLocaleString('es-PY')})</option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    Cantidad
                                    <div className="np-qty-control">
                                      <button type="button" onClick={() => handleCantidadItemChange(idx, cantLinea - 1)} title="Restar">
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        value={cantLinea}
                                        onChange={e => handleCantidadItemChange(idx, e.target.value)}
                                      />
                                      <button type="button" onClick={() => handleCantidadItemChange(idx, cantLinea + 1)} title="Sumar">
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  </label>
                                </>
                              ) : (
                                <span className="np-line-option">{it.oferta_nombre || "Individual"} · {cantLinea} un.</span>
                              )}

                              <div className="np-line-subtotal">
                                <span>Subtotal</span>
                                <strong>Gs. {sub.toLocaleString('es-PY')}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="np-empty-items">
                    Sin productos seleccionados aún. Abrí el catálogo visual para buscar y agregar ítems.
                  </div>
                )}
              </div>
            </div>

            {/* Resumen Total Desglosado */}
            <div className="np-total-row">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', fontSize: '0.85rem', color: 'var(--color-fg-muted)' }}>
                <span>Subtotal productos: Gs. {(Number(subtotalProductos) || 0).toLocaleString('es-PY')}</span>
                <span>Delivery: Gs. {(Number(form.costo_envio) || 0).toLocaleString('es-PY')}</span>
              </div>
              <strong className="np-total-amount">
                Total: Gs. {(Number(precioTotalVendido) || 0).toLocaleString('es-PY')}
              </strong>
            </div>
          </div>

          <div className={`np-section np-full-width np-step-panel ${pasoActivo === 3 ? 'is-active' : ''}`}>
            <h3 className="np-section-title">
              <Receipt size={16} /> Revisar pedido
            </h3>

            <div className="np-review-grid">
              <div className="np-review-card">
                <div className="np-review-card-head">
                  <strong>Cliente</strong>
                  <button type="button" onClick={() => setPasoActivo(0)}>Editar</button>
                </div>
                <p>{form.nombre_cliente || "Sin nombre"}</p>
                <span>{form.telefono || "Sin teléfono"} · {form.canal_venta_id ? canalesVenta.find(c => c.id === Number(form.canal_venta_id))?.nombre : "Sin canal"}</span>
              </div>

              <div className="np-review-card">
                <div className="np-review-card-head">
                  <strong>Entrega</strong>
                  <button type="button" onClick={() => setPasoActivo(1)}>Editar</button>
                </div>
                <p>{form.ciudad || "Sin ciudad"}{form.departamento ? `, ${form.departamento}` : ""}</p>
                <span>
                  {form.direccion || "Sin dirección"}
                  {Number(form.costo_envio) > 0
                    ? ` · Delivery Gs. ${Number(form.costo_envio || 0).toLocaleString('es-PY')}`
                    : " · Sin delivery"}
                </span>
              </div>

              <div className="np-review-card np-review-card-wide">
                <div className="np-review-card-head">
                  <strong>Productos</strong>
                  <button type="button" onClick={() => setPasoActivo(2)}>Editar</button>
                </div>
                {itemsParaTarifa.length > 0 ? (
                  <div className="np-review-products">
                    {itemsParaTarifa.map((it, idx) => (
                      <div key={`${it.producto_id || idx}-review`}>
                        <span>{it.nombre_producto}</span>
                        <strong>{Number(it.cantidad) || 1} × Gs. {Number(it.precio_unitario || 0).toLocaleString('es-PY')}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>Sin productos seleccionados.</span>
                )}
              </div>
            </div>

            <div className="np-review-options">
              <div className="np-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                    checked={form.quiere_factura}
                    onChange={e => setForm({ ...form, quiere_factura: e.target.checked })}
                  />
                  ¿Desea factura?
                </label>
              </div>

              {form.quiere_factura && (
                <div className="np-invoice-grid">
                  <div className="np-row">
                    <label>Razón social (Opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Comercial Paraguaya S.A."
                      value={form.razon_social}
                      onChange={e => setForm({ ...form, razon_social: e.target.value })}
                    />
                  </div>

                  <div className="np-row">
                    <label>RUC <span className="req">*</span></label>
                    <input
                      type="text"
                      className={`form-input ${errors.ruc ? 'input-error' : ''}`}
                      placeholder="Ej. 80012345-6"
                      value={form.ruc}
                      aria-invalid={Boolean(errors.ruc)}
                      aria-describedby={errors.ruc ? "np-ruc-error" : undefined}
                      onChange={e => {
                        setForm({ ...form, ruc: e.target.value });
                        if (errors.ruc) setErrors({ ...errors, ruc: null });
                      }}
                    />
                    {errors.ruc && <span id="np-ruc-error" className="field-error">{errors.ruc}</span>}
                  </div>

                  <div className="np-row">
                    <label>Nro de comprobante (Opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. 001-001-0000123"
                      value={form.nro_comprobante}
                      onChange={e => setForm({ ...form, nro_comprobante: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="np-label-obs">Observaciones</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Detalles adicionales para el courier o vendedor..."
                  value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                />
              </div>
            </div>
          </div>

            </div>

            <aside className="np-sticky-summary" aria-label="Resumen del pedido">
              <div className="np-summary-card">
                <span className="np-kicker">Resumen</span>
                <strong>Gs. {(Number(precioTotalVendido) || 0).toLocaleString('es-PY')}</strong>
                <div className="np-summary-lines">
                  <div><span>Productos</span><b>Gs. {(Number(subtotalProductos) || 0).toLocaleString('es-PY')}</b></div>
                  <div><span>Delivery</span><b>Gs. {(Number(form.costo_envio) || 0).toLocaleString('es-PY')}</b></div>
                  <div><span>Ítems</span><b>{itemsParaTarifa.length}</b></div>
                  <div><span>Unidades</span><b>{unidadesSeleccionadas}</b></div>
                </div>
              </div>

              <div className="np-summary-card np-summary-status">
                {resumenCarga.map(paso => (
                  <span key={paso.label} className={paso.ok ? "is-ready" : ""}>
                    <CheckCircle2 size={14} />
                    {paso.label}
                  </span>
                ))}
              </div>
            </aside>
          </div>

          {/* Acciones del wizard */}
          <div className="np-footer">
            <button
              type="button"
              className="np-secondary-action"
              disabled
              title="Pendiente de soporte backend para guardar pedidos en borrador."
            >
              <Save size={16} /> Guardar borrador
            </button>

            <div className="np-footer-nav">
              {pasoActivo > 0 && (
                <button type="button" className="np-nav-action" onClick={volverPaso}>
                  <ChevronLeft size={16} /> Volver
                </button>
              )}

              {!esUltimoPaso ? (
                <button type="button" className="btn-confirmar-pedido" onClick={continuarPaso}>
                  Continuar <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-confirmar-pedido"
                  disabled={guardando}
                  onClick={(e) => handleSubmit(e, { explicit: true })}
                >
                  {guardando ? "Guardando..." : (modoCompletar && !vaAConfirmar ? "Guardar cambios" : "Confirmar pedido")}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
