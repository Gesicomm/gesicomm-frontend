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
      setEquipo(e.filter(m => m.role === 'Closer')); // Solo Closers
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
          {tab === 'ALUMNOS' && <TabAlumnos dash={dash} />}
          {tab === 'PAGOS' && <TabPagos dash={dash} />}
          {tab === 'GASTOS' && <TabGastos dash={dash} onRefrescar={cargar} />}
          {tab === 'PROGRAMAS' && <TabProgramas programas={programas} onRefrescar={cargar} />}
          {tab === 'EQUIPO' && <TabEquipo equipo={equipo} onRefrescar={cargar} />}
          {tab === 'COMISIONES' && <TabComisiones dash={dash} equipo={equipo} onRefrescar={cargar} />}
          {tab === 'ALERTAS' && <TabAlertas dash={dash} />}
        </div>
      </div>
    </div>
  );
}

function TabAlumnos({ dash }) {
  if (!dash) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
          <tr><th className="py-2">Nombre</th><th className="py-2">Venta</th><th className="py-2">Precio</th><th className="py-2">Estado</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dash.students.map(s => (
            <tr key={s.id} className="hover:bg-surface-2">
              <td className="py-2 font-semibold text-fg">{s.name}</td>
              <td className="py-2 text-fg-muted">{s.sale_date}</td>
              <td className="py-2 font-bold text-fg">Gs {fmt(s.negotiated_price)}</td>
              <td className="py-2"><span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] text-fg-muted">{s.student_status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabPagos({ dash }) {
  if (!dash) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
          <tr><th className="py-2">Cuota</th><th className="py-2">Vencimiento</th><th className="py-2">Monto</th><th className="py-2">Estado</th><th className="py-2">Fecha Pago</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dash.payments.map(p => (
            <tr key={p.id} className="hover:bg-surface-2">
              <td className="py-2 font-semibold text-fg">{p.label || `Cuota ${p.installment_number}`}</td>
              <td className="py-2 text-fg-muted">{p.due_date}</td>
              <td className="py-2 font-bold text-fg">Gs {fmt(p.amount)}</td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === 'Pagado' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                  {p.status}
                </span>
              </td>
              <td className="py-2 text-fg-muted">{p.paid_date || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabGastos({ dash, onRefrescar }) {
  const [desc, setDesc] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }));

  const crear = async (e) => {
    e.preventDefault();
    if (!desc || !monto) return;
    await financeApi.expenses.crear({ description: desc, amount: monto, expense_date: fecha });
    setDesc(''); setMonto('');
    onRefrescar();
  };

  return (
    <div>
      <form onSubmit={crear} className="mb-4 flex gap-2 max-w-2xl">
        <input className={inputClass} placeholder="Descripción..." value={desc} onChange={e => setDesc(e.target.value)} />
        <input type="number" className={inputClass} placeholder="Monto" value={monto} onChange={e => setMonto(e.target.value)} />
        <input type="date" className={inputClass} value={fecha} onChange={e => setFecha(e.target.value)} />
        <button type="submit" className="shrink-0 h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg">+ Gasto</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
            <tr><th className="py-2">Fecha</th><th className="py-2">Descripción</th><th className="py-2">Monto</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dash?.expenses.map(g => (
              <tr key={g.id} className="hover:bg-surface-2">
                <td className="py-2 text-fg-muted">{g.expense_date}</td>
                <td className="py-2 font-semibold text-fg">{g.description}</td>
                <td className="py-2 font-bold text-danger">Gs {fmt(g.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabProgramas({ programas, onRefrescar }) {
  const [nombre, setNombre] = useState('');
  const crear = async (e) => {
    e.preventDefault();
    if (!nombre) return;
    await financeApi.programs.crear({ name: nombre });
    setNombre('');
    onRefrescar();
  };
  const eliminar = async (id) => {
    if(!confirm('¿Eliminar programa?')) return;
    await financeApi.programs.eliminar(id);
    onRefrescar();
  };

  return (
    <div>
      <form onSubmit={crear} className="mb-4 flex gap-2 max-w-sm">
        <input className={inputClass} placeholder="Nombre del programa" value={nombre} onChange={e => setNombre(e.target.value)} />
        <button type="submit" className="shrink-0 h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg">+ Programa</button>
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {programas.map(p => (
          <div key={p.id} className="flex justify-between items-center border border-border rounded-md p-3">
            <span className="font-semibold text-sm">{p.name}</span>
            <button onClick={() => eliminar(p.id)} className="text-danger hover:opacity-70"><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabEquipo({ equipo, onRefrescar }) {
  const [nombre, setNombre] = useState('');
  const crear = async (e) => {
    e.preventDefault();
    if (!nombre) return;
    await financeApi.teamMembers.crear({ name: nombre, role: 'Closer' });
    setNombre('');
    onRefrescar();
  };
  const eliminar = async (id) => {
    if(!confirm('¿Eliminar closer?')) return;
    await financeApi.teamMembers.eliminar(id);
    onRefrescar();
  };

  return (
    <div>
      <p className="text-xs text-fg-muted mb-3">Solamente se administran miembros con rol <strong>Closer</strong>.</p>
      <form onSubmit={crear} className="mb-4 flex gap-2 max-w-sm">
        <input className={inputClass} placeholder="Nombre del closer" value={nombre} onChange={e => setNombre(e.target.value)} />
        <button type="submit" className="shrink-0 h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg">+ Closer</button>
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {equipo.map(p => (
          <div key={p.id} className="flex justify-between items-center border border-border rounded-md p-3">
            <div>
              <span className="font-semibold text-sm block">{p.name}</span>
              <span className="text-[10px] text-fg-muted">{p.role}</span>
            </div>
            <button onClick={() => eliminar(p.id)} className="text-danger hover:opacity-70"><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabComisiones({ dash, equipo, onRefrescar }) {
  const [miembro, setMiembro] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }));

  const crear = async (e) => {
    e.preventDefault();
    if (!miembro || !monto) return;
    await financeApi.teamPayments.crear({ team_member_id: miembro, amount: monto, paid_date: fecha });
    setMiembro(''); setMonto('');
    onRefrescar();
  };

  return (
    <div>
      <form onSubmit={crear} className="mb-4 flex gap-2 max-w-3xl">
        <select className={inputClass} value={miembro} onChange={e => setMiembro(e.target.value)}>
          <option value="">Seleccionar closer...</option>
          {equipo.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input type="number" className={inputClass} placeholder="Monto a pagar" value={monto} onChange={e => setMonto(e.target.value)} />
        <input type="date" className={inputClass} value={fecha} onChange={e => setFecha(e.target.value)} />
        <button type="submit" className="shrink-0 h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg">+ Registrar Pago</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-fg-subtle">
            <tr><th className="py-2">Fecha</th><th className="py-2">Closer</th><th className="py-2">Monto</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dash?.teamPayments.map(p => (
              <tr key={p.id} className="hover:bg-surface-2">
                <td className="py-2 text-fg-muted">{p.paid_date}</td>
                <td className="py-2 font-semibold text-fg">{equipo.find(m => m.id === p.team_member_id)?.name || 'Desconocido'}</td>
                <td className="py-2 font-bold text-primary">Gs {fmt(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
