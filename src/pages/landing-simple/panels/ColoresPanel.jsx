import React from 'react';
import { RotateCcw } from 'lucide-react';
import { resolverTemaPorSlug } from '../templates/themeUtils';
import { coloresDeTienda } from '../mapLandingToTemplateData';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// `temaKey` es el nombre del color dentro del tema resuelto del template
// (ver DEFAULT_TEMA_POR_TEMPLATE), que no coincide con el de la columna.
const CAMPOS = [
  { key: 'color_fondo', temaKey: 'fondo', label: 'Fondo' },
  { key: 'color_texto', temaKey: 'texto', label: 'Texto' },
  { key: 'color_primario', temaKey: 'acento', label: 'color de botones' },
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
      <p className="text-xs text-fg/40">
        Se aplican a toda la landing. Dejá un color vacío para usar el branding de Mi Tienda; si no hay uno cargado, se usa el default del template.
      </p>
      {CAMPOS.map(({ key, temaKey, label }) => {
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
          </div>
        );
      })}
    </div>
  );
}
