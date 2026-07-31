import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Package, Layers, Loader, AlertCircle } from 'lucide-react';
import { landingService } from '../../services/landingService';
import { vitrinaService } from '../../services/vitrinaService';
import '../vitrina/vitrina.css';
import './landing.css';

const MAX_ITEMS = 40;

function claveItem(tipo, id) {
  return `${tipo}:${id}`;
}

const FORM_INICIAL = {
  nombre: '',
  titulo: '',
  descripcion: '',
  slug: '',
  es_home: false,
  mostrar_filtro_categoria: true,
  mostrar_filtro_marca: true,
  mostrar_filtro_etiqueta: true,
  mostrar_buscador: true,
  mostrar_orden_precio: true,
};

export default function LandingEditor() {
  const { id } = useParams();
  const esEdicion = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(FORM_INICIAL);
  const [seleccion, setSeleccion] = useState(new Map()); // clave -> { tipo, referencia_id, etiqueta, orden }
  const [catalogo, setCatalogo] = useState({ productos: [], combos: [] });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datosCatalogo = await vitrinaService.catalogo();
      setCatalogo(datosCatalogo);

      if (esEdicion) {
        const landing = await landingService.obtener(id);
        setForm({
          nombre: landing.nombre || '',
          titulo: landing.titulo || '',
          descripcion: landing.descripcion || '',
          slug: landing.slug || '',
          es_home: !!landing.es_home,
          mostrar_filtro_categoria: landing.mostrar_filtro_categoria,
          mostrar_filtro_marca: landing.mostrar_filtro_marca,
          mostrar_filtro_etiqueta: landing.mostrar_filtro_etiqueta,
          mostrar_buscador: landing.mostrar_buscador,
          mostrar_orden_precio: landing.mostrar_orden_precio,
        });
        const mapa = new Map();
        (landing.items || []).forEach(item => {
          mapa.set(claveItem(item.tipo, item.referencia_id), {
            tipo: item.tipo,
            referencia_id: item.referencia_id,
            etiqueta: item.etiqueta || '',
            orden: item.orden,
          });
        });
        setSeleccion(mapa);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la información.');
    } finally {
      setCargando(false);
    }
  }, [id, esEdicion]);

  useEffect(() => { cargar(); }, [cargar]);

  const cantidadSeleccionada = seleccion.size;

  function toggleItem(tipo, referenciaId) {
    const clave = claveItem(tipo, referenciaId);
    setSeleccion(prev => {
      const copia = new Map(prev);
      if (copia.has(clave)) {
        copia.delete(clave);
      } else {
        if (copia.size >= MAX_ITEMS) {
          alert(`No podés agregar más de ${MAX_ITEMS} productos a una landing.`);
          return prev;
        }
        copia.set(clave, { tipo, referencia_id: referenciaId, etiqueta: '', orden: copia.size });
      }
      return copia;
    });
  }

  function actualizarEtiqueta(tipo, referenciaId, etiqueta) {
    const clave = claveItem(tipo, referenciaId);
    setSeleccion(prev => {
      if (!prev.has(clave)) return prev;
      const copia = new Map(prev);
      copia.set(clave, { ...copia.get(clave), etiqueta });
      return copia;
    });
  }

  const items = useMemo(() => Array.from(seleccion.values()), [seleccion]);

  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setErroresValidacion([]);

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (items.length === 0) {
      setError('Elegí al menos un producto o combo para la landing.');
      return;
    }

    const payload = {
      ...form,
      slug: form.slug.trim() || undefined,
      items,
    };

    setGuardando(true);
    try {
      if (esEdicion) {
        await landingService.actualizar(id, payload);
      } else {
        await landingService.crear(payload);
      }
      navigate('/mis-landings');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la landing.');
      setErroresValidacion(err.response?.data?.errores || []);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className="vit-page"><div className="vit-empty"><Loader size={22} className="spin-icon" /><p>Cargando...</p></div></div>;
  }

  return (
    <div className="vit-page">
      <div className="vit-header">
        <div>
          <Link to="/mis-landings" className="land-back-link"><ArrowLeft size={14} /> Mis landings</Link>
          <h1 className="vit-title">{esEdicion ? 'Editar landing' : 'Nueva landing'}</h1>
        </div>
      </div>

      {error && (
        <div className="land-alert-error"><AlertCircle size={14} /> {error}
          {erroresValidacion.length > 0 && (
            <ul>{erroresValidacion.map((e, i) => <li key={i}>{e}</li>)}</ul>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="land-editor-grid">
        <div className="land-section">
          <h2>Datos generales</h2>
          <label>Nombre interno
            <input value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Ofertas de verano" required />
          </label>
          <label>Título público
            <input value={form.titulo} onChange={e => handleChange('titulo', e.target.value)} placeholder="Se usa el nombre si lo dejás vacío" />
          </label>
          <label>Descripción
            <textarea value={form.descripcion} onChange={e => handleChange('descripcion', e.target.value)} rows={3} />
          </label>
          <label>Slug (URL)
            <input value={form.slug} onChange={e => handleChange('slug', e.target.value)} placeholder="Se genera automático si lo dejás vacío" />
          </label>
          <label className="land-check">
            <input type="checkbox" checked={form.es_home} onChange={e => handleChange('es_home', e.target.checked)} />
            Es la página principal de mi tienda (se muestra en tu URL sin ningún slug)
          </label>
        </div>

        <div className="land-section">
          <h2>Filtros visibles</h2>
          <div className="land-checks">
            {[
              ['mostrar_filtro_categoria', 'Categoría'],
              ['mostrar_filtro_marca', 'Marca'],
              ['mostrar_filtro_etiqueta', 'Etiquetas propias'],
              ['mostrar_buscador', 'Buscador'],
              ['mostrar_orden_precio', 'Orden por precio'],
            ].map(([campo, label]) => (
              <label key={campo} className="land-check">
                <input type="checkbox" checked={form[campo]} onChange={e => handleChange(campo, e.target.checked)} /> {label}
              </label>
            ))}
          </div>
          <p className="vit-subtitle">Los colores y el contacto (WhatsApp) se configuran una vez en <Link to="/mi-tienda">Mi tienda</Link> y aplican a todas tus landings.</p>
        </div>

        <div className="land-section land-section-wide">
          <h2>Productos y combos ({cantidadSeleccionada}/{MAX_ITEMS})</h2>
          <div className="land-item-picker">
            {catalogo.productos.map(p => {
              const clave = claveItem('producto', p.id);
              const seleccionado = seleccion.has(clave);
              return (
                <div key={clave} className={`land-item-row ${seleccionado ? 'selected' : ''}`}>
                  <label className="land-item-check">
                    <input type="checkbox" checked={seleccionado} onChange={() => toggleItem('producto', p.id)} />
                    <Package size={14} /> {p.nombre}
                  </label>
                  {seleccionado && (
                    <input
                      className="land-item-etiqueta"
                      placeholder="Etiqueta (opcional)"
                      value={seleccion.get(clave)?.etiqueta || ''}
                      onChange={e => actualizarEtiqueta('producto', p.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
            {catalogo.combos.map(c => {
              const clave = claveItem('combo', c.id);
              const seleccionado = seleccion.has(clave);
              return (
                <div key={clave} className={`land-item-row ${seleccionado ? 'selected' : ''}`}>
                  <label className="land-item-check">
                    <input type="checkbox" checked={seleccionado} onChange={() => toggleItem('combo', c.id)} />
                    <Layers size={14} /> {c.nombre}
                  </label>
                  {seleccionado && (
                    <input
                      className="land-item-etiqueta"
                      placeholder="Etiqueta (opcional)"
                      value={seleccion.get(clave)?.etiqueta || ''}
                      onChange={e => actualizarEtiqueta('combo', c.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
            {catalogo.productos.length === 0 && catalogo.combos.length === 0 && (
              <p className="vit-subtitle">Todavía no tenés productos ni combos disponibles en tu catálogo.</p>
            )}
          </div>
        </div>

        <div className="land-editor-footer">
          <button type="submit" className="land-btn-primary" disabled={guardando}>
            {guardando ? <Loader size={15} className="spin-icon" /> : <Save size={15} />}
            {esEdicion ? 'Guardar cambios' : 'Crear landing'}
          </button>
        </div>
      </form>
    </div>
  );
}
