import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader, Code2, FileText, GitBranch, Trash2 } from 'lucide-react';
import { pageBuilderService, mensajeDeError } from '../../services/pageBuilderService';
import EstadoBadge from './EstadoBadge';

/**
 * Listado de proyectos del Page Builder.
 *
 * Un proyecto es un contenedor: agrupa páginas sueltas y funnels de un
 * mismo negocio. No se publica ni tiene URL propia — las que se publican
 * son las páginas y los funnels que cuelgan de él.
 */
export default function PageBuilderHome() {
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [avisoNombre, setAvisoNombre] = useState('');
  const inputNombreRef = useRef(null);

  async function cargar() {
    try {
      const res = await pageBuilderService.listarProyectos();
      setProyectos(res.proyectos || []);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los proyectos.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    // El botón queda SIEMPRE clickeable a propósito: un botón deshabilitado
    // con cursor de "prohibido" y sin ningún texto que explique por qué se
    // lee como que la función está rota, no como "falta completar un campo".
    // Acá se valida al enviar y se avisa en el propio campo.
    if (!nombre.trim()) {
      setAvisoNombre('Escribí un nombre para el proyecto.');
      inputNombreRef.current?.focus();
      return;
    }
    setAvisoNombre('');
    setCreando(true);
    setError('');
    try {
      await pageBuilderService.crearProyecto({ nombre: nombre.trim() });
      setNombre('');
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear el proyecto.'));
    } finally {
      setCreando(false);
    }
  }

  async function eliminarProyecto(e, proyecto) {
    e.preventDefault();
    if (!window.confirm(`Se va a borrar "${proyecto.nombre}" con todas sus páginas y funnels. ¿Estás seguro?`)) return;
    try {
      await pageBuilderService.eliminarProyecto(proyecto.id);
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo borrar el proyecto.'));
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-fg">
          <Code2 size={20} /> Page Builder
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Páginas y funnels de código propio. Escribí o pegá el HTML, previsualizalo y
          publicalo en su propia dirección.
        </p>
      </header>

      <form onSubmit={crear} className="mb-1.5 flex flex-wrap gap-2">
        <input
          ref={inputNombreRef}
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); if (avisoNombre) setAvisoNombre(''); }}
          placeholder="Nombre del proyecto (ej: Suplementos)"
          aria-invalid={!!avisoNombre}
          className="min-w-[240px] flex-1 rounded-lg border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
          style={{ borderColor: avisoNombre ? 'var(--color-danger)' : 'var(--color-border)' }}
        />
        {/* Deshabilitado SOLO mientras la request está en vuelo, para no
            mandar dos veces el mismo proyecto con un doble click. Con el
            campo vacío queda habilitado: el aviso sale al enviar. */}
        <button type="submit" className="btn-primary" disabled={creando}>
          {creando ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />}
          Nuevo proyecto
        </button>
      </form>

      {avisoNombre && (
        <p className="mb-4 text-xs" style={{ color: 'var(--color-danger)' }}>{avisoNombre}</p>
      )}

      {error && (
        <p className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
      )}

      {cargando ? (
        <div className="flex justify-center py-16"><Loader className="animate-spin text-fg-muted" /></div>
      ) : proyectos.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-fg-muted">
            Todavía no hay proyectos. Creá el primero para empezar a armar páginas.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {proyectos.map((p) => (
            <li key={p.id}>
              <Link
                to={`/page-builder/p/${p.id}`}
                className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="truncate font-medium text-fg">{p.nombre}</h2>
                  <div className="flex items-center gap-2">
                    <EstadoBadge estado={p.estado} />
                    <button
                      type="button"
                      className="btn-ghost -mr-2"
                      title="Borrar proyecto"
                      onClick={(e) => eliminarProyecto(e, p)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-fg-muted">
                  <span className="flex items-center gap-1">
                    <FileText size={13} /> {p.total_paginas_builder} páginas
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch size={13} /> {p.total_funnels} funnels
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
