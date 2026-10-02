import React from 'react';
import { Link2Off } from 'lucide-react';
import {
  SECCIONES_BEAUTY, GRUPOS_PANEL_BEAUTY, LIMITES, ETIQUETA_FUENTE,
  clonarSeccionResuelta, fuenteDeSeccion, seccionEsPropia,
} from '../templates/beauty/fichaBeauty';
import IconoPicker from './IconoPicker';
import FaqPanel from './FaqPanel';
import FichaSeccionesShell from './ficha/FichaSeccionesShell';
import {
  CAMPO, MINI, ETIQUETA, AVISO_REAL,
  Texto, ListaEditable, ListaTextos, CampoImagen, Encabezado, CamposUrgencia,
} from './ficha/controles';

const SECCION_POR_KEY = Object.fromEntries(SECCIONES_BEAUTY.map(sec => [sec.key, sec]));

/**
 * Editor de la ficha de producto del template Beauty & Skin Care.
 *
 * Misma mecánica que FichaFitnessPanel: el panel agrupa todo el primer
 * bloque del producto en "Encabezado y compra" y el resto va en el orden de
 * la página; cada sección hereda (de la landing o de Vista del producto)
 * hasta que el comercio la toca, y ahí se clona tal cual se veía.
 *
 *   modo="producto" → content.productos["<id>"].ficha_beauty
 *   modo="landing"  → content.ficha_beauty (defaults de todas las fichas)
 *
 * No guarda: sube el objeto entero por onChange; lo persiste el Guardar.
 */
export default function FichaBeautyPanel({
  ficha,
  fichaResuelta,
  fichaLanding = null,
  fichaDelProducto = null,
  respaldos = {},
  // Paquetes (Ofertas 'normal') y variantes del producto: acá solo se
  // configura cómo se ven, se crean en Mis Productos / Ofertas.
  packs = [],
  variantes = [],
  modo = 'producto',
  onChange,
  faq = [],
  onFaqChange,
  faqTitulo = '',
  onFaqTitulo,
  // (file) => Promise<url>: sube las fotos propias de la ficha a R2.
  onSubirImagen = null,
}) {
  const esProducto = modo === 'producto';

  function construirSeccionEditada(fichaBase, key, cambios) {
    const base = seccionEsPropia(fichaBase, key)
      ? fichaBase[key]
      : clonarSeccionResuelta(fichaResuelta, key);
    // Escribir en una sección apagada la prende: si el comercio carga algo
    // es para verlo.
    const prender = !('activo' in cambios) && base.activo === false ? { activo: true } : {};
    return { ...base, ...cambios, ...prender };
  }

  function editar(key, cambios) {
    onChange({ ...(ficha || {}), [key]: construirSeccionEditada(ficha || {}, key, cambios) });
  }

  function editarGrupo(keys, cambios) {
    const nueva = { ...(ficha || {}) };
    keys.forEach(key => { nueva[key] = construirSeccionEditada(nueva, key, cambios); });
    onChange(nueva);
  }

  function volverAHeredar(key) {
    const copia = { ...(ficha || {}) };
    delete copia[key];
    onChange(copia);
  }

  const listaDe = (key, campo) => [...(fichaResuelta[key][campo] || [])];
  const listaOps = (key) => ({
    editar: (campo, i, c) => { const l = listaDe(key, campo); l[i] = { ...l[i], ...c }; editar(key, { [campo]: l }); },
    agregar: (campo, nuevo) => editar(key, { [campo]: [...listaDe(key, campo), nuevo] }),
    quitar: (campo, i) => editar(key, { [campo]: listaDe(key, campo).filter((_, x) => x !== i) }),
    mover: (campo, i, delta) => {
      const l = listaDe(key, campo);
      const destino = i + delta;
      if (destino < 0 || destino >= l.length) return;
      [l[i], l[destino]] = [l[destino], l[i]];
      editar(key, { [campo]: l });
    },
  });

  const fuente = (key) => fuenteDeSeccion(key, { fichaProducto: ficha, fichaLanding, fichaDelProducto });

  function fuenteDeGrupo(grupo) {
    if (!esProducto) return null;
    if (grupo.keys.some(key => seccionEsPropia(ficha, key))) return 'Tiene ajustes propios';
    const fuentes = grupo.keys.map(fuente);
    if (fuentes.includes('producto')) return ETIQUETA_FUENTE.producto;
    if (fuentes.includes('landing')) return ETIQUETA_FUENTE.landing;
    return ETIQUETA_FUENTE.fabrica;
  }

  function renderSeccion(key, { mostrarAyuda = true } = {}) {
    const sec = SECCION_POR_KEY[key];
    const propia = esProducto && seccionEsPropia(ficha, key);
    return (
      <>
        {mostrarAyuda && <p className="text-[11px] text-fg/35 leading-relaxed">{sec.ayuda}</p>}
        {CAMPOS[key]({
          d: fichaResuelta[key],
          set: (cambios) => editar(key, cambios),
          lista: listaOps(key),
          packs, variantes, respaldos, faq, onFaqChange, faqTitulo, onFaqTitulo, onSubirImagen, modo,
        })}
        {propia && (
          <button
            type="button"
            onClick={() => volverAHeredar(key)}
            className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-fg/45 hover:text-fg py-1.5 w-fit"
          >
            <Link2Off size={12} /> Descartar y volver a heredar
          </button>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-fg/40 leading-relaxed">
        {esProducto
          ? 'La ficha toma lo que ya cargaste en Vista del producto. Lo que escribas acá vale solo para este producto en esta landing.'
          : 'Estos valores los heredan todas las fichas de producto de esta landing. Cada producto puede pisarlos desde su Vista del producto.'}
      </p>

      <FichaSeccionesShell
        secciones={GRUPOS_PANEL_BEAUTY.map(g => ({
          key: g.key,
          numero: g.numero,
          label: g.label,
          activo: g.keys.some(key => fichaResuelta[key].activo),
          // En un grupo: tildado si están todas visibles, con guión si hay
          // visibles y ocultas. La casilla muestra u oculta el grupo entero.
          mixto: g.keys.some(key => fichaResuelta[key].activo) && !g.keys.every(key => fichaResuelta[key].activo),
          badge: fuenteDeGrupo(g),
          badgeDestacado: esProducto && g.keys.some(key => seccionEsPropia(ficha, key)),
        }))}
        onToggleActivo={(key, activo) => {
          const grupo = GRUPOS_PANEL_BEAUTY.find(g => g.key === key);
          if (grupo?.keys?.length > 1) editarGrupo(grupo.keys, { activo });
          else editar(key, { activo });
        }}
        renderInspector={(key) => {
          const grupo = GRUPOS_PANEL_BEAUTY.find(g => g.key === key);
          if (!grupo) return null;
          if (grupo.keys.length === 1) return renderSeccion(grupo.keys[0]);
          return (
            <>
              <p className="text-[11px] text-fg/35 leading-relaxed">{grupo.ayuda}</p>
              <div className="flex flex-col gap-3">
                {grupo.keys.map(subKey => {
                  const sec = SECCION_POR_KEY[subKey];
                  return (
                    <section key={subKey} className="rounded-xl border border-fg/10 bg-fg/[0.025] p-3 flex flex-col gap-2.5">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-semibold text-fg">{sec.label}</span>
                          <span className="block text-[10px] text-fg/35 leading-relaxed">{sec.ayuda}</span>
                          {esProducto && (
                            <span className={`block text-[10px] mt-0.5 ${seccionEsPropia(ficha, subKey) ? 'text-[var(--color-accent-text)]/80' : 'text-fg/35'}`}>
                              {ETIQUETA_FUENTE[fuente(subKey)]}
                            </span>
                          )}
                        </span>
                        <label className="shrink-0 inline-flex items-center cursor-pointer" title={fichaResuelta[subKey].activo ? 'Ocultar bloque' : 'Mostrar bloque'}>
                          <input
                            type="checkbox"
                            checked={fichaResuelta[subKey].activo}
                            onChange={e => editar(subKey, { activo: e.target.checked })}
                            className="w-4 h-4 accent-[var(--color-accent)]"
                          />
                        </label>
                      </div>
                      {renderSeccion(subKey, { mostrarAyuda: false })}
                    </section>
                  );
                })}
              </div>
            </>
          );
        }}
      />
    </div>
  );
}

/* ── Campos por sección ───────────────────────────────────────────── */

function ColorBoton({ valor, onChange }) {
  return (
    <div>
      <label className={ETIQUETA}>Color del botón</label>
      {valor ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-8 w-10 rounded border border-fg/10 bg-transparent cursor-pointer"
            value={/^#[0-9a-fA-F]{6}$/.test(valor) ? valor : '#000000'}
            onChange={e => onChange(e.target.value)}
          />
          <button type="button" onClick={() => onChange('')} className="text-[11px] text-fg/45 hover:text-fg">
            Volver al color de botones de la tienda
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 items-start">
          <p className="text-[11px] text-fg/50 leading-relaxed">
            Usa el <b className="text-fg/70">color de botones</b> de la tienda (pestaña Colores), igual que el resto.
          </p>
          <button type="button" onClick={() => onChange('#A9606D')} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg">
            Usar otro color solo en este botón
          </button>
        </div>
      )}
    </div>
  );
}

const CAMPOS = {
  urgencia: ({ d, set }) => <CamposUrgencia d={d} set={set} />,

  barra_superior: ({ d, set, lista }) => (
    <>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.barra_superior_items}
        textoAgregar="Agregar mensaje" nuevo={() => ({ icono: 'check', texto: '' })}
      >
        {(it, i) => (
          <div className="flex items-center gap-1.5">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="Envío gratis desde Gs. 150.000" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </div>
        )}
      </ListaEditable>
      <Texto label="Texto del botón (vacío = sin botón)" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
      <div className="border-t border-fg/10 pt-2.5">
        <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
          <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]" checked={d.animado !== false} onChange={e => set({ animado: e.target.checked })} />
          Desplazar los mensajes
        </label>
        {d.animado !== false && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={ETIQUETA}>Segundos por vuelta</label>
              <input type="number" min="8" max="120" className={CAMPO} value={d.velocidad} onChange={e => set({ velocidad: e.target.value })} />
            </div>
            <Texto label="Separador" valor={d.separador} placeholder="✦" onChange={v => set({ separador: v })} />
          </div>
        )}
      </div>
    </>
  ),

  migas: ({ d, set }) => (
    <Texto label="Primer tramo" valor={d.inicio} placeholder="Inicio" onChange={v => set({ inicio: v })} />
  ),

  hero: ({ d, set, respaldos }) => (
    <>
      <Texto label="Cintillo sobre la foto" valor={d.etiqueta} placeholder="Ej: Best seller" onChange={v => set({ etiqueta: v })} />
      <Texto label="Línea superior" valor={d.eyebrow} respaldo={respaldos.eyebrow} placeholder="Ej: Serum facial" onChange={v => set({ eyebrow: v })} />
      <Texto label="Título" valor={d.titulo} respaldo={respaldos.titulo} placeholder="Nombre del producto" onChange={v => set({ titulo: v })} />
      <Texto label="Promesa" area valor={d.lead} respaldo={respaldos.lead} placeholder="Para qué sirve, en una o dos líneas" onChange={v => set({ lead: v })} />
    </>
  ),

  prueba_social: ({ d, set }) => (
    <>
      <div className="grid grid-cols-[90px_1fr] gap-2">
        <div>
          <label className={ETIQUETA}>Calificación</label>
          <input type="number" min="0" max="5" step="0.1" className={CAMPO} value={d.calificacion} onChange={e => set({ calificacion: e.target.value })} />
        </div>
        <Texto label="Texto al lado" valor={d.resenas_texto} placeholder="(2.400 reseñas)" onChange={v => set({ resenas_texto: v })} />
      </div>
      <p className={AVISO_REAL}>Usá tu calificación y tu cantidad de reseñas reales.</p>
    </>
  ),

  precio: ({ d, set }) => (
    <>
      <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer">
        <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]" checked={d.mostrar_descuento !== false} onChange={e => set({ mostrar_descuento: e.target.checked })} />
        Mostrar el % de descuento
      </label>
      <Texto label="Nota debajo del precio" valor={d.nota} placeholder="Hasta 3 cuotas sin interés · Envío gratis incluido" onChange={v => set({ nota: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">El precio y el precio anterior salen del producto.</p>
    </>
  ),

  opciones: ({ d, set, packs, variantes }) => (
    <>
      <Texto label="Título de los tamaños / variantes" valor={d.titulo} placeholder="Elegí tu tamaño" onChange={v => set({ titulo: v })} />
      {variantes.length === 0 ? (
        <p className="text-[11px] text-fg/35 leading-relaxed">
          Este producto no tiene variantes. Se cargan en <b className="text-fg/60">Mis Productos</b> (ej. 30 ml / 50 ml) y aparecen como botones.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {variantes.map(v => {
            const conf = d.variantes?.[String(v.id)] || {};
            return (
              <div key={v.id} className="bg-fg/[0.03] border border-fg/10 rounded-lg p-2 flex flex-col gap-1.5">
                <p className="text-[11px] font-semibold text-fg/70 truncate">{v.nombre}</p>
                <input className={MINI} value={conf.nota || ''} placeholder="Nota (ej: Ideal para probar)" onChange={e => set({ variantes: { ...(d.variantes || {}), [String(v.id)]: { ...conf, nota: e.target.value } } })} />
              </div>
            );
          })}
        </div>
      )}
      <div className="border-t border-fg/10 pt-2.5 flex flex-col gap-2">
        <Texto label="Título de los packs" valor={d.titulo_packs} placeholder="Elegí tu pack" onChange={v => set({ titulo_packs: v })} />
        {packs.length === 0 ? (
          <p className="text-[11px] text-fg/35 leading-relaxed">
            Sin paquetes. Se crean en la pestaña <b className="text-fg/60">Ofertas</b> del producto (“Paquete — más unidades del mismo producto”).
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Texto label="Opción suelta" valor={d.etiqueta_individual} placeholder="1 unidad" onChange={v => set({ etiqueta_individual: v })} />
              <Texto label="Su nota" valor={d.nota_individual} placeholder="Ej: Para probar" onChange={v => set({ nota_individual: v })} />
            </div>
            {packs.map(p => {
              const conf = d.packs?.[String(p.id)] || {};
              return (
                <div key={p.id} className="bg-fg/[0.03] border border-fg/10 rounded-lg p-2 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-fg/70 truncate">{p.nombre}</p>
                  <input className={MINI} value={conf.nota || ''} placeholder="Nota (vacío = el % de ahorro)" onChange={e => set({ packs: { ...(d.packs || {}), [String(p.id)]: { ...conf, nota: e.target.value } } })} />
                </div>
              );
            })}
            <Texto label="Texto antes del % de ahorro" valor={d.texto_ahorro} placeholder="Ahorrás — vacío = solo -26%" onChange={v => set({ texto_ahorro: v })} />
          </>
        )}
      </div>
    </>
  ),

  compra: ({ d, set, lista, packs }) => (
    <>
      {packs.length > 0 && (
        <p className="text-[11px] text-fg/45 leading-relaxed">
          Este producto tiene paquetes en Ofertas: el selector de cantidad no se muestra y el cliente elige
          entre la unidad suelta y los paquetes.
        </p>
      )}
      <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer">
        <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]" checked={d.mostrar_cantidad !== false} onChange={e => set({ mostrar_cantidad: e.target.checked })} />
        Mostrar selector de cantidad
      </label>
      {d.mostrar_cantidad !== false && (
        <Texto label="Rótulo de la cantidad" valor={d.etiqueta_cantidad} placeholder="Cantidad" onChange={v => set({ etiqueta_cantidad: v })} />
      )}
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Agregar al carrito" onChange={v => set({ cta_texto: v })} />
        <Texto label="Después de tocarlo" valor={d.cta_agregado} placeholder="Agregado al carrito" onChange={v => set({ cta_agregado: v })} />
      </div>
      <ColorBoton valor={d.cta_color} onChange={v => set({ cta_color: v })} />
      <label className={ETIQUETA}>Notas debajo del botón</label>
      <ListaEditable
        items={d.notas} campo="notas" lista={lista} max={LIMITES.compra_notas}
        textoAgregar="Agregar nota" nuevo={() => ({ icono: 'check', texto: '' })}
      >
        {(it, i) => (
          <div className="flex items-center gap-1.5">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('notas', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="Despachamos en 24 horas" onChange={e => lista.editar('notas', i, { texto: e.target.value })} />
          </div>
        )}
      </ListaEditable>
    </>
  ),

  beneficios: ({ d, lista }) => (
    <ListaEditable
      items={d.items} campo="items" lista={lista} max={LIMITES.beneficios_items}
      textoAgregar="Agregar beneficio" nuevo={() => ({ titulo: '', texto: '' })}
    >
      {(it, i) => (
        <>
          <input className={`${MINI} w-full`} value={it.titulo || ''} placeholder="Hidratación intensa" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
          <input className={`${MINI} w-full`} value={it.texto || ''} placeholder="Sin sensación pesada" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
        </>
      )}
    </ListaEditable>
  ),

  historia: ({ d, set, onSubirImagen }) => (
    <>
      <Texto label="Rótulo chico" valor={d.eyebrow} placeholder="Por qué te va a encantar" onChange={v => set({ eyebrow: v })} />
      <Texto label="Título" valor={d.titulo} placeholder="Una fórmula simple para una piel que se siente bien." onChange={v => set({ titulo: v })} />
      <Texto label="Texto" area valor={d.texto} placeholder="Contá qué tiene de especial." onChange={v => set({ texto: v })} />
      <div>
        <label className={ETIQUETA}>Puntos con tilde</label>
        <ListaTextos items={d.puntos} max={LIMITES.historia_puntos} placeholder="Se puede usar bajo maquillaje" textoAgregar="Agregar punto" onChange={l => set({ puntos: l })} />
      </div>
      <CampoImagen label="Foto" valor={d.imagen} onChange={v => set({ imagen: v })} onSubir={onSubirImagen} respaldo="Sin foto se usa una de las fotos del producto." />
    </>
  ),

  ingredientes: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Encabezado d={d} set={set} conSubtitulo />
      <label className={ETIQUETA}>Activos</label>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.ingredientes_items}
        textoAgregar="Agregar activo" nuevo={() => ({ icono: 'droplet', nombre: '', descripcion: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="Ácido hialurónico" onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
            </div>
            <textarea rows={2} className={`${MINI} w-full`} value={it.descripcion || ''} placeholder="Qué hace por la piel." onChange={e => lista.editar('items', i, { descripcion: e.target.value })} />
            <CampoImagen compacto valor={it.imagen} onChange={v => lista.editar('items', i, { imagen: v })} onSubir={onSubirImagen} respaldo="Foto opcional: si la cargás, reemplaza al ícono." />
          </>
        )}
      </ListaEditable>
    </>
  ),

  como_funciona: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Encabezado d={d} set={set} />
      <label className={ETIQUETA}>Pasos</label>
      <ListaEditable
        items={d.pasos} campo="pasos" lista={lista} max={LIMITES.como_funciona_pasos}
        textoAgregar="Agregar paso" nuevo={() => ({ icono: 'droplet', titulo: '', descripcion: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <IconoPicker valor={it.icono} onChange={v => lista.editar('pasos', i, { icono: v })} />
              <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Limpiá" onChange={e => lista.editar('pasos', i, { titulo: e.target.value })} />
            </div>
            <textarea rows={2} className={`${MINI} w-full`} value={it.descripcion || ''} placeholder="Comenzá con el rostro limpio y seco." onChange={e => lista.editar('pasos', i, { descripcion: e.target.value })} />
            <CampoImagen compacto valor={it.imagen} onChange={v => lista.editar('pasos', i, { imagen: v })} onSubir={onSubirImagen} respaldo="Foto opcional: si la cargás, reemplaza al ícono." />
          </>
        )}
      </ListaEditable>
    </>
  ),

  antes_despues: ({ d, set, onSubirImagen }) => (
    <>
      <Encabezado d={d} set={set} conSubtitulo campoSubtitulo="texto" labelSubtitulo="Texto" />
      <div className="grid grid-cols-2 gap-2">
        <CampoImagen label="Foto de antes" valor={d.imagen_antes} onChange={v => set({ imagen_antes: v })} onSubir={onSubirImagen} />
        <CampoImagen label="Foto de después" valor={d.imagen_despues} onChange={v => set({ imagen_despues: v })} onSubir={onSubirImagen} />
      </div>
      <CampoImagen
        label="O una sola foto con las dos juntas"
        valor={d.imagen_combinada}
        onChange={v => set({ imagen_combinada: v })}
        onSubir={onSubirImagen}
        respaldo="Si tu foto ya trae el antes y el después lado a lado, subila acá: reemplaza a las dos de arriba y se muestra fija, sin deslizador."
      />
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Etiqueta izquierda" valor={d.etiqueta_antes} placeholder="Antes" onChange={v => set({ etiqueta_antes: v })} />
        <Texto label="Etiqueta derecha" valor={d.etiqueta_despues} placeholder="Después" onChange={v => set({ etiqueta_despues: v })} />
      </div>
      <p className={AVISO_REAL}>Solo fotos reales de clientas y con su permiso.</p>
    </>
  ),

  faq: ({ d, set, faqTitulo, onFaqTitulo, faq, onFaqChange }) => (
    <>
      <Texto label="Rótulo chico" valor={d.eyebrow} placeholder="Detalles del producto" onChange={v => set({ eyebrow: v })} />
      <Texto label="Título" valor={d.titulo} placeholder="Todo lo que necesitás saber." onChange={v => set({ titulo: v })} />
      {onFaqTitulo && faqTitulo && (
        <div>
          <label className={ETIQUETA}>Título propio de este producto</label>
          <input type="text" className={CAMPO} value={faqTitulo} onChange={e => onFaqTitulo(e.target.value)} />
          <p className="text-[10px] text-fg/30 mt-1 leading-relaxed">Reemplaza al de arriba. Borralo para usar el de arriba.</p>
        </div>
      )}
      {onFaqChange && <FaqPanel faq={faq} onChange={onFaqChange} />}
    </>
  ),

  resenas: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Texto label="Rótulo chico" valor={d.eyebrow} placeholder="Reseñas verificadas" onChange={v => set({ eyebrow: v })} />
      <Texto label="Título" valor={d.titulo} placeholder="Lo dicen quienes ya lo probaron." onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.resenas_items}
        textoAgregar="Agregar reseña" nuevo={() => ({ nombre: '', calificacion: 5, comentario: '', detalle: '', foto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="Sofía" onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
              <select className={`${MINI} w-[72px] shrink-0`} value={it.calificacion ?? 5} onChange={e => lista.editar('items', i, { calificacion: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map(k => <option key={k} value={k} className="bg-neutral-900">{k} ★</option>)}
                <option value={0} className="bg-neutral-900">Sin ★</option>
              </select>
            </div>
            <textarea rows={2} className={`${MINI} w-full`} value={it.comentario || ''} placeholder="Lo que contó la clienta." onChange={e => lista.editar('items', i, { comentario: e.target.value })} />
            <input className={`${MINI} w-full`} value={it.detalle || ''} placeholder="Detalle (ej: Compra verificada)" onChange={e => lista.editar('items', i, { detalle: e.target.value })} />
            <CampoImagen compacto valor={it.foto} onChange={v => lista.editar('items', i, { foto: v })} onSubir={onSubirImagen} respaldo="Foto opcional: de la clienta o del producto en uso." />
          </>
        )}
      </ListaEditable>
      <p className={AVISO_REAL}>Publicá solo reseñas reales. Inventarlas es publicidad engañosa.</p>
    </>
  ),

  upsells: ({ d, set, respaldos }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} respaldo={respaldos.upsellsTitulo} onChange={v => set({ titulo: v })} />
      <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Agregar" onChange={v => set({ cta_texto: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Los productos se eligen en la pestaña <b className="text-fg/60">Relacionados</b>.
      </p>
    </>
  ),

  garantias: ({ d, lista }) => (
    <ListaEditable
      items={d.items} campo="items" lista={lista} max={LIMITES.garantias_items}
      textoAgregar="Agregar sello" nuevo={() => ({ icono: 'shield', titulo: '', texto: '' })}
    >
      {(it, i) => (
        <>
          <div className="flex items-center gap-1.5">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Compra protegida" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
          </div>
          <input className={`${MINI} w-full`} value={it.texto || ''} placeholder="Tu pago y tus datos están seguros." onChange={e => lista.editar('items', i, { texto: e.target.value })} />
        </>
      )}
    </ListaEditable>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Marca" valor={d.marca} placeholder="Vacío = el nombre de la tienda" onChange={v => set({ marca: v })} />
      <Texto label="Frase" valor={d.texto} placeholder="Skincare para volver a vos." onChange={v => set({ texto: v })} />
    </>
  ),
};
