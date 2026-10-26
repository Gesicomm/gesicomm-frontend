import { useState, useEffect, useMemo, useRef } from "react";
import { X, Plus, Trash2, MapPin, ShoppingBag, User, Truck, AlertCircle, ImageOff, Minus, Package, ChevronLeft, ChevronRight, CheckCircle2, ClipboardCheck, Receipt, Save, Pencil, Check, Loader2, MessageCircle } from "lucide-react";
import { productService } from "../../services/productService";
import { ofertaService } from "../../services/ofertaService";
import { getCouriers, getMetodosPago, actualizarPrecioItemEnvio, getCourierGeografia, cotizarEntregaRaha } from "../../services/courierApi";
import { depositoService } from "../../services/deposito.service";
import { inventarioService } from "../../services/inventario.service";
import { canalVentaService } from "../../services/canalVentaService";
import { paymentGatewayService } from "../../services/paymentGatewayService";
import { obtenerTarifaPara, buscarCourierYTarifa, buscarZonaDelivery } from "../../lib/tarifaCourier";
import { getMediaUrl } from "../../services/api";
import CurrencyInput from "../../components/CurrencyInput";
import CreatableSelect from "react-select/creatable";
import ProductPicker from "../landing/ProductPicker";
import "../landing/landing.css";
import { numeroPedidoVisible } from "./pedidoNumero";
import { nombreBaseItem, tipoLineaItem, contenidoItem } from "./envioItemDisplay";

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

const normalizarBusqueda = (valor = "") => String(valor)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const filterSelectOption = (option, inputValue) => {
  const q = normalizarBusqueda(inputValue);
  if (!q) return true;
  return normalizarBusqueda(`${option.label} ${option.data?.departamento || ""}`).includes(q);
};

const imagenProducto = (producto) => (
  producto?.imagen || producto?.imagenes?.[0]?.url || producto?.imagenes?.[0] || null
);

const PASOS_PEDIDO = [
  { id: "cliente", label: "Cliente", icon: User },
  { id: "productos", label: "Productos", icon: ShoppingBag },
  { id: "entrega", label: "Entrega", icon: MapPin },
  { id: "revision", label: "Revisión", icon: ClipboardCheck },
];

const indicePasoPedido = id => PASOS_PEDIDO.findIndex(paso => paso.id === id);

const ERROR_KEYS_POR_PASO = {
  cliente: ["nombre_cliente", "telefono"],
  entrega: ["ciudad", "direccion", "link_maps", "origen_preferido_id", "metodo_pago_id", "metodo_pago_canal"],
  productos: ["items"],
  revision: ["ruc"],
};

// Mismas 5 categorías que agrupa el backend (PagoParService.CATEGORIAS_CHECKOUT)
// y que ya usa "Analizar margen" — solo para reconocer, al reabrir un
// pedido, si su metodo_pago guardado es uno de estos canales (y no el
// "PagoPar" genérico del webhook de pago online).
const CANALES_PAGOPAR_NOMBRES = [
  'Transferencia bancaria PagoPar',
  'Pago con QR',
  'Tarjetas de crédito/débito',
  'Billeteras',
  'Bocas de pago',
];

/**
 * Datos de cliente + entrega para precargar un pedido NUEVO a partir de uno
 * ya entregado (recompra: "quiero otro producto" sobre un cliente que ya
 * compró). A diferencia de `buildFormFromEnvio` esto no es "completar" el
 * pedido original — los productos arrancan vacíos y el pedido es otro, así
 * que fecha, confirmador, método de pago y observaciones no se arrastran.
 */
function datosClienteParaRepetir(envio) {
  if (!envio) return {};
  const nombreCompleto = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "";
  return {
    nombre_cliente: nombreCompleto,
    apellido_cliente: "",
    telefono: envio.telefono || "",
    departamento: envio.departamento || "",
    ciudad: envio.ciudad || "",
    direccion: envio.direccion || "",
    referencia: envio.referencia || "",
    link_maps: envio.link_maps || "",
  };
}

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
      metodo_pago: "",
      metodo_pago_id: "",
      metodo_pago_canal: "",
      quiere_factura: false,
      razon_social: "",
      ruc: "",
      nro_comprobante: "",
      observaciones: "",
      origen_preferido_id: "",
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
    // Antes solo se traía en "Entregado" (único momento en que este campo
    // importaba). Ahora también lo necesita un pedido Anticipado: el método
    // que el confirmador eligió al confirmarlo (o "PagoPar" si lo pagó
    // online, ver pagoParBloqueado) tiene que seguir viéndose al reabrir el
    // modal, no solo al entregar.
    metodo_pago: (envio.estado === "Entregado" || envio.pago_anticipado) ? (envio.metodo_pago || "") : "",
    metodo_pago_id: (envio.estado === "Entregado" || envio.pago_anticipado) ? (envio.metodo_pago_id || "") : "",
    metodo_pago_canal: envio.pago_anticipado && CANALES_PAGOPAR_NOMBRES.includes(envio.metodo_pago) ? envio.metodo_pago : "",
    quiere_factura: tieneFactura,
    razon_social: envio.razon_social || (tieneFactura ? nombreCompleto : ""),
    ruc: envio.ruc || "",
    nro_comprobante: envio.nro_comprobante || "",
    observaciones: envio.observaciones || "",
    origen_preferido_id: "",
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
export function NuevoPedidoModal({ open, onClose, onSubmit, envio = null, clienteBase = null, deliveryZonas = [], onPrecioItemActualizado, onAbrirSeguimiento }) {
  const modoCompletar = !!envio;
  // Confirmar solo aplica a un pedido por confirmar: Pendiente, o En
  // seguimiento (un pendiente al que ya se le escribió). Sobre uno que ya
  // avanzó, el modal es un editor: guarda datos y no toca el estado. El
  // título y el botón lo dicen, para no prometer una acción que el backend
  // va a rechazar.
  const vaAConfirmar = modoCompletar && ["Pendiente", "EnSeguimiento"].includes(envio.estado);
  const esWhatsapp = String(envio?.origen || '').toUpperCase().includes('WHATSAPP');
  const editaProductosExistentes = vaAConfirmar && !envio.stock_descontado && !envio.raha_logistica?.gestionado;
  const puedeSeleccionarProductos = !modoCompletar || editaProductosExistentes;
  // El pago online de PagoPar ya llegó solo (ver confirmacionPago.js): el
  // confirmador no puede desmarcarlo ni elegir otro método, porque el
  // negocio ya cobró con ese y ningún otro.
  const pagoParBloqueado = modoCompletar && envio.metodo_pago === "PagoPar";
  // Sobre un pedido ya Entregado, el método real lo define MarcarEntregadoModal
  // (otro flujo, ya resuelto) — este selector es solo para ANTES de entregar,
  // cuando el confirmador recién se entera de que el cliente ya pagó.
  const puedeElegirMetodoAnticipado = !(modoCompletar && envio.estado === "Entregado");

  const [form, setForm] = useState(() => buildFormFromEnvio(null));
  const [items, setItems] = useState([]);
  const [itemsEditados, setItemsEditados] = useState(false);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [cotizandoRaha, setCotizandoRaha] = useState(false);
  const [avisoTarifaRaha, setAvisoTarifaRaha] = useState('');
  const costoManualVersion = useRef(0);
  const [courierIdsPorDeposito, setCourierIdsPorDeposito] = useState({});
  const [couriersDepositoLoading, setCouriersDepositoLoading] = useState("");
  const [couriersDepositoError, setCouriersDepositoError] = useState("");
  const [stockOrigen, setStockOrigen] = useState(null);
  const [stockOrigenLoading, setStockOrigenLoading] = useState(false);
  const [stockOrigenError, setStockOrigenError] = useState("");
  const [metodosPago, setMetodosPago] = useState([]);
  const [canalesPagopar, setCanalesPagopar] = useState([]);
  const [canalesPagoparLoading, setCanalesPagoparLoading] = useState(false);
  const [canalesPagoparError, setCanalesPagoparError] = useState("");
  const [canalesVenta, setCanalesVenta] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [geografia, setGeografia] = useState([]);
  const [geografiaError, setGeografiaError] = useState(false);
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
  // Ítems del pedido, con override local tras editar el precio de alguno —
  // ver EditarPrecioItem más abajo. Empieza en null (usa envio.items) y se
  // llena recién cuando se guarda un cambio de precio.
  const [itemsActuales, setItemsActuales] = useState(null);
  const [precioEditandoId, setPrecioEditandoId] = useState(null);
  const [precioTemp, setPrecioTemp] = useState(0);
  const [guardandoPrecioId, setGuardandoPrecioId] = useState(null);
  const [precioError, setPrecioError] = useState(null);

  useEffect(() => {
    if (open) {
      const inicial = { ...buildFormFromEnvio(envio), ...(!envio ? datosClienteParaRepetir(clienteBase) : {}) };
      setForm(inicial);
      precioAlAbrirRef.current = envio
        ? {
            monto: Number(envio.monto) || 0,
            costo_envio: Number(inicial.costo_envio) || 0,
            incluye_delivery: inicial.incluye_delivery === true,
          }
        : null;
      setItems(editaProductosExistentes ? (envio.items || []).map(item => ({ ...item })) : []);
      setItemsEditados(false);
      setItemsActuales(null);
      setPrecioEditandoId(null);
      setPrecioError(null);
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
    setGeografiaError(false);
    try {
      const [resProds, dataCouriers, dataMetodos, dataCanales, dataUbicaciones, dataGeografia] = await Promise.all([
        // Sin `sin_limite` solo llegan 10 productos (paginación por defecto
        // de ProductoService.buscar) y el pedido no se puede cargar con el
        // resto del catálogo.
        productService.buscar({ sin_limite: true }),
        getCouriers(),
        getMetodosPago(),
        canalVentaService.listar().catch(() => []),
        depositoService.listarDepositos({ activo: true, limit: 100 }).catch(() => ({ data: [] })),
        getCourierGeografia({ conCiudades: true }).catch(() => {
          setGeografiaError(true);
          return [];
        }),
      ]);
      const prods = Array.isArray(resProds) ? resProds : (resProds.productos || resProds.rows || []);
      setProductosDisponibles(prods);
      setCouriers(dataCouriers || []);
      setCanalesVenta(dataCanales || []);
      setUbicaciones(dataUbicaciones.data || []);
      setGeografia(Array.isArray(dataGeografia) ? dataGeografia : []);

      const metodosActivos = (dataMetodos || []).filter(m => m.activo);
      setMetodosPago(metodosActivos);
    } catch (err) {
      console.error("Error al cargar datos iniciales:", err);
    }
  };

  const productoPorId = useMemo(() => {
    const map = new Map();
    productosDisponibles.forEach(p => map.set(Number(p.id), p));
    return map;
  }, [productosDisponibles]);

  const productoEsRaha = (producto) => {
    if (!producto) return false;
    if (producto.es_raha === true || producto.origen_despacho === "RAHA") return true;
    return producto.puede_editar === false;
  };

  const itemEsRaha = (item) => {
    if (!item) return false;
    if (item.es_raha === true || item.producto_raha === true || item.origen_despacho === "RAHA") return true;
    const producto = productoPorId.get(Number(item.producto_id)) || item.producto || item.Producto;
    return productoEsRaha(producto);
  };

  // Ítems a considerar para calcular tarifa de courier: en modo "completar"
  // ya están comprometidos (no editables acá), en modo alta son los que se
  // van agregando en el formulario.
  // Normalizamos siempre el subtotal porque los items que vienen del endpoint
  // paginado no tienen el campo "subtotal" precalculado — lo calculamos acá.
  const itemsBasePedido = puedeSeleccionarProductos ? items : (itemsActuales || envio?.items || []);
  const pedidoRaha = useMemo(() => (
    itemsBasePedido.some(item => itemEsRaha(item))
  ), [itemsBasePedido, productoPorId]);
  const itemsParaTarifa = itemsBasePedido.map(it => ({
        ...it,
        subtotal: Number(it.subtotal) || (Number(it.precio_unitario) * Number(it.cantidad)),
      }));
  const cantidadParaRaha = itemsBasePedido.reduce((total, it) => total + (Number(it.cantidad) || 0), 0);
  useEffect(() => {
    if (!open || !pedidoRaha || !form.ciudad || cantidadParaRaha < 1 || (modoCompletar && !vaAConfirmar)) {
      setCotizandoRaha(false);
      setAvisoTarifaRaha('');
      return;
    }
    let cancelado = false;
    const version = costoManualVersion.current;
    setCotizandoRaha(true);
    setAvisoTarifaRaha('');
    cotizarEntregaRaha({ ciudad: form.ciudad, departamento: form.departamento, cantidad: cantidadParaRaha, pago_anticipado: form.pago_anticipado })
      .then(resultado => {
        if (cancelado || costoManualVersion.current !== version) return;
        if (resultado.cubierto && Number.isFinite(Number(resultado.costo)) && resultado.costo !== null) {
          setForm(prev => ({ ...prev, courier_id: '', costo_envio: Number(resultado.costo) }));
          setAvisoTarifaRaha('Tarifa RAHA aplicada para este destino.');
        } else {
          setForm(prev => ({ ...prev, costo_envio: 0 }));
          setAvisoTarifaRaha('RAHA no tiene una tarifa para este destino y cantidad. Revisá el costo del envío.');
        }
      }).catch(() => {
        if (!cancelado) setAvisoTarifaRaha('No pudimos consultar la tarifa RAHA. Revisá el costo del envío antes de confirmar.');
      }).finally(() => { if (!cancelado) setCotizandoRaha(false); });
    return () => { cancelado = true; };
  }, [open, pedidoRaha, form.ciudad, form.departamento, form.pago_anticipado, cantidadParaRaha, modoCompletar, vaAConfirmar]);
  const itemsStockPedido = useMemo(() => (
    itemsBasePedido
      .filter(it => !itemEsRaha(it))
      .map(it => ({
        producto_id: it.producto_id ? Number(it.producto_id) : null,
        variante_id: it.variante_id ? Number(it.variante_id) : null,
        oferta_id: it.oferta_id ? Number(it.oferta_id) : null,
        componente_variante_id: it.componente_variante_id ? Number(it.componente_variante_id) : null,
        cantidad: Number(it.cantidad) || 0,
      }))
      .filter(it => it.producto_id && it.cantidad > 0)
  ), [itemsBasePedido, productoPorId]);
  const itemsStockPedidoKey = useMemo(() => JSON.stringify(itemsStockPedido), [itemsStockPedido]);

  const depositoSeleccionadoId = form.origen_preferido_id ? String(form.origen_preferido_id) : "";
  const courierIdsDepositoSeleccionado = depositoSeleccionadoId
    ? courierIdsPorDeposito[depositoSeleccionadoId]
    : null;
  const courierIdsPermitidos = useMemo(() => (
    Array.isArray(courierIdsDepositoSeleccionado)
      ? new Set(courierIdsDepositoSeleccionado.map(Number))
      : null
  ), [courierIdsDepositoSeleccionado]);
  const couriersParaOrigen = useMemo(() => {
    if (pedidoRaha) return [];
    // Un courier archivado no se ofrece para pedidos nuevos; si ya estaba
    // asignado a este pedido, se sigue mostrando para no perder el dato.
    const vigentes = couriers.filter(c => c.activo !== false || String(c.id) === String(form.courier_id));
    if (!depositoSeleccionadoId) return vigentes;
    if (!courierIdsPermitidos) return [];
    return vigentes.filter(c => courierIdsPermitidos.has(Number(c.id)));
  }, [couriers, courierIdsPermitidos, depositoSeleccionadoId, pedidoRaha, form.courier_id]);
  const deliveryZonasParaOrigen = useMemo(() => {
    if (pedidoRaha) return [];
    if (!depositoSeleccionadoId || !courierIdsPermitidos) return deliveryZonas;
    return (deliveryZonas || []).filter(z => !z.courier_id || courierIdsPermitidos.has(Number(z.courier_id)));
  }, [courierIdsPermitidos, deliveryZonas, depositoSeleccionadoId, pedidoRaha]);

  useEffect(() => {
    if (!open || !pedidoRaha) return;
    setForm(prev => (
      prev.origen_preferido_id || prev.courier_id
        ? { ...prev, origen_preferido_id: "", courier_id: "" }
        : prev
    ));
    setStockOrigen(null);
    setStockOrigenError("");
    setStockOrigenLoading(false);
    setCouriersDepositoError("");
    setErrors(prev => ({ ...prev, origen_preferido_id: null }));
  }, [open, pedidoRaha]);

  useEffect(() => {
    if (pedidoRaha || !open || !depositoSeleccionadoId || courierIdsPorDeposito[depositoSeleccionadoId]) return;
    let cancelado = false;
    setCouriersDepositoLoading(depositoSeleccionadoId);
    setCouriersDepositoError("");
    depositoService.listarCouriersDeposito(depositoSeleccionadoId)
      .then(data => {
        if (cancelado) return;
        const ids = (data?.couriers || [])
          .filter(c => c.habilitado)
          .map(c => Number(c.id))
          .filter(Boolean);
        setCourierIdsPorDeposito(prev => ({ ...prev, [depositoSeleccionadoId]: ids }));
      })
      .catch(() => {
        if (cancelado) return;
        setCourierIdsPorDeposito(prev => ({ ...prev, [depositoSeleccionadoId]: [] }));
        setCouriersDepositoError("No pudimos cargar los couriers de este depósito.");
      })
      .finally(() => {
        if (!cancelado) setCouriersDepositoLoading("");
      });
    return () => {
      cancelado = true;
    };
  }, [courierIdsPorDeposito, depositoSeleccionadoId, open, pedidoRaha]);

  useEffect(() => {
    if (pedidoRaha || !depositoSeleccionadoId || !courierIdsPermitidos || !form.courier_id) return;
    if (courierIdsPermitidos.has(Number(form.courier_id))) return;
    setForm(prev => (
      String(prev.origen_preferido_id || "") === depositoSeleccionadoId
        ? { ...prev, courier_id: "", costo_envio: 0 }
        : prev
    ));
  }, [courierIdsPermitidos, depositoSeleccionadoId, form.courier_id, pedidoRaha]);

  useEffect(() => {
    if (pedidoRaha || !open || !depositoSeleccionadoId || itemsStockPedido.length === 0) {
      setStockOrigen(null);
      setStockOrigenError("");
      setStockOrigenLoading(false);
      return;
    }

    let cancelado = false;
    setStockOrigenLoading(true);
    setStockOrigenError("");
    inventarioService.diagnosticarStockPedido({
      origen_preferido_id: Number(depositoSeleccionadoId),
      items: itemsStockPedido,
    })
      .then(data => {
        if (!cancelado) setStockOrigen(data || null);
      })
      .catch(() => {
        if (!cancelado) {
          setStockOrigen(null);
          setStockOrigenError("No pudimos verificar el stock de este depósito.");
        }
      })
      .finally(() => {
        if (!cancelado) setStockOrigenLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [depositoSeleccionadoId, itemsStockPedidoKey, open, pedidoRaha]);

  const problemaStockOrigen = useMemo(() => (
    form.origen_preferido_id && stockOrigen?.origen && stockOrigen.origen.ok === false
      ? stockOrigen.origen
      : null
  ), [form.origen_preferido_id, stockOrigen]);

  /**
   * Cambia el precio de UN ítem del pedido — caso real de seguimiento
   * comercial: alguien consultó, no compró, y después se le ofrece un
   * descuento puntual para cerrar la venta. Pega directo al endpoint
   * dedicado (no junta esto con el submit general del modal) porque el
   * monto ya se ajusta en el backend por delta; si además el submit
   * general mandara `monto: precioTotalVendido` con el valor congelado de
   * cuando se abrió el modal, pisaría el ajuste — el mismo bug #385 de
   * más arriba. Por eso, al guardar, se actualiza también la foto
   * congelada (`precioAlAbrirRef`) con el monto nuevo.
   */
  const guardarPrecioItem = async (it) => {
    const nuevo = Number(precioTemp);
    if (!Number.isFinite(nuevo) || nuevo < 0) {
      setPrecioError("El precio debe ser un número válido.");
      return;
    }
    setGuardandoPrecioId(it.id);
    setPrecioError(null);
    try {
      const actualizado = await actualizarPrecioItemEnvio(envio.id, it.id, nuevo);
      setItemsActuales(actualizado.items || []);
      if (precioAlAbrirRef.current) {
        precioAlAbrirRef.current = { ...precioAlAbrirRef.current, monto: Number(actualizado.monto) || 0 };
      }
      setPrecioEditandoId(null);
      onPrecioItemActualizado?.(actualizado);
    } catch (err) {
      setPrecioError(err?.response?.data?.error || "No se pudo actualizar el precio.");
    } finally {
      setGuardandoPrecioId(null);
    }
  };

  // Si se está completando un pedido sin courier asignado, intenta
  // autocompletarlo apenas ciudad + couriers + métodos de pago están listos.
  useEffect(() => {
    if (!open || pedidoRaha) return;
    if (form.courier_id) return;
    if (!form.ciudad) return;
    const esAnticipado = form.pago_anticipado;
    const resultado = buscarZonaDelivery(deliveryZonasParaOrigen, form.ciudad, esAnticipado, itemsParaTarifa, form.departamento)
      || buscarCourierYTarifa(couriersParaOrigen, form.ciudad, esAnticipado, itemsParaTarifa, form.departamento);
    if (resultado) {
      setForm(prev => (prev.courier_id ? prev : { ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modoCompletar, couriersParaOrigen, deliveryZonasParaOrigen, metodosPago, form.ciudad, form.departamento, pedidoRaha]);

  const optionsDepartamentos = useMemo(() => (
    geografia.map(d => ({
      value: d.nombre,
      label: d.nombre,
      id: d.id,
      pais_id: d.pais_id,
      ciudades: d.ciudades || [],
    }))
  ), [geografia]);

  const ciudadExisteEnDepartamento = (ciudad, departamento) => {
    if (!ciudad || !departamento) return true;
    if (geografia.length === 0) return true;
    const deptoNorm = normalizarBusqueda(departamento);
    const ciudadNorm = normalizarBusqueda(ciudad);
    return geografia.some(d => (
      normalizarBusqueda(d.nombre) === deptoNorm &&
      (d.ciudades || []).some(c => normalizarBusqueda(c.nombre) === ciudadNorm)
    ));
  };

  // Opciones de ciudades: catálogo Paraguay completo + matriz nueva de
  // delivery + tarifas legacy dentro de couriers, para no perder zonas ya
  // cargadas. Aunque el comercio no haya creado couriers, el selector ya
  // conoce ciudades y departamentos.
  const optionsCiudades = useMemo(() => {
    const ciudades = new Map();
    const deptoFiltro = normalizarBusqueda(form.departamento);
    const agregar = ({ ciudad, departamento, ciudad_id, departamento_id, pais_id, tieneTarifa = false }) => {
      const city = ciudad?.trim();
      if (!city) return;
      const depto = departamento?.trim() || "";
      if (deptoFiltro && depto && normalizarBusqueda(depto) !== deptoFiltro) return;
      const key = `${depto.toLowerCase()}::${city.toLowerCase()}`;
      const existente = ciudades.get(key);
      ciudades.set(key, {
        value: city,
        label: depto ? `${city} - ${depto}` : city,
        departamento: depto,
        ciudad_id: ciudad_id ?? existente?.ciudad_id ?? null,
        departamento_id: departamento_id ?? existente?.departamento_id ?? null,
        pais_id: pais_id ?? existente?.pais_id ?? null,
        tieneTarifa: Boolean(tieneTarifa || existente?.tieneTarifa),
      });
    };

    geografia.forEach(depto => {
      (depto.ciudades || []).forEach(ciudad => agregar({
        ciudad: ciudad.nombre,
        departamento: depto.nombre,
        ciudad_id: ciudad.id,
        departamento_id: depto.id,
        pais_id: depto.pais_id,
      }));
    });

    deliveryZonasParaOrigen
      .filter(z => z.tipo_cobertura !== 'RESTO_PAIS')
      .forEach(z => agregar({
        ciudad: z.ciudad,
        departamento: z.departamento,
        ciudad_id: z.ciudad_id,
        departamento_id: z.departamento_id,
        pais_id: z.pais_id,
        tieneTarifa: true,
      }));

    couriersParaOrigen.forEach(c => {
      if (c.tarifas && Array.isArray(c.tarifas)) {
        c.tarifas
          .filter(t => t.tipo_cobertura !== 'RESTO_PAIS')
          .forEach(t => {
            agregar({
              ciudad: t.ciudad_zona,
              departamento: t.departamento,
              ciudad_id: t.ciudad_id,
              departamento_id: t.departamento_id,
              pais_id: t.pais_id,
              tieneTarifa: true,
            });
          });
      }
    });

    return Array.from(ciudades.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [couriersParaOrigen, deliveryZonasParaOrigen, form.departamento, geografia]);

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
      es_raha: productoEsRaha(p),
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
        const resultadoZona = buscarZonaDelivery(deliveryZonasParaOrigen, valCiudad, esAnticipado, itemsParaTarifa, departamentoParaTarifa);
        if (resultadoZona) {
          nextForm.courier_id = resultadoZona.courierId || "";
          nextForm.costo_envio = resultadoZona.costo;
          return nextForm;
        }

        // Si ya hay un courier seleccionado, intentar buscar su tarifa para la nueva ciudad
        if (prev.courier_id) {
          const costo = obtenerTarifaPara(couriersParaOrigen, valCiudad, prev.courier_id, esAnticipado, itemsParaTarifa, departamentoParaTarifa);
          if (costo !== null) {
            nextForm.costo_envio = costo;
            return nextForm;
          }
        }

        // Si no hay courier o el seleccionado no cubre la nueva ciudad, buscar el primero que la cubra
        const resultado = buscarCourierYTarifa(couriersParaOrigen, valCiudad, esAnticipado, itemsParaTarifa, departamentoParaTarifa);
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
        const costo = obtenerTarifaPara(couriersParaOrigen, prev.ciudad, courierId, esAnticipado, itemsParaTarifa, prev.departamento);
        if (costo !== null) {
          nextForm.costo_envio = costo;
        }
      }
      return nextForm;
    });
  };

  // "¿Contra entrega o ya pagó?" — nada que ver con qué método puntual se
  // use. Es lo que decide qué tarifa de courier/zona buscar (algunas zonas
  // cobran distinto según si el courier va a cobrar en el momento o el
  // envío ya viene pago), así que al cambiarlo se recalcula igual que al
  // cambiar de ciudad o de courier.
  const handlePagoAnticipadoChange = (nuevoValor) => {
    setForm(prev => {
      // Al destildar, el método anticipado elegido deja de tener sentido:
      // si se vuelve a tildar hay que elegirlo de nuevo, no arrastrar el
      // anterior sin que nadie lo haya confirmado para este toggle.
      const nextForm = { ...prev, pago_anticipado: nuevoValor, ...(nuevoValor ? {} : { metodo_pago_id: "", metodo_pago: "", metodo_pago_canal: "" }) };
      if (!prev.ciudad) return nextForm;

      if (prev.courier_id) {
        const costo = obtenerTarifaPara(couriersParaOrigen, prev.ciudad, prev.courier_id, nuevoValor, itemsParaTarifa, prev.departamento);
        if (costo !== null) nextForm.costo_envio = costo;
      } else {
        const resultado = buscarZonaDelivery(deliveryZonasParaOrigen, prev.ciudad, nuevoValor, itemsParaTarifa, prev.departamento)
          || buscarCourierYTarifa(couriersParaOrigen, prev.ciudad, nuevoValor, itemsParaTarifa, prev.departamento);
        if (resultado) {
          nextForm.courier_id = resultado.courierId;
          nextForm.costo_envio = resultado.costo;
        }
      }
      return nextForm;
    });
  };

  const handleDepartamentoChange = (departamento) => {
    setForm(prev => {
      const nextForm = { ...prev, departamento };
      if (!prev.ciudad) return nextForm;

      if (departamento && !ciudadExisteEnDepartamento(prev.ciudad, departamento)) {
        nextForm.ciudad = "";
        nextForm.courier_id = "";
        nextForm.costo_envio = 0;
        return nextForm;
      }

      const esAnticipado = prev.pago_anticipado;
      if (prev.courier_id) {
        const costo = obtenerTarifaPara(couriersParaOrigen, prev.ciudad, prev.courier_id, esAnticipado, itemsParaTarifa, departamento);
        if (costo !== null) {
          nextForm.costo_envio = costo;
          return nextForm;
        }
      }

      const resultado = buscarZonaDelivery(deliveryZonasParaOrigen, prev.ciudad, esAnticipado, itemsParaTarifa, departamento)
        || buscarCourierYTarifa(couriersParaOrigen, prev.ciudad, esAnticipado, itemsParaTarifa, departamento);
      if (resultado) {
        nextForm.courier_id = resultado.courierId;
        nextForm.costo_envio = resultado.costo;
      } else {
        nextForm.costo_envio = 0;
      }
      return nextForm;
    });
  };

  const coberturaDeliveryActual = useMemo(() => {
    if (!form.ciudad) return null;
    return buscarZonaDelivery(deliveryZonasParaOrigen, form.ciudad, form.pago_anticipado, itemsParaTarifa, form.departamento)
      || buscarCourierYTarifa(couriersParaOrigen, form.ciudad, form.pago_anticipado, itemsParaTarifa, form.departamento);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couriersParaOrigen, deliveryZonasParaOrigen, form.ciudad, form.departamento, form.pago_anticipado, itemsParaTarifa]);

  const courierAsignado = useMemo(
    () => couriers.find(c => String(c.id) === String(form.courier_id)) || null,
    [couriers, form.courier_id],
  );

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
    if (nuevosItems.some(item => itemEsRaha(item))) {
      setForm(prev => ({ ...prev, origen_preferido_id: "", courier_id: "" }));
      return;
    }
    if (!form.ciudad) return;
    const esAnticipado = form.pago_anticipado;
    const resultadoZona = buscarZonaDelivery(deliveryZonasParaOrigen, form.ciudad, esAnticipado, nuevosItems, form.departamento);
    if (resultadoZona) {
      setForm(prev => ({ ...prev, courier_id: resultadoZona.courierId || "", costo_envio: resultadoZona.costo }));
    } else if (form.courier_id) {
      const nuevoCosto = obtenerTarifaPara(couriersParaOrigen, form.ciudad, form.courier_id, esAnticipado, nuevosItems, form.departamento);
      setForm(prev => ({ ...prev, costo_envio: nuevoCosto !== null ? nuevoCosto : (modoCompletar ? prev.costo_envio : 0) }));
    } else {
      const resultado = buscarCourierYTarifa(couriersParaOrigen, form.ciudad, esAnticipado, nuevosItems, form.departamento);
      if (resultado) {
        setForm(prev => ({ ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
      } else if (!modoCompletar) {
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
      oferta_componentes: oferta ? oferta.componentes : null,
      nombre_producto: oferta ? `${producto.nombre} — ${oferta.nombre}` : producto.nombre,
      origen_venta: oferta ? (oferta.estrategia || 'normal') : 'normal',
      cantidad: qty,
      precio_unitario: precioUnit,
      subtotal: qty * precioUnit,
      es_raha: productoEsRaha(producto),
    };
  };

  const actualizarItemsPedido = (nuevosItems) => {
    setItems(nuevosItems);
    setItemsEditados(true);
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

  const guardarProductosPendientes = async () => {
    if (!items.length) {
      setErrors(prev => ({ ...prev, items: 'Agregá al menos un producto o cancelá el pedido completo.' }));
      setPasoActivo(indicePasoPedido("productos"));
      return;
    }
    setGuardando(true);
    setSubmitError(null);
    try {
      await onSubmit({
        id: envio.id, items,
        costo_envio: Number(form.costo_envio) || 0,
        delivery_a_cargo: form.incluye_delivery ? 'negocio' : 'cliente',
      }, true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'No se pudieron guardar los productos.');
    } finally {
      setGuardando(false);
    }
  };

  const cancelarPedidoPendiente = async () => {
    if (!window.confirm(`¿Cancelar el pedido #${numeroPedidoVisible(envio)} completo?`)) return;
    setGuardando(true);
    setSubmitError(null);
    try {
      await onSubmit({ id: envio.id, estado: 'Cancelado' }, true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'No se pudo cancelar el pedido.');
    } finally {
      setGuardando(false);
    }
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
  // El resumen mostraba "Delivery" al lado de un total que no lo sumaba (los
  // pedidos web lo absorbe el comercio) y parecía un error de cuenta.
  const etiquetaDelivery = deliveryLoPagaNegocio ? 'Delivery a tu cargo' : 'Delivery (incluido)';

  // El método "PagoPar" del catálogo es genérico (una sola fila): con cuál
  // de sus canales habilitados pagó el cliente (transferencia, tarjeta,
  // QR...) se elige acá al lado, reusando el mismo agrupamiento que
  // "Analizar margen" (SensibilidadPanel.jsx) en vez de inventar una lista
  // paralela — pedido del usuario, 2026-10-14.
  const metodoAnticipadoSeleccionado = metodosPago.find(m => String(m.id) === String(form.metodo_pago_id));
  const comisionMetodoAnticipado = metodoAnticipadoSeleccionado?.comision_porcentaje != null
    && metodoAnticipadoSeleccionado.comision_porcentaje !== ""
    && Number.isFinite(Number(metodoAnticipadoSeleccionado.comision_porcentaje))
    ? Number(metodoAnticipadoSeleccionado.comision_porcentaje)
    : null;
  const esPagoParSeleccionado = puedeElegirMetodoAnticipado && !pagoParBloqueado && /pagopar/i.test(metodoAnticipadoSeleccionado?.nombre || "");

  useEffect(() => {
    if (!esPagoParSeleccionado || canalesPagopar.length > 0 || canalesPagoparLoading) return;
    setCanalesPagoparLoading(true);
    setCanalesPagoparError("");
    paymentGatewayService.formasPagoPagopar()
      .then((res) => setCanalesPagopar(res?.opciones_checkout || []))
      .catch((err) => setCanalesPagoparError(err?.response?.data?.error || "No se pudieron cargar los canales de PagoPar."))
      .finally(() => setCanalesPagoparLoading(false));
  }, [esPagoParSeleccionado, canalesPagopar.length, canalesPagoparLoading]);
  const montoRecalculado = (Number(subtotalProductos) || 0) + fleteAlCliente;

  // Sobre un pedido ya cargado se respeta su monto salvo que se toque el
  // costo del envío o quién lo paga — que es justo lo que el usuario cambia
  // cuando SÍ quiere mover el precio. El auto-completado de tarifa por zona
  // también entra por acá: si rellena un flete que estaba en cero, el monto
  // se actualiza, porque eso es un cambio real del envío.
  const precioBase = precioAlAbrirRef.current;
  const cambioAlgoDelPrecio = !precioBase
    || itemsEditados
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
      // Marcar "pago anticipado" es decir que la plata ya llegó: sin elegir
      // con qué método, no hay forma de confirmar el pedido (pedido del
      // usuario, 2026-10-14) — se vuelve a contra entrega si no se sabe.
      if (form.pago_anticipado && puedeElegirMetodoAnticipado && !pagoParBloqueado && !form.metodo_pago_id) {
        newErrors.metodo_pago_id = "Elegí con qué método ya pagó el cliente, o destildá \"Pago anticipado\" si todavía no llegó la plata.";
      }
      if (form.pago_anticipado && esPagoParSeleccionado && !form.metodo_pago_canal) {
        newErrors.metodo_pago_canal = "Elegí con qué canal de PagoPar pagó el cliente.";
      }
      if (form.origen_preferido_id && stockOrigenLoading) {
        newErrors.origen_preferido_id = "Esperá un momento: estamos verificando el stock del depósito.";
      } else if (problemaStockOrigen) {
        newErrors.origen_preferido_id = "El depósito elegido no tiene stock suficiente para este pedido.";
      }
      if (form.link_maps.trim()) {
        try {
          new URL(form.link_maps.trim());
        } catch {
          newErrors.link_maps = "Pega un link válido de Google Maps o deja este campo vacío.";
        }
      }
    }

    if (pasoId === "productos" && puedeSeleccionarProductos && items.length === 0) {
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

  // Lleva al primer campo con error: el resumen de errores de arriba empujaba
  // el modal y el campo quedaba fuera de la vista sin que se supiera dónde.
  const enfocarPrimerError = () => {
    requestAnimationFrame(() => {
      const campo = document.querySelector('.np-wizard-form [aria-invalid="true"], .np-wizard-form .input-error');
      if (!campo) return;
      campo.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      campo.focus?.({ preventScroll: true });
    });
  };

  const validarPaso = (pasoId) => {
    const newErrors = erroresDePaso(pasoId);
    setErroresDelPaso(pasoId, newErrors);
    if (Object.keys(newErrors).length > 0) enfocarPrimerError();
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
      enfocarPrimerError();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e, { explicit = false } = {}) => {
    e?.preventDefault();

    if (!explicit) {
      return;
    }

    if (cotizandoRaha) return;

    if (!validarFormulario()) {
      return;
    }

    // El método de pago solo viaja cuando el confirmador lo eligió acá mismo
    // (pago anticipado, recién elegido) — en cualquier otro caso se borra:
    // contra entrega todavía no se sabe con qué va a cobrar el courier, y un
    // pedido ya pagado con PagoPar no se vuelve a mandar porque está
    // bloqueado (el backend ya lo tiene).
    const incluirMetodoAnticipado = form.pago_anticipado === true && !pagoParBloqueado && puedeElegirMetodoAnticipado;
    const formSinMetodoPago = { ...form };
    delete formSinMetodoPago.metodo_pago;
    delete formSinMetodoPago.metodo_pago_id;
    delete formSinMetodoPago.metodo_pago_canal;
    const comunes = {
      ...formSinMetodoPago,
      courier_id: pedidoRaha ? null : (form.courier_id ? Number(form.courier_id) : null),
      costo_envio: Number(form.costo_envio) || 0,
      delivery_a_cargo: deliveryLoPagaNegocio ? "negocio" : "cliente",
      pago_anticipado: form.pago_anticipado === true,
      origen_preferido_id: pedidoRaha ? null : (form.origen_preferido_id ? Number(form.origen_preferido_id) : null),
      monto: precioTotalVendido,
      ...(incluirMetodoAnticipado ? { metodo_pago_id: Number(form.metodo_pago_id) } : {}),
      ...(incluirMetodoAnticipado && esPagoParSeleccionado && form.metodo_pago_canal ? { metodo_pago_canal: form.metodo_pago_canal } : {})
    };

    // Confirmar es un PASO del pedido, no un efecto de guardar. Solo un
    // pedido Pendiente puede pasar a Confirmado (ver TRANSICIONES_VALIDAS en
    // envioController); mandar el estado en toda edición hacía que abrir un
    // pedido ya entregado para corregirle un dato terminara en
    // 'No se puede pasar de "Entregado" a "Confirmado"' y no dejara guardar
    // nada. Si el pedido ya avanzó, se guardan los datos y el estado no se
    // toca.
    const payload = modoCompletar
      ? { ...comunes, id: envio.id, ...(vaAConfirmar ? { estado: "Confirmado" } : {}), ...(editaProductosExistentes && itemsEditados ? { items } : {}) }
      : { ...comunes, items };

    setGuardando(true);
    setSubmitError(null);
    try {
      await onSubmit(payload, modoCompletar);
    } catch (err) {
      const data = err.response?.data || {};
      if (data.code === 'STOCK_DISTRIBUIDO_ENTRE_UBICACIONES') {
        setPasoActivo(indicePasoPedido("entrega"));
        setErrors(prev => ({
          ...prev,
          origen_preferido_id: data.error || 'El origen de despacho elegido no tiene stock suficiente. Revisá el depósito antes de confirmar.',
        }));
        setSubmitError(null);
      } else {
        setSubmitError(data.error || "Ocurrió un error al guardar el pedido.");
      }
    } finally {
      setGuardando(false);
    }
  };

  const contenidosSeleccionados = itemsParaTarifa.map(contenidoItem);
  const unidadesSeleccionadas = contenidosSeleccionados.some(c => c.unidades === null)
    ? 'Por verificar'
    : contenidosSeleccionados.reduce((acc, c) => acc + c.unidades, 0);
  const resumenCarga = [
    { label: "Cliente", ok: Boolean(form.nombre_cliente.trim()) },
    { label: "Productos", ok: itemsParaTarifa.length > 0 },
    { label: "Entrega", ok: Boolean(form.ciudad.trim() && form.direccion.trim()) },
    { label: "Total", ok: precioTotalVendido > 0 },
  ];
  const pasoActual = PASOS_PEDIDO[pasoActivo];
  const esUltimoPaso = pasoActivo === PASOS_PEDIDO.length - 1;
  const hayDatosSinGuardar = !guardando && (modoCompletar ? itemsEditados : (
    items.length > 0 ||
    form.nombre_cliente.trim() ||
    form.telefono.trim() ||
    form.ciudad.trim() ||
    form.direccion.trim() ||
    form.observaciones.trim()
  ));

  // Un pedido de la tienda web viejo puede no tener canal guardado: abría en
  // "Sin especificar" aunque el sistema sabe que vino de la web. Se completa
  // con el canal "web" (mismo slug que usa el checkout al crear el pedido).
  useEffect(() => {
    if (!modoCompletar || form.canal_venta_id || String(envio?.origen || '').toUpperCase() !== 'LANDING') return;
    const web = canalesVenta.find(c => String(c.slug || '').toLowerCase() === 'web');
    if (web) setForm(prev => (prev.canal_venta_id ? prev : { ...prev, canal_venta_id: String(web.id) }));
  }, [modoCompletar, envio?.origen, canalesVenta, form.canal_venta_id]);

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
    for (let paso = pasoActivo; paso < index; paso += 1) {
      if (!validarPaso(PASOS_PEDIDO[paso].id)) {
        setPasoActivo(paso);
        return;
      }
    }
    setPasoActivo(index);
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
                ? (envio.es_lead ? `Confirmar compra · ${numeroPedidoVisible(envio)}` : `${vaAConfirmar ? "Completar" : "Editar"} pedido #${numeroPedidoVisible(envio)}`)
                : "Nuevo pedido"}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {modoCompletar && onAbrirSeguimiento && (
              <button 
                type="button" 
                onClick={() => onAbrirSeguimiento(envio)} 
                className="np-close-action" 
                aria-label="Abrir seguimiento por WhatsApp"
              >
                <MessageCircle size={20} />
                <span>WhatsApp</span>
              </button>
            )}
            <button type="button" onClick={handleRequestClose} className="np-close-action" aria-label="Cerrar modal">
              <X size={20} />
              <span>Cerrar</span>
            </button>
          </div>
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

            {/* Datos del cliente. */}
            <div className={`np-section np-step-panel ${pasoActual.id === 'cliente' ? 'is-active' : ''}`}>
              <h3 className="np-section-title">
                <User size={16} /> Datos del Cliente y Registro
              </h3>

              {/* El cliente primero: al cargar un pedido por WhatsApp lo que
                  se tiene a mano es el nombre y el teléfono; fecha, hora y
                  confirmador ya vienen completos. */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ margin: 0 }}>Teléfono del cliente</label>
                  {modoCompletar && onAbrirSeguimiento && form.telefono && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); onAbrirSeguimiento(envio); }}
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary-text)', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', padding: '2px 8px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                    >
                      <MessageCircle size={12} /> Contactar
                    </button>
                  )}
                </div>
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

              <p className="np-subsection-label">Registro del pedido</p>

              <div className="np-row">
                <label>Fecha</label>
                {modoCompletar ? (
                  <div className="form-input" style={{ opacity: 0.7 }}>{String(form.fecha || "").split("-").reverse().join("/")}</div>
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
                <label htmlFor="np-canal-venta">Canal / Origen</label>
                {modoCompletar && esWhatsapp ? <div className="form-input">WhatsApp · Cargado desde Venta por WhatsApp</div> : <select
                  id="np-canal-venta"
                  className="form-input"
                  value={form.canal_venta_id}
                  onChange={e => setForm({ ...form, canal_venta_id: e.target.value })}
                >
                  <option value="">Sin especificar</option>
                  {canalesVenta.filter(c => !`${c.slug || ''} ${c.nombre || ''}`.toUpperCase().includes('WHATSAPP')).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>}
              </div>

            </div>

            {/* Elegir productos antes de resolver la entrega. */}
          <div className={`np-section np-full-width np-step-panel ${pasoActual.id === 'productos' ? 'is-active' : ''}`}>
            <h3 className="np-section-title">
              <ShoppingBag size={16} /> Productos Vendidos en el Pedido
            </h3>
            <div className="np-products-hero">
              <div>
                <span className="np-kicker">{puedeSeleccionarProductos ? 'Selección visual' : 'Detalle de la compra'}</span>
                <p>{puedeSeleccionarProductos ? 'Buscá en el catálogo, elegí por imagen y ajustá cada línea antes de confirmar.' : 'Revisá la presentación comprada y las unidades de cada producto que hay que preparar.'}</p>
              </div>
              <div className="np-products-metrics">
                <span><strong>{itemsParaTarifa.length}</strong> ítems</span>
                <span><strong>{unidadesSeleccionadas}</strong> unidades</span>
              </div>
            </div>

            <div className="np-product-workbench">
              {puedeSeleccionarProductos && (
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
                      const contenido = contenidoItem(it);
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
                                <strong>{nombreBaseItem(it)}</strong>
                                {tipoLineaItem(it) && (
                                  <span className="np-line-badge">{tipoLineaItem(it)}</span>
                                )}
                                {modoCompletar && precioEditandoId === it.id ? (
                                  <div className="np-order-item-price-edit">
                                    <CurrencyInput
                                      value={precioTemp}
                                      onChange={setPrecioTemp}
                                      className="form-input np-price-input"
                                      style={{ textAlign: 'left' }}
                                    />
                                    <button
                                      type="button"
                                      className="btn-icon"
                                      title="Guardar precio"
                                      disabled={guardandoPrecioId === it.id}
                                      onClick={() => guardarPrecioItem(it)}
                                    >
                                      {guardandoPrecioId === it.id ? <Loader2 size={14} /> : <Check size={14} />}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-icon"
                                      title="Cancelar"
                                      disabled={guardandoPrecioId === it.id}
                                      onClick={() => { setPrecioEditandoId(null); setPrecioError(null); }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="np-order-item-price-view">
                                    Gs. {pUnit.toLocaleString('es-PY')} / {contenido.esOferta ? 'presentación' : 'unidad'}
                                    {modoCompletar && !puedeSeleccionarProductos && (
                                      <button
                                        type="button"
                                        className="btn-icon"
                                        title="Cambiar el precio de este ítem solo para este pedido (ej. descuento por seguimiento comercial)"
                                        onClick={() => { setPrecioEditandoId(it.id); setPrecioTemp(pUnit); setPrecioError(null); }}
                                      >
                                        <Pencil size={12} />
                                      </button>
                                    )}
                                  </span>
                                )}
                              </div>
                              {puedeSeleccionarProductos && (
                                <button type="button" onClick={() => handleRemoveItem(idx)} className="btn-icon danger" title="Quitar producto" aria-label={`Quitar ${nombreBaseItem(it)}`} disabled={guardando}>
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            {modoCompletar && precioEditandoId === it.id && precioError && (
                              <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>{precioError}</p>
                            )}

                            <div className="np-item-contents">
                              <span className="np-item-presentation">{it.oferta_nombre || (contenido.esOferta ? 'Combo' : 'Venta individual')}</span>
                              <span className="np-item-purchased">Comprado: {cantLinea} {contenido.esOferta ? (cantLinea === 1 ? 'presentación' : 'presentaciones') : (cantLinea === 1 ? 'unidad' : 'unidades')}</span>
                              <strong className="np-item-prepare">{contenido.unidades === null ? 'Contenido por verificar' : `Preparar: ${contenido.unidades} ${contenido.unidades === 1 ? 'unidad' : 'unidades'}`}</strong>
                              {contenido.componentes.length > 0 ? (
                                <ul>{contenido.componentes.map((c, i) => <li key={i}><b>{c.cantidad} ×</b> {c.nombre}{c.variante ? ` · ${c.variante}` : ''}</li>)}</ul>
                              ) : <small>No hay desglose disponible para esta presentación.</small>}
                            </div>

                            <div className="np-order-item-controls">
                              {puedeSeleccionarProductos ? (
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
                                      {it.oferta_id && !ofertas.some(o => Number(o.id) === Number(it.oferta_id)) && <option value={it.oferta_id}>{it.oferta_nombre || 'Presentación comprada'} (Gs. {pUnit.toLocaleString('es-PY')})</option>}
                                      {ofertas.map(o => (
                                        <option key={o.id} value={o.id}>{o.nombre} (Gs. {Number(o.precio).toLocaleString('es-PY')})</option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    {contenido.esOferta ? 'Cantidad de presentaciones' : 'Cantidad de unidades'}
                                    <div className="np-qty-control">
                                      <button type="button" onClick={() => handleCantidadItemChange(idx, cantLinea - 1)} title="Restar" aria-label={`Restar ${nombreBaseItem(it)}`} disabled={cantLinea <= 1 || guardando}>
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        aria-label={`Cantidad de ${nombreBaseItem(it)}`}
                                        disabled={guardando}
                                        value={cantLinea}
                                        onChange={e => handleCantidadItemChange(idx, e.target.value)}
                                      />
                                      <button type="button" onClick={() => handleCantidadItemChange(idx, cantLinea + 1)} title="Sumar" aria-label={`Sumar ${nombreBaseItem(it)}`} disabled={guardando}>
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  </label>
                                </>
                              ) : null}

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
                <span>{etiquetaDelivery}: Gs. {(Number(form.costo_envio) || 0).toLocaleString('es-PY')}</span>
              </div>
              <strong className="np-total-amount">
                Total a cobrar: Gs. {(Number(precioTotalVendido) || 0).toLocaleString('es-PY')}
              </strong>
            </div>
          </div>

            <div className={`np-section np-step-panel ${pasoActual.id === 'entrega' ? 'is-active' : ''}`}>
              <h3 className="np-section-title">
                <MapPin size={16} /> Ubicación de Entrega y Courier
              </h3>

              <div className="np-row">
                <label>Departamento</label>
                <CreatableSelect
                  isClearable
                  placeholder="Buscar departamento..."
                  styles={selectStyles}
                  options={optionsDepartamentos}
                  filterOption={filterSelectOption}
                  noOptionsMessage={() => geografiaError ? "No pudimos cargar el catálogo. Podés escribirlo manualmente." : "Sin coincidencias."}
                  formatCreateLabel={(inputValue) => `Usar "${inputValue}"`}
                  value={form.departamento ? (
                    optionsDepartamentos.find(o => normalizarBusqueda(o.value) === normalizarBusqueda(form.departamento))
                    || { value: form.departamento, label: form.departamento }
                  ) : null}
                  onChange={(newValue) => {
                    handleDepartamentoChange(newValue ? newValue.value : "");
                  }}
                  onCreateOption={(inputValue) => handleDepartamentoChange(inputValue)}
                />
                <span className="np-hint">
                  Filtrá por Central, Alto Paraná u otro departamento para ver sus ciudades.
                </span>
              </div>

              <div className="np-row">
                <label>Ciudad <span className="req">*</span></label>
                <CreatableSelect
                  isClearable
                  placeholder={form.departamento ? "Buscar ciudad del departamento..." : "Primero elegí departamento o buscá ciudad..."}
                  styles={selectStyles}
                  aria-invalid={Boolean(errors.ciudad)}
                  aria-describedby={errors.ciudad ? "np-ciudad-error" : undefined}
                  options={optionsCiudades}
                  filterOption={filterSelectOption}
                  noOptionsMessage={() => geografiaError ? "No pudimos cargar el catálogo. Podés escribir la ciudad manualmente." : "No encontramos ciudades para ese filtro."}
                  formatCreateLabel={(inputValue) => `Usar "${inputValue}"`}
                  formatOptionLabel={(option, { context }) => (
                    context === "menu" ? (
                      <div className="np-geo-option">
                        <span>{option.value}</span>
                        <small>
                          {option.departamento || "Sin departamento"}
                          {option.tieneTarifa ? " · con tarifa" : ""}
                        </small>
                      </div>
                    ) : option.label
                  )}
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
                {form.ciudad && !pedidoRaha && !coberturaDeliveryActual && !form.courier_id && (
                  <div className="np-inline-notice">
                    <AlertCircle size={15} />
                    <span>
                      Podés guardar este pedido sin courier. Si ya conocés el flete, cargá el costo abajo; después asignás el courier desde Delivery o desde el pedido.
                    </span>
                  </div>
                )}
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

              <div className="np-row">
                <label>Origen de despacho</label>
                <select
                  className={`form-input ${errors.origen_preferido_id ? 'input-error' : ''}`}
                  value={pedidoRaha ? "__RAHA__" : form.origen_preferido_id}
                  aria-invalid={Boolean(errors.origen_preferido_id)}
                  disabled={pedidoRaha}
                  onChange={e => {
                    setForm({ ...form, origen_preferido_id: e.target.value });
                    if (errors.origen_preferido_id) setErrors({ ...errors, origen_preferido_id: null });
                    setSubmitError(null);
                  }}
                >
                  {pedidoRaha ? (
                    <option value="__RAHA__">RAHA</option>
                  ) : (
                    <>
                      <option value="">Automático según stock</option>
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} · {u.ciudad}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <span className="np-hint">
                  {pedidoRaha
                    ? 'Este producto sale desde RAHA. No usa depósitos ni stock local de la tienda.'
                    : form.origen_preferido_id
                    ? 'El pedido completo se reserva desde este depósito. Si no tiene stock suficiente, el sistema lo va a avisar y no se confirma.'
                    : 'No elegís vos: al confirmar, el sistema toma el stock del depósito de esta tienda que lo tenga. Elegí un depósito solo si querés forzar de dónde sale.'}
                </span>
                {couriersDepositoError && form.origen_preferido_id && (
                  <span className="field-error">{couriersDepositoError}</span>
                )}
                {stockOrigenLoading && form.origen_preferido_id && itemsStockPedido.length > 0 && (
                  <span className="np-hint">Verificando stock de este depósito...</span>
                )}
                {stockOrigenError && form.origen_preferido_id && (
                  <span className="field-error">{stockOrigenError}</span>
                )}
                {problemaStockOrigen && (
                  <div className="np-stock-alert" role="alert">
                    <AlertCircle size={16} />
                    <div>
                      <strong>El depósito seleccionado no tiene stock suficiente.</strong>
                      <p>
                        {problemaStockOrigen.faltantes?.length === 1
                          ? `${problemaStockOrigen.faltantes[0].nombre} necesita ${problemaStockOrigen.faltantes[0].necesario} unidad${problemaStockOrigen.faltantes[0].necesario === 1 ? '' : 'es'} y acá hay ${problemaStockOrigen.faltantes[0].disponible}.`
                          : "Este depósito no alcanza para todos los productos del pedido."}
                      </p>
                      {(stockOrigen?.alternativas || []).length > 0 ? (
                        <div className="np-stock-alert-actions">
                          <span>Hay stock suficiente en:</span>
                          {stockOrigen.alternativas.slice(0, 3).map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setForm(prev => ({ ...prev, origen_preferido_id: String(d.id) }));
                                setErrors(prev => ({ ...prev, origen_preferido_id: null }));
                                setSubmitError(null);
                              }}
                            >
                              {d.nombre}{d.ciudad ? ` · ${d.ciudad}` : ''}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p>El stock disponible está distribuido entre varias ubicaciones. Cambiá el origen de despacho o separá el pedido.</p>
                      )}
                    </div>
                  </div>
                )}
                {errors.origen_preferido_id && !problemaStockOrigen && (
                  <span className="field-error">{errors.origen_preferido_id}</span>
                )}
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
                    value={pedidoRaha ? "__RAHA__" : form.courier_id}
                    onChange={e => handleCourierChange(e.target.value)}
                    disabled={pedidoRaha || Boolean(form.origen_preferido_id && couriersDepositoLoading === String(form.origen_preferido_id))}
                  >
                    {pedidoRaha ? (
                      <option value="__RAHA__">RAHA</option>
                    ) : (
                      <>
                        <option value="">
                          {form.origen_preferido_id && couriersDepositoLoading === String(form.origen_preferido_id)
                            ? "-- Cargando couriers --"
                            : "-- Sin asignar --"}
                        </option>
                        {couriersParaOrigen.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre} ({c.vehiculo})</option>
                        ))}
                      </>
                    )}
                  </select>
                  <span className="np-hint">
                    {pedidoRaha
                      ? "Asignado a RAHA. El pedido se crea en RAHA y no usa couriers locales."
                      : form.origen_preferido_id && couriersDepositoLoading === String(form.origen_preferido_id)
                      ? "Estamos buscando los couriers vinculados a ese depósito."
                      : form.origen_preferido_id && courierIdsPermitidos && couriersParaOrigen.length === 0
                        ? "Este depósito todavía no tiene couriers vinculados."
                        : courierAsignado
                      ? `Asignado a ${courierAsignado.nombre}.`
                      : "No bloquea el pedido: podés asignarlo cuando tengas el courier cargado."}
                  </span>
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
                    onChange={val => { costoManualVersion.current += 1; setForm({ ...form, costo_envio: val }); }}
                    prefix=""
                  />
                  {pedidoRaha && (cotizandoRaha || avisoTarifaRaha) && <span className="np-hint" role="status">{cotizandoRaha ? 'Consultando tarifa RAHA…' : avisoTarifaRaha}</span>}
                </div>

                {/* El toggle en sí es sobre el MOMENTO del cobro, no el
                    método: algunas zonas/couriers cobran una tarifa distinta
                    si van a cobrar en el momento (contra entrega) que si el
                    envío ya viene pago — por eso, al tocarlo, se vuelve a
                    buscar la tarifa igual que al cambiar de ciudad o de
                    courier. Pero tildarlo SÍ implica elegir con qué método
                    anticipado ya pagó el cliente (pedido del usuario,
                    2026-10-14): si la plata todavía no llegó, no se confirma
                    como anticipado, se deja contra entrega. */}
                <div className="np-row">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: pagoParBloqueado ? 'default' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.pago_anticipado}
                      disabled={pagoParBloqueado}
                      onChange={e => handlePagoAnticipadoChange(e.target.checked)}
                    />
                    <span>Pago anticipado</span>
                  </label>
                  <span className="np-hint" style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>
                    {pagoParBloqueado
                      ? 'Pagado online con PagoPar: no se puede destildar ni cambiar de método.'
                      : form.pago_anticipado
                      ? 'El cliente ya transfirió y confirmó el pago antes de la entrega.'
                      : 'Contra entrega: el cliente paga cuando recibe el pedido.'}
                  </span>
                </div>

                {form.pago_anticipado && puedeElegirMetodoAnticipado && (
                  <div className="np-payment-fields">
                    <div className="np-row">
                      <label htmlFor="np-metodo-anticipado">Método de pago anticipado <span className="req">*</span></label>
                      {pagoParBloqueado ? (
                        <div
                          id="np-metodo-anticipado"
                          className="form-input"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-fg-muted)', background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)' }}
                        >
                          PagoPar
                        </div>
                      ) : (
                        <select
                          id="np-metodo-anticipado"
                          className="form-input"
                          aria-describedby={comisionMetodoAnticipado !== null ? "np-metodo-anticipado-comision" : metodosPago.filter(m => m.es_anticipado).length === 0 ? "np-metodo-anticipado-hint" : undefined}
                          value={form.metodo_pago_id}
                          onChange={e => {
                            const metodo = metodosPago.find(m => String(m.id) === e.target.value);
                            setForm(prev => ({ ...prev, metodo_pago_id: e.target.value, metodo_pago: metodo?.nombre || "", metodo_pago_canal: "" }));
                          }}
                        >
                          <option value="">-- Elegí el método --</option>
                          {metodosPago.filter(m => m.es_anticipado).map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      )}
                      {comisionMetodoAnticipado !== null && (
                        <span id="np-metodo-anticipado-comision" className="np-hint">
                          Comisión del método: <strong>{comisionMetodoAnticipado.toLocaleString('es-PY', { maximumFractionDigits: 2 })}%</strong>
                        </span>
                      )}
                      {errors.metodo_pago_id && <span className="field-error">{errors.metodo_pago_id}</span>}
                      {!pagoParBloqueado && metodosPago.filter(m => m.es_anticipado).length === 0 && (
                        <span id="np-metodo-anticipado-hint" className="np-hint" style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>
                          Todavía no cargaste ningún método marcado como "Anticipado" en Mi Tienda → Métodos de pago.
                        </span>
                      )}
                    </div>

                    {/* Al lado del método, alineado: el método "PagoPar" del
                        catálogo es una sola fila, pero PagoPar en realidad
                        habilita varios canales (transferencia, tarjeta, QR,
                        billeteras, bocas de pago) — se reusa el mismo
                        agrupamiento que "Analizar margen" en vez de listar
                        uno por uno. */}
                    {esPagoParSeleccionado && (
                      <div className="np-row">
                        <label htmlFor="np-canal-pagopar">Canal de PagoPar <span className="req">*</span></label>
                        {canalesPagoparLoading ? (
                          <div className="form-input" style={{ color: 'var(--color-fg-muted)' }}>Cargando canales...</div>
                        ) : canalesPagoparError ? (
                          <span className="np-hint" style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{canalesPagoparError}</span>
                        ) : (
                          <select
                            id="np-canal-pagopar"
                            className="form-input"
                            value={form.metodo_pago_canal}
                            onChange={e => setForm(prev => ({ ...prev, metodo_pago_canal: e.target.value }))}
                          >
                            <option value="">-- Elegí el canal --</option>
                            {canalesPagopar.map(c => (
                              <option key={c.id} value={c.nombre}>{c.nombre}</option>
                            ))}
                          </select>
                        )}
                        {errors.metodo_pago_canal && <span className="field-error">{errors.metodo_pago_canal}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>



            </div>

          </div>

          {/* Revisión final del pedido. */}
          <div className={`np-section np-full-width np-step-panel ${pasoActual.id === 'revision' ? 'is-active' : ''}`}>
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
                  <button type="button" onClick={() => setPasoActivo(indicePasoPedido("entrega"))}>Editar</button>
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
                  <button type="button" onClick={() => setPasoActivo(indicePasoPedido("productos"))}>Editar</button>
                </div>
                {itemsParaTarifa.length > 0 ? (
                  <div className="np-review-products">
                    {itemsParaTarifa.map((it, idx) => (
                      <div key={`${it.producto_id || idx}-review`}>
                        <span className="np-review-product-name">
                          <span>
                            {nombreBaseItem(it)}
                            {tipoLineaItem(it) && <span className="np-line-badge">{tipoLineaItem(it)}</span>}
                          </span>
                          {it.oferta_nombre && <small>{it.oferta_nombre}</small>}
                          <small>{contenidoItem(it).unidades === null ? 'Contenido por verificar' : `Preparar: ${contenidoItem(it).unidades} unidades`}</small>
                        </span>
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

                </div>
              )}

              <div className="np-observaciones-field">
                <label className="np-label-obs">Observaciones</label>
                <textarea
                  className="form-input np-observaciones-textarea"
                  rows={5}
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
                <span className="np-kicker">Total a cobrar</span>
                <strong>Gs. {(Number(precioTotalVendido) || 0).toLocaleString('es-PY')}</strong>
                <div className="np-summary-lines">
                  <div><span>Productos</span><b>Gs. {(Number(subtotalProductos) || 0).toLocaleString('es-PY')}</b></div>
                  <div><span>{etiquetaDelivery}</span><b>Gs. {(Number(form.costo_envio) || 0).toLocaleString('es-PY')}</b></div>
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
              {/* Lejos de Guardar y Continuar: estaba al lado de "Guardar
                  productos" en el pie y se cancelaba un pedido por error. */}
              {editaProductosExistentes && (
                <button type="button" className="np-cancelar-pedido" disabled={guardando} onClick={cancelarPedidoPendiente}>
                  <Trash2 size={15} /> Cancelar este pedido
                </button>
              )}
            </aside>
          </div>

          {/* Acciones del wizard */}
          <div className="np-footer">
            {editaProductosExistentes ? (
              <div className="np-footer-edit-actions">
                <button type="button" className="np-nav-action" disabled={guardando || !itemsEditados} onClick={guardarProductosPendientes}>
                  <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar productos'}
                </button>
              </div>
            ) : (
            <button
              type="button"
              className="np-secondary-action"
              disabled
              title="Pendiente de soporte backend para guardar pedidos en borrador."
            >
              <Save size={16} /> Guardar borrador
            </button>
            )}

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
                  disabled={guardando || cotizandoRaha}
                  onClick={(e) => handleSubmit(e, { explicit: true })}
                >
                  {guardando ? "Guardando..." : (modoCompletar && !vaAConfirmar ? "Guardar cambios" : envio?.es_lead ? "Crear y confirmar pedido" : "Confirmar pedido")}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
