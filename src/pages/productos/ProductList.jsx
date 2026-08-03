import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import { getMediaUrl } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Package, Plus, Search, Edit2, Trash2,
  Star, AlertTriangle, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Loader, Tag
} from 'lucide-react';
import ProductCombosDrawer from './ProductCombosDrawer';
import ConfirmDialog from '../../components/ConfirmDialog';
import './productos.css';

const ITEMS_POR_PAGINA = 10;

export default function ProductList() {
  const navigate = useNavigate();

  // ── Datos ────────────────────────────────────────────────
  const [productos, setProductos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [categorias, setCategorias] = useState([]);
  const [comboProductoSeleccionado, setComboProductoSeleccionado] = useState(null);
  const [productoABajar, setProductoABajar] = useState(null);
  const [dandoBaja, setDandoBaja] = useState(false);

  // ── Filtros (todos controlados) ───────────────────────────
  const [texto, setTexto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [soloActivos, setSoloActivos] = useState('true');
  const [stockBajo, setStockBajo] = useState(false);

  // Debounce solo para el texto (los selects disparan inmediato)
  const textoBuscado = useDebounce(texto, 300);

  // ── Cargar catálogos una sola vez ─────────────────────────
  useEffect(() => {
    Promise.all([
      categoriaService.buscar({ solo_activas: true, limit: 1000 }),
    ]).then(([catData]) => {
      setCategorias(catData.categorias || catData);
    });
  }, []);

  // ── Buscar en backend ─────────────────────────────────────
  const buscar = useCallback(async (pag = 1) => {
    setCargando(true);
    try {
      const body = {
        page: pag,
        limit: ITEMS_POR_PAGINA,
        // Filtros dinámicos — solo incluir si tienen valor
        ...(textoBuscado.trim()  && { texto: textoBuscado.trim() }),
        ...(categoriaId          && { categoria_id: parseInt(categoriaId) }),
        ...(soloActivos !== ''   && { activo: soloActivos === 'true' }),
        ...(stockBajo            && { stock_bajo: true }),
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
  }, [textoBuscado, categoriaId, soloActivos, stockBajo]);

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

  const precioDisplay = (p) =>
    `${parseFloat(p.precio_base).toLocaleString('es-PY', { maximumFractionDigits: 0 })} Gs`;

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

        {/* Estado */}
        <select
          id="filtro-estado"
          className="filter-select"
          value={soloActivos}
          onChange={e => { setSoloActivos(e.target.value); setPagina(1); }}
        >
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="">Todos</option>
        </select>

        {/* Stock bajo */}
        <label className="filter-check" htmlFor="filtro-stock-bajo">
          <input
            id="filtro-stock-bajo"
            type="checkbox"
            checked={stockBajo}
            onChange={e => { setStockBajo(e.target.checked); setPagina(1); }}
          />
          <AlertTriangle size={13} /> Stock bajo
        </label>
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
                    <th>Estado de venta</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map(p => {
                    const stockBajoItem = p.cantidad_disponible <= p.stock_minimo;
                    const imagen = p.imagenes?.[0]?.url;
                    return (
                      <tr
                        key={p.id}
                        className={!p.activo ? 'row-inactive' : ''}
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
                              <span className="prod-name">{p.nombre}</span>
                              {p.destacado && (
                                <span className="badge-star"><Star size={10} /> Destacado</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`estado-venta-badge estado-${p.estado_venta || 'en_venta'}`}>
                            <span className="estado-venta-dot" />
                            {p.estado_venta === 'en_venta' ? 'En venta'
                              : p.estado_venta === 'fuera_de_stock' ? 'Fuera de stock'
                              : 'No disponible'}
                          </span>
                        </td>
                        <td>{categorias.find(c => c.id === p.categoria_id)?.nombre || '—'}</td>
                        <td><span className="price-tag">{precioDisplay(p)}</span></td>
                        <td>
                          <span className={`stock-badge ${stockBajoItem ? 'stock-low' : 'stock-ok'}`}>
                            {stockBajoItem && <AlertTriangle size={11} />}
                            {p.cantidad_disponible}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`toggle-btn ${p.activo ? 'active' : ''}`}
                            onClick={() => toggleActivo(p)}
                            title={p.activo ? 'Desactivar' : 'Activar'}
                          >
                            {p.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="btn-icon"
                              onClick={() => navigate(`/products/${p.id}/editar`)}
                              title="Editar"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => setComboProductoSeleccionado(p)}
                              title="Gestionar Combos"
                            >
                              <Tag size={15} />
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={() => setProductoABajar(p)}
                              title="Dar de baja"
                            >
                              <Trash2 size={15} />
                            </button>
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
