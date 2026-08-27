import React from 'react';

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-fg/30';

/**
 * La propuesta de valor y el CTA — el par que decide si el embudo convierte.
 *
 * La propuesta va inmediatamente debajo del nombre y ANTES del precio:
 * responde "¿por qué lo necesito?" antes de que el comprador vea el número.
 */
export default function ValorPanel({ content, onContent }) {
  const set = (clave, valor) => onContent({ ...content, [clave]: valor });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-semibold text-fg/60 mb-1.5">
          Propuesta de valor
        </label>
        <textarea
          value={content.propuesta_valor || ''}
          onChange={e => set('propuesta_valor', e.target.value)}
          placeholder="Definí tus cejas y barba con precisión y conseguí un acabado profesional en segundos."
          rows={3}
          maxLength={300}
          className={CAMPO}
        />
        <p className="text-[11px] text-fg/35 mt-1.5 leading-relaxed">
          Una frase: producto → beneficio principal → acción. Aparece debajo del
          nombre, antes del precio.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-fg/60 mb-1.5">
          Texto del botón principal
        </label>
        <input
          type="text"
          value={content.cta_primario || ''}
          onChange={e => set('cta_primario', e.target.value)}
          placeholder="Comprar ahora"
          maxLength={40}
          className={CAMPO}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-fg/60 mb-1.5">
          Título de la descripción
        </label>
        <input
          type="text"
          value={content.descripcion_titulo || ''}
          onChange={e => set('descripcion_titulo', e.target.value)}
          placeholder="Sobre este producto"
          maxLength={120}
          className={CAMPO}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-fg/60 mb-1.5">
          Sobre este producto
        </label>
        <textarea
          value={content.sobre_este_producto || ''}
          onChange={e => set('sobre_este_producto', e.target.value)}
          placeholder="Descripción detallada para la sección 'Sobre este producto' del embudo."
          rows={4}
          className={CAMPO}
        />
        <p className="text-[11px] text-fg/35 mt-1.5 leading-relaxed">
          Si se deja vacío, el embudo usará la Descripción Larga.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 pt-1">
        <p className="text-xs font-semibold text-fg/60">Acciones secundarias</p>
        <label className="flex items-center gap-2.5 text-sm text-fg/80 cursor-pointer">
          <input
            type="checkbox"
            checked={content.mostrar_agregar_carrito !== false}
            onChange={e => set('mostrar_agregar_carrito', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Mostrar "Agregar al carrito"
        </label>
        <label className="flex items-center gap-2.5 text-sm text-fg/80 cursor-pointer">
          <input
            type="checkbox"
            checked={content.mostrar_whatsapp !== false}
            onChange={e => set('mostrar_whatsapp', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Mostrar "Consultar por WhatsApp"
        </label>
        <p className="text-[11px] text-fg/35 leading-relaxed">
          En un embudo de venta directa, cuantas menos salidas haya, mejor
          convierte. "Comprar ahora" siempre se muestra.
        </p>
      </div>
    </div>
  );
}
