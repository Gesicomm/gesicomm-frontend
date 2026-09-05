import React, { useState, useEffect } from 'react';
import { Check, Trash2, Loader, AlertCircle, ExternalLink } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';

export default function DominioPropio({ tienda, onActualizado }) {
  const [dominio, setDominio] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(null);
  const [registroTxt, setRegistroTxt] = useState(null);
  const [estado, setEstado] = useState(null);
  const [proveedorInfo, setProveedorInfo] = useState(null);

  useEffect(() => {
    if (tienda?.dominio_propio && !tienda.dominio_propio_verificado) {
      tiendaService.estadoDominioPropio().then(setEstado).catch(() => {});
      tiendaService.consultarWhois(tienda.dominio_propio).then(res => setProveedorInfo(res.proveedor)).catch(() => {});
    } else {
      setEstado(null);
      setProveedorInfo(null);
    }
  }, [tienda?.dominio_propio, tienda?.dominio_propio_verificado]);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const resultado = await tiendaService.guardarDominioPropio(dominio.trim());
      setRegistroTxt(resultado.registro_txt);
      
      // Consultar WHOIS para mostrar las instrucciones personalizadas enseguida
      try {
        const whoisInfo = await tiendaService.consultarWhois(dominio.trim());
        if (whoisInfo?.proveedor) setProveedorInfo(whoisInfo.proveedor);
      } catch (err) {}
      
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

  const getCnameName = (domain) => {
    if (!domain) return '@';
    if (domain.startsWith('www.')) return 'www';
    const parts = domain.split('.');
    // Manejo básico para subdominios (ej: gesi.cogymtraining.com -> gesi)
    // Ignora .com.ar o similares para no romper el cálculo
    if (parts.length >= 3 && !domain.endsWith('.com.ar') && !domain.endsWith('.com.mx')) {
      return parts.slice(0, parts.length - 2).join('.');
    }
    return '@ (o dejar en blanco)';
  };
  const cnameName = getCnameName(tienda?.dominio_propio);

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
        {proveedorInfo ? (
          <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-fg)' }}>¿Cómo terminar de conectar tu dominio en {proveedorInfo.nombre}?</h4>
            
            <div style={{ fontSize: '0.875rem', color: 'var(--color-fg-subtle)', marginBottom: '1rem', lineHeight: '1.5' }}>
              Para que tu dominio funcione, debes entrar a tu cuenta de <strong>{proveedorInfo.nombre}</strong> (la empresa donde compraste el dominio).
              <br/><br/>
              Una vez dentro, busca el menú llamado <strong>"DNS"</strong>, <strong>"Zonas DNS"</strong> o <strong>"Administrar DNS"</strong>. Allí verás un botón que dice <strong>"Agregar registro"</strong> o <strong>"Añadir nuevo"</strong>. Úsalo para crear estos dos bloques de información copiando y pegando los textos de aquí abajo:
            </div>
            
            {proveedorInfo.url_login && (
              <a href={proveedorInfo.url_login} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-flex', marginBottom: '1rem' }}>
                Abrir panel de {proveedorInfo.nombre} <ExternalLink size={14} style={{ marginLeft: '0.5rem' }}/>
              </a>
            )}

            <div className="dp-txt-box" style={{ marginTop: 0, marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>Paso 1: Que las visitas lleguen a tu tienda</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-fg-subtle)', marginBottom: '0.75rem', marginTop: 0 }}>En tu proveedor, dale a "Agregar registro". En "Tipo" selecciona la opción <strong>CNAME</strong>, y luego pega esto:</p>
              <div className="dp-txt-row"><span>Tipo</span><code>CNAME</code></div>
              <div className="dp-txt-row"><span>Nombre</span><code>{cnameName}</code></div>
              <div className="dp-txt-row"><span>Valor</span><code>cname.gesicomm.com</code></div>
            </div>
            
            {txt && (
              <div className="dp-txt-box" style={{ marginTop: 0 }}>
                <p style={{ fontWeight: 600, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>Paso 2: Activar el candadito verde de seguridad</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-fg-subtle)', marginBottom: '0.75rem', marginTop: 0 }}>Vuelve a darle a "Agregar registro" en tu proveedor. Esta vez en "Tipo" selecciona la opción <strong>TXT</strong> y pega esto:</p>
                <div className="dp-txt-row"><span>Tipo</span><code>TXT</code></div>
                <div className="dp-txt-row"><span>Nombre</span><code>{txt.name}</code></div>
                <div className="dp-txt-row"><span>Valor</span><code>{txt.value}</code></div>
              </div>
            )}

            {proveedorInfo.instrucciones && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-subtle)', marginTop: '1rem', whiteSpace: 'pre-line', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
                <strong style={{display: 'block', marginBottom: '0.25rem'}}>💡 Tip para {proveedorInfo.nombre}:</strong>
                {proveedorInfo.instrucciones}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-fg)' }}>¿Cómo terminar de conectar tu dominio?</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-fg-subtle)', marginBottom: '1rem', lineHeight: '1.5' }}>
              Para que tu dominio funcione, debes entrar a la página web de la empresa donde lo compraste (por ejemplo: GoDaddy, Hostinger, Namecheap).
              <br/><br/>
              Una vez dentro de tu cuenta en esa página, busca el menú llamado <strong>"DNS"</strong>, <strong>"Zonas DNS"</strong> o <strong>"Administrar DNS"</strong>. Allí verás un botón que dice <strong>"Agregar registro"</strong> o <strong>"Añadir nuevo"</strong>. Úsalo para crear estos dos bloques de información copiando y pegando los textos de aquí abajo:
            </div>

            <div className="dp-txt-box" style={{ marginTop: 0, marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>Paso 1: Que las visitas lleguen a tu tienda</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-fg-subtle)', marginBottom: '0.75rem', marginTop: 0 }}>En tu proveedor, dale a "Agregar registro". En "Tipo" selecciona la opción <strong>CNAME</strong>, y luego pega esto:</p>
              <div className="dp-txt-row"><span>Tipo</span><code>CNAME</code></div>
              <div className="dp-txt-row"><span>Nombre</span><code>{cnameName}</code></div>
              <div className="dp-txt-row"><span>Valor</span><code>cname.gesicomm.com</code></div>
            </div>

            {txt && (
              <div className="dp-txt-box" style={{ marginTop: 0 }}>
                <p style={{ fontWeight: 600, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>Paso 2: Activar el candadito verde de seguridad</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-fg-subtle)', marginBottom: '0.75rem', marginTop: 0 }}>Vuelve a darle a "Agregar registro" en tu proveedor. Esta vez en "Tipo" selecciona la opción <strong>TXT</strong> y pega esto:</p>
                <div className="dp-txt-row"><span>Tipo</span><code>TXT</code></div>
                <div className="dp-txt-row"><span>Nombre</span><code>{txt.name}</code></div>
                <div className="dp-txt-row"><span>Valor</span><code>{txt.value}</code></div>
              </div>
            )}
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
