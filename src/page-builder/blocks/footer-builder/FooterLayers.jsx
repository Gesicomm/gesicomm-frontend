import React from 'react';
import { ArrowUp, ArrowDown, Trash2, Type, Image, Share2, Link2, MousePointerClick } from 'lucide-react';
import { useFooterBuilder } from './FooterContext';

const ICONS = { text: Type, logo: Image, social: Share2, link: Link2, button: MousePointerClick };
const LABELS = { text: 'Texto', logo: 'Logo', social: 'Redes sociales', link: 'Link', button: 'Botón' };

export default function FooterLayers() {
  const { data, selectedId, actions } = useFooterBuilder();
  const { elements } = data;

  if (!elements || elements.length === 0) {
    return (
      <p className="text-xs text-[var(--vit-muted)]">
        Todavía no agregaste ningún elemento al footer.
      </p>
    );
  }

  const handleMoveUp = (index) => {
    if (index > 0) actions.reorderElements(index, index - 1);
  };

  const handleMoveDown = (index) => {
    if (index < elements.length - 1) actions.reorderElements(index, index + 1);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Se muestra en orden inverso (arriba = al frente) pero se opera
          sobre el índice real del array para que reorderElements coincida
          con el z-index que usa PublicFooterRenderer. */}
      {[...elements].reverse().map((el, i) => {
        const originalIndex = elements.length - 1 - i;
        const Icon = ICONS[el.type] || Type;
        const isSelected = selectedId === el.id;
        return (
          <div
            key={el.id}
            onClick={() => actions.setSelectedId(el.id)}
            className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
              isSelected
                ? 'border-[var(--vit-accent)] bg-[var(--vit-accent-soft)]'
                : 'border-[var(--vit-border)] bg-[var(--vit-surface)] hover:border-[var(--vit-accent-soft)]'
            }`}
          >
            <Icon size={14} className="text-[var(--vit-muted)] shrink-0" />
            <span className="flex-1 text-sm text-[var(--vit-text)] truncate">
              {LABELS[el.type] || el.type}
              {(el.type === 'text' || el.type === 'link' || el.type === 'button') && el.settings?.text ? `: ${el.settings.text}` : ''}
            </span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                title="Traer al frente"
                onClick={(e) => { e.stopPropagation(); handleMoveUp(originalIndex); }}
                disabled={originalIndex === elements.length - 1}
                className="p-1 rounded text-[var(--vit-muted)] hover:text-[var(--vit-text)] hover:bg-[var(--vit-card-bg)] disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                title="Enviar atrás"
                onClick={(e) => { e.stopPropagation(); handleMoveDown(originalIndex); }}
                disabled={originalIndex === 0}
                className="p-1 rounded text-[var(--vit-muted)] hover:text-[var(--vit-text)] hover:bg-[var(--vit-card-bg)] disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowDown size={12} />
              </button>
              <button
                type="button"
                title="Eliminar elemento"
                onClick={(e) => { e.stopPropagation(); actions.deleteElement(el.id); }}
                className="p-1 rounded text-[var(--vit-muted)] hover:text-red-500 hover:bg-[var(--vit-card-bg)]"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
