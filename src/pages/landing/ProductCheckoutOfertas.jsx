import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ShoppingCart, Tag, X, Loader, Trash2, Minus, Package, Check, Edit, Sparkles } from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import ProductPicker from './ProductPicker';
import OfertaImagenPicker, { subirImagenPendiente } from '../../components/OfertaImagenPicker';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import './landing.css';

/**
 * Ofertas de un producto. Son DOS cosas distintas, en dos momentos distintos,
 * y conviene no confundirlas:
 *
 *  - PAQUETE: el MISMO producto en más cantidad, a un precio especial
 *    ("1 x 450.000, 2 x 770.000, 3 x 990.000"). No lleva otros productos, así
 *    que no hay nada que elegir: solo cuántas unidades y a qué precio. Se
 *    muestra siempre en la ficha del producto, antes de comprar.
 *  - ORDER BUMP: un producto DISTINTO que se suma como casilla dentro del
 *    checkout, después de que el cliente ya decidió qué lleva.
 *  - UPSELL: un producto DISTINTO que se ofrece como paso de decisión antes
 *    de confirmar el pedido. No aparece como checkbox mezclado con el carrito:
 *    interrumpe el flujo para proponer una mejora clara.
 *
 * El precio del paquete lo fija el comercio a mano — es el sentido de la
 * oferta. El sistema solo calcula el ahorro contra lo que costarían esas
 * mismas unidades sueltas; nunca impone el precio.
 */

const ESTRATEGIAS = [
  {
    value: 'normal',
    label: 'Paquete — más unidades del mismo producto',
    ayuda: 'Se muestra en la ficha del producto como otra forma de comprarlo (ej. 2 unidades a precio especial).',
    esPaquete: true,
  },
  {
    value: 'order_bump',
    label: 'Order Bump — un producto extra antes de pagar',
    ayuda: 'Se muestra como una casilla dentro del checkout. Suma UN producto distinto a lo que el cliente ya está comprando.',
    esPaquete: false,
  },
  {
    value: 'upsell',
    label: 'Upsell — una mejora antes de confirmar',
    ayuda: 'Se muestra como una oferta de mejora antes de crear el pedido o enviar a WhatsApp.',
    esPaquete: false,
  },
];

const CAMPO = 'w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none';
const ETIQUETA = 'block text-[10px] text-[var(--vit-muted-2)] uppercase mb-1';

function formVacio() {
  return {
    estrategia: 'normal',
    nombre: '',
    unidades: 2,          // solo paquete
    precio: '',           // precio del paquete, a mano
    bumpProductoId: null, // solo order bump
    precio_order_bump: '',
    descripcion: '',
    // Archivo elegido antes de que la oferta exista: todavía no hay id al
    // que subirlo, así que se guarda acá y se sube recién después de crear
    // (ver crearOferta), igual que en OfertasProductoTab.
    imagen_archivo: null,
  };
}

export default function ProductCheckoutOfertas({ producto, config, onChange, catalogo, onOfertasChange }) {
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  function openEditar(oferta) {
    setCreando(false);
    setEditandoId(oferta.id);
    const esPaq = oferta.estrategia === 'normal';
    const c = oferta.componentes?.[0];
    setForm({
      estrategia: oferta.estrategia || 'normal',
      nombre: oferta.nombre || '',
      unidades: esPaq && c ? c.cantidad : 2,
      precio: esPaq ? oferta.precio_normal || oferta.precio || '' : '',
      bumpProductoId: !esPaq && c ? c.producto_id : null,
      precio_order_bump: !esPaq ? oferta.precio_order_bump || '' : '',
      descripcion: oferta.descripcion || '',
      imagen_archivo: null,
    });
    setErrorOferta('');
  }

  // Dónde se muestran los extras de checkout de esta landing. Un paquete no
  // se configura acá: siempre va en la ficha del producto.
  const ofertasCarrito = config.ofertas_carrito || [];
  const ofertasProductoVista = config.ofertas_producto_vista || [];

  const [form, setForm] = useState(formVacio);
  const [guardandoOferta, setGuardandoOferta] = useState(false);
  const [errorOferta, setErrorOferta] = useState('');

  const estrategiaActual = ESTRATEGIAS.find(e => e.value === form.estrategia) || ESTRATEGIAS[0];
  const esPaquete = estrategiaActual.esPaquete;

  const porId = useMemo(
    () => new Map((catalogo?.productos || []).map(p => [Number(p.id), p])),
    [catalogo]
  );
  const precioUnitario = Number(
    porId.get(Number(producto?.id))?.precio_efectivo ?? porId.get(Number(producto?.id))?.precio_base ?? producto?.precio_efectivo ?? 0
  );

  // Un order bump ofrece algo que el cliente NO tiene: nunca el propio producto.
  const productosElegibles = useMemo(
    () => (catalogo?.productos || []).filter(p => Number(p.id) !== Number(producto?.id)),
    [catalogo, producto?.id]
  );

  const bumpElegido = form.bumpProductoId ? porId.get(Number(form.bumpProductoId)) : null;
  const precioBumpNormal = Number(bumpElegido?.precio_efectivo ?? bumpElegido?.precio_base ?? 0);

  /**
   * Ahorro del paquete: se deriva del precio que puso el comercio, comparado
   * con lo que costarían esas unidades sueltas. Informativo, no impositivo.
   */
  const ahorro = useMemo(() => {
    const valorIndividual = precioUnitario * Math.max(1, Number(form.unidades) || 1);
    const precioPaquete = Number(form.precio) || 0;
    if (!valorIndividual || !precioPaquete) return null;
    const diferencia = valorIndividual - precioPaquete;
    return { valorIndividual, precioPaquete, diferencia, porcentaje: (diferencia / valorIndividual) * 100 };
  }, [precioUnitario, form.unidades, form.precio]);

  const descuentoBump = precioBumpNormal > 0 && Number(form.precio_order_bump) > 0 && Number(form.precio_order_bump) < precioBumpNormal
    ? Math.round((1 - Number(form.precio_order_bump) / precioBumpNormal) * 100)
    : null;

  useEffect(() => {
    if (producto?.id) cargarOfertas();
  }, [producto?.id]);

  async function cargarOfertas() {
    setCargando(true);
    try {
      const resp = await ofertaService.listarPorProducto(producto.id, { soloActivas: true });
      const ofertasVisibles = resp.filter(o => ['normal', 'order_bump', 'upsell'].includes(o.estrategia));
      setOfertas(ofertasVisibles);
      onOfertasChange?.(ofertasVisibles);
    } catch (e) {
      console.error('Error cargando ofertas para producto', e);
      onOfertasChange?.([]);
    } finally {
      setCargando(false);
    }
  }

  function handleCheck(ofertaId, lista, checked) {
    const actual = config[lista] || [];
    const nuevaLista = checked
      ? [...actual, ofertaId]
      : actual.filter(id => Number(id) !== Number(ofertaId));
    onChange('content', { ...config, [lista]: nuevaLista });
  }

  function cambiarEstrategia(valor) {
    setForm(prev => ({ ...formVacio(), estrategia: valor, nombre: prev.nombre, descripcion: prev.descripcion, imagen_archivo: prev.imagen_archivo }));
  }

  async function guardarOferta(e) {
    e.preventDefault();
    setErrorOferta('');

    if (!form.nombre.trim()) return setErrorOferta('El título es obligatorio.');

    if (esPaquete) {
      const unidades = Number(form.unidades) || 0;
      if (unidades < 2) return setErrorOferta('Un paquete tiene que llevar al menos 2 unidades.');
      if (!(Number(form.precio) > 0)) return setErrorOferta('Poné el precio del paquete.');
    } else {
      if (!form.bumpProductoId) return setErrorOferta('Elegí el producto que se ofrece como extra.');
      if (!(precioBumpNormal > 0)) return setErrorOferta('Ese producto no tiene precio de venta configurado.');
    }

    setGuardandoOferta(true);
    try {
      const comun = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || '',
      };

      const payload = esPaquete
        // Paquete = el mismo producto, más unidades. Un solo componente: el
        // producto de esta ficha. El backend exige justamente eso para un
        // 'pack' (ver OfertaService.validarComponentesParaTipo).
        ? {
          ...comun,
          estrategia: 'normal',
          tipo_contenido: 'pack',
          codigo: `PACK-${producto.id}-${Date.now()}`,
          precio_normal: Number(form.precio),
          precio_order_bump: null,
          componentes: [{ producto_id: producto.id, cantidad: Number(form.unidades) }],
        }
        : {
          ...comun,
          estrategia: form.estrategia,
          tipo_contenido: 'combo',
          codigo: `${form.estrategia === 'upsell' ? 'UPSELL' : 'BUMP'}-${producto.id}-${Date.now()}`,
          // Referencia: lo que vale ese producto suelto. El promocional es
          // opcional; vacío = se cobra el normal.
          precio_normal: precioBumpNormal,
          precio_order_bump: form.precio_order_bump === '' || form.precio_order_bump === null
            ? null : Number(form.precio_order_bump),
          componentes: [{ producto_id: Number(form.bumpProductoId), cantidad: 1 }],
        };

      const guardada = editandoId
        ? await ofertaService.actualizar(editandoId, payload)
        : await ofertaService.crear(producto.id, payload);

      // La oferta recién se guarda acá arriba, así que la imagen elegida antes
      // (guardada como File en form.imagen_archivo, ver OfertaImagenPicker en
      // modo "sin id") se sube recién ahora. Si falla, la oferta ya quedó
      // guardada igual — se avisa sin deshacer nada.
      const avisoImagen = await subirImagenPendiente(guardada?.id, form.imagen_archivo);

      await cargarOfertas();
      setCreando(false);
      setEditandoId(null);
      setForm(formVacio());
      if (avisoImagen) setErrorOferta(avisoImagen);
    } catch (err) {
      setErrorOferta(err.response?.data?.message || 'Error al crear la oferta.');
    } finally {
      setGuardandoOferta(false);
    }
  }

  async function eliminarOferta(id) {
    if (!window.confirm('¿Dar de baja esta oferta? Deja de mostrarse, pero los pedidos que la usaron la siguen referenciando.')) return;
    try {
      await ofertaService.eliminar(id);
      // La landing guarda por id qué order bumps muestra: si se borra uno y su
      // id queda en esas listas, arrastra una referencia muerta que ya no se
      // puede destildar desde ningún lado.
      const limpiar = lista => (config[lista] || []).filter(x => Number(x) !== Number(id));
      onChange('content', {
        ...config,
        ofertas_carrito: limpiar('ofertas_carrito'),
        ofertas_producto_vista: limpiar('ofertas_producto_vista'),
      });
      await cargarOfertas();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar la oferta.');
    }
  }

  if (cargando) {
    return <div className="flex justify-center py-4"><Loader className="animate-spin text-[var(--vit-muted)]" /></div>;
  }

  const seleccionPicker = new Map(
    form.bumpProductoId ? [[`producto:${form.bumpProductoId}`, { id: Number(form.bumpProductoId), tipo: 'producto' }]] : []
  );

  return (
    <div className="flex flex-col gap-4 mt-6 border-t border-[var(--vit-border)] pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--vit-text)]">Ofertas</h3>
          <p className="text-xs text-[var(--vit-muted-2)]">Paquetes en la ficha y Order Bumps en el checkout de {producto.nombre || producto.etiqueta}.</p>
        </div>
        {!creando && !editandoId && (
          <button type="button" onClick={() => setCreando(true)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--vit-text)] bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-md hover:border-[var(--vit-accent)] transition-colors">
            <Plus size={14} /> Nueva
          </button>
        )}
      </div>

      {(creando || editandoId) && (
        <form onSubmit={guardarOferta} className="bg-[var(--vit-surface)] border border-[var(--vit-border)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--vit-text)]">{editandoId ? 'Editar Oferta' : 'Nueva Oferta'}</span>
            <button type="button" onClick={() => { setCreando(false); setEditandoId(null); setForm(formVacio()); setErrorOferta(''); }} className="text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><X size={14} /></button>
          </div>

          {errorOferta && <div className="text-xs text-red-500 mb-2">{errorOferta}</div>}

          <div className="mb-3">
            <label className={ETIQUETA}>Tipo de oferta</label>
            <select value={form.estrategia} onChange={e => cambiarEstrategia(e.target.value)} className={CAMPO}>
              {ESTRATEGIAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">{estrategiaActual.ayuda}</p>
          </div>

          <div className="mb-3">
            <label className={ETIQUETA}>Título</label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder={esPaquete ? 'Ej: Llevá 2' : 'Ej: Sumá un cargador'} className={CAMPO} />
          </div>

          {esPaquete ? (
            <>
              {/* Un paquete es este mismo producto en más cantidad: no hay
                  productos que elegir, solo cuántas unidades entran. */}
              <div className="mb-3 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 shrink-0 rounded overflow-hidden bg-[var(--vit-surface)] flex items-center justify-center">
                    {porId.get(Number(producto?.id))?.imagen
                      ? <img src={getMediaUrl(porId.get(Number(producto.id)).imagen)} alt="" className="w-full h-full object-cover" />
                      : <Package size={14} className="text-[var(--vit-muted-2)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--vit-text)] truncate">{producto.nombre || producto.etiqueta}</div>
                    <div className="text-[10px] text-[var(--vit-muted-2)]">{formatPrecio(precioUnitario)} por unidad</div>
                  </div>
                  <span className="flex items-center gap-1 shrink-0">
                    <button type="button" title="Menos unidades" onClick={() => setForm(f => ({ ...f, unidades: Math.max(2, Number(f.unidades) - 1) }))} className="p-0.5 rounded border border-[var(--vit-border)] text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><Minus size={11} /></button>
                    <span className="text-xs font-semibold text-[var(--vit-text)] w-5 text-center">{form.unidades}</span>
                    <button type="button" title="Más unidades" onClick={() => setForm(f => ({ ...f, unidades: Number(f.unidades) + 1 }))} className="p-0.5 rounded border border-[var(--vit-border)] text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><Plus size={11} /></button>
                  </span>
                </div>
              </div>

              {/* Precio total SIN descuento — siempre visible, ni bien se
                  elige la cantidad, sin depender de que ya se haya tipeado el
                  precio del paquete. Es la referencia contra la que se lee el
                  ahorro de abajo. */}
              <div className="mb-3 flex items-center justify-between text-xs rounded-md border border-dashed border-[var(--vit-border)] px-2 py-1.5">
                <span className="text-[var(--vit-muted-2)]">{form.unidades} unidades sin descuento</span>
                <span className="text-[var(--vit-text)] font-mono font-semibold">{formatPrecio(precioUnitario * Math.max(1, Number(form.unidades) || 1))}</span>
              </div>

              <div className="mb-3">
                <label className={ETIQUETA}>Precio del paquete</label>
                <CurrencyInput value={form.precio} onChange={val => setForm({ ...form, precio: val })} placeholder="Ej: 770000" className={CAMPO} />
                {ahorro ? (
                  <div className={`mt-1.5 flex justify-between text-[10px] font-semibold ${ahorro.diferencia > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span>{ahorro.diferencia > 0 ? 'Ahorro' : 'Sale más caro'}</span>
                    <span className="font-mono">
                      {formatPrecio(Math.abs(ahorro.diferencia))} ({Math.abs(ahorro.porcentaje).toFixed(2).replace('.', ',')}%)
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">
                    Lo ponés vos. No cambia el precio unitario del producto, que se sigue vendiendo igual por separado.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-3">
                <label className={ETIQUETA}>{form.estrategia === 'upsell' ? 'Producto de mejora' : 'Producto que se suma'}</label>
                <ProductPicker
                  catalogo={{ productos: productosElegibles, combos: [] }}
                  seleccion={seleccionPicker}
                  itemsOrdenados={[]}
                  onToggle={item => setForm(f => ({ ...f, bumpProductoId: Number(f.bumpProductoId) === Number(item.id) ? null : item.id }))}
                  onEtiqueta={() => {}}
                  onPrecioAncla={() => {}}
                  onReordenar={() => {}}
                  max={1}
                  mostrarInputs={false}
                  mostrarLista={false}
                />
                {bumpElegido ? (
                  <div className="flex items-center gap-2 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-1.5">
                    <div className="w-9 h-9 shrink-0 rounded overflow-hidden bg-[var(--vit-surface)] flex items-center justify-center">
                      {bumpElegido.imagen
                        ? <img src={getMediaUrl(bumpElegido.imagen)} alt="" className="w-full h-full object-cover" />
                        : <Package size={14} className="text-[var(--vit-muted-2)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[var(--vit-text)] truncate" title={bumpElegido.nombre}>{bumpElegido.nombre}</div>
                      <div className="text-[10px] text-[var(--vit-muted-2)] font-mono">{formatPrecio(precioBumpNormal)}</div>
                    </div>
                    <button type="button" title="Quitar" onClick={() => setForm(f => ({ ...f, bumpProductoId: null }))} className="shrink-0 p-1 rounded text-[var(--vit-muted-2)] hover:text-red-400"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-[var(--vit-muted-2)] border border-dashed border-[var(--vit-border)] rounded-md px-2 py-3 justify-center">
                    <Package size={14} /> Elegí el producto que se ofrece.
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className={ETIQUETA}>Precio promocional</label>
                <CurrencyInput value={form.precio_order_bump} onChange={val => setForm({ ...form, precio_order_bump: val })} placeholder="Opcional" className={CAMPO} />
                <p className="text-[10px] mt-1 leading-snug">
                  {descuentoBump !== null
                    ? <span className="text-emerald-400 font-semibold">-{descuentoBump}% sobre {formatPrecio(precioBumpNormal)}</span>
                    : <span className="text-[var(--vit-muted-2)]">Vacío = se cobra su precio normal. No modifica el precio de ese producto.</span>}
                </p>
              </div>
            </>
          )}

          <div className="mb-3">
            <label className={ETIQUETA}>Imagen de la oferta</label>
            <OfertaImagenPicker
              compacto
              ofertaId={null}
              imagenUrl={null}
              archivo={form.imagen_archivo}
              respaldoUrl={porId.get(Number(producto?.id))?.imagen || null}
              onChange={({ archivo }) => setForm(f => ({ ...f, imagen_archivo: archivo }))}
            />
          </div>

          <button type="submit" disabled={guardandoOferta} className="w-full h-8 rounded-md bg-[var(--vit-accent)] text-fg text-xs font-semibold hover:bg-[var(--vit-accent-hover)] disabled:opacity-50 transition-colors flex items-center justify-center">
            {guardandoOferta ? <Loader className="animate-spin" size={14} /> : 'Guardar'}
          </button>
        </form>
      )}

      {ofertas.length === 0 && !creando ? (
        <div className="text-center py-6 border border-dashed border-[var(--vit-border)] rounded-lg">
          <Tag className="mx-auto text-[var(--vit-muted-2)] mb-2" size={24} />
          <p className="text-xs text-[var(--vit-muted)]">No hay ofertas para este producto.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ofertas.map(of => {
            const esPack = of.estrategia === 'normal';
            const normal = Number(of.precio_normal ?? of.precio) || 0;
            const promo = !esPack && of.precio_order_bump != null && Number(of.precio_order_bump) !== normal
              ? Number(of.precio_order_bump) : null;
            const unidades = (of.componentes || []).reduce((s, c) => s + (c.cantidad || 0), 0);
            return (
              <div key={of.id} className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-lg p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--vit-text)]">{of.nombre}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--vit-accent)]/10 text-[var(--vit-accent)] uppercase tracking-wider">
                        {esPack ? `Paquete × ${unidades}` : 'Order Bump'}
                      </span>
                    </div>
                    <div className="text-xs mt-1 flex items-baseline gap-2 flex-wrap">
                      <span className="text-[var(--vit-text)] font-semibold">{formatPrecio(promo ?? normal)}</span>
                      {promo !== null && <span className="text-[var(--vit-muted-2)] line-through">{formatPrecio(normal)}</span>}
                    </div>
                    {normal <= 0 && (
                      <div className="text-[10px] text-amber-400 mt-1 leading-snug">
                        Esta oferta quedó guardada sin precio. Borrala y volvé a crearla.
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button type="button" onClick={() => eliminarOferta(of.id)} className="text-[var(--vit-muted-2)] hover:text-red-400 p-1 rounded-md transition-colors" title="Eliminar oferta">
                      <Trash2 size={14} />
                    </button>
                    <button type="button" onClick={() => openEditar(of)} className="text-[var(--vit-muted-2)] hover:text-[var(--vit-accent)] p-1 rounded-md transition-colors" title="Editar oferta">
                      <Edit size={14} />
                    </button>
                  </div>
                </div>

                {/* Imagen propia de la oferta. Es la MISMA que se carga desde
                    Mis Productos → Ofertas comerciales (vive en la Oferta, no
                    en la landing): se sube en cualquiera de los dos lados y se
                    ve en los dos, y en la landing publicada. Sin imagen propia
                    la tarjeta usa la del producto. */}
                <div className="border-t border-[var(--vit-border)] pt-2.5 mt-2">
                  <span className={ETIQUETA}>Imagen de la oferta</span>
                  <OfertaImagenPicker
                    compacto
                    ofertaId={of.id}
                    imagenUrl={of.imagen_url || null}
                    respaldoUrl={porId.get(Number(producto?.id))?.imagen || null}
                    onChange={({ imagen_url }) => {
                      // Se avisa también hacia arriba: el preview de la ficha
                      // dibuja las tarjetas con las ofertas que le pasa el
                      // editor, así que sin esto la foto nueva no se vería
                      // hasta recargar.
                      const actualizadas = ofertas.map(x => (x.id === of.id ? { ...x, imagen_url } : x));
                      setOfertas(actualizadas);
                      onOfertasChange?.(actualizadas);
                    }}
                  />
                </div>

                {/* Un paquete siempre se muestra en la ficha del producto: no
                    hay nada que configurar. Los extras de checkout (bump y
                    upsell) sí eligen dónde aparecen en esta landing. */}
                {esPack ? (
                  <div className="border-t border-[var(--vit-border)] pt-2 mt-2 text-xs text-[var(--vit-muted-2)] flex items-center gap-1.5">
                    <Package size={13} className="text-[var(--vit-accent)]" /> Se muestra en la ficha del producto.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 border-t border-[var(--vit-border)] pt-2 mt-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs text-[var(--vit-text)] flex items-center gap-1.5">
                        {of.estrategia === 'upsell' ? <Sparkles size={14} className="text-[var(--vit-accent)]" /> : <Check size={14} className="text-[var(--vit-accent)]" />}
                        {of.estrategia === 'upsell' ? 'Upsell antes de confirmar' : 'Checkout "Comprar Ya"'}
                      </span>
                      <input type="checkbox" className="accent-[var(--vit-accent)]" checked={ofertasProductoVista.some(id => Number(id) === Number(of.id))} onChange={e => handleCheck(of.id, 'ofertas_producto_vista', e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs text-[var(--vit-text)] flex items-center gap-1.5"><ShoppingCart size={14} className="text-[var(--vit-accent)]" /> Carrito global</span>
                      <input type="checkbox" className="accent-[var(--vit-accent)]" checked={ofertasCarrito.some(id => Number(id) === Number(of.id))} onChange={e => handleCheck(of.id, 'ofertas_carrito', e.target.checked)} />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
