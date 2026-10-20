import EditorOfertaTiempoLimitado from '../EditorOfertaTiempoLimitado';
import { ofertaProductoDesdeCombo, CAMPOS_OFERTA_COMBO, VISIBILIDAD_OFERTA_COMBO } from '../ofertaComboAdapter';
import ListaOpinionesProducto from '../ListaOpinionesProducto';
import ListaConfianzaProducto from '../ListaConfianzaProducto';
import React, { useState } from 'react';
import { ChevronDown, Link2Off, Plus, Trash2 } from 'lucide-react';
import {
  SECCIONES_COMBO, LIMITES, ETIQUETA_FUENTE,
  clonarSeccionResuelta, fuenteDeSeccion, seccionEsPropia,
} from '../templates/combo/fichaCombo';
import IconoPicker from './IconoPicker';
import EmojiOImagenCombo from './EmojiOImagenCombo';
import FichaSeccionesShell from './ficha/FichaSeccionesShell';
import ControlCombo, { ContextoControlCombo } from './ControlCombo';
import { PARTES_HERO_COMBO, PARTES_BLOQUE_COMBO } from '../comboBloques';
import SubbloqueCombo from './SubbloqueCombo';

/**
 * Panel de la ficha del template Combo.
 *
 * Misma estructura y mismo diseño que FichaBasicoPanel/FichaFitnessPanel/
 * etc.: una fila plegable por sección, con su número, su interruptor y la
 * etiqueta de dónde sale lo que se está viendo. Lo único propio son los
 * campos de cada sección — "Qué incluye" y "Detalle de cada producto" se
 * arman solas con los productos del combo, así que acá solo se configura
 * el título/subtítulo, no el contenido.
 */

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const MINI = 'bg-fg/5 border border-fg/10 rounded-lg px-2 py-1.5 text-[13px] text-fg placeholder:text-fg/25 focus:outline-none focus:border-fg/30';
const ETIQUETA = 'block text-[10px] font-semibold uppercase tracking-wide text-fg/40 mb-1';

export default function FichaComboPanel({
  ficha,
  fichaResuelta,
  fichaLanding = null,
  fichaDelProducto = null,
  respaldos = {},
  modo = 'producto',
  // Vista del combo (ComboEditor.jsx) es una pantalla propia, ancha, sin el
  // sidebar angosto del page-builder: ahí las secciones se muestran todas
  // abiertas en fila (misma idea que Vista del producto) en vez de acordeón
  // de a una, para que no se sienta como un panel técnico escondido.
  expandirTodas = false,
  seccionUnica = null,
  soloTextos = false,
  soloContenido = false,
  onChange,
  onSubirImagen,
}) {
  const esProducto = modo === 'producto';

  const baseDe = key => ({ ...clonarSeccionResuelta(fichaResuelta, key), ...ficha?.[key] });

  const guardar = (key, seccion) => onChange({ ...(ficha || {}), [key]: seccion });
  const editar = (key, update) => guardar(key, { ...baseDe(key), ...update });

  const editarItem = (key, campo, index, cambios) => {
    const base = baseDe(key);
    const lista = [...(base[campo] || [])];
    lista[index] = { ...lista[index], ...cambios };
    guardar(key, { ...base, [campo]: lista });
  };
  const agregarItem = (key, campo, nuevo) => {
    const base = baseDe(key);
    guardar(key, { ...base, [campo]: [...(base[campo] || []), nuevo] });
  };
  const quitarItem = (key, campo, index) => {
    const base = baseDe(key);
    guardar(key, { ...base, [campo]: (base[campo] || []).filter((_, i) => i !== index) });
  };
  const moverItem = (key, campo, index, delta) => {
    const base = baseDe(key);
    const lista = [...(base[campo] || [])];
    const destino = index + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[index], lista[destino]] = [lista[destino], lista[index]];
    guardar(key, { ...base, [campo]: lista });
  };

  const volverAHeredar = (key) => {
    const copia = { ...(ficha || {}) };
    delete copia[key];
    onChange(copia);
  };

  const intro = (
    <p className="text-sm text-fg/70 mb-5 leading-relaxed">
      {esProducto ? (
        <>Configurá cómo se ve <strong>este combo</strong> en su ficha de detalle.</>
      ) : (
        <>Configurá los textos por defecto para <strong>todos los combos</strong> de esta landing.</>
      )}
    </p>
  );

  if (seccionUnica && CAMPOS[seccionUnica]) {
    return <ContextoControlCombo.Provider value={{ partes: fichaResuelta[seccionUnica].partes,
      nombres: Object.fromEntries(seccionUnica === 'hero' ? PARTES_HERO_COMBO : PARTES_BLOQUE_COMBO[seccionUnica] || []),
      cambiar: (parte, activo) => editar(seccionUnica, { partes: { ...fichaResuelta[seccionUnica].partes, [parte]: activo } }),
    }}>{renderCampos(seccionUnica, { onSubirImagen,
      d: fichaResuelta[seccionUnica], respaldos, soloTextos, soloContenido,
      set: cambios => editar(seccionUnica, cambios),
      lista: {
        editar: (campo, i, c) => editarItem(seccionUnica, campo, i, c),
        agregar: (campo, nuevo) => agregarItem(seccionUnica, campo, nuevo),
        quitar: (campo, i) => quitarItem(seccionUnica, campo, i),
        mover: (campo, i, delta) => moverItem(seccionUnica, campo, i, delta),
      },
    })}</ContextoControlCombo.Provider>;
  }

  // Vista del combo (ComboEditor.jsx): pantalla ancha sin sidebar, todas las
  // secciones abiertas en fila — no pasa por el navigator/inspector, que
  // solo tiene sentido en el sidebar angosto de ProductoPanel.
  if (expandirTodas) {
    return (
      <div className="space-y-4 pb-8">
        {intro}
        {SECCIONES_COMBO.map(sec => {
          const propia = seccionEsPropia(ficha, sec.key);
          const fuente = fuenteDeSeccion(sec.key, { fichaProducto: ficha, fichaLanding, fichaDelProducto });
          const datos = fichaResuelta[sec.key] || {};

          return (
            <div key={sec.key} className="bg-canvas border border-fg/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-4 transition-colors">
                <span className={`flex items-center justify-center shrink-0 rounded-full font-bold w-6 h-6 text-[11px] ${datos.activo ? 'bg-fg text-canvas' : 'bg-fg/10 text-fg/40'}`}>
                  {sec.numero}
                </span>
                <span className={`flex-1 min-w-0 ${datos.activo ? 'text-fg' : 'text-fg/40 line-through'}`}>
                  <span className="block text-[14px] font-semibold truncate">{sec.label}</span>
                  <span className="block text-[11px] text-fg/40 truncate">{sec.ayuda}</span>
                </span>
                <label className="shrink-0 inline-flex items-center cursor-pointer" title={datos.activo ? 'Ocultar sección' : 'Mostrar sección'}>
                  <input
                    type="checkbox"
                    checked={!!datos.activo}
                    onChange={e => editar(sec.key, { activo: e.target.checked })}
                    className="w-4 h-4 accent-[var(--color-accent)]"
                  />
                </label>
              </div>

              <div className="px-4 pb-4 flex flex-col gap-3 border-t border-fg/10 pt-3.5">
                {esProducto && (
                  <p className={`text-[11px] -mt-1 ${propia ? 'text-[var(--color-accent-text)]/80' : 'text-fg/35'}`}>
                    {ETIQUETA_FUENTE[fuente]}
                  </p>
                )}

                {renderCampos(sec.key, { onSubirImagen,
                  d: datos,
                  set: (cambios) => editar(sec.key, cambios),
                  lista: {
                    editar: (campo, i, c) => editarItem(sec.key, campo, i, c),
                    agregar: (campo, nuevo) => agregarItem(sec.key, campo, nuevo),
                    quitar: (campo, i) => quitarItem(sec.key, campo, i),
                    mover: (campo, i, delta) => moverItem(sec.key, campo, i, delta),
                  },
                  respaldos,
                })}

                {propia && (
                  <button
                    type="button"
                    onClick={() => volverAHeredar(sec.key)}
                    className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-fg/45 hover:text-fg py-1.5"
                  >
                    <Link2Off size={12} /> Descartar y volver a heredar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 pb-32">
      {intro}
      <FichaSeccionesShell
        secciones={SECCIONES_COMBO.map(sec => {
          const propia = seccionEsPropia(ficha, sec.key);
          const fuente = fuenteDeSeccion(sec.key, { fichaProducto: ficha, fichaLanding, fichaDelProducto });
          return {
            key: sec.key,
            numero: sec.numero,
            label: sec.label,
            activo: !!(fichaResuelta[sec.key] || {}).activo,
            badge: esProducto ? ETIQUETA_FUENTE[fuente] : null,
            badgeDestacado: propia,
          };
        })}
        onToggleActivo={(key, activo) => editar(key, { activo })}
        renderInspector={(key) => {
          const sec = SECCIONES_COMBO.find(s => s.key === key);
          const datos = fichaResuelta[key] || {};
          const propia = seccionEsPropia(ficha, key);
          return (
            <>
              <p className="text-[11px] text-fg/35 leading-relaxed">{sec.ayuda}</p>

              {renderCampos(key, { onSubirImagen,
                d: datos,
                set: (cambios) => editar(key, cambios),
                lista: {
                  editar: (campo, i, c) => editarItem(key, campo, i, c),
                  agregar: (campo, nuevo) => agregarItem(key, campo, nuevo),
                  quitar: (campo, i) => quitarItem(key, campo, i),
                  mover: (campo, i, delta) => moverItem(key, campo, i, delta),
                },
                respaldos,
              })}

              {propia && (
                <button
                  type="button"
                  onClick={() => volverAHeredar(key)}
                  className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-fg/45 hover:text-fg py-1.5"
                >
                  <Link2Off size={12} /> Descartar y volver a heredar
                </button>
              )}
            </>
          );
        }}
      />
    </div>
  );
}

function renderCampos(key, props) {
  const campos = CAMPOS[key](props);
  const elementos = React.Children.toArray(campos.props.children).filter(el => {
    if (!props.soloTextos && !props.soloContenido) return true;
    if (!React.isValidElement(el)) return false;
    return props.soloTextos ? el.type === Texto : el.type !== Texto && el.type !== 'p';
  });
  return <ContextoControlCombo.Provider value={{ partes: props.d.partes,
    nombres: Object.fromEntries(key === 'hero' ? PARTES_HERO_COMBO : PARTES_BLOQUE_COMBO[key] || []),
    cambiar: (parte, activo) => props.set({ partes: { ...props.d.partes, [parte]: activo } }),
  }}>{elementos}</ContextoControlCombo.Provider>;
}

/* ── Controles reutilizables ──────────────────────────────────────── */

const PARTES_CAMPO = {
  'Sobre-título': 'sobre_titulo', 'Etiqueta foto': 'etiqueta', 'Título principal': 'titulo',
  'Remate del título (en color)': 'titulo_destacado', 'Bajada (Lead)': 'descripcion',
  'Botón principal': 'compra', 'Rótulo del combo': 'rotulo_combo', 'Rótulo del precio actual': 'rotulo_precio',
  'Rótulo del precio por separado': 'rotulo_precio_anterior', 'Etiqueta de oferta': 'oferta',
  'Nota de stock': 'nota_stock', 'Nota de envío': 'nota_envio', 'Nota de garantía (debajo del botón)': 'nota_garantia',
  'Título de la sección': 'titulo', 'Subtítulo (opcional)': 'subtitulo', 'Texto explicativo': 'subtitulo',
  'Título de tarjeta': 'nombre', 'Texto de tarjeta': 'texto', 'Nombre del cliente': 'nombre', 'Comentario': 'comentario',
  'Título — precio por separado': 'rotulo_desglose', 'Título — precio del combo': 'rotulo_precio', 'Nota bajo el ahorro (opcional)': 'nota',
};

export function Texto({ label, valor, onChange, placeholder, respaldo, area = false, parte = PARTES_CAMPO[label] }) {
  const id = React.useId();
  const comun = {
    id,
    className: CAMPO,
    value: valor ?? '',
    'aria-label': label,
    placeholder: respaldo || placeholder,
    onChange: e => onChange(e.target.value),
  };
  return (
    <ControlCombo label={label} parte={parte}>
      {area ? <textarea rows={3} {...comun} /> : <input type="text" {...comun} />}
    </ControlCombo>
  );
}

function ListaEditable({ items = [], max, campo, lista, textoAgregar, nuevo, children }) {
  const control = React.useContext(ContextoControlCombo);
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <SubbloqueCombo key={i} titulo={`${campo === 'testimonios' ? 'Opinión' : textoAgregar === 'Agregar tarjeta' ? 'Beneficio' : 'Condición'} ${i + 1}`}
          resumen={it.titulo || it.nombre || it.texto || 'Sin contenido'} inicial={i === items.length - 1}>
        <div className="flex gap-2 items-start">
          <ContextoControlCombo.Provider value={{ partes: { ...control?.partes, ...it.partes }, cambiar: (parte, activo) => lista.editar(campo, i, { partes: { ...it.partes, [parte]: activo } }) }}>
            <div className="flex flex-col gap-3 flex-1 min-w-0">{children(it, i)}</div>
          </ContextoControlCombo.Provider>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button type="button" title="Subir" aria-label={`Subir elemento ${i + 1}`} onClick={() => lista.mover(campo, i, -1)} disabled={i === 0} className="text-fg-muted hover:text-fg disabled:opacity-20"><ChevronDown size={14} className="rotate-180" /></button>
            <button type="button" title="Quitar" aria-label={`Quitar elemento ${i + 1}`} onClick={() => lista.quitar(campo, i)} className="text-fg-muted hover:text-danger p-1"><Trash2 size={14} /></button>
            <button type="button" title="Bajar" aria-label={`Bajar elemento ${i + 1}`} onClick={() => lista.mover(campo, i, 1)} disabled={i === items.length - 1} className="text-fg-muted hover:text-fg disabled:opacity-20"><ChevronDown size={14} /></button>
          </div>
        </div></SubbloqueCombo>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => lista.agregar(campo, nuevo())} className="inline-flex items-center justify-center gap-1.5 py-2 mt-1 border border-dashed border-fg/20 rounded-lg text-[12px] font-medium text-fg/50 hover:text-fg hover:border-fg/40">
          <Plus size={14} /> {textoAgregar} ({items.length}/{max})
        </button>
      )}
    </div>
  );
}

export function ListaTextos({ valores = [], max, onCambio, textoAgregar, placeholder }) {
  const lista = Array.isArray(valores) ? valores : [];
  const actualizar = (i, valor) => {
    const copia = [...lista];
    copia[i] = valor;
    onCambio(copia);
  };
  const quitar = (i) => onCambio(lista.filter((_, idx) => idx !== i));
  const mover = (i, delta) => {
    const destino = i + delta;
    if (destino < 0 || destino >= lista.length) return;
    const copia = [...lista];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    onCambio(copia);
  };
  return (
    <div className="flex flex-col gap-2">
      {lista.map((valor, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="text-fg/25 hover:text-fg disabled:opacity-10"><ChevronDown size={12} className="rotate-180" /></button>
          <input aria-label={`Punto ${i + 1}`} className={`${MINI} flex-1 min-w-0`} value={valor || ''} placeholder={placeholder} onChange={e => actualizar(i, e.target.value)} />
          <button type="button" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} className="text-fg/25 hover:text-fg disabled:opacity-10"><ChevronDown size={12} /></button>
          <button type="button" onClick={() => quitar(i)} className="text-fg/25 hover:text-danger p-1"><Trash2 size={12} /></button>
        </div>
      ))}
      {lista.length < max && (
        <button type="button" onClick={() => onCambio([...lista, ''])} className="inline-flex items-center justify-center gap-1.5 py-2 border border-dashed border-fg/20 rounded-lg text-[12px] font-medium text-fg/50 hover:text-fg hover:border-fg/40">
          <Plus size={14} /> {textoAgregar} ({lista.length}/{max})
        </button>
      )}
    </div>
  );
}

export function CamposContador({ d, set }) {
  const c = d.contador || {};
  const { datos, partes } = ofertaProductoDesdeCombo(d);
  const setC = cambios => set({ contador: { ...c, ...cambios } });
  return <div className="space-y-3 border-t border-border pt-3">
    <label className="flex items-center gap-2 text-sm font-semibold text-fg">
      <input type="checkbox" className="accent-primary" checked={!!c.activo} onChange={e => setC({ activo: e.target.checked })} />Oferta por tiempo limitado
    </label>
    {c.activo && <EditorOfertaTiempoLimitado item={datos}
      onCambiar={(campo, valor) => setC({ [CAMPOS_OFERTA_COMBO[campo]]: valor })}
      visibleBloque={clave => partes[clave] !== false}
      cambiarBloque={(clave, visible) => setC({ [VISIBILIDAD_OFERTA_COMBO[clave]]: visible })} />}
  </div>;
}

const CAMPOS = {
  barra_superior: ({ d, set, lista }) => (
    <>
      <Texto label="Botón de la barra" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
      <ListaEditable
        items={d.items} campo="items" lista={lista} max={LIMITES.barra_superior_items}
        textoAgregar="Agregar ventaja" nuevo={() => ({ icono: 'check', texto: '' })}
      >
        {(it, i) => (
          <div className="flex items-center gap-1.5 w-full">
            <IconoPicker valor={it.icono} onChange={v => lista.editar('items', i, { icono: v })} />
            <input className={`${MINI} flex-1 min-w-0`} value={it.texto || ''} placeholder="Ej: Envío gratis" onChange={e => lista.editar('items', i, { texto: e.target.value })} />
          </div>
        )}
      </ListaEditable>
    </>
  ),

  hero: ({ d, set, respaldos }) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Texto label="Sobre-título" valor={d.eyebrow} respaldo={respaldos.eyebrow} onChange={v => set({ eyebrow: v })} />
        <Texto label="Etiqueta foto" valor={d.etiqueta} placeholder="Más vendido" onChange={v => set({ etiqueta: v })} />
      </div>
      <Texto label="Título principal" valor={d.titulo} respaldo={respaldos.titulo} area onChange={v => set({ titulo: v })} />
      <Texto
        label="Remate del título (en color)"
        valor={d.titulo_destacado}
        placeholder="mejor precio juntos."
        onChange={v => set({ titulo_destacado: v })}
      />
      <Texto label="Bajada (Lead)" valor={d.lead} respaldo={respaldos.lead} area onChange={v => set({ lead: v })} />
      <Texto label="Botón principal" valor={d.cta_texto} placeholder="Comprar ahora — envío gratis" onChange={v => set({ cta_texto: v })} />
      <Texto label="Rótulo del combo" valor={d.rotulo_combo} placeholder="Combo armado" onChange={v => set({ rotulo_combo: v })} />
      <Texto label="Rótulo del precio actual" valor={d.rotulo_precio} placeholder="Hoy llevás el combo por" onChange={v => set({ rotulo_precio: v })} />
      <Texto label="Rótulo del precio por separado" valor={d.rotulo_precio_anterior} placeholder="Valor por separado" onChange={v => set({ rotulo_precio_anterior: v })} />
      <ControlCombo label="Puntos clave (los ✓ del encabezado)" parte="caracteristicas">
        <ListaTextos
          valores={d.caracteristicas}
          max={LIMITES.hero_caracteristicas}
          textoAgregar="Agregar"
          placeholder="Combo completo y listo para usar"
          onCambio={l => set({ caracteristicas: l })}
        />
      </ControlCombo>

      <div className="pt-2 border-t border-fg/10">
        <Texto label="Etiqueta de oferta" valor={d.etiqueta_oferta} placeholder="Oferta por tiempo limitado" onChange={v => set({ etiqueta_oferta: v })} />
        <CamposContador d={d} set={set} />
      </div>
      <ControlCombo label="Calificación" parte="calificacion" mostrar={!!d.rating_activo && d.partes?.calificacion !== false}
        onMostrar={activo => set({ rating_activo: activo, partes: { ...d.partes, calificacion: activo } })}>
        <div>
          <label className={ETIQUETA}>Calificación (0 a 5)</label>
          <input type="number" min="0" max="5" step="0.1" className={CAMPO} value={d.rating_valor} onChange={e => set({ rating_valor: Number(e.target.value) })} />
        </div>
      </ControlCombo>

    </>
  ),

  incluye: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="¿Qué incluye?" onChange={v => set({ titulo: v })} />
      <Texto label="Subtítulo (opcional)" valor={d.subtitulo} placeholder="Todo lo que necesitás en un solo pack" onChange={v => set({ subtitulo: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Los productos incluidos se cargan con su información real. Podés editar sus textos e imágenes y elegir qué mostrar.
      </p>
    </>
  ),

  valor: ({ d, set }) => (
    <>
      <Texto label="Título — precio por separado" valor={d.titulo} placeholder="Precio por separado" onChange={v => set({ titulo: v })} />
      <Texto label="Título — precio del combo" valor={d.titulo_combo} placeholder="Precio combo" onChange={v => set({ titulo_combo: v })} />
      <Texto label="Nota bajo el ahorro (opcional)" valor={d.nota_ahorro} placeholder="Precio válido mientras dure el stock" onChange={v => set({ nota_ahorro: v })} />
      <Texto label="Rótulo del total por separado" parte="total" valor={d.rotulo_total} onChange={v => set({ rotulo_total: v })} />
      <Texto label="Botón de compra" parte="compra" valor={d.cta_texto} onChange={v => set({ cta_texto: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        La tabla y el ahorro se calculan solos con los precios reales de cada producto y el precio del combo.
      </p>
    </>
  ),

  beneficio_principal: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="¿Por qué este combo?" onChange={v => set({ titulo: v })} />
      <Texto label="Texto explicativo" valor={d.texto} area placeholder="Una selección simple: productos que se complementan para resolver más con menos." onChange={v => set({ texto: v })} />
      <div>
        <label className={ETIQUETA}>Tarjetas (título + texto corto)</label>
        <ListaEditable
          items={d.items} campo="items" lista={lista} max={LIMITES.beneficio_principal_items}
          textoAgregar="Agregar tarjeta" nuevo={() => ({ icono: '', titulo: '', texto: '' })}
        >
          {(it, i) => (
            <>
              <ControlCombo label="Emoji o ícono" parte="iconos"><EmojiOImagenCombo numero={i + 1} valor={it.icono} onSubirImagen={onSubirImagen} onChange={v => lista.editar('items', i, { icono: v })} /></ControlCombo>
              <Texto label="Título de tarjeta" valor={it.titulo} onChange={v => lista.editar('items', i, { titulo: v })} />
              <Texto label="Texto de tarjeta" valor={it.texto} onChange={v => lista.editar('items', i, { texto: v })} />
            </>
          )}
        </ListaEditable>
        <p className="text-[10px] text-fg/35 leading-relaxed mt-1.5">
          Si cargás <b className="text-fg/60">Beneficios</b> en Vista del combo, se usan acá automáticamente.
        </p>
      </div>
    </>
  ),

  detalle_productos: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="Conocé lo que recibís" onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Cada producto aparece con su foto y sus propios checks (los beneficios cargados en la ficha de ESE producto) — no hace falta repetirlos acá.
      </p>
    </>
  ),

  prueba_social: ({ d, set, lista, onSubirImagen }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="Opiniones reales" onChange={v => set({ titulo: v })} />
      <ControlCombo label="Calificación general" parte="calificacion">
        <label className={ETIQUETA}>Calificación (0 a 5)</label>
        <input type="number" min="0" max="5" step="0.1" className={CAMPO} value={d.calificacion} onChange={e => set({ calificacion: Number(e.target.value) })} />
      </ControlCombo>
      <ListaOpinionesProducto ocultarSinOpiniones={false} items={(d.testimonios || []).map(item => ({ ...item, detalle: item.detalle ?? d.rotulo_verificada ?? '' }))} onCambiar={testimonios => set({ testimonios })} onSubirImagen={onSubirImagen}
        renderCampo={(parte, titulo, nodo, item, idx) => <ControlCombo key={parte} parte={parte} label={titulo}
          mostrar={(item.partes?.[parte] ?? d.partes?.[parte]) !== false}
          onMostrar={v => lista.editar('testimonios', idx, { partes: { ...item.partes, [parte]: v } })}>{nodo}</ControlCombo>} />
    </>
  ),

  confianza: ({ d, set, lista }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="Comprá con confianza" onChange={v => set({ titulo: v })} />
      <ListaConfianzaProducto items={d.items} onCambiar={(_campo, items) => set({ items })}
        renderCampo={(parte, titulo, nodo, item, idx) => <ControlCombo key={parte} parte={parte} label={titulo}
          mostrar={(item.partes?.[parte] ?? d.partes?.[parte]) !== false}
          onMostrar={v => lista.editar('items', idx, { partes: { ...item.partes, [parte]: v } })}>{nodo}</ControlCombo>} />
    </>
  ),

  faq: ({ d, set }) => (
    <>
      <Texto label="Título de la sección" valor={d.titulo} placeholder="Preguntas frecuentes" onChange={v => set({ titulo: v })} />
      <p className="text-[10px] text-fg/35 leading-relaxed">
        Las preguntas existentes se cargan debajo para editarlas, ocultarlas o quitarlas.
      </p>
    </>
  ),

  cta_final: ({ d, set }) => (
    <>
      <Texto label="Etiqueta" valor={d.etiqueta} placeholder="No pierdas esta oferta" onChange={v => set({ etiqueta: v })} />
      <Texto label="Título (vacío = nombre del combo)" valor={d.titulo} respaldo="" placeholder="Combo 3 en 1" onChange={v => set({ titulo: v })} />
      <Texto label="Botón" valor={d.cta_texto} placeholder="Comprar ahora" onChange={v => set({ cta_texto: v })} />
      <CamposContador d={d} set={set} />
    </>
  ),
};
