import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, MapPin, ShoppingBag, User, Truck, AlertCircle } from "lucide-react";
import { productService } from "../../services/productService";
import { ofertaService } from "../../services/ofertaService";
import { getCouriers, getMetodosPago } from "../../services/courierApi";
import { obtenerTarifaPara, buscarCourierYTarifa } from "../../lib/tarifaCourier";
import CurrencyInput from "../../components/CurrencyInput";
import CreatableSelect from "react-select/creatable";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: '#1a1a1c',
    borderColor: state.isFocused ? '#2563eb' : 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
    boxShadow: state.isFocused ? '0 0 0 1px #2563eb' : 'none',
    borderRadius: '0.375rem',
    minHeight: '38px',
    color: '#fff',
    '&:hover': {
      borderColor: '#2563eb'
    }
  }),
  menu: (base) => ({
    ...base,
    background: '#141416',
    border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
    zIndex: 999
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected ? '#2563eb' : state.isFocused ? 'color-mix(in srgb, var(--color-fg) 8%, transparent)' : '#141416',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    '&:active': {
      background: '#2563eb'
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: '#fff',
    fontSize: '0.85rem'
  }),
  input: (base) => ({
    ...base,
    color: '#fff',
    fontSize: '0.85rem'
  }),
  placeholder: (base) => ({
    ...base,
    color: '#666',
    fontSize: '0.85rem'
  })
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
      campaign_name: "",
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
    campaign_name: envio.campaign_name || "",
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
export function NuevoPedidoModal({ open, onClose, onSubmit, envio = null }) {
  const modoCompletar = !!envio;

  const [form, setForm] = useState(() => buildFormFromEnvio(null));
  const [items, setItems] = useState([]);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [selectedProdId, setSelectedProdId] = useState("");
  const [ofertasDelProducto, setOfertasDelProducto] = useState([]);
  const [selectedOfertaId, setSelectedOfertaId] = useState("");
  const [cant, setCant] = useState(1);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(buildFormFromEnvio(envio));
      setItems([]);
      setErrors({});
      setSubmitError(null);
      cargarDatosIniciales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, envio]);

  const cargarDatosIniciales = async () => {
    try {
      const [resProds, dataCouriers, dataMetodos] = await Promise.all([
        productService.buscar({}),
        getCouriers(),
        getMetodosPago()
      ]);
      const prods = Array.isArray(resProds) ? resProds : (resProds.productos || resProds.rows || []);
      setProductosDisponibles(prods);
      setCouriers(dataCouriers || []);

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
    if (!form.ciudad || couriers.length === 0 || metodosPago.length === 0) return;
    const esAnticipado = esMetodoAnticipado(form.metodo_pago_id);
    const resultado = buscarCourierYTarifa(couriers, form.ciudad, esAnticipado, itemsParaTarifa);
    if (resultado) {
      setForm(prev => (prev.courier_id ? prev : { ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modoCompletar, couriers, metodosPago, form.ciudad]);

  // Al elegir un producto, cargar sus ofertas activas (individual siempre es
  // la opción base, sin oferta) para el selector de "Presentación".
  useEffect(() => {
    setSelectedOfertaId("");
    if (!selectedProdId) {
      setOfertasDelProducto([]);
      return;
    }
    ofertaService.listarPorProducto(selectedProdId)
      .then(data => setOfertasDelProducto((Array.isArray(data) ? data : []).filter(o => o.activo)))
      .catch(() => setOfertasDelProducto([]));
  }, [selectedProdId]);

  // Opciones de ciudades (únicamente configuradas en los couriers del usuario)
  const optionsCiudades = useMemo(() => {
    const setCiudades = new Set();

    couriers.forEach(c => {
      if (c.tarifas && Array.isArray(c.tarifas)) {
        c.tarifas.forEach(t => {
          if (t.ciudad_zona) setCiudades.add(t.ciudad_zona.trim());
        });
      }
    });

    return Array.from(setCiudades).sort().map(c => ({ value: c, label: c }));
  }, [couriers]);

  // El tipo de pago que espera la tarifa de courier ("Anticipado"/"Al Recibir")
  // se deriva del flag es_anticipado configurado en el ABM de Métodos de Pago.
  const esMetodoAnticipado = (metodoPagoId) => {
    const metodo = metodosPago.find(m => m.id === Number(metodoPagoId));
    return !!(metodo && metodo.es_anticipado);
  };

  // Al cambiar la ciudad, buscar tarifa configurada de delivery
  const handleCiudadChange = (valCiudad) => {
    setForm(prev => {
      const nextForm = { ...prev, ciudad: valCiudad };

      if (valCiudad) {
        const esAnticipado = esMetodoAnticipado(prev.metodo_pago_id);

        // Si ya hay un courier seleccionado, intentar buscar su tarifa para la nueva ciudad
        if (prev.courier_id) {
          const costo = obtenerTarifaPara(couriers, valCiudad, prev.courier_id, esAnticipado, itemsParaTarifa);
          if (costo !== null) {
            nextForm.costo_envio = costo;
            return nextForm;
          }
        }

        // Si no hay courier o el seleccionado no cubre la nueva ciudad, buscar el primero que la cubra
        const resultado = buscarCourierYTarifa(couriers, valCiudad, esAnticipado, itemsParaTarifa);
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
        const costo = obtenerTarifaPara(couriers, prev.ciudad, courierId, esAnticipado, itemsParaTarifa);
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
      if (prev.ciudad && prev.courier_id) {
        const costo = obtenerTarifaPara(couriers, prev.ciudad, prev.courier_id, esAnticipado, itemsParaTarifa);
        if (costo !== null) {
          nextForm.costo_envio = costo;
        }
      } else if (prev.ciudad) {
        const resultado = buscarCourierYTarifa(couriers, prev.ciudad, esAnticipado, itemsParaTarifa);
        if (resultado) {
          nextForm.courier_id = resultado.courierId;
          nextForm.costo_envio = resultado.costo;
        }
      }
      return nextForm;
    });
  };

  const handleAddItem = () => {
    if (!selectedProdId) {
      setErrors(prev => ({ ...prev, producto: "Selecciona un producto para añadir" }));
      return;
    }
    const prod = productosDisponibles.find(p => p.id === Number(selectedProdId));
    if (!prod) return;

    const oferta = selectedOfertaId ? ofertasDelProducto.find(o => o.id === Number(selectedOfertaId)) : null;
    const precioUnit = oferta ? Number(oferta.precio) : Number(prod.precio_base ?? prod.precio_venta ?? prod.precio ?? 0);
    const nuevoItem = {
      producto_id: prod.id,
      oferta_id: oferta ? oferta.id : null,
      oferta_codigo: oferta ? oferta.codigo : null,
      oferta_nombre: oferta ? oferta.nombre : null,
      nombre_producto: oferta ? `${prod.nombre} — ${oferta.nombre}` : prod.nombre,
      cantidad: Number(cant),
      precio_unitario: precioUnit,
      subtotal: Number(cant) * precioUnit
    };

    const nuevosItems = [...items, nuevoItem];
    setItems(nuevosItems);
    setSelectedProdId("");
    setSelectedOfertaId("");
    setCant(1);
    setErrors(prev => ({ ...prev, items: null, producto: null }));

    // Recalcular tarifa de delivery según el nuevo rango de unidades
    if (form.ciudad) {
      const esAnticipado = esMetodoAnticipado(form.metodo_pago_id);
      if (form.courier_id) {
        const nuevoCosto = obtenerTarifaPara(couriers, form.ciudad, form.courier_id, esAnticipado, nuevosItems);
        if (nuevoCosto !== null) {
          setForm(prev => ({ ...prev, costo_envio: nuevoCosto }));
        }
      } else {
        const resultado = buscarCourierYTarifa(couriers, form.ciudad, esAnticipado, nuevosItems);
        if (resultado) {
          setForm(prev => ({ ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
        }
      }
    }
  };

  const handleRemoveItem = (index) => {
    const nuevosItems = items.filter((_, i) => i !== index);
    setItems(nuevosItems);

    // Recalcular tarifa de delivery según el nuevo rango de unidades
    if (form.ciudad) {
      const esAnticipado = esMetodoAnticipado(form.metodo_pago_id);
      if (form.courier_id) {
        const nuevoCosto = obtenerTarifaPara(couriers, form.ciudad, form.courier_id, esAnticipado, nuevosItems);
        if (nuevoCosto !== null) {
          setForm(prev => ({ ...prev, costo_envio: nuevoCosto }));
        }
      } else {
        const resultado = buscarCourierYTarifa(couriers, form.ciudad, esAnticipado, nuevosItems);
        if (resultado) {
          setForm(prev => ({ ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
        }
      }
    }
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

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content np-modal-container"
        onClick={e => e.stopPropagation()}
      >
        {/* Banner Superior */}
        <div className="np-header-banner">
          <h2>{modoCompletar ? `COMPLETAR PEDIDO #${envio.id}` : "NUEVO PEDIDO"}</h2>
          <button type="button" onClick={onClose} className="close-btn dark">
            <X size={20} />
          </button>
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

              <div className="np-row">
                <label>Canal / Origen</label>
                <input
                  type="text"
                  className="form-input"
                  list="canal-origen-sugerencias"
                  placeholder="Ej. Web, WhatsApp, Instagram..."
                  value={form.origen}
                  onChange={e => setForm({ ...form, origen: e.target.value })}
                />
                <datalist id="canal-origen-sugerencias">
                  <option value="Web / Tienda Online" />
                  <option value="WhatsApp" />
                  <option value="Landing Page" />
                  <option value="Meta Ads / Facebook" />
                  <option value="Manual / Directo" />
                </datalist>
              </div>

              <div className="np-row">
                <label>Campaña Publicitaria (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. BlackFriday_Set2026"
                  value={form.campaign_name}
                  onChange={e => setForm({ ...form, campaign_name: e.target.value })}
                />
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
                  onChange={e => setForm({ ...form, departamento: e.target.value })}
                />
              </div>

              <div className="np-row">
                <label>Ciudad <span className="req">*</span></label>
                <CreatableSelect
                  isClearable
                  placeholder="Escribe o selecciona ciudad..."
                  styles={selectStyles}
                  options={optionsCiudades}
                  value={form.ciudad ? { value: form.ciudad, label: form.ciudad } : null}
                  onChange={(newValue) => {
                    const val = newValue ? newValue.value : "";
                    handleCiudadChange(val);
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
                  <label style={{ color: '#60a5fa' }}><Truck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Courier Asignado para el Envio</label>
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
                  <label style={{ color: '#10b981' }}>Costo del Envio (Gs)</label>
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
                  <span style={{ color: '#60a5fa', fontSize: '0.85rem' }}>Incluye Delivery</span>
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
                    style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
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

            {!modoCompletar && (
              <div className="np-add-item-bar">
                <select
                  className="form-input"
                  style={{ flex: 2 }}
                  value={selectedProdId}
                  onChange={e => setSelectedProdId(e.target.value)}
                >
                  <option value="">-- Seleccionar Producto del sistema --</option>
                  {productosDisponibles.map(p => {
                    const pPrecio = Number(p.precio_base ?? p.precio_venta ?? p.precio ?? 0);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Gs. {pPrecio.toLocaleString('es-PY')})
                      </option>
                    );
                  })}
                </select>

                {ofertasDelProducto.length > 0 && (
                  <select
                    className="form-input"
                    style={{ flex: 1 }}
                    value={selectedOfertaId}
                    onChange={e => setSelectedOfertaId(e.target.value)}
                  >
                    <option value="">Individual (Gs. {Number(productosDisponibles.find(p => p.id === Number(selectedProdId))?.precio_base || 0).toLocaleString('es-PY')})</option>
                    {ofertasDelProducto.map(o => (
                      <option key={o.id} value={o.id}>{o.nombre} (Gs. {Number(o.precio).toLocaleString('es-PY')})</option>
                    ))}
                  </select>
                )}

                <input
                  type="number"
                  min="1"
                  className="form-input"
                  style={{ width: '80px' }}
                  value={cant}
                  onChange={e => setCant(e.target.value)}
                />

                <button
                  type="button"
                  className="btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={handleAddItem}
                >
                  <Plus size={16} /> Añadir al pedido
                </button>
              </div>
            )}

            {!modoCompletar && errors.producto && <span className="field-error">{errors.producto}</span>}
            {!modoCompletar && errors.items && <span className="field-error" style={{ display: 'block', marginTop: '0.5rem' }}>{errors.items}</span>}

            {/* Tabla de items agregados */}
            {itemsParaTarifa.length > 0 ? (
              <table className="prod-table np-items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                    {!modoCompletar && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {itemsParaTarifa.map((it, idx) => {
                    const pUnit = Number(it.precio_unitario) || 0;
                    const cant = Number(it.cantidad) || 1;
                    const sub = Number(it.subtotal) || (pUnit * cant);
                    return (
                      <tr key={idx}>
                        <td style={{ color: 'var(--color-fg)', fontWeight: 600 }}>{it.nombre_producto}</td>
                        <td style={{ textAlign: 'center' }}>{cant}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          Gs. {pUnit.toLocaleString('es-PY')}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#10b981', fontWeight: 'bold' }}>
                          Gs. {sub.toLocaleString('es-PY')}
                        </td>
                        {!modoCompletar && (
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" onClick={() => handleRemoveItem(idx)} className="btn-icon danger">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="np-empty-items">
                Sin productos seleccionados aún. Usa el buscador superior para agregar ítems.
              </div>
            )}

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
