import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader, Globe, Star, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { pageBuilderService, mensajeDeError } from '../../services/pageBuilderService';

/**
 * Dónde se publica una página o un funnel.
 *
 *   calcula.gesicomm.com   subdominio de la plataforma
 *   loquesea.com.py        dominio propio del usuario
 *
 * La diferencia práctica está en el certificado: un subdominio de la
 * plataforma queda publicable en el momento (ya hay DNS y certificado
 * wildcard), y un dominio propio necesita que el usuario cargue un TXT en
 * su DNS y espere a que se emita el certificado.
 *
 * Un target puede tener los dos apuntando al mismo lado; la estrella
 * marca cuál es la dirección canónica (la que se usa al compartir).
 */

const INPUT = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-fg outline-none focus:border-primary';

export default function HostnamesModal({ target, onCerrar }) {
  // target: { pagina_id } o { funnel_id }, + nombre para el encabezado
  const [hostnames, setHostnames] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const [subdominio, setSubdominio] = useState('');
  const [dominio, setDominio] = useState('');

  const filtro = target.pagina_id
    ? { pagina_id: target.pagina_id }
    : { funnel_id: target.funnel_id };

  const cargar = useCallback(async () => {
    try {
      setHostnames(await pageBuilderService.listarHostnames(filtro));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar las direcciones.'));
    } finally {
      setCargando(false);
    }
  }, [target.pagina_id, target.funnel_id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function accion(fn, mensajeError) {
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      const res = await fn();
      if (res?.aviso) setAviso(res.aviso);
      await cargar();
      return true;
    } catch (err) {
      setError(mensajeDeError(err, mensajeError));
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function agregarSubdominio(e) {
    e.preventDefault();
    const ok = await accion(
      () => pageBuilderService.crearSubdominio({ ...filtro, subdominio: subdominio.trim() }),
      'No se pudo asignar el subdominio.',
    );
    if (ok) setSubdominio('');
  }

  async function agregarDominio(e) {
    e.preventDefault();
    const ok = await accion(
      () => pageBuilderService.crearDominioPropio({ ...filtro, dominio: dominio.trim() }),
      'No se pudo agregar el dominio.',
    );
    if (ok) setDominio('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Direcciones"
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Globe size={16} /> Dirección de «{target.nombre}»
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-fg-muted hover:text-fg">
            <X size={18} />
          </button>
        </div>

        {error && <p className="border-b border-border px-5 py-2 text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        {aviso && <p className="border-b border-border px-5 py-2 text-xs" style={{ color: 'var(--color-warning)' }}>{aviso}</p>}

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {cargando ? (
            <div className="flex justify-center py-8"><Loader className="animate-spin text-fg-muted" /></div>
          ) : hostnames.length === 0 ? (
            <p className="text-xs text-fg-muted">
              Todavía no tiene dirección propia. Mientras tanto se puede ver por su ruta
              interna; asignale un subdominio para compartirla.
            </p>
          ) : (
            <ul className="space-y-2">
              {hostnames.map((h) => (
                <li key={h.id} className="rounded-lg border border-border bg-canvas p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {h.es_principal && (
                      <Star size={13} style={{ color: 'var(--color-accent)' }} aria-label="Dirección principal" />
                    )}
                    <a
                      href={h.url} target="_blank" rel="noreferrer"
                      className="mr-auto truncate font-mono text-sm text-fg hover:underline"
                    >
                      {h.hostname}
                    </a>
                    <span
                      className="text-[11px]"
                      style={{ color: h.activo ? 'var(--color-success)' : 'var(--color-warning)' }}
                    >
                      {h.activo ? 'Activa' : 'Pendiente'}
                    </span>
                  </div>

                  {!h.activo && h.verificacion_dns?.valor && (
                    <div className="mt-2 rounded bg-surface-2 p-2 text-[11px] text-fg-muted">
                      <p className="mb-1 font-medium text-fg">
                        Cargá este registro en el DNS de tu dominio:
                      </p>
                      <p className="font-mono break-all">TXT {h.verificacion_dns.nombre}</p>
                      <p className="font-mono break-all">{h.verificacion_dns.valor}</p>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {h.tipo === 'dominio_propio' && (
                      <button
                        type="button" className="btn-ghost" disabled={ocupado}
                        onClick={() => accion(() => pageBuilderService.verificarHostname(h.id), 'No se pudo verificar.')}
                      >
                        <RefreshCw size={13} /> Verificar
                      </button>
                    )}
                    {!h.es_principal && (
                      <button
                        type="button" className="btn-ghost" disabled={ocupado}
                        onClick={() => accion(() => pageBuilderService.definirHostnamePrincipal(h.id), 'No se pudo cambiar.')}
                      >
                        <Star size={13} /> Usar como principal
                      </button>
                    )}
                    <a href={h.url} target="_blank" rel="noreferrer" className="btn-ghost">
                      <ExternalLink size={13} /> Abrir
                    </a>
                    <button
                      type="button" className="btn-ghost" disabled={ocupado}
                      onClick={() => {
                        if (window.confirm(`Se va a quitar ${h.hostname}. La página deja de responder ahí.`)) {
                          accion(() => pageBuilderService.eliminarHostname(h.id), 'No se pudo quitar.');
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={agregarSubdominio} className="space-y-2 border-t border-border pt-4">
            <label className="block text-xs font-medium text-fg">Subdominio de Gesicomm</label>
            <div className="flex items-center gap-2">
              <input
                className={`${INPUT} font-mono`}
                value={subdominio}
                onChange={(e) => setSubdominio(e.target.value.toLowerCase())}
                placeholder="calcula"
                spellCheck={false}
              />
              <span className="shrink-0 font-mono text-sm text-fg-muted">.gesicomm.com</span>
              <button type="submit" className="btn-secondary shrink-0" disabled={ocupado || !subdominio.trim()}>
                Asignar
              </button>
            </div>
            <p className="text-[11px] text-fg-subtle">Queda disponible en el momento.</p>
          </form>

          <form onSubmit={agregarDominio} className="space-y-2 border-t border-border pt-4">
            <label className="block text-xs font-medium text-fg">Dominio propio</label>
            <div className="flex items-center gap-2">
              <input
                className={`${INPUT} font-mono`}
                value={dominio}
                onChange={(e) => setDominio(e.target.value.toLowerCase())}
                placeholder="mipagina.com.py"
                spellCheck={false}
              />
              <button type="submit" className="btn-secondary shrink-0" disabled={ocupado || !dominio.trim()}>
                Agregar
              </button>
            </div>
            <p className="text-[11px] text-fg-subtle">
              Solo el dominio, sin https:// ni barras. Después hay que cargar un registro TXT
              en su DNS para verificarlo.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
