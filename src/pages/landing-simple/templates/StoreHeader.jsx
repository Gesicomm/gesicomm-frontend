import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dumbbell, Store, Sparkles, Monitor, Menu, X } from 'lucide-react';
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

/**
 * Ancho a partir del cual el header deja de ser compacto (hamburguesa).
 * Es el `sm` de Tailwind, para cortar en el mismo punto que el resto de
 * las secciones de los templates.
 */
const BREAKPOINT_COMPACTO = 640;

/**
 * En el editor el preview NO es un iframe: el "modo móvil" es un div de
 * 375px dentro de una ventana de escritorio, así que las media queries de
 * Tailwind (`sm:`) siguen viendo el viewport grande y el header nunca
 * colapsaba. Por eso el modo compacto se decide con `isMobile` (forzado
 * por el editor, misma convención que el resto de los templates) O con el
 * ancho real de la ventana, que es lo que manda en la landing publicada.
 */
function useViewportCompacto() {
  const [compacto, setCompacto] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < BREAKPOINT_COMPACTO
  );
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia?.(`(max-width: ${BREAKPOINT_COMPACTO - 1}px)`);
    // `resize` además del listener del media query: al emular un dispositivo
    // (DevTools o el preview del navegador) el evento `change` del media
    // query no siempre llega, y el header se quedaba en modo escritorio.
    const recalcular = () => setCompacto(mq ? mq.matches : window.innerWidth < BREAKPOINT_COMPACTO);
    recalcular();
    mq?.addEventListener('change', recalcular);
    window.addEventListener('resize', recalcular);
    return () => {
      mq?.removeEventListener('change', recalcular);
      window.removeEventListener('resize', recalcular);
    };
  }, []);
  return compacto;
}

const TEMPLATE_STYLES = {
  'fitness-suplementos': {
    Icono: Dumbbell,
    titleClass: 'font-black uppercase tracking-widest',
    navClass: 'font-semibold hover:opacity-80 transition-opacity uppercase tracking-wider',
    btnClass: 'text-sm font-bold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  },
  'beauty-skincare': {
    Icono: Sparkles,
    // Sin serif: la ficha de Beauty usa la misma familia que el resto, y
    // el header con otra tipografía se leía como de otro sitio.
    titleClass: 'font-bold text-lg tracking-wide',
    navClass: 'hover:opacity-80 transition-opacity',
    btnClass: 'text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  },
  'tech-electronica': {
    Icono: Monitor,
    titleClass: 'font-mono font-bold tracking-tight',
    navClass: 'font-medium hover:opacity-80 transition-opacity',
    btnClass: 'text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  },
  'moda-indumentaria': {
    Icono: Store,
    titleClass: 'font-serif tracking-widest',
    navClass: 'hover:opacity-80 transition-opacity',
    btnClass: 'text-sm font-semibold px-4 py-2 transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  },
  'bazar-hogar': {
    Icono: Store,
    titleClass: 'font-serif tracking-widest',
    navClass: 'hover:opacity-80 transition-opacity',
    btnClass: 'text-sm font-semibold px-4 py-2 transition-opacity hover:opacity-90',
    btnStyle: (tema) => ({ backgroundColor: tema.acento, color: sobreAcento(tema.acento) })
  },
  'basico': {
    Icono: Store,
    titleClass: 'font-bold tracking-tight',
    navClass: 'font-semibold hover:opacity-80 transition-opacity',
    btnClass: 'text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90',
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
  isMobile = false,
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

  const viewportCompacto = useViewportCompacto();
  const compacto = isMobile || viewportCompacto;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const headerRef = useRef(null);
  const menuRef = useRef(null);

  // Al volver a escritorio (o al salir del modo móvil del editor) el panel
  // desplegado quedaría flotando sobre la landing: se cierra solo.
  useEffect(() => {
    if (!compacto) setMenuAbierto(false);
  }, [compacto]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const recalcularMenu = () => {
      const rect = headerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuRect({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setMenuAbierto(false); };
    const onPointerDown = (e) => {
      if (headerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setMenuAbierto(false);
    };
    recalcularMenu();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', recalcularMenu);
    window.addEventListener('scroll', recalcularMenu, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', recalcularMenu);
      window.removeEventListener('scroll', recalcularMenu, true);
    };
  }, [menuAbierto]);

  // Un link del menú siempre cierra el panel; si además tiene handler
  // propio (el editor navega sin recargar), se corta la navegación real.
  function linkProps(onClickCustom) {
    return {
      onClick: (e) => {
        setMenuAbierto(false);
        if (onClickCustom) { e.preventDefault(); onClickCustom(); }
      }
    };
  }

  const links = [
    { texto: 'Inicio', href: linkInicio, onClick: onClickInicio },
    { texto: 'Catálogo', href: linkCatalogo, onClick: onClickCatalogo },
    { texto: 'Contacto', href: linkContacto, onClick: onClickContacto }
  ];

  const menuMovil = compacto && menuAbierto && menuRect && typeof document !== 'undefined'
    ? createPortal(
      <nav
        id="header-menu-movil"
        ref={menuRef}
        className="fixed flex flex-col px-4 py-3 gap-1 shadow-lg"
        // Opaco a propósito: con el fondo translúcido del header se leía
        // el contenido de la landing por debajo de los links.
        style={{
          top: `${menuRect.top}px`,
          left: `${menuRect.left}px`,
          width: `${menuRect.width}px`,
          zIndex: 9999,
          borderBottom: `1px solid ${bordeSuave}`,
          backgroundColor: t.fondo,
          color: t.texto,
        }}
      >
        {links.map(l => (
          <a
            key={l.texto}
            href={l.href}
            target={target}
            rel="noreferrer"
            className={`py-3 text-base ${styles.navClass}`}
            style={{ borderBottom: `1px solid ${bordeSuave}` }}
            {...linkProps(l.onClick)}
          >
            {l.texto}
          </a>
        ))}
        <a
          href={linkCatalogo}
          target={target}
          rel="noreferrer"
          className={`mt-3 text-center ${styles.btnClass}`}
          style={styles.btnStyle(t)}
          {...linkProps(onClickCatalogo)}
        >
          Ver catálogo
        </a>
      </nav>,
      document.body
    )
    : null;

  return (
    <header
      id="header"
      ref={headerRef}
      className="relative flex items-center justify-between px-4 sm:px-6 py-4 sticky top-0 backdrop-blur z-50"
      style={{ borderBottom: `1px solid ${bordeSuave}`, backgroundColor: hexToRgba(t.fondo, 0.95), color: t.texto }}
    >
      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
        <a href={linkInicio} target={target} rel="noreferrer" className="flex items-center gap-2 transition-opacity hover:opacity-80 min-w-0" {...linkProps(onClickInicio)}>
          {logo ? (
            <img src={logo} alt={nombreComercio} className="h-9 w-auto max-w-[120px] object-contain" />
          ) : (
            <div className="h-9 w-9 flex items-center justify-center rounded-full shrink-0" style={{ backgroundColor: t.acento }}>
              <Icono size={18} style={{ color: sobreAcento(t.acento) }} />
            </div>
          )}
          <span className={`text-lg truncate ${styles.titleClass}`}>{nombreComercio}</span>
        </a>

        {/* Escritorio: los links al lado del logo. En compacto se van al
            panel desplegable de abajo. */}
        {!compacto && (
          <nav className="flex gap-3 sm:gap-4" style={{ borderLeft: `1px solid ${bordeSuave}`, paddingLeft: '1rem' }}>
            {links.map(l => (
              <a key={l.texto} href={l.href} target={target} rel="noreferrer" className={`text-[13px] sm:text-sm ${styles.navClass}`} {...linkProps(l.onClick)}>
                {l.texto}
              </a>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <CartButton cantidad={cantidadCarrito} acento={t.acento} color={t.texto} onClick={onAbrirCarrito} />
        {compacto ? (
          <button
            type="button"
            onClick={() => setMenuAbierto(v => !v)}
            className="p-2 rounded-full transition-opacity hover:opacity-80"
            style={{ color: t.texto }}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            aria-controls="header-menu-movil"
          >
            {menuAbierto ? <X size={22} /> : <Menu size={22} />}
          </button>
        ) : (
          <a href={linkCatalogo} target={target} rel="noreferrer" className={styles.btnClass} style={styles.btnStyle(t)} {...linkProps(onClickCatalogo)}>
            Ver catálogo
          </a>
        )}
      </div>

      {menuMovil}
    </header>
  );
}
