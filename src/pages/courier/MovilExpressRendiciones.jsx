import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Download, FileText, Loader, RefreshCw, X } from 'lucide-react';
import { movilExpressService } from '../../services/movilExpressService';
import './movil-express-rendiciones.css';

const money = (valor, moneda = 'PYG') => new Intl.NumberFormat('es-PY', {
  style: 'currency', currency: moneda || 'PYG', maximumFractionDigits: 0,
}).format(Number(valor) || 0);

const fecha = valor => (valor ? new Date(valor).toLocaleDateString('es-PY', { dateStyle: 'short' }) : null);

/** Los estados del ciclo, en castellano. El proveedor manda el suyo en inglés. */
const ESTADOS = {
  in_preparation: 'En revisión de Móvil Express',
  pending_merchant_review: 'Esperando que la valides',
  rejected_by_merchant: 'La rechazaste · la están revisando',
  pending_transfer: 'Móvil Express va a transferir',
  transfer_sent: 'Transferencia enviada · confirmá si la recibiste',
  transfer_not_received: 'Informaste que no llegó · la están revisando',
  pending_payment: 'Tenés que pagar',
  payment_rejected: 'Rechazaron el comprobante · informá el pago de nuevo',
  payment_under_review: 'Pago informado · lo están verificando',
  pending_closure: 'Sin saldo · la van a cerrar',
  closed: 'Cerrada',
  consolidated: 'Incluida en otra rendición',
};

/** Qué dice cada botón. El nombre técnico no se le muestra a nadie. */
const ACCIONES = {
  validate: { texto: 'Validar', principal: true },
  reject: { texto: 'Rechazar', motivo: 'Contanos qué no cuadra' },
  report_payment: { texto: 'Informar el pago', principal: true, comprobantes: true },
  confirm_received: { texto: 'Sí, la recibí', principal: true },
  report_not_received: { texto: 'No la recibí', motivo: 'Contanos qué pasó' },
};

const SENTIDO = {
  movil_express_pays_merchant: 'Te pagan',
  merchant_pays_movil_express: 'Tenés que pagar',
  none: 'Sin saldo',
};

const TIPOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const aBase64 = archivo => new Promise((resolver, rechazar) => {
  const lector = new FileReader();
  lector.onerror = () => rechazar(new Error(`No pudimos leer ${archivo.name}.`));
  lector.onload = () => resolver(String(lector.result).split(',')[1] || '');
  lector.readAsDataURL(archivo);
});

/**
 * Rendiciones de Móvil Express dentro de la pestaña Rendición.
 *
 * Es otra fuente, no una extensión de la liquidación con un courier propio:
 * acá Gesicom no calcula ni decide nada. Móvil Express arma la rendición, la
 * valida y la cierra; esta pantalla muestra lo que informa y le manda la
 * decisión del comerciante.
 *
 * Los botones salen SOLO de `allowed_actions` del último detalle. Nunca de
 * `valid_actions`, que dice qué le toca al comerciante pero no si se puede
 * ejecutar: dibujar un botón desde ahí es garantizar un error del proveedor.
 */
export function MovilExpressRendiciones() {
  const [estado, setEstado] = useState('cargando');
  const [lista, setLista] = useState([]);
  const [abierta, setAbierta] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [trabajando, setTrabajando] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [motivo, setMotivo] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [pidiendo, setPidiendo] = useState(null);

  // Si la primera consulta nunca salió bien, la sección no se muestra: el
  // comercio que no trabaja con Móvil Express no tiene por qué ver un error
  // de algo que no usa. Una vez visible, un fallo posterior sí se avisa.
  const yaCargo = useRef(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const datos = await movilExpressService.rendiciones();
      yaCargo.current = true;
      setLista(datos?.rendiciones || []);
      setEstado('listo');
    } catch (problema) {
      if (!yaCargo.current) { setEstado('sin-conexion'); return; }
      setError(problema?.response?.data?.message || 'No pudimos consultar las rendiciones de Móvil Express.');
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrir = useCallback(async id => {
    setAbierta(id);
    setDetalle(null);
    setError('');
    setAviso('');
    setPidiendo(null);
    try {
      const datos = await movilExpressService.rendicion(id);
      setDetalle(datos?.rendicion || null);
    } catch (problema) {
      setError(problema?.response?.data?.message || 'No pudimos abrir esa rendición.');
    }
  }, []);

  const decidir = useCallback(async (accion, extra = {}) => {
    if (!detalle) return;
    setTrabajando(accion);
    setError('');
    setAviso('');
    // Una clave por decisión de la persona: si hay que reintentar por un
    // problema de red, se manda la misma y no se aplica dos veces.
    const clave = `${detalle.rendition_id}-${accion}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const resultado = await movilExpressService.decidirRendicion(detalle.rendition_id, {
        action: accion,
        expected_status: detalle.status,
        expected_version: detalle.version || undefined,
        expected_net: Number.isFinite(Number(detalle.net)) ? Number(detalle.net) : undefined,
        ...extra,
      }, clave);
      if (resultado?.rendicion) setDetalle(resultado.rendicion);
      setAviso(resultado?.repetida ? 'Esa decisión ya estaba registrada.' : 'Listo, se lo mandamos a Móvil Express.');
      setMotivo('');
      setArchivos([]);
      setPidiendo(null);
      await cargar();
    } catch (problema) {
      const cuerpo = problema?.response?.data;
      // Si cambió del otro lado, el error trae el estado vigente: se repinta
      // con eso en vez de dejar botones que ya no corresponden.
      if (cuerpo?.detalles?.rendicion) setDetalle(cuerpo.detalles.rendicion);
      setError(cuerpo?.message || 'No pudimos registrar la decisión.');
    } finally {
      setTrabajando('');
    }
  }, [detalle, cargar]);

  const confirmar = useCallback(async () => {
    const accion = pidiendo;
    if (!accion) return;
    const config = ACCIONES[accion];
    if (config.motivo && motivo.trim().length < 3) { setError('Escribí el motivo: Móvil Express lo necesita para revisarlo.'); return; }
    if (config.comprobantes && !archivos.length) { setError('Adjuntá el comprobante del pago.'); return; }
    try {
      const comprobantes = await Promise.all(archivos.map(async archivo => ({
        filename: archivo.name.slice(0, 200),
        content_type: archivo.type,
        content_base64: await aBase64(archivo),
      })));
      await decidir(accion, {
        ...(config.motivo ? { reason: motivo.trim() } : {}),
        ...(config.comprobantes ? { payment_receipts: comprobantes } : {}),
      });
    } catch (problema) {
      setError(problema.message);
    }
  }, [pidiendo, motivo, archivos, decidir]);

  const elegirArchivos = evento => {
    const elegidos = Array.from(evento.target.files || []).slice(0, 3);
    const invalido = elegidos.find(a => !TIPOS.includes(a.type));
    if (invalido) { setError(`"${invalido.name}" no es PDF, JPG, PNG ni WEBP.`); return; }
    const pesado = elegidos.find(a => a.size > 5 * 1024 * 1024);
    if (pesado) { setError(`"${pesado.name}" pasa los 5 MB.`); return; }
    setError('');
    setArchivos(elegidos);
  };

  const bloqueos = useMemo(() => (detalle?.blocked_actions || []), [detalle]);

  if (estado === 'cargando' || estado === 'sin-conexion') return null;

  return (
    <section className="mexr" aria-label="Rendiciones de Móvil Express">
      <header className="mexr-encabezado">
        <div>
          <h3>Rendiciones de Móvil Express</h3>
          <p>Las arma, las valida y las cierra Móvil Express. Acá las revisás y respondés.</p>
        </div>
        <button type="button" className="mexr-icono" aria-label="Actualizar rendiciones" onClick={cargar}>
          <RefreshCw size={16} />
        </button>
      </header>

      {error && <p className="mexr-alerta mexr-error" role="alert"><AlertCircle size={16} />{error}</p>}
      {aviso && <p className="mexr-alerta mexr-ok" role="status"><Check size={16} />{aviso}</p>}

      {!lista.length ? (
        <p className="mexr-vacio">Todavía no hay rendiciones. Aparecen cuando Móvil Express cierra un período.</p>
      ) : (
        <ul className="mexr-lista">
          {lista.map(fila => (
            <li key={fila.rendition_id}>
              <button
                type="button"
                className="mexr-fila"
                aria-expanded={abierta === fila.rendition_id}
                onClick={() => (abierta === fila.rendition_id ? setAbierta(null) : abrir(fila.rendition_id))}
              >
                <span className="mexr-fila-id">{fila.reference || `#${fila.rendition_id}`}</span>
                <span className="mexr-fila-periodo">
                  {fila.period?.from ? `${fecha(fila.period.from)} al ${fecha(fila.period.to)}` : 'Sin período'}
                </span>
                <span className="mexr-fila-estado">{ESTADOS[fila.status] || fila.status}</span>
                <span className="mexr-fila-monto">
                  <em>{SENTIDO[fila.direction] || ''}</em>
                  <strong>{money(fila.net, fila.currency)}</strong>
                </span>
              </button>

              {abierta === fila.rendition_id && (
                <div className="mexr-detalle">
                  {!detalle ? (
                    <p className="mexr-cargando" role="status"><Loader size={15} className="mexr-girar" /> Abriendo…</p>
                  ) : (
                    <>
                      <dl className="mexr-montos">
                        <div><dt>Cobrado</dt><dd>{money(detalle.amounts?.total_collected, detalle.currency)}</dd></div>
                        <div><dt>Costo del servicio</dt><dd>{money(detalle.amounts?.service_cost, detalle.currency)}</dd></div>
                        {Number(detalle.amounts?.adjustments_net) !== 0 && (
                          <div><dt>Ajustes</dt><dd>{money(detalle.amounts?.adjustments_net, detalle.currency)}</dd></div>
                        )}
                        <div className="mexr-neto"><dt>Neto</dt><dd>{money(detalle.net, detalle.currency)}</dd></div>
                      </dl>

                      <div className="mexr-documentos">
                        {detalle.documentos?.estado_de_cuenta && (
                          <button type="button" className="mexr-boton" onClick={() => movilExpressService.estadoDeCuenta(detalle.rendition_id).catch(p => setError(p?.response?.data?.message || 'No pudimos bajar el PDF.'))}>
                            <FileText size={15} /> Estado de cuenta (PDF)
                          </button>
                        )}
                        {(detalle.documentos?.comprobantes || []).map(recibo => (
                          <button
                            key={recibo.receipt_id}
                            type="button"
                            className="mexr-boton"
                            onClick={() => movilExpressService.comprobante(detalle.rendition_id, recibo.receipt_id, recibo.name).catch(p => setError(p?.response?.data?.message || 'No pudimos bajar el comprobante.'))}
                          >
                            <Download size={15} /> {recibo.name || recibo.receipt_id}
                          </button>
                        ))}
                      </div>

                      {detalle.rejection_reason && (
                        <p className="mexr-motivo"><strong>Motivo:</strong> {detalle.rejection_reason}</p>
                      )}
                      {detalle.blocked_by && (
                        <p className="mexr-ayuda">Primero hay que resolver la rendición {detalle.blocked_by.rendition_id}.</p>
                      )}

                      {/* Solo `allowed_actions` dibuja botones. */}
                      {detalle.allowed_actions?.length > 0 && !pidiendo && (
                        <div className="mexr-acciones">
                          {detalle.allowed_actions.map(accion => {
                            const config = ACCIONES[accion];
                            if (!config) return null;
                            return (
                              <button
                                key={accion}
                                type="button"
                                className={config.principal ? 'mexr-boton mexr-primario' : 'mexr-boton'}
                                disabled={Boolean(trabajando)}
                                onClick={() => (config.motivo || config.comprobantes ? (setPidiendo(accion), setError('')) : decidir(accion))}
                              >
                                {trabajando === accion ? <Loader size={15} className="mexr-girar" /> : null}
                                {config.texto}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {pidiendo && (
                        <div className="mexr-formulario">
                          {ACCIONES[pidiendo].motivo && (
                            <label>
                              <span className="mexr-etiqueta">{ACCIONES[pidiendo].motivo}</span>
                              <textarea rows={3} value={motivo} maxLength={500} onChange={e => setMotivo(e.target.value)} />
                            </label>
                          )}
                          {ACCIONES[pidiendo].comprobantes && (
                            <label>
                              <span className="mexr-etiqueta">Comprobante del pago (hasta 3, PDF o imagen)</span>
                              <input type="file" multiple accept=".pdf,image/jpeg,image/png,image/webp" onChange={elegirArchivos} />
                              {archivos.length > 0 && <small className="mexr-ayuda">{archivos.map(a => a.name).join(', ')}</small>}
                            </label>
                          )}
                          <div className="mexr-acciones">
                            <button type="button" className="mexr-boton mexr-primario" disabled={Boolean(trabajando)} onClick={confirmar}>
                              {trabajando ? <Loader size={15} className="mexr-girar" /> : <Check size={15} />}
                              {ACCIONES[pidiendo].texto}
                            </button>
                            <button type="button" className="mexr-boton" disabled={Boolean(trabajando)} onClick={() => { setPidiendo(null); setMotivo(''); setArchivos([]); setError(''); }}>
                              <X size={15} /> Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sin botones ejecutables, se dice por qué, con el
                          texto que manda Móvil Express. */}
                      {!detalle.allowed_actions?.length && bloqueos.length > 0 && (
                        <p className="mexr-ayuda" role="status">{bloqueos[0].message}</p>
                      )}
                      {!detalle.allowed_actions?.length && !bloqueos.length && (
                        <p className="mexr-ayuda">Ahora le toca a Móvil Express. No hay nada para hacer de tu lado.</p>
                      )}

                      {detalle.history?.length > 0 && (
                        <ol className="mexr-historial">
                          {detalle.history.map((paso, indice) => (
                            <li key={`${paso.at}-${indice}`}>
                              <span>{fecha(paso.at)}</span>
                              {paso.event}{paso.reason ? ` · ${paso.reason}` : ''}
                            </li>
                          ))}
                        </ol>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MovilExpressRendiciones;
