import React, { useState, useEffect } from 'react';
import { categoriaService } from '../../services/catalogoService';
import { useDebounce } from '../../hooks/useDebounce';
import { Tag, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, X, Save, Search } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../productos/productos.css';

const ITEMS_POR_PAGINA = 10;

function ModalCategoria({ categoria, onClose, onSave, categorias }) {
  const [nombre, setNombre] = useState(categoria?.nombre || '');
  const [parentId, setParentId] = useState(categoria?.parent_id || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es requerido.'); return; }
    setGuardando(true);
    setError('');
    try {
      if (categoria?.id) {
        await categoriaService.actualizar(categoria.id, { nombre, parent_id: parentId || null });
      } else {
        await categoriaService.crear({ nombre, parent_id: parentId || null });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="cat-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cat-modal">
        <h3>{categoria?.id ? 'Editar categoría' : 'Nueva categoría'}</h3>
        {error && <div className="form-error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus required />
          </div>
          <div className="form-group">
            <label>Categoría padre <span style={{ color: '#64748b', fontWeight: 400 }}>(opcional)</span></label>
            <select value={parentId} onChange={e => setParentId(e.target.value)}>
              <option value="">Sin padre (categoría raíz)</option>
              {categorias.filter(c => c.id !== categoria?.id).map(c =>
                <option key={c.id} value={c.id}>{c.nombre}</option>
              )}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              <X size={14} /> Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoriaList() {
  const [todasLasCategorias, setTodasLasCategorias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [categoriaABajar, setCategoriaABajar] = useState(null);
  const [dandoBaja, setDandoBaja] = useState(false);

  const [texto, setTexto] = useState('');
  const textoBuscado = useDebounce(texto, 300);

  // Cargar del backend con filtros dinámicos vía POST
  const cargar = async (pag = 1, filtroTexto = '') => {
    setCargando(true);
    try {
      const body = {
        solo_activas: false,
        include_children: true,
        page: pag,
        limit: ITEMS_POR_PAGINA,
        ...(filtroTexto.trim() && { nombre: filtroTexto.trim() }),
      };
      const data = await categoriaService.buscar(body);
      // Soporte para respuesta paginada o array plano
      if (Array.isArray(data)) {
        setCategorias(data);
        setTotal(data.length);
        setTotalPaginas(1);
      } else {
        setCategorias(data.categorias || data.items || []);
        setTotal(data.total || 0);
        setTotalPaginas(data.total_paginas || 1);
      }
    } finally {
      setCargando(false);
    }
  };

  // Lista completa (sin filtros ni paginación) para el selector "categoría padre"
  // del modal. Solo hace falta pedirla una vez al montar y cuando se crea/edita/
  // elimina una categoría — antes se volvía a pedir en cada búsqueda y cada
  // cambio de página, duplicando innecesariamente la llamada al backend.
  const cargarTodas = async () => {
    const todas = await categoriaService.buscar({ solo_activas: false });
    setTodasLasCategorias(Array.isArray(todas) ? todas : todas.categorias || []);
  };

  useEffect(() => {
    cargarTodas();
  }, []);

  // Única fuente de búsqueda paginada: se dispara al montar y al cambiar de
  // página. El reseteo a página 1 ante un cambio de texto se hace en el propio
  // handler del input (más abajo) — antes había un efecto separado reaccionando
  // a `textoBuscado` que también llamaba a cargar(), duplicando la llamada.
  useEffect(() => {
    cargar(pagina, textoBuscado);
  }, [pagina, textoBuscado]);

  const confirmarEliminar = async () => {
    if (!categoriaABajar) return;
    setDandoBaja(true);
    try {
      await categoriaService.eliminar(categoriaABajar.id);
      setCategoriaABajar(null);
      cargar(pagina, textoBuscado);
      cargarTodas();
    } finally {
      setDandoBaja(false);
    }
  };

  const cerrarModal = () => {
    setModal(null);
    setPagina(1);
    cargar(1, textoBuscado);
    cargarTodas();
  };

  return (
    <div className="prod-page">
      <div className="prod-header">
        <div className="prod-header-left">
          <div className="prod-icon-wrap" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
            <Tag size={20} />
          </div>
          <div>
            <h1 className="prod-title">Categorías</h1>
            <p className="prod-subtitle">{cargando ? 'Buscando...' : `${total} categoría${total !== 1 ? 's' : ''}`}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setModal('nuevo')}>
          <Plus size={15} /> Nueva categoría
        </button>
      </div>

      {/* Buscador con debounce */}
      <div className="prod-filters">
        <div className="filter-search" style={{ flex: 1 }}>
          <Search size={15} className="filter-icon" />
          <input
            id="filtro-cat-texto"
            className="filter-input"
            placeholder="Buscar categoría..."
            value={texto}
            onChange={e => { setTexto(e.target.value); setPagina(1); }}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="prod-table-wrap">
        {cargando && categorias.length === 0 ? (
          <div className="prod-loading"><div className="spinner" /></div>
        ) : !cargando && categorias.length === 0 ? (
          <div className="prod-empty">
            <Tag size={48} opacity={0.3} />
            <p>{textoBuscado ? 'No se encontraron categorías' : 'Todavía no hay categorías'}</p>
            {!textoBuscado && (
              <button className="btn-primary" onClick={() => setModal('nuevo')}>
                <Plus size={14} /> Crear la primera
              </button>
            )}
          </div>
        ) : (
          <div className={`prod-table-inner ${cargando ? 'is-loading' : ''}`}>
            <table className="prod-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Padre</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map(cat => (
                  <React.Fragment key={cat.id}>
                    <tr className={!cat.activo ? 'row-inactive' : ''}>
                      <td><strong style={{ color: '#e2e8f0' }}>{cat.nombre}</strong></td>
                      <td><span className="sku-tag">{cat.slug}</span></td>
                      <td>—</td>
                      <td>
                        <span className={`stock-badge ${cat.activo ? 'stock-ok' : 'stock-low'}`}>
                          {cat.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => setModal(cat)} title="Editar"><Edit2 size={14} /></button>
                          <button className="btn-icon danger" onClick={() => setCategoriaABajar(cat)} title="Dar de baja"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    {(cat.subcategorias || []).map(sub => (
                      <tr key={sub.id} className={!sub.activo ? 'row-inactive' : ''}>
                        <td>
                          <span style={{ paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                            <ChevronRight size={12} />{sub.nombre}
                          </span>
                        </td>
                        <td><span className="sku-tag">{sub.slug}</span></td>
                        <td><span className="sku-tag">{cat.nombre}</span></td>
                        <td>
                          <span className={`stock-badge ${sub.activo ? 'stock-ok' : 'stock-low'}`}>
                            {sub.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-icon" onClick={() => setModal(sub)} title="Editar"><Edit2 size={14} /></button>
                            <button className="btn-icon danger" onClick={() => setCategoriaABajar(sub)} title="Dar de baja"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="prod-pagination">
            <button className="btn-pag" disabled={pagina === 1 || cargando} onClick={() => setPagina(p => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="pag-info">Página {pagina} de {totalPaginas}</span>
            <button className="btn-pag" disabled={pagina === totalPaginas || cargando} onClick={() => setPagina(p => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {modal && (
        <ModalCategoria
          categoria={modal === 'nuevo' ? null : modal}
          categorias={todasLasCategorias}
          onClose={() => setModal(null)}
          onSave={cerrarModal}
        />
      )}

      <ConfirmDialog
        open={!!categoriaABajar}
        title={`¿Dar de baja "${categoriaABajar?.nombre}"?`}
        description="La categoría dejará de estar activa. Los productos que la usan no se ven afectados."
        confirmLabel="Dar de baja"
        danger
        loading={dandoBaja}
        onConfirm={confirmarEliminar}
        onCancel={() => setCategoriaABajar(null)}
      />
    </div>
  );
}
