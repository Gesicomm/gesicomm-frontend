import { useEffect, useState } from 'react';
import { resolverVariante, seleccionInicial } from './varianteOpciones';

/**
 * Selección de variante de una ficha de producto, arrancando en la primera
 * con stock.
 *
 * No alcanza con un useState con inicializador: en el preview del
 * formulario de producto las variantes llegan DESPUÉS de montar la ficha, y
 * el inicializador ya corrió con la lista vacía. La selección quedaba en {}
 * — ninguna pill marcada y la foto general del producto en lugar de la de la
 * variante — y una vez que el cliente tocaba un color ya no había forma de
 * volver a ese estado. Por eso, cada vez que cambia el set de variantes, si
 * la selección actual no resuelve a ninguna se vuelve a sembrar.
 */
export default function useSeleccionVariante(item) {
  const [seleccion, setSeleccion] = useState(() => seleccionInicial(item));

  const firma = (item?.variantes || []).map(v => v.id ?? v.nombre).join('|');
  useEffect(() => {
    setSeleccion(prev => (resolverVariante(item, prev) ? prev : seleccionInicial(item)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  return [seleccion, setSeleccion];
}
