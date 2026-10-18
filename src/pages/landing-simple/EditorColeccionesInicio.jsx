import React, { useRef, useState } from 'react';
import { getMediaUrl } from '../../services/api';

/**
 * Panel del bloque "Colecciones" del Inicio: qué tarjetas muestra
 * (categorías o las colecciones armadas en Organizar productos), cuáles,
 * cuántas por fila y cuántas en total. Lo pinta el runtime
 * (coleccionesInicio en runtimeGesicomm.js). `config` null = nunca se tocó:
 * el bloque se ve como siempre hasta que el comercio cambie algo.
 */

export const COLECCIONES_INICIO_DEFAULT = { modo: 'categorias', items: [], columnas: 4, limite: 4, titulo: '✧ Colecciones', subtitulo: 'Elegí tu estilo, encontrá tus favoritos' };

const MODOS = [
  ['categorias', 'Categorías', 'Una tarjeta por categoría de tus productos.'],
  ['colecciones', 'Mis colecciones', 'Las que armaste en Categorías → Organizar productos (Ofertas del día, Novedades…).'],
];

export default function EditorColeccionesInicio({ config, categorias = [], colecciones = [], onCambiar, onSubir = null }) {
  const actual = { ...COLECCIONES_INICIO_DEFAULT, ...config };
  const actualRef = useRef(actual);
  actualRef.current = actual;
  const opciones = actual.modo === 'colecciones' ? colecciones : categorias;
  const elegidas = new Set(actual.items || []);
  const cambiar = cambio => onCambiar({ ...actual, ...cambio });
  const alternar = (nombre) => {
    const items = elegidas.has(nombre) ? actual.items.filter(n => n !== nombre) : [...actual.items, nombre];
    cambiar({ items });
  };
  const visibles = Math.min(actual.limite, elegidas.size || opciones.length);
  const tarjetas = (elegidas.size ? [...elegidas] : opciones.map(([nombre]) => nombre)).slice(0, actual.limite);
  function cambiarImagen(modo, nombre, url) {
    const ultima = actualRef.current;
    const imagenes = { ...ultima.imagenes, [modo]: { ...ultima.imagenes?.[modo], [nombre]: url } };
    onCambiar({ ...ultima, imagenes });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-medium text-fg-muted">Imagen de cada tarjeta</p>
        <p className="text-xs leading-relaxed text-fg-muted">
          La imagen se centra y se recorta para llenar la tarjeta. El recorte cambia según la cantidad de columnas y el tamaño de pantalla.
          {' '}Dejá el producto en el centro, con margen alrededor, y evitá textos o logos cerca de los bordes.
        </p>
        {tarjetas.map(nombre => (
          <ImagenColeccion key={`${actual.modo}:${nombre}`} nombre={nombre}
            imagen={actual.imagenes?.[actual.modo]?.[nombre] || ''} onSubir={onSubir}
            onCambiar={url => cambiarImagen(actual.modo, nombre, url)} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {['titulo', 'subtitulo'].map(campo => (
          <label key={campo} className="block">
            <span className="mb-1 block text-xs font-medium text-fg-muted">{campo === 'titulo' ? 'Título' : 'Subtítulo'}</span>
            <input aria-label={campo === 'titulo' ? 'Título de Colecciones' : 'Subtítulo de Colecciones'} value={actual[campo]} maxLength={campo === 'titulo' ? 100 : 160}
              onChange={e => cambiar({ [campo]: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary" />
          </label>
        ))}
      </div>
      <div role="radiogroup" aria-label="Qué mostrar en Colecciones" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MODOS.map(([modo, titulo, ayuda]) => (
          <button
            key={modo}
            type="button"
            role="radio"
            aria-checked={actual.modo === modo}
            onClick={() => actual.modo !== modo && cambiar({ modo, items: [] })}
            className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${actual.modo === modo ? 'border-primary bg-primary/[0.06]' : 'border-border bg-surface hover:border-border-strong'}`}
          >
            <span className="block text-sm font-semibold text-fg">{titulo}</span>
            <span className="mt-0.5 block text-xs text-fg-muted">{ayuda}</span>
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">
          {actual.modo === 'colecciones' ? 'Colecciones a mostrar' : 'Categorías a mostrar'} — sin ninguna tildada se muestran todas
        </p>
        {opciones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-4 text-center text-sm text-fg-muted">
            {actual.modo === 'colecciones'
              ? 'Todavía no armaste colecciones. Hacelo en la pestaña Categorías: marcá productos y tocá “Agregar a colección”.'
              : 'Tus productos todavía no tienen categoría.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {opciones.map(([nombre, cantidad]) => (
              <label key={nombre} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${elegidas.has(nombre) ? 'border-primary bg-primary/[0.06] text-fg' : 'border-border bg-surface text-fg'}`}>
                <input type="checkbox" checked={elegidas.has(nombre)} onChange={() => alternar(nombre)} className="accent-primary" aria-label={`Mostrar ${nombre}`} />
                <span className="min-w-0 flex-1 truncate">{nombre}</span>
                <span className="text-xs tabular-nums text-fg-muted">{cantidad}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Tarjetas por fila (escritorio)</span>
          <select
            aria-label="Tarjetas por fila"
            value={actual.columnas}
            onChange={e => cambiar({ columnas: Number(e.target.value) })}
            className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
          >
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Total de tarjetas</span>
          <input
            aria-label="Total de tarjetas"
            type="number"
            min="1"
            max="24"
            value={actual.limite}
            onChange={e => cambiar({ limite: Math.max(1, Math.min(24, Math.floor(Number(e.target.value) || 4))) })}
            className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
          />
        </label>
      </div>
      <p className="text-xs text-fg-muted">
        Se ven {visibles} tarjeta{visibles === 1 ? '' : 's'}, en {Math.max(1, Math.ceil(visibles / actual.columnas))} fila{Math.ceil(visibles / actual.columnas) === 1 ? '' : 's'} en escritorio. En celular van de a 2.
        {actual.modo === 'colecciones' && ' Al tocar una, se abre el catálogo filtrado por esa colección.'}
      </p>
    </div>
  );
}

function ImagenColeccion({ nombre, imagen, onSubir, onCambiar }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  async function subir(event) {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo || !onSubir) return;
    setError(''); setSubiendo(true);
    try { onCambiar(await onSubir(archivo)); }
    catch { setError('No se pudo subir la imagen. Volvé a intentar.'); }
    finally { setSubiendo(false); }
  }
  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <p className="text-sm font-medium text-fg">{nombre}</p>
      {imagen && <img src={getMediaUrl(imagen)} alt={`Imagen de ${nombre}`} className="h-28 w-full rounded-lg object-cover" />}
      <label className="block text-xs text-fg-muted">
        URL de imagen para {nombre}
        <input type="url" value={imagen} onChange={e => onCambiar(e.target.value)} disabled={subiendo}
          className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg" placeholder="https://..." />
      </label>
      <p className="text-xs leading-relaxed text-fg-muted">
        Recomendado: <strong className="font-semibold text-fg">1200 × 1600 px</strong> (vertical, proporción 3:4). Usá una imagen original de buena calidad, en JPG, PNG o WebP; agrandar una imagen pequeña no mejora su nitidez.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        {onSubir && <label className="text-xs font-semibold text-primary-text cursor-pointer">
          {subiendo ? 'Subiendo…' : 'Subir imagen'}
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Subir imagen para ${nombre}`} onChange={subir} disabled={subiendo} className="sr-only" />
        </label>}
        {imagen && <button type="button" disabled={subiendo} onClick={() => onCambiar('')} className="text-xs text-fg-muted underline">Usar imagen automática para {nombre}</button>}
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
