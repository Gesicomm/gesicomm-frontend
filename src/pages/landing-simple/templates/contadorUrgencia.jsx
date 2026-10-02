import React, { useEffect, useMemo, useState } from 'react';

const dosDigitos = (n) => String(Math.max(0, n)).padStart(2, '0');

/**
 * Cuenta regresiva de la franja "Tu descuento termina en:", compartida por
 * las fichas que la usan (Fitness, Beauty). El diseño de las cajitas lo pone
 * cada ficha con `className`.
 *
 * Es decorativa: arranca en el tiempo configurado cada vez que alguien abre
 * la página y baja hasta cero, donde se queda. No hay una fecha límite real
 * detrás — es una decisión de producto, no un olvido: la alternativa (fecha
 * de fin) exige que alguien la mantenga o el contador queda apagado para
 * siempre.
 *
 * @param {{horas, minutos, segundos, rotulo_horas?, rotulo_minutos?, rotulo_segundos?}} desde
 */
export default function ContadorUrgencia({ desde, className = '' }) {
  const total = useMemo(
    () => Math.max(0, (Number(desde.horas) || 0) * 3600 + (Number(desde.minutos) || 0) * 60 + (Number(desde.segundos) || 0)),
    [desde.horas, desde.minutos, desde.segundos]
  );
  const [restante, setRestante] = useState(total);

  useEffect(() => { setRestante(total); }, [total]);

  useEffect(() => {
    if (restante <= 0) return undefined;
    const id = setInterval(() => setRestante(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [restante > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={className} role="timer">
      <b>{dosDigitos(Math.floor(restante / 3600))}{desde.rotulo_horas && <small>{desde.rotulo_horas}</small>}</b>
      <b>{dosDigitos(Math.floor((restante % 3600) / 60))}{desde.rotulo_minutos && <small>{desde.rotulo_minutos}</small>}</b>
      <b>{dosDigitos(restante % 60)}{desde.rotulo_segundos && <small>{desde.rotulo_segundos}</small>}</b>
    </span>
  );
}

/** Valores de fábrica de la franja de urgencia, iguales en todas las fichas que la usan. */
export const URGENCIA_DEFAULT = {
  activo: true,
  texto: 'Tu descuento termina en:',
  horas: 0,
  minutos: 15,
  segundos: 0,
  rotulo_horas: 'HRS',
  rotulo_minutos: 'MIN',
  rotulo_segundos: 'SEG',
};

/** Deja los números en rango pase lo que pase en el JSON guardado. */
export function normalizarUrgencia(base) {
  const entre = (v, min, max, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
  };
  return {
    ...base,
    horas: entre(base.horas, 0, 99, 0),
    minutos: entre(base.minutos, 0, 59, 15),
    segundos: entre(base.segundos, 0, 59, 0),
  };
}
