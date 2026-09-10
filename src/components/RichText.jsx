import React from 'react';

/**
 * Componente RichText:
 * - Convierte automáticamente viñetas con `- `, `* `, `• ` en listas de puntos (<ul><li>).
 * - Soporta negrita estilo WhatsApp (*texto* o **texto**).
 * - Preserva saltos de línea (white-space: pre-line).
 */
export function RichText({ text, className = '', style = {} }) {
  if (!text) return null;

  const lines = String(text).split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside pl-2 mb-2 space-y-1">
          {currentList.map((li, i) => <li key={i}>{renderInline(li)}</li>)}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^([-*•])\s+(.*)/);

    if (bulletMatch) {
      currentList.push(bulletMatch[2]);
    } else {
      flushList();
      
      if (trimmed.length === 0) {
        if (elements.length > 0) {
          elements.push(<div key={`sp-${i}`} className="h-2"></div>);
        }
      } else {
        elements.push(
          <div key={`p-${i}`} className="mb-1">
            {renderInline(line)}
          </div>
        );
      }
    }
  }
  flushList();

  return (
    <div className={className} style={{ whiteSpace: 'pre-line', ...style }}>
      {elements}
    </div>
  );
}

function renderInline(text) {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={index}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

export default RichText;
