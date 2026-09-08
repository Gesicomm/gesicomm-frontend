import React, { useState, useEffect } from 'react';
import { Check, Trash2, Loader, AlertCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';

/**
 * Sufijos públicos de dos niveles. Sin esta lista, "mitienda.com.py" —el
 * caso más común acá— se calculaba como el subdominio "mitienda" de la
 * zona "com.py", y el usuario terminaba creando el registro con el nombre
 * equivocado. La lista cubre la región y los internacionales que más
 * aparecen; cualquier otro cae en el caso de un solo nivel (.com, .net,
 * .shop, .store), que es el correcto por defecto.
 */
const SUFIJOS_COMPUESTOS = [
  'com.py', 'net.py', 'org.py', 'edu.py',
  'com.ar', 'com.br', 'com.uy', 'com.bo', 'com.co', 'com.mx', 'com.pe', 'com.cl', 'com.ve',
  'com.es', 'co.uk', 'org.uk', 'com.au', 'co.nz',
];

/**
 * Qué va en la casilla "Nombre" (o "Host") del registro DNS.
 *
 * Devuelve '@' cuando el dominio es la raíz — y eso importa: un CNAME en
 * la raíz de la zona está prohibido por el estándar de DNS, así que la
 * mayoría de los proveedores directamente no deja crearlo. Ver el aviso
 * de más abajo.
 */
export function nombreDelRegistro(dominio) {
  if (!dominio) return '@';
  const partes = dominio.split('.');
  const compuesto = SUFIJOS_COMPUESTOS.find(s => dominio.endsWith(`.${s}`));
  const largoSufijo = compuesto ? compuesto.split('.').length : 1;
  return partes.slice(0, partes.length - largoSufijo - 1).join('.') || '@';
}

function FilaRegistro({ etiqueta, valor }) {
  return <div className="dp-txt-row"><span>{etiqueta}</span><code>{valor}</code></div>;
}

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

      // Consultar el proveedor de DNS para mostrar las instrucciones personalizadas enseguida
      try {
        const info = await tiendaService.consultarWhois(dominio.trim());
        if (info?.proveedor) setProveedorInfo(info.proveedor);
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
    const txt = registroTxt || estado?.registro_txt;
    const dcvDelegation = estado?.dcv_delegation || null;
    const nombreCname = nombreDelRegistro(tienda.dominio_propio);
    const esRaiz = nombreCname === '@';
    // Los registros que apuntan a Cloudflare tienen que quedar en "DNS only":
    // si el usuario los deja con la nube naranja, el tráfico entra dos veces a
    // Cloudflare y la conexión falla o queda en un 502 intermitente.
    const enCloudflare = !!dcvDelegation || proveedorInfo?.nombre === 'Cloudflare';

    return (
      <div className="dp-pending">
        <p>Configuraste <strong>{tienda.dominio_propio}</strong>, pero todavía no está verificado.</p>

        <div className="dp-instrucciones">
          <h4>
            {proveedorInfo
              ? `Terminá de conectar tu dominio en ${proveedorInfo.nombre}`
              : 'Terminá de conectar tu dominio'}
          </h4>

          <p className="dp-intro">
            {proveedorInfo?.fuente === 'ns' ? (
              <>El DNS de <strong>{tienda.dominio_propio}</strong> lo administra <strong>{proveedorInfo.nombre}</strong>: los registros van creados ahí.</>
            ) : proveedorInfo ? (
              <>Tu dominio figura comprado en <strong>{proveedorInfo.nombre}</strong>. Si moviste el DNS a otro servicio, creá los registros en ese otro panel.</>
            ) : (
              <>Entrá al panel donde se administra el DNS de tu dominio (normalmente la empresa donde lo compraste: GoDaddy, Hostinger, Namecheap, Cloudflare…).</>
            )}
            {' '}Buscá la sección <strong>DNS</strong> (o «Zonas DNS» / «Administrar DNS») y usá el botón <strong>Agregar registro</strong> para crear estos dos:
          </p>

          {proveedorInfo?.url_login && (
            <a href={proveedorInfo.url_login} target="_blank" rel="noopener noreferrer" className="btn-secondary dp-link-panel">
              Abrir panel de {proveedorInfo.nombre} <ExternalLink size={14} />
            </a>
          )}

          {esRaiz && (
            <div className="dp-aviso">
              <AlertTriangle size={16} />
              <div>
                <strong>Ojo: {tienda.dominio_propio} es un dominio raíz.</strong>
                <p>
                  El estándar de DNS no permite un CNAME en la raíz de un dominio, y la mayoría de los
                  proveedores no te va a dejar crearlo. Dos salidas:
                </p>
                <ul>
                  <li>Usar un subdominio en su lugar (por ejemplo <code>tienda.{tienda.dominio_propio}</code>) — es lo más simple y funciona en todos los proveedores.</li>
                  <li>Si tu DNS está en Cloudflare, sí se puede: Cloudflare aplana el CNAME automáticamente. En otros proveedores buscá si ofrecen un registro <code>ALIAS</code> o <code>ANAME</code> y usalo en lugar de CNAME.</li>
                </ul>
              </div>
            </div>
          )}

          <div className="dp-txt-box">
            <p className="dp-paso">Paso 1: que las visitas lleguen a tu tienda</p>
            <p className="dp-paso-detalle">
              En «Tipo» elegí <strong>CNAME</strong> y pegá esto:
            </p>
            <FilaRegistro etiqueta="Tipo" valor="CNAME" />
            <FilaRegistro etiqueta="Nombre" valor={nombreCname} />
            <FilaRegistro etiqueta="Valor" valor="cname.gesicomm.com" />
            {nombreCname === '@' && (
              <p className="dp-nota">
                «@» significa la raíz del dominio. Según el proveedor, la casilla puede pedirse
                vacía o con el dominio completo.
              </p>
            )}
            {enCloudflare && (
              <p className="dp-nota">
                ⚠️ El «Proxy status» de este registro tiene que quedar en <strong>DNS only</strong> (nube gris, no naranja).
              </p>
            )}
          </div>

          {(txt || dcvDelegation) && (
            <div className="dp-txt-box">
              <p className="dp-paso">Paso 2: activar el candado de seguridad (HTTPS)</p>
              {dcvDelegation ? (
                <>
                  <p className="dp-paso-detalle">
                    Agregá un segundo registro. En «Tipo» elegí <strong>CNAME</strong> y pegá esto tal cual:
                  </p>
                  <FilaRegistro etiqueta="Tipo" valor="CNAME" />
                  <FilaRegistro etiqueta="Nombre" valor={dcvDelegation.cname} />
                  <FilaRegistro etiqueta="Valor" valor={dcvDelegation.cname_target} />
                  <p className="dp-nota">
                    ⚠️ Este también tiene que quedar en <strong>DNS only</strong> (nube gris).
                  </p>
                </>
              ) : (
                <>
                  <p className="dp-paso-detalle">
                    Agregá un segundo registro. En «Tipo» elegí <strong>TXT</strong> y pegá esto tal cual:
                  </p>
                  <FilaRegistro etiqueta="Tipo" valor="TXT" />
                  <FilaRegistro etiqueta="Nombre" valor={txt.name} />
                  <FilaRegistro etiqueta="Valor" valor={txt.value} />
                </>
              )}
            </div>
          )}

          {proveedorInfo?.instrucciones && (
            <div className="dp-tip">
              <strong>💡 Tip para {proveedorInfo.nombre}:</strong>
              {proveedorInfo.instrucciones}
            </div>
          )}
        </div>

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
        <input value={dominio} onChange={e => setDominio(e.target.value)} placeholder="tienda.midominio.com" />
      </label>
      <button type="button" onClick={guardar} className="land-btn-primary" disabled={guardando || !dominio.trim()}>
        {guardando ? <><Loader size={14} className="spin-icon" /> Conectando...</> : 'Conectar dominio'}
      </button>
      {error && <div className="land-alert-error"><AlertCircle size={14} /> {error}</div>}
    </div>
  );
}
