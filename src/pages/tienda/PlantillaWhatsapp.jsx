import React, { useId, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Eye, MessageCircle, Plus, RotateCcw } from 'lucide-react';
import './mensajesWhatsapp.css';

const DATOS = { '{producto}': 'Producto', '{precio}': 'Precio', '{url}': 'Enlace', '{cliente}': 'Cliente', '{pedido}': 'N.º de pedido', '{total}': 'Total' };

export default function PlantillaWhatsapp({ titulo, uso, textareaRef, valor, onChange, placeholder, variables, onInsertar, urlPublica, preview, recomendado, guardado, abierto, onToggle, salida = false }) {
  const id = useId();
  const [vacioEnEdicion, setVacioEnEdicion] = useState(false);
  const texto = valor || (vacioEnEdicion ? '' : recomendado);
  const personalizado = Boolean(valor && valor !== recomendado);
  const modificado = (valor || recomendado) !== (guardado || recomendado);
  const Direccion = salida ? ArrowUpRight : ArrowDownLeft;
  return (
    <article className={`tn-message-card ${abierto ? 'is-open' : ''}`}>
      <button type="button" className="tn-message-summary" onClick={onToggle} aria-expanded={abierto} aria-controls={`${id}-editor`} aria-label={`${abierto ? 'Cerrar editor' : 'Editar mensaje'}: ${titulo}`}>
        <span className={`tn-message-icon ${salida ? 'outgoing' : ''}`}><MessageCircle size={20} aria-hidden="true" /></span>
        <span className="tn-message-overview">
          <span className="tn-message-title">{titulo}</span>
          <span className="tn-message-direction"><Direccion size={13} aria-hidden="true" />{salida ? 'Negocio → Cliente' : 'Cliente → Negocio'}</span>
          <span className="tn-message-use">{uso}</span>
          {!abierto && <span className="tn-message-excerpt">{preview}</span>}
        </span>
        <span className="tn-message-summary-end"><span className={`tn-message-state ${modificado ? 'unsaved' : ''}`}>{modificado ? 'Sin guardar' : personalizado ? 'Personalizado' : 'Recomendado'}</span><ChevronDown size={18} aria-hidden="true" /></span>
      </button>
      <div id={`${id}-editor`} className="tn-message-editor" hidden={!abierto}>
        <div className="tn-msg-grid">
          <div className="tn-msg-builder">
            <label htmlFor={`${id}-text`} className="tn-field-label">Texto del mensaje</label>
            <textarea id={`${id}-text`} ref={textareaRef} className="tn-msg-textarea" value={texto} onChange={e => { setVacioEnEdicion(!e.target.value); onChange(e.target.value); }} placeholder={placeholder} maxLength={300} rows={5} />
            <div className="tn-message-text-meta"><span>{personalizado ? 'Tu mensaje personalizado' : 'Usando mensaje recomendado'}</span><span>{texto.length}/300</span></div>
            <span className="tn-message-data-label">Agregar datos al mensaje</span>
            <div className="tn-msg-vars">{variables.map(v => <button key={v.variable} type="button" className="tn-msg-var-chip" onClick={() => onInsertar(v.variable)} title={`${v.desc} — ej: ${v.ejemplo || urlPublica}`}><Plus size={13} aria-hidden="true" />{DATOS[v.variable] || v.desc}</button>)}</div>
            <p className="tn-message-help">Los datos entre llaves se reemplazan por los de cada {salida ? 'pedido' : 'consulta'}.</p>
            <button type="button" className="tn-message-reset" disabled={!personalizado && !vacioEnEdicion} onClick={() => { setVacioEnEdicion(false); onChange(recomendado); }}><RotateCcw size={14} aria-hidden="true" />Usar mensaje recomendado</button>
          </div>
          <div className="tn-msg-preview-wrap">
            <div className="tn-msg-preview-label"><Eye size={14} aria-hidden="true" /><span>{salida ? 'Así lo verá el cliente' : 'Así te llegará'}</span></div>
            <div className="tn-message-chat">
              <div className="tn-message-chat-head"><MessageCircle size={17} aria-hidden="true" /><span>{salida ? 'Cliente de ejemplo' : 'Tu negocio'}</span><small>WhatsApp</small></div>
              <div className={`tn-message-chat-body ${salida ? 'outgoing' : 'incoming'}`}><div className="tn-msg-preview-bubble">{preview}<span className="tn-preview-time">10:30 <Check size={12} aria-hidden="true" /></span></div></div>
            </div>
            <span className="tn-message-help">Vista previa con datos de ejemplo. No envía mensajes.</span>
          </div>
        </div>
        <p className="tn-message-delivery-note">{salida ? 'Al confirmar el pedido, podés revisar y editar este texto antes de enviarlo por WhatsApp.' : 'Este texto se prepara en el WhatsApp del cliente. El cliente decide si lo envía.'}</p>
        {modificado && <p className="tn-message-dirty" role="status">Cambios sin guardar. Usá “Guardar cambios” para aplicarlos.</p>}
      </div>
    </article>
  );
}
