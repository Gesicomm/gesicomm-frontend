import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';
import { categoriaService } from '../../services/catalogoService';
import { depositoService } from '../../services/deposito.service';
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
import { estiloVisualMedio } from '../landing-simple/templates/mediaGaleria';
import { calcularRecorteInteligente } from './imagenRecorte';
import { ImagenCardCompacta, EditorEncuadreModal } from './ImagenEncuadreCards';
import { erroresDelProducto, PRODUCTO_NUEVO, ofertaBorradorPayload } from './productoFormValidation';
import { subirImagenPendiente } from '../../components/OfertaImagenPicker';
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

function prepararImagenFormData(img) {
  const fd = new FormData();
  fd.append('imagen', img.file);
  fd.append('visual_modo', img.visual_modo || 'contain');
  fd.append('focal_x', String(img.focal_x ?? 50));
  fd.append('focal_y', String(img.focal_y ?? 50));
  fd.append('zoom', String(img.zoom ?? 1));
  fd.append('auto_trim', img.auto_trim === false ? 'false' : 'true');
  if (img.es_principal) fd.append('es_principal', 'true');
  if (img.variante_id) fd.append('variante_id', String(img.variante_id));
  return fd;
}

function estiloImagenGaleria(img) {
  return estiloVisualMedio(img);
}

// Firma estable de una combinación de Opciones (ej: [{opcion:'Color',valor:'Negro'}])
// para matchear una fila del formulario contra la variante ya guardada en
// base, sin depender del string de display (`nombre`) — más robusto que
// comparar por nombre si el separador de display cambia.
function firmaDeValores(valores) {
  return (valores || []).map(v => `${(v.opcion || '').toLowerCase()}:${(v.valor || '').toLowerCase()}`).sort().join('|');
}

const TABS = [
  { id: 'basica', label: 'Identidad', desc: 'Datos base, textos y fotos', level: 'Esencial', icon: <Package size={15} /> },
  { id: 'comercial', label: 'Precio', desc: 'Precio, descuento y margen', level: 'Esencial', icon: <DollarSign size={15} /> },
  { id: 'stock', label: 'Inventario', desc: 'Stock y variantes', level: 'Recomendado', icon: <Layers size={15} /> },
  { id: 'venta', label: 'Venta', desc: 'Packs, bumps y upsells', level: 'Avanzado', icon: <Tag size={15} /> },
  { id: 'marketing', label: 'Vista del producto', desc: 'Campos dinámicos, FAQ y preview', level: 'Recomendado', icon: <Eye size={15} /> },
  { id: 'publicacion', label: 'Publicacion', desc: 'Estado y visibilidad', level: 'Esencial', icon: <Settings size={15} /> },
  // NO re-agregar una pestaña que apunte a /mi-landing/producto:
  // ese editor de embudos legacy fue retirado.
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
  // null = todavía no se cargó el producto (o es alta nueva).
  const [skuOriginal, setSkuOriginal] = useState(null);
  const skuObligatorio = !esEdicion || Boolean(skuOriginal);

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
  const [ofertasBorrador, setOfertasBorrador] = useState([]);
  const [campoPendiente, setCampoPendiente] = useState(null);
  // Guardar en edición se queda EN la misma ficha (no vuelve al catálogo):
  // así se pueden tocar varias pestañas (Venta, Ficha avanzada, etc.) sin
  // tener que reabrir el producto entre cada guardado.
  const [aviso, setAviso] = useState(null);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);
  const [categorias, setCategorias] = useState([]);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [depositosStock, setDepositosStock] = useState([]);
  const [stockPorDeposito, setStockPorDeposito] = useState({ producto: {} });
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [faq, setFaq] = useState([]);
  const [imagenesNuevas, setImagenesNuevas] = useState([]); // Para imágenes en cola (nuevo prod)
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [previewSubida, setPreviewSubida] = useState([]);
  const [previewContexto, setPreviewContexto] = useState(null); // 'galeria' | { tipo: 'variante', rhfKey }
  // Imagen elegida para cada variante, indexada por su _rhfKey. Se sube
  // recién después de guardar: hasta ese momento la variante puede no
  // existir todavía en base y la imagen necesita un variante_id real.
  const [imagenesVariante, setImagenesVariante] = useState({});
  const [tieneVariantes, setTieneVariantes] = useState(false);
  // true = producto viejo con variantes de texto libre y sin Opciones. Se
  // deja editar igual que siempre (nunca se fuerza la conversión) hasta que
  // el admin aprieta "Convertir a Opciones".
  const [modoLegacyVariantes, setModoLegacyVariantes] = useState(false);
  const [descuentoSimulado, setDescuentoSimulado] = useState(0);
  const [mostrarDetalleEscenarios, setMostrarDetalleEscenarios] = useState(false);
  const [config, setConfig] = useState(null);
  const [cotizacionUsd, setCotizacionUsd] = useState('');
  const [usuarioActual, setUsuarioActual] = useState(null);
  const esAdmin = usuarioActual?.rol === 'administrador';

  const { register, handleSubmit, control, watch, setValue, getValues, reset, formState: { errors, isDirty } } = useForm({
    shouldFocusError: false,
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
      confianza: [],
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
      opciones: [],
    },
  });

  // keyName custom: por default react-hook-form usa "id" como su propia key
  // interna y PISA el id real de la variante (viene de la base de datos) con
  // un uuid generado — sin esto, el backend no puede saber qué fila es una
  // variante existente a actualizar vs. una nueva a crear.
  const { fields: variantesFields, append: appendVariante, remove: removeVariante, replace: replaceVariantes } =
    useFieldArray({ control, name: 'variantes', keyName: '_rhfKey' });

  const { fields: opcionesFields, append: appendOpcion, remove: removeOpcion } =
    useFieldArray({ control, name: 'opciones', keyName: '_rhfKey' });

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
      const [catData, conf, p, vars, opcs, imgs, provData, faqData, depositosData, sesion] = await Promise.all([
        categoriaService.buscar({ solo_activas: true, limit: 1000 }),
        comboAdminService.obtenerConfiguracion().catch(() => null),
        esEdicion ? productService.detalle(id).catch(() => null) : Promise.resolve(null),
        esEdicion ? productService.variantes(id).catch(() => []) : Promise.resolve([]),
        esEdicion ? productService.opciones(id).catch(() => []) : Promise.resolve([]),
        esEdicion ? productService.imagenes(id).catch(() => []) : Promise.resolve([]),
        proveedoresService.buscar({}).catch(() => ({ proveedores: [] })),
        esEdicion ? productService.faq(id).catch(() => []) : Promise.resolve([]),
        depositoService.listarDepositos({ activo: true, limit: 100 }).catch(() => ({ data: [] })),
        esEdicion ? verificarSesion().catch(() => null) : Promise.resolve(null),
      ]);
      setCategorias(catData.categorias || catData);
      setProveedores(provData.proveedores || provData || []);
      setDepositosStock(depositosData.data || []);
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
          setSkuOriginal(p.sku || '');
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
            impuestos_incluidos: p.impuestos_incluidos !== false,
            cantidad_disponible: p.cantidad_disponible || 0,
            stock_salon: p.stock_salon || 0,
            stock_deposito: p.stock_deposito || 0,
            stock_minimo: p.stock_minimo || 0,
            stock_minimo_salon: p.stock_minimo_salon ?? '',
            unidad_medida: p.unidad_medida || 'unidad',
            activo: p.activo,
            estado_venta: p.estado_venta || 'en_venta',
            destacado: p.destacado,
            variantes: vars?.length
              ? vars.map(v => ({
                  ...v,
                  incluida: true,
                  valores: (v.valoresOpcion || []).map(vo => ({ opcion: vo.opcion.nombre, valor: vo.valor })),
                }))
              : [],
            opciones: opcs?.length
              ? opcs.map(o => ({
                  id: o.id,
                  nombre: o.nombre,
                  orden: o.orden,
                  valores: (o.valores || []).map(val => ({ id: val.id, valor: val.valor, orden: val.orden })),
                }))
              : [],
            propuesta_valor: p.propuesta_valor || '',
            beneficios: p.beneficios || [],
            confianza: p.confianza || [],
            preguntas_frecuentes: p.preguntas_frecuentes || [],
            sobre_este_producto: p.sobre_este_producto || '',
            ficha_rubro: p.ficha_rubro || 'basico',
            ficha_datos: p.ficha_datos || {},
          });

          const stockInicial = { producto: {} };
          (p.stock_depositos || []).forEach((fila) => {
            const key = fila.variante_id ? `variante:${fila.variante_id}` : 'producto';
            if (!stockInicial[key]) stockInicial[key] = {};
            stockInicial[key][String(fila.deposito_id)] = parseInt(fila.cantidad, 10) || 0;
          });
          setStockPorDeposito(stockInicial);

          if (vars?.length > 0) setTieneVariantes(true);
          // Legacy = tenía variantes antes de este cambio y nunca las
          // migró a Opciones. Se deja intacto hasta que el admin decida
          // convertir — nunca se adivina Opción/Valor a partir del nombre.
          if (vars?.length > 0 && (!opcs || opcs.length === 0)) setModoLegacyVariantes(true);
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

  // ── Opciones → combinaciones (variantes) ─────────────────────────────
  // Cada vez que cambian las Opciones/Valores, se recalcula el producto
  // cartesiano y se sincroniza contra `variantes`. Las combinaciones que ya
  // existían (mismo set de valores) conservan su id/sku/stock/precio/
  // "incluida"; las nuevas entran marcadas para incluir por defecto. No
  // corre en modo legacy: ahí las filas se siguen editando a mano.
  const opcionesWatch = watch('opciones');

  // Todas las combinaciones vigentes según Opciones/Valores en este momento
  // (sin tocar `variantes` — solo cálculo). Se separa del efecto de abajo
  // para poder ofrecer el selector "el producto actual corresponde a" con
  // datos frescos en cada render, no solo cuando el efecto corre.
  const combinacionesActuales = React.useMemo(() => {
    const opcionesValidas = (opcionesWatch || [])
      .map(o => ({ nombre: (o.nombre || '').trim(), valores: (o.valores || []).map(v => (v.valor || '').trim()).filter(Boolean) }))
      .filter(o => o.nombre && o.valores.length > 0);
    if (opcionesValidas.length === 0) return [];
    return opcionesValidas.reduce(
      (acc, opcion) => acc.flatMap(combo => opcion.valores.map(valor => [...combo, { opcion: opcion.nombre, valor }])),
      [[]]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(opcionesWatch)]);

  // Mientras ninguna variante tenga id real (nada persistido todavía), el
  // producto recién activó Opciones y su propio stock/SKU/precio no están
  // representados en ninguna fila — hay que preguntar cuál combinación es
  // "el producto actual" para no perder esos datos en silencio. Una vez que
  // algo se guardó, cada fila ya tiene su propia data y la pregunta deja de
  // tener sentido (ver useEffect de abajo).
  const hayVariantesGuardadas = variantesFields.some(f => f.id);
  const mostrarSelectorOriginal = !modoLegacyVariantes && tieneVariantes
    && combinacionesActuales.length > 0 && !hayVariantesGuardadas;

  const [combinacionOriginal, setCombinacionOriginal] = useState(null);
  // Última combinación sembrada con los datos del producto — para poder
  // limpiarla si el admin cambia de idea en el selector, y así el stock del
  // producto no termine duplicado en dos filas a la vez.
  const combinacionOriginalPrevRef = React.useRef(null);

  useEffect(() => {
    if (modoLegacyVariantes || !tieneVariantes) return;

    if (combinacionesActuales.length === 0) {
      if (getValues('variantes')?.length > 0) replaceVariantes([]);
      combinacionOriginalPrevRef.current = null;
      return;
    }

    const actuales = getValues('variantes') || [];
    const actualesPorFirma = new Map(actuales.map(v => [firmaDeValores(v.valores), v]));
    const yaHayGuardadas = actuales.some(v => v.id);

    // Sin nada persistido todavía: la combinación elegida como "el producto
    // actual" (por defecto, la primera) siempre refleja el stock/SKU/precio
    // vigentes del producto — así el admin puede cambiar de combinación en
    // el selector sin perder lo que ya tenía cargado. El resto conserva lo
    // que se haya tocado a mano en esta misma sesión, o arranca en blanco.
    const firmaOriginal = !yaHayGuardadas
      ? (combinacionOriginal || firmaDeValores(combinacionesActuales[0]))
      : null;
    const firmaAnterior = combinacionOriginalPrevRef.current;
    combinacionOriginalPrevRef.current = firmaOriginal;

    const blanco = (valores) => ({ valores, sku_variante: '', stock_salon: 0, stock_deposito: 0, precio_diferencial: 0, incluida: true });

    const nuevas = combinacionesActuales.map(valores => {
      const firma = firmaDeValores(valores);
      const existente = actualesPorFirma.get(firma);

      if (yaHayGuardadas) {
        return existente ? { ...existente, valores } : blanco(valores);
      }

      if (firma === firmaOriginal) {
        return {
          valores,
          sku_variante: getValues('sku') || '',
          stock_salon: parseInt(getValues('stock_salon'), 10) || 0,
          stock_deposito: parseInt(getValues('stock_deposito'), 10) || 0,
          precio_diferencial: 0,
          incluida: true,
        };
      }
      // Dejó de ser la designada: si nada la persistió todavía, no puede
      // arrastrar el seed de la designación anterior — si no, el stock del
      // producto termina duplicado en dos filas (la vieja y la nueva).
      if (firma === firmaAnterior && !existente?.id) {
        return blanco(valores);
      }
      return existente ? { ...existente, valores } : blanco(valores);
    });

    replaceVariantes(nuevas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(combinacionesActuales), modoLegacyVariantes, tieneVariantes, combinacionOriginal]);

  /**
   * Convierte un producto legacy (variantes de texto libre) a Opciones: arma
   * una única opción genérica "Variante" con cada nombre existente como
   * valor. Conserva id/sku/stock/precio de cada fila — nunca se pierde lo
   * ya cargado. No se hace automático: el admin decide cuándo migrar.
   */
  const convertirLegacyAOpciones = () => {
    const variantesActuales = getValues('variantes') || [];
    setValue('variantes', variantesActuales.map(v => ({
      ...v,
      incluida: true,
      valores: [{ opcion: 'Variante', valor: v.nombre }],
    })));
    setValue('opciones', [{
      nombre: 'Variante',
      orden: 0,
      valores: variantesActuales.map((v, i) => ({ valor: v.nombre, orden: i })),
    }]);
    setModoLegacyVariantes(false);
  };

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
      packaging: Number(config.costo_empaque) || 0,
      paymentCommissionPercentage: Number(config.pagopar_comision_porcentaje) || 0
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
      .map((field, i) => ({
        archivoMeta: imagenesVariante[field._rhfKey],
        nombre: (variantesDelForm[i]?.nombre || '').trim(),
        firma: firmaDeValores(variantesDelForm[i]?.valores),
      }))
      .filter(v => v.archivoMeta?.file && (v.nombre || v.firma));
    if (!pendientes.length) return;

    const guardadas = await productService.variantes(productoId).catch(() => []);
    // Con Opciones, matchear por la firma de valores (opcion+valor) es más
    // robusto que por `nombre` — no depende del string de display. Sin
    // Opciones (legacy), se sigue matcheando por nombre como siempre.
    const porFirma = new Map(guardadas
      .map(v => [firmaDeValores((v.valoresOpcion || []).map(vo => ({ opcion: vo.opcion?.nombre, valor: vo.valor }))), v.id])
      .filter(([firma]) => firma));
    const porNombre = new Map(guardadas.map(v => [String(v.nombre).trim().toLowerCase(), v.id]));

    for (const { archivoMeta, nombre, firma } of pendientes) {
      const varianteId = (firma && porFirma.get(firma)) || porNombre.get(nombre.toLowerCase());
      if (!varianteId) continue;
      try {
        const fd = prepararImagenFormData({
          ...archivoMeta,
          variante_id: varianteId,
        });
        await productService.subirImagen(productoId, fd);
      } catch (e) {
        console.error(`Error subiendo la imagen de la variante "${nombre || firma}"`, e);
      }
    }
  };

  const abrirCampo = (campo) => {
    setTabActiva(campo.tab);
    setCampoPendiente(campo);
  };
  useEffect(() => {
    if (!campoPendiente) return;
    const frame = requestAnimationFrame(() => {
      const input = campoPendiente.id
        ? document.getElementById(campoPendiente.id)
        : document.getElementsByName(campoPendiente.campo)[0];
      input?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      input?.focus({ preventScroll: true });
      setCampoPendiente(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [tabActiva, campoPendiente]);

  const alFallarValidacion = (errs) => {
    const [primero] = erroresDelProducto(errs);
    if (primero) abrirCampo(primero);
  };

  const sumarStockDepositos = (key) => Object.values(stockPorDeposito[key] || {})
    .reduce((acc, cantidad) => acc + (parseInt(cantidad, 10) || 0), 0);

  const tipoUbicacion = (depositoId) => (
    depositosStock.find((dep) => String(dep.id) === String(depositoId))?.tipoUbicacion
    || depositosStock.find((dep) => String(dep.id) === String(depositoId))?.tipo_ubicacion
    || 'DEPOSITO'
  );

  const sumarStockPorTipo = (key, tipos) => Object.entries(stockPorDeposito[key] || {})
    .reduce((acc, [depositoId, cantidad]) => (
      tipos.includes(tipoUbicacion(depositoId)) ? acc + (parseInt(cantidad, 10) || 0) : acc
    ), 0);

  const cambiarStockDeposito = (key, depositoId, valor) => {
    const cantidad = Math.max(0, parseInt(valor, 10) || 0);
    setStockPorDeposito((prev) => {
      const siguiente = {
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [String(depositoId)]: cantidad,
        },
      };

      if (key === 'producto') {
        const totalSalon = Object.entries(siguiente.producto || {})
          .reduce((acc, [id, item]) => (tipoUbicacion(id) === 'SALON' ? acc + (parseInt(item, 10) || 0) : acc), 0);
        const totalDeposito = Object.entries(siguiente.producto || {})
          .reduce((acc, [id, item]) => (tipoUbicacion(id) !== 'SALON' ? acc + (parseInt(item, 10) || 0) : acc), 0);
        setValue('stock_salon', totalSalon, { shouldDirty: true, shouldValidate: true });
        setValue('stock_deposito', totalDeposito, { shouldDirty: true, shouldValidate: true });
      } else if (key.startsWith('variante:')) {
        const varianteId = key.slice('variante:'.length);
        const idx = (getValues('variantes') || []).findIndex((v) => String(v.id) === String(varianteId));
        if (idx >= 0) {
          const totalSalon = Object.entries(siguiente[key] || {})
            .reduce((acc, [id, item]) => (tipoUbicacion(id) === 'SALON' ? acc + (parseInt(item, 10) || 0) : acc), 0);
          const totalDeposito = Object.entries(siguiente[key] || {})
            .reduce((acc, [id, item]) => (tipoUbicacion(id) !== 'SALON' ? acc + (parseInt(item, 10) || 0) : acc), 0);
          setValue(`variantes.${idx}.stock_salon`, totalSalon, { shouldDirty: true, shouldValidate: true });
          setValue(`variantes.${idx}.stock_deposito`, totalDeposito, { shouldDirty: true, shouldValidate: true });
        }
      }

      return siguiente;
    });
  };

  const construirStockDepositosPayload = (variantes = []) => {
    if (tieneVariantes) {
      return variantes.flatMap((variante) => {
        if (!variante.id) return [];
        const key = `variante:${variante.id}`;
        return Object.entries(stockPorDeposito[key] || {})
          .map(([depositoId, cantidad]) => ({
            deposito_id: Number(depositoId),
            variante_id: Number(variante.id),
            cantidad: parseInt(cantidad, 10) || 0,
          }))
          .filter((fila) => fila.deposito_id && fila.cantidad > 0);
      });
    }

    return Object.entries(stockPorDeposito.producto || {})
      .map(([depositoId, cantidad]) => ({
        deposito_id: Number(depositoId),
        variante_id: null,
        cantidad: parseInt(cantidad, 10) || 0,
      }))
      .filter((fila) => fila.deposito_id && fila.cantidad > 0);
  };

  // Fotos de la ficha del rubro (Vista del producto): van a R2 y vuelven como
  // URL, sin tocar la galería. Solo con el producto ya guardado (hay id).
  async function subirImagenFicha(file) {
    const formData = new FormData();
    formData.append('imagen', file);
    const { url } = await productService.subirImagenFicha(id, formData);
    return url;
  }

  const onSubmit = async (data) => {
    setGuardando(true);
    setError(null);
    setAviso(null);
    let productoCreadoId = null;
    try {
      const variantesActivas = (data.variantes || [])
        .filter(v => modoLegacyVariantes || v.incluida !== false);
      const stockFisicoTotal = data.variantes?.length
        ? variantesActivas
          .reduce((acc, v) => acc + (parseInt(v.stock_salon, 10) || 0) + (parseInt(v.stock_deposito, 10) || 0), 0)
        : (parseInt(data.stock_salon, 10) || 0) + (parseInt(data.stock_deposito, 10) || 0);
      const stockDepositosPayload = construirStockDepositosPayload(variantesActivas);
      const totalDistribuido = stockDepositosPayload.reduce((acc, fila) => acc + fila.cantidad, 0);

      if (stockFisicoTotal > 0 && depositosStock.length === 0) {
        setTabActiva('stock');
        throw new Error('Para cargar stock, primero creá una ubicación en Mi Tienda → Depósitos.');
      }

      if (stockFisicoTotal > 0 && totalDistribuido !== stockFisicoTotal) {
        setTabActiva('stock');
        throw new Error(`La distribución por ubicación (${totalDistribuido}) debe sumar el stock total (${stockFisicoTotal}).`);
      }

      if (tieneVariantes) {
        const varianteNuevaConDeposito = variantesActivas.some((v) => !v.id && ((parseInt(v.stock_salon, 10) || 0) + (parseInt(v.stock_deposito, 10) || 0)) > 0);
        if (varianteNuevaConDeposito) {
          setTabActiva('stock');
          throw new Error('Guardá primero las variantes nuevas y luego distribuí su stock por ubicación.');
        }

        const varianteDesbalanceada = variantesActivas.find((v) => {
          const totalVariante = (parseInt(v.stock_salon, 10) || 0) + (parseInt(v.stock_deposito, 10) || 0);
          const distribuidoVariante = v.id ? sumarStockDepositos(`variante:${v.id}`) : 0;
          return distribuidoVariante !== totalVariante;
        });
        if (varianteDesbalanceada) {
          setTabActiva('stock');
          throw new Error('Cada variante debe tener distribuido exactamente su stock por ubicación.');
        }
      }

      const payload = {
        nombre: data.nombre.trim(),
        categoria_id: data.categoria_id || null,
        proveedor_id: data.proveedor_id || null,
        sku: data.sku?.trim() || null,
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
        impuestos_incluidos: data.impuestos_incluidos !== false,
        // El total lo recalcula el backend como salón + depósito; no se
        // manda cantidad_disponible para que no queden dos fuentes de verdad.
        stock_salon: parseInt(data.stock_salon) || 0,
        stock_deposito: parseInt(data.stock_deposito) || 0,
        stock_depositos: stockDepositosPayload,
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
        // para que no pueda quedar desincronizado con el desglose. Con
        // Opciones activas, solo se mandan las combinaciones que quedaron
        // tildadas ("incluida") — las desmarcadas no se guardan como variante.
        variantes: variantesActivas
          .map(v => ({
            id: v.id,
            nombre: v.nombre,
            valores: v.valores,
            sku_variante: v.sku_variante,
            stock_salon: parseInt(v.stock_salon, 10) || 0,
            stock_deposito: parseInt(v.stock_deposito, 10) || 0,
            precio_diferencial: v.precio_diferencial ? parseFloat(v.precio_diferencial) : 0,
          })),
        // Sin Opciones (modo legacy o producto sin variantes), no se manda
        // el campo — así el backend no toca producto_opciones para nada.
        opciones: (!modoLegacyVariantes && data.opciones?.length > 0)
          ? data.opciones
            .map(o => ({ ...o, nombre: (o.nombre || '').trim(), valores: (o.valores || []).filter(v => (v.valor || '').trim()) }))
            .filter(o => o.nombre && o.valores.length > 0)
          : undefined,
        ...(!esEdicion && ofertasBorrador.length > 0
          ? { ofertas: ofertasBorrador.map(o => ofertaBorradorPayload({ ...o, componentes: o.componentes.map(c => Number(c.producto_id) === PRODUCTO_NUEVO
              ? { ...c, permite_elegir_variante: data.variantes.some(v => modoLegacyVariantes || v.incluida !== false) }
              : c) })) }
          : {}),
      };

      if (esEdicion) {
        await productService.actualizar(id, payload);
        for (const imgObj of imagenesNuevas) {
          await productService.subirImagen(id, prepararImagenFormData(imgObj));
        }
        await subirImagenesDeVariantes(id, data.variantes);
        // Vuelve al listado (igual que al crear): quedarse en la misma
        // ficha después de guardar dejaba la barra "Cambios sin guardar"
        // sin limpiarse (isDirty de react-hook-form no se resetea con un
        // simple aviso), así que parecía que no había guardado aunque sí.
        navigate('/mi-catalogo?filtro=mios');
      } else {
        const nuevo = await productService.crear(payload);
        productoCreadoId = nuevo.id;
        const avisosImagen = [];
        for (let i = 0; i < ofertasBorrador.length; i++) {
          const avisoImagen = await subirImagenPendiente(nuevo.ofertas?.[i]?.id, ofertasBorrador[i].imagen_archivo);
          if (avisoImagen) avisosImagen.push(avisoImagen);
        }
        for (const imgObj of imagenesNuevas) {
          try {
            await productService.subirImagen(nuevo.id, prepararImagenFormData(imgObj));
          } catch (e) {
            console.error('Error subiendo imagen', e);
          }
        }
        await subirImagenesDeVariantes(nuevo.id, data.variantes);
        setOfertasBorrador([]);
        if (avisosImagen.length) {
          // El producto y las ofertas ya existen; abrir edición evita que
          // reintentar una foto cree otro producto.
          toast.error(avisosImagen.join('\n'));
          navigate(`/products/${nuevo.id}/editar`);
          return;
        }
        navigate('/mi-catalogo?filtro=mios');
      }
    } catch (err) {
      if (productoCreadoId) {
        setOfertasBorrador([]);
        toast.error('El producto y sus ofertas se guardaron, pero falló una imagen. Podés volver a cargarla desde la edición.');
        navigate(`/products/${productoCreadoId}/editar`);
        return;
      }
      const errores = err.response?.data?.errores;
      const msg = errores
        ? errores.join('\n')
        : (err.response?.data?.message || err.message || 'Error al guardar el producto.');
      setError(msg);
      if (err.response?.data?.seccion === 'venta') setTabActiva('venta');
      if (err.response?.data?.seccion === 'stock') setTabActiva('stock');
    } finally {
      setGuardando(false);
    }
  };

  // ── Imágenes ──────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const totalActual = imagenes.length + imagenesNuevas.length;
    if (totalActual + files.length > 6) {
      setError(`Solo se permiten hasta 6 imágenes por producto. Tienes ${totalActual} y estás intentando subir ${files.length} más.`);
      e.target.value = '';
      return;
    }

    const nuevasPreview = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      file,
      url: URL.createObjectURL(file),
      es_principal: totalActual === 0 && idx === 0,
      visual_modo: 'contain',
      focal_x: 50,
      focal_y: 50,
      zoom: 1,
      auto_trim: true,
    }));
    setPreviewContexto('galeria');
    setPreviewSubida(nuevasPreview);
    e.target.value = '';
  };

  const abrirPreviewVariante = (rhfKey, file) => {
    if (!file) return;
    setPreviewContexto({ tipo: 'variante', rhfKey });
    setPreviewSubida([{
      id: `variante-${rhfKey}-${Date.now()}`,
      file,
      url: URL.createObjectURL(file),
      visual_modo: 'contain',
      focal_x: 50,
      focal_y: 50,
      zoom: 1,
      auto_trim: true,
    }]);
  };

  const actualizarPreviewSubida = (imageId, cambios) => {
    setPreviewSubida(prev => prev.map(img => img.id === imageId ? { ...img, ...cambios } : img));
  };

  // Preset = auto_trim + visual_modo juntos, para no tener que explicarle al
  // comercio qué combinación de checkbox + toggle corresponde a cada caso.
  const PRESETS_IMAGEN = {
    producto: { auto_trim: true, visual_modo: 'contain' },
    infografia: { auto_trim: false, visual_modo: 'contain' },
  };

  const elegirPresetPreview = (imageId, preset) => {
    actualizarPreviewSubida(imageId, { preset, ...PRESETS_IMAGEN[preset] });
  };

  // El recorte se calcula client-side (mismo criterio que sharp en el
  // backend: fondo por esquinas + piso del 35%) solo para mostrar "cómo va a
  // quedar" antes de subir. El archivo que se guarda de verdad lo procesa el
  // backend — esto es una previsualización, no el resultado final.
  useEffect(() => {
    const pendientes = previewSubida.filter(img => img.recorte === undefined);
    if (!pendientes.length) return;
    let cancelado = false;
    (async () => {
      for (const img of pendientes) {
        try {
          const recorte = await calcularRecorteInteligente(img.url);
          if (!cancelado) actualizarPreviewSubida(img.id, { recorte });
        } catch {
          if (!cancelado) actualizarPreviewSubida(img.id, { recorte: null });
        }
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSubida]);

  const cancelarPreviewSubida = () => {
    previewSubida.forEach(img => {
      if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url);
    });
    setPreviewSubida([]);
    setPreviewContexto(null);
  };

  const confirmarPreviewSubida = async () => {
    if (!previewSubida.length) return;

    if (previewContexto?.tipo === 'variante') {
      const img = previewSubida[0];
      const prev = imagenesVariante[previewContexto.rhfKey];
      if (prev?.url?.startsWith('blob:') && prev.url !== img.url) URL.revokeObjectURL(prev.url);
      setImagenesVariante(prevState => ({
        ...prevState,
        [previewContexto.rhfKey]: {
          file: img.file,
          url: img.url,
          visual_modo: img.visual_modo || 'contain',
          focal_x: img.focal_x ?? 50,
          focal_y: img.focal_y ?? 50,
          zoom: img.zoom ?? 1,
          auto_trim: img.auto_trim !== false,
        },
      }));
      setPreviewSubida([]);
      setPreviewContexto(null);
      return;
    }

    if (!esEdicion) {
      setImagenesNuevas(imgs => [...imgs, ...previewSubida]);
      setPreviewSubida([]);
      setPreviewContexto(null);
      return;
    }

    setSubiendoImg(true);
    setError(null);
    const subidas = [];
    const errores = [];
    for (const img of previewSubida) {
      try {
        const nueva = await productService.subirImagen(id, prepararImagenFormData(img));
        subidas.push(nueva);
        if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url);
      } catch (err) {
        errores.push(err.response?.data?.message || 'Error al subir la imagen.');
      }
    }
    if (subidas.length > 0) setImagenes(imgs => [...imgs, ...subidas]);
    if (errores.length > 0) setError(errores.join('\n'));
    setPreviewSubida([]);
    setPreviewContexto(null);
    setSubiendoImg(false);
  };

  const actualizarEncuadreImagen = async (imgId, cambios, esNueva = false, { persistir = true } = {}) => {
    if (esNueva) {
      setImagenesNuevas(imgs => imgs.map(i => i.id === imgId ? { ...i, ...cambios } : i));
      return;
    }
    setImagenes(imgs => imgs.map(i => i.id === imgId ? { ...i, ...cambios } : i));
    if (!persistir || !esEdicion) return;
    try {
      await productService.actualizarImagen(id, imgId, cambios);
    } catch {
      setError('No se pudo actualizar el encuadre de la imagen.');
    }
  };

  const eliminarImagen = async (imgId, esNueva = false) => {
    if (esNueva) {
      setImagenesNuevas(imgs => {
        const encontrada = imgs.find(i => i.id === imgId);
        if (encontrada?.url?.startsWith('blob:')) URL.revokeObjectURL(encontrada.url);
        return imgs.filter(i => i.id !== imgId);
      });
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

  // Editor de encuadre: un único modal reutilizado tanto para fotos ya
  // guardadas como para las que todavía están en cola — antes cada tarjeta
  // de la grilla mostraba sus propios sliders siempre visibles, lo que
  // mezclaba la galería con la edición técnica y hacía ilegible la sección.
  const [editandoEncuadre, setEditandoEncuadre] = useState(null); // { imgId, esNueva } | null

  const abrirEditorEncuadre = (imgId, esNueva) => setEditandoEncuadre({ imgId, esNueva });
  const cerrarEditorEncuadre = () => setEditandoEncuadre(null);

  const aplicarEditorEncuadre = (draft) => {
    if (!editandoEncuadre) return;
    actualizarEncuadreImagen(editandoEncuadre.imgId, draft, editandoEncuadre.esNueva);
    cerrarEditorEncuadre();
  };

  const imagenEnEdicion = editandoEncuadre
    ? (editandoEncuadre.esNueva
      ? imagenesNuevas.find(i => i.id === editandoEncuadre.imgId)
      : imagenes.find(i => i.id === editandoEncuadre.imgId))
    : null;

  // Reprocesar: regenera la versión optimizada desde el original que ya está
  // guardado en R2 (nunca se vuelve a subir el archivo, nunca se toca el
  // original) — pensado para las fotos que ya están en el producto y
  // quedaron con margen de sobra por el trimThreshold viejo.
  const [reprocesando, setReprocesando] = useState(null); // { imgId, paso: 'elegir'|'trabajando'|'resultado', preset, visual_modo, anterior, nuevo }

  const abrirReprocesar = (img) => {
    setReprocesando({
      imgId: img.id,
      paso: 'elegir',
      preset: 'producto',
      visual_modo: img.visual_modo || 'contain',
      anterior: null,
      nuevo: null,
    });
  };

  const cerrarReprocesar = () => setReprocesando(null);

  const confirmarReprocesar = async () => {
    if (!reprocesando) return;
    const { imgId, preset, visual_modo } = reprocesando;
    setReprocesando(prev => ({ ...prev, paso: 'trabajando' }));
    try {
      const resultado = await productService.reprocesarImagen(id, imgId, {
        ...PRESETS_IMAGEN[preset],
        visual_modo,
      });
      setImagenes(imgs => imgs.map(i => i.id === imgId ? resultado : i));
      setReprocesando(prev => ({
        ...prev,
        paso: 'resultado',
        anterior: resultado.anterior_url,
        nuevo: resultado.url,
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo reprocesar la imagen.');
      setReprocesando(null);
    }
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
  const variantesWatch = watch('variantes') || [];
  const stockUbicacionesTotalVal = tieneVariantes
    ? variantesWatch
      .filter(v => modoLegacyVariantes || v.incluida !== false)
      .reduce((acc, v) => acc + (parseInt(v.stock_salon, 10) || 0) + (parseInt(v.stock_deposito, 10) || 0), 0)
    : stockSalonVal + stockDepositoVal;
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
  const tieneMarketing = Boolean(
    (valoresProducto.propuesta_valor || '').trim()
    || (fichaRubroVal === 'basico' && (valoresProducto.sobre_este_producto || '').trim())
    || hayContenido(valoresProducto.ficha_datos?.beneficios_rapidos)
    || (valoresProducto.ficha_datos?.cta_principal_texto || '').trim()
    || beneficiosFields.length
    || faq.length
  );
  const requisitosGuardar = [
    { label: 'Nombre', listo: Boolean(nombre?.trim()), tab: 'basica', id: 'prod-nombre' },
    ...(skuObligatorio ? [{ label: 'SKU', listo: Boolean(valoresProducto.sku?.trim()), tab: 'basica', id: 'prod-sku' }] : []),
    { label: 'Precio de venta', listo: valoresProducto.precio_base !== '' && valoresProducto.precio_base != null && Number(valoresProducto.precio_base) >= 0, tab: 'comercial', id: 'prod-precio-base' },
  ];
  const stockParaVender = tieneVariantes
    ? (valoresProducto.variantes || []).some(v => v.incluida !== false && ((Number(v.stock_salon) || 0) + (Number(v.stock_deposito) || 0)) > 0)
    : stockActualVal > 0;
  const requisitosVender = [
    { label: 'Precio mayor a 0', listo: precioFinalVal > 0, tab: 'comercial', id: 'prod-precio-base' },
    { label: 'Stock disponible', listo: stockParaVender, tab: 'stock' },
    { label: 'Activo y en venta', listo: activoVal && estadoVentaVal === 'en_venta', tab: 'publicacion', id: 'prod-estado-venta' },
  ];
  const estadoSecciones = {
    basica: requisitosGuardar.filter(r => r.tab === 'basica').every(r => r.listo) ? 'ok' : 'todo',
    comercial: precioBaseVal > 0 ? 'ok' : 'todo',
    stock: tieneVariantes ? (variantesFields.length ? 'ok' : 'warn') : (stockActualVal > 0 ? 'ok' : 'warn'),
    venta: esEdicion ? 'warn' : (ofertasBorrador.length > 0 ? 'ok' : 'todo'),
    marketing: fichaRubroVal ? (tieneMarketing ? 'ok' : 'warn') : 'todo',
    publicacion: estadoVentaVal && activoVal !== undefined ? 'ok' : 'todo',
  };

  function aplicarEjemploVista() {
    const muestra = MUESTRAS_VISTA_PRODUCTO[fichaRubroVal];
    if (!muestra) return;

    if (!hayContenido(valoresProducto.propuesta_valor)) {
      setValue('propuesta_valor', muestra.propuesta_valor, { shouldDirty: true });
    }
    if (fichaRubroVal === 'basico' && !hayContenido(valoresProducto.sobre_este_producto)) {
      setValue('sobre_este_producto', muestra.sobre_este_producto, { shouldDirty: true });
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
      setValue('ficha_datos', datosMuestra, { shouldDirty: true });
    }

    setMuestrasAplicadas(prev => ({ ...prev, [fichaRubroVal]: true }));
  }

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
          onClick={handleSubmit(onSubmit, alFallarValidacion)}
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
      {aviso && (
        <div className="form-success-banner" role="status">
          <CheckCircle2 size={15} />
          <span style={{ flex: 1 }}>{aviso}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
            <X size={14} />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, alFallarValidacion)}
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

        <div className="prod-requirements" aria-label="Datos mínimos del producto">
          <strong>Lo mínimo para empezar</strong>
          <div className="prod-requirements-row">
            <span>Para guardar</span>
            {requisitosGuardar.map(r => (
              <button key={r.label} type="button" className={r.listo ? 'ready' : ''} onClick={() => abrirCampo(r)}>
                {r.listo ? <CheckCircle2 size={13} /> : <Circle size={13} />} {r.label}
              </button>
            ))}
          </div>
          <div className="prod-requirements-row">
            <span>Para vender, además</span>
            {requisitosVender.map(r => (
              <button key={r.label} type="button" className={r.listo ? 'ready' : ''} onClick={() => abrirCampo(r)}>
                {r.listo ? <CheckCircle2 size={13} /> : <Circle size={13} />} {r.label}
              </button>
            ))}
          </div>
          <p>Fotos, categoría, descripción y ofertas son opcionales para guardar. Podés completarlas después.</p>
        </div>

        <div className={`tab-content ${tabActiva === 'basica' ? 'active' : ''}`}>
          <div className="form-grid-2">
            <div className="form-group full">
              <label htmlFor="prod-nombre">Nombre <span className="req">*</span></label>
              <input
                id="prod-nombre"
                {...register('nombre', { validate: v => Boolean(v?.trim()) || 'El nombre es requerido.' })}
                aria-invalid={Boolean(errors.nombre)}
                placeholder="Ej: Remera básica azul"
              />
              {errors.nombre && <span className="field-error">{errors.nombre.message}</span>}
            </div>

            {/* SKU obligatorio: es la clave con la que se identifica el
                producto en la importación masiva de precios y en la carga
                desde la API. Productos viejos que nunca tuvieron SKU se
                pueden seguir editando sin cargarlo (el backend aplica la
                misma regla). */}
            <div className="form-group">
              <label htmlFor="prod-sku">SKU {skuObligatorio && <span className="req">*</span>}</label>
              <input
                id="prod-sku"
                aria-invalid={Boolean(errors.sku)}
                {...register('sku', {
                  validate: (v) => !skuObligatorio || Boolean(v?.trim()) || 'El SKU es obligatorio.',
                })}
                placeholder="CRE-300"
                autoComplete="off"
              />
              {errors.sku && <span className="field-error">{errors.sku.message}</span>}
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
                Tags <span className="hint">(SEO y posicionamiento interno, sepáralos por coma)</span>
              </label>
              <input
                id="prod-tags"
                {...register('tags')}
                placeholder="verano, oferta, nuevo"
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
                        aria-invalid={Boolean(errors.precio_base)}
                        className="w-full"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </div>
                {errors.precio_base && <span className="field-error">{errors.precio_base.message}</span>}
                <label className="tax-toggle">
                  <input type="checkbox" {...register('impuestos_incluidos')} />
                  <span>
                    <strong>Precio incluye IVA</strong>
                    <small>Si está marcado, el reporte extrae el IVA desde el precio; si no, calcula 10% sobre el precio sin impuesto.</small>
                  </span>
                </label>
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
                readOnly={!tieneVariantes}
                disabled={tieneVariantes}
              />
            </div>
            <div className="form-group">
              <label htmlFor="prod-stock-deposito">
                Stock en depósito
                <span className="hint"> {tieneVariantes ? '(calculado)' : '(según ubicaciones)'}</span>
              </label>
              <input
                id="prod-stock-deposito"
                type="number"
                min="0"
                {...register('stock_deposito')}
                readOnly
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

          {!tieneVariantes && (
            <div className="stock-depositos-panel">
              <div className="stock-depositos-header">
                <div>
                  <h3>Stock por ubicación</h3>
                  <p>Indicá cuántas unidades están físicamente en cada salón o depósito.</p>
                </div>
                <strong>{stockUbicacionesTotalVal} {unidadVal}{stockUbicacionesTotalVal === 1 ? '' : 's'}</strong>
              </div>

              {depositosStock.length > 0 ? (
                <div className="stock-depositos-grid">
                  {depositosStock.map((dep) => (
                    <label key={dep.id} className="stock-deposito-row">
                      <span>
                        <strong>{dep.nombre}</strong>
                        <small>{dep.tipoUbicacion === 'SALON' ? 'Salón' : 'Depósito'} · {dep.ciudad}{dep.departamento ? `, ${dep.departamento}` : ''}</small>
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={stockPorDeposito.producto?.[String(dep.id)] ?? ''}
                        onChange={(e) => cambiarStockDeposito('producto', dep.id, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="empty-inline-state">
                  <span>Sin ubicaciones cargadas. Creá un salón o depósito para cargar stock.</span>
                  <Link to="/mi-tienda/depositos">Crear ubicación</Link>
                </div>
              )}
            </div>
          )}

          {tieneVariantes && (
            <div className="stock-depositos-panel">
              <div className="stock-depositos-header">
                <div>
                  <h3>Stock por ubicación</h3>
                  <p>Distribuí el stock físico de cada variante entre tus salones y depósitos.</p>
                </div>
                <strong>{stockUbicacionesTotalVal} {unidadVal}{stockUbicacionesTotalVal === 1 ? '' : 's'}</strong>
              </div>

              {depositosStock.length > 0 ? (
                <div className="stock-variant-depositos">
                  {variantesWatch
                    .filter(v => modoLegacyVariantes || v.incluida !== false)
                    .map((variante, idx) => {
                      const key = variante.id ? `variante:${variante.id}` : `nueva:${idx}`;
                      const totalVariante = parseInt(variante.stock_deposito, 10) || 0;
                      const distribuido = sumarStockDepositos(key);
                      const nombreVariante = variante.nombre
                        || (variante.valores || []).map(v => `${v.opcion}: ${v.valor}`).join(' · ')
                        || `Variante ${idx + 1}`;

                      return (
                        <div key={variante.id || variantesFields[idx]?._rhfKey || idx} className="stock-variant-card">
                          <div className="stock-variant-card-head">
                            <div>
                              <strong>{nombreVariante}</strong>
                              <small>{distribuido}/{totalVariante} {unidadVal}{totalVariante === 1 ? '' : 's'} distribuidas</small>
                            </div>
                          </div>
                          {!variante.id && totalVariante > 0 ? (
                            <p className="field-hint">Guardá primero esta variante para poder asignarle stock por ubicación.</p>
                          ) : (
                            <div className="stock-depositos-grid compact">
                              {depositosStock.map((dep) => (
                                <label key={dep.id} className="stock-deposito-row">
                                  <span>
                                    <strong>{dep.nombre}</strong>
                                    <small>{dep.tipoUbicacion === 'SALON' ? 'Salón' : 'Depósito'} · {dep.ciudad}</small>
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={stockPorDeposito[key]?.[String(dep.id)] ?? ''}
                                    disabled={!variante.id || totalVariante <= 0}
                                    onChange={(e) => cambiarStockDeposito(key, dep.id, e.target.value)}
                                  />
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="empty-inline-state">
                  <span>Sin ubicaciones cargadas. Creá un salón o depósito para cargar stock.</span>
                  <Link to="/mi-tienda/depositos">Crear ubicación</Link>
                </div>
              )}
            </div>
          )}

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
            modoLegacyVariantes ? (
              <>
                <p className="field-hint" style={{ marginBottom: '0.75rem' }}>
                  Este producto usa el formato anterior de variantes (nombre libre). Podés seguir editándolo así, o
                  {' '}
                  <button type="button" className="btn-link" onClick={convertirLegacyAOpciones}>
                    convertirlo a Opciones
                  </button>
                  {' '}para poder agregar/quitar combinaciones como Color/Talla por separado.
                </p>
                <div className="variantes-header">
                  <span className="text-center">Foto</span>
                  <span>Nombre de variante</span>
                  <span>SKU</span>
                  <span className="text-center">Stock salón</span>
                  <span className="text-center">Stock depósito</span>
                  <span className="text-center">Total</span>
                  <span>Precio diferencial</span>
                  <span></span>
                </div>
                {variantesFields.map((field, i) => {
                  const salonFila = parseInt(watch(`variantes.${i}.stock_salon`), 10) || 0;
                  const depositoFila = parseInt(watch(`variantes.${i}.stock_deposito`), 10) || 0;
                  const imagenGuardada = field.id ? imagenes.find(img => img.variante_id === field.id) : null;
                  const imagenElegida = imagenesVariante[field._rhfKey];
                  const previewVariante = imagenElegida?.url || imagenGuardada?.url || null;
                  return (
                  <div key={field._rhfKey} className="variante-row variante-row-3">
                    <label className={`variante-foto ${previewVariante ? 'has-image' : ''}`} title="Foto de esta variante">
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
                          setError(null);
                          abrirPreviewVariante(field._rhfKey, file);
                        }}
                      />
                    </label>
                    <input
                      className="variante-input"
                      placeholder="Ej: Talle M - Rojo"
                      {...register(`variantes.${i}.nombre`)}
                    />
                    <input
                      className="variante-input"
                      placeholder="CRE-M-ROJO"
                      {...register(`variantes.${i}.sku_variante`)}
                    />
                    <input
                      type="number"
                      min="0"
                      className="variante-input text-center"
                      placeholder="0"
                      {...register(`variantes.${i}.stock_salon`)}
                    />
                    <input
                      type="number"
                      min="0"
                      className="variante-input text-center"
                      placeholder="0"
                      {...register(`variantes.${i}.stock_deposito`)}
                    />
                    <span className="variante-total-badge" title="Salón + depósito. Es el stock que se vende online.">
                      {salonFila + depositoFila}
                    </span>
                    <div style={{ padding: 0, border: 'none', background: 'transparent' }}>
                      <Controller
                        name={`variantes.${i}.precio_diferencial`}
                        control={control}
                        render={({ field }) => (
                          <CurrencyInput
                            className="variante-input"
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
              </>
            ) : (
              <>
                <div className="opciones-section">
                  {opcionesFields.map((field, i) => (
                    <OpcionRow
                      key={field._rhfKey}
                      control={control}
                      register={register}
                      index={i}
                      onQuitar={() => removeOpcion(i)}
                    />
                  ))}
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => appendOpcion({ nombre: '', orden: opcionesFields.length, valores: [] })}
                  >
                    <Plus size={14} /> Agregar opción
                  </button>
                </div>

                {mostrarSelectorOriginal && (
                  <div className="combinacion-original-card">
                    <div className="combinacion-original-header">
                      <div className="combinacion-original-icon">
                        <Layers size={18} />
                      </div>
                      <div>
                        <label htmlFor="prod-combinacion-original" className="combinacion-original-title">
                          ¿A qué variante corresponde el stock y SKU base de este producto?
                        </label>
                        <p className="combinacion-original-sub">
                          El stock, SKU y precio base que ya tenías cargados se asignarán automáticamente a la combinación elegida.
                        </p>
                      </div>
                    </div>
                    <div className="combinacion-original-select-wrap">
                      <span className="combinacion-original-select-label">Asignar datos base a la variante:</span>
                      <select
                        id="prod-combinacion-original"
                        className="combinacion-original-select"
                        value={combinacionOriginal || firmaDeValores(combinacionesActuales[0])}
                        onChange={e => setCombinacionOriginal(e.target.value)}
                      >
                        {combinacionesActuales.map(valores => {
                          const firma = firmaDeValores(valores);
                          return (
                            <option key={firma} value={firma}>
                              {valores.map(v => v.valor).join(' / ')}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {variantesFields.length > 0 && (
                  <>
                    <div className="variantes-header variantes-header-generada" style={{ marginTop: '1.25rem' }}>
                      <span className="text-center" title="Vendible"></span>
                      <span className="text-center">Foto</span>
                      <span>Combinación</span>
                      <span>SKU</span>
                      <span className="text-center">Stock salón</span>
                      <span className="text-center">Stock depósito</span>
                      <span className="text-center">Total</span>
                      <span>Precio diferencial</span>
                    </div>
                    {variantesFields.map((field, i) => {
                      const estaIncluida = watch(`variantes.${i}.incluida`);
                      const salonFila = parseInt(watch(`variantes.${i}.stock_salon`), 10) || 0;
                      const depositoFila = parseInt(watch(`variantes.${i}.stock_deposito`), 10) || 0;
                      const imagenGuardada = field.id ? imagenes.find(img => img.variante_id === field.id) : null;
                      const imagenElegida = imagenesVariante[field._rhfKey];
                      const previewVariante = imagenElegida?.url || imagenGuardada?.url || null;
                      const nombreDerivado = (field.valores || []).map(v => v.valor).join(' / ');
                      const skuBase = watch('sku_base') || watch('sku') || '';
                      const placeholderSku = skuBase
                        ? `${skuBase}-${(nombreDerivado || '').toUpperCase().replace(/\s*[\/\s]\s*/g, '-')}`
                        : 'SKU variante';
                      // Mientras esta fila sea "el producto actual" (sin nada
                      // guardado todavía), no se le puede subir una foto
                      // propia: crearía una segunda imagen (variante_id
                      // distinto de null) que compite con la principal del
                      // producto y una de las dos termina sin usarse. Usa la
                      // del producto tal cual hasta que la variante se guarde
                      // y pase a ser una fila común, editable como cualquiera.
                      const esLaDesignadaOriginal = mostrarSelectorOriginal
                        && firmaDeValores(field.valores) === (combinacionOriginal || firmaDeValores(combinacionesActuales[0] || []));

                      return (
                      <div
                        key={field._rhfKey}
                        className={`variante-row variante-row-generada ${estaIncluida === false ? 'variante-row-desactivada' : ''}`}
                      >
                        <input
                          type="checkbox"
                          title="Incluir esta combinación como variante vendible"
                          {...register(`variantes.${i}.incluida`)}
                        />
                        {esLaDesignadaOriginal ? (
                          <span className="variante-foto variante-foto-heredada" title="Usa la foto principal del producto. Se podrá cambiar después de guardar.">
                            {imagenPrincipalUrl
                              ? <img src={imagenPrincipalUrl} alt="" />
                              : <span className="variante-foto-vacia"><ImageIcon size={15} /></span>}
                          </span>
                        ) : (
                          <label className={`variante-foto ${previewVariante ? 'has-image' : ''}`} title="Foto de esta variante">
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
                                setError(null);
                                abrirPreviewVariante(field._rhfKey, file);
                              }}
                            />
                          </label>
                        )}
                        <span className="variante-nombre-derivado">{nombreDerivado || '—'}</span>
                        <input
                          className="variante-input"
                          placeholder={placeholderSku}
                          {...register(`variantes.${i}.sku_variante`)}
                        />
                        <input
                          type="number"
                          min="0"
                          className="variante-input text-center"
                          placeholder="0"
                          {...register(`variantes.${i}.stock_salon`)}
                        />
                        <input
                          type="number"
                          min="0"
                          className="variante-input text-center"
                          placeholder="0"
                          {...register(`variantes.${i}.stock_deposito`)}
                        />
                        <span className="variante-total-badge" title="Salón + depósito. Es el stock que se vende online.">
                          {salonFila + depositoFila}
                        </span>
                        <div style={{ padding: 0, border: 'none', background: 'transparent' }}>
                          <Controller
                            name={`variantes.${i}.precio_diferencial`}
                            control={control}
                            render={({ field }) => (
                              <CurrencyInput
                                className="variante-input"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                              />
                            )}
                          />
                        </div>
                      </div>
                      );
                    })}
                  </>
                )}

                <div className="variantes-info-card">
                  <Info size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-primary)' }} />
                  <div>
                    <p>
                      <strong>Combinaciones automáticas:</strong> Se generan solas a partir de las Opciones. Destildá las que no desees vender como variante.
                    </p>
                    <p>
                      <strong>Stock y fotos por variante:</strong> El stock online es la suma de Salón + Depósito. Podés asignar foto y precio diferencial a cada combinación.
                    </p>
                  </div>
                </div>
              </>
            )
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

          <p className="field-hint imagen-flujo-pasos">
            1. Subí tus fotos &nbsp;→&nbsp; 2. Elegí cómo querés mostrarlas &nbsp;→&nbsp; 3. Ajustá el encuadre si hace falta &nbsp;→&nbsp; 4. Aplicá los cambios
          </p>

          <div className="imagenes-grid">
            {[...imagenes].sort((a, b) => a.orden - b.orden).map(img => (
              <ImagenCardCompacta
                key={img.id}
                img={img}
                onEditarEncuadre={() => abrirEditorEncuadre(img.id, false)}
                onMarcarPrincipal={() => marcarPrincipal(img.id)}
                onReprocesar={() => abrirReprocesar(img)}
                onEliminar={() => eliminarImagen(img.id, false)}
              />
            ))}

            {imagenesNuevas.map(img => (
              <ImagenCardCompacta
                key={img.id}
                img={img}
                esNueva
                onEditarEncuadre={() => abrirEditorEncuadre(img.id, true)}
                onEliminar={() => eliminarImagen(img.id, true)}
              />
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
            JPG, PNG o WEBP. Se conserva el original y se genera una versión optimizada para la galería.
          </p>
        </div>

        {imagenEnEdicion && (
          <EditorEncuadreModal
            img={imagenEnEdicion}
            esNueva={!!editandoEncuadre?.esNueva}
            onCancelar={cerrarEditorEncuadre}
            onAplicar={aplicarEditorEncuadre}
          />
        )}

        {previewSubida.length > 0 && (
          <div className="imagen-preview-overlay" role="dialog" aria-modal="true" aria-label="Vista previa de imagenes">
            <div className="imagen-preview-modal">
              <div className="imagen-preview-head">
                <div>
                  <span className="product-preview-kicker">
                    {previewContexto?.tipo === 'variante' ? 'Foto de variante' : 'Galería del producto'}
                  </span>
                  <h3>Revisá cómo van a quedar las imágenes</h3>
                  <p>Se conserva el original y se genera una versión optimizada para la landing.</p>
                </div>
                <button type="button" className="btn-icon" onClick={cancelarPreviewSubida} aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>

              <div className="imagen-preview-lista">
                {previewSubida.map(img => {
                  const recorteAplicado = img.auto_trim !== false && img.recorte?.aplicado;
                  const urlDespues = recorteAplicado ? img.recorte.recortadaUrl : img.url;
                  return (
                  <div className="imagen-preview-item" key={img.id}>
                    <div className="imagen-preview-comparacion">
                      <div className="imagen-preview-comparacion-col">
                        <span className="imagen-preview-comparacion-label">Antes</span>
                        <div className="imagen-preview-stage">
                          <img src={img.url} alt={img.file.name} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
                        </div>
                      </div>
                      <div className="imagen-preview-comparacion-col">
                        <span className="imagen-preview-comparacion-label">Después (así se ve en la landing)</span>
                        <div className="imagen-preview-stage">
                          {img.recorte === undefined
                            ? <span className="imagen-preview-calculando">Calculando recorte…</span>
                            : <img src={urlDespues} alt={img.file.name} style={estiloImagenGaleria(img)} />}
                        </div>
                      </div>
                    </div>
                    <div className="imagen-preview-controls">
                      <strong>{img.file.name}</strong>
                      <div className="imagen-preview-segmented" role="group" aria-label="Tipo de imagen">
                        <button
                          type="button"
                          className={img.preset === 'infografia' ? '' : 'active'}
                          onClick={() => elegirPresetPreview(img.id, 'producto')}
                          title="Elimina márgenes vacíos y muestra el producto completo"
                        >
                          Producto
                        </button>
                        <button
                          type="button"
                          className={img.preset === 'infografia' ? 'active' : ''}
                          onClick={() => elegirPresetPreview(img.id, 'infografia')}
                          title="Conserva la composición completa, sin recorte automático"
                        >
                          Infografía / Banner
                        </button>
                      </div>
                      <label className="imagen-preview-check">
                        <input
                          type="checkbox"
                          checked={img.auto_trim !== false}
                          onChange={e => actualizarPreviewSubida(img.id, { auto_trim: e.target.checked, preset: null })}
                        />
                        Recortar márgenes automáticamente
                      </label>
                      <div className="imagen-preview-segmented" role="group" aria-label="Modo de visualización">
                        <button
                          type="button"
                          className={img.visual_modo !== 'cover' ? 'active' : ''}
                          onClick={() => actualizarPreviewSubida(img.id, { visual_modo: 'contain' })}
                        >
                          Mostrar imagen completa
                        </button>
                        <button
                          type="button"
                          className={img.visual_modo === 'cover' ? 'active' : ''}
                          onClick={() => actualizarPreviewSubida(img.id, { visual_modo: 'cover' })}
                        >
                          Rellenar marco
                        </button>
                      </div>
                      <label>
                        Zoom <span className="editor-encuadre-valor">{Math.round((img.zoom ?? 1) * 100)}%</span>
                        <input
                          type="range"
                          min="100"
                          max="300"
                          value={Math.round((img.zoom ?? 1) * 100)}
                          onChange={e => actualizarPreviewSubida(img.id, { zoom: Number(e.target.value) / 100 })}
                        />
                      </label>
                      <label>
                        Posición horizontal
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={img.focal_x ?? 50}
                          onChange={e => actualizarPreviewSubida(img.id, { focal_x: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        Posición vertical
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={img.focal_y ?? 50}
                          onChange={e => actualizarPreviewSubida(img.id, { focal_y: Number(e.target.value) })}
                        />
                      </label>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="imagen-preview-footer">
                <button type="button" className="btn-secondary" onClick={cancelarPreviewSubida}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={confirmarPreviewSubida} disabled={subiendoImg}>
                  {subiendoImg ? 'Subiendo...' : 'Confirmar imágenes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {reprocesando && (
          <div className="imagen-preview-overlay" role="dialog" aria-modal="true" aria-label="Reprocesar imagen">
            <div className="imagen-preview-modal imagen-reprocesar-modal">
              <div className="imagen-preview-head">
                <div>
                  <span className="product-preview-kicker">Reprocesar imagen</span>
                  <h3>Regenerar desde el original</h3>
                  <p>El archivo original se conserva siempre — esto solo vuelve a generar la versión optimizada de la galería.</p>
                </div>
                <button type="button" className="btn-icon" onClick={cerrarReprocesar} aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>

              {reprocesando.paso === 'elegir' && (
                <>
                  <div className="imagen-preview-controls">
                    <div className="imagen-preview-segmented" role="group" aria-label="Tipo de imagen">
                      <button
                        type="button"
                        className={reprocesando.preset === 'infografia' ? '' : 'active'}
                        onClick={() => setReprocesando(prev => ({ ...prev, preset: 'producto' }))}
                      >
                        Producto
                      </button>
                      <button
                        type="button"
                        className={reprocesando.preset === 'infografia' ? 'active' : ''}
                        onClick={() => setReprocesando(prev => ({ ...prev, preset: 'infografia' }))}
                      >
                        Infografía / Banner
                      </button>
                    </div>
                    <p className="field-hint">
                      {reprocesando.preset === 'infografia'
                        ? 'Sin recorte automático: conserva toda la composición.'
                        : 'Elimina márgenes vacíos y muestra el producto completo (modo Completa).'}
                    </p>
                  </div>
                  <div className="imagen-preview-footer">
                    <button type="button" className="btn-secondary" onClick={cerrarReprocesar}>Cancelar</button>
                    <button type="button" className="btn-primary" onClick={confirmarReprocesar}>Reprocesar</button>
                  </div>
                </>
              )}

              {reprocesando.paso === 'trabajando' && (
                <div className="imagen-preview-controls">
                  <div className="spinner-sm" />
                  <p>Regenerando desde el original…</p>
                </div>
              )}

              {reprocesando.paso === 'resultado' && (
                <>
                  <div className="imagen-preview-comparacion">
                    <div className="imagen-preview-comparacion-col">
                      <span className="imagen-preview-comparacion-label">Antes</span>
                      <div className="imagen-preview-stage">
                        <img src={getMediaUrl(reprocesando.anterior)} alt="Antes" style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
                      </div>
                    </div>
                    <div className="imagen-preview-comparacion-col">
                      <span className="imagen-preview-comparacion-label">Después</span>
                      <div className="imagen-preview-stage">
                        <img src={getMediaUrl(reprocesando.nuevo)} alt="Después" style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="imagen-preview-footer">
                    <button type="button" className="btn-primary" onClick={cerrarReprocesar}>Listo</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
                {MUESTRAS_VISTA_PRODUCTO[fichaRubroVal] && (
                  <button type="button" className="btn-secondary btn-small" onClick={aplicarEjemploVista} disabled={!!muestrasAplicadas[fichaRubroVal]}>
                    Cargar contenido de ejemplo
                  </button>
                )}
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
                        productoId={esEdicion ? id : null}
                        onSubirImagen={esEdicion ? subirImagenFicha : null}
                        variantes={valoresProducto.variantes || []}
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

              

            </div>

            <ProductLandingPreview
              activo={tabActiva === 'marketing'}
              productoId={esEdicion ? id : null}
              producto={valoresProducto}
              categoriaNombre={categoriaActual?.nombre}
              imagenes={imagenes}
              imagenesNuevas={imagenesNuevas}
              variantes={valoresProducto.variantes || []}
              opciones={valoresProducto.opciones || []}
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
          <OfertasProductoTab
            productoId={esEdicion ? id : PRODUCTO_NUEVO}
            productoNombre={nombre}
            productoAnclaPrecioBase={precioBaseVal}
            productoAnclaPrecioCosto={precioCostoVal}
            borradores={esEdicion ? null : ofertasBorrador}
            onBorradoresChange={setOfertasBorrador}
          />
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

      {(isDirty || ofertasBorrador.length > 0) && !guardando && (
        <div className="prod-save-bar">
          <span>Cambios sin guardar</span>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-secondary" onClick={() => { reset(); setOfertasBorrador([]); }}>Descartar</button>
            <button type="button" className="btn-primary" onClick={handleSubmit(onSubmit, alFallarValidacion)}>
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Una fila de "Opción" (ej: Color) con sus Valores como chips removibles
 * (ej: Negro, Blanco). Componente propio porque useFieldArray no se puede
 * llamar condicionalmente dentro del .map() del padre — cada instancia de
 * este componente monta su propio useFieldArray para `opciones.${index}.valores`,
 * que es el patrón soportado por react-hook-form para arrays anidados.
 */
function OpcionRow({ control, register, index, onQuitar }) {
  const { fields: valoresFields, append: appendValor, remove: removeValor } =
    useFieldArray({ control, name: `opciones.${index}.valores`, keyName: '_rhfKey' });
  const [nuevoValor, setNuevoValor] = useState('');

  const agregarValor = () => {
    const v = nuevoValor.trim();
    if (!v) return;
    appendValor({ valor: v, orden: valoresFields.length });
    setNuevoValor('');
  };

  return (
    <div className="opcion-row">
      <div className="opcion-row-header">
        <input placeholder="Ej: Color, RAM, Talla" {...register(`opciones.${index}.nombre`)} />
        <button type="button" className="btn-icon danger" onClick={onQuitar} aria-label="Quitar opción">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="opcion-row-valores">
        {valoresFields.map((vf, j) => (
          <span key={vf._rhfKey} className="opcion-valor-chip">
            <input {...register(`opciones.${index}.valores.${j}.valor`)} />
            <button type="button" onClick={() => removeValor(j)} aria-label="Quitar valor">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          className="opcion-valor-nuevo"
          placeholder="+ valor"
          value={nuevoValor}
          onChange={e => setNuevoValor(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              agregarValor();
            }
          }}
          onBlur={agregarValor}
        />
      </div>
    </div>
  );
}
