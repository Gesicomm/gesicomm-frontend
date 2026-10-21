// Presentación compartida: también corrige el CSS de las homepages ya guardadas.
export const CONFIANZA_INICIO_CSS = `
.trust-section { --trust-accent: var(--gc-primario, var(--tienda-primario, #075da0)); --trust-ink: var(--gc-texto, var(--navy)); --trust-surface: var(--gc-superficie, var(--home-superficie, #fff)); padding: 20px 0; border: 0; background: transparent; border-radius: 0; }
.trust-section .trust-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; padding: 0; }
.trust-section .trust-card { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; min-width: 0; padding: 12px 24px; }
.trust-section .trust-card + .trust-card { border-left: 1px solid color-mix(in srgb, var(--trust-ink) 14%, transparent); }
.trust-section .trust-card-icon { flex: none; min-width: 44px; min-height: 44px; width: auto; height: auto; max-width: 100%; padding: 10px; box-sizing: border-box; display: grid; place-items: center; border-radius: 12px; color: var(--trust-accent); background: color-mix(in srgb, var(--trust-accent) 12%, transparent); font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; font-size: 24px; line-height: 1.2; overflow-wrap: anywhere; }
.trust-section .trust-card-icon { align-self: center; }
.trust-section .trust-card-icon[hidden] { display: none; }
.trust-section .trust-card h3 { margin: 0 0 6px; color: var(--trust-ink); font-size: 15px; font-weight: 750; line-height: 1.35; }
.trust-section .trust-card p { margin: 0; color: color-mix(in srgb, var(--trust-ink) 78%, transparent); font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.trust-section[data-trust-style="tarjetas"] .trust-grid { gap: 16px; }
.trust-section[data-trust-style="tarjetas"] .trust-card { border: 1px solid color-mix(in srgb, var(--trust-ink) 12%, transparent); border-radius: 16px; background: var(--trust-surface); padding: 22px; }
.trust-section[data-trust-style="destacada"] { padding: clamp(24px, 4vw, 40px); border-radius: 20px; background: color-mix(in srgb, var(--trust-accent) 6%, var(--trust-surface)); }
.trust-section[data-trust-style="destacada"] .trust-grid { gap: 24px; }
.trust-section[data-trust-style="destacada"] .trust-card { flex-direction: column; padding: 8px; border: 0; gap: 18px; }
.trust-section[data-trust-style="destacada"] .trust-card h3 { font-size: 18px; }
.trust-section[data-trust-style="destacada"] .trust-card-icon { min-width: 48px; min-height: 48px; }
@media (max-width: 760px) {
  .trust-section .trust-grid { grid-template-columns: 1fr; }
  .trust-section .trust-card { padding: 18px 4px; align-items: flex-start; }
  .trust-section .trust-card + .trust-card { border-left: 0; border-top: 1px solid color-mix(in srgb, var(--trust-ink) 14%, transparent); }
  .trust-section[data-trust-style="tarjetas"] .trust-grid { gap: 10px; }
  .trust-section[data-trust-style="tarjetas"] .trust-card { padding: 18px; border: 1px solid color-mix(in srgb, var(--trust-ink) 12%, transparent); }
  .trust-section[data-trust-style="destacada"] .trust-grid { gap: 0; }
  .trust-section[data-trust-style="destacada"] .trust-card { flex-direction: column; padding: 18px 0; }
  .trust-section[data-trust-style="destacada"] .trust-card h3 { font-size: 15px; }
}
`;
