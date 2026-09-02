import React, { useEffect, useState, useCallback } from 'react';
import { Bot, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { financeApi } from '../../services/automationHubApi';

const inputClass = 'h-9 w-full rounded-md border border-border bg-surface-2 px-2 text-xs text-fg';
const fmt = (v) => Number(v || 0).toLocaleString('es-PY');

function Kpi({ label, value, tono = 'text-fg' }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-[10px] font-semibold uppercase text-fg-subtle">{label}</div>
      <div className={`mt-1 text-xl font-bold ${tono}`}>{value}</div>
    </div>
  );
}

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'alumnos', label: 'Métricas (alumnos)' },
  { id: 'costos', label: 'Costos' },
  { id: 'roi', label: 'ROI' },
  { id: 'config', label: '⚙ Configuración' },
];

export default function FinanzasAutomatizacion() {
  const [tab, setTab] = useState('resumen');
  const [mes, setMes] = useState('');
  const [dash, setDash] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [d, p, e] = await Promise.all([
        financeApi.dashboard(mes ? { month: mes } : {}),
        financeApi.programs.listar(),
        financeApi.teamMembers.listar(),
      ]);
      setDash(d);
      setProgramas(p);
      setEquipo(e);
    } catch (err) {
      setError('No se pudo cargar la información financiera de automatización.');
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando && !dash) return <div className="p-8 text-center text-sm text-fg-muted">Cargando...</div>;

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-fg">
            <Bot className="text-primary-text" size={24} /> Finanzas · Automatización
          </h1>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            Ingresos, costos y ROI generados por el programa de contenido — alumnos, comisiones y gastos asociados.
          </p>
        </div>
        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)}
          className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" />
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-md border px-4 py-2 text-xs font-semibold transition-colors ${tab === t.id ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg-muted hover:bg-surface-2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

      {dash && tab === 'resumen' && <TabResumen dash={dash} />}
      {dash && tab === 'alumnos' && <TabAlumnos dash={dash} programas={programas} equipo={equipo} onRefrescar={cargar} />}
      {dash && tab === 'costos' && <TabCostos dash={dash} equipo={equipo} onRefrescar={cargar} />}
      {dash && tab === 'roi' && <TabRoi dash={dash} />}
      {tab === 'config' && <TabConfig programas={programas} equipo={equipo} onRefrescar={cargar} />}
    </div>
  );
}

function TabResumen({ dash }) {
  const { metrics } = dash;
  const chartData = [
    { name: 'Vendido', valor: metrics.totalSold, fill: 'var(--color-primary)' },
    { name: 'Cobrado', valor: metrics.totalPaid, fill: 'var(--color-success)' },
    { name: 'Gastos', valor: metrics.totalExpenses, fill: 'var(--color-warning)' },
    { name: 'Comisiones', valor: metrics.totalTeamPayments, fill: 'var(--color-danger)' },
    { name: 'Beneficio', valor: metrics.profit, fill: metrics.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Vendido" value={fmt(metrics.totalSold)} />
        <Kpi label="Cobrado" value={fmt(metrics.totalPaid)} tono="text-success" />
        <Kpi label="Pendiente" value={fmt(metrics.totalPending)} tono="text-warning" />
        <Kpi label="Beneficio neto" value={fmt(metrics.profit)} tono={metrics.profit >= 0 ? 'text-success' : 'text-danger'} />
        <Kpi label="Alumnos" value={metrics.students} />
        <Kpi label="Activos" value={metrics.activeStudents} />
        <Kpi label="Gastos" value={fmt(metrics.totalExpenses)} />
        <Kpi label="Comisiones pagadas" value={fmt(metrics.totalTeamPayments)} />
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 text-xs font-semibold text-fg">Ingresos, costos y beneficio</div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-fg-muted)' }} stroke="var(--color-border)" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-fg-muted)' }} stroke="var(--color-border)" tickFormatter={(v) => fmt(v)} />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-2)', opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-fg)',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}
                itemStyle={{ color: 'var(--color-fg)', fontWeight: 600 }}
                labelStyle={{ color: 'var(--color-fg-muted)', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}
                formatter={(value) => [`${fmt(value)} Gs`, 'Monto']}
              />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TabAlumnos({ dash, programas, equipo, onRefrescar }) {
  const [form, setForm] = useState({ name: '', program_id: '', sale_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }), negotiated_price: '', closer_id: '', tracking_code: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.negotiated_price) {
      setError('El nombre y el precio negociado son obligatorios.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const precio = Number(form.negotiated_price);
      await financeApi.students.crear({
        student: { ...form, negotiated_price: precio, program_id: form.program_id || null, closer_id: form.closer_id || null, tracking_code: form.tracking_code || null },
        installments: [{ label: 'Pago único', amount: precio, due_date: form.sale_date }],
      });
      setForm({ name: '', program_id: '', sale_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }), negotiated_price: '', closer_id: '', tracking_code: '' });
      onRefrescar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el alumno.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este alumno y sus pagos?')) return;
    await financeApi.students.eliminar(id);
    onRefrescar();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <form onSubmit={handleCrear} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 lg:col-span-1">
        <div className="mb-1 text-xs font-semibold text-fg">Nuevo alumno / venta</div>
        <input className={inputClass} placeholder="Nombre *" value={form.name} onChange={set('name')} />
        <select className={inputClass} value={form.program_id} onChange={set('program_id')}>
          <option value="">Sin programa</option>
          {programas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" className={inputClass} value={form.sale_date} onChange={set('sale_date')} />
        <input type="number" step="0.01" className={inputClass} placeholder="Precio negociado *" value={form.negotiated_price} onChange={set('negotiated_price')} />
        <select className={inputClass} value={form.closer_id} onChange={set('closer_id')}>
          <option value="">Sin closer</option>
          {equipo.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input className={inputClass} placeholder="Código de tracking (opcional)" value={form.tracking_code} onChange={set('tracking_code')} />
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">{error}</div>}
        <button type="submit" disabled={guardando} className="mt-1 flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-semibold text-primary-fg disabled:opacity-60">
          <Plus size={14} /> Agregar
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface lg:col-span-2">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-fg-subtle">
              <th className="p-3">Alumno</th>
              <th className="p-3">Programa</th>
              <th className="p-3">Vendido</th>
              <th className="p-3">Estado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {dash.students.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="p-3 font-semibold text-fg">{s.name}</td>
                <td className="p-3 text-fg-muted">{programas.find((p) => p.id === s.program_id)?.name || '—'}</td>
                <td className="p-3 text-fg">{fmt(s.negotiated_price)}</td>
                <td className="p-3 text-fg-muted">{s.student_status}</td>
                <td className="p-3 text-right">
                  <button type="button" onClick={() => handleEliminar(s.id)} className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger/10">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {!dash.students.length && (
              <tr><td colSpan={5} className="p-6 text-center text-fg-muted">No hay alumnos en este período.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabCostos({ dash, equipo, onRefrescar }) {
  const [gasto, setGasto] = useState({ expense_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }), category: '', description: '', expense_type: 'Fijo', amount: '' });
  const [comision, setComision] = useState({ team_member_id: '', amount: '', paid_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }), notes: '' });
  const [error, setError] = useState('');

  const crearGasto = async (e) => {
    e.preventDefault();
    if (!gasto.amount) return;
    try {
      await financeApi.expenses.crear({ ...gasto, amount: Number(gasto.amount) });
      setGasto({ expense_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }), category: '', description: '', expense_type: 'Fijo', amount: '' });
      onRefrescar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el gasto.');
    }
  };

  const crearComision = async (e) => {
    e.preventDefault();
    if (!comision.team_member_id || !comision.amount) return;
    try {
      await financeApi.teamPayments.crear({ ...comision, amount: Number(comision.amount) });
      setComision({ team_member_id: '', amount: '', paid_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }), notes: '' });
      onRefrescar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar la comisión.');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 text-xs font-semibold text-fg">Gastos del programa</div>
        <form onSubmit={crearGasto} className="mb-3 grid grid-cols-2 gap-2">
          <input type="date" className={inputClass} value={gasto.expense_date} onChange={(e) => setGasto((g) => ({ ...g, expense_date: e.target.value }))} />
          <input className={inputClass} placeholder="Categoría" value={gasto.category} onChange={(e) => setGasto((g) => ({ ...g, category: e.target.value }))} />
          <input className={`${inputClass} col-span-2`} placeholder="Descripción" value={gasto.description} onChange={(e) => setGasto((g) => ({ ...g, description: e.target.value }))} />
          <input type="number" step="0.01" className={inputClass} placeholder="Monto" value={gasto.amount} onChange={(e) => setGasto((g) => ({ ...g, amount: e.target.value }))} />
          <button type="submit" className="h-9 rounded-md bg-primary text-xs font-semibold text-primary-fg">Agregar gasto</button>
        </form>
        <div className="flex flex-col gap-1.5">
          {dash.expenses.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-[11px]">
              <span className="text-fg-muted">{g.expense_date} · {g.category || 'Sin categoría'}</span>
              <span className="font-semibold text-fg">{fmt(g.amount)}</span>
            </div>
          ))}
          {!dash.expenses.length && <div className="text-[11px] text-fg-muted">Sin gastos en este período.</div>}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 text-xs font-semibold text-fg">Comisiones pagadas al equipo</div>
        <form onSubmit={crearComision} className="mb-3 grid grid-cols-2 gap-2">
          <select className={`${inputClass} col-span-2`} value={comision.team_member_id} onChange={(e) => setComision((c) => ({ ...c, team_member_id: e.target.value }))}>
            <option value="">Seleccionar persona...</option>
            {equipo.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
          <input type="date" className={inputClass} value={comision.paid_date} onChange={(e) => setComision((c) => ({ ...c, paid_date: e.target.value }))} />
          <input type="number" step="0.01" className={inputClass} placeholder="Monto" value={comision.amount} onChange={(e) => setComision((c) => ({ ...c, amount: e.target.value }))} />
          <button type="submit" className="col-span-2 h-9 rounded-md bg-primary text-xs font-semibold text-primary-fg">Registrar pago</button>
        </form>
        <div className="flex flex-col gap-1.5">
          {dash.teamPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-[11px]">
              <span className="text-fg-muted">{p.paid_date} · {equipo.find((m) => m.id === p.team_member_id)?.name || '—'}</span>
              <span className="font-semibold text-fg">{fmt(p.amount)}</span>
            </div>
          ))}
          {!dash.teamPayments.length && <div className="text-[11px] text-fg-muted">Sin comisiones pagadas en este período.</div>}
        </div>
      </div>
      {error && <div className="lg:col-span-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
    </div>
  );
}

function TabRoi({ dash }) {
  const { metrics } = dash;
  const costos = metrics.totalExpenses + metrics.totalTeamPayments;
  const roiPct = metrics.roi !== null ? Math.round(metrics.roi * 100) : null;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Kpi label="Ingreso atribuido (cobrado)" value={fmt(metrics.totalPaid)} tono="text-success" />
      <Kpi label="Costos (gastos + comisiones)" value={fmt(costos)} tono="text-danger" />
      <Kpi label="ROI" value={roiPct === null ? '—' : `${roiPct}%`} tono={roiPct >= 0 ? 'text-success' : 'text-danger'} />
      <div className="rounded-lg border border-border bg-surface p-4 md:col-span-3">
        <p className="m-0 text-xs text-fg-muted">
          ROI = (cobrado − gastos − comisiones) / (gastos + comisiones). Con costos en cero no se puede calcular un porcentaje (división por cero) — cargá gastos o comisiones para verlo.
        </p>
      </div>
    </div>
  );
}

function TabConfig({ programas, equipo, onRefrescar }) {
  const [nombreProg, setNombreProg] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [rolEquipo, setRolEquipo] = useState('Closer');
  const [guardandoProg, setGuardandoProg] = useState(false);
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);

  const crearPrograma = async (e) => {
    e.preventDefault();
    if (!nombreProg.trim()) return;
    setGuardandoProg(true);
    try {
      await financeApi.programs.crear({ name: nombreProg.trim() });
      setNombreProg('');
      onRefrescar();
    } finally {
      setGuardandoProg(false);
    }
  };

  const eliminarPrograma = async (id) => {
    if (!confirm('¿Eliminar este programa?')) return;
    await financeApi.programs.eliminar(id);
    onRefrescar();
  };

  const crearEquipo = async (e) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) return;
    setGuardandoEquipo(true);
    try {
      await financeApi.teamMembers.crear({ name: nombreEquipo.trim(), role: rolEquipo });
      setNombreEquipo('');
      onRefrescar();
    } finally {
      setGuardandoEquipo(false);
    }
  };

  const eliminarEquipo = async (id) => {
    if (!confirm('¿Eliminar este miembro del equipo?')) return;
    await financeApi.teamMembers.eliminar(id);
    onRefrescar();
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

      {/* Programas */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-1 text-sm font-bold text-fg">Programas / Productos</div>
        <p className="mb-4 text-[11px] text-fg-muted">
          Etiquetas para clasificar tus ventas. Ej: "Mentoring 1:1", "Curso de Contenido", "Pack Consultoría". Aparecen como opción al registrar un alumno.
        </p>
        <form onSubmit={crearPrograma} className="mb-4 flex gap-2">
          <input
            className={`${inputClass} flex-1`}
            placeholder="Nombre del programa *"
            value={nombreProg}
            onChange={(e) => setNombreProg(e.target.value)}
          />
          <button type="submit" disabled={guardandoProg} className="h-9 shrink-0 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg disabled:opacity-60">
            + Agregar
          </button>
        </form>
        <div className="flex flex-col gap-1.5">
          {programas.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 text-xs">
              <span className="font-semibold text-fg">{p.name}</span>
              <button type="button" onClick={() => eliminarPrograma(p.id)} className="text-danger hover:text-danger/70">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {!programas.length && <div className="text-[11px] text-fg-muted">Ningún programa creado todavía.</div>}
        </div>
      </div>

      {/* Equipo */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-1 text-sm font-bold text-fg">Equipo de ventas</div>
        <p className="mb-4 text-[11px] text-fg-muted">
          Las personas de tu equipo (setters, closers). Aparecen al registrar un alumno para atribuirle la venta y calcular comisiones.
        </p>
        <form onSubmit={crearEquipo} className="mb-4 flex gap-2">
          <input
            className={`${inputClass} flex-1`}
            placeholder="Nombre *"
            value={nombreEquipo}
            onChange={(e) => setNombreEquipo(e.target.value)}
          />
          <select className="h-9 rounded-md border border-border bg-surface-2 px-2 text-xs text-fg" value={rolEquipo} onChange={(e) => setRolEquipo(e.target.value)}>
            <option>Closer</option>
            <option>Setter</option>
            <option>Admin</option>
          </select>
          <button type="submit" disabled={guardandoEquipo} className="h-9 shrink-0 rounded-md bg-primary px-4 text-xs font-semibold text-primary-fg disabled:opacity-60">
            + Agregar
          </button>
        </form>
        <div className="flex flex-col gap-1.5">
          {equipo.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 text-xs">
              <div>
                <span className="font-semibold text-fg">{m.name}</span>
                <span className="ml-2 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] text-fg-muted">{m.role}</span>
              </div>
              <button type="button" onClick={() => eliminarEquipo(m.id)} className="text-danger hover:text-danger/70">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {!equipo.length && <div className="text-[11px] text-fg-muted">Ningún miembro del equipo creado todavía.</div>}
        </div>
      </div>

    </div>
  );
}
