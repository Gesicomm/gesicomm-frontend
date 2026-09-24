import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Package, Warehouse, ArrowLeft, Truck, CheckCircle2, AlertTriangle,
  ClipboardCheck, PackageCheck, Clock, RefreshCw,
} from 'lucide-react';
import { inventarioService } from '../../services/inventario.service';
import useSesion from '../../hooks/useSesion';

const ESTADO_BADGE = {
  BORRADOR: 'bg-surface text-fg border-surface-border',
  PENDIENTE_ENVIO: 'bg-warning/10 text-warning-text border-warning/20',
  EN_TRANSITO: 'bg-primary/10 text-primary-text border-primary/20',
  RECIBIDO: 'bg-info/10 text-info-text border-info/20',
  EN_VALIDACION: 'bg-warning/10 text-warning-text border-warning/20',
  CON_DIFERENCIAS: 'bg-danger/10 text-danger-text border-danger/20',
  DISPONIBLE: 'bg-success/10 text-success-text border-success/20',
};

function EstadoBadge({ estado }) {
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${ESTADO_BADGE[estado] || ESTADO_BADGE.BORRADOR}`}>
      {(estado || '').replace(/_/g, ' ')}
    </span>
  );
}

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function nombresProductos(items) {
  const nombres = [...new Set((items || []).map((it) => it.Producto?.nombre).filter(Boolean))];
  if (nombres.length === 0) return '—';
  if (nombres.length === 1) return nombres[0];
  return `${nombres[0]} y ${nombres.length - 1} más`;
}

/**
 * Detalle de un ingreso de inventario (inbound). Se usa tanto desde
 * /inventario/:id (comercio) como desde /fulfillment/ingresos/:id (admin):
 * las acciones disponibles cambian segun el rol y el estado, nunca la
 * pantalla en si.
 */
export default function IngresoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'administrador';

  const [ingreso, setIngreso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [conteos, setConteos] = useState({});

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await inventarioService.obtenerIngreso(id);
      setIngreso(data);
      const conteosIniciales = {};
      (data.items || []).forEach((it) => {
        conteosIniciales[it.id] = it.cantidad_recibida ?? it.cantidad_declarada;
      });
      setConteos(conteosIniciales);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cargar el ingreso.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const volverA = esAdmin ? '/fulfillment/ingresos' : '/inventario';

  const ejecutar = async (accion, mensajeOk) => {
    setProcesando(true);
    try {
      await accion();
      toast.success(mensajeOk);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la accion.');
    } finally {
      setProcesando(false);
    }
  };

  const handleMarcarEnTransito = () => {
    ejecutar(() => inventarioService.marcarEnTransito(id, {}), 'Ingreso marcado como enviado.');
  };

  const handleRegistrarRecepcion = () => {
    ejecutar(() => inventarioService.registrarRecepcion(id), 'Recepcion registrada.');
  };

  const handleGuardarConteo = () => {
    const conteosPayload = (ingreso.items || []).map((it) => ({
      item_id: it.id,
      cantidad_recibida: Number(conteos[it.id]) || 0,
      cantidad_aceptada: Number(conteos[it.id]) || 0,
    }));
    ejecutar(() => inventarioService.resolverDiferencias(id, conteosPayload), 'Conteo guardado.');
  };

  const handleHabilitarStock = () => {
    ejecutar(() => inventarioService.habilitarStock(id), 'Stock habilitado y sumado al inventario.');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-fg-muted">
        <RefreshCw className="animate-spin mr-2" size={20} /> Cargando ingreso...
      </div>
    );
  }

  if (!ingreso) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-fg-muted gap-3">
        <p>No se encontro el ingreso.</p>
        <Link to={volverA} className="text-primary font-medium hover:underline">Volver</Link>
      </div>
    );
  }

  const totalUnidades = (ingreso.items || []).reduce((acc, it) => acc + (it.cantidad_declarada || 0), 0);
  const totalRecibido = (ingreso.items || []).reduce((acc, it) => acc + (it.cantidad_recibida ?? 0), 0);
  const totalAceptado = (ingreso.items || []).reduce((acc, it) => acc + (it.cantidad_aceptada ?? 0), 0);
  const hayRecepcion = ingreso.estado !== 'BORRADOR' && ingreso.estado !== 'PENDIENTE_ENVIO' && ingreso.estado !== 'EN_TRANSITO';
  const hayAceptacion = ['EN_VALIDACION', 'CON_DIFERENCIAS', 'DISPONIBLE'].includes(ingreso.estado);
  const diferencia = totalUnidades - (hayAceptacion ? totalAceptado : totalRecibido);
  const hayDiferenciaSinResolver = (ingreso.items || []).some(
    (it) => it.cantidad_recibida != null && it.cantidad_aceptada == null
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border">
        <button
          onClick={() => navigate(volverA)}
          className="flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg mb-3"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-fg mb-1">
              ING-{String(ingreso.id).padStart(4, '0')} · {nombresProductos(ingreso.items)}
            </h1>
            <p className="text-sm text-fg-muted flex items-center gap-2">
              <Warehouse size={14} /> {ingreso.centro?.nombre} · {ingreso.centro?.ciudad}
              {esAdmin && ingreso.Usuario && (
                <span className="ml-2 text-fg-subtle">· Comercio: {ingreso.Usuario.nombre}</span>
              )}
            </p>
          </div>
          <EstadoBadge estado={ingreso.estado} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Lo primero que se responde: cuanto se mando, cuanto llego, cuanto se acepto. */}
        <div className="bg-surface border border-surface-border rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Enviado</p>
            <p className="text-lg font-bold text-fg">{totalUnidades} u.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Recibido</p>
            <p className="text-lg font-bold text-fg">{hayRecepcion ? `${totalRecibido} u.` : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Aceptado</p>
            <p className="text-lg font-bold text-fg">{hayAceptacion ? `${totalAceptado} u.` : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Diferencia</p>
            <p className={`text-lg font-bold ${hayRecepcion && diferencia !== 0 ? 'text-danger-text' : 'text-fg'}`}>
              {hayRecepcion ? diferencia : '—'}
            </p>
          </div>
        </div>

        {(ingreso.centro?.persona_contacto || ingreso.centro?.telefono_contacto || ingreso.centro?.direccion || (esAdmin && ingreso.Usuario?.correo_electronico)) && (
          <div className="bg-surface border border-surface-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {esAdmin && ingreso.Usuario && (
              <div>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Comercio</p>
                <p className="text-sm text-fg">{ingreso.Usuario.nombre}</p>
                {ingreso.Usuario.correo_electronico && <p className="text-xs text-fg-muted">{ingreso.Usuario.correo_electronico}</p>}
              </div>
            )}
            {(ingreso.centro?.persona_contacto || ingreso.centro?.telefono_contacto || ingreso.centro?.direccion) && (
              <div>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Contacto en {ingreso.centro?.nombre}</p>
                {ingreso.centro?.persona_contacto && <p className="text-sm text-fg">{ingreso.centro.persona_contacto}</p>}
                {ingreso.centro?.telefono_contacto && (
                  <a href={`tel:${ingreso.centro.telefono_contacto.replace(/\D/g, '')}`} className="text-xs text-primary hover:underline block">{ingreso.centro.telefono_contacto}</a>
                )}
                {ingreso.centro?.direccion && <p className="text-xs text-fg-muted">{ingreso.centro.direccion}</p>}
              </div>
            )}
          </div>
        )}

        <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface-2">
            <h2 className="text-sm font-semibold text-fg flex items-center gap-2"><Package size={15} /> Mercaderia</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="px-4 py-2 text-xs font-semibold text-fg-muted uppercase">Producto</th>
                <th className="px-4 py-2 text-xs font-semibold text-fg-muted uppercase text-right">Enviado</th>
                {['RECIBIDO', 'EN_VALIDACION', 'CON_DIFERENCIAS', 'DISPONIBLE'].includes(ingreso.estado) && (
                  <th className="px-4 py-2 text-xs font-semibold text-fg-muted uppercase text-right">
                    {esAdmin && ['RECIBIDO', 'EN_VALIDACION', 'CON_DIFERENCIAS'].includes(ingreso.estado) ? 'Recibido (editable)' : 'Recibido'}
                  </th>
                )}
                {ingreso.estado === 'DISPONIBLE' && (
                  <th className="px-4 py-2 text-xs font-semibold text-fg-muted uppercase text-right">Aceptado</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {(ingreso.items || []).map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-fg">{it.Producto?.nombre}</p>
                    {it.ProductoVariante && <p className="text-xs text-fg-muted">{it.ProductoVariante.nombre}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-fg">{it.cantidad_declarada}</td>
                  {['RECIBIDO', 'EN_VALIDACION', 'CON_DIFERENCIAS', 'DISPONIBLE'].includes(ingreso.estado) && (
                    <td className="px-4 py-3 text-right">
                      {esAdmin && ['RECIBIDO', 'EN_VALIDACION', 'CON_DIFERENCIAS'].includes(ingreso.estado) ? (
                        <input
                          type="number"
                          min="0"
                          className="w-24 px-2 py-1 text-sm text-right border border-surface-border rounded bg-surface"
                          value={conteos[it.id] ?? ''}
                          onChange={(e) => setConteos((c) => ({ ...c, [it.id]: e.target.value }))}
                        />
                      ) : (
                        <span className={`text-sm font-medium ${it.cantidad_recibida !== it.cantidad_declarada ? 'text-danger-text' : 'text-fg'}`}>
                          {it.cantidad_recibida ?? '—'}
                        </span>
                      )}
                    </td>
                  )}
                  {ingreso.estado === 'DISPONIBLE' && (
                    <td className="px-4 py-3 text-right text-sm text-fg">{it.cantidad_aceptada ?? '—'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-surface border border-surface-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-fg mb-3">Proximo paso</h2>

          {!esAdmin && ingreso.estado === 'PENDIENTE_ENVIO' && (
            <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-lg p-4">
              <Truck size={20} className="text-warning-text mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-fg mb-3">Cuando despaches fisicamente esta mercaderia hacia el centro de Gesicomm, marcalo como enviado.</p>
                <button
                  onClick={handleMarcarEnTransito}
                  disabled={procesando}
                  className="btn-primary"
                >
                  {procesando ? 'Procesando...' : 'Marcar como enviado'}
                </button>
              </div>
            </div>
          )}
          {!esAdmin && ingreso.estado === 'EN_TRANSITO' && (
            <div className="flex items-start gap-3 bg-info/5 border border-info/20 rounded-lg p-4">
              <Clock size={20} className="text-info-text mt-0.5 shrink-0" />
              <p className="text-sm text-fg">En transito. Esperando que Gesicomm registre la recepcion fisica.</p>
            </div>
          )}

          {esAdmin && ['PENDIENTE_ENVIO', 'EN_TRANSITO'].includes(ingreso.estado) && (
            <div className="flex items-start gap-3 bg-info/5 border border-info/20 rounded-lg p-4">
              <ClipboardCheck size={20} className="text-info-text mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-fg mb-3">Registra que la mercaderia llego fisicamente al centro.</p>
                <button
                  onClick={handleRegistrarRecepcion}
                  disabled={procesando}
                  className="btn-primary"
                >
                  {procesando ? 'Procesando...' : 'Registrar recepcion'}
                </button>
              </div>
            </div>
          )}

          {esAdmin && ['RECIBIDO', 'EN_VALIDACION', 'CON_DIFERENCIAS'].includes(ingreso.estado) && (
            <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-lg p-4 mb-3">
              <AlertTriangle size={20} className="text-warning-text mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-fg mb-3">Conta las unidades recibidas por producto (arriba) y guarda el conteo. Si coincide con lo declarado, queda listo para habilitar.</p>
                <button
                  onClick={handleGuardarConteo}
                  disabled={procesando}
                  className="btn-primary"
                >
                  {procesando ? 'Guardando...' : 'Guardar conteo'}
                </button>
              </div>
            </div>
          )}

          {esAdmin && ingreso.estado === 'CON_DIFERENCIAS' && (
            <div className="flex items-start gap-3 bg-danger/5 border border-danger/20 rounded-lg p-4 mb-3">
              <AlertTriangle size={20} className="text-danger-text mt-0.5 shrink-0" />
              <p className="text-sm text-fg">Hay diferencias entre lo declarado y lo recibido. Podes habilitar igual con las cantidades aceptadas (arriba) o volver a contar.</p>
            </div>
          )}

          {esAdmin && ['EN_VALIDACION', 'CON_DIFERENCIAS'].includes(ingreso.estado) && !hayDiferenciaSinResolver && (
            <div className="flex items-start gap-3 bg-success/5 border border-success/20 rounded-lg p-4">
              <PackageCheck size={20} className="text-success-text mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-fg mb-3">Conteo listo. Al habilitar, estas cantidades se suman al stock disponible del comercio en este centro.</p>
                <button
                  onClick={handleHabilitarStock}
                  disabled={procesando}
                  className="btn-primary"
                  style={{ background: '#059669' }}
                >
                  {procesando ? 'Procesando...' : 'Habilitar stock'}
                </button>
              </div>
            </div>
          )}

          {ingreso.estado === 'DISPONIBLE' && (
            <div className="flex items-start gap-3 bg-success/5 border border-success/20 rounded-lg p-4">
              <CheckCircle2 size={20} className="text-success-text mt-0.5 shrink-0" />
              <p className="text-sm text-fg">Stock habilitado y disponible en {ingreso.centro?.nombre}.</p>
            </div>
          )}

          {!esAdmin && ingreso.estado === 'BORRADOR' && (
            <div className="flex items-start gap-3 bg-surface-2 border border-surface-border rounded-lg p-4">
              <Package size={20} className="text-fg-muted mt-0.5 shrink-0" />
              <p className="text-sm text-fg-muted">Este ingreso quedo como borrador sin confirmar. Inicia uno nuevo desde "Inventario y envíos" para enviarlo.</p>
            </div>
          )}

          {!esAdmin && ['RECIBIDO', 'EN_VALIDACION', 'CON_DIFERENCIAS'].includes(ingreso.estado) && (
            <div className="flex items-start gap-3 bg-info/5 border border-info/20 rounded-lg p-4">
              <Clock size={20} className="text-info-text mt-0.5 shrink-0" />
              <p className="text-sm text-fg">Gesicomm recibio tu mercaderia y esta validando cantidades.</p>
            </div>
          )}
        </div>

        {ingreso.historial && ingreso.historial.length > 0 && (
          <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-border bg-surface-2">
              <h2 className="text-sm font-semibold text-fg">Historial</h2>
            </div>
            <ul className="divide-y divide-surface-border">
              {ingreso.historial.map((h) => (
                <li key={h.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-fg">{(h.estado || '').replace(/_/g, ' ')}</p>
                    {h.comentario && <p className="text-xs text-fg-muted">{h.comentario}</p>}
                  </div>
                  <span className="text-xs text-fg-subtle whitespace-nowrap">{formatFecha(h.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
