import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader, RotateCcw, Rocket, Eye, History } from 'lucide-react';
import { pageBuilderService, mensajeDeError } from '../../../services/pageBuilderService';
import CodigoPreview from '../../landing-simple/CodigoPreview';

/**
 * Historial de versiones de una página.
 *
 *   v5   Borrador
 *   v4   EN LÍNEA
 *   v3   Archivada
 *
 * Tres acciones, y conviene tener clara la diferencia:
 *
 *   Ver       → la abre en el mismo iframe sandbox, sin tocar nada.
 *   Restaurar → la copia como BORRADOR NUEVO (v6). No revive la vieja ni
 *               reescribe el historial, y no publica.
 *   Publicar  → la pone en línea directamente, salteando el borrador.
 *               Es el botón de "volver atrás rápido" cuando algo salió mal.
 */

function Etiqueta({ estado }) {
  const mapa = {
    published: { texto: 'EN LÍNEA', color: 'var(--color-success)' },
    draft: { texto: 'Borrador', color: 'var(--color-warning)' },
    archived: { texto: 'Archivada', color: 'var(--color-fg-subtle)' },
  };
  const { texto, color } = mapa[estado] || mapa.archived;
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {texto}
    </span>
  );
}

function fecha(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function VersionesPanel({ paginaId, publicadaId, onCerrar, onCambio }) {
  const [versiones, setVersiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ocupada, setOcupada] = useState(null);
  const [viendo, setViendo] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setVersiones(await pageBuilderService.listarVersiones(paginaId));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar las versiones.'));
    } finally {
      setCargando(false);
    }
  }, [paginaId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function ver(version) {
    setOcupada(version.id);
    try {
      setViendo(await pageBuilderService.obtenerVersion(paginaId, version.id));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo abrir la versión.'));
    } finally {
      setOcupada(null);
    }
  }

  async function restaurar(version) {
    if (!window.confirm(`Se va a copiar la v${version.version} como borrador nuevo. No se publica nada todavía.`)) return;
    setOcupada(version.id);
    try {
      await pageBuilderService.restaurarVersion(paginaId, version.id);
      await cargar();
      onCambio?.();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo restaurar.'));
    } finally {
      setOcupada(null);
    }
  }

  async function publicar(version) {
    if (!window.confirm(`La v${version.version} va a pasar a estar en línea. ¿Seguir?`)) return;
    setOcupada(version.id);
    try {
      await pageBuilderService.publicar(paginaId, version.id);
      await cargar();
      onCambio?.();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo publicar.'));
    } finally {
      setOcupada(null);
    }
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
        aria-label="Versiones"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <History size={16} /> Versiones
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-fg-muted hover:text-fg">
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className="border-b border-border px-5 py-2 text-xs" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-fg-muted" />
            </div>
          ) : versiones.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-fg-muted">
              Todavía no guardaste ninguna versión.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {versiones.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="w-10 font-mono text-sm font-semibold text-fg">v{v.version}</span>
                  <Etiqueta estado={v.estado} />

                  <div className="mr-auto min-w-0">
                    <p className="truncate text-xs text-fg-muted">
                      {fecha(v.created_at)}
                      {v.bytes ? ` · ${Math.max(1, Math.round(v.bytes / 1024))} KB` : ''}
                    </p>
                    {v.nota && <p className="truncate text-xs text-fg-subtle">{v.nota}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button" className="btn-ghost" title="Ver"
                      onClick={() => ver(v)} disabled={ocupada === v.id}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button" className="btn-ghost" title="Restaurar como borrador nuevo"
                      onClick={() => restaurar(v)} disabled={ocupada === v.id}
                    >
                      <RotateCcw size={14} />
                    </button>
                    {v.id !== publicadaId && (
                      <button
                        type="button" className="btn-ghost" title="Poner esta versión en línea"
                        onClick={() => publicar(v)} disabled={ocupada === v.id}
                      >
                        <Rocket size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {viendo && (
        <div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: 'rgba(0,0,0,.85)' }}
        >
          <div className="flex items-center justify-between px-4 py-2 text-sm text-white">
            <span>Viendo la v{viendo.version} — no se cambió nada</span>
            <button type="button" onClick={() => setViendo(null)} aria-label="Cerrar vista">
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 bg-white">
            <CodigoPreview codigo={viendo.codigo} titulo={`v${viendo.version}`} />
          </div>
        </div>
      )}
    </div>
  );
}
