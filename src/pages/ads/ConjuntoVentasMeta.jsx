import { useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { metaReportesService } from '../../services/metaReportesService';

const vacio = { fecha_desde: '', fecha_hasta: '', compras: '', valor: '', moneda: 'PYG', atribucion: '' };

export default function ConjuntoVentasMeta({ campanaId, conjunto, registros, pedidosWeb = 0, onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const cambiar = (campo, valor) => setForm(actual => ({ ...actual, [campo]: valor }));
  const total = registros.reduce((suma, fila) => suma + Number(fila.compras || 0), 0);

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const registro = await metaReportesService.guardarVentasConjunto(campanaId, conjunto.id, {
        ...form, compras: Number(form.compras), valor: form.valor === '' ? null : Number(form.valor),
      });
      onCambio(registro);
      setForm(vacio);
      setAbierto(false);
    } catch (err) { setError(err.response?.data?.message || 'No pudimos guardar las compras de Meta.'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (registro) => {
    if (!window.confirm('¿Eliminar este registro de compras atribuidas por Meta?')) return;
    setGuardando(true);
    setError('');
    try {
      await metaReportesService.eliminarVentasConjunto(campanaId, registro.id);
      onCambio(null, registro.id);
    } catch (err) { setError(err.response?.data?.message || 'No pudimos eliminar el registro.'); }
    finally { setGuardando(false); }
  };

  return <div className="ads-meta-sales">
    <p className="ads-web-tracked">Pedidos web con enlace etiquetado para este conjunto: <strong>{pedidosWeb}</strong>. Se cuentan por los IDs guardados en el enlace, nunca por el producto.</p>
    <div className="ads-meta-sales-heading">
      <div><strong>Compras atribuidas por Meta</strong><span>{total} en {registros.length} {registros.length === 1 ? 'período' : 'períodos'}</span></div>
      <button type="button" className="btn-secondary" onClick={() => setAbierto(valor => !valor)}>{abierto ? 'Cerrar' : 'Cargar ventas'}</button>
    </div>
    {registros.map(registro => <div className="ads-meta-sales-row" key={registro.id}>
      <span>{registro.fecha_desde} al {registro.fecha_hasta}: <strong>{registro.compras} compras</strong>{registro.valor != null ? ` · ${registro.moneda || ''} ${new Intl.NumberFormat('es-PY').format(Number(registro.valor))}` : ''}{registro.atribucion ? ` · ${registro.atribucion}` : ''}</span>
      <div>
        <button type="button" onClick={() => { setForm({ fecha_desde: registro.fecha_desde, fecha_hasta: registro.fecha_hasta, compras: String(registro.compras), valor: registro.valor == null ? '' : String(registro.valor), moneda: registro.moneda || 'PYG', atribucion: registro.atribucion || '' }); setAbierto(true); }}>Corregir</button>
        <button type="button" disabled={guardando} onClick={() => eliminar(registro)}>Eliminar</button>
      </div>
    </div>)}
    {abierto && <form className="ads-meta-sales-form" onSubmit={guardar}>
      <p>Copiá las compras que Meta atribuye a este conjunto para el período elegido. Son métricas de Meta, no pedidos confirmados de Gesicom.</p>
      <label className="ads-form-field">Desde<input type="date" required value={form.fecha_desde} onChange={e => cambiar('fecha_desde', e.target.value)} /></label>
      <label className="ads-form-field">Hasta<input type="date" required value={form.fecha_hasta} onChange={e => cambiar('fecha_hasta', e.target.value)} /></label>
      <label className="ads-form-field">Compras<input type="number" min="0" step="1" required value={form.compras} onChange={e => cambiar('compras', e.target.value)} /></label>
      <label className="ads-form-field">Valor de compras (opcional)<NumericFormat value={form.valor} valueIsNumericString thousandSeparator="." decimalSeparator="," decimalScale={2} allowNegative={false} inputMode="decimal" onValueChange={({ value }) => cambiar('valor', value)} /></label>
      {form.valor !== '' && <label className="ads-form-field">Moneda<input maxLength={3} value={form.moneda} onChange={e => cambiar('moneda', e.target.value.toUpperCase())} placeholder="PYG" /></label>}
      <label className="ads-form-field">Atribución mostrada por Meta (opcional)<input maxLength={100} value={form.atribucion} onChange={e => cambiar('atribucion', e.target.value)} placeholder="Ej.: 7 días clic, 1 día vista" /></label>
      {error && <p role="alert" className="ads-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar compras'}</button>
    </form>}
    {!abierto && error && <p role="alert" className="ads-error">{error}</p>}
  </div>;
}
