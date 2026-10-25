import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, Search, X, Phone, MessageCircle, Loader } from 'lucide-react';
import { ReporteClientes } from '../courier/analytics/reports/ReporteClientes';
import { clientesService } from '../../services/clientesService';
import { numeroPedidoVisible } from '../../lib/pedidoNumero';
import { formatGs } from '../../lib/courier';
import '../courier/courier.css';
import '../courier/CentroInteligenciaComercial.css';
import '../courier/analytics/analytics.css';
import './clientes.css';

const CALIFICACION = {
  recurrente: 'Recurrente',
  bueno: 'Bueno',
  problematico: 'Problemático',
  sin_entregas: 'Sin entregas aún',
};

// Mismo criterio que la clave del reporte (+595): un 09… local se lleva a
// formato internacional para que wa.me abra el chat correcto.
export function telefonoWhatsapp(telefono) {
  const d = String(telefono || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('595')) return d;
  if (d.startsWith('0')) return `595${d.slice(1)}`;
  return d.length <= 9 ? `595${d}` : d;
}

const fechaCorta = (f) => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '—');

function FichaCliente({ cliente, onCerrar }) {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const cerrarRef = useRef(null);

  useEffect(() => {
    let vigente = true;
    setPedidos(null);
    setError('');
    clientesService.pedidos(cliente.cliente_key)
      .then(r => { if (vigente) setPedidos(r.pedidos || []); })
      .catch(() => { if (vigente) setError('No se pudieron cargar los pedidos de este cliente.'); });
    return () => { vigente = false; };
  }, [cliente.cliente_key]);

  useEffect(() => {
    cerrarRef.current?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const wa = telefonoWhatsapp(cliente.telefono);

  return (
    <div className="cli-ficha-fondo" onClick={onCerrar}>
      <aside className="cli-ficha" role="dialog" aria-modal="true" aria-label={`Ficha de ${cliente.nombre}`} onClick={e => e.stopPropagation()}>
        <header className="cli-ficha-cabecera">
          <div className="min-w-0">
            <h2>{cliente.nombre}</h2>
            <p>{cliente.telefono} · {CALIFICACION[cliente.calificacion] || 'Sin calificación'}</p>
          </div>
          <button ref={cerrarRef} type="button" className="cli-ficha-cerrar" onClick={onCerrar} aria-label="Cerrar ficha">
            <X size={20} />
          </button>
        </header>

        {wa && (
          <div className="cli-ficha-acciones">
            <a className="btn-primary" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> Escribir por WhatsApp
            </a>
            <a className="btn-secondary" href={`tel:+${wa}`}>
              <Phone size={16} /> Llamar
            </a>
          </div>
        )}

        <dl className="cli-ficha-resumen">
          <div><dt>Pedidos</dt><dd>{cliente.pedidos_totales}</dd></div>
          <div><dt>Recibidos</dt><dd>{cliente.entregados}</dd></div>
          <div><dt>Total comprado</dt><dd>{formatGs(cliente.total_comprado)}</dd></div>
          <div><dt>Ticket promedio</dt><dd>{formatGs(cliente.ticket_promedio || 0)}</dd></div>
        </dl>

        <section className="cli-ficha-pedidos" aria-labelledby="cli-ficha-pedidos-titulo">
          <h3 id="cli-ficha-pedidos-titulo">Pedidos</h3>
          {error ? (
            <p role="alert" className="cli-ficha-vacio">{error}</p>
          ) : pedidos === null ? (
            <p className="cli-ficha-vacio"><Loader size={16} className="animate-spin" /> Cargando pedidos…</p>
          ) : pedidos.length === 0 ? (
            <p className="cli-ficha-vacio">Este cliente no tiene pedidos para mostrar.</p>
          ) : (
            <ul>
              {pedidos.map(p => {
                const items = (p.items || []).map(i => `${i.cantidad}× ${i.nombre_producto}`).join(', ');
                return (
                  <li key={p.id}>
                    <div className="cli-pedido-fila">
                      <strong>{numeroPedidoVisible(p)}</strong>
                      <span className="cli-pedido-estado">{p.estado}</span>
                    </div>
                    <div className="cli-pedido-fila cli-pedido-detalle">
                      <span>{fechaCorta(p.fecha)}{p.ciudad ? ` · ${p.ciudad}` : ''}</span>
                      <span className="cli-pedido-total">{formatGs(p.monto)}</span>
                    </div>
                    <p className="cli-pedido-items">{items || 'Sin productos cargados'}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

export default function Clientes() {
  const [texto, setTexto] = useState('');
  const [buscador, setBuscador] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  // Estable: la ficha registra Escape y enfoca "Cerrar" al montarse.
  const cerrarFicha = useCallback(() => setSeleccionado(null), []);

  // La búsqueda la resuelve el backend (nombre o teléfono): se espera a que
  // el comercio deje de tipear para no pedir una página por tecla.
  useEffect(() => {
    const t = setTimeout(() => setBuscador(texto.trim()), 350);
    return () => clearTimeout(t);
  }, [texto]);

  // Sin fechas: el reporte toma toda la historia de la tienda.
  const filtros = useMemo(() => (buscador ? { buscador } : {}), [buscador]);

  return (
    <div className="prod-page courier-page cli-page" style={{ minHeight: '100vh', maxWidth: '100%' }}>
      <div className="courier-header">
        <div className="courier-header-main">
          <div className="prod-header-left">
            <div className="prod-icon-wrap" style={{ background: 'var(--vit-accent-soft)', color: 'var(--color-primary-text)' }}>
              <Users size={22} />
            </div>
            <div>
              <h1 className="prod-title">Clientes</h1>
              <p className="prod-subtitle">Todos los que te compraron, cómo les fue con sus pedidos y cómo contactarlos.</p>
            </div>
          </div>
        </div>
      </div>

      <label className="cli-buscador">
        <span className="sr-only">Buscar cliente</span>
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          aria-label="Buscar cliente por nombre o teléfono"
        />
      </label>

      <ReporteClientes filters={filtros} modo="historial" onAbrirCliente={setSeleccionado} />

      {seleccionado && <FichaCliente cliente={seleccionado} onCerrar={cerrarFicha} />}
    </div>
  );
}
