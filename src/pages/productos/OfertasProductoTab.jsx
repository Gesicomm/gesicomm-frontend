import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Tag, Layers, AlertTriangle, BarChart2, Activity, X } from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import OfertaImagenPicker, { subirImagenPendiente } from '../../components/OfertaImagenPicker';
import { productService } from '../../services/productService';
import { comboAdminService } from '../../services/comboAdminService';
import ProductPicker from '../landing/ProductPicker';
import '../landing/landing.css';
import { getMediaUrl } from '../../services/api';
import { verificarSesion } from '../../utils/auth';
import { calcular as calcularLocal } from '../../utils/comboPricingLocal';
import { formatPrecio as formatMoney } from '../../lib/mensajeWhatsapp';
import CurrencyInput from '../../components/CurrencyInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../combos/combos.css';

const TIPOS_CONTENIDO = [
  { value: 'pack', label: 'Pack (cantidad del mismo producto)' },
  { value: 'combo', label: 'Combo (productos distintos)' },
];

const ESTRATEGIAS = [
  { value: 'normal', label: 'Normal — selector en la ficha del producto' },
  { value: 'order_bump', label: 'Order bump — un producto extra en el checkout' },
  { value: 'upsell', label: 'Upsell — ofrecida cuando este producto ya está en el carrito' },
];

/**
 * Estrategias que se presentan DENTRO del checkout. Son las únicas que
 * pueden tener un precio promocional propio (ver Oferta.js en el backend):
 * el resto se vende siempre a su precio normal.
 */
// Igual que el backend (oferta.service.js y pricing.service.js): order bump
// y upsell pueden tener precio con descuento. Acá estaba solo order_bump, así
// que a un upsell no había forma de ponerle el precio de oferta.
const ESTRATEGIAS_CHECKOUT = ['order_bump', 'upsell'];

// Tipos visibles para el comercio. Internamente paquete y combo comparten
// estrategia "normal", pero en UX son decisiones distintas.
const OPCIONES_TIPO_OFERTA = [
  { value: 'pack', titulo: 'Oferta por cantidad', texto: 'Varias unidades del mismo producto.' },
  { value: 'combo', titulo: 'Combo', texto: 'Productos diferentes vendidos juntos.' },
  { value: 'order_bump', titulo: 'Order bump', texto: 'Producto complementario antes de terminar la compra.' },
  { value: 'upsell', titulo: 'Upsell', texto: 'Oferta posterior cuando el producto ya está en el carrito.' },
];

/** Código interno cuando no lo cargan: legible y con sufijo para no repetirse. */
function generarCodigoOferta(nombre) {
  const base = String(nombre || 'OFERTA')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 18) || 'OFERTA';
  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

const RESUMEN_OFERTAS = [
  {
    id: 'all',
    titulo: 'Todas',
    descripcion: 'Todas las ofertas configuradas para este producto.',
    icon: Tag,
  },
  {
    id: 'pack',
    titulo: 'Paquetes',
    descripcion: 'El mismo producto en más cantidad a precio especial (ej. 2 x 770.000). Se eligen en su ficha.',
    icon: Layers,
  },
  {
    id: 'combo',
    titulo: 'Combos',
    descripcion: 'Productos diferentes vendidos juntos, con precio propio.',
    icon: Layers,
  },
  {
    id: 'order_bump',
    titulo: 'Order Bumps',
    descripcion: 'Productos adicionales ofrecidos durante el checkout.',
    icon: Tag,
  },
  {
    id: 'upsell',
    titulo: 'Upsells',
    descripcion: 'Ofertas posteriores cuando este producto ya está en el carrito.',
    icon: Activity,
  },
];

function fmtPct(n) { return n !== null && n !== undefined ? (Number(n) * 100).toFixed(2) + '%' : '—'; }

function tipoVisibleOferta(oferta) {
  const estrategia = oferta?.estrategia || 'normal';
  if (estrategia === 'order_bump' || estrategia === 'upsell') return estrategia;
  return oferta?.tipo_contenido === 'combo' ? 'combo' : 'pack';
}

const LABEL_TIPO_VISIBLE = {
  pack: 'Paquete',
  combo: 'Combo',
  order_bump: 'Order bump',
  upsell: 'Upsell',
};

function normalizarTipoCreacion(tipo) {
  if (tipo === 'normal') return 'pack';
  if (tipo === 'all') return 'pack';
  return ['pack', 'combo', 'order_bump', 'upsell'].includes(tipo) ? tipo : 'pack';
}

function emptyForm(productoId) {
  return {
    codigo: '',
    nombre: '',
    tipo_contenido: 'pack',
    estrategia: 'normal',
    // `precio` es el precio NORMAL de la oferta: es lo que consumen el
    // simulador de descuentos y las recomendaciones de margen de abajo. Se
    // manda al backend como precio_normal.
    precio: 0,
    // Promocional, solo para estrategias de checkout. Vacío = se cobra el normal.
    precio_order_bump: '',
    imagen_url: '',
    // Archivo elegido antes de que la oferta exista: se sube recién después
    // de crearla, cuando ya hay un id al que colgársela.
    imagen_archivo: null,
    fecha_inicio: '',
    fecha_fin: '',
    descripcion: '',
    activo: true,
    componentes: [{ producto_id: productoId, cantidad: 2, descuento_porcentaje: 0, variante_id: null, permite_elegir_variante: false }],
  };
}

function MetricCard({ label, value, valueClass = '' }) {
  return (
    <div className="combo-metric-card">
      <span className="combo-metric-label">{label}</span>
      <span className={`combo-metric-value ${valueClass}`}>{value}</span>
    </div>
  );
}

function BadgeOferta({ status }) {
  if (!status) return null;
  const map = { EXCELENTE: 'excelente', BUENA: 'buena', REVISAR: 'revisar' };
  const labels = { EXCELENTE: '★ Excelente oferta', BUENA: '✓ Buena oferta', REVISAR: '⚠ Revisar' };
  return <span className={`combo-badge ${map[status]}`}>{labels[status]}</span>;
}

function BadgeRentabilidad({ status }) {
  if (!status) return null;
  const map = { SALUDABLE: 'saludable', MARGEN_BAJO: 'margen-bajo', NO_RENTABLE: 'no-rentable' };
  const labels = { SALUDABLE: '✓ Saludable', MARGEN_BAJO: '⚠ Margen bajo', NO_RENTABLE: '✗ No rentable' };
  return <span className={`combo-badge ${map[status]}`}>{labels[status]}</span>;
}

export default function OfertasProductoTab({
  productoId, productoNombre, productoAnclaPrecioBase = 0, productoAnclaPrecioCosto = 0,
  // Si llega un tipo contextual, abre directo el formulario correspondiente
  // sin volver a pedirle al usuario la misma decisión.
  crearAlAbrir = null,
  onCrearCombo = null,
  borradores = null, onBorradoresChange,
}) {
  const modoBorrador = Array.isArray(borradores);
  const [ofertasGuardadas, setOfertas] = useState([]);
  const ofertas = modoBorrador ? borradores : ofertasGuardadas;
  const siguienteIdBorrador = useRef(-2);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [comboConfig, setComboConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [editando, setEditando] = useState(null);
  const [descuentoSimulado, setDescuentoSimulado] = useState(0);
  const [mostrarDetalleEscenarios, setMostrarDetalleEscenarios] = useState(false);
  const [estrategiaVista, setEstrategiaVista] = useState('all');
  const [form, setForm] = useState(() => emptyForm(productoId));
  const [guardando, setGuardando] = useState(false);
  // true cuando el precio lo escribió la persona: desde ahí el precio
  // calculado de los productos elegidos ya no lo pisa.
  const precioManualRef = useRef(false);
  const [ofertaABorrar, setOfertaABorrar] = useState(null);
  // Variantes reales de cada producto elegido como componente — se traen on
  // demand (no de una vez para todo el catálogo) y se cachean por
  // producto_id, porque acá NUNCA se crean/editan variantes: solo se
  // muestran para elegir "fija" o habilitar que el cliente elija.
  const [variantesPorProducto, setVariantesPorProducto] = useState({});

  useEffect(() => {
    cargar();
    // `sin_limite` no es opcional acá: sin él, ProductoService.buscar aplica
    // su paginación por defecto (limit 10) y el selector de productos del
    // combo mostraba solo los 10 primeros del catálogo, como si fueran los
    // únicos que existen.
    productService.buscar({ sin_limite: true }).then(res => {
      const prods = Array.isArray(res) ? res : (res.productos || res.rows || []);
      setProductosDisponibles(prods.filter(p => p.activo !== false));
    }).catch(() => {});
    // Misma configuración económica (CPA%, envío, confirmación, empaque,
    // márgenes objetivo) que usa el motor de Combos — el análisis de
    // sensibilidad de una oferta "combo" reutiliza esos números en vez de
    // duplicar una config aparte, según lo pedido: unificar todo en un
    // mismo lugar.
    comboAdminService.obtenerConfiguracion().then(setComboConfig).catch(() => {});
    verificarSesion().then(u => setUsuarioActual(u));
  }, [productoId]);

  useEffect(() => {
    const ids = [...new Set(form.componentes.map(c => Number(c.producto_id)).filter(id => id > 0))];
    ids.forEach(id => {
      if (variantesPorProducto[id] !== undefined) return;
      // Marca "ya pedido" de entrada (lista vacía) para no disparar el mismo
      // fetch en cada render mientras la respuesta todavía no llegó.
      setVariantesPorProducto(prev => (prev[id] !== undefined ? prev : { ...prev, [id]: [] }));
      productService.variantes(id).then(vs => {
        setVariantesPorProducto(prev => ({ ...prev, [id]: Array.isArray(vs) ? vs.filter(v => v.activo !== false) : [] }));
      }).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.componentes]);

  async function cargar() {
    if (modoBorrador) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await ofertaService.listarPorProducto(productoId);
      setOfertas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al cargar las ofertas.');
    } finally {
      setLoading(false);
    }
  }

  function formPorTipo(tipoOriginal) {
    const tipo = normalizarTipoCreacion(tipoOriginal);
    const base = emptyForm(productoId);
    // Un order bump/upsell se vende como línea APARTE de la del producto
    // ancla (ver CartDrawer/FunnelCheckout) — el ancla nunca va en su
    // receta de componentes, así que ni siquiera se precarga acá (el
    // backend además la saca sola si de algún modo llegara a mandarse).
    if (tipo === 'order_bump' || tipo === 'upsell') {
      return { ...base, estrategia: tipo, tipo_contenido: 'combo', componentes: [] };
    }
    if (tipo === 'combo') {
      return { ...base, estrategia: 'normal', tipo_contenido: 'combo', componentes: [{ producto_id: productoId, cantidad: 1, descuento_porcentaje: 0, variante_id: null, permite_elegir_variante: false }] };
    }
    return { ...base, estrategia: 'normal', tipo_contenido: 'pack' };
  }

  const creadoAlAbrir = useRef(false);
  useEffect(() => {
    if (loading || !crearAlAbrir || creadoAlAbrir.current) return;
    creadoAlAbrir.current = true;
    const tipo = normalizarTipoCreacion(crearAlAbrir);
    setEstrategiaVista(tipo);
    openCrear(tipo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, crearAlAbrir]);

  function openCrear(tipo = estrategiaVista) {
    const tipoNormalizado = normalizarTipoCreacion(tipo);
    if (tipoNormalizado === 'combo' && onCrearCombo) {
      setOpen(false);
      onCrearCombo();
      return;
    }
    precioManualRef.current = false;
    setEditando(null);
    setForm(formPorTipo(tipoNormalizado));
    setError(null);
    setOpen(true);
  }

  function openEditar(oferta) {
    // Una oferta existente ya tiene su precio: no se recalcula solo.
    precioManualRef.current = true;
    setEditando(oferta);
    setForm({
      codigo: oferta.codigo,
      nombre: oferta.nombre,
      tipo_contenido: oferta.tipo_contenido,
      estrategia: oferta.estrategia,
      precio: oferta.precio_normal ?? oferta.precio,
      precio_order_bump: oferta.precio_order_bump ?? '',
      imagen_url: oferta.imagen_url || '',
      imagen_archivo: oferta.imagen_archivo || null,
      fecha_inicio: oferta.fecha_inicio ? String(oferta.fecha_inicio).slice(0, 10) : '',
      fecha_fin: oferta.fecha_fin ? String(oferta.fecha_fin).slice(0, 10) : '',
      descripcion: oferta.descripcion || '',
      activo: oferta.activo,
      componentes: (oferta.componentes || []).map(c => ({
        producto_id: c.producto_id,
        cantidad: c.cantidad,
        descuento_porcentaje: Number(c.descuento_porcentaje) || 0,
        variante_id: c.variante_id || null,
        permite_elegir_variante: !!c.permite_elegir_variante,
      })),
    });
    setError(null);
    setOpen(true);
  }

  function componentesCombo(f, estrategiaObjetivo = f.estrategia) {
    // Un order bump/upsell nunca lleva al ancla en su receta (se vende
    // como línea aparte — ver excluirAnclaDeBumpOUpsell en el backend):
    // al pasar a "combo" arranca vacío, para que el admin elija el
    // producto que realmente se agrega, en vez de precargar una fila que
    // el backend va a descartar igual.
    if (estrategiaObjetivo === 'order_bump' || estrategiaObjetivo === 'upsell') {
      return f.componentes.filter(c => Number(c.producto_id) !== Number(productoId));
    }
    const nuevos = [...f.componentes];
    const idx = nuevos.findIndex(c => Number(c.producto_id) === Number(productoId));
    if (idx >= 0) nuevos[idx] = { ...nuevos[idx], cantidad: 1 };
    else nuevos.unshift({ producto_id: productoId, cantidad: 1, descuento_porcentaje: 0, variante_id: null, permite_elegir_variante: false });
    return nuevos;
  }

  // "Pack" es una presentación alternativa del propio producto ancla (ej.
  // "Earplugs x3"), nunca un bundle con otros productos — eso es lo que
  // distingue un pack de un combo. Al cambiar a "pack" se colapsa la
  // receta a una sola fila fija sobre el producto ancla (marcada en 2); al volver a
  // "combo" se pone la cantidad en 1.
  function handleTipoContenidoChange(nuevoTipo) {
    setForm(f => {
      if (nuevoTipo === 'pack') {
        return { ...f, tipo_contenido: nuevoTipo, componentes: [{ producto_id: productoId, cantidad: 2, descuento_porcentaje: 0, variante_id: null, permite_elegir_variante: false }] };
      }
      if (nuevoTipo === 'combo') {
        return { ...f, tipo_contenido: nuevoTipo, componentes: componentesCombo(f) };
      }
      return { ...f, tipo_contenido: nuevoTipo };
    });
  }

  // La estrategia y el tipo de contenido tienen un valor por defecto
  // acoplado en los dos sentidos — no es una restricción dura (el admin
  // puede volver a tocar "Tipo de contenido" después), es solo el default
  // más común en cada caso: order_bump/upsell casi siempre combinan
  // productos ("Agregá el Antifaz"), normal casi siempre es la
  // presentación simple del propio producto.
  //   - normal → no-normal: si estaba en "pack", pasa a "combo" y cantidad a 1.
  //   - no-normal → normal: si estaba en "combo", vuelve a "pack" y cantidad a 2.
  function handleTipoOfertaChange(tipo) {
    if (!editando && tipo === 'combo' && onCrearCombo) {
      setOpen(false);
      onCrearCombo();
      return;
    }
    precioManualRef.current = false;
    setForm(formPorTipo(tipo));
  }

  function updateComponente(idx, campo, valor) {
    setForm(f => {
      const nuevos = [...f.componentes];
      nuevos[idx] = { ...nuevos[idx], [campo]: valor };
      return { ...f, componentes: nuevos };
    });
  }
  function removeComponente(idx) {
    setForm(f => ({ ...f, componentes: f.componentes.filter((_, i) => i !== idx) }));
  }

  async function submit(e) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setGuardando(true);
    try {
      const payload = {
        codigo: form.codigo.trim() || generarCodigoOferta(form.nombre),
        nombre: form.nombre.trim(),
        tipo_contenido: form.tipo_contenido,
        estrategia: form.estrategia,
        precio_normal: Number(form.precio) || 0,
        // Vacío = sin promo; se cobra el normal. No se manda 0, que sería
        // regalar la oferta por un campo que quedó sin completar.
        precio_order_bump: ESTRATEGIAS_CHECKOUT.includes(form.estrategia) && form.precio_order_bump !== '' && form.precio_order_bump !== null
          ? Number(form.precio_order_bump) : null,
        precio_minimo: form.precio_minimo ? Number(form.precio_minimo) : null,
        imagen_url: form.imagen_url || null,
        // Vacío = sin límite por ese lado (ver PricingService.ofertaVigente).
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        descripcion: form.descripcion.trim() || null,
        activo: form.activo,
        componentes: form.componentes
          .filter(c => c.producto_id)
          .map(c => ({
            producto_id: Number(c.producto_id),
            cantidad: Number(c.cantidad) || 1,
            descuento_porcentaje: Number(c.descuento_porcentaje) || 0,
            variante_id: c.variante_id ? Number(c.variante_id) : null,
            permite_elegir_variante: !!c.permite_elegir_variante,
          })),
      };
      if (!payload.nombre) throw new Error('El nombre de la oferta es obligatorio.');
      if (!(payload.precio_normal > 0)) throw new Error('El precio de la oferta tiene que ser mayor a 0.');
      if (payload.precio_order_bump !== null && (!(payload.precio_order_bump > 0) || payload.precio_order_bump >= payload.precio_normal)) {
        throw new Error('El precio promocional debe ser mayor a 0 y menor al precio normal.');
      }
      if (!payload.componentes.length) throw new Error('Elegí al menos un producto para la oferta.');
      if (form.componentes.some(c => c.producto_id && !(Number(c.cantidad) >= 1))) throw new Error('La cantidad debe ser al menos 1.');
      if (payload.fecha_inicio && payload.fecha_fin && payload.fecha_fin < payload.fecha_inicio) throw new Error('La fecha de fin no puede ser anterior a la de inicio.');
      if (modoBorrador) {
        if (ofertas.some(o => o.id !== editando?.id && o.codigo === payload.codigo)) throw new Error('Ya cargaste una oferta con ese código.');
        const borrador = { ...payload, id: editando?.id ?? siguienteIdBorrador.current--, imagen_archivo: form.imagen_archivo };
        onBorradoresChange(editando ? ofertas.map(o => o.id === editando.id ? borrador : o) : [...ofertas, borrador]);
        setOpen(false);
        return;
      }
      let avisoImagen = null;
      if (editando) {
        // Editando, la imagen ya se subió sola al elegirla (había id).
        await ofertaService.actualizar(editando.id, payload);
      } else {
        const creada = await ofertaService.crear(productoId, payload);
        avisoImagen = await subirImagenPendiente(creada?.id, form.imagen_archivo);
      }
      setOpen(false);
      await cargar();
      // La oferta se guardó igual; solo falló la foto. Se avisa sin
      // deshacer nada ni cerrar en falso.
      if (avisoImagen) setError(avisoImagen);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la oferta.');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarBorrado() {
    if (modoBorrador) {
      onBorradoresChange(ofertas.filter(o => o.id !== ofertaABorrar.id));
      setOfertaABorrar(null);
      return;
    }
    try {
      await ofertaService.eliminar(ofertaABorrar.id);
      setOfertaABorrar(null);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar la oferta.');
      setOfertaABorrar(null);
    }
  }

  function nombreProducto(id) {
    if (Number(id) === Number(productoId)) return productoNombre || 'este producto';
    return productosDisponibles.find(p => p.id === Number(id))?.nombre || `#${id}`;
  }

  function infoProducto(id) {
    if (Number(id) === Number(productoId)) {
      return { precio_base: productoAnclaPrecioBase, precio_costo: productoAnclaPrecioCosto };
    }
    const p = productosDisponibles.find(x => x.id === Number(id));
    return { precio_base: Number(p?.precio_base) || 0, precio_costo: Number(p?.precio_costo) || 0 };
  }

  // Análisis de sensibilidad — mismo motor que Combos (comboPricingLocal),
  // solo tiene sentido para tipo_contenido="combo": el producto ancla hace
  // de "principal" y el resto de los componentes son sus "upsells", cada
  // uno con su propio % de descuento. Es puramente informativo — nunca
  // recalcula ni sobrescribe form.precio salvo que el admin toque
  // "Aplicar precio sugerido".
  const resultadoSensibilidad = useMemo(() => {
    // Este motor calcula la rentabilidad de un BUNDLE (ancla + extras en una
    // sola línea que reemplaza la compra) contra costos fijos de CPA/envío/
    // confirmación/empaque — tiene sentido para un combo real (estrategia
    // 'normal', elegido en la ficha del producto). Un order bump/upsell no es
    // esa pregunta: se vende como línea APARTE de la del ancla (ver
    // excluirAnclaDeBumpOUpsell en el backend), así que ni siquiera tiene un
    // "precio del bundle" que analizar acá.
    if (form.tipo_contenido !== 'combo' || form.estrategia !== 'normal' || !comboConfig) return null;
    const otros = form.componentes.filter(c => c.producto_id && Number(c.producto_id) !== Number(productoId));
    if (otros.length === 0) return null;

    const principalInfo = infoProducto(productoId);
    const input = {
      principal: {
        id: productoId,
        name: productoNombre,
        cost: principalInfo.precio_costo,
        salePrice: principalInfo.precio_base,
      },
      upsells: otros.map(c => {
        const info = infoProducto(c.producto_id);
        const cantidad = Number(c.cantidad) || 1;
        return {
          id: c.producto_id,
          name: nombreProducto(c.producto_id),
          cost: info.precio_costo * cantidad,
          salePrice: info.precio_base * cantidad,
          discountPercentage: Number(c.descuento_porcentaje) || 0,
        };
      }),
      costs: {
        cpaPercentage: Number(comboConfig.cpa_porcentaje),
        shipping: Number(comboConfig.costo_envio),
        confirmation: Number(comboConfig.costo_confirmacion),
        packaging: Number(comboConfig.costo_empaque),
        paymentCommissionPercentage: Number(comboConfig.pagopar_comision_porcentaje) || 0,
      },
      targetMargins: comboConfig.margenes_objetivo || [15, 30, 45],
      minimumMargin: Number(comboConfig.margen_minimo),
      excellentThreshold: Number(comboConfig.umbral_excelente),
      discountScenarios: comboConfig.escenarios_descuento || [0, 5, 10, 15, 20, 25, 30, 35],
    };
    return calcularLocal(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tipo_contenido, form.componentes, comboConfig, productoId, productoNombre, productoAnclaPrecioBase, productoAnclaPrecioCosto, productosDisponibles]);

  const margenMinimoDecimal = comboConfig?.margen_minimo !== undefined ? Number(comboConfig.margen_minimo) / 100 : 0.10;

  // Precio recomendado = precio del producto ancla + el de cada componente
  // YA con su propio % de descuento aplicado (resultadoSensibilidad.combo.finalPrice,
  // motor de comboPricingLocal) — es el número que de verdad refleja los
  // descuentos configurados, a diferencia del precio de catálogo sin descontar.
  const precioRecomendado = resultadoSensibilidad ? Math.round(resultadoSensibilidad.combo.finalPrice) : null;

  const conteosPorEstrategia = useMemo(() => (
    RESUMEN_OFERTAS.reduce((acc, item) => {
      acc[item.id] = item.id === 'all'
        ? ofertas.length
        : ofertas.filter(oferta => tipoVisibleOferta(oferta) === item.id).length;
      return acc;
    }, {})
  ), [ofertas]);

  /**
   * Un Pack es una presentación alternativa de ESTE producto: el producto
   * base lo define la ficha desde la que se está creando, no un selector.
   * Por eso acá no hay dónde elegirlo ni cambiarlo — para armar un pack de
   * otro producto hay que entrar a ese producto.
   */
  /**
   * El catálogo, en la forma que espera ProductPicker (el mismo selector
   * visual que usa el editor de la landing). Se arma sobre la respuesta de
   * productService — no sobre vitrinaService, que no expone `precio_costo`
   * y dejaría el análisis de sensibilidad de abajo calculando con costo 0.
   *
   * `combos: []` a propósito: un componente de oferta apunta siempre a un
   * producto (OfertaComponente.producto_id), no a otro combo.
   */
  // Un order bump/upsell nunca se agrega a sí mismo como componente (se
  // vende como línea aparte de la del propio ancla) — se lo saca del
  // buscador para esas dos estrategias, en vez de dejar que se pueda
  // elegir y que el backend lo rechace recién al guardar.
  const esBumpOUpsell = form.estrategia === 'order_bump' || form.estrategia === 'upsell';
  const catalogoPicker = useMemo(() => ({
    productos: productosDisponibles
      .filter(p => !esBumpOUpsell || Number(p.id) !== Number(productoId))
      .map(p => ({
        id: p.id,
        nombre: p.nombre,
        imagen: p.imagen || p.imagenes?.[0]?.url || p.imagenes?.[0] || null,
        precio_efectivo: Number(p.precio_efectivo ?? p.precio_base) || 0,
        stock: p.cantidad_disponible ?? p.stock ?? null,
        categoria: p.categoria?.nombre || (typeof p.categoria === 'string' ? p.categoria : null),
        marca: p.marca?.nombre || (typeof p.marca === 'string' ? p.marca : null),
        destacado: p.destacado,
      })),
    combos: [],
  }), [productosDisponibles, esBumpOUpsell, productoId]);

  // Los componentes ya elegidos, en el Map que ProductPicker usa para saber
  // qué tarjetas van marcadas.
  const seleccionPicker = useMemo(() => {
    const map = new Map();
    (form.componentes || []).forEach(c => {
      if (c.producto_id) map.set(`producto:${Number(c.producto_id)}`, { id: Number(c.producto_id), tipo: 'producto' });
    });
    return map;
  }, [form.componentes]);

  /** Marcar/desmarcar una tarjeta agrega o saca esa fila del combo. Al
   *  agregar arranca en cantidad 1 y sin descuento; al sacar, se pierde lo
   *  que se hubiera cargado en esa fila (es lo mismo que hacía el botón de
   *  borrar de siempre). */
  function togglePicker(item) {
    const id = Number(item.id);
    setForm(f => {
      const yaEsta = f.componentes.some(c => Number(c.producto_id) === id);
      if (yaEsta) {
        return { ...f, componentes: f.componentes.filter(c => Number(c.producto_id) !== id) };
      }
      // Se reemplazan las filas vacías que hayan quedado de un "+" previo,
      // para no dejar una fila sin producto colgando debajo.
      const sinVacias = f.componentes.filter(c => c.producto_id);
      const componente = { producto_id: id, cantidad: 1, descuento_porcentaje: 0, variante_id: null, permite_elegir_variante: false };
      return { ...f, componentes: esBumpOUpsell ? [componente] : [...sinVacias, componente] };
    });
  }

  const esPack = form.estrategia === 'normal' && form.tipo_contenido === 'pack';

  // Precio de venta de lo que se suma en un order bump / upsell: la base del
  // precio "sin descuento" de la oferta.
  const precioComponentes = useMemo(() => {
    if (!esBumpOUpsell) return 0;
    return form.componentes
      .filter(c => c.producto_id && Number(c.producto_id) !== Number(productoId))
      .reduce((total, c) => {
        const p = productosDisponibles.find(x => Number(x.id) === Number(c.producto_id));
        const precio = Number(p?.precio_efectivo ?? p?.precio_base) || 0;
        return total + precio * (Number(c.cantidad) || 1);
      }, 0);
  }, [esBumpOUpsell, form.componentes, productosDisponibles, productoId]);

  useEffect(() => {
    if (!esBumpOUpsell || precioManualRef.current || !precioComponentes) return;
    setForm(f => (Number(f.precio) === precioComponentes ? f : { ...f, precio: precioComponentes }));
  }, [esBumpOUpsell, precioComponentes]);

  const productoBase = useMemo(() => {
    const enCatalogo = productosDisponibles.find(x => Number(x.id) === Number(productoId));
    return {
      nombre: productoNombre,
      precio: Number(productoAnclaPrecioBase) || 0,
      imagen: enCatalogo?.imagen || enCatalogo?.imagenes?.[0]?.url || enCatalogo?.imagenes?.[0] || null,
    };
  }, [productosDisponibles, productoId, productoNombre, productoAnclaPrecioBase]);

  const unidadesPack = Math.max(1, parseInt(form.componentes[0]?.cantidad, 10) || 1);

  /**
   * El precio del Pack lo fija el usuario a mano; el ahorro se deriva de
   * comparar contra lo que costarían esas mismas unidades sueltas. Nunca al
   * revés: el sistema no impone el precio.
   */
  const ahorroPack = useMemo(() => {
    const valorIndividual = productoBase.precio * unidadesPack;
    const precioPack = Number(form.precio) || 0;
    if (!valorIndividual || !precioPack) return null;
    const ahorro = valorIndividual - precioPack;
    return {
      valorIndividual,
      precioPack,
      ahorro,
      porcentaje: (ahorro / valorIndividual) * 100,
    };
  }, [productoBase.precio, unidadesPack, form.precio]);

  const ofertasVisibles = useMemo(
    () => estrategiaVista === 'all'
      ? ofertas
      : ofertas.filter(oferta => tipoVisibleOferta(oferta) === estrategiaVista),
    [ofertas, estrategiaVista]
  );

  // Apenas hay una recomendación calculable, se precarga el campo Precio —
  // pero solo si todavía está en blanco/0, para no pisar un precio que el
  // admin ya haya escrito a mano.
  useEffect(() => {
    if (precioRecomendado !== null && !form.precio) {
      setForm(f => (f.precio ? f : { ...f, precio: precioRecomendado }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precioRecomendado]);

  return (
    <div>
      <div className="form-section-title">
        <Tag size={14} /> Ofertas de {productoNombre || 'este producto'}
        <button type="button" className="btn-primary" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => openCrear()}>
          <Plus size={14} /> Nueva oferta
        </button>
      </div>
      <p className="field-hint">
        Estas ofertas aparecen cuando el cliente compra este producto. Acá se crean paquetes, combos, order bumps y upsells sin volver a elegir el producto disparador.
      </p>
      {modoBorrador && <p className="prod-offer-draft-hint" role="status">Podés preparar tus ofertas ahora. Se guardarán junto con el producto al pulsar Guardar.</p>}

      <div className="offer-strategy-grid">
        {RESUMEN_OFERTAS.map(item => {
          const Icono = item.icon;
          const activo = estrategiaVista === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`offer-strategy-card ${activo ? 'active' : ''}`}
              onClick={() => setEstrategiaVista(item.id)}
            >
              <span className="offer-strategy-icon"><Icono size={16} /></span>
              <span>
                <strong>{item.titulo}</strong>
                <small>{item.descripcion}</small>
              </span>
              <b>{conteosPorEstrategia[item.id] || 0}</b>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="combo-empty"><Layers size={24} /><p>Cargando ofertas...</p></div>
      ) : ofertas.length === 0 ? (
        <div className="combo-empty">
          <Layers size={24} opacity={0.3} />
          <p>Todavía no hay ofertas adicionales para este producto.</p>
        </div>
      ) : ofertasVisibles.length === 0 ? (
        <div className="combo-empty">
          <Layers size={24} opacity={0.3} />
          <p>No hay ofertas en este tipo.</p>
          <button type="button" className="btn-primary" onClick={() => openCrear(estrategiaVista)}>
            <Plus size={14} /> Crear oferta
          </button>
        </div>
      ) : (
        <div className="combo-list-grid" style={{ marginTop: '1rem' }}>
          {ofertasVisibles.map(oferta => {
            // "Precio normal" solo se puede calcular sin ambigüedad para
            // packs (mismo producto × unidades) — un combo mezcla
            // productos con precios propios, no hay un único "normal" al
            // que compararlo sin repetir el motor de comboPricing acá.
            const propio = oferta.tipo_contenido === 'pack'
              ? (oferta.componentes || []).find(c => Number(c.producto_id) === Number(productoId))
              : null;
            const precioNormal = propio ? productoAnclaPrecioBase * (Number(propio.cantidad) || 1) : null;
            // Precio propio de la oferta (no el del catálogo) y su promo de
            // checkout, que son dos campos distintos justamente para que
            // configurar la promo no pise el precio de venta normal.
            const precioOferta = Number(oferta.precio_normal ?? oferta.precio) || 0;
            const promoCheckout = (oferta.precio_order_bump === null || oferta.precio_order_bump === undefined
              || Number(oferta.precio_order_bump) === precioOferta)
              ? null : Number(oferta.precio_order_bump);
            const ahorroPct = precioNormal > 0 ? Math.round((1 - precioOferta / precioNormal) * 100) : null;

            return (
            <div key={oferta.id} className={`combo-list-card ${!oferta.activo ? 'inactivo' : ''}`}>
              <div className="combo-list-card-header">
                <div>
                  <div className="combo-list-card-name">{oferta.nombre}</div>
                  <div className="combo-list-card-principal" style={{ fontFamily: 'monospace' }}>{oferta.codigo}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <span className={`combo-badge ${oferta.activo ? 'activo' : 'borrador'}`}>
                    {oferta.activo ? '● Activo' : '○ Inactivo'}
                  </span>
                  <span className="combo-badge borrador">{LABEL_TIPO_VISIBLE[tipoVisibleOferta(oferta)] || 'Oferta'}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {(oferta.componentes || []).map(c => {
                  const detalleVariante = c.permite_elegir_variante
                    ? ' (el cliente elige)'
                    : c.variante?.nombre
                      ? ` (${c.variante.nombre})`
                      : '';
                  return `${c.cantidad}× ${nombreProducto(c.producto_id)}${detalleVariante}`;
                }).join(' + ')}
              </div>

              <div className="combo-list-card-metrics">
                {precioNormal !== null && (
                  <div className="combo-list-card-metric">
                    <span className="combo-list-card-metric-label">Precio normal</span>
                    <span className="combo-list-card-metric-value" style={{ textDecoration: 'line-through', opacity: 0.6 }}>{formatMoney(precioNormal)}</span>
                  </div>
                )}
                <div className="combo-list-card-metric">
                  <span className="combo-list-card-metric-label">Precio aplicado</span>
                  <span className="combo-list-card-metric-value">{formatMoney(precioOferta)}</span>
                </div>
                {promoCheckout !== null && (
                  <div className="combo-list-card-metric">
                    <span className="combo-list-card-metric-label">Promo en checkout</span>
                    <span className="combo-list-card-metric-value" style={{ color: '#f59e0b' }}>{formatMoney(promoCheckout)}</span>
                  </div>
                )}
                {ahorroPct > 0 && (
                  <div className="combo-list-card-metric">
                    <span className="combo-list-card-metric-label">Descuento</span>
                    <span className="combo-list-card-metric-value" style={{ color: '#10b981' }}>-{ahorroPct}%</span>
                  </div>
                )}
                <div className="combo-list-card-metric">
                  <span className="combo-list-card-metric-label">Margen</span>
                  <span className="combo-list-card-metric-value" style={{ color: oferta.margen_pct >= 30 ? '#10b981' : oferta.margen_pct > 0 ? '#f59e0b' : '#ef4444' }}>
                    {oferta.margen_pct}%
                  </span>
                </div>
              </div>

              <div className="combo-list-card-actions">
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => openEditar(oferta)}>
                  <Edit size={13} /> Editar
                </button>
                <button type="button" className="btn-deactivate" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => setOfertaABorrar(oferta)}>
                  <Trash2 size={13} /> {modoBorrador ? 'Quitar' : oferta.activo ? 'Desactivar' : 'Eliminada'}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {open && createPortal(
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            className="modal-content"
            style={{ background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)', borderRadius: '1rem', width: '100%', maxWidth: '840px', color: 'var(--color-fg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem 1.5rem 1rem', flexShrink: 0, borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)' }}>
              <div className="oferta-modal-header">
                <h3>{editando ? 'Editar oferta' : 'Nueva oferta'}</h3>
                <button type="button" className="oferta-modal-close" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button>
              </div>
            </div>
            
            <div style={{ padding: '1rem 1.75rem 1.75rem', overflowY: 'auto' }}>

            {error && (
              <div className="form-error-banner" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={15} /><span>{error}</span>
              </div>
            )}

            {/* 1. Qué tipo de oferta — si se abrió desde una acción contextual ya viene elegido. */}
            <div className="oferta-paso">
              <div className="oferta-paso-titulo">¿Qué querés crear?</div>
              <div className="oferta-tipos" role="radiogroup" aria-label="Tipo de oferta">
                {OPCIONES_TIPO_OFERTA.map(op => {
                  const activo = tipoVisibleOferta(form) === op.value;
                  return (
                  <button
                    key={op.value}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    className={`oferta-tipo ${activo ? 'active' : ''}`}
                    onClick={() => handleTipoOfertaChange(op.value)}
                  >
                    <strong>{op.titulo}</strong>
                    <small>{op.texto}</small>
                  </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Qué se suma. Una sola forma de elegir: "Elegir productos". */}
            <div className="oferta-paso">
              <div className="oferta-paso-titulo">
                {esPack ? 'Producto del paquete' : form.tipo_contenido === 'pack' ? '¿Cuántas unidades?' : '¿Qué se suma a la compra?'}
              </div>
              {!esPack && form.tipo_contenido !== 'pack' && (
                <p className="field-hint" style={{ marginTop: 0 }}>
                  {esBumpOUpsell
                    ? `Elegí un solo producto ofrecido cuando alguien compra "${productoNombre}". Si querés vender varios juntos, creá un combo.`
                    : 'Los productos que forman el combo, además de este.'}
                </p>
              )}
            {esPack ? (
              <>
                {/* Contexto, no selector: el producto base ya lo definió la
                    ficha desde la que se entró. Para armar un pack de otro
                    producto hay que ir a ese producto. */}
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', borderRadius: '8px', padding: '0.85rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {productoBase.imagen
                      ? <img src={getMediaUrl(productoBase.imagen)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Layers size={20} style={{ opacity: 0.4 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-fg)' }}>{productoBase.nombre}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                      Precio actual: <strong style={{ color: 'var(--color-fg)' }}>{formatMoney(productoBase.precio)}</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Este paquete es de este producto: solo cambia la cantidad.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Unidades</span>
                    <input
                      type="number"
                      min="1"
                      value={form.componentes[0]?.cantidad ?? 1}
                      aria-label="Unidades del paquete"
                    onChange={e => updateComponente(0, 'cantidad', e.target.value)}
                      style={{ width: '70px', padding: '0.45rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}
                      required
                    />
                  </div>
                </div>

                {(variantesPorProducto[Number(productoId)] || []).length > 0 && (
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!form.componentes[0]?.permite_elegir_variante}
                        onChange={e => updateComponente(0, 'permite_elegir_variante', e.target.checked)}
                      />
                      Dejar que el cliente elija la variante del paquete
                    </label>
                    {!form.componentes[0]?.permite_elegir_variante && (
                      <label>
                        Variante del paquete
                        <select
                          value={form.componentes[0]?.variante_id || ''}
                          onChange={e => updateComponente(0, 'variante_id', e.target.value ? Number(e.target.value) : null)}
                          required
                        >
                          <option value="">Elegí qué variante incluye el paquete...</option>
                          {(variantesPorProducto[Number(productoId)] || []).map(v => (
                            <option key={v.id} value={v.id}>{v.nombre}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}

                {/* El ahorro se deriva del precio que puso el usuario; el
                    sistema informa, no impone. */}
                {ahorroPack && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <MetricCard label={`Valor individual (${unidadesPack}×)`} value={formatMoney(ahorroPack.valorIndividual)} />
                    <MetricCard label="Precio del paquete" value={formatMoney(ahorroPack.precioPack)} />
                    <MetricCard
                      label="Ahorro"
                      value={formatMoney(ahorroPack.ahorro)}
                      valueClass={ahorroPack.ahorro > 0 ? 'positive' : 'negative'}
                    />
                    <MetricCard
                      label="Descuento"
                      value={`${ahorroPack.porcentaje.toFixed(2).replace('.', ',')}%`}
                      valueClass={ahorroPack.porcentaje > 0 ? 'positive' : 'negative'}
                    />
                  </div>
                )}
                {ahorroPack && ahorroPack.ahorro < 0 && (
                  <p className="field-hint" style={{ color: '#f59e0b' }}>
                    El paquete sale más caro que comprar {unidadesPack} unidades sueltas. Revisá el precio.
                  </p>
                )}
              </>
            ) : form.tipo_contenido === 'pack' ? (
              <div className="form-group" style={{ flexDirection: 'row', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ flex: 1, color: 'var(--color-fg)', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                  <Layers size={15} style={{ marginRight: '8px', opacity: 0.7 }} />
                  {productoNombre} 
                  <span style={{ opacity: 0.5, fontWeight: 'normal', fontSize: '0.8rem', marginLeft: '6px' }}>(producto ancla, fijo)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Unidades</span>
                  <input
                    type="number"
                    min="1"
                    value={form.componentes[0]?.cantidad ?? 1}
                    aria-label="Unidades del paquete"
                    onChange={e => updateComponente(0, 'cantidad', e.target.value)}
                    style={{ width: '70px', padding: '0.45rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}
                    required
                  />
                </div>
              </div>
            ) : (
              <>
              <ProductPicker
                catalogo={catalogoPicker}
                seleccion={seleccionPicker}
                onToggle={togglePicker}
                max={esBumpOUpsell ? 1 : 20}
                mostrarLista={false}
                /* Por encima del modal de ofertas (.modal-overlay, z-index 1000). */
                zIndexModal={1100}
              />
              {form.componentes.filter(c => c.producto_id).length === 0 && (
                <p className="field-hint" style={{ marginTop: '0.5rem' }}>
                  Tocá <strong>Elegir productos</strong> y marcá lo que se suma a la compra (por ejemplo, el accesorio o el complemento).
                </p>
              )}
              {form.componentes.map((c, i) => {
                const esAncla = c.producto_id && Number(c.producto_id) === Number(productoId);
                const variantesDelComponente = variantesPorProducto[Number(c.producto_id)] || [];
                const tieneVariantes = variantesDelComponente.length > 0;

                return (
                <div key={i} style={{ marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                  {/* Antes acá había un <select> con TODO el catálogo en una
                      lista plana, sin imagen ni filtros: con muchos productos
                      era imposible encontrar uno. La elección pasó al
                      ProductPicker de arriba (el mismo del editor de landing)
                      y esta fila solo muestra qué producto quedó elegido. */}
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                    <Layers size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nombreProducto(c.producto_id)}
                      {esAncla && (
                        <span style={{ opacity: 0.5, fontSize: '0.8rem', marginLeft: '6px' }}>(este producto)</span>
                      )}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={c.cantidad}
                    onChange={e => updateComponente(i, 'cantidad', e.target.value)}
                    style={{ width: '70px' }}
                    required
                  />
                  {esAncla ? (
                    <span style={{ width: '100px', textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>Sin descuento</span>
                  ) : (
                    <div className="combo-discount-input" style={{ width: '100px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={c.descuento_porcentaje ?? 0}
                        onChange={e => updateComponente(i, 'descuento_porcentaje', Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        title="Descuento sobre el precio de este producto — solo para el análisis de sensibilidad, no cambia el precio de la oferta"
                      />
                      <span>%</span>
                    </div>
                  )}
                  <button type="button" className="btn-icon danger" onClick={() => removeComponente(i)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* La variante NUNCA se define acá: se lee del producto (ver
                    Producto → Opciones → Variantes). Esto solo decide si se
                    agrega una fija o si el cliente la elige en la tienda. */}
                {tieneVariantes && (
                  <div style={{ marginLeft: '2.1rem', marginTop: '0.35rem', padding: '0.6rem 0.75rem', background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', borderRadius: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!c.permite_elegir_variante}
                        onChange={e => updateComponente(i, 'permite_elegir_variante', e.target.checked)}
                      />
                      Dejar que el cliente elija la variante en la tienda
                    </label>
                    {c.permite_elegir_variante ? (
                      <p className="field-hint" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
                        El cliente va a poder elegir entre: {variantesDelComponente.map(v => v.nombre).join(', ')}
                      </p>
                    ) : (
                      <div className="form-group" style={{ marginTop: '0.4rem' }}>
                        <select
                          value={c.variante_id || ''}
                          onChange={e => updateComponente(i, 'variante_id', e.target.value ? Number(e.target.value) : null)}
                          required
                        >
                          <option value="">Elegí qué variante se agrega...</option>
                          {variantesDelComponente.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
                </div>
                );
              })}
              </>
            )}
            </div>

            {/* 3. Precio: viene calculado de lo elegido; se puede cambiar. */}
            <div className="oferta-paso">
              <div className="oferta-paso-titulo">¿A qué precio?</div>
              <div className="form-grid-2">
              <div className="form-group">
                <label>{esPack ? 'Precio del paquete' : esBumpOUpsell ? 'Precio de lo que se suma' : 'Precio del combo'}</label>
                <CurrencyInput value={form.precio} onChange={val => { precioManualRef.current = true; setForm(f => ({ ...f, precio: val })); }} />
                {esPack && (
                  <p className="field-hint">
                    Lo definís vos. No modifica el precio del producto ({formatMoney(productoBase.precio)}), que sigue vendiéndose igual por separado.
                  </p>
                )}
                {esBumpOUpsell && (
                  <p className="field-hint">
                    {precioComponentes > 0
                      ? <>Lo completamos con el precio de venta de lo que elegiste ({formatMoney(precioComponentes)}). Es el precio sin descuento: se muestra tachado.</>
                      : 'Elegí arriba qué se suma y lo completamos con su precio de venta.'}
                  </p>
                )}
                {precioRecomendado !== null && Number(form.precio) !== precioRecomendado && (
                  <p className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    Recomendado según catálogo y descuentos: <strong>{formatMoney(precioRecomendado)}</strong>
                    <button type="button" className="btn-ghost" style={{ padding: '0.1rem 0.5rem', fontSize: '0.72rem' }} onClick={() => setForm(f => ({ ...f, precio: precioRecomendado }))}>
                      Usar
                    </button>
                  </p>
                )}
              </div>
              {ESTRATEGIAS_CHECKOUT.includes(form.estrategia) && (
                <div className="form-group">
                  <label>Precio con la oferta <span className="hint">(lo que paga si la acepta)</span></label>
                  <CurrencyInput value={form.precio_order_bump} onChange={val => setForm(f => ({ ...f, precio_order_bump: val }))} />
                  {Number(form.precio) > 0 && (
                    <p className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {Number(form.precio_order_bump) > 0 && Number(form.precio_order_bump) < Number(form.precio)
                        ? <>Ahorra {formatMoney(Number(form.precio) - Number(form.precio_order_bump))} ({Math.round((1 - Number(form.precio_order_bump) / Number(form.precio)) * 100)}%).</>
                        : 'Vacío = se cobra el precio de arriba, sin descuento.'}
                      {Number(form.precio_order_bump) !== Math.round(Number(form.precio) * 0.7) && (
                        <button type="button" className="btn-ghost" style={{ padding: '0.1rem 0.5rem', fontSize: '0.72rem' }} onClick={() => setForm(f => ({ ...f, precio_order_bump: Math.round(Number(f.precio) * 0.7) }))}>
                          Usar 30% menos: {formatMoney(Math.round(Number(form.precio) * 0.7))}
                        </button>
                      )}
                    </p>
                  )}
                </div>
              )}
              {usuarioActual?.rol === 'administrador' && (
                <div className="form-group">
                  <label>Precio mínimo <span className="hint">(Límite de rentabilidad)</span></label>
                  <CurrencyInput value={form.precio_minimo} onChange={val => setForm(f => ({ ...f, precio_minimo: val }))} />
                </div>
              )}
              </div>
            </div>

            {/* 4. Cómo se ve para el cliente. */}
            <div className="oferta-paso">
              <div className="oferta-paso-titulo">¿Cómo se ve?</div>
              <div className="form-grid-2">
              <div className="form-group full">
                <label>{esPack ? 'Nombre del paquete' : form.estrategia === 'order_bump' ? 'Título de la casilla' : 'Título de la oferta'}</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder={esPack ? 'Ej. Llevá 2 y ahorrá' : form.estrategia === 'order_bump' ? 'Ej. Sí, sumá el canasto extra con 30% OFF' : 'Ej. ¿Lo querés con el kit de moldes?'}
                  required
                />
                {esBumpOUpsell && (
                  <small className="hint">
                    Es la línea grande que ve el cliente. Funciona mejor en primera persona y con el beneficio: “Sí, sumá…”.
                  </small>
                )}
              </div>
              <div className="form-group full">
                <label>Descripción <span className="hint">(opcional)</span></label>
                <input
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder={esPack ? 'Ej. Te dura el doble' : 'Ej. Llega junto con tu pedido'}
                />
                <small className="hint">Una frase corta debajo del título: el beneficio o un dato que dé confianza.</small>
              </div>
              <div className="form-group full">
                <label>Imagen de la oferta <span className="hint">(opcional)</span></label>
                <OfertaImagenPicker
                  ofertaId={modoBorrador ? null : editando?.id || null}
                  imagenUrl={form.imagen_url || null}
                  archivo={form.imagen_archivo}
                  respaldoUrl={productoBase.imagen}
                  onChange={({ imagen_url, archivo }) => setForm(f => ({ ...f, imagen_url: imagen_url || '', imagen_archivo: archivo }))}
                />
              </div>
              </div>
            </div>

            {/* 5. Lo técnico, plegado: casi nunca hace falta tocarlo. */}
            <details className="oferta-mas">
              <summary>Más opciones <span className="hint">(código interno, tipo de contenido, fechas)</span></summary>
              <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label>Código interno <span className="hint">(opcional)</span></label>
                <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} placeholder="Se genera solo" />
                <small className="hint">Sirve para reconocer la oferta en reportes. Si lo dejás vacío, lo generamos.</small>
              </div>
              {!esPack && (
                <div className="form-group">
                  <label>Tipo de contenido</label>
                  <select value={form.tipo_contenido} onChange={e => handleTipoContenidoChange(e.target.value)}>
                    {TIPOS_CONTENIDO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Desde <span className="hint">(opcional)</span></label>
                <input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Hasta <span className="hint">(opcional)</span></label>
                <input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
                {form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio && (
                  <p className="field-hint" style={{ color: '#ef4444' }}>La fecha de fin no puede ser anterior a la de inicio.</p>
                )}
              </div>
              </div>
            </details>

            {form.tipo_contenido === 'combo' && form.estrategia === 'normal' && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)', paddingTop: '1rem' }}>
                <div className="form-section-title">
                  <Activity size={14} /> Rentabilidad y descuentos
                </div>
                {!comboConfig ? (
                  <p className="field-hint">Cargando configuración económica...</p>
                ) : !resultadoSensibilidad ? (
                  <p className="field-hint">Agregá al menos un producto además de "{productoNombre}" para calcular el margen del combo.</p>
                ) : (() => {
                  const sBase = resultadoSensibilidad.combo;
                  const targetMargin = margenMinimoDecimal;
                  const marginBase = form.precio > 0 ? (Number(form.precio) - sBase.totalCost) / Number(form.precio) : 0;
                  const utilityBase = form.precio > 0 ? Number(form.precio) - sBase.totalCost : 0;
                  
                  // Helper function to get margin health
                  const getHealth = (m) => {
                    if (m <= 0) return { label: '✕ Pérdida', class: 'negative', color: '#ef4444' };
                    if (m < 0.15) return { label: '⚠ Margen crítico', class: 'negative', color: '#ef4444' };
                    if (m < targetMargin) return { label: '⚠ Margen reducido', class: 'warning', color: '#f59e0b' };
                    if (m >= 0.5) return { label: '✓ Excelente margen', class: 'positive', color: '#10b981' };
                    return { label: '✓ Margen saludable', class: 'positive', color: '#10b981' };
                  };

                  const healthBase = getHealth(marginBase);

                  // Calculate simulated — el descuento simulado se aplica sobre el
                  // precio YA recomendado (ancla + componentes con su propio %
                  // descontado), no sobre el total de catálogo sin descontar.
                  const simulatedPrice = Math.round(precioRecomendado * (1 - (descuentoSimulado / 100)));
                  const simulatedUtility = simulatedPrice - sBase.totalCost;
                  const simulatedMargin = simulatedPrice > 0 ? simulatedUtility / simulatedPrice : 0;
                  const healthSimulated = getHealth(simulatedMargin);

                  // Calculate break-even discount (where margin hits target)
                  const minPriceTarget = sBase.totalCost / (1 - targetMargin);
                  const maxDiscountTarget = precioRecomendado > 0 ? Math.max(0, 1 - (minPriceTarget / precioRecomendado)) * 100 : 0;

                  return (
                    <div style={{ marginTop: '0.5rem' }}>
                      <p className="field-hint" style={{ marginBottom: '1rem' }}>
                        Precio recomendado (ancla + cada componente con su propio % de descuento ya aplicado): <strong>{formatMoney(precioRecomendado)}</strong>. Precio de catálogo sin descontar: {formatMoney(sBase.originalPrice)}. El precio actual de tu oferta es de {formatMoney(form.precio)}.
                      </p>

                      {/* Sección 2 — Productos complementarios (detalle por upsell, igual que Combos) */}
                      <div className="form-section-title" style={{ fontSize: '0.82rem' }}>PRODUCTOS COMPLEMENTARIOS</div>
                      <div style={{ overflowX: 'auto', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                        <table className="combo-sensitivity-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left' }}>Producto</th>
                              <th className="text-right">Costo</th>
                              <th className="text-right">Precio de venta</th>
                              <th className="text-right">Descuento %</th>
                              <th className="text-right">Monto descuento</th>
                              <th className="text-right">Utilidad individual</th>
                              <th className="text-right">Margen individual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.componentes
                              .filter(c => c.producto_id && Number(c.producto_id) !== Number(productoId))
                              .map((c, idx) => {
                                const u = resultadoSensibilidad.upsells[idx];
                                if (!u) return null;
                                const h = getHealth(u.margin);
                                return (
                                  <tr key={idx}>
                                    <td>{nombreProducto(c.producto_id)}</td>
                                    <td className="text-right">{formatMoney(u.cost)}</td>
                                    <td className="text-right">{formatMoney(u.originalPrice)}</td>
                                    <td className="text-right">{Number(c.descuento_porcentaje) || 0}%</td>
                                    <td className="text-right">{formatMoney(u.discountAmount)}</td>
                                    <td className="text-right" style={{ color: h.color }}>{formatMoney(u.profit)}</td>
                                    <td className="text-right" style={{ color: h.color }}>{fmtPct(u.margin)}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      {/* Sección 3 — Resultados automáticos (detalle completo, igual que la planilla de Combos) */}
                      <div className="form-section-title" style={{ fontSize: '0.82rem' }}>RESULTADOS AUTOMÁTICOS</div>
                      <div style={{ overflowX: 'auto', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                        <table className="combo-sensitivity-table" style={{ width: '100%' }}>
                          <tbody>
                            <tr><td>Precio de venta real de los productos</td><td className="text-right" style={{ fontWeight: 600 }}>{formatMoney(sBase.originalPrice)}</td></tr>
                            <tr><td>Precio final con el combo</td><td className="text-right" style={{ fontWeight: 600 }}>{formatMoney(sBase.finalPrice)}</td></tr>
                            <tr><td>Descuento aplicado en dinero</td><td className="text-right">{formatMoney(sBase.discountAmount)}</td></tr>
                            <tr><td>Descuento aplicado en porcentaje</td><td className="text-right">{fmtPct(sBase.discountPercentage)}</td></tr>
                            <tr><td>Costo de productos complementarios</td><td className="text-right">{formatMoney(sBase.upsellCosts)}</td></tr>
                            <tr><td>Costos totales (producto de entrada)</td><td className="text-right">{formatMoney(resultadoSensibilidad.principal.totalCosts)}</td></tr>
                            <tr><td>Costo total del combo</td><td className="text-right">{formatMoney(sBase.totalCost)}</td></tr>
                            <tr><td>Utilidad bruta</td><td className="text-right" style={{ color: sBase.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{formatMoney(sBase.profit)}</td></tr>
                            <tr><td>Margen porcentual</td><td className="text-right" style={{ color: sBase.margin >= margenMinimoDecimal ? '#10b981' : '#ef4444', fontWeight: 600 }}>{fmtPct(sBase.margin)}</td></tr>
                            <tr><td>Ticket promedio generado</td><td className="text-right">{formatMoney(sBase.ticket)}</td></tr>
                            <tr><td>Utilidad vendiendo solo el producto principal</td><td className="text-right">{formatMoney(resultadoSensibilidad.comparison.standaloneProfit)}</td></tr>
                            <tr><td>Utilidad vendiendo el combo</td><td className="text-right">{formatMoney(resultadoSensibilidad.comparison.comboProfit)}</td></tr>
                            <tr><td>Diferencia de utilidad ($)</td><td className="text-right" style={{ color: resultadoSensibilidad.comparison.profitDifference >= 0 ? '#10b981' : '#ef4444' }}>{formatMoney(resultadoSensibilidad.comparison.profitDifference)}</td></tr>
                            <tr><td>Diferencia porcentual de utilidad</td><td className="text-right">{resultadoSensibilidad.comparison.profitDifferencePercentage !== null && resultadoSensibilidad.comparison.profitDifferencePercentage !== undefined ? `${resultadoSensibilidad.comparison.profitDifferencePercentage.toFixed(2)}%` : '—'}</td></tr>
                            <tr><td>Indicador visual de oferta</td><td className="text-right"><BadgeOferta status={resultadoSensibilidad.comparison.offerStatus} /></td></tr>
                            <tr><td>Rentabilidad</td><td className="text-right"><BadgeRentabilidad status={resultadoSensibilidad.comparison.profitabilityStatus} /></td></tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 1. Resumen ejecutivo (3 tarjetas) */}
                      <div className="combo-metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <MetricCard label="Precio de Oferta" value={formatMoney(form.precio || 0)} />
                        <MetricCard label="Utilidad" value={formatMoney(utilityBase)} valueClass={healthBase.class} />
                        <MetricCard label="Margen" value={fmtPct(marginBase)} valueClass={healthBase.class} />
                      </div>

                      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: healthBase.color, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {healthBase.label}.
                        {maxDiscountTarget > 0 && ` Podés aplicar hasta ${Math.floor(maxDiscountTarget)}% de descuento manteniendo un margen superior al ${(targetMargin*100).toFixed(0)}%.`}
                      </div>

                      {/* 2. Simulador (Slider) */}
                      <div style={{
                        marginTop: '1.75rem',
                        padding: '1.25rem 1.5rem',
                        background: 'var(--color-surface-2)',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                      }}>
                        <div className="form-section-title" style={{ fontSize: '0.75rem', marginBottom: '1rem', border: 'none', margin: 0, padding: 0 }}>
                          SIMULAR DESCUENTO SOBRE EL PRECIO BASE
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', marginBottom: '1.25rem' }}>
                          <input 
                            type="number"
                            min="0" max="100"
                            value={descuentoSimulado}
                            onChange={(e) => setDescuentoSimulado(Number(e.target.value))}
                            style={{
                              width: '90px',
                              padding: '0.55rem 0.75rem',
                              textAlign: 'center',
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                              color: 'var(--color-primary)',
                              background: 'var(--color-surface)',
                              border: '1.5px solid var(--color-border)',
                              borderRadius: '8px'
                            }}
                          />
                          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>%</span>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem 1.25rem',
                          background: 'var(--color-surface)',
                          borderRadius: '10px',
                          border: '1px solid var(--color-border)'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-fg-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Precio final</div>
                            <div style={{ fontWeight: '700', fontSize: '1.05rem', marginTop: '0.2rem', color: 'var(--color-fg)' }}>{formatMoney(simulatedPrice)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-fg-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Utilidad</div>
                            <div style={{ fontWeight: '700', fontSize: '1.05rem', marginTop: '0.2rem', color: healthSimulated.color }}>{formatMoney(simulatedUtility)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-fg-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Margen</div>
                            <div style={{ fontWeight: '700', fontSize: '1.05rem', marginTop: '0.2rem', color: healthSimulated.color }}>{fmtPct(simulatedMargin)}</div>
                          </div>
                        </div>

                        {descuentoSimulado > 0 && (
                          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                            <button type="button" className="btn-primary" onClick={() => {
                              setForm(f => ({ ...f, precio: simulatedPrice }));
                              setDescuentoSimulado(0);
                            }}>
                              Aplicar este precio
                            </button>
                          </div>
                        )}
                        {/* 4. Mini Gráfico CSS */}
                        <div style={{ marginTop: '2rem', position: 'relative', height: '100px', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', borderLeft: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', margin: '1rem 1rem 2rem 2rem' }}>
                           <div style={{ position: 'absolute', top: '-20px', left: '-20px', fontSize: '0.65rem', color: 'var(--fg-muted)' }}>Utilidad</div>
                           <div style={{ position: 'absolute', bottom: '-20px', right: '-10px', fontSize: '0.65rem', color: 'var(--fg-muted)' }}>Desc.</div>
                           {[0, 5, 10, 15, 20, 25, 30, 35].map(d => {
                             const p = Number(form.precio) * (1 - (d / 100));
                             const u = p - sBase.totalCost;
                             const m = p > 0 ? u / p : 0;
                             
                             // Calculate Y position relative to max utility
                             const maxU = Number(form.precio) - sBase.totalCost;
                             const heightPct = maxU > 0 ? Math.max(0, (u / maxU) * 100) : 0;
                             const leftPct = (d / 35) * 100;

                             // Color logic based on margin health
                             const dotColor = m <= 0 ? '#ef4444' : m < targetMargin ? '#f59e0b' : '#10b981';

                             return (
                               <div key={d}>
                                 {/* Dots */}
                                 <div 
                                    style={{
                                      position: 'absolute',
                                      bottom: `${heightPct}%`,
                                      left: `${leftPct}%`,
                                      width: d === descuentoSimulado ? '12px' : '8px',
                                      height: d === descuentoSimulado ? '12px' : '8px',
                                      borderRadius: '50%',
                                      backgroundColor: dotColor,
                                      transform: 'translate(-50%, 50%)',
                                      border: d === descuentoSimulado ? '2px solid #fff' : 'none',
                                      transition: 'all 0.2s',
                                      zIndex: d === descuentoSimulado ? 10 : 1
                                    }}
                                    title={`${d}%: ${formatMoney(u)}`}
                                 />
                                 {/* X-axis labels */}
                                 <div style={{ position: 'absolute', bottom: '-20px', left: `${leftPct}%`, transform: 'translateX(-50%)', fontSize: '0.65rem', color: 'var(--fg-muted)' }}>
                                   {d}
                                 </div>
                               </div>
                             );
                           })}
                           {/* Max Discount Line */}
                           {maxDiscountTarget > 0 && maxDiscountTarget <= 35 && (
                             <div style={{
                               position: 'absolute',
                               bottom: 0,
                               left: `${(maxDiscountTarget / 35) * 100}%`,
                               height: '100%',
                               width: '1px',
                               borderLeft: '1px dashed #ef4444',
                               zIndex: 0
                             }}>
                               <div style={{ position: 'absolute', top: '-15px', transform: 'translateX(-50%)', fontSize: '0.6rem', color: '#ef4444', whiteSpace: 'nowrap' }}>
                                 Máx rec.
                               </div>
                             </div>
                           )}
                        </div>
                      </div>

                      {/* 5. Tabla Detalles Toggleable */}
                      <div style={{ marginTop: '1.5rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setMostrarDetalleEscenarios(!mostrarDetalleEscenarios)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                        >
                          {mostrarDetalleEscenarios ? '▴ Ocultar' : '▾ Ver escenarios detallados'}
                        </button>
                        
                        {mostrarDetalleEscenarios && (
                          <div style={{ overflowX: 'auto', marginTop: '1rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                            <table className="combo-sensitivity-table">
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left' }}>Descuento</th>
                                  <th>Precio</th>
                                  <th>Utilidad</th>
                                  <th>Margen</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[0, 5, 10, 15, 20, 25, 30, 35].map(d => {
                                  const p = Math.round(Number(form.precio) * (1 - (d / 100)));
                                  const u = p - sBase.totalCost;
                                  const m = p > 0 ? u / p : 0;
                                  const h = getHealth(m);
                                  return (
                                    <tr key={d}>
                                      <td>{d}%</td>
                                      <td className="text-right">{formatMoney(p)}</td>
                                      <td className="text-right" style={{ color: h.color }}>{formatMoney(u)}</td>
                                      <td className="text-right" style={{ color: h.color }}>{fmtPct(m)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* 7. Precios mínimos por margen */}
                      <div className="form-section-title" style={{ marginTop: '2rem', fontSize: '0.82rem' }}>PRECIO MÍNIMO SEGÚN MARGEN</div>
                      
                      {/* 9. Alerta Precio Mínimo */}
                      {resultadoSensibilidad.recommendations.filter(r => r.targetMargin === (targetMargin * 100)).map(rec => (
                        <div key="min-alert" style={{ marginBottom: '1rem', padding: '0.75rem', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0 4px 4px 0' }}>
                           <strong style={{ color: '#ef4444', display: 'block', fontSize: '0.75rem' }}>⚠ PRECIO MÍNIMO: {formatMoney(rec.suggestedPrice)}</strong>
                           <span style={{ fontSize: '0.8rem', color: 'var(--fg)' }}>Por debajo de este precio la oferta genera menos del {(targetMargin*100).toFixed(0)}% de margen.</span>
                        </div>
                      ))}

                      <table className="combo-sensitivity-table" style={{ width: '100%', marginTop: '0.5rem' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Margen objetivo</th>
                            <th className="text-right">Precio mínimo</th>
                            <th className="text-right">Diferencia actual</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultadoSensibilidad.recommendations.map(rec => {
                            if (!rec.suggestedPrice) return null;
                            const currentPrice = Number(form.precio) || 0;
                            const diff = currentPrice > 0 ? (currentPrice - rec.suggestedPrice) / currentPrice : 0;
                            const diffStr = diff > 0 ? `+${fmtPct(diff)}` : fmtPct(diff);
                            const diffColor = diff >= 0 ? '#10b981' : '#ef4444';
                            return (
                              <tr key={rec.targetMargin}>
                                <td>{rec.targetMargin}%</td>
                                <td className="text-right">{formatMoney(rec.suggestedPrice)}</td>
                                <td className="text-right" style={{ color: diffColor }}>{diffStr}</td>
                                <td className="text-right">
                                  <button 
                                    type="button" 
                                    className="btn-ghost" 
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => setForm(f => ({ ...f, precio: Math.round(rec.suggestedPrice) }))}
                                  >
                                    Aplicar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            <label className="check-label" style={{ marginTop: '0.75rem' }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
              Oferta activa
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)' }}>
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={guardando}>
                {guardando ? 'Guardando...' : modoBorrador ? (editando ? 'Actualizar oferta preparada' : 'Agregar oferta al producto') : (editando ? 'Guardar cambios' : 'Crear oferta')}
              </button>
            </div>
            </div>
          </form>

        </div>,
        document.body
      )}

      <ConfirmDialog
        open={!!ofertaABorrar}
        title={`¿${modoBorrador ? 'Quitar' : 'Desactivar'} "${ofertaABorrar?.nombre}"?`}
        description={modoBorrador ? 'Se quitará esta oferta de los cambios pendientes del producto.' : 'La oferta deja de ofrecerse, pero los pedidos ya vendidos con ella no se modifican.'}
        confirmLabel={modoBorrador ? 'Quitar' : 'Desactivar'}
        danger
        onConfirm={confirmarBorrado}
        onCancel={() => setOfertaABorrar(null)}
      />
    </div>
  );
}
