import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';

const FORMATO_CLASE = {
  R: 'border-l-primary bg-primary/10 text-primary-text',
  C: 'border-l-warning bg-warning/10 text-warning',
  H: 'border-l-danger bg-danger/10 text-danger',
};

function iso(d) {
  return format(d, 'yyyy-MM-dd');
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
    return mapa;
  }, [items]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMesActual((m) => addMonths(m, -1))}
            className="rounded-md border border-border bg-surface-2 p-1.5 text-fg-muted hover:text-fg">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-fg">
            {format(mesActual, 'MMMM yyyy', { locale: es })}
          </span>
          <button type="button" onClick={() => setMesActual((m) => addMonths(m, 1))}
            className="rounded-md border border-border bg-surface-2 p-1.5 text-fg-muted hover:text-fg">
            <ChevronRight size={16} />
          </button>
        </div>
        <button type="button" onClick={() => setMesActual(new Date())}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg">
          Hoy
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="grid min-w-[840px] grid-cols-7 border-b border-border bg-surface-2">
          {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d) => (
            <div key={d} className="border-r border-border p-2 text-center text-[10px] font-bold text-fg-subtle last:border-r-0">{d}</div>
          ))}
        </div>
        <div className="grid min-w-[840px] grid-cols-7">
          {dias.map((dia) => {
            const key = iso(dia);
            const eventos = itemsPorDia[key] || [];
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
                className={`min-h-[110px] cursor-pointer border-b border-r border-border p-1.5 last:border-r-0 ${
                  isSameMonth(dia, mesActual) ? 'bg-surface' : 'bg-surface-2/50'
                } ${diaSobrevolado === key ? 'ring-2 ring-inset ring-primary' : ''}`}
              >
                <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isToday(dia) ? 'bg-primary text-primary-fg' : 'text-fg-muted'
                }`}>
                  {format(dia, 'd')}
                </div>
                <div className="flex flex-col gap-1">
                  {eventos.map((item) => (
                    <div
                      key={item.id}
                      draggable={item.status !== 'published'}
                      onDragStart={(e) => { e.stopPropagation(); setArrastrandoId(item.id); }}
                      onDragEnd={() => setArrastrandoId(null)}
                      onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                      title={item.status === 'published' ? 'Publicado — no se puede arrastrar' : 'Arrastrá para reprogramar'}
                      className={`truncate rounded-r-md border-l-2 px-1.5 py-1 text-[10px] font-semibold ${item.is_test ? 'border-l-warning bg-warning/20 text-warning line-through' : FORMATO_CLASE[item.format] || ''} ${
                        item.status === 'published' ? 'cursor-default opacity-70' : 'cursor-grab'
                      }`}
                    >
                      {String(item.publish_time).slice(0, 5)} · {item.is_test ? '[TEST] ' : ''}{item.tracking_code}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
