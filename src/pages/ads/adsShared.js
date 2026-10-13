import { useCallback, useEffect, useState } from 'react';

/**
 * Formateadores y helpers compartidos por las vistas de Ads & Campañas.
 * Antes estaban duplicados en Ads.jsx, MetaReportesTab.jsx y
 * CampanaInternaModal.jsx — con tres definiciones de formatPYG que podían
 * divergir.
 */

export const formatPYG = (value) => new Intl.NumberFormat('es-PY', {
  style: 'currency', currency: 'PYG', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(value || 0);

/** Guaraníes abreviados, para las tarjetas de KPI donde no cabe la cifra entera. */
export const formatPYGCorto = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const signo = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${signo}₲ ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} MM`;
  if (abs >= 1_000_000) return `${signo}₲ ${(abs / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (abs >= 10_000) return `${signo}₲ ${Math.round(abs / 1000)} mil`;
  return formatPYG(n);
};

export const formatNum = (value) => new Intl.NumberFormat('es-PY').format(Math.round(value || 0));

export const formatPct = (value, decimales = 1) => `${(Number(value) || 0).toFixed(decimales)}%`;

export const formatROAS = (value) => `${(Number(value) || 0).toFixed(2).replace('.', ',')}x`;

/** "2026-09-10" -> "10/09/2026". Acepta null. */
export const formatFecha = (value) => {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const DIA_MS = 24 * 60 * 60 * 1000;
const aMs = (ymd) => Date.parse(`${String(ymd).slice(0, 10)}T00:00:00Z`);

/** Días de un rango, contando los dos extremos. 0 si falta una fecha o está invertido. */
export const diasEntre = (desde, hasta) => {
  if (!desde || !hasta) return 0;
  const dias = Math.floor((aMs(hasta) - aMs(desde)) / DIA_MS) + 1;
  return dias > 0 ? dias : 0;
};

/** "2026-10-14" -> "2026-10-15". null si no hay fecha. */
export const diaSiguiente = (ymd) => {
  if (!ymd) return null;
  const ms = aMs(ymd);
  return Number.isNaN(ms) ? null : new Date(ms + DIA_MS).toISOString().slice(0, 10);
};

/** Un rango de fechas en una línea; un solo día no repite la fecha. */
export const formatRango = (desde, hasta) => (
  desde === hasta ? formatFecha(desde) : `${formatFecha(desde)} → ${formatFecha(hasta)}`
);

/** ISO con hora -> "10 Sep 2026, 09:42". */
export const formatFechaHora = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
};

/** "hace 31 min" — para el indicador de frescura de los datos. */
export const formatHace = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const minutos = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutos < 1) return 'hace instantes';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
};

const iso = (d) => d.toISOString().slice(0, 10);

const hoyUTC = () => {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
};

const restarDias = (fecha, dias) => new Date(fecha.getTime() - dias * 24 * 60 * 60 * 1000);

/**
 * Presets del selector de período. `rango()` devuelve { desde, hasta } en
 * ISO, o nulls para "todo el historial" (rango abierto: el backend no
 * calcula variación en ese caso, no hay período anterior contra el que
 * comparar).
 */
export const PRESETS_PERIODO = [
  { id: 'hoy', label: 'Hoy', rango: () => { const h = hoyUTC(); return { desde: iso(h), hasta: iso(h) }; } },
  { id: '7d', label: 'Últimos 7 días', rango: () => { const h = hoyUTC(); return { desde: iso(restarDias(h, 6)), hasta: iso(h) }; } },
  { id: '30d', label: 'Últimos 30 días', rango: () => { const h = hoyUTC(); return { desde: iso(restarDias(h, 29)), hasta: iso(h) }; } },
  { id: 'mes', label: 'Este mes', rango: () => { const h = hoyUTC(); return { desde: iso(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1))), hasta: iso(h) }; } },
  { id: 'todo', label: 'Todo el historial', rango: () => ({ desde: '', hasta: '' }) },
];

export const PERIODO_POR_DEFECTO = '30d';

export const periodoInicial = () => {
  const preset = PRESETS_PERIODO.find((p) => p.id === PERIODO_POR_DEFECTO) || PRESETS_PERIODO[2];
  return { preset: preset.id, ...preset.rango() };
};

/** Etiqueta legible del período activo, para los encabezados. */
export const etiquetaPeriodo = (periodo) => {
  if (!periodo?.desde && !periodo?.hasta) return 'Todo el historial';
  const preset = PRESETS_PERIODO.find((p) => p.id === periodo.preset);
  if (preset && preset.id !== 'todo') return preset.label;
  return `${formatFecha(periodo.desde)} → ${formatFecha(periodo.hasta)}`;
};

/** Filtros de fecha tal como los espera el backend. */
export const filtrosDeFecha = (periodo) => ({
  ...(periodo?.desde ? { fecha_desde: periodo.desde } : {}),
  ...(periodo?.hasta ? { fecha_hasta: periodo.hasta } : {}),
});

/**
 * Variación relativa entre dos valores. Devuelve null cuando no hay con
 * qué comparar (sin período anterior, o anterior en cero) — mostrar
 * "+100%" porque antes no había nada sería ruido, no información.
 */
export const variacion = (actual, anterior) => {
  if (anterior == null || anterior === 0) return null;
  const a = Number(actual) || 0;
  return ((a - Number(anterior)) / Math.abs(Number(anterior))) * 100;
};

/**
 * Preferencia de UI persistida en localStorage (columnas visibles, etc).
 * Nunca en la URL: en Gesicomm el estado de UI no viaja por query params.
 */
export function usePreferenciaLocal(clave, valorInicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado ? JSON.parse(guardado) : valorInicial;
    } catch {
      return valorInicial;
    }
  });

  const guardar = useCallback((siguiente) => {
    setValor((previo) => {
      const resuelto = typeof siguiente === 'function' ? siguiente(previo) : siguiente;
      try { localStorage.setItem(clave, JSON.stringify(resuelto)); } catch { /* modo privado */ }
      return resuelto;
    });
  }, [clave]);

  return [valor, guardar];
}

/** Paginación de las tablas de la sección — el backend usa el mismo número. */
export const FILAS_POR_PAGINA = 10;

/**
 * Texto de búsqueda con retardo: `valor` es lo que se tipea (y se muestra
 * en el input), `aplicado` es lo que se manda al backend. Sin esto cada
 * tecla dispararía una consulta.
 */
export function useBusquedaDebounced(retardo = 350) {
  const [valor, setValor] = useState('');
  const [aplicado, setAplicado] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setAplicado(valor.trim()), retardo);
    return () => clearTimeout(t);
  }, [valor, retardo]);

  return [valor, setValor, aplicado];
}

/**
 * Siguiente estado del orden al hacer clic en una columna: si ya se está
 * ordenando por ella, invierte la dirección; si no, arranca por la
 * dirección más útil para ese campo (descendente en métricas, ascendente
 * en texto).
 */
export const alternarOrden = (ordenActual, campo, direccionInicial = 'DESC') => {
  if (ordenActual?.campo === campo) {
    return { campo, direccion: ordenActual.direccion === 'ASC' ? 'DESC' : 'ASC' };
  }
  return { campo, direccion: direccionInicial };
};

export const BADGE_ESTADO = {
  borrador: { bg: 'rgba(156,163,175,0.12)', color: 'var(--color-fg-muted)', label: 'Borrador' },
  activa: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Activa' },
  pausada: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Pausada' },
  archivada: { bg: 'rgba(156,163,175,0.12)', color: 'var(--color-fg-muted)', label: 'Archivada' },
};

/** Semáforo de rendimiento por ROAS — mismo criterio en todas las vistas. */
export const semaforoROAS = (roas) => {
  const v = Number(roas) || 0;
  if (v >= 2) return { color: '#10b981', label: 'Rinde', nivel: 'bien' };
  if (v >= 1) return { color: '#f59e0b', label: 'Al límite', nivel: 'atencion' };
  if (v > 0) return { color: '#ef4444', label: 'Pierde', nivel: 'mal' };
  return { color: 'var(--color-fg-muted)', label: 'Sin ventas', nivel: 'sin_datos' };
};
