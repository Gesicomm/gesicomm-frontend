import { useMemo, useState } from 'react';
import ProductPicker from '../landing/ProductPicker';
import '../landing/landing.css';

const CATALOGO_VACIO = { productos: [], combos: [] };

export function SeleccionProductosLead({ lead, onClose, onGuardar }) {
  const [items, setItems] = useState(() => (lead.items || []).map(item => ({ ...item })));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const seleccion = useMemo(() => new Map(items.map(item => [`producto:${item.producto_id}`, {
    id: Number(item.producto_id), tipo: 'producto', nombre: item.nombre_producto,
  }])), [items]);

  const toggle = producto => {
    if (guardando || (producto.tipo && producto.tipo !== 'producto')) return;
    const id = Number(producto.id);
    setItems(prev => prev.some(item => Number(item.producto_id) === id)
      ? prev.filter(item => Number(item.producto_id) !== id)
      : [...prev, { producto_id: id, nombre_producto: producto.nombre, cantidad: 1,
        precio_unitario: Number(producto.precio_efectivo ?? producto.precio_usuario ?? producto.precio_base ?? 0) || 0 }]);
    setError('');
  };

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    setError('');
    try { await onGuardar(items); }
    catch (err) { setError(err?.response?.data?.error || err?.message || 'No se pudieron guardar los productos de interés.'); }
    finally { setGuardando(false); }
  };

  return <ProductPicker abierto onCerrar={onClose} onConfirmar={guardar}
    confirmando={guardando} errorConfirmacion={error}
    catalogo={CATALOGO_VACIO} seleccion={seleccion} onToggle={toggle}
    max={50} permitirCombos={false} mostrarLista={false} mostrarInputs={false}
    modalTitle="Elegir productos de interés" zIndexModal={1300}
    themeScopeClassName="np-picker-theme" refrescarCatalogoAlAbrir />;
}
