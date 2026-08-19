import React from 'react';

export default function RichText({ text, className, style }) {
  if (!text) return null;

  // Split text by newlines.
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 mb-4 space-y-1">
          {currentList.map((li, i) => <li key={i}>{renderInline(li)}</li>)}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^(\*|-)\s+(.*)/);

    if (bulletMatch) {
      // It's a list item
      currentList.push(bulletMatch[2]);
    } else {
      flushList();
      
      // If empty line, we just treat it as a break or skip.
      if (line.trim().length === 0) {
        if (elements.length > 0 && elements[elements.length - 1].type !== 'br') {
          // elements.push(<br key={`br-${i}`} />);
          // Actually, we can wrap paragraphs later, or just emit a spacer
          elements.push(<div key={`sp-${i}`} className="h-4"></div>);
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
    <div className={className} style={style}>
      {elements}
    </div>
  );
}

function renderInline(text) {
  // Convert **bold** or *bold*
  // Also *word* to bold since user might just type *negrita* (WhatsApp style)
  // Let's support both **bold** and *bold* for bolding
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
