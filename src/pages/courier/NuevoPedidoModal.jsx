import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, MapPin, ShoppingBag, User, Truck, AlertCircle, ImageOff, Minus, Package } from "lucide-react";
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
    color: 'var(--color-fg)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    '&:active': {
      background: 'var(--color-primary)'
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
      incluye_delivery: true,
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
    incluye_delivery: envio.incluye_delivery !== false,
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

  useEffect(() => {
    if (open) {
      setForm(buildFormFromEnvio(envio));
      setItems([]);
      setOfertasPorProducto({});
      setErrors({});
      setSubmitError(null);
      cargarDatosIniciales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, envio]);

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
    const esAnticipado = esMetodoAnticipado(form.metodo_pago_id);
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

  // El tipo de pago que espera la tarifa de courier ("Anticipado"/"Al Recibir")
  // se deriva del flag es_anticipado configurado en el ABM de Métodos de Pago.
  const esMetodoAnticipado = (metodoPagoId) => {
    const metodo = metodosPago.find(m => m.id === Number(metodoPagoId));
    return !!(metodo && metodo.es_anticipado);
  };

  // Al cambiar la ciudad, buscar tarifa configurada de delivery
  const handleCiudadChange = (valCiudad, departamentoSeleccionado) => {
    setForm(prev => {
      const nextForm = { ...prev, ciudad: valCiudad };
      if (departamentoSeleccionado !== undefined) {
        nextForm.departamento = departamentoSeleccionado || "";
      }
      const departamentoParaTarifa = departamentoSeleccionado !== undefined ? departamentoSeleccionado : prev.departamento;

      if (valCiudad) {
        const esAnticipado = esMetodoAnticipado(prev.metodo_pago_id);
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
        const esAnticipado = esMetodoAnticipado(prev.metodo_pago_id);
        const costo = obtenerTarifaPara(couriers, prev.ciudad, courierId, esAnticipado, itemsParaTarifa, prev.departamento);
        if (costo !== null) {
          nextForm.costo_envio = costo;
        }
      }
      return nextForm;
    });
  };

  const handleMetodoPagoChange = (metodoPagoId) => {
    const metodo = metodosPago.find(m => m.id === Number(metodoPagoId));
    const esAnticipado = !!(metodo && metodo.es_anticipado);
    setForm(prev => {
      const nextForm = { ...prev, metodo_pago_id: metodoPagoId, metodo_pago: metodo ? metodo.nombre : prev.metodo_pago };
      const resultadoZona = prev.ciudad
        ? buscarZonaDelivery(deliveryZonas, prev.ciudad, esAnticipado, itemsParaTarifa, prev.departamento)
        : null;
      if (resultadoZona) {
        nextForm.courier_id = resultadoZona.courierId || "";
        nextForm.costo_envio = resultadoZona.costo;
      } else if (prev.ciudad && prev.courier_id) {
        const costo = obtenerTarifaPara(couriers, prev.ciudad, prev.courier_id, esAnticipado, itemsParaTarifa, prev.departamento);
        if (costo !== null) {
          nextForm.costo_envio = costo;
        }
      } else if (prev.ciudad) {
        const resultado = buscarCourierYTarifa(couriers, prev.ciudad, esAnticipado, itemsParaTarifa, prev.departamento);
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

      const esAnticipado = esMetodoAnticipado(prev.metodo_pago_id);
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
    const esAnticipado = esMetodoAnticipado(form.metodo_pago_id);
    const resultadoZona = buscarZonaDelivery(deliveryZonas, form.ciudad, esAnticipado, nuevosItems, form.departamento);
    if (resultadoZona) {
      setForm(prev => ({ ...prev, courier_id: resultadoZona.courierId || "", costo_envio: resultadoZona.costo }));
    } else if (form.courier_id) {
      const nuevoCosto = obtenerTarifaPara(couriers, form.ciudad, form.courier_id, esAnticipado, nuevosItems, form.departamento);
      if (nuevoCosto !== null) {
        setForm(prev => ({ ...prev, costo_envio: nuevoCosto }));
      }
    } else {
      const resultado = buscarCourierYTarifa(couriers, form.ciudad, esAnticipado, nuevosItems, form.departamento);
      if (resultado) {
        setForm(prev => ({ ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
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

    const producto = productoPorId.get(productoId) || item;
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
  const precioTotalVendido = (Number(subtotalProductos) || 0) + (Number(form.costo_envio) || 0);

  // Validaciones personalizadas en español (sin HTML native form tooltips)
  const validarFormulario = () => {
    const newErrors = {};

    if (!form.nombre_cliente.trim()) {
      newErrors.nombre_cliente = "Por favor, ingresa el nombre del cliente.";
    }
    if (!form.ciudad.trim()) {
      newErrors.ciudad = "Por favor, selecciona o ingresa la ciudad de destino.";
    }
    if (!form.direccion.trim()) {
      newErrors.direccion = "Por favor, ingresa la dirección de entrega.";
    }
    if (!modoCompletar && items.length === 0) {
      newErrors.items = "Debes agregar al menos un producto al pedido.";
    }
    if (form.quiere_factura && !form.ruc.trim()) {
      newErrors.ruc = "El RUC es obligatorio cuando se solicita factura.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      monto: precioTotalVendido
    };

    const payload = modoCompletar
      ? { ...comunes, id: envio.id, estado: "Confirmado" }
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

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content np-modal-container"
        onClick={e => e.stopPropagation()}
      >
        <div className="np-header-banner">
          <div className="np-header-copy">
            <span className="np-brand-mark">Gesicom<span>.</span></span>
            <h2>{modoCompletar ? `Completar pedido #${envio.id}` : "Nuevo pedido"}</h2>
          </div>
          <button type="button" onClick={onClose} className="np-close-action" aria-label="Cerrar modal">
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

        <form onSubmit={handleSubmit} className="np-form" noValidate>
          <div className="np-grid">

            {/* Columna Izquierda: Datos del Cliente */}
            <div className="np-section">
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
                  onChange={e => {
                    setForm({ ...form, nombre_cliente: e.target.value });
                    if (errors.nombre_cliente) setErrors({ ...errors, nombre_cliente: null });
                  }}
                />
                {errors.nombre_cliente && <span className="field-error">{errors.nombre_cliente}</span>}
              </div>

              <div className="np-row">
                <label>Teléfono del cliente</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="0981 123 456"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                />
              </div>
            </div>

            {/* Columna Derecha: Ubicación de Entrega y Delivery */}
            <div className="np-section">
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
                {errors.ciudad && <span className="field-error">{errors.ciudad}</span>}
              </div>

              <div className="np-row">
                <label>Dirección <span className="req">*</span></label>
                <input
                  type="text"
                  className={`form-input ${errors.direccion ? 'input-error' : ''}`}
                  placeholder="Calle y Nro de casa"
                  value={form.direccion}
                  onChange={e => {
                    setForm({ ...form, direccion: e.target.value });
                    if (errors.direccion) setErrors({ ...errors, direccion: null });
                  }}
                />
                {errors.direccion && <span className="field-error">{errors.direccion}</span>}
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
                  className="form-input"
                  placeholder="https://maps.google.com/..."
                  value={form.link_maps}
                  onChange={e => setForm({ ...form, link_maps: e.target.value })}
                />
              </div>

              {/* Asignación de Courier y Precio de Delivery Automático */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)' }}>
                <div className="np-row">
                  <label style={{ color: 'var(--color-primary-text)' }}><Truck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Courier Asignado para el Envio</label>
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
                  <label style={{ color: 'var(--color-success)' }}>Costo del Envio (Gs)</label>
                  <CurrencyInput
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontWeight: 'bold', opacity: form.incluye_delivery ? 1 : 0.5 }}
                    value={form.costo_envio}
                    onChange={val => form.incluye_delivery && setForm({ ...form, costo_envio: val })}
                    disabled={!form.incluye_delivery}
                    prefix=""
                  />
                </div>
              </div>

              <div className="np-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.incluye_delivery}
                    onChange={e => {
                      const nuevoIncluye = e.target.checked;
                      setForm(prev => ({
                        ...prev,
                        incluye_delivery: nuevoIncluye,
                        costo_envio: nuevoIncluye ? prev.costo_envio : 0
                      }));
                    }}
                  />
                  <span style={{ color: 'var(--color-primary-text)', fontSize: '0.85rem' }}>Incluye Delivery</span>
                </label>
              </div>

              {/* <div className="np-row">
                <label>Método de pago</label>
                <select
                  className="form-input"
                  value={form.metodo_pago_id}
                  onChange={e => handleMetodoPagoChange(e.target.value)}
                >
                  <option value="">-- Seleccionar método --</option>
                  {metodosPago.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div> */}

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
                <>
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
                      onChange={e => {
                        setForm({ ...form, ruc: e.target.value });
                        if (errors.ruc) setErrors({ ...errors, ruc: null });
                      }}
                    />
                    {errors.ruc && <span className="field-error">{errors.ruc}</span>}
                  </div>
                </>
              )}

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

          </div>

          {/* Sección de Productos Vendidos */}
          <div className="np-section np-full-width">
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
                <span>Costo Delivery: Gs. {(Number(form.costo_envio) || 0).toLocaleString('es-PY')}</span>
              </div>
              <strong className="np-total-amount">
                Total: Gs. {(Number(precioTotalVendido) || 0).toLocaleString('es-PY')}
              </strong>
            </div>
          </div>

          {/* Observaciones */}
          <div className="np-section np-full-width">
            <label className="np-label-obs">Observaciones</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Detalles adicionales para el courier o vendedor..."
              value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>

          {/* Botón de Confirmación verde al pie */}
          <div className="np-footer">
            <button type="submit" className="btn-confirmar-pedido" disabled={guardando}>
              {guardando ? "Guardando..." : "CONFIRMAR PEDIDO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
