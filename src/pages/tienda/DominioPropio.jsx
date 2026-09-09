import React, { useState, useEffect, useCallback } from 'react';
import { Check, Trash2, Loader, AlertCircle, ExternalLink, Clock, PowerOff } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';

/**
 * Conectar un dominio propio. Todo el flujo es:
 *
 *   1. el cliente escribe su dominio
 *   2. carga UN registro A en su proveedor de DNS
 *   3. aprieta "Verificar dominio"
 *
 * Los registros a crear los arma el backend (src/utils/dominios.js) y acá
 * solo se renderizan: qué hay que cargar depende de la forma del dominio y
 * de la IP del servidor, y no tiene sentido tener esa lógica duplicada.
 *
 * Estados que devuelve el backend:
 *   pendiente      el DNS todavía no apunta a nuestro servidor
 *   verificado     ya apunta; la tienda responde, falta que se emita el certificado
 *   activo         además ya sirve por HTTPS
 *   deshabilitado  apagado a propósito, sin perder el dominio
 */
function FilaRegistro({ etiqueta, valor }) {
  return <div className="dp-txt-row"><span>{etiqueta}</span><code>{valor}</code></div>;
}

export default function DominioPropio({ tienda, onActualizado }) {
  const [dominio, setDominio] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState(null);
  const [proveedorInfo, setProveedorInfo] = useState(null);

  const cargarEstado = useCallback(async () => {
    if (!tienda?.dominio_propio) {
      setEstado(null);
      setProveedorInfo(null);
      return;
    }
    try {
      setEstado(await tiendaService.estadoDominioPropio());
    } catch (err) {}
    try {
      const info = await tiendaService.consultarWhois(tienda.dominio_propio);
      setProveedorInfo(info?.proveedor || null);
    } catch (err) {}
  }, [tienda?.dominio_propio]);

  useEffect(() => { cargarEstado(); }, [cargarEstado]);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      setEstado(await tiendaService.guardarDominioPropio(dominio.trim()));
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

  async function cambiarHabilitacion(habilitado) {
    setError(null);
    try {
      setEstado(await tiendaService.habilitarDominioPropio(habilitado));
      onActualizado();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar el estado del dominio.');
    }
  }

  async function eliminar() {
    if (!window.confirm('¿Quitar este dominio propio? Tu tienda va a seguir funcionando por el subdominio de gesicomm.com.')) return;
    try {
      await tiendaService.eliminarDominioPropio();
      setEstado(null);
      onActualizado();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el dominio.');
    }
  }

  // ── Sin dominio cargado ────────────────────────────────────────────────
  if (!tienda?.dominio_propio) {
    return (
      <div className="dp-form">
        <label>Tu dominio
          <input value={dominio} onChange={e => setDominio(e.target.value)} placeholder="mitienda.com" />
        </label>
        <button type="button" onClick={guardar} className="land-btn-primary" disabled={guardando || !dominio.trim()}>
          {guardando ? <><Loader size={14} className="spin-icon" /> Conectando...</> : 'Conectar dominio'}
        </button>
        {error && <div className="land-alert-error"><AlertCircle size={14} /> {error}</div>}
      </div>
    );
  }

  const url = estado?.url || `https://${tienda.dominio_propio}`;

  // ── Apagado a propósito ────────────────────────────────────────────────
  if (estado?.estado === 'deshabilitado') {
    return (
      <div className="dp-conectado">
        <p className="dp-esperando">
          <PowerOff size={16} /> <strong>{tienda.dominio_propio}</strong> está desactivado.
          Sigue guardado, pero la tienda no se sirve por esa dirección.
        </p>
        <div className="dp-actions">
          <button type="button" className="land-btn-primary" onClick={() => cambiarHabilitacion(true)}>
            Reactivar dominio
          </button>
          <button type="button" className="btn-secondary" onClick={eliminar}>Quitar dominio</button>
        </div>
        {error && <div className="land-alert-error"><AlertCircle size={14} /> {error}</div>}
      </div>
    );
  }

  // ── Conectado ──────────────────────────────────────────────────────────
  if (estado?.estado === 'activo' || estado?.estado === 'verificado') {
    const conCertificado = estado.estado === 'activo';
    return (
      <div className="dp-conectado">
        <p className="dp-ok"><Check size={16} /> Dominio conectado</p>
        {conCertificado ? (
          <p className="dp-ok"><Check size={16} /> HTTPS activo</p>
        ) : (
          <p className="dp-esperando">
            <Clock size={16} /> El certificado HTTPS se emite en la primera visita.
            Entrá una vez a tu tienda y queda listo.
          </p>
        )}
        <a className="dp-url" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        <div className="dp-actions">
          <a className="land-btn-primary" href={url} target="_blank" rel="noopener noreferrer">
            Visitar tienda <ExternalLink size={14} />
          </a>
          <button type="button" className="btn-secondary" onClick={() => cambiarHabilitacion(false)}>
            Desactivar
          </button>
          <button type="button" className="btn-secondary" onClick={eliminar}>Quitar dominio</button>
        </div>
        {error && <div className="land-alert-error"><AlertCircle size={14} /> {error}</div>}
      </div>
    );
  }

  // ── Pendiente: falta que cargue el DNS ─────────────────────────────────
  const registros = estado?.registros || [];

  return (
    <div className="dp-pending">
      <p>Configuraste <strong>{tienda.dominio_propio}</strong>, pero todavía no está verificado.</p>

      <div className="dp-instrucciones">
        <h4>
          {proveedorInfo
            ? `Creá este registro en ${proveedorInfo.nombre}`
            : 'Creá este registro en tu proveedor de DNS'}
        </h4>

        <p className="dp-intro">
          {proveedorInfo?.fuente === 'ns' ? (
            <>El DNS de <strong>{tienda.dominio_propio}</strong> lo administra <strong>{proveedorInfo.nombre}</strong>: el registro va creado ahí.</>
          ) : proveedorInfo ? (
            <>Tu dominio figura comprado en <strong>{proveedorInfo.nombre}</strong>. Si moviste el DNS a otro servicio, creá el registro en ese otro panel.</>
          ) : (
            <>Entrá al panel donde se administra el DNS de tu dominio (normalmente la empresa donde lo compraste: GoDaddy, Hostinger, Namecheap, Cloudflare…).</>
          )}
          {' '}Buscá la sección <strong>DNS</strong> y usá <strong>Agregar registro</strong>.
        </p>

        {proveedorInfo?.url_login && (
          <a href={proveedorInfo.url_login} target="_blank" rel="noopener noreferrer" className="btn-secondary dp-link-panel">
            Abrir panel de {proveedorInfo.nombre} <ExternalLink size={14} />
          </a>
        )}

        {registros.map((registro, i) => (
          <div className="dp-txt-box" key={i}>
            {!registro.obligatorio && (
              <p className="dp-paso">Opcional — para que también funcione con www</p>
            )}
            <FilaRegistro etiqueta="Tipo" valor={registro.tipo} />
            <FilaRegistro etiqueta="Nombre" valor={registro.nombre} />
            <FilaRegistro etiqueta="Valor" valor={registro.valor} />
            {registro.nombre === '@' && (
              <p className="dp-nota">
                «@» significa la raíz del dominio. Según el proveedor, la casilla puede pedirse
                vacía o con el dominio completo.
              </p>
            )}
          </div>
        ))}

        <p className="dp-nota">
          No hay nada más que configurar: el certificado HTTPS lo emitimos nosotros
          automáticamente.
        </p>

        {proveedorInfo?.instrucciones && (
          <div className="dp-tip">
            <strong>💡 Tip para {proveedorInfo.nombre}:</strong>
            {proveedorInfo.instrucciones}
          </div>
        )}
      </div>

      <div className="dp-actions">
        <button type="button" className="land-btn-primary" onClick={verificar} disabled={verificando}>
          {verificando ? <><Loader size={14} className="spin-icon" /> Verificando...</> : 'Verificar dominio'}
        </button>
        <button type="button" className="btn-secondary" onClick={eliminar}>Quitar dominio</button>
      </div>

      {estado?.detalle && <p className="dp-hint">{estado.detalle}</p>}
      {error && <div className="land-alert-error"><AlertCircle size={14} /> {error}</div>}
    </div>
  );
}
