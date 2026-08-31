import React, { useState } from 'react';
import { X, Loader, FileCode2 } from 'lucide-react';
import { pageBuilderService, mensajeDeError } from '../../../services/pageBuilderService';

/**
 * "Importar HTML": pegar una página entera y que el sistema la reparta en
 * las tres pestañas.
 *
 * El reparto lo hace el servidor (LandingCodigoService.separarDocumentoCompleto),
 * no este modal: es la misma función que ya usaban las landings de código
 * y está testeada. Acá solo se pega el texto y se muestran las
 * advertencias de qué se movió a dónde.
 *
 * Importar NO guarda: deja el código en las pestañas para que el usuario
 * lo revise y guarde cuando quiera.
 */
export default function ImportarHtmlModal({ paginaId, onImportado, onCerrar }) {
  const [documento, setDocumento] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function importar() {
    setCargando(true);
    setError('');
    try {
      const res = await pageBuilderService.importarHtml(paginaId, documento);
      onImportado(res.codigo, res.advertencias || []);
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo importar el HTML.'));
    } finally {
      setCargando(false);
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
        aria-label="Importar HTML"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <FileCode2 size={16} /> Importar HTML
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-fg-muted hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
          <p className="text-xs text-fg-muted">
            Pegá una página completa. El sistema separa el <code>&lt;style&gt;</code> a la
            pestaña CSS, el <code>&lt;script&gt;</code> a la de JavaScript, y conserva el
            contenido del <code>&lt;body&gt;</code> en la de HTML. No se guarda nada todavía.
          </p>

          <textarea
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder={'<!DOCTYPE html>\n<html>\n  ...\n</html>'}
            spellCheck={false}
            className="min-h-[280px] flex-1 resize-none rounded-lg border border-border bg-canvas p-3 font-mono text-xs text-fg outline-none focus:border-primary"
          />

          {error && (
            <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" className="btn-secondary" onClick={onCerrar}>Cancelar</button>
          <button
            type="button"
            className="btn-primary"
            onClick={importar}
            disabled={cargando || !documento.trim()}
          >
            {cargando ? <Loader size={15} className="animate-spin" /> : null}
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}
