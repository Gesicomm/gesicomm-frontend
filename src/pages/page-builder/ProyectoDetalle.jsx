import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Loader, FileText, GitBranch, Globe, Pencil, Trash2,
} from 'lucide-react';
import { pageBuilderService, mensajeDeError } from '../../services/pageBuilderService';
import EstadoBadge from './EstadoBadge';
import HostnamesModal from './HostnamesModal';

/**
 * Un proyecto por dentro: sus páginas sueltas y sus funnels.
 *
 *   Páginas sueltas  → cada una se publica en su propia dirección.
 *   Funnels          → una dirección para todo el funnel; cada paso
 *                      cuelga de su slug.
 *
 * Por eso el botón de "dirección" está en la página cuando es suelta, y
 * en el funnel cuando es un funnel: una página que es paso de un funnel
 * no tiene dirección propia.
 */
export default function ProyectoDetalle() {
  const { proyectoId } = useParams();
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [hostnameTarget, setHostnameTarget] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setProyecto(await pageBuilderService.obtenerProyecto(proyectoId));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cargar el proyecto.'));
    } finally {
      setCargando(false);
    }
  }, [proyectoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearPagina() {
    const nombre = window.prompt('Nombre de la página nueva:');
    if (!nombre?.trim()) return;
    setOcupado(true);
    try {
      const p = await pageBuilderService.crearPagina(proyectoId, { nombre: nombre.trim() });
      navigate(`/page-builder/paginas/${p.id}`);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear la página.'));
      setOcupado(false);
    }
  }

  async function crearFunnel() {
    const nombre = window.prompt('Nombre del funnel nuevo:');
    if (!nombre?.trim()) return;
    setOcupado(true);
    try {
      const f = await pageBuilderService.crearFunnel(proyectoId, { nombre: nombre.trim() });
      navigate(`/page-builder/funnels/${f.id}`);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear el funnel.'));
      setOcupado(false);
    }
  }

  async function eliminarPagina(pagina) {
    if (!window.confirm(`Se va a borrar «${pagina.nombre}» y todas sus versiones. ¿Seguir?`)) return;
    setOcupado(true);
    try {
      await pageBuilderService.eliminarPagina(pagina.id);
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo borrar la página.'));
    } finally {
      setOcupado(false);
    }
  }

  if (cargando) {
    return <div className="flex justify-center py-20"><Loader className="animate-spin text-fg-muted" /></div>;
  }

  if (!proyecto) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-fg">{error || 'Proyecto no encontrado.'}</p>
        <Link to="/page-builder" className="btn-secondary mt-4 inline-flex">Volver</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/page-builder" className="btn-back" title="Volver"><ArrowLeft size={16} /></Link>
        <h1 className="mr-auto text-xl font-semibold text-fg">{proyecto.nombre}</h1>
        <EstadoBadge estado={proyecto.estado} />
      </header>

      {error && <p className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {/* ── Páginas sueltas ────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <FileText size={16} /> Páginas
          </h2>
          <button type="button" className="btn-secondary" onClick={crearPagina} disabled={ocupado}>
            <Plus size={14} /> Nueva página
          </button>
        </div>

        {proyecto.paginas?.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {proyecto.paginas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link
                  to={`/page-builder/paginas/${p.id}`}
                  className="mr-auto min-w-0 flex-1 truncate font-medium text-fg hover:underline"
                >
                  {p.nombre}
                </Link>
                <EstadoBadge estado={p.estado} tieneCambios={p.tiene_cambios_sin_publicar} />
                <button
                  type="button" className="btn-ghost" title="Dirección pública"
                  onClick={() => setHostnameTarget({ pagina_id: p.id, nombre: p.nombre })}
                >
                  <Globe size={14} />
                </button>
                <Link to={`/page-builder/paginas/${p.id}`} className="btn-ghost" title="Editar">
                  <Pencil size={14} />
                </Link>
                <button
                  type="button" className="btn-ghost" title="Borrar"
                  onClick={() => eliminarPagina(p)} disabled={ocupado}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted">
            Sin páginas sueltas todavía.
          </p>
        )}
      </section>

      {/* ── Funnels ────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <GitBranch size={16} /> Funnels
          </h2>
          <button type="button" className="btn-secondary" onClick={crearFunnel} disabled={ocupado}>
            <Plus size={14} /> Nuevo funnel
          </button>
        </div>

        {proyecto.funnels?.length ? (
          <ul className="space-y-2">
            {proyecto.funnels.map((f) => (
              <li key={f.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/page-builder/funnels/${f.id}`}
                    className="mr-auto min-w-0 truncate font-medium text-fg hover:underline"
                  >
                    {f.nombre}
                  </Link>
                  <EstadoBadge estado={f.estado} />
                  <button
                    type="button" className="btn-ghost" title="Dirección pública"
                    onClick={() => setHostnameTarget({ funnel_id: f.id, nombre: f.nombre })}
                  >
                    <Globe size={14} />
                  </button>
                </div>
                <p className="mt-2 truncate text-xs text-fg-muted">
                  {f.paginas?.length
                    ? f.paginas.map(p => p.nombre).join('  →  ')
                    : 'Sin pasos todavía.'}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted">
            Sin funnels todavía.
          </p>
        )}
      </section>

      {hostnameTarget && (
        <HostnamesModal target={hostnameTarget} onCerrar={() => setHostnameTarget(null)} />
      )}
    </div>
  );
}
