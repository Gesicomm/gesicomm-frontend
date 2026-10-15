import React from 'react';
import { RotateCcw } from 'lucide-react';
import { resolverTemaPorSlug } from '../templates/themeUtils';
import { coloresDeTienda } from '../mapLandingToTemplateData';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// `temaKey` es el nombre del color dentro del tema resuelto del template
// (ver DEFAULT_TEMA_POR_TEMPLATE), que no coincide con el de la columna.
const CAMPOS = [
  { key: 'color_fondo', temaKey: 'fondo', label: 'Fondo de la landing', ayuda: 'Base general de la página y secciones amplias.' },
  { key: 'color_texto', temaKey: 'texto', label: 'Texto principal', ayuda: 'Títulos, menú y textos normales. Si no contrasta, la landing ajusta derivados.' },
  { key: 'color_primario', temaKey: 'acento', label: 'Primario / botones', ayuda: 'CTAs, botones de compra, estados activos y carrito.' },
];

/**
 * Tema único para toda la landing (no por sección) — fondo, texto y
 * acento. Reutiliza color_fondo/color_texto/color_primario, ya existentes
 * en Landing (sistema flexible) y ya validados como hex por
 * LandingService.validarPayload. null = el template usa su propia paleta
 * por defecto (ver templates/*.jsx).
 */
export default function ColoresPanel({ draft, onCampo, templateSlug, tienda }) {
  const coloresTienda = coloresDeTienda(tienda);
  // Paleta que la landing está usando de verdad: lo que el comercio pisó,
  // y donde no pisó nada, el default del template activo. Sin esto el panel
  // arrancaba con los tres selectores en negro y los campos de texto
  // vacíos — no mostraba en ningún lado los colores reales de la página.
  // "texto" tiene una capa intermedia extra: antes del default fijo del
  // template, hereda el color secundario de Branding (mismo fallback que
  // aplica el render real, ver landing.service.js/mapLandingToTemplateData.js)
  // — si no, el placeholder mostraba #000000 aunque la página ya pintaba el
  // texto con el color de Branding.
  const temaActual = resolverTemaPorSlug(
    {
      fondo: draft.color_fondo || coloresTienda.fondo,
      texto: draft.color_texto || coloresTienda.texto,
      acento: draft.color_primario || coloresTienda.acento,
    },
    templateSlug,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-fg/10 bg-fg/[0.03] p-3 text-xs text-fg/55">
        <p className="font-semibold text-fg/75">Cómo se reparte la paleta</p>
        <p className="mt-1">
          El <b>primario</b> mueve botones y acciones. El <b>secundario</b> viene de Mi Tienda y se usa como destacado cuando tiene contraste. El <b>acento</b> es el uso visual del primario en CTAs, badges y estados activos.
        </p>
        <p className="mt-2">
          Si dejás un campo vacío, hereda Branding de Mi Tienda; si tampoco existe, usa la paleta del template.
        </p>
      </div>
      {CAMPOS.map(({ key, temaKey, label, ayuda }) => {
        const heredado = temaActual[temaKey];
        const valor = draft[key] || '';
        // El selector siempre muestra el color que se ve en la página: el
        // propio si lo hay, si no el heredado del template.
        const valorValido = HEX_RE.test(valor) ? valor : (HEX_RE.test(heredado) ? heredado : '#000000');
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-fg/60">{label}</label>
              {draft[key] && (
                <button
                  type="button"
                  onClick={() => onCampo(key, null)}
                  className="text-xs text-fg/40 hover:text-fg flex items-center gap-1"
                >
                  <RotateCcw size={11} /> Restablecer
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={valorValido}
                onChange={e => onCampo(key, e.target.value)}
                className="h-9 w-9 rounded-lg border border-fg/10 bg-transparent cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={draft[key] || ''}
                onChange={e => onCampo(key, e.target.value)}
                // Vacío = heredado: el placeholder dice cuál es ese color en
                // vez de un "#000000" genérico que no es el de la página.
                placeholder={heredado || '#000000'}
                maxLength={7}
                className="flex-1 bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-fg/30"
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-fg/35">{ayuda}</p>
          </div>
        );
      })}
      <div className="rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs leading-relaxed text-fg/55">
        Hoy estos colores son globales. Cambiar color por bloque es viable, pero conviene hacerlo como una capa avanzada: cada bloque heredaría la paleta global y solo guardaría overrides propios cuando el usuario los active.
      </div>
    </div>
  );
}
