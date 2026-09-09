import React, { useState, useEffect, useCallback } from 'react';
import {
  Check, Trash2, Loader, AlertCircle, ExternalLink, Clock, PowerOff, Copy,
} from 'lucide-react';
import { tiendaService } from '../../services/tiendaService';

/**
 * Conectar un dominio propio.
 *
 * Las instrucciones están escritas para alguien que nunca tocó un DNS. El
 * registro en sí es idéntico en todos los proveedores —tipo, nombre y
 * valor— pero cada panel llama distinto a las casillas y esconde el botón
 * en otro lado, así que se nombran los alias de cada campo en vez de asumir
 * el vocabulario de uno solo.
 *
 * Los dos pasos que más rompen en la práctica, y por eso tienen su propio
 * lugar acá: un registro viejo con el mismo nombre que hay que borrar
 * antes, y el proxy naranja de Cloudflare, que hace que el dominio resuelva
 * a las IPs de Cloudflare y la verificación nunca cierre.
 *
 * Los registros a crear los arma el backend (src/utils/dominios.js).
 *
 * Estados que devuelve el backend:
 *   pendiente      el DNS todavía no apunta a nuestro servidor
 *   verificado     ya apunta; la tienda responde, falta que se emita el certificado
 *   activo         además ya sirve por HTTPS
 *   deshabilitado  apagado a propósito, sin perder el dominio
 */

/** Alias con los que cada panel llama a la misma casilla. */
const ALIAS = {
  tipo: 'Type · Record type',
  nombre: 'Host · Name · Nombre del registro · Subdominio',
  valor: 'Value · Content · Points to · Apunta a · IPv4 address · Destino',
};

function CampoCopiable({ etiqueta, valor, alias }) {
  const [copiado, setCopiado] = useState(false);
  // Sin valor no hay nada que copiar: antes el botón escribía el string
  // "undefined" en el portapapeles.
  const vacio = valor === undefined || valor === null || valor === '';

  async function copiar() {
    if (vacio) return;
    try {
      await navigator.clipboard.writeText(valor);
    } catch (err) {
      // Sin permiso de portapapeles (http, navegador viejo): el valor
      // igual está a la vista para seleccionarlo a mano.
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="dp-campo">
      <div className="dp-campo-cab">
        <span className="dp-campo-nombre">{etiqueta}</span>
        {alias && <span className="dp-campo-alias">{alias}</span>}
      </div>
      <div className="dp-campo-valor">
        <code className={vacio ? 'dp-campo-vacio' : undefined}>
          {vacio ? 'no disponible' : valor}
        </code>
        {!vacio && (
          <button type="button" className="dp-copiar" onClick={copiar} title={`Copiar ${etiqueta}`}>
            {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
          </button>
        )}
      </div>
    </div>
  );
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
      setError(null);
    } catch (err) {
      // Tragarse esto dejaba la pantalla dibujada pero vacía, sin ninguna
      // pista de que la consulta había fallado.
      setError(err.response?.data?.message
        || 'No pudimos consultar el estado de tu dominio. Reintentá en unos segundos.');
    }
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
  const principal = registros.find(r => r.obligatorio) || registros[0];
  const opcionales = registros.filter(r => r !== principal);
  const enCloudflare = proveedorInfo?.nombre === 'Cloudflare';
  const nombreRegistro = principal?.nombre;

  return (
    <div className="dp-pending">
      <div className="dp-instrucciones">
        <h4>Falta un paso: apuntar {tienda.dominio_propio} a tu tienda</h4>

        <p className="dp-intro">
          {proveedorInfo?.fuente === 'ns' ? (
            <>El DNS de tu dominio lo administra <strong>{proveedorInfo.nombre}</strong>. Todo esto se hace ahí.</>
          ) : proveedorInfo ? (
            <>Tu dominio figura comprado en <strong>{proveedorInfo.nombre}</strong>, así que probablemente se administre ahí. Si moviste el DNS a otro servicio, hacelo en ese otro panel.</>
          ) : (
            <>Esto se hace en el panel de la empresa donde administrás tu dominio — normalmente donde lo compraste.</>
          )}
        </p>

        {proveedorInfo?.url_login && (
          <a href={proveedorInfo.url_login} target="_blank" rel="noopener noreferrer" className="btn-secondary dp-link-panel">
            Abrir panel de {proveedorInfo.nombre} <ExternalLink size={14} />
          </a>
        )}

        <ol className="dp-pasos">
          <li>
            <strong>Entrá a la sección de DNS.</strong>
            <p>
              Según el proveedor puede llamarse <em>DNS</em>, <em>Zona DNS</em>,
              <em> Administrar DNS</em>, <em>Editor de zona</em> o <em>DNS Records</em>.
              Es la pantalla donde aparece una lista de registros.
            </p>
          </li>

          <li>
            <strong>Fijate si ya existe un registro llamado «{nombreRegistro}».</strong>
            <p>
              Si ves uno (de tipo <code>A</code>, <code>CNAME</code> o <code>AAAA</code>) con ese
              nombre, <strong>borralo antes de seguir</strong>. No pueden convivir dos registros
              con el mismo nombre, y el que quede viejo gana.
            </p>
          </li>

          <li>
            <strong>Creá un registro nuevo</strong> con el botón «Agregar registro», «Add record»
            o «Añadir nuevo», y cargá estos tres datos:
            <div className="dp-registro">
              <CampoCopiable etiqueta="Tipo" valor={principal?.tipo} alias={ALIAS.tipo} />
              <CampoCopiable etiqueta="Nombre" valor={nombreRegistro} alias={ALIAS.nombre} />
              <CampoCopiable etiqueta="Valor" valor={principal?.valor} alias={ALIAS.valor} />
              <div className="dp-campo">
                <div className="dp-campo-cab">
                  <span className="dp-campo-nombre">TTL</span>
                  <span className="dp-campo-alias">Time to live</span>
                </div>
                <div className="dp-campo-valor">
                  <code>Automático</code>
                  <span className="dp-campo-aclaracion">o <code>3600</code> si te obliga a poner un número</span>
                </div>
              </div>
            </div>

            {nombreRegistro === '@' && (
              <p className="dp-nota">
                <strong>«@» significa la raíz del dominio.</strong> Algunos paneles piden
                exactamente <code>@</code>, otros quieren la casilla <strong>vacía</strong> y
                otros el dominio completo (<code>{tienda.dominio_propio}</code>). Las tres formas
                significan lo mismo — usá la que acepte el tuyo.
              </p>
            )}

            {enCloudflare && (
              <p className="dp-nota dp-nota-alerta">
                <AlertCircle size={14} />
                <span>
                  <strong>En Cloudflare, poné el «Proxy status» en DNS only (nube gris).</strong> Si
                  lo dejás en naranja, tu dominio va a resolver a las IPs de Cloudflare en vez de a
                  la nuestra y la verificación no va a cerrar nunca.
                </span>
              </p>
            )}
          </li>

          {opcionales.length > 0 && (
            <li>
              <strong>Opcional: que también funcione con «www».</strong>
              <p>Mismo procedimiento, con estos datos:</p>
              <div className="dp-registro">
                {opcionales.map((r, i) => (
                  <React.Fragment key={i}>
                    <CampoCopiable etiqueta="Tipo" valor={r.tipo} />
                    <CampoCopiable etiqueta="Nombre" valor={r.nombre} />
                    <CampoCopiable etiqueta="Valor" valor={r.valor} />
                  </React.Fragment>
                ))}
              </div>
            </li>
          )}

          <li>
            <strong>Guardá y volvé acá a apretar «Verificar dominio».</strong>
            <p>
              El cambio puede tardar desde unos minutos hasta unas horas en propagarse. Si no
              verifica a la primera, esperá un rato y probá de nuevo.
            </p>
          </li>
        </ol>

        <p className="dp-nota">
          El certificado de seguridad (HTTPS) no lo tenés que configurar: lo emitimos nosotros
          automáticamente apenas el dominio quede verificado.
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

      {/* El detalle explica QUÉ está mal (a dónde apunta hoy), no solo que
          falló: es la diferencia entre reintentar a ciegas y corregir. */}
      {estado?.detalle && (
        <div className="dp-diagnostico">
          <AlertCircle size={14} />
          <span>{estado.detalle}</span>
        </div>
      )}
      {error && <div className="land-alert-error"><AlertCircle size={14} /> {error}</div>}
    </div>
  );
}
