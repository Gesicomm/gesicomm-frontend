import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import { proveedoresService } from '../../services/costosGastosService';
import { getMediaUrl } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Package, Plus, Search, Edit2, Trash2,
  Star, AlertTriangle, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Loader, Tag, Layers, Warehouse
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import ProductCombosDrawer from './ProductCombosDrawer';
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
  const [comboProductoSeleccionado, setComboProductoSeleccionado] = useState(null);
  const [productoABajar, setProductoABajar] = useState(null);
  const [dandoBaja, setDandoBaja] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);

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
        <button className="btn-primary" onClick={() => navigate('/products/nuevo')}>
          <Plus size={16} /> Nuevo producto
        </button>
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
                            {/* Un producto Global (de otro usuario) nunca se
                                edita ni se da de baja desde acá — ver
                                puedeModificar() arriba y el mismo criterio
                                en producto.service.js (backend). */}
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
                              onClick={(e) => { e.stopPropagation(); setComboProductoSeleccionado(p); }}
                              title="Gestionar Combos"
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

      {comboProductoSeleccionado && (
        <ProductCombosDrawer
          producto={comboProductoSeleccionado}
          onClose={() => setComboProductoSeleccionado(null)}
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
    </div>
  );
}
