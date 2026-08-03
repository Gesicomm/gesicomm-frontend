import React, { useState, useEffect } from 'react';
import { marcaService } from '../../services/catalogoService';
import { useDebounce } from '../../hooks/useDebounce';
import { Briefcase, Plus, Edit2, Trash2, X, Save, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../productos/productos.css';

const ITEMS_POR_PAGINA = 10;

function ModalMarca({ marca, onClose, onSave }) {
  const [nombre, setNombre] = useState(marca?.nombre || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es requerido.'); return; }
    setGuardando(true);
    setError('');
    try {
      if (marca?.id) {
        await marcaService.actualizar(marca.id, { nombre });
      } else {
        await marcaService.crear({ nombre });
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
        <h3>{marca?.id ? 'Editar marca' : 'Nueva marca'}</h3>
        {error && <div className="form-error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus />
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

export default function MarcaList() {
  const [marcas, setMarcas] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [marcaABajar, setMarcaABajar] = useState(null);
  const [dandoBaja, setDandoBaja] = useState(false);

  const [texto, setTexto] = useState('');
  const textoBuscado = useDebounce(texto, 300);

  const cargar = async (pag = 1, filtroTexto = '') => {
    setCargando(true);
    try {
      const body = {
        solo_activas: false,
        page: pag,
        limit: ITEMS_POR_PAGINA,
        ...(filtroTexto.trim() && { nombre: filtroTexto.trim() }),
      };
      const data = await marcaService.buscar(body);
      if (Array.isArray(data)) {
        setMarcas(data);
        setTotal(data.length);
        setTotalPaginas(1);
      } else {
        setMarcas(data.marcas || data.items || []);
        setTotal(data.total || 0);
        setTotalPaginas(data.total_paginas || 1);
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    setPagina(1);
    cargar(1, textoBuscado);
  }, [textoBuscado]);

  useEffect(() => {
    cargar(pagina, textoBuscado);
  }, [pagina]);

  const confirmarEliminar = async () => {
    if (!marcaABajar) return;
    setDandoBaja(true);
    try {
      await marcaService.eliminar(marcaABajar.id);
      setMarcaABajar(null);
      cargar(pagina, textoBuscado);
    } finally {
      setDandoBaja(false);
    }
  };

  return (
    <div className="prod-page">
      <div className="prod-header">
        <div className="prod-header-left">
          <div className="prod-icon-wrap" style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="prod-title">Marcas</h1>
            <p className="prod-subtitle">{cargando ? 'Buscando...' : `${total} marca${total !== 1 ? 's' : ''}`}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setModal('nuevo')}>
          <Plus size={15} /> Nueva marca
        </button>
      </div>

      {/* Buscador con debounce */}
      <div className="prod-filters">
        <div className="filter-search" style={{ flex: 1 }}>
          <Search size={15} className="filter-icon" />
          <input
            id="filtro-marca-texto"
            className="filter-input"
            placeholder="Buscar marca..."
            value={texto}
            onChange={e => setTexto(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="prod-table-wrap">
        {cargando && marcas.length === 0 ? (
          <div className="prod-loading"><div className="spinner" /></div>
        ) : (
          <div className={`prod-table-inner ${cargando ? 'is-loading' : ''}`}>
            <table className="prod-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {marcas.map(m => (
                  <tr key={m.id} className={!m.activo ? 'row-inactive' : ''}>
                    <td><strong style={{ color: '#e2e8f0' }}>{m.nombre}</strong></td>
                    <td><span className="sku-tag">{m.slug}</span></td>
                    <td>
                      <span className={`stock-badge ${m.activo ? 'stock-ok' : 'stock-low'}`}>
                        {m.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setModal(m)} title="Editar"><Edit2 size={14} /></button>
                        <button className="btn-icon danger" onClick={() => setMarcaABajar(m)} title="Dar de baja"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!cargando && marcas.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                    No se encontraron marcas
                  </td></tr>
                )}
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
        <ModalMarca
          marca={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); cargar(1, textoBuscado); setPagina(1); }}
        />
      )}

      <ConfirmDialog
        open={!!marcaABajar}
        title={`¿Dar de baja "${marcaABajar?.nombre}"?`}
        description="La marca dejará de estar activa. Los productos que la usan no se ven afectados."
        confirmLabel="Dar de baja"
        danger
        loading={dandoBaja}
        onConfirm={confirmarEliminar}
        onCancel={() => setMarcaABajar(null)}
      />
    </div>
  );
}
