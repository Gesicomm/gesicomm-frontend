import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { authTrackingService } from '../../services/authTrackingService';
import './AdminDashboard.css';

function formatearMonto(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'Gs. 0';
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(numero);
}

function formatearPct(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '0%';
  return `${numero.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function tasaEfectiva(estado) {
  const bruto = Number(estado?.bruto || 0);
  const comision = Number(estado?.comision || 0);
  if (bruto <= 0) return 0;
  return (comision / bruto) * 100;
}

function Kpi({ icon: Icon, label, value, note, tone = 'neutral' }) {
  return (
    <section className={`ad-kpi ad-kpi-${tone}`}>
      <div className="ad-kpi-icon"><Icon size={18} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </section>
  );
}

function EstadoPago({ label, estado }) {
  return (
    <div className="ad-pay-state">
      <span>{label}</span>
      <strong>{formatearMonto(estado?.neto ?? estado?.bruto ?? 0)}</strong>
      <small>
        {estado?.cantidad ?? 0} movimientos
        {estado?.comision > 0 ? ` · comisión ${formatearMonto(estado.comision)}` : ''}
      </small>
    </div>
  );
}

function CajaMetrica({ label, value, note }) {
  return (
    <div className="ad-cash-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export default function AdminDashboard() {
  const [dias, setDias] = useState(30);
  const [resumen, setResumen] = useState(null);
  const [pagos, setPagos] = useState(null);
  const [topProductos, setTopProductos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [resumenGeneral, resumenPagos, productosTop] = await Promise.all([
        authTrackingService.resumen(dias),
        authTrackingService.resumenPagosAdmin(dias),
        authTrackingService.topProductosAdmin({ dias, limite: 8 }),
      ]);
      setResumen(resumenGeneral);
      setPagos(resumenPagos);
      setTopProductos(productosTop);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos cargar el dashboard admin.');
    } finally {
      setLoading(false);
    }
  }, [dias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const estados = pagos?.totales?.estados || {};
  const alertas = useMemo(() => resumen?.notificaciones_no_leidas ?? 0, [resumen]);
  const pagado = estados.PAID || {};
  const pendiente = estados.PENDING || {};
  const fallido = estados.FAILED || {};
  const origenComision = pagos?.comision_pasarela?.origen === 'pagopar'
    ? 'Comisión leída desde PagoPar'
    : pagos?.comision_pasarela?.origen === 'parametros'
      ? 'Comisión estimada por parámetros'
      : 'Comisión sin configurar';

  if (loading && !resumen && !pagos) {
    return (
      <div className="ad-loading">
        <Loader className="ad-spin" size={22} />
        <span>Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="ad-header">
        <div>
          <span className="ad-eyebrow"><ShieldCheck size={14} /> Panel admin</span>
          <h1>Dashboard</h1>
          <p>Estado general de Gesicomm: caja del sistema, pagos pendientes y señales operativas.</p>
        </div>
        <div className="ad-actions">
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Rango de días">
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
          <button type="button" onClick={cargar} disabled={loading}>
            {loading ? <Loader className="ad-spin" size={15} /> : <RefreshCw size={15} />}
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="ad-error" role="alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <section className="ad-kpis">
        <Kpi icon={CreditCard} label="Neto Gesicomm" value={formatearMonto(pagado.neto ?? 0)} note={`Bruto ${formatearMonto(pagado.bruto ?? 0)} · comisión ${formatearMonto(pagado.comision ?? 0)}`} tone="success" />
        <Kpi icon={Clock3} label="Pendiente bruto" value={formatearMonto(pendiente.bruto ?? 0)} note={`${pendiente.cantidad ?? 0} pagos esperando confirmación`} tone="warning" />
        <Kpi icon={AlertTriangle} label="Fallido bruto" value={formatearMonto(fallido.bruto ?? 0)} note={`${fallido.cantidad ?? 0} pagos rechazados`} tone="danger" />
        <Kpi icon={Users} label="Usuarios" value={resumen?.usuarios_total ?? 0} note={`${resumen?.usuarios_verificados ?? 0} verificados`} />
        <Kpi icon={Bell} label="Alertas" value={alertas} note="notificaciones sin leer" tone={alertas > 0 ? 'warning' : 'neutral'} />
      </section>

      <section className="ad-grid">
        <article className="ad-panel ad-span-8">
          <div className="ad-panel-head">
            <div>
              <h2>Caja Gesicom</h2>
              <p>Incluye suscripciones y abastecimiento. El neto descuenta comisión estimada de PagoPar.</p>
            </div>
            <Link to="/admin/tracking-pagos" className="ad-link">
              Ver pagos <ArrowRight size={15} />
            </Link>
          </div>
          <div className="ad-cash-summary">
            <CajaMetrica label="Bruto cobrado" value={formatearMonto(pagado.bruto ?? 0)} note={`${pagado.cantidad ?? 0} pagos confirmados`} />
            <CajaMetrica label="Comisión PagoPar" value={`-${formatearMonto(pagado.comision ?? 0)}`} note={formatearPct(tasaEfectiva(pagado))} />
            <CajaMetrica label="Neto disponible" value={formatearMonto(pagado.neto ?? 0)} note="estimado en bolsillo" />
            <CajaMetrica label="Base de comisión" value={origenComision} note={pagos?.comision_pasarela?.fallback_pct ? `fallback ${formatearPct(pagos.comision_pasarela.fallback_pct)}` : null} />
          </div>
          <div className="ad-pay-grid">
            <EstadoPago label="Pagado" estado={estados.PAID} />
            <EstadoPago label="Pendiente" estado={estados.PENDING} />
            <EstadoPago label="Fallido" estado={estados.FAILED} />
          </div>
          <div className="ad-type-grid">
            {(pagos?.tipos || []).map((tipo) => (
              <div className="ad-type-card" key={tipo.tipo}>
                <div className="ad-type-icon">
                  {tipo.tipo === 'abastecimiento' ? <PackageCheck size={16} /> : <CreditCard size={16} />}
                </div>
                <div>
                  <strong>{tipo.label}</strong>
                  <small>{tipo.cantidad_total} movimientos · {tipo.estados.PAID?.cantidad ?? 0} pagados</small>
                </div>
                <div className="ad-type-amounts">
                  <strong>{formatearMonto(tipo.estados.PAID?.neto ?? 0)}</strong>
                  <small>Bruto {formatearMonto(tipo.estados.PAID?.bruto ?? 0)}</small>
                  <small>Comisión {formatearMonto(tipo.estados.PAID?.comision ?? 0)}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="ad-panel">
          <div className="ad-panel-head">
            <div>
              <h2>Actividad</h2>
              <p>Altas y onboarding del período.</p>
            </div>
            <Link to="/admin/tracking-onboarding" className="ad-link">
              Ver <ArrowRight size={15} />
            </Link>
          </div>
          <div className="ad-activity-list">
            <div><span>Registros</span><strong>{resumen?.registros_periodo ?? 0}</strong></div>
            <div><span>Onboarding iniciado</span><strong>{resumen?.onboarding_iniciados_periodo ?? 0}</strong></div>
            <div><span>Landings generadas</span><strong>{resumen?.onboarding_landings_periodo ?? 0}</strong></div>
            <div><span>Fallos técnicos</span><strong>{resumen?.fallos_periodo ?? 0}</strong></div>
          </div>
        </article>
      </section>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <div>
            <h2>Productos más vendidos</h2>
            <p>Ranking por unidades abastecidas, con proveedor, precio mayorista a tiendas, costo Gesicomm y ganancia.</p>
          </div>
          <span className="ad-period-pill">{topProductos?.periodo_dias || dias} días</span>
        </div>
        <div className="ad-products-summary">
          <CajaMetrica label="Unidades" value={topProductos?.totales?.unidades ?? 0} />
          <CajaMetrica label="Vendido a tiendas" value={formatearMonto(topProductos?.totales?.venta_total ?? 0)} />
          <CajaMetrica label="Costo Gesicomm" value={formatearMonto(topProductos?.totales?.costo_total ?? 0)} />
          <CajaMetrica label="Ganancia" value={formatearMonto(topProductos?.totales?.ganancia ?? 0)} />
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Proveedor</th>
                <th>Unidades</th>
                <th>Vendido tienda</th>
                <th>Costo Gesicomm</th>
                <th>Ganancia</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {(topProductos?.productos || []).length === 0 ? (
                <tr><td colSpan={7} className="ad-empty-cell">Todavía no hay productos entregados en este período.</td></tr>
              ) : topProductos.productos.map((producto) => (
                <tr key={producto.producto_id || producto.nombre}>
                  <td>
                    <strong>{producto.nombre}</strong>
                    <small>{producto.sku || 'Sin SKU'}</small>
                  </td>
                  <td>{producto.proveedor?.nombre || 'Sin proveedor'}</td>
                  <td>{producto.unidades}</td>
                  <td>
                    <strong>{formatearMonto(producto.venta_total)}</strong>
                    <small>Mayorista prom. {formatearMonto(producto.precio_venta_promedio)}</small>
                  </td>
                  <td>
                    <strong>{formatearMonto(producto.costo_total)}</strong>
                    <small>Compra prom. {formatearMonto(producto.costo_promedio)}</small>
                  </td>
                  <td><strong>{formatearMonto(producto.ganancia)}</strong></td>
                  <td>{producto.margen_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ad-shortcuts">
        <Link to="/admin/raha"><ShieldCheck size={16} /> Solicitudes Raha</Link>
        <Link to="/admin/planes">
          <CreditCard size={16} />
          Configurar planes
        </Link>
        <Link to="/admin/tracking-pagos">
          <CheckCircle2 size={16} />
          Tracking de pagos
        </Link>
        <Link to="/orders">
          <PackageCheck size={16} />
          Abastecimiento
        </Link>
      </section>
    </div>
  );
}
