import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Image as ImageIcon, X } from 'lucide-react';
import { ofertaService } from '../../../services/ofertaService';
import { productService } from '../../../services/productService';
import { getMediaUrl } from '../../../services/api';
import { formatPrecio } from '../../../lib/mensajeWhatsapp';

/** Código interno estable — el admin no necesita pensarlo para un pack/order bump rápido. */
function generarCodigo(nombre) {
  const base = (nombre || 'OFERTA').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 16) || 'OFERTA';
  return `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
    <span className="text-sm font-medium text-[var(--vit-text)]">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 accent-[var(--vit-accent)]"
    />
  </label>
);

/**
 * Inspector del bloque "Detalle de Producto" — antes no tenía ninguno
 * (BLOQUES_SCHEMA no lo declaraba), así que no había forma de elegir qué
 * botones mostrar ni de qué lado va la galería. Todo vive en `config`
 * (settings_json), leído por ProductDetailBlock.jsx con los mismos
 * defaults que ya tenía hardcodeados (imagen a la izquierda, los 3
 * botones visibles) — una sección ya guardada sin estos campos se
 * comporta exactamente igual que antes.
 */
export default function ProductDetailInspector({ seccion, onUpdate, productoId, onUploadImagen, previewCheckoutAbierto, onTogglePreviewCheckout }) {
  const config = seccion.config || {};
  const contenido = seccion.contenido || {};
  const bloques = contenido.bloques_info || [];
  const tarjetasPrecio = contenido.tarjetas_precio || {};

  // Packs (para las tarjetas de precio con imagen) y order bumps (para el
  // checkbox del checkout) de ESTE producto — mismas Ofertas que ya se
  // administran en Productos → Ofertas comerciales, acá solo se elige
  // cómo se ven en la página. Nunca se crea un concepto de oferta nuevo.
  const [ofertasDisponibles, setOfertasDisponibles] = useState([]);
  const [subiendoTarjeta, setSubiendoTarjeta] = useState(null);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [productoActual, setProductoActual] = useState(null);
  const [creandoPack, setCreandoPack] = useState(false);
  const [formPack, setFormPack] = useState({ nombre: '', cantidad: 2, precio: '' });
  const [creandoBump, setCreandoBump] = useState(false);
  const [formBump, setFormBump] = useState({ nombre: '', productos_ids: [''], precio: '' });
  const [guardandoOferta, setGuardandoOferta] = useState(false);
  const [errorOferta, setErrorOferta] = useState(null);

  function recargarOfertas() {
    return ofertaService.listarPorProducto(productoId).then((ofertas) => {
      setOfertasDisponibles(ofertas);
      const previewPacks = ofertas
        .filter(o => o.tipo_contenido === 'pack' && o.estrategia === 'normal' && o.activo)
        .map(o => ({ ...o, unidades: o.componentes?.[0]?.cantidad || 1 }));
      if (previewPacks.length > 0) {
        onUpdate({
          config: { ...config, _preview_packs: JSON.stringify(previewPacks) }
        });
      } else {
        onUpdate({
          config: { ...config, _preview_packs: null }
        });
      }
    }).catch(() => setOfertasDisponibles([]));
  }

  useEffect(() => {
    if (!productoId) return;
    recargarOfertas();
    productService.buscar({ sin_limite: true }).then(res => {
      const prods = Array.isArray(res) ? res : (res.productos || res.rows || []);
      setProductosDisponibles(prods.filter(p => p.activo !== false && String(p.id) !== String(productoId)));
      const actual = prods.find(p => String(p.id) === String(productoId));
      if (actual) setProductoActual(actual);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  async function crearPack(e) {
    e.preventDefault();
    setErrorOferta(null);
    setGuardandoOferta(true);
    try {
      await ofertaService.crear(productoId, {
        codigo: generarCodigo(formPack.nombre),
        nombre: formPack.nombre.trim(),
        tipo_contenido: 'pack',
        estrategia: 'normal',
        precio_normal: Number(formPack.precio) || 0,
        activo: true,
        componentes: [{ producto_id: Number(productoId), cantidad: Number(formPack.cantidad) || 1, descuento_porcentaje: 0 }],
      });
      setFormPack({ nombre: '', cantidad: 2, precio: '' });
      setCreandoPack(false);
      await recargarOfertas();
    } catch (err) {
      setErrorOferta(err.response?.data?.message || 'No se pudo crear el pack.');
    } finally {
      setGuardandoOferta(false);
    }
  }

  async function eliminarPack(id) {
    if (!window.confirm('¿Seguro que querés eliminar este pack? Se va a borrar de las ofertas del producto.')) return;
    try {
      await ofertaService.eliminar(id);
      await recargarOfertas();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar pack');
    }
  }

  async function crearOrderBump(e) {
    e.preventDefault();
    const validIds = formBump.productos_ids.filter(Boolean);
    if (validIds.length === 0) return;
    setErrorOferta(null);
    setGuardandoOferta(true);
    try {
      const nuevaOferta = await ofertaService.crear(productoId, {
        codigo: generarCodigo(formBump.nombre),
        nombre: formBump.nombre.trim(),
        tipo_contenido: 'combo',
        estrategia: 'order_bump',
        // El order bump viaja como una línea adicional del pedido. Por eso la
        // receta contiene solo los extras, no el producto ancla otra vez: el
        // principal ya está en su propia línea del checkout.
        precio_normal: Number(formBump.precio) || 0,
        precio_order_bump: null,
        activo: true,
        componentes: validIds.map(pid => ({ producto_id: Number(pid), cantidad: 1, descuento_porcentaje: 0 })),
      });
      setFormBump({ nombre: '', productos_ids: [''], precio: '' });
      setCreandoBump(false);
      
      const ofertasActualizadas = await ofertaService.listarPorProducto(productoId);
      setOfertasDisponibles(ofertasActualizadas);
      
      const ofertaCreada = ofertasActualizadas.find(o => o.id === nuevaOferta.id);
      if (ofertaCreada) {
        const bumpComps = ofertaCreada.componentes?.filter(c => String(c.producto_id) !== String(productoId)) || [];
        if (bumpComps.length === 0 && ofertaCreada.componentes?.[1]) bumpComps.push(ofertaCreada.componentes[1]);
        
        let img = null;
        for (const comp of bumpComps) {
          const pImg = productosDisponibles.find(p => String(p.id) === String(comp?.producto_id));
          const rawImg = pImg?.imagen || pImg?.imagenes?.[0] || comp?.Producto?.imagen || ofertaCreada.producto_complementario?.imagen;
          const parsedImg = typeof rawImg === 'string' ? rawImg : (rawImg?.url || rawImg?.ruta || null);
          if (parsedImg) {
            img = parsedImg;
            break;
          }
        }
        
        onUpdate({ 
          config: { 
            ...config, 
            order_bump_oferta_id: ofertaCreada.id,
            _preview_bump_nombre: ofertaCreada.nombre,
            _preview_bump_imagen: img || null,
            _preview_bump_precio: ofertaCreada.precio_normal ?? ofertaCreada.precio ?? 0,
            _preview_bump_descripcion: ofertaCreada.descripcion || null
          }
        });
      }
    } catch (err) {
      setErrorOferta(err.response?.data?.message || 'No se pudo crear el order bump.');
    } finally {
      setGuardandoOferta(false);
    }
  }

  const packs = ofertasDisponibles.filter(o => o.tipo_contenido === 'pack' && o.estrategia === 'normal' && o.activo);
  const orderBumps = ofertasDisponibles.filter(o => o.estrategia === 'order_bump' && o.activo);

  const actualizar = (campo, valor) => {
    onUpdate({ config: { ...config, [campo]: valor } });
  };

  const actualizarTarjeta = (clave, cambios) => {
    onUpdate({
      contenido: {
        ...contenido,
        tarjetas_precio: { ...tarjetasPrecio, [clave]: { ...tarjetasPrecio[clave], ...cambios } },
      },
    });
  };

  async function subirImagenTarjeta(clave, file) {
    if (!onUploadImagen) return;
    setSubiendoTarjeta(clave);
    try {
      const url = await onUploadImagen(file);
      actualizarTarjeta(clave, { imagen: url });
    } catch (err) {
      // silencioso — el botón vuelve a su estado normal, el admin puede reintentar
    } finally {
      setSubiendoTarjeta(null);
    }
  }

  const actualizarBloques = (nuevos) => {
    onUpdate({ contenido: { ...contenido, bloques_info: nuevos } });
  };

  const agregarBloque = () => {
    actualizarBloques([...bloques, { titulo: '💎 Beneficios', items: [''] }]);
  };
  const quitarBloque = (idx) => {
    actualizarBloques(bloques.filter((_, i) => i !== idx));
  };
  const moverBloque = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= bloques.length) return;
    const nuevos = [...bloques];
    [nuevos[idx], nuevos[target]] = [nuevos[target], nuevos[idx]];
    actualizarBloques(nuevos);
  };
  const actualizarTituloBloque = (idx, titulo) => {
    const nuevos = [...bloques];
    nuevos[idx] = { ...nuevos[idx], titulo };
    actualizarBloques(nuevos);
  };
  const agregarItem = (idx) => {
    const nuevos = [...bloques];
    nuevos[idx] = { ...nuevos[idx], items: [...nuevos[idx].items, ''] };
    actualizarBloques(nuevos);
  };
  const actualizarItem = (idxBloque, idxItem, valor) => {
    const nuevos = [...bloques];
    const items = [...nuevos[idxBloque].items];
    items[idxItem] = valor;
    nuevos[idxBloque] = { ...nuevos[idxBloque], items };
    actualizarBloques(nuevos);
  };
  const quitarItem = (idxBloque, idxItem) => {
    const nuevos = [...bloques];
    nuevos[idxBloque] = { ...nuevos[idxBloque], items: nuevos[idxBloque].items.filter((_, i) => i !== idxItem) };
    actualizarBloques(nuevos);
  };

  const imagenPosicion = config.imagen_posicion || 'izquierda';
  const mostrarComprarAhora = config.mostrar_comprar_ahora !== false;
  const mostrarAgregarCarrito = config.mostrar_agregar_carrito !== false;
  const mostrarWhatsapp = config.mostrar_whatsapp !== false;

  return (
    <div className="flex flex-col gap-6">
      {onTogglePreviewCheckout && (
        <div className="p-3 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)]">
          <Toggle
            label="Visualizar checkout en la preview"
            checked={!!previewCheckoutAbierto}
            onChange={onTogglePreviewCheckout}
          />
          <p className="text-xs text-[var(--vit-muted-2)] mt-1">
            Muestra el formulario de "Comprar ahora" abierto en la vista previa, para revisar las tarjetas de precio y el order bump tal como se van a ver.
          </p>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Galería</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => actualizar('imagen_posicion', 'izquierda')}
            className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${imagenPosicion === 'izquierda' ? 'border-[var(--vit-accent)] bg-[var(--vit-accent-soft)] text-[var(--vit-accent)]' : 'border-[var(--vit-border)] text-[var(--vit-muted)]'}`}
          >
            Fotos a la izquierda
          </button>
          <button
            type="button"
            onClick={() => actualizar('imagen_posicion', 'derecha')}
            className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${imagenPosicion === 'derecha' ? 'border-[var(--vit-accent)] bg-[var(--vit-accent-soft)] text-[var(--vit-accent)]' : 'border-[var(--vit-border)] text-[var(--vit-muted)]'}`}
          >
            Fotos a la derecha
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-2">Botones de compra</h4>
        <p className="text-xs text-[var(--vit-muted-2)] mb-2">
          Se muestran en este orden: Comprar ahora, Agregar al carrito, Consultar por WhatsApp. Desmarcá los que no quieras mostrar.
        </p>
        <div className="flex flex-col divide-y divide-[var(--vit-border)]">
          <Toggle label="Comprar ahora" checked={mostrarComprarAhora} onChange={v => actualizar('mostrar_comprar_ahora', v)} />
          <Toggle label="Agregar al carrito" checked={mostrarAgregarCarrito} onChange={v => actualizar('mostrar_agregar_carrito', v)} />
          <Toggle label="Consultar por WhatsApp" checked={mostrarWhatsapp} onChange={v => actualizar('mostrar_whatsapp', v)} />
        </div>
      </div>

      {/* Tarjetas de precio — usa los packs que ya existen en Ofertas
          comerciales (Productos → editar → Ofertas). Acá solo se elige
          cómo se muestran: imagen propia y etiqueta por cada cantidad. No
          crea ni edita ninguna Oferta — para eso hay que ir a esa tab. */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Tarjetas de precio por cantidad</h4>
          {productoId && !creandoPack && (
            <button type="button" onClick={() => setCreandoPack(true)} className="text-xs text-[var(--vit-primary)] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Nuevo pack
            </button>
          )}
        </div>
        {!productoId ? (
          <p className="text-xs text-[var(--vit-muted-2)]">Solo disponible en el diseño propio de un producto.</p>
        ) : (
          <>
            {creandoPack && (
              <form onSubmit={crearPack} className="flex flex-col gap-2 p-3 mb-3 rounded border border-[var(--vit-accent)] bg-[var(--vit-surface)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--vit-text)]">Nuevo pack</span>
                  <button type="button" onClick={() => setCreandoPack(false)} className="p-0.5 text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><X size={14} /></button>
                </div>
                {errorOferta && <p className="text-xs text-red-500">{errorOferta}</p>}
                <input type="text" required placeholder="Nombre (ej. Pack x2)" value={formPack.nombre} onChange={e => setFormPack(f => ({ ...f, nombre: e.target.value }))} className="h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none" />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--vit-muted-2)] uppercase">Cantidad</label>
                    <input type="number" min="2" required value={formPack.cantidad} onChange={e => setFormPack(f => ({ ...f, cantidad: e.target.value }))} className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--vit-muted-2)] uppercase">Precio total</label>
                    <input type="number" min="0" required value={formPack.precio} onChange={e => setFormPack(f => ({ ...f, precio: e.target.value }))} className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none" />
                  </div>
                </div>
                <button type="submit" disabled={guardandoOferta} className="mt-1 h-8 rounded-md bg-[var(--vit-accent)] text-fg text-sm font-semibold disabled:opacity-50">
                  {guardandoOferta ? 'Creando...' : 'Crear pack'}
                </button>
              </form>
            )}

            {packs.length === 0 ? (
              <p className="text-xs text-[var(--vit-muted-2)]">Este producto todavía no tiene packs por cantidad.</p>
            ) : (
              <>
                <p className="text-xs text-[var(--vit-muted-2)] mb-2">
                  Editá la etiqueta con la que se muestra cada pack en la página.
                </p>
                <div className="flex flex-col gap-2">
                  {[{ id: 'individual', nombre: 'Individual (sin pack)' }, ...packs].map(o => {
                    const clave = String(o.id);
                    const t = tarjetasPrecio[clave] || {};
                    const rawImg = productoActual?.imagen || productoActual?.imagenes?.[0];
                    const img = typeof rawImg === 'string' ? rawImg : (rawImg?.url || rawImg?.ruta || null);
                    return (
                      <div key={clave} className="flex items-center gap-2 p-2 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)]">
                        <div className="w-14 h-14 shrink-0 rounded border border-[var(--vit-border)] flex items-center justify-center overflow-hidden bg-[var(--vit-bg)] opacity-80" title="Hereda la imagen del producto seleccionado automáticamente">
                          {img ? (
                            <img src={getMediaUrl(img)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-[var(--vit-muted-2)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={t.etiqueta ?? o.nombre}
                            onChange={e => actualizarTarjeta(clave, { etiqueta: e.target.value })}
                            className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                          />
                        </div>
                        {clave !== 'individual' && (
                          <button
                            type="button"
                            onClick={() => eliminarPack(o.id)}
                            className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded"
                            title="Eliminar pack"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Order bump — checkbox dentro del formulario de "Comprar ahora".
          Reusa el mismo mecanismo de Oferta que un pack (oferta_id), solo
          que estrategia='order_bump' y se ofrece como check en vez de
          tarjeta. No agrega una línea de carrito nueva: cambia el precio
          del ítem que ya se está comprando (igual que elegir un combo). */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Order bump en el checkout</h4>
          {productoId && !creandoBump && (
            <button type="button" onClick={() => setCreandoBump(true)} className="text-xs text-[var(--vit-primary)] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Nuevo order bump
            </button>
          )}
        </div>
        {!productoId ? (
          <p className="text-xs text-[var(--vit-muted-2)]">Solo disponible en el diseño propio de un producto.</p>
        ) : (
          <>
            {creandoBump && (
              <form onSubmit={crearOrderBump} className="flex flex-col gap-2 p-3 mb-3 rounded border border-[var(--vit-accent)] bg-[var(--vit-surface)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--vit-text)]">Nuevo order bump</span>
                  <button type="button" onClick={() => setCreandoBump(false)} className="p-0.5 text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><X size={14} /></button>
                </div>
                {errorOferta && <p className="text-xs text-red-500">{errorOferta}</p>}
                <div>
                  <label className="text-[10px] text-[var(--vit-muted-2)] uppercase mb-1 block">Productos complementarios (de tu catálogo)</label>
                  {formBump.productos_ids.map((pid, idx) => (
                    <div key={idx} className="flex items-center gap-1 mb-1">
                      <div className="relative flex-1">
                        <select required value={pid} onChange={e => {
                          const newIds = [...formBump.productos_ids];
                          newIds[idx] = e.target.value;
                          setFormBump(f => ({ ...f, productos_ids: newIds }));
                        }} className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] pl-2 pr-8 text-sm focus:border-[var(--vit-accent)] focus:outline-none appearance-none text-ellipsis overflow-hidden whitespace-nowrap">
                          <option value="">-- Elegir producto --</option>
                          {productosDisponibles.filter(p => String(p.id) !== String(productoId)).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--vit-muted)] pointer-events-none" />
                      </div>
                      {formBump.productos_ids.length > 1 && (
                        <button type="button" onClick={() => {
                          const newIds = formBump.productos_ids.filter((_, i) => i !== idx);
                          setFormBump(f => ({ ...f, productos_ids: newIds }));
                        }} className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setFormBump(f => ({ ...f, productos_ids: [...f.productos_ids, ''] }))} className="text-[11px] text-[var(--vit-primary)] font-semibold mt-1">
                    + Agregar otro producto al combo
                  </button>
                </div>
                <div className="mt-2">
                  <label className="text-[10px] text-[var(--vit-muted-2)] uppercase">Texto para el checkout</label>
                  <input type="text" required placeholder="Ej. Sumá el Mouse por 50mil más" value={formBump.nombre} onChange={e => setFormBump(f => ({ ...f, nombre: e.target.value }))} className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--vit-muted-2)] uppercase">Precio total (este producto + el agregado)</label>
                  <input type="number" min="0" required value={formBump.precio} onChange={e => setFormBump(f => ({ ...f, precio: e.target.value }))} className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none" />
                </div>
                <button type="submit" disabled={guardandoOferta} className="mt-1 h-8 rounded-md bg-[var(--vit-accent)] text-fg text-sm font-semibold disabled:opacity-50">
                  {guardandoOferta ? 'Creando...' : 'Crear order bump'}
                </button>
              </form>
            )}

            {orderBumps.length === 0 ? (
              <p className="text-xs text-[var(--vit-muted-2)]">No hay ofertas tipo "Order bump" para este producto todavía.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-[var(--vit-muted-2)] mb-2">
                  Seleccioná el order bump activo para esta página.
                </p>
                <div className="flex flex-col gap-2">
                  <div 
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${!config.order_bump_oferta_id ? 'border-[var(--vit-accent)] bg-[var(--vit-accent)]/10' : 'border-[var(--vit-border)] bg-[var(--vit-surface)] hover:border-[var(--vit-accent)]/50'}`}
                    onClick={() => onUpdate({ config: { ...config, order_bump_oferta_id: null, _preview_bump_nombre: null, _preview_bump_imagen: null, _preview_bump_precio: null, _preview_bump_descripcion: null } })}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">Sin order bump</span>
                    </div>
                  </div>
                  
                  {orderBumps.map(ob => {
                    const bumpComps = ob.componentes?.filter(c => String(c.producto_id) !== String(productoId)) || [];
                    if (bumpComps.length === 0 && ob.componentes?.[1]) bumpComps.push(ob.componentes[1]);
                    
                    let img = null;
                    for (const comp of bumpComps) {
                      const pImg = productosDisponibles.find(p => String(p.id) === String(comp?.producto_id));
                      const rawImg = pImg?.imagen || pImg?.imagenes?.[0] || comp?.Producto?.imagen || ob.producto_complementario?.imagen;
                      const parsedImg = typeof rawImg === 'string' ? rawImg : (rawImg?.url || rawImg?.ruta || null);
                      if (parsedImg) {
                        img = parsedImg;
                        break;
                      }
                    }
                    const isActive = config.order_bump_oferta_id === ob.id;

                    const summaryAgrega = bumpComps.map(c => {
                      const p = c.Producto || productosDisponibles.find(pd => String(pd.id) === String(c.producto_id));
                      return p?.nombre || 'Producto';
                    }).join(' + ') || 'Producto';

                    return (
                      <div 
                        key={ob.id} 
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${isActive ? 'border-[var(--vit-accent)] bg-[var(--vit-accent)]/10' : 'border-[var(--vit-border)] bg-[var(--vit-surface)] hover:border-[var(--vit-accent)]/50'}`}
                        onClick={() => {
                          onUpdate({
                            config: { 
                              ...config, 
                              order_bump_oferta_id: ob.id,
                              _preview_bump_nombre: ob.nombre || (bumpComps[0]?.Producto?.nombre || productosDisponibles.find(p => String(p.id) === String(bumpComps[0]?.producto_id))?.nombre),
                              _preview_bump_imagen: img || null,
                              _preview_bump_precio: ob.precio || 0,
                              _preview_bump_descripcion: ob.descripcion || null
                            }
                          });
                        }}
                      >
                        <div className="w-14 h-14 shrink-0 rounded border border-[var(--vit-border)] flex items-center justify-center overflow-hidden bg-[var(--vit-bg)]">
                          {img ? (
                            <img src={getMediaUrl(img)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-[var(--vit-muted-2)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <span className="text-sm font-medium leading-tight mb-0.5">{ob.nombre}</span>
                          <span className="text-[11px] text-[var(--vit-muted-2)] line-clamp-2">Agrega: {summaryAgrega}</span>
                        </div>
                        <div className="text-sm font-bold shrink-0">
                          {formatPrecio(ob.precio)}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); eliminarPack(ob.id); }}
                          className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded ml-1"
                          title="Eliminar order bump"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {config.order_bump_oferta_id && (
                  <Toggle
                    label="Mostrar el checkbox en el checkout"
                    checked={config.mostrar_order_bump !== false}
                    onChange={v => actualizar('mostrar_order_bump', v)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between border-b border-[var(--vit-border)] pb-2 mb-3">
          <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Bloques de info (Beneficios, Qué incluye...)</h4>
          <button type="button" onClick={agregarBloque} className="text-xs text-[var(--vit-primary)] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={12} /> Agregar bloque
          </button>
        </div>
        <p className="text-xs text-[var(--vit-muted-2)] mb-3">
          Van debajo del precio, dentro de la misma columna de compra — así como "💎 BENEFICIOS" o "📦 QUÉ INCLUYE" en una ficha de producto tipo Shopify.
        </p>

        {bloques.length === 0 && (
          <p className="text-sm text-[var(--vit-muted-2)] italic">Sin bloques todavía.</p>
        )}

        <div className="flex flex-col gap-3">
          {bloques.map((bloque, idxBloque) => (
            <div key={idxBloque} className="flex flex-col gap-2 p-3 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bloque.titulo}
                  onChange={e => actualizarTituloBloque(idxBloque, e.target.value)}
                  placeholder="Título del bloque (ej: 💎 Beneficios)"
                  className="flex-1 h-9 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm font-semibold focus:border-[var(--vit-accent)] focus:outline-none"
                />
                <button type="button" onClick={() => moverBloque(idxBloque, -1)} disabled={idxBloque === 0} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                <button type="button" onClick={() => moverBloque(idxBloque, 1)} disabled={idxBloque === bloques.length - 1} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronDown size={14} /></button>
                <button type="button" onClick={() => quitarBloque(idxBloque)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
              </div>

              <div className="flex flex-col gap-1.5 pl-2">
                {bloque.items.map((item, idxItem) => (
                  <div key={idxItem} className="flex items-center gap-2">
                    <span className="text-[var(--vit-muted)] text-sm">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={e => actualizarItem(idxBloque, idxItem, e.target.value)}
                      placeholder="Ítem de la lista..."
                      className="flex-1 h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                    />
                    <button type="button" onClick={() => quitarItem(idxBloque, idxItem)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => agregarItem(idxBloque)}
                  className="text-xs text-[var(--vit-primary)] font-semibold flex items-center gap-1 hover:underline mt-1 self-start"
                >
                  <Plus size={11} /> Agregar ítem
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
