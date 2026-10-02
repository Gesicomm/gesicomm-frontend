import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ShoppingCart, Tag, X, Loader, Trash2, Minus, Package, Check, Edit, Sparkles, ArrowLeft, ChevronDown } from 'lucide-react';
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
const BADGE_OFERTA = {
  normal: 'border border-sky-300 bg-sky-100 text-sky-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]',
  order_bump: 'border border-amber-300 bg-amber-100 text-amber-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]',
  upsell: 'border border-violet-300 bg-violet-100 text-violet-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]',
};
function normalizarBeneficiosOferta(beneficios) {
  if (!Array.isArray(beneficios)) return [];
  return beneficios.map(b => String(b || '').trim()).filter(Boolean).slice(0, 6);
}

function beneficiosParaForm(oferta) {
  if (!oferta) return [];
  return Array.isArray(oferta.beneficios) ? oferta.beneficios.map(b => String(b || '')) : [];
}

function formVacio() {
  return {
    estrategia: 'normal',
    nombre: '',
    unidades: 2,          // solo paquete
    precio: '',           // precio del paquete, a mano
    bumpProductoId: null, // solo order bump
    bumpProductoSnapshot: null,
    precio_order_bump: '',
    descripcion: '',
    beneficios: [],
    // Archivo elegido antes de que la oferta exista: todavía no hay id al
    // que subirlo, así que se guarda acá y se sube recién después de crear
    // (ver crearOferta), igual que en OfertasProductoTab.
    imagen_archivo: null,
  };
}

function imagenProducto(producto) {
  if (!producto) return null;
  if (producto.imagen) return producto.imagen;
  const imagenes = producto.imagenes || [];
  const principal = imagenes.find(img => img.es_principal) || imagenes[0];
  return principal?.url || principal || null;
}

function componenteExtraOferta(oferta, productoAnclaId) {
  return (oferta.componentes || []).find(c => Number(c.producto_id) !== Number(productoAnclaId)) || null;
}

function productoDeComponente(componente, fallback = null) {
  if (!componente) return fallback;
  const producto = componente.producto || componente.Producto || fallback;
  if (!producto) return null;
  return {
    ...producto,
    id: producto.id ?? componente.producto_id,
    imagen: producto.imagen || imagenProducto(producto) || null,
  };
}

export default function ProductCheckoutOfertas({ producto, config, onChange, catalogo, onOfertasChange, onPreviewOferta }) {
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  // Qué oferta está expandida mostrando imagen + toggles de checkout/carrito.
  // Colapsada por defecto: con 3+ ofertas, todo abierto a la vez era la
  // card más densa del sidebar (nombre, precio, editar/eliminar, imagen,
  // dos toggles, todo visible siempre para cada una).
  const [expandidaId, setExpandidaId] = useState(null);

  function openEditar(oferta) {
    setCreando(false);
    setEditandoId(oferta.id);
    const esPaq = oferta.estrategia === 'normal';
    const c = esPaq ? oferta.componentes?.[0] : componenteExtraOferta(oferta, producto?.id);
    const productoExtra = productoDeComponente(c, oferta.producto_complementario || oferta.productos_incluidos?.[0] || null);
    setForm({
      estrategia: oferta.estrategia || 'normal',
      nombre: oferta.nombre || '',
      unidades: esPaq && c ? c.cantidad : 2,
      precio: esPaq ? oferta.precio_normal || oferta.precio || '' : '',
      bumpProductoId: !esPaq && c ? c.producto_id : null,
      bumpProductoSnapshot: !esPaq ? productoExtra : null,
      precio_order_bump: !esPaq ? oferta.precio_order_bump || '' : '',
      descripcion: oferta.descripcion || '',
      beneficios: beneficiosParaForm(oferta),
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

  const ofertaActual = editandoId ? ofertas.find(o => Number(o.id) === Number(editandoId)) : null;
  const bumpElegido = form.bumpProductoId ? (porId.get(Number(form.bumpProductoId)) || form.bumpProductoSnapshot || null) : null;
  const precioBumpNormal = Number(
    bumpElegido?.precio_efectivo
    ?? bumpElegido?.precio_base
    ?? bumpElegido?.precio
    ?? ofertaActual?.precio_normal
    ?? ofertaActual?.precio
    ?? 0
  );

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

  // Precio + imagen tal como los va a ver el cliente en el checkout: mismo
  // fallback que usa CartDrawer (promocional si hay, si no el normal del
  // producto elegido), y el archivo recién elegido si todavía no se subió.
  const precioPreview = Number(form.precio_order_bump) > 0 ? Number(form.precio_order_bump) : precioBumpNormal;
  const [previewImagenUrl, setPreviewImagenUrl] = useState(null);
  useEffect(() => {
    if (form.imagen_archivo) {
      const url = URL.createObjectURL(form.imagen_archivo);
      setPreviewImagenUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    const actual = editandoId ? ofertas.find(o => o.id === editandoId) : null;
    setPreviewImagenUrl(actual?.imagen_url || bumpElegido?.imagen || null);
  }, [form.imagen_archivo, editandoId, ofertas, bumpElegido]);

  // Reporta la oferta en edición al editor de la landing para que el canvas
  // (el mismo FunnelCheckout que ve el cliente) la muestre en vivo — así se
  // deja de necesitar un mock aparte en el sidebar, que podía divergir del
  // checkout real. Un paquete no pasa por acá: se ve en la ficha del
  // producto, no en el checkout. Misma forma que `ofertaAFormaPublica`
  // (ver LandingSimpleEditor.jsx) para que sea intercambiable con una oferta
  // real ya guardada.
  useEffect(() => {
    if (!onPreviewOferta) return;
    if (!(creando || editandoId) || esPaquete) {
      onPreviewOferta(null);
      return;
    }
    onPreviewOferta({
      id: editandoId ?? -1,
      __previewBorrador: true,
      nombre: form.nombre || (form.estrategia === 'upsell' ? 'Upsell' : 'Order bump'),
      estrategia: form.estrategia,
      tipo_contenido: 'combo',
      descripcion: form.descripcion || null,
      imagen: previewImagenUrl || null,
      precio: precioBumpNormal,
      precio_normal: precioBumpNormal,
      precio_order_bump: form.precio_order_bump === '' ? null : Number(form.precio_order_bump),
      precio_efectivo: precioPreview,
      beneficios: normalizarBeneficiosOferta(form.beneficios),
      unidades: null,
      producto_complementario: bumpElegido ? { nombre: bumpElegido.nombre, imagen: bumpElegido.imagen || null } : null,
      productos_incluidos: bumpElegido ? [{ nombre: bumpElegido.nombre, imagen: bumpElegido.imagen || null }] : [],
    });
  }, [onPreviewOferta, creando, editandoId, esPaquete, form.nombre, form.estrategia, form.descripcion, form.precio_order_bump, form.beneficios, previewImagenUrl, precioBumpNormal, precioPreview, bumpElegido]);

  // Al desmontar (se cambia de tab o de producto) hay que avisar que ya no
  // hay nada en edición, si no el canvas se queda mostrando un borrador
  // fantasma de una sesión de edición que ya terminó.
  useEffect(() => () => onPreviewOferta?.(null), [onPreviewOferta]);

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
    setForm(prev => ({
      ...formVacio(),
      estrategia: valor,
      nombre: prev.nombre,
      descripcion: prev.descripcion,
      beneficios: Array.isArray(prev.beneficios) ? prev.beneficios : [],
      imagen_archivo: prev.imagen_archivo,
      bumpProductoId: prev.bumpProductoId,
      bumpProductoSnapshot: prev.bumpProductoSnapshot,
    }));
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
      const actual = editandoId ? ofertas.find(o => o.id === editandoId) : null;
      const imagenLista = form.imagen_archivo || actual?.imagen_url || imagenProducto(bumpElegido);
      const tienePrecioPromocional = form.precio_order_bump !== '' && form.precio_order_bump !== null && form.precio_order_bump !== undefined;
      const precioFinal = tienePrecioPromocional ? Number(form.precio_order_bump) : precioBumpNormal;
      if (!(precioFinal > 0)) return setErrorOferta('La oferta necesita un precio mayor a 0 antes de publicarse.');
      if (tienePrecioPromocional && precioFinal >= precioBumpNormal) return setErrorOferta('El precio promocional tiene que ser menor al precio normal para mostrar Antes / Hoy / Ahorrás.');
      if (!imagenLista) return setErrorOferta('La oferta necesita una imagen del producto antes de mostrarse al comprador.');
    }

    setGuardandoOferta(true);
    try {
      const comun = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || '',
        beneficios: normalizarBeneficiosOferta(form.beneficios),
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
      const ofertaCheckoutId = Number(guardada?.id || editandoId);
      if (!esPaquete && ofertaCheckoutId) {
        const agregarId = lista => {
          const actual = Array.isArray(config?.[lista]) ? config[lista] : [];
          return actual.some(id => Number(id) === ofertaCheckoutId) ? actual : [...actual, ofertaCheckoutId];
        };
        onChange('content', {
          ...config,
          ofertas_carrito: agregarId('ofertas_carrito'),
          ofertas_producto_vista: agregarId('ofertas_producto_vista'),
        });
      }

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

  // Devuelve true solo si de verdad se borró (no si el usuario canceló el
  // confirm ni si el backend falló) — el botón "Eliminar oferta" de DENTRO
  // del formulario de edición lo usa para cerrar el inspector después.
  // Sin esto, borrar la oferta que se está editando dejaba el formulario
  // abierto apuntando a un id que ya no existe: al tocar "Guardar" después,
  // `ofertaService.actualizar(editandoId, ...)` fallaba contra un id borrado.
  async function eliminarOferta(id) {
    if (!window.confirm('¿Dar de baja esta oferta? Deja de mostrarse, pero los pedidos que la usaron la siguen referenciando.')) return false;
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
      return true;
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar la oferta.');
      return false;
    }
  }

  if (cargando) {
    return <div className="flex justify-center py-4"><Loader className="animate-spin text-[var(--vit-muted)]" /></div>;
  }

  const seleccionPicker = new Map(
    form.bumpProductoId ? [[`producto:${form.bumpProductoId}`, { id: Number(form.bumpProductoId), tipo: 'producto' }]] : []
  );

  function cerrarFormulario() {
    setCreando(false);
    setEditandoId(null);
    setForm(formVacio());
    setErrorOferta('');
  }

  function iniciarCrearOferta(estrategia = 'normal') {
    setEditandoId(null);
    setCreando(true);
    setExpandidaId(null);
    setForm({ ...formVacio(), estrategia });
    setErrorOferta('');
  }

  function actualizarBeneficio(indice, valor) {
    setForm(prev => ({
      ...prev,
      beneficios: (Array.isArray(prev.beneficios) ? prev.beneficios : []).map((beneficio, i) => i === indice ? valor : beneficio),
    }));
  }

  function agregarBeneficio() {
    setForm(prev => ({
      ...prev,
      beneficios: [...(Array.isArray(prev.beneficios) ? prev.beneficios : []), ''].slice(0, 6),
    }));
  }

  function quitarBeneficio(indice) {
    setForm(prev => ({
      ...prev,
      beneficios: (Array.isArray(prev.beneficios) ? prev.beneficios : []).filter((_, i) => i !== indice),
    }));
  }

  // Función (no componente) a propósito: si fuera un componente definido
  // adentro, React le vería una identidad nueva en cada render y remontaría
  // el <form> en cada tecla — perdés el foco del input mientras escribís.
  // Tanto "Nueva" como "Editar" reemplazan TODA la sección de Ofertas (lista
  // + header) por este inspector — no conviven — así el usuario siempre ve
  // "Ofertas" o "una oferta", nunca las dos cosas superpuestas.
  function renderFormulario(titulo) {
    return (
      <form onSubmit={guardarOferta} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={cerrarFormulario} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--vit-muted)] hover:text-[var(--vit-text)] -ml-1 px-1 py-1">
              <ArrowLeft size={14} /> Ofertas
            </button>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--vit-text)]">{titulo}</h3>
            <p className="text-xs text-[var(--vit-muted-2)]">{estrategiaActual.label.split(' — ')[0]}</p>
          </div>

          {errorOferta && <div className="text-xs text-red-500">{errorOferta}</div>}

          <div>
            <label className={ETIQUETA}>Tipo de oferta</label>
            <select value={form.estrategia} onChange={e => cambiarEstrategia(e.target.value)} className={CAMPO}>
              {ESTRATEGIAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">{estrategiaActual.ayuda}</p>
          </div>

          {/* La preview en vivo del popup real vive en el canvas central del
              editor (ver LandingSimpleEditor.jsx: `onPreviewOferta` +
              `ofertaAFormaPublica`) — es el MISMO FunnelCheckout que usa el
              cliente, así que no puede divergir como podía pasar con un mock
              acá. El sidebar edita, el canvas representa. */}
          {!esPaquete && onPreviewOferta && (
            <p className="text-[11px] text-[var(--vit-muted-2)] leading-snug -mt-1">
              Mirá el resultado en la vista previa central — se actualiza mientras escribís.
            </p>
          )}

          <div className="flex flex-col gap-3 pt-1 border-t border-[var(--vit-border)]">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--vit-muted)] -mb-1">Contenido</h4>

            <div>
              <label className={ETIQUETA}>Título</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder={esPaquete ? 'Ej: Llevá 2' : 'Ej: Sí, quiero sumar mi cargador con 20% OFF'}
                className={CAMPO}
              />
              {form.estrategia === 'upsell' && (
                <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">
                  Es el título grande del popup de mejora. Escribilo como un llamado a la acción, en primera persona y con el beneficio incluido.
                </p>
              )}
              {form.estrategia === 'order_bump' && (
                <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">
                  En el checkout se usa la Descripción de abajo como título grande. Este campo solo se muestra si dejás la Descripción vacía.
                </p>
              )}
            </div>

            {!esPaquete && (
              <div>
                <label className={ETIQUETA}>
                  Descripción {form.estrategia === 'order_bump' ? '' : <span className="text-[var(--vit-muted-2)]">(opcional)</span>}
                </label>
                <textarea
                  rows={2}
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder={form.estrategia === 'order_bump' ? 'Ej: Sí, quiero sumar mi cargador con 20% OFF' : 'Ej: Mejora tu pedido con precio especial'}
                  className={`${CAMPO} min-h-[72px] resize-y`}
                />
                <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">
                  {form.estrategia === 'order_bump'
                    ? 'Es el título grande de la casilla en el checkout — escribilo como llamado a la acción. Si la dejás vacía, se usa el Título de arriba.'
                    : 'Va debajo del título, en letra más chica. Una línea corta de beneficio o urgencia (envío gratis, stock limitado, garantía).'}
                </p>
              </div>
            )}

            {!esPaquete && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className={`${ETIQUETA} mb-0`}>
                    {form.estrategia === 'order_bump' ? 'Beneficios del complemento' : 'Beneficios del upsell'}
                  </label>
                  <button
                    type="button"
                    onClick={agregarBeneficio}
                    disabled={(form.beneficios || []).length >= 6}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--vit-border)] px-2 py-1 text-[10px] font-semibold text-[var(--vit-text)] hover:bg-[var(--vit-surface)] disabled:opacity-40"
                  >
                    <Plus size={11} /> Agregar
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(form.beneficios || []).map((beneficio, indice) => (
                    <div key={indice} className="flex items-center gap-1.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <Check size={12} />
                      </span>
                      <input
                        type="text"
                        value={beneficio}
                        onChange={e => actualizarBeneficio(indice, e.target.value)}
                        placeholder="Ej: Carga rápida de 20W"
                        className={CAMPO}
                      />
                      <button
                        type="button"
                        title="Quitar check"
                        onClick={() => quitarBeneficio(indice)}
                        className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md border border-[var(--vit-border)] text-[var(--vit-muted)] hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--vit-muted-2)] mt-1 leading-snug">
                  {form.estrategia === 'order_bump'
                    ? 'Se muestran como puntos breves dentro del order bump del checkout. Podés dejarlos vacíos y no se publican.'
                    : 'Se muestran como checks en el popup de upsell. Podés dejarlos vacíos y no se publican.'}
                </p>
              </div>
            )}

            <div>
              <label className={ETIQUETA}>Imagen de la oferta</label>
              <OfertaImagenPicker
                compacto
                ofertaId={null}
                imagenUrl={null}
                archivo={form.imagen_archivo}
                respaldoUrl={bumpElegido?.imagen || porId.get(Number(producto?.id))?.imagen || null}
                onChange={({ archivo }) => setForm(f => ({ ...f, imagen_archivo: archivo }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1 border-t border-[var(--vit-border)]">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--vit-muted)] -mb-1">
              {esPaquete ? 'Producto' : 'Producto y precio'}
            </h4>

          {esPaquete ? (
            <>
              {/* Un paquete es este mismo producto en más cantidad: no hay
                  productos que elegir, solo cuántas unidades entran. */}
              <div className="rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-2">
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
                  onToggle={item => setForm(f => {
                    const mismo = Number(f.bumpProductoId) === Number(item.id);
                    return {
                      ...f,
                      bumpProductoId: mismo ? null : item.id,
                      bumpProductoSnapshot: mismo ? null : item,
                    };
                  })}
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
                    <button type="button" title="Quitar" onClick={() => setForm(f => ({ ...f, bumpProductoId: null, bumpProductoSnapshot: null }))} className="shrink-0 p-1 rounded text-[var(--vit-muted-2)] hover:text-red-400"><X size={13} /></button>
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
          </div>

          {editandoId && (
            <button
              type="button"
              onClick={async () => { if (await eliminarOferta(editandoId)) cerrarFormulario(); }}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-red-400/80 hover:text-red-400 py-1.5"
            >
              <Trash2 size={13} /> Eliminar oferta
            </button>
          )}

          {/* Sticky dentro del scroll del tab Venta (no un contenedor propio):
              se pega al fondo del viewport visible mientras se scrollea el
              formulario, sin importar cuán largo sea. */}
          <div className="sticky bottom-0 py-3 bg-[var(--vit-surface)] border-t border-[var(--vit-border)]">
            <button type="submit" disabled={guardandoOferta} className="w-full h-9 rounded-md bg-[var(--vit-accent)] text-fg text-xs font-semibold hover:bg-[var(--vit-accent-hover)] disabled:opacity-50 transition-colors flex items-center justify-center">
              {guardandoOferta ? <Loader className="animate-spin" size={14} /> : 'Guardar'}
            </button>
          </div>
        </form>
    );
  }

  // Nueva/Editar reemplazan TODA esta sección (header + lista) por el
  // inspector — nunca conviven. Antes "Editar" dejaba la tarjeta de arriba
  // parcialmente visible encima del formulario.
  if (creando || editandoId) {
    return (
      <div className="mt-6 border-t border-[var(--vit-border)] pt-4">
        {renderFormulario(creando ? 'Nueva Oferta' : 'Editar Oferta')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-6 border-t border-[var(--vit-border)] pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--vit-text)]">Ofertas</h3>
          <p className="text-xs text-[var(--vit-muted-2)]">Paquetes en la ficha, order bumps en checkout y upsells antes de confirmar.</p>
        </div>
        <button type="button" onClick={() => iniciarCrearOferta('normal')} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--vit-text)] bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-md hover:border-[var(--vit-accent)] transition-colors">
          <Plus size={14} /> Nueva
        </button>
      </div>

      <div className="grid gap-2">
        {ESTRATEGIAS.map(estrategia => {
          const Icono = estrategia.value === 'normal' ? Package : estrategia.value === 'upsell' ? Sparkles : ShoppingCart;
          const titulo = estrategia.value === 'normal'
            ? 'Crear paquete'
            : estrategia.value === 'upsell'
              ? 'Crear upsell'
              : 'Agregar order bump';
          const texto = estrategia.value === 'normal'
            ? 'Mismo producto, más unidades y precio especial.'
            : estrategia.value === 'upsell'
              ? 'Mejora visible antes de confirmar el pedido.'
              : 'Complemento pequeño dentro del checkout.';
          return (
            <button
              type="button"
              key={estrategia.value}
              onClick={() => iniciarCrearOferta(estrategia.value)}
              className="flex items-center gap-3 rounded-lg border border-[var(--vit-border)] bg-[var(--vit-bg)] px-3 py-2 text-left hover:border-[var(--vit-accent)] hover:bg-[var(--vit-surface)] transition-colors"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--vit-border)] text-[var(--vit-accent)]">
                <Icono size={15} />
              </span>
              <span className="min-w-0">
                <strong className="block text-xs text-[var(--vit-text)]">{titulo}</strong>
                <small className="block text-[10px] leading-snug text-[var(--vit-muted-2)]">{texto}</small>
              </span>
            </button>
          );
        })}
      </div>

      {ofertas.length === 0 ? (
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
            const expandida = expandidaId === of.id;
            const extra = componenteExtraOferta(of, producto?.id);
            const productoExtra = extra ? (porId.get(Number(extra.producto_id)) || extra.producto || extra.Producto || null) : null;
            const imagenPublicable = of.imagen_url || imagenProducto(productoExtra);
            const precioNormalPublicable = Number(of.precio_normal ?? of.precio) || 0;
            const tienePromoPublicable = of.precio_order_bump !== null && of.precio_order_bump !== undefined && Number(of.precio_order_bump) > 0;
            const precioPromoPublicable = tienePromoPublicable ? Number(of.precio_order_bump) : precioNormalPublicable;
            const puedePublicarse = esPack || (
              Boolean(extra)
              && precioPromoPublicable > 0
              && (!tienePromoPublicable || precioNormalPublicable > precioPromoPublicable)
              && Boolean(imagenPublicable)
            );
            const bloqueoPublicacion = !puedePublicarse
              ? 'Para activar esta oferta, agregá producto, imagen y un precio válido. Si usás precio promocional, debe ser menor al normal.'
              : '';

            return (
              <div key={of.id} className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-lg overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandidaId(expandida ? null : of.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandidaId(expandida ? null : of.id); } }}
                  className="w-full flex justify-between items-start gap-2 p-3 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--vit-text)]">{of.nombre}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wide whitespace-nowrap ${BADGE_OFERTA[of.estrategia] || BADGE_OFERTA.order_bump}`}>
                        {esPack ? `Paquete × ${unidades}` : (of.estrategia === 'upsell' ? 'Upsell' : 'Order Bump')}
                      </span>
                    </div>
                    {of.descripcion && (
                      <div className="text-[11px] text-[var(--vit-muted-2)] mt-0.5">{of.descripcion}</div>
                    )}
                    <div className="text-xs mt-1 flex items-baseline gap-2 flex-wrap">
                      <span className="text-[var(--vit-text)] font-semibold">{formatPrecio(promo ?? normal)}</span>
                      {promo !== null && <span className="text-[var(--vit-muted-2)] line-through">{formatPrecio(normal)}</span>}
                    </div>
                    {!puedePublicarse && !esPack && (
                      <div className="text-[10px] text-amber-400 mt-1 leading-snug">
                        {bloqueoPublicacion}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); eliminarOferta(of.id); }}
                      className="text-[var(--vit-muted-2)] hover:text-red-400 p-1 rounded-md transition-colors"
                      title="Eliminar oferta"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); openEditar(of); }}
                      className="text-[var(--vit-muted-2)] hover:text-[var(--vit-accent)] p-1 rounded-md transition-colors"
                      title="Editar oferta"
                    >
                      <Edit size={14} />
                    </button>
                    <ChevronDown size={15} className={`text-[var(--vit-muted-2)] transition-transform ${expandida ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {expandida && (
                  <div className="px-3 pb-3">
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
                        respaldoUrl={imagenProducto(productoExtra) || porId.get(Number(producto?.id))?.imagen || null}
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
                        <label className={`flex items-center justify-between ${puedePublicarse ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`} title={bloqueoPublicacion || undefined}>
                          <span className="text-xs text-[var(--vit-text)] flex items-center gap-1.5">
                            {of.estrategia === 'upsell' ? <Sparkles size={14} className="text-[var(--vit-accent)]" /> : <Check size={14} className="text-[var(--vit-accent)]" />}
                            {of.estrategia === 'upsell' ? 'Upsell antes de confirmar' : 'Checkout "Comprar Ya"'}
                          </span>
                          <input type="checkbox" className="accent-[var(--vit-accent)]" disabled={!puedePublicarse} checked={puedePublicarse && ofertasProductoVista.some(id => Number(id) === Number(of.id))} onChange={e => handleCheck(of.id, 'ofertas_producto_vista', e.target.checked)} />
                        </label>
                        <label className={`flex items-center justify-between ${puedePublicarse ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`} title={bloqueoPublicacion || undefined}>
                          <span className="text-xs text-[var(--vit-text)] flex items-center gap-1.5"><ShoppingCart size={14} className="text-[var(--vit-accent)]" /> Carrito global</span>
                          <input type="checkbox" className="accent-[var(--vit-accent)]" disabled={!puedePublicarse} checked={puedePublicarse && ofertasCarrito.some(id => Number(id) === Number(of.id))} onChange={e => handleCheck(of.id, 'ofertas_carrito', e.target.checked)} />
                        </label>
                      </div>
                    )}
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
