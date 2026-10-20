import EditorCodigoBloqueFicha from './EditorCodigoBloqueFicha';
import { codigoFichaCombo } from './codigoFichaCombo';
import { extraerBloqueFicha, prepararMoldeCombo } from './codigoBloquesFicha';
import useArrastreBloques, { moverBloqueEnLista } from './useArrastreBloques';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import FichaComboPanel, { Texto } from './panels/FichaComboPanel';
import ControlCombo, { ContextoControlCombo } from './panels/ControlCombo';
import { contenidoCombo } from './comboContenido';
import { imagenesParaLanding } from './datosRuntime';
import EditorHeroCombo from './panels/EditorHeroCombo';
import EditorProductosCombo from './panels/EditorProductosCombo';
import SubbloqueCombo from './panels/SubbloqueCombo';
import EditorValorCombo from './panels/EditorValorCombo';
import { resolverFichaCombo, fichaComboDesdeProducto } from './templates/combo/fichaCombo';
import { BLOQUES_COMBO, BLOQUES_EDITABLES_COMBO, PARTES_BLOQUE_COMBO, PARTES_HERO_COMBO, fichaPropiaCombo, moverBloqueCombo, ordenBloquesCombo } from './comboBloques';

export default function EditorFichaCombo({ item, content, onCambiar, pedido, activo, onActivo, onSubirImagen, onGlobal, codigoInicio, tienda }) {
  item = contenidoCombo(item);
  const propia = fichaPropiaCombo(item, content);
  const resuelta = resolverFichaCombo(propia, content?.ficha_combo, fichaComboDesdeProducto(item));
  const preguntasBase = resuelta.faq.items || [];
  const orden = ordenBloquesCombo(propia._orden).filter(k => BLOQUES_EDITABLES_COMBO.some(b => b.key === k));
  const [abierto, setAbierto] = useState('hero');
  const refs = useRef({});
  const guardar = ficha => onCambiar('ficha_combo', ficha);
  const editar = (key, cambio) => guardar({ ...propia, [key]: { ...resuelta[key], ...propia[key], ...cambio } });
  const visible = key => resuelta[key] ? resuelta[key].activo !== false : propia._visibilidad?.[key] !== false;
  const mostrar = (key, valor) => resuelta[key] ? editar(key, { activo: valor })
    : guardar({ ...propia, _visibilidad: { ...propia._visibilidad, [key]: valor } });
  const reordenar = (origen, hacia) => guardar({ ...propia, _orden: moverBloqueCombo(orden, origen, hacia) });
  const { listaBloquesRef, arrastre, recienMovido, ordenVisible, controlArrastre, dentroDeLista } = useArrastreBloques({
    orden, onGuardar: nuevo => guardar({ ...propia, _orden: ordenBloquesCombo(nuevo) }),
    grupo: clave => BLOQUES_COMBO.some(b => b.key === clave && !b.fijo) ? 'secciones' : null,
    mover: moverBloqueEnLista, atributo: 'data-combo-editor-bloque', selectorCabecera: '[data-combo-cabecera]', tipo: 'application/x-gesicomm-combo-bloque',
    describirLimite: () => 'Podés ordenar desde Encabezado hasta Preguntas frecuentes. Compra fija en celular queda fijo abajo.',
  });
  useEffect(() => {
    const clave = orden.includes(pedido?.clave) ? pedido.clave : (pedido?.clave?.startsWith('hero_') || pedido?.clave?.startsWith('oferta')) ? 'hero' : pedido?.clave?.startsWith('incluye_producto_') ? 'incluye' : pedido?.clave?.startsWith('detalle_productos_producto_') ? 'detalle_productos' : null;
    if (!clave) return;
    setAbierto(clave);
    refs.current[clave]?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [pedido]);
  const respaldos = { titulo: item.nombre, lead: item.propuesta_valor || item.descripcion, eyebrow: item.categoria };
  const codigoPropio = item.codigo_bloques ?? content?.venta?.presentacion_productos?.[`combo:${item.referencia_id || item.id}`]?.codigo_bloques ?? {};
  const codigoBase = () => codigoFichaCombo({ item: { ...item, precio: item.precio_efectivo ?? item.precio, imagenes: imagenesParaLanding(item), codigo_bloques: {}, ficha_combo: propia },
    content, codigoInicio, tienda, tema: tienda?.colores, preview: false });
  const editorCodigo = (clave, titulo) => <EditorCodigoBloqueFicha clave={clave} titulo={titulo} tipo="combo"
    base={() => { const codigo = codigoBase(); return { html: prepararMoldeCombo(extraerBloqueFicha(codigo.html, clave)), css: codigo.css, js: '', motor: codigo.js }; }}
    propio={codigoPropio[clave]} contexto={{ combo: item, ficha: resuelta, tienda }} onGuardar={codigo => {
      const siguiente = { ...codigoPropio }; if (codigo) siguiente[clave] = codigo; else delete siguiente[clave]; onCambiar('codigo_bloques', siguiente);
    }} />;


  return <div ref={listaBloquesRef} className="flex flex-col gap-3" onDragOver={dentroDeLista} onDrop={controlArrastre.soltar} role="region" aria-label="Bloques de la vista de combo">
    <p style={{ order: -2 }} className="text-sm text-fg-muted">Podés ordenar los bloques desde Encabezado hasta Preguntas frecuentes. Compra fija en celular queda fijo abajo. Arrastrá desde el asa o usá las flechas o Alt + ↑ / ↓.</p>
    <div role="status" className="sr-only" style={{ order: -1 }}>{arrastre ? `Moviendo ${BLOQUES_COMBO.find(b => b.key === arrastre.origen)?.label}. Los bloques se desplazan para mostrar la nueva posición.` : ''}</div>
    {orden.map((key, idx) => {
      const bloque = BLOQUES_COMBO.find(b => b.key === key);
      return <section key={key} ref={el => { refs.current[key] = el; }} data-combo-editor-bloque={key} data-arrastrando={arrastre?.origen === key || undefined} style={{ order: ordenVisible.indexOf(key) }}
        className={`rounded-xl border bg-surface overflow-hidden transition-[box-shadow,opacity,border-color] duration-200 ${arrastre?.origen === key ? 'border-dashed border-primary bg-primary/5 opacity-60' : arrastre?.bloqueado === key ? 'border-border' : recienMovido === key ? 'border-primary ring-4 ring-primary/25' : activo === key ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}
        onMouseEnter={() => onActivo?.(key)} onMouseLeave={() => onActivo?.(null)}
        onDragOver={e => controlArrastre.sobre(key, e)} onDrop={controlArrastre.soltar}>
        <div data-combo-cabecera className="flex items-center gap-2 px-3 py-2.5">
          <button type="button" draggable={!bloque.fijo} disabled={bloque.fijo} title={bloque.global ? 'Bloque global heredado del ecommerce' : bloque.fijo ? 'Este bloque permanece fijo abajo en celular' : 'Arrastrar para ordenar'} aria-label={`Arrastrar ${bloque.label} para ordenar`} className="touch-none select-none cursor-grab active:cursor-grabbing text-fg-muted p-1 disabled:opacity-20 disabled:cursor-default"
            {...controlArrastre.puntero(key)}
            onDragStart={e => controlArrastre.empezar(key, e)} onDragEnd={controlArrastre.terminar}
            onKeyDown={e => { if (e.altKey && ['ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); const target = orden[idx + (e.key === 'ArrowUp' ? -1 : 1)]; if (target) reordenar(key, target); } }}><GripVertical size={16} /></button>
          <button type="button" aria-expanded={abierto === key} onClick={() => { setAbierto(abierto === key ? null : key); onActivo?.(key); }} className="flex-1 text-left text-sm font-semibold text-fg">
            {idx + 1} · {bloque.label}
          </button>
          {arrastre?.bloqueado === key ? <span title="No se puede soltar en este bloque" aria-label="Destino bloqueado" className="shrink-0 text-xs text-fg-muted">🔒</span> : bloque.fijo && <span className="text-[11px] text-fg-muted">🔒 Fijo</span>}
          <label className="inline-flex gap-1 items-center text-xs text-fg-muted"><input type="checkbox" className="accent-primary" checked={visible(key)} onChange={e => mostrar(key, e.target.checked)} aria-label={`Mostrar ${bloque.label}`} />Mostrar</label>
          <button type="button" aria-label={`Subir ${bloque.label}`} disabled={bloque.fijo || idx === 0 || BLOQUES_COMBO.find(b => b.key === orden[idx - 1])?.fijo} onClick={() => reordenar(key, orden[idx - 1])} className="p-1 text-fg-muted disabled:opacity-20"><ArrowUp size={14} /></button>
          <button type="button" aria-label={`Bajar ${bloque.label}`} disabled={bloque.fijo || idx === orden.length - 1 || BLOQUES_COMBO.find(b => b.key === orden[idx + 1])?.fijo} onClick={() => reordenar(key, orden[idx + 1])} className="p-1 text-fg-muted disabled:opacity-20"><ArrowDown size={14} /></button>
        </div>
        {abierto === key && <ContextoControlCombo.Provider value={{ partes: (resuelta[key] || propia[key])?.partes,
          nombres: Object.fromEntries(key === 'hero' ? PARTES_HERO_COMBO : PARTES_BLOQUE_COMBO[key] || []),
          cambiar: (parte, valor) => editar(key, { partes: { ...(resuelta[key] || propia[key])?.partes, [parte]: valor } }),
        }}><div className="border-t border-border p-3 space-y-3">
          {key === 'hero' && <p className="text-xs text-fg-muted">El check de Encabezado muestra u oculta el nombre, la descripción y la calificación. La foto, el precio y el botón de compra tienen sus propios controles.</p>}
          {bloque.global && <><p className="text-sm text-fg-muted">Se hereda del inicio del ecommerce, igual que en la ficha de producto. Los textos, enlaces y diseño se editan en su bloque global.</p>
            <button type="button" className="text-sm text-primary-text" onClick={() => onGlobal?.(key)}>Editar en el ecommerce</button></>}
          {resuelta[key] && !['hero', 'valor'].includes(key) && <SubbloqueCombo titulo="Textos de la sección" resumen={resuelta[key].encabezado || resuelta[key].titulo} clave={`${key}_textos`} inicial={!['incluye', 'detalle_productos'].includes(key)}>
            <Texto label="Sobre-título de la sección" parte="eyebrow" valor={resuelta[key].eyebrow} onChange={v => editar(key, { eyebrow: v })} />
            {key === 'valor' && <Texto label="Título de la sección de valor" parte="titulo" valor={resuelta.valor.encabezado} onChange={v => editar('valor', { encabezado: v })} />}
            <FichaComboPanel onSubirImagen={onSubirImagen} ficha={propia} fichaResuelta={resuelta} respaldos={respaldos} seccionUnica={key} soloTextos onChange={guardar} />
          </SubbloqueCombo>}
          {key === 'hero' && <EditorHeroCombo d={resuelta.hero} set={c => editar('hero', c)} item={item} pedido={pedido} onActivo={onActivo}
            onCambiar={onCambiar} onSubirImagen={onSubirImagen} orden={propia._orden_hero}
            editorCodigo={editorCodigo} onOrden={nuevo => guardar({ ...propia, _orden_hero: nuevo })} />}
          {resuelta[key] && ['beneficio_principal', 'confianza', 'prueba_social'].includes(key) && <FichaComboPanel onSubirImagen={onSubirImagen} ficha={propia} fichaResuelta={resuelta} respaldos={respaldos} seccionUnica={key} soloContenido onChange={guardar} />}
          {key === 'valor' && <EditorValorCombo d={resuelta.valor} set={c => editar('valor', c)} item={item} />}
          {['incluye', 'detalle_productos'].includes(key) && <EditorProductosCombo productos={item.productos_combo} config={resuelta[key]} bloque={key}
            onChange={c => editar(key, c)} pedido={pedido} onActivo={onActivo} />}
          {key === 'faq' && <div className="space-y-3">
            {(propia.faq?.items ?? preguntasBase).map((f, i, lista) => <SubbloqueCombo key={i} titulo={`Pregunta ${i + 1}`} resumen={f.pregunta || 'Sin pregunta'} inicial={i === lista.length - 1}>
              <ContextoControlCombo.Provider value={{ partes: f.partes, cambiar: (parte, valor) => editar('faq', { items: lista.map((v, n) => n === i ? { ...v, partes: { ...v.partes, [parte]: valor } } : v) }) }}>
                <Texto label={`Pregunta ${i + 1}`} parte="pregunta" valor={f.pregunta} onChange={valor => editar('faq', { items: lista.map((v, n) => n === i ? { ...v, pregunta: valor } : v) })} />
                <Texto label={`Respuesta ${i + 1}`} parte="respuesta" area valor={f.respuesta} onChange={valor => editar('faq', { items: lista.map((v, n) => n === i ? { ...v, respuesta: valor } : v) })} />
              </ContextoControlCombo.Provider>
              <button type="button" className="text-xs text-danger" onClick={() => editar('faq', { items: lista.filter((_, n) => n !== i) })}>Quitar pregunta {i + 1}</button>
            </SubbloqueCombo>)}
            <button type="button" className="text-sm text-primary-text" disabled={(propia.faq?.items ?? preguntasBase).length >= 10} onClick={() => editar('faq', { items: [...(propia.faq?.items ?? preguntasBase), { pregunta: '', respuesta: '' }] })}>Agregar pregunta</button>
          </div>}
          {['navegacion', 'compra_movil'].includes(key) && <Texto label="Texto del botón" parte="compra"
            valor={propia[key]?.texto ?? (key === 'navegacion' ? 'Volver al catálogo' : 'Comprar ahora')} onChange={texto => editar(key, { texto })} />}
          {key === 'compra_movil' && <ControlCombo label={`Precio: Gs ${Number(item.precio_efectivo || item.precio || 0).toLocaleString('es-PY')}`} parte="precio" />}
          {key === 'compra_movil' && <p className="text-xs text-fg-muted">Este bloque permanece fijo abajo en la vista móvil. Podés editarlo y ocultarlo.</p>}
          {editorCodigo(key, bloque.label)}
          <button type="button" className="text-xs text-fg-muted underline" onClick={() => {
            const copia = { ...propia }; delete copia[key];
            if (copia._visibilidad) { copia._visibilidad = { ...copia._visibilidad }; delete copia._visibilidad[key]; }
            guardar(copia);
          }}>Restaurar este bloque</button>
        </div></ContextoControlCombo.Provider>}
      </section>;
    })}
    <details style={{ order: 99 }} className="rounded-xl border border-border p-3 text-sm text-fg-muted">
      <summary className="cursor-pointer">Elementos heredados del ecommerce</summary>
      <div className="space-y-3 pt-3">{BLOQUES_COMBO.filter(b => b.global).map(b => <div key={b.key} className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" aria-label={`Mostrar ${b.label}`} checked={visible(b.key)} onChange={e => mostrar(b.key, e.target.checked)} />{b.label}</label>
        <button type="button" className="text-xs text-primary-text" onClick={() => onGlobal?.(b.key)}>Editar en la tienda</button>
      </div>)}</div>
    </details>
  </div>;
}
