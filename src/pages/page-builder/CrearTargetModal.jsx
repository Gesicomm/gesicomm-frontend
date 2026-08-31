import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { pageBuilderService, mensajeDeError } from '../../services/pageBuilderService';

const INPUT = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-fg outline-none focus:border-primary';

export default function CrearTargetModal({ tipo, proyectoId, onCerrar, onCreado }) {
  const [nombre, setNombre] = useState('');
  const [subdominio, setSubdominio] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    const nom = nombre.trim();
    if (!nom) return;

    setOcupado(true);
    setError('');

    try {
      let target;
      if (tipo === 'funnel') {
        target = await pageBuilderService.crearFunnel(proyectoId, { nombre: nom });
      } else {
        target = await pageBuilderService.crearPagina(proyectoId, { nombre: nom });
      }

      if (subdominio.trim()) {
        try {
          await pageBuilderService.crearSubdominio({
            [tipo === 'funnel' ? 'funnel_id' : 'pagina_id']: target.id,
            subdominio: subdominio.trim(),
          });
        } catch (subErr) {
          console.error("Error asignando subdominio:", subErr);
          window.alert(mensajeDeError(subErr, 'El funnel se creó pero el subdominio no pudo asignarse.'));
        }
      }

      onCreado(target);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear.'));
      setOcupado(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-2xl">
        <header className="flex items-center justify-between border-b border-border bg-canvas/50 px-5 py-4">
          <h2 className="text-base font-semibold text-fg">
            Nuevo {tipo === 'funnel' ? 'Funnel' : 'Página'}
          </h2>
          <button type="button" className="btn-ghost -mr-2" onClick={onCerrar} title="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="p-5">
          {error && <p className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg">Nombre</label>
              <input
                type="text"
                autoFocus
                className={INPUT}
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder={tipo === 'funnel' ? 'Ej: Lanzamiento' : 'Ej: Landing Principal'}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-fg">
                Subdominio de Gesicomm <span className="font-normal" style={{ color: 'var(--color-fg-muted)' }}>(opcional)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  className={INPUT + ' flex-1'}
                  style={{ minWidth: '120px' }}
                  value={subdominio}
                  onChange={(e) => setSubdominio(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mi-subdominio"
                />
                <span className="text-sm font-mono" style={{ color: 'var(--color-fg-muted)' }}>.gesicomm.com</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={onCerrar} disabled={ocupado}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={ocupado || !nombre.trim()}>
                {ocupado && <Loader size={14} className="mr-2 animate-spin" />}
                Crear
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
