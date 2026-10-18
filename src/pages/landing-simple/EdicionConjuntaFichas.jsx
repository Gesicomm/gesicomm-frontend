import React from 'react';
import { BLOQUES_FICHA_PANEL, ListaConfianzaProducto, MetodosPagoEditor } from './PresentacionProducto';

export default function EdicionConjuntaFichas({ cantidad, fichas, referencia, onCambiar, paymentLogosCatalogo }) {
  const logos = new Set((referencia?.payment_logos || []).map(l => l.clave));
  return (
    <section className="space-y-5" aria-label="Edición de varios productos">
      <div>
        <h2 className="text-lg font-semibold text-fg">Editar {cantidad} productos</h2>
        <p className="mt-1 text-sm text-fg-muted">Solo se aplican los cambios que hagas. Las imágenes, los precios y los textos se editan entrando a cada producto.</p>
      </div>
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
          alcanceLogos="solo los productos seleccionados"
          onPagoLogosChange={(clave, activo) => onCambiar('payment_logos', paymentLogosCatalogo.filter(l => l.clave === clave ? activo : logos.has(l.clave)))} />
      </div>
    </section>
  );
}
