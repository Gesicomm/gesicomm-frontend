import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import { proveedoresService } from '../../services/costosGastosService';
import { getMediaUrl } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Package, Plus, Search, Edit2, Trash2,
  Star, AlertTriangle, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Loader, Tag, Layers, Warehouse, Truck,
  FileSpreadsheet, UploadCloud, X, CheckCircle2
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import LogisticaAbastecimientoModal from '../../components/depositos/LogisticaAbastecimientoModal';
import { verificarSesion } from '../../utils/auth';
import './productos.css';

const ITEMS_POR_PAGINA = 10;

const VISTAS_CATALOGO = [
  { id: 'todos', label: 'Todos' },
  { id: 'activos', label: 'Activos' },
  { id: 'sin_stock', label: 'Sin stock' },
  { id: 'ofertas', label: 'Ofertas' },
  { id: 'variantes', label: 'Variantes' },
];

const ORDENES_CATALOGO = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'nombre', label: 'Nombre A-Z' },
  { value: 'precio_asc', label: 'Menor precio' },
  { value: 'precio_desc', label: 'Mayor precio' },
  { value: 'stock_asc', label: 'Menor stock' },
];

export default function ProductList() {
  const navigate = useNavigate();

  // ── Datos ────────────────────────────────────────────────
  const [productos, setProductos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productoABajar, setProductoABajar] = useState(null);
  const [productoAbastecer, setProductoAbastecer] = useState(null);
  const [dandoBaja, setDandoBaja] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [modalImportacion, setModalImportacion] = useState(false);
  const [archivoImportacion, setArchivoImportacion] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState(null);
  const [errorImportacion, setErrorImportacion] = useState('');
  const [origenImportacion, setOrigenImportacion] = useState('gesicom'); // 'gesicom' | 'shopify'
  const [revisionImportacion, setRevisionImportacion] = useState(null); // vista previa de la plantilla
  // Columnas y límites de la plantilla: los da el backend, que es quien
  // arma el Excel y lo valida, para que el paso a paso nunca diga otra cosa.
  const [formatoImportacion, setFormatoImportacion] = useState(null);
  const inputImportacionRef = useRef(null);

  // ── Filtros (todos controlados) ───────────────────────────
  const [texto, setTexto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [vista, setVista] = useState('activos');
  const [ordenarPor, setOrdenarPor] = useState('recientes');

  // Debounce solo para el texto (los selects disparan inmediato)
  const textoBuscado = useDebounce(texto, 300);

  // ── Cargar catálogos una sola vez ─────────────────────────
  useEffect(() => {
    verificarSesion().then(u => setUsuarioActual(u));
    Promise.all([
      categoriaService.buscar({ solo_activas: true, limit: 1000 }),
      proveedoresService.buscar({ limit: 1000 }).catch(() => ({ proveedores: [] }))
    ]).then(([catData, provData]) => {
      setCategorias(catData.categorias || catData);
      setProveedores(provData.proveedores || provData || []);
    });
  }, []);

  // ── Buscar en backend ─────────────────────────────────────
  const buscar = useCallback(async (pag = 1) => {
    setCargando(true);
    try {
      const body = {
        page: pag,
        limit: ITEMS_POR_PAGINA,
        ordenar_por: ordenarPor,
        // Filtros dinámicos — solo incluir si tienen valor
        ...(textoBuscado.trim()  && { texto: textoBuscado.trim() }),
        ...(categoriaId          && { categoria_id: parseInt(categoriaId) }),
        ...(proveedorId          && { proveedor_id: parseInt(proveedorId) }),
        ...(vista === 'activos'  && { activo: true }),
        ...(vista === 'sin_stock' && { sin_stock: true }),
        ...(vista === 'ofertas' && { con_ofertas: true }),
        ...(vista === 'variantes' && { con_variantes: true }),
        mios_solamente: true,
      };

      const data = await productService.buscar(body);
      setProductos(data.productos);
      setTotal(data.total);
      setTotalPaginas(data.total_paginas);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [textoBuscado, categoriaId, proveedorId, vista, ordenarPor]);

  // Única fuente de búsqueda: se dispara al montar, al cambiar de página,
  // y al cambiar cualquier filtro (porque `buscar` cambia de identidad
  // cuando cambian sus dependencias). El reseteo a página 1 ante un cambio
  // de filtro se hace directamente en cada handler (más abajo), no acá —
  // antes había un efecto separado que también llamaba a buscar(1) en
  // paralelo con este, duplicando la llamada al backend en cada carga y
  // en cada cambio de filtro.
  useEffect(() => {
    buscar(pagina);
  }, [pagina, buscar]);

  // ── Acciones ──────────────────────────────────────────────
  const toggleActivo = async (producto) => {
    try {
      await productService.actualizar(producto.id, { activo: !producto.activo });
      buscar(pagina);
    } catch (err) { console.error(err); }
  };

  const confirmarDarDeBaja = async () => {
    if (!productoABajar) return;
    setDandoBaja(true);
    try {
      await productService.eliminar(productoABajar.id);
      setProductoABajar(null);
      buscar(pagina);
    } catch (err) {
      console.error(err);
    } finally {
      setDandoBaja(false);
    }
  };

  const cambiarPagina = (nueva) => {
    if (nueva < 1 || nueva > totalPaginas) return;
    setPagina(nueva);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limpiarImportacion = () => {
    setArchivoImportacion(null);
    setResultadoImportacion(null);
    setRevisionImportacion(null);
    setErrorImportacion('');
  };

  const abrirImportacion = () => {
    limpiarImportacion();
    setOrigenImportacion('gesicom');
    setModalImportacion(true);
    if (!formatoImportacion) productService.formatoImportacion().then(setFormatoImportacion).catch(() => {});
  };

  const elegirArchivoImportacion = (archivo) => {
    limpiarImportacion();
    setArchivoImportacion(archivo || null);
  };

  const descargarPlantilla = async () => {
    setErrorImportacion('');
    try {
      await productService.descargarPlantillaImportacion();
    } catch {
      setErrorImportacion('No se pudo descargar la plantilla. Probá de nuevo.');
    }
  };

  // Plantilla de Gesicom, en dos pasos: primero se revisa el archivo (no
  // crea nada) y recién al confirmar se importan las filas sin errores.
  const importarPlantilla = async (aplicar) => {
    if (!archivoImportacion) {
      setErrorImportacion('Elegí la plantilla de Gesicom completa (.xlsx).');
      return;
    }
    setImportando(true);
    setErrorImportacion('');
    try {
      const resultado = await productService.importarMasivo(archivoImportacion, { aplicar });
      if (aplicar) {
        setRevisionImportacion(null);
        setResultadoImportacion(resultado);
        setPagina(1);
        await buscar(1);
      } else {
        setRevisionImportacion(resultado);
      }
    } catch (err) {
      setErrorImportacion(err.response?.data?.message || 'No se pudo leer el archivo.');
    } finally {
      setImportando(false);
    }
  };

  const cerrarImportacion = () => {
    if (importando) return;
    setModalImportacion(false);
  };

  const importarArchivoShopify = async () => {
    if (!archivoImportacion) {
      setErrorImportacion('Elegí un archivo CSV o Excel exportado desde Shopify.');
      return;
    }
    setImportando(true);
    setErrorImportacion('');
    setResultadoImportacion(null);
    try {
      const formData = new FormData();
      formData.append('archivo', archivoImportacion);
      const resultado = await productService.importarShopify(formData);
      setResultadoImportacion(resultado);
      setPagina(1);
      await buscar(1);
    } catch (err) {
      setErrorImportacion(err.response?.data?.message || 'No se pudo importar el archivo.');
    } finally {
      setImportando(false);
    }
  };

  const abrirOfertas = (producto) => {
    sessionStorage.setItem('gesicomm:tabInicial', 'ofertas');
    navigate(`/products/${producto.id}/editar`);
  };

  const precioDisplay = (valor) =>
    `${parseFloat(valor || 0).toLocaleString('es-PY', { maximumFractionDigits: 0 })} Gs`;

  const esAdmin = usuarioActual?.rol === 'administrador';
  // Un producto "Global" (creado_por de otro usuario) nunca es editable ni
  // dable de baja por una cuenta no-admin — ver mismo criterio en
  // producto.service.js#actualizar/eliminar (backend ya lo rechaza con
  // 403, esto evita que el front ni siquiera ofrezca la acción).
  const puedeModificar = (p) => esAdmin || (usuarioActual && p.creado_por === usuarioActual.id);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="prod-page">

      {/* Header */}
      <div className="prod-header">
        <div className="prod-header-left">
          <div className="prod-icon-wrap"><Package size={22} /></div>
          <div>
            <h1 className="prod-title">Productos</h1>
            <p className="prod-subtitle">
              {cargando ? 'Buscando...' : `${total} producto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="prod-header-actions">
          <button className="btn-secondary" onClick={abrirImportacion}>
            <FileSpreadsheet size={16} /> Agregar productos masivamente
          </button>
          <button className="btn-primary" onClick={() => navigate('/products/nuevo')}>
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Filtros — todos disparan búsqueda automática */}
      <div className="prod-filters">
        {/* Texto con debounce */}
        <div className="filter-search">
          <Search size={15} className="filter-icon" />
          <input
            id="filtro-texto"
            className="filter-input"
            placeholder="Buscar por nombre..."
            value={texto}
            onChange={e => { setTexto(e.target.value); setPagina(1); }}
            autoComplete="off"
          />
          {cargando && texto && (
            <span className="filter-loading"><Loader size={13} className="spin-icon" /></span>
          )}
        </div>

        {/* Categoría */}
        <select
          id="filtro-categoria"
          className="filter-select"
          value={categoriaId}
          onChange={e => { setCategoriaId(e.target.value); setPagina(1); }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        {/* Proveedor */}
        <select
          id="filtro-proveedor"
          className="filter-select"
          value={proveedorId}
          onChange={e => { setProveedorId(e.target.value); setPagina(1); }}
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        {/* Orden */}
        <select
          id="filtro-orden"
          className="filter-select"
          value={ordenarPor}
          onChange={e => { setOrdenarPor(e.target.value); setPagina(1); }}
        >
          {ORDENES_CATALOGO.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="prod-view-tabs" role="tablist" aria-label="Vistas de catálogo">
        {VISTAS_CATALOGO.map(v => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={vista === v.id}
            className={`prod-view-tab ${vista === v.id ? 'active' : ''}`}
            onClick={() => { setVista(v.id); setPagina(1); }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="prod-table-wrap">
        {cargando && productos.length === 0 ? (
          <div className="prod-loading">
            <div className="spinner" />
          </div>
        ) : !cargando && productos.length === 0 ? (
          <div className="prod-empty">
            <Package size={48} opacity={0.3} />
            <p>No se encontraron productos</p>
            <button className="btn-primary" onClick={() => navigate('/products/nuevo')}>
              <Plus size={14} /> Crear el primero
            </button>
          </div>
        ) : (
          <>
            {/* Overlay de carga sobre la tabla sin saltar el layout */}
            <div className={`prod-table-inner ${cargando ? 'is-loading' : ''}`}>
              <table className="prod-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Indicadores</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map(p => {
                    const stock = Number(p.cantidad_disponible) || 0;
                    const stockMinimo = Number(p.stock_minimo) || 0;
                    const sinStockItem = stock <= 0;
                    const stockBajoItem = stock > 0 && stock <= stockMinimo;
                    const imagen = p.imagenes?.[0]?.url;
                    const precioBase = Number(p.precio_base) || 0;
                    const precioAncla = Number(p.precio_ancla ?? p.precio_tachado) || 0;
                    const tienePrecioAncla = precioAncla > precioBase;
                    const tieneDescuento = tienePrecioAncla || Number(p.descuento_porcentaje) > 0 || Number(p.ofertas_count) > 0;
                    const categoria = categorias.find(c => c.id === p.categoria_id)?.nombre;
                    const proveedor = proveedores.find(pr => pr.id === p.proveedor_id)?.nombre;
                    const editable = puedeModificar(p);
                    return (
                      <tr
                        key={p.id}
                        className={`prod-row ${!p.activo ? 'row-inactive' : ''}`}
                        onClick={() => { if (editable) navigate(`/products/${p.id}/editar`); }}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editable) navigate(`/products/${p.id}/editar`);
                        }}
                      >
                        <td>
                          <div className="prod-cell-name">
                            <div className="prod-thumb">
                              {imagen
                                ? <img src={getMediaUrl(imagen)} alt={p.nombre} />
                                : <Package size={18} opacity={0.4} />
                              }
                            </div>
                            <div>
                              <div className="prod-name-line">
                                <span className="prod-name">{p.nombre}</span>
                                {p.destacado && (
                                  <span className="badge-star"><Star size={10} /> Destacado</span>
                                )}
                              </div>
                              <div className="prod-meta-line">
                                {p.sku && <span className="sku-tag">{p.sku}</span>}
                                {categoria && <span>{categoria}</span>}
                                {proveedor && <span>• {proveedor}</span>}
                                {usuarioActual && p.creado_por === usuarioActual.id ? (
                                  <span className="owner-badge own">Propio</span>
                                ) : (
                                  <span className="owner-badge">Global</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="prod-price-stack">
                            {tienePrecioAncla && <span className="anchor-price">{precioDisplay(precioAncla)}</span>}
                            <span className="price-tag">{precioDisplay(precioBase)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="stock-stack">
                            <span className={`stock-badge ${sinStockItem ? 'stock-empty' : stockBajoItem ? 'stock-low' : 'stock-ok'}`}>
                              {(stockBajoItem || sinStockItem) && <AlertTriangle size={11} />}
                              {stock} unidades
                            </span>
                            <span className="stock-mini-label">
                              {sinStockItem ? 'Agotado' : stockBajoItem ? 'Stock bajo' : 'Saludable'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="prod-indicators">
                            {tieneDescuento && <span className="prod-indicator offer"><Tag size={11} /> Oferta</span>}
                            {Number(p.variantes_count) > 0 && (
                              <span className="prod-indicator"><Layers size={11} /> {p.variantes_count} variantes</span>
                            )}
                            {Number(p.ofertas_count) > 0 && (
                              <span className="prod-indicator"><Tag size={11} /> {p.ofertas_count} ofertas</span>
                            )}
                            {Number(p.tags_count) > 0 && (
                              <span className="prod-indicator">{p.tags_count} tags</span>
                            )}
                            {!tieneDescuento && !p.variantes_count && !p.ofertas_count && !p.tags_count && (
                              <span className="prod-indicator muted">Simple</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`estado-venta-badge estado-${p.estado_venta || 'en_venta'}`}>
                            <span className="estado-venta-dot" />
                            {p.estado_venta === 'en_venta' ? 'En venta'
                              : p.estado_venta === 'fuera_de_stock' ? 'Fuera de stock'
                              : 'No disponible'}
                          </span>
                          <button
                            className={`toggle-btn ${p.activo ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); if (editable) toggleActivo(p); }}
                            title={editable ? (p.activo ? 'Desactivar' : 'Activar') : 'No podés modificar un producto que no creaste'}
                            disabled={!editable}
                          >
                            {p.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                        </td>
                        <td>
                          <div className="action-btns">
                            {/* Producto de catálogo Gesicomm (Global): botón para solicitar abastecimiento a depósito propio */}
                            {!editable && (
                              <button
                                className="btn-icon"
                                style={{ color: 'var(--color-primary, #2563eb)' }}
                                onClick={(e) => { e.stopPropagation(); setProductoAbastecer(p); }}
                                title="Abastecerme (Pedir stock a mi depósito)"
                              >
                                <Truck size={15} />
                              </button>
                            )}
                            {/* Un producto propio es editable y puede enviarse a Fulfillment Gesicomm */}
                            {editable && (
                              <>
                                <button
                                  className="btn-icon"
                                  onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.id}/editar`); }}
                                  title="Abrir workspace"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  className="btn-icon"
                                  onClick={(e) => { e.stopPropagation(); navigate('/inventario/nuevo', { state: { preseleccionarProducto: p } }); }}
                                  title="Enviar a Fulfillment Gesicomm"
                                >
                                  <Warehouse size={15} />
                                </button>
                              </>
                            )}
                            <button
                              className="btn-icon"
                              onClick={(e) => { e.stopPropagation(); abrirOfertas(p); }}
                              title="Gestionar ofertas"
                            >
                              <Tag size={15} />
                            </button>
                            {editable && (
                              <button
                                className="btn-icon danger"
                                onClick={(e) => { e.stopPropagation(); setProductoABajar(p); }}
                                title="Dar de baja"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="prod-pagination">
                <button
                  className="btn-pag"
                  disabled={pagina === 1 || cargando}
                  onClick={() => cambiarPagina(pagina - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Números de página */}
                <div className="pag-numbers">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
                    .reduce((acc, n, idx, arr) => {
                      if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`dots-${idx}`} className="pag-dots">…</span>
                      ) : (
                        <button
                          key={item}
                          className={`btn-pag-num ${pagina === item ? 'active' : ''}`}
                          onClick={() => cambiarPagina(item)}
                          disabled={cargando}
                        >
                          {item}
                        </button>
                      )
                    )
                  }
                </div>

                <button
                  className="btn-pag"
                  disabled={pagina === totalPaginas || cargando}
                  onClick={() => cambiarPagina(pagina + 1)}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>

                <span className="pag-info">
                  {((pagina - 1) * ITEMS_POR_PAGINA) + 1}–{Math.min(pagina * ITEMS_POR_PAGINA, total)} de {total}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {productoAbastecer && (
        <LogisticaAbastecimientoModal
          open={!!productoAbastecer}
          envio={{ id: productoAbastecer.id, producto_nombre: productoAbastecer.nombre, abastecimiento_estado: 'pendiente_pago' }}
          onClose={() => setProductoAbastecer(null)}
          onPagar={() => {
            setProductoAbastecer(null);
            buscar(pagina);
          }}
        />
      )}

      <ConfirmDialog
        open={!!productoABajar}
        title={`¿Dar de baja "${productoABajar?.nombre}"?`}
        description="El producto dejará de estar disponible para la venta. Podés reactivarlo después desde el listado."
        confirmLabel="Dar de baja"
        danger
        loading={dandoBaja}
        onConfirm={confirmarDarDeBaja}
        onCancel={() => setProductoABajar(null)}
      />

      {modalImportacion && (() => {
        const esPlantilla = origenImportacion === 'gesicom';
        const titulo = esPlantilla ? 'Agregar productos masivamente' : 'Importar productos desde Shopify';
        const erroresDe = (r) => (r?.errores_total > 0 ? (
          <div className="import-errors">
            <strong>
              {esPlantilla
                ? `${r.errores_total} fila(s) con errores${r.aplicado ? ' no se importaron' : ': corregilas en el Excel o importá el resto'}`
                : `${r.errores_total} producto(s) no se importaron`}
            </strong>
            <ul>
              {r.errores.map((err, idx) => (
                <li key={idx}>
                  <span>{esPlantilla ? `Fila ${err.fila}${err.sku ? ` · ${err.sku}` : ''}` : (err.handle || `Fila ${err.fila}`)}</span>
                  <small>{err.error}</small>
                </li>
              ))}
            </ul>
            {r.errores_total > r.errores.length && <small>Se muestran los primeros {r.errores.length} errores.</small>}
          </div>
        ) : null);
        return (
        <div className="import-modal-overlay" role="dialog" aria-modal="true" aria-label={titulo}>
          <div className={`import-modal ${esPlantilla ? 'import-modal--amplio' : ''}`}>
            <div className="import-modal-header">
              <div>
                <h2>{titulo}</h2>
                <p>
                  {esPlantilla
                    ? 'Cargá muchos productos de una vez con un Excel: un producto por fila, solo con los datos básicos. Seguí estos pasos.'
                    : 'Subí el CSV o Excel exportado desde Shopify. Gesicom crea productos, variantes básicas e imágenes por URL.'}
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={cerrarImportacion} aria-label="Cerrar" disabled={importando}>
                <X size={17} />
              </button>
            </div>

            <div className="rubro-options import-origen" role="radiogroup" aria-label="Origen del archivo">
              {[['gesicom', 'Plantilla de Gesicom'], ['shopify', 'Exportación de Shopify']].map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={origenImportacion === valor}
                  className={`rubro-option ${origenImportacion === valor ? 'active' : ''}`}
                  onClick={() => { limpiarImportacion(); setOrigenImportacion(valor); }}
                  disabled={importando}
                >
                  <span>{etiqueta}</span>
                </button>
              ))}
            </div>

            {esPlantilla && (
              <ol className="import-pasos" aria-label="Pasos para cargar productos masivamente">
                <li>
                  <strong>Descargá la plantilla.</strong> Es un Excel con las columnas ya armadas. Usá siempre ese archivo: no cambies el nombre de la hoja ni el de los encabezados.
                  <button type="button" className="btn-secondary btn-small" onClick={descargarPlantilla}>
                    <FileSpreadsheet size={14} /> Descargar plantilla (.xlsx)
                  </button>
                </li>
                <li>
                  <strong>Completá una fila por producto</strong> en la hoja “{formatoImportacion?.hoja || 'Productos'}”. Las columnas con * son obligatorias: si falta alguna, esa fila no se importa.
                  {formatoImportacion ? (
                    <div className="import-columnas-wrap">
                      <table className="import-columnas">
                        <thead>
                          <tr><th>Columna</th><th>Qué va</th><th>Ejemplo</th></tr>
                        </thead>
                        <tbody>
                          {formatoImportacion.columnas.map(c => (
                            <tr key={c.titulo}>
                              <th scope="row">
                                {c.titulo}{c.obligatoria ? ' *' : ''}
                                <small>{c.obligatoria ? 'Obligatoria' : 'Opcional'}</small>
                              </th>
                              <td>{c.ayuda}</td>
                              <td className="import-columnas-ejemplo">{c.ejemplo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="field-hint">El detalle de cada columna también está en la hoja “Instrucciones” de la plantilla.</p>
                  )}
                </li>
                <li>
                  <strong>Antes de subirlo, revisá esto:</strong>
                  <ul>
                    <li>El archivo tiene que ser Excel (.xlsx), con hasta {formatoImportacion?.max_productos || 500} productos.</li>
                    <li>Los precios, el costo y el stock van como número, sin “Gs” ni texto. Ej: 89000.</li>
                    <li>Cada SKU va una sola vez y no puede existir ya en tu catálogo: la carga masiva crea productos nuevos, no modifica los que ya tenés.</li>
                    <li>Las fotos van como links públicos que empiecen con https:// (hasta {formatoImportacion?.max_imagenes || 6} por producto). Para poner varias en una celda: una por renglón con Alt+Enter, o separadas con |.</li>
                    <li>Con stock 0 el producto se crea, pero la tienda lo muestra sin stock y no deja comprarlo.</li>
                  </ul>
                </li>
                <li>
                  <strong>Subí el archivo acá abajo y tocá “Revisar archivo”.</strong> Todavía no se crea nada: te mostramos cuántos productos están listos y, fila por fila, qué hay que corregir.
                </li>
                <li>
                  <strong>Confirmá con “Importar productos”.</strong> Se crean las filas sin errores. Las que tengan errores quedan afuera: corregilas en el Excel y volvé a subir solo esas.
                </li>
                <li>
                  <strong>Después de importar,</strong> las variantes, preguntas frecuentes, opiniones y ofertas se completan dentro de cada producto.
                </li>
              </ol>
            )}

            <button
              type="button"
              className={`import-dropzone ${archivoImportacion ? 'has-file' : ''}`}
              onClick={() => inputImportacionRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) elegirArchivoImportacion(file);
              }}
              disabled={importando}
            >
              <UploadCloud size={24} />
              <span>{archivoImportacion ? archivoImportacion.name : (esPlantilla ? 'Elegir la plantilla completa (.xlsx)' : 'Elegir archivo CSV, XLS o XLSX')}</span>
              <small>{esPlantilla ? 'Primero se revisa el archivo: no se crea nada hasta que confirmes.' : 'Usá el archivo de exportación de productos de Shopify.'}</small>
            </button>
            <input
              ref={inputImportacionRef}
              type="file"
              aria-label="Archivo a importar"
              accept={esPlantilla
                ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : '.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'}
              hidden
              onChange={(e) => {
                elegirArchivoImportacion(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            {errorImportacion && (
              <div className="import-alert error">
                <AlertTriangle size={15} />
                <span>{errorImportacion}</span>
              </div>
            )}

            {revisionImportacion && (
              <div className="import-result">
                <div className={`import-alert ${revisionImportacion.listos > 0 ? 'success' : 'error'}`}>
                  {revisionImportacion.listos > 0 ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>
                    {revisionImportacion.listos} de {revisionImportacion.total_leidos} productos listos para importar.
                    {revisionImportacion.listos === 0 && ' Corregí los errores y volvé a subir el archivo.'}
                  </span>
                </div>
                {erroresDe(revisionImportacion)}
              </div>
            )}

            {resultadoImportacion && (
              <div className="import-result">
                <div className="import-alert success">
                  <CheckCircle2 size={15} />
                  <span>
                    {resultadoImportacion.creados} de {resultadoImportacion.total_leidos} productos importados.
                    {' '}{esPlantilla
                      ? `${resultadoImportacion.imagenes} imágenes agregadas.`
                      : `${resultadoImportacion.imagenes} imágenes y ${resultadoImportacion.variantes} variantes agregadas.`}
                  </span>
                </div>
                {erroresDe(resultadoImportacion)}
              </div>
            )}

            <div className="import-modal-actions">
              <button type="button" className="btn-secondary" onClick={cerrarImportacion} disabled={importando}>
                {resultadoImportacion ? 'Cerrar' : 'Cancelar'}
              </button>
              {!esPlantilla && (
                <button type="button" className="btn-primary" onClick={importarArchivoShopify} disabled={importando || !archivoImportacion}>
                  {importando ? <Loader size={15} className="spin-icon" /> : <UploadCloud size={15} />}
                  {importando ? 'Importando...' : 'Importar productos'}
                </button>
              )}
              {esPlantilla && !resultadoImportacion && (revisionImportacion?.listos > 0 ? (
                <button type="button" className="btn-primary" onClick={() => importarPlantilla(true)} disabled={importando}>
                  {importando ? <Loader size={15} className="spin-icon" /> : <UploadCloud size={15} />}
                  {importando ? 'Importando...' : `Importar ${revisionImportacion.listos} producto${revisionImportacion.listos === 1 ? '' : 's'}`}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={() => importarPlantilla(false)} disabled={importando || !archivoImportacion}>
                  {importando ? <Loader size={15} className="spin-icon" /> : <FileSpreadsheet size={15} />}
                  {importando ? 'Revisando...' : 'Revisar archivo'}
                </button>
              ))}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
