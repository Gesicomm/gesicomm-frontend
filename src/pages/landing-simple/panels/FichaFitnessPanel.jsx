import React from 'react';
import { Link2Off } from 'lucide-react';
import {
  SECCIONES_FICHA, GRUPOS_PANEL_FICHA, LIMITES, ETIQUETA_FUENTE,
  clonarSeccionResuelta, fuenteDeSeccion, seccionEsPropia,
} from '../templates/fitness/fichaFitness';
import IconoPicker from './IconoPicker';
import FaqPanel from './FaqPanel';
import FichaSeccionesShell from './ficha/FichaSeccionesShell';
import {
  CAMPO, MINI, ETIQUETA, AVISO_REAL,
  Texto, Fila, BotonAgregar, ListaEditable, ListaTextos, CampoImagen, Encabezado, CamposUrgencia,
} from './ficha/controles';

const SECCION_POR_KEY = Object.fromEntries(SECCIONES_FICHA.map(sec => [sec.key, sec]));

/**
 * Editor de la ficha de producto del template Fitness. Agrupa las piezas
 * chicas del encabezado en una sección del panel, pero conserva las claves
 * internas para no migrar datos guardados.
 *
 * Dos modos, el mismo componente:
 *   modo="producto" → edita content.productos["<id>"].ficha. Cada sección
 *     puede estar heredada (de la landing o de Vista del producto)
 *     producto) o escrita acá. El primer cambio sobre una sección heredada
 *     la clona tal cual se está viendo y la vuelve propia — el comercio
 *     nunca arranca de un formulario en blanco ni pierde lo que veía.
 *   modo="landing" → edita content.ficha_fitness, los valores por defecto
 *     que heredan todas las fichas. No hay herencia que mostrar.
 *
 * No guarda nada: sube el objeto entero por onChange, igual que el resto de
 * los paneles del armador. Lo persiste quien tenga el botón "Guardar".
 */
export default function FichaFitnessPanel({
  ficha,
  fichaResuelta,
  fichaLanding = null,
  fichaMarketing = null,
  packs = [],
  // Lo que la ficha muestra HOY en cada campo que puede quedar vacío: el
  // nombre del producto, su categoría, su descripción. Se usan de
  // placeholder para que el campo diga qué está mostrando en vez de una
  // explicación abstracta ("Vacío = el nombre del producto"), que no deja
  // ver de qué texto se está hablando.
  respaldos = {},
  modo = 'producto',
  onChange,
  // Preguntas y título de la sección "Preguntas frecuentes": viven en
  // Landing.content.productos["<id>"] (mismo lugar que descripción), NO
  // dentro de `ficha` — por eso llegan aparte y no por `onChange`.
  faq = [],
  onFaqChange,
  faqTitulo = '',
  onFaqTitulo,
  // (file) => Promise<url>. Sube las fotos propias de la ficha (antes y
  // después, ingredientes...). Sin esto los campos de imagen aceptan una
  // ruta escrita a mano.
  onSubirImagen = null,
}) {
  const esProducto = modo === 'producto';

  /**
   * Toda edición pasa por acá. Si la sección venía heredada, primero se
   * clona la versión resuelta (lo que el comercio está viendo en el
   * preview) y recién ahí se aplica el cambio.
   */
  function construirSeccionEditada(fichaBase, key, cambios) {
    const base = seccionEsPropia(fichaBase, key)
      ? fichaBase[key]
      : clonarSeccionResuelta(fichaResuelta, key);
    // Escribir en una sección apagada la prende: si el comercio sube una
    // foto o carga un texto, quiere verlo. Sin esto la sección seguía
    // oculta y parecía que el cambio no se había tomado.
    const prender = !('activo' in cambios) && base.activo === false ? { activo: true } : {};
    return { ...base, ...cambios, ...prender };
  }

  function editar(key, cambios) {
    onChange({ ...(ficha || {}), [key]: construirSeccionEditada(ficha || {}, key, cambios) });
  }

  function editarGrupo(keys, cambios) {
    const nueva = { ...(ficha || {}) };
    keys.forEach(key => {
      nueva[key] = construirSeccionEditada(nueva, key, cambios);
    });
    onChange(nueva);
  }

  function volverAHeredar(key) {
    const copia = { ...(ficha || {}) };
    delete copia[key];
    onChange(copia);
  }

  /** Helper de listas: sube el array completo con el elemento i modificado. */
  const editarItem = (key, campoLista, indice, cambios) => {
    const lista = [...(fichaResuelta[key][campoLista] || [])];
    lista[indice] = { ...lista[indice], ...cambios };
    editar(key, { [campoLista]: lista });
  };
  const agregarItem = (key, campoLista, nuevo) => {
    editar(key, { [campoLista]: [...(fichaResuelta[key][campoLista] || []), nuevo] });
  };
  const quitarItem = (key, campoLista, indice) => {
    editar(key, { [campoLista]: (fichaResuelta[key][campoLista] || []).filter((_, i) => i !== indice) });
  };
  const moverItem = (key, campoLista, indice, delta) => {
    const lista = [...(fichaResuelta[key][campoLista] || [])];
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    editar(key, { [campoLista]: lista });
  };

  function fuenteDeGrupo(grupo) {
    if (!esProducto) return null;
    const fuentes = grupo.keys.map(key => fuenteDeSeccion(key, { fichaProducto: ficha, fichaLanding, fichaMarketing }));
    if (grupo.keys.some(key => seccionEsPropia(ficha, key))) return 'Tiene ajustes propios';
    if (fuentes.includes('marketing')) return ETIQUETA_FUENTE.marketing;
    if (fuentes.includes('landing')) return ETIQUETA_FUENTE.landing;
    return ETIQUETA_FUENTE.fabrica;
  }

  function renderSeccion(key, { mostrarAyuda = true, compacta = false } = {}) {
    const sec = SECCION_POR_KEY[key];
    const datos = fichaResuelta[key];
    const propia = esProducto && seccionEsPropia(ficha, key);
    return (
      <>
        {mostrarAyuda && <p className="text-[11px] text-fg/35 leading-relaxed">{sec.ayuda}</p>}

        {CAMPOS[key]({
          d: datos,
          set: (cambios) => editar(key, cambios),
          lista: {
            editar: (campo, i, c) => editarItem(key, campo, i, c),
            agregar: (campo, nuevo) => agregarItem(key, campo, nuevo),
            quitar: (campo, i) => quitarItem(key, campo, i),
            mover: (campo, i, delta) => moverItem(key, campo, i, delta),
          },
          packs,
          respaldos,
          faq,
          onFaqChange,
          faqTitulo,
          onFaqTitulo,
          onSubirImagen,
          modo,
        })}

        {propia && (
          <button
            type="button"
            onClick={() => volverAHeredar(key)}
            className={`inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-fg/45 hover:text-fg py-1.5 ${compacta ? 'w-fit' : ''}`}
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
        secciones={GRUPOS_PANEL_FICHA.map(sec => {
          return {
            key: sec.key,
            numero: sec.numero,
            label: sec.label,
            activo: sec.keys.some(key => fichaResuelta[key].activo),
            // En un grupo: tildado si están todas visibles, con guión si hay
            // visibles y ocultas. La casilla muestra u oculta el grupo entero.
            mixto: sec.keys.some(key => fichaResuelta[key].activo) && !sec.keys.every(key => fichaResuelta[key].activo),
            badge: fuenteDeGrupo(sec),
            badgeDestacado: esProducto && sec.keys.some(key => seccionEsPropia(ficha, key)),
          };
        })}
        onToggleActivo={(key, activo) => {
          const grupo = GRUPOS_PANEL_FICHA.find(sec => sec.key === key);
          if (grupo?.keys?.length > 1) editarGrupo(grupo.keys, { activo });
          else editar(key, { activo });
        }}
        renderInspector={(key) => {
          const grupo = GRUPOS_PANEL_FICHA.find(s => s.key === key);
          if (!grupo) return null;
          if (grupo.keys.length === 1) return renderSeccion(grupo.keys[0]);
          return (
            <>
              <p className="text-[11px] text-fg/35 leading-relaxed">{grupo.ayuda}</p>
              <div className="flex flex-col gap-3">
                {grupo.keys.map(subKey => {
                  const sec = SECCION_POR_KEY[subKey];
                  const fuente = esProducto
                    ? fuenteDeSeccion(subKey, { fichaProducto: ficha, fichaLanding, fichaMarketing })
                    : null;
                  return (
                    <section key={subKey} className="rounded-xl border border-fg/10 bg-fg/[0.025] p-3 flex flex-col gap-2.5">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-semibold text-fg">{sec.label}</span>
                          <span className="block text-[10px] text-fg/35 leading-relaxed">{sec.ayuda}</span>
                          {esProducto && (
                            <span className={`block text-[10px] mt-0.5 ${seccionEsPropia(ficha, subKey) ? 'text-[var(--color-accent-text)]/80' : 'text-fg/35'}`}>
                              {ETIQUETA_FUENTE[fuente]}
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
                      {renderSeccion(subKey, { mostrarAyuda: false, compacta: true })}
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

const CAMPOS = {
  urgencia: ({ d, set }) => <CamposUrgencia d={d} set={set} />,

  anuncio: ({ d, set, lista }) => (
    <>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.anuncio_items}
        textoAgregar="Agregar mensaje" nuevo={() => ({ icono: 'shield', texto: '' })}
      >
        {(it, i) => (
          <div className="flex items-center gap-1.5">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="Envío gratis en todos los pedidos" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </div>
        )}
      </ListaEditable>
      <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Comprar ahora — vacío = sin botón" onChange={v => set({ cta_texto: v })} />
      <div className="border-t border-fg/10 pt-2.5">
        <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
          <input
            type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]"
            checked={d.animado !== false}
            onChange={e => set({ animado: e.target.checked })}
          />
          Desplazar los mensajes
        </label>
        {d.animado !== false && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={ETIQUETA}>Segundos por vuelta</label>
                <input
                  type="number" min="8" max="120" className={CAMPO}
                  value={d.velocidad}
                  onChange={e => set({ velocidad: e.target.value })}
                />
              </div>
              <Texto label="Separador" valor={d.separador} placeholder="✦" onChange={v => set({ separador: v })} />
            </div>
            <p className="text-[10px] text-fg/35 leading-relaxed mt-1.5">
              Más segundos = más lento. Se pausa cuando el visitante pasa el mouse, y no se mueve para
              quien pidió menos animaciones en su sistema.
            </p>
          </>
        )}
      </div>
    </>
  ),

  hero: ({ d, set, respaldos }) => (
    <>
      <Texto label="Línea superior" valor={d.eyebrow} respaldo={respaldos.eyebrow} placeholder="Ej: Cápsulas" onChange={v => set({ eyebrow: v })} />
      <Texto label="Título" valor={d.titulo} respaldo={respaldos.titulo} placeholder="Nombre del producto" onChange={v => set({ titulo: v })} />
      <Texto label="Parte destacada del título (negrita, en color)" valor={d.titulo_destacado} placeholder="Ej: más simple." onChange={v => set({ titulo_destacado: v })} />
      <Texto label="Arranque resaltado de la promesa" valor={d.lead_resaltado} placeholder="Ej: Cuidá tu bienestar" onChange={v => set({ lead_resaltado: v })} />
      <Texto label="Promesa" area valor={d.lead} respaldo={respaldos.lead} placeholder="Contale al cliente para qué sirve" onChange={v => set({ lead: v })} />
    </>
  ),

  compra: ({ d, set }) => (
    <>
      <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
      <Texto label="Letra chica dentro del botón" valor={d.microcopy} placeholder="Envío a todo el país" onChange={v => set({ microcopy: v })} />
      <div>
        <label className={ETIQUETA}>Color del botón</label>
        {d.cta_color ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-10 rounded border border-fg/10 bg-transparent cursor-pointer"
              value={/^#[0-9a-fA-F]{6}$/.test(d.cta_color) ? d.cta_color : '#000000'}
              onChange={e => set({ cta_color: e.target.value })}
            />
            <button type="button" onClick={() => set({ cta_color: '' })} className="text-[11px] text-fg/45 hover:text-fg">
              Volver al color de botones de la tienda
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 items-start">
            <p className="text-[11px] text-fg/50 leading-relaxed">
              Usa el <b className="text-fg/70">color de botones</b> de la tienda (pestaña Colores), igual que el resto de los botones.
            </p>
            <button type="button" onClick={() => set({ cta_color: '#E5231D' })} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg">
              Usar otro color solo en este botón
            </button>
          </div>
        )}
      </div>
    </>
  ),

  galeria_clientes: ({ d, set, lista, onSubirImagen, modo }) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Título" valor={d.titulo} placeholder="Ellos ya lo" onChange={v => set({ titulo: v })} />
        <Texto label="Parte destacada" valor={d.titulo_destacado} placeholder="probaron…" onChange={v => set({ titulo_destacado: v })} />
      </div>
      <label className={ETIQUETA}>Fotos</label>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.galeria_clientes_items}
        textoAgregar="Agregar foto" nuevo={() => ({ foto: '', nombre: '', calificacion: 5, comentario: '' })}
      >
        {(it, i) => (
          <>
            <CampoImagen compacto valor={it.foto} onChange={v => lista.editar('items', i, { foto: v })} onSubir={onSubirImagen} />
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="Nombre (opcional)" onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
              <select
                className={`${MINI} w-[72px] shrink-0`}
                value={it.calificacion ?? 5}
                onChange={e => lista.editar('items', i, { calificacion: Number(e.target.value) })}
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n} className="bg-neutral-900">{n} ★</option>)}
                <option value={0} className="bg-neutral-900">Sin ★</option>
              </select>
            </div>
            <textarea
              rows={3}
              className={`${MINI} w-full`}
              value={it.comentario || ''}
              placeholder="Lo que contó el cliente (ej: me ayudó a sentirme más liviana y a ordenar mis comidas)"
              onChange={e => lista.editar('items', i, { comentario: e.target.value })}
            />
          </>
        )}
      </ListaEditable>
      <p className="text-[11px] text-fg/40 leading-relaxed">
        {modo === 'producto'
          ? 'Estas fotos valen solo para este producto en esta landing: no cambian el producto ni otras landings.'
          : 'Estas fotos las heredan todos los productos de esta landing que no tengan fotos propias.'}
        {' '}Si no cargás ninguna, se usan las opiniones con foto del producto.
      </p>
      <p className={AVISO_REAL}>Solo fotos reales de clientes y con su permiso.</p>
    </>
  ),

  prueba_social: ({ d, set }) => (
    <>
      <div className="grid grid-cols-[90px_1fr] gap-2">
        <div>
          <label className={ETIQUETA}>Calificación</label>
          <input
            type="number" min="0" max="5" step="0.1" className={CAMPO}
            value={d.calificacion}
            onChange={e => set({ calificacion: e.target.value })}
          />
        </div>
        <Texto label="Texto al lado" valor={d.resenas_texto} placeholder="basado en +3.000 clientes" onChange={v => set({ resenas_texto: v })} />
      </div>
      <p className={AVISO_REAL}>Usá tu calificación y tu cantidad de clientes reales.</p>
    </>
  ),

  beneficios: ({ lista, d }) => (
    <ListaEditable
      items={d.items} campo="items" lista={lista} max={LIMITES.beneficios_items}
      textoAgregar="Agregar beneficio" nuevo={() => ({ icono: 'leaf', titulo: '', texto: '' })}
    >
      {(it, i) => (
        <>
          <div className="flex items-center gap-1.5">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Fórmula natural" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
          </div>
          <input className={`${MINI} w-full`} value={it.texto || ''} placeholder="Ingredientes seleccionados" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
        </>
      )}
    </ListaEditable>
  ),

  ofertas: ({ d, set, packs }) => (
    <>
      <Texto label="Título" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <div className="bg-fg/[0.03] border border-fg/10 rounded-lg p-2 flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold text-fg/70">Opción de 1 unidad</p>
        <input className={MINI} value={d.etiqueta_individual || ''} placeholder="Pack Inicio" onChange={e => set({ etiqueta_individual: e.target.value })} />
        <input className={MINI} value={d.subtitulo_individual || ''} placeholder="Subtítulo (ej: 1 mes de tratamiento)" onChange={e => set({ subtitulo_individual: e.target.value })} />
        <input className={MINI} value={d.badge_individual || ''} placeholder="Cintillo (ej: Para probar)" onChange={e => set({ badge_individual: e.target.value })} />
      </div>
      <Texto label="Texto antes del % de ahorro" valor={d.texto_ahorro} placeholder="Ahorrás — vacío = solo -26%" onChange={v => set({ texto_ahorro: v })} />

      <div>
        <label className={ETIQUETA}>Cada paquete</label>
        {packs.length === 0 ? (
          <p className="text-[11px] text-fg/35 leading-relaxed">
            Todavía no hay paquetes. Se crean en la pestaña <b className="text-fg/60">Venta</b> como
            “Paquete — más unidades del mismo producto”, y acá les ponés el cintillo (“Más elegido”, “Mejor valor”).
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {packs.map(p => {
              const conf = d.packs?.[String(p.id)] || {};
              const guardar = (cambios) => set({ packs: { ...(d.packs || {}), [String(p.id)]: { ...conf, ...cambios } } });
              return (
                <div key={p.id} className="bg-fg/[0.03] border border-fg/10 rounded-lg p-2 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-fg/70 truncate">{p.nombre}</p>
                  <input className={MINI} value={conf.badge || ''} placeholder="Cintillo (ej: Más elegido)" onChange={e => guardar({ badge: e.target.value })} />
                  <input className={MINI} value={conf.subtitulo || ''} placeholder="Subtítulo (ej: 2 meses de tratamiento)" onChange={e => guardar({ subtitulo: e.target.value })} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-fg/10 pt-2.5">
        <label className="flex items-center gap-2 text-[12px] font-semibold cursor-pointer mb-1.5">
          <input
            type="checkbox" className="w-3.5 h-3.5 accent-[var(--color-accent)]"
            checked={!!d.suscripcion.activo}
            onChange={e => set({ suscripcion: { ...d.suscripcion, activo: e.target.checked } })}
          />
          Mostrar opción de suscripción
        </label>
        {d.suscripcion.activo && (
          <div className="flex flex-col gap-2">
            <input className={CAMPO} value={d.suscripcion.titulo || ''} placeholder="Suscribite y ahorrá 15% adicional" onChange={e => set({ suscripcion: { ...d.suscripcion, titulo: e.target.value } })} />
            <input className={CAMPO} value={d.suscripcion.detalle || ''} placeholder="Envío automático cada 30 días. Cancelás cuando quieras." onChange={e => set({ suscripcion: { ...d.suscripcion, detalle: e.target.value } })} />
            <p className={AVISO_REAL}>
              Por ahora es informativo: marca la intención del cliente, no genera un cobro recurrente.
            </p>
          </div>
        )}
      </div>
    </>
  ),

  garantias: ({ d, lista }) => (
    <ListaEditable
      items={d.items} campo="items" lista={lista} max={LIMITES.garantias_items}
      textoAgregar="Agregar sello" nuevo={() => ({ icono: 'shield', titulo: '' })}
    >
      {(it, i) => (
        <div className="flex items-center gap-1.5 w-full">
          <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
          <input className={`${MINI} flex-1 min-w-0`} value={it.titulo || ''} placeholder="Compra segura" onChange={e => lista.editar('items', i, { titulo: e.target.value })} />
        </div>
      )}
    </ListaEditable>
  ),

  como_funciona: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Encabezado d={d} set={set} />
      <CampoImagen
        label="Foto"
        valor={d.imagen}
        onChange={v => set({ imagen: v })}
        onSubir={onSubirImagen}
        respaldo="Sin foto se usa la principal del producto."
      />
      <label className={ETIQUETA}>Etapas</label>
      <ListaEditable
        items={d.pasos} campo="pasos" lista={lista} max={LIMITES.como_funciona_pasos}
        textoAgregar="Agregar etapa" nuevo={() => ({ titulo: '', texto: '' })}
      >
        {(it, i) => (
          <>
            <input className={`${MINI} w-full`} value={it.titulo || ''} placeholder="Cuándo (ej: 2 semanas)" onChange={e => lista.editar('pasos', i, { titulo: e.target.value })} />
            <input className={`${MINI} w-full`} value={it.texto || ''} placeholder="Qué pasa (ej: Rutina más estable)" onChange={e => lista.editar('pasos', i, { texto: e.target.value })} />
          </>
        )}
      </ListaEditable>
      <p className={AVISO_REAL}>Describí el proceso sin prometer resultados de salud que no puedas respaldar.</p>
    </>
  ),

  ingredientes: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Encabezado d={d} set={set} conSubtitulo />
      <Texto label="Frase destacada (debajo de cada ingrediente)" valor={d.frase} placeholder="Hacé de tu bienestar una prioridad." onChange={v => set({ frase: v })} />
      <label className={ETIQUETA}>Ingredientes</label>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.ingredientes_items}
        textoAgregar="Agregar ingrediente" nuevo={() => ({ icono: 'leaf', nombre: '', dosis: '', texto: '', imagen: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5 w-full">
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="Nombre (ej: Psyllium)" onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
              <input className={`${MINI} w-[78px] shrink-0`} value={it.dosis || ''} placeholder="Dosis" onChange={e => lista.editar('items', i, { dosis: e.target.value })} />
            </div>
            <textarea rows={2} className={`${MINI} w-full`} value={it.texto || ''} placeholder="Para qué está en la fórmula." onChange={e => lista.editar('items', i, { texto: e.target.value })} />
            <div className="flex items-center gap-2">
              <CampoImagen compacto valor={it.imagen} onChange={v => lista.editar('items', i, { imagen: v })} onSubir={onSubirImagen} />
              {!it.imagen && <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} titulo="Ícono si no hay foto" />}
            </div>
          </>
        )}
      </ListaEditable>
    </>
  ),

  estadisticas: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Encabezado d={d} set={set} conSubtitulo campoSubtitulo="texto" labelSubtitulo="Texto" />
      <CampoImagen
        label="Foto"
        valor={d.imagen}
        onChange={v => set({ imagen: v })}
        onSubir={onSubirImagen}
        respaldo="Sin foto se usa una de las fotos del producto."
      />
      <label className={ETIQUETA}>Cifras</label>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.estadisticas_items}
        textoAgregar="Agregar cifra" nuevo={() => ({ valor: '', texto: '' })}
      >
        {(it, i) => (
          <div className="flex items-center gap-1.5 w-full">
            <input className={`${MINI} w-[70px] shrink-0`} value={it.valor || ''} placeholder="94%" onChange={e => lista.editar('items', i, { valor: e.target.value })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="lo recomendaría" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </div>
        )}
      </ListaEditable>
      <Texto label="De dónde salen las cifras" valor={d.nota} placeholder="Encuesta a 320 clientes, julio 2026" onChange={v => set({ nota: v })} />
      <p className={AVISO_REAL}>Publicá solo cifras que puedas respaldar, con su fuente. Inventarlas es publicidad engañosa.</p>
    </>
  ),

  antes_despues: ({ d, set, onSubirImagen }) => (
    <>
      <Encabezado d={d} set={set} conSubtitulo />
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
      <Texto label="Título del bloque" valor={d.bloque_titulo} placeholder="Un proceso que se nota" onChange={v => set({ bloque_titulo: v })} />
      <Texto label="Texto" area valor={d.texto} onChange={v => set({ texto: v })} />
      <div>
        <label className={ETIQUETA}>Puntos con tilde</label>
        <ListaTextos
          items={d.puntos} max={LIMITES.antes_despues_puntos}
          placeholder="Más ligereza" textoAgregar="Agregar punto"
          onChange={l => set({ puntos: l })}
        />
      </div>
      <p className={AVISO_REAL}>Solo fotos reales de clientes y con su permiso.</p>
    </>
  ),

  comparativa: ({ d, set, lista }) => (
    <>
      <Encabezado d={d} set={set} conSubtitulo />
      <div className="grid grid-cols-3 gap-2">
        <Texto label="Columna 1" valor={d.columna_beneficio} placeholder="Beneficios" onChange={v => set({ columna_beneficio: v })} />
        <Texto label="Tu columna" valor={d.nosotros} placeholder="Tu tienda" onChange={v => set({ nosotros: v })} />
        <Texto label="La otra" valor={d.otros} placeholder="Otras marcas" onChange={v => set({ otros: v })} />
      </div>
      <label className={ETIQUETA}>Filas</label>
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.comparativa_items}
        textoAgregar="Agregar fila" nuevo={() => ({ caracteristica: '', nosotros: '', otros: '' })}
      >
        {(it, i) => (
          <>
            <input className={`${MINI} w-full`} value={it.caracteristica || ''} placeholder="Pago al recibir" onChange={e => lista.editar('items', i, { caracteristica: e.target.value })} />
            <div className="grid grid-cols-2 gap-1.5">
              <input className={MINI} value={it.nosotros || ''} placeholder="Nosotros: Sí" onChange={e => lista.editar('items', i, { nosotros: e.target.value })} />
              <input className={MINI} value={it.otros || ''} placeholder="Otros: No siempre" onChange={e => lista.editar('items', i, { otros: e.target.value })} />
            </div>
          </>
        )}
      </ListaEditable>
    </>
  ),

  opiniones: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Texto label="Rótulo chico" valor={d.eyebrow} onChange={v => set({ eyebrow: v })} />
      <Texto label="Título" valor={d.titulo} onChange={v => set({ titulo: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.opiniones_items}
        textoAgregar="Agregar opinión" nuevo={() => ({ nombre: '', calificacion: 5, comentario: '', foto: '' })}
      >
        {(it, i) => (
          <>
            <div className="flex items-center gap-1.5">
              <input className={`${MINI} flex-1 min-w-0`} value={it.nombre || ''} placeholder="Juan P." onChange={e => lista.editar('items', i, { nombre: e.target.value })} />
              <select
                className={`${MINI} w-[64px] shrink-0`}
                value={it.calificacion}
                onChange={e => lista.editar('items', i, { calificacion: Number(e.target.value) })}
              >
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n} className="bg-neutral-900">{n} ★</option>)}
              </select>
            </div>
            <textarea rows={2} className={MINI} value={it.comentario || ''} placeholder="Lo que contó el cliente." onChange={e => lista.editar('items', i, { comentario: e.target.value })} />
            <CampoImagen compacto valor={it.foto} onChange={v => lista.editar('items', i, { foto: v })} onSubir={onSubirImagen} />
          </>
        )}
      </ListaEditable>
      <p className={AVISO_REAL}>
        Publicá solo opiniones y fotos reales de clientes, con su permiso: inventarlas es publicidad engañosa.
      </p>
    </>
  ),

  faq: ({ d, set, faqTitulo, onFaqTitulo, faq, onFaqChange }) => (
    <>
      <Encabezado d={d} set={set} />
      {onFaqTitulo && faqTitulo && (
        <div>
          <label className={ETIQUETA}>Título propio de este producto</label>
          <input type="text" className={CAMPO} value={faqTitulo} onChange={e => onFaqTitulo(e.target.value)} />
          <p className="text-[10px] text-fg/30 mt-1 leading-relaxed">
            Este producto tiene un título propio que reemplaza al de arriba. Borralo para usar el de arriba.
          </p>
        </div>
      )}
      {onFaqChange && <FaqPanel faq={faq} onChange={onFaqChange} />}
    </>
  ),

  upsells: ({ d, set, respaldos }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} respaldo={respaldos.upsellsTitulo} onChange={v => set({ titulo: v })} />
      <Texto label="Texto del botón" valor={d.cta_texto} placeholder="Agregar" onChange={v => set({ cta_texto: v })} />
      <p className="text-[11px] text-fg/35 leading-relaxed">
        Los productos que aparecen acá se eligen en la pestaña <b className="text-fg/60">Relacionados</b>.
      </p>
    </>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Frase" valor={d.titulo} placeholder="Bienestar real, todos los días." onChange={v => set({ titulo: v })} />
      <Texto label="Texto de la derecha" valor={d.texto} placeholder="Compra segura · Envío a todo el país" onChange={v => set({ texto: v })} />
    </>
  ),
};
