import { useState } from 'react';
import {
  ArrowLeft, Copy, Check, MessageCircle, Globe, ExternalLink, Package, Info, Edit2, Database,
} from 'lucide-react';
import {
  formatPYG, formatPYGCorto, formatNum, formatROAS,
  etiquetaPeriodo, semaforoROAS, BADGE_ESTADO,
} from './adsShared';
import { TarjetaKpi } from './adsUI';
import { TablaProductos, TablaFilas } from './AdsReportes';

/**
 * Detalle de una campaña: cierra la cadena Meta → campaña → productos.
 *
 * Lo que NO está acá, a propósito: "pedidos de esta campaña" y su
 * utilidad. Los pedidos se agregan por producto, no por campaña, así que
 * una tarjeta de "utilidad de la campaña" sería una atribución inventada.
 * La tabla de productos sí muestra pedidos y utilidad, pero rotulados como
 * lo que son: del producto completo en el período. Para tener atribución
 * real primero hay que guardar el origen de campaña en el checkout.
 *
 * Las tablas son las mismas que usa el detalle de un reporte (con sus
 * filtros, orden y paginación server-side), acotadas por `campanaId`.
 */
export default function AdsCampanaDetalle({ campana, periodo, resumen, onVolver, onEditar }) {
  const [vista, setVista] = useState('productos');
  const [copiado, setCopiado] = useState(false);

  const rendimiento = (resumen?.actual?.campanas || []).find((c) => c.campana_id === campana.id);
  const badge = BADGE_ESTADO[campana.estado] || BADGE_ESTADO.borrador;
  const sem = rendimiento ? semaforoROAS(rendimiento.roas) : null;

  const rango = {
    ...(periodo?.desde ? { fecha_desde: periodo.desde } : {}),
    ...(periodo?.hasta ? { fecha_hasta: periodo.hasta } : {}),
  };

  const copiarNombre = () => {
    navigator.clipboard.writeText(campana.nombre_interno).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Encabezado ---- */}
      <div>
        <button type="button" onClick={onVolver} className="mb-2 inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-xs text-fg-muted hover:text-fg">
          <ArrowLeft size={14} /> Campañas
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {campana.tipo === 'whatsapp'
                ? <MessageCircle size={18} color="#10b981" />
                : <Globe size={18} color="#3b82f6" />}
              <h2 className="m-0 text-base font-semibold text-fg">{campana.nombre_display}</h2>
              <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
              <span
                className="badge"
                style={{
                  background: campana.tipo === 'whatsapp' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                  color: campana.tipo === 'whatsapp' ? '#10b981' : '#3b82f6',
                }}
              >
                {campana.tipo === 'whatsapp' ? 'WhatsApp' : 'Funnel'}
              </span>
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
                  {copiado ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                </button>
              </span>
              {campana.landing_id && (
                <a
                  href={`/landing/${campana.landing_id}`}
                  className="inline-flex items-center gap-1 text-[0.74rem] text-primary-text hover:underline"
                >
                  Ver funnel <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          <button type="button" className="btn-secondary" onClick={() => onEditar(campana)}>
            <Edit2 size={14} style={{ marginRight: '0.3rem' }} /> Editar campaña
          </button>
        </div>
      </div>

      {/* ---- KPIs de Meta ---- */}
      <section>
        <p className="m-0 mb-2 text-xs text-fg-muted">
          Rendimiento en Meta · {etiquetaPeriodo(periodo)}
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TarjetaKpi
            label="Inversión"
            valor={formatPYGCorto(rendimiento?.inversion)}
            hint={rendimiento ? formatPYG(rendimiento.inversion) : 'sin datos en el período'}
          />
          <TarjetaKpi label="Compras" valor={formatNum(rendimiento?.compras)} />
          <TarjetaKpi
            label="ROAS"
            valor={formatROAS(rendimiento?.roas)}
            hint={rendimiento ? `${formatPYGCorto(rendimiento.valor_conversion)} de retorno · ${sem.label}` : null}
          />
          <TarjetaKpi label="CPA" valor={formatPYGCorto(rendimiento?.cpa)} menosEsMejor />
        </div>
        {!rendimiento && (
          <p className="m-0 mt-2 flex items-start gap-1.5 text-xs text-fg-muted">
            <Info size={13} className="mt-0.5 shrink-0" />
            Esta campaña no tiene datos de Meta en el período seleccionado. Probá con un período más amplio, o revisá
            que sus datos estén relacionados.
          </p>
        )}
      </section>

      {/* ---- Productos / datos ---- */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'productos', label: 'Productos de la campaña', icono: Package },
          { id: 'datos', label: 'Datos de Meta relacionados', icono: Database },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVista(v.id)}
            className={`inline-flex items-center gap-1.5 border-b-2 border-solid bg-transparent px-3 py-2 text-[0.82rem] transition-colors ${
              vista === v.id
                ? 'border-primary font-semibold text-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <v.icono size={14} /> {v.label}
          </button>
        ))}
      </div>

      {vista === 'productos'
        ? <TablaProductos campanaId={campana.id} rango={rango} />
        : <TablaFilas campanaId={campana.id} />}

      {campana.notas && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="m-0 text-sm font-semibold text-fg">Notas</h3>
          <p className="m-0 mt-1.5 whitespace-pre-wrap text-xs text-fg-muted">{campana.notas}</p>
        </section>
      )}
    </div>
  );
}
