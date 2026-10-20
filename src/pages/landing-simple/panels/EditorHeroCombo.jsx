import { imagenesParaLanding } from '../datosRuntime';
import React from 'react';
import useArrastreBloques, { moverBloqueEnLista } from '../useArrastreBloques';
import { GRUPOS_HERO_COMBO, ordenPartesCombo } from '../comboBloques';
import { Texto, CamposContador, ListaTextos } from './FichaComboPanel';
import ControlCombo, { ChecksCombo } from './ControlCombo';
import SubbloqueCombo from './SubbloqueCombo';
import ImagenesProductoLanding from '../ImagenesProductoLanding';
import { precioDeVenta } from '../PrecioAnclaItem';

export default function EditorHeroCombo({ d, set, item, pedido, onActivo, onCambiar, onSubirImagen, orden, onOrden, editorCodigo }) {
  const fotos = imagenesParaLanding(item);
  const totalPorSeparado = (item.productos_combo || []).reduce((total, producto) => total + Number(producto.precio || 0) * (producto.cantidad || 1), 0);
  const galeriaVisible = d.partes?.galeria !== false;
  const secuenciaGuardada = ordenPartesCombo(orden);
  const grupoDe = clave => {
    const indice = GRUPOS_HERO_COMBO.findIndex(g => g.some(([k]) => k === clave));
    return indice < 0 ? null : `hero-${indice}`;
  };
  const { listaBloquesRef, arrastre, recienMovido, ordenVisible: secuencia, controlArrastre, dentroDeLista } = useArrastreBloques({
    orden: secuenciaGuardada, onGuardar: onOrden, grupo: grupoDe, mover: moverBloqueEnLista,
    atributo: 'data-combo-arrastre-hero', selectorCabecera: '[data-combo-cabecera]', tipo: 'application/x-gesicomm-combo-hero',
    describirLimite: clave => grupoDe(clave) === 'hero-0'
      ? 'Solo entre Nombre del combo, Descripción y Calificación. Fotos del combo queda fijo y separa los grupos.'
      : 'Solo entre Precio y ahorro, Puntos clave del combo y Botón de compra. Fotos del combo queda fijo y separa los grupos.',
  });
  const controles = clave => {
    const grupo = GRUPOS_HERO_COMBO.find(g => g.some(([k]) => k === clave));
    if (!onOrden) return undefined;
    if (!grupo) return {
      clave, fijo: true, fueraDeGrupo: !!arrastre, bloqueado: arrastre?.bloqueado === clave,
      alPasar: e => controlArrastre.sobre(clave, e), alSoltar: controlArrastre.soltar,
    };
    const lista = secuenciaGuardada.filter(k => grupo.some(([id]) => id === k));
    const indice = lista.indexOf(clave);
    const mover = destino => { const nuevo = moverBloqueEnLista(secuenciaGuardada, clave, destino); if (nuevo) onOrden(nuevo); };
    return {
      clave, puntero: controlArrastre.puntero(clave),
      arrastrando: arrastre?.origen === clave,
      bloqueado: arrastre?.bloqueado === clave,
      fueraDeGrupo: !!arrastre && grupoDe(clave) !== grupoDe(arrastre.origen),
      recienMovido: recienMovido === clave,
      subir: indice > 0 ? () => mover(lista[indice - 1]) : undefined,
      bajar: indice < lista.length - 1 ? () => mover(lista[indice + 1]) : undefined,
      alArrastrar: e => controlArrastre.empezar(clave, e),
      alTerminar: controlArrastre.terminar,
      alPasar: e => controlArrastre.sobre(clave, e),
      alSoltar: controlArrastre.soltar,
    };
  };
  const grupo = (clave, titulo, resumen, children, inicial = false) => <SubbloqueCombo key={clave} clave={`hero_${clave}`} titulo={titulo}
    resumen={resumen} pedido={pedido?.clave === 'hero_oferta' || pedido?.clave?.startsWith('oferta') ? { ...pedido, clave: 'hero_precio' } : pedido} onActivo={onActivo} inicial={inicial} orden={controles(clave)}>{children}{editorCodigo?.(`hero_${clave}`, titulo)}</SubbloqueCombo>;
  const contenido = <>
    {grupo('titulo', 'Nombre del combo', d.titulo, <>
      <Texto label="Rótulo superior" parte="sobre_titulo" valor={d.eyebrow} onChange={eyebrow => set({ eyebrow })} />
      <Texto label="Título del combo" parte="titulo" valor={d.titulo} onChange={titulo => set({ titulo })} />
      <Texto label="Texto destacado del título" parte="titulo_destacado" valor={d.titulo_destacado} onChange={titulo_destacado => set({ titulo_destacado })} />
    </>, true)}
    {grupo('descripcion', 'Descripción', d.lead || 'Sin descripción', <Texto label="Descripción del combo" parte="descripcion" valor={d.lead} area onChange={lead => set({ lead })} />)}
    {grupo('galeria', 'Fotos del combo', `${fotos.length} imágenes`, <>
      <ControlCombo label="Galería e imágenes" parte="galeria" />
      <Texto label="Etiqueta foto" parte="etiqueta" valor={d.etiqueta} onChange={etiqueta => set({ etiqueta })} />
      <ImagenesProductoLanding item={item} onCambiar={onCambiar} onSubirImagen={onSubirImagen} />
      <ChecksCombo partes={[["productos", "Productos bajo la foto"]]} />
      <ControlCombo label="Miniaturas de la galería" parte="miniaturas" mostrar={fotos.length >= 2 && galeriaVisible && d.partes?.miniaturas !== false} disabled={fotos.length < 2 || !galeriaVisible}>
        <p className="text-xs text-fg-muted">{!galeriaVisible
          ? 'Activá Galería e imágenes para mostrar las miniaturas.'
          : fotos.length < 2
            ? 'Las miniaturas permiten cambiar la foto principal. Agregá al menos dos fotos del combo para habilitarlas.'
            : 'Son las fotos pequeñas que permiten cambiar la imagen principal. Este check muestra u oculta esa fila.'}</p>
      </ControlCombo>
    </>)}
    {grupo('precio', 'Precio y ahorro', `Gs ${Number(precioDeVenta(item) || 0).toLocaleString('es-PY')}`, <>
      <ControlCombo label={`Precio del combo: Gs ${Number(precioDeVenta(item) || 0).toLocaleString('es-PY')}`} parte="precio" />
      <Texto label="Rótulo del combo" parte="rotulo_combo" valor={d.rotulo_combo} onChange={rotulo_combo => set({ rotulo_combo })} />
      <Texto label="Rótulo del precio actual" parte="rotulo_precio" valor={d.rotulo_precio} onChange={rotulo_precio => set({ rotulo_precio })} />
      <Texto label="Rótulo del precio por separado" parte="rotulo_precio_anterior" valor={d.rotulo_precio_anterior} onChange={rotulo_precio_anterior => set({ rotulo_precio_anterior })} />
      <ChecksCombo partes={[["precio_anterior", "Precio por separado"], ["ahorro", "Ahorro"], ["porcentaje", "Porcentaje de ahorro"], ["cantidad_productos", "Cantidad de productos"]]} />
      <p className="text-xs leading-relaxed text-fg-muted">El precio tachado es la suma de los productos por separado: <strong>Gs {totalPorSeparado.toLocaleString('es-PY')}</strong>. El ahorro se calcula contra el precio del combo. Los precios se editan en los productos y en el combo.</p>
      <div className="border-t border-border pt-3 space-y-3">
        <CamposContador d={d} set={set} />
      </div>
    </>)}
    {grupo('compra', 'Botón de compra', d.cta_texto, <Texto label="Botón principal" parte="compra" valor={d.cta_texto} onChange={cta_texto => set({ cta_texto })} />)}
    {grupo('caracteristicas', 'Puntos clave del combo', `${d.caracteristicas?.filter(Boolean).length || 0} puntos cargados`,
      <ControlCombo label="Puntos clave" parte="caracteristicas"><ListaTextos valores={d.caracteristicas} max={6} textoAgregar="Agregar punto"
        onCambio={caracteristicas => set({ caracteristicas })} /></ControlCombo>)}
    {grupo('calificacion', 'Calificación', d.rating_activo ? `${d.rating_valor}/5` : 'Oculta',
      <ControlCombo label="Calificación" parte="calificacion" mostrar={!!d.rating_activo && d.partes?.calificacion !== false}
        onMostrar={activo => set({ rating_activo: activo, partes: { ...d.partes, calificacion: activo } })}>
        <input aria-label="Calificación del combo" type="number" min="0" max="5" step="0.1" value={d.rating_valor}
          className="w-full rounded-lg border border-border bg-surface-2 p-2 text-sm text-fg" onChange={e => set({ rating_valor: Number(e.target.value) })} />
      </ControlCombo>)}
  </>;
  const posicion = (clave, lista) => clave === 'galeria' ? GRUPOS_HERO_COMBO[0].length : lista.indexOf(clave) + (GRUPOS_HERO_COMBO[1].some(([k]) => k === clave) ? 1 : 0);
  return <div ref={listaBloquesRef} className="flex flex-col gap-2" onDragOver={dentroDeLista} onDrop={controlArrastre.soltar}>
    <p className="text-xs leading-relaxed text-fg-muted" style={{ order: -1 }}>Podés ordenar <strong>Nombre, Descripción y Calificación</strong> entre sí; y <strong>Precio, Puntos clave y Botón de compra</strong> entre sí. Fotos del combo queda fijo entre ambos grupos.</p>
    {React.Children.toArray(contenido.props.children)
      .sort((a, b) => posicion(a.props.clave.replace('hero_', ''), secuenciaGuardada) - posicion(b.props.clave.replace('hero_', ''), secuenciaGuardada))
      .map(nodo => React.cloneElement(nodo, { posicion: posicion(nodo.props.clave.replace('hero_', ''), secuencia) }))}
    <span role="status" className="sr-only" style={{ order: 99 }}>{arrastre ? 'Moviendo bloque. Los demás bloques se desplazan para mostrar la nueva posición. Escape para cancelar.' : ''}</span>
  </div>;
}
