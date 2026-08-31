import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ArrowLeft, Plus, Loader, GripVertical, Flag, Pencil, LogOut, Rocket, EyeOff, Globe, ArrowDown,
} from 'lucide-react';
import { pageBuilderService, mensajeDeError } from '../../../services/pageBuilderService';
import EstadoBadge from '../EstadoBadge';
import HostnamesModal from '../HostnamesModal';

/**
 * El armador de funnels: los pasos en una columna, arrastrables.
 *
 *   ① Landing
 *        ↓
 *   ② Oferta
 *        ↓
 *   ③ Gracias
 *
 * Al soltar se manda el ARRAY COMPLETO de ids, no el movimiento: así la
 * operación es idempotente y dos pestañas reordenando a la vez no dejan
 * el funnel en un orden que nadie pidió. El cambio se pinta primero y se
 * revierte si el servidor lo rechaza.
 *
 * Un funnel tiene UNA dirección; cada paso cuelga de su slug. Por eso el
 * botón de dirección está acá y no en cada página.
 */
export default function FunnelBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [funnel, setFunnel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resultadoPublicar, setResultadoPublicar] = useState(null);
  const [mostrarHostnames, setMostrarHostnames] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setFunnel(await pageBuilderService.obtenerFunnel(id));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cargar el funnel.'));
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function alSoltar(resultado) {
    if (!resultado.destination || resultado.destination.index === resultado.source.index) return;

    const paginas = Array.from(funnel.paginas);
    const [movida] = paginas.splice(resultado.source.index, 1);
    paginas.splice(resultado.destination.index, 0, movida);

    const anterior = funnel.paginas;
    // Optimista: el arrastre tiene que sentirse inmediato.
    setFunnel(f => ({ ...f, paginas }));

    try {
      const actualizado = await pageBuilderService.reordenarFunnel(id, paginas.map(p => p.id));
      setFunnel(actualizado);
    } catch (err) {
      setFunnel(f => ({ ...f, paginas: anterior }));
      setError(mensajeDeError(err, 'No se pudo reordenar.'));
    }
  }

  async function accion(fn, mensajeError) {
    setOcupado(true);
    setError('');
    try {
      const res = await fn();
      if (res?.publicadas || res?.despublicadas) setResultadoPublicar(res);
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, mensajeError));
    } finally {
      setOcupado(false);
    }
  }

  async function agregarPagina() {
    const nombre = window.prompt('Nombre del paso nuevo:');
    if (!nombre?.trim()) return;
    await accion(
      () => pageBuilderService.agregarPaginaAFunnel(id, { nombre: nombre.trim() }),
      'No se pudo agregar el paso.',
    );
  }

  if (cargando) {
    return <div className="flex justify-center py-20"><Loader className="animate-spin text-fg-muted" /></div>;
  }

  if (!funnel) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-fg">{error || 'Funnel no encontrado.'}</p>
        <Link to="/page-builder" className="btn-secondary mt-4 inline-flex">Volver</Link>
      </div>
    );
  }

  const paginas = funnel.paginas || [];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button" className="btn-back" title="Volver"
          onClick={() => navigate(`/page-builder/p/${funnel.proyecto_id}`)}
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="mr-auto text-xl font-semibold text-fg">{funnel.nombre}</h1>
        <EstadoBadge estado={funnel.estado} />

        <button type="button" className="btn-ghost" onClick={() => setMostrarHostnames(true)}>
          <Globe size={15} /> Dirección
        </button>

        {funnel.estado === 'published' ? (
          <button
            type="button" className="btn-ghost" disabled={ocupado}
            onClick={() => accion(() => pageBuilderService.despublicarFunnel(id), 'No se pudo despublicar.')}
          >
            <EyeOff size={15} /> Despublicar
          </button>
        ) : null}

        <button
          type="button" className="btn-primary" disabled={ocupado || !paginas.length}
          onClick={() => accion(() => pageBuilderService.publicarFunnel(id), 'No se pudo publicar.')}
        >
          {ocupado ? <Loader size={15} className="animate-spin" /> : <Rocket size={15} />}
          Publicar funnel
        </button>
      </header>

      {error && <p className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {resultadoPublicar && (
        <div className="mb-4 rounded-lg border border-border bg-surface p-3 text-xs text-fg-muted">
          {resultadoPublicar.publicadas && (
            <p><strong className="text-fg">{resultadoPublicar.publicadas.length}</strong> páginas publicadas.</p>
          )}
          {resultadoPublicar.salteadas?.length > 0 && (
            <p className="mt-1">{resultadoPublicar.salteadas.length} sin cambios, se saltearon.</p>
          )}
          {resultadoPublicar.fallidas?.length > 0 && (
            <ul className="mt-1" style={{ color: 'var(--color-danger)' }}>
              {resultadoPublicar.fallidas.map(f => (
                <li key={f.pagina_id}>· {f.motivo}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {paginas.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-fg-muted">
          Este funnel todavía no tiene pasos.
        </p>
      ) : (
        <DragDropContext onDragEnd={alSoltar}>
          <Droppable droppableId="pasos">
            {(zona) => (
              <ol ref={zona.innerRef} {...zona.droppableProps} className="space-y-1">
                {paginas.map((p, indice) => (
                  <Draggable key={p.id} draggableId={String(p.id)} index={indice}>
                    {(item, estado) => (
                      <li ref={item.innerRef} {...item.draggableProps}>
                        <div
                          className="flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3 transition-shadow"
                          style={{
                            borderColor: estado.isDragging
                              ? 'var(--color-primary)'
                              : 'var(--color-border)',
                            boxShadow: estado.isDragging ? '0 8px 24px rgba(0,0,0,.3)' : 'none',
                          }}
                        >
                          <span
                            {...item.dragHandleProps}
                            className="cursor-grab text-fg-subtle hover:text-fg"
                            aria-label="Arrastrar para reordenar"
                          >
                            <GripVertical size={16} />
                          </span>

                          <span className="w-6 text-center font-mono text-sm text-fg-muted">
                            {indice + 1}
                          </span>

                          <Link
                            to={`/page-builder/paginas/${p.id}`}
                            className="mr-auto min-w-0 flex-1 truncate font-medium text-fg hover:underline"
                          >
                            {p.nombre}
                          </Link>

                          {p.es_entrada && (
                            <span
                              className="flex items-center gap-1 text-[11px]"
                              style={{ color: 'var(--color-accent-text)' }}
                              title="A esta página llega quien abre la dirección del funnel"
                            >
                              <Flag size={12} /> Entrada
                            </span>
                          )}

                          <EstadoBadge estado={p.estado} tieneCambios={p.tiene_cambios_sin_publicar} />

                          {!p.es_entrada && (
                            <button
                              type="button" className="btn-ghost" title="Marcar como página de entrada"
                              disabled={ocupado}
                              onClick={() => accion(
                                () => pageBuilderService.definirEntrada(id, p.id),
                                'No se pudo definir la entrada.',
                              )}
                            >
                              <Flag size={14} />
                            </button>
                          )}

                          <Link to={`/page-builder/paginas/${p.id}`} className="btn-ghost" title="Editar">
                            <Pencil size={14} />
                          </Link>

                          <button
                            type="button" className="btn-ghost" title="Sacar del funnel (no se borra)"
                            disabled={ocupado}
                            onClick={() => {
                              if (window.confirm(`«${p.nombre}» sale del funnel y vuelve a ser una página suelta. No se borra.`)) {
                                accion(
                                  () => pageBuilderService.quitarPaginaDeFunnel(id, p.id),
                                  'No se pudo sacar del funnel.',
                                );
                              }
                            }}
                          >
                            <LogOut size={14} />
                          </button>
                        </div>

                        {indice < paginas.length - 1 && (
                          <div className="flex justify-center py-0.5" aria-hidden="true">
                            <ArrowDown size={14} className="text-fg-subtle" />
                          </div>
                        )}
                      </li>
                    )}
                  </Draggable>
                ))}
                {zona.placeholder}
              </ol>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <button
        type="button" className="btn-secondary mt-4" onClick={agregarPagina} disabled={ocupado}
      >
        <Plus size={15} /> Agregar paso
      </button>

      {mostrarHostnames && (
        <HostnamesModal
          target={{ funnel_id: funnel.id, nombre: funnel.nombre }}
          onCerrar={() => setMostrarHostnames(false)}
        />
      )}
    </div>
  );
}
