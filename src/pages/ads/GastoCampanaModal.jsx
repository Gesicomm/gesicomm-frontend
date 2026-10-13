import { useEffect, useState } from 'react';
import { X, Wallet, Loader2 } from 'lucide-react';
import CurrencyInput from '../../components/CurrencyInput';
import { metaReportesService } from '../../services/metaReportesService';
import { formatPYG, formatNum, diasEntre, diaSiguiente } from './adsShared';

/**
 * Carga (o corrección) del gasto de una campaña en un rango de fechas.
 *
 * Es la única forma de registrar inversión en la sección: "del día X al
 * día Y gasté tanto". Cada registro se suma al total de la campaña. Los
 * rangos de una misma campaña no se pueden pisar — lo valida el backend y
 * acá solo se muestra su mensaje.
 */
export default function GastoCampanaModal({ open, campana, gastoEditar = null, onClose, onGuardado }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const esEdicion = Boolean(gastoEditar);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setGuardando(false);
    if (gastoEditar) {
      setDesde(gastoEditar.fecha_desde);
      setHasta(gastoEditar.fecha_hasta);
      setMonto(gastoEditar.monto);
      setNota(gastoEditar.nota || '');
    } else {
      // Lo habitual es cargar períodos seguidos: se arranca en el día
      // siguiente al último que ya tiene gasto.
      setDesde(diaSiguiente(campana?.gasto_ultimo_dia) || '');
      setHasta('');
      setMonto('');
      setNota('');
    }
  }, [open, gastoEditar, campana?.id, campana?.gasto_ultimo_dia]);

  if (!open || !campana) return null;

  const dias = diasEntre(desde, hasta);
  const montoNumero = Number(monto) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!desde || !hasta) { setError('Indicá el rango de fechas del gasto (desde y hasta).'); return; }
    if (hasta < desde) { setError('La fecha "hasta" no puede ser anterior a la fecha "desde".'); return; }
    if (montoNumero <= 0) { setError('El monto gastado tiene que ser mayor a cero.'); return; }

    setGuardando(true);
    setError(null);
    try {
      const payload = { fecha_desde: desde, fecha_hasta: hasta, monto: montoNumero, nota: nota.trim() || null };
      const guardado = esEdicion
        ? await metaReportesService.actualizarGasto(gastoEditar.id, payload)
        : await metaReportesService.crearGasto(campana.id, payload);
      onGuardado?.(guardado);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo guardar el gasto.');
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={guardando ? undefined : onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-border-strong bg-surface text-fg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="m-0 flex items-center gap-2 text-[1.05rem] font-semibold">
            <Wallet size={18} className="text-primary-text" /> {esEdicion ? 'Corregir gasto' : 'Cargar gasto'}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose} disabled={guardando} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5">
          <div>
            <p className="m-0 text-[0.7rem] font-medium uppercase tracking-wide text-fg-subtle">Campaña</p>
            <p className="m-0 mt-1 break-words text-sm font-semibold text-fg">{campana.nombre_display}</p>
            {!esEdicion && campana.gasto_total > 0 && (
              <p className="m-0 mt-1 text-xs text-fg-muted">
                Llevás cargado {formatPYG(campana.gasto_total)}. Lo que cargues ahora se suma.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
              Desde
              <input
                type="date"
                className="filter-input"
                style={{ maxWidth: 'none' }}
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
              Hasta
              <input
                type="date"
                className="filter-input"
                style={{ maxWidth: 'none' }}
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
            Cuánto gastaste en ese rango
            <CurrencyInput
              className="filter-input"
              style={{ maxWidth: 'none', fontSize: '1rem' }}
              value={monto}
              onChange={setMonto}
              aria-label="Monto gastado"
            />
            {dias > 0 && montoNumero > 0 && (
              <span className="text-[0.72rem] text-fg-subtle">
                {formatNum(dias)} {dias === 1 ? 'día' : 'días'} · {formatPYG(montoNumero / dias)} por día
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
            Nota (opcional)
            <input
              type="text"
              className="filter-input"
              style={{ maxWidth: 'none' }}
              value={nota}
              maxLength={500}
              placeholder="Ej.: subí el presupuesto el jueves"
              onChange={(e) => setNota(e.target.value)}
            />
          </label>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[0.82rem] text-danger" role="alert">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando
                ? <Loader2 size={16} className="animate-spin" />
                : (esEdicion ? 'Guardar cambios' : 'Cargar gasto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
