import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { X, Printer, Filter, Settings, Type, Calendar } from "lucide-react";
import { STATUS_ORDER, formatGs } from "../../lib/courier";
import "./impresion-pedidos.css";
import { numeroPedidoVisible } from "./pedidoNumero";

export function ImprimirPedidosModal({ open, onClose, envios = [], fechaDesde, onChangeFechaDesde, fechaHasta, onChangeFechaHasta }) {
  // Título principal del encabezado personalizable
  const [tituloEncabezado, setTituloEncabezado] = useState("GESICOM LOGÍSTICA");

  // Estados seleccionados para imprimir por defecto: pendientes de contacto
  // y pedidos listos para preparación/despacho. "En camino" ya no existe en
  // el catálogo operativo actual.
  const [estadosFiltro, setEstadosFiltro] = useState(["Pendiente", "Confirmado", "Preparado"]);
  const [presetTamano, setPresetTamano] = useState("4x6"); // 4x6, 4x4, 80mm, custom
  const [customAncho, setCustomAncho] = useState(100);
  const [customAlto, setCustomAlto] = useState(150);

  // Configuración de Mensaje Personalizado
  const [mensajePersonalizado, setMensajePersonalizado] = useState("");
  const [mensajePosicion, setMensajePosicion] = useState("centro");

  // Configuración de Código QR
  const [qrLink, setQrLink] = useState("");
  const [qrPosicion, setQrPosicion] = useState("arriba");

  // IDs de pedidos individualmente seleccionados
  const [selectedIds, setSelectedIds] = useState([]);

  // Filtrar envíos según estados marcados
  const enviosFiltrados = useMemo(() => {
    return envios.filter(e => estadosFiltro.includes(e.estado));
  }, [envios, estadosFiltro]);

  // Al cambiar los envíos filtrados, por defecto seleccionar todos
  useMemo(() => {
    setSelectedIds(enviosFiltrados.map(e => e.id));
  }, [enviosFiltrados]);

  const toggleEstado = (estado) => {
    setEstadosFiltro(prev => 
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
  };

  const toggleSelectOrder = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === enviosFiltrados.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(enviosFiltrados.map(e => e.id));
    }
  };

  const pedidosAImprimir = useMemo(() => {
    return enviosFiltrados.filter(e => selectedIds.includes(e.id));
  }, [enviosFiltrados, selectedIds]);

  const handlePrint = () => {
    if (pedidosAImprimir.length === 0) {
      alert("Selecciona al menos un pedido para imprimir.");
      return;
    }
    window.print();
  };

  if (!open) return null;

  const getEtiquetaStyle = () => {
    if (presetTamano === "custom") {
      return { width: `${customAncho}mm`, height: `${customAlto}mm` };
    }
    return {};
  };

  const getPagoLabel = (envio) => {
    if (envio.estado === "Entregado" && envio.metodo_pago) return envio.metodo_pago;
    const pagoAnticipado = envio.pago_anticipado === true || envio.pago_anticipado === 1 || String(envio.pago_anticipado).toLowerCase() === "true";
    return pagoAnticipado ? "Pago anticipado" : "Contra entrega";
  };

  // Regla @page dinamica segun preset de medida
  const getPageStyleRule = () => {
    if (presetTamano === "4x6") return `@page { size: 101mm 152mm; margin: 0; }`;
    if (presetTamano === "4x4") return `@page { size: 101mm 101mm; margin: 0; }`;
    if (presetTamano === "80mm") return `@page { size: 80mm auto; margin: 0; }`;
    if (presetTamano === "custom") return `@page { size: ${customAncho}mm ${customAlto}mm; margin: 0; }`;
    return `@page { size: auto; margin: 0; }`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content imprimir-modal-container" onClick={e => e.stopPropagation()}>
        {/* Banner Superior */}
        <div className="np-header-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Printer size={22} />
            <h2>IMPRIMIR NOTAS DE PEDIDO / ETIQUETAS</h2>
          </div>
          <button type="button" onClick={onClose} className="close-btn dark">
            <X size={20} />
          </button>
        </div>

        <div className="imprimir-body">
          {/* Sidebar de Configuración */}
          <div className="imprimir-sidebar">
            {/* Título de la Etiqueta Personalizable */}
            <div className="imprimir-sidebar-section">
              <h4 className="imprimir-sidebar-title">
                <Type size={15} /> Título de la Etiqueta
              </h4>
              <input
                type="text"
                className="form-input"
                style={{ background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)' }}
                value={tituloEncabezado}
                onChange={e => setTituloEncabezado(e.target.value)}
                placeholder="Ej: GESICOM LOGÍSTICA"
              />
            </div>

            {/* Fecha de Pedidos */}
            <div className="imprimir-sidebar-section">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <h4 className="imprimir-sidebar-title" style={{ fontSize: '0.75rem' }}>
                    <Calendar size={13} /> Desde
                  </h4>
                  <input
                    type="date"
                    className="form-input"
                    style={{ background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', fontSize: '0.75rem', padding: '0.4rem' }}
                    value={fechaDesde || ""}
                    onChange={e => onChangeFechaDesde && onChangeFechaDesde(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 className="imprimir-sidebar-title" style={{ fontSize: '0.75rem' }}>
                    <Calendar size={13} /> Hasta
                  </h4>
                  <input
                    type="date"
                    className="form-input"
                    style={{ background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', fontSize: '0.75rem', padding: '0.4rem' }}
                    value={fechaHasta || ""}
                    onChange={e => onChangeFechaHasta && onChangeFechaHasta(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Mensaje Personalizado */}
            <div className="imprimir-sidebar-section">
              <h4 className="imprimir-sidebar-title">
                <Type size={15} /> Mensaje Libre
              </h4>
              <input
                type="text"
                className="form-input"
                style={{ background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', marginBottom: '0.4rem' }}
                value={mensajePersonalizado}
                onChange={e => setMensajePersonalizado(e.target.value)}
                placeholder="Ej: ¡Gracias por su compra!"
              />
              <select
                className="form-input"
                style={{ background: 'var(--color-canvas)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', fontSize: '0.75rem' }}
                value={mensajePosicion}
                onChange={e => setMensajePosicion(e.target.value)}
              >
                <option value="arriba">Arriba (Debajo del encabezado)</option>
                <option value="centro">Centro (Debajo del detalle)</option>
                <option value="abajo">Abajo (Antes de las firmas)</option>
              </select>
            </div>

            {/* Código QR */}
            <div className="imprimir-sidebar-section">
              <h4 className="imprimir-sidebar-title">
                <Settings size={15} /> Código QR
              </h4>
              <input
                type="text"
                className="form-input"
                style={{ background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', marginBottom: '0.4rem' }}
                value={qrLink}
                onChange={e => setQrLink(e.target.value)}
                placeholder="https://tutienda.com/encuesta"
              />
              <select
                className="form-input"
                style={{ background: 'var(--color-canvas)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', fontSize: '0.75rem' }}
                value={qrPosicion}
                onChange={e => setQrPosicion(e.target.value)}
              >
                <option value="arriba">Arriba (Debajo del encabezado)</option>
                <option value="centro">Centro (Debajo del detalle)</option>
                <option value="abajo">Abajo (Antes de las firmas)</option>
              </select>
            </div>

            {/* Filtros por Estado */}
            <div className="imprimir-sidebar-section">
              <h4 className="imprimir-sidebar-title">
                <Filter size={15} /> ¿Qué estados imprimir?
              </h4>
              <div className="imprimir-checkbox-group">
                {STATUS_ORDER.map(est => (
                  <label key={est} className="imprimir-checkbox-item">
                    <input
                      type="checkbox"
                      checked={estadosFiltro.includes(est)}
                      onChange={() => toggleEstado(est)}
                    />
                    <span>{est}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Medidas de la Etiqueta */}
            <div className="imprimir-sidebar-section">
              <h4 className="imprimir-sidebar-title">
                <Settings size={15} /> Medida de Etiqueta
              </h4>
              <select
                className="form-input"
                style={{ background: 'var(--color-canvas)', color: 'var(--color-fg)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)' }}
                value={presetTamano}
                onChange={e => setPresetTamano(e.target.value)}
              >
                <option value="4x6">4" x 6" (100mm x 150mm) - Térmica</option>
                <option value="4x4">4" x 4" (100mm x 100mm)</option>
                <option value="80mm">80mm (Ticket térmico)</option>
                <option value="custom">Personalizado (mm)</option>
              </select>

              {presetTamano === "custom" && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>Ancho (mm)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', color: 'var(--color-fg)' }}
                      value={customAncho}
                      onChange={e => setCustomAncho(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>Alto (mm)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', color: 'var(--color-fg)' }}
                      value={customAlto}
                      onChange={e => setCustomAlto(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Seleccionar Pedidos Específicos */}
            <div className="imprimir-sidebar-section" style={{ flex: 1, minHeight: '150px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className="imprimir-sidebar-title" style={{ fontSize: '0.8rem' }}>
                  Pedidos ({pedidosAImprimir.length}/{enviosFiltrados.length})
                </h4>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-text)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  {selectedIds.length === enviosFiltrados.length ? "Desmarcar todos" : "Marcar todos"}
                </button>
              </div>

              <div className="imprimir-checkbox-group" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {enviosFiltrados.map(e => (
                  <label key={e.id} className="imprimir-checkbox-item" style={{ fontSize: '0.78rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={() => toggleSelectOrder(e.id)}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      #{e.id} - {e.nombre_cliente ? `${e.nombre_cliente} ${e.apellido_cliente || ''}` : e.cliente || 'Cliente'}
                    </span>
                  </label>
                ))}

                {enviosFiltrados.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)', textAlign: 'center', padding: '1rem' }}>
                    No hay pedidos en los estados seleccionados.
                  </div>
                )}
              </div>
            </div>

            {/* Botón Imprimir */}
            <button
              type="button"
              className="btn-confirmar-pedido"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-active))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.8rem',
                marginTop: 'auto'
              }}
              onClick={handlePrint}
            >
              <Printer size={18} /> IMPRIMIR ({pedidosAImprimir.length})
            </button>
          </div>

          {/* Área de Vista Previa */}
          <div className="imprimir-preview-area">
            {pedidosAImprimir.map(envio => (
              <EtiquetaPedidoItem
                key={envio.id}
                envio={envio}
                tituloHeader={tituloEncabezado}
                presetClass={`preset-${presetTamano}`}
                customStyle={getEtiquetaStyle()}
                mensaje={{ texto: mensajePersonalizado, posicion: mensajePosicion }}
                qr={{ link: qrLink, posicion: qrPosicion }}
              />
            ))}

            {pedidosAImprimir.length === 0 && (
              <div style={{ color: 'var(--color-fg-muted)', marginTop: '5rem', textAlign: 'center' }}>
                Selecciona al menos un pedido del panel izquierdo para visualizar la nota de pedido.
              </div>
            )}
          </div>
        </div>

        {/* Contenedor Exclusivo para @media print portaleado al document.body para evitar que los contenedores modal rompan los saltos de página */}
        {createPortal(
          <div className="impresion-print-container">
            <style>{getPageStyleRule()}</style>
            {pedidosAImprimir.map(envio => (
              <EtiquetaPedidoItem
                key={envio.id}
                envio={envio}
                tituloHeader={tituloEncabezado}
                presetClass={`preset-${presetTamano}`}
                customStyle={getEtiquetaStyle()}
                mensaje={{ texto: mensajePersonalizado, posicion: mensajePosicion }}
                qr={{ link: qrLink, posicion: qrPosicion }}
              />
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

/* Componente de la Etiqueta Individual */
function EtiquetaPedidoItem({ envio, tituloHeader, presetClass, customStyle, mensaje, qr }) {
  const nombreCliente = envio.nombre_cliente
    ? `${envio.nombre_cliente} ${envio.apellido_cliente || ''}`.trim()
    : envio.cliente || "Cliente";

  const ubicacion = [envio.direccion, envio.referencia].filter(Boolean).join(" - ");

  const blockMensaje = mensaje?.texto ? (
    <div style={{ textAlign: 'center', fontSize: '9pt', fontWeight: 'bold', margin: '4px 0', padding: '3px', border: '1px dashed #000' }}>
      {mensaje.texto}
    </div>
  ) : null;

  const blockQR = qr?.link ? (
    <div style={{ textAlign: 'center', margin: '4px 0', display: 'flex', justifyContent: 'center' }}>
      <QRCodeSVG value={qr.link} size={64} level="M" />
    </div>
  ) : null;

  return (
    <div className={`etiqueta-pedido ${presetClass}`} style={customStyle}>
      {/* Encabezado de la Etiqueta */}
      <div>
        {/* Encabezado de la Etiqueta */}
        <div className="etiqueta-header">
          <h3 className="etiqueta-header-title">{tituloHeader || "LOGÍSTICA"}</h3>
          <span className="etiqueta-header-date">#{numeroPedidoVisible(envio)} · {envio.fecha || envio.dispatchedAt}</span>
        </div>

        {mensaje?.posicion === 'arriba' && blockMensaje}
        {qr?.posicion === 'arriba' && blockQR}

        {/* Datos del Cliente */}
        <div className="etiqueta-row">
          <strong>CLIENTE:</strong> {nombreCliente}
        </div>
        {envio.telefono && (
          <div className="etiqueta-row">
            <strong>TELÉFONO:</strong> {envio.telefono}
          </div>
        )}
        <div className="etiqueta-row">
          <strong>CIUDAD:</strong> {[envio.ciudad, envio.departamento].filter(Boolean).join(", ") || 'No especificada'}
        </div>

        {/* Ubicación */}
        <div className="etiqueta-box">
          <div className="etiqueta-box-title">UBICACIÓN Y ENTREGA</div>
          <div style={{ fontSize: '8.5pt', lineHeight: 1.3, color: '#000' }}>
            {ubicacion || 'Sin dirección especificada'}
          </div>
        </div>

        {/* Detalle del Pedido */}
        <div className="etiqueta-box">
          <div className="etiqueta-box-title">DETALLE DEL PEDIDO</div>
          {envio.items && envio.items.length > 0 ? (
            <ul className="etiqueta-items-list">
              {envio.items.map((it, idx) => (
                <li key={idx}>
                  <span>• {it.cantidad}x {it.nombre_producto}</span>
                  <span style={{ fontWeight: 'bold' }}>Gs. {(it.subtotal || 0).toLocaleString('es-PY')}</span>
                </li>
              ))}
              {Number(envio.costo_envio) > 0 && (
                <li style={{ borderTop: '1px dashed #000', marginTop: '3px', paddingTop: '3px' }}>
                  <span>• Delivery / Envío</span>
                  <span style={{ fontWeight: 'bold' }}>{formatGs(envio.costo_envio)}</span>
                </li>
              )}
            </ul>
          ) : (
            <div style={{ fontSize: '8pt', color: '#000', display: 'flex', justifyContent: 'space-between' }}>
              <span>Envío / Pedido estándar</span>
              {Number(envio.costo_envio) > 0 && (
                <span><strong>Delivery:</strong> {formatGs(envio.costo_envio)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {mensaje?.posicion === 'centro' && blockMensaje}
      {qr?.posicion === 'centro' && blockQR}

      {/* Sección Inferior: Monto, condición/método de pago, Obs y Firmas */}
      <div>
        <div className="etiqueta-row" style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><strong>PAGO:</strong> {getPagoLabel(envio)}</div>
          <div><strong>DELIVERY:</strong> {formatGs(envio.costo_envio || 0)}</div>
        </div>

        <div className="etiqueta-monto-box">
          <div className="etiqueta-monto-title">MONTO A COBRAR</div>
          <div className="etiqueta-monto-value">{formatGs(envio.monto)}</div>
        </div>

        {envio.observaciones && (
          <div className="etiqueta-row" style={{ fontSize: '8pt', fontStyle: 'italic', margin: '4px 0' }}>
            <strong>Obs:</strong> {envio.observaciones}
          </div>
        )}

        {mensaje?.posicion === 'abajo' && blockMensaje}
        {qr?.posicion === 'abajo' && blockQR}

        {/* Sección de Firmas (Courier y Cliente) */}
        <div className="etiqueta-firmas">
          <div className="etiqueta-firma-col">
            <div className="etiqueta-firma-linea"></div>
            <span className="etiqueta-firma-label">Firma del Courier</span>
          </div>
          <div className="etiqueta-firma-col">
            <div className="etiqueta-firma-linea"></div>
            <span className="etiqueta-firma-label">Firma del Cliente</span>
            <span style={{ fontSize: '6.5pt', color: 'var(--color-fg-subtle)' }}>(Aclaración / C.I.)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
