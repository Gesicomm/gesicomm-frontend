import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Check, ShoppingCart, Tag, X, Loader, Trash2, Minus, Package } from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import ProductPicker from './ProductPicker';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import './landing.css';

/**
 * Ofertas que se presentan DENTRO del checkout de un producto.
 *
 * Solo dos estrategias, que son las dos formas de subir el ticket sin
 * cambiar lo que el cliente ya eligió:
 *  - order_bump: un producto extra ofrecido como casilla antes de pagar.
 *  - combo: un paquete de varios productos a precio fijo ("3 productos x
 *    120.000"), también elegible en el checkout.
 *
 * Cada oferta tiene DOS precios y eso es lo importante: `precio_normal` es
 * su precio de referencia y `precio_order_bump` el promocional que se cobra
 * solo dentro del checkout. Antes había un único precio, así que configurar
 * un bump pisaba el precio de venta normal y la reportería no podía separar
 * una venta con bump de una venta común (ver Oferta.js en el backend).
 *
 * El precio normal NO se tipea: sale del precio de venta ya configurado de
 * cada producto elegido (`precio_efectivo` del catálogo, que es el precio
 * propio de la vendedora o, si no fijó uno, el precio base). Tipearlo a mano
 * significaba poder cargar una referencia distinta a la real y desviar en
 * silencio el descuento que mide la reportería.
 */

const ESTRATEGIAS = [
  {
    value: 'order_bump',
    label: 'Order Bump — un producto extra antes de pagar',
    ayuda: 'Se muestra como una casilla en el checkout. Suma UN producto a lo que el cliente ya está comprando.',
    multiProducto: false,
  },
  {
    value: 'combo',
    label: 'Combo — varios productos a precio fijo',
    ayuda: 'Se muestra como un paquete completo en el checkout (ej. 3 productos x 120.000).',
    multiProducto: true,
  },
];

const CAMPO = 'w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none';
const ETIQUETA = 'block text-[10px] text-[var(--vit-muted-2)] uppercase mb-1';

function formVacio() {
  return {
    estrategia: 'order_bump',
    nombre: '',
    // Solo se usa si algún producto elegido no tiene precio en el catálogo
    // (ver precioNormalCalculado). En el caso normal queda vacío y sin mostrar.
    precio_normal_manual: '',
    precio_order_bump: '',
    descripcion: '',
    // [{ producto_id, cantidad }] — para order_bump siempre tiene 1 fila.
    componentes: [],
  };
}

export default function ProductCheckoutOfertas({ producto, config, onChange, catalogo }) {
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);

  // Configuración actual de la landing: qué ofertas se muestran y dónde.
  const ofertasCarrito = config.ofertas_carrito || [];
  const ofertasProductoVista = config.ofertas_producto_vista || [];

  const [form, setForm] = useState(formVacio);
  const [guardandoOferta, setGuardandoOferta] = useState(false);
  const [errorOferta, setErrorOferta] = useState('');

  const estrategiaActual = ESTRATEGIAS.find(e => e.value === form.estrategia) || ESTRATEGIAS[0];

  // Un combo puede incluir al producto ancla (es parte del paquete); un
  // order bump no — su gracia es agregar algo que el cliente NO tiene.
  const productosElegibles = useMemo(() => {
    const todos = catalogo?.productos || [];
    if (estrategiaActual.multiProducto) return todos;
    return todos.filter(p => Number(p.id) !== Number(producto?.id));
  }, [catalogo, producto?.id, estrategiaActual.multiProducto]);

  /**
   * Precio de venta ya configurado de cada producto, tal como lo sirve el
   * catálogo: `precio_efectivo` es el precio propio de la vendedora si fijó
   * uno, y si no el precio base (ver precioUsuario.service.js#listarCatalogo).
   */
  const desglosePrecio = useMemo(() => {
    const porId = new Map((catalogo?.productos || []).map(p => [Number(p.id), p]));
    return form.componentes.map(c => {
      const prod = porId.get(c.producto_id);
      const unitario = prod?.precio_efectivo ?? prod?.precio_base ?? null;
      return {
        producto_id: c.producto_id,
        nombre: prod?.nombre || `Producto #${c.producto_id}`,
        imagen: prod?.imagen || null,
        cantidad: c.cantidad,
        unitario: unitario === null || unitario === undefined ? null : Number(unitario),
      };
    });
  }, [form.componentes, catalogo]);

  // null = no se puede derivar (algún producto sin precio en el catálogo);
  // ahí y solo ahí se pide el número a mano.
  const precioNormalCalculado = desglosePrecio.length && desglosePrecio.every(d => d.unitario !== null)
    ? desglosePrecio.reduce((s, d) => s + d.unitario * d.cantidad, 0)
    : null;

  const precioNormal = precioNormalCalculado !== null
    ? precioNormalCalculado
    : (form.precio_normal_manual === '' ? null : Number(form.precio_normal_manual));

  const promo = form.precio_order_bump === '' || form.precio_order_bump === null
    ? null : Number(form.precio_order_bump);
  const descuentoPct = precioNormal > 0 && promo !== null && promo < precioNormal
    ? Math.round((1 - promo / precioNormal) * 100)
    : null;

  useEffect(() => {
    if (producto?.id) cargarOfertas();
  }, [producto?.id]);

  async function cargarOfertas() {
    setCargando(true);
    try {
      // soloActivas: la baja de una oferta es lógica. Sin esto la que acabás
      // de borrar volvía a aparecer en la lista y parecía que no se borraba.
      const resp = await ofertaService.listarPorProducto(producto.id, { soloActivas: true });
      setOfertas(resp.filter(o => o.estrategia === 'order_bump' || o.estrategia === 'combo'));
    } catch (e) {
      console.error('Error cargando ofertas para producto', e);
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

  /** Cambiar de estrategia limpia los componentes: las reglas de qué productos
   *  admite cada una son distintas y arrastrarlos deja combinaciones inválidas. */
  function cambiarEstrategia(valor) {
    setForm(prev => ({ ...prev, estrategia: valor, componentes: [] }));
  }

  function toggleComponente(productoId, multiProducto) {
    const id = Number(productoId);
    setForm(prev => {
      const yaEsta = prev.componentes.some(c => c.producto_id === id);
      // Un order bump lleva un solo producto: volver a tildar el que ya está
      // lo saca. Sin esto quedaba trabado — el picker deshabilita el resto de
      // las tarjetas al llegar al máximo, así que si el elegido tampoco se
      // podía destildar no había forma de cambiar de producto.
      if (!multiProducto) {
        return { ...prev, componentes: (yaEsta || !id) ? [] : [{ producto_id: id, cantidad: 1 }] };
      }
      return {
        ...prev,
        componentes: yaEsta
          ? prev.componentes.filter(c => c.producto_id !== id)
          : [...prev.componentes, { producto_id: id, cantidad: 1 }],
      };
    });
  }

  /**
   * ProductPicker trabaja con un Map de claves "<tipo>:<id>" y emite el item
   * completo del catálogo al tildar. Se traduce acá a los componentes de la
   * oferta, que son {producto_id, cantidad}. Se reusa ese componente y no una
   * lista propia para que elegir productos se sienta igual que en Productos
   * Relacionados: el mismo popup, con buscador, filtros y fotos.
   */
  const seleccionPicker = useMemo(
    () => new Map(form.componentes.map(c => [`producto:${c.producto_id}`, { id: c.producto_id, tipo: 'producto' }])),
    [form.componentes]
  );

  // Solo productos: una Oferta descuenta stock por producto (OfertaComponente),
  // no sabe de combos.
  const catalogoPicker = useMemo(
    () => ({ productos: productosElegibles, combos: [] }),
    [productosElegibles]
  );

  function quitarComponente(productoId) {
    setForm(prev => ({ ...prev, componentes: prev.componentes.filter(c => c.producto_id !== productoId) }));
  }

  function cambiarCantidad(productoId, delta) {
    setForm(prev => ({
      ...prev,
      componentes: prev.componentes.map(c =>
        c.producto_id === productoId ? { ...c, cantidad: Math.max(1, c.cantidad + delta) } : c
      ),
    }));
  }

  const unidadesTotales = form.componentes.reduce((s, c) => s + c.cantidad, 0);

  async function crearOferta(e) {
    e.preventDefault();
    setErrorOferta('');

    if (!form.nombre.trim()) return setErrorOferta('El título de la oferta es obligatorio.');
    if (!form.componentes.length) {
      return setErrorOferta(estrategiaActual.multiProducto
        ? 'Elegí al menos un producto para el combo.'
        : 'Elegí el producto que se ofrece como order bump.');
    }
    if (!precioNormal) {
      return setErrorOferta(precioNormalCalculado === null
        ? 'No se pudo leer el precio de venta de alguno de los productos elegidos. Cargalo a mano.'
        : 'Los productos elegidos no tienen precio de venta configurado.');
    }

    setGuardandoOferta(true);
    try {
      const prefijo = form.estrategia === 'combo' ? 'COMBO' : 'BUMP';
      await ofertaService.crear(producto.id, {
        estrategia: form.estrategia,
        // El backend fuerza tipo_contenido='combo' para estrategia 'combo';
        // un order bump siempre suma un producto distinto al ancla, así que
        // también es un combo en términos de contenido (nunca un "pack").
        tipo_contenido: 'combo',
        codigo: `${prefijo}-${producto.id}-${Date.now()}`,
        nombre: form.nombre.trim(),
        // Derivado del precio de venta de los productos elegidos, no tipeado.
        precio_normal: precioNormal,
        // Vacío = se cobra el precio normal. No se manda 0, que sería
        // regalarlo.
        precio_order_bump: form.precio_order_bump === '' || form.precio_order_bump === null
          ? null : Number(form.precio_order_bump),
        descripcion: form.descripcion || '',
        componentes: form.componentes,
      });
      await cargarOfertas();
      setCreando(false);
      setForm(formVacio());
    } catch (err) {
      setErrorOferta(err.response?.data?.message || 'Error al crear la oferta.');
    } finally {
      setGuardandoOferta(false);
    }
  }

  async function eliminarOferta(id) {
    if (!window.confirm('¿Dar de baja esta oferta? Deja de mostrarse, pero los pedidos que la usaron la siguen referenciando.')) return;
    try {
      // ofertaService.eliminar espera el id de la OFERTA. Antes se le pasaba
      // (producto.id, id) y el primer argumento ganaba: se daba de baja una
      // oferta cualquiera cuyo id coincidía con el del producto.
      await ofertaService.eliminar(id);
      // La landing guarda qué ofertas muestra por id. Si se borra una y su id
      // queda en esas listas, la landing arrastra una referencia muerta que
      // nadie puede volver a destildar (la casilla ya no se muestra).
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

  return (
    <div className="flex flex-col gap-4 mt-6 border-t border-[var(--vit-border)] pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--vit-text)]">Ofertas de Checkout</h3>
          <p className="text-xs text-[var(--vit-muted-2)]">Order Bumps y Combos para la compra de {producto.nombre || producto.etiqueta}.</p>
        </div>
        {!creando && (
          <button type="button" onClick={() => setCreando(true)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--vit-text)] bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-md hover:border-[var(--vit-accent)] transition-colors">
            <Plus size={14} /> Nueva
          </button>
        )}
      </div>

      {creando && (
        <form onSubmit={crearOferta} className="bg-[var(--vit-surface)] border border-[var(--vit-border)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--vit-text)]">Nueva Oferta</span>
            <button type="button" onClick={() => { setCreando(false); setForm(formVacio()); setErrorOferta(''); }} className="text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><X size={14} /></button>
          </div>

          {errorOferta && <div className="text-xs text-red-500 mb-2">{errorOferta}</div>}

          <div className="mb-3">
            <label className={ETIQUETA}>Estrategia</label>
            <select value={form.estrategia} onChange={e => cambiarEstrategia(e.target.value)} className={CAMPO}>
              {ESTRATEGIAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">{estrategiaActual.ayuda}</p>
          </div>

          <div className="mb-3">
            <label className={ETIQUETA}>
              {estrategiaActual.multiProducto
                ? `Productos del combo${unidadesTotales ? ` (${unidadesTotales} unidades)` : ''}`
                : 'Producto de la oferta'}
            </label>

            {/* Mismo popup de catálogo que Productos Relacionados: buscador,
                filtros y fotos. La lista de abajo es propia porque acá cada
                producto lleva una cantidad, que ProductPicker no maneja. */}
            <ProductPicker
              catalogo={catalogoPicker}
              seleccion={seleccionPicker}
              itemsOrdenados={[]}
              onToggle={item => toggleComponente(item.id, estrategiaActual.multiProducto)}
              onEtiqueta={() => {}}
              onPrecioAncla={() => {}}
              onReordenar={() => {}}
              max={estrategiaActual.multiProducto ? 12 : 1}
              mostrarInputs={false}
              mostrarLista={false}
            />

            {desglosePrecio.length === 0 ? (
              <div className="flex items-center gap-2 text-[11px] text-[var(--vit-muted-2)] border border-dashed border-[var(--vit-border)] rounded-md px-2 py-3 justify-center">
                <Package size={14} />
                {estrategiaActual.multiProducto ? 'Elegí los productos del combo.' : 'Elegí el producto que se suma.'}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {desglosePrecio.map(d => (
                  <div key={d.producto_id} className="flex items-center gap-2 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-1.5">
                    <div className="w-9 h-9 shrink-0 rounded overflow-hidden bg-[var(--vit-surface)] flex items-center justify-center">
                      {d.imagen
                        ? <img src={getMediaUrl(d.imagen)} alt="" className="w-full h-full object-cover" />
                        : <Package size={14} className="text-[var(--vit-muted-2)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[var(--vit-text)] truncate" title={d.nombre}>{d.nombre}</div>
                      <div className="text-[10px] text-[var(--vit-muted-2)] font-mono">
                        {d.unitario === null ? 'sin precio en el catálogo' : formatPrecio(d.unitario * d.cantidad)}
                      </div>
                    </div>
                    {estrategiaActual.multiProducto && (
                      <span className="flex items-center gap-1 shrink-0">
                        <button type="button" title="Quitar una unidad" onClick={() => cambiarCantidad(d.producto_id, -1)} className="p-0.5 rounded border border-[var(--vit-border)] text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><Minus size={11} /></button>
                        <span className="text-xs font-semibold text-[var(--vit-text)] w-4 text-center">{d.cantidad}</span>
                        <button type="button" title="Sumar una unidad" onClick={() => cambiarCantidad(d.producto_id, 1)} className="p-0.5 rounded border border-[var(--vit-border)] text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><Plus size={11} /></button>
                      </span>
                    )}
                    <button type="button" title="Quitar del combo" onClick={() => quitarComponente(d.producto_id)} className="shrink-0 p-1 rounded text-[var(--vit-muted-2)] hover:text-red-400"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className={ETIQUETA}>Título de la oferta</label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Sumá un cargador" className={CAMPO} />
          </div>

          <div className="mb-3">
            <label className={ETIQUETA}>Precio normal</label>
            {precioNormalCalculado !== null ? (
              <div className="rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 py-1.5">
                <div className="text-sm font-semibold text-[var(--vit-text)] text-right">{formatPrecio(precioNormalCalculado)}</div>
              </div>
            ) : (
              <>
                <CurrencyInput value={form.precio_normal_manual} onChange={val => setForm({ ...form, precio_normal_manual: val })} placeholder="Ej: 120000" className={CAMPO} />
                <p className="text-[10px] text-amber-400 mt-1 leading-snug">
                  {form.componentes.length
                    ? 'Alguno de los productos elegidos no tiene precio de venta en el catálogo. Cargalo a mano.'
                    : 'Elegí los productos y el precio se calcula solo.'}
                </p>
              </>
            )}
            <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">
              Sale del precio de venta ya configurado de cada producto. No modifica ese precio: es la referencia con la que la reportería mide el descuento.
            </p>
          </div>

          <div className="mb-3">
            <label className={ETIQUETA}>Precio promocional en checkout</label>
            <CurrencyInput value={form.precio_order_bump} onChange={val => setForm({ ...form, precio_order_bump: val })} placeholder="Opcional" className={CAMPO} />
            <p className="text-[10px] mt-1 leading-snug">
              {descuentoPct !== null ? (
                <span className="text-emerald-400 font-semibold">-{descuentoPct}% sobre el precio normal</span>
              ) : promo !== null && precioNormal > 0 && promo >= precioNormal ? (
                <span className="text-amber-400">No es un descuento: es igual o mayor al precio normal.</span>
              ) : (
                <span className="text-[var(--vit-muted-2)]">Lo que se cobra si el cliente la acepta acá. Vacío = se cobra el precio normal.</span>
              )}
            </p>
          </div>

          <button type="submit" disabled={guardandoOferta} className="w-full h-8 rounded-md bg-[var(--vit-accent)] text-white text-xs font-semibold hover:bg-[var(--vit-accent-hover)] disabled:opacity-50 transition-colors flex items-center justify-center">
            {guardandoOferta ? <Loader className="animate-spin" size={14} /> : 'Guardar Oferta'}
          </button>
        </form>
      )}

      {ofertas.length === 0 && !creando ? (
        <div className="text-center py-6 border border-dashed border-[var(--vit-border)] rounded-lg">
          <Tag className="mx-auto text-[var(--vit-muted-2)] mb-2" size={24} />
          <p className="text-xs text-[var(--vit-muted)]">No hay ofertas de checkout para este producto.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ofertas.map(of => {
            const normalGuardado = Number(of.precio_normal ?? of.precio) || 0;
            const tienePromo = of.precio_order_bump !== null && of.precio_order_bump !== undefined
              && Number(of.precio_order_bump) !== Number(of.precio_normal);
            // Una oferta sin precio normal no se puede cobrar ni medir. Pasa
            // si la creó un backend anterior a los dos precios: descartaba
            // precio_normal/precio_order_bump del payload y guardaba 0. Se
            // avisa fuerte en vez de mostrar un discreto "—".
            const sinPrecio = normalGuardado <= 0;
            return (
              <div key={of.id} className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-lg p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--vit-text)]">{of.nombre}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--vit-accent)]/10 text-[var(--vit-accent)] uppercase tracking-wider">
                        {of.estrategia === 'combo' ? 'Combo' : 'Order Bump'}
                      </span>
                    </div>
                    {/* Los dos precios, siempre visibles: es la única forma de
                        ver de un vistazo que el promocional no pisó al normal. */}
                    <div className="text-xs mt-1 flex items-baseline gap-2 flex-wrap">
                      <span className="text-[var(--vit-text)] font-semibold">
                        {formatPrecio(tienePromo ? of.precio_order_bump : of.precio_normal)}
                      </span>
                      {tienePromo && (
                        <span className="text-[var(--vit-muted-2)] line-through">{formatPrecio(of.precio_normal)}</span>
                      )}
                      <span className="text-[10px] text-[var(--vit-muted-2)]">
                        {tienePromo ? 'promo en checkout / normal' : 'precio normal'}
                      </span>
                    </div>
                    {sinPrecio ? (
                      <div className="text-[10px] text-amber-400 mt-1 leading-snug">
                        Esta oferta quedó guardada sin precio. Borrala y volvé a crearla.
                      </div>
                    ) : of.margen_pct !== undefined && (
                      <div className="text-[10px] text-[var(--vit-muted-2)] mt-0.5">
                        Margen normal {of.margen_pct}%
                        {of.margen_order_bump_pct !== null && of.margen_order_bump_pct !== undefined
                          && ` · en checkout ${of.margen_order_bump_pct}%`}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => eliminarOferta(of.id)} className="shrink-0 text-[var(--vit-muted-2)] hover:text-red-400 p-1 rounded-md transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 border-t border-[var(--vit-border)] pt-2 mt-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-[var(--vit-text)] flex items-center gap-1.5"><Check size={14} className="text-[var(--vit-accent)]" /> Checkout "Comprar Ya"</span>
                    <input type="checkbox" className="accent-[var(--vit-accent)]" checked={ofertasProductoVista.some(id => Number(id) === Number(of.id))} onChange={e => handleCheck(of.id, 'ofertas_producto_vista', e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-[var(--vit-text)] flex items-center gap-1.5"><ShoppingCart size={14} className="text-[var(--vit-accent)]" /> Carrito Global</span>
                    <input type="checkbox" className="accent-[var(--vit-accent)]" checked={ofertasCarrito.some(id => Number(id) === Number(of.id))} onChange={e => handleCheck(of.id, 'ofertas_carrito', e.target.checked)} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
