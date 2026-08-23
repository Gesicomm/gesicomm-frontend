import React, { useState, useEffect } from 'react';
import { Plus, Check, ShoppingCart, Tag, ImageOff, X, Loader, Trash2 } from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';

export default function ProductCheckoutOfertas({ producto, config, onChange, catalogo }) {
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  
  // Extraemos configuracion actual de la landing
  const ofertasCarrito = config.ofertas_carrito || [];
  const ofertasProductoVista = config.ofertas_producto_vista || [];

  // Formulario de nueva oferta
  const [formOferta, setFormOferta] = useState({
    estrategia: 'order_bump', // 'order_bump' o 'upsell'
    nombre: '',
    precio: '',
    producto_oferta_id: '',
    descripcion: ''
  });
  const [guardandoOferta, setGuardandoOferta] = useState(false);
  const [errorOferta, setErrorOferta] = useState('');

  useEffect(() => {
    if (producto?.id) {
      cargarOfertas();
    }
  }, [producto?.id]);

  async function cargarOfertas() {
    setCargando(true);
    try {
      const resp = await ofertaService.listarPorProducto(producto.id);
      setOfertas(resp.filter(o => o.estrategia === 'order_bump' || o.estrategia === 'upsell'));
    } catch (e) {
      console.error('Error cargando ofertas para producto', e);
    } finally {
      setCargando(false);
    }
  }

  function handleCheck(ofertaId, lista, checked) {
    const actual = config[lista] || [];
    let nuevaLista;
    if (checked) {
      nuevaLista = [...actual, ofertaId];
    } else {
      nuevaLista = actual.filter(id => id !== ofertaId);
    }
    onChange('content', { ...config, [lista]: nuevaLista });
  }

  async function crearOferta(e) {
    e.preventDefault();
    setErrorOferta('');
    if (!formOferta.nombre || !formOferta.precio) {
      setErrorOferta('El título y precio son obligatorios');
      return;
    }

    setGuardandoOferta(true);
    try {
      // Creamos la oferta para el producto actual. 
      // Si el user quiere que sea un combo real, debería usar el admin. Esto es un quick-create de bump/upsell
      if (!formOferta.producto_oferta_id) {
        setErrorOferta('Debe seleccionar un producto para la oferta');
        setGuardandoOferta(false);
        return;
      }
      const payload = {
        estrategia: formOferta.estrategia,
        tipo_contenido: 'combo',
        codigo: 'BUMP-' + producto.id + '-' + formOferta.producto_oferta_id + '-' + Date.now(),
        nombre: formOferta.nombre,
        precio: parseFloat(formOferta.precio),
        descripcion: formOferta.descripcion || '',
        componentes: [{
          producto_id: formOferta.producto_oferta_id,
          cantidad: 1
        }]
      };
      await ofertaService.crear(producto.id, payload);
      await cargarOfertas();
      setCreando(false);
      setFormOferta({ estrategia: 'order_bump', nombre: '', precio: '', descripcion: '', producto_oferta_id: '' });
    } catch (err) {
      setErrorOferta(err.response?.data?.message || 'Error al crear la oferta');
    } finally {
      setGuardandoOferta(false);
    }
  }

  async function eliminarOferta(id) {
    if (!window.confirm('¿Eliminar esta oferta permanentemente?')) return;
    try {
      await ofertaService.eliminar(producto.id, id);
      await cargarOfertas();
    } catch (err) {
      alert('Error al eliminar');
    }
  }

  if (cargando) {
    return <div className="flex justify-center py-4"><Loader className="animate-spin text-[var(--vit-muted)]" /></div>;
  }

  return (
    <div className="flex flex-col gap-4 mt-6 border-t border-[var(--vit-border)] pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--vit-text)]">Ofertas de Checkout</h3>
          <p className="text-xs text-[var(--vit-muted-2)]">Agrega Order Bumps y Upsells a la compra de {producto.nombre || producto.etiqueta}.</p>
        </div>
        {!creando && (
          <button type="button" onClick={() => setCreando(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--vit-text)] bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-md hover:border-[var(--vit-accent)] transition-colors">
            <Plus size={14} /> Nueva
          </button>
        )}
      </div>

      {creando && (
        <form onSubmit={crearOferta} className="bg-[var(--vit-surface)] border border-[var(--vit-border)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--vit-text)]">Nueva Oferta</span>
            <button type="button" onClick={() => setCreando(false)} className="text-[var(--vit-muted)] hover:text-[var(--vit-text)]"><X size={14}/></button>
          </div>

          {errorOferta && <div className="text-xs text-red-500 mb-2">{errorOferta}</div>}

          <div className="mb-3">
            <label className="block text-[10px] text-[var(--vit-muted-2)] uppercase mb-1">Estrategia</label>
            <select value={formOferta.estrategia} onChange={e => setFormOferta({...formOferta, estrategia: e.target.value})} className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none">
              <option value="order_bump">Order Bump (Antes de pagar)</option>
              <option value="upsell">Upsell (Después de pagar)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] text-[var(--vit-muted-2)] uppercase mb-1">Producto de la oferta</label>
            <select value={formOferta.producto_oferta_id} onChange={e => setFormOferta({...formOferta, producto_oferta_id: e.target.value})} className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none">
              <option value="">Seleccione un producto...</option>
              {catalogo?.productos?.filter(p => Number(p.id) !== Number(producto?.id)).map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] text-[var(--vit-muted-2)] uppercase mb-1">Título de la oferta</label>
            <input type="text" value={formOferta.nombre} onChange={e => setFormOferta({...formOferta, nombre: e.target.value})} placeholder="Ej: Sumá un cargador" className="w-full h-8 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none" />
          </div>

          <div className="mb-3">
            <label className="block text-[10px] text-[var(--vit-muted-2)] uppercase mb-1">Precio Promocional</label>
            <CurrencyInput value={formOferta.precio} onChange={val => setFormOferta({...formOferta, precio: val})} placeholder="Ej: 5000" />
          </div>

          <button type="submit" disabled={guardandoOferta} className="w-full h-8 rounded-md bg-[var(--vit-accent)] text-white text-xs font-semibold hover:bg-[var(--vit-accent-hover)] disabled:opacity-50 transition-colors flex items-center justify-center">
            {guardandoOferta ? <Loader className="animate-spin" size={14} /> : 'Guardar Oferta'}
          </button>
        </form>
      )}

      {ofertas.length === 0 && !creando ? (
        <div className="text-center py-6 border border-dashed border-[var(--vit-border)] rounded-lg">
          <Tag className="mx-auto text-[var(--vit-muted-2)] mb-2" size={24} />
          <p className="text-xs text-[var(--vit-muted)]">No hay ofertas creadas para este producto.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ofertas.map(of => (
            <div key={of.id} className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--vit-text)]">{of.nombre}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--vit-accent)]/10 text-[var(--vit-accent)] uppercase tracking-wider">{of.estrategia.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-[var(--vit-muted)] font-mono mt-0.5">${of.precio}</div>
                </div>
                <button type="button" onClick={() => eliminarOferta(of.id)} className="text-[var(--vit-muted-2)] hover:text-red-400 p-1 rounded-md transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-2 border-t border-[var(--vit-border)] pt-2 mt-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-[var(--vit-text)] flex items-center gap-1.5"><Check size={14} className="text-[var(--vit-accent)]"/> Comprar Ya del Producto</span>
                  <input type="checkbox" className="accent-[var(--vit-accent)]" checked={ofertasProductoVista.includes(of.id)} onChange={e => handleCheck(of.id, 'ofertas_producto_vista', e.target.checked)} />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-[var(--vit-text)] flex items-center gap-1.5"><ShoppingCart size={14} className="text-[var(--vit-accent)]"/> Carrito Global</span>
                  <input type="checkbox" className="accent-[var(--vit-accent)]" checked={ofertasCarrito.includes(of.id)} onChange={e => handleCheck(of.id, 'ofertas_carrito', e.target.checked)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
