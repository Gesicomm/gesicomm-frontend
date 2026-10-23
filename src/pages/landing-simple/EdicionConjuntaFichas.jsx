import React, { useState } from 'react';
import { cambiosContadorFichas } from './fichasEnLote';
import { BLOQUES_FICHA_PANEL, ListaConfianzaProducto, MetodosPagoEditor } from './PresentacionProducto';

export default function EdicionConjuntaFichas({ cantidad, fichas, referencia, onCambiar, paymentLogosCatalogo, onSubirImagen, urgenciaGlobalActiva = false }) {
  const logos = new Set((referencia?.payment_logos || []).map(l => l.clave));
  const [duracion, setDuracion] = useState(() => ({ horas: String(referencia?.urgencia_horas ?? 2), minutos: String(referencia?.urgencia_minutos ?? 0), segundos: String(referencia?.urgencia_segundos ?? 0) }));
  const [intento, setIntento] = useState(false);
  const [aplicado, setAplicado] = useState('');
  const firma = JSON.stringify([fichas.map(f => f.content_id ?? f.id), cantidad, duracion]);
  const duracionValida = cambiosContadorFichas(duracion);
  const mixto = fichas.some(f => ['urgencia_horas', 'urgencia_minutos', 'urgencia_segundos'].some(c => f[c] !== fichas[0]?.[c]));
  return (
    <section className="space-y-5" aria-label="Edición de varios productos">
      <div>
        <h2 className="text-lg font-semibold text-fg">Editar {cantidad} productos</h2>
        <p className="mt-1 text-sm text-fg-muted">Solo se aplican los cambios que hagas. Las imágenes, los precios y los textos se editan entrando a cada producto.</p>
      </div>
      <fieldset className="bulk-countdown space-y-4 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-lg font-semibold text-fg">Oferta por tiempo limitado</legend>
        <p className="text-sm text-fg-muted">Definí la misma duración para los {cantidad} productos seleccionados. Se mostrará la oferta y su contador en esas fichas.</p>
        {mixto && <p className="text-sm text-fg-muted">Las duraciones actuales son distintas. Se reemplazan solo al aplicar.</p>}
        <div className="bulk-countdown-fields">
          {[["horas", "Horas", 99], ["minutos", "Minutos", 59], ["segundos", "Segundos", 59]].map(([campo, label, max]) => {
            const invalido = intento && (duracion[campo] === '' || !Number.isInteger(Number(duracion[campo])) || Number(duracion[campo]) < 0 || Number(duracion[campo]) > max);
            return <label key={campo} className="block text-sm text-fg"><span>{label}</span>
              <input type="number" aria-label={label} min={0} max={max} step={1} value={duracion[campo]}
                aria-invalid={invalido || undefined} aria-describedby={invalido ? `bulk-countdown-${campo}-error` : undefined}
                onChange={e => setDuracion(prev => ({ ...prev, [campo]: e.target.value }))} />
              {invalido && <span id={`bulk-countdown-${campo}-error`} className="text-sm text-danger">Ingresá un entero entre 0 y {max}.</span>}
            </label>;
          })}
        </div>
        {intento && !duracionValida && <p role="alert" className="text-sm text-danger">Revisá la duración: debe ser mayor que cero, con horas de 0 a 99 y minutos y segundos de 0 a 59.</p>}
        {urgenciaGlobalActiva && <p className="text-sm text-fg-muted">La oferta flash de Inicio tiene prioridad en los productos incluidos en ella. Estos valores configuran el contador propio de la ficha.</p>}
        <button type="button" className="btn-secondary" onClick={() => { setIntento(true); if (duracionValida) { onCambiar('urgencia_duracion', duracion); setAplicado(firma); } }}>Aplicar contador a {cantidad} productos</button>
        {aplicado === firma && <p role="status" className="text-sm text-fg">Contador de {Number(duracion.horas)} h {Number(duracion.minutos)} min {Number(duracion.segundos)} s aplicado a {cantidad} productos.</p>}
        <p className="text-sm text-fg-muted">Los cambios quedan en el editor hasta que pulses Guardar. Esta es una duración por visita, igual que en la edición individual.</p>
      </fieldset>
      <fieldset className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-fg">Mostrar u ocultar bloques</legend>
        <p className="text-xs text-fg-muted">Un check muestra el bloque en los productos seleccionados. Si hay valores diferentes, se indica como «Mixto».</p>
        {BLOQUES_FICHA_PANEL.map(b => {
          const estados = fichas.map(f => f?.ficha_bloques?.[b.clave] !== false);
          const mixto = estados.some(Boolean) && estados.some(v => !v);
          return <label key={b.clave} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-fg">
            <input type="checkbox" className="accent-primary" ref={el => { if (el) el.indeterminate = mixto; }} checked={estados.every(Boolean)}
              onChange={e => onCambiar('ficha_bloques', { [b.clave]: e.target.checked })} aria-label={`Mostrar ${b.titulo}`} />
            <span className="flex-1">{b.titulo}</span>{mixto && <span className="text-xs text-fg-muted">Mixto</span>}
          </label>;
        })}
      </fieldset>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-fg">Zona de confianza</h3>
        <p className="text-xs text-fg-muted">Al editar estas tarjetas, se usa el mismo contenido en la selección.</p>
        <ListaConfianzaProducto items={referencia?.confianza || []} onCambiar={onCambiar} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-fg">Medios de pago</h3>
        <MetodosPagoEditor metodos={referencia?.metodos_pago || []} onCambiar={onCambiar}
          paymentLogosCatalogo={paymentLogosCatalogo} pagoLogos={Object.fromEntries(paymentLogosCatalogo.map(l => [l.clave, logos.has(l.clave)]))}
          alcanceLogos="solo los productos seleccionados" onSubirImagen={onSubirImagen}
          onPagoLogosChange={(clave, activo) => onCambiar('payment_logos', paymentLogosCatalogo.filter(l => l.clave === clave ? activo : logos.has(l.clave)))} />
      </div>
    </section>
  );
}
