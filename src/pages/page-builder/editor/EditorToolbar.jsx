import React from 'react';
import { ArrowLeft, Save, Upload, History, Rocket, EyeOff, ExternalLink, Loader } from 'lucide-react';
import EstadoBadge from '../EstadoBadge';

/**
 * La barra superior del editor.
 *
 * El orden de los botones sigue el flujo real: Importar (traer código) →
 * Versiones (mirar el historial) → Guardar → Publicar. Guardar y publicar
 * son dos acciones distintas y se ven distintas a propósito: guardar no
 * cambia nada de lo que ve el visitante, y esa diferencia es el corazón
 * del módulo.
 */
export default function EditorToolbar({
  pagina,
  hayCambiosSinGuardar,
  guardando,
  publicando,
  onVolver,
  onImportar,
  onVersiones,
  onGuardar,
  onPublicar,
  onDespublicar,
  urlPublica,
}) {
  const publicada = pagina?.estado === 'published';

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
      <button type="button" onClick={onVolver} className="btn-back" title="Volver">
        <ArrowLeft size={16} />
      </button>

      <div className="mr-auto flex min-w-0 items-center gap-3">
        <h1 className="truncate text-sm font-semibold text-fg">{pagina?.nombre}</h1>
        <EstadoBadge
          estado={pagina?.estado}
          tieneCambios={pagina?.tiene_cambios_sin_publicar}
        />
        {hayCambiosSinGuardar && (
          <span className="text-xs text-fg-subtle">· sin guardar</span>
        )}
      </div>

      {publicada && urlPublica && (
        <a
          href={urlPublica}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost"
          title="Ver la página publicada"
        >
          <ExternalLink size={15} /> Ver
        </a>
      )}

      <button type="button" onClick={onImportar} className="btn-ghost" title="Pegar un HTML completo">
        <Upload size={15} /> Importar
      </button>

      <button type="button" onClick={onVersiones} className="btn-ghost" title="Historial de versiones">
        <History size={15} /> Versiones
      </button>

      <button
        type="button"
        onClick={onGuardar}
        className="btn-secondary"
        disabled={guardando}
        title="Guardar (Ctrl+S). No publica."
      >
        {guardando ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
        Guardar
      </button>

      {publicada ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDespublicar}
            className="btn-ghost"
            disabled={publicando}
            title="Sacarla de línea"
          >
            <EyeOff size={15} /> Despublicar
          </button>
          <button
            type="button"
            onClick={onPublicar}
            className="btn-primary"
            disabled={publicando || !pagina?.tiene_cambios_sin_publicar}
            title={pagina?.tiene_cambios_sin_publicar
              ? 'Publicar los cambios guardados'
              : 'No hay cambios sin publicar'}
          >
            {publicando ? <Loader size={15} className="animate-spin" /> : <Rocket size={15} />}
            Publicar cambios
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPublicar}
          className="btn-primary"
          disabled={publicando}
          title="Ponerla en línea"
        >
          {publicando ? <Loader size={15} className="animate-spin" /> : <Rocket size={15} />}
          Publicar
        </button>
      )}
    </header>
  );
}
