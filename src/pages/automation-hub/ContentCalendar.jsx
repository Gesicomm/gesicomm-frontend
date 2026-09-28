import React, { useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, GalleryHorizontal, Video } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  format, isSameMonth, isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';

const FORMATO_META = {
  R: { label: 'Reel', icon: Video, className: 'border-l-primary bg-primary/10 text-primary-text' },
  C: { label: 'Carrusel', icon: GalleryHorizontal, className: 'border-l-warning bg-warning/10 text-warning' },
  H: { label: 'Historia', icon: CircleDashed, className: 'border-l-danger bg-danger/10 text-danger' },
};

const ESTADOS_LEYENDA = [
  { label: 'Programado', className: 'bg-primary/70' },
  { label: 'Publicado', className: 'bg-success' },
  { label: 'Prueba', className: 'bg-warning' },
];

function itemClass(item) {
  if (item.is_test) return 'border-l-warning bg-warning/10 text-warning';
  if (item.status === 'published') return 'border-l-success bg-success/10 text-success';
  return FORMATO_META[item.format]?.className || 'border-l-primary bg-primary/10 text-primary-text';
}

function iso(d) {
  return format(d, 'yyyy-MM-dd');
}

function tituloItem(item) {
  return item.topic || item.keyword || item.tracking_code || 'Contenido sin titulo';
}

export default function ContentCalendar({ items, onDayClick, onItemClick, onReprogramar }) {
  const [mesActual, setMesActual] = useState(new Date());
  const [arrastrandoId, setArrastrandoId] = useState(null);
  const [diaSobrevolado, setDiaSobrevolado] = useState(null);

  const dias = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 1 });
    const resultado = [];
    let cursor = inicio;
    while (cursor <= fin) {
      resultado.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return resultado;
  }, [mesActual]);

  const itemsPorDia = useMemo(() => {
    const mapa = {};
    for (const item of items) {
      (mapa[item.publish_date] = mapa[item.publish_date] || []).push(item);
    }
    Object.values(mapa).forEach((lista) => {
      lista.sort((a, b) => String(a.publish_time).localeCompare(String(b.publish_time)));
    });
    return mapa;
  }, [items]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMesActual((m) => addMonths(m, -1))}
            className="rounded-md border border-border bg-surface-2 p-1.5 text-fg-muted transition-colors hover:border-primary/40 hover:text-fg">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-fg">
            {format(mesActual, 'MMMM yyyy', { locale: es })}
          </span>
          <button type="button" onClick={() => setMesActual((m) => addMonths(m, 1))}
            className="rounded-md border border-border bg-surface-2 p-1.5 text-fg-muted transition-colors hover:border-primary/40 hover:text-fg">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-fg-muted md:flex">
            {ESTADOS_LEYENDA.map((estado) => (
              <span key={estado.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${estado.className}`} />
                {estado.label}
              </span>
            ))}
          </div>
          <button type="button" onClick={() => setMesActual(new Date())}
            className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:border-primary/40 hover:text-fg">
            Hoy
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
        <div className="grid min-w-[840px] grid-cols-7 border-b border-border bg-surface-2">
          {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d) => (
            <div key={d} className="border-r border-border px-3 py-2.5 text-center text-[10px] font-bold text-fg-subtle last:border-r-0">{d}</div>
          ))}
        </div>
        <div className="grid min-w-[840px] grid-cols-7">
          {dias.map((dia) => {
            const key = iso(dia);
            const eventos = itemsPorDia[key] || [];
            const visibles = eventos.slice(0, 3);
            const restantes = Math.max(0, eventos.length - visibles.length);
            return (
              <div
                key={key}
                onDragOver={(e) => { e.preventDefault(); setDiaSobrevolado(key); }}
                onDragLeave={() => setDiaSobrevolado((d) => (d === key ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDiaSobrevolado(null);
                  if (arrastrandoId) onReprogramar(arrastrandoId, key);
                }}
                onClick={() => onDayClick(key)}
                className={`group min-h-[132px] cursor-pointer border-b border-r border-border p-2 transition-colors last:border-r-0 ${
                  isSameMonth(dia, mesActual) ? 'bg-surface' : 'bg-surface-2/50'
                } ${eventos.length ? 'hover:bg-surface-2/70' : 'hover:bg-primary/5'} ${diaSobrevolado === key ? 'ring-2 ring-inset ring-primary' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    isToday(dia) ? 'bg-primary text-primary-fg' : isSameMonth(dia, mesActual) ? 'text-fg-muted' : 'text-fg-subtle'
                  }`}>
                    {format(dia, 'd')}
                  </div>
                  <CalendarPlus size={13} className="text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="flex flex-col gap-1">
                  {visibles.map((item) => {
                    const meta = FORMATO_META[item.format] || FORMATO_META.R;
                    const Icono = item.status === 'published' ? CheckCircle2 : meta.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        draggable={item.status !== 'published'}
                        onDragStart={(e) => { e.stopPropagation(); setArrastrandoId(item.id); }}
                        onDragEnd={() => setArrastrandoId(null)}
                        onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                        title={item.status === 'published' ? 'Publicado - no se puede arrastrar' : 'Arrastrá para reprogramar'}
                        className={`min-w-0 rounded-md border border-transparent border-l-2 px-2 py-1.5 text-left transition-all hover:border-border-strong hover:shadow-sm ${itemClass(item)} ${
                          item.status === 'published' ? 'cursor-default opacity-80' : 'cursor-grab active:cursor-grabbing'
                        } ${item.is_test ? 'opacity-80' : ''}`}
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Icono size={12} className="shrink-0" />
                          <span className="shrink-0 font-mono text-[10px] font-bold">{String(item.publish_time).slice(0, 5)}</span>
                          <span className="truncate text-[11px] font-semibold">{tituloItem(item)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide opacity-80">
                          <span>{item.is_test ? 'Prueba' : meta.label}</span>
                          <span className="h-1 w-1 rounded-full bg-current opacity-50" />
                          <span>{item.status === 'published' ? 'Publicado' : 'Programado'}</span>
                        </div>
                      </button>
                    );
                  })}
                  {restantes > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDayClick(key); }}
                      className="rounded-md border border-dashed border-border px-2 py-1 text-left text-[10px] font-semibold text-fg-muted transition-colors hover:border-primary/50 hover:text-primary-text"
                    >
                      +{restantes} contenidos mas
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
