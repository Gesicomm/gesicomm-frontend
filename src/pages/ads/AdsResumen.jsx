import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Link2, TrendingUp, AlertTriangle, Upload, FileText, Info, Megaphone,
} from 'lucide-react';
import {
  formatPYG, formatPYGCorto, formatNum, formatROAS, formatPct, formatHace, formatFecha,
  etiquetaPeriodo, semaforoROAS, variacion,
} from './adsShared';
import { TarjetaKpi, EncabezadoSeccion, EstadoVacio, Punto } from './adsUI';

/**
 * Vista "Resumen": el estado del sistema en cinco segundos.
 *
 * Dos bloques de KPIs a propósito separados:
 *  - Meta Ads: lo que reporta el export de Meta (inversión, compras,
 *    ROAS, CPA). Es la atribución de Meta.
 *  - Pedidos reales (Courier): lo que efectivamente entró y se entregó,
 *    de los productos que tuvieron gasto en el período. NO está
 *    atribuido a la campaña — el pedido no guarda de qué campaña vino.
 * Juntarlos en una sola tarjeta de "ROAS real" sería inventar una
 * atribución que hoy el sistema no tiene.
 */
export default function AdsResumen({ periodo, resumen, cargando, irA, onImportar }) {
  const actual = resumen?.actual;
  const anterior = resumen?.anterior;
  const meta = actual?.meta;
  const courier = actual?.courier;
  const campanas = actual?.campanas || [];

  const pendientes = resumen?.relaciones_pendientes || 0;
  const ultima = resumen?.ultima_importacion;

  // El backend marca el período como comparable solo si los datos caen
  // realmente adentro. Con informes de Meta que abarcan meses, la misma
  // fila entra en el período y en el anterior, y toda variación da 0% —
  // mostrar esos deltas sería ruido que parece información.
  const cobertura = meta?.cobertura;
  const mostrarDeltas = Boolean(resumen?.comparable);
  const delta = (actualValor, anteriorValor) => (mostrarDeltas ? variacion(actualValor, anteriorValor) : null);

  const sinDatos = !cargando && (!meta || meta.filas === 0);

  const topCampanas = [...campanas].filter((c) => c.inversion > 0).sort((a, b) => b.roas - a.roas).slice(0, 5);
  const aRevisar = [...campanas].filter((c) => c.inversion > 0 && c.roas < 1).sort((a, b) => a.roas - b.roas).slice(0, 5);

  const datosGrafico = [...campanas]
    .filter((c) => c.inversion > 0)
    .slice(0, 7)
    .map((c) => ({
      nombre: c.nombre?.length > 18 ? `${c.nombre.slice(0, 17)}…` : (c.nombre || 'Sin nombre'),
      inversion: Math.round(c.inversion),
      retorno: Math.round(c.valor_conversion),
      roas: c.roas,
    }));

  return (
    <div className="flex flex-col gap-5">

      {/* ---- Estado de sincronización ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <Punto color={ultima ? '#10b981' : 'var(--color-fg-subtle)'}>
            {ultima
              ? <>Último reporte: <strong className="font-medium text-fg">{formatHace(ultima.created_at) || '—'}</strong></>
              : 'Todavía no importaste ningún reporte'}
          </Punto>
          {ultima && (
            <Punto color="var(--color-fg-subtle)">
              {formatNum(ultima.filas_totales)} datos importados de <strong className="font-medium text-fg">{ultima.nombre_archivo}</strong>
            </Punto>
          )}
          {pendientes > 0 && (
            <button type="button" onClick={() => irA('relaciones')} className="inline-flex items-center gap-1.5 text-xs font-medium text-warning hover:underline">
              <AlertTriangle size={13} /> {formatNum(pendientes)} {pendientes === 1 ? 'relación pendiente' : 'relaciones pendientes'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendientes > 0 && (
            <button type="button" className="btn-secondary" onClick={() => irA('relaciones')}>
              <Link2 size={15} style={{ marginRight: '0.35rem' }} /> Resolver pendientes
            </button>
          )}
          <button type="button" className="btn-primary" onClick={onImportar}>
            <Upload size={15} style={{ marginRight: '0.35rem' }} /> Importar datos
          </button>
        </div>
      </div>

      {sinDatos ? (
        <EstadoVacio
          icono={FileText}
          titulo="No hay datos de Meta en este período"
          descripcion={`No se encontraron datos importados para ${etiquetaPeriodo(periodo).toLowerCase()}. Probá con un período más amplio o importá el reporte de Meta.`}
        >
          <button type="button" className="btn-primary mt-1" onClick={onImportar}>
            <Upload size={15} style={{ marginRight: '0.35rem' }} /> Importar datos de Meta
          </button>
        </EstadoVacio>
      ) : (
        <>
          {/* ---- KPIs de Meta ---- */}
          <section>
            <EncabezadoSeccion
              titulo="Meta Ads"
              descripcion={`Cifras del propio reporte de Meta · ${etiquetaPeriodo(periodo)}${mostrarDeltas ? ' · variación contra el período anterior de igual largo' : ''}`}
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <TarjetaKpi
                label="Inversión"
                valor={formatPYGCorto(meta?.inversion)}
                delta={delta(meta?.inversion, anterior?.meta?.inversion)}
                hint={cargando ? null : formatPYG(meta?.inversion)}
                cargando={cargando}
              />
              <TarjetaKpi
                label="Compras"
                valor={formatNum(meta?.compras)}
                delta={delta(meta?.compras, anterior?.meta?.compras)}
                hint={meta?.resultados ? `${formatNum(meta.resultados)} resultados` : null}
                cargando={cargando}
              />
              <TarjetaKpi
                label="ROAS"
                valor={formatROAS(meta?.roas)}
                delta={delta(meta?.roas, anterior?.meta?.roas)}
                hint={cargando ? null : `${formatPYGCorto(meta?.valor_conversion)} de retorno`}
                cargando={cargando}
              />
              <TarjetaKpi
                label="CPA"
                valor={formatPYGCorto(meta?.cpa)}
                delta={delta(meta?.cpa, anterior?.meta?.cpa)}
                menosEsMejor
                hint={meta?.ctr ? `CTR ${formatPct(meta.ctr, 2)}` : null}
                cargando={cargando}
              />
            </div>
            {cobertura?.filas_que_exceden > 0 && (
              <div className="mt-2 rounded-lg border border-info/25 bg-info/5 p-2.5">
                <p className="m-0 flex items-start gap-1.5 text-xs text-info">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Estas cifras abarcan más que el período elegido: los datos vienen de informes que van de{' '}
                    <strong className="font-medium">{formatFecha(cobertura.fecha_min)}</strong> a{' '}
                    <strong className="font-medium">{formatFecha(cobertura.fecha_max)}</strong>.
                  </span>
                </p>
                <p className="m-0 mt-1 pl-[18px] text-[0.72rem] text-fg-muted">
                  Meta exporta una fila por campaña por informe, y {formatNum(cobertura.filas_que_exceden)} de{' '}
                  {formatNum(meta.filas)} tienen un informe más largo que el período. Una fila así no se puede repartir
                  por día, así que entra completa. Para analizar períodos cortos, exportá de Meta con desglose por día.
                </p>
              </div>
            )}

            {meta?.filas_sin_vincular > 0 && (
              <p className="m-0 mt-2 flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle size={13} />
                {formatNum(meta.filas_sin_vincular)} de {formatNum(meta.filas)} datos del período no están relacionados con ninguna campaña — su gasto cuenta en la inversión, pero no llega a ningún producto.
              </p>
            )}
          </section>

          {/* ---- KPIs de Courier ---- */}
          <section>
            <EncabezadoSeccion
              titulo="Pedidos reales"
              descripcion="De los productos que tuvieron gasto en el período, según el módulo de Envíos. No están atribuidos a una campaña puntual: el pedido no guarda de qué campaña vino."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <TarjetaKpi
                label="Pedidos"
                valor={formatNum(courier?.pedidos)}
                delta={delta(courier?.pedidos, anterior?.courier?.pedidos)}
                hint={courier?.pct_confirmacion ? `${formatPct(courier.pct_confirmacion)} confirmados` : null}
                cargando={cargando}
              />
              <TarjetaKpi
                label="Entregados"
                valor={formatNum(courier?.entregados)}
                delta={delta(courier?.entregados, anterior?.courier?.entregados)}
                hint={courier?.pct_entrega ? `${formatPct(courier.pct_entrega)} de los confirmados` : null}
                cargando={cargando}
              />
              <TarjetaKpi
                label="Facturación"
                valor={formatPYGCorto(courier?.facturacion)}
                delta={delta(courier?.facturacion, anterior?.courier?.facturacion)}
                hint={cargando ? null : formatPYG(courier?.facturacion)}
                cargando={cargando}
              />
              <TarjetaKpi
                label="Utilidad bruta"
                valor={formatPYGCorto(courier?.utilidad_bruta)}
                delta={delta(courier?.utilidad_bruta, anterior?.courier?.utilidad_bruta)}
                hint={courier?.margen_bruto ? `Margen ${formatPct(courier.margen_bruto * 100)}` : null}
                cargando={cargando}
              />
            </div>
          </section>

          {/* ---- Rendimiento por campaña ---- */}
          {datosGrafico.length > 0 && (
            <section>
              <EncabezadoSeccion
                titulo="Rendimiento por campaña"
                descripcion="Inversión contra retorno reportado por Meta, por campaña."
              />
              <div className="rounded-xl border border-border bg-surface p-4">
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={datosGrafico} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="nombre" tick={{ fill: 'var(--color-fg-subtle)', fontSize: 11 }} stroke="var(--color-border)" interval={0} />
                      <YAxis tickFormatter={(v) => formatPYGCorto(v)} tick={{ fill: 'var(--color-fg-subtle)', fontSize: 11 }} stroke="var(--color-border)" width={78} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                          borderRadius: '8px', fontSize: '0.78rem', color: 'var(--color-fg)',
                        }}
                        formatter={(valor, nombre) => [formatPYG(valor), nombre === 'inversion' ? 'Inversión' : 'Retorno (Meta)']}
                        cursor={{ fill: 'var(--color-surface-3)', opacity: 0.4 }}
                      />
                      <Bar dataKey="inversion" name="inversion" fill="var(--color-primary)" radius={[3, 3, 0, 0]} maxBarSize={26} />
                      <Bar dataKey="retorno" name="retorno" radius={[3, 3, 0, 0]} maxBarSize={26}>
                        {datosGrafico.map((d) => (
                          <Cell key={d.nombre} fill={semaforoROAS(d.roas).color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="m-0 mt-2 flex items-start gap-1.5 text-[0.7rem] text-fg-subtle">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  El reporte de Meta trae una fila por campaña por informe, no una por día — por eso la comparación es por campaña y no una curva en el tiempo.
                </p>
              </div>
            </section>
          )}

          {/* ---- Top / a revisar ---- */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ListaCampanas
              titulo="Mejor rendimiento"
              icono={TrendingUp}
              campanas={topCampanas}
              vacio="Todavía no hay campañas con inversión en este período."
              irA={irA}
            />
            <ListaCampanas
              titulo="Campañas a revisar"
              icono={AlertTriangle}
              campanas={aRevisar}
              vacio="Ninguna campaña con inversión está por debajo de 1x. Buena señal."
              irA={irA}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ListaCampanas({ titulo, icono: Icono, campanas, vacio, irA }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-fg">
          <Icono size={15} className="text-fg-muted" /> {titulo}
        </h3>
        <button type="button" onClick={() => irA('campanas')} className="text-xs text-primary-text hover:underline">
          Ver todas
        </button>
      </div>

      {campanas.length === 0 ? (
        <p className="m-0 py-6 text-center text-xs text-fg-muted">{vacio}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {campanas.map((c) => {
            const sem = semaforoROAS(c.roas);
            return (
              <li key={c.campana_id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Megaphone size={13} className="shrink-0 text-fg-subtle" />
                  <span className="truncate text-xs text-fg">{c.nombre}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[0.7rem] text-fg-subtle">{formatPYGCorto(c.inversion)}</span>
                  <span className="font-mono text-xs font-semibold" style={{ color: sem.color }}>{formatROAS(c.roas)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
