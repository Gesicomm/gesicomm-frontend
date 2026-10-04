import React, { useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Loader, Pencil } from 'lucide-react';
import { categoriaService } from '../../../services/catalogoService';
import Campo from '../CampoTexto';
import {
  leerHero, escribirHero, leerPromo, escribirPromo,
  leerCategoriasCuradas, escribirCategoriasCuradas,
  leerSecciones, moverSeccion, alternarVisibilidad,
  leerVitrina, escribirVitrina, FUENTES_VITRINA,
} from '../plantillaInicioEditor';

/** Catálogo de categorías de la tienda — lo usan tanto "Categorías" como el
 * selector de categoría de cada vitrina, así que se pide una sola vez acá. */
function useCategoriasCatalogo() {
  const [categorias, setCategorias] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let activo = true;
    categoriaService.buscar({ por_pagina: 200 })
      .then(res => { if (activo) setCategorias(res?.categorias || []); })
      .catch(() => { if (activo) setError('No se pudieron cargar tus categorías.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);
  return { categorias, cargando, error };
}

/**
 * Pestaña "Secciones" del Lienzo en blanco (vista Inicio): edita por
 * bloques (hero, banner, categorías, orden/visibilidad) en vez de HTML a
 * mano. Es una capa de edición sobre el MISMO `codigo.html` de siempre
 * (ver plantillaInicioEditor.js) — no hay guardado propio ni campo nuevo:
 * cada cambio llama a `onCambiarHtml`, que el padre persiste con el mismo
 * `escribir('html', ...)` que usa la pestaña HTML.
 *
 * Si el comercio borró o modificó tanto el HTML que ya no matchea la
 * estructura esperada (por ejemplo, pegó una landing distinta), las
 * secciones de abajo que no se puedan leer simplemente no se muestran —
 * nunca se rompe el guardado.
 */
export default function SeccionesPanel({ html, onCambiarHtml }) {
  const hero = useMemo(() => leerHero(html), [html]);
  const promo = useMemo(() => leerPromo(html), [html]);
  const secciones = useMemo(() => leerSecciones(html), [html]);
  const categoriasCuradas = useMemo(() => leerCategoriasCuradas(html), [html]);
  const [vitrinaAbierta, setVitrinaAbierta] = useState(null); // índice de sección, o null
  const categoriasCatalogo = useCategoriasCatalogo();

  return (
    <div className="p-4 space-y-6 overflow-y-auto">
      <BloqueEstructura
        secciones={secciones}
        onCambiar={onCambiarHtml}
        html={html}
        vitrinaAbierta={vitrinaAbierta}
        onEditarVitrina={i => setVitrinaAbierta(prev => (prev === i ? null : i))}
      />
      {vitrinaAbierta !== null && (
        <BloqueVitrina
          indice={vitrinaAbierta}
          html={html}
          onCambiarHtml={onCambiarHtml}
          categoriasCatalogo={categoriasCatalogo}
        />
      )}
      {hero && <BloqueHero hero={hero} html={html} onCambiarHtml={onCambiarHtml} />}
      {promo && <BloquePromo promo={promo} html={html} onCambiarHtml={onCambiarHtml} />}
      <BloqueCategorias curadas={categoriasCuradas} html={html} onCambiarHtml={onCambiarHtml} categoriasCatalogo={categoriasCatalogo} />
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div className="border border-fg/10 rounded-xl p-3.5 space-y-3">
      <h3 className="text-xs font-bold text-fg/80 uppercase tracking-wide">{titulo}</h3>
      {children}
    </div>
  );
}

function BloqueEstructura({ secciones, html, onCambiar, vitrinaAbierta, onEditarVitrina }) {
  if (!secciones.length) return null;
  return (
    <Seccion titulo="Estructura de la página">
      <ul className="space-y-1">
        {secciones.map((s) => (
          <li
            key={s.indice}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm ${s.oculta ? 'opacity-40' : ''} ${vitrinaAbierta === s.indice ? 'bg-primary/15' : 'bg-fg/[0.03]'}`}
          >
            <span className="flex-1 truncate">{s.etiqueta}{s.esHero ? ' (fija)' : ''}</span>
            {s.esVitrina && (
              <button
                type="button"
                title="Editar vitrina"
                onClick={() => onEditarVitrina(s.indice)}
                className="p-1 rounded hover:bg-fg/10"
              ><Pencil size={14} /></button>
            )}
            <button
              type="button"
              title="Subir"
              disabled={s.indice === 0}
              onClick={() => onCambiar(moverSeccion(html, s.indice, -1))}
              className="p-1 rounded hover:bg-fg/10 disabled:opacity-30"
            ><ChevronUp size={14} /></button>
            <button
              type="button"
              title="Bajar"
              disabled={s.indice === secciones.length - 1}
              onClick={() => onCambiar(moverSeccion(html, s.indice, 1))}
              className="p-1 rounded hover:bg-fg/10 disabled:opacity-30"
            ><ChevronDown size={14} /></button>
            {!s.esHero && (
              <button
                type="button"
                title={s.oculta ? 'Mostrar' : 'Ocultar'}
                onClick={() => onCambiar(alternarVisibilidad(html, s.indice))}
                className="p-1 rounded hover:bg-fg/10"
              >
                {s.oculta ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

function BloqueVitrina({ indice, html, onCambiarHtml, categoriasCatalogo }) {
  const vitrina = useMemo(() => leerVitrina(html, indice), [html, indice]);
  if (!vitrina) return null;

  function set(campo, valor) {
    onCambiarHtml(escribirVitrina(html, indice, { [campo]: valor }));
  }

  const fuenteInfo = FUENTES_VITRINA.find(f => f.id === vitrina.fuente);

  return (
    <Seccion titulo="Vitrina de productos">
      <Campo etiqueta="Título" valor={vitrina.titulo} onChange={v => set('titulo', v)} />
      <Campo etiqueta="Subtítulo (opcional)" valor={vitrina.subtitulo} onChange={v => set('subtitulo', v)} />

      <label className="block">
        <span className="block text-xs font-semibold text-fg/70 mb-1">Origen de los productos</span>
        <select
          value={vitrina.fuente}
          onChange={e => set('fuente', e.target.value)}
          className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
        >
          {FUENTES_VITRINA.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        {fuenteInfo?.ayuda && <span className="block mt-1 text-[11px] text-fg/35">{fuenteInfo.ayuda}</span>}
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-fg/70 mb-1">Solo de esta categoría (opcional)</span>
        <select
          value={vitrina.categoria}
          onChange={e => set('categoria', e.target.value)}
          className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
          disabled={categoriasCatalogo.cargando}
        >
          <option value="">Todas</option>
          {(categoriasCatalogo.categorias || []).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-fg/70 mb-1">Cantidad a mostrar</span>
        <input
          type="number"
          min={1}
          max={12}
          value={vitrina.cantidad}
          onChange={e => set('cantidad', parseInt(e.target.value, 10) || 4)}
          className="w-24 bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
        />
      </label>
    </Seccion>
  );
}

function BloqueHero({ hero, html, onCambiarHtml }) {
  function set(campo, valor) {
    onCambiarHtml(escribirHero(html, { [campo]: valor }));
  }
  return (
    <Seccion titulo="Hero (banner principal)">
      <Campo etiqueta="Texto pequeño arriba" valor={hero.eyebrow} onChange={v => set('eyebrow', v)} />
      <Campo etiqueta="Título" valor={hero.titulo} onChange={v => set('titulo', v)} />
      <Campo etiqueta="Título — parte destacada" ayuda="Se muestra en otro color/estilo, al final del título." valor={hero.tituloEnfasis} onChange={v => set('tituloEnfasis', v)} />
      <Campo etiqueta="Subtítulo" multilinea valor={hero.subtitulo} onChange={v => set('subtitulo', v)} />
      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta="Texto del botón" valor={hero.ctaTexto} onChange={v => set('ctaTexto', v)} />
        <Campo etiqueta="Destino del botón" ayuda="Ej: #destacados o una URL" valor={hero.ctaHref} onChange={v => set('ctaHref', v)} />
      </div>
    </Seccion>
  );
}

function BloquePromo({ promo, html, onCambiarHtml }) {
  function set(campo, valor) {
    onCambiarHtml(escribirPromo(html, { [campo]: valor }));
  }
  return (
    <Seccion titulo="Banner de promoción">
      <Campo etiqueta="Texto pequeño arriba" valor={promo.eyebrow} onChange={v => set('eyebrow', v)} />
      <Campo etiqueta="Título" valor={promo.titulo} onChange={v => set('titulo', v)} />
      <Campo etiqueta="Texto" multilinea valor={promo.subtitulo} onChange={v => set('subtitulo', v)} />
      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta="Texto del botón" valor={promo.ctaTexto} onChange={v => set('ctaTexto', v)} />
        <Campo etiqueta="Destino del botón" ayuda="Ej: #productos o una URL" valor={promo.ctaHref} onChange={v => set('ctaHref', v)} />
      </div>
    </Seccion>
  );
}

function BloqueCategorias({ curadas, html, onCambiarHtml, categoriasCatalogo }) {
  const { categorias: catalogo, cargando, error: errorCarga } = categoriasCatalogo;
  const elegidas = curadas || [];
  const nombresElegidos = new Set(elegidas.map(c => c.nombre));

  function guardar(nuevasElegidas) {
    onCambiarHtml(escribirCategoriasCuradas(html, nuevasElegidas));
  }

  function toggle(nombre) {
    if (nombresElegidos.has(nombre)) {
      guardar(elegidas.filter(c => c.nombre !== nombre));
    } else {
      guardar([...elegidas, { nombre }]);
    }
  }

  function mover(idx, delta) {
    const destino = idx + delta;
    if (destino < 0 || destino >= elegidas.length) return;
    const copia = elegidas.slice();
    [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
    guardar(copia);
  }

  return (
    <Seccion titulo="Categorías">
      <p className="text-[11px] text-fg/40">
        {curadas
          ? 'Elegiste mostrar solo estas categorías, en este orden.'
          : 'Por ahora se muestran automáticamente todas las categorías que tengan productos. Elegí manualmente si querés curar cuáles y en qué orden.'}
      </p>

      {elegidas.length > 0 && (
        <ul className="space-y-1">
          {elegidas.map((c, idx) => (
            <li key={c.nombre} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-fg/[0.03] text-sm">
              <span className="flex-1 truncate">{c.nombre}</span>
              <button type="button" disabled={idx === 0} onClick={() => mover(idx, -1)} className="p-1 rounded hover:bg-fg/10 disabled:opacity-30"><ChevronUp size={13} /></button>
              <button type="button" disabled={idx === elegidas.length - 1} onClick={() => mover(idx, 1)} className="p-1 rounded hover:bg-fg/10 disabled:opacity-30"><ChevronDown size={13} /></button>
              <button type="button" onClick={() => toggle(c.nombre)} className="text-[11px] font-semibold text-danger/80 hover:text-danger px-1.5">Quitar</button>
            </li>
          ))}
        </ul>
      )}

      {cargando && <p className="text-xs text-fg/40 flex items-center gap-1.5"><Loader size={12} className="animate-spin" /> Cargando categorías…</p>}
      {errorCarga && <p className="text-xs text-danger">{errorCarga}</p>}

      {!cargando && catalogo && (
        <div className="space-y-1 max-h-48 overflow-y-auto border-t border-fg/10 pt-2">
          {catalogo.filter(c => !nombresElegidos.has(c.nombre)).map(c => (
            <label key={c.id} className="flex items-center gap-2 px-1 py-1 text-sm text-fg/70 cursor-pointer hover:text-fg">
              <input type="checkbox" checked={false} onChange={() => toggle(c.nombre)} className="accent-fg" />
              {c.nombre}
            </label>
          ))}
          {catalogo.length === 0 && <p className="text-xs text-fg/40">Todavía no tenés categorías cargadas en tu catálogo.</p>}
        </div>
      )}

      {curadas && (
        <button type="button" onClick={() => guardar(null)} className="text-[11px] font-semibold text-fg/50 hover:text-fg/80">
          Volver a automático
        </button>
      )}
    </Seccion>
  );
}
