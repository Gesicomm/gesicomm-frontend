import React from 'react';
import { Dumbbell, Store, Sparkles, Monitor } from 'lucide-react';
import { contraste, hexToRgba, resolverTemaPorSlug } from './themeUtils';
import { CartButton } from './sections';

/**
 * Texto legible sobre el acento. Se prefiere blanco mientras llegue a 3:1
 * (mínimo AA para texto grande en negrita, que es lo único que se pinta
 * sobre el acento); si no llega, se cae a oscuro. Mismo criterio que las
 * fichas de producto — un acento claro con texto blanco es ilegible.
 */
function sobreAcento(acento) {
  return contraste(acento, '#FFFFFF') >= 3 ? '#FFFFFF' : '#111111';
}

const TEMPLATE_STYLES = {
  'fitness-suplementos': {
    Icono: Dumbbell,
    titleClass: 'font-black uppercase tracking-widest',
    navClass: 'font-semibold text-[13px] sm:text-sm hover:opacity-80 transition-opacity uppercase tracking-wider',
    btnClass: 'hidden sm:inline-block text-sm font-bold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  },
  'beauty-skincare': {
    Icono: Sparkles,
    // Sin serif: la ficha de Beauty usa la misma familia que el resto, y
    // el header con otra tipografía se leía como de otro sitio.
    titleClass: 'font-bold text-lg tracking-wide',
    navClass: 'text-[13px] sm:text-sm hover:opacity-80 transition-opacity',
    btnClass: 'hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  },
  'tech-electronica': {
    Icono: Monitor,
    titleClass: 'font-mono font-bold tracking-tight',
    navClass: 'font-medium text-[13px] sm:text-sm hover:opacity-80 transition-opacity',
    btnClass: 'hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  },
  'basico': {
    Icono: Store,
    titleClass: 'font-bold tracking-tight',
    navClass: 'font-semibold text-[13px] sm:text-sm hover:opacity-80 transition-opacity',
    btnClass: 'hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  }
};

export default function StoreHeader({
  templateSlug = 'basico',
  nombreComercio,
  logo,
  tema,
  cantidadCarrito = 0,
  onAbrirCarrito = () => {},
  linkInicio = '/',
  linkCatalogo = '/catalogo',
  linkContacto = '/contacto',
  onClickInicio = null,
  onClickCatalogo = null,
  onClickContacto = null,
  previewMode = false
}) {
  const styles = TEMPLATE_STYLES[templateSlug] || TEMPLATE_STYLES['basico'];
  const Icono = styles.Icono;
  // El tema que llega suele venir CRUDO (fondo/texto/acento en null si el
  // comercio nunca tocó los colores). Sin resolverlo, hexToRgba(null) cae a
  // rgba(0,0,0,…) y el header salía negro sobre una landing clara, con el
  // estilo del sistema en vez del template. Se resuelve acá, igual que en
  // las fichas de producto, para que dé lo mismo cómo llegue.
  const t = resolverTemaPorSlug(tema, templateSlug);
  const bordeSuave = hexToRgba(t.texto, 0.1);
  const target = previewMode ? "_blank" : "_self";
  
  const inicioClickProps = onClickInicio ? { onClick: (e) => { e.preventDefault(); onClickInicio(); } } : {};
  const catalogoClickProps = onClickCatalogo ? { onClick: (e) => { e.preventDefault(); onClickCatalogo(); } } : {};
  const contactoClickProps = onClickContacto ? { onClick: (e) => { e.preventDefault(); onClickContacto(); } } : {};

  return (
    <header id="header" className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur z-50" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(t.fondo, 0.95), color: t.texto }}>
      <div className="flex items-center gap-4 sm:gap-6">
        <a href={linkInicio} target={target} rel="noreferrer" className="flex items-center gap-2 transition-opacity hover:opacity-80" {...inicioClickProps}>
          {logo ? (
            <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
          ) : (
            <div className="h-9 w-9 flex items-center justify-center rounded-full shrink-0" style={{ backgroundColor: t.acento }}>
              <Icono size={18} style={{ color: sobreAcento(t.acento) }} />
            </div>
          )}
          <span className={`text-lg hidden sm:inline ${styles.titleClass}`}>{nombreComercio}</span>
        </a>
        
        <nav className="flex gap-3 sm:gap-4 ml-2 sm:ml-0" style={{ borderLeft: `1px solid ${bordeSuave}`, paddingLeft: '1rem' }}>
          <a href={linkInicio} target={target} rel="noreferrer" className={styles.navClass} {...inicioClickProps}>Inicio</a>
          <a href={linkCatalogo} target={target} rel="noreferrer" className={styles.navClass} {...catalogoClickProps}>Catálogo</a>
          <a href={linkContacto} target={target} rel="noreferrer" className={styles.navClass} {...contactoClickProps}>Contacto</a>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <CartButton cantidad={cantidadCarrito} acento={t.acento} color={t.texto} onClick={onAbrirCarrito} />
        <a href={linkCatalogo} target={target} rel="noreferrer" className={styles.btnClass} style={styles.btnStyle(t)} {...catalogoClickProps}>
          Ver catálogo
        </a>
      </div>
    </header>
  );
}
