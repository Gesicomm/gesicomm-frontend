import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layers, Search, X, Save, Power, PowerOff, ChevronRight,
  BarChart2, AlertTriangle, Package, Star, Zap, Info, Upload, Image as ImageIcon,
  Eye
} from 'lucide-react';
import { comboAdminService } from '../../services/comboAdminService';
import { productService } from '../../services/productService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { verificarSesion } from '../../utils/auth';
import { calcular as calcularLocal } from '../../utils/comboPricingLocal';
import FaqPanel from '../landing-simple/panels/FaqPanel';
import FichaComboPanel from '../landing-simple/panels/FichaComboPanel';
import { fichaComboDesdeProducto, resolverFichaCombo } from '../landing-simple/templates/combo/fichaCombo';
import ComboLandingPreview from './ComboLandingPreview';
import './combos.css';

const TABS_COMBO = [
  { id: 'combo', label: 'Combo', desc: 'Productos, precio y rentabilidad', icon: <Layers size={15} /> },
  { id: 'vista', label: 'Vista del combo', desc: 'Contenido de marketing y preview', icon: <Eye size={15} /> },
];

const MAX_COMBO_IMAGENES = 5;
const MAX_COMBO_IMAGEN_BYTES = 5 * 1024 * 1024;

// ─── Utilidades de formato ────────────────────────────────────────────────────

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtGs(n)  { return n !== null && n !== undefined ? fmt(n) + ' Gs' : '—'; }
function fmtPct(n) { return n !== null && n !== undefined ? (Number(n) * 100).toFixed(2) + '%' : '—'; }
function fmtPctDirect(n) { return n !== null && n !== undefined ? Number(n).toFixed(2) + '%' : '—'; }

function numeroValido(...valores) {
  for (const valor of valores) {
    if (valor === null || valor === undefined || valor === '') continue;
    const num = Number(valor);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function normalizarFichaComboGuardada(fichaDatos, faqTitulo) {
  const datos = fichaDatos && typeof fichaDatos === 'object' && !Array.isArray(fichaDatos) ? fichaDatos : {};
  if (!faqTitulo?.trim() || datos.faq?.titulo) return datos;
  return {
    ...datos,
    faq: {
      ...(datos.faq || {}),
      titulo: faqTitulo.trim(),
    },
  };
}

/**
 * Regla económica del editor de combos.
 *
 * Admin:
 * - costo = Producto.precio_costo, lo que el admin pagó al proveedor.
 * - precio = Producto.precio_base, lo que el admin vende a las tiendas.
 *
 * Usuario/tienda:
 * - si el producto viene del admin, costo = precio_base/costo_tienda, o sea
 *   lo que la tienda paga al admin. Nunca se usa el precio_costo interno del
 *   admin para calcular la rentabilidad de la tienda.
 * - si el producto lo creó la propia tienda, precio_costo sí representa su
 *   costo real y se puede usar como costo.
 * - precio = precio_usuario/precio_efectivo/precio_venta si existe; si no,
 *   arranca igual al costo para que la tienda defina su margen del combo.
 */
function normalizarEconomiaProducto(producto, { esAdmin = false, usuarioId = null } = {}) {
  const creadoPor = producto?.creado_por ?? null;
  const esProductoPropio = usuarioId != null && creadoPor != null && Number(creadoPor) === Number(usuarioId);
  const costoAdmin = numeroValido(producto?.precio_costo);
  const costoTienda = numeroValido(producto?.costo_tienda, producto?.precio_base, producto?.precio_efectivo, producto?.precio_usuario, producto?.precio);
  const precioVentaTienda = numeroValido(producto?.precio_usuario, producto?.precio_efectivo, producto?.precio_venta, producto?.precio_base, producto?.precio);

  if (esAdmin) {
    return {
      costo: costoAdmin,
      precio: numeroValido(producto?.precio_base, producto?.precio_venta, producto?.precio_efectivo, producto?.precio_usuario),
    };
  }

  return {
    costo: esProductoPropio && costoAdmin > 0 ? costoAdmin : costoTienda,
    precio: precioVentaTienda || costoTienda,
  };
}

function productoParaCombo(producto, contexto = {}) {
  const economia = normalizarEconomiaProducto(producto, contexto);
  const imgs = Array.isArray(producto?.imagenes)
    ? producto.imagenes.map(i => (typeof i === 'string' ? i : (i?.url || i?.path))).filter(Boolean)
    : [];
  const imagenPrincipal = producto?.imagen || imgs[0] || null;

  return {
    id: producto.id,
    nombre: producto.nombre,
    precio_base: economia.precio,
    precio_costo: economia.costo,
    sku: producto.sku,
    creado_por: producto.creado_por ?? null,
    imagen: imagenPrincipal,
    imagenes: imgs,
    beneficios: Array.isArray(producto?.beneficios) ? producto.beneficios : [],
  };
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }) {
  return (
    <div className="combo-section-header">
      <div className="combo-section-icon">{icon}</div>
      <h3 className="combo-section-title">{title}</h3>
    </div>
  );
}

function MetricCard({ label, value, valueClass = '', title }) {
  return (
    <div className="combo-metric-card" title={title}>
      <span className="combo-metric-label">{label}</span>
      <span className={`combo-metric-value ${valueClass}`}>{value}</span>
    </div>
  );
}

function BadgeOferta({ status }) {
  if (!status) return null;
  const map = { EXCELENTE: 'excelente', BUENA: 'buena', REVISAR: 'revisar' };
  const labels = { EXCELENTE: '★ Excelente', BUENA: '✓ Buena oferta', REVISAR: '⚠ Revisar' };
  return <span className={`combo-badge ${map[status]}`}>{labels[status]}</span>;
}

function BadgeRentabilidad({ status }) {
  if (!status) return null;
  const map = { SALUDABLE: 'saludable', MARGEN_BAJO: 'margen-bajo', NO_RENTABLE: 'no-rentable' };
  const labels = { SALUDABLE: '✓ Saludable', MARGEN_BAJO: '⚠ Margen bajo', NO_RENTABLE: '✗ No rentable' };
  return <span className={`combo-badge ${map[status]}`}>{labels[status]}</span>;
}

function WarningList({ warnings = [] }) {
  if (!warnings.length) return null;
  return (
    <div className="combo-warnings">
      {warnings.map((w, i) => (
        <div key={i} className="combo-warning-item">
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {w}
        </div>
      ))}
    </div>
  );
}

// ─── Buscador de productos ────────────────────────────────────────────────────

function ProductSearch({ placeholder, onSelect, exclude = [], label }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  const fetchProducts = async (q) => {
    setLoading(true);
    try {
      const res = await productService.buscar({ texto: q, activo: true, limit: 15 });
      setResults((res.productos || []).filter(p => !exclude.includes(p.id)));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    if (query.trim().length === 1) { setResults([]); return; }
    
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchProducts(query), 280);
    return () => clearTimeout(timerRef.current);
  }, [query, isFocused, JSON.stringify(exclude)]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { 
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsFocused(false);
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (p) => { 
    onSelect(p); 
    setQuery(''); 
    setIsFocused(false);
    setResults([]); 
  };

  return (
    <div ref={wrapRef} className="combo-search-wrap">
      {label && <div className="combo-section-label">{label}</div>}
      <div className="combo-search-input-wrap">
        <Search size={15} color="#475569" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
        />
      </div>
      {(isFocused && (results.length > 0 || loading)) && (
        <div className="combo-search-dropdown">
          {loading ? (
            <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.83rem', textAlign: 'center' }}>Buscando...</div>
          ) : (
            results.map(p => (
              <div key={p.id} className="combo-search-item" onClick={() => handleSelect(p)}>
                <div>
                  <div className="combo-search-item-name">{p.nombre}</div>
                  <div className="combo-search-item-sub">{fmtGs(p.precio_base)}</div>
                </div>
                <ChevronRight size={14} color="#475569" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ComboEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // ─── Estado del formulario ───────────────────────────────────────────────
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [principal, setPrincipal] = useState(null);     // { id, nombre, precio_base, precio_costo, sku }
  const [upsells, setUpsells] = useState([]);           // [{ id, nombre, precio_base, precio_costo, sku, descuento_porcentaje }]
  const [precioTotal, setPrecioTotal] = useState('');   // string para el input
  const [precioMinimo, setPrecioMinimo] = useState(''); // piso de venta, opcional
  const [config, setConfig] = useState(null);           // ComboConfiguracion del tenant
  const [estadoActual, setEstadoActual] = useState('BORRADOR');
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [imagenesNuevas, setImagenesNuevas] = useState([]);

  // ─── Vista del combo (misma idea que "Vista del producto" en Mis
  // Productos) — feeds la ficha de 12 secciones del template Combo. ───────
  const [propuestaValor, setPropuestaValor] = useState('');
  const [beneficios, setBeneficios] = useState([]);       // [{titulo, texto}]
  const [confianza, setConfianza] = useState([]);         // [{texto, icono}]
  const [faq, setFaq] = useState([]);                     // [{pregunta, respuesta}]
  const [fichaDatos, setFichaDatos] = useState({});

  const [tabActiva, setTabActiva] = useState('combo');
  const [previewDevice, setPreviewDevice] = useState('desktop');

  // ─── Estado de UI ────────────────────────────────────────────────────────
  const [resultado, setResultado] = useState(null);     // Resultado local del motor
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(isEditing);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [estadoAConfirmar, setEstadoAConfirmar] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const esAdmin = usuarioActual?.rol === 'administrador';
  const contextoPrecios = { esAdmin, usuarioId: usuarioActual?.id };
  const comboVistaDto = useMemo(() => ({
    nombre,
    descripcion,
    propuesta_valor: propuestaValor,
    beneficios,
    confianza,
    ficha_datos: fichaDatos,
  }), [nombre, descripcion, propuestaValor, beneficios, confianza, fichaDatos]);
  const fichaComboDelProducto = useMemo(
    () => fichaComboDesdeProducto(comboVistaDto),
    [comboVistaDto]
  );
  const fichaComboResuelta = useMemo(
    () => resolverFichaCombo(null, null, fichaComboDelProducto),
    [fichaComboDelProducto]
  );

  // ─── Cargar configuración + combo existente ───────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const sesion = await verificarSesion();
        setUsuarioActual(sesion);
        const contexto = { esAdmin: sesion?.rol === 'administrador', usuarioId: sesion?.id };
        const cfg = await comboAdminService.obtenerConfiguracion();
        setConfig(cfg);

        if (isEditing) {
          const combo = await comboAdminService.obtener(id);
          setNombre(combo.nombre || '');
          setDescripcion(combo.descripcion || '');
          setPrecioTotal(String(combo.precio_total || ''));
          setPrecioMinimo(combo.precio_minimo ? String(combo.precio_minimo) : '');
          setEstadoActual(combo.estado || 'BORRADOR');
          setImagenes(Array.isArray(combo.imagenes) ? combo.imagenes : []);
          setPropuestaValor(combo.propuesta_valor || '');
          setBeneficios(Array.isArray(combo.beneficios) ? combo.beneficios : []);
          setConfianza(Array.isArray(combo.confianza) ? combo.confianza : []);
          setFaq(Array.isArray(combo.preguntas_frecuentes) ? combo.preguntas_frecuentes : []);
          setFichaDatos(normalizarFichaComboGuardada(combo.ficha_datos, combo.faq_titulo));

          if (combo.producto_padre) {
            setPrincipal(productoParaCombo(combo.producto_padre, contexto));
          }

          if (combo.items?.length) {
            setUpsells(combo.items.map(it => ({
              ...productoParaCombo(it.producto_incluido || {}, contexto),
              descuento_porcentaje: Number(it.descuento_porcentaje),
            })));
          }
        } else {
          const crudoPrefill = sessionStorage.getItem('gesicomm:comboPrefillItems');
          if (crudoPrefill) {
            sessionStorage.removeItem('gesicomm:comboPrefillItems');
            try {
              const productos = JSON.parse(crudoPrefill)
                .filter(p => p?.id && p?.nombre)
                .map(p => ({
                  id: Number(p.id),
                  nombre: p.nombre,
                  precio_base: Number(p.precio_base) || 0,
                  precio_costo: Number(p.costo_tienda ?? p.precio_base ?? p.precio_costo) || 0,
                  precio_venta: Number(p.precio_venta ?? p.precio_efectivo ?? p.precio_usuario ?? p.precio_base) || 0,
                  sku: p.sku || null,
                  creado_por: p.creado_por ?? null,
                }));

              if (productos.length > 0) {
                const productosNormalizados = productos.map(p => productoParaCombo(p, contexto));
                const [primero, ...resto] = productosNormalizados;
                setPrincipal(primero);
                setUpsells(resto.map(p => ({ ...p, descuento_porcentaje: 0 })));
                setNombre(`Combo ${productosNormalizados.slice(0, 2).map(p => p.nombre).join(' + ')}${productosNormalizados.length > 2 ? ` + ${productosNormalizados.length - 2} más` : ''}`);
                setPrecioTotal(String(productosNormalizados.reduce((sum, p) => sum + (Number(p.precio_base) || 0), 0)));
              }
            } catch {
              // Prefill inválido: se ignora y se abre el editor vacío.
            }
          }
        }
      } catch (err) {
        setError('Error al cargar datos iniciales.');
        console.error(err);
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, [id]);

  // ─── Cálculo local reactivo ───────────────────────────────────────────────
  useEffect(() => {
    if (!principal || !config) { setResultado(null); return; }

    const input = {
      principal: {
        id: principal.id,
        name: principal.nombre,
        // precio_costo ya viene normalizado por productoParaCombo().
        // Admin: costo interno del admin. Usuario: costo de compra de la
        // tienda. No leer Producto.precio_costo directo acá.
        cost: principal.precio_costo || 0,
        // precio_base también está normalizado: admin = precio mayorista;
        // usuario = precio de venta inicial/sugerido de la tienda.
        salePrice: principal.precio_base || 0,
      },
      upsells: upsells.map(u => ({
        id: u.id,
        name: u.nombre,
        // Misma regla: costo y precio ya están en semántica de la vista.
        cost: u.precio_costo || 0,
        salePrice: u.precio_base || 0,
        discountPercentage: u.descuento_porcentaje || 0,
      })),
      costs: {
        cpaPercentage: Number(config.cpa_porcentaje),
        shipping: Number(config.costo_envio),
        confirmation: Number(config.costo_confirmacion),
        packaging: Number(config.costo_empaque),
      },
      targetMargins: config.margenes_objetivo || [15, 30, 45],
      minimumMargin: Number(config.margen_minimo),
      excellentThreshold: Number(config.umbral_excelente),
      discountScenarios: config.escenarios_descuento || [0, 5, 10, 15, 20, 25, 30, 35],
    };

    setResultado(calcularLocal(input));
  }, [principal, upsells, config]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAgregarUpsell = (prod) => {
    if (principal && prod.id === principal.id) return; // No puede ser el mismo que el principal
    if (upsells.find(u => u.id === prod.id)) return;   // No duplicados
    setUpsells(prev => [...prev, {
      ...productoParaCombo(prod, contextoPrecios),
      descuento_porcentaje: 0,
    }]);
  };

  const handleQuitarUpsell = (id) => setUpsells(prev => prev.filter(u => u.id !== id));

  const handleDescuentoUpsell = (id, val) => {
    const num = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setUpsells(prev => prev.map(u => u.id === id ? { ...u, descuento_porcentaje: num } : u));
  };

  // Marcar cualquier producto de la lista como "principal" — es una acción
  // opcional sobre una fila, no un paso separado. El principal anterior
  // (si había) vuelve a la lista como un producto más, con 0% descuento.
  const handleMarcarPrincipal = (prodId) => {
    const candidato = upsells.find(u => u.id === prodId);
    if (!candidato) return;
    setUpsells(prev => {
      const sinCandidato = prev.filter(u => u.id !== prodId);
      return principal ? [...sinCandidato, { ...principal, descuento_porcentaje: 0 }] : sinCandidato;
    });
    setPrincipal({
      id: candidato.id,
      nombre: candidato.nombre,
      precio_base: candidato.precio_base,
      precio_costo: candidato.precio_costo,
      sku: candidato.sku,
    });
  };

  const handleAplicarPrecioRecomendado = (precio) => {
    setPrecioTotal(String(Math.round(precio)));
  };

  const ordenarImagenes = (lista) => [...(lista || [])].sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1;
    if (!a.es_principal && b.es_principal) return 1;
    return (Number(a.orden) || 0) - (Number(b.orden) || 0);
  });

  const validarArchivosImagen = (files) => {
    const totalActual = imagenes.length + imagenesNuevas.length;
    if (totalActual + files.length > MAX_COMBO_IMAGENES) {
      setError(`Solo se permiten hasta ${MAX_COMBO_IMAGENES} imágenes por combo. Ya tenés ${totalActual}.`);
      return false;
    }
    const pesado = files.find(file => file.size > MAX_COMBO_IMAGEN_BYTES);
    if (pesado) {
      setError(`Cada imagen puede pesar hasta 5MB. "${pesado.name}" pesa ${(pesado.size / 1024 / 1024).toFixed(2)}MB.`);
      return false;
    }
    return true;
  };

  const handleImagenesCombo = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !validarArchivosImagen(files)) return;

    setError(null);

    if (!isEditing) {
      const nuevas = files.map((file, idx) => ({
        id: `new-${Date.now()}-${idx}`,
        file,
        url: URL.createObjectURL(file),
        es_principal: imagenes.length + imagenesNuevas.length === 0 && idx === 0,
        pendiente: true,
      }));
      setImagenesNuevas(prev => [...prev, ...nuevas]);
      return;
    }

    try {
      setSubiendoImagen(true);
      const subidas = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('imagen', file);
        const debeSerPrincipal = imagenes.length + subidas.length === 0;
        if (debeSerPrincipal) fd.append('es_principal', 'true');
        subidas.push(await comboAdminService.subirImagen(id, fd));
      }
      setImagenes(prev => ordenarImagenes([...prev, ...subidas]));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir imágenes del combo.');
    } finally {
      setSubiendoImagen(false);
    }
  };

  const marcarImagenPrincipal = async (imagen) => {
    if (imagen.pendiente) {
      setImagenesNuevas(prev => prev.map(img => ({ ...img, es_principal: img.id === imagen.id })));
      return;
    }
    try {
      const actualizada = await comboAdminService.actualizarImagen(id, imagen.id, { es_principal: true });
      setImagenes(prev => ordenarImagenes(prev.map(img => ({
        ...img,
        es_principal: Number(img.id) === Number(actualizada.id),
      }))));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al marcar imagen principal.');
    }
  };

  const eliminarImagenCombo = async (imagen) => {
    if (imagen.pendiente) {
      setImagenesNuevas(prev => prev.filter(img => img.id !== imagen.id));
      return;
    }
    try {
      await comboAdminService.eliminarImagen(id, imagen.id);
      setImagenes(prev => ordenarImagenes(prev.filter(img => img.id !== imagen.id)));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar imagen del combo.');
    }
  };

  const subirImagenesPendientes = async (comboId) => {
    for (const img of imagenesNuevas) {
      const fd = new FormData();
      fd.append('imagen', img.file);
      if (img.es_principal) fd.append('es_principal', 'true');
      await comboAdminService.subirImagen(comboId, fd);
    }
    setImagenesNuevas([]);
  };

  // ─── Margen real del precio configurado para vender este combo ────────────
  const margenReal = resultado && precioTotal
    ? (() => {
        const p = parseFloat(precioTotal);
        const c = resultado.combo.totalCost;
        if (!p || p === 0) return null;
        return (p - c) / p;
      })()
    : null;

  const margenRealClass = margenReal === null ? '' :
    margenReal <= 0 ? 'no-rentable' :
    margenReal < (config ? Number(config.margen_minimo) / 100 : 0.10) ? 'below-target' : 'healthy';

  // ─── Guardar ──────────────────────────────────────────────────────────────
  async function handleGuardar(activar = false) {
    if (!nombre.trim()) {
      setError('El nombre del combo es obligatorio.');
      return;
    }
    if (!principal) {
      setError('Marcá un producto de la lista como principal antes de guardar.');
      return;
    }

    const precioTotalNum = parseFloat(precioTotal) || 0;
    const precioMinimoNum = esAdmin && precioMinimo ? parseFloat(precioMinimo) : null;
    if (precioMinimoNum && precioTotalNum < precioMinimoNum) {
      setError(`El precio del combo (${fmtGs(precioTotalNum)}) no puede ser menor al precio mínimo configurado (${fmtGs(precioMinimoNum)}).`);
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio_total: precioTotalNum,
      precio_minimo: precioMinimoNum,
      principalProductId: principal.id,
      upsells: upsells.map(u => ({ productId: u.id, discountPercentage: u.descuento_porcentaje })),
      // Vista del combo
      propuesta_valor: propuestaValor.trim() || null,
      beneficios,
      confianza,
      preguntas_frecuentes: faq,
      faq_titulo: null,
      ficha_rubro: 'combo',
      ficha_datos: fichaDatos || {},
    };

    try {
      setGuardando(true);
      setError(null);
      let saved;
      if (isEditing) {
        saved = await comboAdminService.actualizar(id, payload);
      } else {
        saved = await comboAdminService.crear(payload);
      }
      if (imagenesNuevas.length) {
        await subirImagenesPendientes(saved.id);
      }
      if (activar) {
        await comboAdminService.cambiarEstado(saved.id, 'ACTIVO');
      }
      setSaved(true);
      setTimeout(() => navigate(`/combos/${saved.id}/editar`), 400);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el combo.');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarCambioEstado() {
    if (!id || !estadoAConfirmar) return;
    try {
      setCambiandoEstado(true);
      await comboAdminService.cambiarEstado(id, estadoAConfirmar);
      setEstadoActual(estadoAConfirmar);
      setEstadoAConfirmar(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar el estado.');
    } finally {
      setCambiandoEstado(false);
    }
  }

  const ESTADO_CONFIRM_COPY = {
    ACTIVO: { title: '¿Activar el combo?', description: 'El combo quedará disponible para la venta.' },
    INACTIVO: { title: '¿Desactivar el combo?', description: 'El combo dejará de estar disponible para la venta.' },
    BORRADOR: { title: '¿Pasar el combo a borrador?', description: 'Dejará de estar visible hasta que lo actives de nuevo.' },
  };

  const excludeIds = [principal?.id, ...upsells.map(u => u.id)].filter(Boolean);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loadingInit) {
    return (
      <div className="combo-page">
        <div className="combo-empty"><Layers size={28} /><p>Cargando...</p></div>
      </div>
    );
  }

  const r = resultado;
  const imagenesVista = ordenarImagenes([...imagenes, ...imagenesNuevas]);
  const puedeAgregarImagenes = imagenesVista.length < MAX_COMBO_IMAGENES;
  // Umbral configurado (Configuración económica > Margen mínimo), como fracción.
  // Antes estas 3 tarjetas usaban un 10% fijo sin importar lo que se configure.
  const margenMinimoDecimal = config?.margen_minimo !== undefined ? Number(config.margen_minimo) / 100 : 0.10;

  return (
    <div className="combo-page">
      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <div className="combo-header">
        <div className="combo-header-left">
          <button className="btn-back" onClick={() => navigate('/combos')} style={{ marginRight: '0.25rem' }}>
            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div className="combo-icon-wrap"><Layers size={20} /></div>
          <div>
            <h1 className="combo-title">{isEditing ? 'Editar combo' : 'Nuevo combo'}</h1>
            <p className="combo-subtitle">
              {estadoActual === 'BORRADOR' && 'Borrador — no publicado'}
              {estadoActual === 'ACTIVO'   && '● Activo'}
              {estadoActual === 'INACTIVO' && '○ Inactivo'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="combo-warning-item" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ══ Tabs ═══════════════════════════════════════════════════════════ */}
      <nav className="combo-tab-nav" aria-label="Secciones del combo">
        {TABS_COMBO.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tabActiva === tab.id}
            className={`combo-tab ${tabActiva === tab.id ? 'active' : ''}`}
            onClick={() => setTabActiva(tab.id)}
          >
            {tab.icon}
            <span>
              <b>{tab.label}</b>
              <small>{tab.desc}</small>
            </span>
          </button>
        ))}
      </nav>

      {tabActiva === 'combo' && (
      <>
      {/* ══ Sección A — Información básica ══════════════════════════════════ */}
      <div className="combo-section">
        <SectionHeader icon={<Info size={15} />} title="A — Información del combo" />
        <div className="combo-editor-grid">
          <div>
            <div className="combo-section-label">Nombre del combo *</div>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Pack Running Verano"
              style={{ width: '100%', background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', borderRadius: 8, padding: '0.55rem 0.9rem', color: 'var(--color-fg)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div className="combo-section-label">Descripción (opcional)</div>
            <input
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción breve del combo"
              style={{ width: '100%', background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', borderRadius: 8, padding: '0.55rem 0.9rem', color: 'var(--color-fg)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* ══ Sección B — Galería del combo ═══════════════════════════════════ */}
      <div className="combo-section">
        <SectionHeader icon={<ImageIcon size={15} />} title="B — Imágenes del combo" />
        <div className="combo-images-grid">
          {imagenesVista.map(img => (
            <div key={img.id} className={`combo-image-card ${img.es_principal ? 'principal' : ''}`}>
              <img src={getMediaUrl(img.url)} alt={nombre || 'Imagen del combo'} />
              <div className="combo-image-actions">
                <button type="button" className="btn-icon" title="Usar como portada" onClick={() => marcarImagenPrincipal(img)}>
                  <Star size={13} fill={img.es_principal ? 'currentColor' : 'none'} />
                </button>
                <button type="button" className="btn-icon danger" title="Eliminar imagen" onClick={() => eliminarImagenCombo(img)}>
                  <X size={13} />
                </button>
              </div>
              {img.es_principal && <span className="combo-image-badge">Portada</span>}
              {img.pendiente && <span className="combo-image-badge pending">Pendiente</span>}
            </div>
          ))}

          {puedeAgregarImagenes && (
            <label className="combo-image-upload">
              {subiendoImagen
                ? <div className="spinner-sm" />
                : <><Upload size={20} /><span>Agregar imágenes</span></>
              }
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImagenesCombo}
                hidden
                disabled={subiendoImagen}
              />
            </label>
          )}
        </div>
        <p className="combo-help-text">
          Podés subir hasta {MAX_COMBO_IMAGENES} imágenes JPG, PNG o WEBP. Máx. 5MB por imagen. La portada aparece primero en el catálogo y en la landing.
        </p>
      </div>

      {/* ══ Sección C — Productos del combo ═════════════════════════════════ */}
      <div className="combo-section">
        <SectionHeader icon={<Package size={15} />} title="C — Productos del combo" />

        <ProductSearch
          placeholder="Buscar producto para agregar al combo..."
          onSelect={handleAgregarUpsell}
          exclude={excludeIds}
        />

        {(principal || upsells.length > 0) ? (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table className="combo-upsells-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>{esAdmin ? 'Costo admin' : 'Costo para tu tienda'}</th>
                  <th style={{ textAlign: 'right' }}>{esAdmin ? 'Precio a tiendas' : 'Precio de venta'}</th>
                  <th style={{ textAlign: 'center' }}>Descuento</th>
                  <th style={{ textAlign: 'right' }}>Precio final</th>
                  <th style={{ textAlign: 'right' }}>Utilidad</th>
                  <th style={{ textAlign: 'right' }}>Margen</th>
                  <th style={{ textAlign: 'center' }}>Principal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {principal && (() => {
                  const costo = principal.precio_costo || 0;
                  const precio = principal.precio_base || 0;
                  const utilidad = precio - costo;
                  const margen = precio > 0 ? utilidad / precio : 0;
                  return (
                    <tr style={{ background: 'rgba(61, 95, 163,0.06)' }}>
                      <td><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{principal.nombre}</div></td>
                      <td className="readonly" style={{ textAlign: 'right' }}>{fmtGs(costo)}</td>
                      <td className="readonly" style={{ textAlign: 'right' }}>{fmtGs(precio)}</td>
                      <td style={{ textAlign: 'center', color: '#475569', fontSize: '0.78rem' }}>Sin descuento</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtGs(precio)}</td>
                      <td style={{ textAlign: 'right', color: utilidad >= 0 ? '#10b981' : '#ef4444' }}>{fmtGs(utilidad)}</td>
                      <td style={{ textAlign: 'right', color: margen >= margenMinimoDecimal ? '#10b981' : margen > 0 ? '#f59e0b' : '#ef4444' }}>{fmtPct(margen)}</td>
                      <td style={{ textAlign: 'center' }} title="Producto principal del combo">
                        <Star size={15} fill="#facc15" color="#facc15" />
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => setPrincipal(null)} title="Quitar del combo">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })()}

                {upsells.map((u, idx) => {
                  const ur = r?.upsells?.[idx];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.nombre}</div>
                      </td>
                      <td className="readonly" style={{ textAlign: 'right' }}>{fmtGs(u.precio_costo)}</td>
                      <td className="readonly" style={{ textAlign: 'right' }}>{fmtGs(u.precio_base)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="combo-discount-input" style={{ margin: '0 auto' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={u.descuento_porcentaje}
                            onChange={e => handleDescuentoUpsell(u.id, e.target.value)}
                          />
                          <span>%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {ur ? fmtGs(ur.finalPrice) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: ur ? (ur.profit >= 0 ? '#10b981' : '#ef4444') : undefined }}>
                        {ur ? fmtGs(ur.profit) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: ur ? (ur.margin >= margenMinimoDecimal ? '#10b981' : ur.margin > 0 ? '#f59e0b' : '#ef4444') : undefined }}>
                        {ur ? fmtPct(ur.margin) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-icon" onClick={() => handleMarcarPrincipal(u.id)} title="Marcar como producto principal">
                          <Star size={15} />
                        </button>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => handleQuitarUpsell(u.id)} title="Quitar del combo">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.83rem', padding: '1.25rem', background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)', borderRadius: 8 }}>
            Buscá productos para agregarlos al combo. Marcá uno como principal con la estrella ⭐ — es opcional, pero hace falta para calcular la rentabilidad del combo.
          </div>
        )}

        {!principal && upsells.length > 0 && (
          <div className="combo-warning-item" style={{ marginTop: '0.75rem' }}>
            <AlertTriangle size={14} /> Todavía no marcaste ningún producto como principal — los cálculos de rentabilidad del combo van a aparecer cuando marques uno.
          </div>
        )}
      </div>

      {/* ══ Sección D — Resultado del combo ═════════════════════════════════ */}
      {r && (
        <div className="combo-section">
          <SectionHeader icon={<BarChart2 size={15} />} title="D — Resultado del combo" />

          <div className="combo-metrics-grid">
            <MetricCard label="Precio original" value={fmtGs(r.combo.originalPrice)} />
            <MetricCard label="Precio con upsells" value={fmtGs(r.combo.finalPrice)} />
            <MetricCard label="Descuento $" value={fmtGs(r.combo.discountAmount)} />
            <MetricCard label="Descuento %" value={fmtPctDirect((r.combo.discountPercentage * 100).toFixed(2))} />
            <MetricCard label={esAdmin ? 'Costo total admin' : 'Costo total tienda'} value={fmtGs(r.combo.totalCost)} />
            <MetricCard label="Utilidad" value={fmtGs(r.combo.profit)} valueClass={r.combo.profit >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Margen" value={fmtPct(r.combo.margin)} valueClass={r.combo.margin >= margenMinimoDecimal ? 'positive' : r.combo.margin > 0 ? 'warning' : 'negative'} />
          </div>

          {/* Precio del combo.
              Admin: precio mayorista del combo para las tiendas.
              Usuario: precio final que su tienda va a cobrar al comprador. */}
          <div className="combo-price-editor">
            <div className="combo-section-label">{esAdmin ? 'Precio mayorista del combo' : 'Precio de venta del combo'}</div>
            <div className="combo-price-input-wrap">
              <label>Precio:</label>
              <CurrencyInput
                value={precioTotal}
                onChange={val => setPrecioTotal(val === '' ? '' : String(val))}
                style={{ flex: 1, background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)', borderRadius: 8, padding: '0.55rem 0.9rem', color: 'var(--color-fg)', fontSize: '0.95rem', fontFamily: 'inherit', maxWidth: 220 }}
              />
              {margenReal !== null && (
                <div className={`combo-price-real-margin ${margenRealClass}`}>
                  Margen real: <strong>{(margenReal * 100).toFixed(2)}%</strong>
                  {margenRealClass === 'below-target' && <span>⚠ Por debajo del objetivo</span>}
                  {margenRealClass === 'no-rentable' && <span>✗ No rentable</span>}
                </div>
              )}
            </div>

            {esAdmin && (
              <>
                <div className="combo-price-input-wrap" style={{ marginTop: '0.5rem' }}>
                  <label>Precio mínimo de venta (opcional):</label>
                  <CurrencyInput
                    value={precioMinimo}
                    onChange={val => setPrecioMinimo(val === '' ? '' : String(val))}
                    placeholder="Sin piso configurado"
                    style={{ flex: 1, background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)', borderRadius: 8, padding: '0.55rem 0.9rem', color: 'var(--color-fg)', fontSize: '0.95rem', fontFamily: 'inherit', maxWidth: 220 }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Si lo configurás, el sistema no va a permitir guardar el combo con un precio por debajo de este valor.
                </p>
                {precioMinimo && parseFloat(precioTotal) > 0 && parseFloat(precioTotal) < parseFloat(precioMinimo) && (
                  <div className="combo-warning-item" style={{ marginTop: '0.5rem' }}>
                    <AlertTriangle size={14} /> El precio actual ({fmtGs(parseFloat(precioTotal))}) está por debajo del mínimo configurado ({fmtGs(parseFloat(precioMinimo))}). No se va a poder guardar así.
                  </div>
                )}
              </>
            )}

            {/* Botones de precio recomendado */}
            <div className="combo-section-label">Aplicar precio sugerido:</div>
            <div className="combo-recs-grid">
              {r.recommendations.map(rec => rec.suggestedPrice && (
                <button
                  key={rec.targetMargin}
                  className="combo-rec-btn"
                  onClick={() => handleAplicarPrecioRecomendado(rec.suggestedPrice)}
                  title={`Precio para margen ${rec.targetMargin}%`}
                >
                  <div className="combo-rec-btn-margin">Margen {rec.targetMargin}%</div>
                  <div className="combo-rec-btn-price">{fmtGs(rec.suggestedPrice)}</div>
                  <div className="combo-rec-btn-profit">+{fmtGs(rec.estimatedProfit)} utilidad</div>
                </button>
              ))}
            </div>
          </div>

          <WarningList warnings={r.warnings} />
        </div>
      )}

      {/* ══ Sección E — Comparativa Solo vs Combo ═══════════════════════════ */}
      {r && (
        <div className="combo-section">
          <SectionHeader icon={<Zap size={15} />} title="E — Comparativa: venta individual vs combo" />
          <div className="combo-comparison-grid">
            <div className="combo-compare-card">
              <span className="combo-compare-label">Utilidad individual</span>
              <span className="combo-compare-value" style={{ color: r.comparison.standaloneProfit >= 0 ? 'var(--color-fg)' : '#ef4444' }}>
                {fmtGs(r.comparison.standaloneProfit)}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>Solo producto principal</span>
            </div>
            <div className={`combo-compare-card ${r.comparison.comboProfit > r.comparison.standaloneProfit ? 'highlight' : r.comparison.comboProfit < 0 ? 'alert' : ''}`}>
              <span className="combo-compare-label">Utilidad en combo</span>
              <span className="combo-compare-value" style={{ color: r.comparison.comboProfit >= 0 ? '#10b981' : '#ef4444' }}>
                {fmtGs(r.comparison.comboProfit)}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>Con todos los upsells</span>
            </div>
            <div className="combo-compare-card">
              <span className="combo-compare-label">Incremento</span>
              <span className="combo-compare-value" style={{ color: r.comparison.profitDifference > 0 ? '#10b981' : '#ef4444' }}>
                {fmtGs(r.comparison.profitDifference)}
              </span>
              <span style={{ fontSize: '0.75rem', color: r.comparison.profitDifferencePercentage > 0 ? '#10b981' : '#ef4444' }}>
                {r.comparison.profitDifferencePercentage !== null
                  ? `${r.comparison.profitDifferencePercentage.toFixed(2)}% más`
                  : 'Sin base positiva'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <div>
              <span className="combo-section-label" style={{ display: 'block', marginBottom: '0.3rem' }}>Calidad de oferta</span>
              <BadgeOferta status={r.comparison.offerStatus} />
            </div>
            <div>
              <span className="combo-section-label" style={{ display: 'block', marginBottom: '0.3rem' }}>Rentabilidad</span>
              <BadgeRentabilidad status={r.comparison.profitabilityStatus} />
            </div>
          </div>
        </div>
      )}

      {/* ══ Sección F — Precios recomendados ════════════════════════════════ */}
      {r && (
        <div className="combo-section">
          <SectionHeader icon={<Star size={15} />} title="F — Precios recomendados" />
          <div style={{ overflowX: 'auto' }}>
            <table className="combo-sensitivity-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Margen objetivo</th>
                  <th>Precio sugerido</th>
                  <th>Utilidad estimada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {r.recommendations.map(rec => (
                  <tr key={rec.targetMargin}>
                    <td>{rec.targetMargin}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtGs(rec.suggestedPrice)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>+{fmtGs(rec.estimatedProfit)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {rec.suggestedPrice && (
                        <button
                          className="combo-rec-btn"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleAplicarPrecioRecomendado(rec.suggestedPrice)}
                        >
                          Aplicar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}

      {/* ══ Vista del combo (tab aparte) ═══════════════════════════════════ */}
      {tabActiva === 'vista' && (
      <div className="combo-vista-workspace">
        <div className="combo-vista-editor">
        <p className="combo-help-text" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Contenido de marketing propio del combo. Alimenta su ficha de detalle (template "Combo") en las landings donde lo agregues — igual que la Vista del producto para un producto individual.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <div className="combo-section-label">Propuesta de valor</div>
          <textarea
            value={propuestaValor}
            onChange={e => setPropuestaValor(e.target.value)}
            placeholder="Ej: Todo lo que necesitás para empezar, en un solo pack."
            rows={2}
            style={{ width: '100%', background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', borderRadius: 8, padding: '0.55rem 0.9rem', color: 'var(--color-fg)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <FichaComboPanel
          ficha={fichaDatos}
          fichaResuelta={fichaComboResuelta}
          fichaDelProducto={fichaComboDelProducto}
          respaldos={{
            titulo: nombre || 'Combo sin nombre',
            lead: propuestaValor || descripcion,
          }}
          modo="producto"
          expandirTodas
          onChange={setFichaDatos}
        />

        <div style={{ marginTop: '1.25rem' }}>
          <div className="combo-section-label">Preguntas frecuentes propias de este combo</div>
          <FaqPanel faq={faq} onChange={setFaq} />
        </div>
        </div>

        <ComboLandingPreview
          combo={comboVistaDto}
          principal={principal}
          upsells={upsells}
          precioTotal={precioTotal}
          imagenes={imagenesVista}
          faq={faq}
          faqTitulo=""
          device={previewDevice}
          onDeviceChange={setPreviewDevice}
        />
      </div>
      )}

      {/* ══ Footer de acciones ══════════════════════════════════════════════ */}
      <div className="combo-footer">
        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
          {isEditing ? `Estado actual: ${estadoActual}` : 'Se guardará como BORRADOR'}
        </div>
        <div className="combo-footer-actions">
          <button className="btn-secondary" onClick={() => navigate('/combos')}>
            Cancelar
          </button>

          <button
            className="btn-secondary"
            onClick={() => handleGuardar(false)}
            disabled={guardando}
          >
            <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar borrador'}
          </button>

          {estadoActual !== 'ACTIVO' && (
            <button
              className="btn-activate"
              onClick={isEditing ? () => setEstadoAConfirmar('ACTIVO') : () => handleGuardar(true)}
              disabled={guardando || cambiandoEstado || !principal}
            >
              <Power size={15} /> {cambiandoEstado || guardando ? '...' : 'Activar combo'}
            </button>
          )}

          {estadoActual === 'ACTIVO' && isEditing && (
            <button
              className="btn-deactivate"
              onClick={() => setEstadoAConfirmar('INACTIVO')}
              disabled={cambiandoEstado}
            >
              <PowerOff size={15} /> {cambiandoEstado ? '...' : 'Desactivar'}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!estadoAConfirmar}
        title={estadoAConfirmar ? ESTADO_CONFIRM_COPY[estadoAConfirmar].title : ''}
        description={estadoAConfirmar ? ESTADO_CONFIRM_COPY[estadoAConfirmar].description : ''}
        confirmLabel={estadoAConfirmar === 'ACTIVO' ? 'Activar' : 'Desactivar'}
        danger={estadoAConfirmar !== 'ACTIVO'}
        loading={cambiandoEstado}
        onConfirm={confirmarCambioEstado}
        onCancel={() => setEstadoAConfirmar(null)}
      />
    </div>
  );
}
