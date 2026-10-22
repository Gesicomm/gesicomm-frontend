import { useEffect, useRef, useState } from 'react';

export function useAdsDialog(open, onClose, busy, dirty) {
  const dialogRef = useRef(null);
  const actual = useRef({ onClose, busy, dirty });
  actual.current = { onClose, busy, dirty };
  const [descartar, setDescartar] = useState(false);
  const requestClose = () => {
    if (actual.current.busy) return;
    if (actual.current.dirty) setDescartar(true);
    else actual.current.onClose();
  };
  useEffect(() => {
    if (!open) return;
    setDescartar(false);
    const anterior = document.activeElement;
    const panel = dialogRef.current;
    panel?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); requestClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...(panel?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]') || [])].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first?.focus(); }
    };
    panel?.addEventListener('keydown', keydown);
    return () => { panel?.removeEventListener('keydown', keydown); anterior?.focus?.(); };
  }, [open]);
  const aviso = descartar ? <div className="ads-discard" role="alert"><strong>Tenés cambios sin guardar</strong><p>Podés seguir editando o descartarlos para cerrar.</p><button type="button" className="btn-secondary" onClick={() => setDescartar(false)}>Seguir editando</button><button type="button" className="btn-secondary" onClick={() => actual.current.onClose()}>Descartar cambios</button></div> : null;
  return { dialogRef, requestClose, aviso };
}
