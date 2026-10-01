import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  Gift,
  Layers,
  LayoutTemplate,
  Loader2,
  Mic,
  MicOff,
  Monitor,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
  User,
  Wand2,
} from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { vitrinaService } from '../../services/vitrinaService';
import { ofertaService } from '../../services/ofertaService';
import { getMediaUrl } from '../../services/api';
import CodigoPreview from './CodigoPreview';
import ProductPicker from '../landing/ProductPicker';
import { datosRuntimePreview, contentIdPanel } from './datosRuntime';
import { PLANTILLA_PRODUCTO, PLANTILLA_PRODUCTO_SUPLEMENTOS, plantillaInicioPara } from './plantillasBaseCodigo';
// Pesado (arrastra el editor real de ofertas): solo se carga al llegar al paso.
const PasoOfertas = lazy(() => import('./PasoOfertas'));
import '../landing/landing.css';

const SHORTCUTS = [
  { id: 'producto', icono: LayoutTemplate, titulo: 'Landing producto', bajada: 'Pagina de venta', prompt: 'Landing premium para un producto estrella, con hero fuerte, beneficios claros y CTA para comprar por WhatsApp.' },
  { id: 'campana', icono: CalendarDays, titulo: 'Promo/campana', bajada: 'Campana puntual', prompt: 'Promo por tiempo limitado con oferta irresistible, urgencia visual y copy orientado a conversion.' },
  { id: 'combo', icono: Gift, titulo: 'Combo/oferta', bajada: 'Oferta especial', prompt: 'Landing para vender un combo con ahorro visible, comparacion de valor y seccion de preguntas frecuentes.' },
  { id: 'cero', icono: Wand2, titulo: 'Desde cero', bajada: 'Idea libre', prompt: '' },
];

const EJEMPLOS = [
  'Landing premium para unos lentes de sol',
  'Promo 2x1 para Dia de la Madre',
  'Landing para Meta Ads enfocada en conversion',
];

const PROGRESO = [
  'Analizando producto',
  'Definiendo estructura de venta',
  'Generando copy',
  'Disenando secciones',
  'Preparando ofertas',
];

const MENSAJE_INICIAL_PRODUCTOS = 'Primero elegi los productos y combos reales que van a entrar en esta landing. Despues marcamos ofertas, destacados y recien ahi le das el prompt a la IA.';

// El wizard usa los tokens de la app (bg-canvas, bg-surface, text-fg…), que
// ya cambian solos con el tema. Antes acá se pisaban con una paleta oscura
// fija y la pantalla quedaba en modo oscuro aunque la app estuviera en claro.

function contentIdItem(item) {
  if (!item) return '';
  if (item.tipo === 'combo') return `combo-${item.id}`;
  return item.slug || item.content_id || `producto-${item.id}`;
}

function nombreItem(item) {
  return item?.nombre || item?.titulo || `Item ${item?.id || ''}`.trim();
}

function precioItem(item) {
  return Number(item?.precio_usuario ?? item?.precio_efectivo ?? item?.precio_total ?? item?.precio ?? item?.precio_base ?? 0) || 0;
}

function gs(n) {
  return `Gs ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`;
}

function copiarCodigoBase(codigo) {
  if (!codigo) return null;
  return {
    html: String(codigo.html || ''),
    css: String(codigo.css || ''),
    js: String(codigo.js || ''),
    ...(Array.isArray(codigo.fonts) ? { fonts: codigo.fonts } : {}),
  };
}

function plantillaProductoParaIA(items = []) {
  const rubros = new Set((items || []).map(rubroItem));
  return rubros.has('suplementos') ? PLANTILLA_PRODUCTO_SUPLEMENTOS : PLANTILLA_PRODUCTO;
}

function plantillaPrincipalParaIA(venta, items = []) {
  if (venta?.abrir_en === 'producto' || venta?.tipo === 'producto_unico') {
    return plantillaProductoParaIA(items);
  }
  return plantillaInicioPara(venta?.tipo);
}

function baseCodigoParaIA(venta, items = []) {
  return {
    codigo: copiarCodigoBase(plantillaPrincipalParaIA(venta, items)),
    vistas: {
      producto: copiarCodigoBase(plantillaProductoParaIA(items)),
    },
  };
}

function textoItem(item) {
  return [
    item?.nombre,
    item?.categoria,
    item?.ficha_rubro,
    item?.descripcion,
    item?.propuesta_valor,
    typeof item?.ficha_datos === 'object' ? JSON.stringify(item.ficha_datos) : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

// Mismas categorias y mismo orden de reglas que inferirFamiliaProducto() en
// gesicomm-backend/src/services/aiLanding.service.js: si se agrega o cambia
// un rubro ahi, hay que replicarlo aca para que el wizard pregunte lo mismo
// que el backend termina usando para armar el plan de secciones.
function rubroItem(item) {
  const texto = textoItem(item).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/(suplement|proteina|creatina|colageno|vitamina|capsula|adelgaz|fitness|gimnas|nutric|omega|magnesio|probio)/.test(texto)) return 'suplementos';
  if (/(electrodom|licuadora|freidora|air fryer|cafetera|aspiradora|procesador|batidora|horno|microondas)/.test(texto)) return 'electrodomesticos';
  if (/(bazar|hogar|cocina|utensilio|organizador|recipiente|cortador|decoracion|limpieza|jardin)/.test(texto)) return 'bazar_hogar';
  if (/(tech|tecnolog|electron|auricular|smart|celular|notebook|gadget|parlante|reloj|camara)/.test(texto)) return 'tecnologia';
  if (/(beauty|belleza|skincare|piel|cabello|cosmetic|maquill|serum|crema|shampoo)/.test(texto)) return 'belleza';
  if (/(ropa|moda|calzado|remera|camisa|vestido|jean|zapatilla|talle)/.test(texto)) return 'moda';
  return 'general';
}

function tieneLista(valor) {
  return Array.isArray(valor) && valor.some(item => {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object') return false;
    return Object.values(item).some(v => typeof v === 'string' ? v.trim() : Boolean(v));
  });
}

function tieneFichaDato(item, claves = []) {
  const datos = item?.ficha_datos;
  if (!datos || typeof datos !== 'object') return false;
  if (!claves.length) return Object.keys(datos).length > 0;
  return claves.some(clave => {
    const valor = datos[clave];
    if (Array.isArray(valor)) return valor.length > 0;
    if (valor && typeof valor === 'object') return Object.keys(valor).length > 0;
    return Boolean(String(valor || '').trim());
  });
}

function construirPreguntasBrief(items = []) {
  // Los combos comparten forma con los productos (nombre, categoria,
  // ficha_rubro, ficha_datos, beneficios, preguntas_frecuentes): si se
  // excluían acá, una selección 100% combos de suplementos no disparaba
  // ninguna pregunta de rubro aunque el backend sí arma esas secciones.
  const productos = items;
  const rubros = new Set(productos.map(rubroItem));
  const hayBeneficios = productos.some(item => tieneLista(item.beneficios) || item.propuesta_valor || item.descripcion);
  const hayFaq = productos.some(item => tieneLista(item.preguntas_frecuentes || item.faq));
  const hayFicha = productos.some(item => tieneFichaDato(item));
  const preguntas = [
    {
      id: 'prueba_social',
      label: 'Prueba social real',
      ayuda: 'Testimonios, reseñas, capturas, cantidad de clientes o links de imágenes. Si no tenés, dejalo vacío y la IA no inventa.',
      placeholder: 'Ej: 3 reseñas reales: María dijo "..."; captura: https://...; 4.8/5 en WhatsApp...',
      siempre: true,
    },
    {
      id: 'objeciones',
      label: 'Objeciones del cliente',
      ayuda: 'Dudas que suelen frenar la compra: precio, entrega, uso, confianza, resultados, compatibilidad.',
      placeholder: 'Ej: Dudan si realmente funciona, si llega rápido, si es original...',
      siempre: true,
    },
  ];

  if (!hayBeneficios) {
    preguntas.push({
      id: 'beneficios',
      label: 'Beneficios principales',
      ayuda: 'Pasale 3 a 6 beneficios reales. La IA los convierte en argumentos de venta sin inventar claims.',
      placeholder: 'Ej: ayuda a controlar el apetito; acompaña la rutina; fácil de tomar...',
    });
  }

  if (!hayFaq) {
    preguntas.push({
      id: 'faq',
      label: 'Preguntas frecuentes',
      ayuda: 'Preguntas y respuestas reales que querés que aparezcan en la landing.',
      placeholder: 'Ej: ¿Cómo se usa? ... ¿Cuánto tarda la entrega? ... ¿Tiene garantía? ...',
    });
  }

  if ((rubros.has('suplementos') || rubros.has('belleza')) && !hayFicha) {
    preguntas.push({
      id: 'modo_uso_ingredientes',
      label: rubros.has('suplementos') ? 'Modo de uso e ingredientes' : 'Rutina, modo de uso e ingredientes',
      ayuda: 'Datos sensibles: mejor que los pase el comercio para no inventar.',
      placeholder: 'Ej: tomar 2 cápsulas al día; ingredientes principales; recomendaciones...',
    });
  }

  if ((rubros.has('tecnologia') || rubros.has('electrodomesticos')) && !productos.some(item => tieneFichaDato(item, ['especificaciones', 'en_la_caja', 'comparativa']))) {
    preguntas.push({
      id: 'detalles_tecnicos',
      label: 'Detalles técnicos',
      ayuda: 'Especificaciones, qué incluye la caja, compatibilidades o comparaciones reales.',
      placeholder: 'Ej: batería 50 h; incluye cable USB-C; garantía 30 días...',
    });
  }

  if (rubros.has('bazar_hogar') && !hayFicha) {
    preguntas.push({
      id: 'usos_concretos',
      label: 'Usos concretos',
      ayuda: 'Para qué sirve en el día a día, en qué escenarios se usa y qué problema resuelve.',
      placeholder: 'Ej: organiza la alacena; se usa en la mesada; entra en cajones de hasta 40cm...',
    });
  }

  if (rubros.has('moda') && !productos.some(item => tieneFichaDato(item, ['guia_talles', 'tabla_medidas']))) {
    preguntas.push({
      id: 'guia_talles',
      label: 'Guía de talles',
      ayuda: 'Medidas reales por talle (busto, cintura, cadera, largo). Una medida inventada hace que compren el talle equivocado — mejor cargarla vos.',
      placeholder: 'Ej: S: busto 86-90cm, cintura 66-70cm; M: busto 90-94cm, cintura 70-74cm...',
    });
  }

  return preguntas;
}

function limpiarBriefComercial(respuestas = {}, preguntas = []) {
  const permitidos = new Set(preguntas.map(p => p.id));
  const salida = {};
  Object.entries(respuestas || {}).forEach(([key, valor]) => {
    if (!permitidos.has(key)) return;
    const texto = String(valor || '').replace(/\s+/g, ' ').trim();
    if (texto) salida[key] = texto.slice(0, 1800);
  });
  return {
    completado: Object.keys(salida).length > 0,
    respuestas: salida,
  };
}

function textoError(valor, fallback = '') {
  if (!valor) return fallback;
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) {
    const partes = valor.map(item => textoError(item)).filter(Boolean);
    return partes.length ? partes.join('\n') : fallback;
  }
  if (typeof valor === 'object') {
    if (valor.message || valor.mensaje || valor.msg || valor.error || valor.detail) {
      return textoError(valor.message || valor.mensaje || valor.msg || valor.error || valor.detail, fallback);
    }
    try {
      return JSON.stringify(valor);
    } catch {
      return fallback;
    }
  }
  return String(valor);
}

function mensajeErrorGeneracion(error) {
  const data = error?.response?.data;
  const detalle = textoError(data?.errores || data?.detail || data?.message || data?.error);
  if (detalle) return detalle;
  if (error?.response) {
    return textoError(error.message, `El servidor respondió ${error.response.status}.`);
  }
  return 'Se cortó la conexión y no pudimos confirmar si la landing quedó creada. Revisá Páginas de venta antes de volver a generar.';
}

export default function AILandingWizard({ onCreada }) {
  const [mensajes, setMensajes] = useState(() => [{
    id: 'inicio-productos',
    rol: 'bot',
    texto: MENSAJE_INICIAL_PRODUCTOS,
    widget: 'productos',
  }]);
  const [input, setInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [paso, setPaso] = useState('productos'); // 'productos' | 'ofertas' | 'prompt' | 'generando' | 'listo' | 'error'
  const [landingGenerada, setLandingGenerada] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState(new Map());
  const [ventaConfigurada, setVentaConfigurada] = useState(null);
  // Catálogo completo para el panel de venta (ofertas/combos/recomendados).
  const [catalogo, setCatalogo] = useState(null);
  const [ofertasTienda, setOfertasTienda] = useState([]);
  const [ofertasSeleccionadas, setOfertasSeleccionadas] = useState(new Set());
  const [destacadosSeleccionados, setDestacadosSeleccionados] = useState(new Set());
  const [briefComercial, setBriefComercial] = useState({});
  // Por defecto la landing muestra la oferta por tiempo limitado del template.
  // Si el comercio la deja activa, la IA completa el bloque con datos demo
  // para previsualizar; Gesicomm igual exige confirmar datos reales antes de
  // publicar (ver ConfigurarVentaCodigo).
  const [permitirDemoIA, setPermitirDemoIA] = useState(true);
  const [cargandoOfertas, setCargandoOfertas] = useState(false);
  const [errorOfertas, setErrorOfertas] = useState('');
  const [modoOfertasAvanzado, setModoOfertasAvanzado] = useState(false);
  const [shortcutActivo, setShortcutActivo] = useState(null);
  // Precio tachado por producto, por landing (landing_items.precio_ancla):
  // no toca el precio del producto ni el de otras páginas.
  const [anclas, setAnclas] = useState({});
  const [previewModo, setPreviewModo] = useState('desktop');
  const mensajesFinRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    mensajesFinRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    if (!ofertasTienda.length || productosSeleccionados.size === 0 || ofertasSeleccionadas.size === 0) return;
    const idsProductos = new Set(Array.from(productosSeleccionados.values()).filter(i => i.tipo === 'producto').map(i => Number(i.id)));
    const idsValidos = new Set((ofertasTienda || [])
      .filter(o => idsProductos.has(Number(o.producto_ancla_id)))
      .map(o => Number(o.id)));
    const invalidas = Array.from(ofertasSeleccionadas).filter(id => !idsValidos.has(Number(id)));
    if (!invalidas.length) return;
    setOfertasSeleccionadas(prev => {
      const copia = new Set(prev);
      invalidas.forEach(id => copia.delete(Number(id)));
      return copia;
    });
    setErrorOfertas('Quitamos ofertas que ya no correspondían a los productos elegidos.');
  }, [productosSeleccionados, ofertasTienda, ofertasSeleccionadas]);

  const agregarMensaje = (rol, texto, widget = null) => {
    setMensajes(prev => [...prev, { id: Date.now() + Math.random(), rol, texto, widget }]);
  };

  const usarPrompt = (texto, shortcutId = null) => {
    setShortcutActivo(shortcutId);
    setInput(texto);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const enviarPrompt = (e) => {
    e.preventDefault();
    if (!input.trim() || !['prompt', 'listo'].includes(paso) || paso === 'generando') return;

    const texto = input.trim();
    setPrompt(texto);
    setInput('');
    agregarMensaje('user', texto);
    if (paso === 'listo' && landingGenerada?.id) {
      regenerarLanding(texto);
      return;
    }
    const elegidos = Array.from(productosSeleccionados.values());
    const ids = Array.from(ofertasSeleccionadas);
    generarLanding(ventaParaIA(elegidos, ids, Array.from(destacadosSeleccionados)), elegidos, elegidos, texto);
  };

  const cargarCatalogo = async () => {
    if (catalogo) return catalogo;
    try {
      const data = await vitrinaService.catalogo();
      setCatalogo(data);
      return data;
    } catch {
      const vacio = { productos: [], combos: [] };
      setCatalogo(vacio);
      return vacio;
    }
  };

  const cargarOfertasDisponibles = async () => {
    setCargandoOfertas(true);
    setErrorOfertas('');
    try {
      const lista = await ofertaService.listarTodas({ estrategias: ['normal', 'order_bump', 'upsell'] });
      const limpias = Array.isArray(lista) ? lista : [];
      setOfertasTienda(limpias);
      return limpias;
    } catch (err) {
      setErrorOfertas(err?.response?.data?.message || 'No pudimos traer tus ofertas. Podés continuar sin ofertas o reintentar.');
      setOfertasTienda([]);
      return [];
    } finally {
      setCargandoOfertas(false);
    }
  };

  const preguntasBrief = construirPreguntasBrief(Array.from(productosSeleccionados.values()));

  const ventaParaIA = (seleccion, ofertasIds = [], destacadosIds = [], brief = briefComercial) => {
    const productos = (seleccion || []).filter(item => item.tipo === 'producto');
    const esProductoUnico = productos.length === 1 && seleccion.length === 1;
    const hayCombos = (seleccion || []).some(item => item.tipo === 'combo');
    const destacadosLimpios = destacadosIds.map(String).filter(Boolean);
    const briefLimpio = limpiarBriefComercial(brief, construirPreguntasBrief(seleccion || []));
    return {
      configurado: true,
      tipo: esProductoUnico ? 'producto_unico' : hayCombos ? 'combos' : 'catalogo',
      seleccion: 'manual',
      categorias: [],
      incluir_combos: true,
      abrir_en: esProductoUnico ? 'producto' : 'tienda',
      combos_primero: hayCombos && !esProductoUnico,
      principal_id: esProductoUnico && productos[0]?.id ? Number(productos[0].id) : null,
      paquetes: {},
      cross_sell: { activo: true, ofertas: ofertasIds.map(Number).filter(Boolean) },
      recomendados: {
        activo: true,
        modo: destacadosLimpios.length ? 'manual' : 'auto',
        items: destacadosLimpios,
        max: Math.max(4, destacadosLimpios.length),
        titulo: destacadosLimpios.length ? 'Destacados' : '',
      },
      ...(briefLimpio.completado ? { brief_comercial: briefLimpio } : {}),
    };
  };

  const abrirPasoOfertas = async () => {
    if (productosSeleccionados.size === 0) {
      alert('Por favor elegi al menos un producto.');
      return;
    }
    setPaso('ofertas');
    setModoOfertasAvanzado(false);
    await cargarOfertasDisponibles();
    // El catálogo completo lo necesita el panel de creación: ahí se elige a
    // qué producto se le suma la oferta, y puede ser uno que no esté en la landing.
    await cargarCatalogo();
  };

  const avanzarABrief = (idsOfertas = Array.from(ofertasSeleccionadas)) => {
    const elegidos = Array.from(productosSeleccionados.values());
    if (!elegidos.length) {
      alert('Por favor elegi al menos un producto.');
      return;
    }
    // Si cambiaron los productos elegidos, algunas respuestas del brief
    // pueden dejar de aplicar (ej: "modo de uso e ingredientes" si ya no
    // hay ningún suplemento). Antes se descartaban recién al generar, sin
    // avisar. Acá se avisa y se limpian del estado para que el usuario vea
    // qué se perdió en vez de notarlo al final.
    const idsVigentes = new Set(construirPreguntasBrief(elegidos).map(p => p.id));
    const respondidas = Object.entries(briefComercial).filter(([, valor]) => String(valor || '').trim());
    const descartadas = respondidas.filter(([id]) => !idsVigentes.has(id));
    if (descartadas.length) {
      setBriefComercial(prev => {
        const copia = { ...prev };
        descartadas.forEach(([id]) => delete copia[id]);
        return copia;
      });
      alert(`Cambiaste los productos: se perdieron ${descartadas.length} respuesta(s) del brief que ya no aplican a esta selección.`);
    }
    const ventaFinal = ventaParaIA(elegidos, idsOfertas, Array.from(destacadosSeleccionados));
    setVentaConfigurada(ventaFinal);
    setPaso('brief');
  };

  const continuarAPromptDesdeBrief = () => {
    const elegidos = Array.from(productosSeleccionados.values());
    const ventaFinal = ventaParaIA(elegidos, Array.from(ofertasSeleccionadas), Array.from(destacadosSeleccionados), briefComercial);
    setVentaConfigurada(ventaFinal);
    setPaso('prompt');
    agregarMensaje('bot', [
      'Perfecto. Ahora escribí la dirección visual o el enfoque que querés para esta landing.',
      'Ejemplo: "Para la Pulsera Activity Tracker, en la ficha del producto agregá un timer de 2 horas y una oferta agresiva. Destacá la Botella Aromática y el combo Smart Life en la home."',
    ].join('\n\n'));
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const generarLanding = async (ventaFinal = null, seleccionFinal = null, itemsPayload = null, promptFinal = prompt) => {
    const elegidos = seleccionFinal || Array.from(productosSeleccionados.values());
    const itemsParaBackend = itemsPayload || elegidos;
    if (!elegidos.length && !['todos', 'categoria'].includes(ventaFinal?.seleccion)) {
      alert('Por favor elegi al menos un producto.');
      return;
    }

    if (seleccionFinal) {
      setProductosSeleccionados(new Map(seleccionFinal.map(item => [`${item.tipo}:${item.id}`, item])));
    }
    setVentaConfigurada(ventaFinal);
    setPaso('generando');
    // Con nombres, no con números: "4 producto(s)" no te deja verificar que
    // la IA va a trabajar con lo que vos elegiste.
    const lineas = ['Listo, arranco. Esto es lo que va a usar la IA:', ''];
    lineas.push(`Productos y combos (${elegidos.length})`);
    elegidos.forEach(i => lineas.push(`  · ${i.nombre || `Item ${i.id}`}`));
    const nombresOfertas = (ventaFinal?.cross_sell?.ofertas || [])
      .map(id => nombrePorOfertaId.get(Number(id)))
      .filter(Boolean);
    if (nombresOfertas.length) {
      lineas.push('', `Ofertas que se muestran (${nombresOfertas.length})`);
      nombresOfertas.forEach(n => lineas.push(`  · ${n}`));
    } else if (ventaFinal) {
      lineas.push('', 'Sin ofertas marcadas.');
    }
    const destacados = ventaFinal?.recomendados?.items || [];
    if (destacados.length) {
      const nombres = destacados.map(cid => elegidos.find(i => contentIdPanel(i) === cid)?.nombre || cid);
      lineas.push('', `Destacados (${nombres.length})`);
      nombres.forEach(n => lineas.push(`  · ${n}`));
    }
    agregarMensaje('bot', lineas.join('\n'));

    try {
      const items = itemsParaBackend.map(item => ({
        tipo: item.tipo,
        id: Number(item.id),
        // Precio tachado de ESTA landing, no del producto.
        precio_ancla: Number(anclas[`${item.tipo}:${item.id}`]) || null,
      }));

      // El template puede traer una oferta por tiempo limitado. La IA puede
      // dejar la estructura del countdown; si no hay fecha real, el runtime
      // muestra un countdown generado y publicar advierte.
      const promptConDemo = [
        promptFinal,
        permitirDemoIA
          ? 'Podés incluir una sección de oferta por tiempo limitado, conservando la estructura y estilos del template base. Usá data-gesicomm-countdown sin escribir fechas ni JS propio; Gesicomm se encarga de pintarlo. Si incluís estadísticas, devolvé demo_data.prueba_social como datos generados por IA para que el comercio los revise antes de publicar.'
          : 'No incluyas countdown de oferta ni estadísticas de ejemplo (demo_data/data-gesicomm-countdown/data-gesicomm-lista="estadisticas") en esta landing: el comercio no lo autorizó.',
      ].join('\n\n');

      const landing = await landingSimpleService.crearDesdeIA(
        promptConDemo,
        items,
        ventaFinal,
        baseCodigoParaIA(ventaFinal, elegidos),
      );

      agregarMensaje('bot', 'Landing generada. Podes revisarla a la derecha y abrirla en Gesicomm para ajustar ofertas, secciones y codigo.', 'listo');
      setPaso('listo');
      setLandingGenerada(landing);
    } catch (error) {
      // Generar tarda minutos y el navegador puede cortar la conexión aunque
      // el backend haya terminado bien: pasó y el comercio vio "Network
      // Error" con la landing ya creada. Si no hubo respuesta del servidor,
      // se pregunta si quedó hecha antes de dar nada por perdido.
      if (!error?.response) {
        try {
          const landings = await landingSimpleService.listar();
          const reciente = (landings || []).sort((a, b) => b.id - a.id)[0];
          if (reciente?.content?.codigo?.html) {
            agregarMensaje('bot', 'Tardó más de lo normal y se cortó la conexión, pero la landing quedó generada. Acá está.', 'listo');
            setPaso('listo');
            setLandingGenerada(reciente);
            return;
          }
        } catch { /* si tampoco se puede consultar, cae al error de abajo */ }
      }
      setPaso('error');
      agregarMensaje('bot', mensajeErrorGeneracion(error));
    }
  };

  const regenerarLanding = async (texto) => {
    if (!landingGenerada?.id) return;
    const pasoAnterior = paso;
    setPaso('generando');
    agregarMensaje('bot', 'Voy a aplicar ese cambio sobre la landing actual, manteniendo los productos y ofertas configurados.');
    try {
      const actualizada = await landingSimpleService.regenerarConIA(landingGenerada.id, texto);
      setLandingGenerada(actualizada);
      setPaso('listo');
      agregarMensaje('bot', 'Listo. Actualicé la landing y el preview ya muestra la nueva versión.', 'listo');
    } catch (error) {
      setPaso(pasoAnterior || 'listo');
      agregarMensaje('bot', mensajeErrorGeneracion(error));
    }
  };

  const generarSinOfertas = () => {
    setOfertasSeleccionadas(new Set());
    avanzarABrief([]);
  };

  const generarConOfertasElegidas = () => {
    avanzarABrief(Array.from(ofertasSeleccionadas));
  };

  const volverAProductos = () => {
    setPaso('productos');
  };

  // Vuelve un paso, sin perder lo elegido: es la salida que faltaba cuando
  // ya habías pasado al prompt y querías corregir una oferta.
  const volverAtras = () => {
    if (paso === 'prompt') { setPaso('ofertas'); return; }
    if (paso === 'brief') { setPaso('ofertas'); return; }
    if (paso === 'ofertas') { setPaso('productos'); return; }
    if (paso === 'error') { setPaso('prompt'); return; }
  };
  const puedeVolver = ['ofertas', 'brief', 'prompt', 'error'].includes(paso);

  const nombrePorOfertaId = new Map((ofertasTienda || []).map(o => [Number(o.id), o.nombre]));

  const puedeEnviar = input.trim() && ['prompt', 'listo'].includes(paso) && paso !== 'generando';
  const productosElegidos = productosSeleccionados.size;
  const modoWorkspace = true;

  return (
    <div
      className={`h-[calc(100vh-120px)] min-h-[680px] w-full rounded-[22px] bg-canvas text-fg shadow-xl ring-1 ring-border ${modoWorkspace ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
      data-ai-wizard-root
    >
      {paso === 'ofertas' && modoOfertasAvanzado ? (
        // Ocupa el ancho completo: acá se crean ofertas de verdad y el
        // formulario no entra en la columna del chat.
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-fg-muted"><Loader2 size={16} className="mr-2 animate-spin" /> Abriendo tus ofertas…</div>}>
          <PasoOfertas
            productosSeleccionados={productosSeleccionados}
            catalogo={catalogo}
            ofertasElegidas={ofertasSeleccionadas}
            setOfertasElegidas={setOfertasSeleccionadas}
            destacados={destacadosSeleccionados}
            setDestacados={setDestacadosSeleccionados}
            onVolver={() => setModoOfertasAvanzado(false)}
            onContinuar={generarConOfertasElegidas}
            onSaltear={generarSinOfertas}
            onOfertasCargadas={setOfertasTienda}
            anclas={anclas}
            setAnclas={setAnclas}
            onComboCreado={async (combo) => {
              // Entra a la landing sin volver al paso anterior: lo acabás de
              // armar acá, sería absurdo pedirte que lo busques de nuevo.
              const item = { tipo: 'combo', id: Number(combo.id), nombre: combo.nombre, precio: combo.precio_total };
              setProductosSeleccionados(prev => new Map(prev).set(`combo:${item.id}`, item));
              setCatalogo(await vitrinaService.catalogo().catch(() => catalogo));
            }}
          />
        </Suspense>
      ) : (
      <div className={`${modoWorkspace ? `grid h-full grid-cols-1 ${paso === 'listo' ? 'lg:grid-cols-[minmax(340px,34%)_minmax(0,66%)]' : 'lg:grid-cols-[minmax(420px,58%)_minmax(0,42%)]'}` : 'flex min-h-full flex-col'}`}>
        <AssistantPanel
          puedeVolver={puedeVolver}
          volverAtras={volverAtras}
          modoWorkspace={modoWorkspace}
          mensajes={mensajes}
          paso={paso}
          input={input}
          setInput={setInput}
          puedeEnviar={puedeEnviar}
          productosElegidos={productosElegidos}
          productosSeleccionados={productosSeleccionados}
          setProductosSeleccionados={setProductosSeleccionados}
          catalogo={catalogo}
          composerRef={composerRef}
          mensajesFinRef={mensajesFinRef}
          usarPrompt={usarPrompt}
          shortcutActivo={shortcutActivo}
          enviarPrompt={enviarPrompt}
          generarLanding={generarLanding}
          generarSinOfertas={generarSinOfertas}
          abrirPasoOfertas={abrirPasoOfertas}
          generarConOfertasElegidas={generarConOfertasElegidas}
          continuarAPromptDesdeBrief={continuarAPromptDesdeBrief}
          ofertasTienda={ofertasTienda}
          ofertasSeleccionadas={ofertasSeleccionadas}
          setOfertasSeleccionadas={setOfertasSeleccionadas}
          destacadosSeleccionados={destacadosSeleccionados}
          setDestacadosSeleccionados={setDestacadosSeleccionados}
          cargandoOfertas={cargandoOfertas}
          errorOfertas={errorOfertas}
          setErrorOfertas={setErrorOfertas}
          volverAProductos={volverAProductos}
          setPaso={setPaso}
          anclas={anclas}
          setAnclas={setAnclas}
          briefComercial={briefComercial}
          setBriefComercial={setBriefComercial}
          preguntasBrief={preguntasBrief}
          permitirDemoIA={permitirDemoIA}
          setPermitirDemoIA={setPermitirDemoIA}
          onCrearNuevaOferta={() => setModoOfertasAvanzado(true)}
          onReintentarOfertas={cargarOfertasDisponibles}
        />

        <PreviewPanel
          paso={paso}
          landingGenerada={landingGenerada}
          productosSeleccionados={productosSeleccionados}
          ofertasSeleccionadas={ofertasSeleccionadas}
          ofertasTienda={ofertasTienda}
          destacadosSeleccionados={destacadosSeleccionados}
          onCreada={onCreada}
          modoWorkspace={modoWorkspace}
          previewModo={previewModo}
          setPreviewModo={setPreviewModo}
        />
      </div>
      )}
    </div>
  );
}

function AssistantPanel({
  puedeVolver,
  volverAtras,
  modoWorkspace,
  mensajes,
  paso,
  input,
  setInput,
  puedeEnviar,
  productosElegidos,
  productosSeleccionados,
  setProductosSeleccionados,
  catalogo,
  composerRef,
  mensajesFinRef,
  usarPrompt,
  shortcutActivo,
  enviarPrompt,
  generarLanding,
  generarSinOfertas,
  abrirPasoOfertas,
  generarConOfertasElegidas,
  continuarAPromptDesdeBrief,
  ofertasTienda,
  ofertasSeleccionadas,
  setOfertasSeleccionadas,
  destacadosSeleccionados,
  setDestacadosSeleccionados,
  cargandoOfertas,
  errorOfertas,
  setErrorOfertas,
  volverAProductos,
  setPaso,
  anclas,
  setAnclas,
  briefComercial,
  setBriefComercial,
  preguntasBrief,
  permitirDemoIA,
  setPermitirDemoIA,
  onCrearNuevaOferta,
  onReintentarOfertas,
}) {
  const mostrarComposer = ['prompt', 'generando', 'listo'].includes(paso);
  const irAProductos = () => setPaso('productos');
  const irAOfertas = () => {
    if (productosSeleccionados.size === 0) return;
    abrirPasoOfertas();
  };
  const irAPrompt = () => {
    if (productosSeleccionados.size === 0) return;
    if (['prompt', 'generando', 'listo'].includes(paso)) return;
    if (paso === 'brief') continuarAPromptDesdeBrief();
    else generarConOfertasElegidas();
  };
  const contenido = (
    <>
      <Header
        compact={modoWorkspace}
        puedeVolver={puedeVolver}
        onVolver={volverAtras}
      />
      <div className="px-5 pb-3">
        <WizardStepper
          paso={paso}
          productosListos={productosSeleccionados.size > 0}
          ofertasListas={['brief', 'prompt', 'generando', 'listo'].includes(paso)}
          briefListo={['prompt', 'generando', 'listo'].includes(paso)}
          onProductos={irAProductos}
          onOfertas={irAOfertas}
          onBrief={generarConOfertasElegidas}
          onPrompt={irAPrompt}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {paso === 'productos' && (
          <ProductosStep
            productosSeleccionados={productosSeleccionados}
            setProductosSeleccionados={setProductosSeleccionados}
            catalogo={catalogo}
            abrirPasoOfertas={abrirPasoOfertas}
            anclas={anclas}
            setAnclas={setAnclas}
            destacadosSeleccionados={destacadosSeleccionados}
            setDestacadosSeleccionados={setDestacadosSeleccionados}
          />
        )}

        {paso === 'ofertas' && (
          <OfertasStep
            productosSeleccionados={productosSeleccionados}
            ofertasTienda={ofertasTienda}
            ofertasSeleccionadas={ofertasSeleccionadas}
            setOfertasSeleccionadas={setOfertasSeleccionadas}
            cargandoOfertas={cargandoOfertas}
            errorOfertas={errorOfertas}
            setErrorOfertas={setErrorOfertas}
            onReintentar={onReintentarOfertas}
            onContinuar={generarConOfertasElegidas}
            onSinOfertas={generarSinOfertas}
            onCrearNuevaOferta={onCrearNuevaOferta}
          />
        )}

        {paso === 'brief' && (
          <BriefStep
            preguntas={preguntasBrief}
            respuestas={briefComercial}
            setRespuestas={setBriefComercial}
            onContinuar={continuarAPromptDesdeBrief}
            onEditarOfertas={irAOfertas}
            permitirDemoIA={permitirDemoIA}
            setPermitirDemoIA={setPermitirDemoIA}
          />
        )}

        {paso === 'prompt' && (
          <PromptStep
            productosSeleccionados={productosSeleccionados}
            ofertasTienda={ofertasTienda}
            ofertasSeleccionadas={ofertasSeleccionadas}
            destacadosSeleccionados={destacadosSeleccionados}
            briefComercial={briefComercial}
            preguntasBrief={preguntasBrief}
            input={input}
            setInput={setInput}
            onEditarProductos={irAProductos}
            onEditarOfertas={irAOfertas}
          />
        )}

        {paso === 'generando' && (
          <div className="rounded-2xl bg-primary/10 p-4 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Loader2 size={16} className="animate-spin text-primary-text" />
              Creando tu landing...
            </div>
            <ProgressChecklist />
          </div>
        )}

        {paso === 'listo' && (
          <GeneratedStep
            mensajes={mensajes}
            productosSeleccionados={productosSeleccionados}
            ofertasTienda={ofertasTienda}
            ofertasSeleccionadas={ofertasSeleccionadas}
            destacadosSeleccionados={destacadosSeleccionados}
            onEditarProductos={irAProductos}
            onEditarOfertas={irAOfertas}
          />
        )}
      </div>
      {mostrarComposer && (
        <div className="shrink-0 border-t border-border bg-surface p-4">
          <Composer
            input={input}
            setInput={setInput}
            puedeEnviar={puedeEnviar}
            paso={paso}
            composerRef={composerRef}
            enviarPrompt={enviarPrompt}
            compacto={modoWorkspace}
          />
        </div>
      )}
    </>
  );

  if (modoWorkspace) {
    return (
      <section className="flex min-h-0 flex-col bg-surface ring-1 ring-border lg:ring-r" aria-label="Asistente IA">
        {contenido}
      </section>
    );
  }

  return (
    <section className="shrink-0 bg-surface px-5 py-4" aria-label="Crear con IA">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        {contenido}
      </div>
    </section>
  );
}

function Header({ compact = false, puedeVolver = false, onVolver }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${compact ? 'px-5 pb-4 pt-5' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-text">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight text-fg">Crear con IA</h1>
          <p className="mt-1 text-sm text-fg-muted">Converti una idea en una landing lista para vender.</p>
        </div>
      </div>
      {puedeVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-surface-2 px-3 text-xs font-semibold text-fg-muted transition hover:bg-surface-3 hover:text-fg"
        >
          <ArrowLeft size={14} /> Volver
        </button>
      )}
    </div>
  );
}

function WizardStepper({ paso, productosListos, ofertasListas, briefListo, onProductos, onOfertas, onBrief, onPrompt }) {
  const pasos = [
    { id: 'productos', label: 'Productos', done: productosListos, onClick: onProductos },
    { id: 'ofertas', label: 'Ofertas', done: ofertasListas, onClick: onOfertas, disabled: !productosListos },
    { id: 'brief', label: 'Brief', done: briefListo, onClick: onBrief, disabled: !productosListos },
    { id: 'prompt', label: 'Instrucciones', done: paso === 'listo', onClick: onPrompt, disabled: !productosListos || !ofertasListas },
  ];
  const activo = paso === 'generando' || paso === 'listo' ? 'prompt' : paso;
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-2 ring-1 ring-border" aria-label="Pasos de creación">
      {pasos.map((item, index) => {
        const seleccionado = activo === item.id;
        const Icono = item.done ? Check : seleccionado ? Circle : Circle;
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition sm:flex-none ${
              seleccionado
                ? 'bg-primary text-primary-fg shadow-sm'
                : item.done
                  ? 'bg-success/10 text-success hover:bg-success/15'
                  : 'text-fg-muted hover:bg-surface-3 hover:text-fg disabled:cursor-not-allowed disabled:opacity-45'
            }`}
          >
            <Icono size={14} />
            <span>{index + 1}. {item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function ProductosStep({
  productosSeleccionados,
  setProductosSeleccionados,
  catalogo,
  abrirPasoOfertas,
  destacadosSeleccionados,
  setDestacadosSeleccionados,
}) {
  const items = Array.from(productosSeleccionados.values());
  const alternarItem = (item) => {
    setProductosSeleccionados(prev => {
      const nueva = new Map(prev);
      const clave = `${item.tipo}:${item.id}`;
      if (nueva.has(clave)) {
        nueva.delete(clave);
        setDestacadosSeleccionados(dest => {
          const copia = new Set(dest);
          copia.delete(contentIdPanel(item));
          return copia;
        });
      } else {
        nueva.set(clave, item);
      }
      return nueva;
    });
  };
  const alternarDestacado = (item) => {
    const id = contentIdPanel(item);
    setDestacadosSeleccionados(prev => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id); else copia.add(id);
      return copia;
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold leading-tight text-fg">¿Qué querés vender?</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">Elegí uno o más productos o combos reales. Si elegís varios, la IA arma una tienda/catálogo; si elegís uno, arma una campaña enfocada.</p>
      </div>

      <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
        <ProductPicker
          catalogo={catalogo || { productos: [], combos: [] }}
          seleccion={productosSeleccionados}
          itemsOrdenados={items}
          onToggle={alternarItem}
          onReordenar={() => {}}
          max={10}
          triggerLabel="Seleccionar productos"
          modalTitle="Seleccioná productos y combos reales"
          refrescarCatalogoAlAbrir
          themeScopeClassName="light"
          zIndexModal={3000}
          mostrarLista={false}
          mostrarInputs={false}
        />

        {items.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center">
            <PackageCheck size={28} className="mx-auto text-fg-subtle" />
            <p className="mt-3 text-sm font-semibold text-fg">Todavía no elegiste productos.</p>
            <p className="mt-1 text-xs text-fg-muted">La IA solo va a trabajar con productos, precios e imágenes reales de tu tienda.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((item, index) => {
              const destacado = destacadosSeleccionados.has(contentIdPanel(item));
              return (
                <article key={`${item.tipo}:${item.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <Thumb item={item} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-fg">{nombreItem(item)}</p>
                      {items.length === 1 && index === 0 && <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary-text">Campaña de producto</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-fg-muted">{item.tipo === 'combo' ? 'Combo' : 'Producto'} · {gs(precioItem(item))}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => alternarDestacado(item)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${destacado ? 'bg-warning/12 text-warning' : 'text-fg-muted hover:bg-surface hover:text-fg'}`}
                    >
                      <Star size={13} /> {destacado ? 'Destacado' : 'Destacar'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={abrirPasoOfertas}
          disabled={items.length === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuar a ofertas <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function metaOfertaWizard(estrategia) {
  if (estrategia === 'normal') {
    return {
      etiqueta: 'Paquete',
      donde: 'Aparece en la ficha del producto',
      tono: 'bg-primary/10 text-primary-text ring-primary/15',
    };
  }
  if (estrategia === 'order_bump') {
    return {
      etiqueta: 'Order bump',
      donde: 'Aparece al sumar ese producto al pedido',
      tono: 'bg-warning/10 text-warning ring-warning/20',
    };
  }
  if (estrategia === 'upsell') {
    return {
      etiqueta: 'Upsell',
      donde: 'Aparece después de agregar el producto',
      tono: 'bg-success/10 text-success ring-success/20',
    };
  }
  return {
    etiqueta: 'Oferta',
    donde: 'Aparece vinculada a ese producto',
    tono: 'bg-surface-3 text-fg-muted ring-border',
  };
}

function resumenOfertaWizard(oferta) {
  const componentes = Array.isArray(oferta?.componentes) ? oferta.componentes : [];
  if (oferta?.tipo_contenido === 'pack') {
    const cantidad = componentes[0]?.cantidad;
    return cantidad ? `${cantidad} unidades del mismo producto` : 'Más unidades del mismo producto';
  }
  const nombres = componentes
    .filter(c => Number(c.producto_id) !== Number(oferta?.producto_ancla_id))
    .map(c => `${Number(c.cantidad) > 1 ? `${c.cantidad} x ` : ''}${c.producto?.nombre || 'otro producto'}`);
  return nombres.length ? nombres.join(' + ') : 'Producto o combo configurado en la oferta';
}

function OfertasStep({
  productosSeleccionados,
  ofertasTienda,
  ofertasSeleccionadas,
  setOfertasSeleccionadas,
  cargandoOfertas,
  errorOfertas,
  setErrorOfertas,
  onReintentar,
  onContinuar,
  onSinOfertas,
  onCrearNuevaOferta,
}) {
  const productos = Array.from(productosSeleccionados.values()).filter(i => i.tipo === 'producto');
  const idsProductos = new Set(productos.map(p => Number(p.id)));
  const ofertasDisponibles = (ofertasTienda || []).filter(o => idsProductos.has(Number(o.producto_ancla_id)));
  const ofertasPorProducto = productos.map(producto => ({
    producto,
    ofertas: ofertasDisponibles.filter(oferta => Number(oferta.producto_ancla_id) === Number(producto.id)),
  }));
  const alternar = (id) => {
    setErrorOfertas('');
    setOfertasSeleccionadas(prev => {
      const copia = new Set(prev);
      const n = Number(id);
      if (copia.has(n)) copia.delete(n); else copia.add(n);
      return copia;
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold leading-tight text-fg">Potenciá tu oferta</h2>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-fg-muted ring-1 ring-border">Opcional</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Las ofertas siempre pertenecen a un producto: se muestran cuando el cliente mira o compra ese producto.
          Marcá las que querés usar en esta landing o entrá a editar las de cada producto.
        </p>
      </div>

      <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-fg">Ofertas por producto</h3>
            <p className="mt-1 text-xs text-fg-muted">Así sabés exactamente qué oferta corresponde a cada producto elegido.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onReintentar} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">
              Reintentar
            </button>
            <button
              type="button"
              onClick={onCrearNuevaOferta}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-fg transition hover:border-primary/50 hover:text-primary-text"
            >
              <Pencil size={13} /> Crear o editar
            </button>
          </div>
        </div>

        {errorOfertas && <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">{errorOfertas}</p>}
        {cargandoOfertas ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-fg-muted"><Loader2 size={15} className="animate-spin" /> Buscando ofertas...</p>
        ) : ofertasPorProducto.length > 0 ? (
          <div className="mt-3 space-y-2">
            {ofertasPorProducto.map(({ producto, ofertas }) => {
              const marcadas = ofertas.filter(oferta => ofertasSeleccionadas.has(Number(oferta.id))).length;
              return (
                <article key={producto.id} className="rounded-2xl border border-border bg-surface-2 p-3">
                  <div className="flex items-center gap-3">
                    <Thumb item={producto} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-fg">{nombreItem(producto)}</p>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        Producto · {gs(precioItem(producto))}
                        {ofertas.length > 0 && ` · ${marcadas}/${ofertas.length} activas`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onCrearNuevaOferta}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-bold text-fg-muted transition hover:border-primary/50 hover:text-primary-text"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                  </div>

                  {ofertas.length > 0 ? (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {ofertas.map(oferta => {
                        const activa = ofertasSeleccionadas.has(Number(oferta.id));
                        const meta = metaOfertaWizard(oferta.estrategia);
                        return (
                          <label key={oferta.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${activa ? 'border-primary/55 bg-primary/8' : 'border-border bg-surface hover:border-border-strong'}`}>
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${activa ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface'}`}>
                              {activa && <Check size={13} strokeWidth={3} />}
                            </span>
                            <input type="checkbox" checked={activa} onChange={() => alternar(oferta.id)} className="sr-only" />
                            {oferta.imagen_url ? (
                              <img src={getMediaUrl(oferta.imagen_url)} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-border bg-white object-contain" loading="lazy" />
                            ) : null}
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-fg">{oferta.nombre}</span>
                              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                                <span className={`rounded-full px-2 py-0.5 font-bold ring-1 ${meta.tono}`}>{meta.etiqueta}</span>
                                <span>{meta.donde}</span>
                                {precioOferta(oferta) && <span className="font-mono">{gs(precioOferta(oferta))}</span>}
                              </span>
                              <span className="mt-1 block text-xs text-fg-muted">Ofrece: {resumenOfertaWizard(oferta)}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-border bg-surface px-3 py-3">
                      <p className="text-xs text-fg-muted">
                        Este producto no tiene ofertas todavía. Podés crear un paquete, order bump o upsell para este producto.
                      </p>
                      <button
                        type="button"
                        onClick={onCrearNuevaOferta}
                        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-fg transition hover:bg-primary-hover"
                      >
                        <Plus size={14} /> Crear oferta para este producto
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-fg">Elegí al menos un producto para ver o crear ofertas.</p>
            <p className="mt-1 text-xs text-fg-muted">Las ofertas se ordenan por el producto que las dispara.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
        <h3 className="text-sm font-bold text-fg">Crear o editar ofertas</h3>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          Abrí el editor real de ofertas para cambiar precios, productos incluidos, paquetes, order bumps o upsells.
          Después volvés a esta pantalla y marcás cuáles van en esta landing.
        </p>
        <button
          type="button"
          onClick={onCrearNuevaOferta}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-bold text-fg transition hover:border-primary/50 hover:text-primary-text"
        >
          <Plus size={15} /> Crear o editar oferta
        </button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg-muted">{ofertasSeleccionadas.size ? `${ofertasSeleccionadas.size} oferta${ofertasSeleccionadas.size === 1 ? '' : 's'} seleccionada${ofertasSeleccionadas.size === 1 ? '' : 's'}.` : 'Sin ofertas seleccionadas.'}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onSinOfertas} className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold text-fg-muted transition hover:bg-surface-2 hover:text-fg">
            Continuar sin ofertas
          </button>
          <button type="button" onClick={onContinuar} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover">
            Continuar <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function BriefStep({ preguntas, respuestas, setRespuestas, onContinuar, onEditarOfertas, permitirDemoIA, setPermitirDemoIA }) {
  const respondidas = preguntas.filter(p => String(respuestas[p.id] || '').trim()).length;
  const recognitionRef = useRef(null);
  const baseDictadoRef = useRef('');
  const [dictandoId, setDictandoId] = useState(null);
  const [errorDictado, setErrorDictado] = useState('');
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const soportaDictado = Boolean(SpeechRecognition);

  const actualizar = (id, valor) => {
    setRespuestas(prev => ({ ...prev, [id]: valor }));
  };

  const detenerDictado = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setDictandoId(null);
    try {
      recognition?.stop?.();
    } catch {
      // Algunos navegadores lanzan si stop() se llama cuando ya terminó.
    }
  };

  useEffect(() => () => detenerDictado(), []);

  const alternarDictado = (pregunta) => {
    if (!soportaDictado) {
      setErrorDictado('Tu navegador no soporta dictado por micrófono. Probá con Chrome o Edge.');
      return;
    }

    if (dictandoId === pregunta.id) {
      detenerDictado();
      return;
    }

    detenerDictado();
    setErrorDictado('');
    baseDictadoRef.current = String(respuestas[pregunta.id] || '').trim();

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-PY';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let texto = '';
      for (let i = 0; i < event.results.length; i += 1) {
        texto += event.results[i][0]?.transcript || '';
      }
      const limpio = texto.replace(/\s+/g, ' ').trim();
      const base = baseDictadoRef.current;
      actualizar(pregunta.id, [base, limpio].filter(Boolean).join(base && limpio ? ' ' : ''));
    };
    recognition.onerror = (event) => {
      const mensaje = event?.error === 'not-allowed'
        ? 'El navegador no tiene permiso para usar el micrófono.'
        : 'No pudimos escuchar el micrófono. Probá de nuevo.';
      setErrorDictado(mensaje);
      detenerDictado();
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setDictandoId(null);
      }
    };

    recognitionRef.current = recognition;
    setDictandoId(pregunta.id);
    try {
      recognition.start();
    } catch {
      setErrorDictado('No pudimos iniciar el micrófono. Probá de nuevo.');
      detenerDictado();
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold leading-tight text-fg">Completá lo que falta</h2>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-fg-muted ring-1 ring-border">Opcional</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          La IA puede generar igual, pero estos datos evitan páginas pobres o inventadas. Respondé solo lo que tengas real.
        </p>
      </div>

      <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-fg">Preguntas inteligentes</h3>
            <p className="mt-1 text-xs text-fg-muted">{respondidas} de {preguntas.length} con datos cargados.</p>
          </div>
          <button type="button" onClick={onEditarOfertas} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg">
            <Pencil size={12} /> Ofertas
          </button>
        </div>

        {errorDictado && (
          <p className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
            {errorDictado}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {preguntas.map(pregunta => (
            <div key={pregunta.id} className="block rounded-xl border border-border bg-surface-2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-fg">{pregunta.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-muted">{pregunta.ayuda}</p>
                </div>
                <button
                  type="button"
                  onClick={() => alternarDictado(pregunta)}
                  disabled={!soportaDictado}
                  title={soportaDictado ? (dictandoId === pregunta.id ? 'Detener dictado' : 'Dictar con micrófono') : 'Tu navegador no soporta dictado'}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ring-1 transition ${
                    dictandoId === pregunta.id
                      ? 'bg-danger/10 text-danger ring-danger/20 hover:bg-danger/15'
                      : 'bg-surface text-fg-muted ring-border hover:text-primary-text hover:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-45'
                  }`}
                >
                  {dictandoId === pregunta.id ? <MicOff size={14} /> : <Mic size={14} />}
                  {dictandoId === pregunta.id ? 'Detener' : 'Dictar'}
                </button>
              </div>
              {dictandoId === pregunta.id && (
                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-primary-text">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  Escuchando... hablá y se va escribiendo acá.
                </p>
              )}
              <textarea
                rows={3}
                value={respuestas[pregunta.id] || ''}
                onChange={e => actualizar(pregunta.id, e.target.value)}
                placeholder={pregunta.placeholder}
                className="mt-3 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-primary/55 focus:ring-2 focus:ring-primary/15"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-primary/8 p-4 text-sm text-fg ring-1 ring-primary/15">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-primary-text" />
          <p className="leading-relaxed text-fg-muted">
            Si no tenés prueba social o datos específicos, dejá el campo vacío. La IA recibirá la instrucción de no inventar testimonios, cifras ni beneficios no confirmados.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={permitirDemoIA}
            onChange={e => setPermitirDemoIA(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
          />
          <div>
            <p className="text-sm font-bold text-fg">Incluir oferta por tiempo limitado en la landing</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">
              La IA puede dejar el bloque de countdown preparado. Si después cargás una fecha real para el producto, se usa esa; si no, se muestra como contenido generado y se advierte al publicar.
            </p>
          </div>
        </label>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs leading-relaxed text-warning">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          <p>
            Si publicás countdowns o estadísticas generadas por IA, revisá que sean reales. Al publicar, Gesicomm te va a pedir una aceptación explícita si detecta datos no confirmados.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={onContinuar} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover">
          Continuar a instrucciones <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function PromptStep({ productosSeleccionados, ofertasTienda, ofertasSeleccionadas, destacadosSeleccionados, briefComercial, preguntasBrief, input, setInput, onEditarProductos, onEditarOfertas }) {
  const chips = ['Alta conversión', 'Premium', 'Minimalista', 'Venta directa', 'Storytelling', 'Urgencia', 'Destacar beneficios', 'Prueba social'];
  const agregarChip = (chip) => {
    setInput(prev => {
      const texto = prev.trim();
      if (texto.toLowerCase().includes(chip.toLowerCase())) return prev;
      return texto ? `${texto}. ${chip}.` : `${chip}.`;
    });
  };
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold leading-tight text-fg">Ahora contale tu idea a la IA</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">La IA ya conoce tus productos, precios, imágenes y ofertas. Escribí como hablás.</p>
      </div>
      <ContextSummary
        productosSeleccionados={productosSeleccionados}
        ofertasTienda={ofertasTienda}
        ofertasSeleccionadas={ofertasSeleccionadas}
        destacadosSeleccionados={destacadosSeleccionados}
        briefComercial={briefComercial}
        preguntasBrief={preguntasBrief}
        onEditarProductos={onEditarProductos}
        onEditarOfertas={onEditarOfertas}
      />
      <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
        <h3 className="text-sm font-bold text-fg">Sugerencias rápidas</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map(chip => (
            <button key={chip} type="button" onClick={() => agregarChip(chip)} className="rounded-full border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-fg-muted transition hover:border-primary/50 hover:text-primary-text">
              {chip}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-fg-muted">Estos estilos ayudan al prompt, pero no fuerzan una estructura fija.</p>
      </section>
    </div>
  );
}

function GeneratedStep({ mensajes, productosSeleccionados, ofertasTienda, ofertasSeleccionadas, destacadosSeleccionados, onEditarProductos, onEditarOfertas }) {
  const recientes = mensajes.filter(m => m.rol === 'user').slice(-4);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold leading-tight text-fg">Tu landing está lista</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">Ahora podés pedir ajustes por chat sin volver a recorrer el wizard.</p>
      </div>
      <ContextSummary
        productosSeleccionados={productosSeleccionados}
        ofertasTienda={ofertasTienda}
        ofertasSeleccionadas={ofertasSeleccionadas}
        destacadosSeleccionados={destacadosSeleccionados}
        onEditarProductos={onEditarProductos}
        onEditarOfertas={onEditarOfertas}
      />
      <section className="rounded-2xl bg-success/10 p-4 text-sm text-fg ring-1 ring-success/20">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={16} className="text-success" />
          Preview actualizado a la derecha.
        </div>
        <p className="mt-2 text-fg-muted">Probá pedidos como “Hacé el hero más agresivo” o “Destacá más el paquete de dos”.</p>
      </section>
      {recientes.length > 0 && (
        <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <h3 className="text-sm font-bold text-fg">Últimos pedidos</h3>
          <div className="mt-3 space-y-2">
            {recientes.map(m => <p key={m.id} className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-fg-muted">{m.texto}</p>)}
          </div>
        </section>
      )}
    </div>
  );
}

function ContextSummary({ productosSeleccionados, ofertasTienda, ofertasSeleccionadas, destacadosSeleccionados = new Set(), briefComercial = {}, preguntasBrief = [], onEditarProductos, onEditarOfertas }) {
  const items = Array.from(productosSeleccionados.values());
  const ofertas = (ofertasTienda || []).filter(o => ofertasSeleccionadas.has(Number(o.id)));
  const maxVisibles = 8;
  const respuestasBrief = Object.entries(briefComercial || {})
    .filter(([, valor]) => String(valor || '').trim())
    .map(([key, valor]) => ({
      key,
      label: preguntasBrief.find(p => p.id === key)?.label || key,
      valor: String(valor).trim(),
    }));
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-fg">Contexto de esta página</h3>
        <div className="flex gap-2">
          <button type="button" onClick={onEditarProductos} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg">
            <Pencil size={12} /> Productos
          </button>
          <button type="button" onClick={onEditarOfertas} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg">
            <Pencil size={12} /> Ofertas
          </button>
        </div>
      </div>
      {items.length > 0 && (
        <div className="mt-3 rounded-xl bg-surface-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-muted">
              {items.length === 1 ? 'Producto seleccionado' : 'Productos seleccionados'}
            </p>
            <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-fg-muted ring-1 ring-border">
              {items.length === 1 ? 'Campaña de producto' : 'Catálogo / ecommerce'}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {items.slice(0, maxVisibles).map(item => {
              const destacado = destacadosSeleccionados?.has?.(contentIdPanel(item));
              return (
                <div key={`${item.tipo}:${item.id}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-surface px-2.5 py-2 ring-1 ring-border">
                  <Thumb item={item} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-fg">{nombreItem(item)}</p>
                      {destacado && <span className="shrink-0 rounded-full bg-warning/12 px-1.5 py-0.5 text-[10px] font-bold text-warning">Destacado</span>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                      {item.tipo === 'combo' ? 'Combo' : 'Producto'} · {gs(precioItem(item))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {items.length > maxVisibles && (
            <p className="mt-2 text-xs text-fg-muted">
              Y {items.length - maxVisibles} producto{items.length - maxVisibles === 1 ? '' : 's'} más. La IA recibe todos los seleccionados.
            </p>
          )}
        </div>
      )}
      <div className="mt-3 grid gap-2 text-xs text-fg-muted sm:grid-cols-2">
        <div className="rounded-xl bg-surface-2 px-3 py-2">{items.length} producto{items.length === 1 ? '' : 's'} o combo{items.length === 1 ? '' : 's'}</div>
        <div className="rounded-xl bg-surface-2 px-3 py-2">{ofertas.length} oferta{ofertas.length === 1 ? '' : 's'} seleccionada{ofertas.length === 1 ? '' : 's'}</div>
      </div>
      {ofertas.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {ofertas.map(oferta => (
            <li key={oferta.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-fg-muted">
              <span className="truncate">{nombreEstrategia(oferta.estrategia)} · {oferta.nombre}</span>
              {precioOferta(oferta) && <span className="shrink-0 font-mono">{gs(precioOferta(oferta))}</span>}
            </li>
          ))}
        </ul>
      )}
      {respuestasBrief.length > 0 && (
        <div className="mt-3 rounded-xl bg-primary/8 p-3 ring-1 ring-primary/15">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-text">Brief agregado</p>
          <ul className="mt-2 space-y-1.5">
            {respuestasBrief.slice(0, 4).map(item => (
              <li key={item.key} className="text-xs leading-relaxed text-fg-muted">
                <b className="text-fg">{item.label}:</b> {item.valor.length > 110 ? `${item.valor.slice(0, 110)}...` : item.valor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Thumb({ item }) {
  const src = item?.imagen ? getMediaUrl(item.imagen) : null;
  return src ? (
    <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border bg-white object-contain" loading="lazy" />
  ) : (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-fg-subtle">
      {item?.tipo === 'combo' ? <Layers size={16} /> : <ShoppingBag size={16} />}
    </span>
  );
}

function MessageStack({
  mensajes,
  paso,
  productosSeleccionados,
  setProductosSeleccionados,
  catalogo,
  generarLanding,
  generarSinOfertas,
  abrirPasoOfertas,
  generarConOfertasElegidas,
  ofertasTienda,
  ofertasSeleccionadas,
  setOfertasSeleccionadas,
  destacadosSeleccionados,
  setDestacadosSeleccionados,
  cargandoOfertas,
  errorOfertas,
  volverAProductos,
  mensajesFinRef,
}) {
  return (
    <div className="space-y-4">
      {mensajes.map((m) => (
        <div key={m.id} className={`flex gap-3 ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
          {m.rol === 'bot' && <Avatar icono={Bot} />}
          <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            m.rol === 'user'
              ? 'rounded-br-md bg-primary text-white'
              : 'rounded-bl-md bg-surface-2 text-fg ring-1 ring-border'
          }`}>
            <div className="whitespace-pre-wrap">{m.texto}</div>

            {m.widget === 'productos' && paso === 'productos' && (
              <SelectorProductos
                productosSeleccionados={productosSeleccionados}
                setProductosSeleccionados={setProductosSeleccionados}
                catalogo={catalogo}
                generarLanding={generarLanding}
                generarSinOfertas={generarSinOfertas}
                abrirPasoOfertas={abrirPasoOfertas}
              />
            )}

          </div>
          {m.rol === 'user' && <Avatar icono={User} />}
        </div>
      ))}


      {paso === 'generando' && (
        <div className="rounded-2xl bg-primary/10 p-4 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Loader2 size={16} className="animate-spin text-primary-text" />
            Creando tu landing...
          </div>
          <ProgressChecklist />
        </div>
      )}

      {paso === 'listo' && (
        <div className="rounded-2xl bg-success/10 p-4 text-sm text-fg shadow-[inset_0_0_0_1px_rgba(16,185,129,0.16)]">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="text-success" />
            La landing esta lista para revisar.
          </div>
          <p className="mt-2 text-fg-muted">Pedi cambios por chat o abri el editor para ajustar venta, ofertas y contenido.</p>
        </div>
      )}

      <div ref={mensajesFinRef} />
    </div>
  );
}

function Composer({ input, setInput, puedeEnviar, paso, composerRef, enviarPrompt, compacto = false }) {
  const listoParaPrompt = ['prompt', 'listo'].includes(paso);
  const placeholder = paso === 'listo'
    ? 'Pedí un cambio: Hacé el hero más agresivo, destacá más el paquete, reducí el texto...'
    : listoParaPrompt
      ? 'Contame cómo querés que sea esta página. Podés escribir como hablás normalmente.'
      : 'Primero seleccioná productos, ofertas y destacados...';
  return (
    <form
      onSubmit={enviarPrompt}
      className={`mx-auto w-full rounded-2xl bg-surface-2 p-3 ring-1 ring-border transition focus-within:ring-2 focus-within:ring-primary/60 ${compacto ? '' : 'max-w-5xl'}`}
    >
      <textarea
        ref={composerRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={!listoParaPrompt || paso === 'generando'}
        className={`${compacto ? 'h-24' : 'h-28'} w-full resize-none bg-transparent px-1 text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none disabled:opacity-60`}
        autoFocus
      />
      <div className="flex justify-end pt-3">
        <button
          type="submit"
          disabled={!puedeEnviar}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-fg shadow-lg shadow-primary/10 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-subtle disabled:shadow-none"
        >
          {paso === 'listo' ? 'Enviar cambio' : 'Generar landing'} <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

function Onboarding({ onPick, shortcutActivo }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold leading-tight text-fg">Que queres crear?</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">Contame el producto, la promocion y el estilo que buscas.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SHORTCUTS.map(({ id, icono: Icono, titulo, bajada, prompt }) => {
          const activo = shortcutActivo === id;
          return (
          <button
            key={titulo}
            type="button"
            onClick={() => onPick(prompt, id)}
            className={`group min-h-[106px] rounded-2xl p-4 text-left transition hover:-translate-y-0.5 ${
              activo
                ? 'bg-primary/12 ring-2 ring-primary/50'
                : 'bg-surface-2 ring-1 ring-border hover:bg-primary/10 hover:ring-primary/40'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary-text transition ${activo ? 'bg-primary/28' : 'bg-primary/15 group-hover:bg-primary/25'}`}>
              <Icono size={18} />
            </span>
            <span className="mt-4 block text-sm font-bold text-fg">{titulo}</span>
            <span className="mt-1 block text-xs leading-relaxed text-fg-muted">{bajada}</span>
          </button>
        );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-xs font-semibold text-fg-subtle">Ejemplos:</p>
        <div className="flex flex-wrap gap-2">
          {EJEMPLOS.map((ejemplo) => (
            <button
              key={ejemplo}
              type="button"
              onClick={() => onPick(ejemplo, null)}
              className="rounded-full bg-surface-2 px-3 py-2 text-xs font-medium text-fg-muted transition hover:bg-surface-3 hover:text-fg"
            >
              {ejemplo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Avatar({ icono: Icono }) {
  return (
    <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-fg-muted sm:flex">
      <Icono size={15} />
    </div>
  );
}

function SelectorProductos({ productosSeleccionados, setProductosSeleccionados, catalogo, generarSinOfertas, abrirPasoOfertas }) {
  return (
    <div className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <ProductPicker
        catalogo={catalogo || { productos: [], combos: [] }}
        seleccion={productosSeleccionados}
        itemsOrdenados={Array.from(productosSeleccionados.values())}
        onToggle={(item) => {
          setProductosSeleccionados(prev => {
            const nueva = new Map(prev);
            const clave = `${item.tipo}:${item.id}`;
            if (nueva.has(clave)) nueva.delete(clave);
            else nueva.set(clave, item);
            return nueva;
          });
        }}
        onReordenar={() => {}}
        max={10}
        triggerLabel="Seleccionar productos"
        modalTitle="Selecciona los productos para la IA"
        refrescarCatalogoAlAbrir={true}
        themeScopeClassName="light"
        zIndexModal={3000}
      />
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={generarSinOfertas}
          disabled={productosSeleccionados.size === 0}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-fg/70 transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          Saltar ofertas
        </button>
        <button
          type="button"
          onClick={abrirPasoOfertas}
          disabled={productosSeleccionados.size === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Elegir ofertas <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

function nombreEstrategia(estrategia) {
  if (estrategia === 'normal') return 'Paquete';
  if (estrategia === 'order_bump') return 'Order bump';
  if (estrategia === 'upsell') return 'Upsell';
  return 'Oferta';
}

function precioOferta(oferta) {
  const n = Number(oferta.precio_order_bump ?? oferta.precio_normal ?? oferta.precio ?? 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function PreviewPanel({ paso, landingGenerada, productosSeleccionados, ofertasSeleccionadas, ofertasTienda, destacadosSeleccionados, onCreada, modoWorkspace, previewModo, setPreviewModo }) {
  const previewRef = useRef(null);
  const estaLista = paso === 'listo' && landingGenerada;
  const estaGenerando = paso === 'generando';
  const etiquetaTitulo = estaLista ? 'Landing generada' : 'Vista previa';
  const botonFinal = estaLista ? 'Abrir editor' : 'Abrir preview';
  const framePreview = getPreviewFrame(previewModo);

  const enfocarPreview = () => {
    if (modoWorkspace) return;
    window.setTimeout(() => {
      const preview = previewRef.current;
      const scrollBox = preview?.closest('[data-ai-wizard-root]');
      if (!preview || !scrollBox) return;
      scrollBox.scrollTo({
        top: Math.max(0, preview.offsetTop - 16),
        behavior: 'smooth',
      });
    }, 40);
  };

  useEffect(() => {
    enfocarPreview();
  }, [modoWorkspace, previewModo]);

  return (
    <section ref={previewRef} className={`${modoWorkspace ? 'hidden min-h-0 lg:flex' : 'flex flex-none'} flex-col bg-canvas`} aria-label="Vista previa">
      <div className={`${modoWorkspace ? 'max-w-none px-5 pb-5' : 'max-w-[min(90vw,1280px)] px-0 pb-6'} mx-auto flex ${modoWorkspace ? 'min-h-0 flex-1' : ''} w-full flex-col`}>
        <div className="flex shrink-0 items-end justify-between gap-4 py-4">
          <div>
            <h2 className="text-sm font-bold text-fg">{etiquetaTitulo}</h2>
            <p className="mt-0.5 text-xs text-fg-subtle">Canvas en vivo de tu proxima pagina de venta.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DeviceButton icono={Monitor} label="Desktop" activo={previewModo === 'desktop'} onClick={() => { setPreviewModo('desktop'); enfocarPreview(); }} />
            <DeviceButton icono={Tablet} label="Tablet" activo={previewModo === 'tablet'} onClick={() => { setPreviewModo('tablet'); enfocarPreview(); }} />
            <DeviceButton icono={Smartphone} label="Mobile" activo={previewModo === 'mobile'} onClick={() => { setPreviewModo('mobile'); enfocarPreview(); }} />
            {estaLista && (
              <>
                <ActionButton icono={RefreshCw} label="Regenerar" />
                <ActionButton icono={Sparkles} label="Editar con IA" />
              </>
            )}
            <button
              type="button"
              onClick={estaLista ? () => onCreada(landingGenerada) : undefined}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                estaLista
                  ? 'bg-primary text-primary-fg shadow-lg shadow-primary/10 hover:bg-primary-hover'
                  : 'bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg'
              }`}
            >
              <ExternalLink size={14} /> {botonFinal}
            </button>
          </div>
        </div>

        {estaLista ? (
          <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-2xl bg-surface-2 shadow-xl ring-1 ring-border">
            <div className={`transition-all duration-200 ${framePreview.className}`} style={framePreview.style}>
              <CodigoPreview
                codigo={landingGenerada.content?.codigo}
                titulo={landingGenerada.titulo}
                datos={datosRuntimePreview({
                  productos: Array.from(productosSeleccionados.values()),
                  venta: landingGenerada.content?.venta,
                })}
              />
            </div>
          </div>
        ) : (
          <BrowserCanvas
            generando={estaGenerando}
            previewModo={previewModo}
            productosSeleccionados={productosSeleccionados}
            ofertasSeleccionadas={ofertasSeleccionadas}
            ofertasTienda={ofertasTienda}
            destacadosSeleccionados={destacadosSeleccionados}
          />
        )}
      </div>
    </section>
  );
}

function getPreviewFrame(modo) {
  if (modo === 'mobile') {
    return {
      className: 'max-w-full self-center',
      style: {
        width: 'min(430px, 100%)',
        height: 'clamp(600px, calc(100vh - 168px), 780px)',
      },
    };
  }
  if (modo === 'tablet') {
    return {
      className: 'max-w-full self-center',
      style: {
        width: 'min(820px, 100%)',
        height: 'clamp(600px, calc(100vh - 168px), 780px)',
      },
    };
  }
  return {
    className: 'w-full self-stretch',
    style: {
      minHeight: 'clamp(560px, calc(100vh - 180px), 760px)',
    },
  };
}

function DeviceButton({ icono: Icono, label, activo = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
        activo
          ? 'border-primary/35 bg-primary/15 text-primary-text'
          : 'border-transparent bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg'
      }`}
      title={label}
    >
      <Icono size={14} />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function ActionButton({ icono: Icono, label }) {
  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs font-semibold text-fg-muted transition hover:bg-surface-3 hover:text-fg">
      <Icono size={14} />
      {label}
    </button>
  );
}

function BrowserCanvas({ generando, previewModo, productosSeleccionados, ofertasSeleccionadas, ofertasTienda, destacadosSeleccionados = new Set() }) {
  const framePreview = getPreviewFrame(previewModo);
  const items = Array.from(productosSeleccionados?.values?.() || []);
  const ofertas = (ofertasTienda || []).filter(o => ofertasSeleccionadas?.has?.(Number(o.id)));
  const itemsPreview = items.slice(0, 4);
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-2xl bg-surface-2 shadow-xl ring-1 ring-border transition-all duration-200 ${framePreview.className}`} style={framePreview.style}>
      <div className="flex h-12 items-center gap-3 border-b border-border bg-surface px-4">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <div className="flex h-7 flex-1 items-center rounded-full border border-border bg-canvas px-4 text-xs text-fg-subtle">
          tutienda.gesicomm.com
        </div>
      </div>

      <div className="absolute inset-x-0 top-12 h-[calc(100%-48px)] opacity-70">
        <LandingSkeleton />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-canvas/25 p-8 text-center backdrop-blur-[1px]">
        <div className="max-w-md">
          {generando ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary-text">
                <Loader2 size={24} className="animate-spin" />
              </div>
              <h3 className="mt-5 text-2xl font-bold text-fg">Creando tu landing...</h3>
              <ProgressChecklist />
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary-text">
                <ShoppingBag size={24} />
              </div>
              <h3 className="mt-5 text-2xl font-bold text-fg">Tu página está lista para empezar</h3>
              {items.length > 0 ? (
                <div className="mt-4 rounded-2xl bg-surface/85 p-4 text-left ring-1 ring-border">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-fg-muted">
                      {items.length === 1 ? 'Producto seleccionado' : 'Catálogo seleccionado'}
                    </p>
                    <span className="rounded-full bg-surface-2 px-2 py-1 text-[11px] font-bold text-fg-muted">
                      {items.length} producto{items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {itemsPreview.map(item => {
                      const destacado = destacadosSeleccionados?.has?.(contentIdPanel(item));
                      return (
                        <div key={`${item.tipo}:${item.id}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2">
                          <Thumb item={item} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-fg">{nombreItem(item)}</p>
                            <p className="mt-0.5 truncate text-xs text-fg-muted">
                              {item.tipo === 'combo' ? 'Combo' : 'Producto'} · {gs(precioItem(item))}
                            </p>
                          </div>
                          {destacado && <Star size={14} className="shrink-0 text-warning" />}
                        </div>
                      );
                    })}
                  </div>
                  {items.length > itemsPreview.length && (
                    <p className="mt-2 text-xs text-fg-muted">+ {items.length - itemsPreview.length} más incluidos en esta página.</p>
                  )}
                  <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-center text-xs font-semibold text-fg-muted">
                    {ofertas.length} oferta{ofertas.length === 1 ? '' : 's'} seleccionada{ofertas.length === 1 ? '' : 's'}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">Elegí productos reales para empezar a construir la página.</p>
              )}
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">Contale a la IA cómo querés venderlo.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressChecklist() {
  return (
    <div className="mx-auto mt-4 max-w-sm space-y-2 text-left">
      {PROGRESO.map((item, index) => {
        const completo = index < 3;
        return (
          <div key={item} className="flex items-center gap-2 text-sm text-fg-muted">
            {completo ? <Check size={15} className="text-success" /> : <Circle size={11} className="text-fg-subtle" />}
            <span className={completo ? 'text-fg' : ''}>{item}</span>
          </div>
        );
      })}
    </div>
  );
}

function LandingSkeleton() {
  return (
    <div className="h-full bg-[#f7f7f8] p-8 text-[#0d1b3d]">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded-full bg-[#0d1b3d]/20" />
          <div className="flex gap-3">
            <div className="h-4 w-16 rounded-full bg-[#0d1b3d]/12" />
            <div className="h-4 w-16 rounded-full bg-[#0d1b3d]/12" />
            <div className="h-8 w-24 rounded-full bg-[#3b82f6]/25" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-[1.05fr_0.95fr] gap-10">
          <div>
            <div className="h-5 w-28 rounded-full bg-[#ffc107]/45" />
            <div className="mt-5 h-12 w-full rounded-xl bg-[#0d1b3d]/18" />
            <div className="mt-3 h-12 w-4/5 rounded-xl bg-[#0d1b3d]/14" />
            <div className="mt-6 h-4 w-full rounded-full bg-[#0d1b3d]/10" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-[#0d1b3d]/10" />
            <div className="mt-7 flex gap-3">
              <div className="h-11 w-36 rounded-xl bg-[#3b82f6]/28" />
              <div className="h-11 w-28 rounded-xl bg-[#0d1b3d]/10" />
            </div>
          </div>
          <div className="h-72 rounded-3xl bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe]" />
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-[#0d1b3d]/10" />
          <div className="h-28 rounded-2xl bg-[#0d1b3d]/10" />
          <div className="h-28 rounded-2xl bg-[#0d1b3d]/10" />
        </div>
      </div>
    </div>
  );
}
