import React, { useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { useFooterBuilder } from './FooterContext';
import { getMediaUrl } from '../../../services/api';
import { SOCIAL_PLATFORMS } from './SocialIcons';
import { estiloTexto, estiloBoton } from './footerTextStyle';
import './BuilderElement.css';

// Element registry with real visual components. Mismo shape de `settings`
// que consume PublicElements en PublicFooterRenderer.jsx — lo que se arma
// acá en el editor es exactamente lo que se ve en el sitio público.
const ElementRegistry = {
  logo: ({ settings }) => settings?.image ? (
    <img
      src={getMediaUrl(settings.image)}
      alt={settings?.alt || 'Logo'}
      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
    />
  ) : (
    <div style={{ fontSize: '13px', opacity: 0.6, border: '1px dashed currentColor', padding: '10px 14px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
      Subí un logo →
    </div>
  ),
  text: ({ settings }) => (
    <p style={estiloTexto(settings)}>{settings?.text || 'Texto'}</p>
  ),
  link: ({ settings }) => (
    // Color por default = inherit (mismo texto plano que el resto del
    // footer), NO --l-primary: antes un link y un botón sin color propio
    // terminaban con el mismo color porque los dos caían al acento de marca
    // — cambiar uno de los dos "de la nada" (en realidad cambiando el
    // acento general) parecía que se contagiaban entre sí. estiloTexto ya
    // resuelve settings.color || 'inherit', así que no hace falta pisarlo.
    <a
      href={settings?.url || '#'}
      onClick={e => e.preventDefault()}
      style={{
        ...estiloTexto(settings),
        display: 'block',
        textDecoration: 'underline',
      }}
    >
      {settings?.text || 'Link'}
    </a>
  ),
  button: ({ settings }) => (
    <a
      href={settings?.url || '#'}
      onClick={e => e.preventDefault()}
      style={estiloBoton(settings)}
    >
      {settings?.text || 'Botón'}
    </a>
  ),
  social: ({ settings }) => {
    const redes = settings?.redes || {};
    const activas = SOCIAL_PLATFORMS.filter(p => redes[p.key]);
    if (activas.length === 0) {
      return (
        <div style={{ fontSize: '13px', opacity: 0.6, border: '1px dashed currentColor', padding: '8px 12px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
          Elegí tus redes →
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {activas.map(p => (
          <span key={p.key} title={p.label} style={{ opacity: 0.85, display: 'inline-flex' }}>
            <p.icon size={18} />
          </span>
        ))}
      </div>
    );
  }
};

// Helper to resolve cascading layout rules
function resolveLayout(layout, breakpoint) {
  if (!layout) return { mode: 'normal' };
  
  const bpRules = layout[breakpoint];
  if (bpRules && bpRules.inherit) {
    return resolveLayout(layout, bpRules.inherit);
  }
  
  if (bpRules) return bpRules;
  
  // Fallbacks if not strictly defined
  if (breakpoint === 'mobile') return layout.tablet || layout.desktop || { mode: 'normal' };
  if (breakpoint === 'tablet') return layout.desktop || { mode: 'normal' };
  return layout.desktop || { mode: 'normal' };
}

// `containerSize` lo mide FooterCanvas.jsx sobre .footer-container-bounds y
// lo baja por prop — este componente NO debe envolverse en ningún div para
// medirse solo: react-rnd resuelve `bounds="parent"` con el parentNode crudo
// del DOM, así que un wrapper (peor todavía con display:contents, que no
// genera caja) le da límites de tamaño cero y manda el elemento a la esquina
// superior izquierda de la página, encima del hero.
export default function BuilderElement({ element, isSelected, containerSize }) {
  const { actions, activeBreakpoint } = useFooterBuilder();

  const activeLayout = useMemo(() => resolveLayout(element.layout, activeBreakpoint), [element.layout, activeBreakpoint]);
  const isFreeMode = activeLayout.mode === 'free';

  const handleClick = (e) => {
    e.stopPropagation();
    actions.setSelectedId(element.id);
  };

  const ElementComponent = ElementRegistry[element.type] || (() => <div>Unknown Block</div>);

  if (!isFreeMode) {
    // Normal Flow Mode (No Rnd)
    return (
      <div 
        className={`builder-element-normal ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{ width: activeLayout.width === '100%' ? '100%' : 'auto' }}
      >
        <ElementComponent settings={element.settings} />
      </div>
    );
  }

  // Free Position Mode
  // Convert normalized % to px for Rnd
  const pxX = (activeLayout.x || 0) * containerSize.width;
  const pxY = (activeLayout.y || 0) * containerSize.height;
  const pxWidth = (activeLayout.width || 0.1) * containerSize.width;

  // El clamp lo hacemos NOSOTROS (ver el porqué en el comentario de <Rnd>):
  // dejamos que el elemento se arrastre libre y al soltarlo lo devolvemos
  // adentro del contenedor, en vez de que react-rnd lo trabe durante el
  // gesto.
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // Se descuenta el tamaño del propio elemento para que quede entero
  // adentro del footer y no colgando del borde.
  const dentro = (x, y, node, ancho) => ({
    x: clamp(x / containerSize.width, 0, Math.max(0, 1 - ancho)),
    y: clamp(y / containerSize.height, 0, Math.max(0, 1 - (node?.offsetHeight || 0) / containerSize.height)),
  });

  const handleDragStop = (e, d) => {
    actions.updateElement(element.id, {
      layout: {
        ...element.layout,
        [activeBreakpoint]: {
          ...activeLayout,
          ...dentro(d.x, d.y, d.node, activeLayout.width || 0.1),
        }
      }
    });
  };

  const handleResizeStop = (e, direction, ref, delta, position) => {
    const newWidth = clamp(ref.offsetWidth / containerSize.width, 0.02, 1);
    actions.updateElement(element.id, {
      layout: {
        ...element.layout,
        [activeBreakpoint]: {
          ...activeLayout,
          ...dentro(position.x, position.y, ref, newWidth),
          width: newWidth
        }
      }
    });
  };

  // `key` en vez de `position`/`size` controlados: con position={{x,y}}
  // controlado, cada re-render que Rnd dispara internamente en cada
  // mousemove (para reflejar el arrastre en curso) se pisaba con el mismo
  // pxX/pxY sin cambiar — el elemento quedaba clavado donde arrancó, o en
  // (0,0) si containerSize se había medido mal. Con `default` + un `key`
  // que solo cambia cuando la posición persistida cambia de verdad (al
  // soltar, o por breakpoint/undo), Rnd es libre de manejar su propia
  // posición visual mientras el usuario arrastra, y solo la resincronizamos
  // desde afuera cuando corresponde.
  const resetKey = `${activeBreakpoint}:${Math.round((activeLayout.x || 0) * 1000)}:${Math.round((activeLayout.y || 0) * 1000)}:${Math.round((activeLayout.width || 0) * 1000)}:${Math.round(containerSize.width)}`;

  return (
    <Rnd
      key={resetKey}
      className={`builder-element-rnd ${isSelected ? 'selected' : ''}`}
      default={{ x: pxX, y: pxY, width: pxWidth, height: 'auto' }}
      onDragStart={() => actions.setSelectedId(element.id)}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      // SIN bounds="parent" a propósito. El canvas se renderiza adentro del
      // <iframe> de PreviewFrame.jsx, y react-rnd valida el contenedor con
      // `boundary instanceof HTMLElement` (lib/index.js:199). Ese chequeo
      // corre en el realm de la ventana padre, así que para un nodo que vive
      // en el iframe da false: onDragStart cortaba ahí y los límites se
      // quedaban en su valor inicial {top:0,right:0,bottom:0,left:0}, con lo
      // que react-draggable clampeaba CUALQUIER posición a (0,0) — de ahí
      // que todo saltara a la esquina superior izquierda. Sin la prop,
      // react-rnd le pasa bounds=undefined a Draggable (lib/index.js:451),
      // no clampea nada, y el límite lo aplicamos nosotros al soltar.
      enableResizing={isSelected ? {
        top: false, right: true, bottom: true, left: true,
        topRight: false, bottomRight: true, bottomLeft: true, topLeft: false
      } : false}
      onClick={handleClick}
    >
      <div className="builder-element-content">
        <ElementComponent settings={element.settings} />
      </div>
    </Rnd>
  );
}
