import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Layers, Search, X, Save, Power, PowerOff, ArrowLeft, ArrowRight, Check,
  AlertTriangle, Package, Star, Upload, Plus, Eye, Loader, TrendingDown,
} from 'lucide-react';
import { comboAdminService } from '../../services/comboAdminService';
import { productService } from '../../services/productService';
import { vitrinaService } from '../../services/vitrinaService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { verificarSesion } from '../../utils/auth';
import { calcular as calcularLocal } from '../../utils/comboPricingLocal';
import FaqPanel from '../landing-simple/panels/FaqPanel';
import FichaComboPanel from '../landing-simple/panels/FichaComboPanel';
import { fichaComboDesdeProducto, resolverFichaCombo } from '../landing-simple/templates/combo/fichaCombo';
import ComboLandingPreview from './ComboLandingPreview';
import '../productos/productos.css';
import './combos.css';
import './comboArmado.css';

// El armado va en fases, en el orden en que se piensa un combo: qué es, qué
// se vende, qué se suma, cuánto se descuenta, a qué precio conviene y, al
// final, con qué foto se muestra y cómo se ve en la landing.
const FASES = [
  { id: 'nombre', titulo: 'Nombre' },
  { id: 'principal', titulo: 'Producto principal' },
  { id: 'complementos', titulo: 'Complementarios' },
  { id: 'descuentos', titulo: 'Descuentos' },
  { id: 'analisis', titulo: 'Precio y análisis' },
  { id: 'foto', titulo: 'Foto', opcional: true },
  { id: 'vista', titulo: 'Vista del combo' },
];
const FASE = Object.fromEntries(FASES.map((f, i) => [f.id, i]));

const MAX_COMBO_IMAGENES = 5;
const MAX_COMBO_IMAGEN_BYTES = 5 * 1024 * 1024;
const DESCUENTOS_RAPIDOS = [0, 10, 20, 30, 50];
const PRODUCTOS_SELECTOR_LIMIT = 12;

// ─── Formato ──────────────────────────────────────────────────────────────────

function gs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(Number(n)).toLocaleString('es-PY') + ' Gs';
}
function pct(fraccion, dec = 1) {
  if (fraccion === null || fraccion === undefined || isNaN(fraccion)) return '—';
  return (Number(fraccion) * 100).toFixed(dec) + '%';
}
// Plata: verde si se gana, rojo si se pierde. El ámbar queda solo para el
// margen %, donde avisa "ganás, pero menos que tu margen mínimo".
function signo(n) { return n < 0 ? 'neg' : 'pos'; }
function etiquetaGanancia(n, sufijo = '') { return (n < 0 ? 'Perdés' : 'Ganás') + sufijo; }
// Monto siempre en positivo: el signo lo dicen la etiqueta y el color.
function gsAbs(n) { return n === null || n === undefined || isNaN(n) ? '—' : gs(Math.abs(n)); }

// Guaraníes: los precios se redondean a mil.
function redondearMil(n) { return Math.round(n / 1000) * 1000; }

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
  return { ...datos, faq: { ...(datos.faq || {}), titulo: faqTitulo.trim() } };
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

function imagenDeProducto(producto) {
  const imgs = Array.isArray(producto?.imagenes)
    ? producto.imagenes.map(i => (typeof i === 'string' ? i : (i?.url || i?.path))).filter(Boolean)
    : [];
  return { principal: producto?.imagen || imgs[0] || null, todas: imgs };
}

function productoParaCombo(producto, contexto = {}) {
  const economia = normalizarEconomiaProducto(producto, contexto);
  const { principal, todas } = imagenDeProducto(producto);
  return {
    id: producto.id,
    nombre: producto.nombre,
    precio_base: economia.precio,
    precio_costo: economia.costo,
    sku: producto.sku,
    slug: producto.slug || null,
    categoria: producto.categoria || null,
    creado_por: producto.creado_por ?? null,
    imagen: principal,
    imagenes: todas,
    beneficios: Array.isArray(producto?.beneficios) ? producto.beneficios : [],
  };
}

// ─── Buscador de productos (lista inline, no dropdown) ───────────────────────

function Miniatura({ src, size = 40 }) {
  return (
    <div className="prod-thumb" style={{ width: size, height: size }}>
      {src ? <img src={getMediaUrl(src)} alt="" /> : <Package size={size * 0.45} opacity={0.4} />}
    </div>
  );
}

function SelectorProductos({ onElegir, onPrecioGuardado, onGuardandoPrecio, guardandoPrecio, excluir = [], contexto, placeholder, accion = 'Elegir', autoFocus }) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);
  const timer = useRef(null);
  const pedido = useRef(0);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const n = ++pedido.current;
      setCargando(true);
      try {
        const res = await productService.buscar({
          texto: texto.trim() || undefined,
          activo: true,
          page: pagina,
          limit: PRODUCTOS_SELECTOR_LIMIT,
        });
        if (n === pedido.current) {
          const productos = Array.isArray(res) ? res : (res?.productos || []);
          setResultados(productos);
          setTotalPaginas(Math.max(1, Number(res?.total_paginas || res?.totalPages || 1)));
          setTotalProductos(Number(res?.total || productos.length));
        }
      } catch {
        if (n === pedido.current) {
          setResultados([]);
          setTotalPaginas(1);
          setTotalProductos(0);
        }
      } finally {
        if (n === pedido.current) setCargando(false);
      }
    }, texto ? 280 : 0);
    return () => clearTimeout(timer.current);
  }, [texto, pagina]);

  const visibles = resultados.filter(p => !excluir.includes(p.id));
  const puedeRetroceder = pagina > 1;
  const puedeAvanzar = pagina < totalPaginas;
  const cambiarTexto = e => {
    setTexto(e.target.value);
    setPagina(1);
  };

  return (
    <div className="cw-selector">
      <div className="filter-search cw-selector-search">
        <Search size={15} className="filter-icon" />
        <input
          className="filter-input"
          value={texto}
          onChange={cambiarTexto}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-label={placeholder}
        />
        {cargando && <span className="filter-loading"><Loader size={13} className="spin-icon" /></span>}
      </div>
      <ul className="cw-selector-lista">
        {!cargando && visibles.length === 0 && (
          <li className="cw-selector-vacio">
            {texto ? `Ningún producto coincide con "${texto}".` : 'No hay más productos para agregar.'}
          </li>
        )}
        {visibles.map(p => {
          const eco = normalizarEconomiaProducto(p, contexto);
          return (
            <li key={p.id} className="cw-selector-tarjeta">
              <button type="button" className="cw-selector-item" disabled={guardandoPrecio} onClick={() => onElegir(p)}>
                <Miniatura src={imagenDeProducto(p).principal || p.imagenes?.[0]?.url} />
                <span className="cw-selector-nombre">
                  <b>{p.nombre}</b>
                  <small>Costo {gs(eco.costo)} · Venta {gs(eco.precio)}</small>
                </span>
                <span className="cw-selector-accion"><Plus size={14} /> {accion}</span>
              </button>
              <PrecioVenta
                producto={productoParaCombo(p, contexto)}
                esAdmin={contexto?.esAdmin}
                onGuardando={onGuardandoPrecio}
                onGuardado={precio => {
                  setResultados(prev => prev.map(item => item.id === p.id
                    ? { ...item, ...(contexto?.esAdmin ? { precio_base: precio } : { precio_usuario: precio, precio_efectivo: precio }) }
                    : item));
                  onPrecioGuardado(p.id, precio);
                }}
              />
            </li>
          );
        })}
      </ul>
      {(totalPaginas > 1 || totalProductos > PRODUCTOS_SELECTOR_LIMIT) && (
        <div className="cw-selector-paginacion" aria-label="Paginación de productos">
          <button
            type="button"
            className="btn-secondary"
            disabled={cargando || !puedeRetroceder}
            onClick={() => setPagina(prev => Math.max(1, prev - 1))}
          >
            <ArrowLeft size={14} /> Anterior
          </button>
          <span>
            Página <b>{pagina}</b> de <b>{totalPaginas}</b>
            {totalProductos > 0 && <small>{totalProductos.toLocaleString('es-PY')} productos</small>}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={cargando || !puedeAvanzar}
            onClick={() => setPagina(prev => Math.min(totalPaginas, prev + 1))}
          >
            Siguiente <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Precio de venta editable ─────────────────────────────────────────────────

/**
 * Precio de venta del producto, editable en el lugar. Se guarda en Mi
 * catálogo (PrecioUsuario para tiendas, precio_base para admin): es el mismo precio que usa el backend para
 * calcular el combo, así que no hay un "precio del combo" aparte que después
 * no coincida. Se guarda al salir del campo o con Enter.
 */
function PrecioVenta({ producto, esAdmin, onGuardado, onGuardando }) {
  const [valor, setValor] = useState(String(Math.round(producto.precio_base || 0)));
  const [estado, setEstado] = useState(null); // null | 'guardando' | 'ok' | { error }
  const guardandoRef = useRef(false);

  useEffect(() => { setValor(String(Math.round(producto.precio_base || 0))); }, [producto.precio_base]);

  const guardar = async () => {
    if (guardandoRef.current) return;
    const nuevo = Number(valor) || 0;
    if (nuevo === Math.round(producto.precio_base || 0)) return;
    if (nuevo <= 0) {
      setEstado({ error: 'El precio tiene que ser mayor a cero.' });
      return;
    }
    setEstado('guardando');
    guardandoRef.current = true;
    onGuardando(producto.id, true);
    try {
      // El motor usa precio_base para administradores y PrecioUsuario para tiendas.
      const respuesta = esAdmin
        ? await productService.actualizar(producto.id, { precio_base: nuevo })
        : await vitrinaService.guardarPrecioProducto(producto.id, nuevo);
      const guardado = Number(esAdmin ? respuesta?.precio_base : respuesta?.precio) || nuevo;
      onGuardado(guardado);
      setEstado('ok');
    } catch (err) {
      setEstado({ error: err.response?.data?.message || 'No se pudo guardar el precio.' });
      setValor(String(Math.round(producto.precio_base || 0)));
    } finally {
      guardandoRef.current = false;
      onGuardando(producto.id, false);
    }
  };

  const ganancia = (Number(valor) || 0) - (producto.precio_costo || 0);
  return (
    <div className="cw-precio-venta">
      <label>
        <span>Precio de venta</span>
        <CurrencyInput
          className="cw-input cw-input-venta"
          value={valor}
          disabled={estado === 'guardando'}
          onChange={v => { setValor(v === '' ? '' : String(v)); setEstado(null); }}
          onBlur={guardar}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          aria-label={`Precio de venta de ${producto.nombre}`}
          aria-invalid={!!estado?.error}
        />
      </label>
      <small className={estado?.error ? 'neg' : ''} aria-live="polite">
        {estado === 'guardando' && 'Guardando precio...'}
        {estado === 'ok' && <><Check size={11} /> Precio guardado</>}
        {estado?.error}
        {!estado && <>Costo {gs(producto.precio_costo)} · <span className={signo(ganancia)}>{etiquetaGanancia(ganancia).toLowerCase()} {gsAbs(ganancia)}</span></>}
      </small>
    </div>
  );
}

// ─── Regla de precio (análisis de sensibilidad) ──────────────────────────────

/**
 * Una sola regla horizontal con las tres zonas de rentabilidad pintadas y
 * marcas en los precios que importan. Mover el precio es mover el pulgar;
 * la respuesta a "¿hasta cuánto me conviene bajar?" es la marca "Margen
 * mínimo".
 */
function ReglaPrecio({ precio, costo, pisoSano, precioSuelto, precioConDescuentos, onChange }) {
  const min = Math.max(0, redondearMil(costo * 0.8));
  const max = redondearMil(Math.max(precioSuelto, precio, pisoSano) * 1.1);
  const pos = v => `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`;
  const marcas = [
    { v: costo, label: 'Costo', clase: 'neg' },
    { v: pisoSano, label: 'Margen mínimo', clase: 'warn' },
    { v: precioConDescuentos, label: 'Con descuentos', clase: 'ref' },
    { v: precioSuelto, label: 'Precio suelto', clase: 'ref' },
  ].filter((m, i, arr) => m.v > 0 && arr.findIndex(o => Math.abs(o.v - m.v) < (max - min) * 0.04) === i);

  return (
    <div className="cw-regla" style={{ '--p-costo': pos(costo), '--p-sano': pos(pisoSano) }}>
      <input
        type="range"
        min={min}
        max={max}
        step={1000}
        value={Math.min(max, Math.max(min, precio))}
        onChange={e => onChange(Number(e.target.value))}
        aria-label="Precio del combo"
        aria-valuetext={gs(precio)}
      />
      <div className="cw-regla-marcas" aria-hidden="true">
        {marcas.map(m => (
          <button
            type="button"
            key={m.label}
            tabIndex={-1}
            className={`cw-regla-marca ${m.clase}`}
            style={{ left: pos(m.v) }}
            onClick={() => onChange(redondearMil(m.v))}
            title={`Usar ${gs(m.v)}`}
          >
            <span>{m.label}</span>
            <b>{gs(m.v)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Solo el principal vs. el combo ──────────────────────────────────────────

/**
 * Las dos ventas como un recibo: precio, menos lo que cuesta, igual lo que
 * queda. Envío, confirmación y empaque se pagan UNA vez por pedido, así que
 * el principal solo suele quedar en rojo y el combo los reparte.
 */
function Recibo({ titulo, precio, costoProductos, etiquetaCostoProductos, publicidad, cpaPct, logistica }) {
  const resultado = precio - costoProductos - publicidad - logistica;
  return (
    <div className={`cw-recibo ${signo(resultado)}`}>
      <span className="cw-recibo-titulo">{titulo}</span>
      <dl>
        <div><dt>Precio de venta</dt><dd>{gs(precio)}</dd></div>
        <div><dt>{etiquetaCostoProductos}</dt><dd>− {gs(costoProductos)}</dd></div>
        <div><dt>Publicidad ({cpaPct}% del principal)</dt><dd>− {gs(publicidad)}</dd></div>
        <div><dt>Envío, confirmación y empaque</dt><dd>− {gs(logistica)}</dd></div>
        <div className="total"><dt>{etiquetaGanancia(resultado, ' por pedido')}</dt><dd className={signo(resultado)}>{gsAbs(resultado)}</dd></div>
      </dl>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ComboEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const usarPrefillCatalogo = location.state?.usarPrefillCatalogo === true;

  useEffect(() => {
    if (!usarPrefillCatalogo) sessionStorage.removeItem('gesicomm:comboPrefillItems');
  }, [usarPrefillCatalogo]);

  return <ComboBuilder id={id} usarPrefillCatalogo={usarPrefillCatalogo} onCancelar={() => navigate('/combos')} onGuardado={(_, aviso) => navigate('/combos', { state: { aviso } })} />;
}

// Las landings usan el mismo armador sin leer su :id como si fuera un combo.
export function ComboBuilder({ id = null, principalInicial = null, usarPrefillCatalogo = false, onCancelar, onGuardado, integrado = false, renderVistaCombo = null }) {
  const isEditing = Boolean(id);

  // ─── Datos del combo ─────────────────────────────────────────────────────
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [principal, setPrincipal] = useState(null);
  const [upsells, setUpsells] = useState([]);           // [{ ...productoParaCombo, descuento_porcentaje }]
  const [precioTotal, setPrecioTotal] = useState('');
  // Mientras el usuario no toque el precio, sigue al "precio con descuentos".
  // Al editar un combo guardado, el precio publicado manda.
  const [precioTocado, setPrecioTocado] = useState(isEditing);
  const [precioMinimo, setPrecioMinimo] = useState('');
  const [config, setConfig] = useState(null);
  const [estadoActual, setEstadoActual] = useState('BORRADOR');
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [imagenesNuevas, setImagenesNuevas] = useState([]);

  // ─── Ficha de venta (misma idea que "Vista del producto") ────────────────
  const [propuestaValor, setPropuestaValor] = useState('');
  const [beneficios, setBeneficios] = useState([]);
  const [confianza, setConfianza] = useState([]);
  const [faq, setFaq] = useState([]);
  const [fichaDatos, setFichaDatos] = useState({});
  const [modo, setModo] = useState('armado');           // 'armado' | 'ficha'
  const [previewDevice, setPreviewDevice] = useState('desktop');

  // ─── UI ──────────────────────────────────────────────────────────────────
  const [fase, setFase] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [preciosGuardando, setPreciosGuardando] = useState(() => new Set());
  const precioPendiente = preciosGuardando.size > 0;
  const registrarGuardadoPrecio = (prodId, pendiente) => setPreciosGuardando(prev => {
    const next = new Set(prev);
    if (pendiente) next.add(prodId);
    else next.delete(prodId);
    return next;
  });
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [estadoAConfirmar, setEstadoAConfirmar] = useState(null);
  const [error, setError] = useState(null);
  const tituloFaseRef = useRef(null);

  const esAdmin = usuarioActual?.rol === 'administrador';
  const contextoPrecios = { esAdmin, usuarioId: usuarioActual?.id };

  const comboVistaDto = useMemo(() => ({
    nombre, descripcion, propuesta_valor: propuestaValor, beneficios, confianza, ficha_datos: fichaDatos,
  }), [nombre, descripcion, propuestaValor, beneficios, confianza, fichaDatos]);
  const fichaComboDelProducto = useMemo(() => fichaComboDesdeProducto(comboVistaDto), [comboVistaDto]);
  const fichaComboResuelta = useMemo(() => resolverFichaCombo(null, null, fichaComboDelProducto), [fichaComboDelProducto]);

  // ─── Carga inicial ───────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const sesion = await verificarSesion();
        setUsuarioActual(sesion);
        const contexto = { esAdmin: sesion?.rol === 'administrador', usuarioId: sesion?.id };
        setConfig(await comboAdminService.obtenerConfiguracion());

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
          if (combo.producto_padre) setPrincipal(productoParaCombo(combo.producto_padre, contexto));
          if (combo.items?.length) {
            setUpsells(combo.items.map(it => ({
              ...productoParaCombo(it.producto_incluido || {}, contexto),
              descuento_porcentaje: Number(it.descuento_porcentaje),
            })));
          }
          // Un combo guardado abre directo en el análisis: es lo que más se
          // vuelve a mirar. Todas las fases quedan a un click.
          setFase(FASE.analisis);
        } else if (principalInicial) {
          setPrincipal(productoParaCombo(principalInicial, contexto));
        } else if (usarPrefillCatalogo) {
          const crudoPrefill = sessionStorage.getItem('gesicomm:comboPrefillItems');
          if (crudoPrefill) {
            sessionStorage.removeItem('gesicomm:comboPrefillItems');
            try {
              const productos = JSON.parse(crudoPrefill)
                .filter(p => p?.id && p?.nombre)
                .map(p => ({
                  id: Number(p.id),
                  nombre: p.nombre,
                  imagen: p.imagen || null,
                  imagenes: p.imagenes || [],
                  beneficios: p.beneficios || [],
                  precio_base: Number(p.precio_base) || 0,
                  precio_costo: Number(p.costo_tienda ?? p.precio_base ?? p.precio_costo) || 0,
                  precio_venta: Number(p.precio_venta ?? p.precio_efectivo ?? p.precio_usuario ?? p.precio_base) || 0,
                  sku: p.sku || null,
                  creado_por: p.creado_por ?? null,
                }));
              if (productos.length > 0) {
                const normalizados = productos.map(p => productoParaCombo(p, contexto));
                const [primero, ...resto] = normalizados;
                setPrincipal(primero);
                setUpsells(resto.map(p => ({ ...p, descuento_porcentaje: 0 })));
                setNombre(`Combo ${normalizados.slice(0, 2).map(p => p.nombre).join(' + ')}${normalizados.length > 2 ? ` + ${normalizados.length - 2} más` : ''}`);
                setFase(resto.length ? FASE.descuentos : FASE.complementos);
              }
            } catch {
              // Prefill inválido: se ignora y se abre el armado vacío.
            }
          }
        }
      } catch (err) {
        setError('No se pudo cargar el combo. Volvé a Mis combos e intentá de nuevo.');
        console.error(err);
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, [id, principalInicial, usarPrefillCatalogo]);

  // ─── Motor local ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!principal || !config) { setResultado(null); return; }
    setResultado(calcularLocal({
      principal: {
        id: principal.id,
        name: principal.nombre,
        // precio_costo/precio_base ya vienen normalizados por productoParaCombo().
        cost: principal.precio_costo || 0,
        salePrice: principal.precio_base || 0,
      },
      upsells: upsells.map(u => ({
        id: u.id,
        name: u.nombre,
        cost: u.precio_costo || 0,
        salePrice: u.precio_base || 0,
        discountPercentage: u.descuento_porcentaje || 0,
      })),
      costs: {
        cpaPercentage: Number(config.cpa_porcentaje),
        shipping: Number(config.costo_envio),
        confirmation: Number(config.costo_confirmacion),
        packaging: Number(config.costo_empaque),
        paymentCommissionPercentage: Number(config.pagopar_comision_porcentaje) || 0,
      },
      targetMargins: config.margenes_objetivo || [15, 30, 45],
      minimumMargin: Number(config.margen_minimo),
      excellentThreshold: Number(config.umbral_excelente),
      discountScenarios: config.escenarios_descuento || [0, 5, 10, 15, 20, 25, 30, 35],
    }));
  }, [principal, upsells, config]);

  useEffect(() => {
    if (!precioTocado && resultado) setPrecioTotal(String(redondearMil(resultado.combo.finalPrice)));
  }, [resultado, precioTocado]);

  // Al cambiar de fase, el foco va al título: teclado y lector de pantalla
  // arrancan donde empieza el contenido nuevo.
  useEffect(() => { tituloFaseRef.current?.focus({ preventScroll: true }); }, [fase]);

  // ─── Reglas de avance ────────────────────────────────────────────────────
  const completa = [
    nombre.trim().length > 0,
    Boolean(principal),
    upsells.length > 0,
    true,
    Number(precioTotal) > 0,
    true,
    true,
  ];
  const motivoBloqueo = [
    'Poné un nombre para seguir.',
    'Elegí el producto principal para seguir.',
    'Sumá al menos un producto complementario.',
    null,
    'Definí el precio del combo.',
    null,
    null,
  ];
  // Hasta qué fase se puede saltar: la primera incompleta (inclusive).
  const faseMaxima = completa.findIndex(ok => !ok) === -1 ? FASES.length - 1 : completa.findIndex(ok => !ok);
  const irA = (i) => { if (!precioPendiente && i <= faseMaxima) { setError(null); setFase(i); } };
  const siguiente = () => {
    if (!completa[fase]) { setError(motivoBloqueo[fase]); return; }
    irA(fase + 1);
  };

  // ─── Handlers de productos ───────────────────────────────────────────────
  const elegirPrincipal = (prod) => {
    setPrincipal(productoParaCombo(prod, contextoPrecios));
    setUpsells(prev => prev.filter(u => u.id !== prod.id));
    setError(null);
  };

  const agregarComplemento = (prod) => {
    if (principal && prod.id === principal.id) return;
    if (upsells.some(u => u.id === prod.id)) return;
    setUpsells(prev => [...prev, { ...productoParaCombo(prod, contextoPrecios), descuento_porcentaje: 0 }]);
    setError(null);
  };

  const quitarComplemento = (prodId) => setUpsells(prev => prev.filter(u => u.id !== prodId));

  // El precio nuevo ya quedó guardado; acá se refleja en el armado.
  const precioVentaGuardado = (prodId, precioNuevo) => {
    setPrincipal(prev => (prev?.id === prodId ? { ...prev, precio_base: precioNuevo } : prev));
    setUpsells(prev => prev.map(u => (u.id === prodId ? { ...u, precio_base: precioNuevo } : u)));
  };

  const cambiarDescuento = (prodId, val) => {
    const num = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setUpsells(prev => prev.map(u => (u.id === prodId ? { ...u, descuento_porcentaje: num } : u)));
  };

  const aplicarPrecio = (valor) => {
    setPrecioTocado(true);
    setPrecioTotal(String(Math.max(0, Math.round(valor))));
  };

  // ─── Imágenes ────────────────────────────────────────────────────────────
  const ordenarImagenes = (lista) => [...(lista || [])].sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1;
    if (!a.es_principal && b.es_principal) return 1;
    return (Number(a.orden) || 0) - (Number(b.orden) || 0);
  });

  const validarArchivosImagen = (files) => {
    const totalActual = imagenes.length + imagenesNuevas.length;
    if (totalActual + files.length > MAX_COMBO_IMAGENES) {
      setError(`Podés subir hasta ${MAX_COMBO_IMAGENES} fotos por combo. Ya tenés ${totalActual}.`);
      return false;
    }
    const pesado = files.find(file => file.size > MAX_COMBO_IMAGEN_BYTES);
    if (pesado) {
      setError(`"${pesado.name}" pesa ${(pesado.size / 1024 / 1024).toFixed(1)} MB. El máximo es 5 MB por foto.`);
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
        if (imagenes.length + subidas.length === 0) fd.append('es_principal', 'true');
        subidas.push(await comboAdminService.subirImagen(id, fd));
      }
      setImagenes(prev => ordenarImagenes([...prev, ...subidas]));
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron subir las fotos. Probá de nuevo.');
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
      setImagenes(prev => ordenarImagenes(prev.map(img => ({ ...img, es_principal: Number(img.id) === Number(actualizada.id) }))));
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar la portada.');
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
      setError(err.response?.data?.message || 'No se pudo quitar la foto.');
    }
  };

  const subirImagenesPendientes = async (comboId) => {
    const subidas = [];
    for (const img of imagenesNuevas) {
      const fd = new FormData();
      fd.append('imagen', img.file);
      if (img.es_principal) fd.append('es_principal', 'true');
      subidas.push(await comboAdminService.subirImagen(comboId, fd));
    }
    setImagenesNuevas([]);
    return subidas;
  };

  // ─── Guardar ─────────────────────────────────────────────────────────────
  async function handleGuardar(activar = false) {
    if (precioPendiente) return;
    const pendiente = completa.findIndex((ok, i) => !ok && i <= FASE.analisis);
    if (pendiente !== -1) {
      setFase(pendiente);
      setError(motivoBloqueo[pendiente]);
      return;
    }

    const precioTotalNum = parseFloat(precioTotal) || 0;
    const precioMinimoNum = esAdmin && precioMinimo ? parseFloat(precioMinimo) : null;
    if (precioMinimoNum && precioTotalNum < precioMinimoNum) {
      setFase(FASE.analisis);
      setError(`El precio (${gs(precioTotalNum)}) está debajo del precio mínimo que fijaste (${gs(precioMinimoNum)}). Subí el precio o bajá el mínimo.`);
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio_total: precioTotalNum,
      precio_minimo: precioMinimoNum,
      principalProductId: principal.id,
      upsells: upsells.map(u => ({ productId: u.id, discountPercentage: u.descuento_porcentaje })),
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
      const saved = isEditing
        ? await comboAdminService.actualizar(id, payload)
        : await comboAdminService.crear(payload);
      const subidas = imagenesNuevas.length ? await subirImagenesPendientes(saved.id) : [];
      if (activar) await comboAdminService.cambiarEstado(saved.id, 'ACTIVO');
      const aviso = activar
        ? `"${payload.nombre}" ya está en venta.`
        : isEditing ? `Guardaste los cambios de "${payload.nombre}".` : `"${payload.nombre}" quedó guardado como borrador.`;
      await onGuardado?.({
        ...saved, ...payload,
        estado: activar ? 'ACTIVO' : (saved.estado || estadoActual),
        activo: activar || saved.activo === true,
        producto_id: principal.id,
        producto_padre: principal,
        items: upsells.map(u => ({ producto_id: u.id, producto_incluido: u, descuento_porcentaje: u.descuento_porcentaje })),
        imagenes: [...imagenes, ...subidas],
      }, aviso);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el combo. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarCambioEstado() {
    if (!id || !estadoAConfirmar) return;
    // Poner en venta guarda primero: nunca se publica una versión vieja.
    if (estadoAConfirmar === 'ACTIVO') {
      setEstadoAConfirmar(null);
      await handleGuardar(true);
      return;
    }
    try {
      setCambiandoEstado(true);
      await comboAdminService.cambiarEstado(id, estadoAConfirmar);
      setEstadoActual(estadoAConfirmar);
      setEstadoAConfirmar(null);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar el estado.');
    } finally {
      setCambiandoEstado(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <div className="prod-page">
        <div className="prod-loading"><div className="spinner" /></div>
      </div>
    );
  }

  const r = resultado;
  const imagenesVista = ordenarImagenes([...imagenes, ...imagenesNuevas]);
  const margenMinimo = config?.margen_minimo !== undefined ? Number(config.margen_minimo) / 100 : 0.10;
  const excluir = [principal?.id, ...upsells.map(u => u.id)].filter(Boolean);

  // Economía al precio elegido (no al "con descuentos" del motor).
  const precio = Number(precioTotal) || 0;
  const costo = r?.combo.totalCost || 0;
  const utilidad = precio - costo;
  const margen = precio > 0 ? utilidad / precio : null;
  const pisoSano = margenMinimo < 1 ? costo / (1 - margenMinimo) : costo;
  // Lo que se le muestra al usuario, en guaraníes redondos hacia arriba.
  const pisoSanoGs = Math.ceil(pisoSano / 1000) * 1000;
  const costoGs = Math.ceil(costo / 1000) * 1000;
  const tono = margen === null ? '' : margen <= 0 ? 'neg' : margen < margenMinimo ? 'warn' : 'pos';
  const logistica = config ? Number(config.costo_envio) + Number(config.costo_confirmacion) + Number(config.costo_empaque) : 0;
  const costoProductosCombo = principal ? (principal.precio_costo || 0) + upsells.reduce((a, u) => a + (u.precio_costo || 0), 0) : 0;
  const diferenciaVsSolo = r ? utilidad - r.comparison.standaloneProfit : 0;
  const escenarios = (config?.escenarios_descuento || [0, 5, 10, 15, 20, 25, 30]).map(d => {
    const p = redondearMil(precio * (1 - d / 100));
    const u = p - costo;
    const m = p > 0 ? u / p : 0;
    return { d, p, u, m, tono: m <= 0 ? 'neg' : m < margenMinimo ? 'warn' : 'pos' };
  });

  const faseActual = FASES[fase];
  const esUltima = fase === FASES.length - 1;

  return (
    <div className={`prod-page cw-page${integrado ? ' cw-page-integrado' : ''}`}>
      {/* ══ Encabezado ════════════════════════════════════════════════════ */}
      <div className="prod-header">
        <div className="prod-header-left">
          <button className="btn-icon" onClick={onCancelar} disabled={guardando || precioPendiente} aria-label={integrado ? 'Volver a la landing' : 'Volver a Mis combos'} title={integrado ? 'Volver a la landing' : 'Volver a Mis combos'}>
            <ArrowLeft size={18} />
          </button>
          <div className="prod-icon-wrap"><Layers size={22} /></div>
          <div>
            <h1 className="prod-title">{isEditing ? (nombre || 'Combo sin nombre') : 'Armar combo'}</h1>
            <p className="prod-subtitle">
              {isEditing
                ? { BORRADOR: 'Borrador, todavía no está a la venta', ACTIVO: 'En venta', INACTIVO: 'Pausado' }[estadoActual]
                : `Fase ${fase + 1} de ${FASES.length} · ${faseActual.titulo}`}
            </p>
          </div>
        </div>
        {isEditing && (
          <div className="prod-view-tabs cw-modos" role="tablist" aria-label="Qué editar">
            <button type="button" role="tab" aria-selected={modo === 'armado'} className={`prod-view-tab ${modo === 'armado' ? 'active' : ''}`} onClick={() => setModo('armado')}>
              <Layers size={14} /> Armado y precio
            </button>
            <button type="button" role="tab" aria-selected={modo === 'ficha'} className={`prod-view-tab ${modo === 'ficha' ? 'active' : ''}`} onClick={() => setModo('ficha')}>
              <Eye size={14} /> Ficha de venta
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="cw-error" role="alert">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {modo === 'armado' ? (
        <div className="cw-layout">
          {/* ══ Riel de fases + resumen que se arma solo ════════════════ */}
          <aside className="cw-riel" aria-label="Fases del combo">
            <ol className="cw-fases">
              {FASES.map((f, i) => {
                // "Hecha" = ya pasaste por ahí (o el combo ya existía) y está completa.
                const estado = i === fase ? 'actual' : completa[i] && (i < fase || isEditing) ? 'hecha' : 'pendiente';
                const bloqueada = i > faseMaxima;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      className={`cw-fase ${estado} ${bloqueada ? 'bloqueada' : ''}`}
                      onClick={() => irA(i)}
                      disabled={bloqueada || precioPendiente}
                      aria-current={i === fase ? 'step' : undefined}
                    >
                      <span className="cw-fase-num">{estado === 'hecha' ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                      <span className="cw-fase-texto">
                        {f.titulo}
                        {f.opcional && <small>opcional</small>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="cw-resumen">
              <span className="cw-resumen-eyebrow">Tu combo</span>
              <strong className="cw-resumen-nombre">{nombre.trim() || 'Sin nombre'}</strong>
              <ul className="cw-resumen-items">
                {principal
                  ? <li className="principal"><Star size={11} fill="currentColor" /> {principal.nombre}</li>
                  : <li className="vacio">Sin producto principal</li>}
                {upsells.map(u => (
                  <li key={u.id}>
                    + {u.nombre}
                    {u.descuento_porcentaje > 0 && <em>−{u.descuento_porcentaje}%</em>}
                  </li>
                ))}
              </ul>
              {r && (
                <dl className="cw-resumen-cifras">
                  <div><dt>Precio</dt><dd>{gs(precio)}</dd></div>
                  <div><dt>{etiquetaGanancia(utilidad)}</dt><dd className={signo(utilidad)}>{gsAbs(utilidad)}</dd></div>
                  <div><dt>Margen</dt><dd className={tono}>{pct(margen)}</dd></div>
                </dl>
              )}
            </div>
          </aside>

          {/* ══ Fase actual ═════════════════════════════════════════════ */}
          <section className="cw-panel" aria-labelledby="cw-fase-titulo">
            <header className="cw-panel-head">
              <span className="cw-panel-eyebrow">Fase {fase + 1}{faseActual.opcional ? ' · opcional' : ''}</span>
              <h2 id="cw-fase-titulo" ref={tituloFaseRef} tabIndex={-1}>
                {{
                  nombre: '¿Cómo se llama el combo?',
                  principal: '¿Cuál es el producto principal?',
                  complementos: '¿Qué productos le sumás?',
                  descuentos: '¿Cuánto descontás en cada complemento?',
                  analisis: '¿A qué precio lo vendés?',
                  foto: 'Agregá una foto del combo',
                  vista: 'Vista del combo',
                }[faseActual.id]}
              </h2>
              <p>
                {{
                  nombre: 'Es el nombre que ve tu cliente en el catálogo y en la landing.',
                  principal: 'Elegí el producto principal y ajustá su precio de venta desde acá. El precio se guarda al salir del campo o presionar Enter.',
                  complementos: 'Sumá productos y ajustá su precio de venta desde acá. El descuento lo definís en la fase siguiente.',
                  descuentos: 'El principal va a precio lleno. El descuento se aplica sobre los complementos, que es lo que hace atractivo al combo.',
                  analisis: 'Mové el precio y mirá qué pasa con tu ganancia. La marca "Margen mínimo" es lo más bajo a lo que te conviene llegar.',
                  foto: 'Si no subís ninguna, se usa la foto del producto principal. Podés agregarla ahora o más adelante.',
                  vista: renderVistaCombo ? 'Revisá cómo queda el combo en el HTML de esta landing antes de ponerlo en venta.' : 'Revisá el nombre, los productos, el precio y las fotos en la ficha de la landing antes de poner el combo en venta.',
                }[faseActual.id]}
              </p>
            </header>

            <div className="cw-panel-body">
              {/* ── 1. Nombre ─────────────────────────────────────────── */}
              {faseActual.id === 'nombre' && (
                <div className="cw-campos">
                  <label className="cw-campo">
                    <span>Nombre del combo</span>
                    <input
                      className="cw-input cw-input-grande"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') siguiente(); }}
                      placeholder="Ej: Pack Detox 3 en 1"
                      maxLength={100}
                      autoFocus
                    />
                  </label>
                  <label className="cw-campo">
                    <span>Descripción corta <small>opcional</small></span>
                    <input
                      className="cw-input"
                      value={descripcion}
                      onChange={e => setDescripcion(e.target.value)}
                      placeholder="Ej: Tu rutina completa para todo el mes"
                      maxLength={500}
                    />
                  </label>
                </div>
              )}

              {/* ── 2. Principal ──────────────────────────────────────── */}
              {faseActual.id === 'principal' && (
                principal ? (
                  <div className="cw-elegido">
                    <Miniatura src={principal.imagen} size={56} />
                    <div className="cw-elegido-info">
                      <span className="cw-elegido-tag"><Star size={11} fill="currentColor" /> Principal</span>
                      <b>{principal.nombre}</b>
                    </div>
                    <PrecioVenta key={principal.id} producto={principal} esAdmin={esAdmin} onGuardando={registrarGuardadoPrecio} onGuardado={v => precioVentaGuardado(principal.id, v)} />
                    <button type="button" className="btn-secondary" disabled={precioPendiente} onClick={() => setPrincipal(null)}>Cambiar</button>
                  </div>
                ) : (
                  <SelectorProductos
                    onElegir={elegirPrincipal}
                    onPrecioGuardado={precioVentaGuardado}
                    onGuardandoPrecio={registrarGuardadoPrecio}
                    guardandoPrecio={precioPendiente}
                    excluir={upsells.map(u => u.id)}
                    contexto={contextoPrecios}
                    placeholder="Buscar el producto principal..."
                    accion="Elegir"
                    autoFocus
                  />
                )
              )}

              {/* ── 3. Complementarios ────────────────────────────────── */}
              {faseActual.id === 'complementos' && (
                <div className="cw-complementos">
                  {upsells.length > 0 && (
                    <ul className="cw-agregados" aria-label="Complementos agregados">
                      {upsells.map(u => (
                        <li key={u.id}>
                          <Miniatura src={u.imagen} size={32} />
                          <span className="cw-agregado-nombre">{u.nombre}</span>
                          <PrecioVenta producto={u} esAdmin={esAdmin} onGuardando={registrarGuardadoPrecio} onGuardado={v => precioVentaGuardado(u.id, v)} />
                          <button type="button" className="btn-icon" disabled={precioPendiente} onClick={() => quitarComplemento(u.id)} aria-label={`Quitar ${u.nombre}`} title="Quitar">
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <SelectorProductos
                    onElegir={agregarComplemento}
                    onPrecioGuardado={precioVentaGuardado}
                    onGuardandoPrecio={registrarGuardadoPrecio}
                    guardandoPrecio={precioPendiente}
                    excluir={excluir}
                    contexto={contextoPrecios}
                    placeholder="Buscar productos para sumar..."
                    accion="Sumar"
                    autoFocus
                  />
                </div>
              )}

              {/* ── 4. Descuentos ─────────────────────────────────────── */}
              {faseActual.id === 'descuentos' && r && (
                <div className="cw-descuentos">
                  <div className="cw-desc-fila principal">
                    <Miniatura src={principal.imagen} size={36} />
                    <div className="cw-desc-nombre"><b>{principal.nombre}</b><small>Principal · precio lleno</small></div>
                    <div className="cw-desc-precio"><b>{gs(principal.precio_base)}</b></div>
                  </div>
                  {upsells.map((u, idx) => {
                    const ur = r.upsells[idx];
                    return (
                      <div key={u.id} className="cw-desc-fila">
                        <Miniatura src={u.imagen} size={36} />
                        <div className="cw-desc-nombre">
                          <b>{u.nombre}</b>
                          <small>Costo {gs(u.precio_costo)} · <span className={ur ? signo(ur.profit) : ''}>{ur ? `${etiquetaGanancia(ur.profit).toLowerCase()} ${gsAbs(ur.profit)}` : ''}</span></small>
                        </div>
                        <div className="cw-desc-control">
                          <div className="cw-chips" role="group" aria-label={`Descuento para ${u.nombre}`}>
                            {DESCUENTOS_RAPIDOS.map(d => (
                              <button
                                key={d}
                                type="button"
                                className={`cw-chip ${u.descuento_porcentaje === d ? 'on' : ''}`}
                                aria-pressed={u.descuento_porcentaje === d}
                                onClick={() => cambiarDescuento(u.id, d)}
                              >
                                {d === 0 ? 'Sin desc.' : `−${d}%`}
                              </button>
                            ))}
                          </div>
                          <label className="cw-pct">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={u.descuento_porcentaje}
                              onChange={e => cambiarDescuento(u.id, e.target.value)}
                              aria-label={`Descuento exacto para ${u.nombre}`}
                            />
                            %
                          </label>
                        </div>
                        <div className="cw-desc-precio">
                          {u.descuento_porcentaje > 0 && <s>{gs(u.precio_base)}</s>}
                          <b>{gs(ur?.finalPrice)}</b>
                        </div>
                      </div>
                    );
                  })}

                  <dl className="cw-totales">
                    <div><dt>Comprando suelto</dt><dd>{gs(r.combo.originalPrice)}</dd></div>
                    <div><dt>Precio del combo</dt><dd>{gs(r.combo.finalPrice)}</dd></div>
                    <div><dt>Tu cliente ahorra</dt><dd>{gs(r.combo.discountAmount)} <small>({pct(r.combo.discountPercentage)})</small></dd></div>
                    <div><dt>{r.combo.profit < 0 ? 'Vos perdés' : 'Vos ganás'}</dt><dd className={signo(r.combo.profit)}>{gsAbs(r.combo.profit)} <small>({pct(r.combo.margin)})</small></dd></div>
                  </dl>
                  {r.warnings.length > 0 && (
                    <ul className="cw-avisos">
                      {r.warnings.map(w => <li key={w}><AlertTriangle size={13} /> {w}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {/* ── 5. Precio y análisis ──────────────────────────────── */}
              {faseActual.id === 'analisis' && r && (
                <div className="cw-analisis">
                  <div className="cw-lectura">
                    <label className="cw-lectura-precio">
                      <span>Precio del combo</span>
                      <CurrencyInput
                        className="cw-input cw-input-precio"
                        value={precioTotal}
                        onChange={val => aplicarPrecio(val === '' ? 0 : Number(val))}
                      />
                    </label>
                    <div className="cw-lectura-dato">
                      <span>{etiquetaGanancia(utilidad, ' por combo')}</span>
                      <b className={signo(utilidad)}>{gsAbs(utilidad)}</b>
                    </div>
                    <div className="cw-lectura-dato">
                      <span>Margen</span>
                      <b className={tono}>{pct(margen)}</b>
                    </div>
                  </div>

                  <ReglaPrecio
                    precio={precio}
                    costo={costo}
                    pisoSano={pisoSano}
                    precioSuelto={r.combo.originalPrice}
                    precioConDescuentos={r.combo.finalPrice}
                    onChange={aplicarPrecio}
                  />

                  <p className={`cw-veredicto ${tono}`}>
                    {tono === 'pos' && (
                      <>
                        <TrendingDown size={16} />
                        <span>
                          Podés bajar hasta <b>{gs(pisoSanoGs)}</b>
                          {precio > pisoSanoGs && <> ({pct(1 - pisoSanoGs / precio, 0)} menos que ahora)</>} y mantener tu margen mínimo del {pct(margenMinimo, 0)}.
                          {' '}Por debajo de <b>{gs(costoGs)}</b> perdés plata.
                        </span>
                      </>
                    )}
                    {tono === 'warn' && (
                      <><AlertTriangle size={16} /><span>Estás por debajo de tu margen mínimo del {pct(margenMinimo, 0)}. Para llegar, cobrá al menos <b>{gs(pisoSanoGs)}</b>.</span></>
                    )}
                    {tono === 'neg' && (
                      <><AlertTriangle size={16} /><span>A este precio perdés <b>{gs(-utilidad)}</b> por cada combo. Cubrir costos arranca en <b>{gs(costoGs)}</b>.</span></>
                    )}
                  </p>

                  <div className="cw-comparar-bloque">
                    <h3>¿Conviene más que vender el principal solo?</h3>
                    <div className="cw-comparar">
                      <Recibo
                        titulo={`Vendés solo ${principal.nombre}`}
                        precio={principal.precio_base}
                        costoProductos={principal.precio_costo}
                        etiquetaCostoProductos="Costo del producto"
                        publicidad={r.principal.cpaMax}
                        cpaPct={Number(config.cpa_porcentaje)}
                        logistica={logistica}
                      />
                      <Recibo
                        titulo={`Vendés el combo (${upsells.length + 1} productos)`}
                        precio={precio}
                        costoProductos={costoProductosCombo}
                        etiquetaCostoProductos={`Costo de los ${upsells.length + 1} productos`}
                        publicidad={r.principal.cpaMax}
                        cpaPct={Number(config.cpa_porcentaje)}
                        logistica={logistica}
                      />
                    </div>
                    <p className="cw-comparar-conclusion">
                      {diferenciaVsSolo > 0
                        ? <>Con el combo ganás <b className="pos">{gs(diferenciaVsSolo)} más por pedido</b> que vendiendo el principal solo.</>
                        : <>Con el combo ganás <b className="neg">{gs(-diferenciaVsSolo)} menos por pedido</b> que vendiendo el principal solo. Revisá los descuentos o el precio.</>}
                      {r.comparison.standaloneProfit < 0 && ' Solo, el principal no alcanza a cubrir el envío y la publicidad; el combo reparte esos costos entre más productos.'}
                    </p>
                  </div>

                  <div className="cw-escenarios">
                    <h3>Si hacés una promo sobre este precio</h3>
                    <table className="prod-table cw-tabla">
                      <thead>
                        <tr><th>Descuento</th><th>Precio final</th><th>Ganancia</th><th>Margen</th><th aria-label="Acción" /></tr>
                      </thead>
                      <tbody>
                        {escenarios.map(e => (
                          <tr key={e.d}>
                            <td>{e.d === 0 ? 'Sin descuento' : `−${e.d}%`}</td>
                            <td>{gs(e.p)}</td>
                            <td className={signo(e.u)}>{e.u < 0 ? `Perdés ${gsAbs(e.u)}` : gs(e.u)}</td>
                            <td className={e.tono}>{pct(e.m)}</td>
                            <td>
                              {e.d > 0 && (
                                <button type="button" className="cw-link" onClick={() => aplicarPrecio(e.p)}>Usar este precio</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="cw-objetivos">
                    <span>Precio para ganar un margen de</span>
                    {r.recommendations.filter(rec => rec.suggestedPrice).map(rec => (
                      <button key={rec.targetMargin} type="button" className="cw-chip" onClick={() => aplicarPrecio(redondearMil(rec.suggestedPrice))}>
                        {rec.targetMargin}% · {gs(redondearMil(rec.suggestedPrice))}
                      </button>
                    ))}
                  </div>

                  {esAdmin && (
                    <label className="cw-campo cw-minimo">
                      <span>Precio mínimo para las tiendas <small>opcional</small></span>
                      <CurrencyInput
                        className="cw-input"
                        value={precioMinimo}
                        onChange={val => setPrecioMinimo(val === '' ? '' : String(val))}
                        placeholder="Sin mínimo"
                      />
                      <small>Ninguna tienda va a poder vender este combo por debajo de este precio.</small>
                    </label>
                  )}
                </div>
              )}

              {/* ── 6. Foto ───────────────────────────────────────────── */}
              {faseActual.id === 'foto' && (
                <div className="cw-fotos">
                  <div className="combo-images-grid">
                    {imagenesVista.map(img => (
                      <div key={img.id} className={`combo-image-card ${img.es_principal ? 'principal' : ''}`}>
                        <img src={img.pendiente ? img.url : getMediaUrl(img.url)} alt={nombre || 'Foto del combo'} />
                        <div className="combo-image-actions">
                          <button type="button" className="btn-icon" title="Usar como portada" aria-label="Usar como portada" onClick={() => marcarImagenPrincipal(img)}>
                            <Star size={13} fill={img.es_principal ? 'currentColor' : 'none'} />
                          </button>
                          <button type="button" className="btn-icon danger" title="Quitar foto" aria-label="Quitar foto" onClick={() => eliminarImagenCombo(img)}>
                            <X size={13} />
                          </button>
                        </div>
                        {img.es_principal && <span className="combo-image-badge">Portada</span>}
                      </div>
                    ))}
                    {imagenesVista.length < MAX_COMBO_IMAGENES && (
                      <label className="combo-image-upload">
                        {subiendoImagen ? <div className="spinner-sm" /> : <><Upload size={20} /><span>Subir fotos</span></>}
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImagenesCombo} hidden disabled={subiendoImagen} />
                      </label>
                    )}
                  </div>
                  <p className="combo-help-text">JPG, PNG o WEBP de hasta 5 MB. Máximo {MAX_COMBO_IMAGENES} fotos; la portada es la que aparece primero.</p>
                </div>
              )}
              {faseActual.id === 'vista' && (renderVistaCombo ? renderVistaCombo({
                combo: comboVistaDto, principal, upsells, precioTotal, imagenes: imagenesVista, faq,
                device: previewDevice, onDeviceChange: setPreviewDevice,
              }) : (
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
              ))}
            </div>

            {/* ══ Navegación entre fases ═══════════════════════════════ */}
            <footer className="cw-nav">
              <button type="button" className="btn-secondary" disabled={guardando || precioPendiente} onClick={() => (fase === 0 ? onCancelar?.() : irA(fase - 1))}>
                <ArrowLeft size={15} /> {fase === 0 ? 'Cancelar' : 'Atrás'}
              </button>
              <div className="cw-nav-derecha">
                {(isEditing || fase >= FASE.analisis) && (
                  <button type="button" className="btn-secondary" onClick={() => handleGuardar(false)} disabled={guardando || precioPendiente}>
                    <Save size={15} /> {guardando ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar borrador'}
                  </button>
                )}
                {!esUltima ? (
                  <button type="button" className="btn-primary" onClick={siguiente} disabled={precioPendiente}>
                    {FASES[fase + 1].opcional ? `Seguir: ${FASES[fase + 1].titulo.toLowerCase()}` : `Siguiente: ${FASES[fase + 1].titulo.toLowerCase()}`} <ArrowRight size={15} />
                  </button>
                ) : estadoActual !== 'ACTIVO' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={isEditing ? () => setEstadoAConfirmar('ACTIVO') : () => handleGuardar(true)}
                    disabled={guardando || cambiandoEstado || precioPendiente}
                  >
                    <Power size={15} /> {integrado ? 'Crear combo y sumarlo a la landing' : 'Poner en venta'}
                  </button>
                ) : (
                  <button type="button" className="btn-secondary" onClick={() => setEstadoAConfirmar('INACTIVO')} disabled={cambiandoEstado}>
                    <PowerOff size={15} /> Pausar venta
                  </button>
                )}
              </div>
            </footer>
          </section>
        </div>
      ) : (
        /* ══ Ficha de venta (solo combos guardados) ═══════════════════════ */
        <div className="combo-vista-workspace">
          <div className="combo-vista-editor">
            <p className="combo-help-text" style={{ marginTop: 0, marginBottom: '1rem' }}>
              Textos de venta del combo. Se muestran en su ficha dentro de las landings donde lo agregues.
            </p>
            <label className="cw-campo" style={{ marginBottom: '1rem' }}>
              <span>Propuesta de valor</span>
              <textarea
                className="cw-input"
                value={propuestaValor}
                onChange={e => setPropuestaValor(e.target.value)}
                placeholder="Ej: Todo lo que necesitás para empezar, en un solo pack."
                rows={2}
              />
            </label>
            <FichaComboPanel
              ficha={fichaDatos}
              fichaResuelta={fichaComboResuelta}
              fichaDelProducto={fichaComboDelProducto}
              respaldos={{ titulo: nombre || 'Combo sin nombre', lead: propuestaValor || descripcion }}
              modo="producto"
              expandirTodas
              onChange={setFichaDatos}
            />
            <div style={{ marginTop: '1.25rem' }}>
              <div className="combo-section-label">Preguntas frecuentes de este combo</div>
              <FaqPanel faq={faq} onChange={setFaq} />
            </div>
            <div className="cw-nav" style={{ marginTop: '1.25rem' }}>
              <span />
              <button type="button" className="btn-primary" onClick={() => handleGuardar(false)} disabled={guardando}>
                <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
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

      <ConfirmDialog
        open={!!estadoAConfirmar}
        title={estadoAConfirmar === 'ACTIVO' ? '¿Poner el combo en venta?' : '¿Pausar la venta del combo?'}
        description={estadoAConfirmar === 'ACTIVO'
          ? 'Se guardan tus cambios y el combo aparece en tu catálogo y en las landings donde lo agregues.'
          : 'Deja de aparecer en tu catálogo y en tus landings. Podés volver a ponerlo en venta cuando quieras.'}
        confirmLabel={estadoAConfirmar === 'ACTIVO' ? 'Poner en venta' : 'Pausar'}
        danger={estadoAConfirmar !== 'ACTIVO'}
        loading={cambiandoEstado}
        onConfirm={confirmarCambioEstado}
        onCancel={() => setEstadoAConfirmar(null)}
      />
    </div>
  );
}
