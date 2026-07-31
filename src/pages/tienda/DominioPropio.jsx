import React, { useState, useEffect } from 'react';
import { Check, Trash2, Loader, AlertCircle } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';

export default function DominioPropio({ tienda, onActualizado }) {
  const [dominio, setDominio] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(null);
  const [registroTxt, setRegistroTxt] = useState(null);
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    if (tienda?.dominio_propio && !tienda.dominio_propio_verificado) {
      tiendaService.estadoDominioPropio().then(setEstado).catch(() => {});
    } else {
      setEstado(null);
    }
  }, [tienda?.dominio_propio, tienda?.dominio_propio_verificado]);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const resultado = await tiendaService.guardarDominioPropio(dominio.trim());
      setRegistroTxt(resultado.registro_txt);
      setDominio('');
      onActualizado();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el dominio.');
    } finally {
      setGuardando(false);
    }
  }

  async function verificar() {
    setVerificando(true);
    setError(null);
    try {
      const resultado = await tiendaService.estadoDominioPropio();
      setEstado(resultado);
      if (resultado.verificado) onActualizado();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al verificar.');
    } finally {
      setVerificando(false);
    }
  }

  async function eliminar() {
    if (!window.confirm('¿Quitar este dominio propio? Tu tienda va a seguir funcionando por el subdominio de gesicomm.com.')) return;
    try {
      await tiendaService.eliminarDominioPropio();
      setRegistroTxt(null);
      setEstado(null);
      onActualizado();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el dominio.');
    }
  }

  const txt = registroTxt || estado?.registro_txt;

  if (tienda?.dominio_propio_verificado) {
    return (
      <div className="dp-verified">
        <Check size={16} color="#10b981" />
        <span><strong>{tienda.dominio_propio}</strong> está verificado y activo.</span>
        <button className="btn-icon danger" onClick={eliminar} title="Quitar dominio"><Trash2 size={14} /></button>
      </div>
    );
  }

  if (tienda?.dominio_propio) {
    return (
      <div className="dp-pending">
        <p>Configuraste <strong>{tienda.dominio_propio}</strong>, pero todavía no está verificado.</p>
        {txt && (
          <div className="dp-txt-box">
            <p>Agregá este registro TXT en el DNS de tu dominio:</p>
            <div className="dp-txt-row"><span>Nombre</span><code>{txt.name}</code></div>
            <div className="dp-txt-row"><span>Valor</span><code>{txt.value}</code></div>
          </div>
        )}
        <div className="dp-actions">
          <button type="button" className="land-btn-primary" onClick={verificar} disabled={verificando}>
            {verificando ? <><Loader size={14} className="spin-icon" /> Verificando...</> : 'Verificar'}
          </button>
          <button type="button" className="btn-secondary" onClick={eliminar}>Quitar dominio</button>
        </div>
        {estado && !estado.verificado && (
          <p className="dp-hint">Estado actual en Cloudflare: {estado.estado_cloudflare || 'pendiente'}. La propagación del DNS puede tardar minutos u horas.</p>
        )}
        {error && <div className="land-alert-error"><AlertCircle size={14} /> {error}</div>}
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className="dp-form">
      <label>Tu dominio
        <input value={dominio} onChange={e => setDominio(e.target.value)} placeholder="mitienda.com" />
      </label>
      <button type="submit" className="land-btn-primary" disabled={guardando || !dominio.trim()}>
        {guardando ? <><Loader size={14} className="spin-icon" /> Conectando...</> : 'Conectar dominio'}
      </button>
      {error && <div className="land-alert-error"><AlertCircle size={14} /> {error}</div>}
    </form>
  );
}
