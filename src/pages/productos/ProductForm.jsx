import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';
import { categoriaService } from '../../services/catalogoService';
import { comboAdminService } from '../../services/comboAdminService';
import { proveedoresService } from '../../services/costosGastosService';
import { verificarSesion } from '../../utils/auth';
import { calcularPrincipal, simularDescuentosPrincipal } from '../../utils/comboPricingLocal';
import CurrencyInput from '../../components/CurrencyInput';
import SelectorIcono from '../../components/SelectorIcono';
import OfertasProductoTab from './OfertasProductoTab';
import FichaRubroTab from './FichaRubroTab';
import ProductLandingPreview from './ProductLandingPreview';
import FaqPanel from '../landing-simple/panels/FaqPanel';
import {
  Package, ChevronLeft, Save, Plus, Trash2, Upload,
  Star, X, Info, DollarSign, BarChart2, Image as ImageIcon, Tag, Activity,
  Settings, Layers, Eye, Circle, AlertTriangle, CheckCircle2
} from 'lucide-react';
import './productos.css';
import '../combos/combos.css'; // Reutilizar estilos de métricas de combos

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtGs(n)  { return n !== null && n !== undefined ? 'Gs ' + fmt(n) : '—'; }
function fmtPct(n) { return n !== null && n !== undefined ? (Number(n) * 100).toFixed(2) + '%' : '—'; }

const TABS = [
  { id: 'basica', label: 'Identidad', desc: 'Datos base, textos y fotos', level: 'Esencial', icon: <Package size={15} /> },
  { id: 'comercial', label: 'Precio', desc: 'Precio, descuento y margen', level: 'Esencial', icon: <DollarSign size={15} /> },
  { id: 'stock', label: 'Inventario', desc: 'Stock, SKU y variantes', level: 'Recomendado', icon: <Layers size={15} /> },
  { id: 'venta', label: 'Venta', desc: 'Packs, bumps y upsells', level: 'Avanzado', icon: <Tag size={15} /> },
  { id: 'marketing', label: 'Vista del producto', desc: 'Campos dinámicos, FAQ y preview', level: 'Recomendado', icon: <Eye size={15} /> },
  { id: 'publicacion', label: 'Publicacion', desc: 'Estado y visibilidad', level: 'Esencial', icon: <Settings size={15} /> },
  // NO re-agregar una pestaña que apunte a /mi-landing: ese editor
  // (FunnelSelector + MerchantEditor + page-builder) está deprecado. El
  // funnel vive en su propio módulo, ver pages/funnel/.
];

const TAB_ALIASES = {
  general: 'basica',
  multimedia: 'basica',
  clasificacion: 'basica',
  ficha: 'marketing',
  precio: 'comercial',
  inventario: 'stock',
  variantes: 'stock',
  ofertas: 'venta',
  faq: 'marketing',
  configuracion: 'publicacion',
  diseno: 'marketing',
};

const ESTADOS_VENTA = [
  { value: 'en_venta',       label: '🟢 En venta',         desc: 'Visible y disponible para comprar' },
  { value: 'fuera_de_stock', label: '🟡 Fuera de stock',   desc: 'Visible, pero no se puede comprar' },
  { value: 'no_disponible',  label: '🔴 No disponible',    desc: 'No aparece en la tienda' },
];

const ESTADO_VENTA_LABELS = {
  en_venta: 'En venta',
  fuera_de_stock: 'Fuera de stock',
  no_disponible: 'No disponible',
};

const MUESTRAS_VISTA_PRODUCTO = {
  basico: {
    propuesta_valor: 'Un producto práctico, confiable y listo para resolver una necesidad concreta desde el primer uso.',
    sobre_este_producto: 'Diseñado para el uso diario, con materiales seleccionados y una experiencia simple para el cliente. Ideal para quienes buscan una solución clara, durable y fácil de integrar a su rutina.',
    beneficios: [
      { icono: 'star', titulo: 'Uso simple', texto: 'Se entiende rápido y no requiere configuración complicada.' },
      { icono: 'badge', titulo: 'Calidad verificada', texto: 'Materiales y terminaciones pensadas para durar.' },
      { icono: 'truck', titulo: 'Listo para recibir', texto: 'Presentación clara y envío preparado para vender online.' },
    ],
    ficha_datos: {
      cta_principal_texto: 'Comprar ahora',
      beneficios_rapidos: ['Uso simple', 'Calidad verificada', 'Listo para recibir'],
      basico_descripcion_encabezado: 'Diseñado para funcionar, creado para durar',
      basico_descripcion_destacados: ['Diseño inteligente', 'Uso diario', 'Excelente relación calidad-precio'],
      basico_usos: [
        { paso: '1', titulo: 'Elegí', texto: 'Seleccioná la opción que mejor se adapte a tu necesidad.' },
        { paso: '2', titulo: 'Usá', texto: 'Incorporalo fácilmente a tu rutina diaria.' },
        { paso: '3', titulo: 'Disfrutá', texto: 'Obtené una experiencia más cómoda desde el primer día.' },
      ],
      basico_comparacion_imagen_nosotros: 'https://picsum.photos/seed/mi-producto-basico/900/640',
      basico_comparacion_imagen_otros: 'https://picsum.photos/seed/otras-opciones/900/640',
      basico_comparacion: [
        { caracteristica: 'Garantía incluida', nosotros: true, otros: false },
        { caracteristica: 'Soporte local', nosotros: true, otros: false },
        { caracteristica: 'Calidad verificada', nosotros: true, otros: true },
      ],
    },
    faq: [
      { pregunta: '¿Cuándo recibo mi pedido?', respuesta: 'El tiempo de entrega depende de tu ciudad. Te compartimos el seguimiento apenas se despacha.' },
      { pregunta: '¿Tiene garantía?', respuesta: 'Sí, el producto cuenta con garantía por fallas de fabricación.' },
    ],
  },
  suplementos: {
    propuesta_valor: 'Apoyá tu rutina con una fórmula pensada para mejorar constancia, energía y recuperación.',
    beneficios: [
      { icono: 'zap', titulo: 'Más constancia', texto: 'Acompaña la rutina diaria sin complicaciones.' },
      { icono: 'leaf', titulo: 'Ingredientes claros', texto: 'Cada componente se comunica con dosis y beneficio.' },
      { icono: 'star', titulo: 'Resultado progresivo', texto: 'Ideal para explicar expectativas reales.' },
    ],
    ficha_datos: {
      cta_principal_texto: 'Comprar ahora',
      beneficios_rapidos: ['Más constancia', 'Ingredientes claros', 'Resultado progresivo'],
      ingredientes: [
        { nombre: 'Creatina monohidratada', dosis: '3g', texto: 'Ayuda al rendimiento en entrenamientos intensos.' },
        { nombre: 'Magnesio', dosis: '120mg', texto: 'Acompaña la recuperación muscular y el descanso.' },
      ],
      fitness_opiniones: [
        { nombre: 'Carlos M.', calificacion: 5, comentario: 'Me ayudó a sostener mejor la rutina y llegar con más energía.', foto: '' },
        { nombre: 'Dani R.', calificacion: 5, comentario: 'La explicación de dosis me dio confianza para comprar.', foto: '' },
      ],
      fitness_pasos: [
        { paso: '1', titulo: 'Tomalo todos los días', texto: 'Usá la dosis recomendada con agua o tu bebida habitual.' },
        { paso: '2', titulo: 'Acompañá tu rutina', texto: 'Combiná el suplemento con entrenamiento y descanso.' },
        { paso: '3', titulo: 'Medí tu progreso', texto: 'Evaluá energía, recuperación y constancia semana a semana.' },
      ],
    },
    faq: [
      { pregunta: '¿Cuándo conviene tomarlo?', respuesta: 'Podés usarlo en el horario que mejor se adapte a tu rutina, siguiendo la dosis recomendada.' },
      { pregunta: '¿Necesito entrenar para usarlo?', respuesta: 'Funciona mejor acompañado de hábitos saludables y entrenamiento constante.' },
    ],
  },
  tecnologia: {
    propuesta_valor: 'Tecnología confiable para mejorar tu día a día con mejor rendimiento, comodidad y soporte.',
    beneficios: [
      { icono: 'zap', titulo: 'Alto rendimiento', texto: 'Respuesta fluida para tareas cotidianas.' },
      { icono: 'shield', titulo: 'Compra segura', texto: 'Garantía y soporte claros desde la ficha.' },
      { icono: 'star', titulo: 'Mejor elección', texto: 'Comparación visible frente a alternativas comunes.' },
    ],
    ficha_datos: {
      cta_principal_texto: 'Añadir al carrito',
      beneficios_rapidos: ['Alto rendimiento', 'Compra segura', 'Mejor elección'],
      especificaciones: [
        { clave: 'Batería', valor: 'Hasta 50 horas de uso' },
        { clave: 'Conectividad', valor: 'Bluetooth 5.3' },
        { clave: 'Garantía', valor: '12 meses' },
      ],
      en_la_caja: ['Producto principal', 'Cable USB-C', 'Manual de uso'],
      tech_multimedia: [
        { titulo: 'Detalle del producto', imagen: 'https://picsum.photos/seed/producto-tech/900/640', url: '' },
      ],
      comparativa_imagen_nosotros: 'https://picsum.photos/seed/mi-producto-tech/900/640',
      comparativa_imagen_otros: 'https://picsum.photos/seed/otros-tech/900/640',
      comparativa: [
        { caracteristica: 'Garantía local', nosotros: true, otros: false },
        { caracteristica: 'Batería extendida', nosotros: true, otros: false },
        { caracteristica: 'Conexión inalámbrica', nosotros: true, otros: true },
      ],
      tech_resenas: [
        { nombre: 'Laura P.', calificacion: 5, comentario: 'La batería dura mucho y la comparación me ayudó a decidir.', foto: '', verificada: true },
      ],
    },
    faq: [
      { pregunta: '¿Incluye garantía?', respuesta: 'Sí, incluye garantía por fallas de fabricación.' },
      { pregunta: '¿Qué viene en la caja?', respuesta: 'La sección En la caja muestra todo lo incluido antes de comprar.' },
    ],
  },
  beauty: {
    propuesta_valor: 'Cuidado visible para una piel más luminosa, hidratada y suave desde la rutina diaria.',
    beneficios: [
      { icono: 'sparkles', titulo: 'Piel luminosa', texto: 'Ayuda a mejorar la apariencia general de la piel.' },
      { icono: 'leaf', titulo: 'Ingredientes premium', texto: 'Componentes claros con beneficios fáciles de entender.' },
      { icono: 'heart', titulo: 'Rutina simple', texto: 'Ideal para explicar pasos de uso sin fricción.' },
    ],
    ficha_datos: {
      cta_principal_texto: 'Comprar ahora',
      beneficios_rapidos: ['Piel luminosa', 'Ingredientes premium', 'Rutina simple'],
      beauty_ingredientes: [
        { icono: '💧', nombre: 'Ácido hialurónico', descripcion: 'Hidratación profunda y aspecto más relleno.' },
        { icono: '✨', nombre: 'Niacinamida', descripcion: 'Ayuda a mejorar textura y luminosidad.' },
      ],
      beauty_resultados: [
        {
          nombre: 'Ana M.',
          calificacion: 5,
          testimonio: 'Mi piel se ve más hidratada y luminosa después de incorporarlo a mi rutina.',
          antes: 'https://picsum.photos/seed/antes-beauty/700/700',
          despues: 'https://picsum.photos/seed/despues-beauty/700/700',
        },
      ],
      beauty_pasos: [
        { paso: '1', titulo: 'Limpia', descripcion: 'Aplicá sobre la piel limpia y seca.' },
        { paso: '2', titulo: 'Aplica', descripcion: 'Usá una pequeña cantidad y distribuí suavemente.' },
        { paso: '3', titulo: 'Continúa', descripcion: 'Repetí la rutina todos los días para mejores resultados.' },
      ],
    },
    faq: [
      { pregunta: '¿Cuándo se usa?', respuesta: 'Usalo dentro de tu rutina diaria, idealmente sobre la piel limpia.' },
      { pregunta: '¿Puedo combinarlo con otros productos?', respuesta: 'Sí, podés integrarlo con otros pasos de cuidado según tu tipo de piel.' },
    ],
  },
};

function hayContenido(valor) {
  if (Array.isArray(valor)) return valor.some(hayContenido);
  if (valor && typeof valor === 'object') return Object.values(valor).some(hayContenido);
  return String(valor ?? '').trim().length > 0;
}

function mezclarDatosMuestra(actual = {}, muestra = {}) {
  const combinado = { ...(actual || {}) };
  Object.entries(muestra).forEach(([clave, valor]) => {
    if (!hayContenido(combinado[clave])) combinado[clave] = valor;
  });
  return combinado;
}

const MAX_BENEFICIOS_RAPIDOS = 6;

function normalizarBeneficiosRapidos(datos) {
  return Array.isArray(datos?.beneficios_rapidos) ? datos.beneficios_rapidos : [];
}

function EncabezadoProductoFields({ datos, onDatos }) {
  const datosActuales = datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
  const beneficiosRapidos = normalizarBeneficiosRapidos(datosActuales);

  const actualizarDatos = (patch) => onDatos({ ...datosActuales, ...patch });
  const actualizarBeneficios = (items) => actualizarDatos({ beneficios_rapidos: items });

  return (
    <div className="rubro-field-card">
      <div className="rubro-card-header">
        <div>
          <label>Encabezado de la vista</label>
          <p>Texto del botón principal y beneficios rápidos que se ven junto al precio.</p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-small"
          onClick={() => actualizarBeneficios([...beneficiosRapidos, ''])}
          disabled={beneficiosRapidos.length >= MAX_BENEFICIOS_RAPIDOS}
        >
          <Plus size={14} /> Agregar beneficio rápido
        </button>
      </div>

      <label className="rubro-field">
        <span>Texto del botón principal</span>
        <input
          value={datosActuales.cta_principal_texto || ''}
          onChange={(e) => actualizarDatos({ cta_principal_texto: e.target.value })}
          placeholder="Ej: Comprar ahora, Reservar, Pedir por WhatsApp"
        />
      </label>

      <div className="quick-benefits-list">
        {beneficiosRapidos.length === 0 ? (
          <p className="field-hint">Sin beneficios rápidos. El encabezado usará el contenido base de la ficha.</p>
        ) : beneficiosRapidos.map((texto, index) => (
          <div key={index} className="quick-benefit-row">
            <label className="rubro-field">
              <span>Beneficio rápido {index + 1}</span>
              <input
                value={texto || ''}
                onChange={(e) => {
                  const siguientes = [...beneficiosRapidos];
                  siguientes[index] = e.target.value;
                  actualizarBeneficios(siguientes);
                }}
                placeholder="Ej: Garantía local"
              />
            </label>
            <button
              type="button"
              className="btn-icon"
              onClick={() => actualizarBeneficios(beneficiosRapidos.filter((_, i) => i !== index))}
              aria-label={`Eliminar beneficio rápido ${index + 1}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [tabActiva, setTabActiva] = useState('basica');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [muestrasAplicadas, setMuestrasAplicadas] = useState({});

  // Permite abrir directo en una pestaña (ej. desde "Abrir ofertas del
  // producto" en el wizard de campañas) sin filtrar nada por la URL — el
  // payload viaja por sessionStorage (se copia a la pestaña nueva por ser
  // same-origin) y se consume una sola vez, nunca queda en el link.
  // Tiene que ir en un efecto, no en el inicializador de useState: bajo
  // StrictMode React ejecuta el inicializador dos veces en un render que
  // después descarta, y la segunda pasada ya encuentra el sessionStorage
  // vacío (lo borró la primera) — el efecto sí es seguro porque corre
  // sobre el árbol ya commiteado.
  useEffect(() => {
    const payload = sessionStorage.getItem('gesicomm:tabInicial');
    if (!payload) return;
    sessionStorage.removeItem('gesicomm:tabInicial');
    const tab = TABS.some(t => t.id === payload) ? payload : TAB_ALIASES[payload];
    if (tab) setTabActiva(tab);
  }, []);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);
  const [error, setError] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [faq, setFaq] = useState([]);
  const [imagenesNuevas, setImagenesNuevas] = useState([]); // Para imágenes en cola (nuevo prod)
  const [subiendoImg, setSubiendoImg] = useState(false);
  // Imagen elegida para cada variante, indexada por su _rhfKey. Se sube
  // recién después de guardar: hasta ese momento la variante puede no
  // existir todavía en base y la imagen necesita un variante_id real.
  const [imagenesVariante, setImagenesVariante] = useState({});
  const [tieneVariantes, setTieneVariantes] = useState(false);
  const [descuentoSimulado, setDescuentoSimulado] = useState(0);
  const [mostrarDetalleEscenarios, setMostrarDetalleEscenarios] = useState(false);
  const [config, setConfig] = useState(null);
  const [cotizacionUsd, setCotizacionUsd] = useState('');
  const [usuarioActual, setUsuarioActual] = useState(null);
  const esAdmin = usuarioActual?.rol === 'administrador';

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      nombre: '',
      categoria_id: '',
      proveedor_id: '',
      sku: '',
      descripcion_corta: '',
      descripcion_larga: '',
      sobre_este_producto: '',
      propuesta_valor: '',
      beneficios: [],
      confianza: [{ texto: 'Envío a todo el país', icono: 'truck' }, { texto: 'Pago seguro', icono: 'shield-check' }, { texto: 'Cambios y devoluciones', icono: 'rotate-ccw' }, { texto: 'Soporte 24/7', icono: 'headphones' }],
      faq_titulo: '',
      ficha_rubro: 'basico',
      ficha_datos: {},
      tags: '',
      precio_base: '',
      precio_costo: '',
      precio_dolar: '',
      es_dolar: false,
      precio_ancla: '',
      precio_minimo: '',
      descuento_porcentaje: '',
      descuento_inicio: '',
      descuento_fin: '',
      impuestos_incluidos: true,
      cantidad_disponible: 0,
      stock_salon: 0,
      stock_deposito: 0,
      stock_minimo: 0,
      stock_minimo_salon: '',
      unidad_medida: 'unidad',
      activo: true,
      estado_venta: 'en_venta',
      destacado: false,
      variantes: [],
    },
  });

  // keyName custom: por default react-hook-form usa "id" como su propia key
  // interna y PISA el id real de la variante (viene de la base de datos) con
  // un uuid generado — sin esto, el backend no puede saber qué fila es una
  // variante existente a actualizar vs. una nueva a crear.
  const { fields: variantesFields, append: appendVariante, remove: removeVariante, replace: replaceVariantes } =
    useFieldArray({ control, name: 'variantes', keyName: '_rhfKey' });

  const { fields: beneficiosFields, append: appendBeneficio, remove: removeBeneficio, replace: replaceBeneficios } = 
    useFieldArray({ control, name: 'beneficios', keyName: '_rhfKey' });

  const { fields: confianzaFields, append: appendConfianza, remove: removeConfianza, replace: replaceConfianza } = 
    useFieldArray({ control, name: 'confianza', keyName: '_rhfKey' });

  const nombre = watch('nombre');
  const fichaRubroVal = watch('ficha_rubro') || 'basico';

  // ── Cargar datos ──────────────────────────────────────────
  // Todo en una sola oleada de Promise.all: ninguna de estas 5 llamadas
  // depende del resultado de otra (todas solo necesitan el `id` de la URL),
  // así que esperar a que termine categorías+config antes de recién pedir
  // el producto (dos oleadas secuenciales) solo duplicaba la latencia sin
  // necesidad — medido ~2x más lento que pedirlas todas juntas.
  useEffect(() => {
    const init = async () => {
      const [catData, conf, p, vars, imgs, provData, faqData, sesion] = await Promise.all([
        categoriaService.buscar({ solo_activas: true, limit: 1000 }),
        comboAdminService.obtenerConfiguracion().catch(() => null),
        esEdicion ? productService.detalle(id).catch(() => null) : Promise.resolve(null),
        esEdicion ? productService.variantes(id).catch(() => []) : Promise.resolve([]),
        esEdicion ? productService.imagenes(id).catch(() => []) : Promise.resolve([]),
        proveedoresService.buscar({}).catch(() => ({ proveedores: [] })),
        esEdicion ? productService.faq(id).catch(() => []) : Promise.resolve([]),
        esEdicion ? verificarSesion().catch(() => null) : Promise.resolve(null),
      ]);
      setCategorias(catData.categorias || catData);
      setProveedores(provData.proveedores || provData || []);
      if (conf) setConfig(conf);

      if (esEdicion) {
        try {
          if (!p) throw new Error('No se pudo cargar el producto.');
          // Defensa en profundidad: aunque el botón de editar ya está
          // oculto en ProductList para productos que no son propios, esto
          // bloquea también el acceso por URL directa — antes de llenar el
          // formulario con datos de un producto ajeno, nunca después (ver
          // mismo criterio en producto.service.js#actualizar, que además
          // rechaza el guardado con 403).
          const esAdminSesion = sesion?.rol === 'administrador';
          if (sesion && !esAdminSesion && p.creado_por !== sesion.id) {
            navigate('/mi-catalogo', { replace: true });
            return;
          }
          reset({
            nombre: p.nombre || '',
            categoria_id: p.categoria_id || '',
            proveedor_id: p.proveedor_id || '',
            sku: p.sku || '',
            descripcion_corta: p.descripcion_corta || '',
            descripcion_larga: p.descripcion_larga || '',
            faq_titulo: p.faq_titulo || '',
            tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
            precio_base: p.precio_base || '',
            precio_costo: p.precio_costo || '',
            precio_dolar: p.precio_dolar || '',
            es_dolar: !!p.es_dolar,
            precio_ancla: p.precio_ancla ?? p.precio_tachado ?? '',
            precio_minimo: p.precio_minimo || '',
            descuento_porcentaje: p.descuento_porcentaje || '',
            descuento_inicio: p.descuento_inicio ? p.descuento_inicio.slice(0, 10) : '',
            descuento_fin: p.descuento_fin ? p.descuento_fin.slice(0, 10) : '',
            impuestos_incluidos: p.impuestos_incluidos,
            cantidad_disponible: p.cantidad_disponible || 0,
            stock_salon: p.stock_salon || 0,
            stock_deposito: p.stock_deposito || 0,
            stock_minimo: p.stock_minimo || 0,
            stock_minimo_salon: p.stock_minimo_salon ?? '',
            unidad_medida: p.unidad_medida || 'unidad',
            activo: p.activo,
            estado_venta: p.estado_venta || 'en_venta',
            destacado: p.destacado,
            variantes: vars?.length ? vars : [],
            propuesta_valor: p.propuesta_valor || '',
            beneficios: p.beneficios || [],
            confianza: p.confianza?.length ? p.confianza : [{ texto: 'Envío a todo el país', icono: 'truck' }, { texto: 'Pago seguro', icono: 'shield-check' }, { texto: 'Cambios y devoluciones', icono: 'rotate-ccw' }, { texto: 'Soporte 24/7', icono: 'headphones' }],
            preguntas_frecuentes: p.preguntas_frecuentes || [],
            sobre_este_producto: p.sobre_este_producto || '',
            ficha_rubro: p.ficha_rubro || 'basico',
            ficha_datos: p.ficha_datos || {},
          });
          if (vars?.length > 0) setTieneVariantes(true);
          setImagenes(imgs || []);
          setFaq(Array.isArray(faqData) ? faqData.map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })) : []);
        } catch {
          setError('No se pudo cargar el producto.');
        } finally {
          setCargando(false);
        }
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    verificarSesion().then((res) => setUsuarioActual(res)).catch(() => setUsuarioActual(null));
  }, []);

  // ── Rentabilidad Reactiva ─────────────────────────────────
  const precioBaseVal = parseFloat(watch('precio_base')) || 0;
  const precioCostoVal = parseFloat(watch('precio_costo')) || 0;
  const descuentoPctVal = parseFloat(watch('descuento_porcentaje')) || 0;
  const precioAnclaVal = parseFloat(watch('precio_ancla')) || 0;

  const rentabilidad = React.useMemo(() => {
    if (!config) return null;

    // igual que en combos y en la plantilla original: el CPA no depende del
    // descuento que se aplique (es el costo de adquisición, no de venta).
    const result = calcularPrincipal({ salePrice: precioBaseVal, cost: precioCostoVal }, {
      cpaPercentage: Number(config.cpa_porcentaje) || 0,
      shipping: Number(config.costo_envio) || 0,
      confirmation: Number(config.costo_confirmacion) || 0,
      packaging: Number(config.costo_empaque) || 0
    });

    // Precio de venta real con el descuento actual aplicado: la utilidad y el
    // margen se recalculan sobre este precio, pero contra los costos totales
    // fijos de arriba (mismo criterio que el simulador de descuentos).
    const finalPrice = precioBaseVal * (1 - (descuentoPctVal / 100));
    const profit = finalPrice - result.totalCosts;
    const margin = finalPrice > 0 ? profit / finalPrice : 0;

    // Simulamos sobre el precio base completo, usando los mismos escenarios de
    // descuento configurados en Configuración económica de combos — antes esto
    // tenía [0,10,20,30,40] hardcodeado, ignorando lo que se configure ahí.
    const escenariosBase = Array.isArray(config.escenarios_descuento) && config.escenarios_descuento.length > 0
      ? config.escenarios_descuento.map(Number).filter(n => Number.isFinite(n))
      : [0, 10, 20, 30, 40];
    // El descuento real del producto tiene que estar sí o sí en la matriz: si no
    // coincide con ninguno de los escenarios configurados, la fila "(actual)"
    // nunca aparece y el admin no ve el escenario que de verdad está vendiendo.
    const escenarios = [...new Set([...escenariosBase, descuentoPctVal])].sort((a, b) => a - b);
    const simulador = simularDescuentosPrincipal(precioBaseVal, result.totalCosts, escenarios);

    return { ...result, finalPrice, profit, margin, simulador };
  }, [precioBaseVal, precioCostoVal, descuentoPctVal, config]);

  const esDolarVal = watch('es_dolar');
  const provIdVal = watch('proveedor_id');
  const precioDolarVal = parseFloat(watch('precio_dolar')) || 0;
  
  useEffect(() => {
    if (esDolarVal && provIdVal) {
       const prov = proveedores.find(p => p.id === parseInt(provIdVal, 10) || p.id === provIdVal);
       if (prov && prov.precio_dolar) {
           setCotizacionUsd(prov.precio_dolar); // Show it in the UI so the user knows what rate was used
           if (precioDolarVal > 0) {
             const costoCalculado = Math.round(precioDolarVal * parseFloat(prov.precio_dolar));
             const costoActual = parseFloat(watch('precio_costo')) || 0;
             if (costoCalculado !== costoActual) {
                setValue('precio_costo', costoCalculado, { shouldDirty: true, shouldValidate: true });
             }
           }
       }
    }
  }, [esDolarVal, provIdVal, precioDolarVal, proveedores, setValue, watch]);

  // ── Submit ────────────────────────────────────────────────

  /**
   * Sube las imágenes que el usuario eligió por variante. Corre DESPUÉS de
   * guardar porque una variante recién creada no tiene id hasta que el
   * backend la inserta, y la imagen se asocia por variante_id.
   *
   * Se releen las variantes ya guardadas y se emparejan por nombre — es la
   * clave con la que el backend sincroniza (ver ProductoVarianteService), y
   * la fila del formulario todavía no conoce el id de una variante nueva.
   */
  const subirImagenesDeVariantes = async (productoId, variantesDelForm) => {
    const pendientes = variantesFields
      .map((field, i) => ({ archivo: imagenesVariante[field._rhfKey]?.file, nombre: (variantesDelForm[i]?.nombre || '').trim() }))
      .filter(v => v.archivo && v.nombre);
    if (!pendientes.length) return;

    const guardadas = await productService.variantes(productoId).catch(() => []);
    const porNombre = new Map(guardadas.map(v => [String(v.nombre).trim().toLowerCase(), v.id]));

    for (const { archivo, nombre } of pendientes) {
      const varianteId = porNombre.get(nombre.toLowerCase());
      if (!varianteId) continue;
      try {
        const fd = new FormData();
        fd.append('imagen', archivo);
        fd.append('variante_id', varianteId);
        await productService.subirImagen(productoId, fd);
      } catch (e) {
        console.error(`Error subiendo la imagen de la variante "${nombre}"`, e);
      }
    }
  };

  const onSubmit = async (data) => {
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        nombre: data.nombre.trim(),
        categoria_id: data.categoria_id || null,
        proveedor_id: data.proveedor_id || null,
        sku: data.sku || null,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        descripcion_corta: data.descripcion_corta || null,
        descripcion_larga: data.descripcion_larga || null,
        faq_titulo: data.faq_titulo || null,
        faq: faq
          .filter(f => f.pregunta?.trim() && f.respuesta?.trim())
          .map((f, idx) => ({ pregunta: f.pregunta.trim(), respuesta: f.respuesta.trim(), orden: idx })),
        precio_base: parseFloat(data.precio_base),
        precio_costo: data.precio_costo ? parseFloat(data.precio_costo) : null,
        precio_dolar: data.precio_dolar ? parseFloat(data.precio_dolar) : null,
        es_dolar: !!data.es_dolar,
        precio_ancla: data.precio_ancla ? parseFloat(data.precio_ancla) : null,
        precio_minimo: data.precio_minimo ? parseFloat(data.precio_minimo) : null,
        descuento_porcentaje: data.descuento_porcentaje ? parseFloat(data.descuento_porcentaje) : 0,
        descuento_inicio: data.descuento_inicio || null,
        descuento_fin: data.descuento_fin || null,
        impuestos_incluidos: data.impuestos_incluidos,
        // El total lo recalcula el backend como salón + depósito; no se
        // manda cantidad_disponible para que no queden dos fuentes de verdad.
        stock_salon: parseInt(data.stock_salon) || 0,
        stock_deposito: parseInt(data.stock_deposito) || 0,
        stock_minimo: parseInt(data.stock_minimo) || 0,
        stock_minimo_salon: data.stock_minimo_salon === '' || data.stock_minimo_salon == null
          ? null
          : parseInt(data.stock_minimo_salon),
        unidad_medida: data.unidad_medida,
        activo: data.activo,
        estado_venta: data.estado_venta,
        destacado: data.destacado,
        propuesta_valor: data.propuesta_valor || null,
        sobre_este_producto: data.sobre_este_producto || null,
        beneficios: data.beneficios || [],
        confianza: data.confianza || [],
        ficha_rubro: data.ficha_rubro === 'basico' ? null : (data.ficha_rubro || null),
        ficha_datos: data.ficha_datos || {},
        // El total no se manda: el backend lo recalcula como salón + depósito
        // para que no pueda quedar desincronizado con el desglose.
        variantes: data.variantes.map(v => ({
          ...v,
          stock_salon: parseInt(v.stock_salon, 10) || 0,
          stock_deposito: parseInt(v.stock_deposito, 10) || 0,
          precio_diferencial: v.precio_diferencial ? parseFloat(v.precio_diferencial) : 0,
        })),
      };

      if (esEdicion) {
        await productService.actualizar(id, payload);
        for (const file of imagenesNuevas.map(i => i.file)) {
          const fd = new FormData();
          fd.append('imagen', file);
          await productService.subirImagen(id, fd);
        }
        await subirImagenesDeVariantes(id, data.variantes);
        navigate('/mi-catalogo?filtro=mios');
      } else {
        const nuevo = await productService.crear(payload);
        for (const imgObj of imagenesNuevas) {
          try {
            const fd = new FormData();
            fd.append('imagen', imgObj.file);
            await productService.subirImagen(nuevo.id, fd);
          } catch (e) {
            console.error('Error subiendo imagen', e);
          }
        }
        await subirImagenesDeVariantes(nuevo.id, data.variantes);
        navigate('/mi-catalogo?filtro=mios');
      }
    } catch (err) {
      const errores = err.response?.data?.errores;
      const msg = errores
        ? errores.join('\n')
        : (err.response?.data?.message || 'Error al guardar el producto.');
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  // ── Imágenes ──────────────────────────────────────────────
  const MAX_IMAGEN_BYTES = 1 * 1024 * 1024; // 1MB en total

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const totalActual = imagenes.length + imagenesNuevas.length;
    if (totalActual + files.length > 6) {
      setError(`Solo se permiten hasta 6 imágenes por producto. Tienes ${totalActual} y estás intentando subir ${files.length} más.`);
      e.target.value = '';
      return;
    }

    let pesoTotalNuevas = files.reduce((acc, file) => acc + file.size, 0);
    if (!esEdicion) {
      pesoTotalNuevas += imagenesNuevas.reduce((acc, img) => acc + img.file.size, 0);
    }

    if (pesoTotalNuevas > MAX_IMAGEN_BYTES) {
      setError(`El peso total de las imágenes (nuevas) supera 1MB. Peso actual: ${(pesoTotalNuevas / 1024 / 1024).toFixed(2)}MB.`);
      e.target.value = '';
      return;
    }

    if (!esEdicion) {
      const nuevasPreview = files.map((file, idx) => ({
        id: Date.now() + idx,
        file,
        url: URL.createObjectURL(file),
        es_principal: (imagenesNuevas.length === 0 && idx === 0)
      }));
      setImagenesNuevas(imgs => [...imgs, ...nuevasPreview]);
      e.target.value = '';
      return;
    }

    setSubiendoImg(true);
    setError(null);
    let subidas = [];
    let errores = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('imagen', file);
        const nueva = await productService.subirImagen(id, fd);
        subidas.push(nueva);
      } catch (err) {
        errores.push(err.response?.data?.message || `Error al subir la imagen.`);
      }
    }
    
    if (subidas.length > 0) {
      setImagenes(imgs => [...imgs, ...subidas]);
    }
    if (errores.length > 0) {
      setError(errores.join('\n'));
    }

    setSubiendoImg(false);
    e.target.value = '';
  };

  const eliminarImagen = async (imgId, esNueva = false) => {
    if (esNueva) {
      setImagenesNuevas(imgs => imgs.filter(i => i.id !== imgId));
      return;
    }
    try {
      await productService.eliminarImagen(id, imgId);
      setImagenes(imgs => imgs.filter(i => i.id !== imgId));
    } catch { setError('Error al eliminar imagen.'); }
  };

  const marcarPrincipal = async (imgId) => {
    try {
      await productService.actualizarImagen(id, imgId, { es_principal: true });
      setImagenes(imgs => imgs.map(i => ({ ...i, es_principal: i.id === imgId })));
    } catch { setError('Error al actualizar imagen.'); }
  };

  const handleCrearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    setGuardandoCategoria(true);
    try {
      const res = await categoriaService.crear({ nombre: nuevaCategoria.trim(), activo: true });
      setCategorias(prev => [...prev, res]);
      setValue('categoria_id', res.id);
      setCreandoCategoria(false);
      setNuevaCategoria('');
    } catch (err) {
      setError('Error al crear categoría: ' + (err.response?.data?.message || err.message));
    } finally {
      setGuardandoCategoria(false);
    }
  };

  const handleCrearProveedor = async () => {
    if (!nuevoProveedor.trim()) return;
    setGuardandoProveedor(true);
    try {
      const res = await proveedoresService.crear({ nombre: nuevoProveedor.trim() });
      setProveedores(prev => [...prev, res]);
      setValue('proveedor_id', res.id);
      setCreandoProveedor(false);
      setNuevoProveedor('');
    } catch (err) {
      setError('Error al crear proveedor: ' + (err.response?.data?.message || err.message));
    } finally {
      setGuardandoProveedor(false);
    }
  };

  const valoresProducto = watch();
  // El disponible se deriva del desglose en vivo, no se lee del formulario:
  // así el número y la barra de abajo reaccionan mientras se tipea, sin
  // esperar a guardar. El backend vuelve a hacer la misma suma al persistir.
  const stockSalonVal = parseInt(watch('stock_salon'), 10) || 0;
  const stockDepositoVal = parseInt(watch('stock_deposito'), 10) || 0;
  const stockActualVal = stockSalonVal + stockDepositoVal;
  const stockMinimoVal = parseInt(watch('stock_minimo'), 10) || 0;
  const unidadVal = watch('unidad_medida') || 'unidad';
  const estadoVentaVal = watch('estado_venta') || 'en_venta';
  const activoVal = watch('activo');
  const destacadoVal = watch('destacado');
  const tagsVal = watch('tags') || '';
  const precioFinalVal = precioBaseVal * (1 - (descuentoPctVal / 100));
  const effectiveAnclaVal = precioAnclaVal > precioFinalVal 
    ? precioAnclaVal 
    : (precioBaseVal > precioFinalVal ? precioBaseVal : 0);
  const gananciaSimpleVal = precioFinalVal - precioCostoVal;
  const margenSimpleVal = precioFinalVal > 0 ? gananciaSimpleVal / precioFinalVal : 0;
  const stockRatio = stockMinimoVal > 0
    ? Math.min(100, (stockActualVal / Math.max(stockMinimoVal * 2, 1)) * 100)
    : (stockActualVal > 0 ? 100 : 0);
  const stockEstadoTexto = stockActualVal <= 0
    ? 'Agotado'
    : (stockMinimoVal > 0 && stockActualVal <= stockMinimoVal ? 'Stock bajo' : 'Stock saludable');
  const categoriaActual = categorias.find(c => String(c.id) === String(watch('categoria_id')));
  const estadoVentaActual = ESTADOS_VENTA.find(e => e.value === estadoVentaVal) || ESTADOS_VENTA[0];
  const imagenPrincipal = [...imagenes].sort((a, b) => a.orden - b.orden).find(img => img.es_principal)
    || imagenes[0]
    || imagenesNuevas.find(img => img.es_principal)
    || imagenesNuevas[0];
  const imagenPrincipalUrl = imagenPrincipal?.url ? getMediaUrl(imagenPrincipal.url) : null;
  const tieneTextoProducto = Boolean(
    (valoresProducto.descripcion_corta || '').trim()
    || (valoresProducto.descripcion_larga || '').trim()
  );
  const tieneMarketing = Boolean(
    (valoresProducto.propuesta_valor || '').trim()
    || (fichaRubroVal === 'basico' && (valoresProducto.sobre_este_producto || '').trim())
    || hayContenido(valoresProducto.ficha_datos?.beneficios_rapidos)
    || (valoresProducto.ficha_datos?.cta_principal_texto || '').trim()
    || beneficiosFields.length
    || faq.length
  );
  const totalImagenes = imagenes.length + imagenesNuevas.length;
  const estadoSecciones = {
    basica: nombre?.trim() && fichaRubroVal && (tieneTextoProducto || totalImagenes > 0) ? 'ok' : (nombre?.trim() || fichaRubroVal ? 'warn' : 'todo'),
    comercial: precioBaseVal > 0 ? 'ok' : 'todo',
    stock: tieneVariantes ? (variantesFields.length ? 'ok' : 'warn') : (stockActualVal > 0 ? 'ok' : 'warn'),
    venta: esEdicion ? 'warn' : 'todo',
    marketing: fichaRubroVal ? (tieneMarketing ? 'ok' : 'warn') : 'todo',
    publicacion: estadoVentaVal && activoVal !== undefined ? 'ok' : 'todo',
  };

  useEffect(() => {
    if (cargando || tabActiva !== 'marketing' || !fichaRubroVal || muestrasAplicadas[fichaRubroVal]) return;

    const muestra = MUESTRAS_VISTA_PRODUCTO[fichaRubroVal] || MUESTRAS_VISTA_PRODUCTO.basico;

    if (!hayContenido(valoresProducto.propuesta_valor)) {
      setValue('propuesta_valor', muestra.propuesta_valor, { shouldDirty: false });
    }
    if (fichaRubroVal === 'basico' && !hayContenido(valoresProducto.sobre_este_producto)) {
      setValue('sobre_este_producto', muestra.sobre_este_producto, { shouldDirty: false });
    }
    if (!hayContenido(valoresProducto.beneficios)) {
      replaceBeneficios(muestra.beneficios || []);
    }
    if (!hayContenido(valoresProducto.confianza)) {
      replaceConfianza([
        { texto: 'Envío a todo el país', icono: 'truck' },
        { texto: 'Pago seguro', icono: 'shield-check' },
        { texto: 'Cambios y devoluciones', icono: 'rotate-ccw' },
        { texto: 'Soporte 24/7', icono: 'headphones' },
      ]);
    }
    if (!hayContenido(faq)) {
      setFaq(muestra.faq || []);
    }

    const datosMuestra = mezclarDatosMuestra(valoresProducto.ficha_datos, muestra.ficha_datos);
    if (JSON.stringify(datosMuestra) !== JSON.stringify(valoresProducto.ficha_datos || {})) {
      setValue('ficha_datos', datosMuestra, { shouldDirty: false });
    }

    setMuestrasAplicadas(prev => ({ ...prev, [fichaRubroVal]: true }));
  }, [
    cargando,
    tabActiva,
    fichaRubroVal,
    muestrasAplicadas,
    valoresProducto,
    faq,
    replaceBeneficios,
    replaceConfianza,
    setValue,
  ]);

  if (cargando) return (
    <div className="prod-page"><div className="prod-loading"><div className="spinner" /></div></div>
  );

  return (
    <div className="prod-page">

      <div className="prod-header">
        <div className="prod-header-left">
          <button className="btn-back" onClick={() => navigate('/mi-catalogo')}
            type="button" aria-label="Volver al listado">
            <ChevronLeft size={18} />
          </button>
          <div className="prod-icon-wrap"><Package size={22} /></div>
          <div>
            <h1 className="prod-title">{esEdicion ? 'Editar producto' : 'Nuevo producto'}</h1>
            {esEdicion && <p className="prod-subtitle">ID #{id}</p>}
          </div>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={guardando}
        >
          <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {error && (
        <div className="form-error-banner" role="alert">
          <Info size={15} />
          <span style={{ flex: 1, whiteSpace: 'pre-line' }}>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar error">
            <X size={14} />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`prod-form prod-workspace ${tabActiva === 'marketing' ? 'product-view-mode' : ''}`}
        noValidate
      >
        <nav className="prod-step-nav" aria-label="Flujo de configuracion del producto">
          {TABS.map(tab => {
            const estado = estadoSecciones[tab.id] || 'todo';
            const StatusIcon = estado === 'ok' ? CheckCircle2 : estado === 'warn' ? AlertTriangle : Circle;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={tabActiva === tab.id}
                className={`prod-step ${tabActiva === tab.id ? 'active' : ''} ${estado}`}
                onClick={() => setTabActiva(tab.id)}
                type="button"
              >
                <span className="prod-step-icon">{tab.icon}</span>
                <span className="prod-step-copy">
                  <span>{tab.label}</span>
                  <small>{tab.desc}</small>
                </span>
                <span className={`prod-step-state ${estado}`} title={estado === 'ok' ? 'Completo' : estado === 'warn' ? 'Revisar' : 'Pendiente'}>
                  <StatusIcon size={14} />
                </span>
                <em>{tab.level}</em>
              </button>
            );
          })}
        </nav>

        <div className="prod-workspace-main">

        <div className={`tab-content ${tabActiva === 'basica' ? 'active' : ''}`}>
          <div className="form-grid-2">
            <div className="form-group full">
              <label htmlFor="prod-nombre">Nombre <span className="req">*</span></label>
              <input
                id="prod-nombre"
                {...register('nombre', { required: 'El nombre es requerido.' })}
                placeholder="Ej: Remera básica azul"
              />
              {errors.nombre && <span className="field-error">{errors.nombre.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="prod-categoria">Categoría</label>
              {creandoCategoria ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Nueva categoría..."
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    disabled={guardandoCategoria}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCrearCategoria();
                      }
                    }}
                  />
                  <button type="button" className="btn-primary" onClick={handleCrearCategoria} disabled={guardandoCategoria} style={{ padding: '0 10px' }}>
                    {guardandoCategoria ? '...' : <Save size={15}/>}
                  </button>
                  <button type="button" className="btn-icon danger" onClick={() => { setCreandoCategoria(false); setNuevaCategoria(''); }} disabled={guardandoCategoria}>
                    <X size={15}/>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select id="prod-categoria" {...register('categoria_id')} style={{ flex: 1 }}>
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button type="button" className="btn-icon" onClick={() => setCreandoCategoria(true)} title="Crear nueva categoría">
                    <Plus size={16}/>
                  </button>
                </div>
              )}
              <p className="field-hint">Define la familia comercial y ayuda a ordenar catálogo, relacionados y filtros.</p>
            </div>

            <div className="form-group">
              <label htmlFor="prod-proveedor">Proveedor</label>
              {creandoProveedor ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Nuevo proveedor..."
                    value={nuevoProveedor}
                    onChange={(e) => setNuevoProveedor(e.target.value)}
                    disabled={guardandoProveedor}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCrearProveedor();
                      }
                    }}
                  />
                  <button type="button" className="btn-primary" onClick={handleCrearProveedor} disabled={guardandoProveedor} style={{ padding: '0 10px' }}>
                    {guardandoProveedor ? '...' : <Save size={15}/>}
                  </button>
                  <button type="button" className="btn-icon danger" onClick={() => { setCreandoProveedor(false); setNuevoProveedor(''); }} disabled={guardandoProveedor}>
                    <X size={15}/>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select id="prod-proveedor" {...register('proveedor_id')} style={{ flex: 1 }}>
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button type="button" className="btn-icon" onClick={() => setCreandoProveedor(true)} title="Crear nuevo proveedor">
                    <Plus size={16}/>
                  </button>
                </div>
              )}
              <p className="field-hint">Si el costo está en USD, el proveedor también puede definir la cotización usada para calcularlo.</p>
            </div>

            <div className="form-group">
              <label htmlFor="prod-tags">
                Tags <span className="hint">(separados por coma)</span>
              </label>
              <input
                id="prod-tags"
                {...register('tags')}
                placeholder="verano, oferta, nuevo"
              />
            </div>

            <div className="form-group full">
              <label htmlFor="prod-desc-corta">
                Descripción corta <span className="hint">(para listados)</span>
              </label>
              <input
                id="prod-desc-corta"
                {...register('descripcion_corta')}
                maxLength={500}
                placeholder="Breve descripción del producto..."
              />
            </div>

            <div className="form-group full">
              <label htmlFor="prod-desc-larga">
                Descripción <span className="hint">(detalle completo)</span>
              </label>
              <textarea
                id="prod-desc-larga"
                {...register('descripcion_larga')}
                rows={5}
                placeholder="Descripción detallada del producto..."
              />
            </div>
          </div>

        </div>

        <div className={`tab-content ${tabActiva === 'comercial' ? 'active' : ''}`}>
          {esAdmin && (
            <div className="form-group" style={{ marginBottom: '1rem', background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)', padding: '0.75rem', borderRadius: 8 }}>
              <label htmlFor="prod-precio-dolar">
                Precio de compra en USD <span className="hint">(costo del proveedor, solo admins)</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" {...register('es_dolar')} />
                  <span style={{ fontSize: '0.85rem' }}>Precio de proveedor fijado en dólares</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Controller
                  name="precio_dolar"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="prod-precio-dolar"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej: 14.08"
                      style={{ padding: '0.6rem', width: 140 }}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <span style={{ opacity: 0.6 }}>×</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Cotización Gs/USD"
                  style={{ padding: '0.6rem', width: 160 }}
                  value={cotizacionUsd}
                  onChange={(e) => setCotizacionUsd(e.target.value)}
                  disabled={esDolarVal}
                />
                {!esDolarVal && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const dolar = parseFloat(watch('precio_dolar'));
                      const cot = parseFloat(cotizacionUsd);
                      if (!dolar || !cot) return;
                      const costo = Math.round(dolar * cot);
                      setValue('precio_costo', costo, { shouldDirty: true });
                      setValue('precio_base', Math.round(costo * 1.1), { shouldDirty: true });
                    }}
                  >
                    Recalcular con cotización
                  </button>
                )}
              </div>
              <p className="field-hint">
                {esDolarVal 
                  ? "La cotización y el costo en guaraníes se calculan automáticamente según lo definido en el Proveedor seleccionado."
                  : "Guarda el costo en dólares para poder recalcular precio de compra y venta (margen 10%) el día que cambie la cotización, sin tener que volver a cargar el producto."}
              </p>
            </div>
          )}
          <div className="pricing-grid-bg">
            <div className={esAdmin ? 'form-grid-3' : 'form-grid-2'}>
              <div className="form-group">
                <label htmlFor="prod-precio-costo">
                  Costo de compra del producto {esAdmin && <span className="hint">(solo admins)</span>}
                  {esDolarVal && <span className="hint" style={{ color: 'var(--primary)', marginLeft: 8 }}>(Calculado según cotización del proveedor)</span>}
                </label>
                <div className={`pricing-input-wrapper costo ${esDolarVal ? 'disabled' : ''}`}>
                  <div className="pricing-badge-geom">
                    <Package size={16} />
                  </div>
                  <Controller
                    name="precio_costo"
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput
                        id="prod-precio-costo"
                        className="w-full"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={esDolarVal}
                      />
                    )}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="prod-precio-base">
                  {esAdmin ? 'Precio de Venta Para las Tiendas' : 'Precio de venta a las personas'} <span className="req">*</span>
                </label>
                <div className="pricing-input-wrapper venta">
                  <div className="pricing-badge-geom">
                    <Tag size={16} />
                  </div>
                  <Controller
                    name="precio_base"
                    control={control}
                    rules={{ required: 'El precio base es requerido.', min: { value: 0, message: 'El precio no puede ser negativo.' } }}
                    render={({ field }) => (
                      <CurrencyInput
                        id="prod-precio-base"
                        className="w-full"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </div>
                {errors.precio_base && <span className="field-error">{errors.precio_base.message}</span>}
              </div>

              {esAdmin && (
              <div className="form-group">
                <label htmlFor="prod-precio-minimo">Precio mínimo de Venta Para las Tiendas</label>
                <div className="pricing-input-wrapper venta">
                  <div className="pricing-badge-geom">
                    <Tag size={16} style={{ opacity: 0.6 }} />
                  </div>
                  <Controller
                    name="precio_minimo"
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput
                        id="prod-precio-minimo"
                        className="w-full"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </div>
                <p className="field-hint">El precio con descuento no puede caer por debajo de este valor.</p>
              </div>
              )}
            </div>

            <div className="commercial-summary">
              <div className="final">
                <span>Precio final</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  {effectiveAnclaVal > precioFinalVal && (
                    <span style={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'var(--color-text-mut)', lineHeight: 1 }}>
                      {fmtGs(effectiveAnclaVal)}
                    </span>
                  )}
                  <strong>{fmtGs(precioFinalVal)}</strong>
                </div>
              </div>
              <div className="costo">
                <span>Costo</span>
                <strong>{fmtGs(precioCostoVal)}</strong>
              </div>
              <div className="ganancia">
                <span>Ganancia</span>
                <strong className={gananciaSimpleVal >= 0 ? 'positive' : 'negative'}>{fmtGs(gananciaSimpleVal)}</strong>
              </div>
              <div className="margen">
                <span>Margen</span>
                <strong className={margenSimpleVal >= 0 ? 'positive' : 'negative'}>{fmtPct(margenSimpleVal)}</strong>
              </div>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="prod-precio-ancla">
                Precio ancla <span className="hint">(referencia visible)</span>
              </label>
              <div className="pricing-input-wrapper costo">
                <div className="pricing-badge-geom">
                  <DollarSign size={16} />
                </div>
                <Controller
                  name="precio_ancla"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="prod-precio-ancla"
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
              <p className="field-hint">Se usa como referencia de valor cuando el precio de venta queda por debajo.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {precioAnclaVal > 0 && precioBaseVal > 0 && precioAnclaVal > precioBaseVal && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.7rem 1rem', borderRadius: '0.5rem',
                  background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)',
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#f97316' }}>Descuento visible:</span>
                  <strong style={{ fontSize: '1.1rem', color: '#f97316' }}>
                    -{Math.round((1 - precioBaseVal / precioAnclaVal) * 100)}%
                  </strong>
                </div>
              )}
            </div>
          </div>

          <label className="check-label" style={{ marginTop: '0.5rem' }}>
            <input type="checkbox" {...register('impuestos_incluidos')} />
            Precio incluye IVA
          </label>

          <div className="form-section-title"><Tag size={14} /> Descuento</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="prod-descuento">Descuento (%)</label>
              <input
                id="prod-descuento"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                {...register('descuento_porcentaje')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-desc-inicio">Vigencia desde</label>
              <input id="prod-desc-inicio" type="date" {...register('descuento_inicio')} />
            </div>
            <div className="form-group">
              <label htmlFor="prod-desc-fin">Vigencia hasta</label>
              <input id="prod-desc-fin" type="date" {...register('descuento_fin')} />
            </div>
          </div>
          <p className="field-hint">
            Este descuento se aplica de verdad en el checkout (mismo motor de precios que ve el cliente), no es solo informativo.
          </p>

          {config && rentabilidad && (() => {
            const sBase = rentabilidad;
            const targetMargin = Number(config.margen_minimo) / 100;
            const marginBase = sBase.margin;
            const utilityBase = sBase.profit;
            
            // Helper function to get margin health
            const getHealth = (m) => {
              if (m <= 0) return { label: '✕ Pérdida', class: 'negative', color: '#ef4444' };
              if (m < 0.15) return { label: '⚠ Margen crítico', class: 'negative', color: '#ef4444' };
              if (m < targetMargin) return { label: '⚠ Margen reducido', class: 'warning', color: '#f59e0b' };
              if (m >= 0.5) return { label: '✓ Excelente margen', class: 'positive', color: '#10b981' };
              return { label: '✓ Margen saludable', class: 'positive', color: '#10b981' };
            };

            const healthBase = getHealth(marginBase);

            // Calculate simulated
            const simulatedPrice = Math.round(precioBaseVal * (1 - (descuentoSimulado / 100)));
            const simulatedUtility = simulatedPrice - sBase.totalCosts;
            const simulatedMargin = simulatedPrice > 0 ? simulatedUtility / simulatedPrice : 0;
            const healthSimulated = getHealth(simulatedMargin);

            // Calculate break-even discount (where margin hits target)
            const minPriceTarget = sBase.totalCosts / (1 - targetMargin);
            const maxDiscountTarget = precioBaseVal > 0 ? Math.max(0, 1 - (minPriceTarget / precioBaseVal)) * 100 : 0;

            return (
              <div className="combo-section" style={{ marginTop: '2rem' }}>
                <h2 className="combo-section-title"><Activity size={16} /> Rentabilidad y descuentos</h2>
                <p className="combo-section-desc">
                  Base de simulación: Los descuentos comerciales se calculan sobre el precio base de <strong>{fmtGs(precioBaseVal)}</strong>. El precio actual del producto con tu descuento ({descuentoPctVal}%) es {fmtGs(sBase.finalPrice)}.
                  {' '}<Link to="/configuracion-economica">Editar costos operativos</Link>.
                </p>

                {/* 1. Resumen ejecutivo (3 tarjetas) */}
                <div className="combo-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="combo-metric-card">
                    <span className="combo-metric-label">Precio Actual</span>
                    <span className="combo-metric-value">{fmtGs(sBase.finalPrice)}</span>
                  </div>
                  <div className={`combo-metric-card profit-${healthBase.class}`}>
                    <span className="combo-metric-label">Utilidad</span>
                    <span className="combo-metric-value">{fmtGs(utilityBase)}</span>
                  </div>
                  <div className={`combo-metric-card profit-${healthBase.class}`}>
                    <span className="combo-metric-label">Margen Neto</span>
                    <span className="combo-metric-value">{fmtPct(marginBase)}</span>
                    <span className={`combo-health-badge ${healthBase.class}`}>{healthBase.label}</span>
                  </div>
                </div>

                {marginBase < targetMargin && (
                  <p className="combo-alert warning" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={15} /> El margen actual (<strong>{fmtPct(marginBase)}</strong>) está por debajo del objetivo configurado (<strong>{config.margen_minimo}%</strong>).
                  </p>
                )}

                {/* 2. Tarjeta del Simulador Interactivo */}
                <div style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  marginTop: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} style={{ color: 'var(--color-primary)' }} /> SIMULAR DESCUENTO SOBRE PRECIO BASE
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Descuento a simular (%): <strong style={{ color: 'var(--color-text)', fontSize: '1rem' }}>{descuentoSimulado}%</strong>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="5"
                        value={descuentoSimulado}
                        onChange={(e) => setDescuentoSimulado(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ background: 'var(--color-surface)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Precio simulado: <strong style={{ color: 'var(--color-text)' }}>{fmtGs(simulatedPrice)}</strong></div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                        Utilidad simulada: <strong style={{ color: healthSimulated.color }}>{fmtGs(simulatedUtility)}</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                        Margen simulado: <strong style={{ color: healthSimulated.color }}>{fmtPct(simulatedMargin)}</strong> ({healthSimulated.label})
                      </div>
                    </div>
                  </div>

                  {maxDiscountTarget > 0 && (
                    <p className="field-hint" style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                      💡 Descuento máximo para mantener el margen objetivo de {config.margen_minimo}%: <strong>{maxDiscountTarget.toFixed(1)}%</strong>
                    </p>
                  )}
                </div>

                {/* 3. Botón y Contenedor de Escenarios Detallados con Bordes Espaciosos */}
                {Array.isArray(sBase.simulador) && sBase.simulador.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setMostrarDetalleEscenarios(!mostrarDetalleEscenarios)}
                      style={{
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {mostrarDetalleEscenarios ? '▴ Ocultar escenarios detallados' : '▾ Ver escenarios detallados'}
                    </button>

                    {mostrarDetalleEscenarios && (
                      <div style={{
                        marginTop: '1.25rem',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '1.25rem 1.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        overflowX: 'auto'
                      }}>
                        <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                          Análisis de Sensibilidad (Matriz de Descuentos)
                        </h5>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--color-surface-2)', textAlign: 'left' }}>
                              <th style={{ padding: '0.75rem 1rem', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Descuento</th>
                              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Precio Final</th>
                              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Utilidad</th>
                              <th style={{ padding: '0.75rem 1rem', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Margen Neto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sBase.simulador.map((esc, idx) => {
                              const hEsc = getHealth(esc.margin);
                              const escDiscount = Number(esc.discountPercentage) || 0;
                              const isSelected = escDiscount === descuentoPctVal;
                              return (
                                <tr
                                  key={idx}
                                  style={{
                                    borderBottom: idx < sBase.simulador.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    background: isSelected ? 'rgba(13, 27, 61, 0.04)' : 'transparent'
                                  }}
                                >
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: isSelected ? 700 : 500, color: 'var(--color-text)' }}>
                                    {escDiscount}% {isSelected && <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginLeft: '0.25rem' }}>(actual)</span>}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text)' }}>{fmtGs(esc.finalPrice)}</td>
                                  <td style={{ padding: '0.75rem 1rem', color: hEsc.color, fontWeight: 600 }}>{fmtGs(esc.profit)}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <span className={`combo-health-badge ${hEsc.class}`} style={{ display: 'inline-block' }}>
                                      {fmtPct(esc.margin)} — {hEsc.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className={`tab-content ${tabActiva === 'stock' ? 'active' : ''}`}>
          <div className="form-grid-3">
            {/* Salón y depósito se cargan por separado; el disponible es la
                suma y por eso es de solo lectura. Online se vende el TOTAL:
                tener la mercadería guardada no frena una venta. Lo que sí
                define el desglose es de dónde sale — primero el salón. */}
            <div className="form-group">
              <label htmlFor="prod-stock-salon">
                Stock en salón
                {tieneVariantes && <span className="hint"> (calculado)</span>}
              </label>
              <input
                id="prod-stock-salon"
                type="number"
                min="0"
                {...register('stock_salon')}
                disabled={tieneVariantes}
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-stock-deposito">
                Stock en depósito
                {tieneVariantes && <span className="hint"> (calculado)</span>}
              </label>
              <input
                id="prod-stock-deposito"
                type="number"
                min="0"
                {...register('stock_deposito')}
                disabled={tieneVariantes}
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-stock">
                Cantidad disponible <span className="hint">(salón + depósito)</span>
              </label>
              <input
                id="prod-stock"
                type="number"
                value={stockActualVal}
                readOnly
                disabled
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-stock-min">Stock mínimo total (alerta)</label>
              <input id="prod-stock-min" type="number" min="0" {...register('stock_minimo')} />
            </div>
            <div className="form-group">
              <label htmlFor="prod-stock-min-salon">
                Mínimo en salón <span className="hint">(reponer desde depósito)</span>
              </label>
              <input id="prod-stock-min-salon" type="number" min="0" placeholder="Opcional" {...register('stock_minimo_salon')} />
            </div>
            <div className="form-group">
              <label htmlFor="prod-sku">SKU</label>
              <input
                id="prod-sku"
                {...register('sku')}
                placeholder="CRE-300"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-unidad">Unidad de medida</label>
              <select id="prod-unidad" {...register('unidad_medida')}>
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo</option>
                <option value="litro">Litro</option>
                <option value="metro">Metro</option>
                <option value="par">Par</option>
              </select>
            </div>
          </div>

          <div className={`inventory-panel ${stockActualVal <= 0 ? 'empty' : stockActualVal <= stockMinimoVal ? 'low' : 'ok'}`}>
            <div>
              <span className="inventory-total">{stockActualVal} {unidadVal}{stockActualVal === 1 ? '' : 's'}</span>
              <span className="inventory-status">{stockEstadoTexto}</span>
            </div>
            <div className="inventory-meter" aria-hidden="true">
              <span style={{ width: `${stockRatio}%` }} />
            </div>
          </div>

          <div className="form-section-title">
            <Layers size={14} /> Variantes
            <label className="check-label" style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={tieneVariantes}
                onChange={e => {
                  const activar = e.target.checked;
                  setTieneVariantes(activar);
                  // Al desactivar, limpiar el array — si no, las filas quedan
                  // ocultas pero se siguen mandando al guardar.
                  if (!activar) replaceVariantes([]);
                }}
              />
              Activar variantes
            </label>
          </div>

          {tieneVariantes ? (
            <>
              <div className="variantes-header">
                <span>Foto</span>
                <span>Nombre de variante</span>
                <span>SKU</span>
                <span>Stock salón</span>
                <span>Stock depósito</span>
                <span>Total</span>
                <span>Precio diferencial</span>
                <span></span>
              </div>
              {variantesFields.map((field, i) => {
                const salonFila = parseInt(watch(`variantes.${i}.stock_salon`), 10) || 0;
                const depositoFila = parseInt(watch(`variantes.${i}.stock_deposito`), 10) || 0;
                // La imagen recién elegida gana sobre la ya guardada: es lo
                // que se va a subir cuando el usuario apriete Guardar.
                const imagenGuardada = field.id ? imagenes.find(img => img.variante_id === field.id) : null;
                const imagenElegida = imagenesVariante[field._rhfKey];
                const previewVariante = imagenElegida?.url || imagenGuardada?.url || null;
                return (
                <div key={field._rhfKey} className="variante-row variante-row-3">
                  <label className="variante-foto" title="Foto de esta variante">
                    {previewVariante
                      ? <img src={previewVariante} alt="" />
                      : <span className="variante-foto-vacia"><ImageIcon size={15} /></span>}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        if (file.size > MAX_IMAGEN_BYTES) {
                          setError('La imagen de la variante supera el máximo permitido de 1MB.');
                          return;
                        }
                        setError(null);
                        setImagenesVariante(prev => ({
                          ...prev,
                          [field._rhfKey]: { file, url: URL.createObjectURL(file) },
                        }));
                      }}
                    />
                  </label>
                  <input
                    placeholder="Ej: Talle M - Rojo"
                    {...register(`variantes.${i}.nombre`)}
                  />
                  <input
                    placeholder="CRE-M-ROJO"
                    {...register(`variantes.${i}.sku_variante`)}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register(`variantes.${i}.stock_salon`)}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register(`variantes.${i}.stock_deposito`)}
                  />
                  <span className="variante-total" title="Salón + depósito. Es el stock que se vende online.">
                    {salonFila + depositoFila}
                  </span>
                  <div className="input-prefix" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                    <Controller
                      name={`variantes.${i}.precio_diferencial`}
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          className="w-full"
                          style={{ padding: '0.6rem' }}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-icon danger"
                    onClick={() => {
                      setImagenesVariante(prev => {
                        const resto = { ...prev };
                        delete resto[field._rhfKey];
                        return resto;
                      });
                      removeVariante(i);
                    }}
                    aria-label="Quitar variante"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                );
              })}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => appendVariante({ nombre: '', sku_variante: '', stock_salon: 0, stock_deposito: 0, precio_diferencial: 0 })}
              >
                <Plus size={14} /> Agregar variante
              </button>
              <p className="field-hint" style={{ marginTop: '0.75rem' }}>
                Cuando hay variantes, el stock del producto se calcula automáticamente como la suma de todas las variantes.
                Salón y depósito se cargan por separado para saber dónde está la mercadería, pero online se vende el total de los dos.
              </p>
              <p className="field-hint">
                La foto de cada variante se sube al guardar el producto y es la que ve el cliente en la landing cuando elige esa opción.
              </p>
            </>
          ) : (
            <div className="variantes-empty">
              <BarChart2 size={32} opacity={0.2} />
              <p>Sin variantes. Activá la opción de arriba para agregar talle, color, etc.</p>
            </div>
          )}
        </div>

        <div className={`tab-content ${tabActiva === 'basica' ? 'active' : ''}`}>
          <div className="form-section-title">
            <ImageIcon size={14} /> Fotos del producto
          </div>

          <div className="imagenes-grid">
            {[...imagenes].sort((a, b) => a.orden - b.orden).map(img => (
              <div
                key={img.id}
                className={`imagen-card ${img.es_principal ? 'principal' : ''}`}
              >
                <img src={getMediaUrl(img.url)} alt={img.alt_text || 'Imagen del producto'} />
                <div className="imagen-actions">
                  <button
                    type="button"
                    className="btn-icon"
                    title="Marcar como principal"
                    onClick={() => marcarPrincipal(img.id)}
                  >
                    <Star size={13} fill={img.es_principal ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon danger"
                    title="Eliminar imagen"
                    onClick={() => eliminarImagen(img.id, false)}
                  >
                    <X size={13} />
                  </button>
                </div>
                {img.es_principal && <span className="img-principal-badge">Principal</span>}
              </div>
            ))}

            {imagenesNuevas.map(img => (
              <div
                key={img.id}
                className={`imagen-card nueva-img ${img.es_principal ? 'principal' : ''}`}
              >
                <img src={getMediaUrl(img.url)} alt="Nueva" />
                <div className="imagen-actions">
                  <button
                    type="button"
                    className="btn-icon danger"
                    title="Eliminar"
                    onClick={() => eliminarImagen(img.id, true)}
                  >
                    <X size={13} />
                  </button>
                </div>
                <span className="img-principal-badge pending">Pendiente</span>
              </div>
            ))}

            <label className="imagen-upload-btn">
              {subiendoImg
                ? <div className="spinner-sm" />
                : <><Upload size={20} /><span>Agregar fotos</span></>
              }
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                hidden
                disabled={subiendoImg}
              />
            </label>
          </div>
          <p className="field-hint">
            JPG, PNG o WEBP. Máx. 1&nbsp;MB.
          </p>
        </div>

        <div className={`tab-content ${tabActiva === 'marketing' ? 'active' : ''}`}>
          <div className="product-view-workspace">
            <div className="product-view-editor">
              <Controller
                control={control}
                name="ficha_rubro"
                render={({ field: campoRubro }) => (
                  <Controller
                    control={control}
                    name="ficha_datos"
                    render={({ field: campoDatos }) => (
                      <FichaRubroTab
                        rubro={campoRubro.value}
                        datos={campoDatos.value}
                        onRubro={(v) => campoRubro.onChange(v || 'basico')}
                        onDatos={campoDatos.onChange}
                        modo="selector"
                      />
                    )}
                  />
                )}
              />

              <div className="form-section-title">
                <Eye size={14} /> Contenido público
              </div>

              <div className="form-group full">
                <label>Propuesta de valor</label>
                <textarea
                  {...register('propuesta_valor')}
                  placeholder="Ej: Definí tus cejas y barba con precisión y conseguí un acabado profesional en segundos."
                  rows={3}
                />
                <p className="field-hint">Una frase: producto, beneficio principal y acción. Aparece debajo del nombre en la página pública.</p>
              </div>

              <Controller
                control={control}
                name="ficha_datos"
                render={({ field: campoDatos }) => (
                  <EncabezadoProductoFields
                    datos={campoDatos.value}
                    onDatos={campoDatos.onChange}
                  />
                )}
              />

              {fichaRubroVal === 'basico' && (
                <div className="form-group full">
                  <label>Sobre este producto</label>
                  <textarea
                    {...register('sobre_este_producto')}
                    placeholder="Descripción amplia que aparece en la ficha genérica."
                    rows={5}
                  />
                  <p className="field-hint">Solo aparece en el template genérico. En los otros tipos se usan sus campos dinámicos propios.</p>
                </div>
              )}

              <div className="form-group full">
                <div className="inline-section-head">
                  <label>Beneficios</label>
                  <button type="button" className="btn-secondary btn-small" onClick={() => appendBeneficio({ titulo: '', texto: '' })}>
                    <Plus size={14} /> Agregar beneficio
                  </button>
                </div>
                {beneficiosFields.length === 0 ? (
                  <p className="field-hint">No hay beneficios cargados. La página pública no mostrará esta sección.</p>
                ) : (
                  <div className="repeat-stack">
                    {beneficiosFields.map((field, index) => (
                      <div key={field._rhfKey} className="repeat-card">
                        <Controller
                          control={control}
                          name={`beneficios.${index}.icono`}
                          render={({ field: controllerField }) => (
                            <SelectorIcono
                              valor={controllerField.value || 'star'}
                              onChange={controllerField.onChange}
                            />
                          )}
                        />
                        <div className="repeat-fields">
                          <input {...register(`beneficios.${index}.titulo`)} placeholder="Título corto (ej: Fácil de usar)" />
                          <textarea {...register(`beneficios.${index}.texto`)} placeholder="Breve descripción del beneficio..." rows={2} />
                        </div>
                        <button type="button" className="btn-icon" onClick={() => removeBeneficio(index)} style={{ color: 'var(--text-muted)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Controller
                control={control}
                name="ficha_rubro"
                render={({ field: campoRubro }) => (
                  <Controller
                    control={control}
                    name="ficha_datos"
                    render={({ field: campoDatos }) => (
                      <FichaRubroTab
                        rubro={campoRubro.value}
                        datos={campoDatos.value}
                        onRubro={(v) => campoRubro.onChange(v || '')}
                        onDatos={campoDatos.onChange}
                        modo="campos"
                      />
                    )}
                  />
                )}
              />
              <div className="form-group">
                <label htmlFor="prod-faq-titulo">Título de la sección</label>
                <input
                  id="prod-faq-titulo"
                  type="text"
                  placeholder="Ej: Todo lo que necesitás saber"
                  {...register('faq_titulo')}
                />
                <p className="field-hint">
                  Se muestra en la página pública del producto. Dejalo vacío para usar el título por defecto.
                </p>
              </div>
              <div className="form-group">
                <label>Preguntas frecuentes propias de este producto</label>
                <FaqPanel faq={faq} onChange={setFaq} />
              </div>

              <div className="form-group full">
                <div className="inline-section-head">
                  <label>Confianza (Garantías) <span className="req">*mínimo 4 recomendados</span></label>
                  <button type="button" className="btn-secondary btn-small" onClick={() => appendConfianza({ texto: '', icono: 'ShieldCheck' })}>
                    <Plus size={14} /> Agregar
                  </button>
                </div>
                <div className="repeat-stack">
                  {confianzaFields.map((field, index) => (
                    <div key={field._rhfKey} className="repeat-card repeat-card--compact">
                      <Controller
                        control={control}
                        name={`confianza.${index}.icono`}
                        render={({ field: controllerField }) => (
                          <SelectorIcono
                            valor={controllerField.value || 'shield-check'}
                            onChange={controllerField.onChange}
                          />
                        )}
                      />
                      <input {...register(`confianza.${index}.texto`)} placeholder="Ej: Envío gratis" />
                      <button type="button" className="btn-icon" onClick={() => removeConfianza(index)} style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              

              {/* {esEdicion && (
                <Link to={`/mi-landing/producto/${id}/funnel-selector`} className="btn-secondary product-view-funnel-link">
                  <Eye size={15} /> Configurar funnel dedicado
                </Link>
              )} */}
            </div>

            <ProductLandingPreview
              productoId={esEdicion ? id : null}
              producto={valoresProducto}
              categoriaNombre={categoriaActual?.nombre}
              imagenes={imagenes}
              imagenesNuevas={imagenesNuevas}
              variantes={valoresProducto.variantes || []}
              tieneVariantes={tieneVariantes}
              faq={faq}
              precioFinal={precioFinalVal}
              precioAncla={effectiveAnclaVal}
              device={previewDevice}
              onDeviceChange={setPreviewDevice}
            />
          </div>
        </div>

        <div className={`tab-content ${tabActiva === 'venta' ? 'active' : ''}`}>
          {esEdicion ? (
            <OfertasProductoTab
              productoId={id}
              productoNombre={nombre}
              productoAnclaPrecioBase={precioBaseVal}
              productoAnclaPrecioCosto={precioCostoVal}
            />
          ) : (
            <div className="variantes-empty">
              <Tag size={32} opacity={0.2} />
              <p>Guardá el producto primero para poder agregarle ofertas comerciales.</p>
            </div>
          )}
        </div>

        <div className={`tab-content ${tabActiva === 'publicacion' ? 'active' : ''}`}>
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="prod-estado-venta">Estado de venta</label>
              <select id="prod-estado-venta" {...register('estado_venta')}>
                {ESTADOS_VENTA.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
              <p className="field-hint">{estadoVentaActual.desc}</p>
            </div>

            <div className="config-flags">
              <label className="check-label">
                <input type="checkbox" {...register('activo')} />
                Producto activo
              </label>
              <label className="check-label">
                <input type="checkbox" {...register('destacado')} />
                <Star size={13} /> Destacado
              </label>
            </div>
          </div>
        </div>

        </div>

        {tabActiva !== 'marketing' && (
        <aside className="prod-summary-panel" aria-label="Resumen del producto">
          <div className="summary-media">
            {imagenPrincipalUrl
              ? <img src={imagenPrincipalUrl} alt={nombre || 'Producto'} />
              : <Package size={34} opacity={0.35} />
            }
          </div>

          <div>
            <h2>{nombre || 'Producto sin nombre'}</h2>
            <p>{categoriaActual?.nombre || 'Sin categoría'}</p>
          </div>

          <div className="summary-price">
            {effectiveAnclaVal > precioFinalVal && <span>{fmtGs(effectiveAnclaVal)}</span>}
            <strong>{fmtGs(precioFinalVal)}</strong>
          </div>

          <div className="summary-kpis">
            <div>
              <span>Stock</span>
              <strong>{stockActualVal}</strong>
            </div>
            <div>
              <span>Margen</span>
              <strong className={margenSimpleVal >= 0 ? 'positive' : 'negative'}>{fmtPct(margenSimpleVal)}</strong>
            </div>
          </div>

          <div className="summary-list">
            <div>
              <span>Estado</span>
              <strong>{ESTADO_VENTA_LABELS[estadoVentaVal] || 'En venta'}</strong>
            </div>
            <div>
              <span>Activo</span>
              <strong>{activoVal ? 'Sí' : 'No'}</strong>
            </div>
            <div>
              <span>Variantes</span>
              <strong>{tieneVariantes ? variantesFields.length : 0}</strong>
            </div>
            <div>
              <span>Tags</span>
              <strong>{tagsVal.split(',').map(t => t.trim()).filter(Boolean).length}</strong>
            </div>
          </div>

          {destacadoVal && <span className="summary-featured"><Star size={12} /> Destacado</span>}
        </aside>
        )}

      </form>

      {isDirty && !guardando && (
        <div className="prod-save-bar">
          <span>Cambios sin guardar</span>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-secondary" onClick={() => reset()}>Descartar</button>
            <button type="button" className="btn-primary" onClick={handleSubmit(onSubmit)}>
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
