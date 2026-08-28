import React from 'react';
import { Dumbbell, Store, Sparkles, Monitor } from 'lucide-react';
import { hexToRgba } from './themeUtils';
import { CartButton } from './sections';

const TEMPLATE_STYLES = {
  'fitness-suplementos': {
    Icono: Dumbbell,
    titleClass: 'font-black uppercase tracking-widest',
    navClass: 'font-semibold text-[13px] sm:text-sm hover:opacity-80 transition-opacity uppercase tracking-wider',
    btnClass: 'hidden sm:inline-block text-sm font-bold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: '#fff' })
  },
  'beauty-cosmetics': {
    Icono: Sparkles,
    titleClass: 'font-serif text-xl tracking-wide',
    navClass: 'text-[13px] sm:text-sm hover:opacity-80 transition-opacity',
    btnClass: 'hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: '#fff' })
  },
  'tech-gadgets': {
    Icono: Monitor,
    titleClass: 'font-mono font-bold tracking-tight',
    navClass: 'font-medium text-[13px] sm:text-sm hover:opacity-80 transition-opacity',
    btnClass: 'hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: tema.fondo })
  },
  'basico': {
    Icono: Store,
    titleClass: 'font-bold tracking-tight',
    navClass: 'font-semibold text-[13px] sm:text-sm hover:opacity-80 transition-opacity',
    btnClass: 'hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: tema.fondo })
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
  onClickCatalogo = null,
  onClickContacto = null,
  previewMode = false
}) {
  const styles = TEMPLATE_STYLES[templateSlug] || TEMPLATE_STYLES['basico'];
  const Icono = styles.Icono;
  const bordeSuave = hexToRgba(tema.texto, 0.1);
  const target = previewMode ? "_blank" : "_self";
  
  const catalogoClickProps = onClickCatalogo ? { onClick: (e) => { e.preventDefault(); onClickCatalogo(); } } : {};
  const contactoClickProps = onClickContacto ? { onClick: (e) => { e.preventDefault(); onClickContacto(); } } : {};

  return (
    <header id="header" className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur z-50" style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(tema.fondo, 0.95), color: tema.texto }}>
      <div className="flex items-center gap-4 sm:gap-6">
        <a href={linkInicio} target={target} rel="noreferrer" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          {logo ? (
            <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
          ) : (
            <div className="h-9 w-9 flex items-center justify-center rounded-full shrink-0" style={{ backgroundColor: tema.acento }}>
              <Icono size={18} style={{ color: tema.fondo }} />
            </div>
          )}
          <span className={`text-lg hidden sm:inline ${styles.titleClass}`}>{nombreComercio}</span>
        </a>
        
        <nav className="flex gap-3 sm:gap-4 ml-2 sm:ml-0" style={{ borderLeft: `1px solid ${bordeSuave}`, paddingLeft: '1rem' }}>
          <a href={linkInicio} target={target} rel="noreferrer" className={styles.navClass}>Inicio</a>
          <a href={linkCatalogo} target={target} rel="noreferrer" className={styles.navClass} {...catalogoClickProps}>Catálogo</a>
          <a href={linkContacto} target={target} rel="noreferrer" className={styles.navClass} {...contactoClickProps}>Contacto</a>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <CartButton cantidad={cantidadCarrito} acento={tema.acento} color={tema.texto} onClick={onAbrirCarrito} />
        <a href={linkCatalogo} target={target} rel="noreferrer" className={styles.btnClass} style={styles.btnStyle(tema)} {...catalogoClickProps}>
          Ver catálogo
        </a>
      </div>
    </header>
  );
}
