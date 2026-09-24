import React, { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw, Search, ChevronLeft, ChevronRight, Boxes, PackageCheck, PackageSearch, Warehouse, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { inventarioService } from '../../services/inventario.service';

const PAGE_SIZE = 20;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Paginador({ pagina, totalPaginas, onCambiar }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
      <p className="text-xs text-fg-muted">Página {pagina} de {totalPaginas}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina <= 1}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-surface-border rounded-md disabled:opacity-40 hover:bg-surface-2"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <button
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-surface-border rounded-md disabled:opacity-40 hover:bg-surface-2"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, valor }) {
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="text-lg font-bold text-fg">{valor}</p>
      </div>
    </div>
  );
}

function etiquetaTipoStock(origen) {
  return origen === 'GESICOMM' ? 'Producto Gesicom abastecido' : 'Producto propio';
}

function etiquetaUbicacion(deposito) {
  if (!deposito?.nombre) return '—';
  const prefijo = deposito.alcance === 'GESICOMM' ? 'Centro Gesicom' : 'Mi depósito';
  return `${prefijo} · ${deposito.nombre}`;
}

function nombreProductoItem(item) {
  const producto = item.Producto?.nombre || 'Producto sin nombre';
  return item.ProductoVariante?.nombre ? `${producto} · ${item.ProductoVariante.nombre}` : producto;
}

function resumenProductos(items) {
  const nombres = [...new Set((items || []).map(nombreProductoItem).filter(Boolean))];
  if (nombres.length === 0) return '—';
  if (nombres.length === 1) return nombres[0];
  return `${nombres[0]} y ${nombres.length - 1} más`;
}

function totalDeclarado(items) {
  return (items || []).reduce((acc, it) => acc + (Number(it.cantidad_declarada) || 0), 0);
}

function totalRecibido(items) {
  const cantidades = (items || [])
    .map((it) => it.cantidad_recibida ?? it.cantidad_aceptada)
    .filter((cantidad) => cantidad != null);
  if (cantidades.length === 0) return null;
  return cantidades.reduce((acc, cantidad) => acc + (Number(cantidad) || 0), 0);
}

function stockActualDisponible(ingreso) {
  if (ingreso.stock_actual_disponible != null) return Number(ingreso.stock_actual_disponible) || 0;
  return (ingreso.items || []).reduce((acc, item) => acc + (Number(item.stock_actual_disponible) || 0), 0);
}

function TabMiInventario() {
  const [filas, setFilas] = useState([]);
  const [kpis, setKpis] = useState({ total_unidades: 0, disponibles: 0, reservadas: 0, ubicaciones: 0 });
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [origen, setOrigen] = useState('TODOS');
  const [ubicacion, setUbicacion] = useState('TODAS');
  const textoDebounced = useDebounce(busqueda, 350);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventarioService.listarStock({
        texto: textoDebounced || undefined,
        origen: origen === 'TODOS' ? undefined : origen,
        ubicacion: ubicacion === 'TODAS' ? undefined : ubicacion,
        page: pagina,
        limit: PAGE_SIZE,
      });
      setFilas(data.filas || []);
      setTotalPaginas(data.total_paginas || 1);
      setKpis(data.kpis || { total_unidades: 0, disponibles: 0, reservadas: 0, ubicaciones: 0 });
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cargar tu inventario.');
    } finally {
      setLoading(false);
    }
  }, [textoDebounced, origen, ubicacion, pagina]);

  useEffect(() => { setPagina(1); }, [textoDebounced, origen, ubicacion]);
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="-mt-1">
        <h2 className="text-base font-semibold text-fg">Mi inventario</h2>
        <p className="text-sm text-fg-muted">
          Acá ves qué stock existe hoy, de quién era originalmente y dónde está físicamente.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<Boxes size={16} />} label="Total de unidades" valor={kpis.total_unidades} />
        <KpiCard icon={<PackageCheck size={16} />} label="Disponibles" valor={kpis.disponibles} />
        <KpiCard icon={<PackageSearch size={16} />} label="Reservadas" valor={kpis.reservadas} />
        <KpiCard icon={<Warehouse size={16} />} label="Ubicaciones" valor={kpis.ubicaciones} />
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" size={14} />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-surface outline-none focus:border-primary w-64"
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase text-fg-muted">Tipo de producto</p>
          <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg p-1">
            {[['TODOS', 'Todos'], ['PROPIO', 'Producto propio'], ['GESICOMM', 'Comprado a Gesicom']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setOrigen(val)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${origen === val ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-2'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase text-fg-muted">Dónde está</p>
          <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg p-1">
            {[['TODAS', 'Todas'], ['PROPIA', 'Mi depósito'], ['GESICOMM', 'Centro Gesicom']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setUbicacion(val)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${ubicacion === val ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-2'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-surface-border">
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Producto</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Tipo de stock</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Ubicación</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase text-right">Disponible</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase text-right">Reservado</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase text-right">Total físico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-fg-muted"><RefreshCw className="animate-spin inline mr-2" size={16} /> Cargando...</td></tr>
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-fg-muted">
                  No tenés stock que coincida con estos filtros.
                </td>
              </tr>
            ) : (
              filas.map((s) => (
                <tr key={s.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm text-fg">{s.Producto?.nombre}</p>
                    {s.ProductoVariante && <p className="text-xs text-fg-muted">{s.ProductoVariante.nombre}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${s.origen === 'GESICOMM' ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-fg-muted'}`}>
                      {etiquetaTipoStock(s.origen)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-fg">{etiquetaUbicacion(s.Deposito)}</td>
                  <td className="px-4 py-3 font-semibold text-success-text text-right">{s.cantidad_disponible}</td>
                  <td className="px-4 py-3 font-medium text-warning-text text-right">{s.cantidad_reservada}</td>
                  <td className="px-4 py-3 font-bold text-fg text-right">{s.cantidad_disponible + s.cantidad_reservada}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>
    </div>
  );
}

function getEstadoBadge(estado) {
  const badges = {
    BORRADOR: 'bg-surface text-fg border-surface-border',
    PENDIENTE_ENVIO: 'bg-warning/10 text-warning-text border-warning/20',
    EN_TRANSITO: 'bg-primary/10 text-primary-text border-primary/20',
    RECIBIDO: 'bg-info/10 text-info-text border-info/20',
    EN_VALIDACION: 'bg-warning/10 text-warning-text border-warning/20',
    CON_DIFERENCIAS: 'bg-danger/10 text-danger-text border-danger/20',
    DISPONIBLE: 'bg-success/10 text-success-text border-success/20',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full border ${badges[estado] || badges.BORRADOR}`}>{estado.replace(/_/g, ' ')}</span>;
}

function TabEnviosGesicomm() {
  const navigate = useNavigate();
  const [ingresos, setIngresos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('TODOS');
  const textoDebounced = useDebounce(busqueda, 350);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventarioService.listarIngresos({
        texto: textoDebounced || undefined,
        estado: estado === 'TODOS' ? undefined : estado,
        page: pagina,
        limit: PAGE_SIZE,
      });
      setIngresos(data.ingresos || []);
      setTotalPaginas(data.total_paginas || 1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cargar los envíos a Gesicom.');
    } finally {
      setLoading(false);
    }
  }, [textoDebounced, estado, pagina]);

  useEffect(() => { setPagina(1); }, [textoDebounced, estado]);
  useEffect(() => { cargar(); }, [cargar]);

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const ESTADOS = ['BORRADOR', 'PENDIENTE_ENVIO', 'EN_TRANSITO', 'RECIBIDO', 'EN_VALIDACION', 'CON_DIFERENCIAS', 'DISPONIBLE'];

  return (
    <div className="space-y-4">
      <div className="-mt-1">
        <h2 className="text-base font-semibold text-fg">Envíos a Gesicom</h2>
        <p className="text-sm text-fg-muted">
          Acá ves la mercadería propia que mandaste a un centro Gesicom, cuánto llegó y cuánto queda disponible hoy.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" size={14} />
            <input
              type="text"
              placeholder="Buscar por N° de envío o centro..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-surface outline-none focus:border-primary w-64"
            />
          </div>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface outline-none focus:border-primary"
          >
            <option value="TODOS">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <button onClick={() => navigate('/inventario/nuevo')} className="btn-primary">
          <Package size={16} />
          Nuevo envío
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-surface-border">
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Envío</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Producto</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Destino</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase text-right">Enviado</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase text-right">Recibido</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase text-right">Stock actual</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Estado</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase">Fecha</th>
              <th className="px-4 py-3 text-xs font-semibold text-fg-muted uppercase text-right">Historial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {loading ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-fg-muted"><RefreshCw className="animate-spin inline mr-2" size={16} /> Cargando...</td></tr>
            ) : ingresos.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-fg-muted">
                  No tenés envíos registrados. ¡Creá uno nuevo para mandar tu stock a Gesicom!
                </td>
              </tr>
            ) : (
              ingresos.map((ing) => {
                const enviado = totalDeclarado(ing.items);
                const recibido = totalRecibido(ing.items);
                const actual = stockActualDisponible(ing);
                return (
                  <tr
                    key={ing.id}
                    className="hover:bg-surface-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-sm text-fg">ING-{ing.id.toString().padStart(4, '0')}</td>
                    <td className="px-4 py-3 text-sm text-fg">{resumenProductos(ing.items)}</td>
                    <td className="px-4 py-3 text-sm text-fg">{etiquetaUbicacion({ ...ing.centro, alcance: 'GESICOMM' })}</td>
                    <td className="px-4 py-3 text-sm text-fg text-right">{enviado}</td>
                    <td className="px-4 py-3 text-sm text-fg text-right">{recibido ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-success-text text-right">{actual}</td>
                    <td className="px-4 py-3">{getEstadoBadge(ing.estado)}</td>
                    <td className="px-4 py-3 text-xs text-fg-muted">{formatearFecha(ing.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/inventario/${ing.id}`)}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium"
                      >
                        <History size={14} />
                        Ver historial
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>
    </div>
  );
}

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState('inventario'); // 'inventario' o 'envios'

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border">
        <h1 className="text-xl font-bold text-fg mb-1">Inventario y Fulfillment</h1>
        <p className="text-sm text-fg-muted">Gestioná tu stock almacenado en Gesicom y tus envíos de mercadería.</p>
      </div>

      <div className="px-6 py-4 border-b border-surface-border bg-surface flex gap-2">
        <button
          onClick={() => setActiveTab('inventario')}
          className={activeTab === 'inventario' ? 'btn-primary' : 'btn-secondary'}
        >
          Mi inventario
        </button>
        <button
          onClick={() => setActiveTab('envios')}
          className={activeTab === 'envios' ? 'btn-primary' : 'btn-secondary'}
        >
          Envíos a Gesicom
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'inventario' ? <TabMiInventario /> : <TabEnviosGesicomm />}
      </div>
    </div>
  );
}
