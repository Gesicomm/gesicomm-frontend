import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowDown, ArrowUp, ChevronsUpDown, Copy, Check, MessageCircle, Globe,
  Edit2, Trash2, Plus, Wallet,
} from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import GastoCampanaModal from './GastoCampanaModal';
import {
  formatPYG, formatNum, formatFecha, formatFechaHora, formatRango,
  alternarOrden, BADGE_ESTADO, FILAS_POR_PAGINA,
} from './adsShared';
import { TarjetaKpi, EstadoVacio, Paginacion } from './adsUI';

/**
 * Histórico de gasto de una campaña: cada rango de fechas cargado, con su
 * monto, y el total acumulado.
 *
 * La tabla se pagina y ordena en el backend. El resumen de arriba (y el
 * total del pie) es el de TODA la campaña, no el de la página visible.
 */
export default function AdsCampanaHistorial({ campana, onVolver, onEditar, onCambio }) {
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ campo: 'fecha_desde', direccion: 'DESC' });
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [gastoEditar, setGastoEditar] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    return metaReportesService.listarGastos(campana.id, { pagina, limite: FILAS_POR_PAGINA, orden })
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.message || err.message || 'No se pudo cargar el histórico.'))
      .finally(() => setCargando(false));
  }, [campana.id, pagina, orden]);

  useEffect(() => { cargar(); }, [cargar]);

  const alGuardar = () => {
    cargar();
    onCambio?.();
  };

  const eliminar = async (gasto) => {
    const rango = formatRango(gasto.fecha_desde, gasto.fecha_hasta);
    if (!window.confirm(`¿Eliminar el gasto de ${formatPYG(gasto.monto)} (${rango})? Se descuenta del total de la campaña.`)) return;
    try {
      await metaReportesService.eliminarGasto(gasto.id);
      // Si se borró el único registro de la última página, esa página ya no existe.
      if (datos?.gastos.length === 1 && pagina > 1) setPagina(pagina - 1);
      else cargar();
      onCambio?.();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'No se pudo eliminar el gasto.');
    }
  };

  const ordenarPor = (campo) => {
    setOrden((actual) => alternarOrden(actual, campo));
    setPagina(1);
  };

  const copiarNombre = () => {
    navigator.clipboard.writeText(campana.nombre_interno).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    });
  };

  const abrirCarga = (gasto = null) => { setGastoEditar(gasto); setModalAbierto(true); };

  const badge = BADGE_ESTADO[campana.estado] || BADGE_ESTADO.borrador;
  const resumen = datos?.resumen;
  const gastos = datos?.gastos || [];
  const sinGasto = !cargando && !error && (resumen?.registros || 0) === 0;

  const encabezadoOrdenable = (campo, label) => {
    const activa = orden.campo === campo;
    const Icono = !activa ? ChevronsUpDown : (orden.direccion === 'ASC' ? ArrowUp : ArrowDown);
    return (
      <button
        type="button"
        onClick={() => ordenarPor(campo)}
        className={`inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-inherit ${activa ? 'text-fg' : 'hover:text-fg'}`}
        // Un <button> no hereda la tipografía del <th>: sin esto el
        // encabezado ordenable se ve distinto al resto.
        style={{ font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit' }}
        title={`Ordenar por ${label.toLowerCase()}`}
      >
        {label}
        <Icono size={11} className={activa ? '' : 'opacity-40'} />
      </button>
    );
  };

  return (
    <div className="ads-history flex flex-col gap-4">
      {/* ---- Encabezado ---- */}
      <div>
        <button type="button" onClick={onVolver} className="mb-2 inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-xs text-fg-muted hover:text-fg">
          <ArrowLeft size={14} /> Campañas
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {campana.tipo === 'whatsapp'
                ? <MessageCircle size={18} color="var(--color-success)" />
                : <Globe size={18} color="var(--color-primary-text)" />}
              <h2 className="m-0 text-base font-semibold text-fg">{campana.productos?.map(p => p.nombre).join(', ') || campana.nombre_display}</h2>
              <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <code className="text-[0.74rem] text-fg-muted">{campana.nombre_interno}</code>
                <button
                  type="button"
                  onClick={copiarNombre}
                  className="cursor-pointer border-none bg-transparent p-0.5 text-fg-muted hover:text-fg"
                  title="Copiar nombre para Meta Ads Manager"
                >
                  {copiado ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                </button>
              </span>
              {(campana.productos || []).length > 0 && (
                <span className="text-[0.74rem] text-fg-muted">
                  {campana.productos.map((p) => p.nombre).join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => onEditar(campana)}>
              <Edit2 size={14} style={{ marginRight: '0.3rem' }} /> Editar campaña
            </button>
            <button type="button" className="btn-primary" onClick={() => abrirCarga()}>
              <Plus size={16} style={{ marginRight: '0.35rem' }} /> Cargar gasto
            </button>
          </div>
        </div>
      </div>

      {/* ---- Resumen de toda la campaña ---- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaKpi
          label="Total gastado"
          valor={formatPYG(resumen?.total_gastado)}
          hint={resumen ? `${formatNum(resumen.registros)} ${resumen.registros === 1 ? 'registro' : 'registros'}` : null}
          cargando={cargando && !datos}
        />
        <TarjetaKpi
          label="Días cargados"
          valor={formatNum(resumen?.dias_cargados)}
          hint={resumen?.primer_dia ? `${formatFecha(resumen.primer_dia)} → ${formatFecha(resumen.ultimo_dia)}` : 'sin gasto cargado'}
          cargando={cargando && !datos}
        />
        <TarjetaKpi
          label="Promedio por día"
          valor={formatPYG(resumen?.promedio_diario)}
          hint="sobre los días cargados"
          cargando={cargando && !datos}
        />
      </div>

      {/* ---- Registros ---- */}
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {error}{' '}
          <button type="button" onClick={cargar} className="cursor-pointer border-none bg-transparent p-0 text-inherit underline">Reintentar</button>
        </div>
      ) : sinGasto ? (
        <EstadoVacio
          icono={Wallet}
          titulo="Todavía no cargaste gasto en esta campaña"
          descripcion="Elegí un rango de fechas y poné cuánto gastaste. Cada registro que cargues se suma al total de la campaña."
        >
          <button type="button" className="btn-primary mt-1" onClick={() => abrirCarga()}>
            <Plus size={16} style={{ marginRight: '0.35rem' }} /> Cargar gasto
          </button>
        </EstadoVacio>
      ) : (
        <div className="data-table-wrapper">
          <div className="table-scroll-container">
            <table className="escalafy-table">
              <thead>
                <tr>
                  <th>{encabezadoOrdenable('fecha_desde', 'Período')}</th>
                  <th className="text-right">Días</th>
                  <th className="text-right">{encabezadoOrdenable('monto', 'Gastado')}</th>
                  <th className="text-right">Por día</th>
                  <th>Nota</th>
                  <th>{encabezadoOrdenable('created_at', 'Cargado el')}</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando && !datos ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`sk-${i}`}><td colSpan={7} style={{ padding: '1rem' }}><div className="skeleton-row" style={{ width: '100%' }} /></td></tr>
                  ))
                ) : gastos.map((g) => (
                  <tr key={g.id}>
                    <td className="whitespace-nowrap font-medium text-fg">{formatRango(g.fecha_desde, g.fecha_hasta)}</td>
                    <td className="text-right tabular-nums">{formatNum(g.dias)}</td>
                    <td className="text-right font-semibold tabular-nums text-fg">{formatPYG(g.monto)}</td>
                    <td className="text-right tabular-nums text-fg-muted">{formatPYG(g.promedio_diario)}</td>
                    <td className="max-w-[16rem] text-xs text-fg-muted">{g.nota || '—'}</td>
                    <td className="whitespace-nowrap text-xs text-fg-muted">{formatFechaHora(g.created_at)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className="btn-icon" title="Corregir" onClick={() => abrirCarga(g)}>
                          <Edit2 size={15} />
                        </button>
                        <button type="button" className="btn-icon danger" title="Eliminar" onClick={() => eliminar(g)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {resumen && (
                <tfoot>
                  <tr>
                    <td className="font-semibold text-fg">Total de la campaña</td>
                    <td className="text-right font-semibold tabular-nums text-fg">{formatNum(resumen.dias_cargados)}</td>
                    <td className="text-right font-semibold tabular-nums text-fg">{formatPYG(resumen.total_gastado)}</td>
                    <td className="text-right tabular-nums text-fg-muted">{formatPYG(resumen.promedio_diario)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {(datos?.total_paginas || 1) > 1 && (
            <Paginacion
              pagina={pagina}
              totalPaginas={datos.total_paginas}
              etiqueta={`${formatNum(datos.total)} registros`}
              cargando={cargando}
              onCambio={setPagina}
            />
          )}
        </div>
      )}

      <GastoCampanaModal
        open={modalAbierto}
        campana={{ ...campana, gasto_total: resumen?.total_gastado ?? campana.gasto_total, gasto_ultimo_dia: resumen?.ultimo_dia ?? campana.gasto_ultimo_dia }}
        gastoEditar={gastoEditar}
        onClose={() => { setModalAbierto(false); setGastoEditar(null); }}
        onGuardado={alGuardar}
      />
    </div>
  );
}
