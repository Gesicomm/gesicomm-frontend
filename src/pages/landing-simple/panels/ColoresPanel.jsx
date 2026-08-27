import React from 'react';
import { RotateCcw } from 'lucide-react';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const CAMPOS = [
  { key: 'color_fondo', label: 'Fondo' },
  { key: 'color_texto', label: 'Texto' },
  { key: 'color_primario', label: 'Acento' },
];

/**
 * Tema único para toda la landing (no por sección) — fondo, texto y
 * acento. Reutiliza color_fondo/color_texto/color_primario, ya existentes
 * en Landing (sistema flexible) y ya validados como hex por
 * LandingService.validarPayload. null = el template usa su propia paleta
 * por defecto (ver templates/*.jsx).
 */
export default function ColoresPanel({ draft, onCampo }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-fg/40">
        Se aplican a toda la landing. Dejá un color vacío para usar el de este template.
      </p>
      {CAMPOS.map(({ key, label }) => {
        const valor = draft[key] || '';
        const valorValido = HEX_RE.test(valor) ? valor : '#000000';
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
                placeholder="#000000"
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
