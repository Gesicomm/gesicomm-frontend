import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { financeApi } from '../../services/automationHubApi';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { Trash2 } from 'lucide-react';

const inputClass = 'h-9 w-full rounded-md border border-border bg-surface-2 px-2 text-xs text-fg';
const fmt = (v) => Number(v || 0).toLocaleString('es-PY');

function Kpi({ label, value, sublabel, tono = 'text-fg' }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between">
      <div>
        <div className="text-[9px] font-bold uppercase text-fg-muted">{label}</div>
        <div className={`mt-1 text-xl font-bold ${tono}`}>{value}</div>
      </div>
      {sublabel && <div className="mt-2 text-[10px] text-fg-subtle">{sublabel}</div>}
    </div>
  );
}

function AlertCard({ count, label, colorClass }) {
  return (
    <div className={`rounded-md p-3 font-bold border ${colorClass} flex flex-col items-start justify-center`}>
      <div className="text-xl">{count}</div>
      <div className="text-[10px] uppercase mt-0.5">{label}</div>
    </div>
  );
}

export default function FinanzasAutomatizacion() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [filtros, setFiltros] = useState({ programId: '', month: '', from: '', to: '' });
  const [filtrosAplicados, setFiltrosAplicados] = useState({ programId: '', month: '', from: '', to: '' });

  const [dash, setDash] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [tab, setTab] = useState('ALUMNOS');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const f = { ...filtrosAplicados };
      if (!f.programId) delete f.programId;
      if (!f.month) delete f.month;
      if (!f.from) delete f.from;
      if (!f.to) delete f.to;

      const [d, p, e] = await Promise.all([
        financeApi.dashboard(f),
        financeApi.programs.listar(),
        financeApi.teamMembers.listar(),
      ]);
      setDash(d);
      setProgramas(p);
      setEquipo(e);
    } catch (err) {
      setError('Error al cargar datos financieros.');
    } finally {
      setCargando(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => { cargar(); }, [cargar]);

  const aplicar = () => setFiltrosAplicados(filtros);
  const limpiar = () => {
    const limpios = { programId: '', month: '', from: '', to: '' };
    setFiltros(limpios);
    setFiltrosAplicados(limpios);
  };

  const metrics = dash?.metrics || { totalSold: 0, totalPaid: 0, totalPending: 0, totalExpenses: 0, totalTeamPayments: 0, profit: 0, students: 0, activeStudents: 0 };
  const payments = dash?.payments || [];
  
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
  const d15 = new Date(Date.now() + 15*86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
  const d30 = new Date(Date.now() + 30*86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });

  const pendientes = payments.filter(p => p.status !== 'Pagado' && p.due_date);
  const vVencidas = pendientes.filter(p => p.due_date < hoy).length;
  const vHoy = pendientes.filter(p => p.due_date === hoy).length;
  const v15 = pendientes.filter(p => p.due_date > hoy && p.due_date <= d15).length;
  const v30 = pendientes.filter(p => p.due_date > d15 && p.due_date <= d30).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros Row */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex-1 min-w-[150px]">
          <label className="mb-1 block text-[9px] font-bold uppercase text-fg-subtle">Programa</label>
          <select className={inputClass} value={filtros.programId} onChange={(e) => setFiltros({ ...filtros, programId: e.target.value })}>
            <option value="">Todos</option>
            {programas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="mb-1 block text-[9px] font-bold uppercase text-fg-subtle">Mes</label>
          <input type="month" className={inputClass} value={filtros.month} onChange={(e) => setFiltros({ ...filtros, month: e.target.value })} />
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="mb-1 block text-[9px] font-bold uppercase text-fg-subtle">Desde</label>
          <input type="date" className={inputClass} value={filtros.from} onChange={(e) => setFiltros({ ...filtros, from: e.target.value })} />
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="mb-1 block text-[9px] font-bold uppercase text-fg-subtle">Hasta</label>
          <input type="date" className={inputClass} value={filtros.to} onChange={(e) => setFiltros({ ...filtros, to: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button onClick={aplicar} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg hover:bg-primary-hover">Aplicar</button>
          <button onClick={limpiar} className="h-9 rounded-md border border-border bg-surface-2 px-4 text-xs font-semibold text-fg hover:bg-surface-3">Limpiar</button>
        </div>
      </div>

      {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Ventas Totales" value={`Gs ${fmt(metrics.totalSold)}`} sublabel="Valor vendido" />
        <Kpi label="Cobrado" value={`Gs ${fmt(metrics.totalPaid)}`} sublabel="Cobros efectivos" />
        <Kpi label="Pendiente" value={`Gs ${fmt(metrics.totalPending)}`} sublabel="Cartera por cobrar" />
        <Kpi label="Gastos" value={`Gs ${fmt(metrics.totalExpenses)}`} sublabel="Gastos registrados" />
        <Kpi label="Pagos Equipo" value={`Gs ${fmt(metrics.totalTeamPayments)}`} sublabel="Comisiones/pagos realizados" />
        <Kpi label="Beneficio Neto" value={`Gs ${fmt(metrics.profit)}`} sublabel="Cobrado - gastos - equipo" tono={metrics.profit >= 0 ? "text-primary" : "text-danger"} />
        <Kpi label="Alumnos" value={metrics.students} sublabel="Registros del periodo" />
        <Kpi label="Activos" value={metrics.activeStudents} sublabel="Alumnos activos" />
      </div>

      {/* Alertas Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <AlertCard count={v30} label="Vencen ≤30 días" colorClass="bg-[#FFF9C4] text-[#827717] border-[#FBC02D]/30" />
        <AlertCard count={v15} label="Vencen ≤15 días" colorClass="bg-[#FFE0B2] text-[#E65100] border-[#F57C00]/30" />
        <AlertCard count={0} label="Programas Vencidos" colorClass="bg-danger/10 text-danger border-danger/20" />
        <AlertCard count={v15 + v30} label="Cobros Próximos" colorClass="bg-[#FFF9C4] text-[#827717] border-[#FBC02D]/30" />
        <AlertCard count={vHoy} label="Cobros Hoy" colorClass="bg-[#FFE0B2] text-[#E65100] border-[#F57C00]/30" />
        <AlertCard count={vVencidas} label="Cuotas Vencidas" colorClass="bg-danger/10 text-danger border-danger/20" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-80">
        <div className="md:col-span-2 rounded-lg border border-border bg-surface p-4 flex flex-col">
          <div className="text-xs font-bold mb-4">Ingresos, gastos y resultado</div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Vendido', valor: metrics.totalSold, fill: '#8884d8' },
                { name: 'Cobrado', valor: metrics.totalPaid, fill: '#82ca9d' },
                { name: 'Gastos Tot.', valor: metrics.totalExpenses + metrics.totalTeamPayments, fill: '#ffc658' },
                { name: 'Beneficio', valor: metrics.profit, fill: metrics.profit >= 0 ? '#82ca9d' : '#ff8042' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-fg-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `${val / 1000}k`} tick={{ fontSize: 10, fill: 'var(--color-fg-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} formatter={(val) => [`Gs ${fmt(val)}`, 'Monto']} contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  { [0,1,2,3].map((i) => <Cell key={i} fill={['#6366f1', '#10b981', '#f59e0b', metrics.profit >= 0 ? '#10b981' : '#ef4444'][i]} />) }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 flex flex-col">
          <div className="text-xs font-bold mb-4">Ventas por programa</div>
          <div className="flex-1 min-h-0">
            {dash?.students.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programas.map(p => ({
                  name: p.name,
                  ventas: dash.students.filter(s => s.program_id === p.id).reduce((acc, s) => acc + Number(s.negotiated_price || 0), 0)
                })).filter(d => d.ventas > 0)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fill: 'var(--color-fg-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} formatter={(val) => [`Gs ${fmt(val)}`, 'Ventas']} contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="ventas" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-fg-muted">Sin datos por programa.</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-lg border border-border bg-surface p-1 shadow-sm mt-4">
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border">
          {['ALUMNOS', 'PAGOS', 'GASTOS', 'PROGRAMAS', 'EQUIPO', 'COMISIONES', 'ALERTAS'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-xs font-bold transition-colors ${
                tab === t ? 'bg-primary text-primary-fg' : 'bg-transparent text-fg hover:bg-surface-2 border border-transparent hover:border-border'
              }`}>
              {t}
            </button>
          ))}
          <div className="flex-1" />
          <input type="text" placeholder="Buscar..." className="h-8 rounded-md border border-border bg-surface-2 px-3 text-xs w-48" />
        </div>
        
        <div className="p-4">
          {tab === 'ALUMNOS' && <TabAlumnos programas={programas} equipo={equipo} onRefrescar={cargar} />}
          {tab === 'PAGOS' && <TabPagos />}
          {tab === 'GASTOS' && <TabGastos onRefrescar={cargar} />}
          {tab === 'PROGRAMAS' && <TabProgramas programas={programas} onRefrescar={cargar} />}
          {tab === 'EQUIPO' && <TabEquipo equipo={equipo} onRefrescar={cargar} />}
          {tab === 'COMISIONES' && <TabComisiones equipo={equipo} onRefrescar={cargar} />}
          {tab === 'ALERTAS' && <TabAlertas dash={dash} />}
        </div>
      </div>
    </div>
  );
}

const MoneyInput = ({ value, onChange, placeholder = "0", required = false }) => {
  const [displayValue, setDisplayValue] = useState(value ? fmt(value) : '');

  useEffect(() => {
    if (value !== undefined && value !== null) {
      if (document.activeElement !== document.getElementById(`money-${value}`)) {
        setDisplayValue(fmt(value));
      }
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setDisplayValue(raw ? fmt(raw) : '');
    onChange(raw);
  };

  return (
    <input
      type="text"
      required={required}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-xs text-fg"
      value={displayValue}
      onChange={handleChange}
    />
  );
};

function NuevoAcuerdoModal({ programas, equipo, onClose, onGuardado }) {
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    program_id: '', sale_date: hoy, start_date: hoy,
    duration_months: 6, negotiated_price: '',
    setter_id: '', closer_id: '', student_status: 'Activo',
    renewal_status: 'Sin gestionar', commercial_notes: '',
  });
  const [cantCuotas, setCantCuotas] = useState(3);
  const [entregaInicial, setEntregaInicial] = useState('');
  const [cuotas, setCuotas] = useState(
    Array.from({ length: 3 }, (_, i) => ({ monto: '', fecha: '' }))
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleCantCuotas = (n) => {
    const num = Math.max(1, Math.min(12, Number(n)));
    setCantCuotas(num);
    setCuotas(Array.from({ length: num }, (_, i) => cuotas[i] || { monto: '', fecha: '' }));
  };

  const setCuota = (i, key, val) => {
    setCuotas(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const installments = cuotas
        .filter(c => c.monto || c.fecha)
        .map((c, i) => ({
          label: `Cuota ${i + 1}`,
          amount: parseFloat(c.monto) || 0,
          due_date: c.fecha || null,
        }));
      const student = {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        program_id: form.program_id || null,
        sale_date: form.sale_date,
        start_date: form.start_date || null,
        duration_months: form.duration_months || null,
        negotiated_price: parseFloat(form.negotiated_price) || 0,
        setter_id: form.setter_id || null,
        closer_id: form.closer_id || null,
        student_status: form.student_status,
        renewal_status: form.renewal_status,
        commercial_notes: form.commercial_notes || null,
      };
      await financeApi.students.crear({ student, installments });
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el acuerdo.');
    } finally {
      setGuardando(false);
    }
  };

  const inp = 'h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-xs text-fg';
  const lbl = 'text-[10px] font-bold uppercase text-fg-subtle mb-0.5 block';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border p-5">
          <h3 className="m-0 text-base font-bold text-fg">Nuevo acuerdo comercial</h3>
          <p className="mt-0.5 text-[11px] text-fg-muted">Crea alumno + acuerdo + cuotas automáticamente.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {/* Datos personales */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={lbl}>Nombre *</label>
              <input required className={inp} value={form.name} onChange={e => setF('name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Email</label>
              <input type="email" className={inp} value={form.email} onChange={e => setF('email', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Teléfono</label>
              <input className={inp} value={form.phone} onChange={e => setF('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Programa</label>
              <select className={inp} value={form.program_id} onChange={e => setF('program_id', e.target.value)}>
                <option value="">Seleccionar programa...</option>
                {programas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Fecha de Venta</label>
              <input type="date" className={inp} value={form.sale_date} onChange={e => setF('sale_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Inicio del Programa</label>
              <input type="date" className={inp} value={form.start_date} onChange={e => setF('start_date', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Duración Negociada (Meses)</label>
              <input type="number" min="1" className={inp} value={form.duration_months} onChange={e => setF('duration_months', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Precio Negociado</label>
              <MoneyInput value={form.negotiated_price} onChange={val => setF('negotiated_price', val)} />
            </div>
            <div>
              <label className={lbl}>Setter</label>
              <select className={inp} value={form.setter_id} onChange={e => setF('setter_id', e.target.value)}>
                <option value="">Sin asignar</option>
                {equipo.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Closer</label>
              <select className={inp} value={form.closer_id} onChange={e => setF('closer_id', e.target.value)}>
                <option value="">Sin asignar</option>
                {equipo.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Estado Alumno</label>
              <select className={inp} value={form.student_status} onChange={e => setF('student_status', e.target.value)}>
                <option>Activo</option>
                <option>Inactivo</option>
                <option>Finalizado</option>
                <option>Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Renovación</label>
            <select className={`${inp} max-w-xs`} value={form.renewal_status} onChange={e => setF('renewal_status', e.target.value)}>
              <option>Sin gestionar</option>
              <option>En proceso</option>
              <option>Renovado</option>
              <option>No renueva</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Notas Comerciales</label>
            <textarea className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg h-20 resize-none" value={form.commercial_notes} onChange={e => setF('commercial_notes', e.target.value)} />
          </div>

          {/* Plan de pagos */}
          <div className="border-t border-border pt-4">
            <div className="mb-3 text-xs font-bold uppercase text-primary">Plan de Pagos</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>Cantidad de Cuotas</label>
                <input type="number" min="1" max="12" className={inp} value={cantCuotas} onChange={e => handleCantCuotas(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Entrega Inicial</label>
                <MoneyInput value={entregaInicial} onChange={val => setEntregaInicial(val)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {cuotas.map((c, i) => (
                <React.Fragment key={i}>
                  <div>
                    <label className={lbl}>Cuota {i + 1} - Monto</label>
                    <MoneyInput value={c.monto} onChange={val => setCuota(i, 'monto', val)} />
                  </div>
                  <div>
                    <label className={lbl}>Cuota {i + 1} - Fecha</label>
                    <input type="date" className={inp} value={c.fecha} onChange={e => setCuota(i, 'fecha', e.target.value)} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-border px-5 text-xs font-semibold text-fg hover:bg-surface-2">Cancelar</button>
            <button type="submit" disabled={guardando} className="h-10 rounded-md bg-primary px-6 text-xs font-semibold text-primary-fg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TabAlumnos({ programas, equipo, onRefrescar }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alumnos, setAlumnos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filtros, setFiltros] = useState({ page: 1, limit: 10, buscar: '', programId: '' });
  const [cargando, setCargando] = useState(false);

  const cargarAlumnos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await financeApi.students.buscar(filtros);
      setAlumnos(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargarAlumnos(); }, [cargarAlumnos]);

  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div>
      {modalAbierto && (
        <NuevoAcuerdoModal
          programas={programas}
          equipo={equipo}
          onClose={() => setModalAbierto(false)}
          onGuardado={() => { setModalAbierto(false); cargarAlumnos(); onRefrescar(); }}
        />
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <input type="text" placeholder="Buscar alumno..." value={filtros.buscar} onChange={e => setF('buscar', e.target.value)}
            className="h-8 rounded-md border border-border bg-surface-2 px-3 text-xs w-48" />
          <select className="h-8 rounded-md border border-border bg-surface-2 px-3 text-xs w-40" value={filtros.programId} onChange={e => setF('programId', e.target.value)}>
            <option value="">Todos los programas</option>
            {programas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={() => setModalAbierto(true)}
          className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg hover:bg-primary-hover">
          + Nuevo Acuerdo
        </button>
      </div>
      <div className="overflow-x-auto relative min-h-[300px]">
        {cargando && <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center z-10"><span className="text-xs font-bold text-fg-muted animate-pulse">Cargando...</span></div>}
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
            <tr>
              <th className="py-2 pr-3 whitespace-nowrap">Venta</th>
              <th className="py-2 pr-3 whitespace-nowrap">Alumno</th>
              <th className="py-2 pr-3 whitespace-nowrap">Programa</th>
              <th className="py-2 pr-3 whitespace-nowrap">Duración</th>
              <th className="py-2 pr-3 whitespace-nowrap">Fin</th>
              <th className="py-2 pr-3 whitespace-nowrap">Vendido</th>
              <th className="py-2 pr-3 whitespace-nowrap">Cobrado</th>
              <th className="py-2 pr-3 whitespace-nowrap">Saldo</th>
              <th className="py-2 pr-3 whitespace-nowrap">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {alumnos.length === 0 && !cargando && (
              <tr><td colSpan={9} className="py-6 text-center text-fg-muted">No hay registros para mostrar</td></tr>
            )}
            {alumnos.map(s => {
              const cobrado = (s.Payments || []).filter(p => p.status === 'Pagado').reduce((a, p) => a + Number(p.amount || 0), 0);
              const saldo = Number(s.negotiated_price || 0) - cobrado;
              const fin = s.start_date && s.duration_months
                ? (() => { const d = new Date(s.start_date); d.setMonth(d.getMonth() + Number(s.duration_months)); return d.toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }); })()
                : s.end_date || '—';
              return (
                <tr key={s.id} className="hover:bg-surface-2">
                  <td className="py-2 pr-3 text-fg-muted whitespace-nowrap">{s.sale_date}</td>
                  <td className="py-2 pr-3 font-semibold text-fg whitespace-nowrap">{s.name}</td>
                  <td className="py-2 pr-3 text-fg-muted whitespace-nowrap">{programas.find(p => p.id === s.program_id)?.name || '—'}</td>
                  <td className="py-2 pr-3 text-fg-muted whitespace-nowrap">{s.duration_months ? `${s.duration_months}m` : '—'}</td>
                  <td className="py-2 pr-3 text-fg-muted whitespace-nowrap">{fin}</td>
                  <td className="py-2 pr-3 font-bold text-fg whitespace-nowrap">Gs {fmt(s.negotiated_price)}</td>
                  <td className="py-2 pr-3 font-bold text-success whitespace-nowrap">Gs {fmt(cobrado)}</td>
                  <td className="py-2 pr-3 font-bold text-warning whitespace-nowrap">Gs {fmt(saldo)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.student_status === 'Activo' ? 'bg-success/15 text-success' : 'bg-surface-3 text-fg-muted'}`}>
                      {s.student_status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="text-[10px] text-fg-muted">Mostrando {alumnos.length} de {total}</div>
          <div className="flex gap-1">
            <button disabled={filtros.page <= 1} onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))} className="h-7 rounded border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-50">Anterior</button>
            <span className="flex items-center px-2 text-xs font-bold">{filtros.page} / {pages}</span>
            <button disabled={filtros.page >= pages} onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))} className="h-7 rounded border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
 function TabPagos() {
  const [pagos, setPagos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filtros, setFiltros] = useState({ page: 1, limit: 10, buscar: '', status: '', due_date_from: '', due_date_to: '', paid_date_from: '', paid_date_to: '' });
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await financeApi.payments.buscar(filtros);
      setPagos(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <input type="text" placeholder="Buscar alumno..." className="h-8 rounded-md border border-border bg-surface-2 px-3 text-xs w-44" value={filtros.buscar} onChange={e => setF('buscar', e.target.value)} />
        <select className="h-8 rounded-md border border-border bg-surface-2 px-3 text-xs w-32" value={filtros.status} onChange={e => setF('status', e.target.value)}>
          <option value="">Estado (Todos)</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Pagado">Pagado</option>
        </select>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-fg-muted">Venc.</span>
          <input type="date" className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs" value={filtros.due_date_from} onChange={e => setF('due_date_from', e.target.value)} />
          <span className="text-[10px] text-fg-muted">-</span>
          <input type="date" className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs" value={filtros.due_date_to} onChange={e => setF('due_date_to', e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-fg-muted">Pago</span>
          <input type="date" className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs" value={filtros.paid_date_from} onChange={e => setF('paid_date_from', e.target.value)} />
          <span className="text-[10px] text-fg-muted">-</span>
          <input type="date" className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs" value={filtros.paid_date_to} onChange={e => setF('paid_date_to', e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto relative min-h-[300px]">
        {cargando && <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center z-10"><span className="text-xs font-bold text-fg-muted animate-pulse">Cargando...</span></div>}
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
            <tr>
              <th className="py-2 pr-3">Cuota</th>
              <th className="py-2 pr-3">Alumno</th>
              <th className="py-2 pr-3">Vencimiento</th>
              <th className="py-2 pr-3">Monto</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Fecha Pago</th>
              <th className="py-2 pr-3">Método</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pagos.length === 0 && !cargando && <tr><td colSpan={7} className="py-6 text-center text-fg-muted">No hay registros</td></tr>}
            {pagos.map(p => (
              <tr key={p.id} className="hover:bg-surface-2">
                <td className="py-2 pr-3 font-semibold text-fg">{p.label || `Cuota ${p.installment_number}`}</td>
                <td className="py-2 pr-3 text-fg-muted">{p.Student?.name || '—'}</td>
                <td className="py-2 pr-3 text-fg-muted">{p.due_date || '—'}</td>
                <td className="py-2 pr-3 font-bold text-fg">Gs {fmt(p.amount)}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === 'Pagado' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2 pr-3 text-fg-muted">{p.paid_date || '—'}</td>
                <td className="py-2 pr-3 text-fg-muted">{p.payment_method || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="text-[10px] text-fg-muted">Mostrando {pagos.length} de {total}</div>
          <div className="flex gap-1">
            <button disabled={filtros.page <= 1} onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))} className="h-7 rounded border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-50">Anterior</button>
            <span className="flex items-center px-2 text-xs font-bold">{filtros.page} / {pages}</span>
            <button disabled={filtros.page >= pages} onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))} className="h-7 rounded border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NuevoGastoModal({ onClose, onGuardado }) {
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
  const [form, setForm] = useState({ expense_date: hoy, category: '', description: '', expense_type: 'Fijo', amount: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = 'h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-xs text-fg';
  const lbl = 'text-[10px] font-bold uppercase text-fg-subtle mb-0.5 block';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.expense_date || !form.amount) return;
    setGuardando(true); setError('');
    try {
      await financeApi.expenses.crear({ ...form, amount: parseFloat(form.amount) || 0 });
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el gasto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border p-5 flex items-start justify-between">
          <div>
            <h3 className="m-0 text-base font-bold text-fg">Nuevo gasto</h3>
            <p className="mt-0.5 text-[11px] text-fg-muted">Este gasto impactará automáticamente en el beneficio neto.</p>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Fecha *</label>
              <input required type="date" className={inp} value={form.expense_date} onChange={e => setF('expense_date', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Categoría</label>
              <input className={inp} placeholder="Ej: Marketing, Infraestructura..." value={form.category} onChange={e => setF('category', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={lbl}>Descripción</label>
            <input className={inp} placeholder="Detalle del gasto..." value={form.description} onChange={e => setF('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <select className={inp} value={form.expense_type} onChange={e => setF('expense_type', e.target.value)}>
                <option value="Fijo">Fijo</option>
                <option value="Variable">Variable</option>
                <option value="Extraordinario">Extraordinario</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Monto</label>
              <MoneyInput value={form.amount} onChange={val => setF('amount', val)} />
            </div>
          </div>
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-border px-5 text-xs font-semibold text-fg hover:bg-surface-2">Cancelar</button>
            <button type="submit" disabled={guardando} className="h-10 rounded-md bg-primary px-6 text-xs font-semibold text-primary-fg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TabGastos({ onRefrescar }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [gastos, setGastos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filtros, setFiltros] = useState({ page: 1, limit: 10, date_from: '', date_to: '' });
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await financeApi.expenses.buscar(filtros);
      setGastos(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v, page: 1 }));

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await financeApi.expenses.eliminar(id);
    cargar(); onRefrescar();
  };

  return (
    <div>
      {modalAbierto && <NuevoGastoModal onClose={() => setModalAbierto(false)} onGuardado={() => { setModalAbierto(false); cargar(); onRefrescar(); }} />}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-fg-muted">Fecha</span>
          <input type="date" className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs" value={filtros.date_from} onChange={e => setF('date_from', e.target.value)} />
          <span className="text-[10px] text-fg-muted">-</span>
          <input type="date" className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs" value={filtros.date_to} onChange={e => setF('date_to', e.target.value)} />
        </div>
        <button onClick={() => setModalAbierto(true)} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg hover:bg-primary-hover">
          + Registrar Gasto
        </button>
      </div>

      <div className="overflow-x-auto relative min-h-[300px]">
        {cargando && <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center z-10"><span className="text-xs font-bold text-fg-muted animate-pulse">Cargando...</span></div>}
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
            <tr>
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Categoría</th>
              <th className="py-2 pr-4">Descripción</th>
              <th className="py-2 pr-4">Tipo</th>
              <th className="py-2 pr-4">Monto</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {gastos.length === 0 && !cargando && <tr><td colSpan={6} className="py-6 text-center text-fg-muted">No hay registros para mostrar</td></tr>}
            {gastos.map(g => (
              <tr key={g.id} className="hover:bg-surface-2">
                <td className="py-2 pr-4 text-fg-muted whitespace-nowrap">{g.expense_date}</td>
                <td className="py-2 pr-4 font-semibold text-fg">{g.category || '—'}</td>
                <td className="py-2 pr-4 text-fg-muted">{g.description || '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${g.expense_type === 'Fijo' ? 'bg-primary/15 text-primary' : g.expense_type === 'Variable' ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'}`}>
                    {g.expense_type || 'Fijo'}
                  </span>
                </td>
                <td className="py-2 pr-4 font-bold text-danger whitespace-nowrap">Gs {fmt(g.amount)}</td>
                <td className="py-2">
                  <button onClick={() => eliminar(g.id)} className="text-danger hover:opacity-70 p-1"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-right text-[10px] text-fg-subtle">{total} registros</div>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="text-[10px] text-fg-muted">Mostrando {gastos.length} de {total}</div>
          <div className="flex gap-1">
            <button disabled={filtros.page <= 1} onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))} className="h-7 rounded border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-50">Anterior</button>
            <span className="flex items-center px-2 text-xs font-bold">{filtros.page} / {pages}</span>
            <button disabled={filtros.page >= pages} onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))} className="h-7 rounded border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NuevoProgramaModal({ onClose, onGuardado }) {
  const [form, setForm] = useState({ name: '', code: '', default_price: '', default_duration_months: 6, active: true, description: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = 'h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-xs text-fg';
  const lbl = 'text-[10px] font-bold uppercase text-fg-subtle mb-0.5 block';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setGuardando(true); setError('');
    try {
      await financeApi.programs.crear({
        ...form,
        default_price: parseFloat(form.default_price) || null,
        default_duration_months: parseInt(form.default_duration_months) || null,
        active: form.active === true || form.active === 'true',
      });
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el programa.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border p-5 flex items-start justify-between">
          <div>
            <h3 className="m-0 text-base font-bold text-fg">Nuevo programa</h3>
            <p className="mt-0.5 text-[11px] text-fg-muted">Definí precio y duración predeterminada en meses.</p>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className={lbl}>Nombre *</label>
            <input required className={inp} value={form.name} onChange={e => setF('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Código</label>
              <input className={inp} placeholder="Ej: PRG-001" value={form.code} onChange={e => setF('code', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Precio Base</label>
              <MoneyInput value={form.default_price} onChange={val => setF('default_price', val)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Duración Base (Meses)</label>
              <input type="number" min="1" className={inp} value={form.default_duration_months} onChange={e => setF('default_duration_months', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Activo</label>
              <select className={inp} value={form.active} onChange={e => setF('active', e.target.value)}>
                <option value={true}>Sí</option>
                <option value={false}>No</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Descripción</label>
            <textarea className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg h-24 resize-none" value={form.description} onChange={e => setF('description', e.target.value)} />
          </div>
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-border px-5 text-xs font-semibold text-fg hover:bg-surface-2">Cancelar</button>
            <button type="submit" disabled={guardando} className="h-10 rounded-md bg-primary px-6 text-xs font-semibold text-primary-fg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TabProgramas({ programas, onRefrescar }) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar programa?')) return;
    await financeApi.programs.eliminar(id);
    onRefrescar();
  };

  return (
    <div>
      {modalAbierto && <NuevoProgramaModal onClose={() => setModalAbierto(false)} onGuardado={() => { setModalAbierto(false); onRefrescar(); }} />}

      <div className="mb-3 flex justify-end">
        <button onClick={() => setModalAbierto(true)} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg hover:bg-primary-hover">
          + Nuevo Programa
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
            <tr>
              <th className="py-2 pr-4">Programa</th>
              <th className="py-2 pr-4">Código</th>
              <th className="py-2 pr-4">Precio Base</th>
              <th className="py-2 pr-4">Duración</th>
              <th className="py-2 pr-4">Activo</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {programas.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-fg-muted">No hay registros para mostrar</td></tr>}
            {programas.map(p => (
              <tr key={p.id} className="hover:bg-surface-2">
                <td className="py-2 pr-4 font-semibold text-fg">{p.name}</td>
                <td className="py-2 pr-4 text-fg-muted">{p.code || '—'}</td>
                <td className="py-2 pr-4 font-bold text-fg">{p.default_price ? `Gs ${fmt(p.default_price)}` : '—'}</td>
                <td className="py-2 pr-4 text-fg-muted">{p.default_duration_months ? `${p.default_duration_months} meses` : '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.active ? 'bg-success/15 text-success' : 'bg-surface-3 text-fg-muted'}`}>
                    {p.active ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="py-2">
                  <button onClick={() => eliminar(p.id)} className="text-danger hover:opacity-70 p-1"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-right text-[10px] text-fg-subtle">{programas.length} registros</div>
      </div>
    </div>
  );
}

function NuevoMiembroModal({ onClose, onGuardado }) {
  const [form, setForm] = useState({ name: '', role: 'Closer', email: '', phone: '', active: true, notes: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = 'h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-xs text-fg';
  const lbl = 'text-[10px] font-bold uppercase text-fg-subtle mb-0.5 block';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setGuardando(true); setError('');
    try {
      await financeApi.teamMembers.crear({
        ...form,
        active: form.active === true || form.active === 'true',
      });
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el miembro.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border p-5 flex items-start justify-between">
          <div>
            <h3 className="m-0 text-base font-bold text-fg">Nuevo miembro del equipo</h3>
            <p className="mt-0.5 text-[11px] text-fg-muted">Después podés crear sus reglas de comisión en la pestaña Comisiones.</p>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className={lbl}>Nombre *</label>
            <input required className={inp} value={form.name} onChange={e => setF('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Rol</label>
              <select className={inp} value={form.role} onChange={e => setF('role', e.target.value)}>
                <option value="Setter">Setter</option>
                <option value="Closer">Closer</option>
                <option value="Setter / Closer">Setter / Closer</option>
                <option value="Mentor">Mentor</option>
                <option value="Administración">Administración</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" className={inp} value={form.email} onChange={e => setF('email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Teléfono</label>
              <input type="tel" className={inp} value={form.phone} onChange={e => setF('phone', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Activo</label>
              <select className={inp} value={form.active} onChange={e => setF('active', e.target.value)}>
                <option value={true}>Sí</option>
                <option value={false}>No</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Notas</label>
            <textarea className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg h-20 resize-none" value={form.notes} onChange={e => setF('notes', e.target.value)} />
          </div>
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-border px-5 text-xs font-semibold text-fg hover:bg-surface-2">Cancelar</button>
            <button type="submit" disabled={guardando} className="h-10 rounded-md bg-primary px-6 text-xs font-semibold text-primary-fg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TabEquipo({ equipo, onRefrescar }) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar miembro?')) return;
    await financeApi.teamMembers.eliminar(id);
    onRefrescar();
  };

  return (
    <div>
      {modalAbierto && <NuevoMiembroModal onClose={() => setModalAbierto(false)} onGuardado={() => { setModalAbierto(false); onRefrescar(); }} />}

      <div className="mb-3 flex justify-end">
        <button onClick={() => setModalAbierto(true)} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg hover:bg-primary-hover">
          + Nuevo Miembro
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
            <tr>
              <th className="py-2 pr-4">Nombre</th>
              <th className="py-2 pr-4">Rol</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Teléfono</th>
              <th className="py-2 pr-4">Activo</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {equipo.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-fg-muted">No hay registros para mostrar</td></tr>}
            {equipo.map(m => (
              <tr key={m.id} className="hover:bg-surface-2">
                <td className="py-2 pr-4 font-semibold text-fg">{m.name}</td>
                <td className="py-2 pr-4 text-fg-muted">{m.role || '—'}</td>
                <td className="py-2 pr-4 text-fg-muted">{m.email || '—'}</td>
                <td className="py-2 pr-4 text-fg-muted">{m.phone || '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.active !== false ? 'bg-success/15 text-success' : 'bg-surface-3 text-fg-muted'}`}>
                    {m.active !== false ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="py-2">
                  <button onClick={() => eliminar(m.id)} className="text-danger hover:opacity-70 p-1"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-right text-[10px] text-fg-subtle">{equipo.length} registros</div>
      </div>
    </div>
  );
}

function TabComisiones({ equipo, onRefrescar }) {
  const [miembro, setMiembro] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }));

  const [pagos, setPagos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filtros, setFiltros] = useState({ page: 1, limit: 10, team_member_id: '', date_from: '', date_to: '' });
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await financeApi.teamPayments.buscar(filtros);
      setPagos(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v, page: 1 }));

  const crear = async (e) => {
    e.preventDefault();
    if (!miembro || !monto) return;
    await financeApi.teamPayments.crear({ team_member_id: miembro, amount: monto, paid_date: fecha });
    setMiembro(''); setMonto('');
    cargar();
    onRefrescar();
  };

  return (
    <div>
      <form onSubmit={crear} className="mb-4 flex gap-2 max-w-3xl">
        <select className={inputClass} value={miembro} onChange={e => setMiembro(e.target.value)}>
          <option value="">Seleccionar miembro...</option>
          {equipo.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="w-40"><MoneyInput placeholder="Monto a pagar" value={monto} onChange={setMonto} /></div>
        <input type="date" className={inputClass} value={fecha} onChange={e => setFecha(e.target.value)} />
        <button type="submit" className="shrink-0 h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg">+ Registrar Pago</button>
      </form>

      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <select className="h-8 rounded-md border border-border bg-surface-2 px-3 text-xs w-40" value={filtros.team_member_id} onChange={e => setF('team_member_id', e.target.value)}>
          <option value="">Todos los miembros</option>
          {equipo.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-fg-muted">Fecha</span>
          <input type="date" className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs" value={filtros.date_from} onChange={e => setF('date_from', e.target.value)} />
          <span className="text-[10px] text-fg-muted">-</span>
          <input type="date" className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs" value={filtros.date_to} onChange={e => setF('date_to', e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto relative min-h-[300px]">
        {cargando && <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center z-10"><span className="text-xs font-bold text-fg-muted animate-pulse">Cargando...</span></div>}
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
            <tr><th className="py-2">Fecha</th><th className="py-2">Miembro</th><th className="py-2">Monto</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pagos.length === 0 && !cargando && <tr><td colSpan={3} className="py-6 text-center text-fg-muted">No hay pagos registrados</td></tr>}
            {pagos.map(p => (
              <tr key={p.id} className="hover:bg-surface-2">
                <td className="py-2 text-fg-muted">{p.paid_date}</td>
                <td className="py-2 font-semibold text-fg">{p.TeamMember?.name || '—'}</td>
                <td className="py-2 font-bold text-success">Gs {fmt(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="text-[10px] text-fg-muted">Mostrando {pagos.length} de {total}</div>
          <div className="flex gap-1">
            <button disabled={filtros.page <= 1} onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))} className="h-7 rounded border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-50">Anterior</button>
            <span className="flex items-center px-2 text-xs font-bold">{filtros.page} / {pages}</span>
            <button disabled={filtros.page >= pages} onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))} className="h-7 rounded border border-border px-2 text-xs hover:bg-surface-2 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabAlertas({ dash }) {
  if (!dash) return null;
  const pendientes = dash.payments.filter(p => p.status !== 'Pagado' && p.due_date);
  pendientes.sort((a,b) => a.due_date.localeCompare(b.due_date));
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
          <tr><th className="py-2">Cuota</th><th className="py-2">Vencimiento</th><th className="py-2">Monto</th><th className="py-2">Estado Actual</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pendientes.map(p => {
            const esVencida = p.due_date < new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
            return (
              <tr key={p.id} className="hover:bg-surface-2">
                <td className="py-2 font-semibold text-fg">{p.label || `Cuota ${p.installment_number}`}</td>
                <td className="py-2 text-fg-muted">{p.due_date}</td>
                <td className="py-2 font-bold text-fg">Gs {fmt(p.amount)}</td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${esVencida ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>
                    {esVencida ? 'VENCIDA' : 'PENDIENTE'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
