import React from 'react';
import { ChevronLeft, Trash2, Type, Image, Share2, Link2, MousePointerClick } from 'lucide-react';
import { useFooterBuilder } from './FooterContext';
import FooterLayers from './FooterLayers';
import { SOCIAL_PLATFORMS } from './SocialIcons';
import { TAMANOS_TEXTO } from './footerTextStyle';
import { renderInput } from '../../../pages/landing/inspectors/SchemaInspector';

const label = 'mb-2 block text-sm font-semibold text-[var(--vit-text)]';
const input = 'w-full rounded border border-[var(--vit-border)] bg-[var(--vit-bg)] px-3 py-2 text-sm text-[var(--vit-text)] outline-none focus:border-[var(--vit-primary)]';
const ELEMENT_LABELS = { text: 'Texto', logo: 'Logo', social: 'Redes sociales', link: 'Link', button: 'Botón' };

export default function FooterInspector({ onUploadImagen, paginas }) {
  const { data, selectedId, actions, activeBreakpoint } = useFooterBuilder();
  const { settings, elements } = data;

  if (!selectedId) {
    return (
      <div className="p-4 flex flex-col gap-6">
        <div>
          <label className={label}>Elementos</label>
          <FooterLayers />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--vit-muted)]">Agregar elemento</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => actions.addElement({
                id: `text-${Date.now()}`,
                type: 'text',
                layout: { desktop: { mode: 'free', x: 0.1, y: 0.1, width: 0.3 } },
                settings: { text: 'Nuevo Texto' },
              })}
              className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[var(--vit-border)] py-3 text-xs font-medium text-[var(--vit-muted)] hover:border-[var(--vit-primary)] hover:text-[var(--vit-primary)] transition"
            >
              <Type size={16} /> Texto
            </button>
            <button
              type="button"
              onClick={() => actions.addElement({
                id: `logo-${Date.now()}`,
                type: 'logo',
                // Chico por default — es un logo, no un banner. El ancho es
                // relativo al contenedor del footer (ver BuilderElement.jsx),
                // así que 8% mantiene el tamaño razonable en la mayoría de
                // los anchos de pantalla.
                layout: { desktop: { mode: 'free', x: 0.1, y: 0.1, width: 0.08 } },
                settings: { alt: 'Mi Tienda' },
              })}
              className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[var(--vit-border)] py-3 text-xs font-medium text-[var(--vit-muted)] hover:border-[var(--vit-primary)] hover:text-[var(--vit-primary)] transition"
            >
              <Image size={16} /> Logo
            </button>
            <button
              type="button"
              onClick={() => actions.addElement({
                id: `social-${Date.now()}`,
                type: 'social',
                layout: { desktop: { mode: 'free', x: 0.1, y: 0.1, width: 0.25 } },
                settings: { redes: {} },
              })}
              className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[var(--vit-border)] py-3 text-xs font-medium text-[var(--vit-muted)] hover:border-[var(--vit-primary)] hover:text-[var(--vit-primary)] transition"
            >
              <Share2 size={16} /> Redes
            </button>
            <button
              type="button"
              onClick={() => actions.addElement({
                id: `link-${Date.now()}`,
                type: 'link',
                layout: { desktop: { mode: 'free', x: 0.1, y: 0.1, width: 0.2 } },
                settings: { text: 'Nuevo link', url: '', target: '_self' },
              })}
              className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[var(--vit-border)] py-3 text-xs font-medium text-[var(--vit-muted)] hover:border-[var(--vit-primary)] hover:text-[var(--vit-primary)] transition"
            >
              <Link2 size={16} /> Link
            </button>
            <button
              type="button"
              onClick={() => actions.addElement({
                id: `button-${Date.now()}`,
                type: 'button',
                layout: { desktop: { mode: 'free', x: 0.1, y: 0.1, width: 0.2 } },
                settings: { text: 'Nuevo botón', url: '', target: '_self' },
              })}
              className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[var(--vit-border)] py-3 text-xs font-medium text-[var(--vit-muted)] hover:border-[var(--vit-primary)] hover:text-[var(--vit-primary)] transition"
            >
              <MousePointerClick size={16} /> Botón
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 border-t border-[var(--vit-border)]">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--vit-muted)]">Contenedor</span>
          <div>
            <label className={label}>Altura mínima (px)</label>
            <input
              type="number"
              className={input}
              value={settings.minHeight?.[activeBreakpoint] === 'auto' ? '' : settings.minHeight?.[activeBreakpoint] || ''}
              placeholder="auto"
              onChange={e => {
                const val = e.target.value ? parseInt(e.target.value, 10) : 'auto';
                actions.updateSettings({
                  minHeight: { ...settings.minHeight, [activeBreakpoint]: val },
                });
              }}
            />
          </div>
          <div>
            <label className={label}>Ancho máximo (px)</label>
            <input
              type="number"
              className={input}
              value={settings.maxWidth || 1200}
              onChange={e => actions.updateSettings({ maxWidth: parseInt(e.target.value, 10) })}
            />
          </div>
        </div>
      </div>
    );
  }

  const element = elements.find(el => el.id === selectedId);
  if (!element) return null;

  const layout = element.layout?.[activeBreakpoint] || {};

  const handleUpdateLayout = (updates) => {
    actions.updateElement(element.id, {
      layout: { ...element.layout, [activeBreakpoint]: { ...layout, ...updates } },
    });
  };

  const handleUpdateSettings = (updates) => {
    actions.updateElement(element.id, { settings: { ...element.settings, ...updates } });
  };

  const redes = element.settings?.redes || {};
  const updateRed = (key, url) => handleUpdateSettings({ redes: { ...redes, [key]: url } });

  return (
    <div className="p-4 flex flex-col gap-6">
      <button
        type="button"
        onClick={() => actions.setSelectedId(null)}
        className="flex items-center gap-1 text-sm text-[var(--vit-muted)] hover:text-[var(--vit-text)] transition-colors -mb-2"
      >
        <ChevronLeft size={14} /> Todos los elementos
      </button>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--vit-muted)]">
          {ELEMENT_LABELS[element.type] || element.type}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-sm font-semibold text-[var(--vit-text)] border-b border-[var(--vit-border)] pb-2">Contenido</h4>
        {element.type === 'text' && (
          <div>
            <label className={label}>Texto</label>
            <textarea
              className={input}
              rows={3}
              value={element.settings?.text || ''}
              onChange={e => handleUpdateSettings({ text: e.target.value })}
            />
          </div>
        )}
        {element.type === 'logo' && (
          <>
            <div>
              <label className={label}>Imagen</label>
              {renderInput(
                { type: 'image', key: 'image' },
                element.settings?.image,
                (k, val) => handleUpdateSettings({ [k]: val }),
                onUploadImagen
              )}
            </div>
            <div>
              <label className={label}>Texto alternativo</label>
              <input
                type="text"
                className={input}
                value={element.settings?.alt || ''}
                onChange={e => handleUpdateSettings({ alt: e.target.value })}
              />
            </div>
          </>
        )}
        {element.type === 'link' && (
          <>
            <div>
              <label className={label}>Texto</label>
              <input
                type="text"
                className={input}
                value={element.settings?.text || ''}
                onChange={e => handleUpdateSettings({ text: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>URL</label>
              {renderInput({ type: 'url', key: 'url' }, element.settings?.url, (k, val) => handleUpdateSettings({ [k]: val }), undefined, paginas)}
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--vit-text)]">
              <input
                type="checkbox"
                checked={element.settings?.target === '_blank'}
                onChange={e => handleUpdateSettings({ target: e.target.checked ? '_blank' : '_self' })}
              />
              Abrir en una pestaña nueva
            </label>
          </>
        )}
        {element.type === 'button' && (
          <>
            <div>
              <label className={label}>Texto</label>
              <input
                type="text"
                className={input}
                value={element.settings?.text || ''}
                onChange={e => handleUpdateSettings({ text: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>URL a la que manda</label>
              {renderInput({ type: 'url', key: 'url' }, element.settings?.url, (k, val) => handleUpdateSettings({ [k]: val }), undefined, paginas)}
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--vit-text)]">
              <input
                type="checkbox"
                checked={element.settings?.target === '_blank'}
                onChange={e => handleUpdateSettings({ target: e.target.checked ? '_blank' : '_self' })}
              />
              Abrir en una pestaña nueva
            </label>
          </>
        )}
        {element.type === 'button' && (
          <div className="flex flex-col gap-4 pt-2 border-t border-[var(--vit-border)]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--vit-muted)]">Color de este botón</span>
            {/* A propósito NO es el "Color del botón" de la pestaña Diseño
                del footer (ese es --l-primary, compartido por toda la
                sección) — esto es por-elemento, para poder tener un botón
                verde y otro rojo en el mismo footer. Vacío = hereda el
                color general de la tienda. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Fondo</span>
              {renderInput(
                { type: 'color', key: 'color_fondo' },
                element.settings?.color_fondo,
                (k, val) => handleUpdateSettings({ [k]: val })
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Texto</span>
              {renderInput(
                { type: 'color', key: 'color_texto' },
                element.settings?.color_texto,
                (k, val) => handleUpdateSettings({ [k]: val })
              )}
            </div>
          </div>
        )}
        {(element.type === 'text' || element.type === 'link') && (
          <div className="flex flex-col gap-4 pt-2 border-t border-[var(--vit-border)]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--vit-muted)]">Estilo del texto</span>
            <div>
              <label className={label}>Tamaño</label>
              {renderInput(
                { type: 'select', key: 'tamano', options: TAMANOS_TEXTO },
                element.settings?.tamano || 'md',
                (k, val) => handleUpdateSettings({ [k]: val })
              )}
            </div>
            {renderInput(
              { type: 'boolean', key: 'negrita', label: 'Negrita' },
              element.settings?.negrita,
              (k, val) => handleUpdateSettings({ [k]: val })
            )}
            <div>
              <label className={label}>Alineación</label>
              {renderInput(
                { type: 'select', key: 'alineacion', options: [
                  { value: 'left', label: 'Izquierda' },
                  { value: 'center', label: 'Centro' },
                  { value: 'right', label: 'Derecha' },
                ] },
                element.settings?.alineacion || 'left',
                (k, val) => handleUpdateSettings({ [k]: val })
              )}
            </div>
            <div>
              <label className={label}>Color del texto</label>
              {renderInput(
                { type: 'color', key: 'color' },
                element.settings?.color,
                (k, val) => handleUpdateSettings({ [k]: val })
              )}
            </div>
          </div>
        )}
        {element.type === 'social' && (
          <div className="flex flex-col gap-3">
            {SOCIAL_PLATFORMS.map(p => (
              <div key={p.key}>
                <label className={`${label} flex items-center gap-1.5`}>
                  <p.icon size={14} /> {p.label}
                </label>
                <input
                  type="url"
                  className={input}
                  placeholder={p.placeholder}
                  value={redes[p.key] || ''}
                  onChange={e => updateRed(p.key, e.target.value)}
                />
              </div>
            ))}
            <p className="text-xs text-[var(--vit-muted)]">Dejá vacío el link para que ese ícono no se muestre.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-sm font-semibold text-[var(--vit-text)] border-b border-[var(--vit-border)] pb-2">Posición</h4>
        <div>
          <label className={label}>Modo</label>
          <select
            className={input}
            value={layout.mode || 'normal'}
            onChange={e => handleUpdateLayout({ mode: e.target.value })}
          >
            <option value="normal">Normal (en el flujo)</option>
            <option value="free">Libre (arrastrable)</option>
          </select>
        </div>

        {layout.mode === 'free' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>X (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className={input}
                  value={layout.x || 0}
                  onChange={e => handleUpdateLayout({ x: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className={label}>Y (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className={input}
                  value={layout.y || 0}
                  onChange={e => handleUpdateLayout({ y: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className={label}>Ancho (%)</label>
              <input
                type="number"
                step="0.01"
                className={input}
                value={layout.width || 0.1}
                onChange={e => handleUpdateLayout({ width: parseFloat(e.target.value) })}
              />
            </div>
            <p className="text-xs text-[var(--vit-muted)]">
              También podés arrastrar y redimensionar el elemento directamente en la vista previa.
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => actions.deleteElement(element.id)}
        className="flex items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors"
      >
        <Trash2 size={14} /> Eliminar elemento
      </button>
    </div>
  );
}
