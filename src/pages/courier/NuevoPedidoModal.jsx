import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, MapPin, ShoppingBag, User, Truck, AlertCircle } from "lucide-react";
import { productService } from "../../services/productService";
import { getCouriers } from "../../services/courierApi";
import CurrencyInput from "../../components/CurrencyInput";
import CreatableSelect from "react-select/creatable";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: '#1a1a1c',
    borderColor: state.isFocused ? '#2563eb' : 'rgba(255,255,255,0.08)',
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
    border: '1px solid rgba(255,255,255,0.12)',
    zIndex: 999
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected ? '#2563eb' : state.isFocused ? 'rgba(255, 255, 255, 0.08)' : '#141416',
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

export function NuevoPedidoModal({ open, onClose, onSubmit }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [form, setForm] = useState({
    fecha: hoy,
    hora: horaActual,
    confirmador: "",
    nombre_cliente: "",
    apellido_cliente: "",
    telefono: "",
    departamento: "",
    ciudad: "",
    direccion: "",
    referencia: "",
    link_maps: "",
    metodo_pago: "Efectivo",
    observaciones: "",
    courier_id: "",
    costo_envio: 0
  });

  const [items, setItems] = useState([]);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [selectedProdId, setSelectedProdId] = useState("");
  const [cant, setCant] = useState(1);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      cargarDatosIniciales();
      setErrors({});
    }
  }, [open]);

  const cargarDatosIniciales = async () => {
    try {
      const [resProds, dataCouriers] = await Promise.all([
        productService.buscar({}),
        getCouriers()
      ]);
      const prods = Array.isArray(resProds) ? resProds : (resProds.productos || resProds.rows || []);
      setProductosDisponibles(prods);
      setCouriers(dataCouriers || []);
    } catch (err) {
      console.error("Error al cargar datos iniciales:", err);
    }
  };

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

  // Helper para buscar tarifa de un courier específico considerando método de pago y cantidad total de unidades
  const obtenerTarifaPara = (ciudad, courierId, metodoPago, listaItems = items) => {
    if (!ciudad || !courierId || couriers.length === 0) return null;
    const c = couriers.find(curr => curr.id === Number(courierId));
    if (!c || !c.tarifas || !Array.isArray(c.tarifas)) return null;

    const targetTipoPago = (metodoPago === "Pagado" || metodoPago === "Transferencia") ? "Anticipado" : "Al Recibir";
    const totalCantidad = (listaItems || []).reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
    const cantEval = totalCantidad > 0 ? totalCantidad : 1;

    // 1. Buscar coincidencia exacta por ciudad, tipo de pago y rango de cantidad
    let tarifa = c.tarifas.find(t => {
      const ciudadCoincide = t.ciudad_zona.toLowerCase().trim() === ciudad.toLowerCase().trim();
      const pagoCoincide = t.tipo_pago === "Ambos" || t.tipo_pago === targetTipoPago;
      const rMin = Number(t.rango_min) || 0;
      const rMax = (t.rango_max === null || t.rango_max === undefined || t.rango_max === "") ? Infinity : Number(t.rango_max);
      const rangoCoincide = cantEval >= rMin && cantEval <= rMax;
      return ciudadCoincide && pagoCoincide && rangoCoincide;
    });

    // 2. Si no hay coincidencia exacta por rango, fallback a cualquier tarifa de la ciudad y tipo de pago
    if (!tarifa) {
      tarifa = c.tarifas.find(t => {
        const ciudadCoincide = t.ciudad_zona.toLowerCase().trim() === ciudad.toLowerCase().trim();
        const pagoCoincide = t.tipo_pago === "Ambos" || t.tipo_pago === targetTipoPago;
        return ciudadCoincide && pagoCoincide;
      });
    }

    return tarifa ? tarifa.costo : null;
  };

  // Helper para encontrar el primer courier que cubra la ciudad con el método de pago y cantidad especificados
  const buscarCourierYTarifa = (ciudad, metodoPago, listaItems = items) => {
    if (!ciudad || couriers.length === 0) return null;
    const targetTipoPago = (metodoPago === "Pagado" || metodoPago === "Transferencia") ? "Anticipado" : "Al Recibir";
    const totalCantidad = (listaItems || []).reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
    const cantEval = totalCantidad > 0 ? totalCantidad : 1;

    for (const c of couriers) {
      if (c.tarifas && Array.isArray(c.tarifas)) {
        // 1. Coincidencia con rango
        let tarifa = c.tarifas.find(t => {
          const ciudadCoincide = t.ciudad_zona.toLowerCase().trim() === ciudad.toLowerCase().trim();
          const pagoCoincide = t.tipo_pago === "Ambos" || t.tipo_pago === targetTipoPago;
          const rMin = Number(t.rango_min) || 0;
          const rMax = (t.rango_max === null || t.rango_max === undefined || t.rango_max === "") ? Infinity : Number(t.rango_max);
          const rangoCoincide = cantEval >= rMin && cantEval <= rMax;
          return ciudadCoincide && pagoCoincide && rangoCoincide;
        });

        // 2. Fallback sin rango si no hubo match
        if (!tarifa) {
          tarifa = c.tarifas.find(t => {
            const ciudadCoincide = t.ciudad_zona.toLowerCase().trim() === ciudad.toLowerCase().trim();
            const pagoCoincide = t.tipo_pago === "Ambos" || t.tipo_pago === targetTipoPago;
            return ciudadCoincide && pagoCoincide;
          });
        }

        if (tarifa) {
          return { courierId: c.id, costo: tarifa.costo };
        }
      }
    }
    return null;
  };

  // Al cambiar la ciudad, buscar tarifa configurada de delivery
  const handleCiudadChange = (valCiudad) => {
    setForm(prev => {
      const nextForm = { ...prev, ciudad: valCiudad };
      
      if (valCiudad) {
        // Si ya hay un courier seleccionado, intentar buscar su tarifa para la nueva ciudad
        if (prev.courier_id) {
          const costo = obtenerTarifaPara(valCiudad, prev.courier_id, prev.metodo_pago, items);
          if (costo !== null) {
            nextForm.costo_envio = costo;
            return nextForm;
          }
        }

        // Si no hay courier o el seleccionado no cubre la nueva ciudad, buscar el primero que la cubra
        const resultado = buscarCourierYTarifa(valCiudad, prev.metodo_pago, items);
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
        const costo = obtenerTarifaPara(prev.ciudad, courierId, prev.metodo_pago, items);
        if (costo !== null) {
          nextForm.costo_envio = costo;
        }
      }
      return nextForm;
    });
  };

  const handleMetodoPagoChange = (metodoPago) => {
    setForm(prev => {
      const nextForm = { ...prev, metodo_pago: metodoPago };
      if (prev.ciudad && prev.courier_id) {
        const costo = obtenerTarifaPara(prev.ciudad, prev.courier_id, metodoPago, items);
        if (costo !== null) {
          nextForm.costo_envio = costo;
        }
      } else if (prev.ciudad) {
        const resultado = buscarCourierYTarifa(prev.ciudad, metodoPago, items);
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

    const precioUnit = Number(prod.precio_base ?? prod.precio_venta ?? prod.precio ?? 0);
    const nuevoItem = {
      producto_id: prod.id,
      nombre_producto: prod.nombre,
      cantidad: Number(cant),
      precio_unitario: precioUnit,
      subtotal: Number(cant) * precioUnit
    };

    const nuevosItems = [...items, nuevoItem];
    setItems(nuevosItems);
    setSelectedProdId("");
    setCant(1);
    setErrors(prev => ({ ...prev, items: null, producto: null }));

    // Recalcular tarifa de delivery según el nuevo rango de unidades
    if (form.ciudad) {
      if (form.courier_id) {
        const nuevoCosto = obtenerTarifaPara(form.ciudad, form.courier_id, form.metodo_pago, nuevosItems);
        if (nuevoCosto !== null) {
          setForm(prev => ({ ...prev, costo_envio: nuevoCosto }));
        }
      } else {
        const resultado = buscarCourierYTarifa(form.ciudad, form.metodo_pago, nuevosItems);
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
      if (form.courier_id) {
        const nuevoCosto = obtenerTarifaPara(form.ciudad, form.courier_id, form.metodo_pago, nuevosItems);
        if (nuevoCosto !== null) {
          setForm(prev => ({ ...prev, costo_envio: nuevoCosto }));
        }
      } else {
        const resultado = buscarCourierYTarifa(form.ciudad, form.metodo_pago, nuevosItems);
        if (resultado) {
          setForm(prev => ({ ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
        }
      }
    }
  };

  const subtotalProductos = items.reduce((acc, curr) => acc + curr.subtotal, 0);
  const precioTotalVendido = subtotalProductos + (Number(form.costo_envio) || 0);

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
    if (items.length === 0) {
      newErrors.items = "Debes agregar al menos un producto al pedido.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    const payload = {
      ...form,
      courier_id: form.courier_id ? Number(form.courier_id) : null,
      costo_envio: Number(form.costo_envio) || 0,
      monto: precioTotalVendido,
      items
    };

    onSubmit(payload);
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
          <h2>NUEVO PEDIDO</h2>
          <button type="button" onClick={onClose} className="close-btn dark">
            <X size={20} />
          </button>
        </div>

        {/* Banner Global de Errores */}
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
                <input
                  type="date"
                  className="form-input"
                  value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                />
              </div>

              <div className="np-row">
                <label>Hora</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.hora}
                  onChange={e => setForm({ ...form, hora: e.target.value })}
                />
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
                <label>Nombre del cliente <span className="req">*</span></label>
                <input
                  type="text"
                  className={`form-input ${errors.nombre_cliente ? 'input-error' : ''}`}
                  placeholder="Ej. Juan"
                  value={form.nombre_cliente}
                  onChange={e => {
                    setForm({ ...form, nombre_cliente: e.target.value });
                    if (errors.nombre_cliente) setErrors({ ...errors, nombre_cliente: null });
                  }}
                />
                {errors.nombre_cliente && <span className="field-error">{errors.nombre_cliente}</span>}
              </div>

              <div className="np-row">
                <label>Apellido del cliente</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Pérez"
                  value={form.apellido_cliente}
                  onChange={e => setForm({ ...form, apellido_cliente: e.target.value })}
                />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="np-row">
                  <label style={{ color: '#60a5fa' }}><Truck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Courier Asignado</label>
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
                  <label style={{ color: '#10b981' }}>Costo Delivery (Gs)</label>
                  <CurrencyInput
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                    value={form.costo_envio}
                    onChange={val => setForm({ ...form, costo_envio: val })}
                    prefix=""
                  />
                </div>
              </div>

              <div className="np-row">
                <label>Método de pago</label>
                <select
                  className="form-input"
                  value={form.metodo_pago}
                  onChange={e => handleMetodoPagoChange(e.target.value)}
                >
                  <option value="Efectivo">Efectivo contra entrega</option>
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="POS">POS / Tarjeta</option>
                  <option value="Pagado">Ya pagado (Anticipado)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Sección de Productos Vendidos */}
          <div className="np-section np-full-width">
            <h3 className="np-section-title">
              <ShoppingBag size={16} /> Productos Vendidos en el Pedido
            </h3>

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

            {errors.producto && <span className="field-error">{errors.producto}</span>}
            {errors.items && <span className="field-error" style={{ display: 'block', marginTop: '0.5rem' }}>{errors.items}</span>}

            {/* Tabla de items agregados */}
            {items.length > 0 ? (
              <table className="prod-table np-items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ color: '#fff', fontWeight: 600 }}>{it.nombre_producto}</td>
                      <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        Gs. {it.precio_unitario.toLocaleString('es-PY')}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#10b981', fontWeight: 'bold' }}>
                        Gs. {it.subtotal.toLocaleString('es-PY')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="btn-icon danger">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="np-empty-items">
                Sin productos seleccionados aún. Usa el buscador superior para agregar ítems.
              </div>
            )}

            {/* Resumen Total Desglosado */}
            <div className="np-total-row">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', fontSize: '0.85rem', color: '#aaa' }}>
                <span>Subtotal productos: Gs. {subtotalProductos.toLocaleString('es-PY')}</span>
                <span>Costo Delivery: Gs. {(Number(form.costo_envio) || 0).toLocaleString('es-PY')}</span>
              </div>
              <strong className="np-total-amount">
                Total: Gs. {precioTotalVendido.toLocaleString('es-PY')}
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
            <button type="submit" className="btn-confirmar-pedido">
              CONFIRMAR PEDIDO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
