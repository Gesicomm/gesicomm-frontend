import { useState, useEffect } from 'react';

/**
 * Hook de debounce.
 * Retrasa la actualización del valor hasta que el usuario deja de escribir.
 *
 * @param {*} value - El valor a debouncear
 * @param {number} delay - Milisegundos de espera (por defecto 300ms)
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
